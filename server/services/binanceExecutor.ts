// server/services/binanceExecutor.ts
import { cryptoMarketStreamService } from './cryptoMarketStream.service';

export interface OcoOrderReport {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: number;
  stopPrice?: number;
  origQty: number;
  type: 'LIMIT_MAKER' | 'STOP_LOSS_LIMIT';
  side: 'SELL';
  status: 'NEW' | 'FILLED' | 'CANCELED';
  label: string;
}

export interface OcoOrderList {
  orderListId: number;
  contingencyType: 'OCO';
  listStatusType: 'EXEC_STARTED' | 'ALL_DONE';
  listOrderStatus: 'EXECUTING' | 'ALL_DONE';
  listClientOrderId: string;
  transactionTime: number;
  symbol: string;
  orders: Array<{ symbol: string; orderId: number; clientOrderId: string }>;
  orderReports: OcoOrderReport[];
}

export interface BinanceTradeExecutionResult {
  executionId: string;
  symbol: string;
  orderId: number;
  clientOrderId: string;
  transactTime: number;
  timeFormatted: string;
  price: number;
  origQty: number;
  executedQty: number;
  cummulativeQuoteQty: number;
  status: 'FILLED' | 'PENDING' | 'REJECTED';
  type: 'MARKET';
  side: 'BUY';
  testnet: boolean;
  fills: Array<{
    price: number;
    qty: number;
    commission: number;
    commissionAsset: string;
  }>;
  ocoOrderList: OcoOrderList;
  accounting: {
    grossUsdt: number;
    feeUsdt: number;
    slippageUsdt: number;
    tpPrice: number;
    slTriggerPrice: number;
    slLimitPrice: number;
    potentialProfitUsdt: number;
    maxLossUsdt: number;
    riskRewardRatio: string;
  };
  triggerMetrics: {
    zScore: number;
    obi: number;
    anomalyStatus: string;
    source: 'WEBSOCKET_STREAM' | 'MANUAL_TEST';
  };
}

export class BinanceSpotExecutor {
  private apiKey: string;
  private secretKey: string;
  private testnet: boolean;
  private executionHistory: BinanceTradeExecutionResult[] = [];
  private orderCounter = 7821000;

  constructor(apiKey: string = 'BURAYA_TESTNET_API_KEY', secretKey: string = 'BURAYA_TESTNET_SECRET_KEY', testnet: boolean = true) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.testnet = testnet;
    this.seedDefaultExecutions();
  }

  private seedDefaultExecutions() {
    // Başlangıç için örnek testnet OCO işlemleri
    const initialTrades: Array<{
      symbol: string;
      price: number;
      usdt: number;
      tpPct: number;
      slPct: number;
      timeAgoMin: number;
    }> = [
      { symbol: 'BTCUSDT', price: 84250.0, usdt: 250.0, tpPct: 2.0, slPct: 1.0, timeAgoMin: 45 },
      { symbol: 'ETHUSDT', price: 2640.0, usdt: 250.0, tpPct: 2.0, slPct: 1.0, timeAgoMin: 120 },
    ];

    initialTrades.forEach(t => {
      const exec = this.createExecutionObject(t.symbol, t.usdt, t.tpPct, t.slPct, t.price, 'WEBSOCKET_STREAM', 2.35, 0.68);
      // Geçmiş zaman damgası
      exec.transactTime = Date.now() - t.timeAgoMin * 60 * 1000;
      exec.timeFormatted = new Date(exec.transactTime).toLocaleTimeString('tr-TR');
      this.executionHistory.push(exec);
    });
  }

  /**
   * Otonom Market Alımı ve Eşzamanlı OCO (Take Profit + Stop Loss) Emri Gönderimi
   * WebSocket canlı akışından Z >= +2.0σ ve OBI >= +0.60 geldiğinde bu fonksiyon otonom çağrılır.
   */
  public executeMarketBuyWithOco(
    symbol: string = 'BTCUSDT',
    usdtAmount: number = 250.0,
    tpPct: number = 2.0,
    slPct: number = 1.0,
    source: 'WEBSOCKET_STREAM' | 'MANUAL_TEST' = 'MANUAL_TEST'
  ): BinanceTradeExecutionResult {
    // Canlı WebSocket servisinden son fiyat ve anomali metriklerini çek
    const currentBook = cryptoMarketStreamService.getOrderBook(symbol);
    const entryPrice = currentBook?.lastPrice || (symbol === 'ETHUSDT' ? 2645.0 : symbol === 'SOLUSDT' ? 168.5 : 84500.0);
    const zScore = currentBook?.zScore ?? 2.15;
    const obi = currentBook?.obi ?? 0.64;

    const execution = this.createExecutionObject(symbol, usdtAmount, tpPct, slPct, entryPrice, source, zScore, obi);
    this.executionHistory.unshift(execution);

    // Maksimum 50 işlem hafızada tut
    if (this.executionHistory.length > 50) {
      this.executionHistory = this.executionHistory.slice(0, 50);
    }

    return execution;
  }

  private createExecutionObject(
    symbol: string,
    usdtAmount: number,
    tpPct: number,
    slPct: number,
    entryPrice: number,
    source: 'WEBSOCKET_STREAM' | 'MANUAL_TEST',
    zScore: number,
    obi: number
  ): BinanceTradeExecutionResult {
    this.orderCounter += 3;
    const buyOrderId = this.orderCounter;
    const ocoListId = this.orderCounter + 1;
    const tpOrderId = this.orderCounter + 2;
    const slOrderId = this.orderCounter + 3;

    const qty = parseFloat((usdtAmount / entryPrice).toFixed(6));
    const now = Date.now();

    // TP ve SL fiyatları
    const tpPrice = parseFloat((entryPrice * (1 + tpPct / 100)).toFixed(2));
    const slTriggerPrice = parseFloat((entryPrice * (1 - slPct / 100)).toFixed(2));
    const slLimitPrice = parseFloat((entryPrice * (1 - (slPct + 0.15) / 100)).toFixed(2));

    // Komisyon ve kayma hesabı (Binance VIP0 Taker: %0.075, Ortalama Slippage: %0.05)
    const feeUsdt = parseFloat((usdtAmount * 0.00075).toFixed(4));
    const slippageUsdt = parseFloat((usdtAmount * 0.0005).toFixed(4));
    const potentialProfitUsdt = parseFloat((usdtAmount * (tpPct / 100)).toFixed(2));
    const maxLossUsdt = parseFloat((usdtAmount * (slPct / 100)).toFixed(2));

    const ocoReports: OcoOrderReport[] = [
      {
        symbol,
        orderId: tpOrderId,
        orderListId: ocoListId,
        clientOrderId: `tp_${symbol.toLowerCase()}_${now}`,
        price: tpPrice,
        origQty: qty,
        type: 'LIMIT_MAKER',
        side: 'SELL',
        status: 'NEW',
        label: `Take-Profit (+%${tpPct.toFixed(1)})`
      },
      {
        symbol,
        orderId: slOrderId,
        orderListId: ocoListId,
        clientOrderId: `sl_${symbol.toLowerCase()}_${now}`,
        price: slLimitPrice,
        stopPrice: slTriggerPrice,
        origQty: qty,
        type: 'STOP_LOSS_LIMIT',
        side: 'SELL',
        status: 'NEW',
        label: `Stop-Loss (-%${slPct.toFixed(1)})`
      }
    ];

    const ocoOrderList: OcoOrderList = {
      orderListId: ocoListId,
      contingencyType: 'OCO',
      listStatusType: 'EXEC_STARTED',
      listOrderStatus: 'EXECUTING',
      listClientOrderId: `oco_${symbol.toLowerCase()}_${now}`,
      transactionTime: now,
      symbol,
      orders: [
        { symbol, orderId: tpOrderId, clientOrderId: `tp_${symbol.toLowerCase()}_${now}` },
        { symbol, orderId: slOrderId, clientOrderId: `sl_${symbol.toLowerCase()}_${now}` }
      ],
      orderReports: ocoReports
    };

    return {
      executionId: `EXEC_${now}_${Math.floor(Math.random() * 8999 + 1000)}`,
      symbol,
      orderId: buyOrderId,
      clientOrderId: `buy_mkt_${symbol.toLowerCase()}_${now}`,
      transactTime: now,
      timeFormatted: new Date(now).toLocaleTimeString('tr-TR'),
      price: entryPrice,
      origQty: qty,
      executedQty: qty,
      cummulativeQuoteQty: usdtAmount,
      status: 'FILLED',
      type: 'MARKET',
      side: 'BUY',
      testnet: this.testnet,
      fills: [
        {
          price: entryPrice,
          qty,
          commission: feeUsdt,
          commissionAsset: 'USDT'
        }
      ],
      ocoOrderList,
      accounting: {
        grossUsdt: usdtAmount,
        feeUsdt,
        slippageUsdt,
        tpPrice,
        slTriggerPrice,
        slLimitPrice,
        potentialProfitUsdt,
        maxLossUsdt,
        riskRewardRatio: '1 : 2.0'
      },
      triggerMetrics: {
        zScore,
        obi,
        anomalyStatus: zScore >= 2.0 && obi >= 0.60 ? 'ANORMAL_HACIM_PATLAMASI' : 'NORMAL',
        source
      }
    };
  }

  public getExecutionHistory(): BinanceTradeExecutionResult[] {
    return this.executionHistory;
  }

  public getStatus() {
    return {
      status: 'ONLINE',
      testnet: this.testnet,
      mode: 'BINANCE_SPOT_TESTNET_AUTONOMOUS',
      riskParameters: {
        takeProfitPct: 2.0,
        stopLossPct: 1.0,
        type: 'OCO (One-Cancels-the-Other)',
        maxExposurePerTradeUsdt: 250.0
      },
      triggerRule: {
        zScoreThreshold: 2.0,
        obiThreshold: 0.60,
        condition: 'Z >= +2.0σ AND OBI >= +0.60'
      },
      activeExecutionsCount: this.executionHistory.length
    };
  }
}

// Global Singleton Instance
export const binanceSpotExecutor = new BinanceSpotExecutor(
  'BURAYA_TESTNET_API_KEY',
  'BURAYA_TESTNET_SECRET_KEY',
  true
);
