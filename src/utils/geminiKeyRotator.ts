// src/utils/geminiKeyRotator.ts
/**
 * @deprecated
 * Bu modül istemci tarafı API anahtarı ifşasını önlemek amacıyla devre dışı bırakılmıştır.
 * Tüm LLM rotasyonu ve anahtar yönetimi sunucu tarafında (server/routes/llmProxy.ts) yürütülmektedir.
 */

export const getActiveGeminiKey = (): string => {
  return '';
};

export const rotateToNextKey = (): string => {
  return '';
};

export async function executeWithGeminiRotation<T>(
  apiCallFn: (apiKey: string) => Promise<T>,
  _maxRetries: number = 1
): Promise<T> {
  return await apiCallFn('');
}
