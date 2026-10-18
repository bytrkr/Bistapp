# Bistapp MT16 - Kuant Terminali ve Çoklu Ajan Karar Destek Sistemi

Bistapp MT16, Borsa İstanbul (BIST), NASDAQ ve Kripto piyasaları için geliştirilmiş otonom çoklu ajan (Multi-Agent) analiz terminalidir. 6 uzman ajan (Teknik, Takas & Derinlik, Temel, KAP Sentiment, Şirket Doğrudan, Google Trend/FOMO), çapraz itiraz (Debate) protokolü, sosyal manipülasyon kalkanı, AKD/Takas analizi, vergi & reel getiri hesaplama, Telegram bot bildirimleri ve otonom zamanlayıcı modüllerini içerir.

---

## 🛠️ Sistem Gereksinimleri

- **Python** >= 3.10
- **Node.js** >= 18.x ve npm

---

## 📦 Yerel Kurulum Adımları (Linux / Ubuntu / macOS / Windows)

### 1. Projeyi Klonlayın veya Klasöre Geçin
```bash
cd /path/to/bistapp
```

### 2. Ortam Değişkenlerini Ayarlayın
`.env.example` dosyasını `.env` olarak kopyalayın ve gerekli anahtarları (Groq, OpenRouter, Telegram Bot Token vb.) düzenleyin:
```bash
cp .env.example .env
```

### 3. Backend (Python / FastAPI) Kurulumu
```bash
# Sanal ortam oluşturma ve etkinleştirme
python3 -m venv venv
source venv/bin/activate  # Windows için: venv\Scripts\activate

# Bağımlılıkları yükleme
pip install --upgrade pip
pip install -r python/requirements.txt
```

### 4. Frontend (React / Vite) Kurulumu
Yeni bir terminal açın (veya arka planda):
```bash
npm install
```

---

## 🚀 Projeyi Çalıştırma

### 1. Python FastAPI Backend Sunucusunu Başlatın
```bash
source venv/bin/activate  # Windows için: venv\Scripts\activate
cd python
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
*Backend API Adresi:* `http://127.0.0.1:8001` (Swagger Dokümantasyonu: `http://127.0.0.1:8001/docs`)

### 2. React Frontend Arayüzünü Başlatın
Proje kök dizininde:
```bash
npm run dev
```
*Frontend Arayüz Adresi:* `http://localhost:3000`

---

## 🤖 Otomatik Kurulum Betiği (`setup.sh`)

Linux / Ubuntu sistemlerde tek tıkla kurulum ve çalıştırma için kök dizindeki `setup.sh` betiğini çalıştırabilirsiniz:
```bash
chmod +x setup.sh
./setup.sh
```
