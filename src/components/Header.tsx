import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MarketDataInput, DEFAULT_WEIGHTS, WEIGHT_PRESETS, normalizeWeights, type UserWeightConfig } from '../types';
import { getBistCompanyName } from '../utils/engine';
import Ticker, { BISTStock } from '../utils/ticker';
import { searchBISTStocks } from '../data/bistAllStocks';
import { safeToFixed } from '../utils/format';
import {
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  FileDown,
  Radio,
  Search,
  History,
  TrendingUp,
  Bell,
  Sun,
  Moon,
  Signal,
  SignalHigh,
  Building2,
  FileJson,
  FileText,
  Code2,
  ShieldAlert,
  Key,
  Send,
  MessageSquare
} from 'lucide-react';
import { ApiKeyModal } from './ApiKeyModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
// import { AlertManager } from './AlertManager';

import { LABELS } from '../constants/labels';
import CopyForLLM from './CopyForLLM';
import { AllBistStocksModal } from './AllBistStocksModal';
import { CompetitorRoadmapModal } from './CompetitorRoadmapModal';
import { ExportButtons } from './ExportButtons';

interface HeaderProps {
  data?: MarketDataInput;
  isAiLoading?: boolean;
  isAiGenerated?: boolean;
  isPdfDownloading?: boolean;
  isLiveMode?: boolean;
  isLiveFetching?: boolean;
  lastLiveUpdate?: string;
  isDarkMode?: boolean;
  isNoiseFiltered?: boolean;
  onToggleNoiseFilter?: () => void;
  toggleTheme?: () => void;
  onToggleLiveMode?: () => void;
  onOpenEditor?: () => void;
  onTriggerAi?: () => void;
  onDownloadPdf?: () => void;
  onSelectPreset?: (index: number) => void;
  presetIndex?: number;
  recentTickers?: string[];
  onSearchTicker?: (ticker: string) => void;
  toggleAlerts?: () => void;
  onOpenTelegramConfig?: () => void;
  socketConnected?: boolean;
  ticker?: string;
  livePrice?: any;
  analysis?: any;
  reportData?: any;
  agentDecision?: any;
  activeTab?: number;
  onSelectTab?: (tab: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  data = { ticker: 'ASELS', close: 35.65, dayChangePct: 1.2 } as any,
  isAiLoading = false,
  isAiGenerated = false,
  isPdfDownloading = false,
  isLiveMode = true,
  isLiveFetching = false,
  lastLiveUpdate,
  isDarkMode = true,
  isNoiseFiltered = false,
  onToggleNoiseFilter = () => {},
  toggleTheme = () => {},
  onToggleLiveMode = () => {},
  onOpenEditor = () => {},
  onTriggerAi = () => {},
  onDownloadPdf = () => {},
  onSelectPreset = () => {},
  presetIndex = 0,
  recentTickers = ['EREGL', 'THYAO', 'ASELS', 'GARAN'],
  onSearchTicker = () => {},
  toggleAlerts = () => {},
  onOpenTelegramConfig = () => {},
  socketConnected = false,
  ticker,
  livePrice,
  analysis,
  reportData,
  agentDecision,
  activeTab = 0,
  onSelectTab,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportToken, setExportToken] = useState<string>(() => {
    try {
      return localStorage.getItem('export_token') || (import.meta.env.VITE_EXPORT_TOKEN as string) || '';
    } catch {
      return '';
    }
  });
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [showWeights, setShowWeights] = useState(false);
  const [weights, setWeights] = useState<UserWeightConfig>(() => {
    try {
      const saved = localStorage.getItem('userWeights');
      return saved ? JSON.parse(saved) : DEFAULT_WEIGHTS;
    } catch {
      return DEFAULT_WEIGHTS;
    }
  });

  const [showOptimizer, setShowOptimizer] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optResult, setOptResult] = useState<any>(null);
  const [optError, setOptError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<'sortino' | 'sharpe' | 'calmar'>('sortino');
  const [showWalkForward, setShowWalkForward] = useState(false);
  const [walkForwardResult, setWalkForwardResult] = useState<any>(null);
  const [isWalkForwardLoading, setIsWalkForwardLoading] = useState(false);
  const [walkForwardError, setWalkForwardError] = useState<string | null>(null);

  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);

  const handleOptimize = async (metric?: 'sortino' | 'sharpe' | 'calmar') => {
    const selectedMetric = metric || activeMetric;
    setIsOptimizing(true);
    setOptError(null);
    setOptResult(null);
    try {
      const cleanTicker = String(data?.ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase();
      const res = await fetch(
        `/api/weights-optimize?ticker=${encodeURIComponent(cleanTicker)}&metric=${selectedMetric}`
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setOptResult(json);
    } catch (err: any) {
      setOptError(err.message || 'Optimizasyon başarısız');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleWalkForward = async (metric?: 'sortino' | 'sharpe' | 'calmar') => {
    const selectedMetric = typeof metric === 'string' ? metric : activeMetric;
    setIsWalkForwardLoading(true);
    setWalkForwardError(null);
    setWalkForwardResult(null);
    try {
      const cleanTicker = String(data?.ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase();
      const res = await fetch(
        `/api/weights-optimize-walkforward?ticker=${encodeURIComponent(cleanTicker)}&metric=${selectedMetric}&windows=6&window=14`
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setWalkForwardResult(json);
    } catch (err: any) {
      setWalkForwardError(err.message || 'Walk-forward optimizasyon başarısız');
    } finally {
      setIsWalkForwardLoading(false);
    }
  };

  const handleApplyRobustWeights = () => {
    if (!walkForwardResult?.robustWeights) return;
    const rw = walkForwardResult.robustWeights;
    const newWeights = {
      sentiment: rw.sentiment,
      technical: rw.technical,
      flow: rw.flow,
    };
    setWeights(newWeights);
    try {
      localStorage.setItem('userWeights', JSON.stringify(newWeights));
      window.dispatchEvent(new CustomEvent('userWeightsChanged', { detail: newWeights }));
    } catch {}
    setShowWalkForward(false);
    setShowOptimizer(false);
  };

  const handleApplyOptimizedWeights = async () => {
    if (!optResult?.best) return;
    const best = optResult.best;
    const oldWeights = { ...weights };
    const newWeights = {
      sentiment: best.sentiment,
      technical: best.technical,
      flow: best.flow,
    };
    
    setIsLoadingComparison(true);
    setShowComparison(true);
    
    try {
      const cleanTicker = String(data?.ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase();
      
      // Baseline ve yeni ağırlıkla iki ayrı rapor çek
      const [baselineRes, newRes] = await Promise.all([
        fetch(`/api/report?ticker=${encodeURIComponent(cleanTicker)}&w_s=${oldWeights.sentiment}&w_t=${oldWeights.technical}&w_f=${oldWeights.flow}`),
        fetch(`/api/report?ticker=${encodeURIComponent(cleanTicker)}&w_s=${newWeights.sentiment}&w_t=${newWeights.technical}&w_f=${newWeights.flow}`),
      ]);
      
      const baselineReport = await baselineRes.json();
      const newReport = await newRes.json();
      
      setComparisonData({
        ticker: cleanTicker,
        oldWeights,
        newWeights,
        baseline: {
          karar: baselineReport?.jury?.karar || 'BEKLE',
          bilesik: baselineReport?.jury?.bilesik || 0,
          sebep: baselineReport?.jury?.sebep || '',
          sentimentPuan: baselineReport?.jury?.oylar?.sentiment?.puan ?? 0,
          technicalPuan: baselineReport?.jury?.oylar?.technical?.puan ?? 0,
          flowPuan: baselineReport?.jury?.oylar?.flow?.puan ?? 0,
        },
        new: {
          karar: newReport?.jury?.karar || 'BEKLE',
          bilesik: newReport?.jury?.bilesik || 0,
          sebep: newReport?.jury?.sebep || '',
          sentimentPuan: newReport?.jury?.oylar?.sentiment?.puan ?? 0,
          technicalPuan: newReport?.jury?.oylar?.technical?.puan ?? 0,
          flowPuan: newReport?.jury?.oylar?.flow?.puan ?? 0,
        },
      });
    } catch (err: any) {
      console.warn('Karşılaştırma verisi alınamadı:', err);
      setComparisonData(null);
    } finally {
      setIsLoadingComparison(false);
    }
    
    // Ağırlıkları uygula
    setWeights(newWeights);
    try {
      localStorage.setItem('userWeights', JSON.stringify(newWeights));
      window.dispatchEvent(new CustomEvent('userWeightsChanged', { detail: newWeights }));
    } catch {}
  };

  useEffect(() => {
    try {
      localStorage.setItem('userWeights', JSON.stringify(weights));
      window.dispatchEvent(new CustomEvent('userWeightsChanged', { detail: weights }));
    } catch {}
  }, [weights]);

  const handleExportDownload = async (format: 'md' | 'json' | 'txt') => {
    setIsExporting(true);
    setExportStatus('İndiriliyor...');
    try {
      const cleanToken = exportToken.trim();
      const tokenParam = cleanToken ? `&token=${encodeURIComponent(cleanToken)}` : '';
      const res = await fetch(`/api/export-codebase?format=${format}${tokenParam}`);
      
      if (res.status === 401) {
        setExportStatus('Hata: 401 Yetkisiz (Geçerli token girin)');
        return;
      }
      if (res.status === 404) {
        setExportStatus('Hata: 404 Devre dışı veya token eksik');
        return;
      }
      if (!res.ok) {
        setExportStatus(`Hata: HTTP ${res.status}`);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bist-ai-studio-codebase.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setExportStatus('✅ Başarıyla indirildi!');
      setTimeout(() => {
        setIsExportOpen(false);
        setExportStatus(null);
      }, 1800);
    } catch (err: any) {
      setExportStatus(`Hata: ${err.message || 'İndirilemedi'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const isPositive = (data?.dayChangePct ?? 0) >= 0;
  const companyName = getBistCompanyName(data?.ticker || 'ASELS');
  const activeCleanTicker = String(data?.ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase();
  const isConnected = socketConnected;

  const suggestions = useMemo(() => {
    const q = searchInput.trim();
    if (!q || q.length < 1) return [];
    return searchBISTStocks(q);
  }, [searchInput]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStock = (stockCode: string) => {
    onSearchTicker(stockCode);
    setSearchInput('');
    setIsDropdownOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchInput.trim();
    if (!raw) return;

    // 1. Tam eşleşme veya alias kontrolü
    const exactStock = Ticker.get(raw);
    if (exactStock) {
      onSearchTicker(exactStock.code);
      setSearchInput('');
      setIsDropdownOpen(false);
      return;
    }

    // 2. Arama önerileri varsa ilk önerilen hisseye git
    if (suggestions.length > 0) {
      onSearchTicker(suggestions[0].code);
      setSearchInput('');
      setIsDropdownOpen(false);
      return;
    }

    // 3. Eşleşme yoksa doğrudan onSearchTicker'a gönder (App.tsx hata bildirimi gösterir)
    onSearchTicker(raw);
    setSearchInput('');
    setIsDropdownOpen(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100">
      {/* Top Search & Quick Access Bar */}
      <div className="bg-slate-950/70 border-b border-slate-800/80 px-4 py-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Search Box with Suggestions */}
          <div ref={searchContainerRef} className="relative max-w-md w-full">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-2 w-full"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-ticker-search"
                  type="text"
                  value={searchInput}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  placeholder="500+ BIST Hissesi Ara: ASELS, THYAO..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase transition"
                />
              </div>
              <button
                id="btn-ticker-search"
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs shrink-0"
              >
                Getir
              </button>
              <button
                type="button"
                id="btn-open-weights"
                onClick={() => setShowWeights(true)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-750 font-mono text-xs font-semibold rounded-lg transition shadow-xs shrink-0 flex items-center gap-1.5"
                title="Model Ağırlıklarını Düzenle"
              >
                <span>⚙️</span>
                <span className="hidden sm:inline">Ağırlıklar</span>
              </button>
              <button
                type="button"
                id="btn-open-optimizer"
                onClick={() => { setShowOptimizer(true); if (!optResult) handleOptimize(); }}
                className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border border-amber-500/50 font-mono text-xs font-semibold rounded-lg transition shadow-xs shrink-0 flex items-center gap-1.5"
                title="Geçmiş 14 günlük veriyle grid search yaparak en iyi ağırlıkları bul"
              >
                <span>🎯</span>
                <span className="hidden sm:inline">Optimize Et</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(true)}
                title="Tüm BIST hisselerini listele (~500 hisse)"
                className="bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700/80 font-mono text-xs font-semibold px-2.5 py-1.5 rounded-lg transition shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">500+ BIST</span>
              </button>
            </form>

            {/* Dropdown Suggestions */}
            {isDropdownOpen && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-950/80 text-[10px] font-mono text-slate-400 border-b border-slate-800 flex justify-between">
                  <span>Eşleşen BIST Şirketleri</span>
                  <span>{suggestions.length} Sonuç</span>
                </div>
            {(suggestions || []).map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => handleSelectStock(s.code)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800/80 border-b border-slate-800/40 last:border-b-0 flex items-center justify-between transition group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-400 group-hover:text-blue-300">
                          {s.code}
                        </span>
                        <span className="text-[11px] text-slate-300 truncate max-w-[200px]">
                          {s.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                        {s.sector} {s.market ? `• ${s.market} Pazarı` : ''}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 group-hover:bg-slate-700 px-1.5 py-0.5 rounded">
                      {(s as any).ticker || `${s.code}.IS`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Connection Status & Recent Tickers */}
          <div className="flex items-center gap-4 flex-wrap text-xs">
            {/* Connection Status */}
            <div className={`flex items-center gap-1.5 font-mono text-[10px] ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isConnected ? <SignalHigh className="w-3 h-3" /> : <Signal className="w-3 h-3" />}
              <span>{isConnected ? 'Real-time' : 'Disconnected'}</span>
            </div>

            <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
              <History className="w-3 h-3 text-slate-400" />
              Son İzlenenler:
            </span>
            {(recentTickers || []).map((t) => {
              const clean = String(t || '').replace(/\.IS$/i, '').toUpperCase();
              if (!clean) return null;
              const isActive = clean === activeCleanTicker;
              return (
                <button
                  key={clean}
                  id={`btn-recent-ticker-${clean}`}
                  onClick={() => onSearchTicker(clean)}
                  className={`px-2.5 py-1 rounded-md font-mono text-xs font-semibold transition border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-700/70 hover:text-white hover:border-slate-600'
                  }`}
                  title={`${clean}.IS hissesine hızlı geç`}
                >
                  {clean}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Stats & Control Bar */}
      <div className="px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Ticker & Price Info */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-600 text-white font-mono font-bold text-base px-2.5 py-1 rounded tracking-wider shadow-sm">
                {data.ticker}
              </div>
              <div>
                <div className="flex items-center gap-2">
                   <span className="text-2xl font-bold font-mono text-white tracking-tight">
                    {safeToFixed(data?.closingPrice ?? 35.65, 2, '35.65')} <span className="text-xs font-normal text-slate-400">TL</span>
                  </span>
                  <span
                    className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded font-mono ${
                      isPositive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                    {isPositive ? '+' : ''}
                    {safeToFixed(data?.dayChangePct ?? 1.2, 2, '1.20')}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-medium text-slate-300">{companyName}</span>
                  <span className="text-slate-500 font-mono hidden sm:inline">•</span>
                  <div className="flex items-center gap-1 bg-slate-900/40 px-2 py-0.5 rounded border border-slate-800/60 text-[10px]">
                    <span className="font-bold text-slate-300">ŞU AN:</span>
                    <span className="font-mono text-slate-200">
                      {data?.ticker || 'ASELS'} - {safeToFixed(data?.closingPrice ?? 35.65, 2, '35.65')} TL (%{safeToFixed(data?.dayChangePct ?? 1.2, 2, '1.20')})
                    </span>
                    <span className="text-amber-500/80 font-bold ml-1">[15dk Gecikmeli]</span>
                    <span className="text-slate-400">
                      [{lastLiveUpdate || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} Snapshot]
                    </span>
                  </div>
                  {data?.volume && (
                    <span className="hidden sm:inline text-slate-400 font-mono">
                      • Hacim: {safeToFixed((data?.volume ?? 1000000) / 1000000, 1, '1.0')}M Lot
                    </span>
                  )}
                  {isLiveMode && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {LABELS.liveBadge(!data?.isLive)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/60 font-mono ml-1.5" title="BIST evren verileri taranıyor. Sektör filtreleri şu an BIST 100 odaklıdır (%15 kapsam).">
                    <ShieldAlert className="w-3 h-3" />
                    VERİ KALİTESİ: KISMİ
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-4 pl-4 border-l border-slate-800 text-xs font-mono text-slate-300">
              <div className="px-3 py-1.5 bg-slate-950/60 rounded-xl border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.05)] hover:border-amber-500/40 transition-all">
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Kritik Duvar</span>
                <span className="font-bold text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                  {safeToFixed(((data as any)?.dominantWallLot ?? 250000) / 1000, 0, '250')}k Lot @ {safeToFixed((data as any)?.dominantWallPrice ?? 36.34, 2, '36.34')} TL
                </span>
              </div>
              <div className={`px-3 py-1.5 bg-slate-950/60 rounded-xl border shadow-[0_0_10px_rgba(0,0,0,0.1)] transition-all ${((data as any)?.bofaNetLot ?? 500000) < 0 ? 'border-rose-500/20 hover:border-rose-500/40' : 'border-emerald-500/20 hover:border-emerald-500/40'}`}>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">BofA Net / Maliyet</span>
                <span className={`font-bold drop-shadow-sm ${((data as any)?.bofaNetLot ?? 500000) < 0 ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]'}`}>
                  {safeToFixed(((data as any)?.bofaNetLot ?? 500000) / 1000, 0, '500')}k @ {safeToFixed((data as any)?.bofaAvgCost ?? 35.50, 2, '35.50')} TL
                </span>
              </div>
              <div className="px-3 py-1.5 bg-slate-950/60 rounded-xl border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.05)] hover:border-indigo-500/40 transition-all">
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Citibank / Emeklilik</span>
                <span className="font-bold text-indigo-300">
                  %{safeToFixed((data as any)?.citibankSharePct ?? 25.4, 1, '25.4')} / %{safeToFixed((data as any)?.pensionFundSharePct ?? 14.2, 1, '14.2')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons & Scenario Selector */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto lg:justify-end mt-2 lg:mt-0">
            {/* Theme Toggle */}
            <button
              id="btn-toggle-theme"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition shadow-xs"
              title={isDarkMode ? 'Açık Mod' : 'Karanlık Mod'}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            </button>

            {/* API Keys Manager Button */}
            <button
              id="btn-api-keys"
              onClick={() => setIsApiKeyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-900/80 to-slate-800 hover:from-indigo-800 text-indigo-300 border border-indigo-500/40 hover:border-indigo-400 transition shadow-xs"
              title="Gemini ve Groq API Anahtarlarını Güncelle"
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>API Anahtarları</span>
            </button>

            {/* Telegram Risk Push Config Button */}
            <button
              id="btn-telegram-config"
              onClick={onOpenTelegramConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/40 transition shadow-xs"
              title="Telegram Risk Push Bildirim Ayarları"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Telegram</span>
            </button>

            {/* Live Mode Toggle Button */}
            <button
              id="btn-toggle-live-mode"
              onClick={onToggleLiveMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs ${
                isLiveMode
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900/90'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 hover:bg-slate-750'
              }`}
              title="30 saniyede bir Yahoo Finance ve BIST canlı verilerini otomatik çeker"
            >
              {isLiveFetching ? (
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
              ) : isLiveMode ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              ) : (
                <Radio className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{isLiveMode ? '15dk Gecikmeli Veri: AÇIK' : 'Canlı Mod: KAPALI'}</span>
              {isLiveMode && lastLiveUpdate && (
                <span className="text-[10px] text-emerald-400/80 font-mono hidden sm:inline">
                  ({lastLiveUpdate})
                </span>
              )}
            </button>

            {/* Noise Filter Toggle Button */}
            <button
              id="btn-toggle-noise-filter"
              type="button"
              onClick={onToggleNoiseFilter}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs ${
                isNoiseFiltered
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-750'
              }`}
              title="Gürültü Filtresi: Yoğun kademe ve derinlik tablolarını gizler; yalnızca net portföy PnL, ilk 3 piyasa lokomotifi ve NLP aramasını gösterir."
            >
              <SlidersHorizontal className={`w-3.5 h-3.5 ${isNoiseFiltered ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>Gürültü Filtresi: {isNoiseFiltered ? 'AÇIK' : 'KAPALI'}</span>
            </button>

            {/* Preset Scenario Selector */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/70 text-xs">
              <button
                id="btn-preset-0"
                onClick={() => onSelectPreset(0)}
                className={`px-2.5 py-1.5 rounded font-medium transition-all ${
                  presetIndex === 0 && !isLiveMode
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title="Blok Satış Duvarı Senaryosu"
              >
                Duvar
              </button>
              <button
                id="btn-preset-1"
                onClick={() => onSelectPreset(1)}
                className={`px-2.5 py-1.5 rounded font-medium transition-all ${
                  presetIndex === 1 && !isLiveMode
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title="BofA Sıkışması ve Kırılım Senaryosu"
              >
                Squeeze
              </button>
              <button
                id="btn-preset-2"
                onClick={() => onSelectPreset(2)}
                className={`px-2.5 py-1.5 rounded font-medium transition-all ${
                  presetIndex === 2 && !isLiveMode
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title="Destek Testi Senaryosu"
              >
                Destek
              </button>
            </div>

            {/* 🤖 Chat / Ajan Jürisi & Debate Sekmesine Hızlı Erişim */}
            {onSelectTab && (
              <button
                id="btn-nav-chat-agents"
                onClick={() => onSelectTab(9)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  activeTab === 9
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/30'
                    : 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border-purple-500/40'
                }`}
                title="BIST Çoklu Ajan Jürisi & 1-Tur Münazara (Debate)"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-300" />
                <span>Chat / Ajan</span>
                <span className="text-[10px] bg-purple-400/20 text-purple-200 px-1 py-0.2 rounded font-mono">
                  Debate
                </span>
              </button>
            )}

            {/* Edit Data Parameters */}
            <button
              id="btn-open-data-editor"
              onClick={onOpenEditor}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                isLiveMode
                  ? 'bg-slate-800/90 text-emerald-300 border-emerald-500/40 hover:bg-slate-750'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title={
                isLiveMode
                  ? 'Canlı veriler otomatik doludur. Tıklayarak detayları inceleyebilir veya düzenleyebilirsiniz.'
                  : 'Piyasa parametrelerini elle gir'
              }
            >
              <SlidersHorizontal className={`w-3.5 h-3.5 ${isLiveMode ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>Veri Gir {isLiveMode && <span className="text-[10px] text-emerald-400 font-mono">(Oto)</span>}</span>
            </button>

            {/* Download PDF Report */}
            <button
              id="btn-download-pdf"
              onClick={onDownloadPdf}
              disabled={isPdfDownloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition shadow-xs"
              title="Jüri Karar Tablosu ve Analist Yorumlarını PDF Olarak İndir"
            >
              {isPdfDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>{isPdfDownloading ? 'PDF...' : 'PDF İndir'}</span>
            </button>

            {/* 📄 TOON & 🌐 HTML Export Butonları */}
            <ExportButtons
              ticker={data.ticker}
              exportParams={{
                marketData: data,
                analysis,
                reportData,
                agentDecision,
              }}
            />

            {/* Kod Tabanı Export Butonu */}
            <div className="relative">
              <button
                id="btn-export-codebase"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500/50 transition shadow-xs"
                title="Kod Tabanını Export Et (LLM denetimi & yedekleme için)"
              >
                <Code2 className="w-3.5 h-3.5 text-purple-300" />
                <span>Export Kod</span>
              </button>

              {/* Dropdown Menü */}
              {isExportOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsExportOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-950 border-b border-slate-800">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Kod Tabanı Export</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">LLM denetimi & tam yedekleme</div>
                      <div className="mt-2">
                        <input
                          type="password"
                          placeholder="Export Token (gerekliyse)..."
                          value={exportToken}
                          onChange={(e) => {
                            setExportToken(e.target.value);
                            try { localStorage.setItem('export_token', e.target.value); } catch {}
                          }}
                          className="w-full text-[11px] font-mono px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                        />
                      </div>
                      {exportStatus && (
                        <div className={`mt-1.5 text-[10px] font-mono ${exportStatus.includes('Hata') ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {exportStatus}
                        </div>
                      )}
                    </div>

                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleExportDownload('md')}
                        disabled={isExporting}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded transition font-mono disabled:opacity-50"
                      >
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-bold text-slate-100">Markdown (.md)</div>
                          <div className="text-[10px] text-slate-400">LLM prompt için formatlı</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportDownload('json')}
                        disabled={isExporting}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded transition font-mono disabled:opacity-50"
                      >
                        <FileJson className="w-4 h-4 text-blue-400 shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-bold text-slate-100">JSON (.json)</div>
                          <div className="text-[10px] text-slate-400">Yapısal dosya listesi</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportDownload('txt')}
                        disabled={isExporting}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded transition font-mono disabled:opacity-50"
                      >
                        <FileDown className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-bold text-slate-100">Düz Metin (.txt)</div>
                          <div className="text-[10px] text-slate-400">Basit metin belgesi</div>
                        </div>
                      </button>
                    </div>

                    <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 text-[9px] text-slate-500 font-mono">
                      ⚠️ node_modules & binary dosyalar hariçtir
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Trigger Gemini AI Analysis */}
            <button
              id="btn-trigger-ai-analysis"
              onClick={onTriggerAi}
              disabled={isAiLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
                isAiLoading
                  ? 'bg-indigo-700/60 text-indigo-200 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isAiLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              )}
              <span>{isAiLoading ? 'Jüri...' : isAiGenerated ? 'Yeniden AI Jüri' : 'Gemini AI Jüri'}</span>
            </button>

            {/* Alert Manager Trigger */}
            <button
              id="btn-open-alert-manager"
              onClick={toggleAlerts}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-slate-950 transition shadow-sm"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alarmlarım</span>
            </button>

            {/* Roadmap & Rakip Karşılaştırma Modalı */}
            <button
              id="btn-open-roadmap-modal"
              onClick={() => setShowRoadmap(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-500/40 text-indigo-200 transition shadow-sm font-mono"
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-300" />
              <span>📊 Nerede Duruyoruz?</span>
            </button>

            {/* Copy for LLM - mobilde tam genişlik */}
            <div className="w-full sm:w-auto mt-1 sm:mt-0">
              <CopyForLLM ticker={data.ticker} />
            </div>
          </div>
        </div>
      </div>

      {/* 500+ BIST Tüm Hisseler Kataloğu Modalı */}
      <AllBistStocksModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        onSelectStock={onSearchTicker}
        currentTicker={activeCleanTicker}
      />
      {/* Model Ağırlıkları Modalı */}
      {showWeights && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full max-w-[420px] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 font-mono flex items-center gap-2">
                <span>⚙️</span> Model Ağırlıkları
              </h3>
              <button
                onClick={() => setShowWeights(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Presetler */}
            <div className="mb-4">
              <span className="text-[11px] font-mono text-slate-400 block mb-1.5">Hazır Profil Presetleri:</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.keys(WEIGHT_PRESETS).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setWeights(WEIGHT_PRESETS[name])}
                    className="text-xs px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-md font-mono transition text-center"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliderlar */}
            <div className="space-y-3.5 mb-5 text-xs font-mono">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-violet-300 font-semibold">Duygu & Psikoloji Modeli</span>
                  <span className="font-bold text-violet-400 bg-violet-950/60 px-1.5 py-0.5 rounded border border-violet-800/40">
                    %{Math.round(weights.sentiment * 100)}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={Math.round(weights.sentiment * 100)}
                  onChange={(e) =>
                    setWeights(normalizeWeights({ ...weights, sentiment: +e.target.value / 100 }))
                  }
                  className="w-full accent-violet-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-cyan-300 font-semibold">Teknik & Derinlik Modeli</span>
                  <span className="font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    %{Math.round(weights.technical * 100)}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={Math.round(weights.technical * 100)}
                  onChange={(e) =>
                    setWeights(normalizeWeights({ ...weights, technical: +e.target.value / 100 }))
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-emerald-300 font-semibold">Kurumsal Akış & Takas Modeli</span>
                  <span className="font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    %{Math.round(weights.flow * 100)}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={Math.round(weights.flow * 100)}
                  onChange={(e) =>
                    setWeights(normalizeWeights({ ...weights, flow: +e.target.value / 100 }))
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setWeights(DEFAULT_WEIGHTS)}
                className="text-xs text-slate-400 hover:text-slate-200 font-mono underline"
              >
                Varsayılana Sıfırla
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('userWeights', JSON.stringify(weights));
                  window.dispatchEvent(new CustomEvent('userWeightsChanged', { detail: weights }));
                  setShowWeights(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold font-mono rounded-lg transition shadow-xs"
              >
                Kaydet ve Uygula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optimizasyon Modalı */}
      {showOptimizer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-amber-500/40 p-6 rounded-xl w-full max-w-[560px] shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Başlık (2 Sekmeli) */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowWalkForward(false); if (!optResult) handleOptimize(); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                    !showWalkForward
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <span>🎯</span> Tek Pencere (14 Gün)
                </button>
                <button
                  type="button"
                  onClick={() => { setShowWalkForward(true); if (!walkForwardResult) handleWalkForward(); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                    showWalkForward
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <span>🚀</span> Walk-Forward (6 Pencere)
                </button>
              </div>
              <button
                onClick={() => setShowOptimizer(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Optimizasyon Açıklaması */}
            {!showWalkForward && (
              <p className="text-xs text-slate-400 font-mono mb-4 leading-relaxed">
                Son 14 günlük jury history verisi üzerinde <strong className="text-amber-400">~150 farklı ağırlık kombinasyonu</strong> grid search ile test edilir. En yüksek isabet oranı ve toplam kârı veren kombinasyon önerilir.
              </p>
            )}

            {/* YENİ: Risk-Adjusted Loss Metrik Seçici */}
            <div className="mb-4 p-3 bg-slate-950/80 border border-amber-500/40 rounded-xl">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-amber-400 text-sm">📐</span>
                <span className="text-[11px] font-mono text-slate-300 font-bold uppercase tracking-wide">
                  Risk-Adjusted Metrik Seçimi
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mb-2.5 leading-relaxed">
                Freqtrade standardında risk-adjusted return metriği. Sortino (önerilen) downside risk için en hassas olanıdır.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    key: 'sortino' as const,
                    label: 'Sortino',
                    desc: 'Downside risk',
                    icon: '🎯',
                    badge: 'Önerilen',
                    color: 'emerald',
                  },
                  {
                    key: 'sharpe' as const,
                    label: 'Sharpe',
                    desc: 'Toplam oynaklık',
                    icon: '📊',
                    badge: 'Standart',
                    color: 'cyan',
                  },
                  {
                    key: 'calmar' as const,
                    label: 'Calmar',
                    desc: 'Drawdown koruması',
                    icon: '🛡️',
                    badge: 'Muhafazakar',
                    color: 'violet',
                  },
                ].map((m) => {
                  const isActive = activeMetric === m.key;
                  const colorMap = {
                    emerald: {
                      bg: 'bg-emerald-500/15',
                      border: 'border-emerald-500/60',
                      text: 'text-emerald-300',
                      badge: 'bg-emerald-500 text-slate-950',
                    },
                    cyan: {
                      bg: 'bg-cyan-500/15',
                      border: 'border-cyan-500/60',
                      text: 'text-cyan-300',
                      badge: 'bg-cyan-500 text-slate-950',
                    },
                    violet: {
                      bg: 'bg-violet-500/15',
                      border: 'border-violet-500/60',
                      text: 'text-violet-300',
                      badge: 'bg-violet-500 text-slate-950',
                    },
                  };
                  const colors = colorMap[m.color as keyof typeof colorMap];
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setActiveMetric(m.key);
                        if (showWalkForward) {
                          handleWalkForward(m.key);
                        } else {
                          handleOptimize(m.key);
                        }
                      }}
                      disabled={isOptimizing || isWalkForwardLoading}
                      className={`p-2.5 rounded-lg border-2 transition text-left ${
                        isActive
                          ? `${colors.bg} ${colors.border} ring-1 ring-${m.color}-500/30`
                          : 'bg-slate-900 border-slate-700 hover:border-slate-600 hover:bg-slate-800/80'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{m.icon}</span>
                        {isActive && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black font-mono ${colors.badge}`}>
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs font-bold font-mono ${isActive ? colors.text : 'text-slate-200'}`}>
                        {m.label}
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                        {m.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
              {optResult?.metricDescription && !showWalkForward && (
                <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] font-mono text-amber-300/90 text-center">
                  📌 Aktif Metrik: <strong className="text-amber-200">{optResult.activeMetric?.toUpperCase()}</strong> — {optResult.metricDescription}
                </div>
              )}
            </div>

            {/* WALK-FORWARD GÖRÜNÜMÜ */}
            {showWalkForward && (
              <>
                {isWalkForwardLoading && (
                  <div className="p-6 text-center bg-slate-950/60 border border-purple-800/40 rounded-xl mb-4">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs font-mono text-purple-400 font-semibold">Walk-Forward çalışıyor...</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">6 pencere × 87 kombinasyon = ~520 backtest</p>
                  </div>
                )}

                {walkForwardError && !isWalkForwardLoading && (
                  <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-mono mb-4">
                    <p className="font-bold mb-1">Walk-Forward Hatası:</p>
                    <p>{walkForwardError}</p>
                    <button
                      onClick={() => handleWalkForward()}
                      className="mt-2 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold"
                    >
                      Tekrar Dene
                    </button>
                  </div>
                )}

                {walkForwardResult && !isWalkForwardLoading && (
                  <>
                    {/* Stability Score Banner */}
                    <div className={`mb-4 p-4 rounded-xl border-2 ${
                      walkForwardResult.stability.score >= 70
                        ? 'bg-emerald-950/40 border-emerald-500/50'
                        : walkForwardResult.stability.score >= 40
                        ? 'bg-amber-950/40 border-amber-500/50'
                        : 'bg-rose-950/40 border-rose-500/50'
                    }`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl text-3xl ${
                            walkForwardResult.stability.score >= 70 ? 'bg-emerald-500/20' :
                            walkForwardResult.stability.score >= 40 ? 'bg-amber-500/20' : 'bg-rose-500/20'
                          }`}>
                            {walkForwardResult.stability.score >= 70 ? '🎯' : walkForwardResult.stability.score >= 40 ? '⚖️' : '⚠️'}
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
                              Stability Score
                            </div>
                            <div className={`text-3xl font-black font-mono ${
                              walkForwardResult.stability.score >= 70 ? 'text-emerald-400' :
                              walkForwardResult.stability.score >= 40 ? 'text-amber-400' : 'text-rose-400'
                            }`}>
                              {walkForwardResult.stability.score}/100
                            </div>
                            <div className={`text-xs font-mono font-bold mt-0.5 ${
                              walkForwardResult.stability.score >= 70 ? 'text-emerald-300' :
                              walkForwardResult.stability.score >= 40 ? 'text-amber-300' : 'text-rose-300'
                            }`}>
                              {walkForwardResult.stability.label}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono text-[10px] space-y-0.5">
                          <div className="text-slate-400">
                            {walkForwardResult.numWindows} pencere × {walkForwardResult.windowSize} gün
                          </div>
                          <div className="text-slate-500">
                            Toplam {walkForwardResult.totalDaysAnalyzed} gün analiz
                          </div>
                          <div className="text-slate-500">
                            Metrik: <strong className="text-purple-300">{walkForwardResult.activeMetric?.toUpperCase()}</strong>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] text-slate-300 font-sans leading-relaxed">
                        {walkForwardResult.stability.score >= 70
                          ? '✅ Ağırlıklar farklı piyasa koşullarında tutarlı kaldı. Bu ağırlıklar robust ve güvenilir.'
                          : walkForwardResult.stability.score >= 40
                          ? '⚖️ Ağırlıklar piyasa koşullarına göre değişkenlik gösteriyor. Tek pencereye güvenmek riskli olabilir.'
                          : '⚠️ Yüksek oynaklık: Ağırlıklar pencereden pencereye büyük ölçüde değişiyor. Tek pencere sonuçları overfit olabilir.'}
                      </p>
                    </div>

                    {/* Robust Weights Önerisi */}
                    <div className="mb-4 p-4 bg-gradient-to-br from-purple-950/40 to-slate-950/60 border border-purple-500/40 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-purple-400 text-base">🛡️</span>
                        <h4 className="text-xs font-bold font-mono text-purple-200 uppercase tracking-wide">
                          Robust Ağırlık Önerisi (6 Pencerenin Ortalaması)
                        </h4>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-violet-500/40 text-center">
                          <div className="text-[10px] font-mono text-violet-300 font-bold">🧠 DUYGU</div>
                          <div className="text-lg font-black font-mono text-violet-300">
                            %{Math.round((walkForwardResult?.robustWeights?.sentiment ?? 0) * 100)}
                          </div>
                          <div className="text-[9px] font-mono text-slate-500">
                            ± {safeToFixed((walkForwardResult?.stability?.stdSentiment ?? 0) * 100, 1, '0.0')}%
                          </div>
                        </div>
                        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-cyan-500/40 text-center">
                          <div className="text-[10px] font-mono text-cyan-300 font-bold">📈 TEKNİK</div>
                          <div className="text-lg font-black font-mono text-cyan-300">
                            %{Math.round((walkForwardResult?.robustWeights?.technical ?? 0) * 100)}
                          </div>
                          <div className="text-[9px] font-mono text-slate-500">
                            ± {safeToFixed((walkForwardResult?.stability?.stdTechnical ?? 0) * 100, 1, '0.0')}%
                          </div>
                        </div>
                        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-emerald-500/40 text-center">
                          <div className="text-[10px] font-mono text-emerald-300 font-bold">🏛️ AKIŞ</div>
                          <div className="text-lg font-black font-mono text-emerald-300">
                            %{Math.round((walkForwardResult?.robustWeights?.flow ?? 0) * 100)}
                          </div>
                          <div className="text-[9px] font-mono text-slate-500">
                            ± {safeToFixed((walkForwardResult?.stability?.stdFlow ?? 0) * 100, 1, '0.0')}%
                          </div>
                        </div>
                      </div>

                      {/* Karşılaştırma: Tek pencere vs Walk-forward */}
                      {optResult?.best && (
                        <div className="mb-3 p-2.5 bg-slate-900/70 border border-slate-700 rounded-lg text-[10px] font-mono">
                          <div className="text-slate-400 mb-1.5 uppercase tracking-wide font-bold">
                            ⚖️ Tek Pencere vs Walk-Forward Karşılaştırma
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Tek Pencere (14 gün):</span>
                              <span className="text-amber-300">
                                %{Math.round((optResult.best.sentiment || 0) * 100)} / %{Math.round((optResult.best.technical || 0) * 100)} / %{Math.round((optResult.best.flow || 0) * 100)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Walk-Forward (6 pencere):</span>
                              <span className="text-purple-300 font-bold">
                                %{Math.round(walkForwardResult.robustWeights.sentiment * 100)} / %{Math.round(walkForwardResult.robustWeights.technical * 100)} / %{Math.round(walkForwardResult.robustWeights.flow * 100)}
                              </span>
                            </div>
                            <div className="pt-1.5 mt-1.5 border-t border-slate-800 text-[9px] text-slate-500 italic">
                              Walk-forward versiyonu, tek pencereye kıyasla overfitting riskini azaltır.
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleWalkForward()}
                          disabled={isWalkForwardLoading}
                          className="text-xs text-slate-400 hover:text-slate-200 font-mono underline disabled:opacity-50"
                        >
                          ↻ Yeniden Analiz
                        </button>
                        <button
                          onClick={handleApplyRobustWeights}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold font-mono rounded-lg transition shadow-xs"
                        >
                          🛡️ Robust Ağırlıkları Uygula
                        </button>
                      </div>
                    </div>

                    {/* Pencere Bazlı Sonuçlar */}
                    <div className="mb-4">
                      <p className="text-[11px] font-mono text-slate-300 font-bold mb-2 uppercase tracking-wide">
                        📊 Pencere Bazlı Optimizasyon Sonuçları
                      </p>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {(walkForwardResult.windowResults || []).map((w: any, idx: number) => {
                          const isPositive = (w.best?.totalPnl ?? 0) >= 0;
                          return (
                            <div
                              key={idx}
                              className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition font-mono text-[10px]"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 font-bold">#{w.windowIndex}</span>
                                  <span className="text-slate-300">
                                    {w.startDate} → {w.endDate}
                                  </span>
                                  <span className="text-slate-500 text-[9px]">({w.daysInWindow} gün)</span>
                                </div>
                                <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  Skor: {safeToFixed(w.best?.score, 1, '—')}
                                </span>
                              </div>
                              <div className="grid grid-cols-4 gap-1.5">
                                <span className="text-violet-300">
                                  🧠 %{Math.round((w.best?.sentiment || 0) * 100)}
                                </span>
                                <span className="text-cyan-300">
                                  📈 %{Math.round((w.best?.technical || 0) * 100)}
                                </span>
                                <span className="text-emerald-300">
                                  🏛️ %{Math.round((w.best?.flow || 0) * 100)}
                                </span>
                                <span className="text-slate-400 text-right">
                                  PnL: <strong className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                                    {isPositive ? '+' : ''}{safeToFixed(w.best?.totalPnl ?? 0, 1, '0.0')}%
                                  </strong>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Note */}
                    {walkForwardResult.note && (
                      <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 text-[10px] font-mono text-purple-200/80 leading-relaxed mb-4">
                        ℹ️ {walkForwardResult.note}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* TEK PENCERE GÖRÜNÜMÜ */}
            {!showWalkForward && (
              <>
                {/* Yükleniyor Durumu */}
                {isOptimizing && (
                  <div className="p-6 text-center bg-slate-950/60 border border-slate-800 rounded-xl mb-4">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs font-mono text-amber-400 font-semibold">Grid Search çalışıyor...</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">~150 kombinasyon backtest ediliyor</p>
                  </div>
                )}

            {/* Hata Durumu */}
            {optError && !isOptimizing && (
              <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-mono mb-4">
                <p className="font-bold mb-1">Optimizasyon Hatası:</p>
                <p>{optError}</p>
                <button
                  onClick={() => handleOptimize()}
                  className="mt-2 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold"
                >
                  Tekrar Dene
                </button>
              </div>
            )}

            {/* Sonuç */}
            {optResult && !isOptimizing && (
              <>
                {/* Baseline vs Best Karşılaştırma */}
                {optResult.baseline && optResult.best && (
                  <div className="mb-4 p-3 bg-slate-950/80 border border-amber-500/40 rounded-xl">
                    <p className="text-[11px] font-mono text-amber-300 font-bold mb-2 uppercase tracking-wide">
                      📊 İyileştirme Özeti ({optResult.sampleDays} günlük veri)
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-mono">İsabet Oranı</div>
                        <div className={`text-sm font-bold font-mono ${optResult.improvement?.winRateDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {optResult.improvement?.winRateDelta >= 0 ? '+' : ''}{optResult.improvement?.winRateDelta}%
                        </div>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-mono">Toplam PnL</div>
                        <div className={`text-sm font-bold font-mono ${optResult.improvement?.pnlDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {optResult.improvement?.pnlDelta >= 0 ? '+' : ''}{optResult.improvement?.pnlDelta}%
                        </div>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-mono">Skor</div>
                        <div className={`text-sm font-bold font-mono ${optResult.improvement?.scoreDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {optResult.improvement?.scoreDelta >= 0 ? '+' : ''}{optResult.improvement?.scoreDelta}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top 5 Sonuç */}
                <div className="mb-4">
                  <p className="text-[11px] font-mono text-slate-300 font-bold mb-2 uppercase tracking-wide">
                    🏆 En İyi 5 Kombinasyon
                  </p>

                  {/* Recharts Bar Chart: Top 5 Kombinasyon Skor Karşılaştırması */}
                  {optResult.topResults && optResult.topResults.length > 0 && (
                    <div className="mb-4 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-mono text-cyan-300 font-bold mb-2 uppercase tracking-wide">
                        📊 Skor Karşılaştırma Grafiği (Top 5)
                      </p>
                      <div className="h-[180px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={optResult.topResults.slice(0, 5).map((r: any, idx: number) => ({
                              name: `#${idx + 1}`,
                              skor: r.score,
                              isabet: r.winRate,
                              pnl: r.totalPnl,
                              sentiment: Math.round(r.sentiment * 100),
                              technical: Math.round(r.technical * 100),
                              flow: Math.round(r.flow * 100),
                              totalTrades: r.totalTrades,
                              sortino: r.sortino ?? 0,
                              sharpe: r.sharpe ?? 0,
                              calmar: r.calmar ?? 0,
                              maxDrawdown: r.maxDrawdown ?? 0,
                            }))}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#020617',
                                borderColor: '#334155',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                              }}
                              labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                              formatter={(value: any, name: any, props: any) => {
                                const p = props.payload;
                                if (name === 'skor') {
                                  const sortinoVal = p.sortino ?? 0;
                                  const sharpeVal = p.sharpe ?? 0;
                                  const calmarVal = p.calmar ?? 0;
                                  const metricLine = activeMetric === 'sortino' 
                                    ? `Sortino: ${safeToFixed(sortinoVal, 2, '0.00')}`
                                    : activeMetric === 'sharpe'
                                    ? `Sharpe: ${safeToFixed(sharpeVal, 2, '0.00')}`
                                    : `Calmar: ${safeToFixed(calmarVal, 2, '0.00')}`;
                                  return [
                                    `${metricLine} (İsabet: %${p.isabet}, PnL: ${p.pnl >= 0 ? '+' : ''}%${p.pnl})`,
                                    'Skor',
                                  ];
                                }
                                return [value, name];
                              }}
                            />
                            <ReferenceLine
                              y={optResult.baseline?.score || 0}
                              stroke="#f59e0b"
                              strokeDasharray="4 4"
                              label={{
                                value: `Baseline: ${optResult.baseline?.score || 0}`,
                                fill: '#fbbf24',
                                fontSize: 9,
                                position: 'insideTopRight',
                              }}
                            />
                            <Bar dataKey="skor" radius={[4, 4, 0, 0]}>
                              {optResult.topResults.slice(0, 5).map((_: any, idx: number) => {
                                const colors = ['#f59e0b', '#a3a3a3', '#a16207', '#0ea5e9', '#0ea5e9'];
                                return <Cell key={`bar-${idx}`} fill={colors[idx] || '#64748b'} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1.5 text-center">
                        Sarı çizgi = Mevcut baseline skoru | Yüksek bar = Daha iyi optimizasyon
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {optResult.topResults?.slice(0, 5).map((r: any, idx: number) => {
                      const isBest = idx === 0;
                      return (
                        <div
                          key={`opt-${idx}`}
                          className={`p-2.5 rounded-lg border font-mono text-xs transition ${
                            isBest
                              ? 'bg-gradient-to-r from-amber-950/70 to-orange-950/40 border-amber-500/50'
                              : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`font-black ${isBest ? 'text-amber-400' : 'text-slate-500'}`}>
                                #{idx + 1}
                              </span>
                              <span className="text-slate-200 font-bold">
                                %{Math.round(r.sentiment * 100)} / %{Math.round(r.technical * 100)} / %{Math.round(r.flow * 100)}
                              </span>
                              <span className="text-[10px] text-slate-500">(Duygu / Teknik / Akış)</span>
                            </div>
                            <span className={`text-xs font-bold ${isBest ? 'text-amber-300' : 'text-slate-300'}`}>
                              Skor: {r.score}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 text-[10px] text-slate-400">
                            <span>İsabet: <strong className={r.winRate >= 55 ? 'text-emerald-400' : r.winRate >= 40 ? 'text-amber-400' : 'text-rose-400'}>%{r.winRate}</strong></span>
                            <span>PnL: <strong className={r.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{r.totalPnl >= 0 ? '+' : ''}%{r.totalPnl}</strong></span>
                            <span title={`Sortino: ${r.sortino ?? 0}`}>
                              Sortino:{' '}
                              <strong className={(r.sortino ?? 0) >= 2 ? 'text-emerald-400' : (r.sortino ?? 0) >= 1 ? 'text-amber-400' : 'text-rose-400'}>
                                {r.sortino ?? 0}
                              </strong>
                            </span>
                            <span title={`Max DD: ${r.maxDrawdown ?? 0}%`}>
                              DD:{' '}
                              <strong className="text-slate-300">
                                {safeToFixed(r.maxDrawdown ?? 0, 1, '0.0')}%
                              </strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Baseline Bilgisi */}
                {optResult.baseline && (
                  <div className="mb-4 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 font-mono text-xs">
                    <p className="text-slate-400 text-[10px] mb-1">📌 Mevcut Varsayılan (Baseline):</p>
                    <p className="text-slate-300">
                      %{Math.round(optResult.baseline.sentiment * 100)} / %{Math.round(optResult.baseline.technical * 100)} / %{Math.round(optResult.baseline.flow * 100)}
                      <span className="text-slate-500 ml-2">— Skor: {optResult.baseline.score}, İsabet: %{optResult.baseline.winRate}, PnL: {optResult.baseline.totalPnl >= 0 ? '+' : ''}%{optResult.baseline.totalPnl}</span>
                    </p>
                  </div>
                )}

                {/* Uyarı */}
                {optResult.note && (
                  <div className="mb-4 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[10px] font-mono text-amber-200/80 leading-relaxed">
                    ⚠️ {optResult.note}
                  </div>
                )}

                {/* Aksiyon Butonları */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2">
                  <button
                    onClick={() => handleOptimize()}
                    disabled={isOptimizing}
                    className="text-xs text-slate-400 hover:text-slate-200 font-mono underline disabled:opacity-50"
                  >
                    ↻ Yeniden Optimize Et
                  </button>
                  <button
                    onClick={handleApplyOptimizedWeights}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold font-mono rounded-lg transition shadow-xs"
                  >
                    🎯 Optimum Ağırlıkları Uygula
                  </button>
                </div>
              </>
            )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Karşılaştırma Modalı */}
      {showComparison && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 border border-emerald-500/40 p-6 rounded-xl w-full max-w-[640px] shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Başlık */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-100 font-mono flex items-center gap-2">
                  <span>🔬</span> Ağırlık Değişimi Karşılaştırması
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {comparisonData?.ticker || data?.ticker} — Baseline vs Optimum
                </p>
              </div>
              <button
                onClick={() => setShowComparison(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            {isLoadingComparison ? (
              <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-mono text-emerald-400 font-semibold">Karşılaştırma hesaplanıyor...</p>
                <p className="text-[10px] font-mono text-slate-500 mt-1">Baseline ve yeni ağırlıklarla 2 rapor çekiliyor</p>
              </div>
            ) : comparisonData ? (
              <>
                {/* Ağırlık Değişim Görseli */}
                <div className="mb-4 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <p className="text-[11px] font-mono text-slate-300 font-bold mb-3 uppercase tracking-wide">
                    ⚖️ Ağırlık Değişimi
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { key: 'sentiment', label: '🧠 Duygu', color: 'violet' },
                      { key: 'technical', label: '📈 Teknik', color: 'cyan' },
                      { key: 'flow', label: '🏛️ Akış', color: 'emerald' },
                    ].map((item) => {
                      const oldVal = Math.round((comparisonData.oldWeights?.[item.key] || 0) * 100);
                      const newVal = Math.round((comparisonData.newWeights?.[item.key] || 0) * 100);
                      const delta = newVal - oldVal;
                      const colorClass = item.color === 'violet' ? 'bg-violet-500' : item.color === 'cyan' ? 'bg-cyan-500' : 'bg-emerald-500';
                      const textColor = item.color === 'violet' ? 'text-violet-400' : item.color === 'cyan' ? 'text-cyan-400' : 'text-emerald-400';
                      return (
                        <div key={item.key}>
                          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                            <span className={textColor}>{item.label}</span>
                            <span className="text-slate-400">
                              <span className="text-slate-500">%{oldVal}</span>
                              <span className="mx-1.5 text-slate-600">→</span>
                              <span className="text-white font-bold">%{newVal}</span>
                              <span className={`ml-1.5 font-bold ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                ({delta >= 0 ? '+' : ''}{delta})
                              </span>
                            </span>
                          </div>
                          <div className="flex gap-1 h-2">
                            <div className="flex-1 bg-slate-800 rounded-full overflow-hidden relative">
                              <div
                                className={`${colorClass} h-full opacity-50`}
                                style={{ width: `${oldVal}%` }}
                              />
                              <div className="absolute top-1/2 -translate-y-1/2 text-[8px] text-slate-500 font-mono pl-1">
                                baseline
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Karar Karşılaştırma */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Baseline Karar */}
                  <div className="p-3 bg-slate-950/70 border border-slate-700 rounded-xl">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wide mb-2">ÖNCE (Baseline)</p>
                    <div className={`text-2xl font-black font-mono mb-2 ${
                      comparisonData.baseline.karar === 'AL' ? 'text-emerald-400' :
                      comparisonData.baseline.karar === 'SAT' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {comparisonData.baseline.karar}
                    </div>
                    <div className="space-y-1 text-[10px] font-mono text-slate-400">
                      <div className="flex justify-between">
                        <span>Bileşik Skor:</span>
                        <span className="text-slate-200 font-bold">{comparisonData.baseline.bilesik}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duygu:</span>
                        <span className="text-violet-400">{comparisonData.baseline.sentimentPuan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Teknik:</span>
                        <span className="text-cyan-400">{comparisonData.baseline.technicalPuan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Akış:</span>
                        <span className="text-emerald-400">{comparisonData.baseline.flowPuan}</span>
                      </div>
                    </div>
                  </div>

                  {/* Yeni Karar */}
                  <div className={`p-3 rounded-xl border-2 ${
                    comparisonData.new.karar === 'AL' ? 'bg-emerald-950/30 border-emerald-500/50' :
                    comparisonData.new.karar === 'SAT' ? 'bg-rose-950/30 border-rose-500/50' :
                    'bg-amber-950/30 border-amber-500/50'
                  }`}>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wide mb-2">SONRA (Optimum)</p>
                    <div className={`text-2xl font-black font-mono mb-2 ${
                      comparisonData.new.karar === 'AL' ? 'text-emerald-400' :
                      comparisonData.new.karar === 'SAT' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {comparisonData.new.karar}
                    </div>
                    <div className="space-y-1 text-[10px] font-mono text-slate-400">
                      <div className="flex justify-between">
                        <span>Bileşik Skor:</span>
                        <span className="text-white font-bold">{comparisonData.new.bilesik}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duygu:</span>
                        <span className="text-violet-400">{comparisonData.new.sentimentPuan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Teknik:</span>
                        <span className="text-cyan-400">{comparisonData.new.technicalPuan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Akış:</span>
                        <span className="text-emerald-400">{comparisonData.new.flowPuan}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Değişim Özeti */}
                {comparisonData.new.karar !== comparisonData.baseline.karar && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-amber-950/60 to-emerald-950/40 border border-amber-500/40 rounded-xl">
                    <p className="text-[11px] font-mono text-amber-300 font-bold mb-1">
                      🎯 KARAR DEĞİŞTİ!
                    </p>
                    <p className="text-xs text-slate-300 font-mono">
                      Ağırlık optimizasyonu sonucunda jüri kararı <strong className="text-white">{comparisonData.baseline.karar}</strong>'dan <strong className="text-white">{comparisonData.new.karar}</strong>'a döndü.
                    </p>
                  </div>
                )}

                {comparisonData.new.karar === comparisonData.baseline.karar && (
                  <div className="mb-4 p-3 bg-slate-950/60 border border-slate-700 rounded-xl">
                    <p className="text-[11px] font-mono text-slate-400 font-bold mb-1">
                      ℹ️ Karar aynı kaldı
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      Ağırlık değişikliği jüri kararını değiştirmedi, ancak bileşik skor <strong className="text-white">{comparisonData.baseline.bilesik}</strong>'dan <strong className="text-white">{comparisonData.new.bilesik}</strong>'a güncellendi.
                    </p>
                  </div>
                )}

                {/* Aksiyon */}
                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setShowComparison(false)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono rounded-lg transition shadow-xs"
                  >
                    Anladım, Modalı Kapat
                  </button>
                </div>
              </>
            ) : (
              <div className="p-6 text-center bg-slate-950/60 border border-slate-800 rounded-xl text-slate-400 text-xs font-mono">
                Karşılaştırma verisi alınamadı.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Competitor & Roadmap Modalı */}
      <CompetitorRoadmapModal
        isOpen={showRoadmap}
        onClose={() => setShowRoadmap(false)}
      />

      {/* API Key Yönetim Modalı */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </header>
  );
};
