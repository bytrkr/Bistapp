"""
Bistapp MT16 - Ajan Telemetri ve Gözlemlenebilirlik Motoru (agent_telemetry.py)
-------------------------------------------------------------------------------
Tüm uzman ajanların çalışma sürelerini (latans), hata oranlarını ve harcanan
token miktarlarını SQLite tablosuna kaydeder ve sistem sağlık metriklerini sunar.
"""

from __future__ import annotations
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

DB_PATH = Path(__file__).resolve().parent / "agent_telemetry.db"


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_telemetry_db() -> None:
    """Telemetri SQLite tablosunu başlatır."""
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_telemetry_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT NOT NULL,
                action TEXT NOT NULL,
                duration_ms REAL NOT NULL,
                status TEXT NOT NULL,
                token_usage INTEGER DEFAULT 0,
                timestamp REAL NOT NULL,
                date_str TEXT NOT NULL
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_agent ON agent_telemetry_logs (agent_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_status ON agent_telemetry_logs (status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON agent_telemetry_logs (timestamp)")
        conn.commit()


# Otomatik tablo kurulumu
init_telemetry_db()


class AgentTelemetry:
    """
    Ajan Seviyesi Gözlemlenebilirlik ve Performans Takipçisi
    """

    @classmethod
    def log_execution(
        cls,
        agent_id: str,
        action: str,
        duration_ms: float,
        status: str = "SUCCESS",
        token_usage: int = 0
    ) -> None:
        """Her ajanın çalışma süresini ve harcadığı token'ı kaydeder."""
        init_telemetry_db()
        now = time.time()
        date_str = datetime.fromtimestamp(now, tz=timezone.utc).isoformat()

        with _get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_telemetry_logs (
                    agent_id, action, duration_ms, status, token_usage, timestamp, date_str
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                str(agent_id),
                str(action),
                round(float(duration_ms), 2),
                str(status).upper(),
                int(token_usage or 0),
                now,
                date_str
            ))
            conn.commit()

    @classmethod
    def get_system_health(cls, limit: int = 30) -> Dict[str, Any]:
        """En yavaş çalışan ajanı, toplam hata oranını ve sağlık durumunu döner."""
        init_telemetry_db()
        with _get_db() as conn:
            cursor = conn.cursor()
            
            # Genel İstatistikler
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_executions,
                    SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful_executions,
                    SUM(CASE WHEN status != 'SUCCESS' THEN 1 ELSE 0 END) as error_executions,
                    COALESCE(SUM(token_usage), 0) as total_token_usage,
                    COALESCE(AVG(duration_ms), 0.0) as overall_avg_duration_ms
                FROM agent_telemetry_logs
            """)
            stats = cursor.fetchone()

            # Ajan Bazında Ortalama Süre ve Hata Sayıları
            cursor.execute("""
                SELECT 
                    agent_id,
                    COUNT(*) as total_runs,
                    COALESCE(AVG(duration_ms), 0.0) as avg_duration_ms,
                    COALESCE(MAX(duration_ms), 0.0) as max_duration_ms,
                    SUM(CASE WHEN status != 'SUCCESS' THEN 1 ELSE 0 END) as error_count
                FROM agent_telemetry_logs
                GROUP BY agent_id
                ORDER BY avg_duration_ms DESC
            """)
            agent_stats_rows = cursor.fetchall()

            # Son Kayıtlar
            cursor.execute("""
                SELECT id, agent_id, action, duration_ms, status, token_usage, date_str
                FROM agent_telemetry_logs
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
            recent_rows = cursor.fetchall()

        total = stats["total_executions"] if stats else 0
        success = stats["successful_executions"] if stats else 0
        errors = stats["error_executions"] if stats else 0
        total_tokens = stats["total_token_usage"] if stats else 0
        overall_avg = round(stats["overall_avg_duration_ms"] if stats else 0.0, 2)

        error_rate = round((errors / total * 100.0), 2) if total > 0 else 0.0

        agent_performance: List[Dict[str, Any]] = []
        slowest_agent = "N/A"
        slowest_avg_ms = 0.0

        for idx, row in enumerate(agent_stats_rows):
            avg_ms = round(row["avg_duration_ms"], 2)
            ag_id = row["agent_id"]
            if idx == 0:
                slowest_agent = ag_id
                slowest_avg_ms = avg_ms
            agent_performance.append({
                "agent_id": ag_id,
                "total_runs": row["total_runs"],
                "avg_duration_ms": avg_ms,
                "max_duration_ms": round(row["max_duration_ms"], 2),
                "error_count": row["error_count"],
            })

        system_status = "HEALTHY" if error_rate < 5.0 else ("DEGRADED" if error_rate < 20.0 else "CRITICAL")

        return {
            "status": system_status,
            "total_executions": total,
            "successful_executions": success,
            "error_executions": errors,
            "error_rate_pct": error_rate,
            "overall_avg_duration_ms": overall_avg,
            "slowest_agent": slowest_agent,
            "slowest_agent_avg_ms": slowest_avg_ms,
            "total_token_usage": total_tokens,
            "agent_performance": agent_performance,
            "recent_logs": [dict(r) for r in recent_rows],
            "timestamp": time.time(),
        }
