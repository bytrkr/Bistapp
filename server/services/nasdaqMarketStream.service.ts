// server/services/nasdaqMarketStream.service.ts

export interface NasdaqLevel {
  price: number;
  qty: number;
  total: number;
  mmid: string; // Market Maker ID (e.g. CDEL, VIRT, NITE, JUMP)
}

export interface NasdaqOrderBook {
  symbol: string;
  name: string;
  timestamp: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  high: number;
  low: number;
  openPrice: number;
  volume: number;
  avgVolume: number;
  pe: number;
  marketCapStr: string;
  beta: number;
  bestBid: number;
  bestAsk: number;
  spread: number;
  microPrice: number;
  bids: NasdaqLevel[];
  asks: NasdaqLevel[];
  bidTotalVolume: number;
  askTotalVolume: number;
  obi: number; // Range: -1.0 to +1.0
  obiPct: number;
  zScore: number;
  anomalyStatus: 'NORMAL' | 'DIKKAT' | 'ANORMAL_HACIM_PATLAMASI';
  signal: 'GUCLU_AL' | 'AL' | 'NOTR' | 'SAT' | 'GUCLU_SAT';
  quantComment: string;
}

export interface NasdaqTickerSummary {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  obi: number;
  zScore: number;
  signal: string;
}

const NASDAQ_SYMBOLS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'QQQ', 'SPY'];
const NASDAQ_NAMES: Record<string, string> = {
  NVDA: 'NVIDIA Corporation',
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corporation',
  TSLA: 'Tesla, Inc.',
  AMZN: 'Amazon.com, Inc.',
  GOOGL: 'Alphabet Inc. (Google)',
  META: 'Meta Platforms, Inc.',
  QQQ: 'Invesco QQQ Trust (Nasdaq 100)',
  SPY: 'SPDR S&P 500 ETF Trust'
};

const MMIDS = ['CDEL', 'VIRT', 'NITE', 'JUMP', 'GTSX', 'SUSQ', 'WTSN', 'TSSX'];

class NasdaqMarketStreamService {
  private orderBooks: Map<string, NasdaqOrderBook> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.seedDefaultData();
    this.startLivePolling();
  }

  private seedDefaultData() {
    const defaults: Record<string, { price: number; change: number; pe: number; cap: string }> = {
      NVDA: { price: 138.25, change: 3.40, pe: 54.2, cap: '3.42T' },
      AAPL: { price: 232.80, change: 0.95, pe: 34.8, cap: '3.55T' },
      MSFT: { price: 428.50, change: 1.45, pe: 36.1, cap: '3.18T' },
      TSLA: { price: 248.90, change: -2.10, pe: 72.4, cap: '792B' },
      AMZN: { price: 194.20, change: 1.80, pe: 42.6, cap: '2.03T' },
      GOOGL: { price: 182.40, change: 0.70, pe: 24.8, cap: '2.25T' },
      META: { price: 592.10, change: 2.15, pe: 28.4, cap: '1.50T' },
      QQQ: { price: 504.60, change: 1.65, pe: 31.0, cap: '280B' },
      SPY: { price: 588.40, change: 1.10, pe: 26.5, cap: '590B' }
    };

    for (const [sym, def] of Object.entries(defaults)) {
      this.generateOrderBook(sym, def.price, def.change, def.pe, def.cap);
    }
  }

  private generateOrderBook(
    symbol: string,
    midPrice: number,
    changePct: number,
    pe = 32.5,
    cap = '1.5T',
    rawVolume = 45000000
  ) {
    const spreadStep = Math.max(0.01, Number((midPrice * 0.0002).toFixed(2)));
    const bestBid = Number((midPrice - spreadStep / 2).toFixed(2));
    const bestAsk = Number((midPrice + spreadStep / 2).toFixed(2));

    const bids: NasdaqLevel[] = [];
    let bidVolTotal = 0;
    for (let i = 0; i < 10; i++) {
      const price = Number((bestBid - i * spreadStep).toFixed(2));
      const qty = Math.round(500 + Math.random() * 2500 + (10 - i) * 200);
      bidVolTotal += qty;
      bids.push({
        price,
        qty,
        total: bidVolTotal,
        mmid: MMIDS[i % MMIDS.length]
      });
    }

    const asks: NasdaqLevel[] = [];
    let askVolTotal = 0;
    for (let i = 0; i < 10; i++) {
      const price = Number((bestAsk + i * spreadStep).toFixed(2));
      const qty = Math.round(450 + Math.random() * 2400 + (10 - i) * 180);
      askVolTotal += qty;
      asks.push({
        price,
        qty,
        total: askVolTotal,
        mmid: MMIDS[(i + 2) % MMIDS.length]
      });
    }

    const totalLiquidity = bidVolTotal + askVolTotal;
    const rawObi = totalLiquidity > 0 ? (bidVolTotal - askVolTotal) / totalLiquidity : 0;
    const obi = Number(Math.max(-1, Math.min(1, rawObi)).toFixed(3));
    const obiPct = Number(((obi + 1) * 50).toFixed(1));

    const microPrice = totalLiquidity > 0
      ? Number(((bestBid * askVolTotal + bestAsk * bidVolTotal) / totalLiquidity).toFixed(2))
      : midPrice;

    const zScore = Number((0.85 + (changePct > 0 ? changePct * 0.45 : changePct * 0.3)).toFixed(2));
    const anomalyStatus = Math.abs(zScore) >= 2.5 ? 'ANORMAL_HACIM_PATLAMASI' : Math.abs(zScore) >= 1.5 ? 'DIKKAT' : 'NORMAL';

    let signal: 'GUCLU_AL' | 'AL' | 'NOTR' | 'SAT' | 'GUCLU_SAT' = 'NOTR';
    let quantComment = 'NASDAQ piyasa yapıcı emirleri dengeli seyrediyor.';

    if (obi > 0.25 && changePct > 0) {
      signal = 'GUCLU_AL';
      quantComment = `Market Maker (CDEL/VIRT) alım tarafında yoğunlaşmış, L2 OBI +%${(obi * 100).toFixed(0)} güçlü likidite desteği sağlıyor.`;
    } else if (obi > 0.10) {
      signal = 'AL';
      quantComment = 'Alıcı kademeleri satışlara oranla daha kalın, yukarı yönlü mikrofiyat baskısı var.';
    } else if (obi < -0.25) {
      signal = 'SAT';
      quantComment = 'Direnç kademelerinde kurumsal blok satış emirleri bekliyor.';
    }

    const book: NasdaqOrderBook = {
      symbol,
      name: NASDAQ_NAMES[symbol] || symbol,
      timestamp: new Date().toISOString(),
      lastPrice: midPrice,
      priceChange: Number((midPrice * (changePct / 100)).toFixed(2)),
      priceChangePercent: changePct,
      high: Number((midPrice * 1.025).toFixed(2)),
      low: Number((midPrice * 0.982).toFixed(2)),
      openPrice: Number((midPrice * (1 - changePct / 100)).toFixed(2)),
      volume: rawVolume,
      avgVolume: 52000000,
      pe,
      marketCapStr: cap,
      beta: 1.25,
      bestBid,
      bestAsk,
      spread: Number((bestAsk - bestBid).toFixed(2)),
      microPrice,
      bids,
      asks,
      bidTotalVolume: bidVolTotal,
      askTotalVolume: askVolTotal,
      obi,
      obiPct,
      zScore,
      anomalyStatus,
      signal,
      quantComment
    };

    this.orderBooks.set(symbol, book);
  }

  private startLivePolling() {
    const fetchSymbol = async (sym: string) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(3500)
        });

        if (res.ok) {
          const json = await res.json();
          const meta = json?.chart?.result?.[0]?.meta;
          if (meta && meta.regularMarketPrice) {
            const price = Number(meta.regularMarketPrice.toFixed(2));
            const prevClose = meta.chartPreviousClose || price;
            const changePct = Number((((price - prevClose) / prevClose) * 100).toFixed(2));
            const vol = meta.regularMarketVolume || 35000000;
            this.generateOrderBook(sym, price, changePct, 32.0, '1.8T', vol);
          }
        }
      } catch {}
    };

    const pollAll = async () => {
      for (const sym of NASDAQ_SYMBOLS) {
        await fetchSymbol(sym);
      }
    };

    pollAll();
    this.pollInterval = setInterval(pollAll, 10000);
  }

  public getOrderBook(sym: string): NasdaqOrderBook | null {
    const clean = sym.toUpperCase().trim();
    return this.orderBooks.get(clean) || this.orderBooks.get('NVDA') || null;
  }

  public getTickers(): NasdaqTickerSummary[] {
    const list: NasdaqTickerSummary[] = [];
    for (const sym of NASDAQ_SYMBOLS) {
      const book = this.orderBooks.get(sym);
      if (book) {
        list.push({
          symbol: book.symbol,
          name: book.name,
          price: book.lastPrice,
          changePercent: book.priceChangePercent,
          high: book.high,
          low: book.low,
          volume: book.volume,
          obi: book.obi,
          zScore: book.zScore,
          signal: book.signal
        });
      }
    }
    return list;
  }
}

export const nasdaqMarketStreamService = new NasdaqMarketStreamService();
