"""
Text Preprocessing Utilities for Fake News Detection.
Refactored from notebook ML pipeline.
"""

import re
import string
import pandas as pd
import numpy as np


def clean_text(text: str) -> str:
    """
    Clean and normalize text for NLP processing.
    - Lowercase
    - Remove URLs
    - Remove special characters / punctuation
    - Strip extra whitespace
    """
    if not isinstance(text, str):
        text = str(text) if text is not None else ""

    # Lowercase
    text = text.lower()

    # Remove URLs
    text = re.sub(r"https?://\S+|www\.\S+", "", text)

    # Remove HTML tags
    text = re.sub(r"<.*?>", "", text)

    # Remove punctuation and special characters (keep spaces)
    text = re.sub(r"[^a-z\s]", "", text)

    # Collapse multiple whitespace
    text = re.sub(r"\s+", " ", text).strip()

    return text


def load_and_label_datasets(true_path: str, fake_path: str) -> pd.DataFrame:
    """
    Load True.csv and Fake.csv, assign labels, combine into one DataFrame.

    Labels:
      1 = Real News
      0 = Fake News
    """
    true_df = pd.read_csv(true_path)
    fake_df = pd.read_csv(fake_path)

    true_df["label"] = 1  # Real
    fake_df["label"] = 0  # Fake

    df = pd.concat([true_df, fake_df], ignore_index=True)

    # Ensure 'text' column exists
    if "text" not in df.columns:
        if "title" in df.columns:
            df["text"] = df["title"].astype(str) + " " + df.get(
                "subject", pd.Series([""] * len(df))
            ).astype(str)
        else:
            str_cols = df.select_dtypes(include="object").columns.tolist()
            df["text"] = df[str_cols[0]]

    return df


def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply text cleaning to the 'text' column and drop rows with empty text.
    """
    df = df.copy()
    df["cleaned_text"] = df["text"].apply(clean_text)
    # Drop rows where cleaned text is empty
    df = df[df["cleaned_text"].str.strip() != ""].reset_index(drop=True)
    return df


def preprocess_single(text: str) -> str:
    """Preprocess a single text string for inference."""
    return clean_text(text)


def get_dataset_stats(df: pd.DataFrame) -> dict:
    """
    Compute descriptive statistics for the dataset.
    """
    total = len(df)
    real_count = int((df["label"] == 1).sum())
    fake_count = int((df["label"] == 0).sum())

    # Text length stats
    df = df.copy()
    df["text_len"] = df["text"].astype(str).apply(len)

    stats = {
        "total_samples": total,
        "real_count": real_count,
        "fake_count": fake_count,
        "real_pct": round(real_count / total * 100, 2) if total > 0 else 0,
        "fake_pct": round(fake_count / total * 100, 2) if total > 0 else 0,
        "avg_text_length": round(df["text_len"].mean(), 1),
        "max_text_length": int(df["text_len"].max()),
        "min_text_length": int(df["text_len"].min()),
    }

    # Subject distribution (if column exists)
    if "subject" in df.columns:
        subject_counts = df["subject"].value_counts().head(10).to_dict()
        stats["subject_distribution"] = {str(k): int(v) for k, v in subject_counts.items()}

    return stats
