"""
Bistapp MT16 - Watermarker ve Manipülatör Takipçisi (watermark_tracker.py)
--------------------------------------------------------------------------
Sosyal medyada (X, Telegram, JIRO) organize biçimde yayılan aynı cümle kalıplarını
ve botnet kopyalarını (n-gram benzerliği) tespit eder:
1. Aynı cümle kalıbını kullanan yorumları kümeleyip ilk yazan kaynağı (watermarker_id) bulur.
2. watermarker_id'nin geçmiş pompalama/manipülasyon geçmişini SQLite veritabanında izler.
3. manipulation_history_score (0-100) hesaplar; skor > 80 ise 'Yüksek Manipülasyon Kaynağı'
   şerhi koyar ve teknik alım sinyallerine karşı koruma kalkanını tetikler.
"""

from __future__ import annotations
import os
import re
import time
import sqlite3
from typing import List, Dict, Any, Optional, Set, Tuple

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "watermark_history.db")


class WatermarkTracker:
    """
    Organize sosyal manipülasyon ve ilk kaynak (watermarker) takip motoru.
    """

    @classmethod
    def _init_db(cls):
        """Geçmiş suikast/pompalama kayıtları için SQLite tablosunu hazırlar."""
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS watermark_history (
                        watermarker_id TEXT PRIMARY KEY,
                        incident_count INTEGER DEFAULT 1,
                        last_ticker TEXT,
                        sample_phrase TEXT,
                        first_seen_ts REAL,
                        last_seen_ts REAL,
                        total_propagations INTEGER DEFAULT 1,
                        history_score REAL DEFAULT 50.0
                    )
                """)
                conn.commit()
        except Exception as e:
            print(f"[WATERMARK_TRACKER] DB init hatası: {e}")

    @staticmethod
    def _clean_tokens(text: str) -> List[str]:
        """Metni küçük harfe dönüştürüp noktalama işaretlerinden arındırarak kelimelerine böler."""
        clean = re.sub(r'[^\w\s]', ' ', text.lower()).strip()
        tokens = [t for t in clean.split() if len(t) > 2]
        return tokens

    @classmethod
    def _extract_ngrams(cls, text: str, n: int = 3) -> Set[str]:
        """Metinden n-gram kümeleri çıkarır (kelime bazlı)."""
        tokens = cls._clean_tokens(text)
        if len(tokens) < n:
            return set(tokens)
        return {" ".join(tokens[i:i + n]) for i in range(len(tokens) - n + 1)}

    @classmethod
    def compute_ngram_similarity(cls, text1: str, text2: str, n: int = 3) -> float:
        """
        İki metin arasındaki n-gram Jaccard benzerlik oranını (0.0 - 1.0) hesaplar.
        """
        ng1 = cls._extract_ngrams(text1, n)
        ng2 = cls._extract_ngrams(text2, n)
        if not ng1 or not ng2:
            # Kelimeler çok kısaysa doğrudan kelime kümesi benzerliği
            tok1 = set(cls._clean_tokens(text1))
            tok2 = set(cls._clean_tokens(text2))
            if not tok1 or not tok2:
                return 0.0
            intersection = tok1.intersection(tok2)
            union = tok1.union(tok2)
            return len(intersection) / len(union) if union else 0.0

        intersection = ng1.intersection(ng2)
        union = ng1.union(ng2)
        return len(intersection) / len(union) if union else 0.0

    @classmethod
    def _parse_timestamp(cls, item: Dict[str, Any]) -> float:
        """Mention içindeki zaman damgasını float unix zamanına dönüştürür."""
        ts = item.get("timestamp") or item.get("created_at") or item.get("time")
        if ts is not None:
            try:
                return float(ts)
            except (ValueError, TypeError):
                pass
        return 0.0

    @classmethod
    def get_watermarker_history(cls, watermarker_id: str) -> Dict[str, Any]:
        """
        Belirtilen anonim kullanıcının geçmiş manipülasyon profilini okur.
        """
        cls._init_db()
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT incident_count, total_propagations, history_score, last_ticker FROM watermark_history WHERE watermarker_id = ?",
                    (watermarker_id,)
                )
                row = cursor.fetchone()
                if row:
                    return {
                        "incident_count": int(row[0]),
                        "total_propagations": int(row[1]),
                        "history_score": float(row[2]),
                        "last_ticker": str(row[3]),
                    }
        except Exception as e:
            print(f"[WATERMARK_TRACKER] DB okuma hatası ({watermarker_id}): {e}")

        return {
            "incident_count": 0,
            "total_propagations": 0,
            "history_score": 0.0,
            "last_ticker": "",
        }

    @classmethod
    def record_incident(
        cls,
        watermarker_id: str,
        ticker: str,
        cluster_size: int,
        sample_phrase: str
    ) -> float:
        """
        İlk yazan kaynağın geçmiş kaydını günceller ve güncel manipulation_history_score hesaplar.
        """
        cls._init_db()
        now = time.time()
        new_score = 60.0

        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT incident_count, total_propagations FROM watermark_history WHERE watermarker_id = ?",
                    (watermarker_id,)
                )
                row = cursor.fetchone()

                if row:
                    inc_count = int(row[0]) + 1
                    tot_prop = int(row[1]) + cluster_size
                    # Tekrarlayan hareketlerde skor hızla 100'e yaklaşır
                    base = 60.0 + (inc_count * 12.0) + min(20.0, tot_prop * 1.5)
                    new_score = min(100.0, max(0.0, round(base, 1)))

                    cursor.execute("""
                        UPDATE watermark_history
                        SET incident_count = ?,
                            total_propagations = ?,
                            last_ticker = ?,
                            sample_phrase = ?,
                            last_seen_ts = ?,
                            history_score = ?
                        WHERE watermarker_id = ?
                    """, (inc_count, tot_prop, ticker, sample_phrase[:200], now, new_score, watermarker_id))
                else:
                    inc_count = 1
                    tot_prop = cluster_size
                    # İlk tespit: küme büyüklüğüne göre başlangıç skoru
                    base = 40.0 + min(35.0, cluster_size * 5.0)
                    new_score = min(100.0, max(0.0, round(base, 1)))

                    cursor.execute("""
                        INSERT INTO watermark_history (
                            watermarker_id, incident_count, last_ticker, sample_phrase,
                            first_seen_ts, last_seen_ts, total_propagations, history_score
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (watermarker_id, inc_count, ticker, sample_phrase[:200], now, now, tot_prop, new_score))

                conn.commit()
                return new_score
        except Exception as e:
            print(f"[WATERMARK_TRACKER] DB yazma hatası ({watermarker_id}): {e}")
            return new_score

    @classmethod
    def track_propagation(
        cls,
        mentions: List[Dict[str, Any]],
        similarity_threshold: float = 0.65,
        ticker: str = "BIST"
    ) -> Dict[str, Any]:
        """
        Yorum listesindeki n-gram benzerliği gösteren paylaşımları kümeler,
        en eski paylaşımı yapan suikastçi/pompalayıcıyı (watermarker_id) tespit eder
        ve geçmiş skorunu (manipulation_history_score) hesaplar.
        """
        if not mentions or not isinstance(mentions, list) or len(mentions) == 0:
            return {
                "clusters": [],
                "watermarker_id": None,
                "manipulation_history_score": 0.0,
                "is_high_manipulation": False,
                "warning": "",
                "total_propagations": 0,
                "summary": "Analiz edilecek sosyal medya mention verisi bulunamadı.",
            }

        # Yorum metinlerini ve indekslerini normalize et
        parsed_items: List[Dict[str, Any]] = []
        for idx, m in enumerate(mentions):
            if not isinstance(m, dict):
                continue
            text = str(m.get("text") or m.get("content") or "").strip()
            if not text:
                continue
            uid = str(m.get("watermarker_id") or m.get("user_id") or m.get("user") or f"usr_{idx}")
            ts = cls._parse_timestamp(m)
            parsed_items.append({
                "index": idx,
                "user_id": uid,
                "text": text,
                "timestamp": ts,
                "original": m,
            })

        if len(parsed_items) == 0:
            return {
                "clusters": [],
                "watermarker_id": None,
                "manipulation_history_score": 0.0,
                "is_high_manipulation": False,
                "warning": "",
                "total_propagations": 0,
                "summary": "Metin içeren geçerli mention kaydı yok.",
            }

        # Benzerlik matrisi ile kümeleme (Açgözlü / Greedy N-Gram Clustering)
        visited = set()
        clusters: List[Dict[str, Any]] = []

        for i, item_i in enumerate(parsed_items):
            if i in visited:
                continue

            current_cluster = [item_i]
            visited.add(i)

            for j, item_j in enumerate(parsed_items):
                if j in visited:
                    continue
                sim = cls.compute_ngram_similarity(item_i["text"], item_j["text"], n=3)
                if sim >= similarity_threshold:
                    current_cluster.append(item_j)
                    visited.add(j)

            # Sadece 2 veya daha fazla benzer kopya içeren kümeleri yayılım olarak değerlendir
            if len(current_cluster) >= 2:
                # En eski (ilk yazan) yorumu belirle (timestamp varsa en küçük, yoksa index sırası)
                sorted_by_time = sorted(
                    current_cluster,
                    key=lambda x: (x["timestamp"] if x["timestamp"] > 0 else float(x["index"]))
                )
                earliest = sorted_by_time[0]
                cluster_leader_id = earliest["user_id"]
                cluster_phrase = earliest["text"]

                clusters.append({
                    "cluster_id": f"cluster_{len(clusters) + 1}",
                    "size": len(current_cluster),
                    "watermarker_id": cluster_leader_id,
                    "earliest_timestamp": earliest["timestamp"],
                    "phrase": cluster_phrase[:150],
                    "members": [c["user_id"] for c in current_cluster],
                })

        # En büyük yayılım kümesini seç
        primary_watermarker: Optional[str] = None
        max_cluster_size = 0
        best_phrase = ""

        if clusters:
            clusters.sort(key=lambda c: c["size"], reverse=True)
            top_cluster = clusters[0]
            primary_watermarker = top_cluster["watermarker_id"]
            max_cluster_size = top_cluster["size"]
            best_phrase = top_cluster["phrase"]

        # Geçmiş kayıtları ve skorlamayı güncelle
        manipulation_score = 0.0
        is_high_manipulation = False
        warning_msg = ""

        if primary_watermarker and max_cluster_size >= 2:
            manipulation_score = cls.record_incident(
                watermarker_id=primary_watermarker,
                ticker=ticker,
                cluster_size=max_cluster_size,
                sample_phrase=best_phrase
            )
            is_high_manipulation = (manipulation_score > 80.0)

            if is_high_manipulation:
                warning_msg = (
                    f"🚨 [YÜKSEK MANİPÜLASYON KAYNAĞI]: Suikastçi ID '{primary_watermarker}' "
                    f"tarafından başlatılan organize cümle yayılımı tespit edildi "
                    f"(Küme: {max_cluster_size} hesap, Geçmiş Skor: {manipulation_score:.0f}/100)."
                )
            else:
                warning_msg = (
                    f"⚠️ [YAYILIM TESPİTİ]: İlk kaynak '{primary_watermarker}' üzerinden "
                    f"{max_cluster_size} benzer kopya mesaj tespit edildi (Skor: {manipulation_score:.0f}/100)."
                )

        summary = (
            warning_msg
            if warning_msg
            else "Organize cümle kopyalaması veya suikastçi yayılımı tespit edilmedi; sosyal paylaşımlar organik."
        )

        return {
            "clusters": clusters,
            "watermarker_id": primary_watermarker,
            "manipulation_history_score": round(manipulation_score, 1),
            "is_high_manipulation": is_high_manipulation,
            "warning": warning_msg,
            "total_propagations": sum(c["size"] for c in clusters),
            "summary": summary,
        }
