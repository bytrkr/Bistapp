"""
Bistapp MT16 - Slippage & Fee Accountant (slippageModel.py)
-----------------------------------------------------------
Maker/Taker komisyon oranlarını ve piyasa kaymasını (slippage) hesaplayarak
net gerçekleşen fiyatı ve kesinti tutarını hesaplar.
"""

from __future__ import annotations
from typing import Dict, Any, Optional

class SlippageAccountant:
    """
    Komisyon, Maker/Taker ve Slippage (Kayma) Muhasebe Motoru
    """
    MAKER_FEE_RATE: float = 0.0005  # %0.05
    TAKER_FEE_RATE: float = 0.0010  # %0.10
    DEFAULT_SLIPPAGE_BPS: float = 5.0 # 5 basis points (0.05%)

    @classmethod
    def calculate_net_execution(
        cls,
        order_type: str, # "MAKER" veya "TAKER"
        side: str,       # "BUY" veya "SELL"
        price: float,
        lots: float,
        custom_slippage_bps: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Emir tipi, komisyon oranları ve slippage (kayma) hesabı yaparak net tutar ve fiyatı döner.
        """
        px = max(0.01, float(price))
        qty = max(0.0001, float(lots))
        is_maker = order_type.strip().upper() == "MAKER"
        fee_rate = cls.MAKER_FEE_RATE if is_maker else cls.TAKER_FEE_RATE
        
        bps = custom_slippage_bps if custom_slippage_bps is not None else cls.DEFAULT_SLIPPAGE_BPS
        slippage_fraction = bps / 10000.0

        if side.strip().upper() == "BUY":
            executed_price = px * (1.0 + slippage_fraction)
        else:
            executed_price = px * (1.0 - slippage_fraction)

        gross_notional = executed_price * qty
        fee_amount = gross_notional * fee_rate

        if side.strip().upper() == "BUY":
            net_total = gross_notional + fee_amount
        else:
            net_total = gross_notional - fee_amount

        summary = (
            f"Gerçekleşme ({order_type} {side}): Hedef Fiyat {px:.2f} -> "
            f"Gerçekleşen Fiyat {executed_price:.2f} (Kayma: {bps} bps). "
            f"Komisyon: {fee_amount:,.2f} TL, Net Tutar: {net_total:,.2f} TL."
        )

        return {
            "order_type": order_type.upper(),
            "side": side.upper(),
            "target_price": px,
            "executed_price": round(executed_price, 4),
            "slippage_bps": bps,
            "gross_notional": round(gross_notional, 2),
            "fee_rate": fee_rate,
            "fee_amount": round(fee_amount, 2),
            "net_total": round(net_total, 2),
            "summary": summary,
        }
