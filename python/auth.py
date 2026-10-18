"""
Bistapp MT16 - Kimlik Doğrulama ve Kullanıcı Yönetimi Modülü (auth.py)
----------------------------------------------------------------------
SaaS mimarisi için SQLite tabanlı kullanıcı yönetimi, parola hashleme
ve JWT (JSON Web Token) oturum yönetimini sağlar.
"""

from __future__ import annotations
import os
import time
import json
import base64
import hmac
import hashlib
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

# ============================================================================
# ORTAM DEĞİŞKENLERİ VE YAPILANDIRMA
# ============================================================================

def _load_secret_key() -> str:
    """SECRET_KEY'i .env veya ortam değişkenlerinden okur."""
    key = os.getenv("SECRET_KEY", "").strip().strip("'\"")
    if key and "your_" not in key:
        return key

    search_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path("/.env"),
        Path("/app/applet/.env")
    ]
    for p in search_paths:
        if p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("SECRET_KEY="):
                            val = line.split("=", 1)[1].strip().strip("'\"")
                            if val and "your_" not in val:
                                return val
            except Exception:
                pass
    return "bistapp_saas_secure_jwt_secret_key_2026_x89a"


SECRET_KEY = _load_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

DB_PATH = Path(__file__).resolve().parent / "bistapp_users.db"


# ============================================================================
# PAROLA HASHLEME (PASSLIB & RESILIENT FALLBACK)
# ============================================================================

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _HAS_PASSLIB = True
except Exception:
    pwd_context = None
    _HAS_PASSLIB = False


def get_password_hash(password: str) -> str:
    """
    Kullanıcı parolasını güvenli bir şekilde hash'ler.
    passlib yüklüyse bcrypt kullanır; alternatif olarak PBKDF2-HMAC-SHA256 kullanır.
    """
    if _HAS_PASSLIB and pwd_context is not None:
        try:
            return pwd_context.hash(password)
        except Exception:
            pass

    # Resilient fallback: PBKDF2-HMAC-SHA256
    salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return f"pbkdf2:{salt}:{hashed}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Düz metin parola ile hash'lenmiş parolayı doğrular.
    """
    if not plain_password or not hashed_password:
        return False

    if hashed_password.startswith("pbkdf2:"):
        parts = hashed_password.split(":")
        if len(parts) == 3:
            salt = parts[1]
            expected_hash = parts[2]
            computed = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
            return hmac.compare_digest(computed, expected_hash)

    if _HAS_PASSLIB and pwd_context is not None:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False

    return False


# ============================================================================
# JWT TOKEN ÜRETİMİ VE DOĞRULAMA (PYTHON-JOSE & RESILIENT FALLBACK)
# ============================================================================

try:
    from jose import jwt, JWTError
    _HAS_JOSE = True
except Exception:
    jwt = None
    JWTError = Exception
    _HAS_JOSE = False


def _b64_url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4)) if len(data) % 4 != 0 else ""
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Kullanıcı bilgileri için 24 saat geçerli JWT erişim belirteci üretir.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    to_encode.update({"exp": int(expire.timestamp()), "iat": int(now.timestamp())})

    if _HAS_JOSE and jwt is not None:
        try:
            return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        except Exception:
            pass

    # Resilient fallback: Standart HS256 JWT
    header = {"alg": "HS256", "typ": "JWT"}
    hdr_b64 = _b64_url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64_url_encode(json.dumps(to_encode, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{hdr_b64}.{payload_b64}".encode("utf-8")
    sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64_url_encode(sig)
    return f"{hdr_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[dict]:
    """
    JWT token'ı çözer, imzasını ve son kullanma tarihini doğrular.
    """
    if not token:
        return None

    if _HAS_JOSE and jwt is not None:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except Exception:
            pass

    # Resilient fallback doğrulama
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            return None
        hdr_b64, payload_b64, sig_b64 = parts
        signing_input = f"{hdr_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        provided_sig = _b64_url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, provided_sig):
            return None

        payload_bytes = _b64_url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Süre kontrolü
        exp = payload.get("exp")
        if exp and datetime.now(timezone.utc).timestamp() > exp:
            return None

        return payload
    except Exception:
        return None


# ============================================================================
# SQLITE VERİTABANI VE KULLANICI İŞLEMLERİ
# ============================================================================

def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_user_db() -> None:
    """users tablosunu oluşturur ve gerekirse yeni sütunları ekler."""
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                created_at TEXT NOT NULL,
                subscription_status TEXT NOT NULL DEFAULT 'FREE',
                stripe_customer_id TEXT,
                subscription_end_date TEXT
            )
        """)
        # Mevcut tabloya yeni sütunları ekle (hata alsa da devam et)
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN stripe_customer_id TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN subscription_end_date TEXT")
        except sqlite3.OperationalError:
            pass

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)
        """)
        conn.commit()


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """E-posta adresine göre kullanıcı kaydını döner."""
    clean_email = email.strip().lower()
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (clean_email,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """ID'ye göre kullanıcı kaydını döner."""
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None


def create_user(email: str, password_hash: str, subscription_status: str = "FREE") -> Dict[str, Any]:
    """Yeni kullanıcı kaydeder."""
    clean_email = email.strip().lower()
    created_at = datetime.now(timezone.utc).isoformat()
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (email, hashed_password, created_at, subscription_status)
            VALUES (?, ?, ?, ?)
        """, (clean_email, password_hash, created_at, subscription_status))
        conn.commit()
        user_id = cursor.lastrowid
        return {
            "id": user_id,
            "email": clean_email,
            "created_at": created_at,
            "subscription_status": subscription_status
        }


def create_test_user() -> Optional[Dict[str, Any]]:
    """
    Test kullanıcısı (test@bistapp.com / Bistapp2026!) oluşturur.
    Zaten varsa sessizce geçer (try-except).
    """
    try:
        init_user_db()
        email = "test@bistapp.com"
        existing = get_user_by_email(email)
        if existing:
            return existing
        hashed = get_password_hash("Bistapp2026!")
        user = create_user(email, hashed, subscription_status="PREMIUM")
        return user
    except Exception as e:
        print(f"[AUTH] create_test_user hata: {e}")
        return None


def update_user_billing(email: str, stripe_customer_id: str, status: str, end_date: Optional[str] = None) -> bool:
    """Kullanıcının abonelik bilgilerini günceller."""
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users 
            SET stripe_customer_id = ?, subscription_status = ?, subscription_end_date = ?
            WHERE email = ?
        """, (stripe_customer_id, status, end_date, email.strip().lower()))
        conn.commit()
        return cursor.rowcount > 0


# Veritabanını otomatik ilklendir
init_user_db()


if __name__ == "__main__":
    print("=" * 65)
    print("Bistapp MT16 - Auth & JWT Modülü Testi")
    print("=" * 65)

    test_pass = "GizliSifre_2026!"
    hashed = get_password_hash(test_pass)
    print(f"Parola: {test_pass}")
    print(f"Hash: {hashed}")
    assert verify_password(test_pass, hashed), "Parola doğrulaması başarısız!"
    assert not verify_password("YanlisSifre", hashed), "Yanlış parola onaylandı!"
    print("✅ Parola hashleme ve doğrulama başarılı.")

    token = create_access_token({"sub": "yatirimci@bistapp.com", "user_id": 1})
    print(f"JWT Token: {token[:30]}...")
    payload = decode_access_token(token)
    print(f"Çözülen Payload: {payload}")
    assert payload is not None and payload.get("sub") == "yatirimci@bistapp.com", "JWT çözme başarısız!"
    print("✅ JWT üretimi ve doğrulaması başarılı.")

    print("=" * 65)
    print("🎉 Auth modülü başarıyla doğrulandı!")
    print("=" * 65)
