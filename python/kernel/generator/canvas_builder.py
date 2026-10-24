"""
BistApp MT16 - Canvas SVG Karar Kartı Üreticisi (canvas_builder.py)
------------------------------------------------------------------
Python AI Kernel tarafından üretilen FinalDecision verilerini
yüksek kaliteli, sosyal medya paylaşımlarına uygun (1200x675, 16:9)
vektörel SVG kartlarına dönüştürür.
"""

from __future__ import annotations
import os
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pathlib import Path

from .card_templates import PALETTE, get_verdict_style, escape_xml


class CanvasBuilder:
    """
    Kuant Jüri Karar Kartı (SVG) Oluşturucusu
    """
    WIDTH = 1200
    HEIGHT = 675

    @classmethod
    def build_svg_card(cls, payload: Dict[str, Any]) -> str:
        """
        JuryDecisionPayload veya FinalDecision verisinden tam teşekküllü SVG kartı üretir.
        """
        ticker = escape_xml(str(payload.get("ticker", "BIST")).upper().replace(".IS", ""))
        verdict = str(payload.get("verdict", "HOLD"))
        style = get_verdict_style(verdict)

        confidence = float(payload.get("confidenceScore") or payload.get("composite_score") or 50.0)
        confidence = max(0.0, min(100.0, confidence))

        price = float(payload.get("price") or payload.get("current_price") or 0.0)
        price_str = f"{price:.2f} ₺" if price > 0 else "Piyasa Fiyatı"

        entry_zone = escape_xml(str(payload.get("entryZone") or payload.get("entry_zone") or "Kademeli Bölge"))
        target_price = escape_xml(str(payload.get("targetPrice") or payload.get("target_price") or "Takipte"))
        stop_loss = escape_xml(str(payload.get("stopLoss") or payload.get("stop_loss") or "Korumalı"))

        raw_shields = payload.get("activeShields") or payload.get("active_shields") or []
        shields = [escape_xml(str(s)) for s in raw_shields]

        reasoning = escape_xml(str(payload.get("reasoning") or payload.get("summary") or "Jüri münazarası neticesinde mutabakat sağlandı."))
        if len(reasoning) > 130:
            reasoning = reasoning[:127] + "..."

        timestamp = escape_xml(str(payload.get("timestamp") or datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M UTC")))

        # Kalkan rozetleri SVG parçacığı
        shield_badges_svg = ""
        if shields:
            badge_x = 70
            for s in shields[:4]:
                badge_w = min(220, max(110, len(s) * 8 + 30))
                shield_badges_svg += f"""
                <g transform="translate({badge_x}, 525)">
                    <rect width="{badge_w}" height="32" rx="16" fill="rgba(99, 102, 241, 0.15)" stroke="rgba(99, 102, 241, 0.4)" stroke-width="1.2"/>
                    <text x="{badge_w / 2}" y="20" fill="#a5b4fc" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" text-anchor="middle">🛡️ {s}</text>
                </g>
                """
                badge_x += badge_w + 12
        else:
            shield_badges_svg = """
            <g transform="translate(70, 525)">
                <rect width="210" height="32" rx="16" fill="rgba(16, 185, 129, 0.12)" stroke="rgba(16, 185, 129, 0.3)" stroke-width="1.2"/>
                <text x="105" y="20" fill="#6ee7b7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" text-anchor="middle">🛡️ Sistem Koruması Aktif</text>
            </g>
            """

        # Güven Barı Genişliği
        bar_width = int((confidence / 100.0) * 440)

        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cls.WIDTH} {cls.HEIGHT}" width="{cls.WIDTH}" height="{cls.HEIGHT}">
  <defs>
    <!-- Arka Plan Gradyanı -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#070a10"/>
    </linearGradient>

    <!-- Sinyal Gradyanı -->
    <linearGradient id="verdictGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="{style['color_primary']}"/>
      <stop offset="100%" stop-color="{style['color_secondary']}"/>
    </linearGradient>

    <!-- Güven Barı Gradyanı -->
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="{style['color_primary']}"/>
    </linearGradient>

    <!-- Parlama ve Gölge Filtreleri -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="rgba(0,0,0,0.6)"/>
    </filter>
  </defs>

  <!-- Arka Plan -->
  <rect width="{cls.WIDTH}" height="{cls.HEIGHT}" fill="url(#bgGrad)"/>

  <!-- Dekoratif Arka Plan Işık Halesi -->
  <circle cx="200" cy="150" r="280" fill="{style['glow']}" opacity="0.18" filter="url(#glow)"/>
  <circle cx="1050" cy="500" r="320" fill="rgba(6, 182, 212, 0.12)" filter="url(#glow)"/>

  <!-- Ana Kart Çerçevesi (Glassmorphism) -->
  <rect x="35" y="30" width="1130" height="615" rx="24" fill="rgba(17, 24, 39, 0.75)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1.5" filter="url(#cardShadow)"/>

  <!-- ==================== ÜST BAŞLIK ==================== -->
  <g transform="translate(70, 75)">
    <!-- Terminal Logosu & İsim -->
    <circle cx="10" cy="10" r="8" fill="#06b6d4" filter="url(#glow)"/>
    <text x="32" y="16" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800" letter-spacing="1.2">BISTAPP MT16</text>
    <text x="180" y="16" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500">| KUANT HEDGE FUND JÜRİ İÇTİHADI</text>

    <!-- Canlı Rozet & Tarih -->
    <rect x="850" y="-3" width="180" height="28" rx="14" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1"/>
    <circle cx="865" cy="11" r="4" fill="#10b981"/>
    <text x="880" y="15" fill="#cbd5e1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500">{timestamp}</text>
  </g>

  <!-- Ayırıcı Çizgi -->
  <line x1="70" y1="115" x2="1100" y2="115" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1"/>

  <!-- ==================== HERO: HİSSE & KARAR ==================== -->
  <!-- Sol Sütun: Ticker & Fiyat -->
  <g transform="translate(70, 160)">
    <text x="0" y="55" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" letter-spacing="-1">#{ticker}</text>
    <rect x="0" y="75" width="140" height="32" rx="8" fill="rgba(6, 182, 212, 0.12)" stroke="rgba(6, 182, 212, 0.3)" stroke-width="1"/>
    <text x="70" y="96" fill="#38bdf8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" text-anchor="middle">{price_str}</text>
  </g>

  <!-- Sağ Sütun: Büyük Karar Rozeti -->
  <g transform="translate(780, 160)">
    <rect x="0" y="0" width="320" height="110" rx="20" fill="{style['badge_bg']}" stroke="{style['badge_border']}" stroke-width="2.5" filter="url(#glow)"/>
    <text x="160" y="45" fill="{style['color_primary']}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" text-anchor="middle">{style['emoji']} {style['label']}</text>
    <text x="160" y="85" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" text-anchor="middle">Jüri Güveni: %{confidence:.0f}</text>
  </g>

  <!-- ==================== METRİK: GÜVEN VE SKOR ==================== -->
  <g transform="translate(70, 290)">
    <text x="0" y="0" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" letter-spacing="1">MÜNAZARA MUTABAKAT SKORU</text>
    
    <!-- İlerleme Çubuğu Arka Planı -->
    <rect x="0" y="15" width="440" height="14" rx="7" fill="rgba(255, 255, 255, 0.08)"/>
    <!-- İlerleme Çubuğu Dolu -->
    <rect x="0" y="15" width="{bar_width}" height="14" rx="7" fill="url(#barGrad)"/>
    
    <text x="455" y="27" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700">{confidence:.0f} / 100</text>
  </g>

  <!-- ==================== 3 SEVİYE KARTI: GİRİŞ / HEDEF / STOP ==================== -->
  <g transform="translate(70, 360)">
    <!-- Kart 1: Giriş Bölgesi -->
    <g transform="translate(0, 0)">
      <rect width="320" height="90" rx="16" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.2"/>
      <text x="24" y="32" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600">GİRİŞ BÖLGESİ</text>
      <text x="24" y="65" fill="#38bdf8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800">{entry_zone}</text>
    </g>

    <!-- Kart 2: Hedef Fiyat -->
    <g transform="translate(355, 0)">
      <rect width="320" height="90" rx="16" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.2"/>
      <text x="24" y="32" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600">HEDEF FİYAT</text>
      <text x="24" y="65" fill="#4ade80" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800">{target_price}</text>
    </g>

    <!-- Kart 3: Stop-Loss -->
    <g transform="translate(710, 0)">
      <rect width="320" height="90" rx="16" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.2"/>
      <text x="24" y="32" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600">ZARAR KES (STOP-LOSS)</text>
      <text x="24" y="65" fill="#f87171" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800">{stop_loss}</text>
    </g>
  </g>

  <!-- ==================== AKTİF KALKANLAR ==================== -->
  <g transform="translate(70, 485)">
    <text x="0" y="25" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" letter-spacing="1.2">DEVREDEKİ GÜVENLİK KALKANLARI:</text>
  </g>
  {shield_badges_svg}

  <!-- ==================== JÜRİ GEREKÇESİ / ÖZET ==================== -->
  <g transform="translate(70, 580)">
    <text x="0" y="16" fill="#cbd5e1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-style="italic">“{reasoning}”</text>
  </g>

  <!-- ==================== ALT BİLGİ & FOOTER ==================== -->
  <g transform="translate(70, 622)">
    <text x="0" y="0" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500">Yatırım Tavsiyesi Değildir (YTD) • Çoklu Ajan Karar Destek Sistemi</text>
    <text x="1030" y="0" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" text-anchor="end">#BistApp #BIST100</text>
  </g>
</svg>"""
        return svg

    @classmethod
    def save_svg_card(cls, svg_content: str, ticker: str, output_dir: Optional[str] = None) -> str:
        """
        Üretilen SVG kartını diske kaydeder ve dosya yolunu döner.
        """
        target_dir = Path(output_dir or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "temp", "cards"))
        target_dir.mkdir(parents=True, exist_ok=True)

        clean_ticker = str(ticker).upper().replace(".IS", "")
        filename = f"card_{clean_ticker}_{int(time.time())}.svg"
        file_path = target_dir / filename

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(svg_content)

        return str(file_path)
