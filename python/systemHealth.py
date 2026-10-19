"""
Bistapp MT16 - System Health Monitor & Dead Man's Switch (systemHealth.py)
--------------------------------------------------------------------------
Ağ gecikmesini (latency) takip eder ve belirli bir süre ping gelmezse
tetiklenecek bir Dead Man's Switch (Kopma Emniyeti) mekanizması kurar.
"""

from __future__ import annotations
import time
from typing import Dict, Any, Optional

class SystemHealthMonitor:
    """
    Sistem Sağlığı İzleyicisi ve Dead Man's Switch (Kopma Emniyeti)
    """
    _last_heartbeat_time: float = time.time()
    _dead_man_timeout_sec: float = 60.0 # 60 saniye ping gelmezse tetiklenir
    _is_tripped: bool = False

    @classmethod
    def ping(cls) -> float:
        """Sistemden ping alır ve son kalp atış zamanını günceller."""
        now = time.time()
        elapsed = now - cls._last_heartbeat_time
        cls._last_heartbeat_time = now
        if cls._is_tripped:
            cls._is_tripped = False  # Reset on new heartbeat
        return round(elapsed * 1000.0, 2)  # milisaniye cinsinden gecikme

    @classmethod
    def check_health(cls) -> Dict[str, Any]:
        """Sağlık durumunu ve Dead Man's Switch durumunu kontrol eder."""
        now = time.time()
        silent_duration = now - cls._last_heartbeat_time

        if silent_duration > cls._dead_man_timeout_sec:
            cls._is_tripped = True

        status = "CRITICAL_DISCONNECTED" if cls._is_tripped else "HEALTHY"

        return {
            "status": status,
            "silent_duration_sec": round(silent_duration, 1),
            "dead_man_tripped": cls._is_tripped,
            "timeout_threshold_sec": cls._dead_man_timeout_sec,
            "timestamp": now,
        }
