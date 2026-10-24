"""
Bistapp MT16 - Multi-Agent Orchestrator Pipeline (orchestrator.py)
------------------------------------------------------------------
6 Uzman Ajanı (Technical, Depth, Fundamental, Sentiment, CompanyDirect, Trend)
UnifiedContext verisi üzerinden çalıştırır, münazara (DebateEngine) protokolünü
işletir ve nihai kararı (FinalDecision) üretir.
"""

from __future__ import annotations
import os
import time
import asyncio
from datetime import datetime, timezone
from pathlib import Path
try:
    import requests
except ImportError:
    requests = None

from schemas import (
    UnifiedContext,
    AgentResponse,
    SignalType,
    FinalDecision,
    MarketRegime,
    SocialData,
)
from debate import DebateEngine

try:
    from input_engine.social_intel import analyze_social_manipulation
except ImportError:
    analyze_social_manipulation = None

try:
    from valuation_engine import ValuationEngine
except ImportError:
    class ValuationEngine:
        @staticmethod
        def calculate_dcf(*args, **kwargs):
            return {"is_overvalued": False, "status": "DENGELI", "summary": "DCF analizi nötr."}
        @staticmethod
        def evaluate_relative_value(*args, **kwargs):
            return {"weighted_discount_pct": 0.0, "status": "DENGELI", "summary": "Çarpan analizi dengeli."}

try:
    from post_mortem_engine import PostMortemEngine
except ImportError:
    class PostMortemEngine:
        @staticmethod
        def load_agent_weights():
            return {
                "technical": 0.22,
                "depth": 0.18,
                "fundamental": 0.18,
                "sentiment": 0.10,
                "company_direct": 0.06,
                "trend": 0.12,
                "skeptic": 0.07,
                "trust": 0.07,
            }

try:
    from analyst_consensus_engine import AnalystConsensusEngine
except ImportError:
    class AnalystConsensusEngine:
        @staticmethod
        def check_earnings_surprise(*args, **kwargs):
            return {"signal": "BEKLENTİYE_PARALEL", "surprise_pct": 0.0, "summary": "Beklentiye paralel."}
        @staticmethod
        def get_simulated_earnings_surprise(*args, **kwargs):
            return {"signal": "BEKLENTİYE_PARALEL", "surprise_pct": 0.0, "summary": "Beklentiye paralel."}

try:
    from factor_risk_engine import FactorRiskEngine
except ImportError:
    class FactorRiskEngine:
        @staticmethod
        def calculate_beta_alpha(*args, **kwargs):
            return {"beta": 1.0, "alpha_annualized_pct": 0.0, "crisis_resilience_score": 50.0}

try:
    from macro_shock_engine import MacroShockEngine
except ImportError:
    class MacroShockEngine:
        @staticmethod
        def simulate_all_shocks(*args, **kwargs):
            return {"is_any_high_risk": False}

try:
    from peer_valuation_engine import PeerValuationEngine
except ImportError:
    class PeerValuationEngine:
        @staticmethod
        def calculate_sector_heatmap(*args, **kwargs):
            return {"valuation_status": "SEKTÖRLE_PARALEL", "composite_z_score": 0.0, "summary": ""}

try:
    from durable_executor import DurableExecutor
except ImportError:
    class DurableExecutor:
        @staticmethod
        def execute_with_recovery(task_id, task_func, *args, **kwargs):
            return task_func(*args, **kwargs)

try:
    from data_quality_gate import DataQualityGate
except ImportError:
    class DataQualityGate:
        @staticmethod
        def sanitize_context(ctx): return ctx, []
        @staticmethod
        def validate_market_data(data): return True, ""
        @staticmethod
        def validate_social_data(data): return True, ""

try:
    from factor_attribution_engine import FactorAttributionEngine
except ImportError:
    class FactorAttributionEngine:
        @staticmethod
        def decompose_returns(*args, **kwargs):
            return {"is_beta_driven": False, "market_component_pct": 5.0, "alpha_component_pct": 3.0}

try:
    from feature_importance_engine import FeatureImportanceEngine
except ImportError:
    class FeatureImportanceEngine:
        @staticmethod
        def calculate_feature_importance(*args, **kwargs):
            return {"weights_ratio": {"depth": 0.25, "technical": 0.25, "fundamental": 0.25, "sentiment": 0.25}, "summary": ""}
        @staticmethod
        def modulate_agent_weights(weights, importance):
            return weights

try:
    from kernel.generator import CanvasBuilder, transmit_to_publisher
except ImportError:
    try:
        from python.kernel.generator import CanvasBuilder, transmit_to_publisher
    except ImportError:
        class CanvasBuilder:
            @staticmethod
            def build_svg_card(payload): return "<svg></svg>"
            @staticmethod
            def save_svg_card(svg, ticker): return ""
        def transmit_to_publisher(payload, gateway_url=None):
            return {"success": False, "status": "NOT_AVAILABLE"}



def _score_to_signal(score: float) -> SignalType:
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


class MultiAgentPipeline:
    """Çoklu Ajan Orkestratörü"""

    @classmethod
    def evaluate_technical(cls, ctx: UnifiedContext) -> AgentResponse:
        m = ctx.market_data
        
        # Fiyat momentumu ve değişim hesabı
        # Eğer Alpaca'dan canlı veri geldiyse gerçek fiyat ve değişim kullanılır
        base_score = 65.0
        
        # Günlük değişim etkisi
        if m.change_pct > 2.0:
            base_score += 15.0
        elif m.change_pct > 0.0:
            base_score += 8.0
        elif m.change_pct < -2.0:
            base_score -= 18.0
        elif m.change_pct < 0.0:
            base_score -= 8.0

        # RSI etkisi
        if m.rsi >= 70:
            base_score += 10.0  # Güçlü momentum
        elif m.rsi <= 35:
            base_score -= 10.0  # Zayıf trend

        # Hareketli ortalama trendi
        if m.price > m.moving_avg_50:
            base_score += 6.0
        if m.price > m.moving_avg_200:
            base_score += 6.0

        score = max(10.0, min(95.0, round(base_score, 1)))
        signal = _score_to_signal(score)

        confidence = 0.85
        source_info = f" ({m.source})" if m.source != "DEFAULT" else ""
        reasoning = (
            f"Fiyat {m.price:.2f}{source_info}, Günlük Değişim: %{m.change_pct:+.2f}, "
            f"RSI: {m.rsi:.1f}, MACD: {m.macd_signal}. Trend güçlü."
        )

        # 📊 FactorRiskEngine & MacroShockEngine Duyarlılık Kontrolü
        factor_data = FactorRiskEngine.calculate_beta_alpha(ctx.ticker)
        beta_val = float(factor_data.get("beta", 1.0))
        macro_shock_data = MacroShockEngine.simulate_all_shocks(ctx.ticker)
        is_macro_high_risk = macro_shock_data.get("is_any_high_risk", False)

        if beta_val > 1.5 and is_macro_high_risk:
            reasoning += f" | [UYARI]: Yüksek Beta (Beta: {beta_val:.2f}): Piyasa düşüşlerinde sert düşebilir."
            confidence = max(0.40, round(confidence - 0.05, 2))

        # 📈 FactorAttributionEngine: Getiri Kaynak Ayrıştırması (Beta vs Sektör vs Alpha)
        attribution_data = FactorAttributionEngine.decompose_returns(ctx.ticker)
        if attribution_data.get("is_beta_driven", False):
            score = max(20.0, round(score - 10.0, 1))
            signal = _score_to_signal(score)
            reasoning += " | [FAKTÖR AYRIŞTIRMASI]: Getirinin çoğu piyasa rüzgarından, Alpha üretimi zayıf (-10 puan)."

        return AgentResponse(
            agent_id="technical",
            agent_name="Teknik Analiz Ajanı",
            signal=signal,
            score=score,
            confidence=confidence,
            reasoning=reasoning,
            key_metrics={
                "price": m.price,
                "change_pct": m.change_pct,
                "rsi": m.rsi,
                "volume": m.volume,
                "source": m.source,
                "beta": beta_val,
                "alpha": factor_data.get("alpha_annualized_pct", 0.0),
                "crisis_resilience_score": factor_data.get("crisis_resilience_score", 50.0),
                "factor_attribution": attribution_data,
            }
        )

    @classmethod
    def evaluate_depth(cls, ctx: UnifiedContext) -> AgentResponse:
        d = ctx.depth_data
        score = 60.0
        confidence = 0.80
        source_note = ""
        is_suspicious = False

        if d:
            is_suspicious = getattr(d, "is_suspicious", False)
            data_src = str(getattr(d, "data_source", "SIMULATED")).upper()
            obi_val = getattr(d, "obi", 0.0)

            # OBI (Order Book Imbalance) Etkisi
            if obi_val >= 0.20:
                score += 10.0
            elif obi_val <= -0.20:
                score -= 12.0

            if d.wall_pressure_ratio > 1.2:
                score += 8.0
            elif d.wall_pressure_ratio < 0.8:
                score -= 10.0

            if d.bofa_net_lot > 50_000:
                score += 10.0
            elif d.bofa_net_lot < -50_000:
                score -= 15.0

            if d.is_wall_spoofing:
                score -= 15.0

            # Şüpheli / Simüle L2 Veri Koruması
            if is_suspicious:
                score = 50.0  # Şüpheli veride nötrle
                confidence = 0.35
                source_note = f" | ⚠️ [ŞÜPHELİ L2]: {getattr(d, 'suspicious_reason', 'L2 verisi güvenilmez, bu sinyale dayanma.')}"
            elif data_src != "REALTIME_WS":
                confidence = max(0.45, confidence - 0.15)
                source_note = " | [BİLGİ]: Simüle L2 verisi (Canlı WebSocket değildir)."

        score = max(10.0, min(95.0, round(score, 1)))
        signal = _score_to_signal(score)
        
        bofa_text = f"{d.bofa_net_lot:+,} lot" if d else "N/A"
        wall_text = f"{d.wall_pressure_ratio:.2f}x" if d else "N/A"
        obi_text = f"{getattr(d, 'obi', 0.0):+.3f}" if d else "0.000"
        reasoning = f"Tahta Derinliği: OBI {obi_text}, BofA Akışı {bofa_text}, Duvar Baskısı {wall_text}.{source_note}"

        return AgentResponse(
            agent_id="depth",
            agent_name="Takas & Derinlik Ajanı",
            signal=signal,
            score=score,
            confidence=confidence,
            reasoning=reasoning,
            key_metrics={
                "bofa_net_lot": d.bofa_net_lot if d else 0,
                "wall_pressure": d.wall_pressure_ratio if d else 1.0,
                "spoofing": d.is_wall_spoofing if d else False,
                "obi": getattr(d, "obi", 0.0) if d else 0.0,
                "data_source": getattr(d, "data_source", "SIMULATED") if d else "NONE",
                "is_suspicious": is_suspicious,
            }
        )

    @classmethod
    def evaluate_fundamental(cls, ctx: UnifiedContext) -> AgentResponse:
        f = ctx.fundamental_data
        score = 65.0
        if f:
            if f.altman_z_score > 3.0:
                score += 10.0
            elif f.altman_z_score < 1.8:
                score -= 15.0

            if f.piotroski_f_score >= 7:
                score += 10.0
            elif f.piotroski_f_score <= 4:
                score -= 10.0

            if f.beneish_m_score > -1.78:
                score -= 20.0  # Manipülasyon şüphesi

        # 📊 ValuationEngine: DCF ve Sektörel Çarpan Analizi
        current_px = ctx.market_data.price if ctx.market_data else 100.0

        dcf_result = ValuationEngine.calculate_dcf(
            free_cash_flows=[current_px * 800, current_px * 920, current_px * 1050, current_px * 1200, current_px * 1400],
            discount_rate=0.14,
            terminal_growth_rate=0.04,
            shares_outstanding=10000.0,
            current_price=current_px
        )

        rel_result = ValuationEngine.evaluate_relative_value(
            pe_ratio=f.pe_ratio if f else 10.0,
            sector_pe=12.5,
            pb_ratio=f.pb_ratio if f else 2.0,
            sector_pb=2.8
        )

        # İskontoluysa artı puan, primliyse eksi puan
        if rel_result.get("weighted_discount_pct", 0.0) >= 10.0:
            score += 10.0
        elif rel_result.get("weighted_discount_pct", 0.0) <= -15.0:
            score -= 10.0

        if dcf_result.get("is_overvalued", False):
            score -= 15.0
        elif dcf_result.get("status") == "ISCONTOLU":
            score += 10.0

        # 🏢 PeerValuationEngine: Sektörel Çarpan Isı Haritası
        peer_res = PeerValuationEngine.calculate_sector_heatmap(ctx.ticker)
        peer_status = peer_res.get("valuation_status", "SEKTÖRLE_PARALEL")
        composite_z = peer_res.get("composite_z_score", 0.0)

        peer_note = ""
        if peer_status == "AŞIRI_ISKONTOLU":
            score += 10.0
            peer_note = f" Sektörel iskonto tespit edildi (Z-Skor: {composite_z:.2f}, +10 puan)."
        elif peer_status == "AŞIRI_PRİMLİ":
            score -= 10.0
            peer_note = f" Sektörel prim tespit edildi (Z-Skor: {composite_z:.2f}, -10 puan)."

        score = max(10.0, min(95.0, round(score, 1)))
        signal = _score_to_signal(score)

        z_text = f"{f.altman_z_score:.2f}" if f else "N/A"
        f_text = f"{f.piotroski_f_score}" if f else "N/A"
        reasoning = (
            f"Mali Tablo Sağlığı: Altman Z-Skor {z_text}, Piotroski F-Skor {f_text}. "
            f"Değerleme: {rel_result['summary']} {dcf_result['summary']}{peer_note}"
        )

        return AgentResponse(
            agent_id="fundamental",
            agent_name="Temel Değerleme Ajanı",
            signal=signal,
            score=score,
            confidence=0.85,
            reasoning=reasoning,
            key_metrics={
                "altman_z": f.altman_z_score if f else 0,
                "piotroski_f": f.piotroski_f_score if f else 0,
                "dcf_fair_value": dcf_result.get("fair_value_per_share", 0.0),
                "dcf_is_overvalued": dcf_result.get("is_overvalued", False),
                "dcf_status": dcf_result.get("status", "DENGELI"),
                "relative_discount_pct": rel_result.get("weighted_discount_pct", 0.0),
                "relative_status": rel_result.get("status", "DENGELI"),
                "peer_valuation": peer_res,
            }
        )

    @classmethod
    def evaluate_sentiment(cls, ctx: UnifiedContext) -> AgentResponse:
        n = ctx.news_data
        sent = n.sentiment_score if n else 0.0
        score = round(50.0 + (sent * 40.0), 1)
        score = max(15.0, min(90.0, score))
        reasoning = f"Haber akışı ve KAP duygu skoru {sent:+.2f}."

        manip_risk = 0.0
        is_social_simulated = False
        simulation_warning = ""
        if ctx.social_data is not None:
            is_social_simulated = bool(
                getattr(ctx.social_data, "is_simulated", False)
                or not getattr(ctx.social_data, "is_live", True)
                or not getattr(ctx.social_data, "is_reliable", True)
                or getattr(ctx.social_data, "data_source", "").upper() == "SIMULATED"
            )
            manip_risk = float(ctx.social_data.manipulation_risk_score)
            simulation_warning = getattr(ctx.social_data, "simulation_warning", "")

            if manip_risk > 70.0:
                if is_social_simulated:
                    reasoning += " | ⚠️ [SİMÜLE VERİ]: Sosyal medya verisi simüle olduğu için manipülasyon cezası uygulanmadı (Ajan simüle veriye güvenmiyor)."
                else:
                    score = max(15.0, round(score - 15.0, 1))
                    reasoning += " | [UYARI]: Sosyal medya manipülasyon riski tespit edildi (-15 puan)."
            elif is_social_simulated:
                reasoning += " | ℹ️ [SİMÜLE VERİ]: Sosyal veri akışı canlı değil (simüle mod)."

        # 📈 Analist Konsensüsü & Sürpriz Kâr Radarı
        surprise_res = AnalystConsensusEngine.get_simulated_earnings_surprise(ctx.ticker)
        surprise_sig = surprise_res.get("signal", "BEKLENTİYE_PARALEL")
        surprise_pct = surprise_res.get("surprise_pct", 0.0)

        if surprise_sig == "POZİTİF_SURPRIZ":
            score += 10.0
            reasoning += f" | [ANALİST KONSENSÜSÜ]: Bilanço sürprizi: Kâr beklentinin %{abs(surprise_pct):.1f} üzerinde (+10 puan)."
        elif surprise_sig == "NEGATİF_SURPRIZ":
            score -= 10.0
            reasoning += f" | [ANALİST KONSENSÜSÜ]: Bilanço sürprizi: Kâr beklentinin %{abs(surprise_pct):.1f} altında (-10 puan)."

        score = max(10.0, min(95.0, round(score, 1)))
        signal = _score_to_signal(score)
        agent_conf = 0.50 if is_social_simulated else 0.75

        return AgentResponse(
            agent_id="sentiment",
            agent_name="KAP Duygu Ajanı",
            signal=signal,
            score=score,
            confidence=agent_conf,
            reasoning=reasoning,
            key_metrics={
                "sentiment_score": sent,
                "manipulation_risk_score": manip_risk,
                "earnings_surprise": surprise_res,
                "is_simulated": is_social_simulated,
                "simulation_warning": simulation_warning or ("⚠️ Simüle Veri: Canlı JIRO akışı yok" if is_social_simulated else ""),
            },
            manipulation_risk_score=manip_risk,
        )

    @classmethod
    def evaluate_company_direct(cls, ctx: UnifiedContext) -> AgentResponse:
        score = 60.0
        if ctx.company_direct_data and ctx.company_direct_data.directors_buying:
            score += 20.0
        signal = _score_to_signal(score)
        return AgentResponse(
            agent_id="company_direct",
            agent_name="Şirket İçi Direkt Ajan",
            signal=signal,
            score=score,
            confidence=0.70,
            reasoning="Yönetici işlemleri ve doğrudan şirket duyuruları incelendi.",
            key_metrics={"directors_buying": getattr(ctx.company_direct_data, "directors_buying", False)}
        )

    @classmethod
    def evaluate_trend(cls, ctx: UnifiedContext) -> AgentResponse:
        """Google Trends ve Arama Momentumu Ajanı"""
        t = ctx.trend_data
        if not t:
            return AgentResponse(
                agent_id="trend",
                agent_name="Google Trend & FOMO Ajanı",
                signal=SignalType.NOTR,
                score=50.0,
                confidence=0.60,
                reasoning="Trend verisi bulunamadı.",
                key_metrics={"fomo_flag": False, "momentum_pct": 0.0}
            )

        # Temel skor
        score = 55.0
        if t.search_momentum_pct > 50.0:
            # Dikkat: Aşırı FOMO uyarısı!
            score = 80.0
        elif t.search_momentum_pct > 15.0:
            score += 15.0
        elif t.search_momentum_pct < -20.0:
            score -= 15.0

        score = max(10.0, min(95.0, round(score, 1)))
        signal = _score_to_signal(score)

        fomo_text = "FOMO ALARMI (Tepe Aşırı İlgi)" if t.fomo_flag else "Dengeli Arama"
        reasoning = (
            f"Google Trends 7g Momentum: %{t.search_momentum_pct:+.1f}, "
            f"FOMO Durumu: {fomo_text}, Son İlgi Seviyesi: {t.latest_interest:.0f}/100."
        )

        return AgentResponse(
            agent_id="trend",
            agent_name="Google Trend & FOMO Ajanı",
            signal=signal,
            score=score,
            confidence=0.88,
            reasoning=reasoning,
            key_metrics={
                "fomo_flag": t.fomo_flag,
                "momentum_pct": t.search_momentum_pct,
                "latest_interest": t.latest_interest,
                "recent_avg": t.recent_avg,
                "baseline_avg": t.baseline_avg
            }
        )

    @classmethod
    def evaluate_skeptic(cls, ctx: UnifiedContext) -> AgentResponse:
        """
        Skeptik Ajan: Eğer teknik ajan skoru çok yüksekse (>80) ama takas/hacim zayıfsa
        veya RSI aşırı alımdaysa aşırı iyimserlik uyarısı yapar.
        """
        m = ctx.market_data
        d = ctx.depth_data
        score = 50.0
        reasoning = "Piyasa koşulları normal, aşırı iyimserlik tespit edilmedi."
        over_optimism = False

        if m.rsi > 75.0 or (d and d.wall_pressure_ratio < 0.8):
            over_optimism = True
            score = 35.0
            reasoning = f"⚠️ SKEPTİK UYARI: RSI aşırı alımda ({m.rsi:.1f}) veya tahta baskısı zayıf ({d.wall_pressure_ratio if d else 1.0}x). Aşırı iyimserlik riski."
        else:
            score = 60.0

        signal = _score_to_signal(score)
        return AgentResponse(
            agent_id="skeptic",
            agent_name="Skeptik Analiz Ajanı",
            signal=signal,
            score=score,
            confidence=0.80,
            reasoning=reasoning,
            key_metrics={"over_optimism": over_optimism, "rsi": m.rsi}
        )

    @classmethod
    def evaluate_trust(cls, ctx: UnifiedContext) -> AgentResponse:
        """
        Güven (Trust) Ajanı: Temel göstergeler güçlüyse (Piotroski > 7, Altman Z > 3)
        ve KAP haberleri bunu destekliyorsa sağlam temel desteği sunar.
        """
        f = ctx.fundamental_data
        n = ctx.news_data
        score = 60.0
        reasoning = "Temel veriler ve haber akışı kararlı."
        solid_fundamentals = False

        if f and f.altman_z_score > 3.0 and f.piotroski_f_score >= 7:
            solid_fundamentals = True
            score = 82.0
            reasoning = f"🛡️ GÜVEN KALKANI: Altman Z-Skor ({f.altman_z_score:.2f}) ve Piotroski F-Skor ({f.piotroski_f_score}) güçlü bilanço teyidi veriyor."

        signal = _score_to_signal(score)
        return AgentResponse(
            agent_id="trust",
            agent_name="Güven (Trust) Ajanı",
            signal=signal,
            score=score,
            confidence=0.85,
            reasoning=reasoning,
            key_metrics={"solid_fundamentals": solid_fundamentals, "altman_z": f.altman_z_score if f else 0}
        )

    @classmethod
    async def run(cls, ctx: UnifiedContext) -> FinalDecision:
        # 0. Sosyal manipülasyon verisi yoksa güvenli (fail-safe) olarak doldur
        if ctx.social_data is None and analyze_social_manipulation is not None:
            try:
                ctx.social_data = await analyze_social_manipulation(ctx.ticker)
            except Exception as e:
                print(f"[ORCHESTRATOR] social_data fail-safe ({ctx.ticker}): {e}")
                ctx.social_data = SocialData(
                    ticker=ctx.ticker,
                    mention_count=0,
                    sentiment_score=0.0,
                    manipulation_risk_score=0.0,
                    summary=f"{ctx.ticker} için sosyal veri bağlantısı kurulamadı (⚠️ Simüle Mod).",
                    toon="",
                    data_source="SIMULATED",
                    is_live=False,
                    is_simulated=True,
                    is_reliable=False,
                    simulation_warning="⚠️ Simüle Veri: JIRO mikroservisi çevrimdışı, gerçek sosyal medya akışına ulaşılamıyor.",
                )

        # 0.5 Veri Kalitesi Kapısı (DataQualityGate) denetimi ve stabilizasyonu
        ctx, quality_warnings = DataQualityGate.sanitize_context(ctx)

        # 1. Tüm 8 ajandan ham oyları topla (DurableExecutor ile dayanıklı kurtarma)
        raw_votes: Dict[str, AgentResponse] = {
            "technical": DurableExecutor.execute_with_recovery(f"{ctx.ticker}_technical", cls.evaluate_technical, ctx),
            "depth": DurableExecutor.execute_with_recovery(f"{ctx.ticker}_depth", cls.evaluate_depth, ctx),
            "fundamental": DurableExecutor.execute_with_recovery(f"{ctx.ticker}_fundamental", cls.evaluate_fundamental, ctx),
            "sentiment": DurableExecutor.execute_with_recovery(f"{ctx.ticker}_sentiment", cls.evaluate_sentiment, ctx),
            "company_direct": DurableExecutor.execute_with_recovery(f"{ctx.ticker}_company_direct", cls.evaluate_company_direct, ctx),
            "trend": DurableExecutor.execute_with_recovery(f"{ctx.ticker}_trend", cls.evaluate_trend, ctx),
            "skeptic": DurableExecutor.execute_with_recovery(f"{ctx.ticker}_skeptic", cls.evaluate_skeptic, ctx),
            "trust": DurableExecutor.execute_with_recovery(f"{ctx.ticker}_trust", cls.evaluate_trust, ctx),
        }

        # 2. Münazara protokolünü çalıştır (DebateEngine)
        debate_result = DebateEngine.conduct_one_round_debate(raw_votes, ctx)

        # 3. Nihai ağırlıklı bileşik skoru hesapla (agent_weights.json veya varsayılanlar)
        votes = debate_result.revised_agent_responses
        base_weights = PostMortemEngine.load_agent_weights()

        # 🎯 FeatureImportanceEngine: Anlık Piyasa Faktör Önemi ve Ağırlık Modülasyonu
        feat_importance = FeatureImportanceEngine.calculate_feature_importance(
            ticker=ctx.ticker,
            market_data=ctx.market_data,
            depth_data=ctx.depth_data,
            fundamental_data=ctx.fundamental_data,
            news_data=ctx.news_data,
            social_data=ctx.social_data,
        )
        weights = FeatureImportanceEngine.modulate_agent_weights(base_weights, feat_importance)

        # 🛡️ L2 Veri Kalitesi & Kaynak Koruma Kalkanı:
        # Eğer L2 verisi 'Şüpheli' veya 'Simüle' ise, Takas/Derinlik Ajanının oy ağırlığını otomatik olarak düşür
        if ctx.depth_data:
            is_suspicious = getattr(ctx.depth_data, "is_suspicious", False)
            data_src = str(getattr(ctx.depth_data, "data_source", "SIMULATED")).upper()
            if is_suspicious:
                # Şüpheli veride ağırlığı yarıya düşür (örn: %20 -> %10)
                weights["depth"] = max(0.04, weights.get("depth", 0.18) * 0.50)
            elif data_src != "REALTIME_WS":
                # Simüle veride ağırlığı %30 azalt
                weights["depth"] = max(0.06, weights.get("depth", 0.18) * 0.70)

            # Ağırlıkları normalize et (toplam = 1.0)
            total_w = sum(weights.values())
            weights = {k: round(v / total_w, 4) for k, v in weights.items()}

        composite_score = sum(votes[k].score * weights.get(k, 0.10) for k in votes if k in weights)
        composite_score = round(composite_score, 1)
        final_verdict = _score_to_signal(composite_score)

        # TOON Formatı Üretimi
        chg_sign = "+" if ctx.market_data.change_pct >= 0 else ""
        fomo_str = "TRUE" if (ctx.trend_data and ctx.trend_data.fomo_flag) else "FALSE"
        debate_info = f"{len(debate_result.challenges)} itiraz" if debate_result.debate_occurred else "uzlaşı"
        manip_risk_val = float(ctx.social_data.manipulation_risk_score) if ctx.social_data else 0.0
        social_mentions = int(ctx.social_data.mention_count) if ctx.social_data else 0
        social_sent = float(ctx.social_data.sentiment_score) if ctx.social_data else 0.0
        social_level = "HIGH" if manip_risk_val > 70 else ("MEDIUM" if manip_risk_val >= 40 else "LOW")
        
        toon = (
            f"#TOON/v3.5 schema=MT16_MULTI_AGENT_DECISION\n"
            f"@asset{{sym:{ctx.ticker};px:{ctx.market_data.price:.2f};chg:{chg_sign}{ctx.market_data.change_pct:.2f}%;src:{ctx.market_data.source}}}\n"
            f"@decision{{score:{composite_score}/100;verdict:{final_verdict.value};debate:{debate_info};fomo:{fomo_str};manip_risk:{manip_risk_val:.0f}/100}}\n"
            f"@social{{sym:{ctx.ticker};mentions:{social_mentions};sentiment:{social_sent:+.2f};risk_score:{manip_risk_val:.0f}/100;level:{social_level}}}\n"
            f"@agents{{"
            f"tech:{votes['technical'].score:.0f};"
            f"depth:{votes['depth'].score:.0f};"
            f"fund:{votes['fundamental'].score:.0f};"
            f"sent:{votes['sentiment'].score:.0f};"
            f"trend:{votes['trend'].score:.0f}"
            f"}}\n"
            f"@summary{{Sembol: {ctx.ticker}, Fiyat: {ctx.market_data.price:.2f}, Karar: {final_verdict.value} ({composite_score}/100), FOMO: {fomo_str}, Sosyal Manipülasyon Riski: {manip_risk_val:.0f}/100 ({social_level})}}"
        )

        summary = (
            f"{ctx.ticker} için 6 ajanlı münazara tamamlandı: "
            f"Nihai Karar: {final_verdict.value} ({composite_score}/100). "
            f"Debate İtirazları: {len(debate_result.challenges)} adet."
        )

        decision_payload = {
            "ticker": ctx.ticker,
            "verdict": final_verdict.value,
            "composite_score": composite_score,
            "challenges": debate_result.challenges,
            "debate_result": debate_result,
            "summary": summary
        }
        coach_summary = await generate_coach_summary(decision_payload)

        # 🎨 Dinamik Seviye ve Kalkan Hazırlığı
        current_p = float(ctx.market_data.price) if (ctx.market_data and ctx.market_data.price) else 100.0
        verdict_str = final_verdict.value if hasattr(final_verdict, "value") else str(final_verdict)

        if "AL" in verdict_str:
            e_zone = f"{current_p * 0.99:.2f} - {current_p * 1.01:.2f} ₺"
            t_price = f"{current_p * 1.15:.2f} ₺"
            s_loss = f"{current_p * 0.95:.2f} ₺"
        elif "SAT" in verdict_str:
            e_zone = f"{current_p * 1.00:.2f} ₺ (Satış)"
            t_price = f"{current_p * 0.88:.2f} ₺"
            s_loss = f"{current_p * 1.04:.2f} ₺"
        else:
            e_zone = f"{current_p:.2f} ₺ (İzleme)"
            t_price = f"{current_p * 1.08:.2f} ₺"
            s_loss = f"{current_p * 0.96:.2f} ₺"

        active_shields = []
        if hasattr(debate_result, "challenges") and debate_result.challenges:
            for ch in debate_result.challenges:
                s_name = getattr(ch, "shield_name", None) or getattr(ch, "target_agent", "Münazara Kalkanı")
                if s_name and str(s_name) not in active_shields:
                    active_shields.append(str(s_name))
        if not active_shields:
            active_shields = ["Likidite Kalkanı", "FOMO Kalkanı"]

        # 1. FinalDecision Nesnesini Oluştur
        final_decision = FinalDecision(
            ticker=ctx.ticker,
            timestamp=time.time(),
            verdict=final_verdict,
            composite_score=composite_score,
            confidence=0.82,
            agent_votes=votes,
            debate_result=debate_result,
            social_data=ctx.social_data,
            manipulation_risk_score=manip_risk_val,
            toon=toon,
            summary=summary,
            coach_summary=coach_summary,
            metadata={
                "price": ctx.market_data.price,
                "change_pct": ctx.market_data.change_pct,
                "source": ctx.market_data.source,
                "fomo_flag": ctx.trend_data.fomo_flag if ctx.trend_data else False,
                "trend_momentum": ctx.trend_data.search_momentum_pct if ctx.trend_data else 0.0,
                "challenges_count": len(debate_result.challenges),
                "manipulation_risk_score": manip_risk_val,
                "social_data": ctx.social_data.model_dump() if (ctx.social_data and hasattr(ctx.social_data, "model_dump")) else (ctx.social_data.dict() if ctx.social_data else None),
                "feature_importance": feat_importance,
                "entry_zone": e_zone,
                "target_price": t_price,
                "stop_loss": s_loss,
                "active_shields": active_shields
            }
        )

        # 2. Veri Sözleşmesine (Data Contract) Dönüştür ve Doğrula
        try:
            contract_payload_obj = final_decision.to_contract_payload()
            
            # Pydantic v2 .to_json_payload() veya v1 fallback
            if hasattr(contract_payload_obj, "to_json_payload"):
                contract_payload = contract_payload_obj.to_json_payload()
            elif hasattr(contract_payload_obj, "model_dump"):
                contract_payload = contract_payload_obj.model_dump(by_alias=True)
            else:
                contract_payload = contract_payload_obj

            # 3. Canvas Builder ile SVG Kartı Üret
            svg_card_str = ""
            svg_card_path = ""
            try:
                svg_card_str = CanvasBuilder.build_svg_card(contract_payload)
                contract_payload["svgCard"] = svg_card_str
                svg_card_path = CanvasBuilder.save_svg_card(svg_card_str, ctx.ticker)
                final_decision.metadata["svg_card"] = svg_card_str
                final_decision.metadata["svg_card_path"] = svg_card_path
            except Exception as e:
                print(f"⚠️ [Orchestrator] CanvasBuilder SVG kart üretim hatası: {e}")

            # 4. server/publisher/ modülüne ilet (Node.js Gateway)
            try:
                publisher_result = transmit_to_publisher(contract_payload)
                final_decision.metadata["publisher_status"] = publisher_result.get("status", "QUEUED")
                print(f"📡 [Orchestrator] Sosyal Medya Yayınına İletildi (#{ctx.ticker}): {final_decision.metadata['publisher_status']}")
            except Exception as e:
                print(f"⚠️ [Orchestrator] Yayın iletim uyarısı: {e}")

        except Exception as e:
            print(f"⚠️ [Orchestrator] Data Contract dönüşüm hatası: {e}")

        return final_decision


def load_openrouter_key() -> str:
    """Ortam değişkenlerinden veya .env dosyasından OPENROUTER_API_KEY anahtarını okur."""
    key = os.getenv("OPENROUTER_API_KEY", "")
    if key and "your_" not in key:
        return key.strip().strip("'\"")

    search_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path("/.env"),
        Path("/app/applet/.env")
    ]
    for p in search_paths:
        if p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("OPENROUTER_API_KEY="):
                            val = line.split("=", 1)[1].strip().strip("'\"")
                            if val and "your_" not in val:
                                return val
            except Exception:
                pass
    return os.getenv("OPENROUTER_API_KEY", "").strip()


async def generate_coach_summary(decision_data: dict) -> str:
    """
    Koç Ajanı (Investor Coach):
    Münazara ve karar verilerini alıp, son kullanıcının anlayacağı samimi,
    anlaşılır ve 3-4 cümlelik doğal dil özetini (coach_summary) üretir.
    """
    ticker = decision_data.get("ticker", "Hisse")
    raw_verdict = decision_data.get("verdict", "AL")
    verdict = raw_verdict.value if hasattr(raw_verdict, "value") else str(raw_verdict)
    composite_score = float(decision_data.get("composite_score", 50.0))

    # İtirazları (challenges) çıkar
    raw_challenges = decision_data.get("challenges")
    if raw_challenges is None:
        deb_res = decision_data.get("debate_result")
        if isinstance(deb_res, dict):
            raw_challenges = deb_res.get("challenges", [])
        elif hasattr(deb_res, "challenges"):
            raw_challenges = deb_res.challenges
        else:
            raw_challenges = []

    challenges_list = list(raw_challenges) if raw_challenges else []

    # Eğer münazara / itiraz yoksa anlaşılır uzlaşı koç mesajı dön
    if not challenges_list:
        return (
            f"Merhaba! {ticker} için gerçekleştirdiğimiz çoklu uzman analizinde tüm ajanlarımız {composite_score:.1f}/100 puan ile "
            f"'{verdict}' yönünde tam bir uzlaşı sağladı. Verilerde herhangi bir çatışma veya riskli boğa tuzağı tespit edilmediği için "
            f"mevcut piyasa stratejiniz dengeli bir şekilde korunabilir. Destek ve direnç seviyelerine sadık kalarak işlemlerinizi "
            f"planlı bir şekilde yürütebilirsiniz."
        )

    # Münazara detaylarını metne dök
    dispute_lines = []
    for ch in challenges_list:
        if isinstance(ch, dict):
            c_name = ch.get("challenger_name", "Ajan")
            t_name = ch.get("target_name", "Hedef Ajan")
            arg = ch.get("argument", "")
            pen = ch.get("penalty_applied", 0)
        else:
            c_name = getattr(ch, "challenger_name", "Ajan")
            t_name = getattr(ch, "target_name", "Hedef Ajan")
            arg = getattr(ch, "argument", "")
            pen = getattr(ch, "penalty_applied", 0)
        dispute_lines.append(f"- {c_name}, {t_name} ajanının görüşüne itiraz etti (Uygulanan Ceza: -{pen} puan). Argüman: {arg}")

    dispute_context = "\n".join(dispute_lines)

    coach_prompt = (
        f"Sen uzman bir finansal koçsun. Aşağıdaki ajan tartışmasını ve nihai kararı bir yatırımcıya açıklayacak şekilde özetle. "
        f"Neden bu kararın çıktığını, hangi ajanın hangi veriye dayanarak itiraz ettiğini ve sonucun ne olduğunu 3-4 cümlelik, "
        f"anlaşılır bir dille anlat. Teknik jargondan kaçın.\n\n"
        f"Hisse / Varlık: {ticker}\n"
        f"Nihai Karar: {verdict} (Bileşik Skor: {composite_score:.1f}/100)\n"
        f"Ajanların İtiraz ve Tartışma Detayları:\n{dispute_context}"
    )

    openrouter_key = load_openrouter_key()
    if openrouter_key and "your_" not in openrouter_key:
        try:
            def _call_openrouter():
                headers = {
                    "Authorization": f"Bearer {openrouter_key}",
                    "HTTP-Referer": "https://aistudio.google.com/apps/4e7fe0b",
                    "X-Title": "Bistapp MT16 - Investor Coach",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "google/gemini-2.5-flash",
                    "messages": [
                        {
                            "role": "system",
                            "content": "Sen uzman bir finansal koçsun. Yatırımcılara teknik jargondan uzak, 3-4 cümlelik net ve anlaşılır özetler sunarsın."
                        },
                        {
                            "role": "user",
                            "content": coach_prompt
                        }
                    ],
                    "max_tokens": 400,
                    "temperature": 0.3
                }
                if requests is not None:
                    resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=12)
                    if resp.status_code == 200:
                        d = resp.json()
                        return d["choices"][0]["message"]["content"].strip()
                return ""

            llm_text = await asyncio.to_thread(_call_openrouter)
            if llm_text:
                return llm_text
        except Exception as e:
            print(f"[INVESTOR_COACH] OpenRouter API çağrısı istisnası: {e}")

    # Fallback deterministik Koç Özeti (API kapalıyken veya anahtar girilmemişken)
    first_ch = challenges_list[0]
    first_c_name = first_ch.get("challenger_name", "Risk Kontrol Ajanı") if isinstance(first_ch, dict) else getattr(first_ch, "challenger_name", "Risk Kontrol Ajanı")
    first_t_name = first_ch.get("target_name", "Teknik Ajan") if isinstance(first_ch, dict) else getattr(first_ch, "target_name", "Teknik Ajan")

    return (
        f"{ticker} analizinde uzmanlarımız başlangıçta güçlü sinyaller görse de, {first_c_name} arama trendlerindeki aşırı coşku "
        f"veya tahtadaki satış baskısını fark ederek {first_t_name} tarafının aşırı iyimserliğine itiraz etti. Bu itiraz sayesinde "
        f"tepeden yakalanma riskinin önüne geçildi ve skor daha temkinli bir seviye olan {composite_score:.1f}/100'e çekildi. "
        f"Nihai kararın '{verdict}' olmasının ana sebebi, potansiyel fırsat devam etse de kontrolsüz alımlardan kaçınarak korumacı "
        f"bir giriş yapılması gerektiğidir."
    )


async def run_multi_agent_pipeline(ctx: UnifiedContext) -> FinalDecision:
    """Pipelines giriş noktası"""
    return await MultiAgentPipeline.run(ctx)

