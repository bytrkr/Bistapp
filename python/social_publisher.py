"""
Bistapp MT16 - Sosyal Medya Yayıncısı (social_publisher.py)
----------------------------------------------------------
Telegram Bot API ve Twitter (X) API entegrasyonu ile analiz içeriklerini
otomatik olarak yayınlar veya simüle eder. Standart kütüphane urllib tabanlıdır.
"""

from __future__ import annotations
import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List

try:
    from content_generator import ContentGenerator
except ImportError:
    class ContentGenerator:
        @staticmethod
        def generate_post(ticker, decision_data, platform="telegram"):
            return f"BISTAPP Analizi: {ticker}"


class SocialPublisher:
    """
    Sosyal Medya Otomasyon ve Yayın Dağıtım Motoru (Social Media Autopilot)
    """

    @classmethod
    def publish_to_telegram(
        cls,
        message: str,
        bot_token: Optional[str] = None,
        channel_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Telegram kanalına veya grubuna mesaj gönderir.
        Ortam değişkenleri (TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID) tanımlı değilse
        güvenli simülasyon modunda çalışır.
        """
        token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
        channel = channel_id or os.getenv("TELEGRAM_CHANNEL_ID")

        if not token or not channel:
            return {
                "success": True,
                "status": "SIMULATED",
                "platform": "telegram",
                "message": "TELEGRAM_BOT_TOKEN veya TELEGRAM_CHANNEL_ID tanımlı olmadığı için mesaj konsola simüle edildi.",
                "preview": message,
            }

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": channel,
            "text": message,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True,
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=8.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return {
                    "success": True,
                    "status": "PUBLISHED",
                    "platform": "telegram",
                    "message_id": data.get("result", {}).get("message_id"),
                    "chat_id": channel,
                    "preview": message[:100] + "...",
                }
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            return {
                "success": False,
                "status": "ERROR",
                "platform": "telegram",
                "error_code": e.code,
                "detail": err_body,
                "preview": message,
            }
        except Exception as e:
            return {
                "success": False,
                "status": "EXCEPTION",
                "platform": "telegram",
                "error": str(e),
                "preview": message,
            }

    @classmethod
    def publish_to_twitter(cls, message: str) -> Dict[str, Any]:
        """
        Twitter (X) API v2 Taslak Yayınlayıcı.
        İleride canlı Twitter OAuth 2.0 / Bearer token ile gerçek API çağrısı yapılabilir.
        """
        api_key = os.getenv("TWITTER_API_KEY")
        if not api_key:
            return {
                "success": True,
                "status": "DRAFT_READY",
                "platform": "twitter",
                "message": "Twitter API v2 anahtarı bekleniyor. Tweet taslağı başarıyla oluşturuldu.",
                "tweet_text": message,
                "character_count": len(message),
            }

        return {
            "success": True,
            "status": "PUBLISHED_SIMULATED",
            "platform": "twitter",
            "tweet_text": message,
            "character_count": len(message),
        }

    @classmethod
    def publish_auto(
        cls,
        ticker: str,
        decision_data: Dict[str, Any],
        platforms: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        İçerik üretip belirtilen tüm platformlara tek adımda dağıtır.
        """
        target_platforms = platforms or ["telegram", "twitter"]
        results = {}

        for p in target_platforms:
            text = ContentGenerator.generate_post(ticker, decision_data, platform=p)
            if p == "telegram":
                res = cls.publish_to_telegram(text)
            elif p in ["twitter", "x"]:
                res = cls.publish_to_twitter(text)
            else:
                res = {"success": True, "status": "UNKNOWN_PLATFORM", "preview": text}
            results[p] = {**res, "content": text}

        return {
            "ticker": ticker.strip().upper().replace(".IS", ""),
            "platforms": target_platforms,
            "results": results,
        }
