// server/config/cache.ts
export function createCache<T = any>(ttlMs: number = 60000) {
  const store = new Map<string, { value: T; expires: number }>();
  return {
    get(key: string): T | undefined {
      const item = store.get(key);
      if (!item) return undefined;
      if (Date.now() > item.expires) {
        store.delete(key);
        return undefined;
      }
      return item.value;
    },
    set(key: string, value: T, customTtl?: number) {
      store.set(key, { value, expires: Date.now() + (customTtl ?? ttlMs) });
    },
    delete(key: string) {
      store.delete(key);
    }
  };
}
