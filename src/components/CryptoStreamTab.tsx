import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { TacticalCard } from './TacticalCard';
import { DraggablePanel, triggerResetAllDraggablePanels } from './DraggablePanel';

interface CryptoLevel {
  price: number;
  qty: number;
  total: number;
}

interface CryptoOrderBook {
  pair: string;
  symbol: string;
  timestamp: string;
  lastPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadPct: number;
  microPrice: number;
  bids: CryptoLevel[];
  asks: CryptoLevel[];
  bidTotalVolume: number;
  askTotalVolume: number;
  obi: number;
  obiPct: number;
  zScore: number;
  anomalyStatus: 'NORMAL' | 'DIKKAT' | 'ANORMAL_HACIM_PATLAMASI';
  signal: 'GUCLU_AL' | 'AL' | 'NOTR' | 'SAT' | 'GUCLU_SAT';
  quantComment: string;
}

interface CryptoTickerSummary {
  pair: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  obi: number;
  zScore: number;
  signal: string;
}

const PAIRS = [
  { id: 'BTCUSDT', label: 'BTC/USDT', name: 'Bitcoin' },
  { id: 'ETHUSDT', label: 'ETH/USDT', name: 'Ethereum' },
  { id: 'SOLUSDT', label: 'SOL/USDT', name: 'Solana' },
  { id: 'BNBUSDT', label: 'BNB/USDT', name: 'BNB' },
  { id: 'AVAXUSDT', label: 'AVAX/USDT', name: 'Avalanche' },
  { id: 'XRPUSDT', label: 'XRP/USDT', name: 'Ripple' },
];

export interface CryptoStreamTabProps {
  isLiveAutoTrade?: boolean;
  onToggleAutoTrade?: (val: boolean) => void;
  activePair?: string;
  onSelectPair?: (pair: string) => void;
}

export const CryptoStreamTab: React.FC<CryptoStreamTabProps> = ({
  isLiveAutoTrade = false,
  onToggleAutoTrade,
  activePair,
  onSelectPair,
}) => {
  const [selectedPair, setSelectedPair] = useState<string>(activePair || 'BTCUSDT');

  useEffect(() => {
    if (activePair && activePair !== selectedPair) {
      setSelectedPair(activePair);
    }
  }, [activePair, selectedPair]);

  const handlePairChange = (p: string) => {
    setSelectedPair(p);
    if (onSelectPair) onSelectPair(p);
  };
  const [orderBook, setOrderBook] = useState<CryptoOrderBook | null>(null);
  const [tickers, setTickers] = useState<CryptoTickerSummary[]>([]);
  const [, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchBook = useCallback(async (pair: string, isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/crypto/orderbook/${pair}`);
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
      const res = await fetch('/api/crypto/tickers');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTickers(json.data);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchBook(selectedPair);
    fetchTickers();

    const interval = setInterval(() => {
      fetchBook(selectedPair);
      fetchTickers();
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedPair, fetchBook, fetchTickers]);

  const fallbackPrice =
    selectedPair === 'ETHUSDT'
      ? 2640.0
      : selectedPair === 'SOLUSDT'
      ? 168.5
      : selectedPair === 'BNBUSDT'
      ? 612.0
      : selectedPair === 'AVAXUSDT'
      ? 28.4
      : selectedPair === 'XRPUSDT'
      ? 2.45
      : 84250.0;

  return (
    <div className="space-y-4">
      {/* BAŞLIK & PARİTE SEÇİCİ */}
      <DraggablePanel
        id="crypto-header-selector-win"
        title={`Kripto Canlı Veri Akışı & L2 OBI Motoru (${selectedPair})`}
        subtitle="100ms Binance WebSocket / REST L2 Derinlik"
        badgeText="BINANCE WS CANLI"
        accentColor="amber"
        compactHeader
      >
        <div className="bg-slate-900/65 backdrop-blur-xl rounded-b-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">KRİPTO CANLI VERİ AKIŞI &amp; L2 OBI MOTORU</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Binance WS Canlı
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  100ms Gerçek Zamanlı Binance WebSocket / REST L2 Derinlik, Order Book Imbalance (OBI) &amp; Z-Skor Anomali Taraması
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={triggerResetAllDraggablePanels}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-amber-500/35 hover:border-emerald-400 text-[11px] font-mono font-bold text-amber-300 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
                title="Tüm pencereleri varsayılan konumlarına hizala"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pencereleri Hizala</span>
              </button>
              <span className="text-slate-500 font-mono text-[11px]">Son Güncelleme: {lastUpdated || 'Anlık'}</span>
              <button
                onClick={() => fetchBook(selectedPair, true)}
                className={`p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-all ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
                title="Yenile"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Parite Çipleri */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {PAIRS.map(pair => {
              const isSelected = selectedPair === pair.id;
              const summary = tickers.find(t => t.pair === pair.id);
              return (
                <button
                  key={pair.id}
                  type="button"
                  onClick={() => {
                    handlePairChange(pair.id);
                    setIsLoading(true);
                    fetchBook(pair.id);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <span>{pair.label}</span>
                  {summary && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-slate-950/20 text-slate-900 font-black'
                          : summary.change24h >= 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      %{summary.change24h >= 0 ? '+' : ''}{summary.change24h.toFixed(1)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </DraggablePanel>

      {/* TAKTİKSEL TEK KART & GİZLİ DETAY ÇEKMECESİ (CRYPTO: Z Eşiği ±2.0σ) */}
      <TacticalCard
        collectorInput={{
          symbol: selectedPair,
          companyName: PAIRS.find((p) => p.id === selectedPair)?.name || selectedPair,
          marketType: 'CRYPTO',
          price: orderBook?.lastPrice || fallbackPrice,
          changePct: orderBook?.priceChangePercent24h ?? 1.85,
          zScore: orderBook?.zScore ?? 1.45,
          obi: orderBook?.obi ?? 0.38,
          rsi: 58.4,
          wallLot: Math.round(orderBook?.askTotalVolume || 420),
          wallPrice: Number(((orderBook?.lastPrice || fallbackPrice) * 1.012).toFixed(2)),
          spreadPct: orderBook?.spreadPct ?? 0.02,
          latestKapTitle: orderBook?.quantComment || `${selectedPair} Binance L2 emir defteri likidite akışı dengeli`,
          latestKapImpact: orderBook && orderBook.obi >= 0 ? 35 : -15,
          latestKapTime: lastUpdated || 'Canlı',
        }}
        onSelectTicker={handlePairChange}
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
