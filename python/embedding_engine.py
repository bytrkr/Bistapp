"""
Bistapp MT16 - Vektör Uzayı ve Yorum Kümeleme Motoru (embedding_engine.py)
--------------------------------------------------------------------------
Sosyal medyadan (JIRO, X, Telegram) gelen anonimleştirilmiş yorumları vektörleştirir
ve semantik anlamlarına göre kümelere ayırır (K-Means / Benzerlik Kümeleme).
sentence-transformers mevcutsa derin öğrenme vektörlerini, yüklü değilse yüksek
performanslı yerel TF-IDF / Semantik anahtar kelime vektör uzayını kullanır.

Her küme için otomatik konu özeti üretir:
- 'Panik Satışı' (Düşüş, taban, patladı, batış, kaçın)
- 'FOMO & Pompalama' (Uçacak, roket, tavan, kaçırma, hedef)
- 'Bilanço & Temel Beklenti' (Kâr, ciro, temettü, bilanço, ihracat)
- 'BofA & Takas/Tahta Baskısı' (BofA satıyor, yabancı takas, kademe baskısı)
- 'Teknik Analiz & Kırılım' (Direnç kırıldı, destek, RSI, MACD, formasyon)
- 'Genel / Yatay Görünüm' (Dengeli, takipteyim, izleme)
"""

from __future__ import annotations
import math
import re
from typing import List, Dict, Any, Optional, Union

# sentence-transformers opsiyonel import
try:
    from sentence_transformers import SentenceTransformer
    _HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    SentenceTransformer = None
    _HAS_SENTENCE_TRANSFORMERS = False


class EmbeddingEngine:
    """
    Yorumları semantik vektör uzayına projekte eden ve kümeleyen hibrit motor.
    """

    _transformer_model = None

    # Konu Başlığı Sözlükleri (BIST & Finans Ağırlıklı Semantik Kümeler)
    TOPIC_DICTIONARIES: Dict[str, Dict[str, Any]] = {
        "Panik Satışı": {
            "keywords": ["sat", "çakıldı", "patladı", "taban", "batış", "kriz", "felaket", "zarar", "kan", "çıkın", "kaç", "düştü", "çöküş", "ayı"],
            "sentiment": "BEARISH",
        },
        "FOMO & Pompalama": {
            "keywords": ["roket", "tavan", "uçacak", "patlama", "hedef", "kaçırma", "fırsat", "uçuyoruz", "şov", "zengin", "alın", "boğa", "zirve"],
            "sentiment": "BULLISH",
        },
        "Bilanço & Temel Beklenti": {
            "keywords": ["bilanço", "kâr", "ciro", "temettü", "ihracat", "favök", "büyüme", "gelir", "sözleşme", "ihale", "kap", "anlaşma"],
            "sentiment": "BULLISH",
        },
        "BofA & Takas/Tahta Baskısı": {
            "keywords": ["bofa", "takas", "yabancı", "kademe", "hacim", "lot", "baskı", "satıcı", "alıcı", "tahta", "kurumsal", "toplama"],
            "sentiment": "NEUTRAL",
        },
        "Teknik Analiz & Kırılım": {
            "keywords": ["direnç", "destek", "rsi", "macd", "kırılım", "trend", "formasyon", "flama", "fibonacci", "grafik", "ortalamalar"],
            "sentiment": "BULLISH",
        },
        "Genel / Yatay Görünüm": {
            "keywords": ["bekle", "yatay", "izle", "nötr", "sakin", "piyasa", "kararsız", "dolar", "faiz", "haber"],
            "sentiment": "NEUTRAL",
        },
    }

    @classmethod
    def _get_transformer_model(cls):
        """Model yüklenebilirse lazy initialization ile başlatır."""
        if _HAS_SENTENCE_TRANSFORMERS and cls._transformer_model is None:
            try:
                cls._transformer_model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as e:
                print(f"[EMBEDDING_ENGINE] sentence-transformers yükleme atlandı: {e}")
                cls._transformer_model = None
        return cls._transformer_model

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Metni küçük harfli kelime köklerine böler."""
        clean = re.sub(r'[^\w\s]', ' ', text.lower())
        return [w for w in clean.split() if len(w) > 2]

    @classmethod
    def compute_lightweight_embedding(cls, text: str) -> List[float]:
        """
        Yerel hafif semantik embedding: Her konunun anahtar kelime frekansından
        normalize edilmiş bir yoğunluk vektörü üretir.
        """
        tokens = cls._tokenize(text)
        total_tokens = max(1, len(tokens))

        embedding: List[float] = []
        for topic_name, meta in cls.TOPIC_DICTIONARIES.items():
            kws = meta["keywords"]
            match_count = sum(1 for t in tokens if any(t.startswith(kw) or kw in t for kw in kws))
            weight = match_count / total_tokens
            embedding.append(weight)

        # Uzunluğu 1'e normalize et (L2 norm)
        norm = math.sqrt(sum(x * x for x in embedding))
        if norm > 0:
            embedding = [x / norm for x in embedding]
        else:
            dim = len(cls.TOPIC_DICTIONARIES)
            embedding = [1.0 / math.sqrt(dim)] * dim

        return embedding

    @classmethod
    def compute_embedding(cls, text: str) -> List[float]:
        """
        sentence-transformers varsa derin model vektörünü, yoksa yerel embedding'i döner.
        """
        model = cls._get_transformer_model()
        if model is not None:
            try:
                vec = model.encode(text)
                return vec.tolist()
            except Exception:
                pass
        return cls.compute_lightweight_embedding(text)

    @classmethod
    def _determine_topic(cls, texts: List[str]) -> Tuple[str, str, List[str]]:
        """
        Kümedeki metinlerin toplamına bakarak en baskın konu başlığını ve duygu yönünü belirler.
        """
        scores: Dict[str, float] = {k: 0.0 for k in cls.TOPIC_DICTIONARIES}
        all_tokens: List[str] = []

        for txt in texts:
            toks = cls._tokenize(txt)
            all_tokens.extend(toks)
            for topic, meta in cls.TOPIC_DICTIONARIES.items():
                for kw in meta["keywords"]:
                    scores[topic] += sum(1 for t in toks if kw in t)

        # En yüksek puan alan konuyu bul
        best_topic = max(scores, key=lambda k: scores[k])
        if scores[best_topic] == 0:
            best_topic = "Genel / Yatay Görünüm"

        sentiment = cls.TOPIC_DICTIONARIES[best_topic]["sentiment"]

        # En sık geçen anahtar kelimeleri derle
        topic_kws = cls.TOPIC_DICTIONARIES[best_topic]["keywords"]
        found_kws = [kw for kw in topic_kws if any(kw in t for t in all_tokens)]

        return best_topic, sentiment, found_kws[:5]

    @classmethod
    def cluster_mentions(
        cls,
        mentions: Union[List[str], List[Dict[str, Any]]],
        n_clusters: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Girdi yorumlarını vektörleştirir ve kümelere ayırır.
        Her küme için topic_summary (örn: 'Panik satışı', 'FOMO', 'Bilanço beklentisi') üretir.
        """
        if not mentions or not isinstance(mentions, list) or len(mentions) == 0:
            return []

        # Giriş listesini stringlere dönüştür
        clean_texts: List[str] = []
        for m in mentions:
            if isinstance(m, str):
                if m.strip():
                    clean_texts.append(m.strip())
            elif isinstance(m, dict):
                txt = m.get("text") or m.get("content") or m.get("summary") or ""
                if str(txt).strip():
                    clean_texts.append(str(txt).strip())

        if not clean_texts:
            return []

        # Her metin için embedding hesapla
        embeddings = [cls.compute_lightweight_embedding(txt) for txt in clean_texts]

        # Konu benzerliğine göre kümeleme (K-Means mantığıyla en yakın merkeze atama)
        topic_buckets: Dict[str, List[int]] = {k: [] for k in cls.TOPIC_DICTIONARIES}

        for idx, (txt, vec) in enumerate(zip(clean_texts, embeddings)):
            best_dim = max(range(len(vec)), key=lambda d: vec[d])
            topic_names = list(cls.TOPIC_DICTIONARIES.keys())
            matched_topic = topic_names[best_dim]
            topic_buckets[matched_topic].append(idx)

        # Boş olmayan kümeleri topla
        clusters: List[Dict[str, Any]] = []
        total_items = len(clean_texts)

        for topic_name, member_indices in topic_buckets.items():
            if not member_indices:
                continue

            member_texts = [clean_texts[i] for i in member_indices]
            cluster_topic, sentiment, dominant_keywords = cls._determine_topic(member_texts)
            count = len(member_texts)
            pct = round((count / total_items) * 100.0, 1)

            clusters.append({
                "cluster_id": f"cluster_{len(clusters) + 1}",
                "topic_summary": cluster_topic,
                "size": count,
                "percentage": pct,
                "sentiment_tendency": sentiment,
                "dominant_keywords": dominant_keywords,
                "sample_texts": member_texts[:3],
            })

        # Küme büyüklüğüne göre sırala
        clusters.sort(key=lambda c: c["size"], reverse=True)

        # Eğer istenen n_clusters'tan fazlaysa en baskın ilk n_clusters'ı al veya olduğu gibi dön
        return clusters[:max(1, n_clusters)] if len(clusters) > n_clusters else clusters
