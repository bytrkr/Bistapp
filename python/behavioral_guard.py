"""
Bistapp MT16 - Psikolojik Sınır ve Niyet Analizcisi (behavioral_guard.py)
-----------------------------------------------------------------------
Kullanıcının işlem emirlerini davranışsal finans ve bilişsel önyargı
(Behavioral Bias & Execution Guard) süzgecinden geçirerek şu riskleri engeller:
1. Revenge Trading (İntikam İşlemi): Üst üste kayıptan sonra pozisyonu katlama.
2. FOMO Alımı: Son 3 günde aşırı primli hisseye piyasa emriyle dalma.
3. Panik Satışı: Piyasa çalkantısında sağlam hisseyi dipte zararına boşaltma.
"""

from __future__ import annotations
import time
from typing import Dict, Any, List, Optional


class BehavioralGuard:
    """
    Davranışsal Finans ve Psikolojik Emir Kalkanı (Execution Guard)
    """

    @classmethod
    def check_execution_guard(
        cls,
        user_id: str,
        trade_request: Dict[str, Any],
        recent_trades: Optional[List[Dict[str, Any]]] = None,
        current_market_state: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Emir öncesi psikolojik denetim yapar.
        Dönüş: approval_status ('APPROVED', 'REJECTED', 'WARNING'), reason, detected_bias.
        """
        trades = recent_trades or []
        market = current_market_state or {}
        req = trade_request or {}

        ticker = str(req.get("ticker", "BIST")).upper()
        side = str(req.get("side", "BUY")).upper()
        order_type = str(req.get("order_type", "LIMIT")).upper()
        amount_tl = float(req.get("amount_tl") or (float(req.get("lot", 0)) * float(req.get("price", 0))) or 50000.0)

        now = time.time()
        one_hour_ago = now - 3600  # Son 1 saat

        # ----------------------------------------------------------------------
        # 1. REVENGE TRADING (İNTİKAM İŞLEMİ) KONTROLÜ
        # Son 1 saatte 2 ardışık zarar ve pozisyonu 3 katına çıkarma girişimi
        # ----------------------------------------------------------------------
        recent_1h_trades = [
            t for t in trades
            if float(t.get("timestamp", now)) >= one_hour_ago
        ]

        # Ardışık son 2 işlem zarar mı?
        consecutive_losses = 0
        loss_amounts: List[float] = []

        for t in reversed(recent_1h_trades):
            pnl = float(t.get("pnl", 0.0) or t.get("pnl_tl", 0.0) or (t.get("pnl_pct", 0.0)))
            if pnl < 0:
                consecutive_losses += 1
                loss_amounts.append(float(t.get("amount_tl", 20000.0)))
            else:
                break

        if consecutive_losses >= 2 and loss_amounts:
            avg_prev_amount = sum(loss_amounts) / len(loss_amounts)
            if amount_tl >= (avg_prev_amount * 3.0):
                return {
                    "approval_status": "REJECTED",
                    "reason": (
                        f"🛑 REVENGE TRADING ENGELLENDİ: Son 1 saat içinde üst üste {consecutive_losses} kez "
                        f"zarar ettikten sonra pozisyon büyüklüğünüzü {amount_tl:,.0f} TL'ye (önceki ortalamanın "
                        f"{amount_tl / avg_prev_amount:.1f}x katına) çıkarma girişimi tespit edildi. "
                        f"15 dakika soğuma süresi (Cooldown Period) devrededir."
                    ),
                    "detected_bias": "REVENGE_TRADING",
                    "cooldown_seconds_remaining": 900,
                    "suggested_action": "İşlemleri durdurunuz ve işlem günlüğünüzü gözden geçiriniz.",
                }

        # ----------------------------------------------------------------------
        # 2. FOMO ALIMI (TEPEDEN PİYASA EMRİYLE DALMA)
        # Son 3 günde %15+ primli ve emir tipi MARKET/Piyasa Emri ise
        # ----------------------------------------------------------------------
        change_3d = float(
            market.get("change_pct_3d")
            or market.get("three_day_change_pct")
            or req.get("three_day_change_pct")
            or 0.0
        )

        if side == "BUY" and change_3d > 15.0 and order_type in ["MARKET", "PIYASA", "MO"]:
            return {
                "approval_status": "WARNING",
                "reason": (
                    f"⚠️ FOMO ALIMI UYARISI: {ticker} hissesi son 3 günde %{change_3d:.1f} yükseldi. "
                    f"Piyasa Emri ile tepe kovalamak yüksek slippage (kayma) ve ani düzeltme riski taşır. "
                    f"Lütfen geri çekilme seviyelerine Limit Emir bırakınız."
                ),
                "detected_bias": "FOMO_BUYING",
                "cooldown_seconds_remaining": 0,
                "suggested_action": "Emir tipini LIMIT olarak değiştirip destek seviyesini hedefleyiniz.",
            }

        # ----------------------------------------------------------------------
        # 3. PANİK SATIŞI (DİPTE ZARARINA SAĞLAM HİSSE BOŞALTMA)
        # Piyasa düşerken şirketin temelleri çok sağlamsa ve zararına satılıyorsa
        # ----------------------------------------------------------------------
        unrealized_pnl_pct = float(req.get("unrealized_pnl_pct", -4.5))
        market_change_pct = float(market.get("market_change_pct", -2.0))
        altman_z = float(market.get("altman_z_score", 3.2))
        f_score = float(market.get("piotroski_f_score", 7.0))

        if side == "SELL" and unrealized_pnl_pct < 0 and market_change_pct < -1.0:
            if altman_z > 3.0 or f_score >= 7.0:
                return {
                    "approval_status": "WARNING",
                    "reason": (
                        f"⚠️ PANİK SATIŞI UYARISI: Endeks düşerken temel göstergeleri mükemmel düzeyde "
                        f"(Altman Z: {altman_z:.2f}, Piotroski: {f_score:.0f}) olan {ticker} hissesini zararına "
                        f"(%{unrealized_pnl_pct:.1f}) satmak üzeresiniz. Sakin olunuz; temeli sağlam hisseler dip "
                        f"destek seviyelerinden en hızlı toparlanan varlıklardır."
                    ),
                    "detected_bias": "PANIC_SELLING",
                    "cooldown_seconds_remaining": 0,
                    "suggested_action": "Teknik destek seviyesini bekleyiniz veya kademeli stop planı uygulayınız.",
                }

        # ----------------------------------------------------------------------
        # 4. KÜMÜLATİF PORTFÖY VaR RİSK LİMİTİ (PARAMETRIC VaR GUARD)
        # Portföyün toplam riske maruz değeri sermayenin %20'sini aşıyorsa durdur
        # ----------------------------------------------------------------------
        portfolio_var_pct = float(
            market.get("portfolio_var_pct")
            or req.get("portfolio_var_pct")
            or (market.get("var_pct") or 0.0)
        )
        portfolio_total_tl = float(
            req.get("portfolio_total_tl")
            or market.get("portfolio_total_tl")
            or 1000000.0
        )
        portfolio_var_tl = float(
            market.get("portfolio_var_tl")
            or req.get("portfolio_var_tl")
            or 0.0
        )

        var_ratio = (portfolio_var_tl / portfolio_total_tl) if portfolio_total_tl > 0 else (portfolio_var_pct / 100.0)

        if portfolio_var_pct >= 20.0 or var_ratio >= 0.20:
            return {
                "approval_status": "REJECTED",
                "reason": (
                    f"🛑 PORTFÖY RİSKİ YÜKSEK (VaR Sınırı Aşıldı): Toplam portföyün 1 günlük "
                    f"Riske Maruz Değeri (VaR) sermayenin %{max(portfolio_var_pct, var_ratio * 100):.1f}'ini "
                    f"({portfolio_var_tl:,.0f} TL) aşmaktadır. Yeni risk alımı durduruldu. "
                    f"Lütfen mevcut pozisyon riskini düşürünüz."
                ),
                "detected_bias": "EXCESSIVE_VAR_RISK",
                "cooldown_seconds_remaining": 600,
                "suggested_action": "Portföy riskini %15'in altına çekmeden yeni alım emri iletmeyiniz.",
            }

        # ----------------------------------------------------------------------
        # ONAY: HİÇBİR PSİKOLOJİK SAPMA TESPİT EDİLMEDİ
        # ----------------------------------------------------------------------
        return {
            "approval_status": "APPROVED",
            "reason": "İşlem talebi davranışsal finans ve psikolojik sınır kontrollerinden başarıyla geçti.",
            "detected_bias": None,
            "cooldown_seconds_remaining": 0,
            "suggested_action": "Emir iletimi onaylandı.",
        }
