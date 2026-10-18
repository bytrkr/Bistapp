import React from 'react';
import { Layers, Zap, Activity, Flame, ShieldAlert } from 'lucide-react';

interface LevelItem {
  price: number;
  qty: number;
  total: number;
  mmid?: string;
}

interface OrderBookHeatmapVisualizerProps {
  symbol: string;
  lastPrice: number;
  bids: LevelItem[];
  asks: LevelItem[];
  spread: number;
  obi: number;
  zScore: number;
}

export const OrderBookHeatmapVisualizer: React.FC<OrderBookHeatmapVisualizerProps> = ({
  symbol,
  lastPrice = 0,
  bids = [],
  asks = [],
  spread = 0,
  obi = 0,
  zScore = 0
}) => {
  const safeLastPrice = Number(lastPrice) || 0;
  const safeSpread = Number(spread) || 0;
  const safeObi = Number(obi) || 0;
  const safeZScore = Number(zScore) || 0;

  const safeBids = Array.isArray(bids) ? bids : [];
  const safeAsks = Array.isArray(asks) ? asks : [];

  const maxBidTotal = safeBids[safeBids.length - 1]?.total || 1;
  const maxAskTotal = safeAsks[safeAsks.length - 1]?.total || 1;
  const maxTotalLiq = Math.max(maxBidTotal, maxAskTotal, 1);

  // Balina Duvarı (Whale Wall) Tespiti
  const topBidWall = safeBids.reduce((max, b) => (b?.qty || 0) > (max?.qty || 0) ? b : max, safeBids[0] || { price: 0, qty: 0 });
  const topAskWall = safeAsks.reduce((max, a) => (a?.qty || 0) > (max?.qty || 0) ? a : max, safeAsks[0] || { price: 0, qty: 0 });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Üst Bilgi & Isı Haritası Modu Göstergesi */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 text-white shadow-lg">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Bookmap & TradingView L2 Isı Haritası (Heatmap) & Likidite Duvarları: {symbol}
            </h4>
            <p className="text-[11px] text-slate-400">
              Fiyat kademelerindeki hacim yoğunluğu (thermal gradient) ve kurumsal emir yığınları
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Z-Skor: {safeZScore > 0 ? `+${safeZScore.toFixed(2)}σ` : `${safeZScore.toFixed(2)}σ`}
          </span>
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${
            safeObi >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}>
            OBI: {safeObi > 0 ? `+${safeObi.toFixed(3)}` : safeObi.toFixed(3)}
          </span>
        </div>
      </div>

      {/* İki Taraflı L2 Isı Haritası & Derinlik Tablosu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ALIŞLAR (BIDS - Yeşil Isı Haritası) */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-emerald-400 px-1">
            <span>ALIŞ KADEMELERİ (BIDS)</span>
            <span>TOPLAM LİKİDİTE</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 space-y-1 font-mono text-xs">
            {safeBids.map((bid, i) => {
              const bPrice = Number(bid?.price) || 0;
              const bQty = Number(bid?.qty) || 0;
              const bTotal = Number(bid?.total) || 0;
              const intensityPct = Math.min(100, Math.max(5, (bTotal / maxTotalLiq) * 100));
              const isWall = topBidWall && bPrice === topBidWall.price;
              return (
                <div
                  key={i}
                  className="relative flex items-center justify-between py-1 px-2 rounded overflow-hidden transition hover:bg-slate-900"
                >
                  {/* Isı Haritası Arka Plan Şiddeti */}
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-600/25 border-r border-emerald-500/50 transition-all duration-300 pointer-events-none"
                    style={{ width: `${intensityPct}%` }}
                  />
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">${bPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    {isWall && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500 text-slate-950 font-black animate-pulse">
                        WHALE WALL
                      </span>
                    )}
                  </div>
                  <div className="relative z-10 text-slate-300">{bQty.toLocaleString('en-US')}</div>
                  <div className="relative z-10 text-slate-400 text-[11px]">{bTotal.toLocaleString('en-US')}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SATIŞLAR (ASKS - Kırmızı/Turuncu Isı Haritası) */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-rose-400 px-1">
            <span>SATIŞ KADEMELERİ (ASKS)</span>
            <span>TOPLAM LİKİDİTE</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 space-y-1 font-mono text-xs">
            {safeAsks.map((ask, i) => {
              const aPrice = Number(ask?.price) || 0;
              const aQty = Number(ask?.qty) || 0;
              const aTotal = Number(ask?.total) || 0;
              const intensityPct = Math.min(100, Math.max(5, (aTotal / maxTotalLiq) * 100));
              const isWall = topAskWall && aPrice === topAskWall.price;
              return (
                <div
                  key={i}
                  className="relative flex items-center justify-between py-1 px-2 rounded overflow-hidden transition hover:bg-slate-900"
                >
                  {/* Isı Haritası Arka Plan Şiddeti */}
                  <div
                    className="absolute inset-y-0 right-0 bg-rose-600/25 border-l border-rose-500/50 transition-all duration-300 pointer-events-none"
                    style={{ width: `${intensityPct}%` }}
                  />
                  <div className="relative z-10 text-slate-400 text-[11px]">{aTotal.toLocaleString('en-US')}</div>
                  <div className="relative z-10 text-slate-300">{aQty.toLocaleString('en-US')}</div>
                  <div className="relative z-10 flex items-center gap-2">
                    {isWall && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500 text-slate-950 font-black animate-pulse">
                        RESISTANCE WALL
                      </span>
                    )}
                    <span className="text-rose-400 font-bold">${aPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SPREAD & ANOMALİ ÖZETİ */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-400">Canlı Fiyat: <strong className="text-white font-mono">${safeLastPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Spread: <strong className="text-amber-400 font-mono">${safeSpread.toFixed(2)}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span>Isı Haritası Algoritması: <strong className="text-emerald-400 font-mono">Aktif (100ms L2 Stream)</strong></span>
        </div>
      </div>
    </div>
  );
};
