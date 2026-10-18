/**
 * @file src/components/metrics/ExecutiveOverviewTab.tsx
 * @description BIST Terminal ana genel bakış sekmesi (Tab 0).
 * FinalDecisionHero (Metrik 5), 4 Özet Kartı, PreMarketRadar, Jüri Konsensüsü,
 * Analist Sinyal Dağılımı ve Piyasa Haberleri panellerini birleştirir.
 */

import React from 'react';
import {
  Activity,
  ArrowRight,
  Briefcase,
  Layers,
  Scale,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { FinalAnalysis } from '../../../shared/types/analysis';
import { FinalDecisionHero } from './FinalDecisionHero';
import { PreMarketRadar } from '../PreMarketRadar';
import { AnalystCards } from '../AnalystCards';
import { MetaConsensusCard } from '../MetaConsensusCard';
import { MarketNewsTicker } from '../MarketNewsTicker';
import { JuryReport, MarketDataInput } from '../../types';
import { getStockFundamentalRatios } from '../../utils/stockRatios';

interface ExecutiveOverviewTabProps {
  readonly analysis: FinalAnalysis;
  readonly marketData: MarketDataInput;
  readonly juryReport: JuryReport;
  readonly currentPrice: number;
  readonly dayChangePct: number;
  readonly bofaNetLot?: number;
  readonly isLiveMode: boolean;
  readonly rsi?: number;
  readonly supportLevel?: number;
  readonly resistanceLevel?: number;
  readonly fk?: number;
  readonly pddd?: number;
  readonly onTabChange: (tabIndex: number) => void;
}

/**
 * Yönetici Konsolu Ana Görünümü.
 */
export const ExecutiveOverviewTab: React.FC<ExecutiveOverviewTabProps> = ({
  analysis,
  marketData,
  juryReport,
  currentPrice,
  dayChangePct,
  bofaNetLot = 0,
  isLiveMode,
  rsi,
  supportLevel,
  resistanceLevel,
  fk,
  pddd,
  onTabChange,
}) => {
  const cleanTicker = (marketData.ticker || 'ASELS').toUpperCase().replace(/\.IS$/i, '');

  // Seçilen hisseye özel dinamik temel rasyolar
  const fundamentalRatios = React.useMemo(() => {
    return getStockFundamentalRatios(cleanTicker);
  }, [cleanTicker]);

  // Canlı / dinamik teknik ve temel değerler
  const activeRsi = typeof rsi === 'number'
    ? rsi
    : typeof marketData.technicalIndicators?.rsi14 === 'number'
    ? marketData.technicalIndicators.rsi14
    : typeof juryReport.technicalIndicators?.rsi14 === 'number'
    ? juryReport.technicalIndicators.rsi14
    : 52.4;

  const activeSupport = typeof supportLevel === 'number' && supportLevel > 0
    ? supportLevel
    : typeof marketData.supportLevel1 === 'number' && marketData.supportLevel1 > 0
    ? marketData.supportLevel1
    : currentPrice * 0.965;

  const activeResistance = typeof resistanceLevel === 'number' && resistanceLevel > 0
    ? resistanceLevel
    : typeof marketData.resistanceLevel1 === 'number' && marketData.resistanceLevel1 > 0
    ? marketData.resistanceLevel1
    : currentPrice * 1.045;

  const activeFk = typeof fk === 'number' ? fk : fundamentalRatios.fk;
  const activePddd = typeof pddd === 'number' ? pddd : fundamentalRatios.pddd;
  const activeRegime = fundamentalRatios.regime;
  const activeRegimeDesc = fundamentalRatios.regimeDesc;

  return (
    <div className="space-y-6">
      {/* 1. Birleşik Karar Sistemi Yönetici Hero Banner'ı (Metrik 5) */}
      <FinalDecisionHero
        analysis={analysis}
        currentPrice={currentPrice}
        dayChangePct={dayChangePct}
        bofaNetLot={bofaNetLot}
        isLiveMode={isLiveMode}
        onOpenPositionTab={() => onTabChange(3)}
      />

      {/* 2. Seans Öncesi & Piyasa Radarı */}
      <PreMarketRadar
        sentence={analysis.summary}
        data={marketData}
        isLiveMode={isLiveMode}
        session="CONTINUOUS"
      />

      {/* 3. Dört Ana Metrik Özet Kartı Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metrik 1: 7 Periyot Getiri Özeti */}
        <div
          onClick={() => onTabChange(1)}
          className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 cursor-pointer transition-all shadow-lg group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Activity className="w-4 h-4 text-indigo-400" />
                Çok Zaman Dilimli Getiri
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl font-mono font-bold text-slate-100">
                {analysis.timeframesPositive} / 7
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">Pozitif Periyot</span>
            </div>

            <div className="mt-2 flex gap-1">
              {analysis.timeframeReturns.map((tf) => (
                <div
                  key={`tf-dot-${tf.timeframe}`}
                  title={`${tf.timeframe}: %${tf.returnPct.toFixed(2)}`}
                  className={`flex-1 h-1.5 rounded-full ${
                    tf.returnPct > 0 ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-sans flex items-center justify-between">
            <span>
              En Yüksek:{' '}
              {analysis.timeframeReturns.length > 0
                ? `${analysis.timeframeReturns[analysis.timeframeReturns.length - 1]?.returnPct.toFixed(1)}% (1Y)`
                : '-'}
            </span>
            <span className="text-indigo-400 font-mono group-hover:underline">Detay →</span>
          </div>
        </div>

        {/* Metrik 3: Zaman Dilimi Karar Matrisi */}
        <div
          onClick={() => onTabChange(1)}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 cursor-pointer transition-all shadow-lg group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Zap className="w-4 h-4 text-amber-400" />
                Karar Matrisi
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1 text-center font-mono">
              {analysis.timeframeDecisions.map((d) => (
                <div
                  key={`mat-badge-${d.timeframe}`}
                  className={`p-1.5 rounded text-[10px] font-bold border ${
                    d.decision === 'AL'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : d.decision === 'SAT'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  <div className="text-[9px] opacity-70">
                    {d.timeframe.startsWith('Saatlik')
                      ? 'Saat'
                      : d.timeframe.startsWith('Günlük')
                      ? 'Gün'
                      : d.timeframe.startsWith('Haftalık')
                      ? 'Hafta'
                      : 'Ay'}
                  </div>
                  <div>{d.decision}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-sans flex items-center justify-between">
            <span>2/2 Getiri + Küp Teyitli</span>
            <span className="text-amber-400 font-mono group-hover:underline">Matris →</span>
          </div>
        </div>

        {/* Metrik 4: 9 Küp Zar Formasyonu */}
        <div
          onClick={() => onTabChange(2)}
          className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-xl p-4 cursor-pointer transition-all shadow-lg group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Layers className="w-4 h-4 text-purple-400" />
                Zar Formasyonu (9 Küp)
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span
                className={`text-sm font-mono font-bold px-2 py-0.5 rounded border ${
                  analysis.formation.severity === 'OK'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : analysis.formation.severity === 'WARNING'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                }`}
              >
                {analysis.formation.severity}
              </span>
              <span className="text-xs font-mono text-slate-300">
                {analysis.formation.consensus}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 truncate">
              {analysis.formation.conflicts.length === 0
                ? 'Sıfır çelişki, temiz formasyon'
                : `${analysis.formation.conflicts.length} model çelişkisi tespit edildi`}
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-sans flex items-center justify-between">
            <span>K1-K9 Küp Radarı</span>
            <span className="text-purple-400 font-mono group-hover:underline">Simüle Et →</span>
          </div>
        </div>

        {/* Metrik 2: Kişisel Pozisyon K/Z */}
        <div
          onClick={() => onTabChange(3)}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 cursor-pointer transition-all shadow-lg group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                Kişisel Portföy
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </div>

            {analysis.position ? (
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-mono font-bold text-slate-100">
                    ₺{analysis.position.currentValueTL.toLocaleString('tr-TR')}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      analysis.position.profitLossPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {analysis.position.profitLossPct >= 0 ? '+' : ''}%
                    {analysis.position.profitLossPct.toFixed(2)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  Net K/Z: ₺{analysis.position.profitLossTL.toLocaleString('tr-TR')}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-center py-2 text-xs font-mono text-slate-400">
                <span>Açık pozisyon yok</span>
                <div className="text-indigo-400 text-[11px] mt-0.5">+ Pozisyon Ekle</div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-sans flex items-center justify-between">
            <span>{analysis.position ? `${analysis.position.daysHeld} gün taşındı` : 'Portföy Yönetimi'}</span>
            <span className="text-emerald-400 font-mono group-hover:underline">Portföy →</span>
          </div>
        </div>
      </div>

      {/* 4. Üç Analist Modeli (Duygu, Teknik, Akış) Radar Görünümü */}
      <AnalystCards
        analystA={juryReport.analystA}
        analystB={juryReport.analystB}
        analystC={juryReport.analystC}
        modelWeights={juryReport.modelWeights}
        jury={juryReport}
      />

      {/* 5. Meta Konsensüs Kartı */}
      <MetaConsensusCard ticker={cleanTicker} />

      {/* 6. Piyasa Haberleri ve KAP Akışı */}
      <MarketNewsTicker currentTickerData={marketData} />

      {/* 7. Canlı Piyasa ve Teknik Destek/Direnç Seviyeleri Barı */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4 text-indigo-400" />
          Kritik Teknik & Temel Seviyeler
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 font-mono">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase">RSI (14)</span>
            <div
              className={`text-base font-bold mt-1 ${
                activeRsi > 70 ? 'text-rose-400' : activeRsi < 30 ? 'text-emerald-400' : 'text-slate-100'
              }`}
            >
              {activeRsi.toFixed(1)}
            </div>
            <span className="text-[10px] text-slate-400">
              {activeRsi > 70 ? 'Aşırı Alım' : activeRsi < 30 ? 'Aşırı Satım' : 'Dengeli'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase">Destek 1</span>
            <div className="text-base font-bold text-emerald-400 mt-1">
              ₺{activeSupport.toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-400">Stop-Loss Referansı</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase">Direnç 1</span>
            <div className="text-base font-bold text-rose-400 mt-1">
              ₺{activeResistance.toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-400">Hedef Baraj</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase">F/K Oranı</span>
            <div className="text-base font-bold text-slate-100 mt-1">
              {activeFk.toFixed(1)}
            </div>
            <span className="text-[10px] text-slate-400">{fundamentalRatios.sector}</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase">PD/DD Oranı</span>
            <div className="text-base font-bold text-slate-100 mt-1">
              {activePddd.toFixed(1)}
            </div>
            <span className="text-[10px] text-slate-400">Defter Değeri</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase">BIST Rejimi</span>
            <div className={`text-base font-bold mt-1 ${
              activeRegime === 'TREND' ? 'text-emerald-400' : activeRegime === 'VOLATİL' ? 'text-amber-400' : 'text-indigo-300'
            }`}>
              {activeRegime}
            </div>
            <span className="text-[10px] text-slate-400">{activeRegimeDesc}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
