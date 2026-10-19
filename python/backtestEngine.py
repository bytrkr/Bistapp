"""
Bistapp MT16 - Backtest Engine (backtestEngine.py)
--------------------------------------------------
Verilen fiyat serisi ve sinyaller üzerinden Sharpe Oranı, Maksimum Düşüş (Max Drawdown),
Toplam Getiri ve Kazanma Oranı (Win Rate) hesaplayan run_backtest metodu.
"""

from __future__ import annotations
import math
from typing import Dict, Any, List, Optional

class BacktestEngine:
    """
    Kuant Backtest ve Performans Ölçüm Motoru
    """
    @staticmethod
    def run_backtest(prices: List[float], signals: List[int], initial_capital: float = 100_000.0) -> Dict[str, Any]:
        """
        Fiyat serisi (prices) ve sinyal serisi (1: AL, -1: SAT, 0: NOTR) üzerinden
        getiri, Sharpe oranı, max drawdown ve win rate hesaplar.
        """
        if not prices or len(prices) < 2:
            return {
                "initial_capital": initial_capital,
                "final_capital": initial_capital,
                "total_return_pct": 0.0,
                "sharpe_ratio": 0.0,
                "max_drawdown_pct": 0.0,
                "win_rate_pct": 0.0,
                "trades_count": 0,
            }

        capital = float(initial_capital)
        peak_capital = capital
        max_dd = 0.0
        returns: List[float] = []
        wins = 0
        losses = 0
        in_position = False
        entry_price = 0.0

        for i in range(1, len(prices)):
            p_prev = prices[i - 1]
            p_curr = prices[i]
            sig = signals[i - 1] if i - 1 < len(signals) else 0

            # Fiyat değişimi
            pct_change = (p_curr - p_prev) / p_prev

            if sig == 1 and not in_position:
                in_position = True
                entry_price = p_curr
            elif sig == -1 and in_position:
                in_position = False
                trade_ret = (p_curr - entry_price) / entry_price
                returns.append(trade_ret)
                if trade_ret > 0:
                    wins += 1
                else:
                    losses += 1
                capital *= (1.0 + trade_ret)

            if in_position:
                unrealized_ret = (p_curr - entry_price) / entry_price
                curr_val = capital * (1.0 + unrealized_ret)
            else:
                curr_val = capital

            if curr_val > peak_capital:
                peak_capital = curr_val
            
            dd = (peak_capital - curr_val) / peak_capital if peak_capital > 0 else 0.0
            if dd > max_dd:
                max_dd = dd

        total_return_pct = ((capital - initial_capital) / initial_capital) * 100.0
        total_trades = wins + losses
        win_rate_pct = (wins / total_trades * 100.0) if total_trades > 0 else 0.0

        # Sharpe Oranı (Basitleştirilmiş yıllıklandırma)
        if returns:
            avg_ret = sum(returns) / len(returns)
            std_ret = math.sqrt(sum((r - avg_ret) ** 2 for r in returns) / len(returns)) if len(returns) > 1 else 0.01
            sharpe = (avg_ret / (std_ret if std_ret > 0 else 0.001)) * math.sqrt(252)
        else:
            sharpe = 0.0

        return {
            "initial_capital": initial_capital,
            "final_capital": round(capital, 2),
            "total_return_pct": round(total_return_pct, 2),
            "sharpe_ratio": round(sharpe, 2),
            "max_drawdown_pct": round(max_dd * 100.0, 2),
            "win_rate_pct": round(win_rate_pct, 2),
            "trades_count": total_trades,
        }

    @staticmethod
    def simulate_monte_carlo(prices: List[float], days: int = 30, simulations: int = 1000) -> Dict[str, Any]:
        """
        Geçmiş fiyat serisinden günlük getiri ortalaması ve volatilitesini hesaplar.
        Geometric Brownian Motion (GBM) kullanarak 1000 farklı fiyat yolu simüle eder
        ve %5, %50 (medyan), %95 yüzdelik dilimlerini döner.
        """
        import random
        if not prices or len(prices) < 2:
            base_p = prices[-1] if prices else 100.0
            return {
                "days": days,
                "simulations": simulations,
                "p5": base_p,
                "p50": base_p,
                "p95": base_p,
                "expected_volatility": 0.02,
            }

        log_returns = [math.log(prices[i] / prices[i-1]) for i in range(1, len(prices))]
        mean_ret = sum(log_returns) / len(log_returns)
        variance = sum((r - mean_ret) ** 2 for r in log_returns) / (len(log_returns) - 1) if len(log_returns) > 1 else 0.0001
        volatility = math.sqrt(variance)

        last_price = prices[-1]
        final_prices = []

        for _ in range(simulations):
            curr_p = last_price
            for _ in range(days):
                z = random.gauss(0.0, 1.0)
                drift = (mean_ret - 0.5 * (volatility ** 2))
                shock = volatility * z
                curr_p = curr_p * math.exp(drift + shock)
            final_prices.append(max(0.01, curr_p))

        final_prices.sort()
        p5_idx = int(simulations * 0.05)
        p50_idx = int(simulations * 0.50)
        p95_idx = int(simulations * 0.95)

        p5 = round(final_prices[p5_idx], 2)
        p50 = round(final_prices[p50_idx], 2)
        p95 = round(final_prices[p95_idx], 2)

        return {
            "days": days,
            "simulations": simulations,
            "start_price": last_price,
            "p5": p5,
            "p50": p50,
            "p95": p95,
            "expected_volatility": round(volatility * math.sqrt(252) * 100, 2),
        }

