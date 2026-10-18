import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { TacticalCard } from './TacticalCard';
import { DraggablePanel, triggerResetAllDraggablePanels } from './DraggablePanel';

interface NasdaqLevel {
  price: number;
  qty: number;
  total: number;
  mmid: string;
}

interface NasdaqOrderBook {
  symbol: string;
  name: string;
  timestamp: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  high: number;
  low: number;
  openPrice: number;
  volume: number;
  avgVolume: number;
  pe: number;
  marketCapStr: string;
  beta: number;
  bestBid: number;
  bestAsk: number;
  spread: number;
  microPrice: number;
  bids: NasdaqLevel[];
  asks: NasdaqLevel[];
  bidTotalVolume: number;
  askTotalVolume: number;
  obi: number;
  obiPct: number;
  zScore: number;
  anomalyStatus: 'NORMAL' | 'DIKKAT' | 'ANORMAL_HACIM_PATLAMASI';
  signal: 'GUCLU_AL' | 'AL' | 'NOTR' | 'SAT' | 'GUCLU_SAT';
  quantComment: string;
}

interface NasdaqTickerSummary {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  obi: number;
  zScore: number;
  signal: string;
}

const SYMBOLS = [
  { id: 'NVDA', name: 'NVIDIA' },
  { id: 'AAPL', name: 'Apple' },
  { id: 'MSFT', name: 'Microsoft' },
  { id: 'TSLA', name: 'Tesla' },
  { id: 'AMZN', name: 'Amazon' },
  { id: 'GOOGL', name: 'Google' },
  { id: 'META', name: 'Meta' },
  { id: 'QQQ', name: 'Nasdaq 100' },
  { id: 'SPY', name: 'S&P 500 ETF' },
];

export interface NasdaqStreamTabProps {
  isLiveAutoTrade?: boolean;
  onToggleAutoTrade?: (val: boolean) => void;
  activeSymbol?: string;
  onSelectSymbol?: (sym: string) => void;
}

export const NasdaqStreamTab: React.FC<NasdaqStreamTabProps> = ({
  isLiveAutoTrade = false,
  onToggleAutoTrade,
  activeSymbol,
  onSelectSymbol,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(activeSymbol || 'NVDA');

  useEffect(() => {
    if (activeSymbol && activeSymbol !== selectedSymbol) {
      setSelectedSymbol(activeSymbol);
    }
  }, [activeSymbol, selectedSymbol]);

  const handleSymbolChange = (s: string) => {
    setSelectedSymbol(s);
    if (onSelectSymbol) onSelectSymbol(s);
  };
  const [orderBook, setOrderBook] = useState<NasdaqOrderBook | null>(null);
  const [tickers, setTickers] = useState<NasdaqTickerSummary[]>([]);
  const [, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchBook = useCallback(async (sym: string, isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/nasdaq/orderbook/${sym}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOrderBook(json.data);
          setLastUpdated(new Date().toLocaleTimeString('tr-TR'));
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  const fetchTickers = useCallback(async () => {
    try {
      const res = await fetch('/api/nasdaq/tickers');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTickers(json.data);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchBook(selectedSymbol);
    fetchTickers();

    const interval = setInterval(() => {
      fetchBook(selectedSymbol);
      fetchTickers();
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedSymbol, fetchBook, fetchTickers]);

  const fallbackPrice =
    selectedSymbol === 'AAPL'
      ? 225.4
      : selectedSymbol === 'MSFT'
      ? 418.5
      : selectedSymbol === 'TSLA'
      ? 248.9
      : selectedSymbol === 'AMZN'
      ? 208.2
      : selectedSymbol === 'GOOGL'
      ? 182.4
      : selectedSymbol === 'META'
      ? 585.0
      : selectedSymbol === 'QQQ'
      ? 502.3
      : selectedSymbol === 'SPY'
      ? 582.1
      : 126.2;

  return (
    <div className="space-y-4">
      {/* BAŞLIK & SEMBOL SEÇİCİ */}
      <DraggablePanel
        id="nasdaq-header-selector-win"
        title={`NASDAQ & US Equities Canlı Veri Akışı (${selectedSymbol})`}
        subtitle="Wall Street L2 Market Maker Book & Z-Skor Tarayıcı"
        badgeText="L2 MM BOOK"
        accentColor="blue"
        compactHeader
      >
        <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Globe className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">NASDAQ &amp; US EQUITIES CANLI VERİ AKIŞI</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                    L2 Market Maker Akışı
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Wall Street Kurumsal Emir Defteri (L2 MM Book), Order Book Imbalance (OBI) &amp; Z-Skor Anomali Taraması
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={triggerResetAllDraggablePanels}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-blue-500/35 hover:border-emerald-400 text-[11px] font-mono font-bold text-blue-300 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
                title="Tüm pencereleri varsayılan konumlarına hizala"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pencereleri Hizala</span>
              </button>
              <span className="text-slate-500 font-mono text-[11px]">Son Güncelleme: {lastUpdated || 'Anlık'}</span>
              <button
                onClick={() => fetchBook(selectedSymbol, true)}
                className={`p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-all ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
                title="Yenile"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sembol Çipleri */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {SYMBOLS.map(sym => {
              const isSelected = selectedSymbol === sym.id;
              const summary = tickers.find(t => t.symbol === sym.id);
              return (
                <button
                  key={sym.id}
                  type="button"
                  onClick={() => {
                    handleSymbolChange(sym.id);
                    setIsLoading(true);
                    fetchBook(sym.id);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20'
                      : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <span>{sym.id}</span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">{sym.name}</span>
                  {summary && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-blue-800 text-white font-black'
                          : summary.changePercent >= 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      %{summary.changePercent >= 0 ? '+' : ''}{summary.changePercent.toFixed(1)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </DraggablePanel>

      {/* TAKTİKSEL TEK KART & GİZLİ DETAY ÇEKMECESİ (NASDAQ: Z Eşiği ±2.0σ) */}
      <TacticalCard
        collectorInput={{
          symbol: selectedSymbol,
          companyName: SYMBOLS.find((s) => s.id === selectedSymbol)?.name || selectedSymbol,
          marketType: 'NASDAQ',
          price: orderBook?.lastPrice || fallbackPrice,
          changePct: orderBook?.priceChangePercent ?? 1.45,
          zScore: orderBook?.zScore ?? 1.35,
          obi: orderBook?.obi ?? 0.24,
          rsi: 56.8,
          wallLot: Math.round(orderBook?.askTotalVolume || 8500),
          wallPrice: Number(((orderBook?.lastPrice || fallbackPrice) * 1.012).toFixed(2)),
          spreadPct: orderBook?.lastPrice && orderBook.spread ? Number(((orderBook.spread / orderBook.lastPrice) * 100).toFixed(3)) : 0.04,
          latestKapTitle: orderBook?.quantComment || `${selectedSymbol} Wall Street L2 Market Maker likidite akışı dengeli`,
          latestKapImpact: orderBook && orderBook.obi >= 0 ? 30 : -12,
          latestKapTime: lastUpdated || 'Canlı',
        }}
        onSelectTicker={handleSymbolChange}
        isLiveAutoTrade={isLiveAutoTrade}
        onToggleAutoTrade={onToggleAutoTrade}
        orderBookLevels={{
          bids: orderBook?.bids || [],
          asks: orderBook?.asks || [],
        }}
      />
    </div>
  );
};
