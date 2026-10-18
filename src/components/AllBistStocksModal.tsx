import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Filter, ArrowUpDown, Check, Building2, TrendingUp, TrendingDown, Layers, Download, ShieldAlert } from 'lucide-react';
import Ticker, { BISTStock } from '../utils/ticker';

interface AllBistStocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock: (code: string) => void;
  currentTicker?: string;
}

export const AllBistStocksModal: React.FC<AllBistStocksModalProps> = ({
  isOpen,
  onClose,
  onSelectStock,
  currentTicker = 'ASELS'
}) => {
  const [stocks, setStocks] = useState<BISTStock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('TÜMÜ');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'sector' | 'rate'>('code');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Tüm BIST hisselerini listele (kullanıcının istediği Ticker.all() çağrısı)
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setLoading(true);
      Ticker.all()
        .then((allStocks) => {
          if (isMounted) {
            setStocks(allStocks);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Ticker.all() yüklenirken hata:', err);
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Sektör listesi
  const sectors = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach((s) => {
      if (s.sector) set.add(s.sector);
    });
    return ['TÜMÜ', ...Array.from(set).sort()];
  }, [stocks]);

  // Filtrelenmiş ve sıralanmış liste
  const filteredStocks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return stocks
      .filter((s) => {
        const matchesQuery =
          !q ||
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q);
        const matchesSector = selectedSector === 'TÜMÜ' || s.sector === selectedSector;
        return matchesQuery && matchesSector;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy] ?? '';
        let valB: any = b[sortBy] ?? '';
        if (sortBy === 'rate') {
          valA = a.rate ?? -999;
          valB = b.rate ?? -999;
        }
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [stocks, searchQuery, selectedSector, sortBy, sortAsc]);

  const toggleSort = (field: 'code' | 'name' | 'sector' | 'rate') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(stocks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `bist_tum_hisseler_${stocks.length}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!isOpen) return null;

  const cleanCurrent = String(currentTicker).replace(/\.IS$/i, '').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">Borsa İstanbul Hisse Kataloğu</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {stocks.length} Hisse
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                BIST 30, BIST 50, BIST 100 ve tüm pazarlarda işlem gören aktif paylar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              title="JSON Olarak İndir"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hisse kodu, şirket adı veya sektör ara (örn. ASELS, Banka, Havacılık)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-mono"
              >
                Temizle
              </button>
            )}
          </div>

          {/* Sector Selector */}
          <div className="flex flex-col gap-1 sm:w-64">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
              >
                {sectors.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
            {selectedSector !== 'TÜMÜ' && (
              <p className="text-[10px] text-amber-500 font-mono flex items-center gap-1 ml-1">
                <ShieldAlert className="w-2.5 h-2.5" />
                Sektör verisi BIST100 odaklıdır.
              </p>
            )}
          </div>
        </div>

        {/* Stock List Table */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <span className="text-sm font-mono">BIST hisseleri listeleniyor...</span>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Layers className="w-10 h-10 mb-2 opacity-40" />
              <span className="text-sm">Aranan kriterlere uygun hisse bulunamadı.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredStocks.map((stock) => {
                const isSelected = stock.code === cleanCurrent;
                const hasRate = stock.rate != null;
                const isUp = (stock.rate ?? 0) >= 0;

                return (
                  <button
                    key={stock.code}
                    onClick={() => {
                      onSelectStock(stock.code);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/50 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold text-slate-100 group-hover:text-blue-400 transition">
                            {stock.code}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {(stock as any).ticker || `${stock.code}.IS`}
                          </span>
                        </div>
                        <h4 className="text-xs text-slate-300 font-medium line-clamp-1 mt-1">
                          {stock.name}
                        </h4>
                      </div>

                      {isSelected && (
                        <span className="p-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
                      <span className="text-slate-500 text-[10px] truncate max-w-[170px]">
                        {stock.sector}
                      </span>
                      {hasRate && (
                        <span
                          className={`font-mono font-bold flex items-center gap-0.5 ${
                            isUp ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          %{Math.abs(stock.rate!).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Gösterilen: {filteredStocks.length} / {stocks.length} hisse</span>
          <span className="text-slate-500 text-[11px]">Bir hisseye tıklayarak analiz ekranına yükleyin</span>
        </div>
      </div>
    </div>
  );
};

export default AllBistStocksModal;
