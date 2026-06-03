import React, { useState, useRef } from "react";
import { Zap, RotateCcw, AlertTriangle } from "lucide-react";
import { predictText } from "../api";
import { Spinner, AlertBox } from "../components/UI";
import {
  RadialBarChart, RadialBar, Cell, PolarAngleAxis, ResponsiveContainer,
} from "recharts";

const SAMPLE_REAL = `WASHINGTON (Reuters) - The U.S. Senate on Tuesday confirmed Rex Tillerson as secretary of state
with a 56-43 vote, ending the longest confirmation battle for a secretary of state nominee
in more than a decade. Tillerson, the former chief executive of Exxon Mobil Corp,
needed only a simple majority to be confirmed.`;

const SAMPLE_FAKE = `BREAKING: Scientists CONFIRM that the government is hiding alien technology recovered
from a crashed UFO in Nevada! Deep state whistleblowers reveal shocking truth.
The mainstream media won't report this because THEY are controlled by shadowy globalists.
Share this before it gets deleted! #TruthBombs`;

export default function DetectPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef();

  const handlePredict = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await predictText(text);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSample = (sample) => {
    setText(sample);
    setResult(null);
    setError("");
  };

  const handleClear = () => {
    setText("");
    setResult(null);
    setError("");
  };

  const isReal = result?.label === "REAL";
  const confPct = result ? Math.round(result.confidence * 100) : 0;
  const fakePct = result ? Math.round(result.probabilities.FAKE * 100) : 0;
  const realPct = result ? Math.round(result.probabilities.REAL * 100) : 0;

  const chartData = result
    ? [
        { name: "FAKE", value: fakePct, fill: "#ef4444" },
        { name: "REAL", value: realPct, fill: "#22c55e" },
      ]
    : [];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary-400" /> Fake News Detector
        </h1>
        <p className="section-sub">Paste a news article below and let the AI classify it.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Sample buttons */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleSample(SAMPLE_REAL)} className="btn-secondary text-sm py-2">
              📰 Load Real Sample
            </button>
            <button onClick={() => handleSample(SAMPLE_FAKE)} className="btn-secondary text-sm py-2">
              🚨 Load Fake Sample
            </button>
            <button onClick={handleClear} className="btn-secondary text-sm py-2">
              <RotateCcw className="w-3 h-3 inline mr-1" /> Clear
            </button>
          </div>

          <textarea
            ref={textareaRef}
            className="input-field min-h-[260px] resize-y text-sm leading-relaxed"
            placeholder="Paste a news article here…&#10;&#10;Minimum 10 characters required."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{text.length} characters</p>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={handlePredict}
              disabled={text.trim().length < 10 || loading}
            >
              {loading ? <Spinner size={4} /> : <Zap className="w-4 h-4" />}
              {loading ? "Analysing…" : "Detect News"}
            </button>
          </div>

          {error && (
            <AlertBox type="error">
              <AlertTriangle className="inline w-4 h-4 mr-1" /> {error}
            </AlertBox>
          )}
        </div>

        {/* Result panel */}
        <div className="lg:col-span-2">
          {!result && !loading && (
            <div className="card h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-slate-400">Results will appear here after analysis</p>
            </div>
          )}

          {loading && (
            <div className="card h-full flex flex-col items-center justify-center p-8">
              <Spinner size={10} />
              <p className="text-slate-400 mt-4">Analysing article…</p>
            </div>
          )}

          {result && !loading && (
            <div className={`card p-6 border-2 transition-all duration-500 animate-slide-up ${
              isReal ? "border-green-500/40" : "border-red-500/40"
            }`}>
              {/* Verdict */}
              <div className={`text-center mb-6 p-4 rounded-xl ${
                isReal ? "bg-green-500/10" : "bg-red-500/10"
              }`}>
                <div className="text-5xl mb-2">{isReal ? "✅" : "❌"}</div>
                <div className={`text-3xl font-extrabold ${isReal ? "text-green-400" : "text-red-400"}`}>
                  {result.label}
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  Confidence: <span className="text-white font-semibold">{confPct}%</span>
                </p>
              </div>

              {/* Probability chart */}
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="40%" outerRadius="80%"
                    data={chartData}
                    startAngle={90} endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={6} label={false}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </RadialBar>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              {/* Prob bars */}
              <div className="space-y-3 mt-2">
                {[
                  { label: "REAL probability", value: realPct, color: "bg-green-500" },
                  { label: "FAKE probability", value: fakePct, color: "bg-red-500" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{label}</span><span>{value}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-700`}
                        style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 mt-4 text-center">
                Input length: {result.input_text_length} characters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
