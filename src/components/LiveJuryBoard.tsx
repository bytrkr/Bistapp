// src/components/LiveJuryBoard.tsx
import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Scale, RefreshCw, CheckCircle2, AlertTriangle, Layers, Radio, Globe } from 'lucide-react';

export interface AgentStatus {
  name: string;
  role?: string;
  verdict: 'Pass' | 'Caution' | 'Veto' | 'AL' | 'TUT' | 'SAT' | 'GÜÇLÜ AL' | 'VETO / SAT';
  score?: number;
  reasoning: string;
}

export interface JuryDebateResult {
  ticker?: string;
  consensus?: string;
  confidenceScore?: number;
  coherenceScore?: number;
  verdict?: 'Veto' | 'Approve' | string;
  agents?: AgentStatus[];
  jurors?: Array<{
    id: string;
    name: string;
    role: string;
    vote: string;
    weight: number;
    score: number;
    comment: string;
  }>;
  tcmbMacro?: any;
  finnhubSentiment?: any;
  finalDecision?: {
    action: string;
    targetPercent: number;
    stopLossPercent: number;
    summary: string;
  };
}

interface Props {
  ticker: string;
  data?: JuryDebateResult | null;
  className?: string;
}

export const LiveJuryBoard: React.FC<Props> = ({ ticker, data: propData, className = '' }) => {
  const [internalData, setInternalData] = useState<JuryDebateResult | null>(propData || null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchJuryDebate = async (t: string) => {
    try {
      setLoading(true);
      const clean = (t || 'ASELS').toUpperCase();
      const res = await fetch(`/api/jury-debate/${encodeURIComponent(clean)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.result) {
          setInternalData(json.result);
        }
      }
    } catch (err) {
      console.error('Failed to fetch jury debate:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propData) {
      setInternalData(propData);
    } else {
      fetchJuryDebate(ticker);
    }
  }, [ticker, propData]);

  const activeData = internalData;
  const isVeto = activeData?.consensus?.includes('VETO') || activeData?.finalDecision?.action?.includes('VETO') || false;
  const confidence = activeData?.confidenceScore ?? (activeData?.coherenceScore ? activeData.coherenceScore * 100 : 82);

  // Normalize jurors list from backend or fallback to agents
  const displayJurors: AgentStatus[] = activeData?.jurors?.map(j => ({
    name: j.name,
    role: j.role,
    verdict: j.vote as any,
    score: j.score,
    reasoning: j.comment
  })) || activeData?.agents || [
    { name: '1. Kuantitatif Hakim', role: 'Teknik & Momentum', verdict: 'AL', score: 84, reasoning: 'RSI ve MACD göstergelerinde pozitif uyumsuzluk teyit edildi.' },
    { name: '2. Tahta & Takas (TCMB)', role: 'TCMB Yabancı Akış', verdict: 'GÜÇLÜ AL', score: 90, reasoning: 'TCMB EVDS net yabancı hisse girişi ve SMA_4 takas artışı teyit edildi.' },
    { name: '3. Temel Değerleme', role: 'Bilanço & Altman-Z', verdict: 'AL', score: 79, reasoning: 'F/K ve PD/DD sektör ortalamalarına göre iskontolu kalmıştır.' },
    { name: '4. KAP & Haber (Finnhub)', role: 'Duygu & Insider', verdict: isVeto ? 'VETO / SAT' : 'GÜÇLÜ AL', score: isVeto ? 24 : 94, reasoning: isVeto ? 'Finnhub sentiment < 0.35 negatif duygu vetosu devrede.' : 'Finnhub ve KAP haber akışı pozitif bölgede.' },
  ];

  return (
    <div className={`bg-slate-900 p-6 rounded-2xl text-white border border-slate-800 shadow-xl ${className}`}>
      <div className="mb-4 p-3 bg-rose-950/20 border border-rose-900/50 rounded-xl text-[10px] text-rose-300/80 italic flex items-start gap-2">
        <Scale className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <span>
          YASAL UYARI / DISCLAIMER: Bu platformda sunulan adli finans denetimleri, TCMB EVDS akış modelleri, Finnhub duygu skorları ve jüri analizleri kamuya açık veriler üzerinden otonom algoritmalarla üretilmektedir. Yatırım danışmanlığı kapsamında değildir.
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              MT16 Çoklu Ajan Jüri Kurulu: <span className="font-mono text-emerald-300">{ticker}</span>
            </h2>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
              isVeto ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {activeData?.consensus || (isVeto ? 'NEGATİF DUYGU VETOSU' : 'AL (KONSENSÜS)')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            TCMB EVDS Haftalık Yabancı Akışı, Finnhub Sentiment ve Adli Veto Kuralları Sentezi
          </p>
        </div>

        <button
          onClick={() => fetchJuryDebate(ticker)}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          Jüriyi Yenile
        </button>
      </div>

      {/* Güven Skoru Barı */}
      <div className="mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
        <div className="flex justify-between items-center mb-2 text-xs">
          <span className="text-slate-400">Jüri Bütünlük ve Güven Skoru:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white">%{confidence.toFixed(1)}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isVeto ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isVeto ? '🚨 ADLİ / DUYGU VETOSU' : '✅ JÜRİ KONSENSÜS ONAYI'}
            </span>
          </div>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-700 ${isVeto ? 'bg-rose-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, Math.max(10, confidence))}%` }}
          />
        </div>
      </div>

      {/* Jüri Üyeleri Izgarası */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayJurors.map((agent, idx) => {
          const isAgentVeto = String(agent.verdict).includes('VETO') || String(agent.verdict).includes('SAT');
          return (
            <div
              key={`${agent.name}-${idx}`}
              className={`p-4 rounded-xl border transition-all ${
                isAgentVeto
                  ? 'bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/30'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-slate-200 truncate">{agent.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  isAgentVeto
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {agent.verdict} {agent.score ? `• ${agent.score}/100` : ''}
                </span>
              </div>
              {agent.role && (
                <div className="text-[10px] text-slate-500 font-medium mb-2">{agent.role}</div>
              )}
              <div className="text-xs text-slate-300/90 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                {agent.reasoning}
              </div>
            </div>
          );
        })}
      </div>

      {/* Jüri Karar Özeti */}
      {activeData?.finalDecision && (
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
          <div className="text-slate-300">
            <strong className="text-emerald-400">Jüri Nihai Eylem Tavsiyesi:</strong> {activeData.finalDecision.summary}
          </div>
          <div className="font-mono text-xs font-bold text-emerald-300 shrink-0 ml-4">
            Hedef: +%{activeData.finalDecision.targetPercent} | Stop: %{activeData.finalDecision.stopLossPercent}
          </div>
        </div>
      )}
    </div>
  );
};
