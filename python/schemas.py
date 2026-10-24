"""
Bistapp MT16 - Multi-Agent Decision Schemas (schemas.py)
---------------------------------------------------------
Çoklu ajan karar destek mimarisi, münazara (debate) protokolü
ve piyasa verisi bağlam (UnifiedContext) Pydantic şemaları.
"""

from __future__ import annotations
import time
from enum import Enum
from datetime import datetime
from typing import Dict, List, Any, Optional

try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            # Annotations default değerleri
            for k, v in self.__class__.__dict__.items():
                if not k.startswith("__") and not callable(v):
                    setattr(self, k, v)
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self) -> Dict[str, Any]:
            return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}

        def dict(self) -> Dict[str, Any]:
            return self.model_dump()

        def copy(self, *, deep: bool = False):
            import copy as _cp
            return _cp.deepcopy(self) if deep else _cp.copy(self)

    def Field(*args, **kwargs):
        if "default" in kwargs:
            return kwargs["default"]
        if "default_factory" in kwargs and callable(kwargs["default_factory"]):
            return kwargs["default_factory"]()
        if args:
            return args[0]
        return None


class SignalType(str, Enum):
    GUCLU_AL = "GUCLU_AL"
    AL = "AL"
    NOTR = "NOTR"
    SAT = "SAT"
    GUCLU_SAT = "GUCLU_SAT"


class MarketRegime(str, Enum):
    BULL = "BULL"
    BEAR = "BEAR"
    SIDEWAYS = "SIDEWAYS"


class MarketData(BaseModel):
    ticker: str
    price: float = 100.0
    change_pct: float = 0.0
    volume: float = 0.0
    rsi: float = 50.0
    macd_signal: str = "AL"
    moving_avg_50: float = 100.0
    moving_avg_200: float = 95.0
    source: str = "DEFAULT"


class DepthData(BaseModel):
    ticker: str
    best_bid: Optional[float] = None
    best_ask: Optional[float] = None
    bid_depth_total: float = 500_000.0
    ask_depth_total: float = 400_000.0
    wall_pressure_ratio: float = 1.0
    bofa_net_lot: float = 0.0
    is_wall_spoofing: bool = False
    hhi_concentration: float = 0.10
    obi: float = 0.0
    data_source: str = "SIMULATED"
    is_suspicious: bool = False
    suspicious_reason: Optional[str] = None


class FundamentalData(BaseModel):
    ticker: str
    sector: str = "BIST 100"
    pe_ratio: float = 10.0
    pb_ratio: float = 2.0
    altman_z_score: float = 3.0
    piotroski_f_score: float = 7.0
    beneish_m_score: float = -2.5
    roic_wacc_spread: float = 3.5


class NewsData(BaseModel):
    ticker: str
    sentiment_score: float = 0.20
    headlines: List[str] = Field(default_factory=list)
    data_source: str = "LIVE_RSS_KAP"
    is_live: bool = True
    is_simulated: bool = False
    simulation_warning: str = ""


class TrendData(BaseModel):
    ticker: str
    search_momentum_pct: float = 0.0
    fomo_flag: bool = False
    recent_avg: float = 0.0
    baseline_avg: float = 0.0
    latest_interest: float = 0.0
    toon: str = ""
    summary_line: str = ""


class CompanyDirectData(BaseModel):
    ticker: str = ""
    directors_buying: bool = False
    dcf_fair_value: float = 0.0


class InsiderTradingData(BaseModel):
    insider_selling_flag: bool = False


class DcfValuationData(BaseModel):
    fair_value: float = 100.0


class SocialData(BaseModel):
    ticker: str
    mention_count: int = 0
    sentiment_score: float = 0.0
    manipulation_risk_score: float = Field(default=0.0, ge=0.0, le=100.0)
    summary: str = "Veri yok"
    toon: str = ""
    data_source: str = "SIMULATED"
    is_live: bool = False
    is_simulated: bool = True
    is_reliable: bool = False
    simulation_warning: str = ""
    watermarker_id: Optional[str] = None
    manipulation_history_score: float = 0.0
    is_watermarker_high_risk: bool = False
    clusters: List[Dict[str, Any]] = Field(default_factory=list)


class UnifiedContext(BaseModel):
    ticker: str
    market_data: MarketData
    depth_data: Optional[DepthData] = None
    fundamental_data: Optional[FundamentalData] = None
    news_data: Optional[NewsData] = None
    trend_data: Optional[TrendData] = None
    company_direct_data: Optional[CompanyDirectData] = None
    insider_trading_data: Optional[InsiderTradingData] = None
    dcf_valuation_data: Optional[DcfValuationData] = None
    social_data: Optional[SocialData] = None
    vbts_level: int = 0
    market_regime: MarketRegime = MarketRegime.BULL
    source: str = "HYBRID"


class AgentResponse(BaseModel):
    agent_id: str
    agent_name: str
    signal: SignalType
    score: float
    confidence: float = 0.80
    reasoning: str = ""
    key_metrics: Dict[str, Any] = Field(default_factory=dict)
    manipulation_risk_score: Optional[float] = None

    def copy(self, *, deep: bool = False):
        if hasattr(self, "model_copy"):
            return self.model_copy(deep=deep)
        return super().copy(deep=deep)


class DebateChallenge(BaseModel):
    challenger_agent_id: str
    challenger_name: str
    target_agent_id: str
    target_name: str
    conflict_type: str
    dispute_metric: str
    argument: str
    penalty_applied: float = 0.0
    target_score_before: float = 0.0
    target_score_after: float = 0.0


class DebateRoundResult(BaseModel):
    debate_occurred: bool = False
    conflict_summary: str = ""
    challenges: List[DebateChallenge] = Field(default_factory=list)
    revised_agent_responses: Dict[str, AgentResponse] = Field(default_factory=dict)


class FinalDecision(BaseModel):
    ticker: str
    timestamp: float = Field(default_factory=time.time)
    verdict: SignalType
    composite_score: float
    confidence: float = 0.80
    agent_votes: Dict[str, AgentResponse] = Field(default_factory=dict)
    debate_result: Optional[DebateRoundResult] = None
    social_data: Optional[SocialData] = None
    manipulation_risk_score: float = 0.0
    toon: str = ""
    summary: str = ""
    coach_summary: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def to_contract_payload(self) -> Any:
        """
        FinalDecision iç mantığını, Gateway veri sözleşmesi (JuryDecisionPayload) 
        formatına dönüştürür.
        """
        try:
            from schemas.jury_contract import JuryDecisionPayload, JuryVerdict
        except ImportError:
            # Fallback if package structure differs
            try:
                from .schemas.jury_contract import JuryDecisionPayload, JuryVerdict
            except ImportError:
                return self.model_dump()

        # 1. Verdict Mapping
        mapping = {
            SignalType.GUCLU_AL: JuryVerdict.STRONG_BUY,
            SignalType.AL: JuryVerdict.BUY,
            SignalType.NOTR: JuryVerdict.HOLD,
            SignalType.SAT: JuryVerdict.SELL,
            SignalType.GUCLU_SAT: JuryVerdict.STRONG_SELL,
        }
        mapped_verdict = mapping.get(self.verdict, JuryVerdict.HOLD)

        # 2. Metadata Extraction
        m = self.metadata or {}
        
        # Ensure confidence is 0-100
        conf_score = self.composite_score
        if conf_score < 0: conf_score = 0.0
        if conf_score > 100: conf_score = 100.0

        return JuryDecisionPayload(
            ticker=self.ticker,
            verdict=mapped_verdict,
            confidenceScore=conf_score,
            entryZone=str(m.get("entryZone") or m.get("entry_zone") or "Kademeli Giriş"),
            targetPrice=str(m.get("targetPrice") or m.get("target_price") or "Takipte"),
            stopLoss=str(m.get("stopLoss") or m.get("stop_loss") or "Korumalı"),
            activeShields=m.get("activeShields") or m.get("active_shields") or [],
            reasoning=self.coach_summary or self.summary or "Analiz tamamlandı.",
            timestamp=datetime.fromtimestamp(self.timestamp).isoformat() if self.timestamp else None
        )


class BacktestRequest(BaseModel):
    ticker: str = "ASELS"
    period_years: int = 1
    initial_capital: float = 100_000.0
    risk_threshold: float = 2.5


class BacktestResult(BaseModel):
    ticker: str = "ASELS"
    net_pnl: float = 0.0
    win_rate: float = 0.0
    sharpe: float = 0.0
    trades_count: int = 0
