"""
Bistapp MT16 - Makro Stres Testi ve Monte Carlo Simülasyonu (stress_test.py)
---------------------------------------------------------------------------
Döviz kuru (USD/TRY), politika faizi ve jeopolitik şok senaryoları altında
hisse senedi ve portföyün dayanıklılığını Monte Carlo yöntemi ile simüle eder.
"""

from __future__ import annotations
import math
import random
from typing import Dict, Any, List, Optional


class MonteCarloStressTester:
    """
    Makroekonomik şokları ve ekstrem piyasa senaryolarını Monte Carlo ile test eden motor.
    """
    @staticmethod
    def simulate_macro_scenario(
        ticker: str,
        current_price: float,
        usd_try_shock_pct: float = 15.0,
        interest_rate_hike_bps: float = 500.0,
        geopolitical_risk_level: str = "ORTA",
        iterations: int = 1000,
        beta: float = 1.0,
        fx_exposure_ratio: float = 0.20,
    ) -> Dict[str, Any]:
        """
        Monte Carlo Makro Simülasyonu:
        - usd_try_shock_pct: Kur şoku (örn: %15 artış)
        - interest_rate_hike_bps: Faiz artışı baz puan (örn: 500 bps = %5)
        - geopolitical_risk_level: "DUSUK", "ORTA", "YUKSEK", "KRITIK"
        - iterations: Monte Carlo iterasyon adedi (varsayılan: 1000)
        """
        price = max(0.01, float(current_price))
        b = float(beta)
        fx_exp = float(fx_exposure_ratio) # İhracatçı pozitif, döviz borçlusu negatif etkilenir

        # Jeopolitik risk çarpanı
        geo_multipliers = {
            "DUSUK": 0.02,
            "ORTA": 0.05,
            "YUKSEK": 0.10,
            "KRITIK": 0.18,
        }
        geo_penalty = geo_multipliers.get(str(geopolitical_risk_level).upper(), 0.05)

        # Deterministik tohum (tekrarlanabilir sonuçlar)
        rnd = random.Random(int(price * 100) + int(usd_try_shock_pct * 10))

        simulated_prices = []
        simulated_returns = []

        # Faiz şoku etkisi: Yüksek faiz borsa çarpanlarını baskılar
        interest_impact = -(interest_rate_hike_bps / 10000.0) * 1.5

        # Kur şoku etkisi: Net döviz pozisyonuna göre
        fx_impact = (usd_try_shock_pct / 100.0) * fx_exp

        # Temel beklenen drift
        base_drift = (fx_impact + interest_impact - geo_penalty) * b

        volatility = 0.035 * max(0.8, b) # Günlük/kısa vade dalgalanma

        for _ in range(max(100, iterations)):
            # Box-Muller veya normal dağılım şoku
            shock = rnd.gauss(0, volatility)
            total_return = base_drift + shock
            sim_price = max(0.01, price * (1.0 + total_return))
            simulated_prices.append(sim_price)
            simulated_returns.append(total_return)

        simulated_prices.sort()
        simulated_returns.sort()

        n = len(simulated_prices)
        p5_idx = int(n * 0.05) # %95 VaR
        p1_idx = int(n * 0.01) # %99 VaR
        p50_idx = int(n * 0.50) # Medyan

        worst_price = round(simulated_prices[0], 2)
        p95_var_price = round(simulated_prices[p5_idx], 2)
        p99_var_price = round(simulated_prices[p1_idx], 2)
        median_price = round(simulated_prices[p50_idx], 2)
        best_price = round(simulated_prices[-1], 2)

        p95_var_pct = round(((p95_var_price - price) / price) * 100.0, 2)
        expected_drawdown_pct = round(((median_price - price) / price) * 100.0, 2)

        resilience = "GUCLU" if p95_var_pct > -7.0 else "ORTA" if p95_var_pct > -15.0 else "ZAYIF"

        return {
            "ticker": ticker,
            "current_price": price,
            "simulated_iterations": n,
            "median_scenario_price": median_price,
            "expected_change_pct": expected_drawdown_pct,
            "var_95_price": p95_var_price,
            "var_95_pct": p95_var_pct,
            "var_99_price": p99_var_price,
            "worst_case_price": worst_price,
            "best_case_price": best_price,
            "macro_resilience_rating": resilience,
            "applied_shocks": {
                "usd_try_shock_pct": usd_try_shock_pct,
                "interest_rate_hike_bps": interest_rate_hike_bps,
                "geopolitical_risk": geopolitical_risk_level,
            },
        }
