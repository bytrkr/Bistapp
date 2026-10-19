"""
Bistapp MT16 - DCF ve Sektörel Çarpan Değerleme Motoru (valuation_engine.py)
---------------------------------------------------------------------------
1. DCF (İndirgenmiş Nakit Akımları): Gordon Büyüme Modeli ve WACC iskonto oranı
   kullanarak şirketin özkaynak/hisse başı adil değerini hesaplar.
2. Sektörel Çarpan Değerlemesi: F/K (P/E) ve PD/DD (P/B) rasyolarını sektör
   ortalamalarıyla kıyaslayarak iskontolu/primli durumunu ölçer.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional


class ValuationEngine:
    """
    DCF (İndirgenmiş Nakit Akımları) ve Sektörel Göreceli Değerleme Motoru
    """

    @classmethod
    def calculate_dcf(
        cls,
        free_cash_flows: Optional[List[float]] = None,
        discount_rate: float = 0.15,
        terminal_growth_rate: float = 0.04,
        shares_outstanding: Optional[float] = None,
        current_price: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Gelecek 5 yılın Serbest Nakit Akışlarını (FCF) ve Gordon Growth terminal değerini
        kullanarak şirketin Adil Değerini (Intrinsic Value) hesaplar.
        """
        # Varsayılan 5 yıllık projeksiyon (sağlanmadıysa)
        fcfs = free_cash_flows or [1000.0, 1150.0, 1320.0, 1520.0, 1750.0]
        r = max(0.05, float(discount_rate))
        g = min(r - 0.01, max(0.01, float(terminal_growth_rate)))

        # 1. Projeksiyon Dönemi Nakit Akışlarının İndirgenmesi
        pv_fcfs = 0.0
        pv_breakdown: List[float] = []
        for t, fcf in enumerate(fcfs, start=1):
            pv_t = fcf / ((1.0 + r) ** t)
            pv_fcfs += pv_t
            pv_breakdown.append(round(pv_t, 2))

        # 2. Terminal Değer (Gordon Growth Modeli: TV = FCF_5 * (1 + g) / (r - g))
        last_fcf = fcfs[-1]
        terminal_value = (last_fcf * (1.0 + g)) / (r - g)
        pv_terminal_value = terminal_value / ((1.0 + r) ** len(fcfs))

        # 3. Toplam Firma/Hisse Adil Değeri
        enterprise_value = pv_fcfs + pv_terminal_value

        if shares_outstanding and shares_outstanding > 0:
            fair_value_per_share = enterprise_value / shares_outstanding
        else:
            fair_value_per_share = enterprise_value

        fair_value_per_share = round(fair_value_per_share, 2)

        # 4. Cari Fiyatla Karşılaştırma ve Prim/İskonto Analizi
        px = float(current_price) if current_price and current_price > 0 else fair_value_per_share
        diff_pct = round(((px - fair_value_per_share) / fair_value_per_share) * 100.0, 1)

        is_overvalued = diff_pct > 25.0
        if is_overvalued:
            status = "ASIRI_PRIMLI"
            summary = f"DCF'ye göre hisse adil değerinin (%{fair_value_per_share:.2f}) %{diff_pct:+.1f} üzerinde işlem görüyor (Aşırı Primli)."
        elif diff_pct > 5.0:
            status = "PRIMLI"
            summary = f"Hisse adil değerinin (%{fair_value_per_share:.2f}) %{diff_pct:+.1f} üzerinde hafif primli."
        elif diff_pct < -15.0:
            status = "ISCONTOLU"
            summary = f"Hisse DCF adil değerine (%{fair_value_per_share:.2f}) göre %{abs(diff_pct):.1f} iskontolu (Cazip Alım Fırsatı)."
        else:
            status = "DENGELI"
            summary = f"Hisse fiyatı DCF adil değeriyle (%{fair_value_per_share:.2f}) dengeli (%{diff_pct:+.1f})."

        return {
            "intrinsic_value": fair_value_per_share,
            "fair_value_per_share": fair_value_per_share,
            "current_price": px,
            "pv_fcfs": round(pv_fcfs, 2),
            "pv_terminal_value": round(pv_terminal_value, 2),
            "terminal_value": round(terminal_value, 2),
            "discount_rate_wacc": r,
            "terminal_growth_rate": g,
            "premium_discount_pct": diff_pct,
            "is_overvalued": is_overvalued,
            "status": status,
            "summary": summary,
        }

    @classmethod
    def evaluate_relative_value(
        cls,
        pe_ratio: float,
        sector_pe: float = 11.5,
        pb_ratio: float = 2.2,
        sector_pb: float = 3.0,
    ) -> Dict[str, Any]:
        """
        Şirketin F/K (P/E) ve PD/DD (P/B) çarpanlarını sektör ortalamalarıyla kıyaslar.
        İskontolu veya Primli durumunu ve yüzdesel sapmayı hesaplar.
        """
        pe = max(0.5, float(pe_ratio))
        s_pe = max(0.5, float(sector_pe))
        pb = max(0.2, float(pb_ratio))
        s_pb = max(0.2, float(sector_pb))

        # İskonto Formülü: Pozitifse şirket ucuz (sektörün altında), negatifse primli
        pe_discount_pct = round(((s_pe - pe) / s_pe) * 100.0, 1)
        pb_discount_pct = round(((s_pb - pb) / s_pb) * 100.0, 1)

        # Ağırlıklı Göreceli İskonto (F/K %60, PD/DD %40)
        weighted_discount_pct = round((pe_discount_pct * 0.60) + (pb_discount_pct * 0.40), 1)

        if weighted_discount_pct >= 10.0:
            status = "ISCONTOLU"
            summary = f"Şirket sektör ortalamasına göre %{weighted_discount_pct:.1f} iskontolu (F/K: {pe:.1f} vs Sektör: {s_pe:.1f})."
        elif weighted_discount_pct <= -15.0:
            status = "PRIMLI"
            summary = f"Şirket sektör ortalamasına göre %{abs(weighted_discount_pct):.1f} primli işlem görüyor (F/K: {pe:.1f} vs Sektör: {s_pe:.1f})."
        else:
            status = "DENGELI"
            summary = f"Şirket çarpanları sektör ortalamalarıyla paralel seviyede (F/K: {pe:.1f}, PD/DD: {pb:.1f})."

        return {
            "pe_ratio": pe,
            "sector_pe": s_pe,
            "pb_ratio": pb,
            "sector_pb": s_pb,
            "pe_discount_pct": pe_discount_pct,
            "pb_discount_pct": pb_discount_pct,
            "weighted_discount_pct": weighted_discount_pct,
            "status": status,
            "summary": summary,
        }
