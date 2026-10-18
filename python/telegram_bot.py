"""
Bistapp MT16 - Telegram Bildirim ve Risk Motoru (telegram_bot.py)
-----------------------------------------------------------------
Yüksek riskli piyasa anomalileri, sosyal manipülasyon uyarıları ve
otonom alarmlar için Telegram Bot API üzerinden anlık bildirim gönderir.
"""

from __future__ import annotations
import os
import sys
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any

try:
    import requests
    _HAS_REQUESTS = True
except ImportError:
    requests = None
    _HAS_REQUESTS = False


def _load_env_val(key_name: str, default: str = "") -> str:
    """Belirtilen ortam değişkenini os.environ veya .env dosyalarından okur."""
    val = os.getenv(key_name, "").strip().strip("'\"")
    if val and "your_" not in val:
        return val

    search_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path("/.env"),
        Path("/app/applet/.env")
    ]
    for p in search_paths:
        if p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith(f"{key_name}="):
                            candidate = line.split("=", 1)[1].strip().strip("'\"")
                            if candidate and "your_" not in candidate:
                                return candidate
            except Exception:
                pass
    return default


class TelegramRiskEngine:
    """
    Telegram Bot Entegrasyon ve Risk Bildirim Yöneticisi
    """
    def __init__(
        self,
        bot_token: Optional[str] = None,
        chat_id: Optional[str] = None
    ):
        self.bot_token = bot_token or _load_env_val("TELEGRAM_BOT_TOKEN", "")
        self.chat_id = chat_id or _load_env_val("TELEGRAM_CHAT_ID", "")
        if not self.chat_id:
            self.chat_id = _load_env_val("TELEGRAM_SOHBET_ID", "")

    def is_configured(self) -> bool:
        """Token ve Chat ID'nin geçerli olup olmadığını doğrular."""
        return bool(
            self.bot_token
            and "your_" not in self.bot_token
            and self.chat_id
            and "your_" not in self.chat_id
        )

    def send_alert_sync(self, message: str, priority: str = "NORMAL") -> bool:
        """
        Senkron olarak Telegram API'sine POST isteği gönderir.
        Hata durumunda sistemi çökertmez (try-except).
        """
        if not self.is_configured():
            print(f"[TELEGRAM_BOT] Bildirim simülasyonu ({priority}): {message}")
            return True

        if not _HAS_REQUESTS or requests is None:
            print(f"[TELEGRAM_BOT] requests kütüphanesi bulunamadı, bildirim simüle edildi.")
            return True

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        
        prefix = "🚨 " if priority.upper() in ["CRITICAL", "HIGH"] else "ℹ️ "
        payload = {
            "chat_id": self.chat_id,
            "text": f"{prefix}{message}",
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }

        try:
            resp = requests.post(url, json=payload, timeout=6.0)
            if resp.status_code == 200:
                print(f"[TELEGRAM_BOT] Bildirim başarıyla iletildi: {message[:60]}...")
                return True
            else:
                # HTML parse hatası olursa düz metin olarak tekrar dene
                if "can't parse entities" in resp.text.lower():
                    payload.pop("parse_mode", None)
                    retry_resp = requests.post(url, json=payload, timeout=5.0)
                    return retry_resp.status_code == 200

                print(f"[TELEGRAM_BOT] Telegram API yanıt hatası ({resp.status_code}): {resp.text}")
                return False
        except Exception as e:
            print(f"[TELEGRAM_BOT] Bildirim gönderilirken hata oluştu: {e}")
            return False

    async def send_alert(self, message: str, priority: str = "NORMAL") -> bool:
        """Asenkron alert gönderim fonksiyonu."""
        return await asyncio.to_thread(self.send_alert_sync, message, priority)


# Varsayılan tekil instance
default_telegram_engine = TelegramRiskEngine()


async def send_telegram_alert(message: str, priority: str = "NORMAL") -> bool:
    """
    Modül düzeyinde hızlı çağrılabilir asenkron bildirim fonksiyonu.
    Hata durumunda asla istisna fırlatmaz.
    """
    try:
        return await default_telegram_engine.send_alert(message, priority)
    except Exception as e:
        print(f"[TELEGRAM_BOT] send_telegram_alert genel yakalama: {e}")
        return False
