"""
Bistapp MT16 - Sosyal İstihbarat ve JIRO Entegrasyonu (social_intel.py)
----------------------------------------------------------------------
Bu dosya root seviyesindeki importlar ve ajanlar için input_engine.social_intel
modülünü şeffaf bir şekilde dışa aktarır ve JIRO canlılık durumunu yönetir.
"""

from __future__ import annotations
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from input_engine.social_intel import (
    JIRO_URL,
    check_jiro_status,
    verify_social_live_connection,
    fetch_social_sentiment,
    analyze_social_manipulation,
    build_social_manipulation_toon,
    Anonymizer,
    WatermarkTracker,
    EmbeddingEngine,
    MiroFishBridge,
)

__all__ = [
    "JIRO_URL",
    "check_jiro_status",
    "verify_social_live_connection",
    "fetch_social_sentiment",
    "analyze_social_manipulation",
    "build_social_manipulation_toon",
    "Anonymizer",
    "WatermarkTracker",
    "EmbeddingEngine",
    "MiroFishBridge",
]
