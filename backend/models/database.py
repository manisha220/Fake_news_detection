"""
SQLite database models and helpers for storing prediction history.
"""

import sqlite3
import os
from datetime import datetime
from typing import List, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "fake_news.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            text        TEXT NOT NULL,
            label       TEXT NOT NULL,
            confidence  REAL NOT NULL,
            fake_prob   REAL NOT NULL,
            real_prob   REAL NOT NULL,
            model_name  TEXT NOT NULL DEFAULT 'LogisticRegression',
            created_at  TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS training_runs (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            status          TEXT NOT NULL,
            best_model      TEXT,
            accuracy        REAL,
            f1_score        REAL,
            total_samples   INTEGER,
            duration_secs   REAL,
            created_at      TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


# ── Predictions ────────────────────────────────────────────────────────────────

def save_prediction(text: str, label: str, confidence: float,
                    fake_prob: float, real_prob: float,
                    model_name: str = "LogisticRegression") -> int:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute(
        """INSERT INTO predictions (text, label, confidence, fake_prob, real_prob, model_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (text[:2000], label, confidence, fake_prob, real_prob, model_name, now),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def get_predictions(limit: int = 100, offset: int = 0) -> List[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM predictions ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def get_prediction_count() -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM predictions")
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_prediction_stats() -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN label='REAL' THEN 1 ELSE 0 END) as real_count,
            SUM(CASE WHEN label='FAKE' THEN 1 ELSE 0 END) as fake_count,
            AVG(confidence) as avg_confidence
        FROM predictions
    """)
    row = dict(cursor.fetchone())
    conn.close()
    # Safe defaults
    row["total"] = row["total"] or 0
    row["real_count"] = row["real_count"] or 0
    row["fake_count"] = row["fake_count"] or 0
    row["avg_confidence"] = round(row["avg_confidence"] or 0, 4)
    return row


# ── Training runs ──────────────────────────────────────────────────────────────

def save_training_run(status: str, best_model: Optional[str] = None,
                      accuracy: Optional[float] = None,
                      f1_score: Optional[float] = None,
                      total_samples: Optional[int] = None,
                      duration_secs: Optional[float] = None) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute(
        """INSERT INTO training_runs (status, best_model, accuracy, f1_score, total_samples, duration_secs, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (status, best_model, accuracy, f1_score, total_samples, duration_secs, now),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def get_latest_training_run() -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM training_runs ORDER BY created_at DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None
