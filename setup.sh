#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 BISTAPP MT16 - OTONOM KURULUM VE BAŞLATMA BETİĞİ"
echo "=========================================================="

# 1. Python Venv Kontrolü ve Kurulumu
echo "📦 Python sanal ortamı (venv) hazırlanıyor..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

echo "📚 Python bağımlılıkları yükleniyor (requirements.txt)..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r python/requirements.txt

# 2. Node.js Paketleri Kurulumu
echo "📦 Node.js bağımlılıkları yükleniyor (npm install)..."
npm install

# 3. .env Kontrolü
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "⚙️ .env.example dosyası .env olarak kopyalanıyor..."
        cp .env.example .env
    fi
fi

echo "=========================================================="
echo "✅ Kurulum tamamlandı!"
echo "----------------------------------------------------------"
echo "💡 Sunucuları başlatmak için şu komutları kullanabilirsiniz:"
echo "   1. Backend (Python): source venv/bin/activate && cd python && python3 -m uvicorn server:app --host 0.0.0.0 --port 8001"
echo "   2. Frontend (React): npm run dev"
echo "=========================================================="
