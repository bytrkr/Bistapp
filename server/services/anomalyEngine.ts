// server/services/anomalyEngine.ts

export type StockSegment = 'DEFANSIF_KALE' | 'ALPHA_RADAR' | 'DENGELI_TAHTA' | 'YILDIZ' | 'ANA' | 'ALT' | 'YAKIN_IZLEME' | string;

export interface VolumeAnomalyInfo {
  zScore: number;
  currentVolume: number;
}

export interface ConcentrationInfo {
  alert: string;
  top3Ratio: number;
  hhi: number;
}

export interface KapCrossCheckInfo {
  riskLevel: string;
  kapCount: number;
  flag: string;
}

export interface BoardAnomalyReport {
  ticker: string;
  segment: StockSegment;
  verdict: string;
  insiderRiskProb: number;
  volumeAnomaly: VolumeAnomalyInfo;
  concentration: ConcentrationInfo;
  kapCrossCheck: KapCrossCheckInfo;
  takasSummary?: {
    agirlikliOrtalamaMaliyet?: number;
  };
  isKaleToAlphaBreakout?: boolean;
  score?: number;
}

export async function analyzeBoardAnomaly(ticker: string): Promise<BoardAnomalyReport> {
  const clean = ticker.toUpperCase().replace(/\.IS$/i, '');
  return {
    ticker: clean,
    segment: 'DENGELI_TAHTA',
    verdict: 'DENGELI_TAHTA',
    insiderRiskProb: 0.12,
    volumeAnomaly: {
      zScore: 1.15,
      currentVolume: 1250000
    },
    concentration: {
      alert: 'NORMAL',
      top3Ratio: 0.42,
      hhi: 1850
    },
    kapCrossCheck: {
      riskLevel: 'NORMAL',
      kapCount: 2,
      flag: 'STANDART'
    },
    takasSummary: {
      agirlikliOrtalamaMaliyet: 48.20
    },
    isKaleToAlphaBreakout: false,
    score: 82.5
  };
}
