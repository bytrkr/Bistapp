import React, { useState } from 'react';
import { Search, Sparkles, Filter, Database, ArrowRight, X, Loader2, CheckCircle2 } from 'lucide-react';

export interface NlpSearchResult {
  query: string;
  sql_where: string;
  sql_parameters: Record<string, any>;
  typeorm_filters: Record<string, any>;
  matched_rules: string[];
  count: number;
  symbols: string[];
  stocks?: Array<{
    code: string;
    name: string;
    sector: string;
    price: number;
    pe?: number;
    pb?: number;
    dividend_yield?: number;
    bofa_net_lot?: number;
    rsi?: number;
    volume?: number;
    daily_change?: number;
  }>;
}

interface SearchBarProps {
  onSelectTicker?: (ticker: string) => void;
  activeTicker?: string;
  placeholder?: string;
  className?: string;
}

const PRESET_QUERIES = [
  'F/K 8den kucuk BofA toplayan temettu hisseleri',
  'PD/DD 1.5 altinda olan ucuz bankalar',
  'Hacmi yuksek savunma hisseleri',
  'RSI 45 alti dip yapan sirketler',
  'Yukselen temettu odeyen holdingler',
];

export const SearchBar: React.FC<SearchBarProps> = ({
  onSelectTicker,
  activeTicker,
  placeholder = "Doğal dilde ara: 'F/K 8den kucuk BofA toplayan temettu hisseleri'...",
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NlpSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchTerm?: string) => {
    const textToSearch = (searchTerm ?? query).trim();
    if (!textToSearch) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/nlp_search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: textToSearch }),
      });

      if (!res.ok) {
        throw new Error(`Arama servisi yanıt vermedi (${res.status})`);
      }

      const data: NlpSearchResult = await res.json();
      setResult(data);
      if (searchTerm) {
        setQuery(searchTerm);
      }
    } catch (err: any) {
      console.error('NLP Search Error:', err);
      setError(err?.message || 'Arama gerçekleştirilirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResult(null);
    setError(null);
  };

  const handleInspect = (symbol: string) => {
    onSelectTicker?.(symbol);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      window.dispatchEvent(new CustomEvent('switchTab', { detail: 0 }));
    } catch {}
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Main Search Input Form */}
      <div className="relative flex items-center bg-slate-900 border border-slate-700/80 rounded-xl shadow-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        <div className="pl-4 pr-2 text-slate-400">
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono"
        />

        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition"
            title="Temizle"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={isLoading || !query.trim()}
          className="mr-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg font-mono flex items-center gap-1.5 transition shadow-sm"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span>NLP Sorgula</span>
        </button>
      </div>

      {/* Preset Suggestions Chips */}
      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
          <Filter className="w-3 h-3 text-slate-500" />
          Hızlı Örnekler:
        </span>
        {PRESET_QUERIES.map((pq, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => void handleSearch(pq)}
            className="text-[11px] font-mono px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition"
          >
            {pq}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-lg font-mono">
          {error}
        </div>
      )}

      {/* Search Results Display */}
      {result && (
        <div className="mt-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200 font-mono">
                NLP Filtre Sonucu: {result.count} Hisse Bulundu
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Database className="w-3 h-3 text-cyan-400" />
              <span>SQL:</span>
              <code className="text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                {result.sql_where || '1 = 1'}
              </code>
            </div>
          </div>

          {/* TypeORM Filter Badges */}
          {result.typeorm_filters && Object.keys(result.typeorm_filters).length > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500 font-mono uppercase">TypeORM Parametreleri:</span>
              {Object.entries(result.typeorm_filters).map(([key, val]) => (
                <span
                  key={key}
                  className="text-[10px] font-mono px-2 py-0.5 bg-blue-950/60 text-blue-300 border border-blue-800/60 rounded"
                >
                  {key}: {String(val)}
                </span>
              ))}
            </div>
          )}

          {/* Matched Symbols Cards */}
          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {result.stocks && result.stocks.length > 0 ? (
              result.stocks.map((stk) => {
                const isSelected = activeTicker === stk.code;
                const isPos = (stk.daily_change ?? 0) >= 0;
                return (
                  <button
                    key={stk.code}
                    type="button"
                    onClick={() => handleInspect(stk.code)}
                    className={`p-3 text-left rounded-lg border transition flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500/80 shadow-md ring-1 ring-blue-500/40'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-blue-400 group-hover:text-blue-300">
                          {stk.code}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <span
                        className={`text-xs font-mono font-bold ${
                          isPos ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPos ? '+' : ''}
                        {stk.daily_change?.toFixed(2)}%
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 truncate mt-1">
                      {stk.name}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-300">
                      <div>
                        <span className="text-slate-500">F/K: </span>
                        <span>{stk.pe ? stk.pe.toFixed(1) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">PD/DD: </span>
                        <span>{stk.pb ? stk.pb.toFixed(1) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Temettü: </span>
                        <span>%{stk.dividend_yield?.toFixed(1) ?? '0.0'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">BofA: </span>
                        <span className={(stk.bofa_net_lot ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {stk.bofa_net_lot ? `${(stk.bofa_net_lot / 1000).toFixed(0)}k` : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-blue-400 font-mono group-hover:translate-x-0.5 transition-transform">
                      <span>{stk.price.toFixed(2)} TL</span>
                      <span className="flex items-center gap-0.5">
                        İncele <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              // Symbols only fallback
              result.symbols.map((sym) => {
                const isSelected = activeTicker === sym;
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => handleInspect(sym)}
                    className={`p-3 text-left rounded-lg border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 shadow-md'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="font-mono font-bold text-sm text-blue-400">
                      {sym}
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      Seç <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
