"""
Bistapp MT16 - Otonom Zamanlayıcı ve Piyasa Tarayıcısı (scheduler.py)
--------------------------------------------------------------------
BackgroundScheduler kullanarak 15 dakikalık periyotlarla BIST hisselerini
(ASELS, THYAO vb.) sosyal manipülasyon riskine karşı tarar ve risk > 80 olduğunda
Telegram bildirim motoru üzerinden alarm tetikler.
"""

from __future__ import annotations
import os
import sys
import time
import asyncio
from typing import List, Optional, Dict, Any

# Modül import yolları
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    _HAS_APSCHEDULER = True
except ImportError:
    BackgroundScheduler = None
    _HAS_APSCHEDULER = False

from telegram_bot import send_telegram_alert, default_telegram_engine
from input_engine.social_intel import analyze_social_manipulation

DEFAULT_WATCH_TICKERS: List[str] = [
    "ASELS",
    "THYAO",
    "EREGL",
    "TUPRS",
    "BIMAS",
    "AKBNK",
    "ISCTR",
    "KCHOL",
]

_scheduler_instance: Optional[Any] = None
_last_scan_results: Dict[str, Any] = {}
_is_running: bool = False


async def monitor_market_and_notify(tickers: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Belirlenen hisse listesi (ASELS, THYAO vb.) için sosyal manipülasyon analizi yapar.
    manipulation_risk_score > 80 olan hisseler için anında Telegram alarmı gönderir.
    """
    global _last_scan_results
    watch_list = tickers or DEFAULT_WATCH_TICKERS
    alerts_triggered = []

    print(f"[SCHEDULER] Piyasa ve Sosyal Manipülasyon Taraması Başladı ({len(watch_list)} hisse)...")

    for ticker in watch_list:
        try:
            social_data = await analyze_social_manipulation(ticker)
            risk_score = float(social_data.manipulation_risk_score)
            
            _last_scan_results[ticker] = {
                "ticker": ticker,
                "risk_score": risk_score,
                "mentions": social_data.mention_count,
                "sentiment": social_data.sentiment_score,
                "summary": social_data.summary,
                "scanned_at": time.time(),
            }

            # 🚨 KURAL: manipulation_risk_score > 80 ise Telegram alarmı gönder
            if risk_score > 80.0:
                alert_msg = (
                    f"🚨 Yüksek Manipülasyon Riski: {ticker}\n"
                    f"Manipülasyon Risk Skoru: {risk_score:.0f}/100\n"
                    f"Sosyal Medya Hacmi: {social_data.mention_count} mention\n"
                    f"Duygu Skoru: {social_data.sentiment_score:+.2f}\n"
                    f"Teşhis: {social_data.summary}\n"
                    f"Zaman: {time.strftime('%Y-%m-%d %H:%M:%S')}"
                )
                print(f"[SCHEDULER] ALARM TETİKLENDİ: {ticker} (Risk: {risk_score})")
                await send_telegram_alert(alert_msg, priority="CRITICAL")
                alerts_triggered.append({"ticker": ticker, "risk_score": risk_score})

        except Exception as e:
            print(f"[SCHEDULER] {ticker} analizi sırasında hata: {e}")

    print(f"[SCHEDULER] Tarama tamamlandı. Gönderilen alarm: {len(alerts_triggered)}")
    return alerts_triggered


def run_market_monitor_job():
    """BackgroundScheduler thread'i tarafından çağrılan senkron tetikleyici."""
    try:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        if loop.is_running():
            asyncio.create_task(monitor_market_and_notify())
        else:
            loop.run_until_complete(monitor_market_and_notify())
    except Exception as e:
        print(f"[SCHEDULER] Senkron tetikleyici hatası: {e}")


def start_scheduler(interval_minutes: int = 15) -> bool:
    """
    Arka plan zamanlayıcısını (BackgroundScheduler veya Threading fallback) başlatır.
    Varsayılan periyot: 15 dakika.
    """
    global _scheduler_instance, _is_running
    if _is_running:
        print("[SCHEDULER] Zamanlayıcı zaten aktif.")
        return True

    if _HAS_APSCHEDULER and BackgroundScheduler is not None:
        try:
            scheduler = BackgroundScheduler()
            scheduler.add_job(
                run_market_monitor_job,
                "interval",
                minutes=interval_minutes,
                id="market_manipulation_monitor_job",
                replace_existing=True,
            )
            scheduler.start()
            _scheduler_instance = scheduler
            _is_running = True
            print(f"[SCHEDULER] BackgroundScheduler başlatıldı. Periyot: Her {interval_minutes} dakika.")
            return True
        except Exception as e:
            print(f"[SCHEDULER] BackgroundScheduler başlatılamadı, threading fallback geçiliyor: {e}")

    # APScheduler yoksa veya hata verdiyse daemon thread fallback
    import threading

    def _worker():
        global _is_running
        _is_running = True
        interval_sec = interval_minutes * 60
        while _is_running:
            try:
                run_market_monitor_job()
            except Exception as ex:
                print(f"[SCHEDULER_THREAD] Çalışma hatası: {ex}")
            time.sleep(interval_sec)

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
    _is_running = True
    print(f"[SCHEDULER] Threading tabanlı zamanlayıcı başlatıldı. Periyot: Her {interval_minutes} dakika.")
    return True


def stop_scheduler():
    """Zamanlayıcıyı güvenle durdurur."""
    global _scheduler_instance, _is_running
    _is_running = False
    if _scheduler_instance is not None:
        try:
            _scheduler_instance.shutdown(wait=False)
        except Exception:
            pass
        _scheduler_instance = None
    print("[SCHEDULER] Zamanlayıcı durduruldu.")


def get_scheduler_status() -> Dict[str, Any]:
    """Zamanlayıcı durumunu ve son tarama özetlerini döner."""
    return {
        "is_running": _is_running,
        "tickers_watched": DEFAULT_WATCH_TICKERS,
        "last_scans_count": len(_last_scan_results),
        "last_scans": list(_last_scan_results.values()),
    }
