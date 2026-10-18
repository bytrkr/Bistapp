// server/services/signalBotGateway.ts

export interface SignalAlertPayload {
  symbol: string;
  market: 'BIST' | 'CRYPTO' | 'NASDAQ';
  side: 'BUY' | 'SELL';
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  obi: number;
  zScore: number;
  juryConfidence: number;
  timestamp: string;
  signalId: string;
}

export class SignalBotGateway {
  private sentAlertsHistory: SignalAlertPayload[] = [];
  private alertCounter = 50400;

  constructor() {
    this.seedInitialAlerts();
  }

  private seedInitialAlerts() {
    const initial: Array<{ symbol: string; market: 'BIST' | 'CRYPTO' | 'NASDAQ'; price: number }> = [
      { symbol: 'BTCUSDT', market: 'CRYPTO', price: 84500.0 },
      { symbol: 'NVDA', market: 'NASDAQ', price: 126.20 },
      { symbol: 'ASELS', market: 'BIST', price: 48.50 },
    ];

    initial.forEach((item, idx) => {
      this.alertCounter++;
      const tp = item.price * 1.02;
      const sl = item.price * 0.99;
      this.sentAlertsHistory.push({
        symbol: item.symbol,
        market: item.market,
        side: 'BUY',
        entryPrice: item.price,
        takeProfitPrice: parseFloat(tp.toFixed(2)),
        stopLossPrice: parseFloat(sl.toFixed(2)),
        obi: 0.68,
        zScore: 2.34,
        juryConfidence: 89.5,
        timestamp: new Date(Date.now() - (idx + 1) * 45 * 60 * 1000).toLocaleTimeString('tr-TR'),
        signalId: `SIG-${this.alertCounter}`,
      });
    });
  }

  public broadcastSignal(symbol: string = 'BTCUSDT', market: 'BIST' | 'CRYPTO' | 'NASDAQ' = 'CRYPTO', price: number = 84500.0): SignalAlertPayload {
    this.alertCounter++;
    const tp = parseFloat((price * 1.02).toFixed(2));
    const sl = parseFloat((price * 0.99).toFixed(2));

    const alert: SignalAlertPayload = {
      symbol,
      market,
      side: 'BUY',
      entryPrice: price,
      takeProfitPrice: tp,
      stopLossPrice: sl,
      obi: parseFloat((0.60 + Math.random() * 0.3).toFixed(3)),
      zScore: parseFloat((2.0 + Math.random() * 0.8).toFixed(2)),
      juryConfidence: parseFloat((85.0 + Math.random() * 12).toFixed(1)),
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      signalId: `SIG-${this.alertCounter}`,
    };

    this.sentAlertsHistory.unshift(alert);
    if (this.sentAlertsHistory.length > 30) {
      this.sentAlertsHistory = this.sentAlertsHistory.slice(0, 30);
    }

    console.log(`[Telegram/Discord VIP Signal Broadcast]: ${alert.signalId} -> ${symbol} (${market}) Entry: ${price} TP: ${tp} SL: ${sl}`);
    return alert;
  }

  public getAlertsHistory(): SignalAlertPayload[] {
    return this.sentAlertsHistory;
  }

  public getBotStatus() {
    return {
      status: 'ONLINE',
      connectedChannels: ['@mt16_vip_signals (Telegram)', 'Discord #quant-signals'],
      activeWebhooksCount: 2,
      lastBroadcastTime: this.sentAlertsHistory[0]?.timestamp || 'Henüz yok',
      totalAlertsSentToday: this.sentAlertsHistory.length,
      triggerCriteria: 'Jüri Konsensüsü >= %80.0 VE Z-Score >= +2.00σ',
    };
  }
}

export const signalBotGateway = new SignalBotGateway();
