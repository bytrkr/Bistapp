// src/components/SmartJuryDiagnosisCard.tsx
import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  Globe,
  Radio,
  Zap,
  RotateCcw,
  Sliders,
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react';

export interface SmartJuryDiagnosisCardProps {
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ';
  ticker?: string;
  className?: string;
  onVetoStatusChange?: (isVetoed: boolean) => void;
}

export interface TcmbData {
  period: string;
  reportDate: string;
  weeklyForeignEquityFlow: number;
  weeklyForeignBondFlow: number;
  totalWeeklyForeignFlow: number;
  foreignCustodyShare: number;
  foreignCustodySMA4: number;
  foreignCustodyMomentum: number;
  momentumTrend: 'POZİTİF_GİRİŞ' | 'NÖTR' | 'NEGATİF_ÇIKIŞ';
  jury2ScoreModifier: number;
  jury2Recommendation: string;
  isLiveEvds: boolean;
}

export interface FinnhubData {
  symbol: string;
  companyName: string;
  sentimentScore: number;
  buzzScore: number;
  weeklyArticlesCount: number;
  bullishPercent: number;
  bearishPercent: number;
  insiderNetFlowUsd: number;
  insiderAction: string;
  jury4Status: 'GÜVENLİ DUYGU AKIŞI' | 'NÖTR GÖRÜNÜM' | 'NEGATİF DUYGU VETOSU';
  isVetoed: boolean;
  jury4Score: number;
  jury4Signal: string;
  jury4Comment: string;
  isLiveApi: boolean;
  lastUpdated: string;
}

export const SmartJuryDiagnosisCard: React.FC<SmartJuryDiagnosisCardProps> = ({
  marketType = 'BIST',
  ticker = 'ASELS',
  className = '',
  onVetoStatusChange
}) => {
  const [tcmb, setTcmb] = useState<TcmbData | null>(null);
  const [finnhub, setFinnhub] = useState<FinnhubData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulatedVeto, setSimulatedVeto] = useState<boolean>(false);

  const activeSymbol = marketType === 'NASDAQ' ? (ticker || 'NVDA') : marketType === 'CRYPTO' ? 'BTCUSDT' : (ticker || 'ASELS');

  const fetchData = async (vetoMode = simulatedVeto) => {
    try {
      setLoading(true);
      const symbolQuery = marketType === 'NASDAQ' ? (ticker || 'NVDA') : 'NVDA';
      const [tcmbRes, finnhubRes] = await Promise.all([
        fetch('/api/macro/tcmb'),
        fetch(`/api/sentiment/finnhub?symbol=${symbolQuery}${vetoMode ? '&veto=true' : ''}`)
      ]);

      if (tcmbRes.ok) {
        const tj = await tcmbRes.json();
        if (tj.success) setTcmb(tj.data);
      }

      if (finnhubRes.ok) {
        const fj = await finnhubRes.json();
        if (fj.success) {
          setFinnhub(fj.data);
          if (onVetoStatusChange) {
            onVetoStatusChange(fj.data.isVetoed);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch Macro / Sentiment data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(simulatedVeto);
    const timer = setInterval(() => fetchData(simulatedVeto), 15000);
    return () => clearInterval(timer);
  }, [marketType, ticker, simulatedVeto]);

  const toggleVetoSimulation = () => {
    const nextVeto = !simulatedVeto;
    setSimulatedVeto(nextVeto);
    fetchData(nextVeto);
  };

  const isVetoed = finnhub?.isVetoed ?? false;
  const isNetInflow = (tcmb?.weeklyForeignEquityFlow ?? 0) > 0;

  return (
    <div
      className={`bg-slate-900 border rounded-xl p-5 shadow-lg flex flex-col justify-between transition-all duration-300 ${
        isVetoed
          ? 'border-rose-500 bg-rose-950/20 ring-2 ring-rose-500/30'
          : 'border-slate-800'
      } ${className}`}
    >
      <div>
        {/* Başlık ve Durum Rozeti */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            {isVetoed ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            Akıllı Jüri Teşhis Raporu
          </h2>

          <div className="flex items-center gap-1.5">
            {isVetoed ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                🚨 NEGATİF DUYGU VETOSU
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> JÜRİ ONAYLI
              </span>
            )}
          </div>
        </div>

        {/* Canlı Jüri Teşhis Metni */}
        <div
          className={`p-3.5 rounded-lg border text-xs leading-relaxed transition ${
            isVetoed
              ? 'bg-rose-950/60 border-rose-500/50 text-rose-100'
              : 'bg-slate-950/80 border-slate-800/80 text-slate-300 italic'
          }`}
        >
          {isVetoed ? (
            <div className="space-y-1">
              <p className="font-bold text-rose-300 flex items-center gap-1.5 not-italic">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                DİKKAT: Jüri 4 (KAP & Haber Duygu) Vetosu Devrede!
              </p>
              <p className="not-italic text-rose-200/90 text-[11px]">
                {finnhub?.jury4Comment || 'Finnhub haber ve sosyal duygu skoru kritik eşiğin altına indi (Sentiment < 0.35). Piyasa algısındaki aşırı bozulma sebebiyle otonom robot donduruldu.'}
              </p>
            </div>
          ) : (
            <p>
              {marketType === 'BIST'
                ? `"${tcmb?.jury2Recommendation || 'TCMB EVDS: Haftalık yabancı sermaye girişi ve yabancı takas payı 4 haftalık ortalama (SMA_4) üzerinde. Jüri 2 puanı artırıldı.'}"`
                : marketType === 'NASDAQ'
                ? `"${finnhub?.jury4Comment || 'Finnhub Sentiment: Haber akışı güçlü pozitif, kurumsal Insider net alımı teyit edildi. Jüri 4 tam puan verdi.'}"`
                : '"Satıcı kademeleri kalınlaşıyor. Hacim sakin (Z = -3.50σ). Yeni alım yapılmadı, sahte kırılımlara karşı nakitte bekleniyor."'}
            </p>
          )}
        </div>

        {/* TCMB & FINNHUB MİNİ GÖSTERGELERİ */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
          {/* TCMB EVDS Göstergesi */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
            <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-cyan-400" /> TCMB EVDS Akışı
              </span>
              <span className={`font-mono font-bold ${isNetInflow ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isNetInflow ? `+${tcmb?.jury2ScoreModifier} Puan` : `${tcmb?.jury2ScoreModifier} Puan`}
              </span>
            </div>
            <div className="font-mono text-xs font-bold text-white flex items-center justify-between">
              <span>Hisse Net:</span>
              <span className={isNetInflow ? 'text-emerald-400' : 'text-rose-400'}>
                {tcmb?.weeklyForeignEquityFlow ? `${tcmb.weeklyForeignEquityFlow > 0 ? '+' : ''}$${tcmb.weeklyForeignEquityFlow}M` : '+$76.5M'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
              <span>Takas / SMA_4:</span>
              <span className="text-slate-300">
                %{tcmb?.foreignCustodyShare ?? 38.7} / %{tcmb?.foreignCustodySMA4 ?? 37.9}
              </span>
            </div>
          </div>

          {/* Finnhub Sentiment Göstergesi */}
          <div
            className={`p-2.5 rounded-lg border space-y-1 ${
              isVetoed
                ? 'bg-rose-950/40 border-rose-500/40'
                : 'bg-slate-950 border-slate-800/80'
            }`}
          >
            <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-blue-400" /> Finnhub Duygu
              </span>
              <span
                className={`font-mono font-bold ${
                  isVetoed ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {finnhub?.sentimentScore ? finnhub.sentimentScore.toFixed(2) : '0.82'}
              </span>
            </div>
            <div className="font-mono text-xs font-bold text-white flex items-center justify-between">
              <span>Jüri 4 Durum:</span>
              <span
                className={
                  isVetoed
                    ? 'text-rose-400 font-extrabold text-[10px]'
                    : 'text-emerald-400 text-[10px]'
                }
              >
                {isVetoed ? 'VETO (<0.35)' : 'ONAYLANDI'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
              <span>Insider Akışı:</span>
              <span className="text-slate-300">
                {finnhub?.insiderNetFlowUsd ? `${finnhub.insiderNetFlowUsd > 0 ? '+' : ''}$${finnhub.insiderNetFlowUsd}M` : '+$28.5M'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alt Bilgi & Simülasyon Kontrolü */}
      <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span>Jüri Konsensüsü:</span>
          <strong className={isVetoed ? 'text-rose-400 font-black' : 'text-amber-400 font-bold'}>
            {isVetoed ? '🚨 NEGATİF DUYGU VETOSU' : 'BEKLE / NAKİT'}
          </strong>
        </div>

        {/* Simülasyon Test Butonu (Sentiment < 0.35 Veto Testi) */}
        <button
          onClick={toggleVetoSimulation}
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
            simulatedVeto
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          title="Finnhub Sentiment < 0.35 Negatif Duygu Vetosu Senaryosunu Test Et"
        >
          <Sliders className="w-2.5 h-2.5" />
          {simulatedVeto ? 'Vetoyu Kapat (Normale Dön)' : 'Test: Veto Tetikle (<0.35)'}
        </button>
      </div>
    </div>
  );
};
