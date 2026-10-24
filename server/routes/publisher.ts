/**
 * BistApp Social Publisher Engine - Express Gateway Route (/api/v1/publisher/broadcast)
 * Receives jury decisions from Python AI Kernel and dispatches to social publishing queue.
 */

import { Router, Request, Response } from 'express';
import { BistAppPublisherEngine } from '../publisher/index.js';
import { JuryDecisionPayload } from '../types/juryContract.js';

const router = Router();

router.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const { ticker, verdict } = req.body || {};

    // 1. Validate payload requirements
    if (!ticker || !verdict) {
      return res.status(400).json({
        success: false,
        error: 'Eksik parametre: "ticker" ve "verdict" alanları zorunludur.',
      });
    }

    // 2. Pass to BistAppPublisherEngine webhook handler
    const result = BistAppPublisherEngine.handleWebhook(req.body);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.message,
      });
    }

    // 3. Return success response
    return res.status(200).json({
      status: 'queued',
      ticker: String(ticker).toUpperCase(),
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [PublisherRoute] /broadcast hata:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Sunucu içi hata oluştu.',
    });
  }
});

export default router;
