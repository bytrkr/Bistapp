/**
 * BistApp Social Publisher Engine - Main Orchestrator
 * Receives JuryDecisionPayload from Python AI Kernel, formats and publishes to channels.
 */

import { JuryDecisionPayload, SocialFormatter } from './formatter.js';
import { TelegramDriver } from './drivers/telegram.js';
import { globalPublisherQueue } from './queue.js';

export class BistAppPublisherEngine {
  /**
   * Receives incoming decision from Python AI Kernel and dispatches to social channels
   */
  public static publishDecision(payload: JuryDecisionPayload): void {
    if (!payload || !payload.ticker || !payload.verdict) {
      console.warn('⚠️ [BistAppPublisherEngine] Geçersiz veya eksik JuryDecisionPayload alındı.');
      return;
    }

    console.log(`📢 [BistAppPublisherEngine] Karar alındı ve yayın kuyruğuna alınıyor: #${payload.ticker.toUpperCase()} (${payload.verdict})`);

    // 1. Telegram Yayını
    const telegramText = SocialFormatter.toTelegram(payload);
    globalPublisherQueue.enqueue('Telegram', async () => {
      return await TelegramDriver.sendMessage(telegramText, 'Markdown');
    });

    // 2. Twitter / X Yayını (Opsiyonel / İleride eklenecek driver için loglama/hazırlık)
    const twitterText = SocialFormatter.toTwitter(payload);
    console.log(`🐦 [BistAppPublisherEngine] Twitter formatı hazır (${twitterText.length} karakter):\n${twitterText}`);
  }

  /**
   * Express API route handler for webhook / push from Python backend
   */
  public static handleWebhook(reqBody: any): { success: boolean; message: string } {
    try {
      const payload: JuryDecisionPayload = {
        ticker: reqBody.ticker || 'BIST',
        verdict: reqBody.verdict || 'HOLD',
        confidenceScore: Number(reqBody.confidenceScore || reqBody.confidence || 50),
        entryZone: reqBody.entryZone || 'Belirtilmedi',
        targetPrice: reqBody.targetPrice || 'Belirtilmedi',
        stopLoss: reqBody.stopLoss || 'Belirtilmedi',
        activeShields: reqBody.activeShields || reqBody.shields || [],
        reasoning: reqBody.reasoning || reqBody.summary || 'Jüri değerlendirmesi tamamlandı.',
        timestamp: reqBody.timestamp || new Date().toISOString(),
      };

      BistAppPublisherEngine.publishDecision(payload);

      return {
        success: true,
        message: `Hisse #${payload.ticker.toUpperCase()} için sosyal medya yayın görevi kuyruğa eklendi.`,
      };
    } catch (error: any) {
      console.error('❌ [BistAppPublisherEngine] Webhook işleme hatası:', error);
      return {
        success: false,
        message: error.message || 'Bilinmeyen hata',
      };
    }
  }
}
