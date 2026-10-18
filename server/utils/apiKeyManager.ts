// server/utils/apiKeyManager.ts

export function sanitizeKey(key?: string): string {
  if (!key || typeof key !== 'string') return '';
  return key.trim().replace(/^['"]|['"]$/g, '');
}

export function getNextGeminiKey(): { key: string } | null {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.VITE_GEMINI_API_KEY,
  ].filter(Boolean) as string[];

  if (keys.length === 0) return null;
  const picked = keys[Math.floor(Math.random() * keys.length)];
  return { key: sanitizeKey(picked) };
}
