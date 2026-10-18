import React, { useState, useMemo } from 'react';
import {
  Grid,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  Info,
  TrendingUp,
  Percent,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

export interface PortfolioCorrelationCardProps {
  currentSymbol?: string;
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ';
  className?: string;
}

interface AssetInfo {
  symbol: string;
  name: string;
  market: 'BIST' | 'CRYPTO' | 'NASDAQ';
}

const TRACKED_ASSETS: AssetInfo[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', market: 'CRYPTO' },
  { symbol: 'ETHUSDT', name: 'Ethereum', market: 'CRYPTO' },
  { symbol: 'SOLUSDT', name: 'Solana', market: 'CRYPTO' },
  { symbol: 'NVDA', name: 'Nvidia', market: 'NASDAQ' },
  { symbol: 'AAPL', name: 'Apple', market: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla', market: 'NASDAQ' },
  { symbol: 'ASELS', name: 'Aselsan', market: 'BIST' },
  { symbol: 'THYAO', name: 'Türk Hava Yolları', market: 'BIST' },
  { symbol: 'BIMAS', name: 'BİM Mağazalar', market: 'BIST' },
];

// 9x9 Çoklu Varlık Korelasyon Matrisi (-1.0 ile +1.0 arası gerçekçi kuant değerler)
const CORRELATION_MATRIX: Record<string, Record<string, number>> = {
  BTCUSDT: {
    BTCUSDT: 1.0,
    ETHUSDT: 0.88,
    SOLUSDT: 0.84,
    NVDA: 0.62,
    AAPL: 0.38,
    TSLA: 0.54,
    ASELS: -0.12,
    THYAO: 0.08,
    BIMAS: -0.05,
  },
  ETHUSDT: {
    BTCUSDT: 0.88,
    ETHUSDT: 1.0,
    SOLUSDT: 0.86,
    NVDA: 0.59,
    AAPL: 0.35,
    TSLA: 0.51,
    ASELS: -0.15,
    THYAO: 0.05,
    BIMAS: -0.08,
  },
  SOLUSDT: {
    BTCUSDT: 0.84,
    ETHUSDT: 0.86,
    SOLUSDT: 1.0,
    NVDA: 0.65,
    AAPL: 0.32,
    TSLA: 0.58,
    ASELS: -0.18,
    THYAO: 0.02,
    BIMAS: -0.10,
  },
  NVDA: {
    BTCUSDT: 0.62,
    ETHUSDT: 0.59,
    SOLUSDT: 0.65,
    NVDA: 1.0,
    AAPL: 0.76,
    TSLA: 0.69,
    ASELS: 0.14,
    THYAO: 0.22,
    BIMAS: 0.05,
  },
  AAPL: {
    BTCUSDT: 0.38,
    ETHUSDT: 0.35,
    SOLUSDT: 0.32,
    NVDA: 0.76,
    AAPL: 1.0,
    TSLA: 0.58,
    ASELS: 0.11,
    THYAO: 0.24,
    BIMAS: 0.16,
  },
  TSLA: {
    BTCUSDT: 0.54,
    ETHUSDT: 0.51,
    SOLUSDT: 0.58,
    NVDA: 0.69,
    AAPL: 0.58,
    TSLA: 1.0,
    ASELS: 0.05,
    THYAO: 0.18,
    BIMAS: -0.02,
  },
  ASELS: {
    BTCUSDT: -0.12,
    ETHUSDT: -0.15,
    SOLUSDT: -0.18,
    NVDA: 0.14,
    AAPL: 0.11,
    TSLA: 0.05,
    ASELS: 1.0,
    THYAO: 0.64,
    BIMAS: 0.48,
  },
  THYAO: {
    BTCUSDT: 0.08,
    ETHUSDT: 0.05,
    SOLUSDT: 0.02,
    NVDA: 0.22,
    AAPL: 0.24,
    TSLA: 0.18,
    ASELS: 0.64,
    THYAO: 1.0,
    BIMAS: 0.56,
  },
  BIMAS: {
    BTCUSDT: -0.05,
    ETHUSDT: -0.08,
    SOLUSDT: -0.10,
    NVDA: 0.05,
    AAPL: 0.16,
    TSLA: -0.02,
    ASELS: 0.48,
    THYAO: 0.56,
    BIMAS: 1.0,
  },
};

export const PortfolioCorrelationCard: React.FC<PortfolioCorrelationCardProps> = ({
  currentSymbol,
  marketType = 'CRYPTO',
  className = '',
}) => {
  // Varsayılan açık pozisyon ve yeni alınmak istenen varlık seçimi
  const initialOpen = currentSymbol && TRACKED_ASSETS.some(a => a.symbol === currentSymbol)
    ? currentSymbol
    : marketType === 'CRYPTO'
    ? 'BTCUSDT'
    : marketType === 'NASDAQ'
    ? 'NVDA'
    : 'ASELS';

  const initialTarget = initialOpen === 'BTCUSDT' ? 'ETHUSDT' : initialOpen === 'NVDA' ? 'AAPL' : 'THYAO';

  const [openPositionAsset, setOpenPositionAsset] = useState<string>(initialOpen);
  const [candidateAsset, setCandidateAsset] = useState<string>(initialTarget);
  const [filterMarket, setFilterMarket] = useState<'ALL' | 'CRYPTO' | 'NASDAQ' | 'BIST'>('ALL');
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string; val: number } | null>(null);

  // Filtrelenmiş varlık listesi (matris gösterimi için)
  const displayAssets = useMemo(() => {
    if (filterMarket === 'ALL') return TRACKED_ASSETS;
    return TRACKED_ASSETS.filter(a => a.market === filterMarket);
  }, [filterMarket]);

  // Seçili açık pozisyon ve aday varlık arasındaki korelasyon değeri
  const activeCorrelation = useMemo(() => {
    if (openPositionAsset === candidateAsset) return 1.0;
    const row = CORRELATION_MATRIX[openPositionAsset];
    if (row && row[candidateAsset] !== undefined) {
      return row[candidateAsset];
    }
    return 0.5;
  }, [openPositionAsset, candidateAsset]);

  const activeCorrPct = Math.round(activeCorrelation * 100);
  const isHighExposureBlocked = activeCorrelation > 0.85;

  // Hücre arkaplan ve metin rengi hesabı
  const getCellColor = (val: number, isSelf: boolean) => {
    if (isSelf) return 'bg-emerald-500/20 text-emerald-300 font-bold';
    if (val > 0.85) return 'bg-rose-500/40 text-rose-200 font-bold border border-rose-500/50';
    if (val >= 0.70) return 'bg-amber-500/30 text-amber-200 font-semibold';
    if (val >= 0.35) return 'bg-blue-500/20 text-blue-200';
    if (val >= -0.15) return 'bg-slate-800/80 text-slate-300';
    return 'bg-emerald-500/20 text-emerald-300 font-medium';
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl ${className}`}>
      {/* ⚠️ YÜKSEK KORELASYON ENGELİ BANNERI (Korelasyon > 0.85 ise tetiklenir) */}
      {isHighExposureBlocked ? (
        <div className="mb-5 bg-gradient-to-r from-rose-950/90 via-red-900/80 to-rose-950/90 border border-red-500 text-white p-4 rounded-xl shadow-2xl animate-pulse">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-600 rounded-lg text-white shadow-lg animate-bounce">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-red-200 tracking-wide flex items-center gap-2">
                  ⚠️ YÜKSEK KORELASYON ENGELİ (%{activeCorrPct}): ÇOKLU MARUZİYET RİSKİ NEDENİYLE İŞLEM İPTAL EDİLDİ
                </h3>
                <p className="text-xs text-red-100/90 mt-1">
                  Mevcut açık pozisyonunuz (<strong>{openPositionAsset}</strong>) ile yeni alım adayı (<strong>{candidateAsset}</strong>) arasındaki korelasyon katsayısı{' '}
                  <span className="font-mono font-bold text-white bg-red-800/60 px-1.5 py-0.5 rounded">+{activeCorrelation.toFixed(2)}</span> seviyesinde (&gt;0.85 kalkan eşiği).
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/40 text-red-300 border border-red-500/40">
                    <XCircle className="w-3.5 h-3.5 text-red-400" /> Kuant Kalkanı: Çoklu Maruziyet Veto Edildi (Sermaye Korundu)
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right self-stretch md:self-auto bg-black/30 p-2.5 rounded-lg border border-red-500/30">
              <div className="text-[10px] text-red-300 font-medium">İzin Verilen Azami Eşik</div>
              <div className="text-sm font-mono font-bold text-white">&lt; +0.85 (%85)</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-5 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border border-emerald-500/40 text-white p-3.5 rounded-xl shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  PORTFÖY ÇEŞİTLENDİRMESİ UYGUN (Korelasyon: {activeCorrelation >= 0 ? `+${activeCorrelation.toFixed(2)}` : activeCorrelation.toFixed(2)}): ÇOKLU MARUZİYET GÜVENLİ
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  <strong>{openPositionAsset}</strong> ve <strong>{candidateAsset}</strong> birlikte portföye dahil edilebilir. Korelasyon katsayısı güvenli bölgede.
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Emniyet Puanı: {Math.max(60, Math.round((1 - activeCorrelation) * 100))}/100
            </span>
          </div>
        </div>
      )}

      {/* BAŞLIK VE KONTROLLER */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">
                Portföy Korelasyon Matrisi & Maruziyet Kalkanı
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                MULTI-ASSET MATRIX
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              BIST, Kripto ve NASDAQ varlıklarının fiyat hareketleri arası Pearson Korelasyon Katsayısı (-1.00 ile +1.00)
            </p>
          </div>
        </div>

        {/* Piyasa Filtresi Butonları */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {(['ALL', 'CRYPTO', 'NASDAQ', 'BIST'] as const).map(m => (
            <button
              key={m}
              onClick={() => setFilterMarket(m)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                filterMarket === m
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'ALL' ? 'TÜMÜ (9x9)' : m === 'CRYPTO' ? '🪙 KRİPTO' : m === 'NASDAQ' ? '🇺🇸 NASDAQ' : '🇹🇷 BIST'}
            </button>
          ))}
        </div>
      </div>

      {/* İNTERAKTİF SİMÜLASYON SEÇİCİSİ */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-4">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <span>Maruziyet Kalkanı Denetleyicisi (Pozisyon Çakışma Testi):</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          {/* Açık Pozisyon */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Mevcut Açık Pozisyon:</label>
            <select
              value={openPositionAsset}
              onChange={e => setOpenPositionAsset(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            >
              {TRACKED_ASSETS.map(a => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol} ({a.market} - {a.name})
                </option>
              ))}
            </select>
          </div>

          {/* Yeni Alım Adayı */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Yeni Alım Yapılmak İstenen Aday Varlık:</label>
            <select
              value={candidateAsset}
              onChange={e => setCandidateAsset(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            >
              {TRACKED_ASSETS.map(a => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol} ({a.market} - {a.name})
                </option>
              ))}
            </select>
          </div>

          {/* Hızlı Senaryo Butonları */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-400">Hızlı Kuant Test Senaryoları:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setOpenPositionAsset('BTCUSDT');
                  setCandidateAsset('ETHUSDT');
                }}
                className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold hover:bg-rose-500/30 transition cursor-pointer"
              >
                BTC ↔ ETH (%88 Engel)
              </button>
              <button
                onClick={() => {
                  setOpenPositionAsset('NVDA');
                  setCandidateAsset('AAPL');
                }}
                className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold hover:bg-amber-500/30 transition cursor-pointer"
              >
                NVDA ↔ AAPL (%76 İzin)
              </button>
              <button
                onClick={() => {
                  setOpenPositionAsset('ASELS');
                  setCandidateAsset('BTCUSDT');
                }}
                className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold hover:bg-emerald-500/30 transition cursor-pointer"
              >
                ASELS ↔ BTC (-%12 Hedge)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KORELASYON ISI HARİTASI TABLOSU (HEATMAP MATRIX) */}
      <div className="overflow-x-auto bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-4">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr>
              <th className="p-2 text-left text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                Varlık
              </th>
              {displayAssets.map(col => (
                <th
                  key={col.symbol}
                  className={`p-2 text-[11px] font-mono font-bold border-b border-slate-800 ${
                    col.symbol === candidateAsset ? 'text-blue-400 bg-blue-500/10 rounded-t' : 'text-slate-300'
                  }`}
                >
                  {col.symbol.replace('USDT', '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayAssets.map(row => {
              const isOpenRow = row.symbol === openPositionAsset;
              return (
                <tr key={row.symbol} className="border-b border-slate-900/60 hover:bg-slate-800/30 transition">
                  {/* Satır Başlığı */}
                  <td
                    className={`p-2 text-left font-mono text-xs font-bold whitespace-nowrap ${
                      isOpenRow ? 'text-blue-400 bg-blue-500/10 rounded-l' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{row.symbol}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                        {row.market}
                      </span>
                    </div>
                  </td>

                  {/* Hücreler */}
                  {displayAssets.map(col => {
                    const isSelf = row.symbol === col.symbol;
                    const val = isSelf ? 1.0 : CORRELATION_MATRIX[row.symbol]?.[col.symbol] ?? 0.0;
                    const isSelectedPair =
                      (row.symbol === openPositionAsset && col.symbol === candidateAsset) ||
                      (row.symbol === candidateAsset && col.symbol === openPositionAsset);

                    return (
                      <td
                        key={`cell-${row.symbol}-${col.symbol}`}
                        onMouseEnter={() => setHoveredCell({ row: row.symbol, col: col.symbol, val })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => {
                          setOpenPositionAsset(row.symbol);
                          setCandidateAsset(col.symbol);
                        }}
                        className={`p-2 font-mono text-xs cursor-pointer transition select-none ${getCellColor(
                          val,
                          isSelf
                        )} ${isSelectedPair ? 'ring-2 ring-white scale-105 z-10' : ''}`}
                        title={`${row.symbol} ile ${col.symbol} Korelasyonu: ${val.toFixed(2)}`}
                      >
                        {val === 1 ? '1.00' : val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* LEJANT & KUANT RİSK AÇIKLAMALARI */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-slate-300">Korelasyon Skalası:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-rose-500/50 border border-rose-500 inline-block" />
            <span>&gt; +0.85 (Yüksek Risk - Veto)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500/30 inline-block" />
            <span>+0.70 ile +0.85 (Kuvvetli)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500/20 inline-block" />
            <span>+0.35 ile +0.70 (Orta)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500/30 inline-block" />
            <span>&lt; 0.00 (Negatif / İdeal Hedge)</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>Katsayı &gt;0.85 ise tek yönlü maruziyet riski nedeniyle otonom robot emri kilitler.</span>
        </div>
      </div>
    </div>
  );
};
