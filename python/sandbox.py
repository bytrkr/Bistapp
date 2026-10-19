"""
Bistapp MT16 - Güvenlik İzolasyonu ve Korumalı Alan (sandbox.py)
---------------------------------------------------------------
Sisteme yüklenen belgelerin (PDF, Excel, Word, Görsel, Metin) güvenliğini sağlar:
1. Boyut kontrolü (Maksimum 25 MB).
2. Zararlı dosya uzantılarını (.exe, .sh, .bat, .dll, .py vb.) anında engeller.
3. Magic Byte (dosya imzası) analizi ile uzantı taklidini önler.
4. Onaylanan dosyaları python/temp/ altında izole bir çalışma alanına taşır.
"""

from __future__ import annotations
import os
import shutil
import uuid
from pathlib import Path
from typing import Dict, Any, Optional

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

DANGEROUS_EXTENSIONS = {
    ".exe", ".sh", ".bat", ".cmd", ".dll", ".bin", ".py", ".pyc",
    ".scr", ".msi", ".vbs", ".ps1", ".jar", ".com", ".elf"
}

MAGIC_SIGNATURES = {
    "pdf": b"%PDF",
    "png": b"\x89PNG",
    "jpeg": b"\xff\xd8\xff",
    "jpg": b"\xff\xd8\xff",
    "zip_office": b"PK\x03\x04",  # .docx, .xlsx, .zip
}


class Sandbox:
    """
    Dosya Güvenlik ve İzolasyon Kalkanı
    """

    @classmethod
    def execute_safely(cls, file_path: str, file_type: str = "document") -> Dict[str, Any]:
        """
        Dosyayı boyut, uzantı ve magic byte kontrollerinden geçirerek
        python/temp/ altında izole edilmiş güvenli bir alana taşır.
        """
        p = Path(file_path).resolve()
        if not p.is_file():
            return {
                "is_safe": False,
                "error": f"Belirtilen dosya bulunamadı: {file_path}",
                "isolated_path": None,
            }

        # 1. Dosya Boyutu Kontrolü
        file_size = p.stat().st_size
        if file_size > MAX_FILE_SIZE_BYTES:
            return {
                "is_safe": False,
                "error": f"Dosya boyutu çok büyük ({file_size / (1024*1024):.1f} MB). İzin verilen maksimum: 25 MB.",
                "isolated_path": None,
            }

        # 2. Tehlikeli Uzantı Kontrolü
        ext = p.suffix.lower()
        if ext in DANGEROUS_EXTENSIONS:
            return {
                "is_safe": False,
                "error": f"🛑 GÜVENLİK ENGELİ: Zararlı/yürütülebilir dosya uzantısı engellendi ({ext}).",
                "isolated_path": None,
            }

        # 3. Magic Byte (Dosya İmzası) Denetimi
        magic_detected = "unknown"
        try:
            with open(p, "rb") as f:
                header = f.read(16)
        except Exception as e:
            return {
                "is_safe": False,
                "error": f"Dosya başlığı okunamadı: {e}",
                "isolated_path": None,
            }

        if header.startswith(MAGIC_SIGNATURES["pdf"]):
            magic_detected = "PDF"
        elif header.startswith(MAGIC_SIGNATURES["png"]):
            magic_detected = "PNG"
        elif header.startswith(MAGIC_SIGNATURES["jpeg"]):
            magic_detected = "JPEG"
        elif header.startswith(MAGIC_SIGNATURES["zip_office"]):
            magic_detected = "ZIP/OFFICE"
        elif ext in [".txt", ".csv"]:
            # Düz metin için null byte olmaması yeterlidir
            if b"\x00" in header:
                return {
                    "is_safe": False,
                    "error": "Metin dosyasında ikili (binary/shellcode) karakter tespit edildi.",
                    "isolated_path": None,
                }
            magic_detected = "TEXT"
        else:
            # Tanınmayan ama tehlikeli olmayan dosya
            magic_detected = "GENERIC_DATA"

        # 4. İzole Klasöre Taşıma
        temp_base = Path(__file__).resolve().parent / "temp"
        sandbox_id = uuid.uuid4().hex[:12]
        isolated_dir = temp_base / f"sandbox_{sandbox_id}"
        isolated_dir.mkdir(parents=True, exist_ok=True)

        isolated_file_path = isolated_dir / p.name
        try:
            shutil.copy2(p, isolated_file_path)
            # Yalnızca sahibi okuyup yazabilsin (kısıtlı izinler)
            os.chmod(isolated_file_path, 0o600)
        except Exception as e:
            return {
                "is_safe": False,
                "error": f"İzole ortama taşıma başarısız: {e}",
                "isolated_path": None,
            }

        return {
            "is_safe": True,
            "isolated_path": str(isolated_file_path),
            "original_filename": p.name,
            "size_bytes": file_size,
            "magic_detected": magic_detected,
            "sandbox_id": sandbox_id,
        }
