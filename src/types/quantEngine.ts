// src/types/quantEngine.ts

export type MarketSector = 'BIST' | 'CRYPTO' | 'NASDAQ';
export type MarketRegime = 'BULL' | 'SIDEWAYS' | 'BEAR' | 'HIGH_VOL';
export type OrderSide = 'BUY' | 'SELL' | 'buy' | 'sell';
export type ExecutionStatus = 'FILLED' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'OPEN' | 'PENDING' | 'REJECTED';

export interface AuditLogEntry {
  auditId: string;
  service: string;
  action: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL' | 'FAILOVER';
  details: string;
  timestamp: string;
}

export interface TrackRecordSummary {
  netPnlUsd: number;
  netPnlPct: number;
  winRatePct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalVolumeUsd: number;
  initialCapitalUsd: number;
  currentPortfolioValueUsd: number;
}

export interface TradeRecordItem {
  executionId: string;
  source: 'ALPACA' | 'BINANCE_TESTNET';
  symbol: string;
  assetType: string;
  side: string;
  notionalUsd: number;
  entryPrice: number;
  exitPriceEstimate: number;
  pnlUsd: number;
  pnlPct: number;
  status: 'FILLED' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'OPEN';
  timeFormatted: string;
  timestamp: number;
  feeUsdt: number;
  riskRewardRatio: string;
}

export interface SignalAlert {
  signalId: string;
  symbol: string;
  market: MarketSector;
  side: string;
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  obi: number;
  zScore: number;
  juryConfidence: number;
  timestamp: string;
}

export interface SignalBotStatus {
  status: string;
  connectedChannels: string[];
  activeWebhooksCount: number;
  lastBroadcastTime: string;
  totalAlertsSentToday: number;
  triggerCriteria: string;
}

export interface TakasVirmanAnalysis {
  ticker: string;
  virmanDetected: boolean;
  arbitrageScore: number;
  notes: string;
  recommendation: string;
}

export interface MonteCarloDayPoint {
  day: number;
  p50Median: number;
  p90Optimistic: number;
  p10Pessimistic: number;
}

export interface InstitutionalRiskMetrics {
  var95Usd: number;
  var95Pct: number;
  expectedShortfallUsd: number;
  kellyCriterionPct: number;
  recommendedPositionSizeUsd: number;
  annualizedVolatilityPct: number;
  monteCarloChart: MonteCarloDayPoint[];
  maxDrawdownRiskPct: number;
}

export interface SocialData {
  ticker: string;
  mentionCount: number;
  sentimentScore: number;
  manipulationRiskScore: number;
  summary: string;
  toon?: string;
  // Python Pydantic (snake_case) uyumluluk alanları
  mention_count?: number;
  sentiment_score?: number;
  manipulation_risk_score?: number;
}

export interface AgentResponse {
  agentId?: string;
  agent_id?: string;
  agentName: string;
  agent_name?: string;
  signal: 'GUCLU_AL' | 'AL' | 'NOTR' | 'SAT' | 'GUCLU_SAT';
  score: number;
  confidence: number;
  reasoning: string;
  keyMetrics?: Record<string, any>;
  key_metrics?: Record<string, any>;
  manipulationRiskScore?: number;
  manipulation_risk_score?: number;
}

export interface FinalDecision {
  ticker: string;
  timestamp: number;
  verdict: 'GUCLU_AL' | 'AL' | 'NOTR' | 'SAT' | 'GUCLU_SAT' | string;
  compositeScore?: number;
  composite_score?: number;
  confidence?: number;
  agentVotes?: Record<string, AgentResponse>;
  agent_votes?: Record<string, AgentResponse>;
  socialData?: SocialData | null;
  social_data?: SocialData | null;
  manipulationRiskScore?: number;
  manipulation_risk_score?: number;
  toon?: string;
  summary?: string;
  coachSummary?: string | null;
  coach_summary?: string | null;
  metadata?: Record<string, any>;
  positionSizing?: any;
  position_sizing?: any;
  portfolioGuardStatus?: any;
  portfolio_guard_status?: any;
  slippageImpact?: any;
  slippage_impact?: any;
  monteCarloProjection?: MonteCarloProjection | null;
  monte_carlo_projection?: MonteCarloProjection | null;
  ragContext?: string | null;
  rag_context?: string | null;
  executionPlan?: ExecutionPlan | null;
  execution_plan?: ExecutionPlan | null;
}

export interface MonteCarloProjection {
  days: number;
  simulations: number;
  startPrice?: number;
  p5: number;
  p50: number;
  p95: number;
  expectedVolatility?: number;
}

export interface OrderSlice {
  slice_id: number;
  sliceId?: number;
  side: 'BUY' | 'SELL' | string;
  quantity: number;
  target_price: number;
  targetPrice?: number;
  order_type: string;
  orderType?: string;
  delay_seconds: number;
  delaySeconds?: number;
  estimated_slippage_bps: number;
  estimatedSlippageBps?: number;
  instruction: string;
}

export interface ExecutionPlan {
  ticker: string;
  side: 'BUY' | 'SELL' | string;
  total_quantity: number;
  totalQuantity?: number;
  current_price: number;
  currentPrice?: number;
  total_notional_tl?: number;
  totalNotionalTl?: number;
  execution_strategy: 'TWAP_ICEBERG_SLICE' | 'DIRECT_EXECUTION' | string;
  executionStrategy?: string;
  strategy_name?: string;
  strategyName?: string;
  top_3_liquidity_qty?: number;
  top3LiquidityQty?: number;
  direct_slippage_pct?: number;
  directSlippagePct?: number;
  optimized_slippage_pct: number;
  optimizedSlippagePct?: number;
  estimated_savings_tl?: number;
  estimatedSavingsTl?: number;
  total_slices: number;
  totalSlices?: number;
  slices: OrderSlice[];
  summary: string;
}

