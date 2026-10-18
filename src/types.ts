export interface MarketDataInput {
  ticker: string;
  closingPrice: number;
  dayChangePct: number;
  prevClose?: number;
  spotPrice?: number;
  depthBidTotal: number;
  depthAskTotal: number;
  dominantWallLot: number;
  dominantWallPrice: number;
  dominantWallType: 'ASK' | 'BID';
  supportLevel1: number;
  supportLevel2: number;
  resistanceLevel1: number;
  resistanceLevel2: number;
  bofaNetLot: number;
  bofaAvgCost: number;
  bofaSharePct?: number; // BofA Takas / Aracı Kurum Payı %
  citibankSharePct: number;
  citibankChange30d: number;
  citibankChange7d?: number; // Haftalık (WoW) Takas % Değişimi
  pensionFundSharePct: number;
  pensionFundChange7d?: number; // Haftalık (WoW) Takas % Değişimi
  bofaChange7d?: number; // Haftalık (WoW) BofA Net Akış % Değişimi
  retailSellerRatio: number; // e.g. 62 (%)
  retailBuyerRatio: number; // e.g. 38 (%)
  theoreticalMatchPrice?: number; // 09:55 Canlı teorik eşleşme fiyatı
  volume?: number; // Günlük işlem hacmi
  volume24h?: number;
  hhiScore?: number;
  top3SharePct?: number;
  rsi?: number;
  macd?: number;
  technicalIndicators?: any;
  supertrend?: string;
  isLive?: boolean;
  lastLiveUpdate?: string;
  timestamp?: string;
  notes?: string;
  simulationMeta?: DepthSimulationMeta;
  historicalCloses?: number[]; // Mock veya gerçek geçmiş günlük kapanış fiyatları (RSI & MACD için)
  jury_history?: JuryHistoryRecord[]; // 14 günlük jüri duygu, teknik, takas ve bileşik performans geçmişi
  marketSession?: 'OPEN' | 'CLOSED' | 'PRE_MARKET';
  isTradeable?: boolean;
}

export interface JuryHistoryRecord {
  date: string;
  duygu: number;
  teknik: number;
  takas: number;
  bilesik: number;
}

export interface DailyPriceRangeRecord {
  date: string;
  isoDate?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  rangeTL: number; // high - low
  volatilityPct: number; // ((high - low) / close) * 100
  sma20?: number;
  atr14?: number;
  changePct: number;
}

export interface PriceRangeVolatilitySummary {
  ticker: string;
  records: DailyPriceRangeRecord[];
  avgRangeTL: number;
  avgVolatilityPct: number;
  currentRangeTL: number;
  currentVolatilityPct: number;
  volatilityRegime: 'SIKIŞMA' | 'NORMAL' | 'YÜKSEK_VOLATİLİTE';
  volatilityRegimeLabel: string;
  trendStrengthScore: number; // 0 - 100
  trendStrengthLabel: string;
  trendDirection: 'YÜKSELİŞ' | 'NÖTR' | 'DÜŞÜŞ';
  periodHigh: number;
  periodLow: number;
  currentPositionInPeriodPct: number;
  insightForAnalystB: string;
}

export interface TechnicalIndicatorsResult {
  rsi14: number;
  rsiStatus: 'AŞIRI_ALIM' | 'POZİTİF_MOMENTUM' | 'NÖTR_BÖLGE' | 'ZAYIF_MOMENTUM' | 'AŞIRI_SATIM';
  rsiLabel: string;
  rsiSentiment: 'positive' | 'neutral' | 'negative';
  
  macdLine: number;
  signalLine: number;
  macdHistogram: number;
  macdSignal: 'AL' | 'SAT' | 'NÖTR';
  macdLabel: string;
  macdSentiment: 'positive' | 'neutral' | 'negative';

  historicalCloses: { date: string; close: number }[];
  technicalScore: number; // 0 - 100
  summarySentence: string;
}

export interface ShareholdingTrendItem {
  institution: string;
  fullName: string;
  currentSharePct: number;
  wowChangePct: number;
  prevWeekSharePct: number;
  trendType: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  trendLabel: string;
  flowDescription: string;
}

export interface RiskResult {
  stopLoss: number
  takeProfit: number
  takeProfitFinal: number
  riskReward: number
  stopReason: string
  strategy: "AL" | "BEKLE" | "SAT"
}

export interface TakasData {
  meta: {
    last_update: string
    generated_at: string
    data_age_minutes: number
    is_stale: boolean
    market_status: string
    data_status: string
  }
  takas_data: {
    deutsche_bank: { from: string; to: string }
    emeklilik_fonlari: { from_lot: string; to_lot: string }
    citibank: { share: string }
  } | null
}

export type PriceAlertLevelType = 'SUPPORT' | 'RESISTANCE' | 'WALL' | 'BOFA_COST' | 'THEORETICAL_0955' | 'CUSTOM';
export type PriceAlertMetric = 'CLOSING' | 'THEORETICAL_0955';
export type PriceAlertCondition = 'ABOVE' | 'BELOW' | 'CROSS';

export interface CustomPriceAlert {
  id: string;
  ticker: string;
  label: string;
  levelType: PriceAlertLevelType;
  targetPrice: number;
  metric: PriceAlertMetric;
  condition: PriceAlertCondition;
  enabled: boolean;
  createdAt: number;
  lastTriggeredAt?: number;
  lastTriggeredPrice?: number;
  isTriggered?: boolean;
  notes?: string;
}

export interface TriggeredAlertEvent {
  id: string;
  alertId: string;
  ticker: string;
  label: string;
  levelType: PriceAlertLevelType;
  targetPrice: number;
  actualPrice: number;
  condition: PriceAlertCondition;
  timestamp: number;
  formattedTime: string;
  message: string;
}

export interface PriceThresholdAlert {
  ticker: string;
  thresholdPrice: number;
  condition: 'ABOVE' | 'BELOW' | 'CROSS';
  enabled: boolean;
  lastTriggeredPrice?: number;
  lastTriggeredAt?: number;
}

export interface TheorikData {
  fiyat: number;
  saat: string;
  bofaMaliyet: number;
  fark: number;
  duvar: { fiyat: number; lot: number; durum: string };
}

export interface TickerNote {
  ticker: string;
  content: string;
  updatedAt: string;
  tags?: string[];
}

export interface MetricBadge {
  label: string;
  value: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface AnalystPerspective {
  id: 'A' | 'B' | 'C';
  name: string;
  label: string;
  focus: string;
  bullPct: number;
  neutralPct: number;
  bearPct: number;
  keyMetrics: MetricBadge[];
  analysisPoints: string[];
  verdict: 'YÜKSELİŞ' | 'NÖTR' | 'DÜŞÜŞ';
  technicalIndicators?: TechnicalIndicatorsResult;
  priceRangeVolatility?: PriceRangeVolatilitySummary;
}

export interface DecisionScenario {
  id: string;
  scenarioName: string;
  scenarioType: 'BULL' | 'NEUTRAL' | 'BEAR';
  triggerLevel: string;
  action: string;
  invalidationLevel: string;
  probability: number;
}

export interface JuryReport {
  ticker: string;
  timestamp: string;
  marketData: MarketDataInput;
  analystA: AnalystPerspective;
  analystB: AnalystPerspective;
  analystC: AnalystPerspective;
  technicalIndicators?: TechnicalIndicatorsResult;
  priceRangeVolatility?: PriceRangeVolatilitySummary;
  consensusProbabilities: {
    bullPct: number;
    neutralPct: number;
    bearPct: number;
    dominantSentiment: 'BOĞA' | 'NÖTR' | 'AYI';
  };
  risk?: RiskResult;
  decisionMatrix: DecisionScenario[];
  preMarket0955Watch: string; // The crucial single sentence
  isAiGenerated?: boolean;
  modelWeights?: ModelWeightConfig;
  weightedScore?: number;
  finalDecision?: 'AL' | 'SAT' | 'BEKLE';
  // Aliases for diverse hook/component naming
  weighted_score?: number;
  karar?: string;
  guven?: number;
  breakdown?: Record<string, number>;
  blackboard?: Record<string, string>;
}

export interface ModelWeightItem {
  name: string;
  weight: number;
  description: string;
}

export interface ModelWeightConfig {
  sentiment: ModelWeightItem;
  technical: ModelWeightItem;
  flow: ModelWeightItem;
  [key: string]: ModelWeightItem;
}

// === KULLANICI AYARLI AĞIRLIKLAR ===
export type UserWeightConfig = {
  sentiment: number; // 0.10 - 0.60
  technical: number;
  flow: number;
};

export const DEFAULT_WEIGHTS: UserWeightConfig = {
  sentiment: 0.25,
  technical: 0.35,
  flow: 0.40,
};

export const WEIGHT_PRESETS: Record<string, UserWeightConfig> = {
  "Denge": { sentiment: 0.25, technical: 0.35, flow: 0.40 },
  "Muhafazakar": { sentiment: 0.20, technical: 0.30, flow: 0.50 },
  "Agresif": { sentiment: 0.15, technical: 0.50, flow: 0.35 },
  "Duygucu": { sentiment: 0.40, technical: 0.30, flow: 0.30 },
};

export function normalizeWeights(w: UserWeightConfig): UserWeightConfig {
  const sum = w.sentiment + w.technical + w.flow;
  if (sum === 0) return DEFAULT_WEIGHTS;
  return {
    sentiment: Number((w.sentiment / sum).toFixed(4)),
    technical: Number((w.technical / sum).toFixed(4)),
    flow: Number((w.flow / sum).toFixed(4)),
  };
}

// ============================================================
// SHAP-VARI KARAR AÇIKLAMA MOTORU TİPLERİ
// ============================================================

export interface ModelContribution {
  modelId: 'sentiment' | 'technical' | 'flow';
  modelName: string;
  weight: number;        // 0.25 gibi
  puan: number;          // 0-100
  katki: number;         // puan * weight
  verdict: 'AL' | 'SAT' | 'BEKLE';
  veto: boolean;         // Bu model AL kararını bloke etti mi?
  vetoReason?: string;   // "MACD negatif + RSI < 45"
  supportingMetrics: Array<{ label: string; value: string; positive: boolean }>;
  // YENİ: Sentiment için ek detay alanları
  sentimentDetails?: {
    source: 'gemini' | 'keyword-fallback' | 'retail-only';
    newsSentimentPct: number;    // 0-100
    retailSentimentPct: number;  // 0-100
    sampleSize: number;          // kaç haber analiz edildi
    combinedFormula: string;     // "0.60 × 78 + 0.40 × 53 = 68"
  };
}

export interface DecisionSimulation {
  currentDecision: 'AL' | 'SAT' | 'BEKLE';
  toAL: string | null;       // "Teknik puanı 60 olmalı (şimdi 35)"
  toSAT: string | null;      // "Zaten SAT eşiğinde"
  toBEKLE: string | null;    // "weightedScore 40-70 arasında olmalı"
  minWeightsForAL: {
    sentiment: number;
    technical: number;
    flow: number;
  } | null;
}

export interface DecisionExplanation {
  ticker: string;
  finalDecision: 'AL' | 'SAT' | 'BEKLE';
  weightedScore: number;
  ruleFired: string;      // "weightedScore (39) < 40 && Teknik SAT → SAT"
  contributions: ModelContribution[];
  simulation: DecisionSimulation;
  warnings: string[];
  dataQuality: {
    backtestSampleSize: number;
    isBacktestReliable: boolean;
    isDepthSynthetic: boolean;
    priceSource: string;
  };
  summary: string;        // Tek cümlelik özet
}

// ============================================================
// SENTIMENT ANALİZİ SONUCU (Gemini FinBERT)
// ============================================================
export interface SentimentAnalysisResult {
  ticker: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;               // 0-100
  reason: string;
  perHeadline: Array<{
    index: number;
    score: number;
    verdict: 'positive' | 'neutral' | 'negative';
    note: string;
  }>;
  source: 'gemini' | 'keyword-fallback' | 'retail-only';
  sampleSize: number;
  cached?: boolean;
}

// ============================================================
// DERİNLİK SNAPSHOT TİPLERİ (Dinamik Kademe)
// ============================================================
export interface DepthLevel {
  price: number;
  lot: number;
  orderCount: number;
}

export interface DepthSimulationMeta {
  bofaNetLot: number;
  bofaNormalized: number;
  citibankChange30d: number;
  citiNormalized: number;
  pensionFundChange7d: number;
  pensionNormalized: number;
  dominantSource: string;
  activeMultipliers: {
    buy: number;
    sell: number;
  };
}

export interface DepthSnapshot {
  buyLadder: DepthLevel[];
  sellLadder: DepthLevel[];
  total_buy: number;
  total_sell: number;
  ratio: number;
  is_synthetic: boolean;
  dominantWallPrice?: number;
  dominantWallLot?: number;
  isWallReal?: boolean;
  simulationMeta?: DepthSimulationMeta;
}


