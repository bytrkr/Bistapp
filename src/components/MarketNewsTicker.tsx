import React, { useState, useEffect, useCallback } from 'react';
import { MarketDataInput } from '../types';
import {
  Search,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Radio,
  Clock,
} from 'lucide-react';
import { kapDaemon, LiveKapDisclosure } from '../services/kapDaemon';

export interface NewsItem {
  id: string;
  ticker: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  url: string;
}

interface MarketNewsTickerProps {
  currentTickerData?: MarketDataInput;
  onSelectTickerNews?: (ticker: string) => void;
}

const POPULAR_TICKERS = ['BIST30', 'ASELS', 'THYAO', 'GARAN', 'EREGL', 'TUPRS', 'AKBNK', 'BIMAS', 'SISE', 'SAHOL'];

export const MarketNewsTicker: React.FC<MarketNewsTickerProps> = ({
  onSelectTickerNews,
}) => {
  const [selectedTicker, setSelectedTicker] = useState<string>('BIST30');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'TÜM_HABERLER' | 'KAP_BILDIRIMLERI' | 'YÜKSEK_ETKI'>('TÜM_HABERLER');

  const mapDisclosuresToNews = useCallback((disclosures: LiveKapDisclosure[], tickerFilter: string): NewsItem[] => {
    const isAll = tickerFilter === 'BIST30' || tickerFilter === 'BIST';
    const filtered = isAll
      ? disclosures
      : disclosures.filter((d) => d.ticker === tickerFilter || d.companyName.toUpperCase().includes(tickerFilter));
    const sourceList = filtered.length > 0 ? filtered : disclosures;

    return sourceList.map((d) => ({
      id: d.id,
      ticker: d.ticker,
      title: d.title,
      summary: d.summary,
      source: d.source,
      time: d.publish_time,
      sentiment: d.sentiment,
      impact: d.impact,
      url: d.url,
    }));
  }, []);

  useEffect(() => {
    kapDaemon.startDaemon(25000);
    const unsubscribe = kapDaemon.subscribe((state) => {
      setNews(mapDisclosuresToNews(state.disclosures, selectedTicker));
      setLastSyncAt(state.lastSyncAt);
    });
    return () => {
      unsubscribe();
    };
  }, [selectedTicker, mapDisclosuresToNews]);

  const handleManualRefresh = useCallback(async () => {
    setIsLoading(true);
    await kapDaemon.fetchLiveDisclosures(selectedTicker === 'BIST30' ? 'ASELS' : selectedTicker, true);
    setIsLoading(false);
  }, [selectedTicker]);

  // Tab ve arama filtreleme
  const filteredNews = news.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !item.ticker.toLowerCase().includes(q) && !item.summary.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (activeTab === 'KAP_BILDIRIMLERI') {
      return item.source.toLowerCase().includes('kap') || item.title.toLowerCase().includes('kap');
    }
    if (activeTab === 'YÜKSEK_ETKI') {
      return item.impact === 'HIGH';
    }
    return true;
  });

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 sm:p-5 text-slate-100 shadow-xl space-y-4 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 relative">
            <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              BİST30 Otonom KAP Daemon &amp; Canlı Haber Akışı
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                kapDaemon CANLI
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Kamuyu Aydınlatma Platformu (KAP) ağ katmanından otonom olarak parse edilen gerçek zamanlı bildirimler.
            </p>
          </div>
        </div>

        {/* Refresh & Quick Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {lastSyncAt && (
            <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
              Senkron: {new Date(lastSyncAt).toLocaleTimeString('tr-TR')}
            </span>
          )}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-semibold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Ticker Marquee Bar */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 overflow-hidden flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
          <Zap className="w-3.5 h-3.5 fill-emerald-400" />
          <span>CANLI KAP</span>
        </div>

        <div className="overflow-hidden relative w-full text-xs font-mono text-slate-300">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-6">
            {news.map((item, index) => (
              <a
                key={`${item.id}-${index}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-emerald-300 transition group"
              >
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold text-[10px]">
                  {item.ticker}
                </span>
                <span className="truncate max-w-xs">{item.title}</span>
                <span className="text-[10px] text-slate-500">({item.time})</span>
                <span className="text-slate-700">•</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar & Ticker Filter Chips */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 font-mono text-xs no-scrollbar">
          {POPULAR_TICKERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelectedTicker(t);
                if (t !== 'BIST30' && onSelectTickerNews) {
                  onSelectTickerNews(t);
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                selectedTicker === t
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {t === 'BIST30' ? '🌐 Tümü (BİST30)' : t}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Canlı KAP bildirimi ara..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('TÜM_HABERLER')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'TÜM_HABERLER'
                ? 'bg-slate-800 text-emerald-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tüm Bildirimler ({news.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('KAP_BILDIRIMLERI')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'KAP_BILDIRIMLERI'
                ? 'bg-slate-800 text-emerald-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            KAP Bildirimleri
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('YÜKSEK_ETKI')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'YÜKSEK_ETKI'
                ? 'bg-slate-800 text-emerald-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Yüksek Etkili
          </button>
        </div>

        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Aktif Filtre: <strong className="text-slate-300">{selectedTicker}</strong>
        </span>
      </div>

      {/* News List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {filteredNews.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-amber-500/30 text-amber-300 text-xs font-mono font-bold animate-pulse">
            Canlı Veri Bekleniyor...
          </div>
        ) : (
          filteredNews.map((item, index) => {
            const isBullish = item.sentiment === 'BULLISH';
            const isBearish = item.sentiment === 'BEARISH';

            return (
              <div
                key={`${item.id}-${index}`}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 sm:p-3.5 transition space-y-2 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                        {item.ticker}
                      </span>

                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {item.time}
                      </span>

                      <span className="text-[10px] font-mono text-slate-500">
                        • {item.source}
                      </span>

                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          item.impact === 'HIGH'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.impact === 'HIGH' ? 'YÜKSEK ETKİ' : 'ORTA ETKİ'}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition shrink-0"
                    title="Bildirime Git"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {item.summary}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-900 font-mono text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">NLP Algısı:</span>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        isBullish
                          ? 'text-emerald-400'
                          : isBearish
                          ? 'text-rose-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {isBullish ? (
                        <>
                          <TrendingUp className="w-3 h-3" />
                          Pozitif Beklenti
                        </>
                      ) : isBearish ? (
                        <>
                          <TrendingDown className="w-3 h-3" />
                          Negatif / Baskı
                        </>
                      ) : (
                        <>
                          <Minus className="w-3 h-3" />
                          Nötr Etki
                        </>
                      )}
                    </span>
                  </div>

                  <span className="text-slate-500">Kaynak: {item.source}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
