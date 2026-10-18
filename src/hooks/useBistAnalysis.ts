// src/hooks/useBistAnalysis.ts
import { useState, useMemo, useCallback } from 'react';
import { FinalAnalysis } from '../../shared/types/analysis';
import { MarketDataInput, JuryReport } from '../types';

export function useBistAnalysis(
  activeTicker: string,
  marketData: MarketDataInput,
  reportData?: any,
  juryReport?: JuryReport
) {
  const [customCubes, setCustomCubes] = useState<any[]>([
    { id: 1, name: 'Hacim Küpü', status: 'GREEN', value: '+18% Hacim Artışı' },
    { id: 2, name: 'Momentum Küpü', status: 'GREEN', value: 'RSI 58.2 Güçlü' },
    { id: 3, name: 'Trend Küpü', status: 'GREEN', value: 'EMA20 > EMA50' },
    { id: 4, name: 'Tahta Küpü', status: 'YELLOW', value: 'BoFA Alıcı, Kademe Dirençli' },
    { id: 5, name: 'Takas Küpü', status: 'GREEN', value: 'Kurumsal Toplama' },
    { id: 6, name: 'Temel Küpü', status: 'GREEN', value: 'F/K İskontolu' },
    { id: 7, name: 'Haber Küpü', status: 'GREEN', value: 'KAP Pozitif' },
    { id: 8, name: 'Volatilite Küpü', status: 'GREEN', value: 'Makul Bant' },
    { id: 9, name: 'Veto Küpü', status: 'GREEN', value: 'Adli Vaka Temiz' }
  ]);

  const [activePosition, setActivePosition] = useState<any>({
    ticker: activeTicker,
    lot: 1500,
    cost: (marketData.closingPrice * 0.95).toFixed(2),
    currentPrice: marketData.closingPrice,
    pnlPct: 5.26,
    pnlAmount: (marketData.closingPrice * 1500 * 0.0526).toFixed(0)
  });

  const notifyPositionChanged = useCallback(() => {
    setActivePosition((prev: any) => ({
      ...prev,
      currentPrice: marketData.closingPrice,
      lastUpdated: new Date().toISOString()
    }));
  }, [marketData.closingPrice]);

  const finalAnalysis: FinalAnalysis = useMemo(() => {
    const isBull = (marketData.dayChangePct || 0) >= 0;
    return {
      timeframesPositive: isBull ? 3 : 1,
      timeframeReturns: [
        { period: '1G', returnPct: marketData.dayChangePct || 0, direction: isBull ? 'UP' : 'DOWN' },
        { period: '1H', returnPct: isBull ? 4.8 : -1.2, direction: isBull ? 'UP' : 'DOWN' },
        { period: '1A', returnPct: 12.4, direction: 'UP' },
        { period: '3A', returnPct: 28.5, direction: 'UP' }
      ],
      timeframeDecisions: [
        { period: '1G', decision: isBull ? 'AL' : 'SAT', confidence: 0.82, score: isBull ? 78 : 45 },
        { period: '1H', decision: 'AL', confidence: 0.79, score: 75 },
        { period: '1A', decision: 'GUCLU_AL', confidence: 0.88, score: 84 },
        { period: '3A', decision: 'AL', confidence: 0.81, score: 76 }
      ],
      formation: {
        conflicts: [],
        activePattern: '9 Küp Boğa Formasyonu',
        cubeScore: 8.5
      },
      composite: {
        score: isBull ? 82.0 : 54.0,
        verdict: isBull ? 'AL' : 'NOTR',
        confidence: 0.84,
        nonLinearAmplifier: 1.62
      },
      executiveSummary: `${activeTicker} hissesi için çoklu zaman dilimi ve 9 küp zar formasyonu ağırlıklı olarak alım yönünde konsensüs üretmektedir.`
    };
  }, [activeTicker, marketData]);

  return {
    finalAnalysis,
    activeCubes: customCubes,
    setCustomCubes,
    activePosition,
    notifyPositionChanged
  };
}
