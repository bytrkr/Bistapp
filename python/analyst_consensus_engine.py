"""
Bistapp MT16 - Analist Konsensüsü & Sürpriz Kâr Radarı (analyst_consensus_engine.py)
-----------------------------------------------------------------------------------
Açıklanan finansal net kâr ile analist piyasa konsensüs tahminini kıyaslayarak
pozitif veya negatif bilanço sürprizlerini (Earnings Surprise Radar) tespit eder.
"""

from __future__ import annotations
from typing import Dict, Any, Optional


class AnalystConsensusEngine:
    """
    Analist Konsensüsü ve Bilanço Sürpriz Radarı
    """

    MOCK_CONSENSUS_DATABASE = {
        "ASELS": {"actual": 7800.0, "estimate": 6400.0},  # +%21.9 Pozitif Sürpriz
        "THYAO": {"actual": 22500.0, "estimate": 21800.0}, # +%3.2 Beklentiye Paralel
        "EREGL": {"actual": 3100.0, "estimate": 4000.0},  # -%22.5 Negatif Sürpriz
        "FROTO": {"actual": 12400.0, "estimate": 10500.0}, # +%18.1 Pozitif Sürpriz
        "GARAN": {"actual": 19200.0, "estimate": 16200.0}, # +%18.5 Pozitif Sürpriz
        "KCHOL": {"actual": 14500.0, "estimate": 14200.0}, # +%2.1 Beklentiye Paralel
        "PETKM": {"actual": 950.0, "estimate": 1400.0},    # -%32.1 Negatif Sürpriz
        "TUPRS": {"actual": 15800.0, "estimate": 13500.0}, # +%17.0 Pozitif Sürpriz
    }

    @classmethod
    def check_earnings_surprise(
        cls,
        ticker: str,
        actual_net_income: float,
        consensus_estimate: float
    ) -> Dict[str, Any]:
        """
        Açıklanan net kâr ile konsensüs beklentiyi kıyaslar:
        - %15'in üzerindeyse: POZİTİF_SURPRIZ
        - %15'in altındaysa: NEGATİF_SURPRIZ
        - Aksi halde: BEKLENTİYE_PARALEL
        """
        clean_ticker = ticker.strip().upper().replace(".IS", "")
        actual = float(actual_net_income)
        estimate = float(consensus_estimate)

        if estimate == 0.0:
            surprise_pct = 0.0
        else:
            surprise_pct = round(((actual - estimate) / abs(estimate)) * 100.0, 2)

        if surprise_pct >= 15.0:
            signal = "POZİTİF_SURPRIZ"
            summary = f"Bilanço sürprizi: Kâr beklentinin %{abs(surprise_pct):.1f} üzerinde (Pozitif Sürpriz)."
            sentiment_bonus = +10.0
        elif surprise_pct <= -15.0:
            signal = "NEGATİF_SURPRIZ"
            summary = f"Bilanço sürprizi: Kâr beklentinin %{abs(surprise_pct):.1f} altında (Negatif Sürpriz)."
            sentiment_bonus = -10.0
        else:
            signal = "BEKLENTİYE_PARALEL"
            summary = f"Bilanço piyasa konsensüs beklentisiyle paralel gerçekleşti (%{surprise_pct:+.1f})."
            sentiment_bonus = 0.0

        toon = (
            f"#TOON/v3.5 schema=BISTAPP_EARNINGS_SURPRISE\n"
            f"@surprise{{sym:{clean_ticker};actual:{actual:,.1f}M;estimate:{estimate:,.1f}M;"
            f"diff:{surprise_pct:+.1f}%;signal:{signal}}}\n"
            f"@summary{{{summary}}}"
        )

        return {
            "ticker": clean_ticker,
            "actual_net_income": actual,
            "consensus_estimate": estimate,
            "surprise_pct": surprise_pct,
            "signal": signal,
            "sentiment_bonus": sentiment_bonus,
            "summary": summary,
            "toon": toon,
        }

    @classmethod
    def get_simulated_earnings_surprise(cls, ticker: str) -> Dict[str, Any]:
        """
        Ticker için kayıtlı veya deterministik simüle edilmiş analist konsensüsünü döner.
        Canlı API entegrasyonuna hazır tasarlanmıştır.
        """
        clean_ticker = ticker.strip().upper().replace(".IS", "")
        if clean_ticker in cls.MOCK_CONSENSUS_DATABASE:
            data = cls.MOCK_CONSENSUS_DATABASE[clean_ticker]
            return cls.check_earnings_surprise(clean_ticker, data["actual"], data["estimate"])

        # Deterministik pseudo-random mock (örneğin hisse kodunun hash'ine göre)
        val_hash = sum(ord(c) for c in clean_ticker)
        base_estimate = 5000.0 + (val_hash % 5000)
        # %-20 ile %+25 arasında sürpriz katsayısı
        multiplier = 0.80 + ((val_hash % 45) / 100.0)
        actual = round(base_estimate * multiplier, 1)

        return cls.check_earnings_surprise(clean_ticker, actual, base_estimate)
