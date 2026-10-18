// src/utils/anomalyEngine.ts
/**
 * MT16 BISTAPP — SAF ANOMALİ MOTORU (anomalyEngine.ts)
 * Yalnızca saf veri döndürür (hiçbir UI basmaz).
 * BIST için ±1.8σ, CRYPTO ve NASDAQ için ±2.0σ Z-Skor eşiklerini uygular.
 */

export {
  evaluateAnomalyEngine,
  getZScoreThreshold,
  type AnomalyEngineOutput,
  type MarketType,
} from './tacticalCollector';
