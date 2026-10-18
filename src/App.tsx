import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Move,
  RotateCcw,
  Radio,
  Sparkles,
  Scale,
  Activity,
  X
} from 'lucide-react';
import { CryptoStreamTab } from './components/CryptoStreamTab';
import { NasdaqStreamTab } from './components/NasdaqStreamTab';
import { BistTab, ExecutionTrade, ForensicCaseItem, ChatMsg } from './components/BistTab';
import { SmartJuryDiagnosisCard, TcmbData, FinnhubData } from './components/SmartJuryDiagnosisCard';
import { AuthCard } from './components/AuthCard';
import { BISTAPP_TOKEN_KEY, logout } from './utils/api';
import { SaasSubscriptionModal } from './components/SaasSubscriptionModal';
import { EnterpriseValuationModal } from './components/EnterpriseValuationModal';
import { HeaderBar, HEADER_TABS } from './components/HeaderBar';
import { DraggablePanel, triggerResetAllDraggablePanels } from './components/DraggablePanel';
import { NlpSearchPanel } from './components/NlpSearchPanel';
import { KapFeedPanel } from './components/KapFeedPanel';
import { SignalBotCard } from './components/SignalBotCard';
import { kapDaemon } from './services/kapDaemon';
import { marketGateway } from './services/marketGateway';
import { executeQuantMindQuery, QUANT_MIND_TITLE } from './services/quantMind';

export type MarketType = 'BIST' | 'CRYPTO' | 'NASDAQ';

export type TabKey =
  | 'overview'
  | 'crypto'
  | 'nasdaq'
  | 'depth'
  | 'timeframe'
  | 'cubes'
  | 'portfolio'
  | 'takas'
  | 'quant'
  | 'forensic'
  | 'kap'
  | 'chat';

export default function App() {
  // URL hash tab ve pazar senkronizasyonu (KESİNLİKLE KORUNDU)
  const getInitialState = (): { market: MarketType; tab: TabKey } => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'crypto') return { market: 'CRYPTO', tab: 'crypto' };
      if (hash === 'nasdaq') return { market: 'NASDAQ', tab: 'nasdaq' };
      const tabMatch = HEADER_TABS.find(t => t.key === hash);
      if (tabMatch) {
        return { market: tabMatch.market, tab: tabMatch.key };
      }
    }
    return { market: 'BIST', tab: 'overview' };
  };

  const initial = useMemo(() => getInitialState(), []);
  const [selectedMarket, setSelectedMarket] = useState<MarketType>(initial.market);
  const [activeTab, setActiveTabState] = useState<TabKey>(initial.tab);
  const [isLiveAutoTrade, setIsLiveAutoTrade] = useState<boolean>(false);
  const [activeTicker, setActiveTicker] = useState<string>('ASELS');
  const [cryptoPair, setCryptoPair] = useState<string>('BTCUSDT');
  const [nasdaqSymbol, setNasdaqSymbol] = useState<string>('NVDA');
  
  // 🔐 Kimlik Doğrulama Durumu (Auth State) + Dev Bypass
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(BISTAPP_TOKEN_KEY) : null;
  });
  const [user, setUser] = useState<{ email: string; subscription_status: string } | null>(() => {
    return { email: 'bypass_operator@bistapp.com', subscription_status: 'PREMIUM' };
  });

  useEffect(() => {
    if (authToken) {
      fetch('http://127.0.0.1:8001/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setUser(data);
        else setUser({ email: 'test@bistapp.com', subscription_status: 'PREMIUM' });
      })
      .catch(() => setUser({ email: 'test@bistapp.com', subscription_status: 'PREMIUM' }));
    } else {
      setUser({ email: 'bypass_operator@bistapp.com', subscription_status: 'PREMIUM' });
    }
  }, [authToken]);

  const handleLoginSuccess = useCallback((token: string) => {
    setAuthToken(token);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
  }, []);

  // Sürüklenebilir Açılır Savaş Odası Pencereleri (Floating Tactical Windows)
  const [floatingWindows, setFloatingWindows] = useState<{
    nlpSearch: boolean;
    kapStream: boolean;
    signalDetection: boolean;
    juryReport: boolean;
  }>({
    nlpSearch: false,
    kapStream: false,
    signalDetection: false,
    juryReport: false,
  });

  const [nlpQuery, setNlpQuery] = useState<string>('');

  const toggleFloatingWindow = useCallback((key: keyof typeof floatingWindows) => {
    setFloatingWindows(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Alt modül ve ana sekme geçişi: Sarf-Nahiv kopukluğunu gideren atomik state güncelleyici
  const setActiveTab = useCallback((key: TabKey) => {
    setActiveTabState(key);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${key}`);
    }
    if (key === 'crypto') {
      setSelectedMarket('CRYPTO');
    } else if (key === 'nasdaq') {
      setSelectedMarket('NASDAQ');
    } else {
      setSelectedMarket('BIST');
    }
  }, []);

  // Pazar değiştirici (BIST, CRYPTO, NASDAQ)
  const handleMarketChange = useCallback((m: MarketType) => {
    setSelectedMarket(m);
    if (m === 'CRYPTO') {
      setActiveTabState('crypto');
      if (typeof window !== 'undefined') window.history.replaceState(null, '', '#crypto');
    } else if (m === 'NASDAQ') {
      setActiveTabState('nasdaq');
      if (typeof window !== 'undefined') window.history.replaceState(null, '', '#nasdaq');
    } else {
      setActiveTabState(prev => {
        const nextTab: TabKey = prev === 'crypto' || prev === 'nasdaq' ? 'overview' : prev;
        if (typeof window !== 'undefined') window.history.replaceState(null, '', `#${nextTab}`);
        return nextTab;
      });
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const match = HEADER_TABS.find(t => t.key === hash);
      if (match) {
        setActiveTabState(match.key);
        setSelectedMarket(match.market);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // YOL 1 (kapDaemon) & YOL 2 (marketGateway) canlı durum senkronizasyonu
  const [trades, setTrades] = useState<ExecutionTrade[]>([]);
  const [regime, setRegime] = useState<'BULL' | 'SIDEWAYS' | 'BEAR' | 'HIGH_VOL'>('BULL');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [forensicCases, setForensicCases] = useState<ForensicCaseItem[]>([]);
  const [auditCount, setAuditCount] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      role: 'model',
      text: `- **[ANOMALİ & Z-SKOR DURUMU]:** ${QUANT_MIND_TITLE} çekirdeği aktif. \`anomalyScanner\` üzerinden Sanitize Z-Skor ve hacim kırılımları gerçek zamanlı taranmaktadır.\n- **[L2 OBI & TAHTA BASKISI]:** \`marketGateway\` L2 emir defteri dengesi (OBI) ve kurumsal saklama/takas akışları saf pazar bağlam köprüsüne bağlandı.\n- **[AKTİF KAP AKIŞI]:** \`kapDaemon\` kamuya açık resmi bildirimlerin algoritmik fiyatlama etkilerini anlık izlemektedir.\n- **[STRATEJİK OCO HEDEFİ]:** Aktif pazar sembol kodu (örn. ASELS, EREGL, THYAO) veya kuant komutu (/analiz, /senaryo, /takas, /stop) girerek keskin olasılık ve OCO (%TP / %SL) matrisini başlatın.`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Pozisyon Takibi State
  const [portfolio, setPortfolio] = useState<{ lot: number; cost: number }>({ lot: 1200, cost: 36.80 });
  const [isSaasOpen, setIsSaasOpen] = useState<boolean>(false);
  const [isEnterpriseOpen, setIsEnterpriseOpen] = useState<boolean>(false);

  // TCMB EVDS, Finnhub Sentiment, Adli Vaka ve Audit Trail Verileri
  const [tcmbMacro, setTcmbMacro] = useState<TcmbData | null>(null);
  const [finnhubSentiment, setFinnhubSentiment] = useState<FinnhubData | null>(null);
  const [isJuryVetoed, setIsJuryVetoed] = useState<boolean>(false);

  // Otonom çift yollu gerçek akışı başlat (kapDaemon + marketGateway)
  useEffect(() => {
    kapDaemon.startDaemon(25000);
    marketGateway.connectGateway(activeTicker, 12000);

    const unsubGateway = marketGateway.subscribe((snap) => {
      if (snap.executionTrades.length > 0) {
        setTrades(snap.executionTrades);
      }
    });

    return () => {
      unsubGateway();
    };
  }, []);

  useEffect(() => {
    kapDaemon.setActiveTicker(activeTicker);
    marketGateway.setActiveSymbol(activeTicker).catch(() => {});
  }, [activeTicker]);

  const loadGlobalServices = useCallback(() => {
    fetch('/api/forensic-cases')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.cases)) {
          setForensicCases(data.cases);
        }
      })
      .catch(() => {});

    fetch('/api/macro/tcmb')
      .then(r => r.json())
      .then(d => {
        if (d.success) setTcmbMacro(d.data);
      })
      .catch(() => {});

    const sym = selectedMarket === 'NASDAQ' ? (nasdaqSymbol || 'NVDA') : activeTicker || 'NVDA';
    fetch(`/api/sentiment/finnhub?symbol=${encodeURIComponent(sym)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setFinnhubSentiment(d.data);
          setIsJuryVetoed(Boolean(d.data.isVetoed));
        }
      })
      .catch(() => {});

    fetch('/api/system/audit-trail')
      .then(r => r.json())
      .then(d => {
        if (d.success && typeof d.count === 'number') {
          setAuditCount(d.count);
        }
      })
      .catch(() => {});
  }, [selectedMarket, activeTicker, nasdaqSymbol]);

  useEffect(() => {
    loadGlobalServices();
  }, [loadGlobalServices]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadGlobalServices();
    kapDaemon.fetchLiveDisclosures(activeTicker, true).catch(() => {});
    marketGateway.fetchLiveSnapshot(activeTicker).catch(() => {});
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }, [loadGlobalServices, activeTicker]);

  const handleSendChat = useCallback(async (msgOverride?: string) => {
    const textToSend = (msgOverride || '').trim();
    if (!textToSend || isChatLoading) return;

    const userMessage: ChatMsg = {
      role: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    const contextSymbol =
      selectedMarket === 'CRYPTO'
        ? cryptoPair
        : selectedMarket === 'NASDAQ'
        ? nasdaqSymbol
        : activeTicker;

    try {
      const result = await executeQuantMindQuery(
        textToSend,
        contextSymbol,
        [...chatMessages, userMessage],
        selectedMarket
      );
      if (selectedMarket === 'BIST' && result.context.market === 'BIST' && result.context.symbol && result.context.symbol !== activeTicker) {
        setActiveTicker(result.context.symbol);
      } else if (selectedMarket === 'CRYPTO' && result.context.market === 'CRYPTO' && result.context.symbol !== cryptoPair) {
        setCryptoPair(result.context.symbol);
      } else if (selectedMarket === 'NASDAQ' && result.context.market === 'NASDAQ' && result.context.symbol !== nasdaqSymbol) {
        setNasdaqSymbol(result.context.symbol);
      }
      setChatMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: result.reply,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }, [isChatLoading, activeTicker, cryptoPair, nasdaqSymbol, selectedMarket, chatMessages]);

  const activeMarketSymbol =
    selectedMarket === 'CRYPTO'
      ? cryptoPair
      : selectedMarket === 'NASDAQ'
      ? nasdaqSymbol
      : activeTicker;

  // Dev Bypass: iframe önizlemesinde testlerin yapılamaması durumuna karşı geçici olarak devre dışı bırakıldı.
  // Gerçek auth kodu korunmaktadır.
  /*
  if (!authToken) {
    return <AuthCard onLoginSuccess={handleLoginSuccess} />;
  }
  */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* 🟢 YEKPARE ÜST KONTROL VE SEKME YÖNLENDİRME ÇUBUĞU (HeaderBar) */}
      <HeaderBar
        user={user}
        onLogout={handleLogout}
        selectedMarket={selectedMarket}
        onMarketChange={handleMarketChange}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeTicker={activeTicker}
        onSelectTicker={(ticker) => {
          setActiveTicker(ticker);
          if (selectedMarket !== 'BIST') {
            handleMarketChange('BIST');
          }
        }}
        cryptoPair={cryptoPair}
        onSelectCryptoPair={(pair) => {
          setCryptoPair(pair);
          if (selectedMarket !== 'CRYPTO') {
            handleMarketChange('CRYPTO');
          }
        }}
        nasdaqSymbol={nasdaqSymbol}
        onSelectNasdaqSymbol={(sym) => {
          setNasdaqSymbol(sym);
          if (selectedMarket !== 'NASDAQ') {
            handleMarketChange('NASDAQ');
          }
        }}
        regime={regime}
        onRegimeChange={setRegime}
        isLiveAutoTrade={isLiveAutoTrade}
        onToggleAutoTrade={setIsLiveAutoTrade}
        onOpenSaas={() => setIsSaasOpen(true)}
        onOpenEnterprise={() => setIsEnterpriseOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        auditCount={auditCount}
      />

      {/* 🚀 ANA İÇERİK KAPSAYICISI (Sürüklenebilir Savaş Odası Pencereleri + Reaktif Katman Görünümü) */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* 🧭 TAKTİKSEL SÜRÜKLENEBİLİR AÇILIR PENCERE DOCK ÇUBUĞU */}
        <div className="bg-slate-900/75 backdrop-blur-xl border border-emerald-500/25 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-[0_8px_28px_rgba(0,0,0,0.65)]">
          <div className="flex items-center gap-2 text-xs">
            <span className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300">
              <Move className="w-3.5 h-3.5" />
            </span>
            <div>
              <span className="font-mono font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Sürüklenebilir Taktiksel Savaş Odası Pencereleri
              </span>
              <span className="hidden md:inline text-[11px] text-slate-400 ml-2">
                · Başlık çubuklarından (Pointer Drag) tutup taşıyın, çift tıklayarak hizalayın
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => toggleFloatingWindow('nlpSearch')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                floatingWindows.nlpSearch
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.45)]'
                  : 'bg-slate-950/90 text-slate-300 border-slate-800 hover:border-emerald-500/40 hover:text-emerald-300'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>NLP Arama</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFloatingWindow('kapStream')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                floatingWindows.kapStream
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.45)]'
                  : 'bg-slate-950/90 text-slate-300 border-slate-800 hover:border-emerald-500/40 hover:text-emerald-300'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>KAP Akışı</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFloatingWindow('signalDetection')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                floatingWindows.signalDetection
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.45)]'
                  : 'bg-slate-950/90 text-slate-300 border-slate-800 hover:border-cyan-500/40 hover:text-cyan-300'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Sinyal Tespiti</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFloatingWindow('juryReport')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                floatingWindows.juryReport
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.45)]'
                  : 'bg-slate-950/90 text-slate-300 border-slate-800 hover:border-cyan-500/40 hover:text-cyan-300'
              }`}
            >
              <Scale className="w-3 h-3" />
              <span>Jüri Raporu</span>
            </button>

            <button
              type="button"
              onClick={triggerResetAllDraggablePanels}
              className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-emerald-500/20 border border-cyan-500/35 hover:border-emerald-400 text-[11px] font-mono font-bold text-cyan-300 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
              title="Tüm sürüklenmiş pencereleri orijinal ızgara konumlarına sıfırla"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Tümünü Hizala</span>
            </button>
          </div>
        </div>

        {/* 🪟 AÇILIR SÜRÜKLENEBİLİR SAVAŞ ODASI PENCERELERİ (FLOATING DRAGGABLE WINDOWS) */}
        {(floatingWindows.nlpSearch ||
          floatingWindows.kapStream ||
          floatingWindows.signalDetection ||
          floatingWindows.juryReport) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {floatingWindows.nlpSearch && (
              <NlpSearchPanel
                isOpen={floatingWindows.nlpSearch}
                onClose={() => toggleFloatingWindow('nlpSearch')}
                activeTicker={activeTicker}
                onSelectTicker={(ticker) => {
                  setActiveTicker(ticker);
                  if (selectedMarket !== 'BIST') {
                    handleMarketChange('BIST');
                  }
                }}
                onExecuteQuantMindQuery={(q) => {
                  void handleSendChat(q);
                }}
                mode="floating"
              />
            )}

            {floatingWindows.kapStream && (
              <DraggablePanel
                id="floating-kap-stream-window"
                title={`KAP Akışı Canlı Penceresi (${activeTicker})`}
                subtitle="YOL 1: kapDaemon Anlık Bildirim Radarı"
                badgeText="KAP AKIŞI"
                accentColor="emerald"
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleFloatingWindow('kapStream')}
                    className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Pencereyi Kapat"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <KapFeedPanel currentTicker={activeTicker} onSelectTicker={setActiveTicker} />
                </div>
              </DraggablePanel>
            )}

            {floatingWindows.signalDetection && (
              <DraggablePanel
                id="floating-signal-detection-window"
                title={`Sinyal Tespiti & Kırılım Botu (${activeMarketSymbol})`}
                subtitle="Z-Skor & L2 OBI Otonom Sinyal Penceresi"
                badgeText="SİNYAL TESPİTİ"
                accentColor="cyan"
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleFloatingWindow('signalDetection')}
                    className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Pencereyi Kapat"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <SignalBotCard />
                </div>
              </DraggablePanel>
            )}

            {floatingWindows.juryReport && (
              <DraggablePanel
                id="floating-jury-report-window"
                title={`Jüri Raporu & Teşhis Penceresi (${activeMarketSymbol})`}
                subtitle="6 Kuant Ajanı Konsensüs Kararı"
                badgeText="JÜRİ RAPORU"
                accentColor="cyan"
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleFloatingWindow('juryReport')}
                    className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Pencereyi Kapat"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <SmartJuryDiagnosisCard
                    marketType={selectedMarket}
                    ticker={activeMarketSymbol}
                    onVetoStatusChange={setIsJuryVetoed}
                  />
                </div>
              </DraggablePanel>
            )}
          </div>
        )}

        {/* 🪙 KRİPTO CANLI AKIŞI & L2 OBI SEKMESİ */}
        {selectedMarket === 'CRYPTO' && (
          <div className="animate-fadeIn">
            <CryptoStreamTab
              isLiveAutoTrade={isLiveAutoTrade}
              onToggleAutoTrade={setIsLiveAutoTrade}
              activePair={cryptoPair}
              onSelectPair={setCryptoPair}
            />
          </div>
        )}

        {/* 🇺🇸 NASDAQ CANLI AKIŞI & L2 OBI SEKMESİ */}
        {selectedMarket === 'NASDAQ' && (
          <div className="animate-fadeIn">
            <NasdaqStreamTab
              isLiveAutoTrade={isLiveAutoTrade}
              onToggleAutoTrade={setIsLiveAutoTrade}
              activeSymbol={nasdaqSymbol}
              onSelectSymbol={setNasdaqSymbol}
            />
          </div>
        )}

        {/* 🇹🇷 BIST PAZAR GÖRÜNÜMÜ & ALT MODÜLLERİ */}
        {selectedMarket === 'BIST' && (
          <BistTab
            activeTicker={activeTicker}
            onSelectTicker={setActiveTicker}
            activeSubTab={activeTab}
            onSelectSubTab={(subTab) => setActiveTab(subTab as TabKey)}
            isLiveAutoTrade={isLiveAutoTrade}
            onToggleAutoTrade={setIsLiveAutoTrade}
            regime={regime}
            onRegimeChange={setRegime}
            tcmbMacro={tcmbMacro}
            finnhubSentiment={finnhubSentiment}
            isJuryVetoed={isJuryVetoed}
            onVetoStatusChange={setIsJuryVetoed}
            portfolio={portfolio}
            onUpdatePortfolio={setPortfolio}
            trades={trades}
            forensicCases={forensicCases}
            chatMessages={chatMessages}
            isChatLoading={isChatLoading}
            onSendChat={handleSendChat}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 px-4 py-4 text-center text-xs text-slate-500 mt-auto">
        <p>© 2026 MT16 Bistapp Kuant Terminali (v3.0-quant-mind-deploy). MT16 QuantMind (Kıdemli Kuant Stratejisti) &amp; Çift Yollu Gerçek Akış.</p>
      </footer>

      {/* SaaS Abonelik Modal */}
      <SaasSubscriptionModal isOpen={isSaasOpen} onClose={() => setIsSaasOpen(false)} />

      {/* Enterprise & IP Değerleme Modal */}
      <EnterpriseValuationModal isOpen={isEnterpriseOpen} onClose={() => setIsEnterpriseOpen(false)} />
    </div>
  );
}