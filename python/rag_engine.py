"""
Bistapp MT16 - RAG & KAP Retrieval Engine (rag_engine.py)
--------------------------------------------------------
KAP metinlerini ve geçmiş belgeleri indeksleyen, benzer dokümanları
arayıp LLM ve ajanlar için bağlam (context) üreten RAG motoru.
"""

from __future__ import annotations
import os
import math
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

RAG_STORAGE_PATH = Path(__file__).resolve().parent / "rag_store.json"

class RagEngine:
    """
    KAP ve Belge İlişkilendirme RAG (Retrieval-Augmented Generation) Motoru
    """
    _documents: List[str] = []

    @classmethod
    def _load_store(cls) -> None:
        """Kayıtlı dokümanları diskten yükler."""
        if RAG_STORAGE_PATH.is_file():
            try:
                with open(RAG_STORAGE_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        cls._documents = data
            except Exception:
                pass

    @classmethod
    def _save_store(cls) -> None:
        """Dokümanları diske kaydeder."""
        try:
            with open(RAG_STORAGE_PATH, "w", encoding="utf-8") as f:
                json.dump(cls._documents, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    @classmethod
    def add_documents(cls, texts: List[str]) -> int:
        """Gelen KAP metinlerini veya belgeleri veritabanına ekler."""
        cls._load_store()
        added_count = 0
        for t in texts:
            clean_t = str(t).strip()
            if clean_t and clean_t not in cls._documents:
                cls._documents.append(clean_t)
                added_count += 1
        cls._save_store()
        return added_count

    @classmethod
    def search_similar(cls, query: str, top_k: int = 3) -> List[str]:
        """Yeni gelen metne / sorguya en çok benzeyen geçmiş metinleri arar."""
        cls._load_store()
        if not cls._documents:
            return []

        q_lower = query.lower()
        q_words = set(q_lower.split())

        scored_docs = []
        for doc in cls._documents:
            doc_lower = doc.lower()
            doc_words = set(doc_lower.split())
            
            intersection = q_words.intersection(doc_words)
            union = q_words.union(doc_words)
            jaccard = len(intersection) / len(union) if union else 0.0

            sub_bonus = 0.5 if q_lower in doc_lower or doc_lower in q_lower else 0.0
            
            score = jaccard + sub_bonus
            scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        top_results = [doc for score, doc in scored_docs[:top_k] if score > 0.0]

        if not top_results and cls._documents:
            top_results = cls._documents[-top_k:]

        return top_results

    @classmethod
    def build_context(cls, query: str, top_k: int = 3) -> str:
        """Bulunan benzer dokümanları birleştirip LLM veya ajanlar için bağlam metni üretir."""
        similar = cls.search_similar(query, top_k=top_k)
        if not similar:
            return "Geçmiş benzer KAP belgesi veya bağlam bulunamadı."

        context_parts = [f"[RAG İLİŞKİLİ GEÇMİŞ BELGE {i+1}]:\n{doc}" for i, doc in enumerate(similar)]
        return "\n\n".join(context_parts)
