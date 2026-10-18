// src/utils/storyCubesEngine.ts
/**
 * MT16 BISTAPP — TEKİLLEŞTİRİLMİŞ 9 KÜP HİKAYE MOTORU (storyCubesEngine.ts)
 * Eski ve yeni versiyonlar tek bir deterministik motor altında birleştirilmiştir.
 * Yalnızca saf 9 küp (Duygu, BofA, Derinlik, Takas, Anomali, Momentum, Vol, Mali, Rejim)
 * verisi, coherence, conflict ve is_poisoned bayrağı döndürür; UI basmaz.
 */

export {
  evaluateStoryCubesEngine,
  type StoryCubeItem,
  type StoryCubesEngineOutput,
} from './tacticalCollector';
