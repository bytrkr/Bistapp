// src/data/bistAllStocks.ts
import { BIST_FULL_REGISTRY, BISTStockItem } from '../constants/bistRegistry';

export interface BISTStock {
  code: string;
  ticker: string;
  symbol: string;
  name: string;
  sector: string;
  market?: string;
  marketCap?: number;
  pe?: number;
  peg?: number;
  price: number;
  rate: number;
  fairValue?: number;
  fairValuePotentialPct?: number;
  analystTarget?: number;
  targetPotentialPct?: number;
  healthScore?: number;
}

export const ALL_BIST_STOCKS: BISTStock[] = BIST_FULL_REGISTRY.map((item: BISTStockItem) => {
  const code = item.code || item.symbol.replace(/\.IS$/i, '');
  const ticker = item.ticker || (item.symbol.includes('.IS') ? item.symbol : `${code}.IS`);
  return {
    code,
    ticker,
    symbol: ticker,
    name: item.name,
    sector: item.sector,
    market: item.market || 'Yıldız',
    marketCap: item.marketCap || 50,
    pe: item.pe || 10,
    peg: item.peg || 1,
    price: item.price || 50,
    rate: item.rate ?? 0,
    fairValue: item.fairValue,
    fairValuePotentialPct: item.fairValuePotentialPct,
    analystTarget: item.analystTarget,
    targetPotentialPct: item.targetPotentialPct,
    healthScore: item.healthScore
  };
});

export const bistAllStocks = ALL_BIST_STOCKS;

export function searchBISTStocks(query: string): BISTStock[] {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  return ALL_BIST_STOCKS.filter((stock) => {
    return (
      stock.code.toLowerCase().includes(q) ||
      stock.ticker.toLowerCase().includes(q) ||
      stock.name.toLowerCase().includes(q) ||
      stock.sector.toLowerCase().includes(q)
    );
  });
}

export default ALL_BIST_STOCKS;
