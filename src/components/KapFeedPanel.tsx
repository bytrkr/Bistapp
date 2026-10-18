import React, { useState, useEffect, useCallback } from 'react';
import {
  Newspaper,
  Sparkles,
  Activity,
  Zap,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Radio
} from 'lucide-react';
import { safeToFixed } from '../utils/format';
import { kapDaemon, LiveKapDisclosure, KapImpactAnalysis } from '../services/kapDaemon';

export type KapDisclosureItem = LiveKapDisclosure;

interface KapFeedPanelProps {
  onSelectTicker?: (ticker: string) => void;
  onOpenSmartOrder?: (ticker: string, price: number) => void;
  currentTicker?: string;
}

export const KapFeedPanel: React.FC<KapFeedPanelProps> = ({
  onSelectTicker,
  onOpenSmartOrder,
  currentTicker = 'ASELS'
}) => {
  const [feed, setFeed] = useState<LiveKapDisclosure[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('ALL');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Canlı KAP Metin Analiz Laboratuvarı Durumu
  const [customTicker, setCustomTicker] = useState<string>(currentTicker.toUpperCase().replace(/\.IS$/i, ''));
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customBody, setCustomBody] = useState<string>('');
  const [customAnalysis, setCustomAnalysis] = useState<KapImpactAnalysis | null>(null);
  const [analyzingCustom, setAnalyzingCustom] = useState<boolean>(false);

  useEffect(() => {
    const clean = (currentTicker || 'ASELS').toUpperCase().replace(/\.IS$/i, '');
    setCustomTicker(clean);
    kapDaemon.setActiveTicker(clean);
  }, [currentTicker]);

  useEffect(() => {
    kapDaemon.startDaemon(25000);
    const unsubscribe = kapDaemon.subscribe((state) => {
      const list = state.tickerDisclosures.length > 0 ? state.tickerDisclosures : state.disclosures;
      setFeed(list);
      setLastSyncAt(state.lastSyncAt);
      setLatencyMs(state.lastLatencyMs);
      if (state.syncCount > 0) {
        setLoading(false);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setLoading(true);
    const clean = (currentTicker || 'ASELS').toUpperCase().replace(/\.IS$/i, '');
    await kapDaemon.fetchLiveDisclosures(clean, true);
    setLoading(false);
  }, [currentTicker]);

  const handleAnalyzeCustom = async () => {
    if (!customTitle.trim() && !customBody.trim()) return;
    setAnalyzingCustom(true);
    try {
      const result = await kapDaemon.analyzeDisclosureText(customTicker, customTitle, customBody);
      setCustomAnalysis(result);
    } catch (err) {
      console.error('KAP Daemon NLP analyze error:', err);
    } finally {
      setAnalyzingCustom(false);
    }
  };

  const handleSelectLiveDisclosureForLab = (item: LiveKapDisclosure) => {
    setCustomTicker(item.ticker);
    setCustomTitle(item.title);
    setCustomBody(item.body_text);
    setCustomAnalysis(item.analysis);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFeed = feed.filter((item) => {
    if (selectedCategory !== 'ALL' && item.disclosure_type !== selectedCategory) {
      return false;
    }
    if (selectedSentiment === 'POSITIVE' && item.analysis.impact_score < 20) {
      return false;
    }
    if (selectedSentiment === 'NEGATIVE' && item.analysis.impact_score > -20) {
      return false;
    }
    if (selectedSentiment === 'NEUTRAL' && (item.analysis.impact_score >= 20 || item.analysis.impact_score <= -20)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Üst Başlık & KAP Daemon Kontrol Paneli */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  KAP Daemon — Canlı Kamuyu Aydınlatma &amp; NLP Etki Motoru
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  YOL 1: kapDaemon Aktif ({latencyMs}ms)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                KAP kamuya açık bildirim akışlarını anlık parse eder, Ciro/Özsermaye oranını ve -100/+100 etki skorunu canlı hesaplar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {lastSyncAt && (
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                Son Senkron: {new Date(lastSyncAt).toLocaleTimeString('tr-TR')}
              </span>
            )}
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Canlı Akışı Yenile</span>
            </button>
          </div>
        </div>

        {/* Filtreleme Çubukları */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Kategori:
            </span>
            {[
              { id: 'ALL', label: 'Tümü' },
              { id: 'YENI_IS_ILISKISI', label: '💼 Yeni Sözleşme' },
              { id: 'FINANSAL_RAPOR', label: '📊 Bilanço & Operasyon' },
              { id: 'PAY_GERI_ALIMI', label: '🛡️ Geri Alım' },
              { id: 'YATIRIM_TESVIK', label: '⚡ Yatırım & Teşvik' },
              { id: 'VBTS_TEDBIR', label: '⚠️ VBTS & Tedbir' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-400 font-mono mr-1">Duygu:</span>
            {[
              { id: 'ALL', label: 'Tümü' },
              { id: 'POSITIVE', label: '🟢 Pozitif (>+20)' },
              { id: 'NEGATIVE', label: '🔴 Negatif (<-20)' },
              { id: 'NEUTRAL', label: '⚪ Nötr' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedSentiment(st.id)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  selectedSentiment === st.id
                    ? 'bg-slate-700 text-white font-bold border border-slate-500'
                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🔬 Canlı KAP Metin Ayrıştırma & Derin NLP Laboratuvarı */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Canlı KAP Bildirim Metni NLP Derin Analiz Konsolu
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-300 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            kapDaemon.analyzeDisclosureText()
          </span>
        </div>

        {/* Canlı Akıştan Hızlı Bildirim Seçimi (Sıfır Statik Dizi — Doğrudan Canlı Akıştan Beslenir) */}
        {feed.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[11px] text-slate-400 font-mono">Canlı Akıştan Yükle:</span>
            {feed.slice(0, 4).map((liveItem) => (
              <button
                key={liveItem.id}
                onClick={() => handleSelectLiveDisclosureForLab(liveItem)}
                className="px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-slate-800/80 hover:bg-emerald-900/40 text-emerald-200 border border-emerald-700/40 transition cursor-pointer truncate max-w-[240px]"
              >
                [{liveItem.ticker}] {liveItem.title}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1 space-y-2">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Hisse Sembolü
              </label>
              <input
                type="text"
                value={customTicker}
                onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
                placeholder="Örn: ASELS"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Bildirim Başlığı
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Canlı bildirim başlığı girin..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="md:col-span-3 flex flex-col justify-between gap-2">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                KAP Açıklama Metni (Tutar, Para Birimi, Detaylar)
              </label>
              <textarea
                rows={3}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                placeholder="Canlı KAP bildirim metnini buraya yapıştırın veya yukarıdaki canlı bildirimlerden birine tıklayın..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[10px] text-slate-500 font-mono">
                Canlı kur ve yıllık ciro kıyaslaması otomatik hesaplanır.
              </span>
              <button
                onClick={handleAnalyzeCustom}
                disabled={analyzingCustom || (!customTitle.trim() && !customBody.trim())}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-mono font-bold rounded-xl shadow-lg transition cursor-pointer shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{analyzingCustom ? 'Analiz Ediliyor...' : 'Canlı NLP Motoruyla Ayrıştır'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Özel Analiz Sonucu */}
        {customAnalysis && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-emerald-500/50 space-y-3 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/40">
                  {customAnalysis.ticker}
                </span>
                <span className="text-xs font-bold text-white">
                  {customAnalysis.company_name}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {customAnalysis.disclosure_type}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-mono">Etki Skoru:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black border ${
                      customAnalysis.impact_score > 30
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : customAnalysis.impact_score < -30
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {customAnalysis.impact_score > 0 ? `+${customAnalysis.impact_score}` : customAnalysis.impact_score} / 100
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    customAnalysis.recommended_action.includes('AL')
                      ? 'bg-emerald-600 text-white'
                      : customAnalysis.recommended_action.includes('SAT')
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {customAnalysis.recommended_action}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Çıkarılan Tutar</span>
                <span className="text-emerald-400 font-bold">
                  {customAnalysis.monetary?.currency !== 'TL' && (customAnalysis.monetary?.amount_raw ?? 0) > 0 ? (
                    `${safeToFixed(customAnalysis.monetary?.amount_raw ?? 0, 0)} ${customAnalysis.monetary?.currency} (₺${safeToFixed(customAnalysis.extracted_amount_tl_million, 1)}M)`
                  ) : (
                    `₺${safeToFixed(customAnalysis.extracted_amount_tl_million, 1)}M`
                  )}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Yıllık Ciro Oranı</span>
                <span className={`font-bold ${customAnalysis.ciro_ratio_pct > 10 ? 'text-emerald-300' : 'text-slate-200'}`}>
                  %{safeToFixed(customAnalysis.ciro_ratio_pct, 1)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Beklenen Volatilite</span>
                <span className="text-cyan-300 font-bold">
                  ±%{safeToFixed(customAnalysis.expected_volatility_pct, 1)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Ayrıştırma Gecikmesi</span>
                <span className="text-slate-300 font-bold">
                  {customAnalysis.execution_time_ms} ms
                </span>
              </div>
            </div>

            {customAnalysis.reasons && customAnalysis.reasons.length > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-slate-400 block text-[11px]">AI Gerekçe &amp; Yorum:</span>
                {customAnalysis.reasons.map((r: string, idx: number) => (
                  <p key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    <span>{r}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 📰 Canlı KAP Akışı Listesi */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Canlı KAP Daemon Bildirim Akışı ({filteredFeed.length})
          </h3>
        </div>

        {loading && filteredFeed.length === 0 ? (
          <div className="p-12 text-center text-amber-300 font-mono text-xs font-bold animate-pulse">
            Canlı Veri Bekleniyor...
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-amber-500/30 rounded-2xl text-amber-300 text-xs font-mono font-bold animate-pulse">
            Canlı Veri Bekleniyor...
          </div>
        ) : (
          filteredFeed.map((item) => {
            const an = item.analysis;
            const isPos = an.impact_score > 20;
            const isNeg = an.impact_score < -20;
            const isExpanded = !!expandedItems[item.id];

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-md backdrop-blur-sm ${
                  isPos
                    ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-500/70'
                    : isNeg
                    ? 'bg-slate-900/90 border-rose-500/40 hover:border-rose-500/70'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onSelectTicker && onSelectTicker(item.ticker)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-black text-sm hover:border-emerald-500 hover:text-emerald-400 transition cursor-pointer shrink-0"
                    >
                      {item.ticker}
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {item.title}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-mono text-slate-400">
                        <span className="text-slate-500">{item.publish_time}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.disclosure_type}
                        </span>
                        {an.ciro_ratio_pct > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">
                              Cironun %{safeToFixed(an.ciro_ratio_pct, 1)}&apos;i
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skor & Aksiyon Rozeti */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-mono block">AI Etki Skoru</span>
                      <span
                        className={`text-sm font-black font-mono px-2 py-0.5 rounded-lg border ${
                          isPos
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isNeg
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {an.impact_score > 0 ? `+${an.impact_score}` : an.impact_score}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                        an.recommended_action.includes('AL')
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-md'
                          : an.recommended_action.includes('SAT')
                          ? 'bg-rose-600 text-white shadow-rose-500/20 shadow-md'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {an.recommended_action}
                    </span>
                  </div>
                </div>

                {/* Özet ve Tutar Şeridi */}
                <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    {an.extracted_amount_tl_million > 0 && (
                      <span className="font-mono text-emerald-300 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50">
                        ₺{safeToFixed(an.extracted_amount_tl_million, 1)} Milyon TL
                      </span>
                    )}
                    <span className="text-slate-400 font-mono">
                      Volatilite: <strong className="text-slate-200">±%{safeToFixed(an.expected_volatility_pct, 1)}</strong>
                    </span>
                    <span className="text-slate-400 font-mono">
                      NLP Gecikmesi: <strong className="text-slate-300">{an.execution_time_ms} ms</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenSmartOrder && (
                      <button
                        onClick={() => onOpenSmartOrder(item.ticker, 100)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-mono font-bold rounded-lg transition cursor-pointer"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Akıllı Emir Kur</span>
                      </button>
                    )}

                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-white text-xs font-mono rounded bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <span>{isExpanded ? 'Gizle' : 'Detay'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Genişletilmiş Bildirim Metni ve Gerekçeler */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs animate-fade-in">
                    <div className="p-3 rounded-xl bg-slate-950 text-slate-300 font-sans leading-relaxed border border-slate-800/80">
                      <span className="text-slate-500 font-mono block text-[10px] mb-1">KAP BİLDİRİM METNİ:</span>
                      {item.body_text}
                    </div>

                    {an.reasons && an.reasons.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-900/40 text-slate-300 space-y-1 font-mono">
                        <span className="text-emerald-400 font-bold block text-[11px]">AI ETKİ GEREKÇELERİ:</span>
                        {an.reasons.map((r, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400">✓</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
