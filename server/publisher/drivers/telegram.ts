/**
 * BistApp Social Publisher Engine - Telegram Driver
 * Lightweight Telegram Bot API communication driver.
 */

export class TelegramDriver {
  private static getBotConfig() {
    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHANNEL_ID;
    return { token, chatId };
  }

  /**
   * Sends a message to Telegram chat/channel using Bot API
   */
  public static async sendMessage(text: string, parseMode: string = 'Markdown'): Promise<boolean> {
    const { token, chatId } = this.getBotConfig();

    if (!token || !chatId) {
      console.warn('⚠️ [TelegramDriver] TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID tanımlı değil. Mesaj loglandı ama gönderilemedi:', text.substring(0, 80));
      return false;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      });

      const data = (await response.json()) as { ok: boolean; description?: string };

      if (!response.ok || !data.ok) {
        console.error(`❌ [TelegramDriver] Telegram API Hatası:`, data.description || response.statusText);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`❌ [TelegramDriver] Bağlantı veya İstek Hatası:`, error);
      return false;
    }
  }
}
