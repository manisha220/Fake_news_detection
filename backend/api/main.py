"""
FastAPI REST API for Fake News Detection.

Endpoints:
  GET  /api/health          – Health check
  POST /api/predict         – Predict single text
  POST /api/train           – Trigger model training
  GET  /api/metrics         – Get latest training metrics
  GET  /api/history         – Prediction history
  GET  /api/history/stats   – Prediction history statistics
  POST /api/upload          – Upload dataset CSV
  GET  /api/plots/{name}    – Serve plot images
"""

import os
import json
import time
import shutil
import logging
import threading
from datetime import datetime
from typing import Optional, List

import feedparser
import httpx

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# ── Internal imports ───────────────────────────────────────────────────────────
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.preprocessor import (
    preprocess_single,
    load_and_label_datasets,
    preprocess_dataframe,
    get_dataset_stats,
)
from training.trainer import (
    train_pipeline,
    predict as ml_predict,
    METRICS_PATH,
    SAVED_MODELS_DIR,
    PLOTS_DIR,
    MODEL_PATH,
    VECTORIZER_PATH,
)
from models.database import (
    init_db,
    save_prediction,
    get_predictions,
    get_prediction_count,
    get_prediction_stats,
    save_training_run,
    get_latest_training_run,
)

# ── App setup ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Fake News Detection API",
    description="Production ML API for detecting fake news articles.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
TRUE_CSV = os.path.join(DATASETS_DIR, "True.csv")
FAKE_CSV = os.path.join(DATASETS_DIR, "Fake.csv")

# Global training state
_training_state: dict = {"status": "idle", "progress": 0, "message": ""}
_training_lock = threading.Lock()

# ── RSS Feed cache ─────────────────────────────────────────────────────────────
_rss_cache: dict = {}          # key → {"ts": float, "data": list}
_RSS_TTL = 300                 # seconds before cache expires (5 min)

# Google News RSS topic URLs
GNEWS_FEEDS = {
    "top":        "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
    "world":      "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en",
    "technology": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en",
    "science":    "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en",
    "health":     "https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNR3QwTlRFU0FtVnVLQUFQAQ?hl=en-US&gl=US&ceid=US:en",
    "business":   "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en",
    "sports":     "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en",
}


# ── Pydantic models ────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    text: str = Field(..., min_length=10, description="News article text to classify")

class TrainRequest(BaseModel):
    best_model: str = Field("LogisticRegression", description="Model to save as 'best'")
    test_size: float = Field(0.2, ge=0.05, le=0.4)
    max_features: int = Field(50000, ge=1000, le=200000)


# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    init_db()
    os.makedirs(DATASETS_DIR, exist_ok=True)

    # Symlink / copy original CSVs into datasets/ if not present
    original_true = os.path.join(BASE_DIR, "..", "True.csv")
    original_fake = os.path.join(BASE_DIR, "..", "Fake.csv")

    for src, dst in [(original_true, TRUE_CSV), (original_fake, FAKE_CSV)]:
        abs_src = os.path.abspath(src)
        if not os.path.exists(dst) and os.path.exists(abs_src):
            shutil.copy2(abs_src, dst)
            logger.info(f"Copied {abs_src} → {dst}")

    logger.info("Fake News Detection API started.")


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    model_ready = os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH)
    datasets_ready = os.path.exists(TRUE_CSV) and os.path.exists(FAKE_CSV)
    return {
        "status": "ok",
        "model_ready": model_ready,
        "datasets_ready": datasets_ready,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── Predict ────────────────────────────────────────────────────────────────────
@app.post("/api/predict")
def predict_endpoint(req: PredictRequest):
    if not os.path.exists(MODEL_PATH):
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Please train via POST /api/train first.",
        )

    cleaned = preprocess_single(req.text)
    if not cleaned.strip():
        raise HTTPException(status_code=422, detail="Text is empty after preprocessing.")

    result = ml_predict(req.text, cleaned)

    # Persist
    pred_id = save_prediction(
        text=req.text,
        label=result["label"],
        confidence=result["confidence"],
        fake_prob=result["probabilities"]["FAKE"],
        real_prob=result["probabilities"]["REAL"],
    )

    return {
        "id": pred_id,
        "label": result["label"],
        "confidence": result["confidence"],
        "probabilities": result["probabilities"],
        "input_text_length": len(req.text),
    }


# ── Train ──────────────────────────────────────────────────────────────────────
def _run_training(best_model: str, test_size: float, max_features: int):
    global _training_state
    t0 = time.time()
    run_id = save_training_run("running")

    def _progress(msg, pct):
        with _training_lock:
            _training_state["message"] = msg
            _training_state["progress"] = pct

    try:
        with _training_lock:
            _training_state = {"status": "running", "progress": 0, "message": "Loading data …"}

        # Load & preprocess
        df = load_and_label_datasets(TRUE_CSV, FAKE_CSV)
        df = preprocess_dataframe(df)

        summary = train_pipeline(
            df=df,
            best_model_name=best_model,
            test_size=test_size,
            max_features=max_features,
            progress_callback=_progress,
        )

        duration = round(time.time() - t0, 2)
        best_m = next(m for m in summary["all_models"] if m["model"] == best_model)
        save_training_run(
            "completed",
            best_model=best_model,
            accuracy=best_m["accuracy"],
            f1_score=best_m["f1_score"],
            total_samples=summary["train_size"] + summary["test_size"],
            duration_secs=duration,
        )

        with _training_lock:
            _training_state = {"status": "completed", "progress": 100, "message": "Done!", "summary": summary}

    except Exception as e:
        logger.exception("Training failed")
        save_training_run("failed")
        with _training_lock:
            _training_state = {"status": "error", "progress": 0, "message": str(e)}


@app.post("/api/train")
def train_endpoint(req: TrainRequest):
    global _training_state

    with _training_lock:
        if _training_state.get("status") == "running":
            raise HTTPException(status_code=409, detail="Training already in progress.")

    if not os.path.exists(TRUE_CSV) or not os.path.exists(FAKE_CSV):
        raise HTTPException(
            status_code=400,
            detail="Dataset files not found. Upload True.csv and Fake.csv first.",
        )

    t = threading.Thread(
        target=_run_training,
        args=(req.best_model, req.test_size, req.max_features),
        daemon=True,
    )
    t.start()

    return {"message": "Training started in background.", "status": "running"}


@app.get("/api/train/status")
def train_status():
    with _training_lock:
        state = dict(_training_state)
    return state


# ── Metrics ────────────────────────────────────────────────────────────────────
@app.get("/api/metrics")
def get_metrics():
    if not os.path.exists(METRICS_PATH):
        raise HTTPException(status_code=404, detail="No metrics found. Train the model first.")
    with open(METRICS_PATH) as f:
        metrics = json.load(f)
    return metrics


# ── Dataset stats ──────────────────────────────────────────────────────────────
@app.get("/api/dataset/stats")
def dataset_stats():
    if not os.path.exists(TRUE_CSV) or not os.path.exists(FAKE_CSV):
        raise HTTPException(status_code=404, detail="Dataset files not found.")
    df = load_and_label_datasets(TRUE_CSV, FAKE_CSV)
    return get_dataset_stats(df)


# ── History ────────────────────────────────────────────────────────────────────
@app.get("/api/history")
def prediction_history(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    rows = get_predictions(limit=limit, offset=offset)
    total = get_prediction_count()
    return {"total": total, "limit": limit, "offset": offset, "data": rows}


@app.get("/api/history/stats")
def history_stats():
    return get_prediction_stats()


# ── Dataset upload ─────────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_dataset(
    true_file: UploadFile = File(None),
    fake_file: UploadFile = File(None),
):
    os.makedirs(DATASETS_DIR, exist_ok=True)
    saved = []

    if true_file:
        dest = TRUE_CSV
        with open(dest, "wb") as f:
            f.write(await true_file.read())
        saved.append("True.csv")

    if fake_file:
        dest = FAKE_CSV
        with open(dest, "wb") as f:
            f.write(await fake_file.read())
        saved.append("Fake.csv")

    if not saved:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    return {"message": f"Uploaded: {', '.join(saved)}", "files": saved}


# ── Plots ──────────────────────────────────────────────────────────────────────
@app.get("/api/plots/{plot_name}")
def serve_plot(plot_name: str):
    # Sanitize
    safe_name = os.path.basename(plot_name)
    path = os.path.join(PLOTS_DIR, safe_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Plot '{safe_name}' not found.")
    return FileResponse(path, media_type="image/png")


@app.get("/api/plots")
def list_plots():
    if not os.path.exists(PLOTS_DIR):
        return {"plots": []}
    plots = [f for f in os.listdir(PLOTS_DIR) if f.endswith(".png")]
    return {"plots": plots}


# ── Live News (Google RSS + ML scoring) ────────────────────────────────────────
def _fetch_and_score(category: str = "top", max_items: int = 20) -> List[dict]:
    """Fetch Google News RSS, score each headline through the ML model."""
    cache_key = f"{category}:{max_items}"
    now = time.time()

    # Return cached result if still fresh
    if cache_key in _rss_cache and (now - _rss_cache[cache_key]["ts"]) < _RSS_TTL:
        return _rss_cache[cache_key]["data"]

    url = GNEWS_FEEDS.get(category, GNEWS_FEEDS["top"])
    model_ready = os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH)

    try:
        # feedparser can't always handle redirect chains well; use httpx first
        with httpx.Client(follow_redirects=True, timeout=15) as client:
            resp = client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; FakeShield/1.0)"})
            raw_xml = resp.text
        feed = feedparser.parse(raw_xml)
    except Exception as e:
        logger.warning(f"RSS fetch failed, falling back to feedparser direct: {e}")
        feed = feedparser.parse(url)

    articles = []
    for entry in feed.entries[:max_items]:
        title    = getattr(entry, "title",   "").strip()
        summary  = getattr(entry, "summary", "").strip()
        link     = getattr(entry, "link",    "").strip()
        pub_date = getattr(entry, "published", "").strip()
        source   = ""
        if hasattr(entry, "source"):
            source = getattr(entry.source, "title", "")

        # Combine title + summary for a richer prediction
        body = f"{title}. {summary}" if summary else title

        prediction = None
        if model_ready and body.strip():
            try:
                cleaned = preprocess_single(body)
                if cleaned.strip():
                    prediction = ml_predict(body, cleaned)
            except Exception as pred_err:
                logger.warning(f"Prediction failed for article: {pred_err}")

        articles.append({
            "title":      title,
            "summary":    summary,
            "link":       link,
            "source":     source,
            "published":  pub_date,
            "label":      prediction["label"]                  if prediction else None,
            "confidence": prediction["confidence"]             if prediction else None,
            "fake_prob":  prediction["probabilities"]["FAKE"]  if prediction else None,
            "real_prob":  prediction["probabilities"]["REAL"]  if prediction else None,
        })

    _rss_cache[cache_key] = {"ts": now, "data": articles}
    return articles


@app.get("/api/news/live")
def live_news(
    category: str = Query("top", description="Feed category"),
    limit: int     = Query(20,    ge=1, le=50),
    refresh: bool  = Query(False, description="Force-bust the cache"),
):
    """Return live Google News headlines scored by the ML model."""
    if category not in GNEWS_FEEDS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown category '{category}'. Valid: {list(GNEWS_FEEDS.keys())}",
        )
    if refresh:
        cache_key = f"{category}:{limit}"
        _rss_cache.pop(cache_key, None)

    model_ready = os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH)
    articles = _fetch_and_score(category=category, max_items=limit)
    return {
        "category":    category,
        "model_ready": model_ready,
        "count":       len(articles),
        "cached_ttl":  _RSS_TTL,
        "articles":    articles,
    }


@app.get("/api/news/categories")
def news_categories():
    """Return available RSS feed categories."""
    return {"categories": list(GNEWS_FEEDS.keys())}
