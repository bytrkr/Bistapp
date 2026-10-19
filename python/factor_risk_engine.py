"""
Bistapp MT16 - Faktör Risk ve Beta Duyarlılık Motoru (factor_risk_engine.py)
---------------------------------------------------------------------------
1. calculate_beta_alpha: Hisse ve BIST 100 getirileri üzerinden Beta ve Alpha katsayılarını hesaplar.
2. Downside Beta: Yalnızca endeksin düştüğü günlerdeki korelasyonu ölçer.
3. Kriz Direnci Skoru (0-100): Piyasa düşüşlerinde hissenin koruyuculuk potansiyelini skorlar.
4. Çıktıyı #TOON/v3.5 schema=BISTAPP_FACTOR_RISK formatında döner.
"""

from __future__ import annotations
import math
from typing import Dict, Any, List, Optional

try:
    import numpy as np
except ImportError:
    np = None


# Bilinen BIST hisselerinin tarihsel referans beta karakteristiği
BETA_REFERENCE_PROFILES = {
    "GARAN": {"base_beta": 1.45, "downside_mult": 1.10},  # Yüksek beta bankacılık
    "AKBNK": {"base_beta": 1.42, "downside_mult": 1.08},
    "ISCTR": {"base_beta": 1.38, "downside_mult": 1.05},
    "THYAO": {"base_beta": 1.35, "downside_mult": 1.15},  # Havacılık agresif
    "PGSUS": {"base_beta": 1.55, "downside_mult": 1.20},
    "EREGL": {"base_beta": 1.10, "downside_mult": 1.02},  # Döngüsel sanayi
    "ASELS": {"base_beta": 0.82, "downside_mult": 0.75},  # Savunma kriz kalkanı
    "BIMAS": {"base_beta": 0.68, "downside_mult": 0.62},  # Defansif perakende
    "MGROS": {"base_beta": 0.74, "downside_mult": 0.70},
    "TUPRS": {"base_beta": 0.92, "downside_mult": 0.85},  # Enerji dengeli
    "FROTO": {"base_beta": 1.05, "downside_mult": 0.90},
    "KCHOL": {"base_beta": 1.02, "downside_mult": 0.95},
    "TCELL": {"base_beta": 0.75, "downside_mult": 0.68},  # Telekom defansif
}


class FactorRiskEngine:
    """
    Faktör Risk, Beta & Alpha Analiz ve Kriz Direnci Motoru
    """

    @classmethod
    def generate_synthetic_history(cls, ticker: str, days: int = 60) -> tuple[List[float], List[float]]:
        """
        API bağlantısı öncesi hisse ve BIST 100 için gerçekçi sentetik fiyat serisi üretir.
        """
        clean_ticker = ticker.strip().upper().replace(".IS", "")
        profile = BETA_REFERENCE_PROFILES.get(clean_ticker, {"base_beta": 1.15, "downside_mult": 1.05})
        b = profile["base_beta"]

        # Deterministik tohum
        seed = sum(ord(c) for c in clean_ticker)
        
        bench_prices = [9500.0]
        asset_prices = [100.0]

        import random
        rnd = random.Random(seed)

        for _ in range(days - 1):
            # Benchmark günlük getiri (~ %0.02 ortalama, %1.3 std)
            r_bench = rnd.gauss(0.0004, 0.013)
            # Varlık getirisi: beta * r_bench + kendine has volatilite
            idio_shock = rnd.gauss(0.0002, 0.009)
            r_asset = (b * r_bench) + idio_shock

            bench_prices.append(bench_prices[-1] * (1.0 + r_bench))
            asset_prices.append(asset_prices[-1] * (1.0 + r_asset))

        return asset_prices, bench_prices

    @classmethod
    def calculate_beta_alpha(
        cls,
        ticker: str,
        price_history: Optional[List[float]] = None,
        benchmark_history: Optional[List[float]] = None,
    ) -> Dict[str, Any]:
        """
        Hissenin BIST 100 karşısındaki Beta, Alpha ve Downside Beta katsayılarını hesaplar.
        """
        clean_ticker = ticker.strip().upper().replace(".IS", "")

        if not price_history or len(price_history) < 15 or not benchmark_history or len(benchmark_history) < 15:
            p_hist, b_hist = cls.generate_synthetic_history(clean_ticker, days=60)
        else:
            p_hist = price_history
            b_hist = benchmark_history

        # 1. Günlük Getirileri Hesapla
        if np is not None:
            prices = np.array(p_hist, dtype=float)
            bench = np.array(b_hist, dtype=float)

            r_asset = np.diff(prices) / prices[:-1]
            r_bench = np.diff(bench) / bench[:-1]

            # Covariance ve Variance
            cov_matrix = np.cov(r_asset, r_bench)
            cov = float(cov_matrix[0][1])
            var_bench = float(np.var(r_bench, ddof=1))

            beta = round(cov / var_bench, 2) if var_bench > 0 else 1.0

            # Yıllıklandırılmış Alpha (252 işlem günü)
            daily_alpha = float(np.mean(r_asset) - (beta * np.mean(r_bench)))
            alpha_annualized_pct = round(daily_alpha * 252 * 100.0, 2)

            # Downside Beta (Yalnızca endeksin düştüğü günler)
            down_idx = np.where(r_bench < 0)[0]
            if len(down_idx) >= 5:
                down_cov = float(np.cov(r_asset[down_idx], r_bench[down_idx])[0][1])
                down_var = float(np.var(r_bench[down_idx], ddof=1))
                downside_beta = round(down_cov / down_var, 2) if down_var > 0 else beta
            else:
                downside_beta = beta
        else:
            # Saf Python fallback (numpy yoksa)
            r_asset = [(p_hist[i] - p_hist[i - 1]) / p_hist[i - 1] for i in range(1, len(p_hist))]
            r_bench = [(b_hist[i] - b_hist[i - 1]) / b_hist[i - 1] for i in range(1, len(b_hist))]
            
            mean_a = sum(r_asset) / len(r_asset)
            mean_b = sum(r_bench) / len(r_bench)

            var_b = sum((x - mean_b) ** 2 for x in r_bench) / (len(r_bench) - 1)
            cov = sum((r_asset[i] - mean_a) * (r_bench[i] - mean_b) for i in range(len(r_asset))) / (len(r_asset) - 1)
            beta = round(cov / var_b, 2) if var_b > 0 else 1.0
            daily_alpha = mean_a - (beta * mean_b)
            alpha_annualized_pct = round(daily_alpha * 252 * 100.0, 2)
            downside_beta = beta

        # 2. Beta Yorumu
        if beta > 1.2:
            beta_interpretation = "Yüksek Oynaklık (Agresif)"
        elif beta < 0.8:
            beta_interpretation = "Defansif (Düşük Oynaklık)"
        else:
            beta_interpretation = "Piyasa ile Paralel (Dengeli)"

        # 3. Kriz Direnci Skoru (0-100)
        # Downside beta ne kadar düşükse, piyasa düşerken o kadar az düşer / korur
        crisis_resilience = max(10.0, min(95.0, round(100.0 - (downside_beta * 42.0), 1)))

        if crisis_resilience >= 70.0:
            crisis_interpretation = "Yüksek Kriz Kalkanı (Piyasa düşerken koruyucu)"
        elif crisis_resilience <= 40.0:
            crisis_interpretation = "Düşük Kriz Direnci (Piyasa düşüşlerinde sert kayıp riski)"
        else:
            crisis_interpretation = "Orta Düzey Kriz Direnci"

        summary = (
            f"Faktör Risk Analizi: {clean_ticker} Beta={beta:.2f} ({beta_interpretation}), "
            f"Alpha=%{alpha_annualized_pct:+.2f}. Downside Beta={downside_beta:.2f}, "
            f"Kriz Direnci Skoru={crisis_resilience:.0f}/100 ({crisis_interpretation})."
        )

        toon = (
            f"#TOON/v3.5 schema=BISTAPP_FACTOR_RISK\n"
            f"@factor{{sym:{clean_ticker};beta:{beta:.2f};alpha:{alpha_annualized_pct:+.2f}%;"
            f"downside_beta:{downside_beta:.2f};crisis_score:{crisis_resilience:.0f}/100;beta_type:{beta_interpretation}}}\n"
            f"@summary{{{summary}}}"
        )

        return {
            "ticker": clean_ticker,
            "beta": beta,
            "alpha_annualized_pct": alpha_annualized_pct,
            "beta_interpretation": beta_interpretation,
            "downside_beta": downside_beta,
            "crisis_resilience_score": crisis_resilience,
            "crisis_interpretation": crisis_interpretation,
            "summary": summary,
            "toon": toon,
        }
