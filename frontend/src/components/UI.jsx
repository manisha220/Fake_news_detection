import React from "react";

export function StatCard({ title, value, sub, icon: Icon, color = "primary" }) {
  const colorMap = {
    primary: "from-primary-600 to-primary-800 shadow-primary-500/20",
    success: "from-green-600 to-emerald-800 shadow-green-500/20",
    danger:  "from-red-600 to-rose-800 shadow-red-500/20",
    warning: "from-amber-500 to-orange-700 shadow-amber-500/20",
  };
  return (
    <div className={`card p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-slate-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function Badge({ label, type = "real" }) {
  return type === "real"
    ? <span className="badge-real">✓ REAL</span>
    : <span className="badge-fake">✕ FAKE</span>;
}

export function Spinner({ size = 6 }) {
  return (
    <svg
      className={`animate-spin w-${size} h-${size} text-primary-400`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export function ProgressBar({ pct = 0, label = "", animated = false }) {
  return (
    <div className="w-full">
      {label && <p className="text-sm text-slate-400 mb-1">{label}</p>}
      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500 ${animated ? "progress-animated" : ""}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1 text-right">{pct}%</p>
    </div>
  );
}

export function AlertBox({ type = "info", children }) {
  const styles = {
    info:    "bg-blue-500/10 border-blue-500/30 text-blue-300",
    success: "bg-green-500/10 border-green-500/30 text-green-300",
    error:   "bg-red-500/10 border-red-500/30 text-red-300",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  };
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}
