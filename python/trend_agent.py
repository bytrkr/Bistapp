"""
Bistapp MT16 - Trend Momentum & FOMO Agent (trend_agent.py)
-----------------------------------------------------------
Google Trends (pytrends) verisini kullanarak son 7 günlük arama hacmini analiz eder.
Arama hacminde ani artış (%50+) tespit edildiğinde fomo_flag = True üretir ve
çıktıyı Bistapp standart TOON formatında sunar.
"""

from __future__ import annotations
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional
import pandas as pd

from pytrends.request import TrendReq


class ToonTrendResult(str):
    """
    Bistapp standart TOON formatındaki trend sonucunu temsil eden ve
    aynı zamanda Python sözlüğü veya nesne özelliklerine doğrudan erişim sağlayan sınıf.
    """
    def __new__(cls, content: str, meta: Optional[Dict[str, Any]] = None):
        instance = super().__new__(cls, content)
        instance._meta = meta or {}
        return instance

    @property
    def keyword(self) -> str:
        return self._meta.get("keyword", "")

    @property
    def momentum_pct(self) -> float:
        return float(self._meta.get("momentum_pct", 0.0))

    @property
    def fomo_flag(self) -> bool:
        return bool(self._meta.get("fomo_flag", False))

    @property
    def recent_avg(self) -> float:
        return float(self._meta.get("recent_avg", 0.0))

    @property
    def baseline_avg(self) -> float:
        return float(self._meta.get("baseline_avg", 0.0))

    @property
    def latest_interest(self) -> float:
        return float(self._meta.get("latest_interest", 0.0))

    def to_dict(self) -> Dict[str, Any]:
        return dict(self._meta)

    def to_toon_line(self) -> str:
        """Kısa tek satırlık TOON çıktısı (Örn: Kelime: Bitcoin, Momentum: +55.2%, FOMO: AKTIF)"""
        chg_sign = "+" if self.momentum_pct >= 0 else ""
        fomo_str = "AKTIF" if self.fomo_flag else "PASIF"
        return f"Kelime: {self.keyword}, Momentum: {chg_sign}{self.momentum_pct:.1f}%, FOMO: {fomo_str}"

    def to_toon_full(self) -> str:
        """Bistapp tam TOON/v3.5 token-optimized object notation çıktısı"""
        return str(self)


def get_trend_momentum(keyword: str, geo: Optional[str] = None) -> ToonTrendResult:
    """
    Verilen bir arama kelimesi (örn: 'ASELS hisse' veya 'Bitcoin') için
    son 7 günlük Google Trends arama hacmini çeker, momentumu ve FOMO bayrağını hesaplar,
    Bistapp TOON formatında döndürür.

    Args:
        keyword (str): Arama terimi (hisse, kripto veya genel varlık).
        geo (str, optional): Bölge kodu ('TR' veya küresel için ''). Belirtilmezse otomatik seçilir.

    Returns:
        ToonTrendResult: TOON string ve meta verileri barındıran sonuç nesnesi.
    """
    clean_keyword = keyword.strip()
    if not clean_keyword:
        return _build_empty_result("BILINMEYEN", "Arama terimi boş olamaz.")

    # Bölge seçimi: Türkçe karakterler veya hisse terimleri varsa TR, değilse küresel
    if geo is None:
        tr_indicators = ["hisse", "bist", "borsa", "asels", "thyao", "eregl", "garan", "tuprs", "ş", "ğ", "ü", "ı", "ö", "ç"]
        if any(ind in clean_keyword.lower() for ind in tr_indicators):
            geo = "TR"
        else:
            geo = ""

    try:
        # Pytrends istemcisi (zaman aşımı ve dil ayarlarıyla)
        pytrend = TrendReq(hl="tr-TR", tz=180, timeout=(10, 25))
        
        # Son 7 günlük veriyi çek ('now 7-d')
        pytrend.build_payload(
            kw_list=[clean_keyword],
            cat=0,
            timeframe="now 7-d",
            geo=geo,
            gprop=""
        )
        
        df = pytrend.interest_over_time()
        
        if df.empty or clean_keyword not in df.columns:
            return _build_fallback_result(clean_keyword, geo)

        series = df[clean_keyword]

        # 7 günlük veri genellikle saatliktir (~168 satır).
        # Son 24 saati (son 24 satır) 'recent', önceki dönemi 'baseline' kabul ederiz.
        if len(series) > 36:
            baseline_slice = series.iloc[:-24]
            recent_slice = series.iloc[-24:]
        else:
            # Daha az veri noktası varsa son %20'yi son dönem al
            split_idx = int(len(series) * 0.8)
            baseline_slice = series.iloc[:split_idx]
            recent_slice = series.iloc[split_idx:]

        baseline_avg = float(baseline_slice.mean()) if not baseline_slice.empty else 0.0
        recent_avg = float(recent_slice.mean()) if not recent_slice.empty else 0.0
        latest_interest = float(series.iloc[-1]) if not series.empty else 0.0

        # Momentum yüzdesi hesabı
        if baseline_avg > 0:
            momentum_pct = ((recent_avg - baseline_avg) / baseline_avg) * 100.0
        elif recent_avg > 0:
            momentum_pct = 100.0
        else:
            momentum_pct = 0.0

        # FOMO Bayrağı Mantığı:
        # Arama hacmi son günlerde aniden (%50'den fazla) artmışsa fomo_flag = True
        fomo_flag = momentum_pct >= 50.0

        return _format_toon(
            keyword=clean_keyword,
            momentum_pct=momentum_pct,
            fomo_flag=fomo_flag,
            recent_avg=recent_avg,
            baseline_avg=baseline_avg,
            latest_interest=latest_interest,
            geo=geo
        )

    except Exception as e:
        # Rate limit veya ağ istisnası durumunda güvenli koruma
        return _build_error_result(clean_keyword, str(e), geo)


def _format_toon(
    keyword: str,
    momentum_pct: float,
    fomo_flag: bool,
    recent_avg: float,
    baseline_avg: float,
    latest_interest: float,
    geo: str
) -> ToonTrendResult:
    """Hesaplanan trend metriklerini Bistapp standart TOON formatına dönüştürür."""
    chg_sign = "+" if momentum_pct >= 0 else ""
    fomo_str = "TRUE" if fomo_flag else "FALSE"
    fomo_status = "AKTIF (Aşırı İlgi / FOMO Alarmi)" if fomo_flag else "NORMAL (Sakin Arama)"
    action = "DIKKAT_FOMO_ALARM" if fomo_flag else "DENGELI_MOMENTUM"
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    summary_line = (
        f"Kelime: {keyword}, Momentum: {chg_sign}{momentum_pct:.1f}%, "
        f"FOMO: {'AKTIF' if fomo_flag else 'PASIF'}, Son Seviye: {int(latest_interest)}/100"
    )

    toon_content = (
        f"#TOON/v3.5 schema=BISTAPP_TREND_MOMENTUM\n"
        f"@trend{{kw:{keyword};geo:{geo or 'GLOBAL'};momentum:{chg_sign}{momentum_pct:.1f}%;fomo:{fomo_str};recent_avg:{recent_avg:.1f};base_avg:{baseline_avg:.1f};latest:{int(latest_interest)};period:7d;ts:{now_ts}}}\n"
        f"@verdict{{fomo_flag:{fomo_str};action:{action};bias:{'RISK_YUKSEK' if fomo_flag else 'DENGELI'}}}\n"
        f"@summary{{{summary_line}}}"
    )

    meta = {
        "keyword": keyword,
        "geo": geo or "GLOBAL",
        "momentum_pct": round(momentum_pct, 2),
        "fomo_flag": fomo_flag,
        "recent_avg": round(recent_avg, 2),
        "baseline_avg": round(baseline_avg, 2),
        "latest_interest": round(latest_interest, 2),
        "timestamp": now_ts,
        "summary_line": summary_line,
        "status": fomo_status
    }

    return ToonTrendResult(toon_content, meta=meta)


def _build_fallback_result(keyword: str, geo: str) -> ToonTrendResult:
    """Yetersiz veri durumunda güvenli sıfır momentum çıktısı."""
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    summary_line = f"Kelime: {keyword}, Momentum: +0.0%, FOMO: PASIF (Düşük Hacim)"
    toon_content = (
        f"#TOON/v3.5 schema=BISTAPP_TREND_MOMENTUM\n"
        f"@trend{{kw:{keyword};geo:{geo or 'GLOBAL'};momentum:+0.0%;fomo:FALSE;recent_avg:0.0;base_avg:0.0;latest:0;period:7d;ts:{now_ts}}}\n"
        f"@verdict{{fomo_flag:FALSE;action:NORMAL;bias:VERI_YETERSIZ}}\n"
        f"@summary{{{summary_line}}}"
    )
    meta = {
        "keyword": keyword,
        "geo": geo or "GLOBAL",
        "momentum_pct": 0.0,
        "fomo_flag": False,
        "recent_avg": 0.0,
        "baseline_avg": 0.0,
        "latest_interest": 0.0,
        "timestamp": now_ts,
        "summary_line": summary_line,
        "status": "Yetersiz arama hacmi"
    }
    return ToonTrendResult(toon_content, meta=meta)


def _build_error_result(keyword: str, error_msg: str, geo: str) -> ToonTrendResult:
    """İstisna durumunda korumalı TOON çıktısı."""
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    summary_line = f"Kelime: {keyword}, Momentum: 0.0%, FOMO: PASIF (Bağlantı Hatası)"
    toon_content = (
        f"#TOON/v3.5 schema=BISTAPP_TREND_MOMENTUM error=true\n"
        f"@error{{msg:\"{error_msg[:100]}\"}}\n"
        f"@trend{{kw:{keyword};geo:{geo or 'GLOBAL'};momentum:0.0%;fomo:FALSE;period:7d;ts:{now_ts}}}\n"
        f"@summary{{{summary_line}}}"
    )
    meta = {
        "keyword": keyword,
        "geo": geo or "GLOBAL",
        "momentum_pct": 0.0,
        "fomo_flag": False,
        "recent_avg": 0.0,
        "baseline_avg": 0.0,
        "latest_interest": 0.0,
        "error": error_msg,
        "timestamp": now_ts,
        "summary_line": summary_line,
        "status": f"Hata: {error_msg}"
    }
    return ToonTrendResult(toon_content, meta=meta)


def _build_empty_result(keyword: str, msg: str) -> ToonTrendResult:
    summary_line = f"Kelime: {keyword}, Momentum: 0.0%, FOMO: PASIF"
    return ToonTrendResult(
        f"#TOON/v3.5 schema=BISTAPP_TREND_MOMENTUM\n@error{{\"{msg}\"}}\n@summary{{{summary_line}}}",
        meta={"keyword": keyword, "momentum_pct": 0.0, "fomo_flag": False, "summary_line": summary_line}
    )


if __name__ == "__main__":
    test_kw = sys.argv[1] if len(sys.argv) > 1 else "Bitcoin"
    print("=" * 60)
    print("Bistapp MT16 - Trend Momentum & FOMO Agent Testi")
    print("=" * 60)
    print(f"📡 Google Trends 7 günlük veri analiz ediliyor: '{test_kw}'...")
    
    result = get_trend_momentum(test_kw)
    
    print("\n[TOON Standart Çıktı]:")
    print(result)
    print("\n[Tek Satır TOON Özeti]:")
    print(result.to_toon_line())
    print("\n[Ayrıştırılmış Meta Sözlüğü]:")
    print(result.to_dict())
    print("=" * 60)
