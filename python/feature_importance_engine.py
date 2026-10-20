"""
Bistapp MT16 - Öznitelik Önem ve Anomali Tespit Motoru (feature_importance_engine.py)
-------------------------------------------------------------------------------------
Piyasa verilerini, emir defteri dinamiklerini ve sosyal anomalileri analiz ederek:
1. Takas/Derinlik (BofA, OBI, Duvar Baskısı)
2. Teknik Momentum (RSI, Trend, Günlük Volatilite)
3. Temel Değerleme (F/K, PD/DD, Altman-Z, Bilanço)
4. Sosyal Medya & Haber Duygusu (KAP, Botnet Riski)
faktörlerinin anlık fiyat üzerindeki göreli ağırlıklarını dinamik olarak belirler.
"""

from __future__ import annotations
import math
from typing import Dict, Any, List, Optional


FACTOR_LABELS = {
    "depth": "Takas/Derinlik",
    "technical": "Teknik Momentum",
    "fundamental": "Temel Değerleme",
    "sentiment": "Sosyal Medya/Haber Duygusu",
}


class FeatureImportanceEngine:
    """
    Dinamik Öznitelik Önemi ve Anomali Tespit Motoru
    """

    @classmethod
    def calculate_feature_importance(
        cls,
        ticker: str,
        market_data: Optional[Any] = None,
        depth_data: Optional[Any] = None,
        fundamental_data: Optional[Any] = None,
        news_data: Optional[Any] = None,
        social_data: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        O anki piyasa verilerini analiz ederek hangi faktörün fiyat üzerinde
        en baskın olduğunu tespit eder ve normalize edilmiş ağırlıklar üretir.
        """
        clean_ticker = ticker.strip().upper().replace(".IS", "")

        raw_scores = {
            "depth": 25.0,
            "technical": 25.0,
            "fundamental": 25.0,
            "sentiment": 25.0,
        }
        anomalies: List[str] = []

        # 1. Takas & Derinlik Analizi
        if depth_data is not None:
            wall_pressure = float(getattr(depth_data, "wall_pressure_ratio", 1.0))
            bofa_lot = float(getattr(depth_data, "bofa_net_lot", 0.0))
            is_spoofing = bool(getattr(depth_data, "is_wall_spoofing", False))

            if abs(wall_pressure - 1.0) >= 0.25:
                raw_scores["depth"] += 10.0
            if abs(bofa_lot) >= 40_000:
                raw_scores["depth"] += 12.0
            if is_spoofing:
                raw_scores["depth"] += 18.0
                anomalies.append("Tahtada emir silme (Wall Spoofing) anomalisi tespit edildi.")
        else:
            # Belirli yüksek akış hisseleri için varsayılan akış ağırlığı
            if clean_ticker in ["ASELS", "THYAO", "GARAN"]:
                raw_scores["depth"] += 12.0

        # 2. Teknik Momentum Analizi
        if market_data is not None:
            chg = float(getattr(market_data, "change_pct", 0.0))
            rsi = float(getattr(market_data, "rsi", 50.0))

            if abs(chg) >= 2.0:
                raw_scores["technical"] += 10.0
            elif abs(chg) < 0.4 and 45.0 <= rsi <= 55.0:
                raw_scores["technical"] -= 8.0  # Durgun yatay momentum

            if rsi >= 70.0 or rsi <= 30.0:
                raw_scores["technical"] += 8.0
                anomalies.append(f"RSI aşırı uç seviyede ({rsi:.1f}).")
        else:
            raw_scores["technical"] += 5.0

        # 3. Temel Değerleme Analizi
        if fundamental_data is not None:
            altman = float(getattr(fundamental_data, "altman_z_score", 3.0))
            piotroski = int(getattr(fundamental_data, "piotroski_f_score", 6))
            beneish = float(getattr(fundamental_data, "beneish_m_score", -2.5))

            if altman < 1.8:
                raw_scores["fundamental"] += 14.0
                anomalies.append("Altman Z-Skor iflas/sıkıntı bölgesinde.")
            elif altman > 3.5 or piotroski >= 8:
                raw_scores["fundamental"] += 8.0

            if beneish > -1.78:
                raw_scores["fundamental"] += 16.0
                anomalies.append("Beneish M-Skor finansal manipülasyon şüphesi taşıyor.")
        else:
            if clean_ticker in ["EREGL", "SISE", "BIMAS"]:
                raw_scores["fundamental"] += 8.0

        # 4. Sosyal Medya & Haber Duygusu Analizi
        if social_data is not None:
            is_sim = bool(
                getattr(social_data, "is_simulated", False)
                or not getattr(social_data, "is_live", True)
                or not getattr(social_data, "is_reliable", True)
                or str(getattr(social_data, "data_source", "")).upper() == "SIMULATED"
            )
            manip_risk = float(getattr(social_data, "manipulation_risk_score", 0.0))
            mentions = int(getattr(social_data, "mention_count", 0))

            if is_sim:
                anomalies.append("ℹ️ [SİMÜLE VERİ]: Sosyal medya istihbaratı canlı değil (simüle mod).")
                raw_scores["sentiment"] += 3.0
            elif manip_risk >= 60.0:
                raw_scores["sentiment"] += 20.0
                anomalies.append(f"Sosyal medyada organize botnet aktivitesi tespit edildi (%{manip_risk:.0f}).")
            elif mentions > 800:
                raw_scores["sentiment"] += 8.0

        if news_data is not None:
            sent_score = float(getattr(news_data, "sentiment_score", 0.0))
            if abs(sent_score) >= 0.4:
                raw_scores["sentiment"] += 8.0

        # Normalizasyon (Toplam = 100.0%)
        total_raw = sum(raw_scores.values())
        normalized_pct = {k: round((v / total_raw) * 100.0, 1) for k, v in raw_scores.items()}

        # En baskın ilk iki faktörü sırala
        sorted_factors = sorted(normalized_pct.items(), key=lambda item: item[1], reverse=True)
        dominant_key, dominant_pct = sorted_factors[0]
        secondary_key, secondary_pct = sorted_factors[1]

        dominant_label = FACTOR_LABELS.get(dominant_key, dominant_key)
        secondary_label = FACTOR_LABELS.get(secondary_key, secondary_key)

        narrative = (
            f"Bugün {clean_ticker} fiyatını en çok etkileyen faktör: "
            f"{dominant_label} (%{dominant_pct:.0f}) ve {secondary_label} (%{secondary_pct:.0f})."
        )

        toon = (
            f"#TOON/v3.5 schema=BISTAPP_FEATURE_IMPORTANCE\n"
            f"@importance{{sym:{clean_ticker};dominant:{dominant_label};"
            f"depth:%{normalized_pct['depth']:.0f};tech:%{normalized_pct['technical']:.0f};"
            f"fund:%{normalized_pct['fundamental']:.0f};sent:%{normalized_pct['sentiment']:.0f}}}\n"
            f"@summary{{{narrative}}}"
        )

        return {
            "ticker": clean_ticker,
            "weights_pct": normalized_pct,
            "weights_ratio": {k: round(v / 100.0, 4) for k, v in normalized_pct.items()},
            "dominant_factor": dominant_label,
            "dominant_factor_key": dominant_key,
            "dominant_pct": dominant_pct,
            "secondary_factor": secondary_label,
            "secondary_factor_key": secondary_key,
            "secondary_pct": secondary_pct,
            "anomalies": anomalies,
            "summary": narrative,
            "toon": toon,
        }

    @classmethod
    def modulate_agent_weights(
        cls,
        base_weights: Dict[str, float],
        importance_data: Dict[str, Any]
    ) -> Dict[str, float]:
        """
        FeatureImportanceEngine çıktısına göre 8 ajanın karar ağırlıklarını
        dinamik olarak modüle eder ve normalize eder.
        """
        ratios = importance_data.get("weights_ratio", {
            "depth": 0.25, "technical": 0.25, "fundamental": 0.25, "sentiment": 0.25
        })

        depth_ratio = ratios.get("depth", 0.25)
        tech_ratio = ratios.get("technical", 0.25)
        fund_ratio = ratios.get("fundamental", 0.25)
        sent_ratio = ratios.get("sentiment", 0.25)

        # Temel ağırlıklara faktör çarpanı uygula
        # Faktör oranı 0.25'ten yüksekse ajan ağırlığını artır, düşükse düşür
        adjusted = {}
        for agent_id, w in base_weights.items():
            if agent_id in ["depth"]:
                mult = depth_ratio / 0.25
            elif agent_id in ["technical", "trend"]:
                mult = tech_ratio / 0.25
            elif agent_id in ["fundamental", "trust"]:
                mult = fund_ratio / 0.25
            elif agent_id in ["sentiment", "company_direct"]:
                mult = sent_ratio / 0.25
            elif agent_id in ["skeptic"]:
                # Anomali varsa skeptik ajanı güçlendir
                anomalies_count = len(importance_data.get("anomalies", []))
                mult = 1.0 + (0.15 * anomalies_count)
            else:
                mult = 1.0

            # Yumuşatılmış modülasyon: %60 taban ağırlık + %40 anlık faktör etkisi
            blended_w = w * (0.60 + 0.40 * mult)
            adjusted[agent_id] = max(0.04, min(0.35, blended_w))

        # Toplamı 1.0 yapacak şekilde normalize et
        total_w = sum(adjusted.values())
        return {k: round(v / total_w, 4) for k, v in adjusted.items()}
