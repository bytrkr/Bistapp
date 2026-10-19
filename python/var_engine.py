"""
Bistapp MT16 - Kümülatif Portföy Riske Maruz Değer Motoru (var_engine.py)
------------------------------------------------------------------------
Portföydeki varlıkların oynaklıkları ve kovaryans matrisi üzerinden:
1. Parametrik Riske Maruz Değer (Parametric VaR - Value at Risk)
2. Beklenen Kayıp (CVaR / Expected Shortfall)
3. Marjinal VaR (Marginal VaR - Yeni bir hisse eklendiğinde risk artışı)
hesaplamalarını gerçekleştirir. Pure Python ve NumPy uyumludur.
"""

from __future__ import annotations
import math
from typing import Dict, Any, List, Optional

try:
    import numpy as np
except ImportError:
    np = None

# BIST hisselerinin günlük referans oynaklıkları (standart sapma) ve sektör korelasyon tabanı
HISTORICAL_VOLATILITIES = {
    "GARAN": 0.024, "AKBNK": 0.023, "ISCTR": 0.022, "YKBNK": 0.023, "VAKBN": 0.026,
    "THYAO": 0.021, "PGSUS": 0.027, "TAVHL": 0.020,
    "ASELS": 0.016, "SDTTR": 0.029, "OTKAR": 0.022,
    "FROTO": 0.018, "TOASO": 0.019, "TTRAK": 0.021,
    "EREGL": 0.019, "KRDMD": 0.022, "SISE": 0.017,
    "TUPRS": 0.018, "PETKM": 0.022,
    "BIMAS": 0.014, "MGROS": 0.016,
    "KCHOL": 0.016, "SAHOL": 0.017,
}

# Standart Normal Dağılım Kritik Z Değerleri (Tek Kuyruklu)
Z_VALUES = {
    0.90: 1.28155,
    0.95: 1.64485,
    0.99: 2.32635,
}


def _get_z_score(confidence_level: float) -> float:
    # En yakın güven seviyesini eşle
    if confidence_level >= 0.99:
        return Z_VALUES[0.99]
    elif confidence_level <= 0.90:
        return Z_VALUES[0.90]
    else:
        return Z_VALUES[0.95]


def _get_asset_vol(ticker: str) -> float:
    clean = ticker.strip().upper().replace(".IS", "")
    return HISTORICAL_VOLATILITIES.get(clean, 0.020)


def _get_correlation(ticker1: str, ticker2: str) -> float:
    t1 = ticker1.strip().upper().replace(".IS", "")
    t2 = ticker2.strip().upper().replace(".IS", "")
    if t1 == t2:
        return 1.0

    # Aynı sektör içi hisseler yüksek korelasyon, farklı sektörler orta/düşük
    banks = {"GARAN", "AKBNK", "ISCTR", "YKBNK", "VAKBN"}
    aviation = {"THYAO", "PGSUS", "TAVHL"}
    defense = {"ASELS", "SDTTR", "OTKAR"}

    if (t1 in banks and t2 in banks) or (t1 in aviation and t2 in aviation) or (t1 in defense and t2 in defense):
        return 0.75
    elif (t1 in banks and t2 in defense) or (t2 in banks and t1 in defense):
        return 0.35
    elif (t1 in aviation and t2 in defense):
        return 0.25
    else:
        return 0.50


class VaREngine:
    """
    Parametrik Portföy Riske Maruz Değer (VaR) ve Likidite Marj Kalkanı Motoru
    """

    @classmethod
    def calculate_portfolio_var(
        cls,
        portfolio: List[Dict[str, Any]],
        confidence_level: float = 0.95,
        time_horizon_days: int = 1
    ) -> Dict[str, Any]:
        """
        Portföyün 1 günlük (veya belirtilen vadeli) Parametrik VaR ve CVaR değerini hesaplar.
        """
        if not portfolio:
            return {
                "total_value_tl": 0.0,
                "portfolio_volatility_pct": 0.0,
                "var_pct": 0.0,
                "var_tl": 0.0,
                "cvar_tl": 0.0,
                "confidence_level": confidence_level,
                "time_horizon_days": time_horizon_days,
                "risk_level": "SIFIR_RISK",
                "summary": "Portföyde varlık bulunmuyor.",
                "toon": "",
            }

        # 1. Toplam Portföy Değeri ve Ağırlıkların Hesaplanması
        total_value = sum(float(item.get("value_tl") or (float(item.get("amount", 1)) * float(item.get("price", 100.0)))) for item in portfolio)
        total_value = max(1.0, total_value)

        tickers = []
        weights = []
        vols = []

        for item in portfolio:
            t = str(item.get("ticker", "BIST")).upper().replace(".IS", "")
            val = float(item.get("value_tl") or (float(item.get("amount", 1)) * float(item.get("price", 100.0))))
            w = val / total_value
            tickers.append(t)
            weights.append(w)
            vols.append(_get_asset_vol(t))

        n = len(tickers)

        # 2. Kovaryans Matrisi ve Portföy Varyansı
        # sigma_p^2 = sum_i sum_j (w_i * w_j * cov_ij)
        portfolio_variance = 0.0
        for i in range(n):
            for j in range(n):
                corr = _get_correlation(tickers[i], tickers[j])
                cov_ij = corr * vols[i] * vols[j]
                portfolio_variance += weights[i] * weights[j] * cov_ij

        portfolio_volatility = math.sqrt(max(0.000001, portfolio_variance))
        z_score = _get_z_score(confidence_level)
        sqrt_time = math.sqrt(max(1, time_horizon_days))

        # 1 Günlük Parametrik VaR Oranı
        var_pct = z_score * portfolio_volatility * sqrt_time
        var_tl = round(total_value * var_pct, 2)
        var_pct_rounded = round(var_pct * 100.0, 2)

        # Beklenen Kayıp (CVaR / Expected Shortfall)
        # Standart normal yoğunluk fonksiyonu phi(z)
        phi_z = (1.0 / math.sqrt(2.0 * math.pi)) * math.exp(-0.5 * (z_score ** 2))
        alpha = 1.0 - confidence_level
        cvar_pct = (phi_z / alpha) * portfolio_volatility * sqrt_time
        cvar_tl = round(total_value * cvar_pct, 2)

        # Risk Seviyesi Sınıflandırması
        if var_pct_rounded >= 4.5:
            risk_level = "YÜKSEK_RİSK"
            risk_desc = "Portföy riske maruz değeri yüksek; korelasyonlu veya aşırı oynak varlıklar ağırlıkta."
        elif var_pct_rounded >= 2.5:
            risk_level = "ORTA_RİSK"
            risk_desc = "Portföy dengeli dağılmış, normal piyasa dalgalanma sınırlarında."
        else:
            risk_level = "DÜŞÜK_RİSK"
            risk_desc = "Defansif ve çeşitlendirilmiş portföy, kriz direnci güçlü."

        summary = (
            f"Parametrik VaR Analizi (%{confidence_level*100:.0f} Güven, {time_horizon_days} Gün): "
            f"Portföy Değeri: {total_value:,.0f} TL. Günlük Maksimum Tahmini Kayıp (VaR): "
            f"%{var_pct_rounded:.2f} ({var_tl:,.0f} TL). Beklenen Kriz Kaybı (CVaR): {cvar_tl:,.0f} TL. "
            f"Risk Durumu: {risk_level}."
        )

        toon = (
            f"#TOON/v3.5 schema=BISTAPP_PARAMETRIC_VAR\n"
            f"@var{{port_val:{total_value:,.0f}TL;conf:%{confidence_level*100:.0f};vol:%{portfolio_volatility*100:.2f};"
            f"var_pct:%{var_pct_rounded:.2f};var_tl:{var_tl:,.0f}TL;cvar_tl:{cvar_tl:,.0f}TL;risk:{risk_level}}}\n"
            f"@summary{{{summary}}}"
        )

        return {
            "total_value_tl": total_value,
            "portfolio_volatility_pct": round(portfolio_volatility * 100.0, 2),
            "var_pct": var_pct_rounded,
            "var_tl": var_tl,
            "cvar_tl": cvar_tl,
            "confidence_level": confidence_level,
            "time_horizon_days": time_horizon_days,
            "risk_level": risk_level,
            "risk_description": risk_desc,
            "asset_count": n,
            "assets": [
                {"ticker": tickers[i], "weight_pct": round(weights[i] * 100.0, 1), "volatility_pct": round(vols[i] * 100.0, 2)}
                for i in range(n)
            ],
            "summary": summary,
            "toon": toon,
        }

    @classmethod
    def calculate_marginal_var(
        cls,
        new_asset: Dict[str, Any],
        portfolio: List[Dict[str, Any]],
        confidence_level: float = 0.95
    ) -> Dict[str, Any]:
        """
        Portföye yeni bir hisse eklendiğinde portföyün genel VaR değerini
        ne kadar artıracağını (Marjinal VaR) hesaplar.
        """
        # 1. Mevcut Portföy VaR Hesabı
        existing_res = cls.calculate_portfolio_var(portfolio, confidence_level=confidence_level)
        existing_var_tl = existing_res.get("var_tl", 0.0)
        existing_total_val = existing_res.get("total_value_tl", 0.0)

        # 2. Yeni Varlık Eklenmiş Portföy
        new_ticker = str(new_asset.get("ticker", "BIST")).upper().replace(".IS", "")
        new_val = float(new_asset.get("value_tl") or (float(new_asset.get("amount", 1)) * float(new_asset.get("price", 100.0))))

        updated_portfolio = [dict(item) for item in portfolio]
        updated_portfolio.append({
            "ticker": new_ticker,
            "value_tl": new_val,
        })

        new_res = cls.calculate_portfolio_var(updated_portfolio, confidence_level=confidence_level)
        new_var_tl = new_res.get("var_tl", 0.0)
        new_total_val = new_res.get("total_value_tl", 0.0)

        # 3. Marjinal VaR Artışı
        marginal_var_tl = round(new_var_tl - existing_var_tl, 2)
        var_increase_pct = round(((new_var_tl - existing_var_tl) / max(1.0, existing_var_tl)) * 100.0, 2) if existing_var_tl > 0 else 100.0

        # Eğer yeni işlem VaR'ı %20'den fazla artırıyorsa aşırı risk uyarısı
        is_excessive_risk = (var_increase_pct > 20.0) or (new_res.get("var_pct", 0.0) > 4.5)

        if is_excessive_risk:
            recommendation = (
                f"⚠️ MARJİNAL RİSK UYARISI: {new_ticker} hissesinin portföye eklenmesi, "
                f"toplam Riske Maruz Değeri (VaR) %{var_increase_pct:+.1f} (+{marginal_var_tl:,.0f} TL) "
                f"artırmaktadır. Pozisyon miktarını düşürmeniz veya defansif varlıklarla dengelemeniz önerilir."
            )
        else:
            recommendation = (
                f"✅ DENGELİ MARJİNAL RİSK: {new_ticker} hissesi portföy VaR'ını kabul edilebilir "
                f"sınırlar içinde (%{var_increase_pct:+.1f}, +{marginal_var_tl:,.0f} TL) artırmaktadır."
            )

        return {
            "new_asset_ticker": new_ticker,
            "new_asset_value_tl": new_val,
            "existing_portfolio_var_tl": existing_var_tl,
            "new_portfolio_var_tl": new_var_tl,
            "marginal_var_tl": marginal_var_tl,
            "var_increase_pct": var_increase_pct,
            "is_excessive_risk": is_excessive_risk,
            "new_portfolio_var_pct": new_res.get("var_pct", 0.0),
            "recommendation": recommendation,
        }
