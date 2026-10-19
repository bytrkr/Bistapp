"""
Bistapp MT16 - Portfolio Guard & Correlation Shield (portfolioGuard.py)
----------------------------------------------------------------------
Pearson korelasyon matrisi kullanarak portföydeki varlıklar arasındaki
yüksek korelasyonu (örn. > 0.85) tespit eder ve yeni işlem onayını reddeder.
"""

from __future__ import annotations
import math
from typing import Dict, Any, List, Optional

class PortfolioGuard:
    """
    Portföy Korelasyon Kalkanı ve İşlem Onay Süzgeci
    """
    CORRELATION_THRESHOLD: float = 0.85

    @staticmethod
    def calculate_pearson_correlation(series_a: List[float], series_b: List[float]) -> float:
        """İki fiyat serisi arasındaki Pearson korelasyon katsayısını hesaplar."""
        if not series_a or not series_b or len(series_a) != len(series_b) or len(series_a) < 2:
            return 0.0

        n = len(series_a)
        mean_a = sum(series_a) / n
        mean_b = sum(series_b) / n

        num = sum((series_a[i] - mean_a) * (series_b[i] - mean_b) for i in range(n))
        den_a = math.sqrt(sum((series_a[i] - mean_a) ** 2 for i in range(n)))
        den_b = math.sqrt(sum((series_b[i] - mean_b) ** 2 for i in range(n)))

        if den_a == 0 or den_b == 0:
            return 0.0

        return num / (den_a * den_b)

    @classmethod
    def check_trade_approval(
        cls,
        candidate_ticker: str,
        candidate_prices: List[float],
        existing_portfolio_series: Dict[str, List[float]]
    ) -> Dict[str, Any]:
        """
        Portföydeki mevcut varlıklar ile aday varlık (candidate) arasındaki korelasyonu inceler.
        Eğer herhangi bir varlıkla korelasyon > 0.85 ise işlemi reddeder.
        """
        if not existing_portfolio_series:
            return {
                "approved": True,
                "max_correlation": 0.0,
                "reason": "Portföy boş, korelasyon riski bulunmuyor.",
            }

        max_corr = 0.0
        correlated_asset = None

        for ticker, series in existing_portfolio_series.items():
            if ticker == candidate_ticker:
                continue
            corr = cls.calculate_pearson_correlation(candidate_prices, series)
            if abs(corr) > abs(max_corr):
                max_corr = corr
                correlated_asset = ticker

        approved = abs(max_corr) <= cls.CORRELATION_THRESHOLD
        reason = (
            f"İşlem onaylandı. Maksimum korelasyon: {max_corr:.2f} ({correlated_asset})"
            if approved
            else f"İşlem REDDEDİLDİ: '{candidate_ticker}' varlığı portföydeki '{correlated_asset}' ile aşırı korelasyonlu ({max_corr:.2f} > {cls.CORRELATION_THRESHOLD})."
        )

        return {
            "approved": approved,
            "max_correlation": round(max_corr, 2),
            "correlated_with": correlated_asset,
            "threshold": cls.CORRELATION_THRESHOLD,
            "reason": reason,
        }
