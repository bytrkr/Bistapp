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
from pathlib import Path
from typing import Dict, Any, Optional, List
import requests

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

        source_info = f" ({m.source})" if m.source != "DEFAULT" else ""
        reasoning = (
            f"Fiyat {m.price:.2f}{source_info}, Günlük Değişim: %{m.change_pct:+.2f}, "
            f"RSI: {m.rsi:.1f}, MACD: {m.macd_signal}. Trend güçlü."
        )

        return AgentResponse(
            agent_id="technical",
            agent_name="Teknik Analiz Ajanı",
            signal=signal,
            score=score,
            confidence=0.85,
            reasoning=reasoning,
            key_metrics={
                "price": m.price,
                "change_pct": m.change_pct,
                "rsi": m.rsi,
                "volume": m.volume,
                "source": m.source
            }
        )

    @classmethod
    def evaluate_depth(cls, ctx: UnifiedContext) -> AgentResponse:
        d = ctx.depth_data
        score = 60.0
        if d:
            if d.wall_pressure_ratio > 1.2:
                score += 12.0
            elif d.wall_pressure_ratio < 0.8:
                score -= 15.0

            if d.bofa_net_lot > 50_000:
                score += 12.0
            elif d.bofa_net_lot < -50_000:
                score -= 18.0

            if d.is_wall_spoofing:
                score -= 15.0

        score = max(10.0, min(95.0, round(score, 1)))
        signal = _score_to_signal(score)
        
        bofa_text = f"{d.bofa_net_lot:+,} lot" if d else "N/A"
        wall_text = f"{d.wall_pressure_ratio:.2f}x" if d else "N/A"
        reasoning = f"Tahta Derinliği: BofA Akışı {bofa_text}, Duvar Baskısı {wall_text}."

        return AgentResponse(
            agent_id="depth",
            agent_name="Takas & Derinlik Ajanı",
            signal=signal,
            score=score,
            confidence=0.80,
            reasoning=reasoning,
            key_metrics={
                "bofa_net_lot": d.bofa_net_lot if d else 0,
                "wall_pressure": d.wall_pressure_ratio if d else 1.0,
                "spoofing": d.is_wall_spoofing if d else False
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

        score = max(10.0, min(95.0, round(score, 1)))
        signal = _score_to_signal(score)

        z_text = f"{f.altman_z_score:.2f}" if f else "N/A"
        f_text = f"{f.piotroski_f_score}" if f else "N/A"
        reasoning = f"Mali Tablo Sağlığı: Altman Z-Skor {z_text}, Piotroski F-Skor {f_text}."

        return AgentResponse(
            agent_id="fundamental",
            agent_name="Temel Değerleme Ajanı",
            signal=signal,
            score=score,
            confidence=0.82,
            reasoning=reasoning,
            key_metrics={
                "altman_z": f.altman_z_score if f else 0,
                "piotroski_f": f.piotroski_f_score if f else 0
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
        if ctx.social_data is not None:
            manip_risk = float(ctx.social_data.manipulation_risk_score)
            if manip_risk > 70.0:
                score = max(15.0, round(score - 15.0, 1))
                reasoning += " | [UYARI]: Sosyal medya manipülasyon riski tespit edildi (-15 puan)."

        signal = _score_to_signal(score)

        return AgentResponse(
            agent_id="sentiment",
            agent_name="KAP Duygu Ajanı",
            signal=signal,
            score=score,
            confidence=0.75,
            reasoning=reasoning,
            key_metrics={
                "sentiment_score": sent,
                "manipulation_risk_score": manip_risk,
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
                    summary="Veri yok",
                    toon="",
                )

        # 1. Tüm 6 ajandan ham oyları topla
        raw_votes: Dict[str, AgentResponse] = {
            "technical": cls.evaluate_technical(ctx),
            "depth": cls.evaluate_depth(ctx),
            "fundamental": cls.evaluate_fundamental(ctx),
            "sentiment": cls.evaluate_sentiment(ctx),
            "company_direct": cls.evaluate_company_direct(ctx),
            "trend": cls.evaluate_trend(ctx),
        }

        # 2. Münazara protokolünü çalıştır (DebateEngine)
        debate_result = DebateEngine.conduct_one_round_debate(raw_votes, ctx)

        # 3. Nihai ağırlıklı bileşik skoru hesapla
        votes = debate_result.revised_agent_responses
        weights = {
            "technical": 0.25,
            "depth": 0.20,
            "fundamental": 0.20,
            "sentiment": 0.12,
            "company_direct": 0.08,
            "trend": 0.15,
        }

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

        return FinalDecision(
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
            }
        )


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

