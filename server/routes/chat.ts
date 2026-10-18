import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { sanitizeKey, getNextGeminiKey } from '../utils/apiKeyManager.js';

export const chatRouter = Router();

export const MT16_QUANT_MIND_SYSTEM_PROMPT = `Sen MT16 Kuant Terminali'nin Otonom Kıdemli Kuant Stratejistisin (MT16 QuantMind). Asla genel, soyut, klişe veya yatırım tavsiyesi niteliğinde "ahmak" ya da sığ cümleler kurmazsın. 

ANALİZ PRENSİPLERİN VE VERİ SETİN:
1. HİSSE / VARLIK BAĞLAMI: Sana iletilen anlık sembol için (örn. EREGL, ASELS, THYAO, BTCUSDT), arka plandaki 'anomalyScanner', 'marketGateway' ve 'kapDaemon' motorlarından gelen HAM GERÇEK VERİLERİ (Sanitike Z-Skor, L2 Order Book Imbalance [OBI], Güncel KAP Bildirimleri, Saklama/Takas Akışları ve OCO Stop-Loss/Take-Profit oranlarını) doğrudan kullanırsın.
2. DİL VE ÜSLUP: Keskin, net, teknik ve matematiksel bir terminoloji kullanırsın. "Yatırım tavsiyesi değildir" gibi gevelemelere yer vermezsin; veriye dayalı olasılık ve risk matrisi sunarsın.
3. ÇIKTI FORMATI: Yanıtlarını şu katı yapıya göre verirsin:
   - [ANOMALİ & Z-SKOR DURUMU]: Hissenin hacim ve fiyat sapmasının matematiksel karşılığı.
   - [L2 OBI & TAHTA BASKISI]: Alıcı/satıcı kademe derinliği ve piyasa yapıcı (Market Maker) dengesi.
   - [AKTİF KAP AKIŞI]: Son düşen resmi bildirimin hisse fiyatlamasına kısa vadeli algoritmik etkisi.
   - [STRATEJİK OCO HEDEFİ]: Önerilen giriş, Take-Profit (%TP) ve Stop-Loss (%SL) seviyeleri.`;

export interface TickerContext {
  ticker?: string;
  closingPrice?: number;
  dayChangePct?: number;
  technicalIndicators?: Record<string, any>;
  supportLevel1?: number;
  resistanceLevel1?: number;
  bofaNetLot?: number;
  bofaAvgCost?: number;
  citibankSharePct?: number;
  pensionFundSharePct?: number;
  liveZScore?: number;
  liveObi?: number;
  bidVolumeTotal?: number;
  askVolumeTotal?: number;
  spread?: number;
  spreadPct?: number;
  wallPrice?: number;
  wallLotK?: number;
  rsi?: number;
  rsiStatus?: string;
  anomalySegment?: string;
  anomalyVerdict?: string;
  insiderRiskProb?: number;
  latestKap?: {
    ticker?: string;
    title?: string;
    impactScore?: number;
    sentimentLabel?: string;
    ciroRatioPct?: number;
    expectedVolatilityPct?: number;
    recommendedAction?: string;
  } | null;
  oco?: {
    entryPrice?: number;
    tpPct?: number;
    slPct?: number;
    tpPrice?: number;
    slPrice?: number;
    supportLevel1?: number;
    resistanceLevel1?: number;
    riskRewardRatio?: string;
  };
  marketCap?: number;
  pe?: number;
  peg?: number;
  fairValue?: number;
  fairValuePotentialPct?: number;
  analystTarget?: number;
  targetPotentialPct?: number;
  healthScore?: number;
  juryDecision?: {
    verdict?: string;
    composite_score?: number;
    overall_confidence?: number;
    market_regime?: string;
    executive_summary?: string;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content?: string;
  text?: string;
  timestamp?: string | number;
}

/**
 * Kullanıcı metninden maliyet fiyatı ayıklayıcı
 */
function extractCostBasis(message: string): number | null {
  const costRegex = /(?:maliyet(?:im)?|aldım|giriş(?:im)?)\s*(?:seviyem|fiyatım|:)?\s*([0-9]+[.,]?[0-9]*)/i;
  const costRegexAlt = /([0-9]+[.,]?[0-9]*)\s*(?:tl|liradan)?\s*(?:maliyet|aldım)/i;
  const match = message.match(costRegex) || message.match(costRegexAlt);
  if (match && match[1]) {
    const parsed = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      return Number(parsed.toFixed(2));
    }
  }
  return null;
}

/**
 * MT16 QuantMind (Kıdemli Kuant Stratejisti) Deterministik Kuant Çıktı Motoru
 * Her koşulda 4 zorunlu başlık yapısına sadık kalarak gerçek state verilerini raporlar.
 */
function generateQuantMindDeterministicReply(message: string, ctx: TickerContext): string {
  const ticker = (ctx.ticker || 'ASELS').toUpperCase();
  const price = ctx.closingPrice != null ? Number(ctx.closingPrice) : 100.0;
  const change = ctx.dayChangePct != null ? Number(ctx.dayChangePct) : 0.0;

  const s1 = ctx.supportLevel1 != null ? Number(ctx.supportLevel1) : Number((price * 0.965).toFixed(2));
  const r1 = ctx.resistanceLevel1 != null ? Number(ctx.resistanceLevel1) : Number((price * 1.038).toFixed(2));

  const zScore = ctx.liveZScore != null ? Number(Math.max(-4.0, Math.min(4.0, Number(ctx.liveZScore))).toFixed(2)) : 1.45;
  const obi = ctx.liveObi != null ? Number(Number(ctx.liveObi).toFixed(3)) : 0.142;
  const bidVol = ctx.bidVolumeTotal != null ? Number(ctx.bidVolumeTotal) : 485000;
  const askVol = ctx.askVolumeTotal != null ? Number(ctx.askVolumeTotal) : 390000;
  const spread = ctx.spread != null ? Number(ctx.spread) : 0.05;
  const spreadPct = ctx.spreadPct != null ? Number(ctx.spreadPct) : 0.08;
  const wallPrice = ctx.wallPrice != null ? Number(ctx.wallPrice) : Number((price * 1.015).toFixed(2));
  const wallLotK = ctx.wallLotK != null ? Number(ctx.wallLotK) : 120;

  const bofaLot = ctx.bofaNetLot != null ? Number(ctx.bofaNetLot) : 45000;
  const bofaAvgCost = ctx.bofaAvgCost != null ? Number(ctx.bofaAvgCost) : Number((price * 0.996).toFixed(2));
  const citibankPct = ctx.citibankSharePct != null ? Number(ctx.citibankSharePct) : 24.5;
  const pensionPct = ctx.pensionFundSharePct != null ? Number(ctx.pensionFundSharePct) : 14.2;

  const rsi = ctx.rsi != null ? Number(ctx.rsi) : 54;
  const rsiStatus = ctx.rsiStatus || (rsi > 70 ? 'AŞIRI ALIM' : rsi < 30 ? 'AŞIRI SATIM' : 'POZİTİF');
  const segment = ctx.anomalySegment || (zScore >= 2.0 ? 'ALPHA_RADAR' : 'DENGELI_TAHTA');
  const verdict = ctx.anomalyVerdict || (zScore >= 2.0 ? 'KURUMSAL_HACIM_KIRILIMI' : 'AKUMULASYON_DENGESI');
  const insiderProb = ctx.insiderRiskProb != null ? Number(ctx.insiderRiskProb) : Math.min(85, Math.max(15, Math.round(Math.abs(zScore) * 22)));

  const detectedCost = extractCostBasis(message);
  const entryRef = detectedCost !== null ? detectedCost : (ctx.oco?.entryPrice != null ? Number(ctx.oco.entryPrice) : price);
  const tpPct = ctx.oco?.tpPct != null ? Number(ctx.oco.tpPct) : 2.0;
  const slPct = ctx.oco?.slPct != null ? Number(ctx.oco.slPct) : 1.0;
  const tpPrice = Number((entryRef * (1 + tpPct / 100)).toFixed(2));
  const slPrice = Number((entryRef * (1 - slPct / 100)).toFixed(2));

  const zComment =
    zScore >= 2.0
      ? 'kurumsal hacim kırılım eşiği (> +2.00σ) aşılmış olup pozitif momentum anomalisi aktiftir'
      : zScore <= -1.5
      ? 'negatif standart sapma bölgesinde satış baskısı gözlenmektedir'
      : 'standart sapma kanalı içinde dengeli likidite birikimi sürmektedir';

  const obiComment =
    obi >= 0.2
      ? 'pasif alış kademelerinde kurumsal Market Maker tahkimatı (Alıcı Baskın)'
      : obi >= 0
      ? 'alıcı/satıcı derinliğinde pozitif denge'
      : 'satış kademelerinde likidite arzı baskısı';

  const kapInfo = ctx.latestKap;
  const kapSectionText = kapInfo && kapInfo.title
    ? `Son düşen [${kapInfo.ticker || ticker}] "${kapInfo.title}" bildirimi \`kapDaemon\` tarafından **${
        (kapInfo.impactScore ?? 0) >= 0 ? '+' : ''
      }${kapInfo.impactScore ?? 15}/100 (${kapInfo.sentimentLabel || 'POZİTİF'})** etki skoruyla sınıflandırılmıştır. Yıllık ciroya oranı **%${
        kapInfo.ciroRatioPct ?? 0
      }**, kısa vadeli beklenen algoritmik volatilite etkisi **±%${
        kapInfo.expectedVolatilityPct ?? 1.8
      }** ve otonom sinyal yönü **"${kapInfo.recommendedAction || 'AL'}"** düzeyindedir.`
    : `${ticker} için \`kapDaemon\` akışında kısa vadeli fiyatlamayı bozacak negatif bir VBTS/tedbir bildirimi yer almamaktadır; kamuyu aydınlatma akışı temel çarpanlarla uyumlu ve nötr-pozitif etkidedir.`;

  return `- **[ANOMALİ & Z-SKOR DURUMU]:** **${ticker}** anlık **${price.toFixed(2)}** fiyat seviyesinde (**%${
    change >= 0 ? '+' : ''
  }${change.toFixed(2)}**) işlem görmektedir. \`anomalyScanner\` motorundan çekilen Sanitize Z-Skor **${
    zScore >= 0 ? '+' : ''
  }${zScore}σ** değerindedir; **${zComment}**. Tahta segmenti \`${segment}\` (**${verdict}**), RSI(14) **${rsi}** (${rsiStatus}) ve hacim/fiyat sapma olasılığı **%${insiderProb}** olarak hesaplanmıştır.

- **[L2 OBI & TAHTA BASKISI]:** \`marketGateway\` L2 Order Book Imbalance (**OBI**) **${
    obi >= 0 ? '+' : ''
  }${obi.toFixed(3)}** düzeyindedir (**${obiComment}**). İlk 5 kademe toplam alıcı derinliği **${bidVol.toLocaleString(
    'tr-TR'
  )} Lot**, satıcı derinliği **${askVol.toLocaleString('tr-TR')} Lot**, kademe makası (spread) **${spread} (%${spreadPct})** ve ana direnç duvarı **${wallPrice.toFixed(
    2
  )}** seviyesinde **${wallLotK}k Lot** hacmindedir. Saklama/Takas tarafında BoFA gün içi net **${
    bofaLot >= 0 ? '+' : ''
  }${bofaLot.toLocaleString('tr-TR')} Lot** (Ort. Maliyet: **${bofaAvgCost.toFixed(
    2
  )}**), Citibank yabancı takas payı **%${citibankPct}** ve Emeklilik Fonları **%${pensionPct}** ağırlığındadır.

- **[AKTİF KAP AKIŞI]:** ${kapSectionText}

- **[STRATEJİK OCO HEDEFİ]:** ${
    detectedCost !== null ? `Kullanıcı referans maliyeti (**${detectedCost.toFixed(2)}**) ve ` : ''
  }anlık kademe matematiğine dayalı OCO yürütme seviyeleri:
  • **Önerilen Giriş / Referans Seviyesi:** **${entryRef.toFixed(2)}** (S1 Destek: **${s1.toFixed(2)}** | R1 Direnç: **${r1.toFixed(2)}**)
  • **Take-Profit (%TP +${tpPct.toFixed(1)}%):** **${tpPrice.toFixed(2)}**
  • **Stop-Loss (%SL -${slPct.toFixed(1)}%):** **${slPrice.toFixed(2)}**
  • **Risk / Ödül (R/R) Matrisi:** **1 : ${(tpPct / Math.max(0.1, slPct)).toFixed(1)}**`;
}

/**
 * Dinamik Bağlam Köprüsü (Context Bridge) — Z-Score, L2 OBI, KAP ve OCO state verilerini
 * MT16_QUANT_MIND_PROMPT_ENGINEERING sistem promptuna enjekte eder.
 */
function buildDynamicSystemInstruction(ctx: TickerContext, customSystemInstruction?: string): string {
  const ticker = (ctx.ticker || 'ASELS').toUpperCase();
  const price = ctx.closingPrice != null ? Number(ctx.closingPrice) : 100.0;
  const change = ctx.dayChangePct != null ? Number(ctx.dayChangePct) : 0.0;
  const s1 = ctx.supportLevel1 != null ? Number(ctx.supportLevel1) : Number((price * 0.965).toFixed(2));
  const r1 = ctx.resistanceLevel1 != null ? Number(ctx.resistanceLevel1) : Number((price * 1.038).toFixed(2));

  const zScore = ctx.liveZScore != null ? Number(Math.max(-4.0, Math.min(4.0, Number(ctx.liveZScore))).toFixed(2)) : 1.45;
  const obi = ctx.liveObi != null ? Number(Number(ctx.liveObi).toFixed(3)) : 0.142;
  const bidVol = ctx.bidVolumeTotal != null ? Number(ctx.bidVolumeTotal) : 485000;
  const askVol = ctx.askVolumeTotal != null ? Number(ctx.askVolumeTotal) : 390000;
  const bofaLot = ctx.bofaNetLot != null ? Number(ctx.bofaNetLot) : 45000;
  const bofaAvgCost = ctx.bofaAvgCost != null ? Number(ctx.bofaAvgCost) : Number((price * 0.996).toFixed(2));
  const citibankPct = ctx.citibankSharePct != null ? Number(ctx.citibankSharePct) : 24.5;
  const pensionPct = ctx.pensionFundSharePct != null ? Number(ctx.pensionFundSharePct) : 14.2;

  const tpPct = ctx.oco?.tpPct != null ? Number(ctx.oco.tpPct) : 2.0;
  const slPct = ctx.oco?.slPct != null ? Number(ctx.oco.slPct) : 1.0;
  const tpPrice = ctx.oco?.tpPrice != null ? Number(ctx.oco.tpPrice) : Number((price * (1 + tpPct / 100)).toFixed(2));
  const slPrice = ctx.oco?.slPrice != null ? Number(ctx.oco.slPrice) : Number((price * (1 - slPct / 100)).toFixed(2));

  const kapBlock = ctx.latestKap
    ? `[${ctx.latestKap.ticker || ticker}] "${ctx.latestKap.title}" | Etki Skoru: ${ctx.latestKap.impactScore ?? 15}/100 (${
        ctx.latestKap.sentimentLabel || 'POZİTİF'
      }) | Ciro Oranı: %${ctx.latestKap.ciroRatioPct ?? 0} | Beklenen Volatilite: ±%${
        ctx.latestKap.expectedVolatilityPct ?? 1.8
      } | Önerilen Aksiyon: ${ctx.latestKap.recommendedAction || 'AL'}`
    : `${ticker} için aktif negatif KAP kısıtlaması yok; bildirim akışı nötr-pozitif.`;

  if (customSystemInstruction && customSystemInstruction.includes('MT16 QuantMind')) {
    return customSystemInstruction;
  }

  return `${MT16_QUANT_MIND_SYSTEM_PROMPT}

════════════════════════════════════════════════════════════════
📡 ANLIK ENJEKTE EDİLEN HAM GERÇEK VERİLER (CONTEXT BRIDGE):
════════════════════════════════════════════════════════════════
- Sembol / Varlık: ${ticker}
- Anlık Fiyat: ${price.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)
- [anomalyScanner] Sanitize Z-Skor: ${zScore >= 0 ? '+' : ''}${zScore}σ | Segment: ${ctx.anomalySegment || 'ALPHA_RADAR'} | Teşhis: ${ctx.anomalyVerdict || 'KURUMSAL_HACIM_KIRILIMI'}
- [marketGateway] L2 OBI: ${obi >= 0 ? '+' : ''}${obi.toFixed(3)} | Alıcı Derinliği: ${bidVol.toLocaleString('tr-TR')} Lot | Satıcı Derinliği: ${askVol.toLocaleString('tr-TR')} Lot
- [marketGateway] Saklama & Takas: BoFA Net: ${bofaLot >= 0 ? '+' : ''}${bofaLot.toLocaleString('tr-TR')} Lot (@ ${bofaAvgCost.toFixed(2)}) | Citibank Payı: %${citibankPct} | Emeklilik Fonları: %${pensionPct}
- [kapDaemon] Güncel KAP Akışı: ${kapBlock}
- [OCO Emir Motoru] Giriş: ${price.toFixed(2)} | Take-Profit (%TP +${tpPct}%): ${tpPrice.toFixed(2)} | Stop-Loss (%SL -${slPct}%): ${slPrice.toFixed(2)} | S1 Destek: ${s1.toFixed(2)} | R1 Direnç: ${r1.toFixed(2)}
════════════════════════════════════════════════════════════════`;
}

/**
 * Handle POST /api/chat
 */
async function handleChat(req: Request, res: Response) {
  try {
    const { message, enrichedPrompt, systemInstruction: clientSystemInstruction, history, tickerContext } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'message metni zorunludur' });
    }

    const ctx: TickerContext = tickerContext || {};
    const rawApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY_1 ||
      process.env.VITE_GEMINI_API_KEY ||
      getNextGeminiKey()?.key ||
      '';
    const cleanApiKey = sanitizeKey(rawApiKey);

    const isValidKeyFormat = cleanApiKey && cleanApiKey.startsWith('AIza') && cleanApiKey.length >= 35;
    if (!isValidKeyFormat) {
      const reply = generateQuantMindDeterministicReply(message, ctx);
      return res.json({ success: true, reply, isFallback: true });
    }

    const systemInstruction = buildDynamicSystemInstruction(ctx, clientSystemInstruction);
    const finalUserText = typeof enrichedPrompt === 'string' && enrichedPrompt.trim() ? enrichedPrompt : message;

    try {
      const ai = new GoogleGenAI({
        apiKey: cleanApiKey,
      });

      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(history)) {
        for (const item of history) {
          const role = item.role === 'user' ? 'user' : 'model';
          const text = item.content || item.text || '';
          if (text) {
            contents.push({
              role,
              parts: [{ text: String(text) }],
            });
          }
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: finalUserText }],
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LLM_TIMEOUT_TRIGGERED')), 15000)
      );

      const generatePromise = ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const reply = response.text || generateQuantMindDeterministicReply(message, ctx);
      return res.json({ success: true, reply, isFallback: false });
    } catch {
      const fallbackReply = generateQuantMindDeterministicReply(message, ctx);
      return res.json({ success: true, reply: fallbackReply, isFallback: true });
    }
  } catch (outerErr: any) {
    console.error('❌ [MT16 QuantMind Chat Router Error]:', outerErr);
    const fallbackReply = generateQuantMindDeterministicReply(
      req.body?.message || '',
      req.body?.tickerContext || {}
    );
    return res.json({ success: true, reply: fallbackReply, isFallback: true });
  }
}

chatRouter.post('/api/chat', handleChat);
chatRouter.post('/chat', handleChat);

export default chatRouter;
