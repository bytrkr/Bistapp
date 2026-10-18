"""
Bistapp MT16 - Aracı Kurum Dağılımı (AKD) ve Takas Analiz Motoru (akd_takas_engine.py)
-----------------------------------------------------------------------------------
BIST hisseleri için aracı kurum dağılımı (AKD), takas konsantrasyonu (HHI),
BofA / Garanti / İş Yatırım net lot akışlarını analiz eder ve #TOON/v3.5 formatında döner.
"""

from __future__ import annotations
import os
import sys
import random
import time
from typing import Dict, Any, List, Optional

# Modül import yolları
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class AkdTakasEngine:
    """
    Aracı Kurum Dağılımı ve Takas Analiz Sınıfı
    """

    @classmethod
    def analyze_akd_takas(cls, ticker: str) -> Dict[str, Any]:
        """
        Belirtilen BIST hissesi için aracı kurum dağılımı ve takas analizi yapar.
        İlk 3 kurumun net alım/satım durumuna göre 'Kurumsal Toplama' veya 'Dağıtım' üretir.
        """
        clean_ticker = (ticker or "ASELS").strip().upper().replace(".IS", "")
        
        # Deterministik ama dinamik mock veriler (hisse adına göre seed)
        seed_val = sum(ord(c) for c in clean_ticker)
        rnd = random.Random(seed_val + int(time.time() / 3600)) # Saatte bir güncellenen mock

        bofa_lot = rnd.randint(-180_000, 250_000)
        garanti_lot = rnd.randint(-120_000, 120_000)
        is_yatirim_lot = rnd.randint(-90_000, 150_000)
        
        top3_net_lot = bofa_lot + garanti_lot + is_yatirim_lot
        hhi_concentration = round(rnd.uniform(0.12, 0.45), 3)

        if top3_net_lot > 80_000:
            signal_type = "KURUMSAL_TOPLAMA"
            signal_label = "Kurumsal Toplama (Akümülasyon)"
            summary = f"{clean_ticker} tahtasında ilk 3 kurum net +{top3_net_lot:,} lot alımda: Güçlü kurumsal toplama (BofA: {bofa_lot:+,} lot)."
        elif top3_net_lot < -80_000:
            signal_type = "DAGITIM"
            signal_label = "Kurumsal Dağıtım (Mal Çıkışı)"
            summary = f"{clean_ticker} tahtasında ilk 3 kurum net {top3_net_lot:,} lot satımda: Aracı kurum dağılımı negatif."
        else:
            signal_type = "DENGELI"
            signal_label = "Dengeli Kurumsal Akış"
            summary = f"{clean_ticker} tahtasında aracı kurum işlemleri dengeli seyrediyor (Top 3 Net: {top3_net_lot:+,} lot)."

        toon = (
            f"#TOON/v3.5 schema=BISTAPP_AKD_TAKAS\n"
            f"@akd{{sym:{clean_ticker};top3_net:{top3_net_lot:+,};bofa:{bofa_lot:+,};garanti:{garanti_lot:+,};isyat:{is_yatirim_lot:+,}}}\n"
            f"@metrics{{hhi:{hhi_concentration};signal:{signal_type}}}\n"
            f"@summary{{{summary}}}"
        )

        return {
            "ticker": clean_ticker,
            "top3_net_lot": top3_net_lot,
            "bofa_net_lot": bofa_lot,
            "garanti_net_lot": garanti_lot,
            "is_yatirim_net_lot": is_yatirim_lot,
            "hhi_concentration": hhi_concentration,
            "signal_type": signal_type,
            "signal_label": signal_label,
            "summary": summary,
            "toon": toon,
            "timestamp": time.time(),
        }
