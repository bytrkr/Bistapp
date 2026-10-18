// src/utils/format.ts
export function safeToFixed(val: any, digits: number = 2): string {
  if (val == null || isNaN(Number(val))) return '0.00';
  return Number(val).toFixed(digits);
}
