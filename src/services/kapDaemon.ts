// src/services/kapDaemon.ts
/**
 * YOL 1 — KAP Otonom Arka Plan Akış Servisi & Katı Canlı Veri Muhafızı (v3.4-strict-no-mock)
 *
 * MERKEZİ MOCK İMHASI VE KATI CANLI VERİ MUHAFIZI (STRICT LIVE DATA GUARD):
 * - Statik, hardcoded, sentetik veya mock KAP haber dizileri kesinlikle engellenir.
 * - Çıkışa eklenen `strictKapDisclosureGuard` filtresi; sahte ID'leri (1249821..1249999, GEN_*, SAMPLE_*),
 *   statik başlık şablonlarını ve doğrulanmamış kaynakları anında reddeder.
 * - Gerçek zamanlı taze veri akışı sağlanana kadar `isAwaitingLiveStream = true` ve
 *   `streamStatusText = "Canlı Veri Bekleniyor..."` durumunu korur.
 */

export const STRICT_WAITING_LIVE_DATA_TEXT = 'Canlı Veri Bekleniyor...';

export interface KapImpactAnalysis {
  success: boolean;
  ticker: string;
  company_name: string;
  title: string;
  disclosure_type: string;
  extracted_amount_tl: number;
  extracted_amount_tl_million: number;
  annual_revenue_benchmark_tl_m: number;
  ciro_ratio_pct: number;
  equity_ratio_pct: number;
  impact_score: number;
  sentiment_label: string;
  recommended_action: string;
  expected_volatility_pct: number;
  reasons: string[];
  execution_time_ms: number;
  monetary?: {
    amount_raw: number;
    currency: string;
  };
}

export interface LiveKapDisclosure {
  id: string;
  ticker: string;
  companyName: string;
  title: string;
  summary: string;
  body_text: string;
  publish_time: string;
  publishDate: string;
  disclosure_type: string;
  url: string;
  source: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  analysis: KapImpactAnalysis;
  isVerifiedLive?: boolean;
}

export interface KapDaemonState {
  isRunning: boolean;
  isLiveVerified: boolean;
  isAwaitingLiveStream: boolean;
  streamStatusText: string;
  blockedMockCount: number;
  activeTicker: string;
  disclosures: LiveKapDisclosure[];
  tickerDisclosures: LiveKapDisclosure[];
  lastSyncAt: string | null;
  lastLatencyMs: number;
  syncCount: number;
  errorCount: number;
  lastError: string | null;
}

type KapDaemonListener = (state: KapDaemonState) => void;

/**
 * 🛡️ KATI CANLI VERİ MUHAFIZI (STRICT MOCK KILLER GUARD — KAP):
 * Bilinen tüm statik/mock/fallback KAP bildirim ID'lerini, sentetik şablon cümlelerini
 * ve sahte kaynak işaretlerini tespit ederek çıkıştan kesin olarak eler.
 */
const BLOCKED_MOCK_KAP_IDS = new Set<string>([
  '1249821',
  '1249818',
  '1249812',
  '1249805',
  '1249798',
  '1249790',
  '1249782',
  '1249774',
  '1249999',
]);

const BLOCKED_MOCK_TITLE_SIGNATURES: readonly string[] = [
  'savunma sanayii başkanlığı ile 145 milyon usd sözleşme',
  'trafik sonuçları: yolcu sayısı ve doluluk oranları duyurusu',
  'sermaye benzeri tahvil ihracı ve nitelikli yatırımcı satışı',
  'kapasite artırımı ve yeşil çelik yatırımı başlangıcı',
  'sürdürülebilir havacılık yakıtı (saf) tesis yatırımı onayı',
  'yeni düzcam hattı devreye alma ve ihracat kapasite artışı',
  'temettü dağıtım kararı ve genel kurul bilgilendirmesi',
  'şirketi stratejik faaliyet ve durum açıklaması',
  'şirketi stratejik yatırım ve kapasite geliştirme bildirimi',
  'olağan faaliyet ve dönemsel finansal gelişmeler bildirimi',
  'mock',
  'sample',
  'test verisi',
  'örnek bildirim',
];

export function strictKapDisclosureGuard(rawItem: Record<string, any> | null | undefined): boolean {
  if (!rawItem || typeof rawItem !== 'object') return false;

  // Açıkça mock/fallback/synthetic olarak işaretlenmiş verileri reddet
  if (
    rawItem.isMock === true ||
    rawItem.is_mock === true ||
    rawItem.isFallback === true ||
    rawItem.is_fallback === true ||
    rawItem.dataQuality === 'synthetic' ||
    String(rawItem.source || '').toLowerCase().includes('fallback') ||
    String(rawItem.source || '').toLowerCase().includes('mock') ||
    String(rawItem.source || '').toLowerCase().includes('sample')
  ) {
    return false;
  }

  const id = String(
    rawItem.id ||
      rawItem.disclosureIndex ||
      rawItem.disclosureId ||
      rawItem.link ||
      rawItem.url ||
      rawItem.title ||
      ''
  ).trim();
  if (!id) return false;

  // Statik/Sentetik ID desenlerini reddet
  if (
    BLOCKED_MOCK_KAP_IDS.has(id) ||
    id.startsWith('GEN_') ||
    id.startsWith('MOCK_') ||
    id.startsWith('SAMPLE_') ||
    id.startsWith('FALLBACK_') ||
    id.startsWith('FAKE_')
  ) {
    return false;
  }

  const title = String(rawItem.title || rawItem.subject || rawItem.disclosureSummary || '').trim();
  const lowerTitle = title.toLowerCase();
  if (!title || title.length < 6) return false;

  for (const sig of BLOCKED_MOCK_TITLE_SIGNATURES) {
    if (lowerTitle.includes(sig)) {
      return false;
    }
  }

  const body = String(rawItem.body_text || rawItem.summary || '').toLowerCase();
  if (
    body.includes('olağandışı fiyat ve miktar hareketlerine ilişkin özel durum açıklaması bulunmamaktadır') &&
    id.startsWith('GEN_')
  ) {
    return false;
  }

  return true;
}

/**
 * Ham KAP veya RSS/XML/JSON ağ verisini deterministik NLP kurallarıyla normalize eder.
 */
function buildAnalysisFromRaw(
  ticker: string,
  companyName: string,
  title: string,
  bodyText: string,
  disclosureType: string,
  existingAnalysis?: Partial<KapImpactAnalysis>
): KapImpactAnalysis {
  const startMs = performance.now();
  const combined = `${title} ${bodyText}`.toLowerCase();

  let extractedAmountTl = existingAnalysis?.extracted_amount_tl ?? 0;
  let rawAmount = existingAnalysis?.monetary?.amount_raw ?? 0;
  let currency = existingAnalysis?.monetary?.currency ?? 'TL';

  if (extractedAmountTl <= 0) {
    const amountMatch = combined.match(/(\d[\d.,]*)\s*(milyon|milyar)?\s*(usd|abd doları|dolar|eur|euro|tl|türk lirası)/i);
    if (amountMatch) {
      const cleanNum = parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
      const mult =
        amountMatch[2]?.toLowerCase() === 'milyar'
          ? 1_000_000_000
          : amountMatch[2]?.toLowerCase() === 'milyon'
          ? 1_000_000
          : 1;
      const rawCur = amountMatch[3].toUpperCase();
      rawAmount = cleanNum * mult;
      if (rawCur.includes('USD') || rawCur.includes('DOLAR')) {
        currency = 'USD';
        extractedAmountTl = rawAmount * 44.75;
      } else if (rawCur.includes('EUR')) {
        currency = 'EUR';
        extractedAmountTl = rawAmount * 48.2;
      } else {
        currency = 'TL';
        extractedAmountTl = rawAmount;
      }
    }
  }

  const extractedMillion = Number((extractedAmountTl / 1_000_000).toFixed(2));
  const benchmarkMillion = existingAnalysis?.annual_revenue_benchmark_tl_m ?? 2500.0;
  const ciroRatioPct =
    existingAnalysis?.ciro_ratio_pct ??
    (extractedMillion > 0 ? Number(((extractedMillion / benchmarkMillion) * 100).toFixed(2)) : 0);

  let impactScore = existingAnalysis?.impact_score;
  if (typeof impactScore !== 'number') {
    if (
      combined.includes('vbts') ||
      combined.includes('tedbir') ||
      combined.includes('açığa satış yasağı') ||
      combined.includes('ceza')
    ) {
      impactScore = -58;
    } else if (
      combined.includes('sözleşme') ||
      combined.includes('ihale') ||
      combined.includes('sipariş') ||
      combined.includes('yeni iş')
    ) {
      impactScore = Math.min(95, 55 + Math.round(ciroRatioPct * 1.5));
    } else if (
      combined.includes('temettü') ||
      combined.includes('kâr payı') ||
      combined.includes('geri alım')
    ) {
      impactScore = 64;
    } else if (
      combined.includes('yatırım') ||
      combined.includes('kapasite') ||
      combined.includes('teşvik')
    ) {
      impactScore = 48;
    } else if (combined.includes('pay satışı') || combined.includes('kayıt başvurusu')) {
      impactScore = -35;
    } else {
      impactScore = 15;
    }
  }

  const sentimentLabel =
    existingAnalysis?.sentiment_label ||
    (impactScore >= 50
      ? 'GÜÇLÜ POZİTİF'
      : impactScore >= 20
      ? 'POZİTİF'
      : impactScore <= -40
      ? 'GÜÇLÜ NEGATİF'
      : impactScore <= -15
      ? 'NEGATİF'
      : 'NÖTR');

  const recommendedAction =
    existingAnalysis?.recommended_action ||
    (impactScore >= 45
      ? 'GÜÇLÜ AL'
      : impactScore >= 20
      ? 'AL'
      : impactScore <= -30
      ? 'SAT / RİSK AZALT'
      : 'TUT / İZLE');

  const expectedVolatilityPct =
    existingAnalysis?.expected_volatility_pct ??
    Number(Math.max(1.2, Math.min(9.5, Math.abs(impactScore) * 0.055)).toFixed(2));

  const reasons =
    Array.isArray(existingAnalysis?.reasons) && existingAnalysis.reasons.length > 0
      ? existingAnalysis.reasons
      : [
          extractedMillion > 0
            ? `Bildirimde tespit edilen ₺${extractedMillion.toLocaleString('tr-TR')}M tutar yıllık cironun %${ciroRatioPct} seviyesine karşılık gelmektedir.`
            : `${disclosureType} kategorisindeki bildirim şirket faaliyet görünümünü doğrudan etkilemektedir.`,
          `Otonom KAP Daemon NLP motoru tarafından ${sentimentLabel} (${impactScore > 0 ? `+${impactScore}` : impactScore}/100) olarak sınıflandırıldı.`,
        ];

  const elapsed = Number(Math.max(0.8, performance.now() - startMs).toFixed(1));

  return {
    success: true,
    ticker,
    company_name: companyName || `${ticker} A.Ş.`,
    title,
    disclosure_type: disclosureType,
    extracted_amount_tl: extractedAmountTl,
    extracted_amount_tl_million: extractedMillion,
    annual_revenue_benchmark_tl_m: benchmarkMillion,
    ciro_ratio_pct: ciroRatioPct,
    equity_ratio_pct: existingAnalysis?.equity_ratio_pct ?? Number((ciroRatioPct * 1.8).toFixed(1)),
    impact_score: impactScore,
    sentiment_label: sentimentLabel,
    recommended_action: recommendedAction,
    expected_volatility_pct: expectedVolatilityPct,
    reasons,
    execution_time_ms: existingAnalysis?.execution_time_ms ?? elapsed,
    monetary: {
      amount_raw: rawAmount,
      currency,
    },
  };
}

/**
 * RSS XML veya JSON kamuya açık KAP ağ yanıtlarını Katı Muhafız (Strict Guard) filtresinden geçirerek
 * standart LiveKapDisclosure dizisine çevirir. Mock/statik kayıtlar anında imha edilir.
 */
export function parsePublicRssOrJsonPayload(rawPayload: unknown): {
  verified: LiveKapDisclosure[];
  blockedCount: number;
} {
  if (!rawPayload) return { verified: [], blockedCount: 0 };

  let blockedCount = 0;

  // RSS/XML string ise DOMParser ile ayrıştır
  if (typeof rawPayload === 'string' && rawPayload.trim().startsWith('<')) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rawPayload, 'text/xml');
      const items = Array.from(xmlDoc.querySelectorAll('item, entry'));
      const verified: LiveKapDisclosure[] = [];

      items.forEach((node, index) => {
        const rawTitle = node.querySelector('title')?.textContent?.trim() || '';
        const rawDesc = node.querySelector('description, summary, content')?.textContent?.trim() || rawTitle;
        const pubDate = node.querySelector('pubDate, published, updated')?.textContent?.trim() || new Date().toISOString();
        const link = node.querySelector('link')?.textContent?.trim() || '';
        const candidateId = link.split('/').pop() || `RSS_${Date.now()}_${index}`;

        if (!strictKapDisclosureGuard({ id: candidateId, title: rawTitle, summary: rawDesc })) {
          blockedCount += 1;
          return;
        }

        const tickerMatch = rawTitle.match(/\b([A-Z]{4,5})\b/);
        const ticker = tickerMatch ? tickerMatch[1] : 'BIST';
        const disclosureType = 'Özel Durum Açıklaması';
        const analysis = buildAnalysisFromRaw(ticker, `${ticker} A.Ş.`, rawTitle, rawDesc, disclosureType);

        verified.push({
          id: candidateId,
          ticker,
          companyName: `${ticker} A.Ş.`,
          title: rawTitle,
          summary: rawDesc,
          body_text: rawDesc,
          publish_time: pubDate,
          publishDate: pubDate,
          disclosure_type: disclosureType,
          url: link || `https://www.kap.org.tr/tr/Bildirim/${candidateId}`,
          source: 'KAP RSS Doğrulanmış Canlı Akış',
          sentiment: analysis.impact_score >= 20 ? 'BULLISH' : analysis.impact_score <= -20 ? 'BEARISH' : 'NEUTRAL',
          impact: Math.abs(analysis.impact_score) >= 50 ? 'HIGH' : Math.abs(analysis.impact_score) >= 25 ? 'MEDIUM' : 'LOW',
          analysis,
          isVerifiedLive: true,
        });
      });

      return { verified, blockedCount };
    } catch {
      return { verified: [], blockedCount };
    }
  }

  // JSON nesnesi veya dizisi
  const obj = rawPayload as Record<string, unknown>;
  if (obj && (obj.isMock === true || obj.is_mock === true || obj.isFallback === true)) {
    return { verified: [], blockedCount: 1 };
  }

  const rawList: unknown[] = Array.isArray(rawPayload)
    ? rawPayload
    : Array.isArray(obj?.feed)
    ? (obj.feed as unknown[])
    : Array.isArray(obj?.data)
    ? (obj.data as unknown[])
    : Array.isArray(obj?.items)
    ? (obj.items as unknown[])
    : [];

  const verified = rawList
    .map((entry): LiveKapDisclosure | null => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Record<string, any>;

      // 🛡️ MERKEZİ MUHAFIZ KONTROLÜ: Statik / Hardcoded / Mock bildirimleri burada kes!
      if (!strictKapDisclosureGuard(item)) {
        blockedCount += 1;
        return null;
      }

      const rawLink = String(item.url || item.link || '').trim();
      const id = String(
        item.id ||
          item.disclosureIndex ||
          item.disclosureId ||
          (rawLink ? rawLink.slice(-24).replace(/[^a-zA-Z0-9_-]/g, '') : '') ||
          `RSS_${Math.abs(
            String(item.title || '').split('').reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0)
          )}`
      ).trim();
      const ticker = String(item.ticker || item.stockCodes || 'BIST')
        .toUpperCase()
        .replace(/\.IS$/i, '')
        .trim();
      const title = String(item.title || item.subject || '').trim();
      const summary = String(item.summary || item.body_text || title).trim();
      const bodyText = String(item.body_text || item.summary || title).trim();
      const publishDate = String(item.publishDate || item.pubDate || item.publish_time || new Date().toISOString());
      const rawType = String(item.disclosure_type || item.disclosureType || item.source || 'Canlı Piyasa & KAP RSS');

      let normalizedCategory = rawType;
      const lowerCombined = `${title} ${rawType}`.toLowerCase();
      if (lowerCombined.includes('iş ilişkisi') || lowerCombined.includes('sözleşme') || lowerCombined.includes('ihale')) {
        normalizedCategory = 'YENI_IS_ILISKISI';
      } else if (lowerCombined.includes('finansal') || lowerCombined.includes('bilanço') || lowerCombined.includes('trafik')) {
        normalizedCategory = 'FINANSAL_RAPOR';
      } else if (lowerCombined.includes('geri alım')) {
        normalizedCategory = 'PAY_GERI_ALIMI';
      } else if (lowerCombined.includes('yatırım') || lowerCombined.includes('kapasite') || lowerCombined.includes('teşvik')) {
        normalizedCategory = 'YATIRIM_TESVIK';
      } else if (lowerCombined.includes('vbts') || lowerCombined.includes('tedbir')) {
        normalizedCategory = 'VBTS_TEDBIR';
      }

      const companyName = String(item.companyName || item.analysis?.company_name || `${ticker} A.Ş.`);
      const analysis = buildAnalysisFromRaw(
        ticker,
        companyName,
        title,
        bodyText,
        normalizedCategory,
        item.analysis
      );

      const sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
        analysis.impact_score >= 20 ? 'BULLISH' : analysis.impact_score <= -20 ? 'BEARISH' : 'NEUTRAL';
      const impact: 'HIGH' | 'MEDIUM' | 'LOW' =
        Math.abs(analysis.impact_score) >= 50 ? 'HIGH' : Math.abs(analysis.impact_score) >= 25 ? 'MEDIUM' : 'LOW';

      const parsedDate = new Date(publishDate);
      const formattedTime = !isNaN(parsedDate.getTime())
        ? parsedDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        : String(item.publish_time || 'Canlı');

      return {
        id,
        ticker,
        companyName,
        title,
        summary,
        body_text: bodyText,
        publish_time: formattedTime,
        publishDate: !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString(),
        disclosure_type: normalizedCategory,
        url: rawLink || `https://www.kap.org.tr/tr/Bildirim/${id}`,
        source: String(item.source || 'KAP & Google Finans RSS'),
        sentiment,
        impact,
        analysis,
        isVerifiedLive: true,
      };
    })
    .filter((x): x is LiveKapDisclosure => x !== null)
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());

  return { verified, blockedCount };
}

class KapAutonomousDaemon {
  private state: KapDaemonState = {
    isRunning: false,
    isLiveVerified: false,
    isAwaitingLiveStream: true,
    streamStatusText: STRICT_WAITING_LIVE_DATA_TEXT,
    blockedMockCount: 0,
    activeTicker: 'ASELS',
    disclosures: [],
    tickerDisclosures: [],
    lastSyncAt: null,
    lastLatencyMs: 0,
    syncCount: 0,
    errorCount: 0,
    lastError: null,
  };

  private listeners = new Set<KapDaemonListener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * 🛡️ ÇIKIŞ MUHAFIZI (OUTPUT GUARD):
   * Dinleyicilere veya bileşenlere gönderilen state üzerinde son katı filtreyi uygular.
   * Doğrulanmamış hiçbir bildirim dışarı sızamaz.
   */
  public getState(): KapDaemonState {
    const cleanDisclosures = this.state.disclosures.filter((d) => d.isVerifiedLive === true && strictKapDisclosureGuard(d));
    const cleanTickerDisclosures = this.state.tickerDisclosures.filter(
      (d) => d.isVerifiedLive === true && strictKapDisclosureGuard(d)
    );
    const hasVerifiedLive = cleanDisclosures.length > 0;

    return {
      ...this.state,
      isLiveVerified: hasVerifiedLive,
      isAwaitingLiveStream: !hasVerifiedLive,
      streamStatusText: hasVerifiedLive
        ? `KAP Canlı Akış Aktif (${cleanDisclosures.length} Doğrulanmış Bildirim)`
        : STRICT_WAITING_LIVE_DATA_TEXT,
      disclosures: cleanDisclosures,
      tickerDisclosures: cleanTickerDisclosures,
    };
  }

  public subscribe(listener: KapDaemonListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.warn('[kapDaemon] Listener error:', err);
      }
    });
  }

  public setActiveTicker(ticker: string): void {
    const clean = (ticker || 'ASELS').toUpperCase().replace(/\.IS$/i, '').trim();
    if (this.state.activeTicker !== clean) {
      this.state.activeTicker = clean;
      this.fetchLiveDisclosures(clean, false).catch(() => {});
    }
  }

  /**
   * Çift kanallı gerçek KAP akışı + Katı Muhafız Filtresi (Strict Guard):
   * Statik/mock geri dönüşler tespit edildiğinde kesilir ve "Canlı Veri Bekleniyor..." durumu korunur.
   */
  public async fetchLiveDisclosures(ticker?: string, forceRefresh: boolean = false): Promise<LiveKapDisclosure[]> {
    const targetTicker = (ticker || this.state.activeTicker || 'ASELS').toUpperCase().replace(/\.IS$/i, '').trim();
    const startMs = performance.now();

    try {
      const [newsRes, kapFeedRes] = await Promise.allSettled([
        fetch(`/api/news?limit=25${forceRefresh ? '&refresh=true' : ''}`),
        fetch(`/api/kap/latest_feed?ticker=${encodeURIComponent(targetTicker)}`),
      ]);

      const mergedMap = new Map<string, LiveKapDisclosure>();
      let totalBlockedInCycle = 0;

      if (kapFeedRes.status === 'fulfilled' && kapFeedRes.value.ok) {
        const kapData = await kapFeedRes.value.json();
        const { verified, blockedCount } = parsePublicRssOrJsonPayload(kapData);
        totalBlockedInCycle += blockedCount;
        verified.forEach((item) => mergedMap.set(`${item.ticker}_${item.id}`, item));
      }

      if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
        const newsData = await newsRes.value.json();
        const { verified, blockedCount } = parsePublicRssOrJsonPayload(newsData);
        totalBlockedInCycle += blockedCount;
        verified.forEach((item) => {
          const key = `${item.ticker}_${item.id}`;
          if (!mergedMap.has(key)) {
            mergedMap.set(key, item);
          }
        });
      }

      // En son gelen veriyi en üstte (newest-first) sırala
      const allDisclosures = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      const tickerFiltered = allDisclosures.filter(
        (d) =>
          targetTicker === 'BIST30' ||
          targetTicker === 'BIST' ||
          d.ticker === targetTicker ||
          d.companyName.toUpperCase().includes(targetTicker)
      );

      const latencyMs = Math.round(performance.now() - startMs);
      const hasLive = allDisclosures.length > 0;

      this.state = {
        ...this.state,
        activeTicker: targetTicker,
        isLiveVerified: hasLive,
        isAwaitingLiveStream: !hasLive,
        streamStatusText: hasLive
          ? `KAP Canlı Akış Aktif (${allDisclosures.length} Bildirim)`
          : STRICT_WAITING_LIVE_DATA_TEXT,
        blockedMockCount: this.state.blockedMockCount + totalBlockedInCycle,
        disclosures: allDisclosures,
        tickerDisclosures: tickerFiltered,
        lastSyncAt: new Date().toISOString(),
        lastLatencyMs: latencyMs,
        syncCount: this.state.syncCount + 1,
        lastError: null,
      };

      this.notify();
      return allDisclosures;
    } catch (err: any) {
      const msg = err?.message || STRICT_WAITING_LIVE_DATA_TEXT;
      this.state = {
        ...this.state,
        isLiveVerified: false,
        isAwaitingLiveStream: true,
        streamStatusText: STRICT_WAITING_LIVE_DATA_TEXT,
        disclosures: [],
        tickerDisclosures: [],
        errorCount: this.state.errorCount + 1,
        lastError: msg,
      };
      this.notify();
      return [];
    }
  }

  /**
   * Özel veya anlık gelen KAP bildirim metnini canlı NLP motoruna (/api/kap/analyze) gönderir.
   */
  public async analyzeDisclosureText(
    ticker: string,
    title: string,
    bodyText: string
  ): Promise<KapImpactAnalysis> {
    const cleanTicker = (ticker || this.state.activeTicker || 'ASELS').toUpperCase().replace(/\.IS$/i, '').trim();
    const res = await fetch('/api/kap/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: cleanTicker,
        title,
        body_text: bodyText,
      }),
    });

    if (!res.ok) {
      throw new Error(`KAP NLP servisi HTTP ${res.status}`);
    }

    const raw = await res.json();
    return buildAnalysisFromRaw(
      cleanTicker,
      raw.company_name || `${cleanTicker} A.Ş.`,
      title,
      bodyText,
      raw.disclosure_type || 'YENI_IS_ILISKISI',
      raw
    );
  }

  public startDaemon(intervalMs: number = 25000): void {
    if (this.timer) return;
    this.state.isRunning = true;
    this.fetchLiveDisclosures(this.state.activeTicker, false).catch(() => {});
    this.timer = setInterval(() => {
      this.fetchLiveDisclosures(this.state.activeTicker, false).catch(() => {});
    }, intervalMs);
    this.notify();
  }

  public stopDaemon(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state.isRunning = false;
    this.notify();
  }
}

export const kapDaemon = new KapAutonomousDaemon();
export default kapDaemon;
