import { ALL_BIST_STOCKS, bistAllStocks, BISTStock, searchBISTStocks } from '../data/bistAllStocks';
export type { BISTStock };

/**
 * Ticker Management & Listing Service
 * Handles listing, searching, and symbol conversion for BIST equities.
 */
export class Ticker {
  /**
   * Tüm BIST hisselerini listeler (~500 hisse).
   * Öncelikli olarak /api/bist-tam-liste endpoint'inden canlı verilerle birleştirir,
   * çevrimdışı / rate-limit durumunda eksiksiz BIST veri kataloğunu döner.
   */
  static async all(): Promise<BISTStock[]> {
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/bist-tam-liste');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.result) && data.result.length > 0) {
            const liveMap = new Map<string, any>();
            data.result.forEach((item: any) => {
              const code = String(item.name || item.text || item.code || '').toUpperCase().trim();
              if (code) liveMap.set(code, item);
            });

            return ALL_BIST_STOCKS.map((stock) => {
              const live = liveMap.get(stock.code);
              return {
                ...stock,
                price: live?.price ?? live?.lastprice ?? stock.price,
                rate: live?.rate != null ? Number(live.rate) : stock.rate
              };
            });
          }
        }
      }
    } catch (e) {
      console.warn('[Ticker.all] API isteği başarısız oldu, yerel BIST veritabanı kullanılıyor:', e);
    }

    return ALL_BIST_STOCKS;
  }

  /**
   * Sembole veya koda göre hisse bilgisi döndürür (Takma adları ve yaygın isimleri otomatik çözer)
   */
  static get(symbol: string): BISTStock | undefined {
    const rawClean = cleanTicker(symbol);
    const resolvedCode = COMMON_BIST_ALIASES[rawClean] || rawClean;
    return ALL_BIST_STOCKS.find((s) => s.code === resolvedCode || s.code === rawClean);
  }

  /**
   * Kod, sembol, şirket adı, sektör veya pazara göre tüm BIST hisselerini filtreler
   */
  static search(query: string): BISTStock[] {
    const raw = (query || '').trim();
    if (!raw) return ALL_BIST_STOCKS;
    const q = raw.toLowerCase();
    const aliasCode = COMMON_BIST_ALIASES[raw.toUpperCase()];
    
    return ALL_BIST_STOCKS.filter((s) =>
      s.code.toLowerCase().includes(q) ||
      (s.symbol && s.symbol.toLowerCase().includes(q)) ||
      s.name.toLowerCase().includes(q) ||
      (s.sector && s.sector.toLowerCase().includes(q)) ||
      (s.market && s.market.toLowerCase().includes(q)) ||
      (aliasCode && s.code === aliasCode)
    );
  }
}

export const COMMON_BIST_ALIASES: Record<string, string> = {
  'OTOKAR': 'OTKAR',
  'THY': 'THYAO',
  'TURKHAVAYOLLARI': 'THYAO',
  'GARANTI': 'GARAN',
  'GARANTIBBK': 'GARAN',
  'ISBANK': 'ISCTR',
  'ISBANKASI': 'ISCTR',
  'AKBANK': 'AKBNK',
  'TUPRAS': 'TUPRS',
  'ASELSAN': 'ASELS',
  'KOC': 'KCHOL',
  'KOCHOLDING': 'KCHOL',
  'SABANCI': 'SAHOL',
  'SABANCIHOLDING': 'SAHOL',
  'BIM': 'BIMAS',
  'BIMMAGAZALAR': 'BIMAS',
  'SISECAM': 'SISE',
  'SISICAM': 'SISE',
  'EREGLI': 'EREGL',
  'PETKIM': 'PETKM',
  'FORD': 'FROTO',
  'FORDO TOSAN': 'FROTO',
  'TOFAS': 'TOASO',
  'ARCLK': 'ARCLK',
  'ARCELIK': 'ARCLK',
};

export function toYahooSymbol(input?: string): string {
  const t = String(input || "ASELS").toUpperCase().trim();
  
  // BIST hissesi kontrolü
  if (t.endsWith(".IS")) {
    return t;
  }

  // Ticker listesinde veya genel BIST kapsamında ise
  const clean = t.replace(/\.IS$/i, "");
  const isBist = ALL_BIST_STOCKS.some((s) => s.code === clean) ||
    ["ASELS", "THYAO", "GARAN", "EREGL", "TUPRS", "AKBNK", "BIMAS", "SISE", "SAHOL", "KCHOL"].includes(clean);

  if (isBist) {
    return `${clean}.IS`;
  }
  
  // US / Küresel
  if (["AAPL", "NVDA", "SPY", "QQQ", "TSLA"].includes(t)) {
    return t;
  }
  
  // Asya / Diğer
  if (t.endsWith(".T") || t.endsWith(".HK") || t.endsWith(".SS")) {
    return t;
  }
  
  return t;
}

export function cleanTicker(input?: string): string {
  return String(input || "ASELS").replace(/\.IS$/i, "").toUpperCase().trim();
}

export default Ticker;
