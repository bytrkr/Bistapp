// src/components/AlpacaExecutorCard.tsx
import React, { useState, useEffect } from 'react';
import {
  Activity,
  DollarSign,
  Zap,
  ShieldCheck,
  TrendingUp,
  Play,
  CheckCircle2,
  Layers,
  RefreshCw,
  Globe,
  Coins,
  ArrowUpRight,
  Lock
} from 'lucide-react';

export interface AlpacaExecutorCardProps {
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ';
  currentSymbol?: string;
  className?: string;
}

interface AlpacaAccount {
  status: string;
  currency: string;
  cash: number;
  portfolioValue: number;
  buyingPower: number;
  equity: number;
  paper: boolean;
  connected: boolean;
}

interface AlpacaExecution {
  executionId: string;
  symbol: string;
  assetType: 'STOCK' | 'CRYPTO';
  side: 'buy' | 'sell';
  qty: number;
  notional: number;
  entryPrice: number;
  tpPrice: number;
  slPrice: number;
  status: string;
  timeFormatted: string;
  accounting: {
    grossUsdt: number;
    feeUsdt: number;
    slippageUsdt: number;
    netPnlEstimate: number;
  };
}

export const AlpacaExecutorCard: React.FC<AlpacaExecutorCardProps> = ({
  marketType = 'NASDAQ',
  currentSymbol,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'CRYPTO'>(
    marketType === 'CRYPTO' ? 'CRYPTO' : 'STOCK'
  );

  const [account, setAccount] = useState<AlpacaAccount | null>(null);
  const [history, setHistory] = useState<AlpacaExecution[]>([]);
  const [loadingAccount, setLoadingAccount] = useState<boolean>(false);
  const [executingSymbol, setExecutingSymbol] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [stockSymbol, setStockSymbol] = useState<string>(
    currentSymbol && marketType === 'NASDAQ' ? currentSymbol : 'NVDA'
  );
  const [cryptoSymbol, setCryptoSymbol] = useState<string>(
    currentSymbol && marketType === 'CRYPTO' ? currentSymbol : 'BTC/USD'
  );
  const [notionalAmount, setNotionalAmount] = useState<number>(250);
  const [tpPct, setTpPct] = useState<number>(2.0);
  const [slPct, setSlPct] = useState<number>(1.0);

  const fetchAccountAndHistory = async () => {
    try {
      setLoadingAccount(true);
      const [accRes, histRes] = await Promise.all([
        fetch('/api/alpaca/account'),
        fetch('/api/alpaca/history')
      ]);

      if (accRes.ok) {
        const accJson = await accRes.json();
        if (accJson.success) setAccount(accJson.account);
      }

      if (histRes.ok) {
        const histJson = await histRes.json();
        if (histJson.success) setHistory(histJson.history);
      }
    } catch (e) {
      console.error('Failed to fetch Alpaca data', e);
    } finally {
      setLoadingAccount(false);
    }
  };

  useEffect(() => {
    fetchAccountAndHistory();
    const interval = setInterval(fetchAccountAndHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleExecuteOrder = async (type: 'STOCK' | 'CRYPTO') => {
    const sym = type === 'STOCK' ? stockSymbol : cryptoSymbol;
    setExecutingSymbol(sym);
    setSuccessMessage(null);

    try {
      const endpoint = type === 'STOCK' ? '/api/alpaca/execute-stock' : '/api/alpaca/execute-crypto';
      const payload = {
        symbol: sym,
        notional: notionalAmount,
        side: 'buy',
        tpPct,
        slPct
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage(`✅ ${sym} Başarıyla Bracket OCO Emri Gönderildi! ($${notionalAmount} USD)`);
        fetchAccountAndHistory();
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      alert(`Emir İletim Hatası: ${err?.message || 'Bilinmeyen hata'}`);
    } finally {
      setExecutingSymbol(null);
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl ${className}`}>
      {/* Header & Account Summary */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" /> Alpaca Otonom Bracket Emir & Hesap Terminali
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {account?.paper ? 'ALPACA PAPER TRADING' : 'ALPACA LIVE API'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            NASDAQ Hisseleri (#NVDA, #AAPL) ve Alpaca Kripto (BTC/USD, ETH/USD) $250 OCO Emir Yürütme Motoru
          </p>
        </div>

        {/* Hesap Değer Kartı */}
        <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Portföy / Alım Gücü</div>
            <div className="text-sm font-bold font-mono text-emerald-400">
              ${account?.portfolioValue ? account.portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '104,800.00'}
            </div>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Kullanılabilir Nakit</div>
            <div className="text-sm font-bold font-mono text-cyan-400">
              ${account?.cash ? account.cash.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '95,420.50'}
            </div>
          </div>
          <button
            onClick={fetchAccountAndHistory}
            disabled={loadingAccount}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Hesap Bakiyesini Yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAccount ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sekmeler: STOCK vs CRYPTO */}
      <div className="flex border-b border-slate-800 mb-4 gap-4">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            activeTab === 'STOCK'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" /> 🇺🇸 NASDAQ Hisseleri (NVDA, AAPL, TSLA)
        </button>
        <button
          onClick={() => setActiveTab('CRYPTO')}
          className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            activeTab === 'CRYPTO'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Coins className="w-4 h-4" /> 🪙 Alpaca Kripto (BTC/USD, ETH/USD, SOL/USD)
        </button>
      </div>

      {/* Başarı Bildirimi */}
      {successMessage && (
        <div className="mb-4 bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 p-3 rounded-xl text-xs flex items-center justify-between">
          <span>{successMessage}</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
      )}

      {/* İŞLEM KONTROL PANELİ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-5">
        <div className="md:col-span-8 bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {activeTab === 'STOCK' ? 'NASDAQ Hisse Senedi Seçimi' : 'Alpaca Kripto Parite Seçimi'}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Sabit Bütçe: ${notionalAmount} USD ($250)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {activeTab === 'STOCK' ? (
              ['NVDA', 'AAPL', 'TSLA', 'MSFT'].map(sym => (
                <button
                  key={sym}
                  onClick={() => setStockSymbol(sym)}
                  className={`py-2 px-3 rounded-lg text-xs font-mono font-bold border transition ${
                    stockSymbol === sym
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {sym}
                </button>
              ))
            ) : (
              ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD'].map(sym => (
                <button
                  key={sym}
                  onClick={() => setCryptoSymbol(sym)}
                  className={`py-2 px-3 rounded-lg text-xs font-mono font-bold border transition ${
                    cryptoSymbol === sym
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {sym}
                </button>
              ))
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Emir Bütçesi ($ USD)</label>
              <input
                type="number"
                value={notionalAmount}
                onChange={e => setNotionalAmount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Take-Profit (TP %)</label>
              <input
                type="number"
                step="0.1"
                value={tpPct}
                onChange={e => setTpPct(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Stop-Loss (SL %)</label>
              <input
                type="number"
                step="0.1"
                value={slPct}
                onChange={e => setSlPct(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-rose-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Çalıştır Butonu Kartı */}
        <div className="md:col-span-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200 mb-1">Otonom Bracket OCO Emri</div>
            <p className="text-[11px] text-slate-400 mb-3">
              Anında pazar emri girer ve otomatik TP (+{tpPct}%) ile SL (-{slPct}%) kademelerini kilitleer.
            </p>
          </div>

          <button
            onClick={() => handleExecuteOrder(activeTab)}
            disabled={executingSymbol !== null}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
              activeTab === 'STOCK'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            } disabled:opacity-50`}
          >
            <Play className={`w-4 h-4 fill-current ${executingSymbol ? 'animate-spin' : ''}`} />
            {executingSymbol ? 'Alpaca Emir Gönderiliyor...' : `🚀 $${notionalAmount} USD ${activeTab === 'STOCK' ? stockSymbol : cryptoSymbol} Emrini Tetikle`}
          </button>
        </div>
      </div>

      {/* GERÇEKLEŞEN İŞLEM GEÇMİŞİ TABLOSU */}
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Alpaca OCO Emir Geçmişi & Net Muhasebe
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {history.length} İşlem Kayıtlı
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="p-2.5">Zaman</th>
                <th className="p-2.5">Varlık / Tür</th>
                <th className="p-2.5">Taraf</th>
                <th className="p-2.5">Adet / Miktar</th>
                <th className="p-2.5">Giriş Fiyatı</th>
                <th className="p-2.5">Take-Profit (TP)</th>
                <th className="p-2.5">Stop-Loss (SL)</th>
                <th className="p-2.5">Net PnL Tahmini</th>
                <th className="p-2.5">Durum</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, idx) => (
                <tr
                  key={`alp-hist-${h.executionId || idx}`}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30 transition text-slate-200"
                >
                  <td className="p-2.5 text-slate-400">{h.timeFormatted}</td>
                  <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                    <span>{h.symbol}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                      {h.assetType}
                    </span>
                  </td>
                  <td className="p-2.5 text-emerald-400 font-bold uppercase">{h.side}</td>
                  <td className="p-2.5">{h.qty}</td>
                  <td className="p-2.5">${h.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-2.5 text-emerald-400">${h.tpPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-2.5 text-rose-400">${h.slPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-2.5 text-emerald-400 font-bold">+${h.accounting.netPnlEstimate}</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans font-bold">
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-slate-500">
                    Henüz Alpaca üzerinden gerçekleştirilen emir bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
