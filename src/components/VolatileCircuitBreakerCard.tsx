import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  ZapOff,
  Flame,
  RotateCcw,
  ShieldCheck,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  Radio,
  DollarSign
} from 'lucide-react';

export interface VolatileCircuitBreakerProps {
  symbol: string;
  marketType: 'BIST' | 'CRYPTO' | 'NASDAQ';
  currentPrice: number;
  priceChangePct: number;
  spread?: number;
  spreadPct?: number;
  isLiveAutoTrade?: boolean;
  onToggleAutoTrade?: (active: boolean) => void;
}

export const VolatileCircuitBreakerCard: React.FC<VolatileCircuitBreakerProps> = ({
  symbol,
  marketType,
  currentPrice = 0,
  priceChangePct = 0,
  spread = 0.05,
  spreadPct = 0.08,
  isLiveAutoTrade = false,
  onToggleAutoTrade
}) => {
  const safePriceChange = typeof priceChangePct === 'number' && !isNaN(priceChangePct) ? priceChangePct : 0;
  const safeSpreadPct = typeof spreadPct === 'number' && !isNaN(spreadPct) ? spreadPct : 0.08;
  const safePrice = typeof currentPrice === 'number' && !isNaN(currentPrice) ? currentPrice : 0;
  const safeSpread = typeof spread === 'number' && !isNaN(spread) ? spread : 0.05;

  const [isTripped, setIsTripped] = useState<boolean>(false);
  const [tripReason, setTripReason] = useState<string>('');
  const [tripTimestamp, setTripTimestamp] = useState<string>('');
  const [emergencyCashOut, setEmergencyCashOut] = useState<boolean>(false);
  const [simulatedDrop, setSimulatedDrop] = useState<boolean>(false);

  // Otomatik tespit motoru: Ani %2.5+ oynaklık veya ekstrem spread genişlemesi
  useEffect(() => {
    const isExtremeVolatility = Math.abs(safePriceChange) >= 2.5 || simulatedDrop;
    const isExtremeSpread = safeSpreadPct > 0.45;

    if (isExtremeVolatility || isExtremeSpread) {
      if (!isTripped) {
        setIsTripped(true);
        const reason = simulatedDrop
          ? `Manuel Kuant Testi: ${symbol} paritesinde dakikalık %3.42 ani şok düşüş simüle edildi.`
          : isExtremeVolatility
          ? `Dakikalık bazda %${Math.abs(safePriceChange).toFixed(2)} ani şok fiyat hareketi tespit edildi.`
          : `Ekstrem tahta likidite boşalması ve spread genişlemesi (%${safeSpreadPct.toFixed(2)}).`;

        setTripReason(reason);
        setTripTimestamp(new Date().toLocaleTimeString('tr-TR'));
        setEmergencyCashOut(true);

        // Otonom alım robotunu acil durdur
        if (onToggleAutoTrade && isLiveAutoTrade) {
          onToggleAutoTrade(false);
        }
      }
    }
  }, [priceChangePct, spreadPct, simulatedDrop, isTripped, symbol, onToggleAutoTrade, isLiveAutoTrade]);

  const handleReset = () => {
    setIsTripped(false);
    setSimulatedDrop(false);
    setTripReason('');
    setEmergencyCashOut(false);
  };

  const handleSimulateShock = () => {
    setSimulatedDrop(true);
    setIsTripped(true);
    setTripReason(`[TEST SİMÜLASYONU] ${symbol} için ani Flash Crash (%-3.45) şok dalgası tetiklendi.`);
    setTripTimestamp(new Date().toLocaleTimeString('tr-TR'));
    setEmergencyCashOut(true);
    if (onToggleAutoTrade && isLiveAutoTrade) {
      onToggleAutoTrade(false);
    }
  };

  return (
    <div className={`rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden ${
      isTripped
        ? 'bg-gradient-to-br from-rose-950/70 via-slate-900 to-slate-950 border-rose-500/80 shadow-rose-950/50'
        : 'bg-slate-900/90 border-slate-800'
    }`}>
      {/* Üst Başlık Şeridi */}
      <div className={`px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b ${
        isTripped ? 'border-rose-500/40 bg-rose-950/40' : 'border-slate-800 bg-slate-950/50'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl text-white shadow-md transition-transform ${
            isTripped ? 'bg-rose-600 animate-pulse scale-105' : 'bg-slate-800 text-slate-300'
          }`}>
            {isTripped ? <AlertOctagon className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-bold tracking-tight ${isTripped ? 'text-rose-200' : 'text-white'}`}>
                MT16 Volatilite Kaçış Şalteri & Devre Kesici (Flash Crash Guard)
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                isTripped
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {isTripped ? '🛑 ŞALTER ATILDI' : '🛡️ DEVREDE / NORMAL'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Dakikalık ±%2.5 sert mumlar, likidite boşalmaları ve borsa devre kesici anomali kalkanı ({symbol})
            </p>
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex items-center gap-2">
          {!isTripped ? (
            <button
              onClick={handleSimulateShock}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Test amaçlı ani %3.45 düşüş şalterini tetikle"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Simüle Et (%-3.2 Şok)</span>
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Şalteri Sıfırla (Reset)</span>
            </button>
          )}
        </div>
      </div>

      {/* Gövde / Durum Paneli */}
      <div className="p-5 space-y-4">
        {isTripped ? (
          /* 🚨 ŞALTER ATILDIĞINDA GÖRÜNTÜLENEN TEHLİKE VE ACİL NAKİT PANELİ */
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-rose-950/60 border border-rose-500/60 rounded-xl p-4 text-rose-100 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-rose-900/80 text-rose-200 border border-rose-500/40 shrink-0">
                <ZapOff className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
                    🛑 ŞOK VOLATİLİTE SİSTEM KİLİDİ (CIRCUIT BREAKER AKTİF)
                  </h4>
                  <span className="font-mono text-xs text-rose-300 bg-rose-900/40 px-2 py-0.5 rounded border border-rose-800">
                    Tetiklenme: {tripTimestamp || 'Şimdi'}
                  </span>
                </div>
                <p className="text-xs text-rose-200 leading-relaxed font-medium">
                  {tripReason}
                </p>
                <div className="text-[11px] text-rose-300/90 font-mono">
                  Otomatik Eylem: Otonom emir motoru kilitlendi. Bekleyen tüm limit emirler askıya alındı.
                </div>
              </div>
            </div>

            {/* Acil Nakde Geçiş & Risk-Off Raporu */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/90 border border-rose-500/30 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Robot Durumu</span>
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-sm font-mono font-bold text-rose-400">
                  GEÇİCİ DURDURULDU
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Yeni alım bloklandı
                </div>
              </div>

              <div className="bg-slate-950/90 border border-rose-500/30 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Acil Nakde Geçiş</span>
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-sm font-mono font-bold text-amber-300">
                  {emergencyCashOut ? '⚡ ACİL NAKİT SİNYALİ' : 'BEKLEMEDE'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Mevcut pozisyonları koru
                </div>
              </div>

              <div className="bg-slate-950/90 border border-rose-500/30 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Spread Güvenliği</span>
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  %{spreadPct.toFixed(3)}
                </div>
                <div className="text-[10px] text-rose-400 mt-1">
                  {spreadPct > 0.3 ? 'Kayma (Slippage) Riski Yüksek' : 'Spread Normal'}
                </div>
              </div>
            </div>

            {/* İkaz Butonu & Talimat */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-rose-400">Kuant Risk Kuralı:</strong> Aşırı volatilite ve likidite anomalisi sönümlenene kadar manuel müdahale olmadan sisteme yeni sermaye aktarımı önerilmez.
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer text-xs flex items-center gap-2 border border-slate-700"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sistem Kilidini Aç & Devam Et</span>
              </button>
            </div>
          </div>
        ) : (
          /* 🛡️ SİSTEM NORMAL ÇALIŞMA DURUMU */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-[11px]">Şalter Eşiği</div>
              <div className="text-sm font-mono font-bold text-white mt-0.5">±%2.50 / Dakika</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Flash Crash Koruması</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-[11px]">Anlık Değişim</div>
              <div className={`text-sm font-mono font-bold mt-0.5 flex items-center gap-1 ${
                priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {priceChangePct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                %{Math.abs(priceChangePct).toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Eşik Altında (Güvenli)</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-400 text-[11px]">Spread / Likidite Farkı</div>
              <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                ${spread.toFixed(2)} (%{spreadPct.toFixed(2)})
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Normal Tahta Derinliği</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div className="text-slate-400 text-[11px]">Devre Kesici Güvenliği</div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>AKTİF / KORUMADA</span>
              </div>
              <div className="text-[10px] text-slate-500">Piyasa Şok Sigortası</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
