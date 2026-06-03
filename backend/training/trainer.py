"""
ML Training Pipeline for Fake News Detection.
Mirrors the notebook logic:
  - TF-IDF Vectorizer
  - Logistic Regression, Naive Bayes, Decision Tree, Random Forest
  - Evaluation metrics: accuracy, precision, recall, F1, confusion matrix, ROC-AUC
  - Save best model + vectorizer via joblib
"""

import os
import json
import logging
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")   # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
    roc_curve,
    precision_score,
    recall_score,
    f1_score,
)
import joblib

# ── logging setup ──────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAVED_MODELS_DIR = os.path.join(BASE_DIR, "saved_models")
METRICS_PATH = os.path.join(SAVED_MODELS_DIR, "metrics.json")
VECTORIZER_PATH = os.path.join(SAVED_MODELS_DIR, "tfidf_vectorizer.joblib")
MODEL_PATH = os.path.join(SAVED_MODELS_DIR, "best_model.joblib")
PLOTS_DIR = os.path.join(SAVED_MODELS_DIR, "plots")

os.makedirs(SAVED_MODELS_DIR, exist_ok=True)
os.makedirs(PLOTS_DIR, exist_ok=True)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_classifier(name: str):
    """Return an unfitted scikit-learn classifier by name."""
    classifiers = {
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "NaiveBayes": MultinomialNB(),
        "DecisionTree": DecisionTreeClassifier(random_state=42),
        "RandomForest": RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
    }
    if name not in classifiers:
        raise ValueError(f"Unknown classifier: {name}. Choose from {list(classifiers.keys())}")
    return classifiers[name]


def _evaluate(clf, X_test, y_test, model_name: str) -> dict:
    """Compute full evaluation metrics for a trained classifier."""
    y_pred = clf.predict(X_test)

    metrics = {
        "model": model_name,
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, y_pred, zero_division=0), 4),
        "classification_report": classification_report(
            y_test, y_pred, target_names=["Fake", "Real"], output_dict=True
        ),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
    }

    # ROC-AUC (requires predict_proba or decision_function)
    try:
        if hasattr(clf, "predict_proba"):
            y_prob = clf.predict_proba(X_test)[:, 1]
        else:
            y_prob = clf.decision_function(X_test)
        metrics["roc_auc"] = round(roc_auc_score(y_test, y_prob), 4)
        # Store ROC curve data
        fpr, tpr, _ = roc_curve(y_test, y_prob)
        metrics["roc_fpr"] = fpr.tolist()
        metrics["roc_tpr"] = tpr.tolist()
    except Exception:
        metrics["roc_auc"] = None

    return metrics


def _save_confusion_matrix_plot(cm, model_name: str, labels=("Fake", "Real")):
    """Save a seaborn heatmap of the confusion matrix."""
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=labels,
        yticklabels=labels,
        ax=ax,
    )
    ax.set_xlabel("Predicted Label", fontsize=12)
    ax.set_ylabel("True Label", fontsize=12)
    ax.set_title(f"Confusion Matrix – {model_name}", fontsize=13, fontweight="bold")
    plt.tight_layout()
    path = os.path.join(PLOTS_DIR, f"confusion_matrix_{model_name}.png")
    plt.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return path


def _save_roc_plot(fpr, tpr, auc_val, model_name: str):
    """Save an ROC curve plot."""
    fig, ax = plt.subplots(figsize=(6, 5))
    ax.plot(fpr, tpr, lw=2, label=f"AUC = {auc_val:.4f}", color="#2ecc71")
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title(f"ROC Curve – {model_name}", fontsize=13, fontweight="bold")
    ax.legend(loc="lower right")
    plt.tight_layout()
    path = os.path.join(PLOTS_DIR, f"roc_curve_{model_name}.png")
    plt.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return path


def _save_class_distribution_plot(df: pd.DataFrame):
    """Save class distribution bar + pie charts (mirrors notebook Figure 1)."""
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    label_counts = df["label"].value_counts()
    colors = ["#e74c3c", "#2ecc71"]

    # Bar
    axes[0].bar(["Fake News", "Real News"], label_counts.values, color=colors, edgecolor="black", width=0.5)
    axes[0].set_title("Article Count: Real vs Fake", fontsize=14, fontweight="bold")
    axes[0].set_ylabel("Number of Articles")
    for i, v in enumerate(label_counts.values):
        axes[0].text(i, v + 50, f"{v:,}", ha="center", fontweight="bold")

    # Pie
    axes[1].pie(
        label_counts.values,
        labels=["Fake News", "Real News"],
        autopct="%1.1f%%",
        colors=colors,
        startangle=90,
        wedgeprops=dict(edgecolor="white", linewidth=2),
    )
    axes[1].set_title("Class Distribution (%)", fontsize=14, fontweight="bold")

    plt.suptitle("Dataset Class Distribution", fontsize=15, y=1.02)
    plt.tight_layout()
    path = os.path.join(PLOTS_DIR, "class_distribution.png")
    plt.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return path


def _save_model_comparison_plot(all_metrics: list):
    """Bar chart comparing model accuracies."""
    names = [m["model"] for m in all_metrics]
    accs = [m["accuracy"] for m in all_metrics]

    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.bar(names, accs, color=["#3498db", "#9b59b6", "#e67e22", "#2ecc71"], edgecolor="black")
    ax.set_ylim(0.85, 1.0)
    ax.set_ylabel("Accuracy")
    ax.set_title("Model Comparison – Accuracy", fontsize=14, fontweight="bold")
    for bar, acc in zip(bars, accs):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.002, f"{acc:.4f}", ha="center", fontsize=11)
    plt.tight_layout()
    path = os.path.join(PLOTS_DIR, "model_comparison.png")
    plt.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return path


# ── Main train function ────────────────────────────────────────────────────────

def train_pipeline(
    df: pd.DataFrame,
    text_col: str = "cleaned_text",
    label_col: str = "label",
    test_size: float = 0.2,
    random_state: int = 42,
    max_features: int = 50000,
    ngram_range: tuple = (1, 2),
    best_model_name: str = "LogisticRegression",
    progress_callback=None,
) -> dict:
    """
    Full training pipeline:
      1. TF-IDF vectorization
      2. Train/test split
      3. Train all four classifiers
      4. Evaluate and produce plots
      5. Save best model + vectorizer
      6. Return consolidated metrics dict
    """

    def _progress(msg: str, pct: int):
        logger.info(f"[{pct}%] {msg}")
        if progress_callback:
            progress_callback(msg, pct)

    _progress("Starting pipeline …", 0)

    # ── TF-IDF ────────────────────────────────────────────────────────────────
    _progress("Fitting TF-IDF vectorizer …", 10)
    vectorizer = TfidfVectorizer(
        max_features=max_features,
        ngram_range=ngram_range,
        sublinear_tf=True,
        strip_accents="unicode",
        analyzer="word",
        token_pattern=r"\b[a-z]{2,}\b",
        stop_words="english",
    )
    X = vectorizer.fit_transform(df[text_col].astype(str))
    y = df[label_col].values

    # ── Train/Test split ───────────────────────────────────────────────────────
    _progress("Splitting data …", 20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    # ── Save class distribution plot ───────────────────────────────────────────
    _progress("Generating class distribution plot …", 25)
    _save_class_distribution_plot(df)

    # ── Train all classifiers ──────────────────────────────────────────────────
    classifier_names = ["LogisticRegression", "NaiveBayes", "DecisionTree", "RandomForest"]
    all_metrics = []
    trained_models = {}

    for i, name in enumerate(classifier_names):
        pct = 30 + i * 15
        _progress(f"Training {name} …", pct)
        clf = _make_classifier(name)
        clf.fit(X_train, y_train)
        trained_models[name] = clf

        m = _evaluate(clf, X_test, y_test, name)
        all_metrics.append(m)

        # Confusion matrix plot
        cm = np.array(m["confusion_matrix"])
        _save_confusion_matrix_plot(cm, name)

        # ROC plot
        if m.get("roc_auc") is not None:
            _save_roc_plot(m["roc_fpr"], m["roc_tpr"], m["roc_auc"], name)

    # ── Model comparison plot ──────────────────────────────────────────────────
    _progress("Generating model comparison plot …", 90)
    _save_model_comparison_plot(all_metrics)

    # ── Save best model ────────────────────────────────────────────────────────
    _progress(f"Saving best model ({best_model_name}) and vectorizer …", 93)
    best_clf = trained_models[best_model_name]
    joblib.dump(best_clf, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)

    # Determine best by F1
    best_auto = max(all_metrics, key=lambda m: m["f1_score"])

    # ── Build metrics summary ──────────────────────────────────────────────────
    summary = {
        "best_model_saved": best_model_name,
        "best_auto_f1_model": best_auto["model"],
        "train_size": int(X_train.shape[0]),
        "test_size": int(X_test.shape[0]),
        "total_features": int(X.shape[1]),
        "all_models": all_metrics,
        "dataset_stats": {
            "total": int(len(df)),
            "real": int((df[label_col] == 1).sum()),
            "fake": int((df[label_col] == 0).sum()),
        },
    }

    # Serialise (drop roc curve arrays to keep JSON small)
    for m in summary["all_models"]:
        m.pop("roc_fpr", None)
        m.pop("roc_tpr", None)

    with open(METRICS_PATH, "w") as f:
        json.dump(summary, f, indent=2)

    _progress("Training complete!", 100)
    return summary


# ── Inference ──────────────────────────────────────────────────────────────────

def load_model_and_vectorizer():
    """Load saved model and vectorizer; raise RuntimeError if not found."""
    if not os.path.exists(MODEL_PATH) or not os.path.exists(VECTORIZER_PATH):
        raise RuntimeError(
            "Model or vectorizer not found. Please train the model first via POST /api/train"
        )
    clf = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    return clf, vectorizer


def predict(text: str, cleaned_text: str) -> dict:
    """
    Run inference on a single piece of text.
    Returns label, confidence, and probability breakdown.
    """
    clf, vectorizer = load_model_and_vectorizer()
    X = vectorizer.transform([cleaned_text])

    label_int = int(clf.predict(X)[0])
    label_str = "REAL" if label_int == 1 else "FAKE"

    # Probabilities
    if hasattr(clf, "predict_proba"):
        proba = clf.predict_proba(X)[0]
        fake_prob = round(float(proba[0]), 4)
        real_prob = round(float(proba[1]), 4)
        confidence = round(float(max(proba)), 4)
    else:
        # Decision function fallback (e.g., SVM)
        score = float(clf.decision_function(X)[0])
        real_prob = round(1 / (1 + np.exp(-score)), 4)
        fake_prob = round(1 - real_prob, 4)
        confidence = max(real_prob, fake_prob)

    return {
        "label": label_str,
        "label_int": label_int,
        "confidence": confidence,
        "probabilities": {
            "FAKE": fake_prob,
            "REAL": real_prob,
        },
    }
