"""
Bistapp MT16 - E-posta ile Veri Besleme Modülü (mail_reader.py)
--------------------------------------------------------------
IMAP protokolü ile e-posta sunucusuna bağlanır, okunmamış mailleri tarar,
ekindeki desteklenen belgeleri (.pdf, .docx, .xlsx, .txt) python/temp/ klasörüne
indirir, doc_parser ile TOON formatına dönüştürür ve maili okundu işaretler.
Tüm hataları yakalayarak (try-except) arka plan iş akışının sürekliliğini sağlar.
"""

from __future__ import annotations
import os
import sys
import uuid
import imaplib
import email
from email.header import decode_header
from pathlib import Path
from typing import List, Dict, Any, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from doc_parser import parse_document

try:
    from input_engine.cache_manager import get_cached_data, save_to_cache
except ImportError:
    try:
        from cache_manager import get_cached_data, save_to_cache
    except ImportError:
        def get_cached_data(source_url: str, ttl_minutes: int = 15):
            return None
        def save_to_cache(source_url: str, data_text: str):
            pass


def _decode_mime_header(value: str) -> str:
    """E-posta başlıklarındaki MIME encoding'leri çözer."""
    if not value:
        return ""
    try:
        decoded_parts = decode_header(value)
        res = []
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                enc = encoding or "utf-8"
                try:
                    res.append(part.decode(enc, errors="ignore"))
                except Exception:
                    res.append(part.decode("utf-8", errors="ignore"))
            else:
                res.append(str(part))
        return "".join(res)
    except Exception:
        return str(value)


def check_and_process_emails() -> List[Dict[str, Any]]:
    """
    IMAP sunucusuna bağlanarak okunmamış mailleri tarar,
    ekindeki finansal belgeleri ayrıştırıp TOON formatına çevirir.

    Returns:
        list: İşlenen eklerin ve belgelerin özeti.
    """
    imap_server = os.getenv("MAIL_IMAP_SERVER", "").strip()
    mail_user = os.getenv("MAIL_USER", "").strip()
    mail_password = os.getenv("MAIL_PASSWORD", "").strip()

    # Eğer kimlik bilgileri yapılandırılmamışsa sessizce atla
    if not imap_server or not mail_user or not mail_password or "ornek@gmail.com" in mail_user:
        return []

    processed_results: List[Dict[str, Any]] = []
    temp_dir = Path(__file__).resolve().parent.parent / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)

    mail = None
    try:
        # IMAP SSL bağlantısı (Gmail vb. için 993 portu standarttır)
        mail = imaplib.IMAP4_SSL(imap_server)
        mail.login(mail_user, mail_password)
        mail.select("INBOX")

        # Okunmamış (UNSEEN) mailleri ara
        status, messages = mail.search(None, "UNSEEN")
        if status != "OK":
            return []

        email_ids = messages[0].split()
        if not email_ids:
            return []

        allowed_extensions = {".pdf", ".docx", ".xlsx", ".xls", ".txt"}

        for e_id in email_ids:
            try:
                res, msg_data = mail.fetch(e_id, "(RFC822)")
                if res != "OK":
                    continue

                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        subject = _decode_mime_header(msg.get("Subject", "Konusuz"))
                        sender = _decode_mime_header(msg.get("From", "Bilinmeyen Gönderen"))

                        # Eşlik eden ekleri (attachments) tara
                        for part in msg.walk():
                            content_disposition = str(part.get("Content-Disposition", ""))
                            if "attachment" in content_disposition or part.get_filename():
                                filename = part.get_filename()
                                if not filename:
                                    continue
                                filename = _decode_mime_header(filename)
                                ext = os.path.splitext(filename)[1].lower()

                                if ext in allowed_extensions:
                                    mail_source_url = f"mail://{sender}/{subject}/{filename}"

                                    # 1. Önce önbelleğe bak (dosyayı okumadan / ayrıştırmadan önce)
                                    cached_content = get_cached_data(mail_source_url, ttl_minutes=15)
                                    if cached_content:
                                        processed_results.append({
                                            "sender": sender,
                                            "subject": subject,
                                            "filename": filename,
                                            "source_type": ext.replace(".", "").upper(),
                                            "char_count": len(cached_content),
                                            "toon_line": f"Belge: {filename}, Durum: ONBELLEKTEN_OKUNDU",
                                            "toon_content": cached_content,
                                            "from_cache": True
                                        })
                                        continue

                                    # 2. Önbellekte yoksa geçici dosyaya kaydedip parse et
                                    unique_name = f"{uuid.uuid4().hex}_{filename}"
                                    file_path = temp_dir / unique_name

                                    payload = part.get_payload(decode=True)
                                    if payload:
                                        with open(file_path, "wb") as f:
                                            f.write(payload)

                                        try:
                                            # doc_parser ile TOON formatına dönüştür
                                            toon_res = parse_document(file_path, source_url=mail_source_url)
                                            # Mail kaynağı için de önbelleğe kaydet
                                            save_to_cache(mail_source_url, str(toon_res))

                                            processed_results.append({
                                                "sender": sender,
                                                "subject": subject,
                                                "filename": filename,
                                                "source_type": toon_res.source_type,
                                                "char_count": toon_res.char_count,
                                                "toon_line": toon_res.to_toon_line(),
                                                "toon_content": str(toon_res),
                                                "from_cache": False
                                            })
                                        except Exception as parse_err:
                                            print(f"[MAIL_READER] Belge ayrıştırma hatası ({filename}): {parse_err}")
                                        finally:
                                            # Geçici dosyayı güvenle sil
                                            if file_path.is_file():
                                                try:
                                                    os.remove(file_path)
                                                except Exception:
                                                    pass

                # Maili okundu olarak işaretle (\Seen bayrağını ekle)
                mail.store(e_id, "+FLAGS", "\\Seen")

            except Exception as mail_err:
                print(f"[MAIL_READER] Mail işleme hatası (ID {e_id}): {mail_err}")

    except Exception as connection_err:
        print(f"[MAIL_READER] IMAP bağlantı veya oturum hatası: {connection_err}")
    finally:
        if mail:
            try:
                mail.logout()
            except Exception:
                pass

    return processed_results
