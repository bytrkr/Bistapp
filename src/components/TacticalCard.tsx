import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileCode2,
  Download,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Activity,
  Cpu,
  Shield,
  Radio,
  Sparkles,
  ExternalLink,
  UploadCloud,
  FileText,
  Loader2,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';
import {
  TacticalCollectorInput,
  collectTacticalVerdict,
  UnifiedVerdict,
} from '../utils/tacticalCollector';
import {
  buildExternalLLMPrompt,
  buildToonPayload,
  buildSinglePageHtml5Report,
} from '../utils/copyForLLM';
import { LiveKapDisclosure } from '../services/kapDaemon';
import { DynamicHtml5Container } from './DynamicHtml5Container';
import { SmartJuryDiagnosisCard } from './SmartJuryDiagnosisCard';
import { OrderBookHeatmapVisualizer } from './OrderBookHeatmapVisualizer';
import { IcebergDetectorCard } from './IcebergDetectorCard';
import { PortfolioCorrelationCard } from './PortfolioCorrelationCard';
import { MamPropDashboardCard } from './MamPropDashboardCard';
import { TrackRecordPanel } from './TrackRecordPanel';
import { BinanceTestnetExecutorCard } from './BinanceTestnetExecutorCard';
import { AlpacaExecutorCard } from './AlpacaExecutorCard';
import { VolatileCircuitBreakerCard } from './VolatileCircuitBreakerCard';
import { SystemHealthLatencyCard } from './SystemHealthLatencyCard';
import { SignalBotCard } from './SignalBotCard';
import { MarketNewsTicker } from './MarketNewsTicker';
import { WarrenAiChat } from './WarrenAiChat';
import { QuantMindChatMessage } from '../services/quantMind';
import { manipulationEngine } from '../services/manipulationEngine';
import { FinalDecision } from '../types/quantEngine';

export interface TacticalCardProps {
  collectorInput: TacticalCollectorInput;
  disclosures?: LiveKapDisclosure[];
  onSelectTicker?: (ticker: string) => void;
  isLiveAutoTrade?: boolean;
  onToggleAutoTrade?: (val: boolean) => void;
  onVetoStatusChange?: (vetoed: boolean) => void;
  chatMessages?: QuantMindChatMessage[];
  isChatLoading?: boolean;
  onSendChat?: (msg: string) => void;
  orderBookLevels?: {
    bids: { price: number; qty: number; total: number }[];
    asks: { price: number; qty: number; total: number }[];
  };
}

type DetailDrawerTab =
  | 'CUBES_XAI'
  | 'JURY_RSS'
  | 'BOOKMAP_WHALE'
  | 'PORTFOLIO_MAM'
  | 'OCO_SHIELD_AI';

export const TacticalCard: React.FC<TacticalCardProps> = ({
  collectorInput,
  disclosures = [],
  onSelectTicker,
  isLiveAutoTrade = false,
  onToggleAutoTrade,
  onVetoStatusChange,
  chatMessages = [],
  isChatLoading = false,
  onSendChat,
  orderBookLevels,
}) => {
  // Varsayılan kapalı: İlk açılışta 1 sayfa temiz görünüm
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailDrawerTab>('CUBES_XAI');
  const [isPromptPreviewOpen, setIsPromptPreviewOpen] = useState<boolean>(false);
  const [isHtml5ModalOpen, setIsHtml5ModalOpen] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<'PROMPT' | 'TOON' | null>(null);

  // 💡 Yatırımcı Koçu ve Dosya Yükleme Durumları
  const [coachSummary, setCoachSummary] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'idle' | 'uploading' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });
  const [uploadedDecision, setUploadedDecision] = useState<Partial<FinalDecision> | null>(null);

  // 📊 AKD/Takas ve 💰 Vergi/Reel Getiri Durumları
  const [akdData, setAkdData] = useState<any>(null);
  const [taxData, setTaxData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 5 motoru tekilleştiren merkezi kollektör
  const verdict: UnifiedVerdict = useMemo(
    () => collectTacticalVerdict(collectorInput),
    [collectorInput]
  );

  // Sosyal Manipülasyon Kalkanı görünüm modeli (Python snake_case -> TS camelCase)
  const manipulationView = useMemo(
    () =>
      manipulationEngine.formatForUI(
        verdict.symbol,
        uploadedDecision,
        verdict.riskScore > 70 ? 85 : verdict.riskScore >= 40 ? 55 : 20
      ),
    [verdict.symbol, uploadedDecision, verdict.riskScore]
  );

  const akdView = useMemo(() => manipulationEngine.formatAkdViewModel(akdData), [akdData]);
  const taxView = useMemo(() => manipulationEngine.formatTaxViewModel(taxData), [taxData]);

  // Sembol değiştiğinde Python backend'den AKD ve Vergi/Reel Getiri verilerini yükle
  useEffect(() => {
    let isSubscribed = true;
    async function loadAkdAndTax() {
      try {
        const [akdRes, taxRes] = await Promise.all([
          fetch(`http://127.0.0.1:8001/api/akd/analyze?ticker=${verdict.symbol}`).then(r => r.json()).catch(() => null),
          fetch(`http://127.0.0.1:8001/api/tax/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ticker: verdict.symbol,
              buy_price_tl: verdict.price * 0.9,
              sell_price_tl: verdict.price,
              lot_count: 1000,
            }),
          }).then(r => r.json()).catch(() => null),
        ]);
        if (isSubscribed) {
          if (akdRes) setAkdData(akdRes);
          if (taxRes) setTaxData(taxRes);
        }
      } catch {
        // Fallback handled by manipulationEngine
      }
    }
    loadAkdAndTax();
    return () => { isSubscribed = false; };
  }, [verdict.symbol, verdict.price]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isImage = /\.(png|jpe?g|webp|bmp|gif)$/i.test(fileName);
    const isDoc = /\.(pdf|docx?|xlsx?|xls|txt)$/i.test(fileName);

    if (!isImage && !isDoc) {
      setUploadStatus({
        type: 'error',
        message: 'Desteklenmeyen dosya formatı. Lütfen PDF, Word, Excel veya Görsel (PNG/JPG) seçin.'
      });
      return;
    }

    setUploadStatus({
      type: 'uploading',
      message: `'${file.name}' yükleniyor ve çoklu ajan motoru tarafından analiz ediliyor...`
    });
    setIsCoachLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ticker', verdict.symbol);

      const endpoint = isImage
        ? 'http://127.0.0.1:8001/api/input/analyze_image'
        : 'http://127.0.0.1:8001/api/input/upload_and_analyze';

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Sunucu hatası (${res.status})`);
      }

      const data = await res.json();
      setUploadedDecision(data);
      if (data.coach_summary) {
        setCoachSummary(data.coach_summary);
      }
      setUploadStatus({
        type: 'success',
        message: `✅ '${file.name}' başarıyla işlendi! Karar: ${data.verdict} (${data.composite_score}/100)`
      });
    } catch (err: any) {
      console.error('Yükleme hatası:', err);
      setUploadStatus({
        type: 'error',
        message: `Yükleme başarısız: ${err.message || 'Python sunucusuna bağlanılamadı.'}`
      });
    } finally {
      setIsCoachLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // En yeniden eskiye sıralanmış canlı RSS / KAP bildirimleri
  const sortedDisclosures = useMemo(() => {
    return [...disclosures].sort(
      (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
  }, [disclosures]);

  const llmPromptText = useMemo(
    () => buildExternalLLMPrompt(verdict, sortedDisclosures),
    [verdict, sortedDisclosures]
  );

  const toonPayloadText = useMemo(
    () => buildToonPayload(verdict, sortedDisclosures),
    [verdict, sortedDisclosures]
  );

  const html5ReportContent = useMemo(
    () => buildSinglePageHtml5Report(verdict, sortedDisclosures),
    [verdict, sortedDisclosures]
  );

  const handleCopy = async (type: 'PROMPT' | 'TOON') => {
    const text = type === 'PROMPT' ? llmPromptText : toonPayloadText;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2200);
    } catch {
      // Fallback
    }
  };

  const handleDownloadToon = () => {
    const blob = new Blob([toonPayloadText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${verdict.symbol}_MT16_Verdict.toon`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const cur = verdict.currencySymbol;
  const isPositiveChange = verdict.changePct >= 0;

  const actionBadgeStyle =
    verdict.action === 'AL'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
      : verdict.action === 'SAT'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
      : 'bg-amber-500/20 text-amber-300 border-amber-500/50';

  const latestNewsItem = sortedDisclosures[0] || null;

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 🎯 ANA TAKTİKSEL KART (TEK KART - 1 SAYFA KURUMSAL GÖRÜNÜM)           */}
      {/* ===================================================================== */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
        {/* 1. ÜST SATIR (HEADER): #ASELS 340.25 -3.06% | Z -0.75σ | OBI +0.35 | 82/100 AL */}
        <div className="px-5 py-4 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sembol & Pazar */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono font-black text-base text-white tracking-tight">
                #{verdict.symbol}
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                {verdict.companyName}
              </span>
            </div>

            {/* Fiyat & TP / SL Özet */}
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xl font-black text-white">
                {cur}{verdict.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold border ${
                  isPositiveChange
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                {isPositiveChange ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {isPositiveChange ? '+' : ''}
                {verdict.changePct.toFixed(2)}%
              </span>
              <span className="text-[11px] text-slate-500 hidden md:inline">
                (TP {cur}{verdict.tpPrice.toFixed(2)} / SL {cur}{verdict.stopPrice.toFixed(2)})
              </span>
            </div>

            <span className="text-slate-700 font-mono hidden sm:inline">|</span>

            {/* Tekilleştirilmiş Z-Skor */}
            <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">Z</span>
              <span
                className={`font-bold ${
                  Math.abs(verdict.zScore) >= verdict.zThreshold
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {verdict.zScore >= 0 ? '+' : ''}
                {verdict.zScore.toFixed(2)}σ
              </span>
              <span className="text-[10px] text-slate-500">(±{verdict.zThreshold.toFixed(1)})</span>
            </div>

            <span className="text-slate-700 font-mono hidden sm:inline">|</span>

            {/* Tekilleştirilmiş L2 OBI */}
            <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">OBI</span>
              <span
                className={`font-bold ${
                  verdict.obi >= 0.15
                    ? 'text-emerald-300'
                    : verdict.obi <= -0.15
                    ? 'text-rose-300'
                    : 'text-cyan-300'
                }`}
              >
                {verdict.obi >= 0 ? '+' : ''}
                {verdict.obi.toFixed(2)}
              </span>
            </div>

            <span className="text-slate-700 font-mono hidden sm:inline">|</span>

            {/* Birleşik Skor & Karar */}
            <div
              className={`px-3 py-1 rounded-lg font-mono text-xs font-black border flex items-center gap-1.5 ${actionBadgeStyle}`}
            >
              <span>{verdict.finalScore}/100</span>
              <span>·</span>
              <span>%{verdict.juryScore}</span>
              <span>{verdict.action}</span>
            </div>

            {/* 🛡️ Sosyal Manipülasyon Riski Rozeti (>70 Kırmızı: Yüksek Risk, 40-70 Sarı: Orta, <40 Yeşil: Düşük) */}
            <span
              className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold flex items-center gap-1.5 ${manipulationView.badgeClass}`}
              title={manipulationView.summary}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                Manipülasyon Riski: {manipulationView.manipulationRiskScore}/100 ({manipulationView.levelLabel})
              </span>
            </span>

            {/* Sadece Composite Patladığında veya Kritik Alarmda Gösterilen Rozet */}
            {verdict.alarm === 'SUPER_KRITIK_ALARM' && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-600/30 border border-rose-500 text-rose-200 font-mono text-[11px] font-black flex items-center gap-1 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                SUPER_KRITIK_ALARM
              </span>
            )}
            {verdict.alarm === 'MANIPULASYON_ALARM' && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-[11px] font-bold">
                MANIPULASYON_ALARM
              </span>
            )}
          </div>

          {/* Sağ Üst: Harici LLM Prompt, .TOON ve HTML5 Rapor Butonları */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleCopy('PROMPT')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Başka LLM'lere (ChatGPT, Claude, DeepSeek, Gemini) yapıştırılacak hazır analiz promptunu kopyala"
            >
              {copiedType === 'PROMPT' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{copiedType === 'PROMPT' ? 'Prompt Kopyalandı' : 'LLM Prompt'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPromptPreviewOpen((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1 transition cursor-pointer ${
                isPromptPreviewOpen
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
              title="Harici LLM Promptunu ve .TOON Çıktısını Görüntüle"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>.TOON / Prompt</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHtml5ModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="1 Sayfalık Kurumsal HTML5 Rapor Penceresini Aç"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>HTML5 Rapor</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  const pythonUrl = 'http://127.0.0.1:8001/api/export/report';
                  const decisionData = {
                    ticker: verdict.symbol,
                    verdict: verdict.action,
                    composite_score: verdict.finalScore,
                    timestamp: Date.now() / 1000,
                    agent_votes: {
                      technical: { agent_name: 'Teknik Analiz Ajanı', signal: verdict.action, score: verdict.finalScore, confidence: 0.85, reasoning: verdict.reason },
                      depth: { agent_name: 'Takas & Derinlik Ajanı', signal: 'AL', score: 72.0, confidence: 0.80, reasoning: verdict.naturalLanguageAnalysis }
                    },
                    debate_result: { challenges: [] },
                    toon: buildToonPayload(verdict, disclosures),
                    summary: verdict.naturalLanguageAnalysis
                  };

                  const res = await fetch(pythonUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ticker: verdict.symbol,
                      format: 'excel',
                      decision_data: decisionData
                    })
                  });
                  if (!res.ok) throw new Error('Excel ihrac servisi hatasi');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${verdict.symbol}_Strateji_Raporu.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Excel indirme hatası:', err);
                  alert('Excel raporu indirilemedi. Lütfen Python sunucusunun (port 8001) açık olduğundan emin olun.');
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Python Rapor Servisinden Renkli Excel (.xlsx) İndir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📥 Excel İndir</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  const pythonUrl = 'http://127.0.0.1:8001/api/export/report';
                  const decisionData = {
                    ticker: verdict.symbol,
                    verdict: verdict.action,
                    composite_score: verdict.finalScore,
                    timestamp: Date.now() / 1000,
                    agent_votes: {
                      technical: { agent_name: 'Teknik Analiz Ajanı', signal: verdict.action, score: verdict.finalScore, confidence: 0.85, reasoning: verdict.reason },
                      depth: { agent_name: 'Takas & Derinlik Ajanı', signal: 'AL', score: 72.0, confidence: 0.80, reasoning: verdict.naturalLanguageAnalysis }
                    },
                    debate_result: { challenges: [] },
                    toon: buildToonPayload(verdict, disclosures),
                    summary: verdict.naturalLanguageAnalysis
                  };

                  const res = await fetch(pythonUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ticker: verdict.symbol,
                      format: 'word',
                      decision_data: decisionData,
                      analysis_text: verdict.naturalLanguageAnalysis
                    })
                  });
                  if (!res.ok) throw new Error('Word ihrac servisi hatasi');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${verdict.symbol}_Strateji_Raporu.docx`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Word indirme hatası:', err);
                  alert('Word raporu indirilemedi. Lütfen Python sunucusunun (port 8001) açık olduğundan emin olun.');
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Python Rapor Servisinden Şık Word (.docx) İndir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📝 Word İndir</span>
            </button>
          </div>
        </div>

        {/* 2. ORTA SATIR (BODY): TEK SATIR TEŞHİS + DOĞAL DİL ANALİZİ + KOÇ ÖZETİ + DOSYA YÜKLEME + RSS */}
        <div className="p-5 space-y-3.5">
          {/* Tek Satır Kollektör Özeti */}
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm sm:text-base font-bold text-slate-100 leading-snug">
              {uploadedDecision?.summary || verdict.reason}
            </p>
            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              Uyum: <strong className="text-emerald-400">%{verdict.coherence}</strong> · Skor:{' '}
              <strong className="text-cyan-300">
                {uploadedDecision?.composite_score ?? verdict.finalScore}/100
              </strong>
            </span>
          </div>

          {/* 💡 YATIRIMCI KOÇU ÖZETİ */}
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-amber-950/20 border border-amber-500/30 rounded-xl p-4 space-y-2 shadow-lg">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Lightbulb className="w-4 h-4" />
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-amber-300 font-mono tracking-wide">
                  💡 Yatırımcı Koçu Özeti
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {isCoachLoading && (
                  <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analiz Ediliyor...
                  </span>
                )}
                {uploadedDecision && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {uploadedDecision.metadata?.uploaded_file ? '📄 Belge Entegre' : '🖼️ Görsel Entegre'}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans font-medium">
              {coachSummary || (isCoachLoading ? 'Koç Ajanı piyasa verilerini ve münazara itirazlarını analiz ediyor...' : 'Yatırımcı koçu özeti hazırlandığında burada görüntülenecektir.')}
            </p>
          </div>

          {/* 📂 DOSYA VE GÖRSEL YÜKLEME (UPLOAD & ANALYZE) ALANI */}
          <div className="bg-slate-950/90 border border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-3.5 space-y-2.5 transition">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    KAP, Bilanço veya Midas KDM Görseli Yükle
                  </div>
                  <div className="text-[11px] text-slate-400">
                    PDF, Word, Excel veya Ekran Görüntüsü (PNG/JPG) yükleyin; çoklu ajan jürisi canlı karar üretsin.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  id="tactical-file-upload-input"
                  disabled={uploadStatus.type === 'uploading'}
                />
                <label
                  htmlFor="tactical-file-upload-input"
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    uploadStatus.type === 'uploading'
                      ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{uploadStatus.type === 'uploading' ? 'Yükleniyor...' : '📄 Dosya / Görsel Seç'}</span>
                </label>
              </div>
            </div>

            {/* Yükleme Durum ve Geri Bildirim Çubuğu */}
            {uploadStatus.type !== 'idle' && (
              <div
                className={`text-xs p-2.5 rounded-lg flex items-center justify-between gap-2 font-mono ${
                  uploadStatus.type === 'uploading'
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                    : uploadStatus.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  {uploadStatus.type === 'uploading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {uploadStatus.type === 'success' && <Check className="w-3.5 h-3.5" />}
                  {uploadStatus.type === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{uploadStatus.message}</span>
                </div>
                {uploadStatus.type !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() => setUploadStatus({ type: 'idle', message: '' })}
                    className="text-slate-400 hover:text-slate-200 text-xs underline cursor-pointer"
                  >
                    Kapat
                  </button>
                )}
              </div>
            )}

            {/* Yüklenen Görselin Midas OCR Çıktısı (Varsa) */}
            {uploadedDecision?.metadata?.vision_analysis && (
              <div className="bg-slate-900/90 border border-cyan-500/30 rounded-lg p-2.5 text-[11px] font-mono text-cyan-200 space-y-1">
                <div className="text-emerald-400 font-bold">🔍 Midas Görsel KDM Analiz Teyidi:</div>
                <div>{uploadedDecision.metadata.vision_analysis.comment || uploadedDecision.metadata.vision_analysis.toon_line}</div>
                {uploadedDecision.metadata.vision_analysis.kademe_summary && (
                  <div className="text-slate-300 text-[10px]">Kademeler: {uploadedDecision.metadata.vision_analysis.kademe_summary}</div>
                )}
              </div>
            )}
          </div>

          {/* Akıcı Doğal Dil Kuant Analizi */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <span className="text-emerald-400 font-bold mr-1.5">Doğal Dil Analizi:</span>
            {uploadedDecision?.summary || verdict.naturalLanguageAnalysis}
          </div>

          {/* En Son Gelen Canlı RSS / KAP Haberi (En Yeniden Eskiye İlk Sıra) */}
          {latestNewsItem && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-[10px] shrink-0 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  SON HABER ({latestNewsItem.publish_time})
                </span>
                <span className="font-mono font-bold text-cyan-300 shrink-0">
                  [{latestNewsItem.ticker}]
                </span>
                <span className="text-slate-200 truncate font-medium">
                  {latestNewsItem.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    latestNewsItem.analysis?.impact_score >= 0
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  Etki: {latestNewsItem.analysis?.impact_score >= 0 ? '+' : ''}
                  {latestNewsItem.analysis?.impact_score ?? 0}
                </span>
                <a
                  href={latestNewsItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-emerald-300 inline-flex items-center gap-1"
                >
                  <span>Kaynak</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Açılır Harici LLM Prompt & .TOON Kutusu (İsteğe Bağlı) */}
          {isPromptPreviewOpen && (
            <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-4 space-y-3 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-cyan-300 font-mono uppercase">
                    Başka LLM&apos;lere Verilecek Hazır Kuant Promptu &amp; .TOON Veri Paketi
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    ChatGPT, Claude, DeepSeek veya Gemini&apos;ye doğrudan yapıştırarak derin strateji analizi alabilirsiniz.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy('PROMPT')}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedType === 'PROMPT' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Promptu Kopyala</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy('TOON')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedType === 'TOON' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>.TOON Kopyala</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadToon}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.TOON İndir</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Harici LLM Promptu (Doğal Dil + 5 Motor Verisi)
                  </span>
                  <pre className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {llmPromptText}
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    .TOON Sıkıştırılmış Kuant Çıktısı
                  </span>
                  <pre className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {toonPayloadText}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* 📊 KURUMSAL AKIŞ (AKD/TAKAS) & 💰 REEL GETİRİ & VERGİ PANELİ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* Kurumsal Akış Paneli */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>📊 Kurumsal Akış (AKD / Takas)</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  akdView.signalType === 'KURUMSAL_TOPLAMA'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : akdView.signalType === 'DAGITIM'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {akdView.signalLabel}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-mono space-y-1">
                <div>Top 3 Net Lot: <strong className={akdView.top3NetLot >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{akdView.top3NetLot >= 0 ? '+' : ''}{akdView.top3NetLot.toLocaleString('tr-TR')}</strong></div>
                <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3">
                  <span>BofA: {akdView.bofaNetLot.toLocaleString('tr-TR')}</span>
                  <span>Garanti: {akdView.garantiNetLot.toLocaleString('tr-TR')}</span>
                  <span>HHI: {akdView.hhi}</span>
                </div>
                <p className="text-[11px] text-slate-400 italic pt-0.5">{akdView.summary}</p>
              </div>
            </div>

            {/* Reel Getiri & Vergi Paneli */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>💰 Reel Getiri (USD) &amp; Vergi</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                  Stopaj %{taxView.withholdingRate * 100}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-mono space-y-1">
                <div>Reel Getiri (USD): <strong className={taxView.realPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{taxView.realPnlUsd >= 0 ? '+' : ''}${taxView.realPnlUsd.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (%{taxView.realPnlUsdPct})</strong></div>
                <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3">
                  <span>Nominal TL: {taxView.nominalPnlTl.toLocaleString('tr-TR')} TL</span>
                  <span>Net TL: {taxView.netPnlTl.toLocaleString('tr-TR')} TL</span>
                </div>
                <p className="text-[11px] text-slate-400 italic pt-0.5">{taxView.summary}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. ALT SATIR (FOOTER): Erime 12dk | Duvar 10.773 lot @ ... | VaR %2.71 | Stop ... | TP ... [Detay v] */}
        <div className="px-5 py-3 bg-slate-950/90 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-300">
            <span>
              Erime: <strong className="text-white">{verdict.breakoutMinutes}dk</strong>
            </span>
            <span className="text-slate-700">·</span>
            <span>
              Duvar:{' '}
              <strong className="text-cyan-300">
                {verdict.wallLot.toLocaleString('tr-TR')} lot @ {cur}
                {verdict.wallPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </span>
            <span className="text-slate-700">·</span>
            <span>
              VaR: <strong className="text-amber-300">%{verdict.varPct}</strong>
            </span>
            <span className="text-slate-700">·</span>
            <span>
              Stop:{' '}
              <strong className="text-rose-400">
                {cur}{verdict.stopPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </span>
            <span className="text-slate-700">·</span>
            <span>
              TP:{' '}
              <strong className="text-emerald-400">
                {cur}{verdict.tpPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </span>
          </div>

          {/* [Detay v] Çekmece Aç/Kapat Butonu */}
          <button
            type="button"
            onClick={() => setIsDetailOpen((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-black border flex items-center gap-1.5 transition cursor-pointer ${
              isDetailOpen
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-emerald-500/40'
            }`}
          >
            <span>{isDetailOpen ? 'Detayları Gizle' : 'Detay'}</span>
            {isDetailOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 🗄️ VARSAYILAN KAPALI DETAY ÇEKMECESİ (TÜM DERİN MOTORLAR & 9 KÜP)    */}
      {/* ===================================================================== */}
      {isDetailOpen && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-5 animate-fadeIn">
          {/* Detay Sekme Seçici */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'CUBES_XAI' as DetailDrawerTab, label: '1. 9 Küp & 4 Motor Matrisi', icon: Layers },
                { id: 'JURY_RSS' as DetailDrawerTab, label: '2. 6 Ajanlı Jüri & Canlı RSS/KAP', icon: Radio },
                { id: 'BOOKMAP_WHALE' as DetailDrawerTab, label: '3. Bookmap L2 & Iceberg Radar', icon: Activity },
                { id: 'PORTFOLIO_MAM' as DetailDrawerTab, label: '4. Korelasyon 9x9, MAM/PAMM & Track Record', icon: TrendingUp },
                { id: 'OCO_SHIELD_AI' as DetailDrawerTab, label: '5. OCO Emir, Devre Kesici & QuantMind', icon: Shield },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeDetailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveDetailTab(tab.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 whitespace-nowrap border transition cursor-pointer ${
                      active
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Joker Durumu: <strong className="text-cyan-300">{verdict.alarm}</strong>
            </span>
          </div>

          {/* SEKME 1: 9 KÜP MATRİSİ + 4 ANA MOTOR ÖZETİ (Kütle Direnci, Adli Risk, Hafıza, EXPO_V2) */}
          {activeDetailTab === 'CUBES_XAI' && (
            <div className="space-y-5">
              {/* 4 Ana Motor Kolonu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">1. Kütle Direnci &amp; Tahta</span>
                  <div className="text-lg font-black font-mono text-white mt-1">
                    %{verdict.engines.board.massResistance} · {verdict.engines.board.whaleLabel}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Erime: {verdict.breakoutMinutes}dk · Sahte Duvar: {verdict.isFakeWall ? 'TESPİT EDİLDİ' : 'Yok'}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">2. Adli Risk &amp; SPK</span>
                  <div className="text-lg font-black font-mono text-white mt-1">
                    {verdict.riskScore}/100 · Wash %{verdict.engines.forensic.washTradeRatio}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Beneish M: {verdict.engines.forensic.beneishMScore} ·{' '}
                    {verdict.engines.forensic.spkFlags[0] || 'SPK Bayrağı Yok'}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">3. Hafıza &amp; Anomali (XAI)</span>
                  <div className="text-lg font-black font-mono text-white mt-1">
                    HHI {verdict.engines.anomaly.hhi} · Tree %{verdict.engines.anomaly.treeProb}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Isolation Forest: {verdict.engines.anomaly.isolationForestScore} · Hafıza: %{verdict.engines.composite.memoryEvidenceScore}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">4. Üstel Risk (EXPO_V2)</span>
                  <div className="text-lg font-black font-mono text-white mt-1">
                    {verdict.expoScore}/100 · Çarpan {verdict.amplifier}x
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Yön Uyumu: {verdict.engines.composite.directionalCoherence} · Kelly: %{verdict.kellyPct}
                  </p>
                </div>
              </div>

              {/* 9 Küp (3x3 Grid) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase">
                    9 Küp Kuant Sentez Matrisi (Uyum: %{verdict.coherence} · Çatışma: {verdict.engines.storyCubes.conflictCount}/9)
                  </h4>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Override: {verdict.engines.storyCubes.overrideAction}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {verdict.engines.storyCubes.cubes.map((cube) => {
                    const isBuy = cube.signal === 'AL';
                    const isSell = cube.signal === 'SAT';
                    return (
                      <div
                        key={cube.id}
                        className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{cube.label}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              isBuy
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : isSell
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {cube.signal} · {cube.score}/100
                          </span>
                        </div>
                        <div className="text-sm font-black font-mono text-white">{cube.valueText}</div>
                        <p className="text-[11px] text-slate-400 truncate">{cube.note}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SEKME 2: 6 AJANLI JÜRİ RAPORU & EN YENİDEN ESKİYE CANLI RSS / KAP AKIŞI */}
          {activeDetailTab === 'JURY_RSS' && (
            <div className="space-y-5">
              <SmartJuryDiagnosisCard
                marketType={verdict.marketType}
                ticker={verdict.symbol}
                onVetoStatusChange={onVetoStatusChange}
              />
              <MarketNewsTicker onSelectTickerNews={onSelectTicker} />
            </div>
          )}

          {/* SEKME 3: BOOKMAP L2 ISI HARİTASI & ICEBERG / BALİNA DEDEKTÖRÜ */}
          {activeDetailTab === 'BOOKMAP_WHALE' && (
            <div className="space-y-5">
              <OrderBookHeatmapVisualizer
                symbol={verdict.symbol}
                lastPrice={verdict.price}
                spread={Number((verdict.price * 0.001).toFixed(2))}
                obi={verdict.obi}
                zScore={verdict.zScore}
                bids={orderBookLevels?.bids || []}
                asks={orderBookLevels?.asks || []}
              />
              <IcebergDetectorCard
                symbol={verdict.symbol}
                marketType={verdict.marketType}
                currentPrice={verdict.price}
                obi={verdict.obi}
                zScore={verdict.zScore}
              />
            </div>
          )}

          {/* SEKME 4: KORELASYON 9x9, PROP MAM/PAMM ($400k), MONTE CARLO & TRACK RECORD */}
          {activeDetailTab === 'PORTFOLIO_MAM' && (
            <div className="space-y-5">
              <PortfolioCorrelationCard
                currentSymbol={verdict.symbol}
                marketType={verdict.marketType}
              />
              <MamPropDashboardCard />
              <TrackRecordPanel marketType={verdict.marketType} />
            </div>
          )}

          {/* SEKME 5: OCO EMİR MOTORU, DEVRE KESİCİ, PING/LATENCY & MT16 QUANTMIND */}
          {activeDetailTab === 'OCO_SHIELD_AI' && (
            <div className="space-y-5">
              {verdict.marketType === 'CRYPTO' ? (
                <BinanceTestnetExecutorCard
                  currentSymbol={verdict.symbol}
                  isLiveAutoTrade={isLiveAutoTrade}
                  onToggleAutoTrade={onToggleAutoTrade}
                />
              ) : (
                <AlpacaExecutorCard
                  marketType={verdict.marketType}
                  currentSymbol={verdict.symbol}
                />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <VolatileCircuitBreakerCard
                  symbol={verdict.symbol}
                  marketType={verdict.marketType}
                  currentPrice={verdict.price}
                  priceChangePct={verdict.changePct}
                  spread={Number((verdict.price * 0.001).toFixed(2))}
                  spreadPct={0.1}
                  isLiveAutoTrade={isLiveAutoTrade}
                  onToggleAutoTrade={onToggleAutoTrade}
                />
                <SystemHealthLatencyCard
                  marketType={verdict.marketType}
                  isLiveAutoTrade={isLiveAutoTrade}
                  onToggleAutoTrade={onToggleAutoTrade}
                />
              </div>

              <SignalBotCard />

              {onSendChat && (
                <WarrenAiChat
                  activeSymbol={verdict.symbol}
                  marketType={verdict.marketType}
                  messages={chatMessages}
                  isLoading={isChatLoading}
                  onSendMessage={onSendChat}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 🖥️ 1 SAYFALIK KURUMSAL HTML5 RAPOR PENCERESİ (DynamicHtml5Container)  */}
      {/* ===================================================================== */}
      {isHtml5ModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white">
                  MT16 Kurumsal 1 Sayfa HTML5 Analiz Raporu — #{verdict.symbol}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([html5ReportContent], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `MT16_${verdict.symbol}_1Sayfa_Rapor.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 text-[11px] font-mono font-bold cursor-pointer"
                >
                  .HTML İndir
                </button>
                <button
                  type="button"
                  onClick={() => setIsHtml5ModalOpen(false)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 text-[11px] font-mono font-bold cursor-pointer"
                >
                  Kapat ✕
                </button>
              </div>
            </div>
            <DynamicHtml5Container
              componentId={`html5-report-${verdict.symbol}`}
              fallback={<div className="p-4 text-xs text-amber-300">HTML5 Rapor yüklenemedi.</div>}
            >
              <iframe
                title={`MT16 HTML5 Report ${verdict.symbol}`}
                srcDoc={html5ReportContent}
                className="w-full h-[78vh] bg-slate-950 border-0"
              />
            </DynamicHtml5Container>
          </div>
        </div>
      )}
    </div>
  );
};
export default TacticalCard;
