from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional
from enum import Enum
from datetime import datetime
import json

class JuryVerdict(str, Enum):
    STRONG_BUY = "STRONG_BUY"
    BUY = "BUY"
    HOLD = "HOLD"
    SELL = "SELL"
    STRONG_SELL = "STRONG_SELL"

class JuryDecisionPayload(BaseModel):
    """
    BistApp MT16 Kuant Jüri Karar Veri Sözleşmesi (Pydantic v2 Modeli)
    Python tarafında snake_case, JSON tarafında camelCase uyumludur.
    """
    ticker: str = Field(..., description="Varlık kodu (Örn: THYAO, BTCUSDT)")
    verdict: JuryVerdict = Field(..., description="Nihai jüri kararı")
    
    confidence_score: float = Field(
        ..., 
        alias="confidenceScore", 
        ge=0, 
        le=100, 
        description="Karar güven skoru (0-100)"
    )
    
    entry_zone: str = Field(
        ..., 
        alias="entryZone", 
        description="Önerilen giriş fiyat bölgesi"
    )
    
    target_price: str = Field(
        ..., 
        alias="targetPrice", 
        description="Hedef fiyat seviyesi"
    )
    
    stop_loss: str = Field(
        ..., 
        alias="stopLoss", 
        description="Zarar kes (Stop-loss) seviyesi"
    )
    
    active_shields: List[str] = Field(
        ..., 
        alias="activeShields", 
        description="İşlem sırasında tetiklenen veya aktif olan kalkanlar"
    )
    
    reasoning: str = Field(..., description="Jürinin detaylı karar gerekçesi")
    
    timestamp: Optional[str] = Field(
        default_factory=lambda: datetime.utcnow().isoformat()
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "ticker": "THYAO",
                "verdict": "STRONG_BUY",
                "confidenceScore": 92.5,
                "entryZone": "305.00 - 310.00",
                "targetPrice": "365.00",
                "stopLoss": "298.00",
                "activeShields": ["BofA Accumulation Shield", "Volatility Shield"],
                "reasoning": "Teknik kırılım ve kurumsal takas desteği teyit edildi.",
                "timestamp": "2024-10-24T10:00:00Z"
            }
        }
    )

    @field_validator('ticker')
    @classmethod
    def ticker_must_be_upper(cls, v: str) -> str:
        return v.upper()

    def to_json_payload(self) -> dict:
        """
        Express Gateway'e gönderilmek üzere veriyi camelCase anahtarlarla döner.
        """
        return self.model_dump(by_alias=True)
