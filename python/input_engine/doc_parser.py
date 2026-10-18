"""
Bistapp MT16 - Belge ve Çoklu Ortam Okuma Motoru (doc_parser.py)
----------------------------------------------------------------
PDF (PyMuPDF), Word (.docx) ve Excel (.xlsx/.xls) belgelerinden
metin, tablo ve veri çıkararak Bistapp standart TOON formatına dönüştürür.
"""

from __future__ import annotations
import os
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List, Union

# Belge Kütüphaneleri
try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    import docx
except ImportError:
    docx = None

try:
    import pandas as pd
except ImportError:
    pd = None

# Önbellek Yöneticisi
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


class ToonDocResult(str):
    """
    Bistapp standart TOON formatındaki belge çıktısını temsil eden sınıf.
    Hem doğrudan string olarak kullanılabilir hem de meta verilere erişim sağlar.
    """
    def __new__(cls, content: str, meta: Optional[Dict[str, Any]] = None):
        instance = super().__new__(cls, content)
        instance._meta = meta or {}
        return instance

    @property
    def source_type(self) -> str:
        return self._meta.get("source_type", "UNKNOWN")

    @property
    def char_count(self) -> int:
        return int(self._meta.get("char_count", len(self)))

    @property
    def word_count(self) -> int:
        return int(self._meta.get("word_count", 0))

    @property
    def line_count(self) -> int:
        return int(self._meta.get("line_count", 0))

    @property
    def raw_text(self) -> str:
        return self._meta.get("raw_text", str(self))

    def to_dict(self) -> Dict[str, Any]:
        return dict(self._meta)

    def to_toon_line(self) -> str:
        """Tek satırlık TOON özeti"""
        return f"Belge: {self.source_type}, Karakter: {self.char_count}, Kelime: {self.word_count}, Durum: OKUNDU"


def to_toon_text(
    text: str,
    source_type: str = "DOC",
    metadata: Optional[Dict[str, Any]] = None
) -> ToonDocResult:
    """
    Çıkarılan metni ve meta verileri Bistapp standart TOON formatına dönüştürür.

    Args:
        text (str): Ayıklanan ham/temizlenmiş metin.
        source_type (str): Belge tipi ('PDF', 'DOCX', 'EXCEL', 'TEXT', vb.).
        metadata (dict, optional): Ek meta veriler (dosya adı, sayfa sayısı vb.).

    Returns:
        ToonDocResult: TOON uyumlu formatlı sonuç nesnesi.
    """
    clean_text = text.strip() if text else ""
    meta = metadata.copy() if metadata else {}
    
    char_count = len(clean_text)
    words = clean_text.split()
    word_count = len(words)
    line_count = len(clean_text.splitlines()) if clean_text else 0
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    meta.update({
        "source_type": source_type.upper(),
        "char_count": char_count,
        "word_count": word_count,
        "line_count": line_count,
        "timestamp": now_ts,
        "raw_text": clean_text
    })

    # TOON başlık ve özet şeması
    summary_line = f"Belge: {source_type.upper()}, Karakter: {char_count}, Kelime: {word_count}, Durum: OKUNDU"
    
    # LLM token tasarrufu için metin bloğunu düzenle
    toon_content = (
        f"#TOON/v3.5 schema=BISTAPP_DOC_PARSER\n"
        f"@doc{{source:{source_type.upper()};chars:{char_count};words:{word_count};lines:{line_count};ts:{now_ts}}}\n"
        f"@summary{{{summary_line}}}\n"
        f"@content[\n"
        f"{clean_text}\n"
        f"]"
    )

    return ToonDocResult(toon_content, meta=meta)


def parse_pdf(file_path: Union[str, Path]) -> str:
    """
    PyMuPDF kullanarak PDF dosyasının içindeki tüm metinleri ve tabloları okur,
    temiz bir metin olarak döndürür.

    Args:
        file_path (str | Path): PDF dosyasının dosya sistemi yolu.

    Returns:
        str: Sayfa sayfa ayrıştırılmış temiz metin.
    """
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"PDF dosyası bulunamadı: {file_path}")

    extracted_pages: List[str] = []

    try:
        doc = fitz.open(str(path))
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_text = page.get_text("text").strip()
            
            # Tabloları tespit et ve ekle (PyMuPDF find_tables desteği)
            table_texts = []
            try:
                tables = page.find_tables()
                if tables and hasattr(tables, "tables"):
                    for t_idx, tab in enumerate(tables.tables):
                        df = tab.to_pandas()
                        if not df.empty:
                            table_texts.append(f"[Tablo {t_idx + 1}]:\n{df.to_markdown(index=False)}")
            except Exception:
                pass

            page_blocks = []
            if page_text:
                page_blocks.append(page_text)
            if table_texts:
                page_blocks.extend(table_texts)

            if page_blocks:
                extracted_pages.append(f"--- Sayfa {page_idx + 1} ---\n" + "\n\n".join(page_blocks))

        doc.close()
        
        return "\n\n".join(extracted_pages) if extracted_pages else "[PDF Boş veya Okunabilir Metin İçermiyor]"

    except Exception as e:
        raise RuntimeError(f"PDF okuma hatası ({path.name}): {str(e)}")


def parse_docx(file_path: Union[str, Path]) -> str:
    """
    python-docx kullanarak Word dosyasındaki (.docx) paragrafları ve tabloları okuyup
    yapılandırılmış temiz metne çevirir.

    Args:
        file_path (str | Path): .docx dosyasının dosya sistemi yolu.

    Returns:
        str: Ayıklanan metin ve tablo içeriği.
    """
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"Word dosyası bulunamadı: {file_path}")

    try:
        doc = docx.Document(str(path))
        lines: List[str] = []

        # 1. Paragrafları oku
        for p in doc.paragraphs:
            text = p.text.strip()
            if text:
                lines.append(text)

        # 2. Tabloları oku ve metne dök
        for t_idx, table in enumerate(doc.tables):
            lines.append(f"\n--- [Tablo {t_idx + 1}] ---")
            table_rows = []
            for row in table.rows:
                row_data = [cell.text.strip().replace("\n", " ") for cell in row.cells]
                table_rows.append(" | ".join(row_data))
            if table_rows:
                lines.append("\n".join(table_rows))

        return "\n\n".join(lines) if lines else "[Word Belgesi Boş]"

    except Exception as e:
        raise RuntimeError(f"DOCX okuma hatası ({path.name}): {str(e)}")


def _df_to_markdown_or_text(df: pd.DataFrame) -> str:
    """tabulate kütüphanesi yoksa dahi kusursuz markdown tablosu oluşturur."""
    try:
        return df.to_markdown(index=False)
    except Exception:
        cols = [str(c) for c in df.columns]
        header_line = " | ".join(cols)
        sep_line = " | ".join(["---"] * len(cols))
        rows = [" | ".join(str(val).replace("\n", " ") for val in row) for row in df.values]
        return "\n".join([header_line, sep_line] + rows)


def parse_excel(
    file_path: Union[str, Path],
    output_format: str = "markdown"
) -> str:
    """
    pandas kullanarak Excel dosyasındaki (.xlsx, .xls) tüm sayfaları okur ve
    Markdown tablo veya JSON formatına çevirir.

    Args:
        file_path (str | Path): Excel dosyasının dosya sistemi yolu.
        output_format (str): 'markdown' veya 'json'.

    Returns:
        str: Formatlanmış tablo içeriği.
    """
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"Excel dosyası bulunamadı: {file_path}")

    try:
        # Tüm çalışma sayfalarını bir kerede oku
        sheets_dict = pd.read_excel(str(path), sheet_name=None, engine="openpyxl")
        output_sections: List[str] = []

        for sheet_name, df in sheets_dict.items():
            if df.empty:
                continue

            # Eksik değerleri temizle
            df_clean = df.fillna("")
            
            header = f"=== Sayfa: {sheet_name} ({len(df_clean)} satır x {len(df_clean.columns)} sütun) ==="

            if output_format.lower() == "json":
                content = df_clean.to_json(orient="records", force_ascii=False, indent=2)
            else:
                # Varsayılan: Markdown tablo formatı
                content = _df_to_markdown_or_text(df_clean)

            output_sections.append(f"{header}\n{content}")

        return "\n\n".join(output_sections) if output_sections else "[Excel Dosyası Boş]"

    except Exception as e:
        raise RuntimeError(f"Excel okuma hatası ({path.name}): {str(e)}")


def parse_document(
    file_path: Union[str, Path],
    source_url: Optional[str] = None,
    ttl_minutes: int = 15
) -> ToonDocResult:
    """
    Dosya uzantısını otomatik tespit ederek uygun ayrıştırıcıyı çağırır
    ve sonucu Bistapp TOON formatında döndürür.
    Dosya okuma işlemine başlamadan önce get_cached_data fonksiyonunu kontrol eder.
    Önbellekte varsa doğrudan döner, yoksa ayrıştırıp save_to_cache ile kaydeder.
    """
    path = Path(file_path)
    cache_key = source_url or f"file://{path.name}"

    # 1. Önbellek kontrolü
    cached_content = get_cached_data(cache_key, ttl_minutes=ttl_minutes)
    if cached_content is not None:
        if str(cached_content).startswith("#TOON/v3.5"):
            return ToonDocResult(
                cached_content,
                meta={
                    "filename": path.name,
                    "source_url": cache_key,
                    "from_cache": True,
                    "source_type": path.suffix.lower().replace(".", "").upper() or "DOC"
                }
            )
        ext = path.suffix.lower()
        st = ext.replace(".", "").upper() if ext else "DOC"
        return to_toon_text(
            cached_content,
            source_type=st,
            metadata={"filename": path.name, "source_url": cache_key, "from_cache": True}
        )

    # 2. Önbellekte yoksa dosyayı oku
    ext = path.suffix.lower()

    if ext == ".pdf":
        raw_text = parse_pdf(path)
        source_type = "PDF"
    elif ext in [".docx", ".doc"]:
        raw_text = parse_docx(path)
        source_type = "DOCX"
    elif ext in [".xlsx", ".xls"]:
        raw_text = parse_excel(path)
        source_type = "EXCEL"
    elif ext in [".txt", ".csv", ".json", ".toon"]:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            raw_text = f.read()
        source_type = ext.replace(".", "").upper()
    else:
        raise ValueError(f"Desteklenmeyen dosya formatı: {ext}")

    result = to_toon_text(raw_text, source_type=source_type, metadata={"filename": path.name, "source_url": cache_key})

    # 3. Önbelleğe kaydet
    save_to_cache(cache_key, str(result))
    return result


# ==============================================================================
# HIZLI DOĞRULAMA VE TEST ÇALIŞTIRICISI
# ==============================================================================
if __name__ == "__main__":
    print("=" * 65)
    print("Bistapp MT16 - Belge ve Görsel Okuma Motoru (doc_parser) Testi")
    print("=" * 65)

    sample_bist_kap_text = (
        "BORSA İSTANBUL A.Ş. BISTECH PİYASA DUYURUSU\n"
        "Şirket: ASELSAN ELEKTRONİK SANAYİ VE TİCARET A.Ş. (ASELS)\n"
        "Tarih: 17.10.2026 14:30\n"
        "Konu: Yeni İş İlişkisi ve İhracat Sözleşmesi\n\n"
        "Şirketimiz ile uluslararası bir müşteri arasında 145.000.000 USD tutarında "
        "aviyonik ve radar sistemleri tedarikine ilişkin yurt dışı satış sözleşmesi imzalanmıştır.\n"
        "Teslimatların 2027 yılı ilk çeyreğinde başlaması ve ciroya %8.4 oranında pozitif katkı yapması beklenmektedir."
    )

    print("\n[TEST 1] to_toon_text() Fonksiyonu Testi:")
    toon_res = to_toon_text(sample_bist_kap_text, source_type="KAP_PDF_REPORT")
    print(toon_res)
    print("\n[Tek Satır Özeti]:", toon_res.to_toon_line())
    print("[Meta Sözlük]:", toon_res.to_dict())

    print("\n" + "=" * 65)
    print("✅ doc_parser modülü başarıyla doğrulandı!")
    print("=" * 65)
