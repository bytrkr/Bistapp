"""
Bistapp MT16 - Sosyal İstihbarat ve JIRO Entegrasyonu (social_intel.py)
----------------------------------------------------------------------
JIRO (Sosyal Medya ve Duygu Analizi Mikroservisi) ile iletişim kurarak
verilen hisse sembolü (ticker) için sosyal medya duygu analizini (sentiment)
ve sosyal manipülasyon (Pump & Dump / FUD) risk skorunu hesaplar.

CANLI / SİMÜLE VERİ KORUMASI:
Eğer JIRO servisine ulaşılamıyorsa veya botlar simüle veri üretiyorsa,
sistem bunu 'SIMULATED' ve 'is_live=False' olarak işaretler, açık
'Simüle Veri' uyarısı verir ve uzman ajanların bu verilere güvenmesini engeller.
"""

from __future__ import annotations
import os
import sys
import asyncio
import json
import urllib.request
import urllib.parse
import urllib.error
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
            def __init__(
                self,
                ticker="BIST",
                mention_count=0,
                sentiment_score=0.0,
                manipulation_risk_score=0.0,
                summary="Veri yok",
                toon="",
                data_source="SIMULATED",
                is_live=False,
                is_simulated=True,
                is_reliable=False,
                simulation_warning=""
            ):
                self.ticker = ticker
                self.mention_count = mention_count
                self.sentiment_score = sentiment_score
                self.manipulation_risk_score = manipulation_risk_score
                self.summary = summary
                self.toon = toon
                self.data_source = data_source
                self.is_live = is_live
                self.is_simulated = is_simulated
                self.is_reliable = is_reliable
                self.simulation_warning = simulation_warning

try:
    from social_illusion_engine import SocialIllusionEngine
except ImportError:
    try:
        from ..social_illusion_engine import SocialIllusionEngine
    except ImportError:
        class SocialIllusionEngine:
            @staticmethod
            def detect_botnet(mentions=None):
                return {"botnet_risk_score": 0.0, "is_botnet_detected": False}

JIRO_URL = os.getenv("JIRO_URL", "http://jiro:8000")


def check_jiro_status() -> Dict[str, Any]:
    """
    JIRO mikroservisinin sağlık durumunu ve erişilebilirliğini kontrol eder.
    requests yoksa yerel urllib.request ile bağlanır.
    """
    if _HAS_REQUESTS and requests is not None:
        try:
            res = requests.get(f"{JIRO_URL}/health", timeout=1.5)
            if res.status_code == 200:
                return {
                    "is_reachable": True,
                    "status": "ONLINE",
                    "message": "JIRO mikroservisi canlı ve yanıt veriyor.",
                    "url": JIRO_URL,
                }
            return {
                "is_reachable": False,
                "status": "DEGRADED",
                "message": f"JIRO beklenmeyen durum kodu döndü: {res.status_code}",
                "url": JIRO_URL,
            }
        except Exception as e:
            return {
                "is_reachable": False,
                "status": "OFFLINE",
                "message": f"JIRO mikroservisine ulaşılamıyor (Çevrimdışı / Simüle Mod): {str(e)}",
                "url": JIRO_URL,
            }

    # urllib fallback
    try:
        req = urllib.request.Request(f"{JIRO_URL}/health", headers={"User-Agent": "MT16Bistapp/3.5"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                return {
                    "is_reachable": True,
                    "status": "ONLINE",
                    "message": "JIRO mikroservisi canlı ve yanıt veriyor (urllib).",
                    "url": JIRO_URL,
                }
            return {
                "is_reachable": False,
                "status": "DEGRADED",
                "message": f"JIRO beklenmeyen durum: {resp.status}",
                "url": JIRO_URL,
            }
    except Exception as e:
        return {
            "is_reachable": False,
            "status": "OFFLINE",
            "message": f"JIRO mikroservisine ulaşılamıyor (Çevrimdışı / Simüle Mod): {str(e)}",
            "url": JIRO_URL,
        }


def verify_social_live_connection() -> Dict[str, Any]:
    """
    Sosyal medya istihbarat servisinin (JIRO) canlılığını doğrular.
    Canlı veri yoksa 'Simüle Veri' durumu ve açık uyarı döner.
    """
    status = check_jiro_status()
    is_live = status.get("is_reachable", False) and status.get("status") == "ONLINE"
    return {
        "is_live": is_live,
        "is_simulated": not is_live,
        "service": "JIRO",
        "status": status.get("status", "OFFLINE"),
        "url": JIRO_URL,
        "warning": "" if is_live else "⚠️ Simüle Veri: JIRO mikroservisi çevrimdışı, sosyal istihbarat simüle modda çalışıyor.",
        "details": status.get("message", ""),
    }


def fetch_social_sentiment(ticker: str) -> Dict[str, Any]:
    """
    JIRO servisinin /social/search endpoint'ine istek atarak ilgili ticker için
    sosyal medya duygu analizi, skor ve mention metriklerini döner.
    Bağlantı yoksa veya hata alınırsa açıkça 'SIMULATED' ve 'is_live=False' döner.
    """
    clean_ticker = ticker.strip().upper().replace(".IS", "")
    url = f"{JIRO_URL}/social/search"
    query_params = {"ticker": clean_ticker, "q": f"{clean_ticker} hisse BIST yorum"}

    # 1. requests denemesi
    if _HAS_REQUESTS and requests is not None:
        try:
            response = requests.get(url, params=query_params, timeout=2.0)
            if response.status_code == 200:
                data = response.json()
                is_live_flag = bool(data.get("is_live", True)) and data.get("data_source", "").upper() != "SIMULATED"
                is_sim = not is_live_flag
                return {
                    "ticker": data.get("ticker", clean_ticker),
                    "sentiment": data.get("sentiment", "NEUTRAL"),
                    "score": float(data.get("score", 0.0)),
                    "mention_count": int(data.get("mention_count", 0)),
                    "summary": data.get("summary", f"{clean_ticker} için sosyal akış verisi."),
                    "mentions": data.get("mentions", []),
                    "is_live": is_live_flag,
                    "data_source": "REALTIME_JIRO" if is_live_flag else "SIMULATED",
                    "is_simulated": is_sim,
                    "is_reliable": is_live_flag,
                    "simulation_warning": "" if is_live_flag else "⚠️ Simüle Veri: JIRO canlı veri üretemiyor.",
                }
        except Exception as e:
            print(f"[SOCIAL_INTEL] JIRO requests bağlantı hatası ({clean_ticker}): {str(e)}")

    # 2. urllib fallback denemesi
    try:
        encoded_query = urllib.parse.urlencode(query_params)
        full_url = f"{url}?{encoded_query}"
        req = urllib.request.Request(full_url, headers={"User-Agent": "MT16Bistapp/3.5"})
        with urllib.request.urlopen(req, timeout=2.0) as resp:
            if resp.status == 200:
                raw_json = json.loads(resp.read().decode("utf-8"))
                is_live_flag = bool(raw_json.get("is_live", True)) and raw_json.get("data_source", "").upper() != "SIMULATED"
                is_sim = not is_live_flag
                return {
                    "ticker": raw_json.get("ticker", clean_ticker),
                    "sentiment": raw_json.get("sentiment", "NEUTRAL"),
                    "score": float(raw_json.get("score", 0.0)),
                    "mention_count": int(raw_json.get("mention_count", 0)),
                    "summary": raw_json.get("summary", f"{clean_ticker} için sosyal akış verisi."),
                    "mentions": raw_json.get("mentions", []),
                    "is_live": is_live_flag,
                    "data_source": "REALTIME_JIRO" if is_live_flag else "SIMULATED",
                    "is_simulated": is_sim,
                    "is_reliable": is_live_flag,
                    "simulation_warning": "" if is_live_flag else "⚠️ Simüle Veri: JIRO canlı veri üretemiyor.",
                }
    except Exception as e:
        print(f"[SOCIAL_INTEL] JIRO urllib bağlantı hatası ({clean_ticker}): {str(e)}")

    # Fail-safe / Çevrimdışı: Gerçek veriye ulaşılamadığını açıkça bildir
    return {
        "ticker": clean_ticker,
        "sentiment": "UNKNOWN",
        "score": 0.0,
        "mention_count": 0,
        "summary": "JIRO mikroservisi çevrimdışı (Bağlantı kurulamadı). Gerçek zamanlı sosyal medya akışına ulaşılamıyor.",
        "mentions": [],
        "is_live": False,
        "data_source": "SIMULATED",
        "is_simulated": True,
        "is_reliable": False,
        "simulation_warning": "⚠️ Simüle Veri: JIRO mikroservisi çevrimdışı, gerçek sosyal medya akışına ulaşılamıyor.",
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
    sim_flag = "TRUE" if data.is_simulated else "FALSE"
    return (
        f"#TOON/v3.5 schema=BISTAPP_SOCIAL_MANIPULATION\n"
        f"@social{{sym:{data.ticker};mentions:{data.mention_count};sentiment:{data.sentiment_score:+.2f};"
        f"risk_score:{data.manipulation_risk_score:.0f}/100;level:{risk_level};"
        f"source:{data.data_source};is_simulated:{sim_flag}}}\n"
        f"@summary{{{data.summary}}}"
    )


async def analyze_social_manipulation(ticker: str) -> SocialData:
    """
    JIRO'dan gelen mention ve sentiment verilerini kullanarak sosyal manipülasyon
    risk skorunu asenkron olarak hesaplar.
    Eğer JIRO çevrimdışıysa (is_live=False), veri 'SIMULATED' olarak etiketlenir,
    ajanların yanıltılmaması için manipülasyon cezaları kilitlenir.
    """
    clean_ticker = (ticker or "BIST").strip().upper().replace(".IS", "")

    try:
        raw = await asyncio.to_thread(fetch_social_sentiment, clean_ticker)
        
        # ⚠️ CANLI VERİ KONTROLÜ: Eğer JIRO ulaşılamazsa veya simüle veri üretiyorsa
        if not raw or not raw.get("is_live", False):
            fail_safe = SocialData(
                ticker=clean_ticker,
                mention_count=0,
                sentiment_score=0.0,
                manipulation_risk_score=0.0,
                summary=f"{clean_ticker} için canlı JIRO bağlantısı yok (⚠️ Simüle Veri: Sosyal sinyallere dayanılmamalıdır).",
                toon="",
                data_source="SIMULATED",
                is_live=False,
                is_simulated=True,
                is_reliable=False,
                simulation_warning="⚠️ Simüle Veri: JIRO mikroservisi çevrimdışı, gerçek sosyal medya akışına ulaşılamıyor.",
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

        # 🤖 SocialIllusionEngine: Botnet ve Astroturfing Tespiti
        mentions_list = raw.get("mentions", [])
        botnet_res = SocialIllusionEngine.detect_botnet(mentions_list)
        botnet_risk_score = float(botnet_res.get("botnet_risk_score", 0.0))

        # Dönen skoru manipulation_risk_score ile harmanla
        final_manipulation_risk = max(risk_score, botnet_risk_score)
        if botnet_risk_score >= 70.0:
            summary += f" [Botnet İllüzyonu]: Organize botnet/yapay etkileşim tespit edildi (Botnet Skoru: {botnet_risk_score:.0f}/100)."

        social_obj = SocialData(
            ticker=clean_ticker,
            mention_count=mention_count,
            sentiment_score=sentiment_score,
            manipulation_risk_score=final_manipulation_risk,
            summary=summary,
            toon="",
            data_source="REALTIME_JIRO",
            is_live=True,
            is_simulated=False,
            is_reliable=True,
            simulation_warning="",
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
            summary=f"Sosyal istihbarat motoru hatası: {str(e)} (⚠️ Simüle / Güvenilmez Veri)",
            toon="",
            data_source="SIMULATED",
            is_live=False,
            is_simulated=True,
            is_reliable=False,
            simulation_warning="⚠️ Simüle Veri: İstisna nedeniyle sosyal veri güvenilmezdir.",
        )
        fallback.toon = build_social_manipulation_toon(fallback)
        return fallback
