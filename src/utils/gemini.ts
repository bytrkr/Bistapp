import { callSecureLLM } from './juri';

/**
 * Güvenli Gemini/LLM Jüri Çağrısı
 * Tarayıcı tarafında API anahtarı tutulmaz; istekler sunucu proxy'si (/api/llm/generate) üzerinden yürütülür.
 */
export async function callJuri(prompt: string): Promise<string | null> {
  return await callSecureLLM(prompt.slice(0, 4000), {
    provider: 'gemini',
    temperature: 0.3,
  });
}

export default callJuri;