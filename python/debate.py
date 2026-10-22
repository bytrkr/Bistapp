"""
BIST Coklu Ajan Karar Destek Sistemi - Capraz Itiraz (Debate) Protokolu (debate.py)
Uzman ajanlar arasindaki gorus ayriliklarini tespit eder;
Takas, Teknik ve KAP/Temel arasinda 1 turlu kanita dayali itiraz mekanizmasini isletir.
"""

from __future__ import annotations
import sys
import os
from typing import Dict, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from schemas import (
        UnifiedContext,
        AgentResponse,
        SignalType,
        DebateChallenge,
        DebateRoundResult,
    )
except ImportError:
    from .schemas import (
        UnifiedContext,
        AgentResponse,
        SignalType,
        DebateChallenge,
        DebateRoundResult,
    )

try:
    from liquidity_engine import LiquidityEngine
except ImportError:
    class LiquidityEngine:
        @staticmethod
        def analyze_order_book_impact(*args, **kwargs):
            return {"is_thin_book": False, "estimated_slippage_pct": 0.5}

try:
    from social_illusion_engine import SocialIllusionEngine
except ImportError:
    class SocialIllusionEngine:
        @staticmethod
        def detect_botnet(mentions=None):
            return {"botnet_risk_score": 0.0, "is_botnet_detected": False}

try:
    from valuation_engine import ValuationEngine
except ImportError:
    class ValuationEngine:
        @staticmethod
        def calculate_dcf(*args, **kwargs):
            return {"is_overvalued": False, "status": "DENGELI"}

try:
    from macro_shock_engine import MacroShockEngine
except ImportError:
    class MacroShockEngine:
        @staticmethod
        def simulate_shock(*args, **kwargs):
            return {"macro_vulnerability_score": 40.0, "is_high_risk": False}
        @staticmethod
        def simulate_all_shocks(*args, **kwargs):
            return {"max_vulnerability_score": 40.0, "is_any_high_risk": False}

try:
    from var_engine import VaREngine
except ImportError:
    class VaREngine:
        @staticmethod
        def calculate_marginal_var(*args, **kwargs):
            return {"is_excessive_risk": False, "var_increase_pct": 5.0}

try:
    from watermark_tracker import WatermarkTracker
except ImportError:
    class WatermarkTracker:
        @classmethod
        def track_propagation(cls, *args, **kwargs):
            return {"is_high_manipulation": False, "manipulation_history_score": 0.0}


class DebateEngine:
    """
    1-Tur Capraz Itiraz (Debate) Protokol Yurutucusu.
    Ajanlar serbest metin yerine somut piyasa verisiyle itirazda bulunur.
    """
    CONFLICT_THRESHOLD = 30.0  # Puan farki celiski esigi

    @classmethod
    def recompute_signal(cls, score: float) -> SignalType:
        """
        Revize edilen puana gore standart sinyali kademeli olarak yeniden belirler.
        Ani sicramalari onlemek icin esikler dengeli ve kademeli dagitilmistir:
        >= 75.0: GUCLU_AL
        >= 60.0: AL
        >= 40.0: NOTR
        >= 25.0: SAT
        <  25.0: GUCLU_SAT
        """
        if score >= 75.0:
            return SignalType.GUCLU_AL
        elif score >= 58.0:
            return SignalType.AL
        elif score >= 40.0:
            return SignalType.NOTR
        elif score >= 22.0:
            return SignalType.SAT
        else:
            return SignalType.GUCLU_SAT

    @classmethod
    def conduct_one_round_debate(
        cls,
        raw_votes: Dict[str, AgentResponse],
        ctx: UnifiedContext
    ) -> DebateRoundResult:
        """
        1 turlu capraz debate oturumunu gerceklestirir ve guncellenmis oylari dondurur.
        """
        revised_votes: Dict[str, AgentResponse] = {k: v.copy(deep=True) for k, v in raw_votes.items()}
        challenges: List[DebateChallenge] = []
        conflict_summaries: List[str] = []

        tech = revised_votes.get("technical")
        depth = revised_votes.get("depth")
        fund = revised_votes.get("fundamental")
        sent = revised_votes.get("sentiment")
        comp = revised_votes.get("company_direct")
        trend = revised_votes.get("trend")

        # ----------------------------------------------------------------------
        # MÜNAZARA 1: TEKNİK vs TAKAS & DERİNLİK (Yalancı Boğa Tuzağı)
        # ----------------------------------------------------------------------
        if tech and depth:
            score_diff = abs(tech.score - depth.score)
            is_bull_trap = (
                tech.signal in [SignalType.AL, SignalType.GUCLU_AL] and
                depth.signal in [SignalType.SAT, SignalType.GUCLU_SAT]
            )
            
            # Durum 1A: Teknik Alışta, Takas ve BofA Sert Satışta
            bofa = ctx.depth_data.bofa_net_lot if ctx.depth_data else 0
            wall = ctx.depth_data.wall_pressure_ratio if ctx.depth_data else 1.0
            is_depth_suspicious = getattr(ctx.depth_data, "is_suspicious", False) if ctx.depth_data else False
            
            if not is_depth_suspicious and (is_bull_trap or score_diff >= cls.CONFLICT_THRESHOLD) and tech.score > depth.score and bofa < -50_000:
                penalty = 20.0 if bofa < -150_000 else 15.0
                if wall < 0.70:
                    penalty += 5.0
                
                before_score = tech.score
                after_score = max(20.0, before_score - penalty)
                new_signal = cls.recompute_signal(after_score)

                arg = (
                    f"⚔️ İTİRAZ [Takas -> Teknik]: İndikatörler alım üretse de, tahtada BofA'nın {bofa:,} lotluk net satışı "
                    f"ve {wall:.2f}x kademe satış duvarı baskısı var. Bu hareket 'Yalancı Alım Tuzağı' (Bull Trap) işaretidir."
                )

                revised_reasoning = (
                    f"{tech.reasoning} | [MÜNAZARA REVİZYONU]: Takas Ajanı itirazı kabul edildi - "
                    f"BofA'nın {bofa:,} lot satışı ve {wall:.2f}x duvar baskısı sebebiyle teknik puan {penalty:.0f} kırıldı."
                )

                tech.score = round(after_score, 1)
                tech.signal = new_signal
                tech.confidence = max(0.50, round(tech.confidence - 0.15, 2))
                tech.reasoning = revised_reasoning

                challenge = DebateChallenge(
                    challenger_agent_id=depth.agent_id,
                    challenger_name=depth.agent_name,
                    target_agent_id=tech.agent_id,
                    target_name=tech.agent_name,
                    conflict_type="BULL_TRAP_TAKAS",
                    dispute_metric=f"BofA: {bofa:,} lot | Kademe Basıncı: {wall:.2f}x",
                    argument=arg,
                    penalty_applied=penalty,
                    target_score_before=before_score,
                    target_score_after=tech.score,
                )
                challenges.append(challenge)
                conflict_summaries.append(arg)

            # Durum 1B: Teknik Aşırı Satımda, Ancak Takas Agresif Kurumsal Toplama Yapıyor
            elif (tech.signal in [SignalType.SAT, SignalType.GUCLU_SAT] and 
                  depth.signal in [SignalType.AL, SignalType.GUCLU_AL] and
                  depth.score > tech.score and bofa > 100_000):
                bonus = 15.0
                before_score = tech.score
                after_score = min(75.0, before_score + bonus)
                new_signal = cls.recompute_signal(after_score)

                arg = (
                    f"⚔️ İTİRAZ [Takas -> Teknik]: İndikatörler gecikmeli düşüş gösterse de, "
                    f"BofA +{bofa:,} lot ile agresif kurumsal taban toplama yapıyor (Dip Dönüşü Teyidi)."
                )

                revised_reasoning = (
                    f"{tech.reasoning} | [MÜNAZARA REVİZYONU]: Takas Ajanı itirazıyla taban toplama teyit edildi "
                    f"(+{bonus:.0f} puan)."
                )

                tech.score = round(after_score, 1)
                tech.signal = new_signal
                tech.reasoning = revised_reasoning

                challenge = DebateChallenge(
                    challenger_agent_id=depth.agent_id,
                    challenger_name=depth.agent_name,
                    target_agent_id=tech.agent_id,
                    target_name=tech.agent_name,
                    conflict_type="BOTTOM_ACCUMULATION",
                    dispute_metric=f"BofA Alım: +{bofa:,} lot",
                    argument=arg,
                    penalty_applied=-bonus,
                    target_score_before=before_score,
                    target_score_after=tech.score,
                )
                challenges.append(challenge)
                conflict_summaries.append(arg)

        # ----------------------------------------------------------------------
        # MÜNAZARA 2: KAP/SENTIMENT vs TEMEL (Değer Tuzağı & Dava/Ceza Riski)
        # ----------------------------------------------------------------------
        if fund and sent:
            sent_val = ctx.news_data.sentiment_score if ctx.news_data else 0.0
            is_negative_sentiment = (sent.score <= 45.0 or sent_val < -0.15 or sent.signal in [SignalType.SAT, SignalType.GUCLU_SAT])
            
            is_value_trap = (
                fund.signal in [SignalType.AL, SignalType.GUCLU_AL] and
                is_negative_sentiment
            )
            fund_diff = fund.score - sent.score

            if is_value_trap and (fund_diff >= cls.CONFLICT_THRESHOLD or is_negative_sentiment):
                penalty = 18.0
                before_score = fund.score
                after_score = max(25.0, before_score - penalty)
                new_signal = cls.recompute_signal(after_score)

                arg = (
                    f"⚔️ İTİRAZ [KAP/Sentiment -> Temel]: Şirketin bilanço çarpanları ucuz görünse de, "
                    f"KAP haber akışı negatif duygu baskısı altında ({sent_val:+.2f}). Hissede 'Değer Tuzağı' (Value Trap) riski var."
                )

                revised_reasoning = (
                    f"{fund.reasoning} | [MÜNAZARA REVİZYONU]: KAP Ajanı itirazı kabul edildi - "
                    f"Negatif haber akışı sebebiyle temel ucuzluk primi {penalty:.0f} puan kırıldı."
                )

                fund.score = round(after_score, 1)
                fund.signal = new_signal
                fund.confidence = max(0.55, round(fund.confidence - 0.12, 2))
                fund.reasoning = revised_reasoning

                challenge = DebateChallenge(
                    challenger_agent_id=sent.agent_id,
                    challenger_name=sent.agent_name,
                    target_agent_id=fund.agent_id,
                    target_name=fund.agent_name,
                    conflict_type="VALUE_TRAP_KAP",
                    dispute_metric=f"KAP Duygu: {sent_val:+.2f}",
                    argument=arg,
                    penalty_applied=penalty,
                    target_score_before=before_score,
                    target_score_after=fund.score,
                )
                challenges.append(challenge)
                conflict_summaries.append(arg)

        # ----------------------------------------------------------------------
        # MÜNAZARA 3: ŞİRKET DOĞRUDAN VERİ vs KAP/SENTIMENT (Rule_FakeNews_Shield)
        # ----------------------------------------------------------------------
        if sent and comp:
            # Kural: KAP/News skoru >= 70 iken Şirket Resmi Teyidi False ise -> KAP skoruna -35 ceza uygula
            comp_verified = True
            if ctx.company_direct_data:
                comp_verified = ctx.company_direct_data.official_verified
            elif "official_verified" in comp.key_metrics:
                comp_verified = comp.key_metrics["official_verified"]

            if sent.score >= 70.0 and not comp_verified:
                penalty = 35.0
                before_score = sent.score
                after_score = max(15.0, before_score - penalty)
                new_signal = cls.recompute_signal(after_score)

                arg = (
                    f"⚔️ İTİRAZ [Şirket Doğrudan Veri -> KAP]: KAP/Haber akışında pompalanan iddialar "
                    f"şirket 1. parti operasyonel kaynakları ve resmi kayıtları tarafından DOĞRULANMADI (Asılsız Söylenti / Fake News Tuzağı)."
                )

                revised_reasoning = (
                    f"{sent.reasoning} | [MÜNAZARA REVİZYONU]: Şirket Doğrudan Veri Ajanı itirazı kabul edildi - "
                    f"Resmi teyit bulunmaması sebebiyle haber duygu puanı {penalty:.0f} kırıldı."
                )

                sent.score = round(after_score, 1)
                sent.signal = new_signal
                sent.confidence = max(0.40, round(sent.confidence - 0.25, 2))
                sent.reasoning = revised_reasoning

                challenge = DebateChallenge(
                    challenger_agent_id=comp.agent_id,
                    challenger_name=comp.agent_name,
                    target_agent_id=sent.agent_id,
                    target_name=sent.agent_name,
                    conflict_type="FAKE_NEWS_SHIELD",
                    dispute_metric="Resmi Teyit: BAŞARISIZ (Doğrulanmadı)",
                    argument=arg,
                    penalty_applied=penalty,
                    target_score_before=before_score,
                    target_score_after=sent.score,
                )
                challenges.append(challenge)
                conflict_summaries.append(arg)

        # ----------------------------------------------------------------------
        # MÜNAZARA 4: GOOGLE TREND & FOMO vs TEKNİK (Rule_FOMO_Peak_Shield)
        # ----------------------------------------------------------------------
        if trend and tech:
            # Kural: TrendAgent fomo_flag == True VE Technical skoru >= 80 -> Teknik skoruna -25 ceza uygula (Boğa Tuzağı Önleme)
            is_fomo = False
            if ctx.trend_data:
                is_fomo = ctx.trend_data.fomo_flag
            elif "fomo_flag" in trend.key_metrics:
                is_fomo = trend.key_metrics["fomo_flag"]

            if is_fomo and tech.score >= 80.0:
                penalty = 25.0
                before_score = tech.score
                after_score = max(25.0, before_score - penalty)
                new_signal = cls.recompute_signal(after_score)

                arg = (
                    f"⚔️ İTİRAZ [Google Trend & FOMO -> Teknik]: Fiyat teknik göstergeleri aşırı alımda iken (Skor: {before_score}), "
                    f"arama trendlerinde tepe FOMO tespiti yapıldı. Küçük yatırımcı coşkusu tepede mal boşaltma (FOMO Boğa Tuzağı) riskidir."
                )

                revised_reasoning = (
                    f"{tech.reasoning} | [MÜNAZARA REVİZYONU]: Trend & FOMO Ajanı itirazı kabul edildi - "
                    f"Aşırı perakende FOMO tespiti sebebiyle teknik skor {penalty:.0f} puan kırıldı."
                )

                tech.score = round(after_score, 1)
                tech.signal = new_signal
                tech.confidence = max(0.50, round(tech.confidence - 0.18, 2))
                tech.reasoning = revised_reasoning

                challenge = DebateChallenge(
                    challenger_agent_id=trend.agent_id,
                    challenger_name=trend.agent_name,
                    target_agent_id=tech.agent_id,
                    target_name=tech.agent_name,
                    conflict_type="FOMO_PEAK_SHIELD",
                    dispute_metric="FOMO Flag: TRUE | Peak Search",
                    argument=arg,
                    penalty_applied=penalty,
                    target_score_before=before_score,
                    target_score_after=tech.score,
                )
                challenges.append(challenge)
                conflict_summaries.append(arg)

        # ----------------------------------------------------------------------
        # MÜNAZARA 5: INSIDER TRADING SHIELD
        # ----------------------------------------------------------------------
        if tech and ctx.insider_trading_data and ctx.insider_trading_data.insider_selling_flag and tech.score >= 60.0:
            penalty = 20.0  # Orantılı kademeli ceza (doğrudan sıfıra çekmek yerine)
            before_score = tech.score
            tech.score = max(25.0, round(before_score - penalty, 1))
            tech.signal = cls.recompute_signal(tech.score)
            tech.reasoning += f" | [DEBATE ALERT] Insider Selling Shield: Patron satisi tespiti (-{penalty} puan)."

        # ----------------------------------------------------------------------
        # MÜNAZARA 6: DCF OVERVALUED SHIELD
        # ----------------------------------------------------------------------
        if fund and ctx.dcf_valuation_data and ctx.market_data.price > (ctx.dcf_valuation_data.fair_value * 1.40):
            penalty = 15.0  # Kademeli değerleme cezası
            before_score = fund.score
            fund.score = max(30.0, round(before_score - penalty, 1))
            fund.signal = cls.recompute_signal(fund.score)
            fund.reasoning += f" | [DEBATE ALERT] DCF Overvalued Shield: Asiri primli fiyatlama (-{penalty} puan)."

        # ----------------------------------------------------------------------
        # MÜNAZARA 7: SOSYAL_MANIPULASYON_SHIELD
        # ----------------------------------------------------------------------
        is_social_simulated = (
            ctx.social_data is not None
            and (
                getattr(ctx.social_data, "is_simulated", False)
                or not getattr(ctx.social_data, "is_live", True)
                or not getattr(ctx.social_data, "is_reliable", True)
                or getattr(ctx.social_data, "data_source", "").upper() == "SIMULATED"
            )
        )

        if is_social_simulated and ctx.social_data is not None and ctx.social_data.manipulation_risk_score > 70.0:
            conflict_summaries.append(
                "🛡️ [SİMÜLE VERİ KALKANI]: Sosyal medya verisi canlı değil (simüle) — teknik ajana manipülasyon cezası uygulanmadı (Ajanlar simüle veriye güvenmiyor)."
            )
        elif (
            tech
            and ctx.social_data is not None
            and not is_social_simulated
            and ctx.social_data.manipulation_risk_score > 70.0
            and tech.signal in [SignalType.AL, SignalType.GUCLU_AL]
        ):
            penalty = 20.0
            before_score = tech.score
            after_score = max(20.0, round(before_score - penalty, 1))
            new_signal = cls.recompute_signal(after_score)
            arg = "⚔️ İTİRAZ [Sosyal Manipülasyon -> Teknik]: Tahtada yüksek manipülasyon riski (pump & dump) tespit edildi"

            tech.score = after_score
            tech.signal = new_signal
            tech.confidence = max(0.50, round(tech.confidence - 0.15, 2))
            tech.reasoning = f"{tech.reasoning} | [MÜNAZARA REVİZYONU]: {arg} (-{penalty:.0f} puan)."

            challenge = DebateChallenge(
                challenger_agent_id=sent.agent_id if sent else "social_intel",
                challenger_name=sent.agent_name if sent else "Sosyal Manipülasyon Kalkanı",
                target_agent_id=tech.agent_id,
                target_name=tech.agent_name,
                conflict_type="SOSYAL_MANIPULASYON_SHIELD",
                dispute_metric=f"Manipülasyon Riski: {ctx.social_data.manipulation_risk_score:.0f}/100 | Mention: {ctx.social_data.mention_count}",
                argument=arg,
                penalty_applied=penalty,
                target_score_before=before_score,
                target_score_after=tech.score,
            )
            challenges.append(challenge)
            conflict_summaries.append(arg)

        # ----------------------------------------------------------------------
        # MÜNAZARA 8: SKEPTİK FİLTRE (Aşırı İyimserlik Cezası)
        # ----------------------------------------------------------------------
        skeptic = revised_votes.get("skeptic")
        if (
            skeptic
            and tech
            and tech.score > 80.0
            and skeptic.key_metrics.get("over_optimism", False)
            and tech.signal in [SignalType.AL, SignalType.GUCLU_AL]
        ):
            penalty = 15.0
            before_score = tech.score
            after_score = max(20.0, round(before_score - penalty, 1))
            new_signal = cls.recompute_signal(after_score)
            arg = "⚔️ İTİRAZ [Skeptik -> Teknik]: Piyasa aşırı iyimser ve RSI/Tahta uyumsuzluğu var (Skeptik Filtre)."

            tech.score = after_score
            tech.signal = new_signal
            tech.confidence = max(0.50, round(tech.confidence - 0.15, 2))
            tech.reasoning = f"{tech.reasoning} | [MÜNAZARA REVİZYONU]: {arg} (-{penalty:.0f} puan)."

            challenge = DebateChallenge(
                challenger_agent_id=skeptic.agent_id,
                challenger_name=skeptic.agent_name,
                target_agent_id=tech.agent_id,
                target_name=tech.agent_name,
                conflict_type="SKEPTIC_FILTER",
                dispute_metric=f"RSI: {ctx.market_data.rsi:.1f} | Over Optimism: True",
                argument=arg,
                penalty_applied=penalty,
                target_score_before=before_score,
                target_score_after=tech.score,
            )
            challenges.append(challenge)
            conflict_summaries.append(arg)

        # ----------------------------------------------------------------------
        # MÜNAZARA 9: GÜVEN KALKANI (Sağlam Temel Desteği)
        # ----------------------------------------------------------------------
        trust = revised_votes.get("trust")
        if (
            trust
            and fund
            and fund.signal in [SignalType.SAT, SignalType.GUCLU_SAT]
            and trust.key_metrics.get("solid_fundamentals", False)
        ):
            bonus = 10.0
            before_score = fund.score
            after_score = min(90.0, round(before_score + bonus, 1))
            new_signal = cls.recompute_signal(after_score)
            arg = "⚔️ DESTEK [Güven Kalkanı -> Temel]: Bilanço ve Altman Z / Piotroski skorları çok güçlü; geçici satış baskısına karşı Güven Kalkanı devreye girdi."

            fund.score = after_score
            fund.signal = new_signal
            fund.reasoning = f"{fund.reasoning} | [MÜNAZARA REVİZYONU]: {arg} (+{bonus:.0f} puan)."

            challenge = DebateChallenge(
                challenger_agent_id=trust.agent_id,
                challenger_name=trust.agent_name,
                target_agent_id=fund.agent_id,
                target_name=fund.agent_name,
                conflict_type="TRUST_SHIELD",
                dispute_metric="Solid Fundamentals: True | Altman Z > 3",
                argument=arg,
                penalty_applied=-bonus,
                target_score_before=before_score,
                target_score_after=fund.score,
            )
            challenges.append(challenge)
            conflict_summaries.append(arg)

        # ----------------------------------------------------------------------
        # MÜNAZARA 10: LİKİDİTE KALKANI (Sığ Tahta / Yüksek Kayma Cezası)
        # ----------------------------------------------------------------------
        try:
            liq_analysis = LiquidityEngine.analyze_order_book_impact(
                bids=ctx.depth_data.bids if ctx.depth_data and ctx.depth_data.bids else [],
                asks=ctx.depth_data.asks if ctx.depth_data and ctx.depth_data.asks else [],
                order_size_tl=150_000.0,
                current_price=ctx.market_data.price,
                side="BUY"
            )
            if liq_analysis.get("is_thin_book", False) and tech and tech.signal in [SignalType.AL, SignalType.GUCLU_AL]:
                penalty = 10.0
                before_score = tech.score
                after_score = max(20.0, round(before_score - penalty, 1))
                new_signal = cls.recompute_signal(after_score)
                slip_pct = liq_analysis.get("estimated_slippage_pct", 1.5)
                arg = f"⚔️ İTİRAZ [Likidite Kalkanı -> Teknik]: Sığ tahta ve yüksek kayma riski tespit edildi (%{slip_pct:.2f}). Alım sinyali cezalandırıldı."

                tech.score = after_score
                tech.signal = new_signal
                tech.confidence = max(0.50, round(tech.confidence - 0.10, 2))
                tech.reasoning = f"{tech.reasoning} | [MÜNAZARA REVİZYONU]: {arg} (-{penalty:.0f} puan)."

                challenge = DebateChallenge(
                    challenger_agent_id="liquidity_engine",
                    challenger_name="Likidite Şok Motoru",
                    target_agent_id=tech.agent_id,
                    target_name=tech.agent_name,
                    conflict_type="LIQUIDITY_SHIELD",
                    dispute_metric=f"Slippage: %{slip_pct:.2f} | Thin Book: True",
                    argument=arg,
                    penalty_applied=penalty,
                    target_score_before=before_score,
                    target_score_after=tech.score,
                )
                challenges.append(challenge)
                conflict_summaries.append(arg)
        except Exception as e:
            print(f"[DEBATE] LiquidityEngine hata: {e}")

        # ----------------------------------------------------------------------
        # MÜNAZARA 11: BOTNET İLLÜZYON KALKANI (Yapay Sosyal Şişirme Cezası)
        # ----------------------------------------------------------------------
        botnet_score = 0.0
        if ctx.social_data and getattr(ctx.social_data, "manipulation_risk_score", 0.0) > 70.0:
            botnet_score = ctx.social_data.manipulation_risk_score

        if hasattr(ctx, "social_mentions") and getattr(ctx, "social_mentions"):
            botnet_res = SocialIllusionEngine.detect_botnet(ctx.social_mentions)
            botnet_score = max(botnet_score, float(botnet_res.get("botnet_risk_score", 0.0)))

        if is_social_simulated and botnet_score > 70.0:
            conflict_summaries.append(
                "🛡️ [SİMÜLE VERİ KALKANI]: Botnet verisi canlı değil (simüle) — teknik ajana ceza uygulanmadı."
            )
        elif botnet_score > 70.0 and tech and tech.signal in [SignalType.AL, SignalType.GUCLU_AL]:
            penalty = 25.0
            before_score = tech.score
            after_score = max(15.0, round(before_score - penalty, 1))
            new_signal = cls.recompute_signal(after_score)
            arg = f"⚔️ İTİRAZ [Botnet İllüzyon Kalkanı -> Teknik]: Sosyal medyada organize botnet ve yapay pompalama tespit edildi (Botnet/Manipülasyon Skoru: {botnet_score:.0f}/100). Teknik alım sinyali cezalandırıldı."

            tech.score = after_score
            tech.signal = new_signal
            tech.confidence = max(0.40, round(tech.confidence - 0.20, 2))
            tech.reasoning = f"{tech.reasoning} | [MÜNAZARA REVİZYONU]: {arg} (-{penalty:.0f} puan)."

            challenge = DebateChallenge(
                challenger_agent_id="social_illusion_engine",
                challenger_name="Botnet İllüzyon Kalkanı",
                target_agent_id=tech.agent_id,
                target_name=tech.agent_name,
                conflict_type="BOTNET_ILLUSION_SHIELD",
                dispute_metric=f"Botnet/Manipülasyon Riski: {botnet_score:.0f}/100",
                argument=arg,
                penalty_applied=penalty,
                target_score_before=before_score,
                target_score_after=tech.score,
            )
            challenges.append(challenge)
            conflict_summaries.append(arg)

        # ----------------------------------------------------------------------
        # MÜNAZARA 12: AŞIRI DEĞERLEME KALKANI (DCF Aşırı Primli Cezası)
        # ----------------------------------------------------------------------
        dcf_is_overvalued = False
        if fund and (fund.key_metrics.get("dcf_is_overvalued") or fund.key_metrics.get("dcf_status") == "ASIRI_PRIMLI"):
            dcf_is_overvalued = True
        elif ctx.dcf_valuation_data and ctx.market_data and ctx.market_data.price > (ctx.dcf_valuation_data.fair_value * 1.25):
            dcf_is_overvalued = True

        if dcf_is_overvalued and fund and fund.signal in [SignalType.AL, SignalType.GUCLU_AL]:
            penalty = 15.0
            before_score = fund.score
            after_score = max(20.0, round(before_score - penalty, 1))
            new_signal = cls.recompute_signal(after_score)
            arg = "⚔️ İTİRAZ [Aşırı Değerleme Kalkanı -> Temel]: DCF nakit akışlarına göre hisse adil değerinin üzerinde (Aşırı Primli). Alım sinyali cezalandırıldı."

            fund.score = after_score
            fund.signal = new_signal
            fund.confidence = max(0.40, round(fund.confidence - 0.15, 2))
            fund.reasoning = f"{fund.reasoning} | [MÜNAZARA REVİZYONU]: {arg} (-{penalty:.0f} puan)."

            challenge = DebateChallenge(
                challenger_agent_id="valuation_engine",
                challenger_name="DCF Değerleme Motoru",
                target_agent_id=fund.agent_id,
                target_name=fund.agent_name,
                conflict_type="OVERVALUATION_SHIELD",
                dispute_metric="DCF Status: ASIRI_PRIMLI | Intrinsic Premium > 25%",
                argument=arg,
                penalty_applied=penalty,
                target_score_before=before_score,
                target_score_after=fund.score,
            )
            challenges.append(challenge)
            conflict_summaries.append(arg)

        # ----------------------------------------------------------------------
        # MÜNAZARA 13: MAKRO ŞOK KALKANI (Yüksek Makro Kırılganlık Cezası)
        # ----------------------------------------------------------------------
        try:
            macro_res = MacroShockEngine.simulate_all_shocks(ctx.ticker)
            macro_vuln = float(macro_res.get("max_vulnerability_score", 0.0))
            is_macro_high_risk = macro_vuln >= 70.0
        except Exception:
            macro_vuln = 0.0
            is_macro_high_risk = False

        if is_macro_high_risk and tech and tech.signal in [SignalType.AL, SignalType.GUCLU_AL]:
            penalty = 15.0
            before_score = tech.score
            after_score = max(20.0, round(before_score - penalty, 1))
            new_signal = cls.recompute_signal(after_score)
            arg = f"⚔️ İTİRAZ [Makro Şok Kalkanı -> Teknik]: Hisse makro stres senaryolarına karşı yüksek kırılganlık taşıyor (Kırılganlık Skoru: {macro_vuln:.0f}/100). Makro riskler teknik analizi geçersiz kıldığı için alım sinyali cezalandırıldı."

            tech.score = after_score
            tech.signal = new_signal
            tech.confidence = max(0.45, round(tech.confidence - 0.15, 2))
            tech.reasoning = f"{tech.reasoning} | [MÜNAZARA REVİZYONU]: {arg} (-{penalty:.0f} puan)."

            challenge = DebateChallenge(
                challenger_agent_id="macro_shock_engine",
                challenger_name="Makro Şok & Black Swan Motoru",
                target_agent_id=tech.agent_id,
                target_name=tech.agent_name,
                conflict_type="MACRO_SHOCK_SHIELD",
                dispute_metric=f"Macro Vulnerability: {macro_vuln:.0f}/100 | Black Swan Risk: True",
                argument=arg,
                penalty_applied=penalty,
                target_score_before=before_score,
                target_score_after=tech.score,
            )
            challenges.append(challenge)
            conflict_summaries.append(arg)

        # ----------------------------------------------------------------------
        # MÜNAZARA 14: PORTFÖY MARJİNAL VaR KALKANI
        # Yeni alım portföy riske maruz değerini (VaR) orantısız artırıyorsa Teknik Ajan AL sinyaline -10 ceza
        # ----------------------------------------------------------------------
        try:
            sample_portfolio = [
                {"ticker": "THYAO", "value_tl": 300000.0},
                {"ticker": "ASELS", "value_tl": 250000.0},
                {"ticker": "KCHOL", "value_tl": 200000.0},
            ]
            new_asset = {"ticker": ctx.ticker, "value_tl": 150000.0}
            marginal_res = VaREngine.calculate_marginal_var(new_asset, sample_portfolio)
            is_var_excessive = marginal_res.get("is_excessive_risk", False)
            var_inc_pct = marginal_res.get("var_increase_pct", 0.0)
        except Exception:
            is_var_excessive = False
            var_inc_pct = 0.0

        if is_var_excessive and tech and tech.signal in [SignalType.AL, SignalType.GUCLU_AL]:
            penalty = 10.0
            before_score = tech.score
            after_score = max(20.0, round(before_score - penalty, 1))
            new_signal = cls.recompute_signal(after_score)
            arg = (
                f"⚔️ İTİRAZ [Portföy VaR Kalkanı -> Teknik]: Yeni alım portföyün Riske Maruz Değerini (VaR) "
                f"%{var_inc_pct:+.1f} oranında artırarak risk bütçesini zorlamaktadır. "
                f"Portföy dengesini korumak için teknik alım sinyali cezalandırıldı (-{penalty:.0f} puan)."
            )

            tech.score = after_score
            tech.signal = new_signal
            tech.confidence = max(0.45, round(tech.confidence - 0.10, 2))
            tech.reasoning = f"{tech.reasoning} | [MÜNAZARA REVİZYONU]: {arg}"

            challenge = DebateChallenge(
                challenger_agent_id="var_engine",
                challenger_name="Portföy VaR & Risk Motoru",
                target_agent_id=tech.agent_id,
                target_name=tech.agent_name,
                conflict_type="PORTFOLIO_VAR_SHIELD",
                dispute_metric=f"Marginal VaR Increase: %{var_inc_pct:+.1f} | Excessive Risk: True",
                argument=arg,
                penalty_applied=penalty,
                target_score_before=before_score,
                target_score_after=tech.score,
            )
            challenges.append(challenge)
            conflict_summaries.append(arg)

        # ----------------------------------------------------------------------
        # MÜNAZARA 15: WATERMARKER KALKANI (Organize Cümle Yayılımı / Pompalama Cezası)
        # Eğer WatermarkTracker "Yüksek Manipülasyon" tespit ederse, Teknik Ajanın AL sinyaline -30 ceza uygula
        # ----------------------------------------------------------------------
        is_watermarker_excessive = False
        watermarker_history_score = 0.0
        active_watermarker_id = None
        try:
            if ctx.social_data is not None:
                watermarker_history_score = float(getattr(ctx.social_data, "manipulation_history_score", 0.0))
                is_watermarker_excessive = bool(getattr(ctx.social_data, "is_watermarker_high_risk", False) or watermarker_history_score > 80.0)
                active_watermarker_id = getattr(ctx.social_data, "watermarker_id", None)
        except Exception:
            is_watermarker_excessive = False

        if is_watermarker_excessive and tech and tech.signal in [SignalType.AL, SignalType.GUCLU_AL]:
            penalty = 30.0
            before_score = tech.score
            after_score = max(15.0, round(before_score - penalty, 1))
            new_signal = cls.recompute_signal(after_score)
            arg = (
                f"⚔️ İTİRAZ [Watermarker Kalkanı -> Teknik]: Sosyal medyada ID '{active_watermarker_id or 'Bilinmeyen'}' "
                f"tarafından başlatılan organize cümle yayılımı tespit edildi "
                f"(Manipülasyon Geçmiş Skoru: {watermarker_history_score:.0f}/100 > 80). "
                f"Pompalama riskine karşı teknik alım sinyali cezalandırıldı (-{penalty:.0f} puan)."
            )

            tech.score = after_score
            tech.signal = new_signal
            tech.confidence = max(0.40, round(tech.confidence - 0.25, 2))
            tech.reasoning = f"{tech.reasoning} | [MÜNAZARA REVİZYONU]: {arg}"

            challenge = DebateChallenge(
                challenger_agent_id="watermark_tracker",
                challenger_name="Watermarker & Manipülatör Takipçisi",
                target_agent_id=tech.agent_id,
                target_name=tech.agent_name,
                conflict_type="WATERMARKER_PROPAGATION_SHIELD",
                dispute_metric=f"Watermarker ID: {active_watermarker_id} | History Score: {watermarker_history_score:.0f}/100 | High Risk: True",
                argument=arg,
                penalty_applied=penalty,
                target_score_before=before_score,
                target_score_after=tech.score,
            )
            challenges.append(challenge)
            conflict_summaries.append(arg)

        debate_occurred = len(challenges) > 0

        return DebateRoundResult(
            debate_occurred=debate_occurred,
            conflict_summary=" \n".join(conflict_summaries) if conflict_summaries else "Uzlaşma sağlandı, itiraz gerekmedi.",
            challenges=challenges,
            revised_agent_responses=revised_votes,
        )

