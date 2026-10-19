"""
Bistapp MT16 - Dayanıklı İcra ve Kurtarma Motoru (durable_executor.py)
---------------------------------------------------------------------
Ajan ve görevlerin icrasını task_states.json durum dosyası üzerinden izler,
hata durumunda 3 kez üst üste otomatik kurtarma (retry with recovery) uygular
ve başarısızlık durumunda güvenli koruma sağlayarak ardışık süreçleri korur.
"""

from __future__ import annotations
import os
import json
import time
import traceback
from pathlib import Path
from typing import Callable, Any, Dict, Optional

try:
    from agent_telemetry import AgentTelemetry
except ImportError:
    class AgentTelemetry:
        @staticmethod
        def log_execution(*args, **kwargs): pass

STATE_FILE = Path(__file__).resolve().parent / "task_states.json"


def _read_states() -> Dict[str, Any]:
    if STATE_FILE.is_file():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _write_state(task_id: str, data: Dict[str, Any]) -> None:
    try:
        states = _read_states()
        states[task_id] = {
            **states.get(task_id, {}),
            **data,
            "updated_at": time.time(),
        }
        # En son 100 görevi sakla
        if len(states) > 100:
            keys_to_remove = sorted(states.keys(), key=lambda k: states[k].get("updated_at", 0))[:-100]
            for k in keys_to_remove:
                states.pop(k, None)

        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(states, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[DURABLE_EXECUTOR] Durum dosyası yazılamadı: {e}")


class DurableExecutor:
    """
    Dayanıklı Görev İcra ve Kendi Kendini Onaran Hata Kurtarıcı
    """

    MAX_RETRIES = 3

    @classmethod
    def execute_with_recovery(
        cls,
        task_id: str,
        task_func: Callable[..., Any],
        *args: Any,
        **kwargs: Any
    ) -> Any:
        """
        Görevi çalıştırmadan önce 'başladı' kaydeder.
        Hata olursa 3 kez yeniden dener. Başarılı olursa 'bitti',
        tüm denemeler tükenirse 'başarısız' olarak işaretler.
        """
        start_time = time.time()
        agent_id = task_id.split("_")[-1] if "_" in task_id else task_id

        _write_state(task_id, {
            "status": "başladı",
            "agent_id": agent_id,
            "started_at": start_time,
            "retries_attempted": 0,
        })

        last_error = None

        for attempt in range(1, cls.MAX_RETRIES + 1):
            try:
                # Görevi çalıştır
                result = task_func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000.0

                _write_state(task_id, {
                    "status": "bitti",
                    "completed_at": time.time(),
                    "duration_ms": round(duration_ms, 2),
                    "successful_attempt": attempt,
                })

                # Telemetriye kaydet
                AgentTelemetry.log_execution(
                    agent_id=agent_id,
                    action=f"execute_{task_func.__name__}",
                    duration_ms=duration_ms,
                    status="SUCCESS",
                    token_usage=120,
                )

                return result

            except Exception as e:
                last_error = e
                duration_ms = (time.time() - start_time) * 1000.0
                print(f"[DURABLE_EXECUTOR] {task_id} deneme {attempt}/{cls.MAX_RETRIES} hata: {e}")

                _write_state(task_id, {
                    "status": "deneniyor",
                    "retries_attempted": attempt,
                    "last_error": str(e),
                })

                if attempt < cls.MAX_RETRIES:
                    time.sleep(0.05 * attempt)  # Kısa toparlanma beklemesi

        # 3 Deneme de başarısız oldu
        duration_ms = (time.time() - start_time) * 1000.0
        error_trace = traceback.format_exc()

        _write_state(task_id, {
            "status": "başarısız",
            "failed_at": time.time(),
            "duration_ms": round(duration_ms, 2),
            "final_error": str(last_error),
            "traceback": error_trace,
        })

        # Telemetriye hata logu
        AgentTelemetry.log_execution(
            agent_id=agent_id,
            action=f"execute_{task_func.__name__}",
            duration_ms=duration_ms,
            status="ERROR",
            token_usage=0,
        )

        # Güvenli fallback üret (eğer AgentResponse bekleniyorsa)
        try:
            from schemas import AgentResponse, SignalType
            return AgentResponse(
                agent_id=agent_id,
                agent_name=f"{agent_id.capitalize()} Ajanı (Kurtarma Modu)",
                signal=SignalType.NOTR,
                score=50.0,
                confidence=0.40,
                reasoning=f"⚠️ Dayanıklı İcra Kalkanı: Ajan 3 denemede de hata verdi ({str(last_error)}). Nötr oy ile devam ediliyor.",
                key_metrics={"durable_recovery": True, "error": str(last_error)}
            )
        except Exception:
            return None
