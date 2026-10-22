"""
Bistapp MT16 - Anonimleştirici ve Maskeleyici Motoru (anonymizer.py)
-------------------------------------------------------------------
Kişisel Verilerin Korunması Kanunu (KVKK) ve gizlilik standartlarına uygun olarak:
1. Kullanıcı adlarını SHA-256 ile geri döndürülemez hash kimliklerine dönüştürür.
2. Metin içerisindeki e-posta, telefon, TCKN, IBAN ve kullanıcı adlarını (@username)
   regex ile tespit edip [MASKELENDI] olarak maskeler.
3. JIRO veya harici sosyal medya kaynaklarından gelen tüm verilerin sisteme ve
   veritabanına girmeden önce temizlenmesini garanti eder.
"""

from __future__ import annotations
import re
import hashlib
from typing import Dict, Any, List, Optional, Union


class Anonymizer:
    """
    Kullanıcı kimliği ve kişisel veri (PII) anonimleştirme motoru.
    """

    # E-posta Regex: ornek@alanadi.com
    EMAIL_PATTERN = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
        re.IGNORECASE
    )

    # Türkiye Telefon Numarası Regex: +90 532 123 45 67, 05321234567, 532-123-4567
    PHONE_PATTERN = re.compile(
        r'(?:\+?90|0)?\s*\(?5\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b'
    )

    # Genel Sabit Hat / Telefon Regex
    GENERIC_PHONE_PATTERN = re.compile(
        r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
    )

    # T.C. Kimlik Numarası Regex: 11 haneli, ilk hane 0 olamaz
    TCKN_PATTERN = re.compile(r'\b[1-9]\d{10}\b')

    # Sosyal Medya Kullanıcı Adı Regex: @kullaniciadi
    MENTION_HANDLE_PATTERN = re.compile(r'@[A-Za-z0-9_]{3,32}\b')

    # IBAN Regex (TR formatı)
    IBAN_PATTERN = re.compile(r'\bTR\d{2}\s?(?:\d{4}\s?){5}\d{2}\b', re.IGNORECASE)

    @classmethod
    def hash_user_id(cls, username: Optional[str]) -> str:
        """
        Kullanıcı adını SHA-256 ile hash'leyip geri döndürülemez bir ID üretir.
        Örnek Çıktı: 'usr_a1b2c3d4'
        """
        if not username or not str(username).strip():
            return "usr_anonymous"

        clean_user = str(username).strip().lstrip('@').lower()
        # SHA-256 hash hesapla ve ilk 8 karakterini al
        digest = hashlib.sha256(clean_user.encode('utf-8')).hexdigest()
        return f"usr_{digest[:8]}"

    @classmethod
    def mask_text(cls, text: Optional[str]) -> str:
        """
        Metin içindeki kişisel verileri (e-posta, telefon, TCKN, IBAN, @kullaniciadi)
        regex ile tespit edip [MASKELENDI] olarak değiştirir.
        """
        if not text or not isinstance(text, str):
            return ""

        masked = text

        # 1. E-posta maskeleme
        masked = cls.EMAIL_PATTERN.sub('[MASKELENDI]', masked)

        # 2. Telefon maskeleme
        masked = cls.PHONE_PATTERN.sub('[MASKELENDI]', masked)
        masked = cls.GENERIC_PHONE_PATTERN.sub('[MASKELENDI]', masked)

        # 3. TCKN maskeleme
        masked = cls.TCKN_PATTERN.sub('[MASKELENDI]', masked)

        # 4. IBAN maskeleme
        masked = cls.IBAN_PATTERN.sub('[MASKELENDI]', masked)

        # 5. @kullaniciadi maskeleme
        masked = cls.MENTION_HANDLE_PATTERN.sub('[MASKELENDI]', masked)

        return masked

    @classmethod
    def anonymize_mention(cls, mention: Dict[str, Any]) -> Dict[str, Any]:
        """
        Tek bir sosyal medya mention/yorum kaydını anonimleştirir.
        Kullanıcı kimliğini hash'ler, metin gövdesindeki PII verilerini maskeler.
        """
        if not isinstance(mention, dict):
            return {}

        sanitized = dict(mention)

        # Kullanıcı adı alanlarını belirle ve hash'le
        raw_user = (
            sanitized.get("user")
            or sanitized.get("username")
            or sanitized.get("author")
            or sanitized.get("sender")
            or "anon"
        )
        hashed_id = cls.hash_user_id(str(raw_user))
        sanitized["watermarker_id"] = hashed_id
        sanitized["user_id"] = hashed_id
        sanitized["user"] = hashed_id
        sanitized["author"] = hashed_id
        sanitized["username"] = hashed_id

        # Metin gövdesini maskele
        raw_text = (
            sanitized.get("text")
            or sanitized.get("content")
            or sanitized.get("message")
            or ""
        )
        masked_text = cls.mask_text(str(raw_text))
        sanitized["text"] = masked_text
        sanitized["content"] = masked_text

        # Özet alanı varsa maskele
        if "summary" in sanitized and isinstance(sanitized["summary"], str):
            sanitized["summary"] = cls.mask_text(sanitized["summary"])

        return sanitized

    @classmethod
    def anonymize_mentions(cls, mentions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Tüm yorum/mention listesini anonimleştirir.
        """
        if not mentions or not isinstance(mentions, list):
            return []

        return [cls.anonymize_mention(m) for m in mentions if isinstance(m, dict)]
