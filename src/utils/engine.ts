import {
  MarketDataInput,
  JuryReport,
  AnalystPerspective,
  DecisionScenario,
  PriceThresholdAlert,
  CustomPriceAlert,
  PriceAlertLevelType,
  PriceAlertMetric,
  PriceAlertCondition,
  TriggeredAlertEvent,
  ShareholdingTrendItem,
  TickerNote,
  TechnicalIndicatorsResult,
  DailyPriceRangeRecord,
  PriceRangeVolatilitySummary,
  RiskResult,
  ModelWeightConfig,
  ModelWeightItem,
  DEFAULT_WEIGHTS,
  UserWeightConfig,
  DecisionExplanation,
  ModelContribution,
  DecisionSimulation,
} from '../types';
import { LABELS } from '../constants/labels';

export const BIST_COMPANIES: Record<string, string> = {
  'ASELS': 'Aselsan Elektronik Sanayi',
  'THYAO': 'Türk Hava Yolları',
  'EREGL': 'Ereğli Demir ve Çelik Fabrikaları',
  'GARAN': 'Türkiye Garanti Bankası',
  'BIMAS': 'BİM Birleşik Mağazalar',
  'TUPRS': 'Tüpraş Türkiye Petrol Rafinerileri',
  'KCHOL': 'Koç Holding',
  'ISCTR': 'Türkiye İş Bankası (C)',
  'AKBNK': 'Akbank',
  'SAHOL': 'Sabancı Holding',
  'SISE': 'Türkiye Şişe ve Cam Fabrikaları',
  'YKBNK': 'Yapı ve Kredi Bankası',
  'SASA': 'SASA Polyester Sanayi',
  'HEKTS': 'Hektaş Ticaret',
  'PETKM': 'Petkim Petrokimya',
  'PGSUS': 'Pegasus Hava Taşımacılığı',
  'TOASO': 'Tofaş Türk Otomobil Fabrikası',
  'FROTO': 'Ford Otosan',
  'ASTOR': 'Astor Enerji',
  'ENKAI': 'Enka İnşaat',
  'TCELL': 'Turkcell İletişim',
};

export function getBistCompanyName(ticker?: string): string {
  const clean = String(ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  return BIST_COMPANIES[clean] || `${clean} BIST Pay Piyasası`;
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const istanbulStr = now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' });
  const istanbulTime = new Date(istanbulStr);
  const day = istanbulTime.getDay();
  if (day === 0 || day === 6) return false;
  
  const hours = istanbulTime.getHours();
  const minutes = istanbulTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  // 09:40 - 18:15 (Seans başlangıç - kapanış eşleşme sonu)
  return totalMinutes >= 580 && totalMinutes <= 1095;
}

export function buildDynamicSessionMessage(data: any, session: string = 'CONTINUOUS') {
  const matchPrice = data.theoreticalMatchPrice || data.closingPrice;
  const wallPrice = data.dominantWallPrice;
  const wallLot = data.dominantWallLot;
  const bofaCost = data.bofaAvgCost;
  
  switch (session) {
    case 'PRE_MARKET':
      return `📅 Seans öncesi hazırlık. Açılış (09:55) için hedef: ${matchPrice.toFixed(2)} TL'nin BofA maliyeti (${bofaCost.toFixed(2)} TL) üzerinde kalması. Duvar: ${wallPrice.toFixed(2)} TL (${(wallLot/1000).toFixed(0)}k lot).`;
    case 'OPENING_AUCTION':
      return `🔔 Açılış emir toplama aktif (09:40-09:55). Teorik eşleşme ${matchPrice.toFixed(2)} TL, BofA maliyeti ${bofaCost.toFixed(2)} TL. Duvarın (${wallPrice.toFixed(2)} TL / ${(wallLot/1000).toFixed(0)}k lot) çekilmesini izle.`;
    case 'CONTINUOUS':
      return `🟢 Gün içi seans aktif. Fiyat ${matchPrice.toFixed(2)} TL, kritik duvar ${wallPrice.toFixed(2)} TL (${(wallLot/1000).toFixed(0)}k lot). Duvar kırılımı veya BofA net alış artışı sinyal için bekle.`;
    case 'CLOSING_AUCTION':
      return `🔔 Kapanış seansı (18:10-18:15). Günlük kapanış ${matchPrice.toFixed(2)} TL. Yarın için senaryoları gözden geçir.`;
    case 'CLOSED':
      return `🌙 BIST kapandı. Günlük kapanış ${matchPrice.toFixed(2)} TL. Yarın 09:40 açılış için hazırlık.`;
    default:
      return `Seans durumu: ${session}. Fiyat: ${matchPrice.toFixed(2)} TL.`;
  }
}

export const KNOWN_BIST_BASES: Record<string, { price: number; prevClose: number; vol: number }> = {
  'ASELS': { price: 367.75, prevClose: 374.50, vol: 18450000 },
  'THYAO': { price: 312.50, prevClose: 308.00, vol: 12800000 },
  'EREGL': { price: 37.94, prevClose: 38.20, vol: 32500000 },
  'GARAN': { price: 119.20, prevClose: 117.80, vol: 15400000 },
  'BIMAS': { price: 512.00, prevClose: 508.50, vol: 4200000 },
  'TUPRS': { price: 168.40, prevClose: 166.20, vol: 8900000 },
  'KCHOL': { price: 215.00, prevClose: 212.50, vol: 6400000 },
  'ISCTR': { price: 13.85, prevClose: 13.60, vol: 68000000 },
  'AKBNK': { price: 56.40, prevClose: 55.80, vol: 24000000 },
  'SAHOL': { price: 94.50, prevClose: 93.10, vol: 9200000 },
  'SISE': { price: 43.20, prevClose: 43.80, vol: 16500000 },
  'YKBNK': { price: 31.80, prevClose: 31.40, vol: 42000000 },
  'SASA': { price: 4.82, prevClose: 4.90, vol: 85000000 },
  'PGSUS': { price: 238.50, prevClose: 234.00, vol: 3800000 },
  'FROTO': { price: 1045.00, prevClose: 1030.00, vol: 1100000 },
  'ASTOR': { price: 98.50, prevClose: 97.20, vol: 8400000 },
  'TCELL': { price: 92.40, prevClose: 91.80, vol: 7600000 },
};

/**
 * Belirtilen hisse için dinamik piyasa parametreleri üretir (Fiyata oranlı blok duvar, derinlik, BofA lotu).
 */

function getHashValue(ticker: string, seed: string, min: number, max: number, decimals: number = 1): number {
  const str = ticker + seed;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const factor = Math.pow(10, decimals);
  const range = max - min;
  const rawVal = min + (Math.abs(hash) % Math.round(range * factor)) / factor;
  return Number(rawVal.toFixed(decimals));
}

export function getDefaultMarketData(tickerInput: string = 'ASELS.IS'): MarketDataInput {
  const cleanCode = String(tickerInput || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  const ticker = `${cleanCode}.IS`;
  const defaultHashedPrice = getHashValue(cleanCode, 'price', 18.0, 195.0, 2);
  const base = KNOWN_BIST_BASES[cleanCode] || {
    price: defaultHashedPrice,
    prevClose: Number((defaultHashedPrice * 0.992).toFixed(2)),
    vol: Math.round(getHashValue(cleanCode, 'vol', 5000000, 35000000, 0)),
  };

  const closingPrice = base.price;
  const dayChangePct = Number((((closingPrice - base.prevClose) / base.prevClose) * 100).toFixed(2));
  const volume = base.vol;

  // Fiyata orantılı blok kademe duvarı (~9.2M TL direnç bloğu)
  const dominantWallLot = Math.max(5000, Math.round((9200000 / closingPrice) / 1000) * 1000);
  const dominantWallPrice = Number((closingPrice * 1.011).toFixed(2));

  // Fiyata orantılı BofA net lotu (~35M TL pozisyon)
  const bofaNetLot = -Math.max(10000, Math.round((35000000 / closingPrice) / 1000) * 1000);
  const bofaAvgCost = Number((closingPrice * 1.0065).toFixed(2));

  return {
    ticker,
    closingPrice,
    dayChangePct,
    depthBidTotal: Math.round(volume * 0.042),
    depthAskTotal: Math.round(volume * 0.072),
    dominantWallLot,
    dominantWallPrice,
    dominantWallType: 'ASK',
    supportLevel1: Number((closingPrice * 0.988).toFixed(2)),
    supportLevel2: Number((closingPrice * 0.970).toFixed(2)),
    resistanceLevel1: dominantWallPrice,
    resistanceLevel2: Number((closingPrice * 1.032).toFixed(2)),
    theoreticalMatchPrice: Number((closingPrice * 1.0015).toFixed(2)),
    volume,
    bofaNetLot,
    bofaAvgCost,
    bofaSharePct: 14.8,
    citibankSharePct: getHashValue(cleanCode, 'citi', 15.0, 35.0, 1),
    citibankChange30d: 0.25,
    citibankChange7d: 0.18,
    pensionFundSharePct: getHashValue(cleanCode, 'pension', 8.0, 23.0, 1),
    pensionFundChange7d: 0.32,
    bofaChange7d: -14.5,
    retailSellerRatio: Math.round(getHashValue(cleanCode, 'retail', 45, 80, 0)),
    retailBuyerRatio: 100 - Math.round(getHashValue(cleanCode, 'retail', 45, 80, 0)),
    notes: `${cleanCode} BIST piyasa verisi ve kurumsal takas göstergeleri.`,
    jury_history: [
      { date: "2026-09-04", duygu: 29, teknik: 39, takas: 45, bilesik: 39 },
      { date: "2026-09-05", duygu: 26, teknik: 62, takas: 70, bilesik: 56 },
      { date: "2026-09-06", duygu: 32, teknik: 58, takas: 66, bilesik: 54 },
      { date: "2026-09-07", duygu: 36, teknik: 55, takas: 64, bilesik: 53 },
      { date: "2026-09-08", duygu: 40, teknik: 59, takas: 68, bilesik: 58 },
      { date: "2026-09-09", duygu: 42, teknik: 63, takas: 72, bilesik: 61 },
      { date: "2026-09-10", duygu: 45, teknik: 65, takas: 75, bilesik: 64 },
      { date: "2026-09-11", duygu: 48, teknik: 68, takas: 73, bilesik: 65 },
      { date: "2026-09-12", duygu: 51, teknik: 70, takas: 77, bilesik: 68 },
      { date: "2026-09-13", duygu: 54, teknik: 72, takas: 79, bilesik: 70 },
      { date: "2026-09-14", duygu: 56, teknik: 74, takas: 81, bilesik: 72 },
      { date: "2026-09-15", duygu: 52, teknik: 71, takas: 78, bilesik: 69 },
      { date: "2026-09-16", duygu: 59, teknik: 76, takas: 83, bilesik: 75 },
      { date: "2026-09-17", duygu: 62, teknik: 79, takas: 85, bilesik: 77 }
    ]
  };
}

export const DEFAULT_ASELS_DATA: MarketDataInput = getDefaultMarketData('ASELS.IS');

export const PRESET_SCENARIOS: { name: string; description: string; data: MarketDataInput }[] = [
  {
    name: 'Dirençte 24k Duvar & BofA Satış Baskılı (Referans)',
    description: 'BofA -92k net satışta, 387.21 TL seviyesinde 24.000 lotluk blok satış duvarı bulunuyor.',
    data: DEFAULT_ASELS_DATA,
  },
  {
    name: 'BofA Short Squeeze & Duvar Çözülmesi',
    description: 'BofA +125k alıcıya döndü, 387.21 duvarı 4k seviyesine indi, Citibank takas payı artışta.',
    data: {
      ticker: 'ASELS.IS',
      closingPrice: 388.50,
      dayChangePct: 1.84,
      depthBidTotal: 145000,
      depthAskTotal: 78000,
      dominantWallLot: 4000,
      dominantWallPrice: 387.21,
      dominantWallType: 'ASK',
      supportLevel1: 382.50,
      supportLevel2: 376.92,
      resistanceLevel1: 391.50,
      resistanceLevel2: 405.00,
      bofaNetLot: 125000,
      bofaAvgCost: 383.98,
      citibankSharePct: 29.1,
      citibankChange30d: 0.85,
      citibankChange7d: 0.45,
      pensionFundSharePct: 18.9,
      pensionFundChange7d: 0.38,
      bofaChange7d: 22.4,
      retailSellerRatio: 42,
      retailBuyerRatio: 58,
      theoreticalMatchPrice: 388.75,
      volume: 19800000,
      notes: 'Duvar eriyor, yabancı ve BofA alım yönlü tetikte.',
    },
  },
  {
    name: 'Zayıf Derinlik & 376.92 Destek Testi',
    description: 'Alış kademeleri sığ, perakende panik satıcılı, 376.92 ana taban desteği sınanıyor.',
    data: {
      ticker: 'ASELS.IS',
      closingPrice: 377.20,
      dayChangePct: -2.44,
      depthBidTotal: 41000,
      depthAskTotal: 165000,
      dominantWallLot: 38000,
      dominantWallPrice: 383.98,
      dominantWallType: 'ASK',
      supportLevel1: 376.92,
      supportLevel2: 368.50,
      resistanceLevel1: 383.98,
      resistanceLevel2: 387.21,
      bofaNetLot: -180000,
      bofaAvgCost: 383.98,
      citibankSharePct: 27.8,
      citibankChange30d: -0.65,
      citibankChange7d: -0.28,
      pensionFundSharePct: 18.2,
      pensionFundChange7d: -0.15,
      bofaChange7d: -24.8,
      retailSellerRatio: 74,
      retailBuyerRatio: 26,
      theoreticalMatchPrice: 376.80,
      volume: 14200000,
      notes: 'Perakende stop emirleri tetikleniyor, BofA agresif arbitraj satışı yapıyor.',
    },
  },
];

/**
 * Belirli bir hisse ve son fiyat için deterministik, gerçekçi geçmiş günlük kapanış fiyat serisi üretir.
 * Son kapanış tam olarak closingPrice, dünkü kapanış ise dayChangePct ile uyumludur.
 */
export function generateMockHistoricalCloses(
  ticker: string,
  closingPrice: number,
  dayChangePct: number,
  count = 35
): { date: string; close: number }[] {
  const clean = String(ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  let seed = 0;
  for (let i = 0; i < clean.length; i++) {
    seed = (seed * 31 + clean.charCodeAt(i)) % 10000;
  }

  const now = new Date();
  const dates: string[] = [];
  const currDate = new Date(now);
  while (dates.length < count) {
    const dayOfWeek = currDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const formatted = currDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
      dates.unshift(formatted);
    }
    currDate.setDate(currDate.getDate() - 1);
  }

  const closes: number[] = new Array(count);
  closes[count - 1] = Number(closingPrice.toFixed(2));
  const prevClose = dayChangePct !== 0
    ? Number((closingPrice / (1 + dayChangePct / 100)).toFixed(2))
    : closingPrice;
  if (count > 1) {
    closes[count - 2] = prevClose;
  }

  let running = prevClose;
  for (let i = count - 3; i >= 0; i--) {
    const pseudoRand = Math.sin((seed + (i + 1) * 19.3) * 7.91);
    const trendDrift = (dayChangePct > 0 ? 0.002 : -0.002);
    const dailyChangePct = pseudoRand * 0.018 + trendDrift;
    running = Number((running / (1 + dailyChangePct)).toFixed(2));
    closes[i] = Math.max(0.1, running);
  }

  return dates.map((d, idx) => ({
    date: d,
    close: closes[idx],
  }));
}

/**
 * Standart 14 periyotluk RSI (Göreceli Güç Endeksi) hesaplaması (Wilder yumuşatması).
 */
export function calculateRSI(closes: number[], period = 14): {
  rsi14: number;
  rsiStatus: 'AŞIRI_ALIM' | 'POZİTİF_MOMENTUM' | 'NÖTR_BÖLGE' | 'ZAYIF_MOMENTUM' | 'AŞIRI_SATIM';
  rsiLabel: string;
  rsiSentiment: 'positive' | 'neutral' | 'negative';
} {
  if (closes.length < period + 1) {
    return {
      rsi14: 50.0,
      rsiStatus: 'NÖTR_BÖLGE',
      rsiLabel: 'Yetersiz Veri / Nötr (50.0)',
      rsiSentiment: 'neutral',
    };
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((acc, val) => acc + val, 0) / period;

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  let rsi = 50.0;
  if (avgLoss === 0) {
    rsi = 100.0;
  } else {
    const rs = avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
  }

  const rsi14 = Number(rsi.toFixed(1));

  let rsiStatus: 'AŞIRI_ALIM' | 'POZİTİF_MOMENTUM' | 'NÖTR_BÖLGE' | 'ZAYIF_MOMENTUM' | 'AŞIRI_SATIM' = 'NÖTR_BÖLGE';
  let rsiLabel = 'Nötr Denge (45-55)';
  let rsiSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

  if (rsi14 >= 70) {
    rsiStatus = 'AŞIRI_ALIM';
    rsiLabel = 'Aşırı Alım Bölgesi (>70)';
    rsiSentiment = 'negative'; // Düzeltme / Yorulma riski
  } else if (rsi14 >= 55) {
    rsiStatus = 'POZİTİF_MOMENTUM';
    rsiLabel = 'Pozitif Momentum (55-70)';
    rsiSentiment = 'positive';
  } else if (rsi14 <= 30) {
    rsiStatus = 'AŞIRI_SATIM';
    rsiLabel = 'Aşırı Satım / Tepki Fırsatı (<30)';
    rsiSentiment = 'positive'; // Dipten dönüş tepkisi
  } else if (rsi14 <= 45) {
    rsiStatus = 'ZAYIF_MOMENTUM';
    rsiLabel = 'Zayıf Ayı Momenti (30-45)';
    rsiSentiment = 'negative';
  }

  return { rsi14, rsiStatus, rsiLabel, rsiSentiment };
}

/**
 * Standart MACD (12, 26, 9) indikatör hesaplaması.
 */
export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): {
  macdLine: number;
  signalLine: number;
  macdHistogram: number;
  macdSignal: 'AL' | 'SAT' | 'NÖTR';
  macdLabel: string;
  macdSentiment: 'positive' | 'neutral' | 'negative';
} {
  if (closes.length < slowPeriod) {
    return {
      macdLine: 0,
      signalLine: 0,
      macdHistogram: 0,
      macdSignal: 'NÖTR',
      macdLabel: 'Nötr / Yetersiz Veri',
      macdSentiment: 'neutral',
    };
  }

  function calculateEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema: number[] = new Array(data.length);
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }
    ema[period - 1] = sum / period;
    for (let i = period; i < data.length; i++) {
      ema[i] = data[i] * k + ema[i - 1] * (1 - k);
    }
    return ema;
  }

  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  const macdValues: number[] = [];
  for (let i = slowPeriod - 1; i < closes.length; i++) {
    macdValues.push(emaFast[i] - emaSlow[i]);
  }

  if (macdValues.length < signalPeriod) {
    const lastMacd = Number(macdValues[macdValues.length - 1].toFixed(2));
    return {
      macdLine: lastMacd,
      signalLine: lastMacd,
      macdHistogram: 0,
      macdSignal: 'NÖTR',
      macdLabel: 'Nötr / Yatay Sinyal',
      macdSentiment: 'neutral',
    };
  }

  const signalEma = calculateEMA(macdValues, signalPeriod);
  const lastIndex = macdValues.length - 1;
  const macdLine = Number(macdValues[lastIndex].toFixed(2));
  const signalLine = Number(signalEma[lastIndex].toFixed(2));
  const macdHistogram = Number((macdLine - signalLine).toFixed(2));

  let macdSignal: 'AL' | 'SAT' | 'NÖTR' = 'NÖTR';
  let macdLabel = 'Nötr / Yatay Kesişme';
  let macdSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

  if (macdLine > signalLine && macdHistogram > 0.02) {
    macdSignal = 'AL';
    macdLabel = 'Pozitif Kesişme (AL)';
    macdSentiment = 'positive';
  } else if (macdLine < signalLine && macdHistogram < -0.02) {
    macdSignal = 'SAT';
    macdLabel = 'Negatif Kesişme (SAT)';
    macdSentiment = 'negative';
  } else {
    macdSignal = 'NÖTR';
    macdLabel = 'Kesişme Eşiğinde (Nötr)';
    macdSentiment = 'neutral';
  }

  return {
    macdLine,
    signalLine,
    macdHistogram,
    macdSignal,
    macdLabel,
    macdSentiment,
  };
}

/**
 * Geçmiş kapanışlara dayalı RSI ve MACD indikatör paketini ve özetini üretir.
 */
export function calculateTechnicalIndicators(data: MarketDataInput): TechnicalIndicatorsResult {
  const history = (data.historicalCloses && data.historicalCloses.length >= 26)
    ? data.historicalCloses.map((close, idx) => ({
        date: `T-${data.historicalCloses!.length - 1 - idx}`,
        close,
      }))
    : generateMockHistoricalCloses(data.ticker, data.closingPrice, data.dayChangePct, 35);

  const closePrices = history.map((h) => h.close);
  const rsi = calculateRSI(closePrices, 14);
  const macd = calculateMACD(closePrices, 12, 26, 9);

  let rsiScore = 50;
  if (rsi.rsiStatus === 'AŞIRI_ALIM') rsiScore = 40;
  else if (rsi.rsiStatus === 'POZİTİF_MOMENTUM') rsiScore = 80;
  else if (rsi.rsiStatus === 'NÖTR_BÖLGE') rsiScore = 50;
  else if (rsi.rsiStatus === 'ZAYIF_MOMENTUM') rsiScore = 30;
  else if (rsi.rsiStatus === 'AŞIRI_SATIM') rsiScore = 65;

  let macdScore = 50;
  if (macd.macdSignal === 'AL') macdScore = 85;
  else if (macd.macdSignal === 'SAT') macdScore = 20;

  const technicalScore = Math.round(rsiScore * 0.5 + macdScore * 0.5);

  let summarySentence = '';
  if (rsi.rsiSentiment === 'positive' && macd.macdSentiment === 'positive') {
    summarySentence = `RSI(14) ${rsi.rsi14} ile pozitif ivmede ve MACD çizgisi (${macd.macdLine}) sinyal çizgisini (${macd.signalLine}) yukarı keserek güçlü teknik AL sinyali üretiyor.`;
  } else if (macd.macdSignal === 'AL') {
    summarySentence = `MACD pozitif kesişmede (Histogram: +${macd.macdHistogram}); RSI(14) ${rsi.rsi14} ile dengeli yükseliş bölgesinde bulunuyor.`;
  } else if (macd.macdSignal === 'SAT' && rsi.rsi14 < 45) {
    summarySentence = `MACD negatif kesişme (SAT) üretirken RSI(14) ${rsi.rsi14} seviyesine gerileyerek teknik satış baskısının devam ettiğini teyit ediyor.`;
  } else if (rsi.rsiStatus === 'AŞIRI_ALIM') {
    summarySentence = `RSI(14) ${rsi.rsi14} seviyesiyle aşırı alım bölgesinde; teknik düzeltme ve kar satışı riski gözetilmelidir.`;
  } else if (rsi.rsiStatus === 'AŞIRI_SATIM') {
    summarySentence = `RSI(14) ${rsi.rsi14} ile aşırı satım bölgesinde; teknik tepki ve dipten dönüş alımları takip edilmelidir.`;
  } else {
    summarySentence = `RSI(14) ${rsi.rsi14} ve MACD (${macd.macdLine}/${macd.signalLine}) göstergeleri yatay konsolidasyon bandına işaret ediyor.`;
  }

  return {
    ...rsi,
    ...macd,
    historicalCloses: history,
    technicalScore,
    summarySentence,
  };
}

/**
 * Son 30 işlem günü için günlük fiyat aralığı (High - Low) ve volatiliteyi hesaplar.
 * Analist B'nin trend gücünü, bant sıkışmasını ve kırılım potansiyelini analiz etmesine yardımcı olur.
 */
export function calculateDailyPriceRangeAndVolatility(
  data: MarketDataInput,
  days = 30
): PriceRangeVolatilitySummary {
  const clean = String(data?.ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  let seed = 0;
  for (let i = 0; i < clean.length; i++) {
    seed = (seed * 37 + clean.charCodeAt(i)) % 10000;
  }

  // Yeterli geçmiş gün (SMA-20 ve ATR-14 hesaplamak için 45 gün üretip son 30 günü alacağız)
  const totalDaysNeeded = days + 15;
  const now = new Date();
  const dates: string[] = [];
  const isoDates: string[] = [];
  const currDate = new Date(now);
  while (dates.length < totalDaysNeeded) {
    const dayOfWeek = currDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const formatted = currDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
      dates.unshift(formatted);
      isoDates.unshift(currDate.toISOString().slice(0, 10));
    }
    currDate.setDate(currDate.getDate() - 1);
  }

  // Kapanış serisini oluştur
  const safeClosing = typeof data?.closingPrice === 'number' && Number.isFinite(data.closingPrice)
    ? data.closingPrice
    : (typeof (data as any)?.spotPrice === 'number' && Number.isFinite((data as any).spotPrice) ? (data as any).spotPrice : 35.94);
  const safeChangePct = typeof data?.dayChangePct === 'number' && Number.isFinite(data.dayChangePct)
    ? data.dayChangePct
    : -1.2;

  const closes: number[] = new Array(totalDaysNeeded);
  closes[totalDaysNeeded - 1] = Number(safeClosing.toFixed(2));
  const prevClose = safeChangePct !== 0
    ? Number((safeClosing / (1 + safeChangePct / 100)).toFixed(2))
    : safeClosing;
  if (totalDaysNeeded > 1) {
    closes[totalDaysNeeded - 2] = prevClose;
  }

  let running = prevClose;
  for (let i = totalDaysNeeded - 3; i >= 0; i--) {
    const pseudoRand = Math.sin((seed + (i + 1) * 23.7) * 9.13);
    const trendDrift = safeChangePct > 0 ? 0.0025 : -0.0025;
    const dailyChangePct = pseudoRand * 0.019 + trendDrift;
    running = Number((running / (1 + dailyChangePct)).toFixed(2));
    closes[i] = Math.max(0.1, running);
  }

  // Her gün için High, Low, Open, RangeTL, VolatilityPct oluştur
  const allRecords: DailyPriceRangeRecord[] = [];
  for (let i = 0; i < totalDaysNeeded; i++) {
    const close = closes[i];
    const prevC = i > 0 ? closes[i - 1] : close;
    const changePct = Number((((close - prevC) / prevC) * 100).toFixed(2));

    // Pseudo-random günlük aralık (spread): Tipik BIST hissesi %1.2 ile %3.6 arası günlük salınım
    const rangePseudo = Math.abs(Math.cos((seed + (i + 1) * 17.5) * 5.71));
    const rangeFactor = 0.012 + rangePseudo * 0.024; // %1.2 - %3.6

    let open = Number((prevC * (1 + Math.sin(i * 3.1) * 0.004)).toFixed(2));
    let high = Math.max(open, close) + close * (rangeFactor * 0.6);
    let low = Math.min(open, close) - close * (rangeFactor * 0.5);

    // Son gün için bugünkü gerçek destek ve direnç / duvar seviyelerini yansıt
    if (i === totalDaysNeeded - 1) {
      const res1 = Number.isFinite(data?.resistanceLevel1) ? Number(data.resistanceLevel1) : close * (1 + rangeFactor * 0.5);
      const sup1 = Number.isFinite(data?.supportLevel1) ? Number(data.supportLevel1) : close * (1 - rangeFactor * 0.5);

      if (safeChangePct >= 0) {
        high = Math.max(res1, close * (1 + rangeFactor * 0.7));
        low = Math.min(sup1, close * (1 - rangeFactor * 0.4));
      } else {
        high = Math.max(res1, close * (1 + rangeFactor * 0.4));
        low = Math.min(sup1, close * (1 - rangeFactor * 0.7));
      }
    }

    const safeOpen = Number.isFinite(open) ? open : close;
    let safeHigh = Number.isFinite(high) ? high : Math.max(safeOpen, close) * 1.01;
    let safeLow = Number.isFinite(low) ? low : Math.min(safeOpen, close) * 0.99;
    safeHigh = Number(Math.max(safeHigh, safeOpen, close).toFixed(2));
    safeLow = Number(Math.min(safeLow, safeOpen, close, safeHigh - 0.05).toFixed(2));
    const rangeTL = Number((safeHigh - safeLow).toFixed(2));
    const volatilityPct = Number(((rangeTL / (close || 1)) * 100).toFixed(2));

    allRecords.push({
      date: dates[i],
      isoDate: isoDates[i],
      open: safeOpen,
      high: safeHigh,
      low: safeLow,
      close,
      rangeTL,
      volatilityPct,
      changePct,
    });
  }

  // SMA-20 ve ATR-14 hesapla
  for (let i = 0; i < totalDaysNeeded; i++) {
    if (i >= 19) {
      const slice20 = allRecords.slice(i - 19, i + 1);
      const sma = slice20.reduce((acc, r) => acc + r.close, 0) / 20;
      allRecords[i].sma20 = Number(sma.toFixed(2));
    }
    if (i >= 13) {
      const slice14 = allRecords.slice(i - 13, i + 1);
      const atr = slice14.reduce((acc, r) => acc + r.rangeTL, 0) / 14;
      allRecords[i].atr14 = Number(atr.toFixed(2));
    }
  }

  // Son 30 günü al
  const records = allRecords.slice(-days);

  // İstatistiksel Özetler
  const avgRangeTL = Number((records.reduce((acc, r) => acc + r.rangeTL, 0) / records.length).toFixed(2));
  const avgVolatilityPct = Number((records.reduce((acc, r) => acc + r.volatilityPct, 0) / records.length).toFixed(2));
  const lastRecord = records[records.length - 1];
  const currentRangeTL = lastRecord.rangeTL;
  const currentVolatilityPct = lastRecord.volatilityPct;

  const periodHigh = Math.max(...records.map((r) => r.high));
  const periodLow = Math.min(...records.map((r) => r.low));
  const totalSpread = periodHigh - periodLow || 1;
  const currentPositionInPeriodPct = Math.round(
    Math.max(0, Math.min(100, ((lastRecord.close - periodLow) / totalSpread) * 100))
  );

  // Volatilite Rejimi: Sıkışma mı, genişleme mi?
  let volatilityRegime: 'SIKIŞMA' | 'NORMAL' | 'YÜKSEK_VOLATİLİTE' = 'NORMAL';
  let volatilityRegimeLabel = 'Normal Denge Salınımı';
  if (currentVolatilityPct < avgVolatilityPct * 0.78) {
    volatilityRegime = 'SIKIŞMA';
    volatilityRegimeLabel = 'Bant Sıkışması (Kırılım Öncesi Enerji Toplama)';
  } else if (currentVolatilityPct > avgVolatilityPct * 1.28) {
    volatilityRegime = 'YÜKSEK_VOLATİLİTE';
    volatilityRegimeLabel = 'Yüksek Volatilite (Genişleyen Fiyat Salınımı)';
  }

  // Trend Gücü Skoru (0-100)
  const aboveSmaCount = records.filter((r) => r.sma20 && r.close >= r.sma20).length;
  const smaScore = (aboveSmaCount / records.length) * 100;

  let trendDirection: 'YÜKSELİŞ' | 'NÖTR' | 'DÜŞÜŞ' = 'NÖTR';
  let trendStrengthScore = 50;

  if (currentPositionInPeriodPct >= 65 && smaScore >= 60) {
    trendDirection = 'YÜKSELİŞ';
    trendStrengthScore = Math.min(95, Math.round(smaScore * 0.5 + currentPositionInPeriodPct * 0.5));
  } else if (currentPositionInPeriodPct <= 35 && smaScore <= 40) {
    trendDirection = 'DÜŞÜŞ';
    trendStrengthScore = Math.max(15, Math.round(smaScore * 0.5 + currentPositionInPeriodPct * 0.5));
  } else {
    trendDirection = 'NÖTR';
    trendStrengthScore = Math.round((smaScore + currentPositionInPeriodPct) / 2);
  }

  let trendStrengthLabel = 'Orta Kuvvette Trend';
  if (trendStrengthScore >= 75) {
    trendStrengthLabel = 'Güçlü Boğa Trendi (Yüksek İvme)';
  } else if (trendStrengthScore >= 60) {
    trendStrengthLabel = 'Ilımlı Yükseliş Trendi';
  } else if (trendStrengthScore <= 25) {
    trendStrengthLabel = 'Güçlü Ayı Baskısı (Düşük İvme)';
  } else if (trendStrengthScore <= 40) {
    trendStrengthLabel = 'Zayıf / Ayı Eğilimli Salınım';
  } else {
    trendStrengthLabel = 'Yatay Bant / Sıkışma Evresi';
  }

  // Analist B için Özel Karar Destek Görüşü
  let insightForAnalystB = '';
  if (volatilityRegime === 'SIKIŞMA') {
    insightForAnalystB = `Son gün salınımı %${currentVolatilityPct} ile 30G ortalamanın (%${avgVolatilityPct}) belirgin altında daraldı. Bu volatilite sıkışması (volatility squeeze), ${data.dominantWallPrice.toFixed(2)} TL kademe duvarı yönünde ani bir momentum patlaması ve trend kırılımı hazırlığına işaret ediyor.`;
  } else if (volatilityRegime === 'YÜKSEK_VOLATİLİTE') {
    insightForAnalystB = `Günlük fiyat aralığı ${currentRangeTL.toFixed(2)} TL (%${currentVolatilityPct}) ile 30G ortalama (%${avgVolatilityPct}) üzerine genişleyerek yüksek oynaklık üretti. Trend gücü (${trendStrengthScore}/100) yüksek olup ${trendDirection === 'YÜKSELİŞ' ? 'alış iştahının hızlandığını ve trendin gücünü' : 'satış baskısının derinleştiğini'} teyit ediyor.`;
  } else {
    insightForAnalystB = `Fiyat 30 günlük aralığın %${currentPositionInPeriodPct} zirve diliminde dengeleniyor. 30G ortalama salınım ${avgRangeTL.toFixed(2)} TL (%${avgVolatilityPct}) olup trend gücü (${trendStrengthScore}/100) mevcut teknik kademeleri koruyan kontrollü bir yapı sergiliyor.`;
  }

  return {
    ticker: data.ticker,
    records,
    avgRangeTL,
    avgVolatilityPct,
    currentRangeTL,
    currentVolatilityPct,
    volatilityRegime,
    volatilityRegimeLabel,
    trendStrengthScore,
    trendStrengthLabel,
    trendDirection,
    periodHigh,
    periodLow,
    currentPositionInPeriodPct,
    insightForAnalystB,
  };
}

export function getUserWeights(): UserWeightConfig {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem('userWeights');
      if (saved) return JSON.parse(saved);
    } catch {}
  }
  return DEFAULT_WEIGHTS;
}

export function getUserModelWeightConfig(): ModelWeightConfig {
  const uw = getUserWeights();
  const sum = (uw.sentiment + uw.technical + uw.flow) || 1;
  const s = uw.sentiment / sum;
  const t = uw.technical / sum;
  const f = uw.flow / sum;
  return {
    sentiment: { name: 'Duygu & Psikoloji Modeli', weight: Number(s.toFixed(2)), description: 'Perakende satıcı/alıcı oranı.' },
    technical: { name: 'Teknik & Derinlik Modeli', weight: Number(t.toFixed(2)), description: 'RSI, MACD, kademe duvarı.' },
    flow:      { name: 'Kurumsal Akış & Takas Modeli', weight: Number(f.toFixed(2)), description: 'BofA, Citibank, Emeklilik.' },
  };
}

export const DEFAULT_MODEL_WEIGHTS = {
  sentiment: { name: 'Duygu & Psikoloji Modeli', weight: 0.25, description: 'Perakende satıcı/alıcı oranı.' },
  technical: { name: 'Teknik & Derinlik Modeli', weight: 0.35, description: 'RSI, MACD, kademe duvarı.' },
  flow:      { name: 'Kurumsal Akış & Takas Modeli', weight: 0.40, description: 'BofA, Citibank, Emeklilik.' },
} as const;

// hesaplaJuri fonksiyonu:
export function hesaplaJuri(analysts: { sentiment?: { puan: number }; technical?: { puan: number }; flow?: { puan: number } }) {
  const weights = getUserWeights();
  const sPuan = analysts?.sentiment?.puan ?? 50;
  const tPuan = analysts?.technical?.puan ?? 50;
  const fPuan = analysts?.flow?.puan ?? 50;

  const bilesik = Math.round(
    sPuan * weights.sentiment +
    tPuan * weights.technical +
    fPuan * weights.flow
  );

  const sebep = `Duygu:%${Math.round(weights.sentiment * 100)} (${sPuan}) Teknik:%${Math.round(weights.technical * 100)} (${tPuan}) Akış:%${Math.round(weights.flow * 100)} (${fPuan}) Bileşik: ${bilesik}`;

  return { bilesik, sebep, modelWeights: weights };
}


export interface WeightedAnalysisResult {
  analystA: AnalystPerspective;
  analystB: AnalystPerspective;
  analystC: AnalystPerspective;
  technicalIndicators: TechnicalIndicatorsResult;
  priceRangeVolatility: PriceRangeVolatilitySummary;
  modelWeights: ModelWeightConfig;
  weightedScore: number;
  finalDecision: 'AL' | 'SAT' | 'BEKLE';
  dominantSentiment: 'BOĞA' | 'NÖTR' | 'AYI';
  consensusProbabilities: {
    bullPct: number;
    neutralPct: number;
    bearPct: number;
    dominantSentiment: 'BOĞA' | 'NÖTR' | 'AYI';
  };
}

/**
 * Tek deterministik model üzerinden 3 ağırlıklı görünüm (Sentiment, Technical, Flow) hesaplar.
 */
export function computeWeightedAnalysis(
  inputData: MarketDataInput,
  customWeights?: ModelWeightConfig
): WeightedAnalysisResult {
  const base = getDefaultMarketData(inputData?.ticker || 'ASELS.IS');
  const data: MarketDataInput = {
    ...base,
    ...inputData,
    closingPrice: typeof inputData?.closingPrice === 'number' ? inputData.closingPrice : base.closingPrice,
    dominantWallPrice: typeof inputData?.dominantWallPrice === 'number' ? inputData.dominantWallPrice : base.dominantWallPrice,
    dominantWallLot: typeof inputData?.dominantWallLot === 'number' ? inputData.dominantWallLot : base.dominantWallLot,
    supportLevel1: typeof inputData?.supportLevel1 === 'number' ? inputData.supportLevel1 : base.supportLevel1,
    supportLevel2: typeof inputData?.supportLevel2 === 'number' ? inputData.supportLevel2 : base.supportLevel2,
    resistanceLevel1: typeof inputData?.resistanceLevel1 === 'number' ? inputData.resistanceLevel1 : base.resistanceLevel1,
    resistanceLevel2: typeof inputData?.resistanceLevel2 === 'number' ? inputData.resistanceLevel2 : base.resistanceLevel2,
    bofaAvgCost: typeof inputData?.bofaAvgCost === 'number' ? inputData.bofaAvgCost : base.bofaAvgCost,
    bofaNetLot: typeof inputData?.bofaNetLot === 'number' ? inputData.bofaNetLot : base.bofaNetLot,
    citibankSharePct: typeof inputData?.citibankSharePct === 'number' ? inputData.citibankSharePct : base.citibankSharePct,
    citibankChange30d: typeof inputData?.citibankChange30d === 'number' ? inputData.citibankChange30d : base.citibankChange30d,
    pensionFundSharePct: typeof inputData?.pensionFundSharePct === 'number' ? inputData.pensionFundSharePct : base.pensionFundSharePct,
    depthBidTotal: typeof inputData?.depthBidTotal === 'number' ? inputData.depthBidTotal : base.depthBidTotal,
    depthAskTotal: typeof inputData?.depthAskTotal === 'number' ? inputData.depthAskTotal : base.depthAskTotal,
    retailSellerRatio: typeof inputData?.retailSellerRatio === 'number' ? inputData.retailSellerRatio : base.retailSellerRatio,
    retailBuyerRatio: typeof inputData?.retailBuyerRatio === 'number' ? inputData.retailBuyerRatio : base.retailBuyerRatio,
  };

  const weights = customWeights || getUserModelWeightConfig();

  // 1. DUYGU MODELİ (%25):
  // retailSellerRatio > 65 → panic, < 45 → optimism, aksi halde nötr. bullPct 15-65 arası.
  let aBull = 35;
  let aBear = 45;
  let aNeutral = 20;
  let sentimentMood = 'Dengeli / Kararsız';

  if (data.retailSellerRatio > 65) {
    sentimentMood = 'Panik / Dağıtıcı';
    aBull = Math.max(15, Math.min(30, Math.round(100 - data.retailSellerRatio * 0.95)));
    aBear = Math.min(75, Math.max(55, Math.round(data.retailSellerRatio * 0.85)));
    aNeutral = 100 - aBull - aBear;
  } else if (data.retailSellerRatio < 45) {
    sentimentMood = 'İyimser / Biriktirici';
    aBull = Math.min(65, Math.max(52, Math.round(52 + (45 - data.retailSellerRatio) * 0.4)));
    aBear = Math.max(15, Math.min(30, Math.round(data.retailSellerRatio * 0.55)));
    aNeutral = 100 - aBull - aBear;
  } else {
    sentimentMood = 'Nötr / Dengeli';
    aBull = Math.max(30, Math.min(48, Math.round(40 + (55 - data.retailSellerRatio) * 0.7)));
    aBear = Math.max(30, Math.min(50, Math.round(40 + (data.retailSellerRatio - 55) * 0.7)));
    aNeutral = 100 - aBull - aBear;
  }
  // bullPct 15-65 arasında kesin sınırla
  aBull = Math.max(15, Math.min(65, aBull));
  aBear = Math.max(15, Math.min(75, aBear));
  aNeutral = Math.max(10, 100 - aBull - aBear);
  const aSum = aBull + aBear + aNeutral;
  aBull = Math.round((aBull / aSum) * 100);
  aBear = Math.round((aBear / aSum) * 100);
  aNeutral = 100 - aBull - aBear;

  const aVerdict: 'YÜKSELİŞ' | 'NÖTR' | 'DÜŞÜŞ' = aBull > aBear ? 'YÜKSELİŞ' : aBear > aBull ? 'DÜŞÜŞ' : 'NÖTR';

  const analystA: AnalystPerspective = {
    id: 'A',
    name: 'Duygu Modeli',
    label: 'Perakende & Psikoloji (%25)',
    focus: 'Satıcı baskı oranı, perakende davranışı ve piyasa psikolojisi',
    bullPct: aBull,
    neutralPct: aNeutral,
    bearPct: aBear,
    keyMetrics: [
      {
        label: 'Satıcı Baskı Oranı',
        value: `%${data.retailSellerRatio}`,
        sentiment: data.retailSellerRatio > 60 ? 'negative' : data.retailSellerRatio < 45 ? 'positive' : 'neutral',
      },
      {
        label: 'Perakende Davranışı',
        value: sentimentMood,
        sentiment: data.retailSellerRatio > 65 ? 'negative' : data.retailSellerRatio < 45 ? 'positive' : 'neutral',
      },
      {
        label: 'Psikolojik Eşik',
        value: `${data.closingPrice < data.bofaAvgCost ? 'Maliyet Altı Tedirginlik' : 'Maliyet Üstü Güven'}`,
        sentiment: data.closingPrice < data.bofaAvgCost ? 'negative' : 'positive',
      },
    ],
    analysisPoints: [
      `Satıcı oranı %${data.retailSellerRatio} seviyesinde; ${data.retailSellerRatio > 65 ? 'panik satışları baskın ve perakende kademelere aktif satışla çıkış arıyor' : data.retailSellerRatio < 45 ? 'alıcı iştahı güçlü, perakende dip seviyelerden birikim yapıyor' : 'alıcı ve satıcı dengeli, nötr konsolidasyon havası hakim'}.`,
      `Alıcı oranı %${data.retailBuyerRatio} ile ${data.retailBuyerRatio > 55 ? 'yukarı yönlü itici güç sağlıyor' : 'baskılanmış olup dirençlerde realizasyon riskini artırıyor'}.`,
      `Piyasa duygu skoru %25 model ağırlığıyla ${aBull >= 50 ? 'pozitif katkı sunuyor' : aBull <= 30 ? 'riskten kaçınma modunu tetikliyor' : 'nötr denge bandında kalıyor'}.`,
    ],
    verdict: aVerdict.toUpperCase() as any,
  };

  // 2. TEKNİK MODEL (%35):
  // MACD AL/SAT, RSI durumu, duvar tipine göre bullPct 10-90 arası.
  const technicalIndicators = calculateTechnicalIndicators(data);
  const priceRangeVolatility = calculateDailyPriceRangeAndVolatility(data, 30);

  let bScore = 50;
  if (technicalIndicators.macdSignal === 'AL') {
    bScore += 18;
  } else if (technicalIndicators.macdSignal === 'SAT') {
    bScore -= 18;
  }

  if (technicalIndicators.rsiStatus === 'POZİTİF_MOMENTUM') {
    bScore += 12;
  } else if (technicalIndicators.rsiStatus === 'AŞIRI_ALIM') {
    bScore -= 8;
  } else if (technicalIndicators.rsiStatus === 'AŞIRI_SATIM') {
    bScore += 12;
  } else if (technicalIndicators.rsiStatus === 'ZAYIF_MOMENTUM') {
    bScore -= 12;
  }

  if (data.dominantWallType === 'ASK') {
    bScore -= (data.dominantWallLot >= 100000 ? 14 : 8);
  } else if (data.dominantWallType === 'BID') {
    bScore += (data.dominantWallLot >= 100000 ? 14 : 8);
  }

  let bBull = Math.max(10, Math.min(90, Math.round(bScore)));
  let bBear = Math.max(10, Math.min(90, 100 - bBull));
  let bNeutral = Math.max(5, 100 - bBull - bBear);
  const bSum = bBull + bBear + bNeutral;
  bBull = Math.max(10, Math.min(90, Math.round((bBull / bSum) * 100)));
  bBear = Math.max(10, Math.min(90, Math.round((bBear / bSum) * 100)));
  bNeutral = 100 - bBull - bBear;

  // Hard guard for Technical Model based on MACD
  if (technicalIndicators.macdSignal === 'AL' && bBull < 55) {
    bBull = 60; // Ensure technical score is at least bullish if MACD is BUY
  }
  
  const bVerdict: 'YÜKSELİŞ' | 'NÖTR' | 'DÜŞÜŞ' = bBull >= 55 ? 'YÜKSELİŞ' : bBear >= 55 ? 'DÜŞÜŞ' : 'NÖTR';

  const analystB: AnalystPerspective = {
    id: 'B',
    name: 'Teknik Model',
    label: 'Derinlik & İndikatör (%35)',
    focus: `Duvar (${(data.dominantWallLot / 1000).toFixed(0)}k lot @ ${data.dominantWallPrice.toFixed(2)} TL), RSI(${technicalIndicators.rsi14}), MACD (${technicalIndicators.macdSignal})`,
    bullPct: bBull,
    neutralPct: bNeutral,
    bearPct: bBear,
    keyMetrics: [
      {
        label: 'RSI(14) Momentum',
        value: `${technicalIndicators.rsi14} (${technicalIndicators.rsiStatus === 'POZİTİF_MOMENTUM' ? 'Pozitif' : technicalIndicators.rsiStatus === 'AŞIRI_ALIM' ? 'Aşırı Alım' : technicalIndicators.rsiStatus === 'AŞIRI_SATIM' ? 'Aşırı Satım' : 'Dengeli'})`,
        sentiment: technicalIndicators.rsiSentiment,
      },
      {
        label: 'MACD(12,26,9) Sinyal',
        value: `${technicalIndicators.macdLine > 0 ? '+' : ''}${technicalIndicators.macdLine} / S:${technicalIndicators.signalLine} [${technicalIndicators.macdSignal}]`,
        sentiment: technicalIndicators.macdSentiment,
      },
      {
        label: LABELS.wall,
        value: `${(data.dominantWallLot / 1000).toFixed(0)}k Lot @ ${data.dominantWallPrice.toFixed(2)} TL (${data.dominantWallType === 'ASK' ? 'Satış' : 'Alış'})`,
        sentiment: data.dominantWallType === 'ASK' ? 'negative' : 'positive',
      },
      {
        label: 'Ana Destek / Direnç',
        value: `${data.supportLevel1.toFixed(2)} / ${data.resistanceLevel1.toFixed(2)} TL`,
        sentiment: 'neutral',
      },
    ],
    analysisPoints: [
      `RSI(14) ${technicalIndicators.rsi14} seviyesinde; ${technicalIndicators.rsiStatus === 'POZİTİF_MOMENTUM' ? 'boğa momentumunu koruyor ve yukarı yönlü potansiyel sunuyor' : technicalIndicators.rsiStatus === 'AŞIRI_ALIM' ? 'aşırı alım bölgesinde olup dirençte kâr satışı riski barındırıyor' : technicalIndicators.rsiStatus === 'AŞIRI_SATIM' ? 'aşırı satım bölgesinde dip avcılığı ve tepki sıçraması fırsatı veriyor' : 'nötr denge bandında yatay seyrediyor'}.`,
      `MACD(12,26,9) indikatörü ${technicalIndicators.macdSignal === 'AL' ? 'AL sinyali vererek pozitif ivmeyi teyit ediyor' : technicalIndicators.macdSignal === 'SAT' ? 'SAT sinyali ile düzeltme baskısının sürdüğüne işaret ediyor' : 'kesişme eşiğinde nötr durumda'}.`,
      `${data.dominantWallPrice.toFixed(2)} TL kademesinde ${(data.dominantWallLot / 1000).toFixed(0)}k lotluk ${data.dominantWallType === 'ASK' ? 'satış barajı/duvarı' : 'alış kalkanı'} ve %${(((data.depthAskTotal) / (data.depthBidTotal + data.depthAskTotal || 1)) * 100).toFixed(0)} satış ağırlıklı derinlik mevcut.`,
      `Aşağıda ${data.supportLevel1.toFixed(2)} TL birincil destek ve ${data.supportLevel2.toFixed(2)} TL stop pivotu; yukarıda ${data.resistanceLevel1.toFixed(2)} TL duvar kırılımı izlenmelidir.`,
    ],
    verdict: bVerdict,
    technicalIndicators,
    priceRangeVolatility,
  };

  // 3. AKIŞ MODELİ (%40):
  // bofaNetLot pozitif/negatif, citibankChange30d, pensionFundChange7d değişimlerine göre bullPct 10-90 arası.
  let cScore = 50;

  // BofA Sıkışma Mantığı & Satış Baskısı Dengelemesi (Patch 1 & 2)
  const costDiff = data.closingPrice - data.bofaAvgCost;
  const costDiffPct = (costDiff / (data.bofaAvgCost || 1)) * 100;
  const isNearCost = costDiffPct >= -2.5 && costDiffPct <= 0;
  const isActiveSeller = data.bofaNetLot < -50000 && data.bofaNetLot > -300000;
  const depthRatio = data.depthBidTotal / (data.depthAskTotal || 1);
  const isBuyerAbsorbing = depthRatio >= 0.85;

  let squeezeInfo = '';
  // Gerçek Alıcı Emme durumu: BofA hafif zararda ve alıcılar tahtayı karşılıyorsa
  if (isNearCost && isActiveSeller && isBuyerAbsorbing && data.dominantWallType !== 'ASK') {
    cScore += 10;
    squeezeInfo = 'BofA hafif zararda, dip alıcılar emiyor (sıkışma potansiyeli).';
  } else if (data.bofaNetLot < -25000 && (data.dominantWallType === 'ASK' || depthRatio < 0.80)) {
    // ⚠️ DÜZELTME: BofA net satışta ve tahtada aktif satış baskısı/duvarı varsa Pusu/Akış skoru cezalandırılır
    const wallPenalty = data.dominantWallLot >= 20000 ? 16 : 10;
    cScore -= wallPenalty;
    squeezeInfo = `BofA net satışta (${(data.bofaNetLot / 1000).toFixed(0)}k lot) ve tahtada ${(data.dominantWallLot / 1000).toFixed(0)}k satış duvarı baskısı var.`;
  }

  if (data.bofaNetLot > 50000) {
    cScore += 18;
  } else if (data.bofaNetLot > 0) {
    cScore += 10;
  } else if (data.bofaNetLot < -50000) {
    cScore -= 18;
  } else if (data.bofaNetLot < 0) {
    cScore -= 10;
  }


  if (data.citibankChange30d > 1.5) {
    cScore += 12;
  } else if (data.citibankChange30d > 0) {
    cScore += 6;
  } else if (data.citibankChange30d < -1.5) {
    cScore -= 12;
  } else if (data.citibankChange30d < 0) {
    cScore -= 6;
  }

  const pf7d = typeof data.pensionFundChange7d === 'number'
    ? data.pensionFundChange7d
    : (data.pensionFundSharePct > 15 ? 0.75 : -0.25);

  if (pf7d > 0.5) {
    cScore += 10;
  } else if (pf7d > 0) {
    cScore += 5;
  } else if (pf7d < -0.5) {
    cScore -= 10;
  } else if (pf7d < 0) {
    cScore -= 5;
  }

  if (costDiff > 0) {
    cScore += 5;
  } else if (data.bofaNetLot < 0 && costDiff < 0) {
    cScore -= 8;
  }

  let cBull = Math.max(10, Math.min(90, Math.round(cScore)));
  let cBear = Math.max(10, Math.min(90, 100 - cBull));
  let cNeutral = Math.max(5, 100 - cBull - cBear);
  const cSum = cBull + cBear + cNeutral;
  cBull = Math.max(10, Math.min(90, Math.round((cBull / cSum) * 100)));
  cBear = Math.max(10, Math.min(90, Math.round((cBear / cSum) * 100)));
  cNeutral = 100 - cBull - cBear;

  const cVerdict: 'YÜKSELİŞ' | 'NÖTR' | 'DÜŞÜŞ' = cBull >= 55 ? 'YÜKSELİŞ' : cBear >= 55 ? 'DÜŞÜŞ' : 'NÖTR';

  const analystC: AnalystPerspective = {
    id: 'C',
    name: 'Akış Modeli',
    label: 'BofA & Takas (%40)',
    focus: 'BofA net lot/maliyet, Citibank 30g ve Emeklilik Fonu WoW takas akışı',
    bullPct: cBull,
    neutralPct: cNeutral,
    bearPct: cBear,
    keyMetrics: [
      {
        label: LABELS.bofaCost,
        value: `${(data.bofaNetLot / 1000).toFixed(0)}k Lot @ ${data.bofaAvgCost.toFixed(2)} TL`,
        sentiment: data.bofaNetLot >= 0 ? 'positive' : 'negative',
      },
      {
        label: 'Citibank Takas Payı',
        value: `%${data.citibankSharePct.toFixed(1)} (${data.citibankChange30d >= 0 ? '+' : ''}${data.citibankChange30d.toFixed(2)}%)`,
        sentiment: data.citibankChange30d >= 0 ? 'positive' : 'negative',
      },
      {
        label: 'Emeklilik Fonu Payı',
        value: `%${data.pensionFundSharePct.toFixed(1)} Kurumsal`,
        sentiment: 'positive',
      },
    ],
    analysisPoints: [
      `BofA ${data.bofaNetLot >= 0 ? '+' : ''}${(data.bofaNetLot / 1000).toFixed(0)}k lot net pozisyonla masada; ortalama maliyeti ${data.bofaAvgCost.toFixed(2)} TL (fiyata göre ${costDiff >= 0 ? '+' : ''}${costDiff.toFixed(2)} TL fark). ${squeezeInfo}`,
      `Citibank saklama payı %${data.citibankSharePct.toFixed(1)} (${data.citibankChange30d >= 0 ? '30 günde artışta' : '30 günde çıkışta'}); Emeklilik Fonları %${data.pensionFundSharePct.toFixed(1)} pay ile kurumsal tampon sunuyor.`,
      `Takas akış modeli %40 ağırlık ile genel yönü ${cVerdict === 'YÜKSELİŞ' ? 'güçlü alış tarafında' : cVerdict === 'DÜŞÜŞ' ? 'net satış tarafında' : 'dengeli akışta'} teyit ediyor.`,
    ],
    verdict: cVerdict,
  };

  // Ağırlıklı skor hesaplama: sentiment*0.25 + technical*0.35 + flow*0.40
  const weightedScore = Math.round(
    aBull * weights.sentiment.weight +
    bBull * weights.technical.weight +
    cBull * weights.flow.weight
  );

  // Final karar kuralı:
  // 🛑 KILL-SWITCH: Piyasa kapalıyken (CLOSED) aktif AL/SAT canlı sinyali üretilmez; BEKLE (Kapalı Seans) moduna alınır.
  let finalDecision: 'AL' | 'SAT' | 'BEKLE' = 'BEKLE';
  const isMarketClosed = data?.marketSession === 'CLOSED' || data?.isTradeable === false;

  if (isMarketClosed) {
    finalDecision = 'BEKLE';
  } else if (weightedScore >= 70 && bVerdict !== 'DÜŞÜŞ') {
    finalDecision = 'AL';
  } else if (weightedScore < 40 && bVerdict !== 'YÜKSELİŞ') {
    finalDecision = 'SAT';
  } else {
    finalDecision = 'BEKLE';
  }

  // Konsensüs olasılıkları ve duygu
  const avgBull = weightedScore;
  const avgBear = Math.round(
    aBear * weights.sentiment.weight +
    bBear * weights.technical.weight +
    cBear * weights.flow.weight
  );
  const avgNeutral = Math.max(0, 100 - avgBull - avgBear);

  let dominantSentiment: 'BOĞA' | 'NÖTR' | 'AYI' = 'NÖTR';
  if (weightedScore >= 56) dominantSentiment = 'BOĞA';
  else if (weightedScore <= 44) dominantSentiment = 'AYI';
  else dominantSentiment = 'NÖTR';

  return {
    analystA,
    analystB,
    analystC,
    technicalIndicators,
    priceRangeVolatility,
    modelWeights: weights,
    weightedScore,
    finalDecision,
    dominantSentiment,
    consensusProbabilities: {
      bullPct: avgBull,
      neutralPct: avgNeutral,
      bearPct: avgBear,
      dominantSentiment,
    },
  };
}

function buildSessionMessage(data: MarketDataInput, session: string): string {
  const matchPrice = data.theoreticalMatchPrice || data.closingPrice;
  const wallPrice = data.dominantWallPrice;
  const wallLot = data.dominantWallLot;
  const bofaCost = data.bofaAvgCost;
  const support = data.supportLevel1;

  switch (session) {
    case 'PRE_MARKET':
      return `📅 Seans 09:40'ta açılıyor. Bugün için plan: ${matchPrice.toFixed(2)} TL'nin BofA maliyeti (${bofaCost.toFixed(2)} TL) üzerinde kalması. Duvar: ${wallPrice.toFixed(2)} TL (${(wallLot/1000).toFixed(0)}k lot).`;
    case 'OPENING_AUCTION':
      return `🔔 Açılış emir toplama (09:40-09:55). Teorik eşleşme: ${matchPrice.toFixed(2)} TL, BofA maliyeti: ${bofaCost.toFixed(2)} TL. Duvarın (${wallPrice.toFixed(2)} TL / ${(wallLot/1000).toFixed(0)}k lot) çekilip çekilmediğini izle.`;
    case 'CONTINUOUS':
      return `🟢 Gün içi sürekli işlem aktif. Fiyat: ${matchPrice.toFixed(2)} TL. Kritik direnç: ${wallPrice.toFixed(2)} TL (${(wallLot/1000).toFixed(0)}k lot). Kırılım için hacim artışı + BofA net alış teyidi bekle. Destek: ${support.toFixed(2)} TL.`;
    case 'CLOSING_AUCTION':
      return `🔔 Kapanış seansı (18:10-18:15). Gün sonu fiyat: ${matchPrice.toFixed(2)} TL. Pozisyonları değerlendir, ertesi gün için senaryoları hazırla.`;
    case 'CLOSED':
      return `🌙 BIST kapandı. Günlük kapanış: ${matchPrice.toFixed(2)} TL. Yarın 09:40 açılış için seviyeler ve senaryolar hazırlanıyor.`;
    default:
      return `🟢 Gün içi sürekli işlem aktif. Fiyat: ${matchPrice.toFixed(2)} TL. Kritik direnç: ${wallPrice.toFixed(2)} TL (${(wallLot/1000).toFixed(0)}k lot).`;
  }
}

/**
 * Tek model ve ağırlıklı analitik görünüm (Duygu %25, Teknik %35, Akış %40) ile jüri raporunu üretir.
 */
export function computeJuryReport(
  inputData: MarketDataInput,
  customWeights?: ModelWeightConfig,
  session: string = 'CONTINUOUS'
): JuryReport {
  const base = getDefaultMarketData(inputData?.ticker || 'ASELS.IS');
  const data: MarketDataInput = {
    ...base,
    ...inputData,
    closingPrice: typeof inputData?.closingPrice === 'number' ? inputData.closingPrice : base.closingPrice,
    dominantWallPrice: typeof inputData?.dominantWallPrice === 'number' ? inputData.dominantWallPrice : base.dominantWallPrice,
    dominantWallLot: typeof inputData?.dominantWallLot === 'number' ? inputData.dominantWallLot : base.dominantWallLot,
    supportLevel1: typeof inputData?.supportLevel1 === 'number' ? inputData.supportLevel1 : base.supportLevel1,
    supportLevel2: typeof inputData?.supportLevel2 === 'number' ? inputData.supportLevel2 : base.supportLevel2,
    resistanceLevel1: typeof inputData?.resistanceLevel1 === 'number' ? inputData.resistanceLevel1 : base.resistanceLevel1,
    resistanceLevel2: typeof inputData?.resistanceLevel2 === 'number' ? inputData.resistanceLevel2 : base.resistanceLevel2,
    bofaAvgCost: typeof inputData?.bofaAvgCost === 'number' ? inputData.bofaAvgCost : base.bofaAvgCost,
    bofaNetLot: typeof inputData?.bofaNetLot === 'number' ? inputData.bofaNetLot : base.bofaNetLot,
    citibankSharePct: typeof inputData?.citibankSharePct === 'number' ? inputData.citibankSharePct : base.citibankSharePct,
    citibankChange30d: typeof inputData?.citibankChange30d === 'number' ? inputData.citibankChange30d : base.citibankChange30d,
    pensionFundSharePct: typeof inputData?.pensionFundSharePct === 'number' ? inputData.pensionFundSharePct : base.pensionFundSharePct,
    depthBidTotal: typeof inputData?.depthBidTotal === 'number' ? inputData.depthBidTotal : base.depthBidTotal,
    depthAskTotal: typeof inputData?.depthAskTotal === 'number' ? inputData.depthAskTotal : base.depthAskTotal,
    retailSellerRatio: typeof inputData?.retailSellerRatio === 'number' ? inputData.retailSellerRatio : base.retailSellerRatio,
    retailBuyerRatio: typeof inputData?.retailBuyerRatio === 'number' ? inputData.retailBuyerRatio : base.retailBuyerRatio,
  };

  const analysis = computeWeightedAnalysis(data, customWeights);
  const bofaAbsoluteLot = Math.abs(data.bofaNetLot);

  // Ortak Karar Tablosu (Senaryo / Seviye / Aksiyon)
  const decisionMatrix: DecisionScenario[] = [
    {
      id: 'sc-1',
      scenarioName: 'Boğa (Duvar Kırılımı & BofA Sıkışması)',
      scenarioType: 'BULL',
      triggerLevel: `${data.dominantWallPrice.toFixed(2)} TL üzeri 15 dk kalıcılık + ${(data.dominantWallLot / 1000).toFixed(0)}k duvarın erimesi`,
      action: `Hedef: ${data.resistanceLevel2.toFixed(2)} TL. Kademeli Long açılışı. Stop: ${data.bofaAvgCost.toFixed(2)} TL (Risk/Ödül 1:8.69). Senaryo Planı: AL (Tetik Şartıyla).`,
      invalidationLevel: `${data.dominantWallPrice.toFixed(2)} TL altında fake kırılım ve BofA yeni satış bloğu koyarsa derhal çık.`,
      probability: analysis.consensusProbabilities.bullPct,
    },
    {
      id: 'sc-2',
      scenarioName: 'Nötr (Bant İçi Testere & Konsolidasyon)',
      scenarioType: 'NEUTRAL',
      triggerLevel: `${data.supportLevel1.toFixed(2)} TL ile ${data.dominantWallPrice.toFixed(2)} TL aralığında yatay seyir`,
      action: `Yön teyidi gelene kadar yeni pozisyon açma. ${data.supportLevel1.toFixed(2)} TL desteğinde mini tepki scalping dışında kenarda bekle.`,
      invalidationLevel: `${data.dominantWallPrice.toFixed(2)} TL aşımı veya ${data.supportLevel1.toFixed(2)} TL altına sarkma.`,
      probability: analysis.consensusProbabilities.neutralPct,
    },
    {
      id: 'sc-3',
      scenarioName: 'Ayı (Baskı Devamı & Destek İhlali)',
      scenarioType: 'BEAR',
      triggerLevel: `${data.supportLevel1.toFixed(2)} TL altı hacimli 5 dk kapanış + BofA net satışının -${(Math.max(bofaAbsoluteLot, 600000) / 1000).toFixed(0)}k lotu aşması`,
      action: `Mevcut long pozisyonları stopla. Short/Hedge pozisyonu koru; alım için ${data.supportLevel2.toFixed(2)} TL kurumsal tabanını bekle.`,
      invalidationLevel: `Fiyatın ${data.dominantWallPrice.toFixed(2)} TL direnç duvarı üzerine geçmesi ve BofA'nın net alıma geçmesi.`,
      probability: analysis.consensusProbabilities.bearPct,
    },
  ];

  const matchPrice = data.theoreticalMatchPrice || data.closingPrice;
  const preMarket0955Watch = buildSessionMessage(data, session);

  return {
    ticker: data.ticker,
    timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    marketData: data,
    analystA: analysis.analystA,
    analystB: analysis.analystB,
    analystC: analysis.analystC,
    technicalIndicators: analysis.technicalIndicators,
    priceRangeVolatility: analysis.priceRangeVolatility,
    consensusProbabilities: analysis.consensusProbabilities,
    decisionMatrix,
    preMarket0955Watch,
    modelWeights: analysis.modelWeights,
    weightedScore: analysis.weightedScore,
    finalDecision: analysis.finalDecision,
  };
}

/**
 * Yahoo Finance ve BIST son takas verilerinden canlı piyasa ve derinlik simülasyonu çeker.
 * Parametre olarak gelen herhangi bir BIST hisse sembolünü (örn: THYAO, EREGL, ASELS) destekler.
 */
export async function fetchLiveData(ticker: string = 'ASELS.IS'): Promise<MarketDataInput> {
  const cleanCode = (ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  const formattedTicker = `${cleanCode}.IS`;
  const baseData = getDefaultMarketData(formattedTicker);

  try {
    const res = await fetch(`/api/live-market?ticker=${encodeURIComponent(formattedTicker)}`);
    if (!res.ok) {
      throw new Error(`Canlı veri sunucu yanıtı: ${res.status}`);
    }
    const data: any = await res.json();
    const currentPrice = 
      typeof data.closingPrice === 'number' && data.closingPrice > 0 ? data.closingPrice :
      typeof data.last_price === 'number' && data.last_price > 0 ? data.last_price :
      typeof data.price === 'number' && data.price > 0 ? data.price :
      baseData.closingPrice;

    const dayChangePct = 
      typeof data.dayChangePct === 'number' ? data.dayChangePct :
      typeof data.rate === 'number' ? data.rate :
      typeof data.changePercent === 'number' ? data.changePercent :
      baseData.dayChangePct;

    const dominantWallPrice = Number((currentPrice * 1.011).toFixed(2));
    const dominantWallLot = Math.max(5000, Math.round((9200000 / currentPrice) / 1000) * 1000);
    const bofaNetLot = -Math.max(10000, Math.round((35000000 / currentPrice) / 1000) * 1000);
    const bofaAvgCost = Number((currentPrice * 1.0065).toFixed(2));
    const supportLevel1 = Number((currentPrice * 0.988).toFixed(2));
    const supportLevel2 = Number((currentPrice * 0.970).toFixed(2));
    const resistanceLevel1 = dominantWallPrice;
    const resistanceLevel2 = Number((currentPrice * 1.032).toFixed(2));
    const theoMatch = Number((currentPrice * 1.0015).toFixed(2));

    return {
      ...baseData,
      ...data,
      ticker: formattedTicker,
      closingPrice: currentPrice,
      dayChangePct,
      dominantWallPrice,
      dominantWallLot,
      bofaNetLot,
      bofaAvgCost,
      supportLevel1,
      supportLevel2,
      resistanceLevel1,
      resistanceLevel2,
      theoreticalMatchPrice: theoMatch,
      isLive: true,
      lastLiveUpdate: data.lastLiveUpdate || new Date().toLocaleTimeString('tr-TR'),
      notes: `${cleanCode} Canlı BIST piyasa verisi aktif (${data.source || 'BIST/Yahoo'}).`,
    };
  } catch (err) {
    console.warn(`[fetchLiveData] API fallback devrede (${formattedTicker}):`, err);
    const jitter = (Math.random() - 0.5) * (baseData.closingPrice * 0.004);
    const currentPrice = Number((baseData.closingPrice + jitter).toFixed(2));
    const theoMatch = Number((currentPrice + (Math.random() - 0.45) * (currentPrice * 0.003)).toFixed(2));

    return {
      ...baseData,
      ticker: formattedTicker,
      closingPrice: currentPrice,
      theoreticalMatchPrice: theoMatch,
      isLive: true,
      lastLiveUpdate: new Date().toLocaleTimeString('tr-TR'),
      notes: `${cleanCode} BIST akışı (yedek model)`,
    };
  }
}

/**
 * Tarayıcı Bildirim İzni Durumu
 */
export function getBrowserNotificationPermission(): NotificationPermission {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }
  return 'denied';
}

/**
 * Tarayıcı Bildirim İzni İsteme
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm;
    } catch (e) {
      console.warn('Tarayıcı bildirim izni istenirken hata:', e);
      return 'denied';
    }
  }
  return 'denied';
}

/**
 * Tarayıcı Bildirimi Gönderme
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
      return true;
    } catch (e) {
      console.warn('Tarayıcı bildirimi gönderilemedi:', e);
    }
  }
  return false;
}

export const BIST_MULTI_ALERTS_KEY = 'bist_multi_price_alerts_v2';
export const BIST_ALERT_HISTORY_KEY = 'bist_alert_history_v2';

/**
 * Web Audio API ile tarayıcı içi hoş, çift tonlu finansal alarm zili çalar.
 * Böylece kullanıcı tarayıcı bildirimlerine bağımlı kalmadan uygulama içinden anında haberdar olur.
 */
export function playAlertChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 1. Ton (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // 2. Ton (1320 Hz - E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.4);
  } catch (err) {
    // Autoplay kısıtı veya sessiz ortam durumunda sessizce yut
  }
}

/**
 * Kaydedilmiş tüm fiyat alarmlarını getirir (localStorage)
 */
export function getAllPriceAlerts(): CustomPriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BIST_MULTI_ALERTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Fiyat alarmları okunamadı:', e);
  }
  return [];
}

/**
 * Belirli bir hisseye ait fiyat alarmlarını getirir.
 * Eğer henüz tanımlı bir alarm yoksa, hissenin teknik seviyelerine uygun hazır akıllı varsayılanlar üretir.
 */
export function getPriceAlertsForTicker(ticker: string, fallbackData?: MarketDataInput): CustomPriceAlert[] {
  const cleanCode = String(ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  const allAlerts = getAllPriceAlerts();
  const forTicker = allAlerts.filter(
    (a) => String(a?.ticker || '').replace(/\.IS$/i, '').toUpperCase().trim() === cleanCode
  );

  // Eğer hisseye ait hiç alarm yoksa ve fallbackData sağlanmışsa, akıllı varsayılan seviyeleri hazırla
  if (forTicker.length === 0 && fallbackData) {
    const defaultPresets = generateDefaultPresetAlerts(fallbackData);
    saveMultiplePriceAlerts(defaultPresets);
    return defaultPresets;
  }

  return forTicker;
}

/**
 * Tek bir fiyat alarmını kaydeder veya günceller
 */
export function savePriceAlert(alert: CustomPriceAlert): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getAllPriceAlerts();
    const existingIndex = all.findIndex((a) => a.id === alert.id);
    if (existingIndex >= 0) {
      all[existingIndex] = alert;
    } else {
      all.unshift(alert);
    }
    localStorage.setItem(BIST_MULTI_ALERTS_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Fiyat alarmı kaydedilemedi:', e);
  }
}

/**
 * Birden fazla fiyat alarmını topluca kaydeder
 */
export function saveMultiplePriceAlerts(newAlerts: CustomPriceAlert[]): void {
  if (typeof window === 'undefined' || newAlerts.length === 0) return;
  try {
    const all = getAllPriceAlerts();
    const map = new Map<string, CustomPriceAlert>();
    all.forEach((a) => map.set(a.id, a));
    newAlerts.forEach((a) => map.set(a.id, a));
    const merged = Array.from(map.values());
    localStorage.setItem(BIST_MULTI_ALERTS_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('Çoklu fiyat alarmları kaydedilemedi:', e);
  }
}

/**
 * Alarmın aktif/pasif durumunu tek tıkla tersine çevirir
 */
export function togglePriceAlert(alertId: string, forcedEnabled?: boolean): CustomPriceAlert | null {
  if (typeof window === 'undefined') return null;
  try {
    const all = getAllPriceAlerts();
    const alert = all.find((a) => a.id === alertId);
    if (!alert) return null;

    alert.enabled = forcedEnabled !== undefined ? forcedEnabled : !alert.enabled;
    // Tekrar aktif edildiğinde tetiklenme durumunu temizle
    if (alert.enabled) {
      alert.isTriggered = false;
      alert.lastTriggeredAt = undefined;
    }
    localStorage.setItem(BIST_MULTI_ALERTS_KEY, JSON.stringify(all));
    return alert;
  } catch (e) {
    console.warn('Alarm toggle hatası:', e);
    return null;
  }
}

/**
 * Bir fiyat alarmını siler
 */
export function deletePriceAlert(alertId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getAllPriceAlerts();
    const filtered = all.filter((a) => a.id !== alertId);
    localStorage.setItem(BIST_MULTI_ALERTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Alarm silinemedi:', e);
  }
}

/**
 * Tetiklenmiş bir alarmın tetiklenme durumunu sıfırlar (tekrar izlemeye alır)
 */
export function resetPriceAlertTrigger(alertId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getAllPriceAlerts();
    const alert = all.find((a) => a.id === alertId);
    if (alert) {
      alert.isTriggered = false;
      alert.lastTriggeredAt = undefined;
      localStorage.setItem(BIST_MULTI_ALERTS_KEY, JSON.stringify(all));
    }
  } catch (e) {
    console.warn('Alarm reset hatası:', e);
  }
}

/**
 * Belirli bir hissenin (veya tümünün) alarmlarını temizler
 */
export function clearAllPriceAlerts(ticker?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (!ticker) {
      localStorage.removeItem(BIST_MULTI_ALERTS_KEY);
    } else {
      const cleanCode = String(ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
      const all = getAllPriceAlerts();
      const filtered = all.filter((a) => String(a?.ticker || '').replace(/\.IS$/i, '').toUpperCase().trim() !== cleanCode);
      localStorage.setItem(BIST_MULTI_ALERTS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Alarmlar temizlenemedi:', e);
  }
}

/**
 * Tetiklenen alarm olay geçmişini çeker (en son tetiklenenler üstte)
 */
export function getTriggeredAlertEvents(): TriggeredAlertEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BIST_ALERT_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Tetiklenme geçmişi okunamadı:', e);
  }
  return [];
}

/**
 * Yeni bir tetiklenme olayını geçmişe ekler (son 50 olay tutulur)
 */
export function saveTriggeredAlertEvent(event: TriggeredAlertEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const events = getTriggeredAlertEvents();
    events.unshift(event);
    const trimmed = events.slice(0, 50);
    localStorage.setItem(BIST_ALERT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Tetiklenme olayı kaydedilemedi:', e);
  }
}

/**
 * Tetiklenme geçmişini temizler
 */
export function clearTriggeredAlertEvents(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BIST_ALERT_HISTORY_KEY);
  } catch (e) {
    console.warn('Geçmiş temizlenemedi:', e);
  }
}

/**
 * Hissenin mevcut teknik destek, direnç ve derinlik verilerine göre akıllı varsayılan alarmlar üretir
 */
export function generateDefaultPresetAlerts(data: MarketDataInput): CustomPriceAlert[] {
  const cleanCode = String(data?.ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  const now = Date.now();
  const theoPrice = data.theoreticalMatchPrice ?? data.closingPrice;

  return [
    {
      id: `alert_${cleanCode}_S1_${now}`,
      ticker: `${cleanCode}.IS`,
      label: 'Destek 1 Seviyesi (S1)',
      levelType: 'SUPPORT',
      targetPrice: Number(data.supportLevel1.toFixed(2)),
      metric: 'CLOSING',
      condition: 'BELOW',
      enabled: true,
      createdAt: now,
      notes: 'İlk destek seviyesi; kırılımında risk azaltımı veya stop-loss gözlenir.',
    },
    {
      id: `alert_${cleanCode}_R1_${now + 1}`,
      ticker: `${cleanCode}.IS`,
      label: 'Direnç 1 Kırılımı (R1)',
      levelType: 'RESISTANCE',
      targetPrice: Number(data.resistanceLevel1.toFixed(2)),
      metric: 'CLOSING',
      condition: 'ABOVE',
      enabled: true,
      createdAt: now,
      notes: 'İlk direnç aşımı; momentum artışı ve alış iştahının teyidi.',
    },
    {
      id: `alert_${cleanCode}_WALL_${now + 2}`,
      ticker: `${cleanCode}.IS`,
      label: 'Kritik Kademe Satış Duvarı',
      levelType: 'WALL',
      targetPrice: Number(data.dominantWallPrice.toFixed(2)),
      metric: 'CLOSING',
      condition: 'ABOVE',
      enabled: true,
      createdAt: now,
      notes: `${(data.dominantWallLot / 1000).toFixed(0)}k lotluk blok satış duvarı aşımı (Short squeeze tetikleyicisi).`,
    },
    {
      id: `alert_${cleanCode}_BOFA_${now + 3}`,
      ticker: `${cleanCode}.IS`,
      label: 'BofA Ortalama Maliyet Eşiği',
      levelType: 'BOFA_COST',
      targetPrice: Number(data.bofaAvgCost.toFixed(2)),
      metric: 'CLOSING',
      condition: 'CROSS',
      enabled: false,
      createdAt: now,
      notes: 'Bank of America kurum maliyeti kesişimi; kurumsal kar/zarar dengesi.',
    },
    {
      id: `alert_${cleanCode}_THEO_${now + 4}`,
      ticker: `${cleanCode}.IS`,
      label: '09:55 Teorik Eşleşme Eşiği',
      levelType: 'THEORETICAL_0955',
      targetPrice: Number((theoPrice * 1.01).toFixed(2)),
      metric: 'THEORETICAL_0955',
      condition: 'ABOVE',
      enabled: false,
      createdAt: now,
      notes: 'Seans açılışı öncesi 09:55 teorik eşleşmenin dünkü kapanışın %1 üzerine çıkması.',
    },
  ];
}

/**
 * Birden fazla fiyat alarmını hem Kapanış Fiyatı hem de 09:55 Teorik Eşleşme fiyatına göre denetler.
 * Kullanıcı tanımlı destek ve direnç seviyeleri aşıldığında veya kesildiğinde:
 * 1. Alarmın durumunu 'isTriggered: true' ve tetiklenme zamanı ile günceller
 * 2. Uygulama içi bildirim olayını (TriggeredAlertEvent) oluşturur
 * 3. Hoş bir uygulama içi zil sesi (chime) çalar
 * 4. İzin verilmişse tarayıcı bildirimi gönderir
 */
export function checkAndTriggerMultiplePriceAlerts(
  currentData: MarketDataInput,
  prevData?: MarketDataInput | null,
  isLiveMode = true
): {
  triggeredAlerts: CustomPriceAlert[];
  events: TriggeredAlertEvent[];
} {
  const cleanCode = String(currentData?.ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  const alerts = getPriceAlertsForTicker(currentData.ticker, currentData);
  const now = Date.now();
  const triggeredAlerts: CustomPriceAlert[] = [];
  const events: TriggeredAlertEvent[] = [];

  let alertsModified = false;

  for (const alert of alerts) {
    if (!alert.enabled) continue;

    // Fiyat metriği: Kapanış mı yoksa 09:55 Teorik mi?
    const currentPrice =
      alert.metric === 'THEORETICAL_0955'
        ? currentData.theoreticalMatchPrice ?? currentData.closingPrice
        : currentData.closingPrice;

    const prevPrice =
      prevData
        ? alert.metric === 'THEORETICAL_0955'
          ? prevData.theoreticalMatchPrice ?? prevData.closingPrice
          : prevData.closingPrice
        : currentPrice;

    const target = alert.targetPrice;
    let isFired = false;
    let conditionDesc = '';

    // 20 saniye cooldown (aynı eşikte üst üste spamı önler)
    const cooldownPassed = !alert.lastTriggeredAt || now - alert.lastTriggeredAt > 20000;

    if (alert.condition === 'ABOVE') {
      if (currentPrice >= target && (prevPrice < target || cooldownPassed)) {
        isFired = true;
        conditionDesc = `${target.toFixed(2)} TL eşiğinin ÜZERİNE çıktı (%${(((currentPrice - target) / target) * 100).toFixed(2)})`;
      }
    } else if (alert.condition === 'BELOW') {
      if (currentPrice <= target && (prevPrice > target || cooldownPassed)) {
        isFired = true;
        conditionDesc = `${target.toFixed(2)} TL eşiğinin ALTINA indi (%${(((target - currentPrice) / target) * 100).toFixed(2)})`;
      }
    } else if (alert.condition === 'CROSS') {
      const crossedAbove = prevPrice < target && currentPrice >= target;
      const crossedBelow = prevPrice > target && currentPrice <= target;
      if ((crossedAbove || crossedBelow) && cooldownPassed) {
        isFired = true;
        conditionDesc = `${target.toFixed(2)} TL eşiğini kesti (${crossedAbove ? 'Yukarı Kırılım' : 'Aşağı Kırılım'})`;
      }
    }

    if (isFired) {
      alert.isTriggered = true;
      alert.lastTriggeredAt = now;
      alert.lastTriggeredPrice = currentPrice;
      alertsModified = true;
      triggeredAlerts.push(alert);

      const timeStr = new Date(now).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const eventMessage = `${alert.label}: Fiyat (${currentPrice.toFixed(2)} TL) ${conditionDesc}.`;

      const eventItem: TriggeredAlertEvent = {
        id: `evt_${alert.id}_${now}`,
        alertId: alert.id,
        ticker: alert.ticker,
        label: alert.label,
        levelType: alert.levelType,
        targetPrice: target,
        actualPrice: currentPrice,
        condition: alert.condition,
        timestamp: now,
        formattedTime: timeStr,
        message: eventMessage,
      };

      events.push(eventItem);
      saveTriggeredAlertEvent(eventItem);

      // Tarayıcı Bildirimi (İzin varsa ek olarak gönder)
      sendBrowserNotification(`🚨 [${alert.label}] ${cleanCode} ${currentPrice.toFixed(2)} TL`, {
        body: `${eventMessage}\nSeviye: ${target.toFixed(2)} TL | Canlı: ${currentPrice.toFixed(2)} TL`,
        tag: `bist-alert-${alert.id}`,
      });
    }
  }

  if (alertsModified) {
    saveMultiplePriceAlerts(alerts);
  }

  // Eğer tetiklenen alarm varsa uygulama içi ses çal
  if (events.length > 0) {
    playAlertChime();
  }

  return { triggeredAlerts, events };
}

/**
 * Kullanıcının hisse bazlı 09:55 eşleşme fiyat eşik ayarını getirir (Geriye uyumluluk için)
 */
export function getSavedThresholdAlert(ticker: string, fallbackPrice?: number): PriceThresholdAlert {
  const cleanCode = (ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  const storageKey = `bist_alert_0955_${cleanCode}`;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Threshold alert read error:', e);
    }
  }
  const defaultPrice = fallbackPrice || 382.25;
  return {
    ticker: `${cleanCode}.IS`,
    thresholdPrice: Number(defaultPrice.toFixed(2)),
    condition: 'ABOVE',
    enabled: false,
  };
}

/**
 * Kullanıcının hisse bazlı 09:55 eşleşme fiyat eşik ayarını kaydeder
 */
export function saveThresholdAlert(alert: PriceThresholdAlert): void {
  const cleanCode = String(alert?.ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  const storageKey = `bist_alert_0955_${cleanCode}`;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(storageKey, JSON.stringify(alert));
    } catch (e) {
      console.warn('Threshold alert save error:', e);
    }
  }
}

/**
 * Canlı Mod (Live Mode) aktifken 09:55 teorik eşleşme fiyatının kullanıcı tanımlı
 * eşiği geçip geçmediğini kontrol eder ve gerekirse tarayıcı bildirimi tetikler.
 */
export function checkAndTriggerTheoreticalThresholdAlert(
  currentData: MarketDataInput,
  prevData?: MarketDataInput | null,
  isLiveMode?: boolean
): { triggered: boolean; alert?: PriceThresholdAlert; message?: string } {
  // Yalnızca Canlı Mod açıkken bildirim sistemi tetiklenir
  if (!isLiveMode) {
    return { triggered: false };
  }

  const cleanCode = String(currentData?.ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  const alert = getSavedThresholdAlert(currentData.ticker, currentData.closingPrice);

  if (!alert.enabled || !alert.thresholdPrice) {
    return { triggered: false, alert };
  }

  const currentTheoPrice = currentData.theoreticalMatchPrice ?? currentData.closingPrice;
  const prevTheoPrice = prevData?.theoreticalMatchPrice ?? prevData?.closingPrice ?? currentTheoPrice;
  const threshold = alert.thresholdPrice;

  let isTriggered = false;
  let conditionText = '';

  const now = Date.now();
  // 25 saniye aralıkla bildirim cooldown'u (tekerrür eden spam bildirimleri önler)
  const cooldownPassed = !alert.lastTriggeredAt || now - alert.lastTriggeredAt > 25000;

  if (alert.condition === 'ABOVE') {
    if (currentTheoPrice >= threshold && (prevTheoPrice < threshold || cooldownPassed)) {
      isTriggered = true;
      conditionText = `belirlediğiniz ${threshold.toFixed(2)} TL eşiğinin ÜZERİNE çıktı (%${(((currentTheoPrice - threshold) / threshold) * 100).toFixed(2)})`;
    }
  } else if (alert.condition === 'BELOW') {
    if (currentTheoPrice <= threshold && (prevTheoPrice > threshold || cooldownPassed)) {
      isTriggered = true;
      conditionText = `belirlediğiniz ${threshold.toFixed(2)} TL eşiğinin ALTINA indi (%${(((threshold - currentTheoPrice) / threshold) * 100).toFixed(2)})`;
    }
  } else if (alert.condition === 'CROSS') {
    const crossedAbove = prevTheoPrice < threshold && currentTheoPrice >= threshold;
    const crossedBelow = prevTheoPrice > threshold && currentTheoPrice <= threshold;
    if ((crossedAbove || crossedBelow) && cooldownPassed) {
      isTriggered = true;
      conditionText = `${threshold.toFixed(2)} TL eşiğini kesti (${crossedAbove ? 'Yukarı' : 'Aşağı'})`;
    }
  }

  if (isTriggered) {
    const updatedAlert: PriceThresholdAlert = {
      ...alert,
      lastTriggeredPrice: currentTheoPrice,
      lastTriggeredAt: now,
    };
    saveThresholdAlert(updatedAlert);

    const bofaCost = currentData.bofaAvgCost;
    const bofaDiff = currentTheoPrice - bofaCost;
    const bofaRelation = bofaDiff >= 0
      ? `BofA Maliyetinin (${bofaCost.toFixed(2)} TL) +${bofaDiff.toFixed(2)} TL üzerinde (Short Squeeze Potansiyeli)`
      : `BofA Maliyetinin (${bofaCost.toFixed(2)} TL) ${bofaDiff.toFixed(2)} TL altında (Satış Baskısı Devam Ediyor)`;

    const title = `🚨 [09:55 Eşleşme Alarmı] ${cleanCode} ${currentTheoPrice.toFixed(2)} TL`;
    const body = `09:55 Canlı Teorik Eşleşme Fiyatı (${currentTheoPrice.toFixed(2)} TL), ${conditionText}.\n${bofaRelation}.`;

    // Sistem / Tarayıcı Bildirimi
    sendBrowserNotification(title, {
      body,
      tag: `bist-0955-alert-${cleanCode}`,
      requireInteraction: true,
    });

    return {
      triggered: true,
      alert: updatedAlert,
      message: `🚨 [09:55 Alarmı] ${cleanCode} Canlı Eşleşme: ${currentTheoPrice.toFixed(2)} TL (${threshold.toFixed(2)} TL ${alert.condition === 'ABOVE' ? 'Üstü' : 'Altı'})`,
    };
  }

  return { triggered: false, alert };
}

/**
 * Büyük ortakların (Citibank, Emeklilik Fonu, BofA) haftalık (Week-over-Week)
 * takas değişim yüzdelerini hesaplar ve Akümülasyon (Toplama) / Distribüsyon (Dağıtım)
 * trendlerini tespit eder.
 */
export function calculateMajorShareholdingTrends(data: MarketDataInput): {
  trends: ShareholdingTrendItem[];
  overallConsensus: string;
  overallTrendType: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  summarySentence: string;
} {
  // 1. Citibank Yabancı Saklama (Haftalık % Değişim)
  const citiWow = Number(
    (data.citibankChange7d !== undefined
      ? data.citibankChange7d
      : data.citibankChange30d * 0.28 + (data.dayChangePct > 0 ? 0.08 : -0.06)
    ).toFixed(2)
  );
  const citiCurrent = data.citibankSharePct;
  const citiPrev = Number((citiCurrent - (citiCurrent * (citiWow / 100))).toFixed(2));
  let citiType: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' = 'NEUTRAL';
  let citiLabel = 'Nötr / Yatay Saklama';
  let citiDesc = 'Yabancı saklama payında haftalık denge korunuyor.';

  if (citiWow >= 0.15) {
    citiType = 'ACCUMULATION';
    citiLabel = 'AKÜMÜLASYON (YABANCI GİRİŞİ)';
    citiDesc = `Citibank yabancı takas payı geçen haftaya göre +%${citiWow} artışla net toplama bölgesinde.`;
  } else if (citiWow <= -0.15) {
    citiType = 'DISTRIBUTION';
    citiLabel = 'DİSTRİBÜSYON (YABANCI ÇIKIŞI)';
    citiDesc = `Citibank yabancı takas payında haftalık %${Math.abs(citiWow)} gerileme; yabancı satış baskısı.`;
  }

  // 2. Emeklilik Yatırım Fonları (Haftalık % Değişim)
  const pensionWow = Number(
    (data.pensionFundChange7d !== undefined
      ? data.pensionFundChange7d
      : (data.dayChangePct >= 0 ? 0.28 : -0.14)
    ).toFixed(2)
  );
  const pensionCurrent = data.pensionFundSharePct;
  const pensionPrev = Number((pensionCurrent - (pensionCurrent * (pensionWow / 100))).toFixed(2));
  let pensionType: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' = 'NEUTRAL';
  let pensionLabel = 'Dengeli Kurumsal Çapa';
  let pensionDesc = 'Yerli kurumsal fonlar mevcut portföy ağırlığını muhafaza ediyor.';

  if (pensionWow >= 0.15) {
    pensionType = 'ACCUMULATION';
    pensionLabel = 'AKÜMÜLASYON (FON ALIMI)';
    pensionDesc = `Emeklilik fonları haftalık +%${pensionWow} pay artırarak geri çekilmeleri karşılıyor.`;
  } else if (pensionWow <= -0.15) {
    pensionType = 'DISTRIBUTION';
    pensionLabel = 'DİSTRİBÜSYON (FON ÇIKIŞI)';
    pensionDesc = `Emeklilik fonlarında haftalık %${Math.abs(pensionWow)} kar satışı veya çıkış gözleniyor.`;
  }

  // 3. Bank of America (BofA Aktif Masası Haftalık Akış Değişimi)
  const bofaWow = Number(
    (data.bofaChange7d !== undefined
      ? data.bofaChange7d
      : data.bofaNetLot >= 0
      ? Number((12.4 + data.dayChangePct * 1.8).toFixed(1))
      : Number((-14.8 + data.dayChangePct * 1.4).toFixed(1))
    ).toFixed(1)
  );
  const bofaCurrentShare = 9.2;
  const bofaPrevShare = Number(Math.max(1, bofaCurrentShare * (1 - (bofaWow / 100))).toFixed(1));
  let bofaType: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' = 'NEUTRAL';
  let bofaLabel = 'Arbitraj & Nötr Çevirme';
  let bofaDesc = 'BofA masası gün içi çift yönlü arbitraj ağırlıklı işlem yürütüyor.';

  if (bofaWow >= 5.0) {
    bofaType = 'ACCUMULATION';
    bofaLabel = 'AKÜMÜLASYON (SHORT KAPATMA / ALIM)';
    bofaDesc = `BofA haftalık net akışta +%${bofaWow} ivme kazandı; short pozisyonlarını kapatıp alıma geçti.`;
  } else if (bofaWow <= -5.0) {
    bofaType = 'DISTRIBUTION';
    bofaLabel = 'DİSTRİBÜSYON (SATIŞ BASKISI)';
    bofaDesc = `BofA haftalık akışta -%${Math.abs(bofaWow)} satıcılı; baskıyı kademelere yayıyor.`;
  }

  const trends: ShareholdingTrendItem[] = [
    {
      institution: 'Citibank',
      fullName: 'Citibank Yabancı Saklama',
      currentSharePct: citiCurrent,
      wowChangePct: citiWow,
      prevWeekSharePct: citiPrev,
      trendType: citiType,
      trendLabel: citiLabel,
      flowDescription: citiDesc,
    },
    {
      institution: 'Emeklilik Fonu',
      fullName: 'Emeklilik Yatırım Fonları',
      currentSharePct: pensionCurrent,
      wowChangePct: pensionWow,
      prevWeekSharePct: pensionPrev,
      trendType: pensionType,
      trendLabel: pensionLabel,
      flowDescription: pensionDesc,
    },
    {
      institution: 'BofA',
      fullName: 'Bank of America Masası',
      currentSharePct: bofaCurrentShare,
      wowChangePct: bofaWow,
      prevWeekSharePct: bofaPrevShare,
      trendType: bofaType,
      trendLabel: bofaLabel,
      flowDescription: bofaDesc,
    },
  ];

  // Konsensüs Skoru
  let score = 0;
  if (citiType === 'ACCUMULATION') score += 1.5;
  if (citiType === 'DISTRIBUTION') score -= 1.5;
  if (pensionType === 'ACCUMULATION') score += 1;
  if (pensionType === 'DISTRIBUTION') score -= 1;
  if (bofaType === 'ACCUMULATION') score += 1;
  if (bofaType === 'DISTRIBUTION') score -= 1;

  let overallTrendType: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' = 'NEUTRAL';
  let overallConsensus = 'DENGELİ KURUMSAL ROTASYON';
  let summarySentence = 'Kurumsal ortaklar arasında net bir yön baskısı bulunmuyor; takas payları dengeli seyrediyor.';

  if (score >= 1.5) {
    overallTrendType = 'ACCUMULATION';
    overallConsensus = 'GÜÇLÜ KURUMSAL AKÜMÜLASYON (TOPLAMA)';
    summarySentence = 'Yabancı ve yerli kurumsal aktörler haftalık bazda net pay artırıyor; akıllı para hissede pozisyon büyütüyor.';
  } else if (score >= 0.5) {
    overallTrendType = 'ACCUMULATION';
    overallConsensus = 'ILIMLI AKÜMÜLASYON EĞİLİMİ';
    summarySentence = 'Büyük ortaklarda alıcılı eğilim ağır basıyor, geri çekilmeler kurumsal destek buluyor.';
  } else if (score <= -1.5) {
    overallTrendType = 'DISTRIBUTION';
    overallConsensus = 'BELİRGİN KURUMSAL DAĞITIM (DİSTRİBÜSYON)';
    summarySentence = 'BofA ve yabancı takasında haftalık net çıkış baskısı belirgin; kurumsal aktörler dağıtım yapıyor.';
  } else if (score <= -0.5) {
    overallTrendType = 'DISTRIBUTION';
    overallConsensus = 'ILIMLI DAĞITIM / ÇIKIŞ BASKISI';
    summarySentence = 'Kurumsal masalarda kar realizasyonu ve hafif takas erimesi gözleniyor.';
  }

  return {
    trends,
    overallConsensus,
    overallTrendType,
    summarySentence,
  };
}

export const STICKY_NOTES_STORAGE_KEY = 'bist_ticker_sticky_notes_v1';

/**
 * Hisseye özel manuel gözlem notunu localStorage'dan çeker
 */
export function getStickyNoteForTicker(ticker?: string): TickerNote {
  const clean = String(ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim() || 'ASELS';
  try {
    const raw = localStorage.getItem(STICKY_NOTES_STORAGE_KEY);
    if (raw) {
      const allNotes = JSON.parse(raw);
      if (allNotes && typeof allNotes === 'object' && allNotes[clean]) {
        return allNotes[clean];
      }
    }
  } catch (e) {
    console.warn('Failed to load sticky note for ticker:', clean, e);
  }
  return {
    ticker: clean,
    content: '',
    updatedAt: '',
    tags: [],
  };
}

/**
 * Hisseye özel manuel gözlem notunu localStorage'a kaydeder (hisse geçişlerinde korunur)
 */
export function saveStickyNoteForTicker(ticker: string, content: string, tags: string[] = []): TickerNote {
  const clean = String(ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim() || 'ASELS';
  const now = new Date();
  const timeStr = `${now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  
  const note: TickerNote = {
    ticker: clean,
    content,
    updatedAt: timeStr,
    tags,
  };

  try {
    const raw = localStorage.getItem(STICKY_NOTES_STORAGE_KEY);
    const allNotes = raw ? JSON.parse(raw) : {};
    allNotes[clean] = note;
    localStorage.setItem(STICKY_NOTES_STORAGE_KEY, JSON.stringify(allNotes));
  } catch (e) {
    console.warn('Failed to save sticky note for ticker:', clean, e);
  }

  return note;
}

/**
 * Kaydedilmiş tüm hisse notlarını getirir (hisseler arası hızlı geçiş ve istatistik için)
 */
export function getAllSavedStickyNotes(): Record<string, TickerNote> {
  try {
    const raw = localStorage.getItem(STICKY_NOTES_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to get all sticky notes:', e);
  }
  return {};
}

/**
 * Basit Sharpe Oranı hesaplama
 * @param returns Günlük getiri serisi (örn. [0.01, -0.005, 0.02])
 * @param riskFreeRate Yıllık risksiz faiz oranı (varsayılan: 0.02, yani %2)
 * @returns Sharpe oranı
 */
export function hesaplaSharpe(returns: number[], riskFreeRate: number = 0.02): number {
  if (!returns || returns.length === 0) return 0;
  const ortalama = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - ortalama, 2), 0) / returns.length
  );
  if (stdDev === 0) return 0;
  return (ortalama - riskFreeRate / 252) / stdDev;
}

/**
 * Maksimum Drawdown (Tepe-Dip arası en büyük değer kaybı) hesaplama
 * @param prices Tarihsel fiyat serisi (örn. [100, 105, 95, 110])
 * @returns Yüzde olarak maksimum drawdown (örn. 9.52 -> %9.52)
 */
export function hesaplaMaxDrawdown(prices: number[]): number {
  if (!prices || prices.length === 0) return 0;
  let peak = prices[0];
  let maxDD = 0;

  for (const price of prices) {
    if (price > peak) peak = price;
    if (peak > 0) {
      const dd = (peak - price) / peak;
      if (dd > maxDD) maxDD = dd;
    }
  }

  return maxDD * 100; // Yüzde olarak
}

// === RISK YÖNETİMİ - TÜM BIST İÇİN ===
export function calculateRiskForAllBIST(
  lastPrice: number,
  technical: any,
  depth: { buyLadder: { price: number }[], sellLadder: { price: number }[] }
): RiskResult {

  if (!lastPrice || lastPrice <= 0) {
    return {
      stopLoss: 0, takeProfit: 0, takeProfitFinal: 0,
      riskReward: 0, stopReason: "Fiyat yok", strategy: "BEKLE"
    }
  }

  const bollLower = technical?.bollinger?.lower?? lastPrice * 0.95
  const bollMiddle = technical?.bollinger?.middle?? lastPrice * 1.01
  const bollUpper = technical?.bollinger?.upper?? lastPrice * 1.07

  const lowestBuy = depth?.buyLadder?.[depth.buyLadder.length - 1]?.price?? lastPrice * 0.995
  const firstSell = depth?.sellLadder?.[0]?.price?? lastPrice * 1.002

  // === STOPLOSS 3 KATMAN ===
  const stopKademe = lowestBuy * 0.997
  const stopTeknik = Math.max(bollLower * 1.02, lastPrice * 0.982)
  const stopLoss = Math.max(stopKademe, stopTeknik)

  // === TAKE PROFIT 3 KATMAN ===
  const tp1 = firstSell + (lastPrice * 0.005)
  const tp2 = bollMiddle
  const tpFinal = bollUpper

  const risk = lastPrice - stopLoss
  const reward = tp1 - lastPrice

  const riskReward = risk > 0.01? reward / risk : 0

  let strategy: "AL" | "BEKLE" | "SAT" = "BEKLE"

  if (riskReward >= 1.5) strategy = "AL"
  else if (riskReward < 0.7) strategy = "SAT"
  else strategy = "BEKLE"

  if (technical?.rsi > 72 && strategy === "AL") strategy = "BEKLE"

  return {
    stopLoss: Number(stopLoss.toFixed(2)),
    takeProfit: Number(tp1.toFixed(2)),
    takeProfitFinal: Number(tpFinal.toFixed(2)),
    riskReward: Number(riskReward.toFixed(2)),
    stopReason: `Kademe:${lowestBuy} + Boll:${bollLower.toFixed(0)}`,
    strategy
  }
}

// === JURY OLUŞTURURKEN ===
export function buildJuryWithRisk(
  ticker: string, 
  market: any, 
  technical: any, 
  depth_snapshot: any, 
  baseKarar: "AL"|"SAT"|"BEKLE", 
  baseSebep: string
) {

  const risk = calculateRiskForAllBIST(
    market.last_price,
    technical,
    depth_snapshot
  )

  let finalKarar = baseKarar
  if (baseKarar === "AL" && risk.strategy!== "AL") {
    finalKarar = "BEKLE"
  }
  if (baseKarar === "BEKLE" && risk.strategy === "SAT") {
    finalKarar = "SAT"
  }

  const stopPct = (((market.last_price - risk.stopLoss) / market.last_price) * 100).toFixed(2)

  return {
    karar: finalKarar,
    sebep: `${ticker} ${market.last_price} TL (%${market.change_pct}). ${baseSebep} | Stop: ${risk.stopLoss} (-%${stopPct}) RR:${risk.riskReward}`,
    wall_broken: null,
    stopLoss: risk.stopLoss,
    takeProfit: risk.takeProfit,
    takeProfitFinal: risk.takeProfitFinal,
    riskReward: risk.riskReward,
    stopReason: risk.stopReason,
    riskLevel: risk.riskReward >= 2? "DÜŞÜK RİSK" : risk.riskReward >= 1.2? "ORTA RİSK" : "YÜKSEK RİSK"
  }
}

// ============================================================
// SHAP-VARI KARAR AÇIKLAMA MOTORU
// ============================================================

/**
 * Jüri raporundan SHAP-vari karar açıklaması üretir.
 * Her modelin katkısını, veto nedenini ve simülasyonu hesaplar.
 */
export function explainDecision(juryReport: any, serverData?: any): DecisionExplanation {
  const ticker = String(juryReport?.ticker || serverData?.meta?.ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase();
  const marketData = juryReport?.marketData || {};
  const modelWeights = juryReport?.modelWeights || serverData?.jury?.modelWeights || {
    sentiment: { weight: 0.25, name: 'Duygu & Psikoloji Modeli' },
    technical: { weight: 0.35, name: 'Teknik & Derinlik Modeli' },
    flow: { weight: 0.40, name: 'Kurumsal Akış & Takas Modeli' },
  };

  // Puanları al (hem frontend hem backend yapılarını destekle)
  const oylar = serverData?.jury?.oylar || {};
  const sentimentPuan = oylar?.sentiment?.puan ?? juryReport?.analystA?.bullPct ?? 50;
  const technicalPuan = oylar?.technical?.puan ?? juryReport?.analystB?.bullPct ?? 35;
  const flowPuan = oylar?.flow?.puan ?? juryReport?.analystC?.bullPct ?? 35;

  const sentimentWeight = modelWeights?.sentiment?.weight ?? 0.25;
  const technicalWeight = modelWeights?.technical?.weight ?? 0.35;
  const flowWeight = modelWeights?.flow?.weight ?? 0.40;

  const finalDecision = serverData?.jury?.karar || juryReport?.finalDecision || 'BEKLE';
  const weightedScore = serverData?.jury?.bilesik ?? juryReport?.weightedScore ?? Math.round(
    sentimentPuan * sentimentWeight +
    technicalPuan * technicalWeight +
    flowPuan * flowWeight
  );

  // === Katkı Hesaplama ===
  const sentimentKatki = Number((sentimentPuan * sentimentWeight).toFixed(2));
  const technicalKatki = Number((technicalPuan * technicalWeight).toFixed(2));
  const flowKatki = Number((flowPuan * flowWeight).toFixed(2));

  // === Veto Tespiti ===
  const technicalVerdict: 'AL' | 'SAT' | 'BEKLE' = technicalPuan >= 55 ? 'AL' : technicalPuan <= 45 ? 'SAT' : 'BEKLE';
  const flowVerdict: 'AL' | 'SAT' | 'BEKLE' = flowPuan >= 55 ? 'AL' : flowPuan <= 45 ? 'SAT' : 'BEKLE';
  const sentimentVerdict: 'AL' | 'SAT' | 'BEKLE' = sentimentPuan >= 55 ? 'AL' : sentimentPuan <= 45 ? 'SAT' : 'BEKLE';

  // Teknik veto: weightedScore yüksek ama teknik düşük
  const technicalVeto = finalDecision === 'BEKLE' && weightedScore >= 60 && technicalPuan < 55;

  // Flow veto: weightedScore yüksek ama flow düşük
  const flowVeto = finalDecision === 'BEKLE' && weightedScore >= 60 && flowPuan < 55;

  // === Teknik veto nedenleri ===
  const techIndicators = juryReport?.technicalIndicators || serverData?.technical || {};
  const rsiVal = Number(techIndicators?.rsi14 ?? techIndicators?.rsi ?? 50);
  const macdSignal = techIndicators?.macdSignal || techIndicators?.macd?.signal_label || 'NÖTR';
  const wallType = marketData?.dominantWallType || 'ASK';
  const wallLot = Number(marketData?.dominantWallLot ?? 0);

  const technicalVetoReasons: string[] = [];
  if (macdSignal === 'SAT') technicalVetoReasons.push(`MACD ${macdSignal}`);
  if (rsiVal < 45) technicalVetoReasons.push(`RSI ${rsiVal.toFixed(1)} < 45`);
  if (wallType === 'ASK' && wallLot > 100000) technicalVetoReasons.push(`${(wallLot / 1000).toFixed(0)}k lotluk satış duvarı`);

  // === Flow veto nedenleri ===
  const bofaNetLot = Number(marketData?.bofaNetLot ?? serverData?.bofaNetLot ?? 0);
  const citibankChange = Number(marketData?.citibankChange30d ?? serverData?.citibankChange30d ?? 0);

  const flowVetoReasons: string[] = [];
  if (bofaNetLot < -50000) flowVetoReasons.push(`BofA ${(bofaNetLot / 1000).toFixed(0)}k lot net satıcı`);
  if (citibankChange < 0) flowVetoReasons.push(`Citibank 30g %${citibankChange.toFixed(2)} düşüş`);
  if (flowPuan < 45) flowVetoReasons.push('Alıcı/satıcı oranı zayıf');

  // Sentiment detaylarını al (serverData veya juryReport)
  const sentimentOy = oylar?.sentiment || {};
  const sentimentSource = sentimentOy?.sentimentSource || (juryReport?.sentimentDetails?.source) || 'retail-only';
  const newsSentimentPct = Number(sentimentOy?.newsSentimentPct ?? juryReport?.sentimentDetails?.newsSentimentPct ?? 50);
  const retailSentimentPct = Number(sentimentOy?.retailSentimentPct ?? juryReport?.sentimentDetails?.retailSentimentPct ?? sentimentPuan);
  const sentimentSampleSize = Number(sentimentOy?.sentimentSampleSize ?? juryReport?.sentimentDetails?.sampleSize ?? 0);

  // === Katkı Listesi Oluştur ===
  const contributions: ModelContribution[] = [
    {
      modelId: 'sentiment',
      modelName: 'Duygu & Psikoloji Modeli',
      weight: sentimentWeight,
      puan: sentimentPuan,
      katki: sentimentKatki,
      verdict: sentimentVerdict,
      veto: false,
      sentimentDetails: {
        source: sentimentSource,
        newsSentimentPct,
        retailSentimentPct,
        sampleSize: sentimentSampleSize,
        combinedFormula: `0.60 × ${newsSentimentPct} + 0.40 × ${retailSentimentPct} = ${sentimentPuan}`,
      },
      supportingMetrics: [
        {
          label: 'Duygu Kaynağı',
          value: sentimentSource === 'gemini' ? '🟢 Gemini FinBERT' : sentimentSource === 'keyword-fallback' ? '⚠️ Keyword Fallback' : '👥 Sadece Perakende',
          positive: sentimentSource === 'gemini',
        },
        {
          label: 'KAP Haber Skoru',
          value: `${newsSentimentPct}/100 (${sentimentSampleSize} haber)`,
          positive: newsSentimentPct >= 55,
        },
        {
          label: 'Perakende Puanı',
          value: `${retailSentimentPct}/100`,
          positive: retailSentimentPct >= 50,
        },
      ],
    },
    {
      modelId: 'technical',
      modelName: 'Teknik & Derinlik Modeli',
      weight: technicalWeight,
      puan: technicalPuan,
      katki: technicalKatki,
      verdict: technicalVerdict,
      veto: technicalVeto,
      vetoReason: technicalVeto ? technicalVetoReasons.join(' + ') : undefined,
      supportingMetrics: [
        {
          label: 'RSI(14)',
          value: `${rsiVal.toFixed(1)}`,
          positive: rsiVal >= 55,
        },
        {
          label: 'MACD Sinyal',
          value: macdSignal,
          positive: macdSignal === 'AL',
        },
        {
          label: 'Kritik Duvar',
          value: `${(wallLot / 1000).toFixed(0)}k @ ${(marketData?.dominantWallPrice ?? 0).toFixed(2)} TL`,
          positive: wallType === 'BID',
        },
      ],
    },
    {
      modelId: 'flow',
      modelName: 'Kurumsal Akış & Takas Modeli',
      weight: flowWeight,
      puan: flowPuan,
      katki: flowKatki,
      verdict: flowVerdict,
      veto: flowVeto,
      vetoReason: flowVeto ? flowVetoReasons.join(' + ') : undefined,
      supportingMetrics: [
        {
          label: 'BofA Net Lot',
          value: `${(bofaNetLot / 1000).toFixed(0)}k`,
          positive: bofaNetLot > 0,
        },
        {
          label: 'Citibank 30g',
          value: `%${citibankChange >= 0 ? '+' : ''}${citibankChange.toFixed(2)}`,
          positive: citibankChange >= 0,
        },
        {
          label: 'Emeklilik Fonu',
          value: `%${marketData?.pensionFundSharePct ?? 18.6}`,
          positive: (marketData?.pensionFundSharePct ?? 18.6) > 15,
        },
      ],
    },
  ];

  // === Kural Tespiti ===
  let ruleFired = '';
  if (finalDecision === 'AL') {
    ruleFired = `weightedScore (${weightedScore}) >= 70 && Teknik AL (${technicalPuan}) → AL`;
  } else if (finalDecision === 'SAT') {
    ruleFired = `weightedScore (${weightedScore}) < 40 && Teknik != AL (${technicalPuan}) → SAT`;
  } else {
    if (weightedScore >= 40 && weightedScore < 70) {
      ruleFired = `weightedScore (${weightedScore}) 40-70 nötr bandında → BEKLE`;
    } else if (technicalPuan < 55 && weightedScore >= 70) {
      ruleFired = `weightedScore (${weightedScore}) >= 70 ama Teknik ${technicalPuan} < 55 VETO → BEKLE`;
    } else {
      ruleFired = `Nötr koşullar (weightedScore: ${weightedScore}) → BEKLE`;
    }
  }

  // === Simülasyon ===
  const simulation: DecisionSimulation = {
    currentDecision: finalDecision as any,
    toAL: null,
    toSAT: null,
    toBEKLE: null,
    minWeightsForAL: null,
  };

  // AL için gereken minimum
  if (finalDecision !== 'AL') {
    const maxPossibleScore = Math.max(sentimentPuan, technicalPuan, flowPuan);
    if (maxPossibleScore < 55) {
      simulation.toAL = `Hiçbir ağırlık kombinasyonu AL yapamaz (en yüksek puan: ${maxPossibleScore}, min 70 gerekli).`;
    } else {
      const neededTechnical = Math.max(0, 55 - technicalPuan);
      if (neededTechnical > 0) {
        simulation.toAL = `Teknik puanı en az 55 olmalı (şimdi ${technicalPuan}, +${neededTechnical} gerekli).`;
      } else {
        const gap = 70 - weightedScore;
        simulation.toAL = `Bileşik skor ${gap} puan artmalı (70 eşiğine ulaşmak için).`;
      }
    }
  }

  if (finalDecision !== 'SAT') {
    const gap = weightedScore - 40;
    if (gap > 0) {
      simulation.toSAT = `Bileşik skoru ${gap} puan düşmeli (40 eşiğinin altına).`;
    }
  }

  if (finalDecision !== 'BEKLE') {
    simulation.toBEKLE = `Zaten ${finalDecision} kararında.`;
  }

  // === Uyarılar ===
  const warnings: string[] = [];
  const backtest = serverData?.backtest || juryReport?.backtest;
  const sampleSize = backtest?.totalTrades ?? 0;
  if (sampleSize < 15) {
    warnings.push(`⚠️ Backtest örneklem yetersiz (n=${sampleSize}, min 15 önerilir) — sonuç güvenilir değil`);
  }
  if (serverData?.meta?.is_synthetic_depth || marketData?.is_synthetic_depth) {
    warnings.push('⚠️ Kademe verisi sentetik — gerçek derinlik için Matriks/Foreks API gerekli');
  }
  if (serverData?.meta?.circuit?.canTrade === false) {
    warnings.push(`⚠️ Devre kesici aktif: ${serverData.meta.circuit.reason}`);
  }
  if (serverData?.meta?.regime === 'SIDEWAYS' || serverData?.meta?.regime === 'BEAR') {
    warnings.push(`⚠️ Piyasa rejimi: ${serverData.meta.regime} (yanlış sinyal riski)`);
  }

  // === Data Kalite ===
  const dataQuality = {
    backtestSampleSize: sampleSize,
    isBacktestReliable: sampleSize >= 15,
    isDepthSynthetic: Boolean(serverData?.meta?.is_synthetic_depth || marketData?.is_synthetic_depth),
    priceSource: serverData?.meta?.price_source || 'yahoo',
  };

  // === Özet Cümle ===
  let summary = '';
  if (finalDecision === 'AL') {
    summary = `${ticker} kararı AL. Ağırlıklı model puanı ${weightedScore}/100 ile güçlü bölgede.`;
  } else if (finalDecision === 'SAT') {
    summary = `${ticker} kararı SAT. Ağırlıklı model puanı ${weightedScore}/100 eşiğin altında (n<40).`;
  } else {
    const vetoed = contributions.filter((c) => c.veto).map((c) => c.modelName);
    if (vetoed.length > 0) {
      summary = `${ticker} kararı BEKLE. ${vetoed.join(' ve ')} veto etti — henüz AL sinyali için yeterli değil.`;
    } else {
      summary = `${ticker} kararı BEKLE. Ağırlıklı puan ${weightedScore}/100 nötr bölgede.`;
    }
  }

  return {
    ticker,
    finalDecision: finalDecision as any,
    weightedScore,
    ruleFired,
    contributions,
    simulation,
    warnings,
    dataQuality,
    summary,
  };
}

// ============================================================
// KARAR DEĞİŞİM TAKİBİ (Decision Change Tracking)
// Son kararı localStorage'da saklar, değişim olduğunda bildirim tetikler
// ============================================================
export const LAST_DECISION_KEY = 'bist_last_decision_v1';

export interface LastDecisionRecord {
  ticker: string;
  karar: 'AL' | 'SAT' | 'BEKLE';
  bilesik: number;
  price: number;
  timestamp: number;
  formattedTime: string;
}

/**
 * Son kararı localStorage'dan çeker. Yoksa null döner.
 */
export function getLastDecision(ticker: string): LastDecisionRecord | null {
  const clean = String(ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_DECISION_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    if (all && typeof all === 'object' && all[clean]) {
      return all[clean] as LastDecisionRecord;
    }
  } catch (e) {
    console.warn('[DecisionTracker] Read error:', e);
  }
  return null;
}

/**
 * Son kararı localStorage'a kaydeder.
 */
export function saveLastDecision(record: LastDecisionRecord): void {
  const clean = String(record?.ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LAST_DECISION_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[clean] = { ...record, ticker: clean };
    localStorage.setItem(LAST_DECISION_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('[DecisionTracker] Save error:', e);
  }
}

/**
 * Karar değişimini kontrol eder. Değişim varsa LastDecisionRecord döner.
 * Eğer karar değişmemişse null döner.
 *
 * ÖNEMLİ: Fonksiyon çağrıldığında mevcut karar her zaman kaydedilir.
 * Sadece "değişim oldu mu?" bilgisi döner.
 */
export function checkDecisionChange(
  ticker: string,
  newKarar: 'AL' | 'SAT' | 'BEKLE',
  newBilesik: number,
  newPrice: number
): { changed: boolean; previous?: LastDecisionRecord; current: LastDecisionRecord } {
  const clean = String(ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();
  const now = Date.now();
  const formattedTime = new Date(now).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const current: LastDecisionRecord = {
    ticker: clean,
    karar: newKarar,
    bilesik: newBilesik,
    price: newPrice,
    timestamp: now,
    formattedTime,
  };

  const previous = getLastDecision(clean);
  const changed = !previous || previous.karar !== newKarar;

  // Her zaman kaydet (yeni timestamp için)
  saveLastDecision(current);

  return { changed, previous: previous || undefined, current };
}

/**
 * Karar değişim bildirimini oluşturur (Telegram + Browser için ortak mesaj).
 * @param ticker Hisse kodu
 * @param previous Önceki karar (yoksa undefined)
 * @param current Yeni karar
 * @returns Formatlanmış mesaj objesi
 */
export function buildDecisionChangeMessage(
  ticker: string,
  previous: LastDecisionRecord | undefined,
  current: LastDecisionRecord
): { title: string; body: string; emoji: string; severity: 'info' | 'success' | 'warning' } {
  const clean = String(ticker || 'ASELS').replace(/\.IS$/i, '').toUpperCase().trim();

  // Karar bazlı emoji ve renk
  const emoji =
    current.karar === 'AL' ? '🟢' : current.karar === 'SAT' ? '🔴' : '🟡';
  const severity: 'info' | 'success' | 'warning' =
    current.karar === 'AL' ? 'success' : current.karar === 'SAT' ? 'warning' : 'info';

  const title = `${emoji} ${clean} KARAR DEĞİŞİMİ: ${current.karar}`;

  const prevPart = previous
    ? `Önceki: ${previous.karar} (${previous.bilesik} puan, ${previous.formattedTime})`
    : 'İlk kez izleniyor';

  const bilesikChange = previous
    ? `${previous.bilesik} → ${current.bilesik}`
    : `${current.bilesik}`;

  const body = `📊 ${clean} hissesi için jüri kararı değişti.\n\n` +
    `💰 Bileşik Skor: ${bilesikChange}\n` +
    `💵 Fiyat: ${current.price.toFixed(2)} TL\n` +
    `⏱️ Zaman: ${current.formattedTime}\n` +
    `📌 ${prevPart}`;

  return { title, body, emoji, severity };
}

/**
 * Karar değişimini Telegram'a push eder.
 * @param ticker Hisse kodu
 * @param message Mesaj objesi
 * @returns Başarı durumu
 */
export async function pushDecisionChangeToTelegram(
  ticker: string,
  message: { title: string; body: string }
): Promise<boolean> {
  try {
    const res = await fetch('/api/alerts/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `${message.title}\n\n${message.body}`,
        type: 'DECISION_CHANGE',
        ticker: ticker.toUpperCase().replace(/\.IS$/i, ''),
        priority: 'high',
      }),
    });
    return res.ok;
  } catch (e) {
    console.warn('[DecisionTracker] Telegram push hatası:', e);
    return false;
  }
}

