/**
 * BistApp Social Publisher Engine - Formatter
 * Formats JuryDecisionPayload for Telegram (rich markdown) and Twitter (280 chars limit).
 */

export interface JuryDecisionPayload {
  ticker: string;
  verdict: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidenceScore: number;
  entryZone: string;
  targetPrice: string;
  stopLoss: string;
  activeShields: string[];
  reasoning: string;
  timestamp?: string;
}

export class SocialFormatter {
  /**
   * Translates verdict to Turkish display emoji & label
   */
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
        return { emoji: '⚠️', label: 'GÜÇLÜ SAT / AÇIĞA SATIŞ' };
      default:
        return { emoji: '⚪', label: 'NÖTR' };
    }
  }

  /**
   * Formats message for Telegram with rich Markdown and shield indicators
   */
  public static toTelegram(payload: JuryDecisionPayload): string {
    const vInfo = this.formatVerdict(payload.verdict);
    const shields = payload.activeShields && payload.activeShields.length > 0
      ? payload.activeShields.map(s => `🛡️ \`${s}\``).join('\n')
      : '🛡️ _Aktif kalkan uyarısı bulunmuyor._';

    const timestamp = payload.timestamp || new Date().toISOString();

    return [
      `🤖 *BIST JÜRİ HEDGE FUND TERMINALI*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📊 *Hisse:* \`#${payload.ticker.toUpperCase()}\``,
      `🎯 *Karar:* ${vInfo.emoji} *${vInfo.label}* (Güven: %${payload.confidenceScore})`,
      ``,
      `📌 *Kritik Seviyeler:*`,
      ` • *Giriş Bölgesi:* \`${payload.entryZone}\``,
      ` • *Hedef Fiyat:* \`${payload.targetPrice}\``,
      ` • *Stop-Loss:* \`${payload.stopLoss}\``,
      ``,
      `🛡️ *Devredeki Kalkanlar:*`,
      shields,
      ``,
      `🧠 *Jüri Gerekçesi:*`,
      `_${payload.reasoning}_`,
      ``,
      `⏱️ _Zaman: ${timestamp}_`,
      `#BIST100 #${payload.ticker.toUpperCase()} #KuantTerminali #BistApp`
    ].join('\n');
  }

  /**
   * Formats message for Twitter/X strictly under 280 characters limit
   */
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

    // Ensure strictly <= 280 characters
    if (text.length > 280) {
      text = text.substring(0, 277) + '...';
    }

    return text;
  }
}
