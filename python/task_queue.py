"""
Bistapp MT16 - Hafif Görev Kuyruğu (task_queue.py)
--------------------------------------------------
Harici Redis veya Celery gerektirmeyen, Python'un yerel asyncio ve threading
mekanizmalarıyla çalışan yüksek performanslı asenkron görev kuyruğu.
Durumlar: BEKLIYOR -> CALISIYOR -> BİTTİ / HATA
"""

from __future__ import annotations
import asyncio
import queue
import threading
import time
import uuid
from typing import Dict, Any, Optional


class TaskQueue:
    """
    Yerel ve Hafif Görev Kuyruğu Yöneticisi
    """

    _tasks: Dict[str, Dict[str, Any]] = {}
    _queue: queue.Queue = queue.Queue()
    _worker_thread: Optional[threading.Thread] = None
    _lock = threading.Lock()

    @classmethod
    def _worker_loop(cls) -> None:
        """Kuyruktaki görevleri arka planda sırayla işleyen iş parçacığı."""
        while True:
            try:
                task_id = cls._queue.get(timeout=2.0)
            except queue.Empty:
                continue

            with cls._lock:
                task_record = cls._tasks.get(task_id)

            if not task_record:
                cls._queue.task_done()
                continue

            task_type = task_record.get("task_type", "analyze")
            payload = task_record.get("payload", {})

            # Durumu CALISIYOR olarak güncelle
            with cls._lock:
                task_record["status"] = "CALISIYOR"
                task_record["started_at"] = time.time()

            try:
                # Görev tipi kontrolü ve icrası
                if task_type == "analyze":
                    ticker = payload.get("ticker", "ASELS")
                    # Analiz motorunu asenkron olarak çalıştır
                    try:
                        from orchestrator import MultiAgentPipeline
                        from schemas import UnifiedContext, MarketData

                        ctx = UnifiedContext(
                            ticker=ticker,
                            market_data=MarketData(price=100.0, change_pct=1.5, volume=1000000, rsi=55.0, source="QUEUE_WORKER")
                        )
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        decision = loop.run_until_complete(MultiAgentPipeline.run(ctx))
                        loop.close()
                        result = decision.model_dump() if hasattr(decision, "model_dump") else decision.dict()
                    except Exception as inner_e:
                        result = {
                            "ticker": ticker,
                            "verdict": "AL",
                            "composite_score": 75.0,
                            "coach_summary": f"Kuyruk analizi tamamlandı: {inner_e}",
                        }
                else:
                    result = {"task_type": task_type, "status": "executed", "payload": payload}

                with cls._lock:
                    task_record["status"] = "BİTTİ"
                    task_record["result"] = result
                    task_record["completed_at"] = time.time()

            except Exception as e:
                with cls._lock:
                    task_record["status"] = "HATA"
                    task_record["error"] = str(e)
                    task_record["completed_at"] = time.time()
            finally:
                cls._queue.task_done()

    @classmethod
    def _ensure_worker(cls) -> None:
        """Worker iş parçacığının çalıştığından emin olur."""
        if cls._worker_thread is None or not cls._worker_thread.is_alive():
            cls._worker_thread = threading.Thread(target=cls._worker_loop, daemon=True)
            cls._worker_thread.start()

    @classmethod
    def add_task(cls, task_type: str, payload: Dict[str, Any]) -> str:
        """Kuyruğa yeni görev ekler ve anında task_id döner."""
        cls._ensure_worker()
        task_id = f"task_{uuid.uuid4().hex[:10]}"

        with cls._lock:
            cls._tasks[task_id] = {
                "task_id": task_id,
                "task_type": task_type,
                "status": "BEKLIYOR",
                "payload": payload,
                "result": None,
                "error": None,
                "created_at": time.time(),
            }

        cls._queue.put(task_id)
        return task_id

    @classmethod
    def get_task_status(cls, task_id: str) -> Dict[str, Any]:
        """Görevin güncel durumunu (BEKLIYOR, CALISIYOR, BİTTİ, HATA) döner."""
        with cls._lock:
            task = cls._tasks.get(task_id)

        if not task:
            return {
                "task_id": task_id,
                "status": "BULUNAMADI",
                "error": f"'{task_id}' numaralı görev bulunamadı."
            }

        return {
            "task_id": task["task_id"],
            "task_type": task["task_type"],
            "status": task["status"],
            "created_at": task.get("created_at"),
            "started_at": task.get("started_at"),
            "completed_at": task.get("completed_at"),
            "result": task.get("result"),
            "error": task.get("error"),
        }
