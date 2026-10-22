"""
Bistapp MT16 - MiroFish Simülasyon Köprüsü (mirofish_bridge.py)
---------------------------------------------------------------
Lisans Koruma Notu: MiroFish açık kaynak kodunu gömmek yasaktır (AGPL Uyumsuzluğu).
Bu modül harici kod içermez; JIRO ve EmbeddingEngine kümelerini girdi alarak
1000 sanal piyasa yatırımcısı üzerinde tescilli Monte Carlo olasılık simülasyonu
(Sürü Psikolojisi ve Yarınki Satış/Alış Baskısı) yürütür.
"""

from __future__ import annotations
import random
from typing import Dict, Any, List, Optional, Union


class MiroFishBridge:
    """
    Kolektif piyasa psikolojisini 1000 sanal ajan üzerinden simüle eden olasılık motoru.
    """

    SIMULATED_INVESTORS = 1000

    # Yatırımcı Tipi Dağılımı (BIST Gerçekçi Portföy Ağırlıkları)
    INVESTOR_PROFILES = {
        "retail_panicky": 0.35,       # Bireysel / Panik ve FUD'a aşırı duyarlı (%35)
        "fomo_chaser": 0.25,          # FOMO / Trend & Tavan kovalayan (%25)
        "institutional_rational": 0.20, # Kurumsal / Bilanço ve Rasyo odaklı (%20)
        "quant_algorithmic": 0.20,    # Kuantitatif / Stop-loss & OBI kuralcı (%20)
    }

    @classmethod
    def simulate_market_psychology(
        cls,
        cluster_data: Union[Dict[str, Any], List[Dict[str, Any]]],
        market_bias: float = 0.0,
        random_seed: Optional[int] = 42
    ) -> Dict[str, Any]:
        """
        Kümelenmiş duygu verilerini kullanarak 1000 sanal yatırımcının yarınki
        alım-satım kararlarını Monte Carlo yöntemiyle simüle eder.

        Örnek Çıktı:
        "Kümedeki yorumların %70'i panik satışı içeriyorsa, yarın için satış baskısı olasılığı %65'tir."
        """
        rng = random.Random(random_seed if random_seed is not None else 42)

        # 1. Kümelerden duygu oranlarını çıkar
        clusters: List[Dict[str, Any]] = []
        if isinstance(cluster_data, dict):
            clusters = cluster_data.get("clusters") or [cluster_data]
        elif isinstance(cluster_data, list):
            clusters = cluster_data

        panic_ratio = 0.0
        fomo_ratio = 0.0
        fundamental_ratio = 0.0
        neutral_ratio = 0.0

        for c in clusters:
            if not isinstance(c, dict):
                continue
            topic = str(c.get("topic_summary") or "").lower()
            pct = float(c.get("percentage") or (100.0 / max(1, len(clusters))))

            if "panik" in topic or "satış" in topic or "ayı" in topic:
                panic_ratio += pct
            elif "fomo" in topic or "pompalama" in topic or "tavan" in topic:
                fomo_ratio += pct
            elif "bilanço" in topic or "temel" in topic or "kâr" in topic:
                fundamental_ratio += pct
            else:
                neutral_ratio += pct

        # Normalize et (0.0 - 1.0 aralığı)
        total_pct = max(1.0, panic_ratio + fomo_ratio + fundamental_ratio + neutral_ratio)
        p_panic = panic_ratio / total_pct
        p_fomo = fomo_ratio / total_pct
        p_fund = fundamental_ratio / total_pct

        # 2. 1000 Sanal Yatırımcı Simülasyonu
        sellers = 0
        buyers = 0
        holders = 0

        for _ in range(cls.SIMULATED_INVESTORS):
            investor_dice = rng.random()

            # Yatırımcı profili belirle
            if investor_dice < cls.INVESTOR_PROFILES["retail_panicky"]:
                # Panik satıcı: Panik oranına çok duyarlı
                sell_prob = 0.20 + (p_panic * 0.70) - (p_fomo * 0.20)
                buy_prob = 0.10 + (p_fomo * 0.50)
            elif investor_dice < (cls.INVESTOR_PROFILES["retail_panicky"] + cls.INVESTOR_PROFILES["fomo_chaser"]):
                # FOMO kovalayan: Tavan ve pompalama söylemine çok duyarlı
                buy_prob = 0.25 + (p_fomo * 0.65) - (p_panic * 0.15)
                sell_prob = 0.15 + (p_panic * 0.45)
            elif investor_dice < (1.0 - cls.INVESTOR_PROFILES["quant_algorithmic"]):
                # Kurumsal / Rasyonel: Bilanço ve aşırı panikte dipten toplama
                buy_prob = 0.25 + (p_fund * 0.50) + (0.20 if p_panic > 0.60 else 0.0)
                sell_prob = 0.20 + (p_panic * 0.30)
            else:
                # Kuantitatif / Algoritmik: Kurallı ve nötre yakın
                sell_prob = 0.25 + (p_panic * 0.40)
                buy_prob = 0.25 + (p_fomo * 0.35)

            # Piyasa eğilimi (bias) ekle
            sell_prob = max(0.05, min(0.95, sell_prob - (market_bias * 0.20)))
            buy_prob = max(0.05, min(0.95, buy_prob + (market_bias * 0.20)))

            action_dice = rng.random()
            if action_dice < sell_prob:
                sellers += 1
            elif action_dice < (sell_prob + buy_prob):
                buyers += 1
            else:
                holders += 1

        # 3. Yüzdeleri ve Olasılıkları Hesapla
        selling_prob_pct = round((sellers / cls.SIMULATED_INVESTORS) * 100.0, 1)
        buying_prob_pct = round((buyers / cls.SIMULATED_INVESTORS) * 100.0, 1)
        holding_prob_pct = round((holders / cls.SIMULATED_INVESTORS) * 100.0, 1)

        # Baskın Eğilim Belirle
        if selling_prob_pct >= 55.0:
            dominant_trend = "SATIS_BASKISI"
            volatility = "YUKSEK"
        elif buying_prob_pct >= 55.0:
            dominant_trend = "ALIS_BASKISI"
            volatility = "YUKSEK"
        else:
            dominant_trend = "YATAY_DENGE"
            volatility = "ORTA" if abs(selling_prob_pct - buying_prob_pct) > 10 else "DUSUK"

        # Kullanıcı örneği formatında anlaşılır özet oluştur
        if p_panic >= 0.50:
            summary = (
                f"Kümedeki yorumların %{panic_ratio:.0f}'i panik satışı içeriyor; "
                f"1000 sanal yatırımcı simülasyonunda yarın için satış baskısı olasılığı %{selling_prob_pct:.0f} olarak hesaplandı."
            )
        elif p_fomo >= 0.50:
            summary = (
                f"Kümedeki yorumların %{fomo_ratio:.0f}'i yoğun FOMO ve pompalama içeriyor; "
                f"1000 sanal yatırımcı simülasyonunda yarın için alış baskısı olasılığı %{buying_prob_pct:.0f} olarak hesaplandı."
            )
        else:
            summary = (
                f"Sosyal duygu kümelerinde panik (%{panic_ratio:.0f}) ve FOMO (%{fomo_ratio:.0f}) dengeli dağılmış durumda; "
                f"1000 sanal yatırımcıda yarın için satış baskısı olasılığı %{selling_prob_pct:.0f}, alış baskısı olasılığı %{buying_prob_pct:.0f}."
            )

        return {
            "simulated_investors_count": cls.SIMULATED_INVESTORS,
            "selling_pressure_probability": selling_prob_pct,
            "buying_pressure_probability": buying_prob_pct,
            "neutral_holding_probability": holding_prob_pct,
            "panic_sentiment_ratio": round(panic_ratio, 1),
            "fomo_sentiment_ratio": round(fomo_ratio, 1),
            "expected_next_day_trend": dominant_trend,
            "expected_volatility": volatility,
            "summary": summary,
            "investor_breakdown": {
                "sellers": sellers,
                "buyers": buyers,
                "holders": holders,
            },
        }
