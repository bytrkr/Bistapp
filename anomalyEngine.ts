// anomalyEngine.ts - Sanitize Edilmis Kuant Motoru

export interface AnomalyInput {
  symbol: string;
  currentVolume: number;
  volumeHistory: number[];
  bidVolumes: number[];
  askVolumes: number[];
}

export interface AnomalyResult {
  symbol: string;
  zScore: number;
  status: 'YETERSIZ_VERI' | 'NORMAL' | 'DIKKAT' | 'ANORMAL_HACIM_PATLAMASI';
  verdict: string;
  isAnomaly: boolean;
}

export class AnomalyEngine {
  public static calculateZScore(currentVol: number, history: number[]): { zScore: number; status: string } {
    if (!history || history.length < 20) {
      return { zScore: 0.0, status: 'YETERSIZ_VERI' };
    }

    const sum = history.reduce((acc, val) => acc + val, 0);
    const mean = sum / history.length;

    const variance = history.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / history.length;
    let stdDev = Math.sqrt(variance);

    const minStdDev = mean * 0.15;
    if (stdDev < minStdDev) {
      stdDev = minStdDev;
    }

    let rawZ = (currentVol - mean) / stdDev;
    const clampedZ = Math.min(Math.max(rawZ, -4.0), 4.0);

    let status = 'NORMAL';
    if (clampedZ >= 3.0) {
      status = 'ANORMAL_HACIM_PATLAMASI';
    } else if (clampedZ >= 1.8) {
      status = 'DIKKAT';
    }

    return {
      zScore: Number(clampedZ.toFixed(2)),
      status: status
    };
  }
}
