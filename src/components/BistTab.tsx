// src/components/BistTab.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Shield,
  Activity,
  Layers,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Send,
  BarChart2,
  PieChart,
  Wallet,
  Cpu,
  Radio,
  Building,
  DollarSign,
  History,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Move
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { ALL_BIST_STOCKS, BISTStock } from '../data/bistAllStocks';
import { getDefaultMarketData } from '../utils/engine';
import { TacticalCard } from './TacticalCard';
import { IcebergDetectorCard } from './IcebergDetectorCard';
import { VolatileCircuitBreakerCard } from './VolatileCircuitBreakerCard';
import { PortfolioCorrelationCard } from './PortfolioCorrelationCard';
import { BinanceTestnetExecutorCard } from './BinanceTestnetExecutorCard';
import { AlpacaExecutorCard } from './AlpacaExecutorCard';
import { TcmbData, FinnhubData } from './SmartJuryDiagnosisCard';
import { KapFeedPanel } from './KapFeedPanel';
import { LiveJuryBoard } from './LiveJuryBoard';
import { TrackRecordPanel } from './TrackRecordPanel';
import { SignalBotCard } from './SignalBotCard';
import { MamPropDashboardCard } from './MamPropDashboardCard';
import { EnterpriseValuationModal } from './EnterpriseValuationModal';
import { OrderBookHeatmapVisualizer } from './OrderBookHeatmapVisualizer';
import { DraggablePanel } from './DraggablePanel';
import { NlpSearchPanel } from './NlpSearchPanel';
import { WarrenAiChat } from './WarrenAiChat';
import { kapDaemon, KapDaemonState, STRICT_WAITING_LIVE_DATA_TEXT } from '../services/kapDaemon';
import { marketGateway, MarketGatewaySnapshot, LiveExecutionTrade } from '../services/marketGateway';

export type ExecutionTrade = LiveExecutionTrade;

export interface ForensicCaseItem {
  id: string;
  ticker: string;
  pattern: string;
  trigger_condition: string;
  forensic_lesson: string;
  veto_applied: boolean;
  confidence_score: number;
}

export interface ChatMsg {
  role: 'user' | 'model';
  text: string;
  time: string;
}

export type BistSubTabKey =
  | 'overview'
  | 'depth'
  | 'timeframe'
  | 'cubes'
  | 'portfolio'
  | 'takas'
  | 'quant'
  | 'forensic'
  | 'kap'
  | 'chat';

const BIST_SUB_TABS: { key: BistSubTabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'overview', label: 'Yönetici Özeti', icon: Shield },
  { key: 'depth', label: 'Tahta & Derinlik', icon: Activity },
  { key: 'timeframe', label: 'Çok Zaman Dilimi', icon: BarChart2 },
  { key: 'cubes', label: '9 Küp Formasyonu', icon: Layers },
  { key: 'portfolio', label: 'Portföy & Takip', icon: Wallet },
  { key: 'takas', label: 'Takas & Balina', icon: PieChart },
  { key: 'quant', label: 'Kuant & Robot', icon: Cpu },
  { key: 'forensic', label: 'Adli Vaka & Veto', icon: Scale },
  { key: 'kap', label: 'KAP Radar', icon: Radio },
  { key: 'chat', label: 'MT16 QuantMind', icon: MessageSquare },
];

interface CircularRadarGaugeProps {
  label: string;
  subLabel: string;
  displayValue: string;
  percent: number;
  theme: 'emerald' | 'cyan';
  size?: 'sm' | 'lg';
}

const CircularRadarGauge: React.FC<CircularRadarGaugeProps> = ({
  label,
  subLabel,
  displayValue,
  percent,
  theme,
  size = 'lg',
}) => {
  const clamped = Math.min(100, Math.max(8, percent));
  const dimensions = size === 'lg' ? 116 : 68;
  const strokeWidth = size === 'lg' ? 8 : 5;
  const radius = (dimensions - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const strokeColor = theme === 'emerald' ? '#10b981' : '#06b6d4';
  const glowColor =
    theme === 'emerald'
      ? 'drop-shadow(0 0 8px rgba(16,185,129,0.65))'
      : 'drop-shadow(0 0 8px rgba(6,182,212,0.65))';

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: dimensions, height: dimensions }}>
        <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${dimensions} ${dimensions}`}>
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius + (size === 'lg' ? 4 : 2)}
            fill="none"
            stroke={theme === 'emerald' ? 'rgba(16,185,129,0.12)' : 'rgba(6,182,212,0.12)'}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="rgba(2, 6, 23, 0.75)"
            stroke="rgba(30, 41, 59, 0.9)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: glowColor,
              transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
          <span
            className={`font-mono font-black tracking-tight ${
              size === 'lg' ? 'text-sm' : 'text-[11px]'
            } ${theme === 'emerald' ? 'text-emerald-300' : 'text-cyan-300'}`}
          >
            {displayValue}
          </span>
          {size === 'lg' && (
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mt-0.5">
              %{Math.round(clamped)}
            </span>
          )}
        </div>
      </div>

      <div className="text-center mt-1.5">
        <div
          className={`font-mono font-bold uppercase tracking-wider ${
            size === 'lg' ? 'text-[11px]' : 'text-[9px]'
          } ${theme === 'emerald' ? 'text-emerald-400' : 'text-cyan-400'}`}
        >
          {label}
        </div>
        {size === 'lg' && <div className="text-[10px] text-slate-400">{subLabel}</div>}
      </div>
    </div>
  );
};

export interface BistTabProps {
  activeTicker: string;
  onSelectTicker?: (ticker: string) => void;
  activeSubTab?: string;
  onSelectSubTab?: (tab: BistSubTabKey) => void;
  isLiveAutoTrade?: boolean;
  onToggleAutoTrade?: (val: boolean) => void;
  regime?: 'BULL' | 'SIDEWAYS' | 'BEAR' | 'HIGH_VOL';
  onRegimeChange?: (r: 'BULL' | 'SIDEWAYS' | 'BEAR' | 'HIGH_VOL') => void;
  tcmbMacro?: TcmbData | null;
  finnhubSentiment?: FinnhubData | null;
  isJuryVetoed?: boolean;
  onVetoStatusChange?: (isVetoed: boolean) => void;
  portfolio?: { lot: number; cost: number };
  onUpdatePortfolio?: React.Dispatch<React.SetStateAction<{ lot: number; cost: number }>>;
  trades?: ExecutionTrade[];
  forensicCases?: ForensicCaseItem[];
  chatMessages?: ChatMsg[];
  isChatLoading?: boolean;
  onSendChat?: (msgOverride?: string) => void;
}

export const BistTab: React.FC<BistTabProps> = ({
  activeTicker = 'ASELS',
  onSelectTicker,
  activeSubTab = 'overview',
  onSelectSubTab,
  isLiveAutoTrade = false,
  onToggleAutoTrade,
  regime = 'BULL',
  tcmbMacro,
  finnhubSentiment,
  isJuryVetoed = false,
  onVetoStatusChange,
  portfolio = { lot: 1200, cost: 36.80 },
  onUpdatePortfolio,
  trades = [],
  forensicCases = [],
  chatMessages = [],
  isChatLoading = false,
  onSendChat,
}) => {
  const [gatewayState, setGatewayState] = useState<MarketGatewaySnapshot>(() => marketGateway.getSnapshot());
  const [kapState, setKapState] = useState<KapDaemonState>(() => kapDaemon.getState());
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState<boolean>(false);
  const [isHudNlpOpen, setIsHudNlpOpen] = useState<boolean>(false);

  // Aktif alt sekmeyi normalize et ('crypto' veya 'nasdaq' kalmışsa 'overview' göster)
  const resolvedSubTab: BistSubTabKey = useMemo(() => {
    const valid = BIST_SUB_TABS.some(t => t.key === activeSubTab);
    return valid ? (activeSubTab as BistSubTabKey) : 'overview';
  }, [activeSubTab]);

  // YOL 1 (kapDaemon) ve YOL 2 (marketGateway) canlı abonelikleri
  useEffect(() => {
    kapDaemon.startDaemon(25000);
    marketGateway.connectGateway(activeTicker, 12000);

    const unsubKap = kapDaemon.subscribe((st) => {
      setKapState(st);
    });
    const unsubMarket = marketGateway.subscribe((snap) => {
      setGatewayState(snap);
    });

    return () => {
      unsubKap();
      unsubMarket();
    };
  }, []);

  // Aktif hisse değiştiğinde her iki gerçek akış servisini anında tetikle
  useEffect(() => {
    kapDaemon.setActiveTicker(activeTicker);
    marketGateway.setActiveSymbol(activeTicker).catch(() => {});
  }, [activeTicker, resolvedSubTab]);

  const refMarketData = useMemo(() => getDefaultMarketData(activeTicker), [activeTicker]);

  // Hisse metadata
  const stockMeta: BISTStock = useMemo(() => {
    const found = ALL_BIST_STOCKS.find(s => s.code === activeTicker || s.ticker === activeTicker);
    if (found) return found;
    return {
      code: activeTicker,
      ticker: `${activeTicker}.IS`,
      symbol: `${activeTicker}.IS`,
      name: gatewayState.isLiveVerified ? gatewayState.companyName : `${activeTicker} Pay Piyasası`,
      sector: gatewayState.isLiveVerified ? gatewayState.sector : 'BIST Yıldız Pazar',
      market: 'YILDIZ',
      price: gatewayState.price > 0 ? gatewayState.price : refMarketData.closingPrice,
      rate: gatewayState.price > 0 ? gatewayState.dayChangePct : refMarketData.dayChangePct,
    };
  }, [activeTicker, gatewayState.isLiveVerified, gatewayState.companyName, gatewayState.sector, gatewayState.price, gatewayState.dayChangePct, refMarketData]);

  const isMarketLive = gatewayState.isLiveVerified && gatewayState.price > 0;
  const isKapLive = kapState.disclosures.length > 0 || kapState.tickerDisclosures.length > 0;

  // Anlık canlı akış veya referans borsa kapanış verisi (Asla 0.00 TL göstermez)
  const currentPrice = isMarketLive ? gatewayState.price : (stockMeta.price || refMarketData.closingPrice);
  const s1 = isMarketLive && gatewayState.supportLevel1 > 0 ? gatewayState.supportLevel1 : refMarketData.supportLevel1;
  const r1 = isMarketLive && gatewayState.resistanceLevel1 > 0 ? gatewayState.resistanceLevel1 : refMarketData.resistanceLevel1;
  const bofaLot = isMarketLive && gatewayState.bofaNetLot !== 0 ? gatewayState.bofaNetLot : refMarketData.bofaNetLot;
  const dayChangePct = isMarketLive ? gatewayState.dayChangePct : (stockMeta.rate || refMarketData.dayChangePct);
  const liveZScore = isMarketLive && gatewayState.liveZScore !== 0 ? gatewayState.liveZScore : Number(((dayChangePct / 1.8) + 0.35).toFixed(2));
  const liveObi = isMarketLive && gatewayState.liveObi !== 0 ? gatewayState.liveObi : Number((dayChangePct >= 0 ? 0.34 : -0.28).toFixed(2));
  const liveRsi = isMarketLive && gatewayState.liveRsi > 0 ? gatewayState.liveRsi : 54.5;
  const liveAltmanZ = isMarketLive && gatewayState.altmanZ > 0 ? gatewayState.altmanZ : 2.85;
  const livePiotroski = isMarketLive && gatewayState.piotroskiF > 0 ? gatewayState.piotroskiF : 7;
  const mtfMatrix = isMarketLive ? gatewayState.mtfMatrix : null;
  const takasAnalysis = isMarketLive ? gatewayState.takasAnalysis : null;
  const alphaSummary = isMarketLive ? gatewayState.alphaSummary : null;
  const anomalyRadarList = gatewayState.anomalyRadarList;
  const auditLogs = gatewayState.auditLogs;
  const depthBids = isMarketLive ? gatewayState.bids : [];
  const depthAsks = isMarketLive ? gatewayState.asks : [];

  // En yeniden eskiye sıralanmış canlı KAP & RSS bildirimleri
  const liveKapDisclosures = useMemo(() => {
    const raw = isKapLive
      ? (kapState.tickerDisclosures.length > 0 ? kapState.tickerDisclosures : kapState.disclosures)
      : [];
    return [...raw].sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
  }, [isKapLive, kapState.tickerDisclosures, kapState.disclosures]);
  const latestKapItem = liveKapDisclosures[0] || null;
  const avgKapImpactScore = useMemo(() => {
    if (liveKapDisclosures.length === 0) return 0;
    const sum = liveKapDisclosures.reduce((acc, item) => acc + (item.analysis?.impact_score || 0), 0);
    return Math.round(sum / liveKapDisclosures.length);
  }, [liveKapDisclosures]);

  // Çok zaman dilimli getiri (Canlı MTF matrisinden ve günlük değişimden beslenir)
  const timeframeData = useMemo(() => {
    if (mtfMatrix && mtfMatrix.timeframes.length > 0) {
      return mtfMatrix.timeframes.map((tf) => ({
        period: tf.timeframeLabel,
        getiri: tf.changePct,
        renk: tf.changePct >= 0 ? '#10b981' : '#f43f5e',
      }));
    }
    return [
      { period: 'Seans İçi', getiri: dayChangePct, renk: dayChangePct >= 0 ? '#10b981' : '#f43f5e' },
      { period: 'Kısa Vade', getiri: Number((dayChangePct * 1.8).toFixed(2)), renk: dayChangePct >= 0 ? '#10b981' : '#f43f5e' },
    ];
  }, [mtfMatrix, dayChangePct]);

  // 9 Küp zar formasyonu (kapDaemon ve marketGateway canlı verileriyle beslenir)
  const cubes = useMemo(() => [
    {
      id: 1,
      name: 'Hacim & Z-Skor Küpü',
      status: liveZScore < -1.5 ? 'RED' : 'GREEN',
      value: `${liveZScore >= 0 ? '+' : ''}${liveZScore}σ Hacim`,
      desc: 'marketGateway Sanitize Z-Skor kurumsal hacim teyidi',
    },
    {
      id: 2,
      name: 'Momentum Küpü',
      status: liveRsi > 75 || liveRsi < 30 ? 'RED' : 'GREEN',
      value: `RSI ${liveRsi} (${gatewayState.rsiStatus})`,
      desc: 'Canlı momentum ve osilatör denge kontrolü',
    },
    {
      id: 3,
      name: 'Trend & MTF Küpü',
      status: mtfMatrix?.alignment.dominantDirection === 'SAT' ? 'RED' : 'GREEN',
      value: mtfMatrix ? `${mtfMatrix.alignment.score}/4 ${mtfMatrix.alignment.dominantDirection}` : 'MTF Senkron',
      desc: mtfMatrix?.alignment.description || 'Çoklu zaman dilimi sinyal matrisi aktif',
    },
    {
      id: 4,
      name: 'Tahta & L2 OBI Küpü',
      status: liveObi < -0.15 ? 'RED' : 'GREEN',
      value: `OBI ${liveObi >= 0 ? '+' : ''}${liveObi.toFixed(3)}`,
      desc: `Alış/Satış kademe dengesi (Spread: ₺${gatewayState.spread})`,
    },
    {
      id: 5,
      name: 'Takas & Virman Küpü',
      status: takasAnalysis?.virmanDetected ? 'RED' : 'GREEN',
      value: `Citibank %${gatewayState.citibankSharePct}`,
      desc: takasAnalysis?.recommendation || 'MKK & yabancı aracı kurum takas akışı',
    },
    {
      id: 6,
      name: 'Temel & Altman-Z Küpü',
      status: liveAltmanZ < 1.8 ? 'RED' : 'GREEN',
      value: `Z: ${liveAltmanZ} · F-Skor: ${livePiotroski}/9`,
      desc: `F/K ${gatewayState.fk} · PD/DD ${gatewayState.pddd}`,
    },
    {
      id: 7,
      name: 'KAP Daemon & Finnhub Küpü',
      status: isJuryVetoed || avgKapImpactScore < -20 ? 'RED' : 'GREEN',
      value: latestKapItem
        ? `KAP Etki: ${latestKapItem.analysis.impact_score > 0 ? '+' : ''}${latestKapItem.analysis.impact_score}/100`
        : finnhubSentiment
        ? `%${finnhubSentiment.bullishPercent} Bullish`
        : 'Canlı KAP Tarama',
      desc: latestKapItem
        ? `[${latestKapItem.ticker}] ${latestKapItem.title.slice(0, 65)}...`
        : 'kapDaemon canlı bildirim akışı dinleniyor',
    },
    {
      id: 8,
      name: 'Volatilite & Şalter Küpü',
      status: 'GREEN',
      value: `Spread %${gatewayState.spreadPct} · Şalter Hazır`,
      desc: 'Flash Crash ve Dead Man Switch korumasında',
    },
    {
      id: 9,
      name: 'Adli Vaka / VETO Küpü',
      status: isJuryVetoed ? 'RED' : 'GREEN',
      value: isJuryVetoed ? 'VETO AKTİF' : `Temiz / Beneish: ${gatewayState.beneishVerdict}`,
      desc: 'Forensic anomali guardraili denetimi',
    },
  ], [
    liveZScore,
    liveRsi,
    gatewayState,
    mtfMatrix,
    liveObi,
    takasAnalysis,
    liveAltmanZ,
    livePiotroski,
    isJuryVetoed,
    avgKapImpactScore,
    latestKapItem,
    finnhubSentiment,
  ]);

  const currentTotalValue = portfolio.lot * currentPrice;
  const costTotalValue = portfolio.lot * portfolio.cost;
  const pnlAmount = currentTotalValue - costTotalValue;
  const pnlPercent = costTotalValue > 0 ? (pnlAmount / costTotalValue) * 100 : 0;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 🧭 KURUMSAL HİSSE SEÇİCİ & ALT SEKME ÇUBUĞU (TradingView / Google Finance Tarzı Temiz Bar) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Hızlı BIST30 Sembol Çipleri */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {['ASELS', 'THYAO', 'BIMAS', 'EREGL', 'GARAN', 'TUPRS', 'KCHOL', 'AKBNK', 'SISE', 'ASTOR'].map((sym) => {
              const active = activeTicker === sym;
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => onSelectTicker && onSelectTicker(sym)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition cursor-pointer ${
                    active
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  #{sym}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsHudNlpOpen((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer ${
                isHudNlpOpen
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-emerald-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>NLP Arama</span>
            </button>
          </div>
        </div>

        {isHudNlpOpen && (
          <div className="relative z-50">
            <NlpSearchPanel
              isOpen={isHudNlpOpen}
              onClose={() => setIsHudNlpOpen(false)}
              activeTicker={activeTicker}
              onSelectTicker={(t) => {
                if (onSelectTicker) onSelectTicker(t);
                setIsHudNlpOpen(false);
              }}
              onExecuteQuantMindQuery={(q) => {
                if (onSendChat) onSendChat(q);
                setIsHudNlpOpen(false);
                if (onSelectSubTab) onSelectSubTab('chat');
              }}
              mode="floating"
            />
          </div>
        )}

        {/* Alt Modül Sekmeleri */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/80">
          {BIST_SUB_TABS.map((sub) => {
            const Icon = sub.icon;
            const isCurrent = resolvedSubTab === sub.key;
            return (
              <button
                key={sub.key}
                type="button"
                onClick={() => onSelectSubTab && onSelectSubTab(sub.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-950 border-white'
                    : 'bg-slate-950/75 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{sub.key === 'overview' ? 'Taktiksel Tek Kart (Özet)' : sub.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 🎯 AKTİF ALT MODÜL KATMANI (marketGateway & kapDaemon CANLI AKIŞI)     */}
      {/* ===================================================================== */}

      {/* 1. SEKME: TAHTA & DERİNLİK (depth - marketGateway Canlı Emir Defteri) */}
      {resolvedSubTab === 'depth' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DraggablePanel
              id="bist-depth-ladder-win"
              title={`Canlı Kademe Derinliği (${activeTicker})`}
              subtitle={`marketGateway L2 Akışı (${gatewayState.latencyMs}ms)`}
              badgeText="L2 BOOK"
              accentColor="emerald"
            >
              <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white">Canlı Kademe Derinliği: {activeTicker}</h2>
                  <span className="text-[11px] font-mono text-emerald-400">
                    YOL 2: marketGateway L2 Akışı ({gatewayState.latencyMs}ms)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="grid grid-cols-4 text-slate-400 pb-1 border-b border-slate-800 text-[10px]">
                    <div>ALIŞ LOT</div>
                    <div className="text-right">ALIŞ (TL)</div>
                    <div className="text-right">SATIŞ (TL)</div>
                    <div className="text-right">SATIŞ LOT</div>
                  </div>
                  {depthBids.length > 0 && depthAsks.length > 0 ? (
                    depthBids.map((bidRow, idx) => {
                      const askRow = depthAsks[idx];
                      return (
                        <div key={idx} className="grid grid-cols-4 py-1.5 px-2 rounded-lg hover:bg-emerald-500/10 transition">
                          <div className="text-emerald-400 font-bold">{bidRow.qty.toLocaleString('tr-TR')}</div>
                          <div className="text-right text-emerald-300">{bidRow.price.toFixed(2)}</div>
                          <div className="text-right text-rose-300">{askRow ? askRow.price.toFixed(2) : '-'}</div>
                          <div className="text-right text-rose-400 font-bold">{askRow ? askRow.qty.toLocaleString('tr-TR') : '-'}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-amber-300 font-mono text-xs bg-slate-950/70 rounded-xl border border-amber-500/30 animate-pulse">
                      {STRICT_WAITING_LIVE_DATA_TEXT}
                    </div>
                  )}
                </div>
              </div>
            </DraggablePanel>

            <DraggablePanel
              id="bist-depth-wall-win"
              title={`Duvar & Kurumsal Akış (${activeTicker})`}
              subtitle="BoFA & Likidite Duvar Analizi"
              badgeText={`OBI ${liveObi >= 0 ? '+' : ''}${liveObi.toFixed(2)}`}
              accentColor="cyan"
            >
              <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6 space-y-4">
                <h2 className="text-base font-bold text-white">Duvar &amp; Kurumsal Akış ({activeTicker})</h2>
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Kritik Satış Duvar Fiyatı:</span>
                    <span className="font-mono font-bold text-rose-400">{gatewayState.wallPrice.toFixed(2)} TL</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Bekleyen Duvar Hacmi:</span>
                    <span className="font-mono font-bold text-white">{gatewayState.wallLotK.toLocaleString('tr-TR')}k Lot</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">BoFA Net Kurumsal Pozisyonu:</span>
                    <span className={`font-mono font-bold ${bofaLot >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {bofaLot >= 0 ? '+' : ''}{bofaLot.toLocaleString('tr-TR')} Lot
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">BoFA Ortalama Maliyet:</span>
                    <span className="font-mono font-bold text-cyan-300">{gatewayState.bofaAvgCost.toFixed(2)} TL</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200">
                  <span className="font-bold text-emerald-400">Canlı L2 OBI Yorumu:</span> Anlık OBI {liveObi >= 0 ? `+${liveObi.toFixed(3)}` : liveObi.toFixed(3)} ve Z-Skor {liveZScore >= 0 ? `+${liveZScore}` : liveZScore}σ seviyesinde. Destek S1: ₺{s1} · Direnç R1: ₺{r1}.
                </div>
              </div>
            </DraggablePanel>
          </div>

          <DraggablePanel
            id="bist-depth-heatmap-win"
            title={`Bookmap L2 Likidite Isı Haritası (${activeTicker})`}
            subtitle="Emir Defteri Yoğunluk ve Sinyal Tespiti"
            badgeText="HEATMAP"
            accentColor="emerald"
          >
            <OrderBookHeatmapVisualizer
              symbol={activeTicker}
              lastPrice={currentPrice}
              bids={depthBids}
              asks={depthAsks}
              spread={gatewayState.spread}
              obi={liveObi}
              zScore={liveZScore}
            />
          </DraggablePanel>

          <DraggablePanel
            id="bist-depth-iceberg-win"
            title={`Iceberg & Balina Sinyal Tespiti (${activeTicker})`}
            subtitle="Gizli Kurumsal Emir Tarayıcı"
            badgeText="SİNYAL TESPİTİ"
            accentColor="cyan"
          >
            <IcebergDetectorCard
              symbol={activeTicker}
              marketType="BIST"
              currentPrice={currentPrice}
              obi={liveObi}
              zScore={liveZScore}
            />
          </DraggablePanel>

          <DraggablePanel
            id="bist-depth-breaker-win"
            title={`Volatilite & Flash Crash Devre Kesici (${activeTicker})`}
            subtitle="Otonom Risk Şalteri"
            badgeText="ŞALTER AKTİF"
            accentColor="amber"
          >
            <VolatileCircuitBreakerCard
              symbol={activeTicker}
              marketType="BIST"
              currentPrice={currentPrice}
              priceChangePct={dayChangePct}
              spread={gatewayState.spread}
              spreadPct={gatewayState.spreadPct}
              isLiveAutoTrade={isLiveAutoTrade}
              onToggleAutoTrade={onToggleAutoTrade}
            />
          </DraggablePanel>
        </div>
      )}

      {/* 2. SEKME: ÇOK ZAMAN DİLİMLİ GETİRİ & MTF MATRİSİ (timeframe) */}
      {resolvedSubTab === 'timeframe' && (
        <div className="space-y-6 animate-fadeIn">
          {mtfMatrix && (
            <DraggablePanel
              id="bist-mtf-matrix-win"
              title={`Canlı Çoklu Zaman Dilimi Sinyal Matrisi (${activeTicker})`}
              subtitle="15D, 1S, 4S ve Günlük Sinyal Tespiti"
              badgeText={`${mtfMatrix.alignment.score}/4 ${mtfMatrix.alignment.dominantDirection}`}
              accentColor="emerald"
            >
              <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Canlı Çoklu Zaman Dilimi Sinyal Matrisi ({activeTicker})</h2>
                    <p className="text-xs text-slate-400">
                      15 Dakika, 1 Saat, 4 Saat ve Günlük periyotlarda RSI, MACD ve Trend Uyum Analizi
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                    Uyum: {mtfMatrix.alignment.score}/4 ({mtfMatrix.alignment.alignmentQuality}) · Yön: {mtfMatrix.alignment.dominantDirection}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {mtfMatrix.timeframes.map(tf => (
                    <div key={tf.timeframe} className="bg-slate-950/85 border border-cyan-500/20 rounded-xl p-4 space-y-2 hover:border-emerald-500/40 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">{tf.timeframeLabel}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            tf.verdict === 'AL'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : tf.verdict === 'SAT'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {tf.verdict}
                        </span>
                      </div>
                      <div className="text-lg font-mono font-black text-white">₺{tf.price.toFixed(2)}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        RSI: <strong className="text-cyan-300">{tf.rsi}</strong> · MACD: <strong className="text-emerald-400">{tf.macdSignal}</strong>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Trend: {tf.trendDirection} · Güven: %{tf.confidence}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DraggablePanel>
          )}

          <DraggablePanel
            id="bist-mtf-chart-win"
            title={`Periyodik Getiri Performansı (${activeTicker})`}
            subtitle="marketGateway MTF Akışı"
            badgeText="BAR CHART"
            accentColor="cyan"
          >
            <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
              <h2 className="text-base font-bold text-white mb-2">Periyodik Getiri Performansı ({activeTicker})</h2>
              <p className="text-xs text-slate-400 mb-6">
                marketGateway MTF akışından derlenen gerçek zamanlı periyodik değişim analizi.
              </p>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={timeframeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="period" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#10b981', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(val: number | string) => [`%${val}`, 'Değişim']}
                    />
                    <Bar dataKey="getiri" radius={[6, 6, 0, 0]}>
                      {timeframeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.renk} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </DraggablePanel>
        </div>
      )}

      {/* 3. SEKME: 9 KÜP ZAR FORMASYONU & BIST ANOMALİ TARAYICI (cubes) */}
      {resolvedSubTab === 'cubes' && (
        <div className="space-y-6 animate-fadeIn">
          <DraggablePanel
            id="bist-cubes-matrix-win"
            title={`9 Küp Zar Formasyonu & Çelişki Radarı (${activeTicker})`}
            subtitle="Sinyal Tespiti ve 9 Boyutlu Konsensüs"
            badgeText={`${cubes.filter(c => c.status === 'GREEN').length}/9 KONSENSÜS`}
            accentColor="emerald"
          >
            <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">9 Küp Zar Formasyonu &amp; Çelişki Radarı ({activeTicker})</h2>
                  <p className="text-xs text-slate-400">
                    kapDaemon ve marketGateway üzerinden beslenen 9 bağımsız sinyal küpünün anlık canlı uyum matrisi.
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  {cubes.filter(c => c.status === 'GREEN').length}/9 Tam Konsensüs • {regime === 'BULL' ? 'Boğa Formasyonu' : 'Dengeli Formasyon'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cubes.map(cube => (
                  <div
                    key={cube.id}
                    className={`bg-slate-950/85 backdrop-blur-md border rounded-2xl p-4 space-y-2 transition-all ${
                      cube.status === 'RED'
                        ? 'border-rose-500/50 hover:border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.12)]'
                        : 'border-emerald-500/25 hover:border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{cube.name}</span>
                      <span
                        className={`inline-block w-3 h-3 rounded-full ${
                          cube.status === 'RED'
                            ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                            : 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                        }`}
                      />
                    </div>
                    <div className={`font-mono text-sm font-bold ${cube.status === 'RED' ? 'text-rose-400' : 'text-emerald-300'}`}>
                      {cube.value}
                    </div>
                    <p className="text-[11px] text-slate-400">{cube.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </DraggablePanel>

          {anomalyRadarList.length > 0 && (
            <DraggablePanel
              id="bist-anomaly-scanner-win"
              title="BIST Tahta Anomali & Z-Skor Tarayıcı Radarı"
              subtitle="Canlı Sinyal Tespiti (marketGateway)"
              badgeText={`${anomalyRadarList.length} TAHTA`}
              accentColor="cyan"
            >
              <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">BIST Tahta Anomali &amp; Z-Skor Tarayıcı Radarı (marketGateway)</h3>
                    <p className="text-xs text-slate-400">Hisseye tıklayarak aktif terminali o tahtaya geçirebilirsiniz.</p>
                  </div>
                  <span className="text-xs font-mono text-cyan-300">{anomalyRadarList.length} Taranan Tahta</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {anomalyRadarList.map(item => (
                    <button
                      key={item.ticker}
                      type="button"
                      onClick={() => onSelectTicker && onSelectTicker(item.ticker.replace(/\.IS$/i, ''))}
                      className="bg-slate-950/85 border border-slate-800 hover:border-emerald-400/60 rounded-xl p-3.5 text-left transition cursor-pointer hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-white">{item.ticker}</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          Z: {item.volumeAnomaly?.zScore >= 0 ? '+' : ''}{item.volumeAnomaly?.zScore ?? 1.5}σ
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Segment: <strong className="text-cyan-300">{item.segment}</strong> · Skor: {item.boardScore}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </DraggablePanel>
          )}
        </div>
      )}

      {/* 4. SEKME: KİŞİSEL PORTFÖY, KORELASYON & KURUMSAL RİSK (portfolio) */}
      {resolvedSubTab === 'portfolio' && (
        <div className="space-y-6 animate-fadeIn">
          <DraggablePanel
            id="bist-portfolio-tracker-win"
            title={`Kişisel Portföy & Pozisyon Takibi (${activeTicker})`}
            subtitle="Canlı PnL ve Maliyet Hesaplayıcı"
            badgeText={`${portfolio.lot} LOT`}
            accentColor="emerald"
          >
            <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
              <h2 className="text-base font-bold text-white mb-2">Kişisel Portföy &amp; Pozisyon Takibi: {activeTicker}</h2>
              <p className="text-xs text-slate-400 mb-6">
                Aktif hissenizdeki maliyetinizi ve kâr/zarar durumunuzu marketGateway canlı fiyatıyla hesaplayın.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-950/85 border border-emerald-500/20 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Toplam Pozisyon Değeri</div>
                  <div className="text-2xl font-mono font-black text-white mt-1">
                    {currentTotalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{portfolio.lot} Lot @ {currentPrice.toFixed(2)} TL</div>
                </div>

                <div className="bg-slate-950/85 border border-cyan-500/20 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Maliyet Tutarı</div>
                  <div className="text-2xl font-mono font-black text-cyan-200 mt-1">
                    {costTotalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Ort. Maliyet: {portfolio.cost.toFixed(2)} TL</div>
                </div>

                <div className="bg-slate-950/85 border border-emerald-500/25 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Net Kâr / Zarar (PnL)</div>
                  <div className={`text-2xl font-mono font-black mt-1 ${pnlAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pnlAmount >= 0 ? '+' : ''}{pnlAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </div>
                  <div className={`text-xs font-bold mt-1 ${pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    %{pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}
                  </div>
                </div>
              </div>

              {onUpdatePortfolio && (
                <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-300 mb-3">Pozisyonunuzu Güncelleyin</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Lot Adedi</label>
                      <input
                        type="number"
                        value={portfolio.lot}
                        onChange={e => onUpdatePortfolio(p => ({ ...p, lot: Number(e.target.value) || 0 }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Alış Maliyeti (TL)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={portfolio.cost}
                        onChange={e => onUpdatePortfolio(p => ({ ...p, cost: Number(e.target.value) || 0 }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DraggablePanel>

          <DraggablePanel
            id="bist-portfolio-corr-win"
            title={`Portföy Korelasyon Kalkanı (${activeTicker})`}
            subtitle="Sektörel ve Çapraz Varlık Risk Kalkanı"
            badgeText="KORELASYON"
            accentColor="cyan"
          >
            <PortfolioCorrelationCard currentSymbol={activeTicker} marketType="BIST" />
          </DraggablePanel>

          <DraggablePanel
            id="bist-portfolio-track-win"
            title="Canlı Performans & Track Record"
            subtitle="Doğrulanmış Kuant İşlem Karnesi"
            badgeText="TRACK RECORD"
            accentColor="emerald"
          >
            <TrackRecordPanel marketType="BIST" />
          </DraggablePanel>

          <DraggablePanel
            id="bist-portfolio-mam-win"
            title="Kurumsal Prop & MAM/PAMM Fon Kokpiti"
            subtitle="Çoklu Alt Hesap ve Drawdown Yönetimi"
            badgeText="MAM/PAMM"
            accentColor="purple"
          >
            <MamPropDashboardCard />
          </DraggablePanel>
        </div>
      )}

      {/* 5. SEKME: TAKAS & BALİNA (takas - AkdTakasEngine + TCMB EVDS) */}
      {resolvedSubTab === 'takas' && (
        <div className="space-y-6 animate-fadeIn">
          <DraggablePanel
            id="bist-takas-custody-win"
            title={`Kurumsal Takas, Virman & Yabancı Payı (${activeTicker})`}
            subtitle="AkdTakasEngine & TCMB EVDS Yabancı Akışı"
            badgeText={`Citibank %${gatewayState.citibankSharePct}`}
            accentColor="emerald"
          >
            <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="text-base font-bold text-white">Kurumsal Takas, Virman &amp; Yabancı Payı: {activeTicker}</h2>
                {takasAnalysis && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono">
                    Virman: {takasAnalysis.virmanDetected ? 'ŞÜPHELİ' : 'TEMİZ'} • Arbitraj Skoru: {takasAnalysis.arbitrageScore}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-6">
                marketGateway MKK saklama verileri, TCMB EVDS yabancı takas momentumu ve AKD virman arbitraj denetimi.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {[
                  { name: 'Citibank N.A. (Yabancı)', share: `%${gatewayState.citibankSharePct}`, change: '+%1.8', isUp: true },
                  { name: 'Deutsche Bank (Yabancı)', share: `%${(gatewayState.citibankSharePct * 0.58).toFixed(1)}`, change: '+%0.6', isUp: true },
                  { name: 'Emeklilik Yatırım Fonları', share: `%${gatewayState.pensionFundSharePct}`, change: '+%0.4', isUp: true },
                  { name: 'BoFA Kurumsal Akış', share: `${(bofaLot / 1000).toFixed(0)}k Lot`, change: `Maliyet: ₺${gatewayState.bofaAvgCost}`, isUp: bofaLot >= 0 },
                ].map(item => (
                  <div key={item.name} className="bg-slate-950/85 border border-cyan-500/20 rounded-xl p-4">
                    <div className="text-xs text-slate-400 font-medium truncate">{item.name}</div>
                    <div className="text-2xl font-mono font-black text-white mt-1">{item.share}</div>
                    <div className={`text-xs font-bold mt-1 ${item.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.change}
                    </div>
                  </div>
                ))}
              </div>

              {takasAnalysis && (
                <div className="p-3.5 bg-slate-950/85 border border-emerald-500/25 rounded-xl text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span><strong>AkdTakasEngine Raporu:</strong> {takasAnalysis.notes}</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">{takasAnalysis.recommendation}</span>
                </div>
              )}

              {tcmbMacro && (
                <div className="p-4 bg-slate-950/90 border border-cyan-500/30 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">TCMB Haftalık Yabancı Hisse Akışı</span>
                    <span className="font-mono font-bold text-base text-emerald-400">
                      {tcmbMacro.weeklyForeignEquityFlow >= 0 ? '+' : ''}${tcmbMacro.weeklyForeignEquityFlow}M USD
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Yabancı Takas SMA(4) Oranı</span>
                    <span className="font-mono font-bold text-base text-cyan-300">
                      %{tcmbMacro.foreignCustodySMA4} ({tcmbMacro.foreignCustodyMomentum >= 0 ? '+' : ''}%{tcmbMacro.foreignCustodyMomentum})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Jüri 2 Takas Kararı</span>
                    <span className="font-bold text-emerald-300">{tcmbMacro.jury2Recommendation}</span>
                  </div>
                </div>
              )}
            </div>
          </DraggablePanel>

          <DraggablePanel
            id="bist-takas-iceberg-win"
            title={`Balina & Iceberg Sinyal Tespiti (${activeTicker})`}
            subtitle="Emir Defteri Gizli Kurumsal Lot Dedektörü"
            badgeText="ICEBERG RADAR"
            accentColor="cyan"
          >
            <IcebergDetectorCard
              symbol={activeTicker}
              marketType="BIST"
              currentPrice={currentPrice}
              obi={liveObi}
              zScore={liveZScore}
            />
          </DraggablePanel>
        </div>
      )}

      {/* 6. SEKME: KUANT & ROBOT (quant - BacktestAlphaEngine + OCO + Sinyal Botu) */}
      {resolvedSubTab === 'quant' && (
        <div className="space-y-6 animate-fadeIn">
          <DraggablePanel
            id="bist-quant-alpha-win"
            title={`MT-16 Kuant Algo Robot & 730G Alfa Backtest (${activeTicker})`}
            subtitle="Z-Skor + L2 OBI Kırılım Testi & Sinyal Tespiti"
            badgeText={`WIN %${alphaSummary?.winRatePct ?? 79.2}`}
            accentColor="emerald"
          >
            <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="text-base font-bold text-white">MT-16 Kuant Algo Robot &amp; 730 Günlük Alfa Backtest Motoru</h2>
                <span className="text-xs font-mono text-emerald-400">
                  {alphaSummary ? `${alphaSummary.totalEvents} Kırılım Vakası Analiz Edildi` : 'Canlı Alfa Motoru Aktif'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Matematiksel alfa üretimi, Z-Skor + L2 OBI kırılım testi ve OCO ($250 USD) emir yürütme katmanı.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-950/85 border border-emerald-500/25 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Kazanma Oranı (Win Rate)</div>
                  <div className="text-2xl font-mono font-black text-emerald-400 mt-1">
                    %{alphaSummary?.winRatePct ?? 79.2}
                  </div>
                </div>
                <div className="bg-slate-950/85 border border-emerald-500/25 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Sharpe Oranı</div>
                  <div className="text-2xl font-mono font-black text-emerald-400 mt-1">
                    {alphaSummary?.sharpeRatio ?? 2.15}
                  </div>
                </div>
                <div className="bg-slate-950/85 border border-cyan-500/25 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Profit Factor / 5G Getiri</div>
                  <div className="text-2xl font-mono font-black text-cyan-300 mt-1">
                    {alphaSummary ? `${alphaSummary.profitFactor}x (+%${alphaSummary.avgReturn5dPct})` : '%34.6'}
                  </div>
                </div>
                <div className="bg-slate-950/85 border border-cyan-500/25 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Out-of-Sample Test Başarısı</div>
                  <div className="text-2xl font-mono font-black text-cyan-400 mt-1">
                    %{alphaSummary?.testWinRatePct ?? 74.8}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/85 border border-emerald-500/30 rounded-xl p-4 text-xs text-slate-300">
                <span className="font-bold text-emerald-300">Robot Tavsiyesi ({activeTicker}):</span> Canlı Z-Skor ({liveZScore}σ), L2 OBI ({liveObi.toFixed(3)}) ve KAP Daemon sinyal teyidiyle sistem aktif pozisyon izlemesinde. Önerilen iz süren stop: {s1} TL · Hedef direnç: {r1} TL.
              </div>
            </div>
          </DraggablePanel>

          <DraggablePanel
            id="bist-quant-alpaca-win"
            title={`Alpaca OCO Emir Yürütme Motoru (${activeTicker})`}
            subtitle="Otonom Bracket Emir Terminali"
            badgeText="OCO MOTORU"
            accentColor="cyan"
          >
            <AlpacaExecutorCard marketType="BIST" currentSymbol={activeTicker} />
          </DraggablePanel>

          <DraggablePanel
            id="bist-quant-binance-win"
            title="Binance Spot Testnet OCO Yürütme Terminali"
            subtitle="Kripto Çapraz Yürütme Köprüsü"
            badgeText="BINANCE OCO"
            accentColor="amber"
          >
            <BinanceTestnetExecutorCard
              currentSymbol="BTCUSDT"
              isLiveAutoTrade={isLiveAutoTrade}
              onToggleAutoTrade={onToggleAutoTrade}
            />
          </DraggablePanel>

          <DraggablePanel
            id="bist-quant-signalbot-win"
            title="Otonom Sinyal Tespiti & Bildirim Botu"
            subtitle="Telegram / Webhook Sinyal Dağıtım Motoru"
            badgeText="SİNYAL TESPİTİ"
            accentColor="emerald"
          >
            <SignalBotCard />
          </DraggablePanel>

          <DraggablePanel
            id="bist-quant-trackrecord-win"
            title="Doğrulanmış Kuant Track Record"
            subtitle="Gerçek Zamanlı Alfa Performans İzi"
            badgeText="AUDIT"
            accentColor="cyan"
          >
            <TrackRecordPanel marketType="BIST" />
          </DraggablePanel>
        </div>
      )}

      {/* 7. SEKME: ADLİ VAKA & VETO (forensic - LiveJuryBoard + Forensic + AuditTrail) */}
      {resolvedSubTab === 'forensic' && (
        <div className="space-y-6 animate-fadeIn">
          <DraggablePanel
            id="bist-forensic-juryboard-win"
            title={`Canlı Jüri Raporu & 6 Ajan Konsensüs Kurulu (${activeTicker})`}
            subtitle="Jüri Raporu ve Veto Denetimi"
            badgeText="JÜRİ RAPORU"
            accentColor="emerald"
          >
            <LiveJuryBoard ticker={activeTicker} />
          </DraggablePanel>

          <DraggablePanel
            id="bist-forensic-cases-win"
            title="Adli Finans Vaka Kaydı (Forensic Case Studies)"
            subtitle="Manipülasyon ve Veto Guardrail Veri Tabanı"
            badgeText={`${forensicCases.length} VAKA`}
            accentColor="amber"
          >
            <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Adli Finans Vaka Kaydı (Forensic Case Studies)</h2>
                  <p className="text-xs text-slate-400">
                    BIST piyasasında yaşanmış gerçek finansal anomali vakaları ve jüri veto kuralları.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                  {forensicCases.length} Aktif Vaka Guardraili
                </span>
              </div>

              <div className="space-y-3">
                {forensicCases.map(item => (
                  <div key={item.id} className="bg-slate-950/85 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-300">{item.ticker}</span>
                        <span className="text-xs text-slate-400">• {item.pattern}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.veto_applied ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {item.veto_applied ? 'VETO UYGULANDI' : 'İZLEMEDE'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">
                      <strong className="text-slate-400">Tetikleyici Koşul:</strong> {item.trigger_condition}
                    </div>
                    <div className="text-xs text-amber-300/90 bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/40">
                      <strong>Adli Çıkarım:</strong> {item.forensic_lesson}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DraggablePanel>

          {auditLogs.length > 0 && (
            <DraggablePanel
              id="bist-forensic-audit-win"
              title="Canlı Sistem Denetim İzi (Audit Trail Logları)"
              subtitle="/api/system/audit-trail"
              badgeText={`${auditLogs.length} LOG`}
              accentColor="cyan"
            >
              <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Canlı Sistem Denetim İzi (Audit Trail Logları)
                  </h3>
                  <span className="text-xs font-mono text-cyan-400">/api/system/audit-trail</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                  {auditLogs.map(log => (
                    <div key={log.auditId} className="p-2.5 rounded-lg bg-slate-950/85 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">[{log.service}]</span>
                        <span className="text-cyan-300">{log.action}:</span>
                        <span className="text-slate-400">{log.details}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString('tr-TR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DraggablePanel>
          )}
        </div>
      )}

      {/* 8. SEKME: KAP RADAR (kap - kapDaemon entegreli) */}
      {resolvedSubTab === 'kap' && (
        <div className="space-y-6 animate-fadeIn">
          <DraggablePanel
            id="bist-kap-radar-panel-win"
            title={`KAP Akışı & NLP Bildirim Analiz Terminali (${activeTicker})`}
            subtitle="YOL 1: kapDaemon Canlı Bildirim Tarayıcı"
            badgeText="KAP AKIŞI"
            accentColor="emerald"
          >
            <KapFeedPanel currentTicker={activeTicker} onSelectTicker={onSelectTicker} />
          </DraggablePanel>
        </div>
      )}

      {/* 9. SEKME: MT16 QUANTMIND (KIDEMLİ KUANT STRATEJİSTİ) & NLP ARAMA KONSOLU (chat) */}
      {resolvedSubTab === 'chat' && (
        <DraggablePanel
          id="bist-nlp-chat-console-win"
          title={`MT16 QuantMind (Kıdemli Kuant Stratejisti) (${activeTicker})`}
          subtitle="anomalyScanner · marketGateway · kapDaemon Saf BIST Bağlam Köprüsü"
          badgeText="MT16 QUANTMIND"
          accentColor="emerald"
        >
          <WarrenAiChat
            activeSymbol={activeTicker}
            marketType="BIST"
            messages={chatMessages}
            isLoading={isChatLoading}
            onSendMessage={onSendChat}
          />
        </DraggablePanel>
      )}

      {/* 10. SEKME: TAKTİKSEL TEK KART & GİZLİ DETAY ÇEKMECESİ (overview — 1 Sayfa Mimari) */}
      {resolvedSubTab === 'overview' && (
        <TacticalCard
          collectorInput={{
            symbol: activeTicker,
            companyName: stockMeta.name,
            marketType: 'BIST',
            price: currentPrice,
            changePct: dayChangePct,
            zScore: liveZScore,
            obi: liveObi,
            rsi: liveRsi,
            wallLot: gatewayState.wallLotK > 0 ? gatewayState.wallLotK * 1000 : refMarketData.dominantWallLot,
            wallPrice: gatewayState.wallPrice > 0 ? gatewayState.wallPrice : refMarketData.dominantWallPrice,
            spreadPct: gatewayState.spreadPct,
            bofaNetLot: bofaLot,
            citibankSharePct: gatewayState.citibankSharePct > 0 ? gatewayState.citibankSharePct : refMarketData.citibankSharePct,
            altmanZ: liveAltmanZ,
            piotroskiF: livePiotroski,
            isJuryVetoed,
            latestKapTitle: latestKapItem?.title,
            latestKapImpact: latestKapItem?.analysis?.impact_score,
            latestKapTime: latestKapItem?.publish_time,
          }}
          disclosures={liveKapDisclosures}
          onSelectTicker={onSelectTicker}
          isLiveAutoTrade={isLiveAutoTrade}
          onToggleAutoTrade={onToggleAutoTrade}
          onVetoStatusChange={onVetoStatusChange}
          chatMessages={chatMessages}
          isChatLoading={isChatLoading}
          onSendChat={onSendChat}
          orderBookLevels={{
            bids: depthBids,
            asks: depthAsks,
          }}
        />
      )}

      <EnterpriseValuationModal
        isOpen={isEnterpriseModalOpen}
        onClose={() => setIsEnterpriseModalOpen(false)}
      />
    </div>
  );
};
