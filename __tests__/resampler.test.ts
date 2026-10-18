import test from 'node:test';
import assert from 'node:assert';

function resampleCandles(prices: number[], groupSize: number): number[] {
  if (!prices || prices.length === 0) return [];
  const resampled: number[] = [];
  for (let i = 0; i < prices.length; i += groupSize) {
    const chunk = prices.slice(i, i + groupSize);
    const close = chunk[chunk.length - 1];
    resampled.push(close);
  }
  return resampled;
}

test('resampleCandles converts 1M to 60M (groupSize = 60)', () => {
  const prices1m = Array.from({ length: 120 }, (_, i) => 100 + i * 0.1);
  const candles60m = resampleCandles(prices1m, 60);
  assert.strictEqual(candles60m.length, 2);
  assert.strictEqual(Number(candles60m[0].toFixed(1)), 105.9);
  assert.strictEqual(Number(candles60m[1].toFixed(1)), 111.9);
});

test('resampleCandles handles empty array', () => {
  const result = resampleCandles([], 60);
  assert.deepStrictEqual(result, []);
});

test('resampleCandles handles partial group (warm-up filter)', () => {
  const prices = [10, 11, 12, 13, 14];
  const resampled = resampleCandles(prices, 2);
  assert.strictEqual(resampled.length, 3);
  assert.strictEqual(resampled[2], 14);
});
