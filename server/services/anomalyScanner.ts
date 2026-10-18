import { analyzeBoardAnomaly, BoardAnomalyReport, StockSegment } from './anomalyEngine.js';
import { getAllStocks as getAllTickers } from '../data/tickers.js';
import { createCache } from '../config/cache.js';
import { sendAnomalyTelegramAlert, sendKaleToAlphaAlert } from '../utils/telegram.js';
import fs from 'fs';
import path from 'path';

const COOLDOWN_FILE = path.join(process.cwd(), 'server/data/telegram_cooldown.json');
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 saat
let telegramCooldown = new Map<string, number>();

try {
  if (fs.existsSync(COOLDOWN_FILE)) {
    const raw = JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
    telegramCooldown = new Map(Object.entries(raw).map(([k, v]: any) => [k, Number(v)]));
  }
} catch {}

function persistCooldown() {
  try {
    fs.mkdirSync(path.dirname(COOLDOWN_FILE), { recursive: true });
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(Object.fromEntries(telegramCooldown), null, 2));
  } catch {}
}

function canSendTelegram(ticker: string): boolean {
  const last = telegramCooldown.get(ticker) || 0;
  if (Date.now() - last < COOLDOWN_MS) return false;
  telegramCooldown.set(ticker, Date.now());
  persistCooldown();
  return true;
}

export interface AnomalyScanSummary {
  scannedAt: string;
  total: number;
  kritik: number;
  izleme: number;
  dengeli: number;
  defansifKaleCount: number;
  alphaRadarCount: number;
  results: BoardAnomalyReport[];
  topRedFlags: BoardAnomalyReport[];
  defansifKaleList: BoardAnomalyReport[];
  alphaRadarList: BoardAnomalyReport[];
}

const scanCache = createCache<AnomalyScanSummary>(5 * 60 * 1000); // 5 dk TTL

function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function scanAllBist(forceRefresh = false): Promise<AnomalyScanSummary> {
  if (!forceRefresh) {
    const cached = scanCache.get('scan_all');
    if (cached) return cached;
  }

  const tickers = getAllTickers().map(s => s.ticker);
  const results: BoardAnomalyReport[] = [];

  // 10'arlı paketler halinde rate-limited tarama
  const chunks = chunk(tickers, 10);
  for (const batch of chunks) {
    const batchResults = await Promise.all(
      batch.map(async (t) => {
        try {
          return await analyzeBoardAnomaly(t);
        } catch {
          return null;
        }
      })
    );

    for (const r of batchResults) {
      if (r) results.push(r);
    }

    if (chunks.indexOf(batch) < chunks.length - 1) {
      await sleep(100);
    }
  }

  // Segmentlere ve risk sıralamasına göre ayır
  const sorted = results.sort((a, b) => b.insiderRiskProb - a.insiderRiskProb);

  const defansifKaleList = sorted.filter((r) => r.segment === 'DEFANSIF_KALE');
  const alphaRadarList = sorted.filter((r) => r.segment === 'ALPHA_RADAR');
  const kritikList = sorted.filter(
    (r) => r.segment === 'ALPHA_RADAR' || r.verdict === 'MANIPULASYON_RISKI' || r.kapCrossCheck.riskLevel === 'KRITIK'
  );
  const izlemeList = sorted.filter(
    (r) =>
      r.verdict === 'TAHTA_YAPICI_HAKIMIYETI' ||
      r.concentration.alert === 'TAHTA_KONTROLU' ||
      r.volumeAnomaly.zScore > 2
  );
  const dengeliList = sorted.filter((r) => r.verdict === 'DENGELI_TAHTA' || r.segment === 'DENGELI_TAHTA');

  const finalSummary: AnomalyScanSummary = {
    scannedAt: new Date().toISOString(),
    total: results.length,
    kritik: kritikList.length,
    izleme: izlemeList.length,
    dengeli: dengeliList.length,
    defansifKaleCount: defansifKaleList.length,
    alphaRadarCount: alphaRadarList.length,
    results: sorted,
    topRedFlags: kritikList.slice(0, 10),
    defansifKaleList: defansifKaleList.slice(0, 15),
    alphaRadarList: alphaRadarList.slice(0, 15),
  };

  scanCache.set('scan_all', finalSummary);

  // 🚨 2. Motor: Yalnızca ALPHA_RADAR İçin Telegram Push (DEFANSIF_KALE ASLA gönderilmez)
  for (const item of alphaRadarList) {
    if (canSendTelegram(item.ticker)) {
      if (item.isKaleToAlphaBreakout) {
        // 🚀 Özel KALE -> ALPHA Geçiş Bildirimi
        sendKaleToAlphaAlert({
          ticker: item.ticker,
          zScore: item.volumeAnomaly.zScore,
          maliyet: item.takasSummary?.agirlikliOrtalamaMaliyet || 0,
          lastPrice: item.volumeAnomaly.currentVolume > 0 ? 100 : 0, // Fallback
          topBroker: 'BofA / İş Yatırım',
          topBrokerShare: Math.round(item.concentration.top3Ratio * 100),
        }).catch((e) => console.error('[TELEGRAM] Kale to Alpha dispatch error:', e));
      } else {
        // Standart Tavan Öncesi Toplama Bildirimi
        sendAnomalyTelegramAlert({
          ticker: item.ticker,
          zScore: item.volumeAnomaly.zScore,
          top3Ratio: item.concentration.top3Ratio,
          hhi: item.concentration.hhi,
          kapCount: item.kapCrossCheck.kapCount,
          verdict: item.verdict,
          insiderRiskProb: item.insiderRiskProb,
          flag: item.kapCrossCheck.flag,
        }).catch((e) => console.error('[TELEGRAM] Alpha radar dispatch error:', e));
      }
    }
  }

  return finalSummary;
}
