import React, { useEffect, useState } from "react";
import { BarChart2, AlertTriangle } from "lucide-react";
import { getMetrics, getDatasetStats, getPlotUrl, getPlotList } from "../api";
import { Spinner, StatCard, AlertBox } from "../components/UI";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#ef4444", "#22c55e", "#6366f1", "#f59e0b"];

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState(null);
  const [stats, setStats]     = useState(null);
  const [plots, setPlots]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMetrics().catch(() => null),
      getDatasetStats().catch(() => null),
      getPlotList().catch(() => ({ plots: [] })),
    ]).then(([m, s, p]) => {
      setMetrics(m);
      setStats(s);
      setPlots(p?.plots || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={10} /></div>;
  if (!metrics) return (
    <AlertBox type="warning">
      <AlertTriangle className="inline w-4 h-4 mr-1" />
      No metrics found. Train the model first via the Training page.
    </AlertBox>
  );

  // Build chart data
  const modelData = metrics.all_models?.map(m => ({
    name: m.model.replace("Regression", "LR").replace("Forest", "RF"),
    Accuracy:  +(m.accuracy  * 100).toFixed(2),
    F1:        +(m.f1_score  * 100).toFixed(2),
    Precision: +(m.precision * 100).toFixed(2),
    Recall:    +(m.recall    * 100).toFixed(2),
  })) || [];

  const pieData = stats
    ? [
        { name: "Fake", value: stats.fake_count },
        { name: "Real", value: stats.real_count },
      ]
    : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary-400" /> Analytics
        </h1>
        <p className="section-sub">Training metrics and dataset insights.</p>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Samples" value={stats.total_samples?.toLocaleString()} icon={BarChart2} color="primary" />
          <StatCard title="Real News"     value={stats.real_count?.toLocaleString()}    icon={BarChart2} color="success" sub={`${stats.real_pct}%`} />
          <StatCard title="Fake News"     value={stats.fake_count?.toLocaleString()}    icon={BarChart2} color="danger"  sub={`${stats.fake_pct}%`} />
          <StatCard title="Avg Length"    value={stats.avg_text_length?.toLocaleString()} icon={BarChart2} color="warning" sub="chars/article" />
        </div>
      )}

      {/* Model comparison bar chart */}
      <div className="card p-6">
        <h2 className="font-bold text-white mb-4">Model Comparison (%)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={modelData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis domain={[85, 100]} stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
              labelStyle={{ color: "#f1f5f9" }}
            />
            <Legend />
            <Bar dataKey="Accuracy"  fill="#6366f1" radius={[4,4,0,0]} />
            <Bar dataKey="F1"        fill="#22c55e" radius={[4,4,0,0]} />
            <Bar dataKey="Precision" fill="#f59e0b" radius={[4,4,0,0]} />
            <Bar dataKey="Recall"    fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Dataset pie + subject dist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats && (
          <div className="card p-6">
            <h2 className="font-bold text-white mb-4">Class Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                     outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(1)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detailed metrics table */}
        <div className="card p-6">
          <h2 className="font-bold text-white mb-4">Detailed Metrics</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  {["Model","Acc","Prec","Rec","F1","AUC"].map(h=>(
                    <th key={h} className="text-left pb-2 pr-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.all_models?.map(m => (
                  <tr key={m.model} className="border-b border-slate-800 hover:bg-slate-800/40">
                    <td className="py-2 pr-3 text-white font-medium">{m.model.replace("Regression","LR").replace("Forest","RF")}</td>
                    <td className="py-2 pr-3 text-slate-300">{(m.accuracy*100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 text-slate-300">{(m.precision*100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 text-slate-300">{(m.recall*100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 text-primary-400 font-bold">{(m.f1_score*100).toFixed(1)}%</td>
                    <td className="py-2 text-slate-300">{m.roc_auc?(m.roc_auc*100).toFixed(1)+"%":"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Subject distribution */}
      {stats?.subject_distribution && (
        <div className="card p-6">
          <h2 className="font-bold text-white mb-4">Top Subjects</h2>
          <div className="space-y-2">
            {Object.entries(stats.subject_distribution).map(([subj, cnt]) => {
              const pct = Math.round((cnt / stats.total_samples) * 100);
              return (
                <div key={subj} className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm w-36 shrink-0 truncate">{subj}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 w-14 text-right">{cnt.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Plot gallery */}
      {plots.length > 0 && (
        <section className="card p-6">
          <h2 className="font-bold text-white mb-4">Training Plots</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {plots.map(p => (
              <div key={p} className="bg-slate-800 rounded-xl overflow-hidden">
                <img src={getPlotUrl(p)} alt={p} className="w-full object-contain" loading="lazy" />
                <p className="text-xs text-slate-500 text-center py-2">{p.replace(/_/g," ").replace(".png","")}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
