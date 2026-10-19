# Bistapp MT16 - Kuant Terminali ve Otonom Karar Destek Sistemi

Bistapp MT16, Borsa İstanbul (BIST), NASDAQ ve Kripto piyasaları için geliştirilmiş kurumsal düzeyde **Çoklu Ajan (Multi-Agent) Kuant Analiz ve Karar Destek Terminalidir**. 

---

## 🚀 Lansman ve Deployment Rehberi (Production Deployment Guide)

Bu rehber, Bistapp MT16 sistemini yerel geliştirme ortamından bir üretim (Production) sunucusuna (Ubuntu VPS, AWS, DigitalOcean, Google Cloud Run veya Docker) nasıl taşıyacağınızı adım adım açıklar.

---

### 1. Sistem Gereksinimleri
- **OS:** Ubuntu 22.04 LTS (önerilen) veya uyumlu Linux dağıtımları / Windows / macOS
- **Python:** >= 3.10 (FastAPI backend kernel için)
- **Node.js:** >= 18.x ve npm (React/Vite frontend için)
- **Bellek (RAM):** En az 2 GB RAM (önerilen 4 GB)

---

### 2. Otomatik Kurulum (`setup.sh`)
Linux / Ubuntu sistemlerde tek tıkla kurulum için kök dizindeki betiği çalıştırabilirsiniz:
```bash
chmod +x setup.sh
./setup.sh
```

---

### 3. Manuel Kurulum ve Adım Adım Deployment

#### Adım 3.1: Depo Klonlama ve Ortam Dosyası
```bash
cd /opt/bistapp
cp .env.example .env
```
`.env` dosyasını düzenleyerek gerekli API anahtarlarınızı (`GROQ_API_KEY`, `OPENROUTER_API_KEY`, `TELEGRAM_BOT_TOKEN`, `STRIPE_SECRET_KEY` vb.) tanımlayın.

#### Adım 3.2: Backend (Python / FastAPI) Hazırlığı
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r python/requirements.txt
```

#### Adım 3.3: Frontend (React / Vite) Üretim Derlemesi (Production Build)
```bash
npm install
npm run build
```
*Bu komut kök dizinde `dist/` klasörünü oluşturur.*

---

### 4. Üretim Ortamında Servislerin Çalıştırılması (Systemd ve Uvicorn)

Üretim ortamında uygulamanın 7/24 kesintisiz çalışması için **systemd** servisleri oluşturulması önerilir.

#### Backend Systemd Servisi (`/etc/systemd/system/bistapp-backend.service`):
```ini
[Unit]
Description=Bistapp MT16 FastAPI Backend Kernel
After=network.target

[Service]
User=root
WorkingDirectory=/opt/bistapp/python
ExecStart=/opt/bistapp/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

Servisi etkinleştirip başlatın:
```bash
sudo systemctl daemon-reload
sudo systemctl enable bistapp-backend
sudo systemctl start bistapp-backend
sudo systemctl status bistapp-backend
```

---

### 5. Nginx Ters Vekil (Reverse Proxy) ve SSL Yapılandırması

Nginx kullanarak statik frontend dosyalarını servis edebilir ve `/api/` isteklerini Python backend'e yönlendirebilirsiniz.

#### Nginx Konfigürasyonu (`/etc/nginx/sites-available/bistapp`):
```nginx
server {
    listen 80;
    server_name bistapp.yourdomain.com;

    root /opt/bistapp/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

Nginx'i etkinleştirip Certbot ile SSL sertifikası (Let's Encrypt) ekleyin:
```bash
sudo ln -s /etc/nginx/sites-available/bistapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL (HTTPS) Kurulumu
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d bistapp.yourdomain.com
```

---

### 6. Docker ile Konteyner Dağıtımı (`Dockerfile` & `docker-compose.yml`)

Eğer konteyner tabanlı dağıtım tercih ediyorsanız, projeyi Docker ile ayağa kaldırabilirsiniz:

```yaml
version: '3.8'

services:
  bistapp:
    build: .
    ports:
      - "3000:3000"
      - "8001:8001"
    environment:
      - PYTHON_KERNEL_PORT=8001
    restart: always
```

Konteyneri başlatmak için:
```bash
docker-compose up -d --build
```

---

## 💡 Mimari Özet ve Entegre Modüller
- **6 Uzman Kuant Ajanı + Skeptik & Güven Ajanları:** Teknik, Derinlik, Temel, Sentiment, Şirket İçi, Trend, Skeptik Filtre ve Güven Kalkanı.
- **Münazara Protokolü (9 Kural):** Çapraz itirazlar ve skor revizyonları.
- **Sosyal Manipülasyon Kalkanı & AKD/Takas:** BofA/Garanti akışları, HHI konsantrasyonu ve pump & dump tespiti.
- **Vergi ve Reel Getiri Motoru:** TCMB kur enflasyon düzeltmesi ve GVK Geçici 67 stopaj matrahı.
- **Risk & Pozisyon Yönetimi:** ATR, Z-Skor ve Kelly Kriteri dinamik lot tahsisi, PortfolioGuard korelasyon süzgeci ve Slippage/Komisyon muhasebesi.
- **Monte Carlo Fiyat Yolu Simülasyonu:** GBM tabanlı %5, %50, %95 olasılık projeksiyonu.
- **RAG Hafızası & KAP İlişkilendirme:** Geçmiş benzer doküman ve duyuruları hatırlama ve bağlam üretme.
