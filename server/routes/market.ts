import { Router, Request, Response } from 'express';
import { botCache } from '../bots/types.js';
import { botManager } from '../bots/BotManager.js';
import { analyzeAkdImage } from '../utils/ocrAnalyzer.js';
import { MarketDataService } from '../services/marketDataService.js';

const router = Router();

/**
 * GET /api/market/prices
 * Yahoo ve Google Finance çapraz doğrulamalı hibrit piyasa fiyatlarını döner.
 */
router.get('/prices', (_req: Request, res: Response) => {
  const consolidated = MarketDataService.getAllConsolidatedPrices();
  return res.json({
    success: true,
    count: consolidated.length,
    data: consolidated,
  });
});

/**
 * GET /api/market/prices/:ticker
 * Belirli hissenin çapraz doğrulanmış hibrit fiyat, F/K, PD/DD ve 52 haftalık aralık verisini döner.
 */
router.get('/prices/:ticker', (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').toUpperCase().replace(/\.IS$/i, '').trim();
  const consolidated = MarketDataService.getConsolidatedPrice(ticker);

  if (consolidated) {
    return res.json({
      success: true,
      data: consolidated,
    });
  }

  return res.status(404).json({
    success: false,
    message: `${ticker} için konsolide fiyat verisi bulunamadı.`,
  });
});

/**
 * GET /api/market/google-prices
 * GoogleFinanceBot tarafından IST:SYMBOL biçiminde toplanan saf Google verilerini döner.
 */
router.get('/google-prices', (_req: Request, res: Response) => {
  const googlePrices = botCache.getAllGooglePrices();
  return res.json({
    success: true,
    count: googlePrices.length,
    data: googlePrices,
  });
});

/**
 * GET /api/market/google-prices/:ticker
 * Belirli hissenin saf Google Finance (IST:SYMBOL) verisini döner.
 */
router.get('/google-prices/:ticker', (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').toUpperCase().replace(/\.IS$/i, '').trim();
  const googlePrice = botCache.getGooglePrice(ticker);

  if (googlePrice) {
    return res.json({
      success: true,
      data: googlePrice,
    });
  }

  return res.status(404).json({
    success: false,
    message: `${ticker} için Google Finance verisi bulunamadı.`,
  });
});

/**
 * GET /api/market/signals
 * TradingViewScannerBot tarafından derlenen teknik indikatör ve sinyal skorlarını döner.
 */
router.get('/signals', (_req: Request, res: Response) => {
  const signals = botCache.getAllSignals();
  return res.json({
    success: true,
    count: signals.length,
    data: signals,
  });
});

/**
 * GET /api/market/signals/:ticker
 * Belirli bir hissenin anlık teknik sinyalini döner.
 */
router.get('/signals/:ticker', (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').toUpperCase().replace(/\.IS$/i, '').trim();
  const signal = botCache.getSignal(ticker);

  if (signal) {
    return res.json({
      success: true,
      data: signal,
    });
  }

  return res.status(404).json({
    success: false,
    message: `${ticker} için bot önbelleğinde henüz sinyal bulunamadı.`,
  });
});

/**
 * GET /api/market/sentiment
 * XSentimentBot tarafından toplanan tüm hisselerin sosyal duyarlılık verilerini döner.
 */
router.get('/sentiment', (_req: Request, res: Response) => {
  const sentiments = botCache.getAllSentiments();
  const allSimulated = sentiments.length === 0 || sentiments.every((s) => s.isSimulated !== false);
  return res.json({
    success: true,
    count: sentiments.length,
    is_live: !allSimulated,
    is_simulated: allSimulated,
    data_source: allSimulated ? 'SIMULATED' : 'REALTIME_TWITTER',
    simulation_warning: allSimulated ? '⚠️ Simüle Veri: Canlı sosyal medya veri sağlayıcısına (JIRO/X) ulaşılamıyor.' : '',
    data: sentiments,
  });
});

/**
 * GET /api/market/sentiment/:ticker
 * Belirli bir hissenin sosyal ilgi skoru, Boğa/Ayı dengesi ve topluluk AKD OCR özetini sunar.
 */
router.get('/sentiment/:ticker', (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').toUpperCase().replace(/\.IS$/i, '').trim();
  const sentiment = botCache.getSentiment(ticker);

  if (sentiment) {
    return res.json({
      success: true,
      data: sentiment,
      is_live: sentiment.isLive ?? false,
      is_simulated: sentiment.isSimulated ?? true,
      data_source: sentiment.dataSource ?? 'SIMULATED',
      simulation_warning: sentiment.simulationWarning ?? '⚠️ Simüle Veri: Canlı X/Twitter veya JIRO bağlantısı bulunamadı.',
    });
  }

  return res.status(404).json({
    success: false,
    message: `${ticker} için sosyal duyarlılık verisi henüz toplanmadı.`,
  });
});

/**
 * POST /api/market/akd/ocr
 * Kullanıcı veya bot tarafından iletilen AKD görselini Vision LLM/OCR ile analiz eder.
 */
router.post('/akd/ocr', async (req: Request, res: Response) => {
  try {
    const { image, ticker = 'ASELS' } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz istek: Base64 veya URL formatında "image" parametresi zorunludur.',
      });
    }

    const result = await analyzeAkdImage(image, ticker);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'AKD OCR analizi sırasında bir hata oluştu.',
    });
  }
});

/**
 * GET /api/market/bots/health
 * Veri toplayıcı 4 botun sağlık durumunu ve önbellek istatistiklerini döner.
 */
router.get('/bots/health', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: botManager.getHealth(),
  });
});

export default router;
