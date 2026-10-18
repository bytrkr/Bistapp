// shared/types/analysis.ts

export interface TimeframeReturnItem {
  period: string;
  returnPct: number;
  direction: 'UP' | 'DOWN' | 'FLAT';
}

export interface TimeframeDecisionItem {
  period: string;
  decision: string;
  confidence: number;
  score: number;
}

export interface FormationConflictItem {
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface FinalAnalysis {
  timeframesPositive: number;
  timeframeReturns: TimeframeReturnItem[];
  timeframeDecisions: TimeframeDecisionItem[];
  formation: {
    conflicts: FormationConflictItem[];
    activePattern?: string;
    cubeScore?: number;
  };
  composite: {
    score: number;
    verdict: string;
    confidence: number;
    nonLinearAmplifier: number;
  };
  executiveSummary?: string;
}
