// server/data/tickers.ts
import { BIST_FULL_REGISTRY, BISTStockItem } from '../../src/constants/bistRegistry.js';

export interface StockTicker {
  code: string;
  ticker: string;
  symbol: string;
  name: string;
  sector: string;
  market?: string;
  price?: number;
  rate?: number;
}

export const ALL_BIST_STOCKS: StockTicker[] = BIST_FULL_REGISTRY.map((item: BISTStockItem) => {
  const code = item.code || item.symbol.replace(/\.IS$/i, '');
  const ticker = item.ticker || (item.symbol.includes('.IS') ? item.symbol : `${code}.IS`);
  return {
    code,
    ticker,
    symbol: ticker,
    name: item.name,
    sector: item.sector,
    market: item.market || 'Yıldız Pazar',
    price: item.price || 50,
    rate: item.rate ?? 0
  };
});

export function getAllStocks(): StockTicker[] {
  return ALL_BIST_STOCKS;
}

export const getAllTickers = getAllStocks;

export default {
  ALL_BIST_STOCKS,
  getAllStocks,
  getAllTickers
};
