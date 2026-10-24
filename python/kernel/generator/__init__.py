"""
BistApp MT16 - Generator Modülü Paketi (__init__.py)
---------------------------------------------------
SVG Kart üretimi ve Node.js Social Publisher Gateway köprüsü.
"""

from __future__ import annotations
import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

from .canvas_builder import CanvasBuilder
from .card_templates import PALETTE, VERDICT_STYLES, get_verdict_style


def build_svg_card(payload: Dict[str, Any]) -> str:
    """Yardımcı fonksiyon: CanvasBuilder üzerinden SVG kartı üretir."""
    return CanvasBuilder.build_svg_card(payload)


def transmit_to_publisher(
    payload: Dict[str, Any],
    gateway_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Python AI Kernel tarafından üretilen jüri kararını ve SVG kartını
    Node.js Express Gateway `/api/v1/publisher/broadcast` ucuna iletir.
    """
    base_url = (
        gateway_url
        or os.getenv("NODE_GATEWAY_URL")
        or os.getenv("EXPRESS_URL")
        or "http://127.0.0.1:3000"
    )
    url = f"{base_url.rstrip('/')}/api/v1/publisher/broadcast"

    # SVG Kartını da payload'a ekle (eğer önceden üretilmediyse)
    if "svg_card" not in payload and "svgCard" not in payload:
        try:
            svg_content = CanvasBuilder.build_svg_card(payload)
            payload["svgCard"] = svg_content
        except Exception as e:
            print(f"⚠️ [Generator] SVG Kart üretim uyarısı: {e}")

    try:
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            resp_body = resp.read().decode("utf-8")
            return {
                "success": True,
                "status_code": resp.status,
                "response": json.loads(resp_body) if resp_body else {},
            }
    except urllib.error.URLError as e:
        # Gateway çevrimdışıysa veya erişilemezse sessizce logla (boru hattını kilitleme)
        return {
            "success": False,
            "status": "GATEWAY_OFFLINE",
            "error": str(e),
        }
    except Exception as e:
        return {
            "success": False,
            "status": "EXCEPTION",
            "error": str(e),
        }


__all__ = [
    "CanvasBuilder",
    "build_svg_card",
    "transmit_to_publisher",
    "PALETTE",
    "VERDICT_STYLES",
    "get_verdict_style",
]
