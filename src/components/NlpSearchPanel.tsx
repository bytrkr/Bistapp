// src/components/NlpSearchPanel.tsx
/**
 * MT16 Bistapp Kuant Terminali — Sınırlandırılmış & Sürüklenebilir NLP Arama Penceresi (v3.1-ui-drag-fix)
 * Sol açılır / yüzer NLP arama kutusunun ekran dışına taşmasını kesinlikle engeller:
 * - max-h-[70vh] overflow-y-auto
 * - z-50 ve absolute/fixed akıllı sınırlandırılmış konumlandırma
 * - DraggablePanel entegrasyonu ile Savaş Odası başlık çubuğundan taşınabilme
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  Filter,
  Database,
  ArrowRight,
  X,
  Loader2,
  CheckCircle2,
  Terminal,
  TrendingUp,
  Layers
} from 'lucide-react';
import { ALL_BIST_STOCKS, searchBISTStocks, BISTStock } from '../data/bistAllStocks';
import { DraggablePanel } from './DraggablePanel';
import type { NlpSearchResult } from './SearchBar';

export interface NlpSearchPanelProps {
  activeTicker: string;
  onSelectTicker: (ticker: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  mode?: 'dropdown' | 'floating' | 'inline';
  onExecuteQuantMindQuery?: (query: string) => void;
  className?: string;
}

const TACTICAL_NLP_PRESETS: Array<{ label: string; query: string; tag: string }> = [
  {
    label: 'F/K < 8 & BofA Toplayan Temettü',
    query: 'F/K 8den kucuk BofA toplayan temettu hisseleri',
    tag: 'KURUMSAL ALIM',
  },
  {
    label: 'PD/DD < 1.5 Ucuz Bankalar',
    query: 'PD/DD 1.5 altinda olan ucuz bankalar',
    tag: 'DEĞERLEME',
  },
  {
    label: 'Yüksek Hacimli Savunma & Sanayi',
    query: 'Hacmi yuksek savunma hisseleri',
    tag: 'Z-SKOR HACİM',
  },
  {
    label: 'RSI < 45 Dip Yapan Tahtalar',
    query: 'RSI 45 alti dip yapan sirketler',
    tag: 'MOMENTUM DİP',
  },
  {
    label: 'Yüksek Temettü Ödeyen Holdingler',
    query: 'Yukselen temettu odeyen holdingler',
    tag: 'TEMETTÜ',
  },
];

export const NlpSearchPanel: React.FC<NlpSearchPanelProps> = ({
  activeTicker,
  onSelectTicker,
  isOpen = true,
  onClose,
  mode = 'dropdown',
  onExecuteQuantMindQuery,
  className = '',
}) => {
  const [nlpQuery, setNlpQuery] = useState<string>('');
  const [quickSymbolFilter, setQuickSymbolFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<NlpSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ESC tuşu ile kapatma
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const filteredQuickStocks: BISTStock[] = useMemo(() => {
    if (!quickSymbolFilter.trim()) return ALL_BIST_STOCKS.slice(0, 16);
    return searchBISTStocks(quickSymbolFilter).slice(0, 24);
  }, [quickSymbolFilter]);

  const runNlpSearch = async (overrideQuery?: string) => {
    const queryText = (overrideQuery ?? nlpQuery).trim();
    if (!queryText) return;

    setIsLoading(true);
    setError(null);
    if (overrideQuery) {
      setNlpQuery(overrideQuery);
    }

    try {
      const response = await fetch('/api/nlp_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }),
      });

      if (!response.ok) {
        throw new Error(`NLP arama motoru yanıt vermedi (HTTP ${response.status})`);
      }

      const data: NlpSearchResult = await response.json();
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'NLP sorgusu çalıştırılırken hata oluştu.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStock = (symbol: string) => {
    const clean = symbol.replace(/\.IS$/i, '').toUpperCase();
    onSelectTicker(clean);
    if (mode === 'dropdown' && onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const panelBody = (
    <div
      ref={containerRef}
      className="max-h-[70vh] overflow-y-auto overscroll-contain bg-slate-950/95 backdrop-blur-2xl rounded-b-2xl p-4 space-y-4 text-slate-100 scrollbar-thin"
    >
      {/* Üst Bilgi & Kapatma Barı */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/90">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-bold font-mono text-emerald-300 truncate">
              NLP Doğal Dil Filtreleme &amp; BIST Sembol Tarayıcı
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              Aktif Tahta: <strong className="text-cyan-300">#{activeTicker}</strong> · SQL/TypeORM Kuant Sorgu Motoru
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 transition cursor-pointer shrink-0"
            title="NLP Arama Penceresini Kapat (ESC)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Doğal Dil (NLP) Arama Kutusu */}
      <div className="space-y-2">
        <div className="relative flex items-center bg-slate-900/95 border border-emerald-500/35 rounded-xl focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
          <div className="pl-3 pr-2 text-emerald-400 shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={nlpQuery}
            onChange={(e) => setNlpQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void runNlpSearch();
              }
            }}
            placeholder="Doğal dilde ara: 'F/K 8den kucuk BofA toplayan temettu hisseleri'..."
            className="w-full bg-transparent py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono"
          />
          {nlpQuery && (
            <button
              type="button"
              onClick={() => {
                setNlpQuery('');
                setResult(null);
                setError(null);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Temizle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void runNlpSearch()}
            disabled={isLoading || !nlpQuery.trim()}
            className="mr-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 text-slate-950 font-mono font-black text-[11px] flex items-center gap-1 transition cursor-pointer shrink-0"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>NLP Ara</span>
          </button>
        </div>

        {/* Hızlı Taktiksel NLP Şablonları */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-emerald-400" />
            Hazır Filtreler:
          </span>
          {TACTICAL_NLP_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => void runNlpSearch(preset.query)}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-emerald-500/15 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 text-[10px] font-mono transition cursor-pointer flex items-center gap-1"
            >
              <span className="text-cyan-400 font-bold">[{preset.tag}]</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hata Durumu */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono">
          {error}
        </div>
      )}

      {/* NLP Sorgu Sonuçları */}
      {result && (
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-emerald-300">
                NLP Sonucu: {result.count} Eşleşen Tahta
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 max-w-full overflow-x-auto">
              <Database className="w-3 h-3 text-cyan-400 shrink-0" />
              <code className="text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[260px]">
                {result.sql_where || '1 = 1'}
              </code>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.stocks && result.stocks.length > 0 ? (
              result.stocks.map((stk) => {
                const isSelected = activeTicker === stk.code;
                const isPos = (stk.daily_change ?? 0) >= 0;
                return (
                  <button
                    key={stk.code}
                    type="button"
                    onClick={() => handleSelectStock(stk.code)}
                    className={`p-2.5 text-left rounded-xl border transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-400/40'
                        : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-emerald-300">{stk.code}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <span className={`text-[11px] font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPos ? '+' : ''}{stk.daily_change?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{stk.name}</div>
                    <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-300">
                      <span>F/K: {stk.pe ? stk.pe.toFixed(1) : '-'}</span>
                      <span>PD/DD: {stk.pb ? stk.pb.toFixed(1) : '-'}</span>
                      <span>Temettü: %{stk.dividend_yield?.toFixed(1) ?? '0.0'}</span>
                      <span className={(stk.bofa_net_lot ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        BofA: {stk.bofa_net_lot ? `${(stk.bofa_net_lot / 1000).toFixed(0)}k` : '-'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-cyan-300">
                      <span>₺{stk.price.toFixed(2)}</span>
                      <span className="inline-flex items-center gap-0.5">
                        Tahtaya Geç <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              result.symbols.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleSelectStock(sym)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-400 flex items-center justify-between text-xs font-mono cursor-pointer"
                >
                  <span className="font-bold text-emerald-300">{sym}</span>
                  <span className="text-cyan-300 flex items-center gap-1">
                    Seç <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* MT16 QuantMind Doğrudan Entegrasyon Aksiyonu */}
      {onExecuteQuantMindQuery && nlpQuery.trim() && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
          <span className="text-[11px] font-mono text-emerald-200 truncate">
            Sorguyu MT16 QuantMind stratejistinde derin analiz et:
          </span>
          <button
            type="button"
            onClick={() => {
              onExecuteQuantMindQuery(nlpQuery);
              if (mode === 'dropdown' && onClose) onClose();
            }}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-black text-[10px] shrink-0 cursor-pointer"
          >
            QuantMind Analizi Başlat
          </button>
        </div>
      )}

      {/* 500+ BIST Hızlı Sembol ve Şirket Filtresi */}
      <div className="pt-2 border-t border-slate-800/90 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            BIST Hızlı Sembol &amp; Tahta Seçici (500+ Şirket)
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {filteredQuickStocks.length} Gösteriliyor
          </span>
        </div>

        <input
          type="text"
          value={quickSymbolFilter}
          onChange={(e) => setQuickSymbolFilter(e.target.value)}
          placeholder="Sembol veya şirket adı filtrele (örn: ASELS, THYAO, EREGL, GARAN)..."
          className="w-full bg-slate-900 border border-slate-700/90 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {filteredQuickStocks.map((stock) => {
            const isCurrent = activeTicker === stock.code;
            return (
              <button
                key={stock.code}
                type="button"
                onClick={() => handleSelectStock(stock.code)}
                className={`p-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-all text-left border ${
                  isCurrent
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-900/70 hover:bg-slate-800/90 text-slate-300 border-slate-800/80 hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-black text-emerald-300 shrink-0">{stock.code}</span>
                  <span className="text-[11px] text-slate-300 truncate">{stock.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[10px] font-mono text-cyan-400">{stock.sector}</span>
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Sol açılır / Üst bar dropdown modu: ekran dışına taşmayı kesinlikle engelleyen fixed/absolute z-50 konumlandırma
  if (mode === 'dropdown') {
    return (
      <div
        className={`fixed sm:absolute left-2 sm:left-0 top-16 sm:top-full sm:mt-2 z-50 w-[calc(100vw-1rem)] sm:w-[540px] max-w-[94vw] shadow-[0_24px_70px_rgba(0,0,0,0.95)] ${className}`}
      >
        <DraggablePanel
          id="header-left-nlp-search-dropdown"
          title={`NLP Arama & Sembol Tarayıcı (#${activeTicker})`}
          subtitle="Sürüklenebilir Savaş Odası Arama Penceresi"
          badgeText="NLP SEARCH"
          accentColor="emerald"
          compactHeader
        >
          {panelBody}
        </DraggablePanel>
      </div>
    );
  }

  // Yüzer (Floating) veya Inline Savaş Odası Pencere Modu
  return (
    <div className={`z-50 ${className}`}>
      <DraggablePanel
        id="floating-nlp-search-panel"
        title={`NLP Arama & Kuant Sorgu Penceresi (#${activeTicker})`}
        subtitle="SQL/TypeORM Doğal Dil Tarayıcı · max-h-[70vh]"
        badgeText="NLP ARAMA"
        accentColor="emerald"
        compactHeader
      >
        {panelBody}
      </DraggablePanel>
    </div>
  );
};

export default NlpSearchPanel;
