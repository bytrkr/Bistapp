// server/types/agentSchemas.ts
import { z } from 'zod';

export type SignalType = 'AL' | 'GUCLU_AL' | 'NOTR' | 'SAT' | 'GUCLU_SAT' | 'VETO_PAS' | string;
export type MarketRegime = 'BULL' | 'BEAR' | 'SIDEWAYS' | 'HIGH_VOL' | 'LOW_VOL' | string;

export const SignalTypeSchema = z.string();
export const MarketRegimeSchema = z.string();

export const AgentResponseSchema = z.object({
  agent_id: z.string().optional(),
  agent_name: z.string().optional(),
  signal: z.string().optional(),
  score: z.number().optional(),
  confidence: z.number().optional(),
  key_metrics: z.record(z.any()).optional(),
  reasoning: z.string().optional(),
  veto_triggered: z.boolean().optional(),
  execution_time_ms: z.number().optional(),
}).passthrough();

export const FinalDecisionSchema = z.object({
  ticker: z.string(),
  timestamp: z.string().optional(),
  market_regime: z.string().optional(),
  composite_score: z.number(),
  verdict: z.string(),
  overall_confidence: z.number().optional(),
  weights_breakdown: z.record(z.number()).optional(),
  agent_responses: z.record(z.any()).optional(),
  debate_rounds: z.array(z.any()).optional(),
  forensic_flags: z.array(z.any()).optional(),
  recommended_action: z.any().optional(),
}).passthrough();

export type FinalDecision = z.infer<typeof FinalDecisionSchema>;

export const BacktestTradeLogSchema = z.object({
  date: z.string().optional(),
  price: z.number().optional(),
  verdict: z.string().optional(),
  composite_score: z.number().optional(),
  debate_occurred: z.boolean().optional(),
  future_price: z.number().optional(),
  return_pct: z.number().optional(),
  is_win: z.boolean().optional(),
  bull_trap_prevented: z.boolean().optional(),
}).passthrough();

export const BacktestResultSchema = z.object({
  ticker: z.string().optional(),
  period_bars: z.number().optional(),
  horizon_days: z.number().optional(),
  metrics: z.record(z.any()).optional(),
  trade_logs: z.array(BacktestTradeLogSchema).optional(),
  agent_memory_summary: z.record(z.any()).optional(),
}).passthrough();

export type BacktestResult = z.infer<typeof BacktestResultSchema>;
