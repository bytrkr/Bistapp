/**
 * src/utils/llmClient.ts
 * İstemci tarafı güvenli LLM servis sarmalayıcısı (Frontend Wrapper).
 *
 * GÜVENLİK KURALI:
 * Tarayıcı tarafında hiçbir harici API anahtarı (VITE_*_API_KEY) barındırılmaz.
 * Tüm istekler Node.js Express backend proxy'si (/api/llm/generate) üzerinden yürütülür.
 * Sunucu tarafında Groq -> OpenRouter -> Gemini sıralı failover rotasyonu otomatik devreye girer.
 */

export interface LLMClientOptions {
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  providerPriority?: Array<'groq' | 'openrouter' | 'gemini'>;
}

export interface LLMClientResponse {
  success: boolean;
  content: string;
  provider?: 'groq' | 'openrouter' | 'gemini';
  model?: string;
  error?: string;
}

/**
 * Backend LLM Proxy servisini çağırarak içerik/analiz üretir.
 *
 * @param prompt Kullanıcı veya analiz komutu
 * @param systemInstruction İsteğe bağlı sistem direktifi / persona
 * @param options İsteğe bağlı parametreler (temperature, maxTokens, öncelik)
 */
export async function generateLLMContent(
  prompt: string,
  systemInstruction?: string,
  options: Omit<LLMClientOptions, 'systemInstruction'> = {}
): Promise<string | null> {
  if (!prompt || typeof prompt !== 'string') {
    console.warn('[LLMClient] Geçersiz prompt parametresi.');
    return null;
  }

  try {
    const response = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        temperature: options.temperature ?? 0.2,
        maxTokens: options.maxTokens ?? 1000,
        providerPriority: options.providerPriority ?? ['groq', 'openrouter', 'gemini'],
      }),
      signal: AbortSignal.timeout(20000), // 20 saniye emniyet zaman aşımı
    });

    if (!response.ok) {
      console.warn(`[LLMClient] Sunucu hatası HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.success && typeof data.content === 'string') {
      return data.content;
    }

    console.warn('[LLMClient] Beklenmeyen sunucu yanıtı:', data);
    return null;
  } catch (error) {
    console.warn('[LLMClient] LLM Proxy çağrısı başarısız oldu:', error);
    return null;
  }
}

/**
 * Detaylı meta veriler (kullanılan sağlayıcı, model vb.) ile yanıt dönen genişletilmiş fonksiyon.
 */
export async function generateLLMContentDetailed(
  prompt: string,
  options: LLMClientOptions = {}
): Promise<LLMClientResponse> {
  try {
    const response = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        systemInstruction: options.systemInstruction,
        temperature: options.temperature ?? 0.2,
        maxTokens: options.maxTokens ?? 1000,
        providerPriority: options.providerPriority ?? ['groq', 'openrouter', 'gemini'],
      }),
      signal: AbortSignal.timeout(20000),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return {
        success: true,
        content: data.content,
        provider: data.provider,
        model: data.model,
      };
    }

    return {
      success: false,
      content: '',
      error: data.error || `HTTP ${response.status}`,
    };
  } catch (error: any) {
    return {
      success: false,
      content: '',
      error: error?.message || 'Ağ hatası veya zaman aşımı.',
    };
  }
}

export default generateLLMContent;
