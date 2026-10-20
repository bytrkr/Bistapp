import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  RefreshCw,
  ExternalLink,
  Clock,
  Search,
  Filter,
  FileText,
  AlertCircle,
  Building,
  CheckCircle,
} from 'lucide-react';

export interface KapItem {
  id: string;
  ticker: string;
  title: string;
  publishDate: string;
  disclosureType: string;
  url: string;
  summary?: string;
  companyName?: string;
}

interface KapRadarProps {
  selectedTicker?: string;
  onSelectTicker?: (ticker: string) => void;
}

const QUICK_TICKERS = ['TÜMÜ', 'ASELS', 'THYAO', 'GARAN', 'EREGL', 'TUPRS', 'KCHOL', 'BIMAS', 'SISE'];

export const KapRadar: React.FC<KapRadarProps> = ({
  selectedTicker = 'ASELS',
  onSelectTicker,
}) => {
  const [activeTicker, setActiveTicker] = useState<string>('TÜMÜ');
  const [disclosures, setDisclosures] = useState<KapItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);
  const [simulationWarning, setSimulationWarning] = useState<string>('');

  // Eğer dışarıdan gelen selectedTicker değişirse ve geçerliyse onu yansıt
  useEffect(() => {
    if (selectedTicker && selectedTicker !== 'BIST' && selectedTicker !== 'TÜMÜ') {
      setActiveTicker(selectedTicker.toUpperCase().replace(/\.IS$/i, ''));
    }
  }, [selectedTicker]);

  const fetchDisclosures = useCallback(async (isManualRefresh = false) => {
    setIsLoading(true);
    try {
      const isAll = activeTicker === 'TÜMÜ' || activeTicker === 'BIST' || activeTicker === 'BIST30';
      const endpoint = isAll
        ? `/api/news?limit=25${isManualRefresh ? '&refresh=true' : ''}`
        : `/api/news/${encodeURIComponent(activeTicker)}${isManualRefresh ? '?refresh=true' : ''}`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : Array.isArray(json.items) ? json.items : [];
        setDisclosures(items);
        const live = Boolean(json.is_live ?? (items.length > 0 && items.some((it: any) => it.isLive !== false)));
        setIsLiveStream(live);
        setSimulationWarning(json.simulation_warning || (!live ? '⚠️ Simüle Veri: Canlı KAP veri akışına ulaşılamadı.' : ''));
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.warn('[KapRadar] Haber akışı alınamadı:', err);
      setIsLiveStream(false);
      setSimulationWarning('⚠️ Simüle Veri: Canlı akış bağlantı hatası.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTicker]);

  useEffect(() => {
    fetchDisclosures();
    const interval = setInterval(() => {
      fetchDisclosures();
    }, 35000); // 35 saniyede bir otomatik arka plan tazeleme (cache TTL 30s)
    return () => clearInterval(interval);
  }, [fetchDisclosures]);

  const filteredDisclosures = disclosures.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.ticker.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      (item.summary && item.summary.toLowerCase().includes(q)) ||
      (item.companyName && item.companyName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-slate-100 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 relative">
            <Radio className="w-5 h-5 animate-pulse text-amber-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          </div>
          <div>
            <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
              KAP Canlı Bildirim Radarı
              {isLiveStream ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CANLI (kap.org.tr)
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  ⚠️ Simüle Veri
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Kamuyu Aydınlatma Platformu anlık özel durum açıklamaları, finansal raporlar ve sözleşmeler.
            </p>
          </div>
        </div>

        {/* Quick Refresh Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchDisclosures(true)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Simüle Veri Uyarısı */}
      {!isLiveStream && simulationWarning && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-mono text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{simulationWarning} Uzman ajanlar bu verilere tek başına güvenmez.</span>
        </div>
      )}

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 font-mono text-xs no-scrollbar">
          {QUICK_TICKERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setActiveTicker(t);
                if (onSelectTicker && t !== 'TÜMÜ') onSelectTicker(t);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                activeTicker === t
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {t === 'TÜMÜ' ? '🌐 Tüm Bildirimler' : t}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hisse veya bildirim konusu ara..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition"
          />
        </div>
      </div>

      {/* Disclosures Feed List */}
      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
        {isLoading && disclosures.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800 text-slate-400 text-xs font-mono flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
            <span>KAP bildirimleri sorgulanıyor...</span>
          </div>
        ) : filteredDisclosures.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800 text-slate-400 text-xs font-mono space-y-2">
            <AlertCircle className="w-6 h-6 text-slate-500 mx-auto" />
            <p>Seçili hisse veya arama kriterine uygun KAP bildirimi bulunamadı.</p>
          </div>
        ) : (
          filteredDisclosures.map((item) => {
            const dateStr = item.publishDate ? new Date(item.publishDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

            return (
              <div
                key={item.id}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 sm:p-3.5 transition space-y-2 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                        {item.ticker}
                      </span>

                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {dateStr}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                        {item.disclosureType}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-amber-300 transition leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition shrink-0"
                    title="KAP'ta Görüntüle"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {item.summary && item.summary !== item.title && (
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {item.summary}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-900 font-mono text-[10px] text-slate-500">
                  <span className="truncate max-w-[280px]">
                    {item.companyName || `${item.ticker} Pay Piyasası`}
                  </span>
                  <span>ID: {item.id}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span>Son Senkronizasyon: {lastRefreshedAt.toLocaleTimeString('tr-TR')}</span>
        <span>Kaynak: Kamuyu Aydınlatma Platformu (KAP)</span>
      </div>
    </div>
  );
};

export default KapRadar;
