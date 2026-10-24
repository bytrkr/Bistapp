"""
Bistapp MT16 - Küresel Ajan Hafızası ve Performans Takibi (memory.py)
--------------------------------------------------------------------
Ajanların (Teknik, Takas, Temel, Makro, Haber, Trend) geçmiş sinyal ve işlem
başarılarını SQLite tabanında kaydeder. Ajanların münazara ağırlıklarını
dinamik olarak günceller.
"""

from __future__ import annotations
import os
import sqlite3
import json
import time
from typing import Dict, Any, List, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agent_memory.db")


class GlobalAgentMemory:
    """
    Tüm ajanların tarihsel isabet oranlarını, kümülatif kâr/zarar katkısını
    ve dinamik güven ağırlıklarını tutan hafıza motoru.
    """
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS agent_profiles (
                        agent_name TEXT PRIMARY KEY,
                        total_signals INTEGER DEFAULT 0,
                        correct_signals INTEGER DEFAULT 0,
                        accuracy_pct REAL DEFAULT 50.0,
                        weight REAL DEFAULT 1.0,
                        last_updated REAL
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS signal_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        agent_name TEXT,
                        ticker TEXT,
                        signal TEXT,
                        actual_outcome TEXT,
                        pnl_pct REAL,
                        timestamp REAL,
                        metadata TEXT
                    )
                """)
                conn.commit()
                self._seed_default_profiles(conn)
        except Exception:
            pass

    def _seed_default_profiles(self, conn):
        defaults = [
            ("teknik", 1.0),
            ("takas", 1.15),
            ("temel", 1.10),
            ("haber", 0.95),
            ("makro", 1.05),
            ("trend", 1.0),
            ("social", 0.85),
        ]
        cursor = conn.cursor()
        for name, initial_weight in defaults:
            cursor.execute("""
                INSERT OR IGNORE INTO agent_profiles (agent_name, total_signals, correct_signals, accuracy_pct, weight, last_updated)
                VALUES (?, 20, 12, 60.0, ?, ?)
            """, (name, initial_weight, time.time()))
        conn.commit()

    def get_all_profiles(self) -> Dict[str, Dict[str, Any]]:
        """
        Tüm ajanların güncel profil, isabet oranı ve ağırlıklarını döner.
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT agent_name, total_signals, correct_signals, accuracy_pct, weight, last_updated FROM agent_profiles")
                rows = cursor.fetchall()
                profiles = {}
                for r in rows:
                    profiles[r[0]] = {
                        "agent_name": r[0],
                        "total_signals": r[1],
                        "correct_signals": r[2],
                        "accuracy_pct": round(r[3], 2),
                        "dynamic_weight": round(r[4], 2),
                        "last_updated": r[5],
                    }
                return profiles
        except Exception:
            return {
                "teknik": {"accuracy_pct": 58.0, "dynamic_weight": 1.0},
                "takas": {"accuracy_pct": 65.0, "dynamic_weight": 1.15},
                "temel": {"accuracy_pct": 62.0, "dynamic_weight": 1.10},
            }

    def add_memory(self, agent_name: str, record: Dict[str, Any]) -> bool:
        """
        Bir ajanın tahmin/işlem kaydını ekler ve ağırlığını günceller.
        """
        try:
            name = str(agent_name).lower().strip()
            ticker = record.get("ticker", "BIST")
            signal = record.get("signal", "NOTR")
            outcome = record.get("outcome", "PENDING")
            pnl = float(record.get("pnl_pct", 0.0))
            is_correct = outcome == "SUCCESS" or pnl > 0.0

            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO signal_history (agent_name, ticker, signal, actual_outcome, pnl_pct, timestamp, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (name, ticker, signal, outcome, pnl, time.time(), json.dumps(record)))

                # Profil güncelle
                cursor.execute("SELECT total_signals, correct_signals FROM agent_profiles WHERE agent_name = ?", (name,))
                row = cursor.fetchone()
                if row:
                    total = row[0] + 1
                    correct = row[1] + (1 if is_correct else 0)
                    acc = (correct / total) * 100.0
                    # Dinamik ağırlık hesaplama (0.50 ile 1.50 arasında normalize)
                    new_weight = max(0.5, min(1.5, 0.5 + (acc / 100.0)))
                    cursor.execute("""
                        UPDATE agent_profiles
                        SET total_signals = ?, correct_signals = ?, accuracy_pct = ?, weight = ?, last_updated = ?
                        WHERE agent_name = ?
                    """, (total, correct, acc, new_weight, time.time(), name))
                else:
                    cursor.execute("""
                        INSERT INTO agent_profiles (agent_name, total_signals, correct_signals, accuracy_pct, weight, last_updated)
                        VALUES (?, 1, ?, ?, 1.0, ?)
                    """, (name, 1 if is_correct else 0, 100.0 if is_correct else 0.0, time.time()))

                conn.commit()
                return True
        except Exception:
            return False


# Global singleton instance
global_agent_memory = GlobalAgentMemory()
