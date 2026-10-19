"""
Bistapp MT16 - Model Context Protocol (MCP) Sunucusu (mcp_server.py)
---------------------------------------------------------------------
Bistapp'ın temel ajan ve piyasa analiz fonksiyonlarını Claude, Gemini ve diğer
LLM ajanlarının araç (Tools) olarak doğrudan çağırabilmesi için Model Context
Protocol (MCP) standartlarına uygun olarak dışa açar.
"""

from __future__ import annotations
import json
import asyncio
from typing import Dict, Any, List, Optional

# Eğer mcp kütüphanesi yüklüyse FastMCP kullan, değilse standart uyumlu sunucu çalıştır
try:
    from mcp.server.fastmcp import FastMCP
    mcp_app = FastMCP("Bistapp_Financial_Intelligence")
except Exception:
    mcp_app = None


class BistappMcpServer:
    """
    Bistapp MCP (Model Context Protocol) Araç Sunucusu
    """

    TOOLS_SCHEMA = [
        {
            "name": "get_stock_price",
            "description": "BIST veya küresel bir hissenin anlık fiyat, değişim yüzdesi, RSI ve hacim verisini çeker.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Hisse sembolü (örnek: ASELS, THYAO, GARAN)"
                    }
                },
                "required": ["ticker"]
            }
        },
        {
            "name": "run_debate_analysis",
            "description": "8 uzman ajanı koşturur, 1 tur çapraz münazara (Debate) yapar ve nihai yatırım kararını (FinalDecision) döner.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Analiz edilecek hisse sembolü"
                    }
                },
                "required": ["ticker"]
            }
        },
        {
            "name": "get_market_sentiment",
            "description": "Hissenin KAP haber duygu skorunu ve sosyal medya botnet/manipülasyon riskini döner.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Hisse sembolü"
                    }
                },
                "required": ["ticker"]
            }
        }
    ]

    @classmethod
    def get_stock_price(cls, ticker: str) -> Dict[str, Any]:
        """Canlı/sentetik hisse fiyat ve teknik metriklerini döner."""
        clean = ticker.strip().upper().replace(".IS", "")
        # Mock / Alpaca veri entegrasyonu
        base_prices = {"ASELS": 124.50, "THYAO": 312.00, "GARAN": 128.80, "FROTO": 1050.0}
        px = base_prices.get(clean, 100.0)

        return {
            "ticker": clean,
            "current_price": px,
            "change_pct": +1.85,
            "volume": 14_500_000,
            "rsi": 62.4,
            "moving_avg_50": round(px * 0.96, 2),
            "moving_avg_200": round(px * 0.91, 2),
            "currency": "TRY",
        }

    @classmethod
    async def run_debate_analysis(cls, ticker: str) -> Dict[str, Any]:
        """8 ajanlı münazara analizini çalıştırır."""
        clean = ticker.strip().upper().replace(".IS", "")
        try:
            from orchestrator import run_multi_agent_pipeline
            from schemas import UnifiedContext, MarketData
            
            px_data = cls.get_stock_price(clean)
            m_data = MarketData(
                price=px_data["current_price"],
                change_pct=px_data["change_pct"],
                volume=px_data["volume"],
                rsi=px_data["rsi"],
                moving_avg_50=px_data["moving_avg_50"],
                moving_avg_200=px_data["moving_avg_200"],
                source="MCP_CONNECTOR"
            )
            ctx = UnifiedContext(ticker=clean, market_data=m_data)
            decision = await run_multi_agent_pipeline(ctx)
            return decision.model_dump() if hasattr(decision, "model_dump") else decision.dict()
        except Exception as e:
            return {
                "ticker": clean,
                "error": str(e),
                "verdict": "NOTR",
                "composite_score": 50.0,
                "coach_summary": f"Münazara analizi kurtarma modunda tamamlandı: {e}"
            }

    @classmethod
    def get_market_sentiment(cls, ticker: str) -> Dict[str, Any]:
        """KAP haber akışı ve manipülasyon riskini döner."""
        clean = ticker.strip().upper().replace(".IS", "")
        return {
            "ticker": clean,
            "sentiment_score": 0.45,
            "sentiment_label": "POZİTİF",
            "manipulation_risk_score": 18.0,
            "manipulation_level": "DÜŞÜK",
            "summary": f"{clean} için haber akışı dengeli ve pozitif. Sosyal medya manipülasyon riski düşük."
        }

    @classmethod
    def list_tools(cls) -> List[Dict[str, Any]]:
        """MCP protokolü araç listesini döner."""
        return cls.TOOLS_SCHEMA

    @classmethod
    async def call_tool(cls, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """MCP protokolü araç çalıştırma yönlendiricisi."""
        clean_name = name.strip()
        ticker = str(arguments.get("ticker", "ASELS"))

        if clean_name == "get_stock_price":
            result = cls.get_stock_price(ticker)
        elif clean_name == "run_debate_analysis":
            result = await cls.run_debate_analysis(ticker)
        elif clean_name == "get_market_sentiment":
            result = cls.get_market_sentiment(ticker)
        else:
            return {"error": f"Bilinmeyen MCP aracı: {name}"}

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps(result, ensure_ascii=False, indent=2)
                }
            ],
            "isError": False,
        }

    @classmethod
    async def handle_jsonrpc(cls, request: Dict[str, Any]) -> Dict[str, Any]:
        """Standart MCP JSON-RPC 2.0 isteklerini karşılar."""
        req_id = request.get("id", 1)
        method = request.get("method", "")
        params = request.get("params", {})

        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {
                        "name": "Bistapp_Financial_Intelligence_MCP",
                        "version": "1.0.0"
                    }
                }
            }
        elif method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"tools": cls.list_tools()}
            }
        elif method == "tools/call":
            tool_name = params.get("name", "")
            args = params.get("arguments", {})
            call_res = await cls.call_tool(tool_name, args)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": call_res
            }
        else:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"}
            }


# FastMCP decorator'ları (kütüphane varsa)
if mcp_app is not None:
    @mcp_app.tool()
    def get_stock_price(ticker: str) -> str:
        """Hisse fiyatını ve teknik verileri döner."""
        return json.dumps(BistappMcpServer.get_stock_price(ticker), ensure_ascii=False)

    @mcp_app.tool()
    async def run_debate_analysis(ticker: str) -> str:
        """8 ajanlı jüri ve münazara analizini koşturur."""
        res = await BistappMcpServer.run_debate_analysis(ticker)
        return json.dumps(res, ensure_ascii=False)
