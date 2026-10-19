"""
Bistapp MT16 - Göreli Çarpan & Sektörel Isı Haritası Motoru (peer_valuation_engine.py)
-------------------------------------------------------------------------------------
Sektördeki akran şirketlerin F/K (P/E), PD/DD (P/B) ve FD/FAVÖK (EV/EBITDA)
çarpanlarını toplayarak sektör ortalamasını ve standart sapmasını hesaplar.
Hissenin 1 standart sapma altında (-1 Z-Score) veya üzerinde (+1 Z-Score) olmasına
göre AŞIRI_ISKONTOLU veya AŞIRI_PRİMLİ sinyali üretir.
"""

from __future__ import annotations
import math
from typing import Dict, Any, List, Optional


SECTOR_PEER_DATABASE = {
    "HAVACILIK": {
        "THYAO": {"pe": 3.8, "pb": 0.85, "ev_ebitda": 4.2},
        "PGSUS": {"pe": 6.8, "pb": 1.45, "ev_ebitda": 6.5},
        "TAVHL": {"pe": 9.2, "pb": 1.65, "ev_ebitda": 8.0},
        "CLEBI": {"pe": 12.5, "pb": 3.20, "ev_ebitda": 10.5},
    },
    "BANKACILIK": {
        "AKBNK": {"pe": 3.2, "pb": 0.72, "ev_ebitda": 3.0},
        "GARAN": {"pe": 3.8, "pb": 0.92, "ev_ebitda": 3.5},
        "ISCTR": {"pe": 3.4, "pb": 0.80, "ev_ebitda": 3.2},
        "YKBNK": {"pe": 3.6, "pb": 0.85, "ev_ebitda": 3.4},
        "VAKBN": {"pe": 4.5, "pb": 0.65, "ev_ebitda": 4.0},
        "HALKB": {"pe": 4.9, "pb": 0.62, "ev_ebitda": 4.3},
    },
    "SAVUNMA": {
        "ASELS": {"pe": 11.2, "pb": 2.10, "ev_ebitda": 9.5},
        "SDTTR": {"pe": 18.5, "pb": 4.80, "ev_ebitda": 15.2},
        "OTKAR": {"pe": 16.0, "pb": 3.90, "ev_ebitda": 13.0},
    },
    "OTOMOTIV": {
        "FROTO": {"pe": 7.5, "pb": 3.40, "ev_ebitda": 6.8},
        "TOASO": {"pe": 8.2, "pb": 2.90, "ev_ebitda": 7.2},
        "TTRAK": {"pe": 8.0, "pb": 4.10, "ev_ebitda": 7.0},
        "DOAS": {"pe": 4.8, "pb": 1.80, "ev_ebitda": 4.2},
    },
    "SANAYI": {
        "EREGL": {"pe": 12.0, "pb": 0.88, "ev_ebitda": 9.2},
        "KRDMD": {"pe": 9.5, "pb": 1.15, "ev_ebitda": 7.5},
        "SISE": {"pe": 7.8, "pb": 1.05, "ev_ebitda": 6.4},
    },
    "ENERJI": {
        "TUPRS": {"pe": 5.8, "pb": 1.55, "ev_ebitda": 4.8},
        "PETKM": {"pe": 14.5, "pb": 2.10, "ev_ebitda": 11.2},
        "AYGAZ": {"pe": 8.2, "pb": 1.60, "ev_ebitda": 6.9},
    },
    "PERAKENDE": {
        "BIMAS": {"pe": 12.8, "pb": 3.80, "ev_ebitda": 8.5},
        "MGROS": {"pe": 11.5, "pb": 3.20, "ev_ebitda": 7.8},
        "SOKM": {"pe": 9.2, "pb": 2.40, "ev_ebitda": 6.2},
    },
    "HOLDING": {
        "KCHOL": {"pe": 4.8, "pb": 1.10, "ev_ebitda": 4.5},
        "SAHOL": {"pe": 3.9, "pb": 0.78, "ev_ebitda": 3.8},
        "ENKAI": {"pe": 8.5, "pb": 1.25, "ev_ebitda": 7.2},
    },
}

TICKER_TO_SECTOR = {
    "THYAO": "HAVACILIK", "PGSUS": "HAVACILIK", "TAVHL": "HAVACILIK", "CLEBI": "HAVACILIK",
    "AKBNK": "BANKACILIK", "GARAN": "BANKACILIK", "ISCTR": "BANKACILIK", "YKBNK": "BANKACILIK",
    "VAKBN": "BANKACILIK", "HALKB": "BANKACILIK",
    "ASELS": "SAVUNMA", "SDTTR": "SAVUNMA", "OTKAR": "SAVUNMA",
    "FROTO": "OTOMOTIV", "TOASO": "OTOMOTIV", "TTRAK": "OTOMOTIV", "DOAS": "OTOMOTIV",
    "EREGL": "SANAYI", "KRDMD": "SANAYI", "SISE": "SANAYI",
    "TUPRS": "ENERJI", "PETKM": "ENERJI", "AYGAZ": "ENERJI",
    "BIMAS": "PERAKENDE", "MGROS": "PERAKENDE", "SOKM": "PERAKENDE",
    "KCHOL": "HOLDING", "SAHOL": "HOLDING", "ENKAI": "HOLDING",
}


class PeerValuationEngine:
    """
    Sektörel Akran Çarpan Karşılaştırması ve Isı Haritası Motoru
    """

    @classmethod
    def calculate_sector_heatmap(
        cls,
        ticker: str,
        peer_group_data: Optional[Dict[str, Dict[str, float]]] = None
    ) -> Dict[str, Any]:
        """
        Hissenin F/K, PD/DD ve FD/FAVÖK çarpanlarını sektör akranlarıyla kıyaslayarak
        ortalama, standart sapma ve Z-Skorlarını hesaplar.
        """
        clean_ticker = ticker.strip().upper().replace(".IS", "")
        sector = TICKER_TO_SECTOR.get(clean_ticker, "GENEL_SANAYI")

        if peer_group_data:
            peers = peer_group_data
        elif sector in SECTOR_PEER_DATABASE:
            peers = SECTOR_PEER_DATABASE[sector]
        else:
            # Genel sanayi varsayılan akran seti
            peers = {
                clean_ticker: {"pe": 9.5, "pb": 1.8, "ev_ebitda": 7.5},
                "PEER_A": {"pe": 11.2, "pb": 2.2, "ev_ebitda": 8.8},
                "PEER_B": {"pe": 8.0, "pb": 1.5, "ev_ebitda": 6.5},
                "PEER_C": {"pe": 13.5, "pb": 2.8, "ev_ebitda": 10.2},
            }

        # Hedef hisse çarpanları
        if clean_ticker in peers:
            target_multipliers = peers[clean_ticker]
        else:
            target_multipliers = {"pe": 9.0, "pb": 1.8, "ev_ebitda": 7.2}

        # İstatistiki Ortalama ve Standart Sapma Hesapları
        metrics = ["pe", "pb", "ev_ebitda"]
        sector_stats = {}
        z_scores = {}

        for m in metrics:
            vals = [float(p[m]) for p in peers.values() if m in p]
            if len(vals) >= 2:
                mean_val = sum(vals) / len(vals)
                std_val = math.sqrt(sum((x - mean_val) ** 2 for x in vals) / (len(vals) - 1))
                std_val = max(0.01, std_val)  # Sıfıra bölme koruması
            else:
                mean_val = vals[0] if vals else 10.0
                std_val = 1.0

            stock_val = float(target_multipliers.get(m, mean_val))
            z = round((stock_val - mean_val) / std_val, 2)

            sector_stats[m] = {
                "mean": round(mean_val, 2),
                "std": round(std_val, 2),
                "stock_value": round(stock_val, 2),
            }
            z_scores[m] = z

        # Bileşik Z-Skor (Ağırlıklar: F/K %40, PD/DD %30, FD/FAVÖK %30)
        composite_z = round(
            (z_scores.get("pe", 0.0) * 0.40) +
            (z_scores.get("pb", 0.0) * 0.30) +
            (z_scores.get("ev_ebitda", 0.0) * 0.30),
            2
        )

        # Isı Haritası Karar Mantığı (1 Standart Sapma Eşiği)
        if composite_z <= -1.0:
            valuation_status = "AŞIRI_ISKONTOLU"
            status_desc = "Fırsat (Sektör akranlarının 1 standart sapma altında ucuz)"
        elif composite_z >= 1.0:
            valuation_status = "AŞIRI_PRİMLİ"
            status_desc = "Pahalı (Sektör akranlarının 1 standart sapma üzerinde primli)"
        else:
            valuation_status = "SEKTÖRLE_PARALEL"
            status_desc = "Dengeli (Sektör akranlarıyla paralel seviyede)"

        summary = (
            f"Sektörel Isı Haritası ({sector}): {clean_ticker} Bileşik Z-Skor={composite_z:.2f} "
            f"-> {valuation_status} ({status_desc}). "
            f"[F/K: {target_multipliers.get('pe', 0):.1f} vs Sektör: {sector_stats['pe']['mean']:.1f}, "
            f"PD/DD: {target_multipliers.get('pb', 0):.2f} vs Sektör: {sector_stats['pb']['mean']:.2f}]."
        )

        toon = (
            f"#TOON/v3.5 schema=BISTAPP_PEER_HEATMAP\n"
            f"@peer{{sym:{clean_ticker};sector:{sector};peers:{len(peers)};z_score:{composite_z:+.2f};"
            f"status:{valuation_status};pe:{target_multipliers.get('pe', 0):.1f}/{sector_stats['pe']['mean']:.1f};"
            f"pb:{target_multipliers.get('pb', 0):.2f}/{sector_stats['pb']['mean']:.2f}}}\n"
            f"@summary{{{summary}}}"
        )

        return {
            "ticker": clean_ticker,
            "sector": sector,
            "peer_count": len(peers),
            "stock_metrics": target_multipliers,
            "sector_stats": sector_stats,
            "z_scores": z_scores,
            "composite_z_score": composite_z,
            "valuation_status": valuation_status,
            "status_description": status_desc,
            "peers_compared": list(peers.keys()),
            "summary": summary,
            "toon": toon,
        }
