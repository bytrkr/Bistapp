"""
Bistapp MT16 - ID Uzayı ve Önbellek Yöneticisi (cache_manager.py)
-----------------------------------------------------------------
SQLite tabanlı önbellek motoru.
Aynı URL veya belge eklerinin tekrar tekrar işlenmesini engeller,
TTL (Time To Live) kontrolü ile taze veriyi korurken gereksiz maliyet ve gecikmeyi önler.
"""

from __future__ import annotations
import os
import time
import hashlib
import sqlite3
from pathlib import Path
from typing import Optional, Union, Dict, Any


DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "cache.db"


class CacheManager:
    """
    SQLite tabanlı kalıcı önbellek (Cache Manager) sınıfı.
    Veritabanı: python/cache.db
    Tablo: cache_entries (id, url_hash, content_hash, source_url, data_text, last_updated)
    """

    def __init__(self, db_path: Optional[Union[str, Path]] = None):
        self.db_path = Path(db_path) if db_path else DEFAULT_DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Yeni bir SQLite bağlantısı oluşturur (thread-safe kullanım için)."""
        conn = sqlite3.connect(str(self.db_path), timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Tablo ve indeksleri ilklendirir."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cache_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url_hash TEXT UNIQUE NOT NULL,
                    content_hash TEXT,
                    source_url TEXT NOT NULL,
                    data_text TEXT NOT NULL,
                    last_updated REAL NOT NULL
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_cache_url_hash ON cache_entries (url_hash)
            """)
            conn.commit()

    @staticmethod
    def compute_hash(value: Union[str, bytes]) -> str:
        """Verilen değerin SHA-256 özetini üretir."""
        if isinstance(value, str):
            value = value.encode("utf-8")
        return hashlib.sha256(value).hexdigest()

    def get_cached_data(self, source_url: str, ttl_minutes: int = 15) -> Optional[str]:
        """
        Verilen URL'nin (veya mail ekinin) hash'ini alıp veritabanına bakar.
        Eğer kayıt varsa ve son güncellenme üzerinden ttl_minutes geçmemişse,
        doğrudan veritabanındaki data_text'i döner (internete/diske çıkmaz).

        Args:
            source_url (str): Kaynak URL, dosya yolu veya benzersiz kimlik.
            ttl_minutes (int): Geçerlilik süresi (dakika). Varsayılan: 15.

        Returns:
            str | None: Önbellekteki metin veya None.
        """
        if not source_url:
            return None

        url_hash = self.compute_hash(source_url)
        now = time.time()
        max_age_seconds = ttl_minutes * 60.0

        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT data_text, last_updated FROM cache_entries WHERE url_hash = ?",
                    (url_hash,)
                )
                row = cursor.fetchone()
                if not row:
                    return None

                last_updated = float(row["last_updated"])
                age = now - last_updated

                if age <= max_age_seconds:
                    return str(row["data_text"])
                else:
                    # TTL süresi dolmuş
                    return None
        except Exception as e:
            print(f"[CACHE_MANAGER] Önbellek okuma hatası ({source_url}): {e}")
            return None

    def save_to_cache(self, source_url: str, data_text: str) -> None:
        """
        Veriyi hash'leyip veritabanına kaydeder (varsa günceller).

        Args:
            source_url (str): Kaynak URL veya dosya tanıtıcısı.
            data_text (str): Saklanacak TOON veya metin içeriği.
        """
        if not source_url or data_text is None:
            return

        url_hash = self.compute_hash(source_url)
        content_hash = self.compute_hash(data_text)
        now = time.time()

        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO cache_entries (url_hash, content_hash, source_url, data_text, last_updated)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(url_hash) DO UPDATE SET
                        content_hash = excluded.content_hash,
                        source_url = excluded.source_url,
                        data_text = excluded.data_text,
                        last_updated = excluded.last_updated
                """, (url_hash, content_hash, str(source_url), str(data_text), now))
                conn.commit()
        except Exception as e:
            print(f"[CACHE_MANAGER] Önbellek yazma hatası ({source_url}): {e}")

    def clear_expired(self, ttl_minutes: int = 15) -> int:
        """Süresi dolmuş önbellek girdilerini siler ve silinen kayıt sayısını döner."""
        cutoff = time.time() - (ttl_minutes * 60.0)
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM cache_entries WHERE last_updated < ?", (cutoff,))
                deleted = cursor.rowcount
                conn.commit()
                return deleted
        except Exception:
            return 0


# Global Singleton ve Fonksiyon Arayüzü
_default_cache = CacheManager()


def get_cached_data(source_url: str, ttl_minutes: int = 15) -> Optional[str]:
    """Modül seviyesinde önbellek sorgulama fonksiyonu."""
    return _default_cache.get_cached_data(source_url=source_url, ttl_minutes=ttl_minutes)


def save_to_cache(source_url: str, data_text: str) -> None:
    """Modül seviyesinde önbelleğe yazma fonksiyonu."""
    _default_cache.save_to_cache(source_url=source_url, data_text=data_text)


if __name__ == "__main__":
    print("=" * 65)
    print("Bistapp MT16 - Cache Manager Testi")
    print("=" * 65)

    test_url = "https://kap.org.tr/bildirim/12345"
    test_data = "#TOON/v3.5 schema=BISTAPP_DOC_PARSER\n@content[KAP Bildirimi Test Metni]"

    # 1. Kaydet
    save_to_cache(test_url, test_data)
    print("1. Veri önbelleğe kaydedildi.")

    # 2. Oku
    cached = get_cached_data(test_url, ttl_minutes=5)
    print(f"2. Önbellekten okundu: {cached == test_data}")
    assert cached == test_data, "Önbellek eşleşmedi!"

    # 3. TTL dolmuş testi
    expired = get_cached_data(test_url, ttl_minutes=0)
    print(f"3. 0 dakika TTL ile sorgulama (Beklenen None): {expired is None}")
    assert expired is None, "TTL kontrolü başarısız!"

    print("=" * 65)
    print("✅ Cache Manager başarıyla doğrulandı!")
    print("=" * 65)
