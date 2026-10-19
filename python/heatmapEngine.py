"""
Bistapp MT16 - Order Book Heatmap & Iceberg Detector (heatmapEngine.py)
----------------------------------------------------------------------
L2 emir defterindeki (bids/asks) büyük duvarları tespit eder ve ortalamanın
4 katından büyük emirleri Iceberg (gizli) emir olarak işaretler.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional

class HeatmapEngine:
    """
    Derinlik Isı Haritası ve Iceberg Dedektörü
    """
    @staticmethod
    def analyze_depth_heatmap(bids: List[Dict[str, float]], asks: List[Dict[str, float]]) -> Dict[str, Any]:
        """
        Bids ve Asks listelerini tarayarak büyük duvarları ve Iceberg (gizli) emirleri tespit eder.
        Her öğe: {"price": float, "qty": float}
        """
        all_orders = []
        for b in bids:
            all_orders.append({"side": "BID", "price": b.get("price", 0.0), "qty": b.get("qty", 0.0)})
        for a in asks:
            all_orders.append({"side": "ASK", "price": a.get("price", 0.0), "qty": a.get("qty", 0.0)})

        if not all_orders:
            return {
                "walls_detected": [],
                "icebergs_detected": [],
                "average_qty": 0.0,
                "summary": "Emir defteri verisi boş.",
            }

        total_qty = sum(o["qty"] for o in all_orders)
        avg_qty = total_qty / len(all_orders)

        walls = []
        icebergs = []

        for o in all_orders:
            # Ortalamanın 3 katı duvar
            if o["qty"] >= avg_qty * 3.0:
                walls.append(o)
            # Ortalamanın 4 katından büyükse Iceberg (gizli/büyük blok) şüphesi
            if o["qty"] >= avg_qty * 4.0:
                icebergs.append(o)

        summary = (
            f"Derinlik ısı haritası tarandı: {len(walls)} duvar, "
            f"{len(icebergs)} Iceberg (gizli alım/satım) şüpheli kademe tespit edildi (Ort. Lot: {avg_qty:,.1f})."
        )

        return {
            "walls_detected": walls,
            "icebergs_detected": icebergs,
            "average_qty": round(avg_qty, 2),
            "summary": summary,
        }
