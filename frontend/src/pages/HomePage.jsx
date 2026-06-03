import React, { useEffect, useState } from "react";
import { Zap, Database, CheckCircle, AlertCircle, Cpu } from "lucide-react";
import { getHealth, getMetrics } from "../api";
import { StatCard } from "../components/UI";

export default function HomePage() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth({ status: "error" }));
    getMetrics().then(setMetrics).catch(() => {});
  }, []);

  const bestModel = metrics
    ? metrics.all_models?.reduce((a, b) => (a.f1_score > b.f1_score ? a : b))
    : null;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 p-8 border border-primary-700/40">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #6366f1 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 bg-primary-500/20 text-primary-300 border border-primary-500/30 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <Zap className="w-3 h-3" /> AI-Powered Detection
          </span>
          <h1 className="text-4xl font-extrabold text-white mb-2 leading-tight">
            FakeShield<br />
            <span className="text-primary-400">Fake News Detection</span>
          </h1>
          <p className="text-slate-300 max-w-xl text-lg leading-relaxed">
            Production-grade ML system trained on ~45,000 news articles. Detect misinformation with
            high accuracy using TF-IDF + multi-model classification.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a href="/detect" className="btn-primary flex items-center gap-2">
              <Zap className="w-4 h-4" /> Analyse Article
            </a>
            <a href="/train" className="btn-secondary flex items-center gap-2">
              <Cpu className="w-4 h-4" /> Train Model
            </a>
          </div>
        </div>
      </section>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Model Status"
          value={health?.model_ready ? "Ready" : "Not Trained"}
          icon={health?.model_ready ? CheckCircle : AlertCircle}
          color={health?.model_ready ? "success" : "danger"}
          sub={health ? "API online" : "Checking…"}
        />
        <StatCard
          title="Best Model"
          value={bestModel?.model?.replace("Regression", "LR") || "—"}
          icon={Cpu}
          color="primary"
          sub={bestModel ? `F1: ${bestModel.f1_score}` : "Train first"}
        />
        <StatCard
          title="Dataset"
          value={health?.datasets_ready ? "Loaded" : "Missing"}
          icon={Database}
          color={health?.datasets_ready ? "success" : "warning"}
          sub="True.csv + Fake.csv"
        />
        <StatCard
          title="Accuracy"
          value={bestModel ? `${(bestModel.accuracy * 100).toFixed(1)}%` : "—"}
          icon={Zap}
          color="primary"
          sub={bestModel?.model}
        />
      </div>

      {/* Model table */}
      {metrics && (
        <section className="card p-6">
          <h2 className="section-title mb-4">Model Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {["Model", "Accuracy", "Precision", "Recall", "F1-Score", "ROC-AUC"].map(h => (
                    <th key={h} className="text-left pb-3 pr-4 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.all_models?.map((m) => (
                  <tr key={m.model} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4 font-medium text-white">{m.model}</td>
                    <td className="py-3 pr-4 text-slate-300">{(m.accuracy * 100).toFixed(2)}%</td>
                    <td className="py-3 pr-4 text-slate-300">{(m.precision * 100).toFixed(2)}%</td>
                    <td className="py-3 pr-4 text-slate-300">{(m.recall * 100).toFixed(2)}%</td>
                    <td className="py-3 pr-4">
                      <span className="text-primary-400 font-semibold">{(m.f1_score * 100).toFixed(2)}%</span>
                    </td>
                    <td className="py-3 text-slate-300">{m.roc_auc ? (m.roc_auc * 100).toFixed(2) + "%" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: "🤖", title: "4 ML Models", desc: "Logistic Regression, Naive Bayes, Decision Tree, Random Forest" },
          { icon: "📊", title: "Rich Analytics", desc: "Confusion matrices, ROC curves, class distribution, model comparison" },
          { icon: "⚡", title: "Real-time Prediction", desc: "Instant classification with confidence scores and probability breakdown" },
        ].map(f => (
          <div key={f.title} className="card p-5">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-white mb-1">{f.title}</h3>
            <p className="text-slate-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
