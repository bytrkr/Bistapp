/**
 * Güvenli Sunucu Taraflı LLM Çağrı İstemcisi
 * Doğrudan harici API'lara anahtar ifşa etmek yerine Node.js backend proxy'sini kullanır.
 */

export interface LLMRequestOptions {
  provider?: 'gemini' | 'groq' | 'openrouter';
  model?: string;
  systemInstruction?: string;
  temperature?: number;
}

export async function callSecureLLM(
  prompt: string,
  options: LLMRequestOptions = {}
): Promise<string | null> {
  try {
    const res = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        provider: options.provider || 'gemini',
        model: options.model,
        systemInstruction: options.systemInstruction,
        temperature: options.temperature ?? 0.2,
      }),
      signal: AbortSignal.timeout(15000), // 15sn emniyet payı
    });

    if (!res.ok) {
      console.warn(`[SecureLLM] Sunucu hatası HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data.success && typeof data.content === 'string') {
      return data.content;
    }

    return null;
  } catch (error) {
    console.warn('[SecureLLM] İstek başarısız oldu, yerel kural tabanlı algoritmaya dönülüyor:', error);
    return null;
  }
}

/**
 * Geriye dönük uyumluluk: callJuri fonksiyonu güvenli backend proxy'sine yönlendirilir.
 */
export async function callJuri(prompt: string): Promise<string | null> {
  return await callSecureLLM(prompt.slice(0, 4000), {
    provider: 'gemini',
    temperature: 0.3,
  });
}
