import React, { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface AIPanelProps {
  onGenerated: (text: string) => void;
  jobTitle: string;
  category: string;
  region: string;
  companyName: string;
}

export function AIJobDescriptionGenerator({ onGenerated, jobTitle, category, region, companyName }: AIPanelProps) {
  const [loading, setLoading] = useState(false);
  const [keyDetails, setKeyDetails] = useState("");
  const [language, setLanguage] = useState("bilingual");
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!jobTitle || !category || !region) {
      setError("Hakikisha Kichwa cha Kazi, Sekta na Mkoa vimejazwa kwanza.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobTitle,
          company: companyName,
          category,
          region,
          keyDetails,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Uzalishaji ulishindwa.");
      }

      if (data.description) {
        onGenerated(data.description);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate AI description.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-5 select-none text-left">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-emerald-700 animate-pulse" />
        <h3 className="font-semibold text-emerald-900 text-sm md:text-base">
          Msaidizi wa KaziTZ AI / AI Description Assistant
        </h3>
      </div>
      <p className="text-xs text-emerald-800 mb-4 leading-relaxed">
        Ingiza maelezo madogo au sifa dhabiti kisha ubonyeze kitufe kutengeneza tangazo lenye mpangilio wa kisomi.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-semibold mb-3 border border-red-200">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-emerald-900 mb-1">
            Wazo lako Kuu / Core Duties & Requirements (Optional)
          </label>
          <textarea
            placeholder="Mf: Miaka 2 ya uzoefu, kujua QuickBooks, kufanya kazi Morogoro vijijini."
            className="w-full text-xs p-2 rounded-lg border border-emerald-300 bg-white focus:ring-emerald-500 focus:border-emerald-500 outline-none h-16 resize-none"
            value={keyDetails}
            onChange={(e) => setKeyDetails(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-900">Lugha / Language:</span>
            <select
              className="text-xs p-1.5 rounded border border-emerald-300 bg-white text-emerald-900"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="bilingual">Kiswahili & English</option>
              <option value="swahili">Kiswahili tupu</option>
              <option value="english">English Only</option>
            </select>
          </div>

          <button
            type="button"
            className="bg-emerald-700 hover:bg-emerald-800 transition text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 w-full sm:w-auto"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Inatengeneza...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Tengeneza sasa kwa AI
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Scorecard UI render component for matching applicants
export function AICandidateAuditCard({
  score,
  summary,
  matchingPoints,
  gaps,
  loading,
}: {
  score?: number;
  summary?: string;
  matchingPoints?: string[];
  gaps?: string[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-gradient-to-tr from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-5 text-center flex flex-col items-center justify-center min-h-[140px] animate-pulse">
        <Sparkles className="h-7 w-7 text-emerald-700 animate-spin mb-2" />
        <span className="text-xs font-bold text-emerald-900">KaziTZ AI inakagua maelezo ya wasifu...</span>
        <span className="text-[10px] text-emerald-600 mt-1">Comparing CV details with original job description</span>
      </div>
    );
  }

  if (!score && score !== 0) return null;

  const getScoreColor = (sc: number) => {
    if (sc >= 85) return { bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-200", bgLight: "bg-emerald-50" };
    if (sc >= 65) return { bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-200", bgLight: "bg-amber-50" };
    return { bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-200", bgLight: "bg-rose-50" };
  };

  const colors = getScoreColor(score);

  return (
    <div className={`${colors.bgLight} border ${colors.border} rounded-xl p-5 text-left select-none relative overflow-hidden transition-all duration-300 shadow-sm`}>
      {/* Decorative shield icon */}
      <div className="absolute right-3 top-3 opacity-10">
        <ShieldCheck className="h-20 w-20 text-emerald-900" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full border-4 border-white flex items-center justify-center bg-white shadow-sm font-mono text-lg font-extrabold text-gray-800">
            {score}%
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-widest">AI MATCH REPORT</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${colors.bg}`}>
                {score >= 85 ? "Strong" : score >= 65 ? "Fair" : "Low Match"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Automated screening with Gemini 3.5 AI</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-800 leading-relaxed mb-4 italic font-medium bg-white/40 p-2.5 rounded-lg border border-white/50">
        "{summary || "Nia njema ya wasifu inafanana na vigezo muhimu vya kiufundi vilivyowekwa kwenye tangazo."}"
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matchingPoints && matchingPoints.length > 0 && (
          <div>
            <h4 className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Vigezo Vinavyovutia (Highlights)
            </h4>
            <ul className="space-y-1 text-xs text-gray-700 pl-1">
              {matchingPoints.map((pt, index) => (
                <li key={index} className="flex items-start gap-1.5 leading-tight">
                  <span className="text-emerald-600 select-none">•</span> {pt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {gaps && gaps.length > 0 && (
          <div>
            <h4 className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-600" /> Changamoto zilizopo (Gaps)
            </h4>
            <ul className="space-y-1 text-xs text-gray-700 pl-1">
              {gaps.map((gp, index) => (
                <li key={index} className="flex items-start gap-1.5 leading-tight">
                  <span className="text-amber-600 select-none">•</span> {gp}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
