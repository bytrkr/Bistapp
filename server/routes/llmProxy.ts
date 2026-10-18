import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Sunucu taraflı API anahtarları (İstemciye asla ifşa edilmez)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY_1 ||
  process.env.GEMINI_API_KEY_2 ||
  '';

export interface LLMGenerateRequestBody {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  providerPriority?: Array<'groq' | 'openrouter' | 'gemini'>;
}

interface ProviderAttemptResult {
  provider: 'groq' | 'openrouter' | 'gemini';
  model: string;
  content: string;
}

/**
 * 1. GROQ Provider (Llama 3.3 70B Versatile)
 * En hızlı çıkarım (inference) ve düşük gecikme için ilk tercih.
 */
async function callGroqProvider(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2,
  maxTokens: number = 1000
): Promise<ProviderAttemptResult> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY tanimli degil.');
  }

  const model = 'llama-3.3-70b-versatile';
  const messages: Array<{ role: string; content: string }> = [];

  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(12000), // 12sn timeout
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq HTTP ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Groq bos yanit dondurdu.');
  }

  return { provider: 'groq', model, content };
}

/**
 * 2. OPENROUTER Provider (DeepSeek R1 / Llama 70B Distill)
 * Derin muhakeme ve karmaşık finansal analizler için güçlü yedek sağlayıcı.
 */
async function callOpenRouterProvider(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2,
  maxTokens: number = 1000
): Promise<ProviderAttemptResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY tanimli degil.');
  }

  const model = 'deepseek/deepseek-r1-distill-llama-70b';
  const messages: Array<{ role: string; content: string }> = [];

  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://bist-juri-terminal.local',
      'X-Title': 'BIST Juri Terminal',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(15000), // 15sn timeout
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter HTTP ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenRouter bos yanit dondurdu.');
  }

  return { provider: 'openrouter', model, content };
}

/**
 * 3. GEMINI FLASH Provider (Gemini 1.5 Flash)
 * Yüksek kota toleransı ve güvenilir nihai tampon (last-resort) sağlayıcı.
 */
async function callGeminiProvider(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2,
  maxTokens: number = 1000
): Promise<ProviderAttemptResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY tanimli degil.');
  }

  const model = 'gemini-1.5-flash';
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemInstruction
      ? { role: 'system', parts: [{ text: systemInstruction }] }
      : undefined,
  });

  const response = await geminiModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  const content = response.response.text()?.trim();
  if (!content) {
    throw new Error('Gemini bos yanit dondurdu.');
  }

  return { provider: 'gemini', model, content };
}

/**
 * POST /api/llm/generate veya router mount altında /generate
 * Sıralı Yük Devretme (Failover): Groq -> OpenRouter -> Gemini
 */
const handleGenerate = async (req: Request, res: Response) => {
  const {
    prompt,
    systemInstruction,
    temperature = 0.2,
    maxTokens = 1000,
    providerPriority = ['groq', 'openrouter', 'gemini'],
  }: LLMGenerateRequestBody = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Gecersiz istek: prompt alani zorunludur ve metin olmalidir.',
    });
  }

  const errors: Array<{ provider: string; error: string }> = [];

  // Tanımlı öncelik sırasına göre yük devretme (Failover Rotasyonu)
  for (const provider of providerPriority) {
    try {
      let result: ProviderAttemptResult | null = null;

      if (provider === 'groq') {
        result = await callGroqProvider(prompt, systemInstruction, temperature, maxTokens);
      } else if (provider === 'openrouter') {
        result = await callOpenRouterProvider(prompt, systemInstruction, temperature, maxTokens);
      } else if (provider === 'gemini') {
        result = await callGeminiProvider(prompt, systemInstruction, temperature, maxTokens);
      }

      if (result) {
        return res.json({
          success: true,
          provider: result.provider,
          model: result.model,
          content: result.content,
          fallbackHistory: errors,
        });
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn(`[LLM Failover] ${provider} basarisiz oldu: ${errMsg}. Sonraki saglayiciya geciliyor.`);
      errors.push({ provider, error: errMsg });
    }
  }

  // Tüm sağlayıcılar başarısız olduğunda
  console.error('[LLM Failover] Tum yapay zeka saglayicilari basarisiz oldu:', errors);
  return res.status(503).json({
    success: false,
    error: 'Tum LLM saglayicilari kota asimi, erisim veya sunucu hatasi verdi.',
    details: errors,
  });
};

// Hem /generate hem de doğrudan /api/llm/generate rotası desteklenir
router.post('/generate', handleGenerate);
router.post('/api/llm/generate', handleGenerate);

export default router;
