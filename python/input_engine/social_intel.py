"""
Bistapp MT16 - Sosyal İstihbarat ve JIRO Entegrasyonu (social_intel.py)
----------------------------------------------------------------------
JIRO (Sosyal Medya ve Duygu Analizi Mikroservisi) ile iletişim kurarak
verilen hisse sembolü (ticker) için sosyal medya duygu analizini (sentiment)
ve sosyal manipülasyon (Pump & Dump / FUD) risk skorunu hesaplar.
"""

from __future__ import annotations
import os
import sys
import asyncio
from typing import Dict, Any, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import requests
    _HAS_REQUESTS = True
except ImportError:
    requests = None
    _HAS_REQUESTS = False

try:
    from schemas import SocialData
except (ImportError, ValueError):
    try:
        from ..schemas import SocialData
    except (ImportError, ValueError):
        class SocialData:
            def __init__(self, ticker="BIST", mention_count=0, sentiment_score=0.0, manipulation_risk_score=0.0, summary="Veri yok", toon=""):
                self.ticker = ticker
                self.mention_count = mention_count
                self.sentiment_score = sentiment_score
                self.manipulation_risk_score = manipulation_risk_score
                self.summary = summary
                self.toon = toon

JIRO_URL = os.getenv("JIRO_URL", "http://jiro:8000")


def fetch_social_sentiment(ticker: str) -> Dict[str, Any]:
    """
    JIRO servisinin /social/search endpoint'ine istek atarak ilgili ticker için
    sosyal medya duygu analizi, skor ve mention metriklerini döner.
    """
    clean_ticker = ticker.strip().upper().replace(".IS", "")
    url = f"{JIRO_URL}/social/search"

    try:
        if _HAS_REQUESTS and requests is not None:
            response = requests.get(
                url,
                params={"ticker": clean_ticker, "q": f"{clean_ticker} hisse BIST yorum"},
                timeout=3.5,
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "ticker": data.get("ticker", clean_ticker),
                    "sentiment": data.get("sentiment", "NEUTRAL"),
                    "score": float(data.get("score", 0.0)),
                    "mention_count": int(data.get("mention_count", 0)),
                    "summary": data.get("summary", f"{clean_ticker} için sosyal akış verisi nötr."),
                    "is_live": True,
                }
    except Exception as e:
        print(f"[SOCIAL_INTEL] JIRO servis bağlantı hatası ({clean_ticker}): {str(e)}")

    return {
        "ticker": clean_ticker,
        "sentiment": "UNKNOWN",
        "score": 0.0,
        "mention_count": 0,
        "summary": "Veri yok",
        "is_live": False,
    }


def build_social_manipulation_toon(data: SocialData) -> str:
    """SocialData nesnesini #TOON/v3.5 schema=BISTAPP_SOCIAL_MANIPULATION formatına dönüştürür."""
    risk_level = (
        "HIGH"
        if data.manipulation_risk_score > 70
        else "MEDIUM"
        if data.manipulation_risk_score >= 40
        else "LOW"
    )
    return (
        f"#TOON/v3.5 schema=BISTAPP_SOCIAL_MANIPULATION\n"
        f"@social{{sym:{data.ticker};mentions:{data.mention_count};sentiment:{data.sentiment_score:+.2f};"
        f"risk_score:{data.manipulation_risk_score:.0f}/100;level:{risk_level}}}\n"
        f"@summary{{{data.summary}}}"
    )


async def analyze_social_manipulation(ticker: str) -> SocialData:
    """
    JIRO'dan gelen mention ve sentiment verilerini kullanarak sosyal manipülasyon
    risk skorunu asenkron olarak hesaplar:
    - Mention > 500 ve Sentiment > 0.8 ise Risk = 85 (Koordineli Pump & Dump Şüphesi)
    - Mention > 200 ve Sentiment < -0.6 ise Risk = 70 (Organize Panik / FUD Baskısı)
    - Aksi halde Risk = 20 (Normal Sosyal Akış)
    - Veri yoksa veya hata alınırsa fail-safe olarak manipulation_risk_score = 0 ve summary = "Veri yok" döner.
    """
    clean_ticker = (ticker or "BIST").strip().upper().replace(".IS", "")

    try:
        raw = await asyncio.to_thread(fetch_social_sentiment, clean_ticker)
        if not raw or not raw.get("is_live", False):
            fail_safe = SocialData(
                ticker=clean_ticker,
                mention_count=0,
                sentiment_score=0.0,
                manipulation_risk_score=0.0,
                summary="Veri yok",
                toon="",
            )
            fail_safe.toon = build_social_manipulation_toon(fail_safe)
            return fail_safe

        mention_count = int(raw.get("mention_count", 0))
        sentiment_score = float(raw.get("score", 0.0))

        if mention_count > 500 and sentiment_score > 0.8:
            risk_score = 85.0
            summary = (
                f"{clean_ticker} için aşırı sosyal medya hacmi ({mention_count} mention) ve yapay pozitif coşku "
                f"({sentiment_score:+.2f}) tespit edildi: Yüksek Pump & Dump manipülasyon riski."
            )
        elif mention_count > 200 and sentiment_score < -0.6:
            risk_score = 70.0
            summary = (
                f"{clean_ticker} için yoğun negatif kampanya ({mention_count} mention, duygu {sentiment_score:+.2f}) "
                f"tespit edildi: Organize FUD / panik satışı manipülasyon şüphesi."
            )
        else:
            risk_score = 20.0
            summary = raw.get(
                "summary",
                f"{clean_ticker} sosyal medya akışı olağan sınırlar içinde ({mention_count} mention, duygu {sentiment_score:+.2f}).",
            )

        social_obj = SocialData(
            ticker=clean_ticker,
            mention_count=mention_count,
            sentiment_score=sentiment_score,
            manipulation_risk_score=risk_score,
            summary=summary,
            toon="",
        )
        social_obj.toon = build_social_manipulation_toon(social_obj)
        return social_obj

    except Exception as e:
        print(f"[SOCIAL_INTEL] analyze_social_manipulation fail-safe ({clean_ticker}): {str(e)}")
        fallback = SocialData(
            ticker=clean_ticker,
            mention_count=0,
            sentiment_score=0.0,
            manipulation_risk_score=0.0,
            summary="Veri yok",
            toon="",
        )
        fallback.toon = build_social_manipulation_toon(fallback)
        return fallback
