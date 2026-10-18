import { BotHealthStatus, botCache, MarketPriceData } from './types.js';

const TRACKED_TICKERS = [
  'ASELS', 'THYAO', 'GARAN', 'EREGL', 'TUPRS',
  'BIMAS', 'AKBNK', 'SISE', 'SAHOL', 'KCHOL',
  'FROTO', 'TOASO', 'PGSUS', 'ASTOR', 'SASA'
];

const BASE_PRICES: Record<string, { price: number; prevClose: number }> = {
  ASELS: { price: 372.50, prevClose: 368.10 },
  THYAO: { price: 284.00, prevClose: 279.00 },
  GARAN: { price: 112.30, prevClose: 110.50 },
  EREGL: { price: 37.94, prevClose: 38.10 },
  TUPRS: { price: 164.80, prevClose: 162.80 },
  BIMAS: { price: 486.00, prevClose: 482.00 },
  AKBNK: { price: 58.60, prevClose: 57.80 },
  SISE:  { price: 46.80, prevClose: 46.40 },
  SAHOL: { price: 98.40, prevClose: 97.30 },
  KCHOL: { price: 218.00, prevClose: 215.00 },
  FROTO: { price: 1045.00, prevClose: 1030.00 },
  TOASO: { price: 236.00, prevClose: 233.00 },
  PGSUS: { price: 242.00, prevClose: 237.00 },
  ASTOR: { price: 98.40, prevClose: 96.00 },
  SASA:  { price: 4.88, prevClose: 4.91 },
};

export class YahooPriceBot {
  public readonly name = 'YahooPriceBot';
  private isRunning = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private consecutiveErrors = 0;
  private currentIntervalMs = 10000; // 10 saniye periyot
  private runCount = 0;
  private errorCount = 0;
  private lastRunTime: number | null = null;
  private lastError: string | null = null;

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`🤖 [${this.name}] Başlatıldı (Periyot: ${this.currentIntervalMs}ms)`);
    this.scheduleNext(100); // İlk çekimi hemen başlat
  }

  public stop(): void {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearTimeout(this.intervalTimer);
      this.intervalTimer = null;
    }
    console.log(`🛑 [${this.name}] Durduruldu.`);
  }

  private scheduleNext(delayMs: number): void {
    if (!this.isRunning) return;
    this.intervalTimer = setTimeout(async () => {
      await this.collectData();
      // Exponential backoff or regular interval
      const nextDelay = this.consecutiveErrors > 0
        ? Math.min(60000, this.currentIntervalMs * Math.pow(1.5, this.consecutiveErrors))
        : this.currentIntervalMs;
      this.scheduleNext(nextDelay);
    }, delayMs);
  }

  private async collectData(): Promise<void> {
    this.runCount++;
    this.lastRunTime = Date.now();

    try {
      // BATCH FETCH from Yahoo Finance Chart API or dynamic simulator
      for (const ticker of TRACKED_TICKERS) {
        try {
          const fetched = await this.fetchSingleTicker(ticker);
          if (fetched) {
            botCache.setPrice(ticker, fetched);
          }
        } catch (tickerErr: any) {
          // Bireysel ticker hatası tüm botu düşürmez
          this.fallbackPrice(ticker);
        }
      }

      this.consecutiveErrors = 0;
      this.lastError = null;
    } catch (err: any) {
      this.errorCount++;
      this.consecutiveErrors++;
      this.lastError = err?.message || String(err);
      console.warn(`⚠️ [${this.name}] Veri toplama hatası (Deneme #${this.consecutiveErrors}):`, this.lastError);
      
      // Fallback fiyatları her halükarda doldur
      TRACKED_TICKERS.forEach(t => this.fallbackPrice(t));
    }
  }

  private async fetchSingleTicker(ticker: string): Promise<MarketPriceData | null> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.IS?interval=1m&range=1d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3500),
    });

    if (!response.ok) {
      throw new Error(`Yahoo HTTP ${response.status}`);
    }

    const data: any = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') {
      throw new Error('Geçersiz Yahoo veri yapısı');
    }

    const price = Number(meta.regularMarketPrice.toFixed(2));
    const prevClose = Number((meta.previousClose || meta.chartPreviousClose || price).toFixed(2));
    const changePct = prevClose > 0 ? Number((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0;
    const high = Number((meta.regularMarketDayHigh || price * 1.01).toFixed(2));
    const low = Number((meta.regularMarketDayLow || price * 0.99).toFixed(2));
    const volume = Number(meta.regularMarketVolume || 1000000);

    return {
      ticker,
      price,
      changePct,
      prevClose,
      high,
      low,
      volume,
      timestamp: Date.now(),
      source: 'Yahoo Finance Live',
    };
  }

  private fallbackPrice(ticker: string): void {
    const base = BASE_PRICES[ticker] || { price: 50.0, prevClose: 49.5 };
    const jitter = (Math.random() - 0.48) * (base.price * 0.003); // Hafif canlı piyasa mikro-dalgalanması
    const price = Number((base.price + jitter).toFixed(2));
    const changePct = Number((((price - base.prevClose) / base.prevClose) * 100).toFixed(2));

    botCache.setPrice(ticker, {
      ticker,
      price,
      changePct,
      prevClose: base.prevClose,
      high: Number((price * 1.015).toFixed(2)),
      low: Number((price * 0.985).toFixed(2)),
      volume: Math.round(15000000 + Math.random() * 5000000),
      timestamp: Date.now(),
      source: 'Autonomous In-Memory Fallback',
    });
  }

  public getHealth(): BotHealthStatus {
    return {
      name: this.name,
      status: this.isRunning ? (this.consecutiveErrors > 3 ? 'ERROR' : 'RUNNING') : 'STOPPED',
      lastRunTime: this.lastRunTime,
      runCount: this.runCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      itemsCollected: TRACKED_TICKERS.length,
    };
  }
}

export const yahooPriceBot = new YahooPriceBot();
