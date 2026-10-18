// src/components/SignalBotCard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  Radio,
  CheckCircle,
  RefreshCw,
  Bell,
  Activity,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { SignalAlert, SignalBotStatus, MarketSector } from '../types/quantEngine';

export type { SignalAlert, SignalBotStatus };

export const SignalBotCard: React.FC = () => {
  const [alerts, setAlerts] = useState<SignalAlert[]>([]);
  const [status, setStatus] = useState<SignalBotStatus | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [testSymbol, setTestSymbol] = useState<string>('BTCUSDT');
  const [testMarket, setTestMarket] = useState<MarketSector>('CRYPTO');
  const [message, setMessage] = useState<string>('');

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/saas/telegram-signals');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setAlerts(json.alerts || []);
          setStatus(json.status || null);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 5000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const handleTestBroadcast = async () => {
    setIsSending(true);
    setMessage('');
    try {
      const res = await fetch('/api/saas/test-telegram-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: testSymbol, market: testMarket, price: testMarket === 'BIST' ? 48.50 : testMarket === 'NASDAQ' ? 126.20 : 84500.0 }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || 'Sinyal başarıyla gönderildi.');
        fetchSignals();
      }
    } catch {
      setMessage('Sinyal gönderim hatası.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                VIP TELEGRAM & DISCORD OTONOM SİNYAL BOTU
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Webhook Aktif
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Jüri konsensüsü &ge; %80.0 ve Z-Score &ge; +2.00&sigma; olduğunda OCO sinyal kartlarını otomatik fırlatır.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">Durum: Online</span>
          <button
            onClick={fetchSignals}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Yenile"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Bağlı Kanallar</div>
            <div className="text-sm font-bold text-slate-200 mt-1 truncate">
              {status.connectedChannels.join(', ')}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Bugünkü Sinyal</div>
            <div className="text-xl font-mono font-black text-emerald-400 mt-1">
              {status.totalAlertsSentToday} Adet
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Son Fırlatma</div>
            <div className="text-xs font-mono font-bold text-slate-300 mt-1">
              {status.lastBroadcastTime}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Tetikleme Kriteri</div>
            <div className="text-[11px] font-mono font-bold text-blue-300 mt-1 truncate">
              {status.triggerCriteria}
            </div>
          </div>
        </div>
      )}

      {/* TEST SINYAL FIRLATMA PANELİ */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-300">Test Sinyali Fırlat:</span>
          <select
            value={testMarket}
            onChange={e => {
              const m = e.target.value as MarketSector;
              setTestMarket(m);
              setTestSymbol(m === 'BIST' ? 'ASELS' : m === 'NASDAQ' ? 'NVDA' : 'BTCUSDT');
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="CRYPTO">CRYPTO (Binance)</option>
            <option value="NASDAQ">NASDAQ (US)</option>
            <option value="BIST">BIST (Türkiye)</option>
          </select>
          <input
            type="text"
            value={testSymbol}
            onChange={e => setTestSymbol(e.target.value.toUpperCase())}
            placeholder="Sembol (örn: BTCUSDT)"
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono w-28"
          />
        </div>

        <div className="flex items-center gap-3">
          {message && <span className="text-xs text-emerald-400 font-bold">{message}</span>}
          <button
            disabled={isSending}
            onClick={handleTestBroadcast}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Fırlatılıyor...' : 'Telegram / Discord Sinyali Fırlat'}
          </button>
        </div>
      </div>

      {/* GÖNDERİLEN SİNYALLER TABLOSU */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-400" />
          Son Fırlatılan OCO Sinyal Kartları (Broadcast History)
        </h4>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3">Sinyal ID</th>
                <th className="p-3">Zaman</th>
                <th className="p-3">Pazar</th>
                <th className="p-3">Sembol</th>
                <th className="p-3">Giriş ($/₺)</th>
                <th className="p-3">Take-Profit (+%)</th>
                <th className="p-3">Stop-Loss (-%)</th>
                <th className="p-3">OBI / Z-Skor</th>
                <th className="p-3">Jüri Güven</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {alerts.map((al, idx) => (
                <tr key={al.signalId || idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-400">{al.signalId}</td>
                  <td className="p-3 text-slate-400 font-mono">{al.timestamp}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300">
                      {al.market}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-white">{al.symbol}</td>
                  <td className="p-3 font-mono">${al.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 font-mono font-bold text-emerald-400">${al.takeProfitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 font-mono font-bold text-rose-400">${al.stopLossPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 font-mono text-purple-300">OBI: {al.obi} | Z: +{al.zScore}σ</td>
                  <td className="p-3 font-mono font-bold text-emerald-300">%{al.juryConfidence}</td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    Henüz fırlatılmış sinyal bulunmuyor.
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
