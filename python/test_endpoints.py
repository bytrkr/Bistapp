"""
Bistapp MT16 - FastAPI Endpoint Test Script (test_endpoints.py)
----------------------------------------------------------------
FastAPI TestClient kullanarak:
1. /api/alpaca/global_data (AAPL NASDAQ verisi)
2. /api/trend/analyze (ASELS Google Trends verisi)
uç noktalarını test eder ve TOON formatlı çıktıları konsola yazdırır.
"""

import sys
import os
import json

# Python import yoluna kök dizini ekle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from server import app

def run_tests():
    client = TestClient(app)
    
    print("=" * 70)
    print("🚀 BISTAPP MT16 - FASTAPI TESTCLIENT ENTEGRASYON TESTLERİ")
    print("=" * 70)
    
    # -------------------------------------------------------------
    # TEST 1: Alpaca NASDAQ Verisi (AAPL) - JSON Format
    # -------------------------------------------------------------
    print("\n[TEST 1] GET /api/alpaca/global_data?symbol=AAPL&asset_type=stock")
    resp1 = client.get("/api/alpaca/global_data?symbol=AAPL&asset_type=stock")
    print(f"Status Code: {resp1.status_code}")
    if resp1.status_code == 200:
        data1 = resp1.json()
        print("✅ Başarılı Yanıt!")
        print(f"📍 Tek Satır TOON: {data1.get('toon_line')}")
        print("\n📄 Tam TOON Çıktısı:")
        print(data1.get("toon"))
        print("\n📊 Meta Veriler:")
        print(json.dumps(data1.get("data"), indent=2, ensure_ascii=False))
    else:
        print(f"❌ Hata: {resp1.text}")

    # -------------------------------------------------------------
    # TEST 2: Alpaca Ham TOON Formatı (format=toon)
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[TEST 2] GET /api/alpaca/global_data?symbol=AAPL&asset_type=stock&format=toon (Ham TOON)")
    resp2 = client.get("/api/alpaca/global_data?symbol=AAPL&asset_type=stock&format=toon")
    print(f"Status Code: {resp2.status_code}")
    print(f"Content-Type: {resp2.headers.get('content-type')}")
    print(resp2.text)

    # -------------------------------------------------------------
    # TEST 3: Google Trends FOMO Analizi (ASELS)
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[TEST 3] GET /api/trend/analyze?keyword=ASELS")
    resp3 = client.get("/api/trend/analyze?keyword=ASELS")
    print(f"Status Code: {resp3.status_code}")
    if resp3.status_code == 200:
        data3 = resp3.json()
        print("✅ Başarılı Yanıt!")
        print(f"📍 Tek Satır TOON: {data3.get('toon_line')}")
        print(f"⚡ FOMO Bayrağı: {data3.get('fomo_flag')} (Momentum: %{data3.get('momentum_pct')})")
        print("\n📄 Tam TOON Çıktısı:")
        print(data3.get("toon"))
    else:
        print(f"❌ Hata: {resp3.text}")

    # -------------------------------------------------------------
    # TEST 4: Çoklu Ajan evaluate_v2 (AAPL - Alpaca Canlı Fiyat)
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[TEST 4] GET /api/agents/evaluate_v2?ticker=AAPL (Alpaca Çoklu Ajan Kararı)")
    resp4 = client.get("/api/agents/evaluate_v2?ticker=AAPL")
    print(f"Status Code: {resp4.status_code}")
    if resp4.status_code == 200:
        data4 = resp4.json()
        tech = data4["agent_votes"]["technical"]
        print(f"✅ Karar: {data4.get('verdict')} (Bileşik Skor: {data4.get('composite_score')}/100)")
        print(f"📡 Teknik Ajan Fiyatı: ${tech['key_metrics']['price']} (Kaynak: {tech['key_metrics']['source']})")
        print(f"💬 Teknik Gerekçe: {tech['reasoning']}")
        print(f"\n📄 Çoklu Ajan TOON:\n{data4.get('toon')}")
    else:
        print(f"❌ Hata: {resp4.text}")

    # -------------------------------------------------------------
    # TEST 5: MÜNAZARA 4 - Google Trends FOMO vs Teknik (ASELS)
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[TEST 5] GET /api/agents/evaluate_v2?ticker=ASELS&force_fomo=true (MÜNAZARA 4)")
    resp5 = client.get("/api/agents/evaluate_v2?ticker=ASELS&force_fomo=true")
    print(f"Status Code: {resp5.status_code}")
    if resp5.status_code == 200:
        data5 = resp5.json()
        deb = data5.get("debate_result", {})
        print(f"✅ Münazara Gerçekleşti mi: {deb.get('debate_occurred')}")
        print(f"⚔️ İtiraz Sayısı: {len(deb.get('challenges', []))}")
        for ch in deb.get("challenges", []):
            print(f"   -> {ch['challenger_name']} -> {ch['target_name']}")
            print(f"      İtiraz Tipi: {ch['conflict_type']}")
            print(f"      Uygulanan Ceza: -{ch['penalty_applied']} puan ({ch['target_score_before']} -> {ch['target_score_after']})")
            print(f"      Argüman: {ch['argument']}")
    else:
        print(f"❌ Hata: {resp5.text}")

    # -------------------------------------------------------------
    # TEST 6: Multimodal Belge Yükleme ve Ajan Analizi (PDF Upload)
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[TEST 6] POST /api/input/upload_and_analyze (KAP PDF Belgesi Gönderimi)")
    import io, pymupdf
    pdf_bytes = io.BytesIO()
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), 'KAP BİLDİRİMİ: ASELSAN İHRACAT SÖZLEŞMESİ\n145 Milyon USD yeni sipariş ve rekor büyüme beklenmektedir.', fontsize=12)
    doc.save(pdf_bytes)
    doc.close()
    pdf_bytes.seek(0)

    files = {'file': ('aselsan_kap.pdf', pdf_bytes, 'application/pdf')}
    data = {'ticker': 'ASELS'}
    resp6 = client.post('/api/input/upload_and_analyze', files=files, data=data)
    print(f"Status Code: {resp6.status_code}")
    if resp6.status_code == 200:
        data6 = resp6.json()
        print(f"✅ Karar: {data6.get('verdict')} (Bileşik Skor: {data6.get('composite_score')}/100)")
        print(f"📄 Yüklenen Belge Meta: {data6.get('metadata', {}).get('uploaded_file')}")
        print(f"💬 KAP/Duygu Ajanı Skoru: {data6['agent_votes']['sentiment']['score']}")
        print(f"💬 Nihai Özet: {data6.get('summary')}")
    else:
        print(f"❌ Hata: {resp6.text}")

    # -------------------------------------------------------------
    # TEST 7: Görsel ve Grafik Analizi (POST /api/input/analyze_image)
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[TEST 7] POST /api/input/analyze_image (Midas KDM / Grafik Görseli)")
    from PIL import Image
    img_bytes = io.BytesIO()
    img = Image.new('RGB', (320, 240), color=(15, 23, 42))
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)

    files = {'file': ('midas_kademe_asels.png', img_bytes, 'image/png')}
    data = {'ticker': 'ASELS'}
    resp7 = client.post('/api/input/analyze_image', files=files, data=data)
    print(f"Status Code: {resp7.status_code}")
    if resp7.status_code == 200:
        data7 = resp7.json()
        print(f"✅ Karar: {data7.get('verdict')} (Bileşik Skor: {data7.get('composite_score')}/100)")
        v_meta = data7.get('metadata', {}).get('vision_analysis', {})
        print(f"📍 TOON Tek Satır: {v_meta.get('toon_line')}")
        print(f"💬 Görsel Yorumu: {v_meta.get('comment')}")
        print(f"📊 Derinlik Seviyeleri: {v_meta.get('kademe_summary')}")
    else:
        print(f"❌ Hata: {resp7.text}")

    # -------------------------------------------------------------
    # TEST 8: Belge İhracı Servisi (POST /api/export/report)
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[TEST 8] POST /api/export/report (Excel & Word İndirilebilir Rapor Üretimi)")
    # Excel Testi
    resp8_excel = client.post('/api/export/report', json={'ticker': 'ASELS', 'format': 'excel'})
    print(f"Excel Status Code: {resp8_excel.status_code}")
    print(f"Excel Content-Type: {resp8_excel.headers.get('content-type')}")
    print(f"Excel Dosya Boyutu: {len(resp8_excel.content)} bytes")
    assert resp8_excel.status_code == 200
    assert len(resp8_excel.content) > 2000

    # Word Testi
    resp8_word = client.post('/api/export/report', json={'ticker': 'ASELS', 'format': 'word', 'analysis_text': 'Münazara ve görsel derinlik analizi tamamlandı.'})
    print(f"\nWord Status Code: {resp8_word.status_code}")
    print(f"Word Content-Type: {resp8_word.headers.get('content-type')}")
    print(f"Word Dosya Boyutu: {len(resp8_word.content)} bytes")
    assert resp8_word.status_code == 200
    assert len(resp8_word.content) > 5000

    print("\n" + "=" * 70)
    print("🎉 TÜM FASTAPI VE ÇOKLU AJAN ENTEGRASYON TESTLERİ TAMAMLANDI!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
