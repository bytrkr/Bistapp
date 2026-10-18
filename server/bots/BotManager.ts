import { yahooPriceBot } from './YahooPriceBot.js';
import { googleFinanceBot } from './GoogleFinanceBot.js';
import { tradingViewScannerBot } from './TradingViewScannerBot.js';
import { kapRadarBot } from './KapRadarBot.js';
import { xSentimentBot } from './XSentimentBot.js';
import { BotHealthStatus, botCache, botEventBus } from './types.js';

export class BotManager {
  private static instance: BotManager;
  private isStarted = false;

  public static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  /**
   * Tüm veri toplayıcı otonom botları başlatır.
   */
  public startAll(): void {
    if (this.isStarted) {
      console.log('ℹ️ [BotManager] Botlar zaten çalışıyor.');
      return;
    }

    this.isStarted = true;
    console.log('🚀 [BotManager] Tüm 5 otonom veri toplayıcı bot başlatılıyor...');

    yahooPriceBot.start();
    googleFinanceBot.start();
    tradingViewScannerBot.start();
    kapRadarBot.start();
    xSentimentBot.start();

    // Event Bus dinleyicileri
    botEventBus.on('price:updated', (_data) => {
      // Yahoo fiyat güncellemesi
    });
    botEventBus.on('googlePrice:updated', (_data) => {
      // Google Finance güncellemesi
    });
    botEventBus.on('sentiment:updated', (_sentiment) => {
      // Sosyal duyarlılık güncellemesi
    });

    console.log('✅ [BotManager] 5 otonom bot arka planda aktif (Yahoo, GoogleFinance, TradingView, KAP, XSentiment).');
  }

  /**
   * Tüm botları güvenli şekilde durdurur.
   */
  public stopAll(): void {
    this.isStarted = false;
    yahooPriceBot.stop();
    googleFinanceBot.stop();
    tradingViewScannerBot.stop();
    kapRadarBot.stop();
    xSentimentBot.stop();
    console.log('🛑 [BotManager] Tüm botlar durduruldu.');
  }

  /**
   * Botların anlık durum ve sağlık metriklerini döner.
   */
  public getHealth(): {
    systemStatus: 'HEALTHY' | 'DEGRADED';
    cacheStats: ReturnType<typeof botCache.getStats>;
    bots: BotHealthStatus[];
  } {
    const bots = [
      yahooPriceBot.getHealth(),
      googleFinanceBot.getHealth(),
      tradingViewScannerBot.getHealth(),
      kapRadarBot.getHealth(),
      xSentimentBot.getHealth(),
    ];

    const hasError = bots.some((b) => b.status === 'ERROR');

    return {
      systemStatus: hasError ? 'DEGRADED' : 'HEALTHY',
      cacheStats: botCache.getStats(),
      bots,
    };
  }
}

export const botManager = BotManager.getInstance();
