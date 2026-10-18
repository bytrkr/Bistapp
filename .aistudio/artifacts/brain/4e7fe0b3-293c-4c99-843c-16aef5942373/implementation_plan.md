# MT16 Bistapp — `tacticalCollector.ts` & `TacticalCard.tsx` Tek Kart Mimarisi Uygulama Planı

Mevcut arayüzde 15'ten fazla kuant motorunun (Z-Skor, L2 Bookmap, 9 Küp, Jüri, Prop MAM/PAMM, Korelasyon 9x9, OCO, Devre Kesici, Iceberg vb.) her birinin kendi UI kartını aynı anda ekrana basması ve aynı metriklerin (`Z-Skor`, `OBI`, `Jüri %`) 5 farklı yerde tekrarlanması sonucu oluşan **11 sayfalık ekran karmaşası** tamamen kaldırılacaktır. Tüm motorlar yalnızca veri üretecek, kararlar tek bir **Joker Kollektörde (`tacticalCollector.ts`)** birleşecek ve ekranda varsayılan olarak **tek bir kompakt kart (`TacticalCard.tsx`)** gösterilecektir.

---

## 1. Merkezi Kuant Kollektörü ve Joker Override (`src/utils/tacticalCollector.ts`)

Tüm alt motorların (`anomalyEngine`, `boardEngine / L2 Bookmap`, `forensicEngine`, `storyCubesEngine`, `composite V2`) çıktıları UI'ya doğrudan basılmak yerine `collectTacticalVerdict(inputs, marketType)` fonksiyonuna girecek ve tek bir **`UnifiedVerdict`** nesnesi üretecektir:

- **Çıktı Şeması (`UnifiedVerdict`)**:
  - `finalScore` (`0–100`), `action` (`'AL' | 'SAT' | 'BEKLE'`), `alarm` (`'DENGELI' | 'MANIPULASYON_ALARM' | 'SUPER_KRITIK_ALARM' | 'TAHTA_KONTROLU' | 'INCELEME_GEREKLI'`)
  - `reason`: Tek cümlelik, doğal dilde net sentez (örn. *"Dengeli tahta, sahte duvar yok, KAP 145M pozitif"* veya *"Satıcı kademeleri kalınlaşıyor, hacim sakin, direnç duvarı izleniyor"*).
  - Tekilleştirilmiş metrikler: `zScore`, `obi`, `juryScore`, `riskScore`, `coherence`, `expoScore`, `amplifier`, `breakoutMinutes`, `wallLot`, `wallPrice`, `isFakeWall`, `varPct`, `stopPrice`, `tpPrice`.
- **Joker Override Karar Ağacı ("Joker yeterliyse diğerleri çalışmaz")**:
  1. `if (composite.superCriticalFlag === true)` $\rightarrow$ **`SUPER_KRITIK_ALARM`** (Tüm alt sinyalleri ezer, acil koruma/çıkış).
  2. `else if (forensicRisk >= 75 || anomaly.verdict === 'ANOMALI_ALARM')` $\rightarrow$ **`MANIPULASYON_ALARM`** (`SAT`).
  3. `else if (hhiMonopol || massResistance > 75)` $\rightarrow$ **`TAHTA_KONTROLU`** (`BEKLE`).
  4. `else if (isFakeWall || Math.abs(zScore) >= zThreshold || storyCubes.is_poisoned)` $\rightarrow$ **`INCELEME_GEREKLI`**.
  5. `else` $\rightarrow$ **`DENGELI`** (Ağırlıklı ortalama skor ile `AL / BEKLE / SAT`).
- **3 Pazar Eşik Kalibrasyonu (`marketType: 'BIST' | 'CRYPTO' | 'NASDAQ'`)**:
  - **BIST**: Z-Skor anomali eşiği **`±1.8σ`**
  - **CRYPTO & NASDAQ**: Yüksek volatiliteye uyumlu Z-Skor eşiği **`±2.0σ`**

---

## 2. Tek Ana Kart ve Gizli Detay Çekmecesi (`src/components/TacticalCard.tsx`)

BIST, Kripto ve NASDAQ sekmelerinde üst üste binen çoklu pencereler kaldırılarak ana görünümde **yalnızca 1 ana `TacticalCard`** yer alacaktır (ekran ve PDF çıktısı **1 sayfa**):

- **Header (Üst Bar)**:
  - `#ASELS ₺340.25 (-3.06%) | Z -0.75σ | OBI +0.35 | 82/100 AL` (veya aktif pazar sembolü `#BTCUSDT`, `#NVDA`).
  - `SUPER_KRITIK_ALARM` veya `MANIPULASYON_ALARM` rozeti **yalnızca** ilgili Joker kuralı tetiklendiğinde görünür.
- **Body (Tek Satır Doğal Dil Karar Özeti)**:
  - Kollektörden gelen yalın ve anlaşılır tek cümlelik `reason` metni.
- **Footer (Risk & Aksiyon Çubuğu)**:
  - `Erime 12dk · Duvar 10.773 lot @ ₺344.00 · VaR %2.71 · Stop ₺330.10 · TP ₺347.05`
  - Sağ aksiyon butonları: **`[LLM Prompt Kopyala]`**, **`[.TOON İndir]`**, **`[HTML5 Rapor]`** ve **`[Detay v]`**.
- **Varsayılan Kapalı `[Detay v]` Çekmecesi (Drawer)**:
  - Varsayılan olarak **kapalıdır**; mobilde ve masaüstünde sonsuz kaydırmayı bitirir.
  - Kullanıcı **`[Detay v]`** butonuna bastığında açılan düzenli sekmeli çekmece içinde mevcut 5 motorun ve yardımcı modüllerin tüm derin verileri korunur:
    - *Sekme 1 — Kuant Küpleri & Jüri*: 9 Küp (Duygu, BofA, Derinlik, Takas, Anomali, Momentum, Vol, Mali, Rejim) + 6 Ajanlı Jüri Teşhis Matrisi.
    - *Sekme 2 — L2 Bookmap & Balina*: Bookmap L2 Isı Haritası, Kütle Direnci, Iceberg & Stealth Dedektörü.
    - *Sekme 3 — Adli Risk, XAI & EXPO_V2*: SPK Bayrakları, Wash Trade, Üstel Risk (`composite V2`), Hafıza Kanıtı.
    - *Sekme 4 — Portföy, Korelasyon & OCO*: 9x9 Korelasyon Kalkanı, Monte Carlo 252 Gün, Prop MAM/PAMM ($400k), Binance/Alpaca OCO Emir, Devre Kesici & Ping/Latency, Track Record.

---

## 3. Saf LLM Prompt Üretici (`src/utils/copyForLLM.ts`), `.TOON` & HTML5 Penceresi ve Canlı RSS

- **`src/utils/copyForLLM.ts`**:
  - Arayüze kalabalık kanıt zinciri basmaz; `UnifiedVerdict` + 5 motorun ham sayısal çıktıları + en son düşen RSS/KAP haberlerini birleştirerek harici LLM'lere (ChatGPT, Claude, Gemini, DeepSeek) doğrudan yapıştırılabilir **Yapılandırılmış Kuant Analiz Promptu** üretir.
- **HTML5 Rapor Penceresi & `.TOON` Çıktısı**:
  - `TacticalCard` alt barından tek tıkla 1 sayfalık temiz HTML5 Rapor Önizleme (`DynamicHtml5Container`) açılır ve `.toon` veri paketi indirilir/kopyalanır.
- **En Yeniden Eskiye Canlı RSS / KAP Akışı**:
  - `"Canlı Veri Bekleniyor..."` uyarı kilidi kaldırılarak canlı RSS ve KAP bildirimleri `timestamp` değerine göre **en son gelen veri en üstte** olacak şekilde doğrudan listelenir.
