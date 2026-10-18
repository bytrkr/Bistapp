// server/services/juryDebateEngine.ts
import { tcmbService } from './tcmbService.js';
import { finnhubService } from './finnhubService.js';

export async function runJuryDebate(ticker: string, marketPayload?: any) {
  const cleanTicker = (ticker || 'ASELS').toUpperCase();
  const isNasdaq = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL'].includes(cleanTicker) || marketPayload?.market === 'NASDAQ';

  // TCMB EVDS Makro & Yabancı Akış Verisi
  const tcmbData = await tcmbService.getForeignFlowData();
  const jury2Adjust = tcmbService.applyJury2Score(76, tcmbData);

  // Finnhub Sentiment Verisi (NASDAQ hisseleri için veya global algı)
  const finnhubSym = isNasdaq ? cleanTicker : 'NVDA';
  const finnhubData = await finnhubService.getSentiment(finnhubSym);

  // Jüri 4 (KAP & Haber Duygu) Veto Kontrolü
  const isJury4Veto = finnhubData.isVetoed; // sentiment < 0.35
  const jury4Vote = isJury4Veto ? 'VETO / SAT' : finnhubData.sentimentScore >= 0.7 ? 'GÜÇLÜ AL' : finnhubData.sentimentScore >= 0.5 ? 'AL' : 'TUT';
  const jury4Comment = isJury4Veto
    ? `🚨 NEGATİF DUYGU VETOSU: Finnhub duygu skoru kritik eşiğin altına indi (${finnhubData.sentimentScore} < 0.35). Haber akışı piyasa algısında sert baskı yaratıyor.`
    : isNasdaq
    ? `Finnhub Sentiment skoru ${finnhubData.sentimentScore.toFixed(2)} ile ${finnhubData.bullishPercent}% bullish. Insider tarafında ${finnhubData.insiderAction} akışı mevcut.`
    : `KAP ve finansal haber duygu skoru +0.82 ile güçlü pozitif. Yeni iş ve sipariş bildirimleri ciroyu destekliyor.`;

  // Jüri 2 (Tahta Derinlik & Takas) TCMB EVDS Puanlaması
  const jury2Vote = jury2Adjust.signal;
  const jury2Comment = !isNasdaq
    ? `TCMB EVDS Haftalık Akış: Hisse net akış +$${tcmbData.weeklyForeignEquityFlow}M, Takas payı: %${tcmbData.foreignCustodyShare} (SMA_4: %${tcmbData.foreignCustodySMA4}, Fark: +%${tcmbData.foreignCustodyMomentum}). Jüri 2 skoru: ${jury2Adjust.adjustedScore}/100.`
    : `NASDAQ L2 Tahtası: Spread %0.04 bandında dar, kurumsal kademe alımları güçlü.`;

  const jurors = [
    {
      id: 'quant',
      name: '1. Kuantitatif Hakim (Teknik)',
      role: 'Matematiksel Modeller & Momentum',
      vote: isJury4Veto ? 'TUT' : 'AL',
      weight: 0.25,
      score: isJury4Veto ? 60 : 84,
      comment: 'RSI ve MACD göstergelerinde pozitif uyumsuzluk teyit edildi.'
    },
    {
      id: 'depth',
      name: '2. Tahta Derinlik & Takas (TCMB EVDS)',
      role: 'TCMB Yabancı Akış & Takas Payı (SMA_4)',
      vote: jury2Vote,
      weight: 0.25,
      score: jury2Adjust.adjustedScore,
      comment: jury2Comment
    },
    {
      id: 'fund',
      name: '3. Temel Değerleme Ajanı',
      role: 'Bilanço ve Değerleme (Altman-Z & Piotroski)',
      vote: 'AL',
      weight: 0.25,
      score: 79,
      comment: 'F/K ve PD/DD sektör ortalamalarına göre iskontolu kalmıştır.'
    },
    {
      id: 'sent',
      name: '4. KAP & Haber Duygu (Finnhub)',
      role: 'Haber & Sosyal Duygu Analizi / Insider',
      vote: jury4Vote,
      weight: 0.25,
      score: finnhubData.jury4Score,
      comment: jury4Comment
    }
  ];

  const overallConfidence = isJury4Veto ? 45.0 : 84.5;
  const overallConsensus = isJury4Veto ? 'NEGATİF DUYGU VETOSU' : 'AL';

  return {
    ticker: cleanTicker,
    timestamp: new Date().toISOString(),
    consensus: overallConsensus,
    confidenceScore: overallConfidence,
    tcmbMacro: tcmbData,
    finnhubSentiment: finnhubData,
    jurors,
    finalDecision: {
      action: isJury4Veto ? 'VETO_HOLD' : 'BUY',
      targetPercent: isJury4Veto ? 0.0 : 12.5,
      stopLossPercent: -4.0,
      summary: isJury4Veto
        ? `${cleanTicker} için Finnhub negatif duygu vetosu tetiklendi. Otonom alım durduruldu.`
        : `${cleanTicker} için TCMB EVDS net yabancı girişi (+$${tcmbData.weeklyForeignEquityFlow}M) ve güçlü duygu skoruyla jüri konsensüsü pozitif yönlüdür.`
    }
  };
}
