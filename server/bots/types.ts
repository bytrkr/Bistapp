import { EventEmitter } from 'events';

export interface MarketPriceData {
  ticker: string;
  price: number;
  changePct: number;
  prevClose: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
  source: string;
}

export interface GoogleFinanceData {
  ticker: string; // ör: ASELS
  googleSymbol: string; // ör: IST:ASELS
  price: number;
  changePct: number;
  prevClose: number;
  peRatio?: number; // F/K Oranı
  pbRatio?: number; // PD/DD Oranı
  yearHigh?: number; // 52 Haftalık En Yüksek
  yearLow?: number; // 52 Haftalık En Düşük
  currency: string;
  timestamp: number;
  source: string;
}

export interface ScannerSignalData {
  ticker: string;
  rsi14: number;
  macdSignal: 'AL' | 'SAT' | 'NOTR';
  recommendation: 'GUCLU_AL' | 'AL' | 'NOTR' | 'SAT' | 'GUCLU_SAT';
  score: number;
  trend: 'YUKSELIS' | 'DUSUS' | 'YATAY';
  timestamp: number;
}

export interface ParsedAkdBroker {
  broker: string;
  netLot: number;
  sharePct: number;
  avgCost?: number;
}

export interface ParsedAkdData {
  ticker: string;
  buyers: ParsedAkdBroker[];
  sellers: ParsedAkdBroker[];
  totalNetLot: number;
  bofaNetLot: number;
  topBuyerRatio: number;
  confidence: number;
}

export interface SocialSentimentData {
  ticker: string;
  sentimentScore: number; // -1.0 (Aşırı Ayı) ile +1.0 (Aşırı Boğa)
  sentimentLabel: 'BOĞA' | 'AYI' | 'NÖTR';
  tweetVolume: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  trendingTopics: string[];
  parsedAkdData?: ParsedAkdData;
  timestamp: number;
  summary: string;
}

export interface BotHealthStatus {
  name: string;
  status: 'RUNNING' | 'STOPPED' | 'ERROR';
  lastRunTime: number | null;
  runCount: number;
  errorCount: number;
  lastError: string | null;
  itemsCollected: number;
}

class BotEventBus extends EventEmitter {}
export const botEventBus = new BotEventBus();

class BotCacheStore {
  private prices = new Map<string, MarketPriceData>();
  private googlePrices = new Map<string, GoogleFinanceData>();
  private scannerSignals = new Map<string, ScannerSignalData>();
  private socialSentiment = new Map<string, SocialSentimentData>();
  private kapDisclosures: any[] = [];
  private lastPriceUpdate = 0;
  private lastGoogleUpdate = 0;
  private lastScannerUpdate = 0;
  private lastSentimentUpdate = 0;
  private lastKapUpdate = 0;

  // Primary Yahoo Prices
  setPrice(ticker: string, data: MarketPriceData) {
    this.prices.set(ticker.toUpperCase(), data);
    this.lastPriceUpdate = Date.now();
    botEventBus.emit('price:updated', data);
  }

  getPrice(ticker: string): MarketPriceData | undefined {
    return this.prices.get(ticker.toUpperCase());
  }

  getAllPrices(): MarketPriceData[] {
    return Array.from(this.prices.values());
  }

  // Google Finance Backup & Cross-Verification Prices
  setGooglePrice(ticker: string, data: GoogleFinanceData) {
    this.googlePrices.set(ticker.toUpperCase(), data);
    this.lastGoogleUpdate = Date.now();
    botEventBus.emit('googlePrice:updated', data);
  }

  getGooglePrice(ticker: string): GoogleFinanceData | undefined {
    return this.googlePrices.get(ticker.toUpperCase());
  }

  getAllGooglePrices(): GoogleFinanceData[] {
    return Array.from(this.googlePrices.values());
  }

  // Scanner Signals
  setSignal(ticker: string, signal: ScannerSignalData) {
    this.scannerSignals.set(ticker.toUpperCase(), signal);
    this.lastScannerUpdate = Date.now();
    botEventBus.emit('signal:updated', signal);
  }

  getSignal(ticker: string): ScannerSignalData | undefined {
    return this.scannerSignals.get(ticker.toUpperCase());
  }

  getAllSignals(): ScannerSignalData[] {
    return Array.from(this.scannerSignals.values());
  }

  // Social Sentiment & AKD OCR
  setSentiment(ticker: string, sentiment: SocialSentimentData) {
    this.socialSentiment.set(ticker.toUpperCase(), sentiment);
    this.lastSentimentUpdate = Date.now();
    botEventBus.emit('sentiment:updated', sentiment);
  }

  getSentiment(ticker: string): SocialSentimentData | undefined {
    return this.socialSentiment.get(ticker.toUpperCase());
  }

  getAllSentiments(): SocialSentimentData[] {
    return Array.from(this.socialSentiment.values());
  }

  // KAP Disclosures
  setKapDisclosures(disclosures: any[]) {
    this.kapDisclosures = disclosures;
    this.lastKapUpdate = Date.now();
    botEventBus.emit('kap:updated', disclosures);
  }

  getKapDisclosures(ticker?: string): any[] {
    if (!ticker || ticker.toUpperCase() === 'ALL' || ticker.toUpperCase() === 'BIST30') {
      return this.kapDisclosures;
    }
    const clean = ticker.toUpperCase().replace(/\.IS$/i, '').trim();
    return this.kapDisclosures.filter((d: any) => d.ticker === clean);
  }

  getStats() {
    return {
      pricesCount: this.prices.size,
      googlePricesCount: this.googlePrices.size,
      signalsCount: this.scannerSignals.size,
      sentimentsCount: this.socialSentiment.size,
      kapCount: this.kapDisclosures.length,
      lastPriceUpdate: this.lastPriceUpdate,
      lastGoogleUpdate: this.lastGoogleUpdate,
      lastScannerUpdate: this.lastScannerUpdate,
      lastSentimentUpdate: this.lastSentimentUpdate,
      lastKapUpdate: this.lastKapUpdate,
    };
  }
}

export const botCache = new BotCacheStore();
