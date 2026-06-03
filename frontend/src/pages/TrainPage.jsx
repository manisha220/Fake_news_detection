import React, { useState, useEffect, useCallback } from "react";
import { Cpu, PlayCircle, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { startTraining, getTrainingStatus, getPlotUrl, getPlotList } from "../api";
import { ProgressBar, AlertBox, Spinner } from "../components/UI";

const MODEL_OPTIONS = ["LogisticRegression", "NaiveBayes", "DecisionTree", "RandomForest"];

export default function TrainPage() {
  const [config, setConfig] = useState({ best_model: "LogisticRegression", test_size: 0.2, max_features: 50000 });
  const [status, setStatus] = useState({ status: "idle", progress: 0, message: "" });
  const [error, setError] = useState("");
  const [plots, setPlots] = useState([]);

  const pollStatus = useCallback(async () => {
    try {
      const s = await getTrainingStatus();
      setStatus(s);
      return s.status;
    } catch { return "error"; }
  }, []);

  useEffect(() => {
    // Initial poll
    pollStatus();
  }, [pollStatus]);

  useEffect(() => {
    // Refresh plot list when training completes
    if (status.status === "completed") {
      getPlotList().then(d => setPlots(d.plots || []));
    }
  }, [status.status]);

  const handleTrain = async () => {
    setError("");
    try {
      await startTraining(config);
      // Start polling
      const interval = setInterval(async () => {
        const s = await pollStatus();
        if (s === "completed" || s === "error" || s === "idle") {
          clearInterval(interval);
        }
      }, 2000);
    } catch (e) {
      setError(e.message);
    }
  };

  const isRunning = status.status === "running";
  const isDone    = status.status === "completed";
  const isError   = status.status === "error";

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <Cpu className="w-6 h-6 text-primary-400" /> Model Training
        </h1>
        <p className="section-sub">Configure and launch the training pipeline. Trains all 4 models and saves the best.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-white">Training Configuration</h2>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">Best Model to Save</label>
            <select
              className="input-field"
              value={config.best_model}
              onChange={e => setConfig(c => ({ ...c, best_model: e.target.value }))}
            >
              {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Test Split: <span className="text-white">{(config.test_size * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range" min={5} max={40} step={5}
              value={config.test_size * 100}
              onChange={e => setConfig(c => ({ ...c, test_size: +e.target.value / 100 }))}
              className="w-full accent-primary-500"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              TF-IDF Max Features: <span className="text-white">{config.max_features.toLocaleString()}</span>
            </label>
            <input
              type="range" min={5000} max={100000} step={5000}
              value={config.max_features}
              onChange={e => setConfig(c => ({ ...c, max_features: +e.target.value }))}
              className="w-full accent-primary-500"
            />
          </div>

          <button
            className="btn-primary w-full flex items-center justify-center gap-2"
            onClick={handleTrain}
            disabled={isRunning}
          >
            {isRunning ? <><Spinner size={4} /> Training in progress…</> : <><PlayCircle className="w-4 h-4" /> Start Training</>}
          </button>

          {error && <AlertBox type="error"><AlertTriangle className="inline w-4 h-4 mr-1" />{error}</AlertBox>}
        </div>

        {/* Status */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white">Training Status</h2>
            <button onClick={pollStatus} className="text-slate-400 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Status badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
            isRunning ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
            isDone    ? "bg-green-500/20 text-green-400 border border-green-500/30" :
            isError   ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                        "bg-slate-700 text-slate-400 border border-slate-600"
          }`}>
            {isRunning ? <Spinner size={3} /> : isDone ? <CheckCircle className="w-3 h-3" /> : null}
            {status.status.toUpperCase()}
          </div>

          <ProgressBar pct={status.progress} label={status.message} animated={isRunning} />

          {isDone && status.summary && (
            <div className="mt-2 space-y-2 animate-fade-in">
              <h3 className="text-sm font-semibold text-white">Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {["Model","Acc","F1","AUC"].map(h => (
                        <th key={h} className="text-left pb-2 pr-3 text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {status.summary.all_models?.map(m => (
                      <tr key={m.model} className="border-b border-slate-800">
                        <td className="py-2 pr-3 text-white font-medium">{m.model}</td>
                        <td className="py-2 pr-3 text-slate-300">{(m.accuracy*100).toFixed(1)}%</td>
                        <td className="py-2 pr-3 text-primary-400 font-semibold">{(m.f1_score*100).toFixed(1)}%</td>
                        <td className="py-2 text-slate-300">{m.roc_auc ? (m.roc_auc*100).toFixed(1)+"%" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AlertBox type="success">
                ✓ Best model saved: <strong>{status.summary.best_model_saved}</strong>
              </AlertBox>
            </div>
          )}
        </div>
      </div>

      {/* Plots */}
      {plots.length > 0 && (
        <section className="card p-6">
          <h2 className="font-bold text-white mb-4">Training Visualisations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {plots.map(p => (
              <div key={p} className="bg-slate-800 rounded-xl overflow-hidden">
                <img
                  src={getPlotUrl(p)}
                  alt={p}
                  className="w-full object-contain"
                  loading="lazy"
                />
                <p className="text-xs text-slate-500 text-center py-2 px-3">{p.replace(/_/g, " ").replace(".png", "")}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
