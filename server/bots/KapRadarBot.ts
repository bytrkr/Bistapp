import { BotHealthStatus, botCache } from './types.js';
import { KapService } from '../services/kapService.js';

export class KapRadarBot {
  public readonly name = 'KapRadarBot';
  private isRunning = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private consecutiveErrors = 0;
  private currentIntervalMs = 30000; // 30 saniye periyot (KAP rate limit koruması)
  private runCount = 0;
  private errorCount = 0;
  private lastRunTime: number | null = null;
  private lastError: string | null = null;
  private totalDisclosures = 0;
  private isLiveFeed = false;
  private simulationWarning = '⚠️ Simüle Veri: Canlı KAP veri akışı henüz başlatılmadı.';

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`🤖 [${this.name}] Başlatıldı (Periyot: ${this.currentIntervalMs}ms)`);
    this.scheduleNext(1000); // 1 sn sonra ilk tarama
  }

  public stop(): void {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearTimeout(this.intervalTimer);
      this.intervalTimer = null;
    }
    console.log(`🛑 [${this.name}] Durduruldu.`);
  }

  private scheduleNext(delayMs: number): void {
    if (!this.isRunning) return;
    this.intervalTimer = setTimeout(async () => {
      await this.pollDisclosures();
      const nextDelay = this.consecutiveErrors > 0
        ? Math.min(60000, this.currentIntervalMs * Math.pow(1.5, this.consecutiveErrors))
        : this.currentIntervalMs;
      this.scheduleNext(nextDelay);
    }, delayMs);
  }

  private async pollDisclosures(): Promise<void> {
    this.runCount++;
    this.lastRunTime = Date.now();

    try {
      const items = await KapService.fetchLatestDisclosures(true);
      if (Array.isArray(items) && items.length > 0) {
        botCache.setKapDisclosures(items);
        this.totalDisclosures = items.length;
        this.consecutiveErrors = 0;
        this.lastError = null;
        this.isLiveFeed = items.some((it: any) => it.isLive !== false);
        this.simulationWarning = this.isLiveFeed ? '' : '⚠️ Simüle Veri: Canlı KAP akışına ulaşılamadı.';
      } else {
        this.isLiveFeed = false;
        this.simulationWarning = '⚠️ Simüle Veri: Canlı KAP bildirim akışına ulaşılamadı (Boş Yanıt).';
      }
    } catch (err: any) {
      this.errorCount++;
      this.consecutiveErrors++;
      this.isLiveFeed = false;
      this.simulationWarning = `⚠️ Simüle Veri: KAP veri akışı hatası (${err?.message || String(err)})`;
      this.lastError = err?.message || String(err);
      console.warn(`⚠️ [${this.name}] KAP veri akışı hatası (Deneme #${this.consecutiveErrors}):`, this.lastError);
    }
  }

  public getHealth(): BotHealthStatus {
    return {
      name: this.name,
      status: this.isRunning ? (this.consecutiveErrors > 3 ? 'ERROR' : 'RUNNING') : 'STOPPED',
      lastRunTime: this.lastRunTime,
      runCount: this.runCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      itemsCollected: this.totalDisclosures,
      isLive: this.isLiveFeed,
      isSimulated: !this.isLiveFeed,
      dataSource: this.isLiveFeed ? 'REALTIME_KAP_RSS' : 'SIMULATED',
      simulationWarning: this.simulationWarning,
    };
  }
}

export const kapRadarBot = new KapRadarBot();
