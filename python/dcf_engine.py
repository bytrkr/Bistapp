"""
Bistapp MT16 - İndirgenmiş Nakit Akımları (DCF) Değerleme Motoru (dcf_engine.py)
-------------------------------------------------------------------------------
Gelecekteki serbest nakit akımlarını (FCFF/FCFE), ağırlıklı ortalama sermaye
maliyeti (WACC / discount_rate) ve Gordon Büyüme Modeli ile iskonto ederek
şirketin hisse başı adil değerini ve aşırı değerli/ucuz olma durumunu hesaplar.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional
try:
    from valuation_engine import ValuationEngine
except ImportError:
    ValuationEngine = None


def calculate_dcf(
    ticker: str,
    cash_flows: List[float],
    discount_rate: float,
    terminal_growth: float,
    current_price: float,
    shares_outstanding: Optional[float] = None,
    net_debt: float = 0.0,
) -> Dict[str, Any]:
    """
    İndirgenmiş Nakit Akımları (DCF) Hesabı:
    - cash_flows: Gelecek projeksiyon serbest nakit akımları (örn. 5 yıllık liste)
    - discount_rate: İskonto oranı (WACC - örn: 0.18 for %18)
    - terminal_growth: Uç büyüme oranı (Gordon Growth - örn: 0.05 for %5)
    - current_price: Hissenin güncel borsa fiyatı
    - shares_outstanding: Ödenmiş sermaye / hisse adedi (opsiyonel)
    - net_debt: Net borç (Finansal Borçlar - Nakit)
    """
    symbol = (ticker or "BIST").upper().strip()
    price = max(0.01, float(current_price))
    wacc = max(0.05, float(discount_rate))
    g = min(wacc - 0.01, max(0.0, float(terminal_growth))) # g < WACC kuralı

    # Nakit akışları boşsa veya geçersizse projeksiyon üret
    if not cash_flows or len(cash_flows) == 0:
        base_cf = price * 1.5
        flows = [base_cf * ((1.0 + g) ** i) for i in range(1, 6)]
    else:
        flows = [float(cf) for cf in cash_flows]

    # 1. Projeksiyon Dönemi İskonto Edilmiş Nakit Akımları (PV of Cash Flows)
    pv_cash_flows = []
    total_pv_cf = 0.0
    for i, cf in enumerate(flows, start=1):
        discount_factor = (1.0 + wacc) ** i
        pv = cf / discount_factor
        pv_cash_flows.append(round(pv, 2))
        total_pv_cf += pv

    # 2. Uç Değer (Terminal Value) - Gordon Growth Modeli
    last_cf = flows[-1]
    terminal_value = (last_cf * (1.0 + g)) / (wacc - g)
    pv_terminal_value = terminal_value / ((1.0 + wacc) ** len(flows))

    # 3. Firma Değeri (Enterprise Value) ve Özkaynak Değeri (Equity Value)
    enterprise_value = total_pv_cf + pv_terminal_value
    equity_value = enterprise_value - net_debt

    # 4. Hisse Başı Adil Değer
    if shares_outstanding and shares_outstanding > 0:
        fair_value = equity_value / float(shares_outstanding)
    else:
        # Hisse adedi verilmemişse fiyat oranlaması bazlı adil değer
        scaling_ratio = equity_value / max(1.0, sum(flows))
        fair_value = price * (0.8 + (scaling_ratio * 0.1))

    fair_value = max(0.01, round(fair_value, 2))
    upside_potential_pct = round(((fair_value - price) / price) * 100.0, 2)

    # 5. Değerleme Durumu ve Marj Değerlendirmesi
    if upside_potential_pct > 25.0:
        valuation_status = "COK_UCUZ"
        signal = "GUCLU_AL"
    elif upside_potential_pct > 8.0:
        valuation_status = "UCUZ"
        signal = "AL"
    elif upside_potential_pct >= -8.0:
        valuation_status = "DENGEDE_ADIL"
        signal = "NOTR"
    elif upside_potential_pct >= -25.0:
        valuation_status = "PAHALI"
        signal = "SAT"
    else:
        valuation_status = "ASIRI_PAHALI"
        signal = "GUCLU_SAT"

    return {
        "ticker": symbol,
        "current_price": price,
        "fair_value": fair_value,
        "upside_potential_pct": upside_potential_pct,
        "valuation_status": valuation_status,
        "recommended_signal": signal,
        "discount_rate_wacc": round(wacc, 4),
        "terminal_growth_rate": round(g, 4),
        "pv_projected_cash_flows": pv_cash_flows,
        "total_pv_cash_flows": round(total_pv_cf, 2),
        "terminal_value": round(terminal_value, 2),
        "pv_terminal_value": round(pv_terminal_value, 2),
        "enterprise_value": round(enterprise_value, 2),
        "equity_value": round(equity_value, 2),
    }
