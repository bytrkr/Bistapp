"""
Bistapp MT16 - Sosyal Medya İllüzyon Filtresi ve Botnet Tespiti (social_illusion_engine.py)
----------------------------------------------------------------------------------------
Sosyal medya (Twitter/X, Telegram, forumlar) üzerinden hisse hakkında yayılan
organize botnet, astroturfing ve yapay pump & dump illüzyonlarını tespit eder.
"""

from __future__ import annotations
import re
import time
from typing import Dict, Any, List, Optional


class SocialIllusionEngine:
    """
    Sosyal Medya İllüzyon Filtresi & Botnet Tespiti
    """

    @classmethod
    def detect_botnet(cls, mentions: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Gelen sosyal medya mesajlarını (metin, zaman damgası, kullanıcı adı) analiz ederek
        botnet aktivitesi ve yapay etkileşim (illüzyon) risk skorunu (0-100) hesaplar.
        """
        if not mentions:
            return {
                "botnet_risk_score": 0.0,
                "is_botnet_detected": False,
                "warning": "Sosyal medya mesajı bulunamadı.",
                "reasons": [],
                "bot_account_count": 0,
                "duplicate_message_rate": 0.0,
                "burst_message_count": 0,
            }

        total_mentions = len(mentions)
        now = time.time()
        five_mins_ago = now - 300  # 5 dakika (300 saniye)

        # 1. Zaman Kümelenmesi (Son 5 dakika içindeki ani patlama / burst)
        burst_count = 0
        for m in mentions:
            ts = m.get("timestamp") or m.get("created_at") or now
            if isinstance(ts, (int, float)) and ts >= five_mins_ago:
                burst_count += 1

        burst_ratio = burst_count / total_mentions if total_mentions > 0 else 0.0

        # 2. Metin Tekrarı (Duplicate / Benzer Şablon Mesajlar)
        texts = [str(m.get("text", "")).strip().lower() for m in mentions if m.get("text")]
        unique_texts = set(texts)
        duplicate_count = len(texts) - len(unique_texts)
        duplicate_ratio = duplicate_count / len(texts) if texts else 0.0

        # 3. Şüpheli Kullanıcı Adı Analizi (Rastgele harf/rakam örüntüleri: user12345, bot_82931)
        bot_user_pattern = re.compile(r"(bot|user\d{4,}|trader\d{4,}|[a-z]{2,5}\d{4,})", re.IGNORECASE)
        bot_users = 0
        for m in mentions:
            username = str(m.get("username") or m.get("user") or "")
            if bot_user_pattern.search(username) or (len(username) > 8 and sum(c.isdigit() for c in username) >= 4):
                bot_users += 1

        bot_user_ratio = bot_users / total_mentions if total_mentions > 0 else 0.0

        # Risk Skoru Ağırlıklandırması (0 - 100)
        # - Metin tekrar oranı (%40 ağırlık)
        # - Şüpheli kullanıcı oranı (%35 ağırlık)
        # - 5 dk içindeki ani patlama oranı (%25 ağırlık)
        score = (duplicate_ratio * 40.0) + (bot_user_ratio * 35.0) + (burst_ratio * 25.0)
        score = min(100.0, max(0.0, round(score * 1.5, 1)))  # Hassasiyet kalibrasyonu

        reasons: List[str] = []
        if duplicate_ratio > 0.35:
            reasons.append(f"Yüksek metin kopyalama oranı (%{duplicate_ratio * 100:.1f})")
        if bot_user_ratio > 0.30:
            reasons.append(f"Şüpheli/Rastgele bot rumuz yoğunluğu ({bot_users}/{total_mentions})")
        if burst_ratio > 0.60 and burst_count >= 10:
            reasons.append(f"Son 5 dakikada anormal mesaj patlaması ({burst_count} mesaj)")

        is_botnet_detected = score >= 70.0
        if is_botnet_detected:
            warning = "⚠️ YÜKSEK MANİPÜLASYON İLLÜZYONU: Sosyal medya akışında organize botnet ve yapay pompalama (astroturfing) tespit edildi!"
        elif score >= 40.0:
            warning = "⚡ Orta Düzey Şüpheli Aktivite: Sosyal akışta kısmi koordineli mesajlar gözlemleniyor."
        else:
            warning = "✅ Organik Akış: Sosyal medya mesajları doğal kullanıcı dağılımına sahip."

        return {
            "botnet_risk_score": score,
            "is_botnet_detected": is_botnet_detected,
            "warning": warning,
            "reasons": reasons,
            "bot_account_count": bot_users,
            "duplicate_message_rate": round(duplicate_ratio, 3),
            "burst_message_count": burst_count,
            "total_analyzed": total_mentions,
        }
