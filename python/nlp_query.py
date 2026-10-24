"""
Bistapp MT16 - Türkçe Finansal Doğal Dil Sorgulama Motoru (nlp_query.py)
------------------------------------------------------------------------
Kullanıcının Türkçe doğal dilde yazdığı borsa sorgularını
(örn: "BofA'nın en çok aldığı hisseler", "F/K 6'dan küçük sanayi şirketleri")
anlayıp yapılandırılmış tarama filtrelerine dönüştürür.
"""

from __future__ import annotations
import re
from typing import Dict, Any, List, Optional


class BistQueryEngine:
    """
    Doğal Dil Finansal Sorgu Ayrıştırıcı ve Filtre Üretici
    """
    BIST_KEYWORDS = {
        "bofa": {"criterion": "institutional_buyer", "target": "Bank of America", "metric": "akd_inflow"},
        "yabanci": {"criterion": "foreign_flow", "target": "Yabancı Takas Oranı", "metric": "foreign_ratio_increase"},
        "sanayi": {"criterion": "sector", "target": "SANAYI", "metric": "sector_match"},
        "holding": {"criterion": "sector", "target": "HOLDING", "metric": "sector_match"},
        "banka": {"criterion": "sector", "target": "BANKACILIK", "metric": "sector_match"},
        "temettu": {"criterion": "dividend", "target": "Yüksek Temettü Verimi", "metric": "dividend_yield_min"},
        "panik": {"criterion": "sentiment", "target": "PANIC_OVERSOLD", "metric": "rsi_under_30"},
        "fomo": {"criterion": "sentiment", "target": "FOMO_BREAKOUT", "metric": "volume_spike"},
        "hacim": {"criterion": "volume", "target": "Hacim Patlaması", "metric": "volume_2x"},
    }

    @classmethod
    def parse_query(cls, query_text: str) -> Dict[str, Any]:
        """
        Türkçe metni analiz eder; hedef metrikleri, sayısal sınırları
        ve hisse filtrelerini döner.
        """
        text = (query_text or "").lower().strip()
        matched_criteria = []
        structured_filters: Dict[str, Any] = {}

        # 1. Anahtar kelime taraması
        for kw, meta in cls.BIST_KEYWORDS.items():
            if kw in text:
                matched_criteria.append(meta["target"])
                structured_filters[meta["criterion"]] = meta["target"]

        # 2. F/K veya PD/DD sayısal regex çıkarımı
        # Örn: "f/k 5 altı", "fk < 7", "f/k oranı 6'dan küçük"
        pe_match = re.search(r'(?:f/k|fk|fiyat kazanç)\s*(?:oranı)?\s*(?:<|küçük|altı|altında)?\s*(\d+(?:[\.,]\d+)?)', text)
        if pe_match:
            val = float(pe_match.group(1).replace(",", "."))
            structured_filters["max_pe_ratio"] = val
            matched_criteria.append(f"F/K < {val}")

        # 3. Belirtilen Hisse Kodlarını Tespit Etme
        tickers_found = re.findall(r'\b[A-Z]{4,5}\b', query_text.upper())
        valid_bist = [t for t in tickers_found if t not in ["BIST", "BANK", "TORK", "OTOM"]]
        if valid_bist:
            structured_filters["target_tickers"] = valid_bist

        # 4. Açıklama Üretme
        if matched_criteria:
            summary = f"Sorgu '{query_text}' başarıyla ayrıştırıldı: " + ", ".join(matched_criteria)
        else:
            summary = f"Genel BIST tarama modu: '{query_text}' için hacim ve momentum filtreleri uygulandı."
            structured_filters["general_scanner"] = True

        return {
            "original_query": query_text,
            "parsed_filters": structured_filters,
            "matched_criteria": matched_criteria,
            "detected_tickers": valid_bist,
            "query_summary": summary,
        }
