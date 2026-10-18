// src/components/MamPropDashboardCard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  ShieldAlert,
  TrendingUp,
  Activity,
  Layers,
  RefreshCw,
  Send,
  Sliders,
  DollarSign,
  CheckCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { PropSubAccount, MasterOcoExecutionResult } from '../types/enterprise';
import { InstitutionalRiskMetrics, MarketSector } from '../types/quantEngine';

export type PropAccount = PropSubAccount;
export type RiskMetrics = InstitutionalRiskMetrics;

export const MamPropDashboardCard: React.FC = () => {
  const [accounts, setAccounts] = useState<PropAccount[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [masterSymbol, setMasterSymbol] = useState<string>('BTCUSDT');
  const [masterMarket, setMasterMarket] = useState<MarketSector>('CRYPTO');
  const [masterNotional, setMasterNotional] = useState<number>(2500);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [history, setHistory] = useState<MasterOcoExecutionResult[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [resMam, resRisk] = await Promise.all([
        fetch('/api/mam/accounts').then(r => r.json()),
        fetch('/api/risk/institutional-metrics').then(r => r.json()),
      ]);

      if (resMam.success) {
        setAccounts(resMam.accounts || []);
        setHistory(resMam.history || []);
      }
      if (resRisk.success) {
        setRiskMetrics(resRisk.metrics || null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleMasterExecute = async () => {
    setIsExecuting(true);
    setMessage('');
    try {
      const res = await fetch('/api/mam/execute-master-oco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: masterSymbol,
          market: masterMarket,
          notionalUsd: Number(masterNotional),
          side: 'buy',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || 'Master OCO emri başarıyla iletildi.');
        fetchData();
      }
    } catch {
      setMessage('Master OCO emir iletiminde hata oluştu.');
    } finally {
      setIsExecuting(false);
    }
  };

  const totalCapital = accounts.reduce((acc, a) => acc + a.allocatedCapitalUsd, 0);
  const totalEquity = accounts.reduce((acc, a) => acc + a.currentEquityUsd, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Briefcase className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                PROP TRADING & B2B MULTI-ACCOUNT MANAGER (MAM/PAMM) & RİSK KATMANI
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Kurumsal B2B Katman
              </span>
            </div>
            <p className="text-xs text-slate-400">
              MAM/PAMM alt hesap otonom oransal emir rotalama, Monte Carlo simülasyonu, VaR %95 ve Kelly pozisyon boyutlandırma.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition"
          title="Yenile"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* TOP SUMMARY METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Toplam Yönetilen Sermaye</div>
          <div className="text-xl font-mono font-black text-white mt-1">
            ${totalCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">{accounts.length} Aktif Prop / PAMM Alt Hesap</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Toplam Özkaynak (Equity)</div>
          <div className="text-xl font-mono font-black text-emerald-300 mt-1">
            ${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">+%{(((totalEquity - totalCapital) / totalCapital) * 100).toFixed(2)} Toplam Kâr</div>
        </div>

        {riskMetrics && (
          <>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Value at Risk (VaR 95%)</div>
              <div className="text-xl font-mono font-black text-rose-400 mt-1">
                -${riskMetrics.var95Usd.toLocaleString('en-US')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">-{riskMetrics.var95Pct}% Günlük Risk Sınırı</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Kelly Kriteri Öneri</div>
              <div className="text-xl font-mono font-black text-purple-300 mt-1">
                %{riskMetrics.kellyCriterionPct}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Pozisyon Boyutu: ${riskMetrics.recommendedPositionSizeUsd.toLocaleString('en-US')}</div>
            </div>
          </>
        )}
      </div>

      {/* MASTER OCO EMİR ROTALAMA PANELİ */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Send className="w-4 h-4 text-purple-400" />
          Master OCO Sinyal Rotalama (Tüm Alt Hesaplara Eşzamanlı Dağıtım)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Pazar</label>
            <select
              value={masterMarket}
              onChange={e => {
                const m = e.target.value as MarketSector;
                setMasterMarket(m);
                setMasterSymbol(m === 'BIST' ? 'ASELS' : m === 'NASDAQ' ? 'NVDA' : 'BTCUSDT');
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            >
              <option value="CRYPTO">CRYPTO</option>
              <option value="NASDAQ">NASDAQ</option>
              <option value="BIST">BIST</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Sembol</label>
            <input
              type="text"
              value={masterSymbol}
              onChange={e => setMasterSymbol(e.target.value.toUpperCase())}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Master Bütçe ($)</label>
            <input
              type="number"
              value={masterNotional}
              onChange={e => setMasterNotional(Number(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              disabled={isExecuting}
              onClick={handleMasterExecute}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              {isExecuting ? 'Rotalanıyor...' : 'Master OCO Emrini Fırlat'}
            </button>
          </div>
        </div>

        {message && <div className="text-xs text-purple-300 font-bold mt-2">{message}</div>}
      </div>

      {/* ALT HESAPLAR TABLOSU */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Bağlı Prop Alt Hesapları & PAMM Havuzları
        </h4>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3">Hesap ID</th>
                <th className="p-3">Hesap Adı</th>
                <th className="p-3">Tür</th>
                <th className="p-3">Sermaye ($)</th>
                <th className="p-3">Özkaynak ($)</th>
                <th className="p-3">Kaldıraç</th>
                <th className="p-3">Açık İşlem</th>
                <th className="p-3">Kar Payı (%)</th>
                <th className="p-3">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {accounts.map(acc => (
                <tr key={acc.accountId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-purple-400">{acc.accountId}</td>
                  <td className="p-3 font-bold text-white">{acc.accountName}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300">
                      {acc.accountType}
                    </span>
                  </td>
                  <td className="p-3 font-mono">${acc.allocatedCapitalUsd.toLocaleString('en-US')}</td>
                  <td className="p-3 font-mono font-bold text-emerald-400">${acc.currentEquityUsd.toLocaleString('en-US')}</td>
                  <td className="p-3 font-mono">{acc.leverage}x</td>
                  <td className="p-3 font-mono">{acc.activeTradesCount}</td>
                  <td className="p-3 font-mono">%{acc.profitSharePct}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {acc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MONTE CARLO SİMÜLASYON GRAFİĞİ */}
      {riskMetrics && riskMetrics.monteCarloChart && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Monte Carlo Portföy Projeksiyonu (252 İşlem Günü Simülasyonu)
            </h4>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              Yıllık Volatilite: %{riskMetrics.annualizedVolatilityPct}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={riskMetrics.monteCarloChart} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} unit=" Gün" />
                <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  formatter={(val: number | string) => [`$${Number(val).toLocaleString('en-US')}`, 'Değer']}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="p90Optimistic" name="P90 İyimser Senaryo" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p50Median" name="P50 Medyan Beklenti" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="p10Pessimistic" name="P10 Risk Sınırı" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
