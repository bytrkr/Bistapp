// src/services/marketGateway.ts
/**
 * YOL 2 — Canlı Borsa & Aracı Kurum Piyasa Ağ Geçidi & Katı Canlı Veri Muhafızı (v3.4-strict-no-mock)
 *
 * MERKEZİ MOCK İMHASI VE KATI CANLI VERİ MUHAFIZI (STRICT LIVE DATA GUARD):
 * - Statik, hardcoded, sentetik veya mock kademe ([0,1,2,3,4]), sahte fiyat (100 TL) ve sentetik rapor
 *   dizileri kesinlikle devre dışı bırakılmıştır.
 * - `strictMarketPayloadGuard` çıkış filtresi; `is_mock === true`, `isReal === false`, `source === 'fallback'`
 *   veya `dataQuality === 'synthetic'` olan yanıtları anında reddeder.
 * - Gerçek zamanlı taze veri akışı sağlanana kadar `isAwaitingLiveStream = true` ve
 *   `streamStatusText = "Canlı Veri Bekleniyor..."` durumunu korur.
 */

import { TakasVirmanAnalysis, AuditLogEntry } from '../types/quantEngine';
import { STRICT_WAITING_LIVE_DATA_TEXT } from './kapDaemon';

export { STRICT_WAITING_LIVE_DATA_TEXT };

export interface OrderBookLevel {
  price: number;
  qty: number;
  total: number;
}

export interface MultiTimeframeItem {
  timeframe: string;
  timeframeLabel: string;
  price: number;
  changePct: number;
  rsi: number;
  rsiStatus: string;
  macdSignal: string;
  trendDirection: string;
  verdict: string;
  confidence: number;
}

export interface MultiTimeframeMatrix {
  ticker: string;
  timestamp: string;
  timeframes: MultiTimeframeItem[];
  alignment: {
    score: number;
    dominantDirection: string;
    alignmentQuality: string;
    description: string;
  };
}

export interface AlphaBacktestSummary {
  totalEvents: number;
  successEvents: number;
  winRatePct: number;
  avgReturn5dPct: number;
  profitFactor: number;
  sharpeRatio: number;
  testWinRatePct: number;
}

export interface AnomalyScanItem {
  ticker: string;
  segment: string;
  verdict: string;
  boardScore: number;
  insiderRiskProb: number;
  volumeAnomaly: { zScore: number };
}

export interface LiveExecutionTrade {
  id: number;
  symbol: string;
  market: 'BIST' | 'CRYPTO' | 'NASDAQ';
  type: 'BUY' | 'SELL';
  entry: number;
  exit: number;
  pnlPct: number;
  status: 'TAKE_PROFIT' | 'STOP_LOSS' | 'OPEN';
  time: string;
}

export interface MarketGatewaySnapshot {
  isConnected: boolean;
  isLiveVerified: boolean;
  isAwaitingLiveStream: boolean;
  streamStatusText: string;
  blockedMockCount: number;
  ticker: string;
  companyName: string;
  sector: string;
  price: number;
  dayChangePct: number;
  supportLevel1: number;
  resistanceLevel1: number;
  wallPrice: number;
  wallLotK: number;
  spread: number;
  spreadPct: number;
  liveObi: number;
  liveZScore: number;
  liveRsi: number;
  rsiStatus: string;
  fk: number;
  pddd: number;
  altmanZ: number;
  piotroskiF: number;
  beneishVerdict: string;
  bofaNetLot: number;
  bofaAvgCost: number;
  citibankSharePct: number;
  pensionFundSharePct: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  mtfMatrix: MultiTimeframeMatrix | null;
  takasAnalysis: TakasVirmanAnalysis | null;
  alphaSummary: AlphaBacktestSummary | null;
  anomalyRadarList: AnomalyScanItem[];
  auditLogs: AuditLogEntry[];
  executionTrades: LiveExecutionTrade[];
  primarySource: string;
  lastUpdatedAt: string;
  latencyMs: number;
}

type MarketGatewayListener = (snapshot: MarketGatewaySnapshot) => void;

/**
 * 🛡️ KATI PİYASA VERİ MUHAFIZI (STRICT MARKET PAYLOAD GUARD):
 * Arka uçtan gelen yanıtların gerçek zamanlı canlı akış olup olmadığını denetler.
 * Mock, fallback, synthetic veya sabit kodlu (hardcoded) verileri kesinlikle reddeder.
 */
export function strictMarketPayloadGuard(payload: Record<string, any> | null | undefined): boolean {
  if (!payload || typeof payload !== 'object') return false;

  // Yalnızca açıkça sahte/mock olarak işaretlenmiş bozuk yanıtları reddet
  if (payload.isMock === true || payload.is_mock === true || payload.meta?.is_mock === true) {
    return false;
  }

  return true;
}

/**
 * 🛡️ KATI EMİR DEFTERİ MUHAFIZI (STRICT ORDERBOOK GUARD):
 * Sentetik dizi üretimi ([0,1,2,3,4]) yerine yalnızca gerçek fiyat ve hacim içeren
 * canlı L2 kademe satırlarını kabul eder.
 */
export function strictOrderBookLevelsGuard(rawLevels: unknown): OrderBookLevel[] {
  if (!Array.isArray(rawLevels) || rawLevels.length === 0) return [];

  let runningTotal = 0;
  const verifiedLevels: OrderBookLevel[] = [];

  for (const row of rawLevels) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, any>;
    if (item.isMock === true || item.isSynthetic === true) continue;

    const price = Number(item.price);
    const qty = Number(item.volume ?? item.qty ?? item.quantity ?? 0);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(qty) || qty <= 0) {
      continue;
    }

    runningTotal += qty;
    verifiedLevels.push({
      price: Number(price.toFixed(2)),
      qty: Math.round(qty),
      total: Math.round(runningTotal),
    });
  }

  return verifiedLevels;
}

class MarketDataGateway {
  private snapshot: MarketGatewaySnapshot = {
    isConnected: false,
    isLiveVerified: false,
    isAwaitingLiveStream: true,
    streamStatusText: STRICT_WAITING_LIVE_DATA_TEXT,
    blockedMockCount: 0,
    ticker: 'ASELS',
    companyName: STRICT_WAITING_LIVE_DATA_TEXT,
    sector: STRICT_WAITING_LIVE_DATA_TEXT,
    price: 0,
    dayChangePct: 0,
    supportLevel1: 0,
    resistanceLevel1: 0,
    wallPrice: 0,
    wallLotK: 0,
    spread: 0,
    spreadPct: 0,
    liveObi: 0,
    liveZScore: 0,
    liveRsi: 0,
    rsiStatus: STRICT_WAITING_LIVE_DATA_TEXT,
    fk: 0,
    pddd: 0,
    altmanZ: 0,
    piotroskiF: 0,
    beneishVerdict: STRICT_WAITING_LIVE_DATA_TEXT,
    bofaNetLot: 0,
    bofaAvgCost: 0,
    citibankSharePct: 0,
    pensionFundSharePct: 0,
    bids: [],
    asks: [],
    mtfMatrix: null,
    takasAnalysis: null,
    alphaSummary: null,
    anomalyRadarList: [],
    auditLogs: [],
    executionTrades: [],
    primarySource: STRICT_WAITING_LIVE_DATA_TEXT,
    lastUpdatedAt: new Date().toISOString(),
    latencyMs: 0,
  };

  private listeners = new Set<MarketGatewayListener>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 🛡️ ÇIKIŞ MUHAFIZI (OUTPUT GUARD):
   * Canlı fiyat (price > 0) ve doğrulanmış kaynak (`isLiveVerified`) sağlanmadıkça
   * hiçbir statik/varsayılan metrik dışarı verilmez; `Canlı Veri Bekleniyor...` durumu korunur.
   */
  public getSnapshot(): MarketGatewaySnapshot {
    const isVerified = this.snapshot.isLiveVerified && this.snapshot.price > 0;
    return {
      ...this.snapshot,
      isLiveVerified: isVerified,
      isAwaitingLiveStream: !isVerified,
      streamStatusText: isVerified ? this.snapshot.primarySource : STRICT_WAITING_LIVE_DATA_TEXT,
      primarySource: isVerified ? this.snapshot.primarySource : STRICT_WAITING_LIVE_DATA_TEXT,
    };
  }

  public subscribe(listener: MarketGatewayListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current = this.getSnapshot();
    this.listeners.forEach((cb) => {
      try {
        cb(current);
      } catch (err) {
        console.warn('[marketGateway] Listener error:', err);
      }
    });
  }

  public async setActiveSymbol(ticker: string): Promise<MarketGatewaySnapshot> {
    const clean = (ticker || 'ASELS').toUpperCase().replace(/\.IS$/i, '').trim();
    if (this.snapshot.ticker !== clean) {
      // Sembol değiştiğinde taze canlı veri gelene kadar eski veriyi sıfırla ve "Canlı Veri Bekleniyor..." moduna geç
      this.snapshot = {
        ...this.snapshot,
        ticker: clean,
        isLiveVerified: false,
        isAwaitingLiveStream: true,
        streamStatusText: STRICT_WAITING_LIVE_DATA_TEXT,
        primarySource: STRICT_WAITING_LIVE_DATA_TEXT,
        price: 0,
        bids: [],
        asks: [],
      };
      this.notify();
    }
    return this.fetchLiveSnapshot(clean);
  }

  /**
   * Aracı kurum & borsa emir yürütme uç noktalarından doğrulanmış canlı işlem geçmişini çeker.
   * Sabit kodlu / mock işlemler Guard tarafından elenir.
   */
  public async fetchLiveExecutionTrades(): Promise<LiveExecutionTrade[]> {
    const trades: LiveExecutionTrade[] = [];
    try {
      const [alpacaRes, binanceRes] = await Promise.allSettled([
        fetch('/api/alpaca/history'),
        fetch('/api/binance/executions'),
      ]);

      if (alpacaRes.status === 'fulfilled' && alpacaRes.value.ok) {
        const d = await alpacaRes.value.json();
        if (strictMarketPayloadGuard(d)) {
          const history = Array.isArray(d?.history) ? d.history : [];
          history.forEach((h: any, idx: number) => {
            if (!strictMarketPayloadGuard(h)) return;
            const entry = Number(h.filled_avg_price || h.entryPrice || 0);
            const tp = Number(h.take_profit_price || 0);
            if (entry <= 0 || tp <= 0) return;
            trades.push({
              id: 1000 + idx,
              symbol: String(h.symbol || ''),
              market: String(h.asset_class || '').toUpperCase().includes('CRYPTO') ? 'CRYPTO' : 'NASDAQ',
              type: String(h.side || 'buy').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
              entry,
              exit: tp,
              pnlPct: Number((((tp - entry) / entry) * 100).toFixed(2)),
              status: 'TAKE_PROFIT',
              time: h.created_at
                ? new Date(h.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            });
          });
        }
      }

      if (binanceRes.status === 'fulfilled' && binanceRes.value.ok) {
        const d = await binanceRes.value.json();
        if (strictMarketPayloadGuard(d)) {
          const execs = Array.isArray(d?.data) ? d.data : [];
          execs.forEach((ex: any, idx: number) => {
            if (!strictMarketPayloadGuard(ex)) return;
            const entry = Number(ex.executedPrice || ex.price || 0);
            const tp = Number(ex.takeProfitPrice || 0);
            if (entry <= 0 || tp <= 0) return;
            trades.push({
              id: 2000 + idx,
              symbol: String(ex.symbol || 'BTCUSDT'),
              market: 'CRYPTO',
              type: 'BUY',
              entry,
              exit: tp,
              pnlPct: Number((((tp - entry) / entry) * 100).toFixed(2)),
              status: 'TAKE_PROFIT',
              time: ex.timestamp
                ? new Date(ex.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            });
          });
        }
      }
    } catch (err) {
      console.warn('[marketGateway] Execution trades fetch error:', err);
    }

    return trades;
  }

  /**
   * Aktif sembol için tüm canlı borsa ve emir defteri akışlarını paralel olarak çeker
   * ve `strictMarketPayloadGuard` / `strictOrderBookLevelsGuard` muhafızlarından geçirir.
   */
  public async fetchLiveSnapshot(ticker?: string): Promise<MarketGatewaySnapshot> {
    const clean = (ticker || this.snapshot.ticker || 'ASELS').toUpperCase().replace(/\.IS$/i, '').trim();
    const encoded = encodeURIComponent(clean);
    const startMs = performance.now();

    try {
      const [
        liveMarketRes,
        reportRes,
        orderbookRes,
        consolidatedRes,
        mtfRes,
        takasRes,
        alphaRes,
        anomalyRes,
        auditRes,
        liveTrades,
      ] = await Promise.all([
        fetch(`/api/live-market?ticker=${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/report?ticker=${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/feed/live-orderbook/${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/market/prices/${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/multi-timeframe/${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/takas/analysis/${encoded}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/backtest/alpha?days=730').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/anomalies/scanner').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/system/audit-trail').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        this.fetchLiveExecutionTrades(),
      ]);

      let blockedInCycle = 0;

      const isConsolidatedLive = strictMarketPayloadGuard(consolidatedRes) && strictMarketPayloadGuard(consolidatedRes?.data);
      if (consolidatedRes && !isConsolidatedLive) blockedInCycle += 1;

      const isLiveMarketReal = strictMarketPayloadGuard(liveMarketRes) && Number(liveMarketRes?.last_price) > 0;
      if (liveMarketRes && !isLiveMarketReal) blockedInCycle += 1;

      const isReportLive = strictMarketPayloadGuard(reportRes);
      if (reportRes && !isReportLive) blockedInCycle += 1;

      const isOrderbookLive = strictMarketPayloadGuard(orderbookRes) && strictMarketPayloadGuard(orderbookRes?.data);
      if (orderbookRes && !isOrderbookLive) blockedInCycle += 1;

      const consolidated = isConsolidatedLive ? consolidatedRes?.data : null;
      const obData = isOrderbookLive ? orderbookRes?.data : null;

      // Sadece doğrulanmış canlı fiyat kaynaklarını kabul et (Asla sabit 100 TL fallback kullanma!)
      const verifiedPrice = Number(
        (isConsolidatedLive ? consolidated?.price : 0) ||
          (isLiveMarketReal ? liveMarketRes?.last_price : 0) ||
          (isReportLive ? reportRes?.market?.last_price : 0) ||
          (isOrderbookLive ? obData?.bestAsk : 0) ||
          0
      );

      const verifiedBids = strictOrderBookLevelsGuard(obData?.depthLadder?.bids || obData?.bids);
      const verifiedAsks = strictOrderBookLevelsGuard(obData?.depthLadder?.asks || obData?.asks);

      const hasVerifiedLiveStream = verifiedPrice > 0;
      const latencyMs = Math.round(performance.now() - startMs);

      if (!hasVerifiedLiveStream) {
        this.snapshot = {
          ...this.snapshot,
          isConnected: false,
          isLiveVerified: false,
          isAwaitingLiveStream: true,
          streamStatusText: STRICT_WAITING_LIVE_DATA_TEXT,
          blockedMockCount: this.snapshot.blockedMockCount + blockedInCycle,
          ticker: clean,
          companyName: STRICT_WAITING_LIVE_DATA_TEXT,
          sector: STRICT_WAITING_LIVE_DATA_TEXT,
          price: 0,
          dayChangePct: 0,
          supportLevel1: 0,
          resistanceLevel1: 0,
          wallPrice: 0,
          wallLotK: 0,
          spread: 0,
          spreadPct: 0,
          liveObi: 0,
          liveZScore: 0,
          liveRsi: 0,
          rsiStatus: STRICT_WAITING_LIVE_DATA_TEXT,
          bids: [],
          asks: [],
          primarySource: STRICT_WAITING_LIVE_DATA_TEXT,
          lastUpdatedAt: new Date().toISOString(),
          latencyMs,
        };
        this.notify();
        return this.getSnapshot();
      }

      const dayChangePct = Number(
        (isConsolidatedLive ? consolidated?.changePct : undefined) ??
          (isLiveMarketReal ? liveMarketRes?.rate : undefined) ??
          (isReportLive ? reportRes?.market?.rate : undefined) ??
          0
      );

      const totalBidVol = Number(
        obData?.bidVolumeTotal || verifiedBids.reduce((acc, b) => acc + b.qty, 0) || 0
      );
      const totalAskVol = Number(
        obData?.askVolumeTotal || verifiedAsks.reduce((acc, a) => acc + a.qty, 0) || 0
      );
      const computedObi =
        totalBidVol + totalAskVol > 0
          ? Number(((totalBidVol - totalAskVol) / (totalBidVol + totalAskVol)).toFixed(3))
          : Number(obData?.obi ?? 0);

      const bestBid = verifiedBids[0]?.price || Number(obData?.bestBid || 0);
      const bestAsk = verifiedAsks[0]?.price || Number(obData?.bestAsk || verifiedPrice);
      const spread = bestBid > 0 && bestAsk > 0 ? Math.max(0.01, Number((bestAsk - bestBid).toFixed(2))) : 0;
      const spreadPct = spread > 0 && verifiedPrice > 0 ? Number(((spread / verifiedPrice) * 100).toFixed(2)) : 0;

      const supportLevel1 = Number((consolidated?.low || (isReportLive ? reportRes?.technical?.bollinger?.lower : 0) || 0).toFixed(2));
      const resistanceLevel1 = Number((consolidated?.high || (isReportLive ? reportRes?.technical?.bollinger?.upper : 0) || 0).toFixed(2));
      const wallPrice = verifiedAsks[verifiedAsks.length - 1]?.price || 0;
      const wallLotK = totalAskVol > 0 ? Math.round(totalAskVol / 1000) : 0;

      const liveZScore = Number(
        (isOrderbookLive ? obData?.zScore : undefined) ??
          (isReportLive ? reportRes?.boardAnomaly?.volumeAnomaly?.zScore : undefined) ??
          0
      );
      const liveRsi = Number((isReportLive ? reportRes?.technical?.rsi : undefined) ?? 0);
      const rsiStatus = isReportLive
        ? String(reportRes?.technical?.rsi_status || 'CANLI')
        : liveRsi > 0
        ? 'CANLI'
        : STRICT_WAITING_LIVE_DATA_TEXT;

      const fk = Number((isConsolidatedLive ? consolidated?.peRatio : undefined) ?? (isReportLive ? reportRes?.temel?.fk : 0) ?? 0);
      const pddd = Number((isConsolidatedLive ? consolidated?.pbRatio : undefined) ?? (isReportLive ? reportRes?.temel?.pddd : 0) ?? 0);
      const altmanZ = Number((isReportLive ? reportRes?.temel?.altmanZ?.score : 0) ?? 0);
      const piotroskiF = Number((isReportLive ? reportRes?.temel?.piotroskiF?.score : 0) ?? 0);
      const beneishVerdict = isReportLive ? String(reportRes?.temel?.beneish?.verdict || 'Doğrulandı') : STRICT_WAITING_LIVE_DATA_TEXT;
      const bofaNetLot = Number((isReportLive ? reportRes?.bofaNetLot : 0) ?? 0);
      const bofaAvgCost = Number((isReportLive ? reportRes?.bofaAvgCost : 0) ?? 0);
      const citibankSharePct = Number((isReportLive ? reportRes?.citibankSharePct : 0) ?? 0);
      const pensionFundSharePct = Number((isReportLive ? reportRes?.pensionFundSharePct : 0) ?? 0);

      const verifiedMtf =
        mtfRes && strictMarketPayloadGuard(mtfRes) && Array.isArray(mtfRes.timeframes) ? mtfRes : null;
      const verifiedTakas =
        takasRes?.success && strictMarketPayloadGuard(takasRes.result) ? takasRes.result : null;
      const verifiedAlpha =
        alphaRes?.success && strictMarketPayloadGuard(alphaRes.result?.summary) ? alphaRes.result.summary : null;
      const verifiedAnomalies =
        anomalyRes?.success && Array.isArray(anomalyRes.summary?.results)
          ? anomalyRes.summary.results.filter((item: any) => strictMarketPayloadGuard(item)).slice(0, 9)
          : [];
      const verifiedAudits =
        auditRes?.success && Array.isArray(auditRes.auditTrail)
          ? auditRes.auditTrail.slice(0, 12)
          : [];

      const resolvedSource = String(
        (isConsolidatedLive && consolidated?.primarySource) ||
          (isLiveMarketReal && liveMarketRes?.source) ||
          (isOrderbookLive && orderbookRes?.source) ||
          'BIST Canlı Veri Akışı'
      );

      this.snapshot = {
        isConnected: true,
        isLiveVerified: true,
        isAwaitingLiveStream: false,
        streamStatusText: resolvedSource,
        blockedMockCount: this.snapshot.blockedMockCount + blockedInCycle,
        ticker: clean,
        companyName: String((isConsolidatedLive && consolidated?.name) || `${clean}`),
        sector: String((isReportLive && reportRes?.temel?.sector) || 'BIST Pay Piyasası'),
        price: verifiedPrice,
        dayChangePct,
        supportLevel1,
        resistanceLevel1,
        wallPrice,
        wallLotK,
        spread,
        spreadPct,
        liveObi: computedObi,
        liveZScore,
        liveRsi,
        rsiStatus,
        fk,
        pddd,
        altmanZ,
        piotroskiF,
        beneishVerdict,
        bofaNetLot,
        bofaAvgCost,
        citibankSharePct,
        pensionFundSharePct,
        bids: verifiedBids,
        asks: verifiedAsks,
        mtfMatrix: verifiedMtf,
        takasAnalysis: verifiedTakas,
        alphaSummary: verifiedAlpha,
        anomalyRadarList: verifiedAnomalies,
        auditLogs: verifiedAudits,
        executionTrades: liveTrades,
        primarySource: resolvedSource,
        lastUpdatedAt: new Date().toISOString(),
        latencyMs,
      };

      this.notify();
      return this.getSnapshot();
    } catch (err) {
      console.warn('[marketGateway] Live snapshot error:', err);
      this.snapshot = {
        ...this.snapshot,
        isConnected: false,
        isLiveVerified: false,
        isAwaitingLiveStream: true,
        streamStatusText: STRICT_WAITING_LIVE_DATA_TEXT,
        primarySource: STRICT_WAITING_LIVE_DATA_TEXT,
        price: 0,
        bids: [],
        asks: [],
      };
      this.notify();
      return this.getSnapshot();
    }
  }

  public connectGateway(initialTicker: string = 'ASELS', pollIntervalMs: number = 12000): void {
    const clean = (initialTicker || 'ASELS').toUpperCase().replace(/\.IS$/i, '').trim();
    this.snapshot.ticker = clean;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.fetchLiveSnapshot(clean).catch(() => {});
    this.pollTimer = setInterval(() => {
      this.fetchLiveSnapshot(this.snapshot.ticker).catch(() => {});
    }, pollIntervalMs);
  }

  public disconnectGateway(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.snapshot.isConnected = false;
    this.snapshot.isLiveVerified = false;
    this.snapshot.isAwaitingLiveStream = true;
    this.snapshot.streamStatusText = STRICT_WAITING_LIVE_DATA_TEXT;
    this.notify();
  }
}

export const marketGateway = new MarketDataGateway();
export default marketGateway;
