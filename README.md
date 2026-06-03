# FakeShield – Fake News Detection Web Application

A **production-level full-stack machine learning application** that detects fake news articles using scikit-learn classifiers, a FastAPI backend, and a modern React + Tailwind CSS frontend.

---

## 🗂 Project Structure

```
Fake_news_detection_personal/
├── backend/
│   ├── api/
│   │   └── main.py          # FastAPI app (all REST endpoints)
│   ├── models/
│   │   └── database.py      # SQLite helpers (predictions + training runs)
│   ├── training/
│   │   └── trainer.py       # ML pipeline (TF-IDF + 4 classifiers)
│   ├── utils/
│   │   └── preprocessor.py  # Text cleaning + dataset loading
│   ├── saved_models/        # joblib model + vectorizer + plots (auto-created)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # HomePage, DetectPage, TrainPage, AnalyticsPage, HistoryPage, UploadPage
│   │   ├── components/      # Sidebar, UI primitives
│   │   ├── api.js           # Central API client
│   │   └── App.js
│   └── package.json
├── datasets/                # True.csv + Fake.csv (auto-copied on startup)
├── True.csv                 # Place original CSVs here
├── Fake.csv
└── README.md
```

---

## ⚙️ Setup & Running

### 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt

# Start the API server
uvicorn api.main:app --reload --port 8000
```

The API docs are available at: **http://localhost:8000/docs**

### 2. Frontend (React)

```bash
cd frontend
npm install
npm start
```

Opens at: **http://localhost:3000**

---

## 🚀 First-time Usage

1. **Start the backend** – it will auto-copy `True.csv` / `Fake.csv` from the project root into `datasets/`.
2. **Go to Training** (http://localhost:3000/train), click **Start Training**.
   - Training ~44k articles takes 1-3 minutes depending on your hardware.
3. **Detect** – go to http://localhost:3000/detect, paste any news article and click **Detect News**.
4. **Analytics** – view charts, metrics, and training plots.
5. **History** – view all past predictions with labels and confidence scores.

---

## 🤖 ML Pipeline

| Step | Detail |
|------|--------|
| **Preprocessing** | Lowercase, remove URLs/HTML/punctuation, collapse whitespace |
| **Vectorization** | TF-IDF with 50,000 features, bigrams, sublinear TF |
| **Models** | Logistic Regression, Naive Bayes, Decision Tree, Random Forest |
| **Metrics** | Accuracy, Precision, Recall, F1-Score, ROC-AUC, Confusion Matrix |
| **Persistence** | Best model saved via joblib |

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check + model/dataset status |
| POST | `/api/predict` | Predict a single article `{"text": "..."}` |
| POST | `/api/train` | Start background training |
| GET | `/api/train/status` | Poll training progress |
| GET | `/api/metrics` | Latest training metrics (JSON) |
| GET | `/api/dataset/stats` | Dataset statistics |
| GET | `/api/history` | Prediction history (paginated) |
| GET | `/api/history/stats` | History statistics |
| POST | `/api/upload` | Upload new True.csv / Fake.csv |
| GET | `/api/plots` | List available plot files |
| GET | `/api/plots/{name}` | Serve a specific plot image |

Interactive docs: **http://localhost:8000/docs**

---

## 🖥️ Frontend Pages

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Overview, model status, quick stats |
| Detect | `/detect` | Paste text → get REAL/FAKE verdict + confidence |
| Training | `/train` | Configure & start training, live progress, results table, plots |
| Analytics | `/analytics` | Bar/pie charts, metrics table, dataset stats, plot gallery |
| History | `/history` | Paginated table of all predictions |
| Upload | `/upload` | Drag-and-drop dataset CSV upload |

---

## 📦 Tech Stack

**Backend:** Python · FastAPI · scikit-learn · pandas · numpy · matplotlib · seaborn · SQLite  
**Frontend:** React 18 · Tailwind CSS 3 · Recharts · lucide-react · React Router v6
