"""
Bistapp MT16 - Sosyal Medya İçerik Jeneratörü (content_generator.py)
-------------------------------------------------------------------
Çoklu Ajan Karar Destek Sisteminin (FinalDecision) ürettiği analizleri
Telegram ve Twitter/X platformlarına özel vurucu, emojili ve ilgi çekici
sosyal medya içeriklerine dönüştürür.
"""

from __future__ import annotations
from typing import Dict, Any, Optional


class ContentGenerator:
    """
    Otomatik Finansal Sosyal Medya İçerik Üreticisi
    """

    @classmethod
    def generate_post(
        cls,
        ticker: str,
        decision_data: Dict[str, Any],
        platform: str = "telegram"
    ) -> str:
        """
        FinalDecision sözlüğünü platforma uygun formata çevirir:
        - telegram: Emojili, detaylı, risk uyarılı ve aksiyon odaklı.
        - twitter: 280 karakter limitine uygun, vurucu ve hashtagli.
        """
        clean_ticker = ticker.strip().upper().replace(".IS", "")
        p_type = platform.strip().lower()

        verdict = decision_data.get("verdict", "NOTR")
        if isinstance(verdict, dict) and "value" in verdict:
            verdict = verdict["value"]
        verdict = str(verdict)

        composite_score = float(
            decision_data.get("composite_score")
            or decision_data.get("compositeScore")
            or 50.0
        )

        coach_summary = str(
            decision_data.get("coach_summary")
            or decision_data.get("coachSummary")
            or decision_data.get("executive_summary")
            or "Analiz tamamlandı."
        )

        manip_risk = float(
            decision_data.get("manipulation_risk_score")
            or decision_data.get("manipulationRiskScore")
            or 0.0
        )

        # Ajan puanları
        votes = decision_data.get("agent_votes") or decision_data.get("agentVotes") or {}
        tech_score = 50.0
        fund_score = 50.0
        if "technical" in votes and isinstance(votes["technical"], dict):
            tech_score = float(votes["technical"].get("score", 50.0))
        if "fundamental" in votes and isinstance(votes["fundamental"], dict):
            fund_score = float(votes["fundamental"].get("score", 50.0))

        # Sinyal Emojileri
        verdict_emojis = {
            "GUCLU_AL": "🚀 GÜÇLÜ AL",
            "AL": "🟢 AL",
            "NOTR": "⚖️ NÖTR",
            "SAT": "🔴 SAT",
            "GUCLU_SAT": "🛑 GÜÇLÜ SAT",
        }
        verdict_str = verdict_emojis.get(verdict, f"⚖️ {verdict}")

        # Manipülasyon Durumu
        if manip_risk >= 70.0:
            manip_alert = f"⚠️ YÜKSEK MANİPÜLASYON RİSKİ (%{manip_risk:.0f}) - Botnet aktivitesi tespit edildi!"
        elif manip_risk >= 40.0:
            manip_alert = f"⚡ Orta Düzey Sosyal Hareketlilik (%{manip_risk:.0f})"
        else:
            manip_alert = "✅ Doğal Sosyal Akış (Manipülasyon Riski Düşük)"

        if p_type == "twitter" or p_type == "x":
            # Twitter / X için 280 karakter odaklı kısa metin
            if manip_risk >= 70.0:
                tweet = (
                    f"🚨 #{clean_ticker} Risk Radarı!\n"
                    f"Sosyal medyada organize botnet/yapay şişirme faaliyeti tespit edildi (Risk: %{manip_risk:.0f}).\n"
                    f"Sinyal: {verdict_str} ({composite_score:.0f}/100)\n"
                    f"Dikkatli işlem yapınız.\n\n"
                    f"#BIST100 #{clean_ticker} #BorsaIstanbul #BISTAPP"
                )
            else:
                tweet = (
                    f"📊 #{clean_ticker} Yapay Zeka Jüri Analizi:\n"
                    f"🎯 Karar: {verdict_str} (Skor: {composite_score:.0f}/100)\n"
                    f"📈 Teknik: {tech_score:.0f} | Temel: {fund_score:.0f}\n"
                    f"🛡️ Manipülasyon Riski: %{manip_risk:.0f}\n\n"
                    f"#BIST100 #{clean_ticker} #BorsaIstanbul #Hisse"
                )
            return tweet

        else:
            # Telegram için zengin, detaylı ve emojili format
            telegram_post = (
                f"🚨 **BISTAPP PİYASA RADARI: ${clean_ticker}** 🚨\n\n"
                f"🎯 **Yapay Zeka Jüri Kararı:** {verdict_str}\n"
                f"📊 **Bileşik Güven Skoru:** `{composite_score:.1f} / 100`\n\n"
                f"🔹 **Teknik Analiz Gücü:** `{tech_score:.1f}/100`\n"
                f"🔹 **Mali Tablo Sağlığı:** `{fund_score:.1f}/100`\n"
                f"🛡️ **Manipülasyon Filtresi:** {manip_alert}\n\n"
                f"📝 **Koç Notu:**\n"
                f"_{coach_summary[:280]}..._\n\n"
                f"⚡ _Yatırım tavsiyesi değildir. Algoritmik çoklu ajan karar destek verisidir._\n\n"
                f"#{clean_ticker} #BIST #BorsaIstanbul #Fintech #Bistapp"
            )
            return telegram_post

    @classmethod
    def generate_all_formats(
        cls,
        ticker: str,
        decision_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """Tüm sosyal medya kanalları için içerik paketini üretir."""
        return {
            "telegram": cls.generate_post(ticker, decision_data, platform="telegram"),
            "twitter": cls.generate_post(ticker, decision_data, platform="twitter"),
        }
