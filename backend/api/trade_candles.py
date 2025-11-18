#!/usr/bin/env python3
"""
API endpoint for trade-focused candlestick data
Provides candlestick data around specific trades for analysis
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Add backend directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from trade_candle_fetcher import TradeCandleFetcher
from firebase_service import (
    cache_trade_candles,
    get_cached_trade_candles,
    get_recent_trades,
    get_trade_by_id,
)

class TradeCandleAPI:
    """API handler for trade candlestick data"""
    
    def __init__(self):
        self.fetcher = TradeCandleFetcher()
        self.data_dir = None  # Firebase-backed
    
    def get_trade_candles(self, trade_id: str, candles_before: int = 10, 
                         candles_after: int = 10, timeframe: str = "M15") -> Dict:
        """
        Get candlestick data for a specific trade
        
        Args:
            trade_id: Trade ID to get candles for
            candles_before: Number of candles before trade (default: 10)
            candles_after: Number of candles after trade (default: 10)
            timeframe: Timeframe (M15, M30, H1) (default: M15)
        
        Returns:
            Dictionary with candlestick data or error
        """
        try:
            # Check if cached data exists in Firestore
            cached_data = get_cached_trade_candles(trade_id, timeframe)
            if cached_data:
                filtered_data = self._filter_candles_by_range(
                    cached_data, candles_before, candles_after
                )
                return {
                    "success": True,
                    "trade_id": trade_id,
                    "timeframe": timeframe,
                    "candles_before": candles_before,
                    "candles_after": candles_after,
                    "total_candles": len(filtered_data),
                    "data": filtered_data,
                    "source": "cache",
                }
            
            # Get trade data from trades file
            trade_data = self._get_trade_data(trade_id)
            if not trade_data:
                return {
                    "success": False,
                    "error": f"Trade {trade_id} not found",
                    "trade_id": trade_id
                }
            
            # Generate candlestick data around the trade
            candles = self.fetcher.generate_sample_data(
                trade_data, candles_before, candles_after, timeframe
            )
            
            if not candles:
                return {
                    "success": False,
                    "error": "Failed to generate candlestick data",
                    "trade_id": trade_id
                }
            
            # Cache the data
            cache_trade_candles(trade_id, timeframe, candles)
            
            return {
                "success": True,
                "trade_id": trade_id,
                "timeframe": timeframe,
                "candles_before": candles_before,
                "candles_after": candles_after,
                "total_candles": len(candles),
                "data": candles,
                "source": "generated"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "trade_id": trade_id
            }
    
    def _get_trade_data(self, trade_id: str) -> Optional[Dict]:
        """Get trade data by trade ID from Firestore"""
        try:
            trade = get_trade_by_id(trade_id)
            if not trade:
                print(f"❌ Trade {trade_id} not found in Firestore")
            return trade
        except Exception as e:
            print(f"❌ Error fetching trade data: {e}")
            return None
    
    def _filter_candles_by_range(self, candles: List[Dict], candles_before: int, 
                                candles_after: int) -> List[Dict]:
        """Filter cached candles to requested range"""
        try:
            # Find the trade candle (position 0)
            trade_candle_index = None
            for i, candle in enumerate(candles):
                if candle.get('is_trade_candle', False):
                    trade_candle_index = i
                    break
            
            if trade_candle_index is None:
                # If no trade candle marked, assume middle candle
                trade_candle_index = len(candles) // 2
            
            # Calculate range
            start_index = max(0, trade_candle_index - candles_before)
            end_index = min(len(candles), trade_candle_index + candles_after + 1)
            
            return candles[start_index:end_index]
            
        except Exception as e:
            print(f"❌ Error filtering candles: {e}")
            return candles
    
    def get_available_trades(self) -> Dict:
        """Get list of available trades for candlestick analysis"""
        try:
            trades = get_recent_trades(limit=50)
            formatted = [
                {
                    "trade_id": trade.get("Trade ID"),
                    "pair": trade.get("pair"),
                    "entry_time": trade.get("Entry DateTime"),
                    "direction": trade.get("Buy/Sell"),
                    "entry_price": trade.get("Entry Price"),
                    "pnl": trade.get("PnL"),
                    "pips": trade.get("Pips"),
                }
                for trade in trades
            ]
            return {
                "success": True,
                "total_trades": len(formatted),
                "trades": formatted,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

def serve_trade_candles(trade_id: str, candles_before: int = 10, 
                       candles_after: int = 10, timeframe: str = "M15") -> str:
    """
    Main function to serve trade candles data
    Returns JSON string
    """
    api = TradeCandleAPI()
    result = api.get_trade_candles(trade_id, candles_before, candles_after, timeframe)
    return json.dumps(result, indent=2)

def main():
    """Test the API with a sample trade"""
    print("🔌 Testing Trade Candles API...")
    
    api = TradeCandleAPI()
    
    # Test getting available trades
    print("\n📋 Getting available trades...")
    trades_result = api.get_available_trades()
    print(f"Available trades: {trades_result.get('total_trades', 0)}")
    
    if trades_result.get('success') and trades_result.get('trades'):
        # Test getting candles for first trade
        first_trade = trades_result['trades'][0]
        trade_id = str(first_trade['trade_id'])
        
        print(f"\n🕯️ Getting candles for trade {trade_id} ({first_trade['pair']})...")
        candles_result = api.get_trade_candles(trade_id, candles_before=10, candles_after=10, timeframe="M15")
        
        if candles_result.get('success'):
            print(f"✅ Generated {candles_result['total_candles']} candles")
            print(f"📊 Timeframe: {candles_result['timeframe']}")
            print(f"📄 Source: {candles_result['source']}")
            
            # Show first and last candle
            candles = candles_result['data']
            if candles:
                print(f"\n🕯️ First candle: {candles[0]['timestamp']} - O:{candles[0]['open']}")
                trade_candle = next((c for c in candles if c['is_trade_candle']), None)
                if trade_candle:
                    print(f"🎯 Trade candle: {trade_candle['timestamp']} - O:{trade_candle['open']}")
                print(f"🕯️ Last candle: {candles[-1]['timestamp']} - O:{candles[-1]['open']}")
        else:
            print(f"❌ Failed to get candles: {candles_result.get('error')}")
    
    else:
        print("❌ No trades available for testing")

if __name__ == "__main__":
    main()
