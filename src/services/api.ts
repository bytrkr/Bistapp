// src/services/api.ts
import { BIST_FULL_REGISTRY, BISTStockItem } from '../constants/bistRegistry';

export const BASE_API_URL = '';

export interface ApiStockResponse {
  data?: BISTStockItem[];
  stocks?: BISTStockItem[];
  result?: BISTStockItem[];
  [key: string]: unknown;
}

export async function getStocks(): Promise<BISTStockItem[]> {
  try {
    const res = await fetch('/api/stocks', {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      return BIST_FULL_REGISTRY;
    }
    const data: ApiStockResponse | BISTStockItem[] = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    if (data && Array.isArray(data.stocks)) {
      return data.stocks;
    }
    if (data && Array.isArray(data.result)) {
      return data.result;
    }
    return BIST_FULL_REGISTRY;
  } catch {
    return BIST_FULL_REGISTRY;
  }
}

export const fetchBistStocks = async (): Promise<BISTStockItem[]> => {
  return getStocks();
};

export default {
  BASE_API_URL,
  getStocks,
  fetchBistStocks,
};
