// src/components/WarrenAiChat.tsx
/**
 * MT16 QuantMind (Kıdemli Kuant Stratejisti) — İnteraktif Kuant Analiz & Saf Pazar Bağlam Köprüsü Konsolu
 * Modül: src/components/WarrenAiChat.tsx -> src/services/quantMind.ts (v3.2-purity-and-drag)
 * Pazar Ayrımı Saflığı: BIST sekmesinde yalnızca BIST hisseleri, CRYPTO sekmesinde yalnızca kripto pariteler,
 * NASDAQ sekmesinde yalnızca ABD hisseleri gösterilir ve enjekte edilir.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Cpu,
  Send,
  RefreshCw,
  Activity,
  Layers,
  Radio,
  Shield,
  Terminal,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  QUANT_MIND_TITLE,
  QUANT_MIND_VERSION,
  QuantMarketUniverse,
  QuantMindChatMessage,
  QuantMindLiveContext,
  resolveMarketUniverse,
  getPureMarketQuickSymbols,
  sanitizeSymbolForMarket,
  buildQuantMindLiveContext,
  injectQuantMindContextBridge,
  executeQuantMindQuery
} from '../services/quantMind';
import { marketGateway, MarketGatewaySnapshot } from '../services/marketGateway';
import { kapDaemon, KapDaemonState } from '../services/kapDaemon';

export interface QuantMindChatProps {
  activeSymbol: string;
  marketType?: QuantMarketUniverse;
  messages?: QuantMindChatMessage[];
  isLoading?: boolean;
  onSendMessage?: (msg: string) => void;
  compact?: boolean;
}

const QUICK_COMMANDS = [
  { label: '/analiz', prompt: '/analiz Tam Kuant & OCO Matrisi' },
  { label: '/senaryo', prompt: '/senaryo Giriş, TP ve SL Olasılık Hesabı' },
  { label: '/takas', prompt: '/takas Kurumsal Saklama & L2 OBI Derinlik Baskısı' },
  { label: '/stop', prompt: '/stop OCO Stop-Loss & Risk Zırhı Seviyeleri' },
];

export const WarrenAiChat: React.FC<QuantMindChatProps> = ({
  activeSymbol = 'ASELS',
  marketType,
  messages: externalMessages,
  isLoading: externalLoading,
  onSendMessage: externalOnSend,
  compact = false,
}) => {
  const activeUniverse: QuantMarketUniverse = useMemo(
    () => resolveMarketUniverse(activeSymbol, marketType),
    [activeSymbol, marketType]
  );

  const pureActiveSymbol = useMemo(
    () => sanitizeSymbolForMarket(activeSymbol, activeUniverse),
    [activeSymbol, activeUniverse]
  );

  const pureQuickSymbols = useMemo(
    () => getPureMarketQuickSymbols(activeUniverse),
    [activeUniverse]
  );

  const [inputText, setInputText] = useState<string>('');
  const [internalMessages, setInternalMessages] = useState<QuantMindChatMessage[]>([
    {
      role: 'model',
      text: `- **[ANOMALİ & Z-SKOR DURUMU]:** ${QUANT_MIND_TITLE} (${QUANT_MIND_VERSION}) **${activeUniverse}** pazar evreni için izole modda aktif. \`anomalyScanner\` üzerinden gelen Sanitize Z-Skor sapmaları gerçek zamanlı izlenmektedir.\n- **[L2 OBI & TAHTA BASKISI]:** \`marketGateway\` L2 emir defteri dengesi (OBI) ve kurumsal saklama/takas akışları saf **${activeUniverse}** bağlam köprüsüne bağlandı.\n- **[AKTİF KAP AKIŞI]:** \`kapDaemon\` kamuya açık bildirim akışı ve algoritmik volatilite etkisi anlık taranmaktadır.\n- **[STRATEJİK OCO HEDEFİ]:** **${activeUniverse}** sembol kodu (örn. ${pureQuickSymbols.slice(0, 3).join(', ')}) veya kuant komutu göndererek keskin olasılık ve OCO (%TP / %SL) matrisini tetikleyin.`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      symbol: pureActiveSymbol,
      market: activeUniverse,
    },
  ]);
  const [internalLoading, setInternalLoading] = useState<boolean>(false);
  const [showContextInspector, setShowContextInspector] = useState<boolean>(false);

  const [gatewayState, setGatewayState] = useState<MarketGatewaySnapshot>(() => marketGateway.getSnapshot());
  const [kapState, setKapState] = useState<KapDaemonState>(() => kapDaemon.getState());
  const [liveContext, setLiveContext] = useState<QuantMindLiveContext | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubMarket = marketGateway.subscribe((snap) => setGatewayState(snap));
    const unsubKap = kapDaemon.subscribe((st) => setKapState(st));
    return () => {
      unsubMarket();
      unsubKap();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    buildQuantMindLiveContext(pureActiveSymbol, gatewayState, kapState, activeUniverse)
      .then((ctx) => {
        if (mounted) setLiveContext(ctx);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [pureActiveSymbol, activeUniverse, gatewayState.price, gatewayState.liveZScore, gatewayState.liveObi, kapState.syncCount]);

  const displayedMessages = externalMessages && externalMessages.length > 0 ? externalMessages : internalMessages;
  const isBusy = externalLoading !== undefined ? externalLoading : internalLoading;

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [displayedMessages.length, isBusy]);

  const injectedBridgePreview = useMemo(() => {
    if (!liveContext) return '';
    return injectQuantMindContextBridge(inputText || `${pureActiveSymbol} kuant analizi`, liveContext).systemPromptWithContext;
  }, [liveContext, inputText, pureActiveSymbol]);

  const handleDispatch = async (overrideText?: string) => {
    const query = (overrideText ?? inputText).trim();
    if (!query || isBusy) return;

    if (!overrideText) {
      setInputText('');
    }

    if (externalOnSend) {
      externalOnSend(query);
      return;
    }

    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: QuantMindChatMessage = {
      role: 'user',
      text: query,
      time: nowTime,
      symbol: pureActiveSymbol,
      market: activeUniverse,
    };

    setInternalMessages((prev) => [...prev, userMsg]);
    setInternalLoading(true);

    try {
      const result = await executeQuantMindQuery(query, pureActiveSymbol, [...internalMessages, userMsg], activeUniverse);
      setLiveContext(result.context);
      setInternalMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: result.reply,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          symbol: result.context.symbol,
          market: result.context.market,
          telemetrySnapshot: {
            zScore: result.context.zScoreClamped,
            obi: result.context.l2Obi,
            kapScore: result.context.latestKap?.analysis.impact_score ?? 0,
            tpPrice: result.context.oco.tpPrice,
            slPrice: result.context.oco.slPrice,
          },
        },
      ]);
    } catch {
      setInternalLoading(false);
    } finally {
      setInternalLoading(false);
    }
  };

  const cur = liveContext?.currencySymbol ?? (activeUniverse === 'BIST' ? '₺' : '$');
  const zScoreVal = liveContext?.zScoreClamped ?? gatewayState.liveZScore ?? 1.45;
  const obiVal = liveContext?.l2Obi ?? gatewayState.liveObi ?? 0.12;
  const latestKapScore = liveContext?.latestKap?.analysis.impact_score ?? 0;
  const tpPrice = liveContext?.oco.tpPrice ?? Number(((gatewayState.price || 100) * 1.02).toFixed(2));
  const slPrice = liveContext?.oco.slPrice ?? Number(((gatewayState.price || 100) * 0.99).toFixed(2));

  return (
    <div
      className={`bg-slate-900/75 backdrop-blur-xl rounded-b-2xl flex flex-col ${
        compact ? 'h-[420px] p-4' : 'h-[650px] p-5 sm:p-6'
      } animate-fadeIn`}
    >
      {/* ÜST BAŞLIK & HIZLI KOMUT MATRİSİ */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800/90">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.35)]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                {QUANT_MIND_TITLE}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-mono font-bold text-emerald-300">
                [{activeUniverse}] #{pureActiveSymbol}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 hidden sm:inline">
                {QUANT_MIND_VERSION}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              İzole {activeUniverse} Evreni · anomalyScanner · marketGateway · kapDaemon Canlı Bağlam Köprüsü
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd.label}
              type="button"
              onClick={() => handleDispatch(cmd.prompt)}
              disabled={isBusy}
              className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-cyan-500/35 hover:border-emerald-400 text-cyan-300 hover:text-emerald-300 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {cmd.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowContextInspector((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold flex items-center gap-1 transition cursor-pointer ${
              showContextInspector
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Enjekte Edilen Canlı Sistem Promptunu ve Pazar Saflığı Köprüsünü İncele"
          >
            {showContextInspector ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">Prompt Köprüsü</span>
          </button>
        </div>
      </div>

      {/* 📡 CANLI BAĞLAM (CONTEXT) KÖPRÜSÜ TELEMETRİ ŞERİDİ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 py-2.5 border-b border-slate-800/80 text-[11px] font-mono">
        <div className="bg-slate-950/85 border border-emerald-500/25 rounded-xl px-3 py-1.5 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Z-Skor:
          </span>
          <span className={`font-black ${zScoreVal >= 2.0 ? 'text-emerald-300' : zScoreVal < 0 ? 'text-rose-400' : 'text-cyan-300'}`}>
            {zScoreVal >= 0 ? '+' : ''}{zScoreVal}σ
          </span>
        </div>

        <div className="bg-slate-950/85 border border-cyan-500/25 rounded-xl px-3 py-1.5 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            L2 OBI:
          </span>
          <span className={`font-black ${obiVal >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
            {obiVal >= 0 ? '+' : ''}{obiVal.toFixed(3)}
          </span>
        </div>

        <div className="bg-slate-950/85 border border-emerald-500/25 rounded-xl px-3 py-1.5 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            {activeUniverse === 'BIST' ? 'KAP Etki:' : 'Pazar Akışı:'}
          </span>
          <span className={`font-black ${latestKapScore >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
            {activeUniverse === 'BIST'
              ? `${latestKapScore >= 0 ? '+' : ''}${latestKapScore}/100 (${kapState.disclosures.length})`
              : `${activeUniverse} CANLI`}
          </span>
        </div>

        <div className="bg-slate-950/85 border border-cyan-500/25 rounded-xl px-3 py-1.5 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            OCO Hedef:
          </span>
          <span className="text-emerald-300 font-bold">
            TP {cur}{tpPrice} / <span className="text-rose-400">SL {cur}{slPrice}</span>
          </span>
        </div>
      </div>

      {/* SİSTEM PROMPTU & BAĞLAM KÖPRÜSÜ DENETÇİSİ (İsteğe Bağlı Açılır Panel) */}
      {showContextInspector && (
        <div className="my-2 p-3 rounded-xl bg-slate-950/95 border border-emerald-500/40 text-[11px] font-mono text-emerald-300/90 max-h-40 overflow-y-auto whitespace-pre-wrap">
          <div className="flex items-center justify-between text-[10px] text-cyan-300 font-bold pb-1.5 mb-1.5 border-b border-slate-800">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              MT16_QUANT_MIND_PROMPT_ENGINEERING — Saf {activeUniverse} State Köprüsü
            </span>
            <span>PAZAR SAFLIĞI AKTİF</span>
          </div>
          {injectedBridgePreview}
        </div>
      )}

      {/* MESAJ AKIŞI */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-3.5 space-y-3 pr-1">
        {displayedMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 px-1">
              <span
                className={`text-[10px] font-mono font-bold uppercase ${
                  msg.role === 'user' ? 'text-cyan-300' : 'text-emerald-400'
                }`}
              >
                {msg.role === 'user' ? `OPERATÖR SORGUSU [${activeUniverse}]` : `${QUANT_MIND_TITLE} [${activeUniverse}]`}
              </span>
              <span className="text-[10px] font-mono text-slate-500">{msg.time}</span>
            </div>
            <div
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap font-sans ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold rounded-tr-none shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-950/95 border border-emerald-500/25 text-slate-100 rounded-tl-none shadow-[0_6px_20px_rgba(0,0,0,0.6)]'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isBusy && (
          <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-300 bg-slate-950/90 border border-emerald-500/30 rounded-xl p-3">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
            <span>
              MT16 QuantMind [{activeUniverse}] #{pureActiveSymbol} için Z-Skor, L2 OBI, KAP ve OCO parametrelerini sentezliyor...
            </span>
          </div>
        )}
      </div>

      {/* HIZLI VARLIK SORGULAMA (SAF PAZAR EVRENİNE ÖZEL) & GİRİŞ ÇUBUĞU */}
      <div className="pt-3 border-t border-slate-800/90 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-slate-400">
            Hızlı {activeUniverse} Analizi:
          </span>
          {pureQuickSymbols.map((sym) => (
            <button
              key={sym}
              type="button"
              disabled={isBusy}
              onClick={() =>
                handleDispatch(`${sym} için Z-Skor, L2 OBI, aktif bildirim akışı ve stratejik OCO hedef seviyelerini analiz et.`)
              }
              className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold transition cursor-pointer disabled:opacity-50 ${
                sym === pureActiveSymbol
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : 'bg-slate-950 hover:bg-emerald-500/20 border-slate-800 hover:border-emerald-400/50 text-slate-300 hover:text-emerald-300'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleDispatch();
              }
            }}
            placeholder={`${pureActiveSymbol} veya başka bir ${activeUniverse} sembolü (örn. ${pureQuickSymbols.slice(0, 3).join(', ')}) için kuant sorgusu girin...`}
            className="flex-1 bg-slate-950 border border-slate-700/90 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
          />
          <button
            type="button"
            onClick={() => handleDispatch()}
            disabled={isBusy || !inputText.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Analiz Et</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const QuantMindChat = WarrenAiChat;
export default WarrenAiChat;
