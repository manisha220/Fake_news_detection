// Central API client — all calls go through here
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- Predict ------------------------------------------------------------------
export async function predictText(text) {
  return request("/api/predict", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

// --- Train -------------------------------------------------------------------
export async function startTraining(params) {
  return request("/api/train", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getTrainingStatus() {
  return request("/api/train/status");
}

// --- Metrics -----------------------------------------------------------------
export async function getMetrics() {
  return request("/api/metrics");
}

// --- Health ------------------------------------------------------------------
export async function getHealth() {
  return request("/api/health");
}

// --- Dataset stats -----------------------------------------------------------
export async function getDatasetStats() {
  return request("/api/dataset/stats");
}

// --- History -----------------------------------------------------------------
export async function getHistory(limit = 50, offset = 0) {
  return request(`/api/history?limit=${limit}&offset=${offset}`);
}

export async function getHistoryStats() {
  return request("/api/history/stats");
}

// --- Upload ------------------------------------------------------------------
export async function uploadDatasets(trueFile, fakeFile) {
  const form = new FormData();
  if (trueFile) form.append("true_file", trueFile);
  if (fakeFile) form.append("fake_file", fakeFile);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- Plots -------------------------------------------------------------------
export function getPlotUrl(name) {
  return `${API_BASE}/api/plots/${name}`;
}

export async function getPlotList() {
  return request("/api/plots");
}

// --- Live News ----------------------------------------------------------------
export async function getLiveNews(category = "top", limit = 20, refresh = false) {
  return request(`/api/news/live?category=${category}&limit=${limit}&refresh=${refresh}`);
}

export async function getNewsCategories() {
  return request("/api/news/categories");
}
