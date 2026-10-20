import { Router, Request, Response } from 'express';
import { KapService } from '../services/kapService.js';

const router = Router();

/**
 * GET /api/news
 * Tüm BIST30 veya en son KAP bildirimlerini döner.
 * Query parametreleri: ?ticker=ASELS&limit=20&refresh=true
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const ticker = req.query.ticker ? String(req.query.ticker).trim() : '';
    const forceRefresh = req.query.refresh === 'true';
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

    let disclosures = [];

    if (ticker && ticker.toUpperCase() !== 'BIST' && ticker.toUpperCase() !== 'BIST30') {
      disclosures = await KapService.getDisclosuresByTicker(ticker);
    } else {
      disclosures = await KapService.fetchLatestDisclosures(forceRefresh);
    }

    const items = disclosures.slice(0, limit);
    const isLive = items.length > 0 && items.some((it: any) => it.isLive !== false);

    return res.json({
      status: 'SUCCESS',
      count: items.length,
      ticker: ticker || 'ALL',
      is_live: isLive,
      is_simulated: !isLive,
      data_source: isLive ? 'REALTIME_KAP_RSS' : 'SIMULATED',
      simulation_warning: isLive ? '' : '⚠️ Simüle Veri: Canlı KAP bildirim akışına ulaşılamadı.',
      data: items,
      items, // Geriye dönük uyumluluk için items dizisi
    });
  } catch (error: any) {
    console.error('[News API Error]:', error);
    return res.status(500).json({
      status: 'ERROR',
      is_live: false,
      is_simulated: true,
      simulation_warning: '⚠️ Simüle Veri: Haberler getirilirken sunucu hatası oluştu.',
      error: error?.message || 'Haberler getirilirken sunucu hatası oluştu.',
      data: [],
    });
  }
});

/**
 * GET /api/news/:ticker
 * Belirli bir hisse koduna göre filtrelenmiş KAP haberlerini döner.
 */
router.get('/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = String(req.params.ticker || '').trim();
    if (!ticker) {
      return res.status(400).json({
        status: 'ERROR',
        error: 'Hisse kodu (ticker) parametresi zorunludur.',
        data: [],
      });
    }

    const disclosures = await KapService.getDisclosuresByTicker(ticker);
    const isLive = disclosures.length > 0 && disclosures.some((it: any) => it.isLive !== false);

    return res.json({
      status: 'SUCCESS',
      count: disclosures.length,
      ticker: ticker.toUpperCase(),
      is_live: isLive,
      is_simulated: !isLive,
      data_source: isLive ? 'REALTIME_KAP_RSS' : 'SIMULATED',
      simulation_warning: isLive ? '' : '⚠️ Simüle Veri: Canlı KAP bildirim akışına ulaşılamadı.',
      data: disclosures,
      items: disclosures,
    });
  } catch (error: any) {
    console.error(`[News API Ticker ${req.params.ticker} Error]:`, error);
    return res.status(500).json({
      status: 'ERROR',
      error: error?.message || 'Hisseye ait haberler getirilirken hata oluştu.',
      data: [],
    });
  }
});

export default router;
