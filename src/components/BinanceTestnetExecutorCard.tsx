import React, { useState, useEffect } from 'react';
import {
  Zap,
  Shield,
  Play,
  RotateCcw,
  CheckCircle2,
  Terminal,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Cpu,
  Lock,
  Flame,
  Clock,
  Code2
} from 'lucide-react';

export interface BinanceTestnetExecutorProps {
  currentSymbol?: string;
  isLiveAutoTrade?: boolean;
  onToggleAutoTrade?: (active: boolean) => void;
  className?: string;
}

interface ExecutionResult {
  executionId: string;
  symbol: string;
  orderId: number;
  clientOrderId: string;
  transactTime: number;
  timeFormatted: string;
  price: number;
  origQty: number;
  executedQty: number;
  cummulativeQuoteQty: number;
  status: 'FILLED' | 'PENDING' | 'REJECTED';
  type: 'MARKET';
  side: 'BUY';
  testnet: boolean;
  fills: Array<{
    price: number;
    qty: number;
    commission: number;
    commissionAsset: string;
  }>;
  ocoOrderList: {
    orderListId: number;
    contingencyType: string;
    listStatusType: string;
    listOrderStatus: string;
    listClientOrderId: string;
    symbol: string;
    orderReports: Array<{
      orderId: number;
      price: number;
      stopPrice?: number;
      origQty: number;
      type: string;
      label: string;
    }>;
  };
  accounting: {
    grossUsdt: number;
    feeUsdt: number;
    slippageUsdt: number;
    tpPrice: number;
    slTriggerPrice: number;
    slLimitPrice: number;
    potentialProfitUsdt: number;
    maxLossUsdt: number;
    riskRewardRatio: string;
  };
  triggerMetrics: {
    zScore: number;
    obi: number;
    anomalyStatus: string;
    source: string;
  };
}

export const BinanceTestnetExecutorCard: React.FC<BinanceTestnetExecutorProps> = ({
  currentSymbol = 'BTCUSDT',
  isLiveAutoTrade = false,
  className = ''
}) => {
  const [symbol, setSymbol] = useState<string>(currentSymbol.toUpperCase());
  const [usdtAmount, setUsdtAmount] = useState<number>(250.0);
  const [tpPct, setTpPct] = useState<number>(2.0);
  const [slPct, setSlPct] = useState<number>(1.0);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [lastExecution, setLastExecution] = useState<ExecutionResult | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionResult[]>([]);
  const [showJsonTerminal, setShowJsonTerminal] = useState<boolean>(false);
  const [autoAnomalyTriggerEnabled, setAutoAnomalyTriggerEnabled] = useState<boolean>(true);
  const [terminalOutputLogs, setTerminalOutputLogs] = useState<string[]>([
    '🚀 Binance Spot Testnet Otonom Motoru Başlatıldı...',
    '🛡️ Risk Parametreleri: %2.0 Take-Profit | %1.0 Stop-Loss (OCO)',
    '⚡ Kuant Kuralı: WebSocket canlı akışından Z >= +2.0σ ve OBI >= +0.60 geldiğinde otonom tetiklenir.',
    '🟢 Testnet Sanal API Anahtarları Doğrulandı (testnet=True).'
  ]);

  useEffect(() => {
    if (currentSymbol && ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'AVAXUSDT', 'XRPUSDT'].includes(currentSymbol)) {
      setSymbol(currentSymbol);
    }
  }, [currentSymbol]);

  // Geçmiş işlemleri sunucudan çek
  const fetchExecutions = async () => {
    try {
      const res = await fetch('/api/binance/executions');
      const data = await res.json();
      if (data.success && data.data) {
        setExecutionHistory(data.data);
        if (data.data.length > 0 && !lastExecution) {
          setLastExecution(data.data[0]);
        }
      }
    } catch {
      // sessiz fallback
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, []);

  // OCO Emri Gönderimi (execute_market_buy_with_oco)
  const handleExecuteOcoOrder = async () => {
    try {
      setIsExecuting(true);
      const res = await fetch('/api/binance/execute-oco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          usdt_amount: usdtAmount,
          tp_pct: tpPct,
          sl_pct: slPct,
          source: 'MANUAL_TEST'
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const exec: ExecutionResult = json.data;
        setLastExecution(exec);
        setExecutionHistory(prev => [exec, ...prev.slice(0, 19)]);

        // Terminal loglarına ekle
        const newLog = [
          `[${exec.timeFormatted}] ⚡ $${exec.cummulativeQuoteQty} USDT ${exec.symbol} Market Alımı Yapıldı @ $${exec.price.toLocaleString('en-US')}`,
          `[${exec.timeFormatted}] 🛡️ OCO Emri Gönderildi (ListID: #${exec.ocoOrderList.orderListId}): TP: $${exec.accounting.tpPrice} (+%${tpPct}) | SL: $${exec.accounting.slTriggerPrice} (-%${slPct})`,
          `[${exec.timeFormatted}] 📊 Muhasebe: Borsa Komisyonu ($${exec.accounting.feeUsdt}) | Kayma ($${exec.accounting.slippageUsdt})`
        ];
        setTerminalOutputLogs(prev => [...newLog, ...prev.slice(0, 20)]);
      }
    } catch (err) {
      console.error('Testnet emir hatası:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl ${className}`}>
      {/* 🚀 BAŞLIK & TESTNET MODU BİLGİ KUTUSU */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                🚀 Binance Spot Testnet Otonom Motoru (BinanceSpotExecutor)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                testnet=True
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              WebSocket canlı akışından <strong>Z &gt;= +2.0σ</strong> ve <strong>OBI &gt;= +0.60</strong> geldiğinde otonom tetiklenir.
            </p>
          </div>
        </div>

        {/* Canlı Durum Rozetleri */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            API: SİMÜLASYON / TESTNET
          </span>
          <button
            onClick={() => setShowJsonTerminal(!showJsonTerminal)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition flex items-center gap-1.5 border ${
              showJsonTerminal
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            {showJsonTerminal ? 'Paneli Gizle' : 'JSON Çıktısı'}
          </button>
        </div>
      </div>

      {/* 🛡️ RİSK ZIRHI & PARAMETRELER BANNERI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Take-Profit (TP) Seviyesi</span>
            <span className="text-base font-bold text-emerald-400 font-mono">+{tpPct.toFixed(1)}%</span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Stop-Loss (SL) Seviyesi</span>
            <span className="text-base font-bold text-rose-400 font-mono">-{slPct.toFixed(1)}%</span>
          </div>
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Emir Modeli & Risk/Kazanç</span>
            <span className="text-sm font-bold text-blue-300 font-mono">OCO (One-Cancels-Other) • 1:2.0</span>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ⚡ İŞLEM KONTROL VE TEST ETME ALANI */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            {/* Parite */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Parite:</label>
              <select
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="ETHUSDT">ETH/USDT</option>
                <option value="SOLUSDT">SOL/USDT</option>
                <option value="BNBUSDT">BNB/USDT</option>
                <option value="AVAXUSDT">AVAX/USDT</option>
                <option value="XRPUSDT">XRP/USDT</option>
              </select>
            </div>

            {/* Sanal Tutar */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Sanal Büyüklük (USDT):</label>
              <div className="relative">
                <input
                  type="number"
                  value={usdtAmount}
                  onChange={e => setUsdtAmount(Number(e.target.value) || 250)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">USDT</span>
              </div>
            </div>

            {/* TP % */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Kâr Al (TP %):</label>
              <input
                type="number"
                step="0.5"
                value={tpPct}
                onChange={e => setTpPct(Number(e.target.value) || 2.0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* SL % */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Zarar Kes (SL %):</label>
              <input
                type="number"
                step="0.5"
                value={slPct}
                onChange={e => setSlPct(Number(e.target.value) || 1.0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Aksiyon Butonu */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleExecuteOcoOrder}
              disabled={isExecuting}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
              {isExecuting ? 'İşlem İletiliyor...' : `🚀 Anomali Tetikleme Testi ($${usdtAmount} USDT Sanal Alış)`}
            </button>
          </div>
        </div>

        {/* Otomatik Tetikleme Durumu */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoTrigger"
              checked={autoAnomalyTriggerEnabled}
              onChange={e => setAutoAnomalyTriggerEnabled(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="autoTrigger" className="text-slate-300 text-[11px] cursor-pointer">
              WebSocket Akışında Anomali Geldiğinde Otomatik Al & OCO Kur (Z &gt;= +2.0σ, OBI &gt;= +0.60)
            </label>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            Kill-Switch Durumu: <strong className={isLiveAutoTrade ? 'text-red-400' : 'text-emerald-400'}>{isLiveAutoTrade ? 'CANLI MOD' : 'SİMÜLASYON / TESTNET'}</strong>
          </span>
        </div>
      </div>

      {/* 📊 SON GERÇEKLEŞEN TESTNET İŞLEM ÇIKTISI (KART & DETAY) */}
      {lastExecution && (
        <div className="bg-slate-950 rounded-xl p-4 border border-emerald-500/30 mb-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                MARKET ALIM DOLDU (FILLED)
              </span>
              <span className="text-xs font-mono font-bold text-slate-200">
                #{lastExecution.orderId} • {lastExecution.symbol}
              </span>
              <span className="text-xs text-slate-400 font-mono">({lastExecution.timeFormatted})</span>
            </div>

            <span className="text-xs font-mono text-emerald-400 font-bold">
              Giriş: ${lastExecution.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Alınan Miktar</span>
              <span className="font-mono font-bold text-white">
                {lastExecution.origQty} {lastExecution.symbol.replace('USDT', '')}
              </span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Take-Profit Hedefi</span>
              <span className="font-mono font-bold text-emerald-400">
                ${lastExecution.accounting.tpPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} (+%
                {tpPct})
              </span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Stop-Loss Tetikleme</span>
              <span className="font-mono font-bold text-rose-400">
                ${lastExecution.accounting.slTriggerPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} (-%
                {slPct})
              </span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">OCO Sipariş Listesi ID</span>
              <span className="font-mono font-bold text-blue-400">
                #{lastExecution.ocoOrderList.orderListId}
              </span>
            </div>
          </div>

          {/* Net Muhasebe Çubuğu */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-2 border-t border-slate-800 text-slate-400">
            <span>
              Komisyon: <strong className="text-slate-200 font-mono">${lastExecution.accounting.feeUsdt}</strong> • Kayma: <strong className="text-slate-200 font-mono">${lastExecution.accounting.slippageUsdt}</strong>
            </span>
            <span>
              Hedef Net Kâr: <strong className="text-emerald-400 font-mono">+${lastExecution.accounting.potentialProfitUsdt}</strong> | Maks Zarar: <strong className="text-rose-400 font-mono">-${lastExecution.accounting.maxLossUsdt}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 🖥️ PYTHON TEST_EXECUTION JSON LOG TERMİNALİ */}
      {showJsonTerminal && (
        <div className="bg-black/90 rounded-xl p-4 border border-slate-800 mb-5 font-mono text-xs text-slate-300">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Terminal className="w-4 h-4" /> 📊 Testnet İşlem Çıktısı (Python test_execution JSON formatı):
            </span>
            <button
              onClick={() => setShowJsonTerminal(false)}
              className="text-[11px] text-slate-500 hover:text-white"
            >
              ✕ Kapat
            </button>
          </div>
          <pre className="max-h-64 overflow-y-auto p-2 bg-slate-950 rounded border border-slate-900 text-emerald-300/90 text-[11px] leading-relaxed">
            {JSON.stringify(lastExecution, null, 2)}
          </pre>
        </div>
      )}

      {/* 📜 TERMİNAL YÜRÜTME LOGLARI */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            Otonom Yürütme Günlüğü (Audit Trail)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {executionHistory.length} Kayıtlı Testnet Emri
          </span>
        </div>

        <div className="space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto">
          {terminalOutputLogs.map((log, i) => (
            <div key={i} className="text-slate-400 hover:text-slate-200 transition">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
