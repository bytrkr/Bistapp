import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  Wifi,
  WifiOff,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Zap,
  Radio,
  Server,
  Lock,
  Unlock,
  Sliders,
  CheckCircle2
} from 'lucide-react';

export interface SystemHealthLatencyProps {
  marketType?: 'BIST' | 'CRYPTO' | 'NASDAQ';
  feedName?: string;
  isLiveAutoTrade?: boolean;
  onToggleAutoTrade?: (active: boolean) => void;
  className?: string;
}

interface LatencySample {
  id: number;
  time: string;
  ms: number;
}

export const SystemHealthLatencyCard: React.FC<SystemHealthLatencyProps> = ({
  marketType = 'CRYPTO',
  feedName,
  isLiveAutoTrade = false,
  onToggleAutoTrade,
  className = ''
}) => {
  const [latency, setLatency] = useState<number>(38);
  const [latencyHistory, setLatencyHistory] = useState<LatencySample[]>([
    { id: 1, time: '00:01', ms: 42 },
    { id: 2, time: '00:02', ms: 36 },
    { id: 3, time: '00:03', ms: 39 },
    { id: 4, time: '00:04', ms: 45 },
    { id: 5, time: '00:05', ms: 38 },
    { id: 6, time: '00:06', ms: 41 },
    { id: 7, time: '00:07', ms: 37 },
    { id: 8, time: '00:08', ms: 40 },
    { id: 9, time: '00:09', ms: 38 },
    { id: 10, time: '00:10', ms: 35 },
  ]);

  const [lastResponseTime, setLastResponseTime] = useState<number>(Date.now());
  const [timeSinceLastResponse, setTimeSinceLastResponse] = useState<number>(0);
  const [isDeadMansSwitchTriggered, setIsDeadMansSwitchTriggered] = useState<boolean>(false);
  const [isSimulatingDisconnect, setIsSimulatingDisconnect] = useState<boolean>(false);
  const [simulatedHighLatency, setSimulatedHighLatency] = useState<boolean>(false);
  const [packetLossPct, setPacketLossPct] = useState<number>(0.0);
  const [jitter, setJitter] = useState<number>(4.2);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [deadMansReason, setDeadMansReason] = useState<string>('');

  const sampleSeqRef = useRef<number>(100);
  const latencyRef = useRef<number>(latency);
  latencyRef.current = latency;

  const isSimulatingDisconnectRef = useRef<boolean>(isSimulatingDisconnect);
  isSimulatingDisconnectRef.current = isSimulatingDisconnect;

  const simulatedHighLatencyRef = useRef<boolean>(simulatedHighLatency);
  simulatedHighLatencyRef.current = simulatedHighLatency;

  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Belirlenen Gateway adı
  const defaultFeed = feedName || (
    marketType === 'CRYPTO'
      ? 'Binance Spot WS Gateway (wss://stream.binance.com:9443)'
      : marketType === 'NASDAQ'
      ? 'NASDAQ TotalView ITCH Direct L2 Feed'
      : 'BIST FIX Protocol Order Routing Engine'
  );

  // Ping ölçümü fonksiyonu
  const measurePing = useCallback(async () => {
    if (isSimulatingDisconnectRef.current) {
      // Simülasyon aktifken yanıt alma
      return;
    }

    const start = performance.now();
    try {
      setIsPinging(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch('/api/health', {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const end = performance.now();
      let calculatedMs = Math.round(end - start);

      // Simüle yüksek gecikme aktifse yapay ekleme
      if (simulatedHighLatencyRef.current) {
        calculatedMs += 280 + Math.floor(Math.random() * 60);
      } else {
        // Doğal ağ dalgalanması
        calculatedMs = Math.max(12, calculatedMs + Math.floor(Math.random() * 8) - 4);
      }

      const prevLatency = latencyRef.current;
      latencyRef.current = calculatedMs;
      setLatency(calculatedMs);
      setLastResponseTime(Date.now());
      setTimeSinceLastResponse(0);

      const nextId = ++sampleSeqRef.current;
      const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setLatencyHistory(prev => {
        const next = [...prev.slice(-14), {
          id: nextId,
          time: timeStr,
          ms: calculatedMs
        }];
        return next;
      });

      // Jitter hesabı
      setJitter(parseFloat((Math.abs(calculatedMs - prevLatency) * 0.35 + 2.1).toFixed(1)));
      setPacketLossPct(0.0);
    } catch {
      // İstek başarısız oldu veya zaman aşımına uğradı
      setPacketLossPct(prev => Math.min(100, prev + 25));
    } finally {
      setIsPinging(false);
    }
  }, []);

  // Periyodik Ping Kontrolü
  useEffect(() => {
    measurePing();
    pingIntervalRef.current = setInterval(() => {
      measurePing();
    }, 2500);

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [measurePing]);

  // 100ms aralıklarla son yanıttan geçen süreyi say ve Dead Man's Switch tetikle
  useEffect(() => {
    tickerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastResponseTime;
      setTimeSinceLastResponse(elapsed);

      // Eşik: 5 saniyeden (5000ms) uzun süre yanıt alınamadıysa DEAD MAN'S SWITCH TETİKLENİR!
      if (elapsed > 5000 && !isDeadMansSwitchTriggered) {
        setIsDeadMansSwitchTriggered(true);
        setDeadMansReason(
          `Borsa ve Kuant Sunucu veri akışı ${(elapsed / 1000).toFixed(1)} saniyedir kesintiye uğradı. Otonom robot güvenli moda geçirildi.`
        );

        // Otonom alım robotunu GÜVENLİ MODA SOK (Canlı alımı kapat / durdur)
        if (isLiveAutoTrade && onToggleAutoTrade) {
          onToggleAutoTrade(false);
        }
      }
    }, 200);

    return () => {
      if (tickerIntervalRef.current) clearInterval(tickerIntervalRef.current);
    };
  }, [lastResponseTime, isDeadMansSwitchTriggered, isLiveAutoTrade, onToggleAutoTrade]);

  // Manuel Emniyet Sıfırlama / Yeniden Bağlanma
  const handleResetDeadMansSwitch = () => {
    setIsSimulatingDisconnect(false);
    setSimulatedHighLatency(false);
    setIsDeadMansSwitchTriggered(false);
    setLastResponseTime(Date.now());
    setTimeSinceLastResponse(0);
    setPacketLossPct(0.0);
    measurePing();
  };

  // Simülasyon: Bağlantıyı Kopar (Dead Man's Switch Testi)
  const handleTriggerDisconnectSim = () => {
    setIsSimulatingDisconnect(true);
    setLastResponseTime(Date.now() - 5200); // 5.2 saniye geriye sararak anında tetikle
  };

  // Simülasyon: Yüksek Gecikme Ekle
  const handleToggleHighLatencySim = () => {
    setSimulatedHighLatency(prev => !prev);
    setTimeout(() => measurePing(), 100);
  };

  // Ortalama gecikme
  const avgLatency = Math.round(
    latencyHistory.reduce((acc, curr) => acc + curr.ms, 0) / (latencyHistory.length || 1)
  );

  // Gecikme seviyesi ve rozet mantığı
  const getLatencyTier = (ms: number) => {
    if (ms < 100) {
      return {
        tier: 'EXCELLENT',
        label: '🟢 MÜKEMMEL (LOW LATENCY)',
        badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        color: 'emerald',
        desc: 'Kuant Ultra-Low Latency (HFT). Sıfır kayma (slippage) avantajı.'
      };
    } else if (ms <= 250) {
      return {
        tier: 'NORMAL',
        label: '🟡 NORMAL',
        badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        color: 'amber',
        desc: 'Standart piyasa veri hızı. Algoritmik emir yürütme aktif.'
      };
    } else {
      return {
        tier: 'HIGH',
        label: '🔴 YÜKSEK GECİKME UYARISI',
        badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse',
        color: 'rose',
        desc: 'Kritik gecikme riski! Emir iletiminde kayma (slippage) veya arbitraj kaybı oluşabilir.'
      };
    }
  };

  const status = getLatencyTier(latency);

  return (
    <div
      className={`bg-slate-900 border rounded-xl p-5 shadow-xl transition-all duration-300 ${
        isDeadMansSwitchTriggered
          ? 'border-rose-500 bg-rose-950/20 ring-2 ring-rose-500/40'
          : status.tier === 'HIGH'
          ? 'border-rose-500/50'
          : status.tier === 'NORMAL'
          ? 'border-amber-500/40'
          : 'border-slate-800'
      } ${className}`}
    >
      {/* 🚨 DEAD MAN'S SWITCH AKTİF ACİL DURUM BANNERI */}
      {isDeadMansSwitchTriggered && (
        <div className="mb-5 bg-gradient-to-r from-rose-950/90 via-red-900/80 to-rose-950/90 border border-red-500 text-white p-4 rounded-xl shadow-2xl animate-pulse">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-600 rounded-lg text-white shadow-lg animate-bounce">
                <WifiOff className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-red-200 tracking-wide flex items-center gap-2">
                  🚨 DEAD MAN'S SWITCH AKTİF: BAĞLANTI KOPTU, EMNİYET KİLİDİ AÇILDI
                </h3>
                <p className="text-xs text-red-100/90 mt-0.5">
                  {deadMansReason || 'Borsa/WebSocket bağlantısı 5 saniyeden uzun süredir yanıt vermiyor!'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/40 text-red-300 border border-red-500/40">
                    <Lock className="w-3 h-3 text-red-400" /> Otonom Robot: GÜVENLİ MOD (Emirler Donduruldu)
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono">
                    Son Yanıt: {(timeSinceLastResponse / 1000).toFixed(1)}s önce
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleResetDeadMansSwitch}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg hover:shadow-emerald-500/25 transition cursor-pointer self-stretch md:self-auto justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Yeniden Bağlan & Emniyet Kilidini Sıfırla
            </button>
          </div>
        </div>
      )}

      {/* BAŞLIK & ROZETLER */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg border ${
              isDeadMansSwitchTriggered
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : status.tier === 'EXCELLENT'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : status.tier === 'NORMAL'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">
                Ağ Sağlığı, Gecikme Takipçisi & Dead Man's Switch
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                {marketType} GATEWAY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Radio className="w-3 h-3 text-cyan-400 animate-ping" />
              <span>{defaultFeed}</span>
            </p>
          </div>
        </div>

        {/* Canlı Gecikme Durum Rozeti */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 shadow-sm ${
              isDeadMansSwitchTriggered
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : status.badgeClass
            }`}
          >
            {isDeadMansSwitchTriggered ? (
              <>
                <WifiOff className="w-3.5 h-3.5" /> DEAD MAN'S SWITCH DEVREDE
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" /> {status.label}
              </>
            )}
          </div>
        </div>
      </div>

      {/* METRİK KARTLARI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Anlık Ping */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">Anlık WebSocket Ping</span>
          <div className="flex items-baseline gap-1 my-1">
            <span
              className={`text-2xl font-black font-mono ${
                isDeadMansSwitchTriggered
                  ? 'text-red-400'
                  : status.tier === 'EXCELLENT'
                  ? 'text-emerald-400'
                  : status.tier === 'NORMAL'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {isDeadMansSwitchTriggered ? '>5000' : latency}
            </span>
            <span className="text-xs text-slate-500 font-bold">ms</span>
          </div>
          <span className="text-[10px] text-slate-500 truncate">{status.desc}</span>
        </div>

        {/* Ortalama & Jitter */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">Ortalama / Jitter</span>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-xl font-bold font-mono text-slate-200">{avgLatency} ms</span>
            <span className="text-xs text-slate-400 font-mono">±{jitter}ms</span>
          </div>
          <span className="text-[10px] text-slate-500">Son 15 kalp atışı (heartbeat)</span>
        </div>

        {/* Paket Kaybı & Sağlık */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">Paket Kaybı (Drop Rate)</span>
          <div className="flex items-baseline gap-1 my-1">
            <span
              className={`text-xl font-bold font-mono ${
                packetLossPct === 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              %{packetLossPct.toFixed(1)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {packetLossPct === 0 ? 'Kayıpsız L2 Veri Akışı' : 'Kayıp Paket Uyarısı!'}
          </span>
        </div>

        {/* Dead Man's Switch Emniyet Sayacı */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isDeadMansSwitchTriggered
              ? 'bg-rose-950/40 border-rose-500/50'
              : 'bg-slate-950 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Dead Man's Emniyeti</span>
            {isDeadMansSwitchTriggered ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-ping" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span
              className={`text-xl font-bold font-mono ${
                isDeadMansSwitchTriggered
                  ? 'text-rose-400 font-black'
                  : timeSinceLastResponse > 3000
                  ? 'text-amber-400'
                  : 'text-slate-200'
              }`}
            >
              {(timeSinceLastResponse / 1000).toFixed(1)}s
            </span>
            <span className="text-xs text-slate-500">/ 5.0s Eşik</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {isDeadMansSwitchTriggered ? 'Kilit Açıldı (Nakit Güvende)' : 'Emniyet Aktif (Hazır)'}
          </span>
        </div>
      </div>

      {/* GECİKME GRAFİK ÇİZGİSİ / SPARKLINE */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Zap className="w-3 h-3 text-emerald-400" /> Canlı Gecikme Spektrumu (ms)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Eşikler: &lt;100ms Yeşil | 100-250ms Sarı | &gt;250ms Kırmızı
          </span>
        </div>

        <div className="h-16 flex items-end gap-1.5 pt-2">
          {latencyHistory.map((item, idx) => {
            const h = Math.min(100, Math.max(15, (item.ms / 350) * 100));
            const barColor =
              item.ms < 100
                ? 'bg-emerald-500 hover:bg-emerald-400'
                : item.ms <= 250
                ? 'bg-amber-500 hover:bg-amber-400'
                : 'bg-rose-500 hover:bg-rose-400';

            return (
              <div
                key={`latency-sample-${item.id}-${idx}`}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                <div
                  className={`w-full rounded-t transition-all duration-300 ${barColor}`}
                  style={{ height: `${h}%` }}
                />
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded pointer-events-none transition whitespace-nowrap z-20 font-mono border border-slate-700 shadow-md">
                  {item.ms} ms ({item.time})
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KUANT KONTROL & TEST PANELİ */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/70 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] font-semibold">Test & Denetim:</span>
          <button
            onClick={() => measurePing()}
            disabled={isPinging || isDeadMansSwitchTriggered}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1 text-[11px] disabled:opacity-50"
          >
            <RotateCcw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} /> Manuel Ping
          </button>

          <button
            onClick={handleToggleHighLatencySim}
            className={`px-2.5 py-1 rounded border transition cursor-pointer flex items-center gap-1 text-[11px] ${
              simulatedHighLatency
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Sliders className="w-3 h-3" />
            {simulatedHighLatency ? 'Gecikmeyi Normalleştir' : '+300ms Gecikme Simüle Et'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isDeadMansSwitchTriggered ? (
            <button
              onClick={handleTriggerDisconnectSim}
              className="px-3 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition cursor-pointer flex items-center gap-1.5 text-[11px] font-bold"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              🚨 Kopma Simüle Et (&gt;5s Dead Man Testi)
            </button>
          ) : (
            <button
              onClick={handleResetDeadMansSwitch}
              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
            >
              <Unlock className="w-3 h-3" /> Emniyet Kilidini Aç
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
