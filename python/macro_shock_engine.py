"""
Bistapp MT16 - Makro-Mikro Şok ve Stres Senaryo Jeneratörü (macro_shock_engine.py)
---------------------------------------------------------------------------------
Beklenmedik makroekonomik şokları ve siyah kuğu (Black Swan) senaryolarını
(Faiz Artışı, Dolar Şoku, Jeopolitik Kriz) hisse ve sektör bazında simüle eder.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional


SECTOR_MAP = {
    # Bankacılık & Finans
    "GARAN": "BANKACILIK", "AKBNK": "BANKACILIK", "ISCTR": "BANKACILIK",
    "YKBNK": "BANKACILIK", "VAKBN": "BANKACILIK", "HALKB": "BANKACILIK",
    "ALBRK": "BANKACILIK", "SKBNK": "BANKACILIK", "TSKB": "BANKACILIK",
    
    # GYO & İnşaat (Faize aşırı duyarlı)
    "EKGYO": "GYO", "ISGYO": "GYO", "TRGYO": "GYO", "SNGYO": "GYO", "VKGYO": "GYO",
    
    # Havacılık & Ulaştırma
    "THYAO": "HAVACILIK", "PGSUS": "HAVACILIK", "TAVHL": "HAVACILIK", "CLEBI": "HAVACILIK",
    
    # Savunma Sanayii
    "ASELS": "SAVUNMA", "SDTTR": "SAVUNMA", "OTKAR": "SAVUNMA",
    
    # İhracatçı Sanayi & Otomotiv
    "FROTO": "OTOMOTIV", "TOASO": "OTOMOTIV", "TTRAK": "OTOMOTIV", "DOAS": "OTOMOTIV",
    "EREGL": "SANAYI", "KRDMD": "SANAYI", "SISE": "SANAYI", "ENKAI": "SANAYI",
    "KCHOL": "HOLDING", "SAHOL": "HOLDING", "TUPRS": "ENERJI", "PETKM": "ENERJI",
    
    # Perakende & İletişim (Yurt İçi Talep)
    "BIMAS": "PERAKENDE", "MGROS": "PERAKENDE", "SOKM": "PERAKENDE",
    "TCELL": "TELEKOM", "TTKOM": "TELEKOM",
}


class MacroShockEngine:
    """
    Makro Stres ve Siyah Kuğu (Black Swan) Simülasyon Motoru
    """

    SUPPORTED_SCENARIOS = {
        "FAIZ_ARTISI_250BP": "TCMB Politika Faizinde +250 Baz Puan Ani Artış",
        "DOLAR_10_ARTIS": "USD/TRY Kurunda %10 Ani Yükseliş Şoku",
        "JEOPOLITIK_KRİZ": "Bölgesel Jeopolitik Gerilim / Siyah Kuğu Olayı",
    }

    @classmethod
    def get_sector(cls, ticker: str) -> str:
        clean = ticker.strip().upper().replace(".IS", "")
        return SECTOR_MAP.get(clean, "GENEL_SANAYI")

    @classmethod
    def simulate_shock(cls, ticker: str, scenario: str = "FAIZ_ARTISI_250BP") -> Dict[str, Any]:
        """
        Belirtilen senaryo altında hissenin makro kırılganlık skorunu (0-100)
        ve tahmini fiyat etkisini hesaplar.
        """
        clean_ticker = ticker.strip().upper().replace(".IS", "")
        clean_scenario = scenario.strip().upper()
        if clean_scenario not in cls.SUPPORTED_SCENARIOS:
            clean_scenario = "FAIZ_ARTISI_250BP"

        sector = cls.get_sector(clean_ticker)
        scenario_title = cls.SUPPORTED_SCENARIOS[clean_scenario]

        # 1. Senaryo Bazlı Sektörel Kırılganlık ve Fiyat Etkisi Modellemesi
        vulnerability_score = 45.0
        estimated_impact_pct = -2.5
        transmission_mechanism = ""

        if clean_scenario == "FAIZ_ARTISI_250BP":
            if sector in ["BANKACILIK", "GYO"]:
                vulnerability_score = 82.0
                estimated_impact_pct = -6.8
                transmission_mechanism = "Net faiz marjı baskısı, fonlama maliyetlerinde sıçrama ve kredi talebinde sert daralma riski."
            elif sector in ["OTOMOTIV", "PERAKENDE"]:
                vulnerability_score = 65.0
                estimated_impact_pct = -4.2
                transmission_mechanism = "Tüketici finansman maliyetlerinin yükselmesi ve iç talepte soğuma."
            elif sector in ["SAVUNMA", "ENERJI", "HOLDING"]:
                vulnerability_score = 35.0
                estimated_impact_pct = -1.2
                transmission_mechanism = "Güçlü nakit pozisyonu ve döviz bazlı gelirler faiz baskısını dengeliyor."
            else:
                vulnerability_score = 52.0
                estimated_impact_pct = -3.0
                transmission_mechanism = "Genel piyasa iskonto oranı artışı ve değerleme çarpanlarında daralma."

        elif clean_scenario == "DOLAR_10_ARTIS":
            if sector in ["OTOMOTIV", "SAVUNMA", "SANAYI", "HOLDING"]:
                vulnerability_score = 25.0
                estimated_impact_pct = +5.2
                transmission_mechanism = "Döviz bazlı ihracat gelirleri ve net yabancı para pozisyonu nedeniyle operasyonel kâr artışı."
            elif sector in ["TELEKOM", "HAVACILIK"]:
                vulnerability_score = 74.0
                estimated_impact_pct = -5.8
                transmission_mechanism = "Döviz cinsi borç servis yükü, jet yakıtı ve altyapı lisans maliyeti baskısı."
            elif sector in ["PERAKENDE"]:
                vulnerability_score = 62.0
                estimated_impact_pct = -3.5
                transmission_mechanism = "İthal girdi maliyet enflasyonu ve alım gücü erimesi."
            else:
                vulnerability_score = 50.0
                estimated_impact_pct = -1.5
                transmission_mechanism = "Kur geçişkenliği kaynaklı maliyet artışları."

        elif clean_scenario == "JEOPOLITIK_KRİZ":
            if sector in ["SAVUNMA"]:
                vulnerability_score = 20.0
                estimated_impact_pct = +6.5
                transmission_mechanism = "Savunma harcamalarında küresel artış ve stratejik tedarik güvenliği teyidi."
            elif sector in ["HAVACILIK"]:
                vulnerability_score = 88.0
                estimated_impact_pct = -8.5
                transmission_mechanism = "Hava sahası kısıtlamaları, turizm iptalleri ve tırmanan brent petrol yakıt maliyeti."
            elif sector in ["BANKACILIK", "GYO"]:
                vulnerability_score = 76.0
                estimated_impact_pct = -6.0
                transmission_mechanism = "Ülke risk primi (CDS) sıçraması ve yabancı sermaye çıkışı baskısı."
            else:
                vulnerability_score = 68.0
                estimated_impact_pct = -4.5
                transmission_mechanism = "Genel risk iştahında kaçış (Risk-off modu) ve piyasa oynaklığı."

        is_high_risk = vulnerability_score >= 70.0

        if is_high_risk:
            warning_text = f"⚠️ YÜKSEK MAKRO RİSK: {clean_ticker} hissesi '{scenario_title}' senaryosuna karşı yüksek kırılganlık taşıyor (%{estimated_impact_pct:+.1f} tahmini etki)!"
        elif vulnerability_score <= 35.0:
            warning_text = f"🛡️ MAKRO DAYANIKLI: {clean_ticker} sektörü ({sector}) bu makro şoka karşı korunaklı veya pozitif ayrışma potansiyeline sahip (%{estimated_impact_pct:+.1f})."
        else:
            warning_text = f"⚖️ ORTA DÜZEY RİSK: {clean_ticker} senaryodan sınırlı etkilenebilir (%{estimated_impact_pct:+.1f})."

        summary = (
            f"Makro Stres Analizi [{clean_scenario}]: {clean_ticker} ({sector} Sektörü). "
            f"Kırılganlık Skoru: {vulnerability_score:.0f}/100. {transmission_mechanism} {warning_text}"
        )

        toon = (
            f"#TOON/v3.5 schema=BISTAPP_MACRO_SHOCK\n"
            f"@shock{{sym:{clean_ticker};scenario:{clean_scenario};sector:{sector};"
            f"vuln_score:{vulnerability_score:.0f}/100;impact:{estimated_impact_pct:+.1f}%;"
            f"high_risk:{'TRUE' if is_high_risk else 'FALSE'}}}\n"
            f"@summary{{{summary}}}"
        )

        return {
            "ticker": clean_ticker,
            "sector": sector,
            "scenario": clean_scenario,
            "scenario_title": scenario_title,
            "macro_vulnerability_score": vulnerability_score,
            "estimated_impact_pct": estimated_impact_pct,
            "is_high_risk": is_high_risk,
            "transmission_mechanism": transmission_mechanism,
            "warning": warning_text,
            "summary": summary,
            "toon": toon,
        }

    @classmethod
    def simulate_all_shocks(cls, ticker: str) -> Dict[str, Any]:
        """Tüm 3 senaryoyu aynı anda simüle ederek kapsamlı stres matrisi üretir."""
        scenarios = ["FAIZ_ARTISI_250BP", "DOLAR_10_ARTIS", "JEOPOLITIK_KRİZ"]
        results = {}
        max_score = 0.0

        for sc in scenarios:
            res = cls.simulate_shock(ticker, sc)
            results[sc] = res
            if res["macro_vulnerability_score"] > max_score:
                max_score = res["macro_vulnerability_score"]

        return {
            "ticker": ticker.strip().upper().replace(".IS", ""),
            "max_vulnerability_score": max_score,
            "is_any_high_risk": max_score >= 70.0,
            "scenarios": results,
        }
