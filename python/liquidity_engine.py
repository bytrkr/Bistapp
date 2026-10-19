"""
Bistapp MT16 - Otonom Likidite ve Derinlik Şok Motoru (liquidity_engine.py)
------------------------------------------------------------------------
1. calculate_order_book_imbalance: L2 Emir Defteri Dengesizliğini (OBI) hesaplar:
   OBI = (Toplam Alış Hacmi - Toplam Satış Hacmi) / (Toplam Alış Hacmi + Toplam Satış Hacmi)
   - OBI > 0: Alıcı Baskısı
   - OBI < 0: Satıcı Baskısı
2. data_source Bayrağı: Verinin 'REALTIME_WS' (Gerçek Zamanlı WebSocket) mi yoksa
   'SIMULATED' (Simüle) mi olduğunu şeffaf olarak belirtir.
3. analyze_order_book_impact: Büyük emirlerin kademelerde yol açacağı kaymayı (slippage) hesaplar.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional, Union


class LiquidityEngine:
    """
    Likidite Şok, L2 Derinlik ve Emir Defteri Dengesizlik (OBI) Motoru
    """

    @classmethod
    def calculate_order_book_imbalance(
        cls,
        bids: Optional[Union[List[Dict[str, float]], float]] = None,
        asks: Optional[Union[List[Dict[str, float]], float]] = None,
        ticker: str = "BIST",
        data_source: str = "SIMULATED",
    ) -> Dict[str, Any]:
        """
        L2 OBI (Order Book Imbalance) hesaplar:
        Formül: (Toplam Alış Hacmi - Toplam Satış Hacmi) / (Toplam Alış Hacmi + Toplam Satış Hacmi)
        Aralık: [-1.0, +1.0]
        - OBI > +0.10: Alıcı Baskısı (Pozitif)
        - OBI < -0.10: Satıcı Baskısı (Negatif)
        - Diğer: Denge
        """
        # 1. Toplam Alış ve Satış Hacimlerini Belirle
        if isinstance(bids, list):
            total_bid_vol = sum(float(b.get("qty", 0.0) or b.get("amount", 0.0)) for b in bids)
        elif isinstance(bids, (int, float)):
            total_bid_vol = float(bids)
        else:
            total_bid_vol = 500_000.0

        if isinstance(asks, list):
            total_ask_vol = sum(float(a.get("qty", 0.0) or a.get("amount", 0.0)) for a in asks)
        elif isinstance(asks, (int, float)):
            total_ask_vol = float(asks)
        else:
            total_ask_vol = 400_000.0

        total_vol = total_bid_vol + total_ask_vol

        # 2. OBI Formülünün Doğru Hesaplanması: (Bids - Asks) / (Bids + Asks)
        if total_vol > 0:
            obi = round((total_bid_vol - total_ask_vol) / total_vol, 4)
        else:
            obi = 0.0

        # Sınırla [-1.0, +1.0]
        obi = max(-1.0, min(1.0, obi))

        # 3. Yorumlama
        if obi >= 0.15:
            pressure_type = "ALICI_BASKISI"
            pressure_desc = f"Alıcı Baskısı hakim (OBI: {obi:+.3f}). Alış kademeleri satıştan %{((total_bid_vol/max(1, total_ask_vol))-1)*100:.1f} daha yoğun."
        elif obi <= -0.15:
            pressure_type = "SATICI_BASKISI"
            pressure_desc = f"Satıcı Baskısı hakim (OBI: {obi:+.3f}). Satış kademeleri alıştan %{((total_ask_vol/max(1, total_bid_vol))-1)*100:.1f} daha yoğun."
        else:
            pressure_type = "DENGE"
            pressure_desc = f"Alış ve satış kademeleri dengeli (OBI: {obi:+.3f})."

        # 4. Veri Kaynağı ve Simülasyon Uyarısı
        is_simulated = (data_source.upper() != "REALTIME_WS")
        source_label = "Canlı WebSocket (L2 Akışı)" if not is_simulated else "Simüle Veri"
        data_warning = "⚠️ Simüle Veri: Canlı WebSocket L2 akışı değildir. Tahmini derinlik modelidir." if is_simulated else ""

        summary = (
            f"L2 Derinlik Analizi ({ticker}): {pressure_desc} "
            f"[Alış: {total_bid_vol:,.0f} lot, Satış: {total_ask_vol:,.0f} lot, Kaynak: {source_label}]."
        )

        toon = (
            f"#TOON/v3.5 schema=BISTAPP_L2_IMBALANCE\n"
            f"@l2{{sym:{ticker};obi:{obi:+.3f};pressure:{pressure_type};bid_vol:{total_bid_vol:,.0f};"
            f"ask_vol:{total_ask_vol:,.0f};source:{data_source};is_simulated:{is_simulated}}}\n"
            f"@summary{{{summary}}}"
        )

        return {
            "ticker": ticker.upper(),
            "obi": obi,
            "pressure_type": pressure_type,
            "pressure_description": pressure_desc,
            "total_bid_volume": total_bid_vol,
            "total_ask_volume": total_ask_vol,
            "wall_pressure_ratio": round(total_bid_vol / max(1.0, total_ask_vol), 3),
            "data_source": data_source.upper(),
            "is_simulated": is_simulated,
            "source_label": source_label,
            "data_warning": data_warning,
            "summary": summary,
            "toon": toon,
        }

    @classmethod
    def analyze_order_book_impact(
        cls,
        bids: List[Dict[str, float]],
        asks: List[Dict[str, float]],
        order_size_tl: float,
        current_price: float,
        side: str = "BUY",
        data_source: str = "SIMULATED",
    ) -> Dict[str, Any]:
        """
        Emir büyüklüğünün (order_size_tl) emir defterindeki (bids/asks) kademeleri
        ne kadar tüketeceğini ve yüzde kaç kayma (slippage) yaratacağını hesaplar.
        """
        target_side = asks if side.strip().upper() == "BUY" else bids
        px = max(0.01, float(current_price))
        size = max(100.0, float(order_size_tl))

        # OBI hesabı
        obi_info = cls.calculate_order_book_imbalance(bids=bids, asks=asks, data_source=data_source)

        if not target_side:
            estimated_slippage_pct = 2.0
            levels_consumed = 5
        else:
            sorted_levels = sorted(
                target_side,
                key=lambda x: x.get("price", 0.0),
                reverse=(side.strip().upper() != "BUY")
            )

            remaining_tl = size
            consumed_notional = 0.0
            worst_price = px
            levels_count = 0

            for lvl in sorted_levels:
                l_px = lvl.get("price", px)
                l_qty = lvl.get("qty", 1000.0)
                l_notional = l_px * l_qty
                levels_count += 1

                if remaining_tl <= l_notional:
                    consumed_notional += remaining_tl
                    worst_price = l_px
                    remaining_tl = 0.0
                    break
                else:
                    consumed_notional += l_notional
                    remaining_tl -= l_notional
                    worst_price = l_px

            if remaining_tl > 0:
                worst_price = worst_price * (1.02 if side.strip().upper() == "BUY" else 0.98)

            if side.strip().upper() == "BUY":
                estimated_slippage_pct = ((worst_price - px) / px) * 100.0
            else:
                estimated_slippage_pct = ((px - worst_price) / px) * 100.0
            
            estimated_slippage_pct = max(0.0, round(estimated_slippage_pct, 2))
            levels_consumed = levels_count

        is_thin_book = estimated_slippage_pct > 1.5
        warning_msg = (
            f"⚠️ Sığ Tahta Uyarısı: {size:,.0f} TL tutarındaki emir %{estimated_slippage_pct:.2f} kayma yaratıyor. "
            f"Emri parçalara bölerek (Iceberg/TWAP) gönderiniz."
            if is_thin_book
            else f"✅ Likidite Yeterli: Tahmini kayma %{estimated_slippage_pct:.2f} (Kademeler arası derinlik uygun)."
        )

        return {
            "order_size_tl": size,
            "current_price": px,
            "side": side.upper(),
            "estimated_slippage_pct": estimated_slippage_pct,
            "levels_consumed": levels_consumed,
            "is_thin_book": is_thin_book,
            "recommendation": "ICEBERG_TWAP_SPLIT" if is_thin_book else "DIRECT_EXECUTION",
            "warning": warning_msg,
            "obi_metrics": obi_info,
            "data_source": data_source.upper(),
            "is_simulated": (data_source.upper() != "REALTIME_WS"),
        }
