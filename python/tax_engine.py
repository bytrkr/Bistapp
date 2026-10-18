"""
Bistapp MT16 - Vergi ve Kur Reel Getiri Motoru (tax_engine.py)
--------------------------------------------------------------
TCMB USD/TRY döviz kurlarını kullanarak BIST ve küresel varlıklar için
nominal kâr/zarar, dolar bazlı reel getiri ve Türk Vergi Mevzuatı (GVK Geçici 67)
kapsamında vergi matrahı ve stopaj hesaplamalarını gerçekleştirir.
Çıktıyı hem JSON hem de #TOON/v3.5 schema=BISTAPP_TAX_ENGINE formatında sunar.
"""

from __future__ import annotations
import os
import sys
import time
from typing import Dict, Any, Optional
from datetime import datetime

# Modül import yolları
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import requests
    _HAS_REQUESTS = True
except ImportError:
    requests = None
    _HAS_REQUESTS = False

# Türkiye Vergi Mevzuatı Varsayılan Stopaj Oranı (BIST Pay Senetleri için %0)
DEFAULT_WITHHOLDING_TAX_RATE: float = 0.0

# TCMB Mock Kurlar (buy_date ve sell_date için dinamik fallback)
DEFAULT_MOCK_BUY_USD_TRY: float = 34.00
DEFAULT_MOCK_SELL_USD_TRY: float = 34.50


def fetch_tcmb_usd_rate(date_str: str, default_rate: float) -> float:
    """
    TCMB veya EVDS üzerinden belirtilen tarihteki USD/TRY gösterge kurunu çeker.
    Bağlantı sağlanamazsa veya tatil günüyse default_rate değerini döner.
    """
    if not _HAS_REQUESTS or requests is None:
        return default_rate

    evds_key = os.getenv("EVDS_API_KEY", "").strip()
    if evds_key and "your_" not in evds_key:
        try:
            # EVDS TP.DK.USD.A (USD Alış Kuru)
            # Tarih formatı: DD-MM-YYYY
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            evds_date = dt.strftime("%d-%m-%Y")
            url = f"https://evds2.tcmb.gov.tr/service/evds/series=TP.DK.USD.A&startDate={evds_date}&endDate={evds_date}&type=json"
            headers = {"key": evds_key}
            resp = requests.get(url, headers=headers, timeout=2.5)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                if items and items[0].get("TP_DK_USD_A"):
                    val = float(items[0]["TP_DK_USD_A"])
                    if val > 0:
                        return round(val, 4)
        except Exception as e:
            print(f"[TAX_ENGINE] EVDS kur çekme hatası ({date_str}): {e}")

    # Fallback TCMB günlük XML servisi denemesi (Bugün/Dün için)
    try:
        url = "https://www.tcmb.gov.tr/kurlar/today.xml"
        resp = requests.get(url, timeout=2.0)
        if resp.status_code == 200:
            import xml.etree.ElementTree as ET
            root = ET.fromstring(resp.content)
            for curr in root.findall("Currency"):
                if curr.get("Kod") == "USD":
                    forex_buying = curr.find("ForexBuying")
                    if forex_buying is not None and forex_buying.text:
                        val = float(forex_buying.text.replace(",", "."))
                        if val > 0:
                            return round(val, 4)
    except Exception:
        pass

    return default_rate


class TaxCurrencyEngine:
    """
    Vergi Matrahı, Dolar Bazlı Reel Getiri ve TCMB Kur Motoru
    """
    withholding_tax_rate: float = DEFAULT_WITHHOLDING_TAX_RATE

    @classmethod
    def set_withholding_tax_rate(cls, rate: float) -> None:
        """Varsayılan stopaj oranını dinamik olarak günceller (örn: 0.10 için %10)."""
        cls.withholding_tax_rate = max(0.0, min(1.0, float(rate)))

    @classmethod
    def compute_tax_and_real_pnl(
        cls,
        ticker: str,
        asset_type: str = "BIST",
        buy_date: str = "2026-01-15",
        sell_date: str = "2026-10-07",
        buy_price_tl: float = 100.0,
        sell_price_tl: float = 180.0,
        lot_count: float = 1000.0,
        custom_withholding_rate: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Nominal TL Getiri, TCMB Dolar Kuru ile Reel Getiri ve
        Türk Vergi Mevzuatı Stopaj Matrahını hesaplar.
        """
        clean_ticker = (ticker or "BIST").strip().upper().replace(".IS", "")
        clean_asset_type = (asset_type or "BIST").strip().upper()
        lots = max(0.0001, float(lot_count))
        buy_px = max(0.0001, float(buy_price_tl))
        sell_px = max(0.0, float(sell_price_tl))

        # 1. Nominal TL Kâr / Zarar Hesaplaması
        total_buy_tl = round(buy_px * lots, 2)
        total_sell_tl = round(sell_px * lots, 2)
        nominal_pnl_tl = round((sell_px - buy_px) * lots, 2)
        nominal_pnl_pct = round(((sell_px - buy_px) / buy_px) * 100, 2)

        # 2. TCMB USD/TRY Kurları ve Reel Dolar Getirisi
        buy_usd_try = fetch_tcmb_usd_rate(buy_date, DEFAULT_MOCK_BUY_USD_TRY)
        sell_usd_try = fetch_tcmb_usd_rate(sell_date, DEFAULT_MOCK_SELL_USD_TRY)

        total_buy_usd = round(total_buy_tl / buy_usd_try, 2)
        total_sell_usd = round(total_sell_tl / sell_usd_try, 2)
        real_pnl_usd = round(total_sell_usd - total_buy_usd, 2)
        real_pnl_usd_pct = (
            round(((total_sell_usd - total_buy_usd) / total_buy_usd) * 100, 2)
            if total_buy_usd > 0
            else 0.0
        )
        fx_depreciation_pct = round(((sell_usd_try - buy_usd_try) / buy_usd_try) * 100, 2)

        # 3. Vergi Mevzuatı Matrah ve Stopaj Hesabı
        # BIST hisse senetlerinde GVK Geçici 67 uyarınca stopaj %0'dır.
        # Diğer varlık türlerinde (örn: Yabancı Hisse) beyana tabidir.
        tax_rate = (
            custom_withholding_rate
            if custom_withholding_rate is not None
            else cls.withholding_tax_rate
        )

        tax_base_tl = max(0.0, nominal_pnl_tl)
        tax_amount_tl = round(tax_base_tl * tax_rate, 2)
        net_pnl_tl = round(nominal_pnl_tl - tax_amount_tl, 2)
        tax_status = (
            "EXEMPT_STOPAJ_0"
            if tax_rate == 0.0
            else f"TAXABLE_WITHHOLDING_{int(tax_rate * 100)}PCT"
        )

        # 4. #TOON/v3.5 schema=BISTAPP_TAX_ENGINE Formatı
        sign_tl = "+" if nominal_pnl_tl >= 0 else ""
        sign_tl_pct = "+" if nominal_pnl_pct >= 0 else ""
        sign_usd = "+" if real_pnl_usd >= 0 else ""
        sign_usd_pct = "+" if real_pnl_usd_pct >= 0 else ""

        summary_text = (
            f"{clean_ticker} ({clean_asset_type}) işlemi: "
            f"Nominal Getiri {sign_tl}{nominal_pnl_tl:,.2f} TL ({sign_tl_pct}{nominal_pnl_pct:.2f}%), "
            f"Dolar Bazlı Reel Getiri {sign_usd}${real_pnl_usd:,.2f} ({sign_usd_pct}{real_pnl_usd_pct:.2f}%), "
            f"Stopaj Oranı %{tax_rate * 100:.1f} (Net Kâr/Zarar: {net_pnl_tl:,.2f} TL)."
        )

        toon = (
            f"#TOON/v3.5 schema=BISTAPP_TAX_ENGINE\n"
            f"@trade{{sym:{clean_ticker};type:{clean_asset_type};lots:{lots:g};buy_date:{buy_date};sell_date:{sell_date}}}\n"
            f"@nominal{{buy_px:{buy_px:.2f};sell_px:{sell_px:.2f};buy_tl:{total_buy_tl:.2f};sell_tl:{total_sell_tl:.2f};"
            f"pnl_tl:{sign_tl}{nominal_pnl_tl:.2f};pnl_pct:{sign_tl_pct}{nominal_pnl_pct:.2f}%}}\n"
            f"@fx{{buy_usd_try:{buy_usd_try:.4f};sell_usd_try:{sell_usd_try:.4f};buy_usd:{total_buy_usd:.2f};sell_usd:{total_sell_usd:.2f};"
            f"real_pnl_usd:{sign_usd}{real_pnl_usd:.2f};real_pnl_pct:{sign_usd_pct}{real_pnl_usd_pct:.2f}%;tl_deval:{fx_depreciation_pct:+.2f}%}}\n"
            f"@tax{{withholding_rate:%{tax_rate * 100:.1f};tax_base_tl:{tax_base_tl:.2f};tax_amount_tl:{tax_amount_tl:.2f};"
            f"net_pnl_tl:{net_pnl_tl:.2f};status:{tax_status}}}\n"
            f"@summary{{{summary_text}}}"
        )

        return {
            "ticker": clean_ticker,
            "asset_type": clean_asset_type,
            "buy_date": buy_date,
            "sell_date": sell_date,
            "lot_count": lots,
            "nominal": {
                "buy_price_tl": buy_px,
                "sell_price_tl": sell_px,
                "total_buy_tl": total_buy_tl,
                "total_sell_tl": total_sell_tl,
                "nominal_pnl_tl": nominal_pnl_tl,
                "nominal_pnl_pct": nominal_pnl_pct,
            },
            "fx_real_return": {
                "buy_usd_try": buy_usd_try,
                "sell_usd_try": sell_usd_try,
                "total_buy_usd": total_buy_usd,
                "total_sell_usd": total_sell_usd,
                "real_pnl_usd": real_pnl_usd,
                "real_pnl_usd_pct": real_pnl_usd_pct,
                "tl_depreciation_pct": fx_depreciation_pct,
            },
            "taxation": {
                "withholding_tax_rate": tax_rate,
                "tax_base_tl": tax_base_tl,
                "tax_amount_tl": tax_amount_tl,
                "net_pnl_tl": net_pnl_tl,
                "tax_status": tax_status,
                "legal_basis": "GVK Geçici 67. Madde - BIST Pay Senetlerinde Varsayılan %0 Stopaj",
            },
            "summary": summary_text,
            "toon": toon,
            "calculated_at": time.time(),
        }
