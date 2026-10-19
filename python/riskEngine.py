"""
Bistapp MT16 - Risk Engine & Kelly Criterion (riskEngine.py)
------------------------------------------------------------
ATR, Z-Skor ve Kelly Kriteri kullanarak dinamik pozisyon boyutlandırma
(calculate_position_size) hesaplaması yapar.
"""

from __future__ import annotations
import math
from typing import Dict, Any, Optional

class RiskEngine:
    """
    Dinamik Pozisyon Boyutlandırma ve Kelly Kriteri Motoru
    """
    @staticmethod
    def calculate_position_size(
        capital: float,
        risk_free_pct: float,
        win_probability: float,
        win_loss_ratio: float,
        atr: float,
        current_price: float,
        z_score: float = 0.0
    ) -> Dict[str, Any]:
        """
        Kelly Kriteri ve ATR bazlı dinamik pozisyon büyüklüğü (lot/tutar) hesaplar.
        """
        cap = max(100.0, float(capital))
        price = max(0.01, float(current_price))
        vol_atr = max(0.001, float(atr))
        p = max(0.1, min(0.9, float(win_probability)))
        b = max(0.1, float(win_loss_ratio))

        # Kelly Formülü: f* = (p * (b + 1) - 1) / b
        kelly_f = (p * (b + 1.0) - 1.0) / b
        kelly_f = max(0.0, min(0.5, kelly_f)) # Güvenlik için maksimum %50 ile sınırla

        # Z-Skor düzeltmesi (Aşırı sapmalarda pozisyonu daralt)
        z_factor = 1.0 - (min(3.0, abs(z_score)) * 0.1)
        z_factor = max(0.5, z_factor)

        recommended_allocation_usd = cap * kelly_f * z_factor
        recommended_lots = round(recommended_allocation_usd / price, 2)

        # ATR bazlı Stop-Loss mesafesi (2 * ATR)
        stop_loss_distance = 2.0 * vol_atr
        suggested_stop_price = round(price - stop_loss_distance, 2)

        return {
            "capital": cap,
            "kelly_fraction": round(kelly_f, 4),
            "z_score_adjustment": round(z_factor, 2),
            "recommended_allocation_usd": round(recommended_allocation_usd, 2),
            "recommended_lots": recommended_lots,
            "suggested_stop_price": suggested_stop_price,
            "atr": vol_atr,
        }

    @staticmethod
    def calculate_adaptive_trailing_stop(
        entry_price: float,
        current_price: float,
        peak_price: float,
        atr: float,
        atr_multiplier: float = 2.5
    ) -> Dict[str, Any]:
        """
        ATR ve zirve fiyata (peak_price) göre dinamik trailing stop-loss hesaplar.
        """
        entry = max(0.01, float(entry_price))
        curr = max(0.01, float(current_price))
        peak = max(entry, float(peak_price))
        vol_atr = max(0.001, float(atr))
        mult = max(0.5, float(atr_multiplier))

        stop_distance = mult * vol_atr
        dynamic_stop_price = round(peak - stop_distance, 2)
        
        initial_stop = round(entry - stop_distance, 2)
        final_stop = max(initial_stop, dynamic_stop_price)
        final_stop = min(final_stop, curr * 0.99)

        risk_pct = round(((curr - final_stop) / curr) * 100.0, 2)

        return {
            "entry_price": entry,
            "current_price": curr,
            "peak_price": peak,
            "atr": vol_atr,
            "atr_multiplier": mult,
            "adaptive_stop_price": final_stop,
            "risk_percentage": risk_pct,
            "status": "ACTIVE_TRAILING",
        }
