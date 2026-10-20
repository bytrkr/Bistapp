"""
Bistapp MT16 - Veri Kalitesi Kapısı (data_quality_gate.py)
---------------------------------------------------------
Ajan boru hattına (Pipeline) girmeden önce piyasa, takas ve sosyal medya
verilerini denetler:
1. validate_market_data: Fiyatın > 0 olduğunu ve zaman damgasının 15 dakikadan eski olmadığını doğrular.
2. validate_social_data: Mention sayısının >= 0 ve botnet skorunun 0-100 aralığında olduğunu doğrular.
3. sanitize_context: Kalitesiz verileri süzüp nötr koruyucu değerlerle stabilize eder.
"""

from __future__ import annotations
import time
from typing import Dict, Any, Tuple, List, Optional, Union


class DataQualityGate:
    """
    Veri Bütünlüğü ve Giriş Kalitesi Denetleyicisi
    """

    MAX_DATA_AGE_SECONDS = 900  # 15 dakika

    @classmethod
    def validate_market_data(cls, data: Any) -> Tuple[bool, str]:
        """
        Piyasa verisinin (MarketData veya dict) geçerliliğini denetler:
        - Fiyat > 0 olmalıdır.
        - Zaman damgası (varsa) 15 dakikadan eski olmamalıdır.
        """
        if data is None:
            return False, "MarketData nesnesi mevcut değil (None)."

        # Obje veya dict erişimi
        if isinstance(data, dict):
            price = float(data.get("price", 0.0))
            ts = data.get("timestamp")
            rsi = float(data.get("rsi", 50.0))
        else:
            price = float(getattr(data, "price", 0.0))
            ts = getattr(data, "timestamp", None)
            rsi = float(getattr(data, "rsi", 50.0))

        # 1. Fiyat Kontrolü
        if price <= 0.0:
            return False, f"Piyasa fiyatı 0 veya negatif olamaz (Alınan fiyat: {price})."

        # 2. RSI Aralık Kontrolü
        if rsi < 0.0 or rsi > 100.0:
            return False, f"RSI indikatörü 0-100 aralığında olmalıdır (Alınan: {rsi})."

        # 3. Zaman Damgası Tazelik Kontrolü
        if ts is not None:
            now = time.time()
            try:
                ts_val = float(ts)
                age_seconds = now - ts_val
                if age_seconds > cls.MAX_DATA_AGE_SECONDS:
                    return False, f"Piyasa verisi 15 dakikadan eski ({age_seconds:.0f} saniye önce üretilmiş)."
            except (ValueError, TypeError):
                # ISO string veya bilinmeyen format varsa esnek geç
                pass

        return True, "Piyasa verisi kalitesi onaylandı."

    @classmethod
    def validate_social_data(cls, data: Any) -> Tuple[bool, str]:
        """
        Sosyal medya verisinin (SocialData veya dict) geçerliliğini denetler:
        - Mention sayısı >= 0 olmalıdır.
        - Manipülasyon/Botnet skoru 0-100 aralığında olmalıdır.
        """
        if data is None:
            return True, "Sosyal veri opsiyoneldir (None)."

        if isinstance(data, dict):
            mention_count = int(data.get("mention_count", 0))
            manip_risk = float(data.get("manipulation_risk_score", 0.0))
            sent_score = float(data.get("sentiment_score", 0.0))
        else:
            mention_count = int(getattr(data, "mention_count", 0))
            manip_risk = float(getattr(data, "manipulation_risk_score", 0.0))
            sent_score = float(getattr(data, "sentiment_score", 0.0))

        if mention_count < 0:
            return False, f"Mention sayısı negatif olamaz (Alınan: {mention_count})."

        if manip_risk < 0.0 or manip_risk > 100.0:
            return False, f"Manipülasyon riski skoru 0-100 aralığında olmalıdır (Alınan: {manip_risk})."

        if sent_score < -1.0 or sent_score > 1.0:
            return False, f"Duygu skoru -1.0 ile +1.0 arasında olmalıdır (Alınan: {sent_score})."

        # ⚠️ Canlılık ve Simülasyon Kontrolü (JIRO Durumu)
        is_live = bool(data.get("is_live", True) if isinstance(data, dict) else getattr(data, "is_live", True))
        is_simulated = bool(data.get("is_simulated", False) if isinstance(data, dict) else getattr(data, "is_simulated", False))
        data_source = str(data.get("data_source", "") if isinstance(data, dict) else getattr(data, "data_source", "")).upper()

        if is_simulated or not is_live or data_source == "SIMULATED":
            return False, "⚠️ [SİMÜLE VERİ]: JIRO mikroservisi çevrimdışı veya simüle veri üretiyor. Sosyal istihbarat sinyallerine güvenilmemelidir."

        return True, "Sosyal veri kalitesi onaylandı."

    @classmethod
    def validate_news_data(cls, data: Any) -> Tuple[bool, str]:
        """
        KAP ve haber akışı verisini (NewsData veya dict) denetler:
        - is_simulated veya is_live kontrolü yapar.
        - Veri simüle ise uyarı döner.
        """
        if data is None:
            return True, "Haber verisi opsiyoneldir (None)."

        is_live = bool(data.get("is_live", True) if isinstance(data, dict) else getattr(data, "is_live", True))
        is_sim = bool(data.get("is_simulated", False) if isinstance(data, dict) else getattr(data, "is_simulated", False))
        src = str(data.get("data_source", "") if isinstance(data, dict) else getattr(data, "data_source", "")).upper()

        if is_sim or not is_live or src == "SIMULATED":
            return False, "⚠️ [SİMÜLE VERİ]: KAP haber akışı canlı değil veya simüle veri modunda. Ajanlar bu verilere güvenmemelidir."

        return True, "KAP ve haber akışı kalitesi onaylandı."

    @classmethod
    def sanitize_context(cls, ctx: Any) -> Tuple[Any, List[str]]:
        """
        UnifiedContext nesnesini denetler. Hatalı veya simüle veri varsa
        ajanların çökmemesi ve yanıltılmaması için koruyucu nötr değerler atar ve uyarı listesi döner.
        """
        warnings: List[str] = []

        # 1. Market Data Denetimi
        is_market_valid, market_msg = cls.validate_market_data(ctx.market_data)
        if not is_market_valid:
            warnings.append(f"⚠️ [DATA_QUALITY] {market_msg}")
            # Fiyat 0 veya bozuksa güvenli nötr fiyat ata
            if ctx.market_data is not None and getattr(ctx.market_data, "price", 0.0) <= 0.0:
                ctx.market_data.price = 100.0
                ctx.market_data.change_pct = 0.0
                ctx.market_data.source = "QUALITY_GATE_FALLBACK"

        # 2. Social Data Denetimi & Simülasyon Kalkanı
        if getattr(ctx, "social_data", None) is not None:
            is_social_valid, social_msg = cls.validate_social_data(ctx.social_data)
            if not is_social_valid:
                warnings.append(f"⚠️ [DATA_QUALITY] {social_msg}")
                # Ajanların simüle veya hatalı veriyle karar vermesini önle
                if hasattr(ctx.social_data, "is_reliable"):
                    ctx.social_data.is_reliable = False
                if hasattr(ctx.social_data, "is_simulated"):
                    ctx.social_data.is_simulated = True
                if hasattr(ctx.social_data, "is_live"):
                    ctx.social_data.is_live = False
                if hasattr(ctx.social_data, "simulation_warning") and not ctx.social_data.simulation_warning:
                    ctx.social_data.simulation_warning = "⚠️ Simüle Veri: Canlı JIRO akışı yok, veri simülasyondur."

        # 2.5 KAP / Haber Verisi Denetimi
        if getattr(ctx, "news_data", None) is not None:
            is_news_valid, news_msg = cls.validate_news_data(ctx.news_data)
            if not is_news_valid:
                warnings.append(f"⚠️ [DATA_QUALITY] {news_msg}")
                if hasattr(ctx.news_data, "is_live"):
                    ctx.news_data.is_live = False
                if hasattr(ctx.news_data, "is_simulated"):
                    ctx.news_data.is_simulated = True
                if hasattr(ctx.news_data, "simulation_warning") and not ctx.news_data.simulation_warning:
                    ctx.news_data.simulation_warning = "⚠️ Simüle Veri: Canlı KAP akışı yok."

        # 3. L2 Derinlik & OBI Tutarlılık Denetimi (Consistency Check)
        if getattr(ctx, "depth_data", None) is not None:
            is_depth_valid, depth_msg = cls.validate_l2_depth_data(ctx.depth_data, ctx.market_data)
            if not is_depth_valid:
                warnings.append(f"⚠️ [DATA_QUALITY] {depth_msg}")
            
            data_src = str(getattr(ctx.depth_data, "data_source", "SIMULATED")).upper()
            if data_src != "REALTIME_WS":
                warnings.append("ℹ️ [DATA_SOURCE] L2 verisi simüle kaynaktan üretilmiştir.")

        return ctx, warnings

    @classmethod
    def validate_l2_depth_data(cls, depth_data: Any, market_data: Optional[Any] = None) -> Tuple[bool, str]:
        """
        L2 verisi için Tutarlılık Kontrolü (Consistency Check):
        - OBI hesaplar veya okur: (bids - asks) / (bids + asks)
        - Eğer OBI pozitif (+0.40 üzeri) ise ama gerçek fiyat sert düşüyorsa (change_pct < -1.0%), veya
        - Eğer OBI negatif (-0.40 altı) ise ama gerçek fiyat sert yükseliyorsa (change_pct > +1.0%),
        bu veriyi 'Şüpheli' (is_suspicious=True) olarak işaretler ve uyarı döner.
        """
        if depth_data is None:
            return True, "DepthData mevcut değil (None)."

        if isinstance(depth_data, dict):
            bids = float(depth_data.get("bid_depth_total", 500000.0))
            asks = float(depth_data.get("ask_depth_total", 400000.0))
        else:
            bids = float(getattr(depth_data, "bid_depth_total", 500000.0))
            asks = float(getattr(depth_data, "ask_depth_total", 400000.0))

        tot = bids + asks
        obi = (bids - asks) / tot if tot > 0 else 0.0

        if hasattr(depth_data, "obi"):
            depth_data.obi = round(obi, 4)

        if market_data is not None:
            chg = float(getattr(market_data, "change_pct", 0.0) if hasattr(market_data, "change_pct") else market_data.get("change_pct", 0.0))
            
            # Çelişki / Şüpheli Veri Kontrolü
            if obi >= 0.40 and chg <= -1.0:
                msg = f"L2 verisi şüpheli (TUTARSIZLIK): OBI +{obi:.2f} (Alıcı Baskısı) gösterirken hisse %{chg:.2f} düşüyor. L2 verisi güvenilmez, bu sinyale dayanma."
                if hasattr(depth_data, "is_suspicious"):
                    depth_data.is_suspicious = True
                    depth_data.suspicious_reason = msg
                return False, msg
            elif obi <= -0.40 and chg >= 1.0:
                msg = f"L2 verisi şüpheli (TUTARSIZLIK): OBI {obi:.2f} (Satıcı Baskısı) gösterirken hisse %{chg:+.2f} yükseliyor. L2 verisi güvenilmez, bu sinyale dayanma."
                if hasattr(depth_data, "is_suspicious"):
                    depth_data.is_suspicious = True
                    depth_data.suspicious_reason = msg
                return False, msg

        return True, "L2 derinlik ve OBI verisi tutarlı."
