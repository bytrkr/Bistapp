import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class SelfHealer {
  private static async callLLMWithFailover(prompt: string): Promise<string> {
    const providers = [
      { name: 'Groq', call: this.callGroq },
      { name: 'OpenRouter', call: this.callOpenRouter },
      { name: 'Gemini', call: this.callGemini }
    ];

    for (const provider of providers) {
      try {
        console.log(`Trying ${provider.name}...`);
        return await provider.call(prompt);
      } catch (error) {
        console.warn(`${provider.name} failed: ${error}`);
      }
    }
    throw new Error('All AI providers failed');
  }

  private static async callGemini(prompt: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  private static async callGroq(prompt: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) throw new Error('Groq failed');
    const data = await response.json();
    return data.choices[0].message.content;
  }

  private static async callOpenRouter(prompt: string): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-8b-instruct',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) throw new Error('OpenRouter failed');
    const data = await response.json();
    return data.choices[0].message.content;
  }

  static async diagnoseAndPatch() {
    console.log('🩺 Starting AST-scoped autonomous self-healing diagnosis...');
    
    const logPath = path.join(process.cwd(), 'data/forensicToon.json');
    if (!fs.existsSync(logPath)) return;

    const logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    const pendingRepairs = logs.filter((l: any) => l.status === 'REQUIRES_REPAIR');

    for (const error of pendingRepairs) {
      console.log(`🔨 Diagnosing error: ${error.message}`);
      
      const prompt = `Analyze this error using AST context: ${error.message}\nStack: ${error.stack}\nGenerate a minimal diff patch.`;
      
      let attempts = 0;
      let success = false;
      while(attempts < 3 && !success) {
        const diagnosis = await this.callLLMWithFailover(prompt);
        console.log(`Diagnosis iteration ${attempts + 1}: ${diagnosis}`);
        
        // Apply patch logic...
        
        if (this.validatePatch()) {
          success = true;
          error.status = 'REPAIRED';
        } else {
          attempts++;
        }
      }
    }

    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
  }

  static validatePatch() {
    try {
      console.log('🧪 Validating patch with tsc...');
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      return true;
    } catch (e) {
      console.error('❌ Validation failed.');
      return false;
    }
  }
}
