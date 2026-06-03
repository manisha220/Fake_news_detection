import React, { useEffect, useState, useCallback } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { getHistory, getHistoryStats } from "../api";
import { Badge, Spinner, StatCard } from "../components/UI";
import { BarChart2 } from "lucide-react";

export default function HistoryPage() {
  const [rows, setRows]     = useState([]);
  const [stats, setStats]   = useState(null);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(0);
  const LIMIT = 25;

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const [hist, s] = await Promise.all([
        getHistory(LIMIT, p * LIMIT),
        getHistoryStats(),
      ]);
      setRows(hist.data);
      setTotal(hist.total);
      setStats(s);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-400" /> Prediction History
          </h1>
          <p className="section-sub">All past article classifications.</p>
        </div>
        <button onClick={() => load(page)} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Predictions" value={stats.total?.toLocaleString()} icon={BarChart2} color="primary" />
          <StatCard title="Real Detected"      value={stats.real_count?.toLocaleString()} icon={BarChart2} color="success" />
          <StatCard title="Fake Detected"      value={stats.fake_count?.toLocaleString()} icon={BarChart2} color="danger" />
          <StatCard title="Avg Confidence"     value={`${(stats.avg_confidence*100).toFixed(1)}%`} icon={BarChart2} color="warning" />
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Spinner size={8} /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No predictions yet. Analyse an article first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  {["#", "Label", "Confidence", "Snippet", "Date"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.id}</td>
                    <td className="px-4 py-3">
                      <Badge type={r.label === "REAL" ? "real" : "fake"} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${r.confidence > 0.85 ? "text-green-400" : r.confidence > 0.65 ? "text-amber-400" : "text-red-400"}`}>
                        {(r.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs">
                      <p className="truncate text-xs">{r.text}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(r.created_at + "Z").toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-secondary py-2 px-3 text-sm" disabled={page === 0} onClick={() => load(page - 1)}>
            ← Prev
          </button>
          <span className="text-slate-400 text-sm">Page {page + 1} of {totalPages}</span>
          <button className="btn-secondary py-2 px-3 text-sm" disabled={page >= totalPages - 1} onClick={() => load(page + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
