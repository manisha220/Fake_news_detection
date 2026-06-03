import React, { useState, useEffect, useCallback } from "react";
import {
  Rss, RefreshCw, ExternalLink, AlertTriangle, ShieldCheck,
  ShieldX, Clock, Cpu, TrendingUp, Filter,
} from "lucide-react";
import { getLiveNews } from "../api";
import { Spinner, AlertBox } from "../components/UI";

const CATEGORIES = [
  { id: "top",        label: "🌐 Top Stories" },
  { id: "world",      label: "🌍 World"       },
  { id: "business",   label: "💼 Business"    },
  { id: "technology", label: "💻 Technology"  },
  { id: "science",    label: "🔬 Science"     },
  { id: "health",     label: "❤️ Health"      },
  { id: "sports",     label: "⚽ Sports"      },
];

const LIMIT = 20;

// ── Helpers ──────────────────────────────────────────────────────────────────
function credibilityColor(label, confidence) {
  if (!label) return { bg: "bg-slate-700/50", text: "text-slate-400", border: "border-slate-600/30" };
  if (label === "REAL") {
    const strength = confidence > 0.85 ? "strong" : "moderate";
    return strength === "strong"
      ? { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30" }
      : { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" };
  }
  const strength = confidence > 0.85 ? "strong" : "moderate";
  return strength === "strong"
    ? { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" }
    : { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" };
}

function ConfidenceBar({ value, color }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function ArticleCard({ article, idx }) {
  const { bg, text, border } = credibilityColor(article.label, article.confidence);
  const isReal = article.label === "REAL";
  const isFake = article.label === "FAKE";
  const confPct = article.confidence ? Math.round(article.confidence * 100) : null;

  // Strip HTML tags from summary
  const cleanSummary = article.summary
    ? article.summary.replace(/<[^>]*>/g, "").slice(0, 180)
    : "";

  return (
    <div
      className={`card border ${border} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/50 p-5 flex flex-col gap-3 animate-slide-up`}
      style={{ animationDelay: `${idx * 40}ms` }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {article.source && (
            <span className="text-xs text-slate-500 font-medium mb-1 block truncate">
              {article.source}
            </span>
          )}
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
            {article.title || "Untitled"}
          </h3>
        </div>

        {/* Credibility badge */}
        {article.label ? (
          <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${bg} ${text}`}>
            {isReal ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldX className="w-3.5 h-3.5" />}
            {article.label}
          </div>
        ) : (
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700/40 text-slate-500">
            <Cpu className="w-3.5 h-3.5" />
            No model
          </div>
        )}
      </div>

      {/* Summary */}
      {cleanSummary && (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
          {cleanSummary}…
        </p>
      )}

      {/* Probability bars */}
      {article.label && (
        <div className="space-y-1.5">
          <ConfidenceBar value={article.real_prob} color="bg-green-500" />
          <ConfidenceBar value={article.fake_prob} color="bg-red-500" />
          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
            <span>REAL</span><span>FAKE</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-1 text-[11px] text-slate-600">
          <Clock className="w-3 h-3" />
          {article.published
            ? new Date(article.published).toLocaleString(undefined, {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              })
            : "Unknown date"}
        </div>
        {article.link && (
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-primary-400 hover:text-primary-300 transition-colors"
          >
            Read <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function SummaryBar({ articles }) {
  const scored   = articles.filter(a => a.label);
  const realCount = scored.filter(a => a.label === "REAL").length;
  const fakeCount = scored.filter(a => a.label === "FAKE").length;
  const avgConf  = scored.length
    ? (scored.reduce((s, a) => s + a.confidence, 0) / scored.length * 100).toFixed(1)
    : null;

  const stats = [
    { label: "Total articles", value: articles.length,  color: "text-white"        },
    { label: "Scored",         value: scored.length,    color: "text-primary-400"  },
    { label: "✅ Real",        value: realCount,         color: "text-green-400"    },
    { label: "❌ Fake",        value: fakeCount,         color: "text-red-400"      },
    { label: "Avg confidence", value: avgConf ? `${avgConf}%` : "—", color: "text-slate-300" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="card px-4 py-3 text-center">
          <div className={`text-xl font-extrabold ${color}`}>{value}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LiveNewsPage() {
  const [category, setCategory] = useState("top");
  const [articles, setArticles]  = useState([]);
  const [loading,  setLoading]   = useState(false);
  const [error,    setError]     = useState("");
  const [modelReady, setModelReady] = useState(false);
  const [lastFetch, setLastFetch]   = useState(null);
  const [filterLabel, setFilterLabel] = useState("ALL"); // ALL | REAL | FAKE

  const fetchNews = useCallback(async (cat, force = false) => {
    setLoading(true);
    setError("");
    try {
      const data = await getLiveNews(cat, LIMIT, force);
      setArticles(data.articles || []);
      setModelReady(data.model_ready);
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and category change
  useEffect(() => {
    fetchNews(category);
  }, [category, fetchNews]);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setFilterLabel("ALL");
  };

  const visibleArticles = filterLabel === "ALL"
    ? articles
    : articles.filter(a => a.label === filterLabel);

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Rss className="w-6 h-6 text-primary-400" />
            Live News Checker
          </h1>
          <p className="section-sub">
            Real-time Google News headlines scored by the AI model for credibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lastFetch && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastFetch.toLocaleTimeString()}
            </span>
          )}
          <button
            id="refresh-news-btn"
            onClick={() => fetchNews(category, true)}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 py-2 px-4"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Model warning ── */}
      {!modelReady && !loading && (
        <AlertBox type="warning">
          <AlertTriangle className="inline w-4 h-4 mr-1" />
          Model not trained — headlines will appear without credibility scores.
          <a href="/train" className="ml-2 underline text-yellow-300 hover:text-yellow-200">
            Train now →
          </a>
        </AlertBox>
      )}

      {/* ── Category tabs ── */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="News categories">
        {CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            id={`category-tab-${id}`}
            role="tab"
            aria-selected={category === id}
            onClick={() => handleCategoryChange(id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
              category === id
                ? "bg-primary-600 text-white border-primary-500 shadow-md shadow-primary-500/20"
                : "bg-slate-800/60 text-slate-400 border-slate-700/40 hover:bg-slate-700/60 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      {articles.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-500">Filter:</span>
          {["ALL", "REAL", "FAKE"].map(f => (
            <button
              key={f}
              id={`filter-${f.toLowerCase()}-btn`}
              onClick={() => setFilterLabel(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterLabel === f
                  ? f === "REAL"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : f === "FAKE"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "bg-slate-800/60 text-slate-500 border border-slate-700/30 hover:text-slate-300"
              }`}
            >
              {f}
            </button>
          ))}
          <span className="text-xs text-slate-600 ml-auto">
            {visibleArticles.length} article{visibleArticles.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner size={10} />
          <p className="text-slate-400 text-sm animate-pulse">
            Fetching & scoring headlines…
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <AlertBox type="error">
          <AlertTriangle className="inline w-4 h-4 mr-1" />
          {error}
        </AlertBox>
      )}

      {/* ── Stats bar ── */}
      {!loading && articles.length > 0 && <SummaryBar articles={articles} />}

      {/* ── Article grid ── */}
      {!loading && visibleArticles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleArticles.map((article, i) => (
            <ArticleCard key={`${article.link}-${i}`} article={article} idx={i} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && visibleArticles.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 gap-3 opacity-60">
          <TrendingUp className="w-12 h-12 text-slate-600" />
          <p className="text-slate-400">No articles found for this filter.</p>
        </div>
      )}

      {/* ── Legend ── */}
      {!loading && articles.length > 0 && (
        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            <span>REAL — model predicts credible content</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldX className="w-3.5 h-3.5 text-red-400" />
            <span>FAKE — model flags potential misinformation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Cache refreshes every 5 minutes</span>
          </div>
        </div>
      )}
    </div>
  );
}
