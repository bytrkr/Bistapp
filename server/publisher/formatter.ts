/**
 * BistApp Social Publisher Engine - Formatter
 * Formats JuryDecisionPayload for Telegram (rich markdown with entity escaping) and Twitter (280 chars limit).
 */

import { JuryDecisionPayload } from '../types/juryContract.js';

export class SocialFormatter {
  /**
   * Escapes Telegram Markdown special characters to prevent "Can't parse entities" parsing errors.
   */
  public static escapeMarkdown(text: string): string {
    if (!text) return '';
    // Escape characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
    return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }

  private static formatVerdict(verdict: JuryDecisionPayload['verdict']): { emoji: string; label: string } {
    switch (verdict) {
      case 'STRONG_BUY':
        return { emoji: '🚀', label: 'GÜÇLÜ AL' };
      case 'BUY':
        return { emoji: '🟢', label: 'AL' };
      case 'HOLD':
        return { emoji: '🟡', label: 'TUT / BEKLE' };
      case 'SELL':
        return { emoji: '🔴', label: 'SAT' };
      case 'STRONG_SELL':
        return { emoji: '⚠️', label: 'GÜÇLÜ SAT' };
      default:
        return { emoji: '⚪', label: 'NÖTR' };
    }
  }

  public static toTelegram(data: JuryDecisionPayload): string {
    const vInfo = this.formatVerdict(data.verdict);
    
    const safeTicker = this.escapeMarkdown(data.ticker.toUpperCase());
    const safeEntry = this.escapeMarkdown(data.entryZone);
    const safeTarget = this.escapeMarkdown(data.targetPrice);
    const safeStop = this.escapeMarkdown(data.stopLoss);
    const safeReasoning = this.escapeMarkdown(data.reasoning);

    const safeShields = data.activeShields && data.activeShields.length > 0
      ? data.activeShields.map(s => `🛡️ ${this.escapeMarkdown(s)}`).join('\n')
      : '🛡️ _Aktif kalkan uyarısı bulunmuyor._';

    const timestamp = data.timestamp || new Date().toISOString();

    return [
      `🤖 *BIST JÜRİ HEDGE FUND TERMINALI*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📊 *Hisse:* \`#${safeTicker}\``,
      `🎯 *Karar:* ${vInfo.emoji} *${vInfo.label}* (Güven: %${data.confidenceScore})`,
      ``,
      `📌 *Kritik Seviyeler:*`,
      ` • *Giriş Bölgesi:* \`${safeEntry}\``,
      ` • *Hedef Fiyat:* \`${safeTarget}\``,
      ` • *Stop-Loss:* \`${safeStop}\``,
      ``,
      `🛡️ *Devredeki Kalkanlar:*`,
      safeShields,
      ``,
      `🧠 *Jüri Gerekçesi:*`,
      `_${safeReasoning}_`,
      ``,
      `⏱️ _Zaman: ${this.escapeMarkdown(timestamp)}_`,
      `#BIST100 #${safeTicker} #KuantTerminali #BistApp`
    ].join('\n');
  }

  public static toTwitter(payload: JuryDecisionPayload): string {
    const vInfo = this.formatVerdict(payload.verdict);
    const ticker = `#${payload.ticker.toUpperCase()}`;
    
    let text = `${ticker} ${vInfo.emoji} ${vInfo.label} (Güven: %${payload.confidenceScore})\n`;
    text += `Giriş: ${payload.entryZone} | Hedef: ${payload.targetPrice} | Stop: ${payload.stopLoss}\n`;
    
    if (payload.activeShields && payload.activeShields.length > 0) {
      text += `Kalkanlar: ${payload.activeShields.join(', ')}\n`;
    }
    
    const summary = payload.reasoning.length > 100 
      ? payload.reasoning.substring(0, 97) + '...' 
      : payload.reasoning;
      
    text += `Analiz: ${summary}\n#BIST100 #BistApp`;

    if (text.length > 280) {
      text = text.substring(0, 277) + '...';
    }

    return text;
  }
}
