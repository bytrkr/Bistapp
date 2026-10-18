/**
 * Kamuyu Aydınlatma Platformu (KAP) & Canlı Borsa RSS Veri Çekme Servisi
 * - Birincil Kanal: Google News Finans/KAP Canlı RSS Akışı (XML) + KAP Resmi API
 * - Tüm haber ve bildirimler yayın zamanına göre EN YENİDEN ESKİYE (newest-first) sıralanır.
 */

export interface NormalizedKapDisclosure {
  id: string;
  ticker: string;
  title: string;
  publishDate: string;
  disclosureType: string;
  url: string;
  summary?: string;
  companyName?: string;
  source?: string;
}

interface CacheStore {
  data: NormalizedKapDisclosure[];
  lastFetchedAt: number;
}

const CACHE_TTL_MS = 30 * 1000;
let memoryCache: CacheStore = {
  data: [],
  lastFetchedAt: 0,
};

const tickerCache = new Map<string, CacheStore>();

const KNOWN_TICKERS = [
  'ASELS', 'THYAO', 'EREGL', 'GARAN', 'BIMAS', 'TUPRS', 'KCHOL', 'ISCTR',
  'AKBNK', 'SAHOL', 'SISE', 'YKBNK', 'SASA', 'HEKTS', 'PETKM', 'PGSUS',
  'TOASO', 'FROTO', 'ASTOR', 'ENKAI', 'TCELL', 'TTKOM', 'KOZAL', 'EKGYO',
];

const COMPANY_KEYWORD_MAP: Record<string, string> = {
  aselsan: 'ASELS',
  'türk hava yolları': 'THYAO',
  thyao: 'THYAO',
  erdemir: 'EREGL',
  ereğli: 'EREGL',
  garanti: 'GARAN',
  'bim ': 'BIMAS',
  bimas: 'BIMAS',
  tüpraş: 'TUPRS',
  tuprs: 'TUPRS',
  'koç holding': 'KCHOL',
  'iş bankası': 'ISCTR',
  akbank: 'AKBNK',
  sabancı: 'SAHOL',
  şişecam: 'SISE',
  'yapı kredi': 'YKBNK',
  sasa: 'SASA',
  hektaş: 'HEKTS',
  petkim: 'PETKM',
  pegasus: 'PGSUS',
  tofaş: 'TOASO',
  'ford otosan': 'FROTO',
  astor: 'ASTOR',
  turkcell: 'TCELL',
};

function decodeXmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}

function detectTickerFromText(text: string, fallbackTicker: string = 'BIST'): string {
  const upper = text.toUpperCase();
  for (const t of KNOWN_TICKERS) {
    const regex = new RegExp(`\\b${t}\\b`, 'i');
    if (regex.test(upper)) return t;
  }
  const lower = text.toLowerCase();
  for (const [kw, sym] of Object.entries(COMPANY_KEYWORD_MAP)) {
    if (lower.includes(kw)) return sym;
  }
  return fallbackTicker;
}

/**
 * Google News RSS XML yanıtını ayrıştırır ve en yeniden eskiye sıralar.
 */
async function fetchLiveRssItems(query: string, defaultTicker: string = 'BIST'): Promise<NormalizedKapDisclosure[]> {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr&gl=TR&ceid=TR:tr`;
  const response = await fetch(rssUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MT16QuantBot/3.5; +https://borsaistanbul.com)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(6500),
  });

  if (!response.ok) return [];
  const xml = await response.text();
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  const results: NormalizedKapDisclosure[] = [];
  for (let i = 0; i < itemBlocks.length; i++) {
    const block = itemBlocks[i];
    const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
    const rawLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
    const rawPubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
    const rawSource = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'Borsa & KAP RSS';

    const title = decodeXmlEntities(rawTitle);
    if (!title || title.length < 8) continue;

    const url = decodeXmlEntities(rawLink);
    const source = decodeXmlEntities(rawSource);
    const parsedDate = rawPubDate ? new Date(rawPubDate.trim()) : new Date();
    const publishDate = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString();

    const ticker = detectTickerFromText(title, defaultTicker === 'BIST30' ? 'BIST' : defaultTicker);
    const hashId = Math.abs(
      `${ticker}_${title}`.split('').reduce((acc, ch) => (acc << 5) - acc + ch.charCodeAt(0), 0)
    );

    results.push({
      id: `LIVE_RSS_${hashId}`,
      ticker,
      companyName: `${ticker} Pay Piyasası`,
      title,
      publishDate,
      disclosureType: `Canlı RSS (${source})`,
      url: url || `https://www.kap.org.tr/tr/sirket-bilgileri/ozet/${ticker}`,
      summary: `${source} üzerinden anlık çekilen piyasa ve KAP haberi: ${title}`,
      source,
    });
  }

  return results.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
}

function normalizeRawKapItem(item: any): NormalizedKapDisclosure | null {
  if (!item) return null;
  const id = String(
    item.disclosureIndex || item.disclosureId || item.id || item.basicDisclosureId || `KAP_${Date.now()}`
  );
  let ticker = String(
    item.stockCodes || item.ticker || item.code || item.relatedStocks || item.companyCode || ''
  )
    .toUpperCase()
    .replace(/\.IS$/i, '')
    .trim();
  if (ticker.includes(',')) ticker = ticker.split(',')[0].trim();

  const title = String(
    item.title || item.disclosureSummary || item.subject || item.konu || item.header || ''
  ).trim();
  if (!title) return null;

  const publishDate = item.publishDate || item.date || item.publishTimestamp || new Date().toISOString();
  const disclosureType = String(item.disclosureType || item.type || 'Özel Durum Açıklaması').trim();
  const companyName = String(item.companyName || item.unvan || ticker).trim();

  return {
    id: `KAP_${id}`,
    ticker: ticker || 'BIST',
    title,
    publishDate,
    disclosureType,
    url: `https://www.kap.org.tr/tr/Bildirim/${id}`,
    summary: item.summary || item.text || title,
    companyName,
    source: 'KAP Resmi Bildirim',
  };
}

export class KapService {
  /**
   * Canlı RSS ve KAP kanallarından en güncel bildirimleri çekip EN YENİDEN ESKİYE sıralar.
   */
  static async fetchLatestDisclosures(forceRefresh: boolean = false): Promise<NormalizedKapDisclosure[]> {
    const now = Date.now();
    if (!forceRefresh && memoryCache.data.length > 0 && now - memoryCache.lastFetchedAt < CACHE_TTL_MS) {
      return memoryCache.data;
    }

    const merged: NormalizedKapDisclosure[] = [];

    const [rssResult, kapResult] = await Promise.allSettled([
      fetchLiveRssItems(
        'KAP OR "Borsa İstanbul" OR ASELS OR THYAO OR BIMAS OR EREGL OR TUPRS OR GARAN OR KCHOL when:7d',
        'BIST'
      ),
      fetch('https://www.kap.org.tr/tr/api/disclosures', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
        },
        signal: AbortSignal.timeout(5000),
      }).then((r) => (r.ok ? r.json() : null)),
    ]);

    if (rssResult.status === 'fulfilled' && rssResult.value.length > 0) {
      merged.push(...rssResult.value);
    }

    if (kapResult.status === 'fulfilled' && kapResult.value) {
      const rawJson = kapResult.value;
      const rawList = Array.isArray(rawJson)
        ? rawJson
        : Array.isArray(rawJson?.disclosures)
        ? rawJson.disclosures
        : [];
      const normalized = rawList
        .map(normalizeRawKapItem)
        .filter((x): x is NormalizedKapDisclosure => Boolean(x));
      merged.push(...normalized);
    }

    // En son gelen veriyi en üstte (newest-first) sırala
    const sorted = merged.sort(
      (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );

    if (sorted.length > 0) {
      memoryCache = {
        data: sorted.slice(0, 40),
        lastFetchedAt: now,
      };
      return memoryCache.data;
    }

    return memoryCache.data;
  }

  /**
   * Belirli bir hisse senedine ait canlı RSS ve KAP haberlerini en yeniden eskiye döner.
   */
  static async getDisclosuresByTicker(ticker: string): Promise<NormalizedKapDisclosure[]> {
    const cleanTicker = ticker.toUpperCase().replace(/\.IS$/i, '').trim();
    if (cleanTicker === 'BIST' || cleanTicker === 'BIST30' || cleanTicker === 'TUM') {
      return this.fetchLatestDisclosures();
    }

    const now = Date.now();
    const cached = tickerCache.get(cleanTicker);
    if (cached && cached.data.length > 0 && now - cached.lastFetchedAt < CACHE_TTL_MS) {
      return cached.data;
    }

    const [tickerRss, allGeneral] = await Promise.all([
      fetchLiveRssItems(`${cleanTicker} hisse OR KAP OR Borsa when:14d`, cleanTicker).catch(() => []),
      this.fetchLatestDisclosures(),
    ]);

    const fromGeneral = allGeneral.filter(
      (item) => item.ticker === cleanTicker || item.title.toUpperCase().includes(cleanTicker)
    );

    const combinedMap = new Map<string, NormalizedKapDisclosure>();
    [...tickerRss, ...fromGeneral].forEach((item) => {
      combinedMap.set(item.id, { ...item, ticker: cleanTicker });
    });

    const sorted = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );

    const finalResult = sorted.length > 0 ? sorted.slice(0, 20) : allGeneral.slice(0, 10);
    tickerCache.set(cleanTicker, { data: finalResult, lastFetchedAt: now });
    return finalResult;
  }
}
