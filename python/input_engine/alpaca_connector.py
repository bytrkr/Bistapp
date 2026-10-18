"""
Bistapp MT16 - Alpaca Market Data Connector (alpaca_connector.py)
------------------------------------------------------------------
Alpaca API kullanarak NASDAQ hisseleri ve Kripto varlıklar için
anlık piyasa snapshot'larını çeker ve Bistapp TOON formatına dönüştürür.
"""

from __future__ import annotations
import os
import re
from pathlib import Path
from typing import Dict, Any, Optional, Union
from datetime import datetime

# alpaca-py kütüphanesi
try:
    from alpaca.data.historical import StockHistoricalDataClient, CryptoHistoricalDataClient
    from alpaca.data.requests import StockSnapshotRequest, CryptoSnapshotRequest
    from alpaca.data.models import Snapshot
except ImportError:
    StockHistoricalDataClient = CryptoHistoricalDataClient = None
    StockSnapshotRequest = CryptoSnapshotRequest = None
    Snapshot = None


def load_env_variables() -> Dict[str, str]:
    """
    .env dosyasını ve çevre değişkenlerini okuyarak ALPACA anahtarlarını temin eder.
    """
    env_vars: Dict[str, str] = {}
    
    # Proje kök dizinindeki .env dosyasını tara
    search_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path("/.env"),
        Path("/app/applet/.env")
    ]
    
    for path in search_paths:
        if path.is_file():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"").strip()
                        if k and k not in env_vars:
                            env_vars[k] = v
            except Exception:
                pass
            break

    # Çevre değişkenleri (os.environ) .env dosyasını ezebilir (priority)
    for key in ["ALPACA_API_KEY", "ALPACA_SECRET_KEY", "ALPACA_KEY_ID", "ALPACA_PAPER"]:
        val = os.getenv(key)
        if val:
            env_vars[key] = val

    # Alternatif anahtar isimleri desteği
    if "ALPACA_API_KEY" not in env_vars and "ALPACA_KEY_ID" in env_vars:
        env_vars["ALPACA_API_KEY"] = env_vars["ALPACA_KEY_ID"]

    return env_vars


class ToonSnapshot(str):
    """
    Bistapp standart TOON string formatını temsil eden ve aynı zamanda
    nümerik alanlara (price, volume, change_pct) nesne üzerinden erişim sağlayan sınıf.
    """
    def __new__(cls, content: str, meta: Optional[Dict[str, Any]] = None):
        instance = super().__new__(cls, content)
        instance._meta = meta or {}
        return instance

    @property
    def symbol(self) -> str:
        return self._meta.get("symbol", "")

    @property
    def price(self) -> float:
        return float(self._meta.get("price", 0.0))

    @property
    def volume(self) -> float:
        return float(self._meta.get("volume", 0.0))

    @property
    def change(self) -> float:
        return float(self._meta.get("change", 0.0))

    @property
    def change_pct(self) -> float:
        return float(self._meta.get("change_pct", 0.0))

    @property
    def market(self) -> str:
        return self._meta.get("market", "")

    def to_dict(self) -> Dict[str, Any]:
        return dict(self._meta)

    def to_toon_line(self) -> str:
        """Kısa tek satırlık TOON çıktısı (Örn: Sembol: AAPL, Fiyat: 150.5, Degisim: +1.2%)"""
        chg_sign = "+" if self.change_pct >= 0 else ""
        return f"Sembol: {self.symbol}, Fiyat: {self.price:.2f}, Degisim: {chg_sign}{self.change_pct:.2f}%"

    def to_toon_full(self) -> str:
        """Bistapp tam TOON/v3.5 token-optimized object notation çıktısı"""
        return str(self)


class AlpacaConnector:
    """
    Alpaca Market Data bağlantı yöneticisi.
    """
    def __init__(self, api_key: Optional[str] = None, secret_key: Optional[str] = None):
        env_vars = load_env_variables()
        self.api_key = api_key or env_vars.get("ALPACA_API_KEY", "")
        self.secret_key = secret_key or env_vars.get("ALPACA_SECRET_KEY", "")

        if not self.api_key or not self.secret_key:
            # Eksik anahtar durumunda açık uyarı
            print("[WARN] Alpaca API anahtarları (.env) bulunamadı. Lütfen ALPACA_API_KEY ve ALPACA_SECRET_KEY tanımlayınız.")

        # alpaca-py istemcilerini ilklendir
        self.stock_client = StockHistoricalDataClient(
            api_key=self.api_key,
            secret_key=self.secret_key
        )
        self.crypto_client = CryptoHistoricalDataClient(
            api_key=self.api_key,
            secret_key=self.secret_key
        )

    def _format_toon(
        self,
        symbol: str,
        market: str,
        price: float,
        change: float,
        change_pct: float,
        volume: float,
        prev_close: float,
        timestamp_str: str,
        high: Optional[float] = None,
        low: Optional[float] = None
    ) -> ToonSnapshot:
        """
        Snapshot verisini Bistapp standart TOON formatına dönüştürür.
        """
        chg_sign = "+" if change_pct >= 0 else ""
        summary_line = f"Sembol: {symbol}, Fiyat: {price:.2f}, Degisim: {chg_sign}{change_pct:.2f}%"
        
        toon_content = (
            f"#TOON/v3.5 schema=BISTAPP_ALPACA_SNAPSHOT\n"
            f"@asset{{sym:{symbol};mkt:{market};px:{price:.2f};chg:{chg_sign}{change_pct:.2f}%;vol:{int(volume)};prev_close:{prev_close:.2f};ts:{timestamp_str}}}\n"
            f"@summary{{{summary_line}}}"
        )
        
        meta = {
            "symbol": symbol,
            "market": market,
            "price": price,
            "change": change,
            "change_pct": change_pct,
            "volume": volume,
            "prev_close": prev_close,
            "high": high if high is not None else price,
            "low": low if low is not None else price,
            "timestamp": timestamp_str,
            "summary_line": summary_line
        }
        
        return ToonSnapshot(toon_content, meta=meta)

    def get_stock_snapshot(self, symbol: str) -> ToonSnapshot:
        """
        Verilen bir NASDAQ / US hisse sembolü (örn: AAPL, NVDA, TSLA) için anlık
        fiyat, hacim ve günlük değişim verilerini çekip Bistapp TOON formatında döndürür.
        """
        clean_symbol = symbol.strip().upper()
        
        try:
            req = StockSnapshotRequest(symbol_or_symbols=clean_symbol)
            res = self.stock_client.get_stock_snapshot(req)
            
            raw_snap = res.get(clean_symbol) if isinstance(res, dict) else res
            if not raw_snap:
                raise ValueError(f"Alpaca üzerinden {clean_symbol} için snapshot verisi bulunamadı.")

            # Fiyat belirleme: latest_trade -> minute_bar -> daily_bar
            price = 0.0
            if getattr(raw_snap, "latest_trade", None) and getattr(raw_snap.latest_trade, "price", None):
                price = float(raw_snap.latest_trade.price)
            elif getattr(raw_snap, "minute_bar", None) and getattr(raw_snap.minute_bar, "close", None):
                price = float(raw_snap.minute_bar.close)
            elif getattr(raw_snap, "daily_bar", None) and getattr(raw_snap.daily_bar, "close", None):
                price = float(raw_snap.daily_bar.close)

            # Önceki gün kapanışı (Previous daily bar close)
            prev_close = price
            if getattr(raw_snap, "previous_daily_bar", None) and getattr(raw_snap.previous_daily_bar, "close", None):
                prev_close = float(raw_snap.previous_daily_bar.close)

            # Değişim hesabı
            change = price - prev_close
            change_pct = (change / prev_close * 100.0) if prev_close > 0 else 0.0

            # Günlük toplam hacim
            volume = 0.0
            high = price
            low = price
            if getattr(raw_snap, "daily_bar", None):
                volume = float(getattr(raw_snap.daily_bar, "volume", 0.0) or 0.0)
                high = float(getattr(raw_snap.daily_bar, "high", price) or price)
                low = float(getattr(raw_snap.daily_bar, "low", price) or price)

            # Zaman damgası
            ts_obj = datetime.utcnow()
            if getattr(raw_snap, "latest_trade", None) and getattr(raw_snap.latest_trade, "timestamp", None):
                ts_obj = raw_snap.latest_trade.timestamp
            ts_str = ts_obj.strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(ts_obj, "strftime") else str(ts_obj)

            return self._format_toon(
                symbol=clean_symbol,
                market="NASDAQ",
                price=price,
                change=change,
                change_pct=change_pct,
                volume=volume,
                prev_close=prev_close,
                timestamp_str=ts_str,
                high=high,
                low=low
            )

        except Exception as e:
            # Hata durumunda güvenli koruma
            err_msg = f"Alpaca stock snapshot hatası ({clean_symbol}): {str(e)}"
            return ToonSnapshot(
                f"#TOON/v3.5 schema=BISTAPP_ALPACA_SNAPSHOT error=true\n@error{{{err_msg}}}\nSembol: {clean_symbol}, Fiyat: 0.00, Degisim: +0.00%",
                meta={
                    "symbol": clean_symbol,
                    "market": "NASDAQ",
                    "price": 0.0,
                    "change": 0.0,
                    "change_pct": 0.0,
                    "volume": 0.0,
                    "error": str(e),
                    "summary_line": f"Sembol: {clean_symbol}, Fiyat: 0.00, Degisim: +0.00%"
                }
            )

    def get_crypto_snapshot(self, symbol: str) -> ToonSnapshot:
        """
        Verilen bir Kripto sembolü (örn: BTC/USD, ETH/USD, BTCUSD, BTC/USDT) için
        anlık verileri çekip Bistapp TOON formatında döndürür.
        """
        raw_sym = symbol.strip().upper()
        
        # Alpaca crypto formatı genellikle 'BTC/USD' biçimindedir
        if "/" not in raw_sym:
            if raw_sym.endswith("USD"):
                clean_symbol = f"{raw_sym[:-3]}/USD"
            elif raw_sym.endswith("USDT"):
                clean_symbol = f"{raw_sym[:-4]}/USDT"
            else:
                clean_symbol = f"{raw_sym}/USD"
        else:
            clean_symbol = raw_sym

        try:
            req = CryptoSnapshotRequest(symbol_or_symbols=clean_symbol)
            res = self.crypto_client.get_crypto_snapshot(req)
            
            raw_snap = res.get(clean_symbol) if isinstance(res, dict) else res
            if not raw_snap:
                raise ValueError(f"Alpaca üzerinden {clean_symbol} için crypto snapshot verisi bulunamadı.")

            # Anlık Fiyat
            price = 0.0
            if getattr(raw_snap, "latest_trade", None) and getattr(raw_snap.latest_trade, "price", None):
                price = float(raw_snap.latest_trade.price)
            elif getattr(raw_snap, "minute_bar", None) and getattr(raw_snap.minute_bar, "close", None):
                price = float(raw_snap.minute_bar.close)
            elif getattr(raw_snap, "daily_bar", None) and getattr(raw_snap.daily_bar, "close", None):
                price = float(raw_snap.daily_bar.close)

            # Önceki Kapanış
            prev_close = price
            if getattr(raw_snap, "previous_daily_bar", None) and getattr(raw_snap.previous_daily_bar, "close", None):
                prev_close = float(raw_snap.previous_daily_bar.close)

            # Günlük Değişim
            change = price - prev_close
            change_pct = (change / prev_close * 100.0) if prev_close > 0 else 0.0

            # Hacim
            volume = 0.0
            high = price
            low = price
            if getattr(raw_snap, "daily_bar", None):
                volume = float(getattr(raw_snap.daily_bar, "volume", 0.0) or 0.0)
                high = float(getattr(raw_snap.daily_bar, "high", price) or price)
                low = float(getattr(raw_snap.daily_bar, "low", price) or price)

            # Zaman Damgası
            ts_obj = datetime.utcnow()
            if getattr(raw_snap, "latest_trade", None) and getattr(raw_snap.latest_trade, "timestamp", None):
                ts_obj = raw_snap.latest_trade.timestamp
            ts_str = ts_obj.strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(ts_obj, "strftime") else str(ts_obj)

            return self._format_toon(
                symbol=clean_symbol,
                market="CRYPTO",
                price=price,
                change=change,
                change_pct=change_pct,
                volume=volume,
                prev_close=prev_close,
                timestamp_str=ts_str,
                high=high,
                low=low
            )

        except Exception as e:
            err_msg = f"Alpaca crypto snapshot hatası ({clean_symbol}): {str(e)}"
            return ToonSnapshot(
                f"#TOON/v3.5 schema=BISTAPP_ALPACA_SNAPSHOT error=true\n@error{{{err_msg}}}\nSembol: {clean_symbol}, Fiyat: 0.00, Degisim: +0.00%",
                meta={
                    "symbol": clean_symbol,
                    "market": "CRYPTO",
                    "price": 0.0,
                    "change": 0.0,
                    "change_pct": 0.0,
                    "volume": 0.0,
                    "error": str(e),
                    "summary_line": f"Sembol: {clean_symbol}, Fiyat: 0.00, Degisim: +0.00%"
                }
            )


# ==============================================================================
# KOLAY DOĞRUDAN ERİŞİM FONKSİYONLARI (Modül seviyesinde fonksiyonlar)
# ==============================================================================

# Global tekil (singleton) konnektör örneği
_default_connector: Optional[AlpacaConnector] = None


def get_connector() -> AlpacaConnector:
    """Tekil AlpacaConnector örneğini döndürür."""
    global _default_connector
    if _default_connector is None:
        _default_connector = AlpacaConnector()
    return _default_connector


def get_stock_snapshot(symbol: str) -> ToonSnapshot:
    """
    Kullanıcı talebinde belirtilen fonksiyon:
    Verilen bir NASDAQ sembolü (örn: AAPL, NVDA) için anlık fiyat, hacim ve günlük değişim
    verilerini çeker ve Bistapp TOON formatında döndürür.
    """
    return get_connector().get_stock_snapshot(symbol)


def get_crypto_snapshot(symbol: str) -> ToonSnapshot:
    """
    Kullanıcı talebinde belirtilen fonksiyon:
    Verilen Kripto sembolü (örn: BTC/USD, ETH/USD) için anlık veriyi çeker ve
    Bistapp TOON formatında döndürür.
    """
    return get_connector().get_crypto_snapshot(symbol)


if __name__ == "__main__":
    import sys
    test_symbol = sys.argv[1] if len(sys.argv) > 1 else "AAPL"
    
    print("=" * 60)
    print("Bistapp MT16 - Alpaca Connector Testi")
    print("=" * 60)
    
    if "/" in test_symbol or test_symbol.upper().startswith(("BTC", "ETH", "SOL")):
        print(f"📡 Kripto Snapshot çekiliyor: {test_symbol}...")
        res = get_crypto_snapshot(test_symbol)
    else:
        print(f"📡 Hisse Snapshot çekiliyor: {test_symbol}...")
        res = get_stock_snapshot(test_symbol)
        
    print("\n[TOON Standart Çıktı]:")
    print(res)
    print("\n[Tek Satır TOON Özeti]:")
    print(res.to_toon_line())
    print("\n[Ayrıştırılmış Meta Sözlüğü]:")
    print(res.to_dict())
    print("=" * 60)
