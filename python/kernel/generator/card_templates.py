"""
BistApp MT16 - SVG Kart Şablonları ve Stil Tanımları (card_templates.py)
------------------------------------------------------------------------
Kuant terminali ve jüri kararları için yüksek çözünürlüklü (1200x675)
karanlık tema (Dark FinTech / Cyber Glassmorphism) SVG şablon ve stil paletleri.
"""

from __future__ import annotations
from typing import Dict, Any, List

# Renk Paletleri
PALETTE = {
    "bg_dark": "#0a0e17",
    "bg_card": "#111827",
    "bg_glass": "rgba(255, 255, 255, 0.04)",
    "border_glass": "rgba(255, 255, 255, 0.12)",
    "text_primary": "#f8fafc",
    "text_secondary": "#94a3b8",
    "text_muted": "#64748b",
    "cyan_accent": "#06b6d4",
    "indigo_accent": "#6366f1",
}

VERDICT_STYLES = {
    "STRONG_BUY": {
        "label": "GÜÇLÜ AL",
        "emoji": "🚀",
        "color_primary": "#10b981",
        "color_secondary": "#059669",
        "glow": "rgba(16, 185, 129, 0.4)",
        "badge_bg": "rgba(16, 185, 129, 0.15)",
        "badge_border": "#10b981",
    },
    "BUY": {
        "label": "AL",
        "emoji": "🟢",
        "color_primary": "#22c55e",
        "color_secondary": "#16a34a",
        "glow": "rgba(34, 197, 94, 0.35)",
        "badge_bg": "rgba(34, 197, 94, 0.15)",
        "badge_border": "#22c55e",
    },
    "HOLD": {
        "label": "TUT / NÖTR",
        "emoji": "🟡",
        "color_primary": "#f59e0b",
        "color_secondary": "#d97706",
        "glow": "rgba(245, 158, 11, 0.35)",
        "badge_bg": "rgba(245, 158, 11, 0.15)",
        "badge_border": "#f59e0b",
    },
    "SELL": {
        "label": "SAT",
        "emoji": "🔴",
        "color_primary": "#f43f5e",
        "color_secondary": "#e11d48",
        "glow": "rgba(244, 63, 94, 0.35)",
        "badge_bg": "rgba(244, 63, 94, 0.15)",
        "badge_border": "#f43f5e",
    },
    "STRONG_SELL": {
        "label": "GÜÇLÜ SAT",
        "emoji": "🛑",
        "color_primary": "#dc2626",
        "color_secondary": "#991b1b",
        "glow": "rgba(220, 38, 38, 0.45)",
        "badge_bg": "rgba(220, 38, 38, 0.20)",
        "badge_border": "#dc2626",
    },
}

def escape_xml(text: str) -> str:
    """SVG XML özel karakterlerini temizler."""
    if not text:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )

def get_verdict_style(verdict: str) -> Dict[str, str]:
    """Karar stringini normalize edip uygun stil nesnesini döner."""
    v_clean = str(verdict).upper().strip()
    if "GUCLU_AL" in v_clean or "STRONG_BUY" in v_clean:
        return VERDICT_STYLES["STRONG_BUY"]
    if "AL" in v_clean or "BUY" in v_clean:
        return VERDICT_STYLES["BUY"]
    if "GUCLU_SAT" in v_clean or "STRONG_SELL" in v_clean:
        return VERDICT_STYLES["STRONG_SELL"]
    if "SAT" in v_clean or "SELL" in v_clean:
        return VERDICT_STYLES["SELL"]
    return VERDICT_STYLES["HOLD"]
