/**
 * BistApp MT16 Kuant Jüri Karar Veri Sözleşmesi (TypeScript Interface)
 * schemas/jury_decision_schema.json ile %100 uyumludur.
 */

export type JuryVerdict = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface JuryDecisionPayload {
  /** Varlık kodu (Örn: THYAO, BTCUSDT) */
  ticker: string;
  
  /** Nihai jüri kararı */
  verdict: JuryVerdict;
  
  /** Karar güven skoru (0-100) */
  confidenceScore: number;
  
  /** Önerilen giriş fiyat bölgesi */
  entryZone: string;
  
  /** Hedef fiyat seviyesi */
  targetPrice: string;
  
  /** Zarar kes (Stop-loss) seviyesi */
  stopLoss: string;
  
  /** İşlem sırasında tetiklenen veya aktif olan kalkanlar */
  activeShields: string[];
  
  /** Jürinin detaylı karar gerekçesi */
  reasoning: string;
  
  /** Karar üretim zaman damgası (ISO 8601) */
  timestamp?: string;
}
