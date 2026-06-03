# FakeShield – Complete Technical Walkthrough

> Every module · Every tech stack component · Exactly how it's used

---

## 🗂 Project Map

```
Fake_news_detection_personal/
│
├── True.csv / Fake.csv          ← Raw datasets (root, auto-copied to datasets/)
│
├── backend/
│   ├── api/
│   │   └── main.py              ← FastAPI app — all REST endpoints (incl. live news)
│   ├── models/
│   │   └── database.py          ← SQLite ORM helpers
│   ├── training/
│   │   └── trainer.py           ← Full ML pipeline
│   ├── utils/
│   │   └── preprocessor.py      ← Text cleaning + dataset loader
│   ├── saved_models/            ← joblib artifacts + PNG plots (auto-created)
│   ├── datasets/                ← Working copies of CSVs (auto-created)
│   ├── fake_news.db             ← SQLite database file (auto-created)
│   └── requirements.txt
│
├── frontend/
│   ├── public/index.html
│   ├── tailwind.config.js
│   └── src/
│       ├── index.js             ← React entry point
│       ├── index.css            ← Tailwind directives + custom CSS
│       ├── App.js               ← Router + layout
│       ├── api.js               ← Central HTTP client
│       ├── ThemeContext.js      ← Dark/light theme state
│       ├── components/
│       │   ├── Sidebar.jsx      ← Navigation (7 links incl. Live News)
│       │   └── UI.jsx           ← Reusable UI primitives
│       └── pages/
│           ├── HomePage.jsx     ← Dashboard overview
│           ├── DetectPage.jsx   ← Article classifier
│           ├── TrainPage.jsx    ← Training dashboard
│           ├── AnalyticsPage.jsx← Charts & metrics
│           ├── HistoryPage.jsx  ← Prediction history
│           ├── UploadPage.jsx   ← CSV uploader
│           └── LiveNewsPage.jsx ← Google News RSS + ML credibility scoring  ← NEW
│
└── README.md
```

---

## ⚙️ Tech Stack — Complete Reference

### Backend

| Technology | Version | Role |
|-----------|---------|------|
| **Python** | 3.9+ | Runtime language |
| **FastAPI** | 0.104+ | REST API framework; async, auto-docs |
| **Uvicorn** | 0.24+ | ASGI server that runs FastAPI |
| **scikit-learn** | 1.3+ | TF-IDF vectorizer + all 4 ML classifiers |
| **pandas** | 2.0+ | CSV loading, DataFrame manipulation |
| **numpy** | 1.24+ | Array ops for probability calculations |
| **matplotlib** | 3.7+ | Generates all training plots (PNG files) |
| **seaborn** | 0.12+ | Styled heatmaps (confusion matrices) |
| **joblib** | 1.3+ | Serialize/deserialize trained model + vectorizer |
| **SQLite** | built-in | Stores prediction history & training runs |
| **python-multipart** | 0.0.6+ | Parses multipart/form-data for file uploads |
| **threading** | built-in | Runs training in background thread |
| **feedparser** | 6.0+ | Parses Google News RSS XML feeds into Python dicts |
| **httpx** | 0.25+ | Robust async-capable HTTP client; fetches RSS with redirect support |

### Frontend

| Technology | Version | Role |
|-----------|---------|------|
| **React** | 18 | UI framework, component model |
| **React Router DOM** | v6 | Client-side routing (SPA navigation) |
| **Tailwind CSS** | v3 | Utility-first CSS framework |
| **PostCSS + Autoprefixer** | - | Tailwind build pipeline |
| **Recharts** | latest | Bar charts, Pie charts, Radial bar charts |
| **lucide-react** | latest | Icon set (Zap, Clock, Upload, etc.) |
| **framer-motion** | latest | Animation utilities (available, not yet wired) |
| **axios** | latest | Installed; `api.js` uses native `fetch` |

---

## 🧠 ML Pipeline — `backend/training/trainer.py`

### What it does (step by step)

```
Raw DataFrames
    │
    ▼
TfidfVectorizer.fit_transform(cleaned_text)
    │   max_features=50000, ngram_range=(1,2)
    │   sublinear_tf=True, stop_words='english'
    ▼
train_test_split  (80% train / 20% test, stratified)
    │
    ├──► LogisticRegression  (max_iter=1000)
    ├──► MultinomialNB
    ├──► DecisionTreeClassifier
    └──► RandomForestClassifier (n_estimators=100, n_jobs=-1)
         │
         ▼
    evaluate() → accuracy, precision, recall, F1, ROC-AUC,
                 confusion matrix, classification report
         │
         ▼
    Save PNG plots → saved_models/plots/
    Save best model → saved_models/best_model.joblib
    Save vectorizer → saved_models/tfidf_vectorizer.joblib
    Save metrics    → saved_models/metrics.json
```

### Key functions

| Function | Purpose |
|----------|---------|
| `train_pipeline(df, ...)` | Orchestrates the full training run; accepts `progress_callback` for live updates |
| `_evaluate(clf, X_test, y_test)` | Returns dict with all metrics including ROC curve data |
| `_save_confusion_matrix_plot()` | Seaborn heatmap → PNG |
| `_save_roc_plot()` | Matplotlib ROC curve → PNG |
| `_save_class_distribution_plot()` | Bar + pie chart → PNG |
| `_save_model_comparison_plot()` | Bar chart of all model accuracies → PNG |
| `load_model_and_vectorizer()` | Loads from disk; raises `RuntimeError` if missing |
| `predict(text, cleaned_text)` | Runs inference; returns label, confidence, probabilities |

### How `predict()` works

```python
X = vectorizer.transform([cleaned_text])   # sparse TF-IDF matrix
label_int = clf.predict(X)[0]              # 0 = FAKE, 1 = REAL
proba = clf.predict_proba(X)[0]            # [fake_prob, real_prob]
confidence = max(proba)
```

---

## 🔧 Text Preprocessor — `backend/utils/preprocessor.py`

### Pipeline applied to every article

```
raw text
  │
  ├─ .lower()
  ├─ remove URLs  (https?://\S+|www\.\S+)
  ├─ remove HTML tags  (<.*?>)
  ├─ remove non-alpha chars  ([^a-z\s])
  └─ collapse whitespace  (\s+) → " "
```

### Key functions

| Function | Used by |
|----------|---------|
| `clean_text(text)` | Called on every row during training; called on user input before inference |
| `load_and_label_datasets(true_path, fake_path)` | Reads both CSVs, assigns label=1 (Real) / label=0 (Fake), concatenates |
| `preprocess_dataframe(df)` | Applies `clean_text` to entire DataFrame column; drops empty rows |
| `preprocess_single(text)` | Cleans a single string; used by `/api/predict` |
| `get_dataset_stats(df)` | Returns total, real_count, fake_count, avg_text_length, subject_distribution |

---

## 🗄️ Database — `backend/models/database.py`

### Tables

#### `predictions`
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
text       TEXT          -- first 2000 chars of input
label      TEXT          -- 'REAL' or 'FAKE'
confidence REAL          -- 0.0–1.0
fake_prob  REAL
real_prob  REAL
model_name TEXT
created_at TEXT          -- ISO 8601 UTC
```

#### `training_runs`
```sql
id             INTEGER PRIMARY KEY AUTOINCREMENT
status         TEXT     -- 'running' | 'completed' | 'failed'
best_model     TEXT
accuracy       REAL
f1_score       REAL
total_samples  INTEGER
duration_secs  REAL
created_at     TEXT
```

### Key functions

| Function | Used by |
|----------|---------|
| `init_db()` | Called on FastAPI startup; creates tables if missing |
| `save_prediction(...)` | Called after every `/api/predict` |
| `get_predictions(limit, offset)` | Powers `/api/history` with pagination |
| `get_prediction_stats()` | Powers `/api/history/stats` |
| `save_training_run(status, ...)` | Called at start + end of training |
| `get_latest_training_run()` | Available for future dashboard widgets |

---

## 🌐 REST API — `backend/api/main.py`

### Startup hook
```python
@app.on_event("startup")
def startup_event():
    init_db()                     # ensure SQLite tables exist
    # auto-copy True.csv / Fake.csv from project root → datasets/
```

### All Endpoints

#### `GET /api/health`
Returns: `{status, model_ready, datasets_ready, timestamp}`  
- Checks if `best_model.joblib` and both CSVs exist on disk

#### `POST /api/predict`
Body: `{"text": "article text here..."}`  
Returns: `{id, label, confidence, probabilities, input_text_length}`  
Flow:
1. Validate text ≥ 10 chars (Pydantic)
2. `preprocess_single(text)` → cleaned string
3. `ml_predict(text, cleaned)` → label + probs
4. `save_prediction(...)` → persist to SQLite
5. Return result

#### `POST /api/train`
Body: `{"best_model": "LogisticRegression", "test_size": 0.2, "max_features": 50000}`  
- Launches `_run_training()` in a **background `threading.Thread`** so the API stays responsive
- Returns immediately with `{"status": "running"}`
- Raises HTTP 409 if training is already in progress

#### `GET /api/train/status`
Returns: `{status, progress, message, summary?}`  
- Frontend polls this every 2 seconds during training
- `summary` is attached when status = "completed"

#### `GET /api/metrics`
Returns: full `metrics.json` contents  
- Includes `all_models` array with accuracy, F1, precision, recall, ROC-AUC, confusion matrix, classification_report

#### `GET /api/dataset/stats`
Loads both CSVs → runs `get_dataset_stats()` → returns JSON

#### `GET /api/history?limit=50&offset=0`
Paginated prediction log from SQLite

#### `GET /api/history/stats`
Returns `{total, real_count, fake_count, avg_confidence}`

#### `POST /api/upload`
Multipart form with `true_file` and/or `fake_file`  
Writes directly to `datasets/True.csv` and `datasets/Fake.csv`

#### `GET /api/plots` → list of PNG filenames
#### `GET /api/plots/{name}` → serves PNG via `FileResponse`

#### `GET /api/news/live?category=top&limit=20&refresh=false`  ← NEW
Returns: `{category, model_ready, count, cached_ttl, articles[]}`  
Each article: `{title, summary, link, source, published, label, confidence, fake_prob, real_prob}`  
Flow:
1. Check 5-minute in-memory cache (`_rss_cache`); return cached data if still fresh
2. Fetch Google News RSS XML via **httpx** (with redirect following + User-Agent)
3. Parse XML with **feedparser** → extract title, summary, link, source, published
4. For each entry: concatenate `title + summary` → `preprocess_single()` → `ml_predict()`
5. Attach `label`, `confidence`, `fake_prob`, `real_prob` to each article dict
6. Store result in cache with current timestamp
7. `refresh=true` query param busts the cache before fetching
8. Returns HTTP 400 if an unknown `category` is requested

Available categories: `top`, `world`, `business`, `technology`, `science`, `health`, `sports`

#### `GET /api/news/categories`  ← NEW
Returns: `{categories: ["top", "world", "business", ...]}`

### RSS Cache Design
```python
_rss_cache: dict  # { "category:limit" → {"ts": float, "data": list} }
_RSS_TTL = 300    # 5 minutes — avoids hammering Google News on every page load
```

### CORS
```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```
Allows the React dev server (port 3000) to call the API (port 8000).

---

## ⚛️ Frontend — Module by Module

### `src/index.js`
React 18 entry point. Mounts `<App />` into `#root`.

### `src/App.js`
- Wraps everything in `<ThemeProvider>` and `<BrowserRouter>`
- Defines the `<Routes>` tree mapping URLs to page components
- Renders `<Sidebar>` + `<main>` layout side by side

### `src/ThemeContext.js`
- `createContext` + `useState(true)` (starts in dark mode)
- `toggle()` flips the boolean → adds/removes `class="dark"` on wrapper div
- Tailwind `darkMode: "class"` reads this

### `src/api.js`
Central HTTP client. Every API call goes through `request(path, options)`:
```js
const res = await fetch(`${API_BASE}${path}`, { ... });
if (!res.ok) throw new Error(err.detail);
return res.json();
```
Exported functions:
- `predictText(text)` → POST /api/predict
- `startTraining(params)` → POST /api/train
- `getTrainingStatus()` → GET /api/train/status
- `getMetrics()` → GET /api/metrics
- `getHealth()` → GET /api/health
- `getDatasetStats()` → GET /api/dataset/stats
- `getHistory(limit, offset)` → GET /api/history
- `getHistoryStats()` → GET /api/history/stats
- `uploadDatasets(trueFile, fakeFile)` → POST /api/upload (FormData)
- `getPlotUrl(name)` → returns string URL
- `getPlotList()` → GET /api/plots
- `getLiveNews(category, limit, refresh)` → GET /api/news/live  ← NEW
- `getNewsCategories()` → GET /api/news/categories  ← NEW

### `src/components/Sidebar.jsx`
- Uses `NavLink` from React Router → applies `active` class automatically
- `useTheme()` hook → shows Sun/Moon toggle button
- Static `links` array drives all navigation items (7 total, including **Live News** with `Rss` icon)

### `src/components/UI.jsx`
Shared primitives:

| Component | Props | Renders |
|-----------|-------|---------|
| `<StatCard>` | title, value, sub, icon, color | Colored icon + stat text |
| `<Badge>` | type="real"\|"fake" | Green ✓ REAL / Red ✕ FAKE pill |
| `<Spinner>` | size | Animated SVG spinner |
| `<ProgressBar>` | pct, label, animated | Gradient progress bar |
| `<AlertBox>` | type="info\|success\|error\|warning" | Colored alert block |

---

## 📄 Pages — Detailed

### `HomePage.jsx`
- `useEffect` → calls `getHealth()` + `getMetrics()` in parallel
- Renders hero gradient banner, 4 `<StatCard>` widgets, model performance table, feature card grid
- Shows "Not Trained" / "Ready" status dynamically from API

### `DetectPage.jsx`
- Local state: `text`, `result`, `loading`, `error`
- Two sample article strings (REAL + FAKE) embedded for demo
- On submit: calls `predictText(text)` → displays verdict + `<RadialBarChart>` from Recharts
- Probability breakdown shown as two animated progress bars
- Character counter shown below textarea

### `TrainPage.jsx`
- Config state: `best_model`, `test_size`, `max_features`
- `handleTrain()` → calls `startTraining(config)`, then `setInterval` polling `getTrainingStatus()` every 2s
- Live `<ProgressBar animated>` during training
- Results table renders when `status.status === "completed"`
- Plot gallery loads via `getPlotList()` + `getPlotUrl()` after completion

### `AnalyticsPage.jsx`
- Fetches metrics + dataset stats + plot list in `Promise.all`
- **Recharts `<BarChart>`**: 4 grouped bars per model (Accuracy, F1, Precision, Recall)
- **Recharts `<PieChart>`**: Real vs Fake class split
- Detailed metrics table with all 5 metrics per model
- Subject distribution horizontal bar chart (pure CSS bars)
- Plot gallery at bottom (all PNG files from API)

### `HistoryPage.jsx`
- Pagination: `LIMIT = 25`, page state, Prev/Next buttons
- Stats row: 4 `<StatCard>` widgets from `getHistoryStats()`
- Table: ID, `<Badge>`, confidence (color-coded by value), text snippet, timestamp

### `UploadPage.jsx`
- `<FileDropZone>` sub-component: handles both click-to-browse and drag-and-drop
- State: `trueFile`, `fakeFile` (File objects)
- `handleUpload()` → builds `FormData`, calls `uploadDatasets(trueFile, fakeFile)`
- Shows success/error `<AlertBox>` after upload
- CSV format reference table below

### `LiveNewsPage.jsx`  ← NEW
- Fetches live headlines from Google News via `getLiveNews(category, limit)`
- **Category tabs**: 7 topics (Top Stories, World, Business, Technology, Science, Health, Sports)
- **Article cards**: title, source, cleaned summary snippet, credibility badge (REAL/FAKE), dual probability bars, publication timestamp, external link
- **Summary stats bar**: total articles, scored, real count, fake count, avg confidence
- **Filter row**: ALL / REAL / FAKE toggle to narrow visible cards
- **Refresh button**: calls `getLiveNews(category, limit, refresh=true)` to force-bust the 5-min server cache
- **Model-not-ready warning**: `<AlertBox type="warning">` with link to `/train` when model absent
- **Legend footer**: explains REAL/FAKE labels and 5-minute cache behaviour
- Card colours: green border for REAL, red border for FAKE, slate for unscored
- `animationDelay` stagger on cards for smooth cascade entrance animation

---

## 🎨 Styling System — Tailwind CSS

### Custom tokens (`tailwind.config.js`)

```js
colors: {
  primary: { 50–900 }   // Indigo/violet scale
  danger:  { 400–600 }  // Red scale
  success: { 400–600 }  // Green scale
}
animations: {
  "fade-in", "slide-up", "pulse-slow"
}
```

### Custom CSS classes (`index.css`)

| Class | Style |
|-------|-------|
| `.card` | `bg-slate-900 border rounded-2xl shadow-xl` |
| `.card-glass` | `bg-white/5 backdrop-blur-md border-white/10` |
| `.btn-primary` | `bg-primary-600 hover:primary-500 active:scale-95` |
| `.btn-secondary` | `bg-slate-700 hover:slate-600` |
| `.badge-real` | Green pill with border |
| `.badge-fake` | Red pill with border |
| `.nav-link` | Sidebar link with hover state |
| `.nav-link.active` | Primary-tinted with border |
| `.input-field` | Dark textarea/input with focus ring |
| `.progress-animated` | Striped animation for active progress |

---

## 🔄 Data Flow — End to End

### Predict flow
```
User types text
    ↓
DetectPage.handlePredict()
    ↓
api.predictText(text)   →   POST /api/predict
                                ↓
                        preprocess_single(text)   [utils/preprocessor.py]
                                ↓
                        ml_predict(text, cleaned) [training/trainer.py]
                            vectorizer.transform()
                            clf.predict() + predict_proba()
                                ↓
                        save_prediction(...)      [models/database.py]
                                ↓
                        return JSON response
    ↓
setResult(data) → renders verdict card + Recharts radial chart
```

### Training flow
```
User clicks "Start Training"
    ↓
TrainPage.handleTrain()
    ↓
api.startTraining(config)   →   POST /api/train
                                    ↓
                            threading.Thread(_run_training)
                            [non-blocking, returns 200 immediately]
                                    ↓ (background)
                            load_and_label_datasets()
                            preprocess_dataframe()
                            train_pipeline()
                                TfidfVectorizer.fit_transform()
                                train_test_split()
                                for each model: fit → evaluate → plot
                                joblib.dump(clf, MODEL_PATH)
                                joblib.dump(vectorizer, VECTORIZER_PATH)
                                write metrics.json
    ↓
setInterval every 2s
    ↓
api.getTrainingStatus()   →   GET /api/train/status
                                    ↓
                            reads _training_state dict (thread-safe via lock)
    ↓
Updates ProgressBar + status badge in real time
    ↓
When status="completed": renders results table + loads plot gallery
```

### Live News flow  ← NEW
```
User opens /live-news  (or changes category tab)
    ↓
LiveNewsPage.fetchNews(category)
    ↓
api.getLiveNews(category, limit)   →   GET /api/news/live?category=top&limit=20
                                            ↓
                                    Check _rss_cache — hit? return immediately
                                            ↓ (cache miss)
                                    httpx.Client.get(GNEWS_FEEDS[category])
                                    feedparser.parse(raw_xml)
                                            ↓
                                    for each entry (up to 20):
                                        body = title + summary
                                        cleaned = preprocess_single(body)
                                        prediction = ml_predict(body, cleaned)
                                    store in _rss_cache with timestamp
                                            ↓
                                    return {articles: [{title, label, confidence, ...}]}
    ↓
setArticles(data.articles)
    ↓
Renders SummaryBar + ArticleCard grid
(filter row lets user show ALL | REAL | FAKE)
```

---

## 🏃 Running the App

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

**On startup:**
- Creates SQLite tables
- Copies `True.csv` + `Fake.csv` from project root → `datasets/`
- API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm start        # → http://localhost:3000
```

### First time
1. Go to **http://localhost:3000/train**
2. Click **Start Training** (takes ~2–3 min for 44k articles)
3. Go to **http://localhost:3000/detect** → paste any article → Detect News
4. Go to **http://localhost:3000/analytics** → view all charts
5. Go to **http://localhost:3000/live-news** → browse live Google News headlines with ML credibility scores  ← NEW

---

## 📦 File Reference Summary

| File | Lines | What it does |
|------|-------|-------------|
| `backend/api/main.py` | ~415 | 12 REST endpoints, CORS, startup, background training thread, RSS cache + live news scoring |
| `backend/training/trainer.py` | ~250 | TF-IDF + 4 ML models + plots + joblib save/load |
| `backend/utils/preprocessor.py` | ~90 | Text cleaning, CSV loading, dataset statistics |
| `backend/models/database.py` | ~100 | SQLite: predictions + training_runs tables |
| `frontend/src/App.js` | ~26 | Router + layout wrapper |
| `frontend/src/api.js` | ~96 | All 13 API calls (incl. getLiveNews, getNewsCategories) |
| `frontend/src/pages/HomePage.jsx` | ~90 | Hero + stat cards + model table |
| `frontend/src/pages/DetectPage.jsx` | ~140 | Full classify UI with Recharts |
| `frontend/src/pages/TrainPage.jsx` | ~130 | Config + live status + plot gallery |
| `frontend/src/pages/AnalyticsPage.jsx` | ~160 | Bar/pie charts + metrics + subject dist |
| `frontend/src/pages/HistoryPage.jsx` | ~100 | Paginated history table |
| `frontend/src/pages/UploadPage.jsx` | ~110 | Drag-drop file upload |
| `frontend/src/pages/LiveNewsPage.jsx` | ~280 | Google News RSS live feed + ML credibility scoring  ← NEW |
| `frontend/src/components/Sidebar.jsx` | ~60 | Nav links (7 items) + theme toggle |
| `frontend/src/components/UI.jsx` | ~65 | StatCard, Badge, Spinner, ProgressBar, AlertBox |
| `frontend/src/index.css` | ~85 | Tailwind directives + all custom CSS classes |
