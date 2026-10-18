// src/components/HeaderBar.tsx
import React, { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  RefreshCw,
  Sparkles,
  Building2,
  Play,
  Pause,
  Shield,
  Zap,
  Globe,
  BarChart2,
  Layers,
  Wallet,
  PieChart,
  Cpu,
  Scale,
  Radio,
  MessageSquare,
  CheckCircle2,
  LogOut,
  CreditCard,
} from 'lucide-react';
import { ALL_BIST_STOCKS, BISTStock } from '../data/bistAllStocks';
import { NlpSearchPanel } from './NlpSearchPanel';
import type { MarketType, TabKey } from '../App';
import { apiFetch } from '../utils/api';

export interface HeaderTabItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  market: MarketType;
}

export const HEADER_TABS: HeaderTabItem[] = [
  { key: 'overview', label: 'Yönetici Özeti', icon: Shield, market: 'BIST' },
  { key: 'crypto', label: '🪙 Kripto (BTC) OBI', icon: Zap, badge: 'WS', market: 'CRYPTO' },
  { key: 'nasdaq', label: '🇺🇸 NASDAQ L2 & OBI', icon: Globe, badge: 'CANLI', market: 'NASDAQ' },
  { key: 'depth', label: 'Tahta & Derinlik', icon: Activity, market: 'BIST' },
  { key: 'timeframe', label: 'Çok Zaman Dilimi', icon: BarChart2, market: 'BIST' },
  { key: 'cubes', label: '9 Küp Formasyonu', icon: Layers, market: 'BIST' },
  { key: 'portfolio', label: 'Portföy & Takip', icon: Wallet, market: 'BIST' },
  { key: 'takas', label: 'Takas & Balina', icon: PieChart, market: 'BIST' },
  { key: 'quant', label: 'Kuant & Robot', icon: Cpu, badge: 'OCO', market: 'BIST' },
  { key: 'forensic', label: 'Adli Vaka & Veto', icon: Scale, market: 'BIST' },
  { key: 'kap', label: 'KAP Radar', icon: Radio, market: 'BIST' },
  { key: 'chat', label: 'MT16 QuantMind', icon: MessageSquare, badge: 'QUANT', market: 'BIST' },
];

const QUICK_BIST_TICKERS = ['ASELS', 'THYAO', 'EREGL', 'GARAN', 'TUPRS', 'KCHOL', 'AKBNK', 'BIMAS'];
const QUICK_CRYPTO_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'AVAXUSDT', 'XRPUSDT'];
const QUICK_NASDAQ_SYMBOLS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META'];

export interface HeaderBarProps {
  user?: { email: string; subscription_status: string } | null;
  onLogout?: () => void;
  selectedMarket: MarketType;
  onMarketChange: (market: MarketType) => void;
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  activeTicker: string;
  onSelectTicker: (ticker: string) => void;
  cryptoPair: string;
  onSelectCryptoPair: (pair: string) => void;
  nasdaqSymbol: string;
  onSelectNasdaqSymbol: (symbol: string) => void;
  regime: 'BULL' | 'SIDEWAYS' | 'BEAR' | 'HIGH_VOL';
  onRegimeChange: (regime: 'BULL' | 'SIDEWAYS' | 'BEAR' | 'HIGH_VOL') => void;
  isLiveAutoTrade: boolean;
  onToggleAutoTrade: (val: boolean) => void;
  onOpenSaas: () => void;
  onOpenEnterprise: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  auditCount?: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  user,
  onLogout,
  selectedMarket,
  onMarketChange,
  activeTab,
  onSelectTab,
  activeTicker,
  onSelectTicker,
  cryptoPair,
  onSelectCryptoPair,
  nasdaqSymbol,
  onSelectNasdaqSymbol,
  regime,
  onRegimeChange,
  isLiveAutoTrade,
  onToggleAutoTrade,
  onOpenSaas,
  onOpenEnterprise,
  onRefresh,
  isRefreshing,
  auditCount = 0,
}) => {
  const [isBillingLoading, setIsBillingLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsBillingLoading(true);
    try {
      const data = await apiFetch('http://127.0.0.1:8001/api/billing/create-checkout-session', {
        method: 'POST'
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Billing error:', err);
      alert('Ödeme oturumu başlatılamadı.');
    } finally {
      setIsBillingLoading(false);
    }
  };

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const stockMeta: BISTStock = useMemo(() => {
    const found = ALL_BIST_STOCKS.find(s => s.code === activeTicker || s.ticker === activeTicker);
    if (found) return found;
    return {
      code: activeTicker,
      ticker: `${activeTicker}.IS`,
      symbol: `${activeTicker}.IS`,
      name: `${activeTicker} Sanayi`,
      sector: 'Sanayi',
      market: 'YILDIZ',
      price: 48.50,
      rate: 1.25,
    };
  }, [activeTicker]);

  return (
    <header className="border-b border-emerald-500/20 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 py-3 shadow-[0_10px_40px_rgba(2,6,23,0.9)]">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Taktiksel Savaş Odası Başlığı */}
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <Activity className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                MT16 Bistapp Kuant Terminali
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-md shadow-[0_0_12px_rgba(16,185,129,0.18)]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                v3.0 QUANT MIND {auditCount > 0 ? `· ${auditCount} AUDIT` : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              MT16 QuantMind (Kıdemli Kuant Stratejisti) • L2 OBI Radar, Z-Skor Sanitization &amp; Otonom OCO Motoru
            </p>
          </div>
        </div>

        {/* Pazar Seçim Sekmeleri (BIST, CRYPTO, NASDAQ) - Parlayan Aktif Butonlar */}
        <div className="flex bg-slate-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-cyan-500/25 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] gap-1">
          {(['BIST', 'CRYPTO', 'NASDAQ'] as const).map((m) => {
            const isSelected = selectedMarket === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onMarketChange(m)}
                className={`relative px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer select-none flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.55)] ring-1 ring-emerald-300 scale-[1.02]'
                    : 'text-slate-400 hover:text-emerald-200 hover:bg-slate-900/80 border border-transparent hover:border-emerald-500/20'
                }`}
              >
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                )}
                <span>{m === 'BIST' ? '🇹🇷 BIST' : m === 'CRYPTO' ? '🟡 CRYPTO' : '🇺🇸 NASDAQ'}</span>
              </button>
            );
          })}
        </div>

        {/* Hızlı Arama & Kontroller */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* BIST Hisse & Sol Açılır NLP Arama Penceresi (Taşma Korumalı max-h-[70vh] overflow-y-auto z-50) */}
          {selectedMarket === 'BIST' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-400 rounded-xl px-3.5 py-1.5 cursor-pointer text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.12)]"
              >
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono font-black text-emerald-300">{activeTicker}</span>
                <span className="text-[10px] text-slate-300 truncate max-w-[90px] hidden sm:inline">
                  {stockMeta.name}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  NLP
                </span>
              </button>

              <NlpSearchPanel
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                activeTicker={activeTicker}
                onSelectTicker={(t) => {
                  onSelectTicker(t);
                  setIsSearchOpen(false);
                }}
                mode="dropdown"
              />
            </div>
          )}

          {/* CRYPTO Hızlı Parite Seçici */}
          {selectedMarket === 'CRYPTO' && (
            <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-1 text-xs">
              {QUICK_CRYPTO_PAIRS.slice(0, 4).map((pair) => (
                <button
                  key={pair}
                  type="button"
                  onClick={() => onSelectCryptoPair(pair)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    cryptoPair === pair
                      ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {pair.replace('USDT', '')}
                </button>
              ))}
            </div>
          )}

          {/* NASDAQ Hızlı Sembol Seçici */}
          {selectedMarket === 'NASDAQ' && (
            <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 rounded-xl p-1 text-xs">
              {QUICK_NASDAQ_SYMBOLS.slice(0, 4).map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => onSelectNasdaqSymbol(sym)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    nasdaqSymbol === sym
                      ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          )}

          {/* Rejim Seçici (Boğa/Ayı/Yatay) */}
          <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 text-xs">
            {(['BULL', 'SIDEWAYS', 'BEAR'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRegimeChange(r)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  regime === r
                    ? r === 'BULL'
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : r === 'BEAR'
                      ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                      : 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r === 'BULL' ? 'BOĞA' : r === 'BEAR' ? 'AYI' : 'YATAY'}
              </button>
            ))}
          </div>

          {/* Auto-Trade Kill Switch */}
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] font-medium text-slate-300 hidden sm:inline">Otonom:</span>
            <button
              type="button"
              onClick={() => onToggleAutoTrade(!isLiveAutoTrade)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                isLiveAutoTrade
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              }`}
            >
              {isLiveAutoTrade ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isLiveAutoTrade ? 'CANLI MOD (AKTİF)' : 'SİMÜLASYON'}
            </button>
          </div>

          {/* 🔐 ABONELİK DURUMU VE STRIPE UPGRADE */}
          <div className="flex items-center gap-2">
            {user?.subscription_status === 'PREMIUM' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>PREMIUM ÜYE</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={isBillingLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black hover:bg-amber-500/30 transition cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:cursor-wait"
              >
                {isBillingLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5" />
                )}
                <span>PREMIUM'A GEÇ</span>
              </button>
            )}
            
            <div className="hidden lg:flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-950/40 border border-slate-800 text-[10px] font-mono text-slate-500">
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span>{user?.email || 'Misafir'}</span>
            </div>
          </div>

          {/* Yenileme */}
          <button
            type="button"
            onClick={onRefresh}
            className={`p-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-emerald-300 hover:text-white hover:border-emerald-400 transition cursor-pointer ${
              isRefreshing ? 'animate-spin text-emerald-400' : ''
            }`}
            title="Tüm Kuant Servislerini Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition cursor-pointer"
              title="Oturumu Kapat"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* BIST Hızlı Sembol Şeridi (BIST Seçiliyse) */}
      {selectedMarket === 'BIST' && (
        <div className="max-w-7xl mx-auto mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mr-1 font-bold">
              Hızlı Tahta:
            </span>
            {QUICK_BIST_TICKERS.map((t) => {
              const isCurrent = activeTicker === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onSelectTicker(t)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer border ${
                    isCurrent
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-emerald-200 hover:border-emerald-500/40'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div className="text-[11px] font-mono text-slate-400 hidden lg:flex items-center gap-2">
            <span>Aktif Pazar: <strong className="text-emerald-400">{selectedMarket}</strong></span>
            <span>·</span>
            <span>Modül: <strong className="text-cyan-300 uppercase">{activeTab}</strong></span>
          </div>
        </div>
      )}

      {/* 📑 TÜM SEKME VE ALT MODÜL BUTONLARI (Parlayan Taktiksel Savaş Odası Sekmeleri) */}
      <nav className="max-w-7xl mx-auto mt-2.5 pt-2.5 border-t border-emerald-500/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {HEADER_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            (selectedMarket === 'CRYPTO' && tab.key === 'crypto') ||
            (selectedMarket === 'NASDAQ' && tab.key === 'nasdaq') ||
            (selectedMarket === 'BIST' && activeTab === tab.key);

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 whitespace-nowrap cursor-pointer select-none border ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-slate-950 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)] ring-1 ring-emerald-300/60 scale-[1.02]'
                  : 'bg-slate-900/70 backdrop-blur-md text-slate-300 hover:text-emerald-300 hover:bg-slate-900 border-slate-800/90 hover:border-emerald-500/40 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]'
              }`}
            >
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
              )}
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-slate-950' : 'text-emerald-400 group-hover:text-emerald-300'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-md font-black tracking-wider ${
                    isActive
                      ? 'bg-slate-950 text-emerald-300 shadow-sm'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
