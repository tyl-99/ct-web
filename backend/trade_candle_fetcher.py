#!/usr/bin/env python3
"""
Trade-focused candlestick data fetcher
Fetches 10 candles before and 10 candles after each trade for detailed analysis
"""

import datetime
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any

# Third-party imports  
from dotenv import load_dotenv
from twisted.internet import reactor, defer
from twisted.internet.defer import TimeoutError

# cTrader API imports
from ctrader_open_api import Client, Protobuf, TcpProtocol, Auth, EndPoints
from ctrader_open_api.endpoints import EndPoints
from ctrader_open_api.messages.OpenApiCommonMessages_pb2 import *
from ctrader_open_api.messages.OpenApiMessages_pb2 import *
from ctrader_open_api.messages.OpenApiModelMessages_pb2 import *

# Load environment variables
load_dotenv()

# Forex symbols mapping
FOREX_SYMBOLS = {
    "EUR/USD": 1,
    "GBP/USD": 2,
    "EUR/JPY": 3,
    "USD/JPY": 4,
    "GBP/JPY": 7,
    "EUR/GBP": 9
}

class TradeCandleFetcher:
    """Fetches candlestick data around specific trades"""
    
    def __init__(self):
        # cTrader credentials
        self.client_id = os.getenv("CTRADER_CLIENT_ID")
        self.client_secret = os.getenv("CTRADER_CLIENT_SECRET")
        self.account_id = int(os.getenv("CTRADER_ACCOUNT_ID"))
        
        if not all([self.client_id, self.client_secret, self.account_id]):
            raise ValueError("Missing cTrader credentials in environment variables")
        
        # API connection
        self.host = EndPoints.PROTOBUF_DEMO_HOST
        self.client = Client(self.host, EndPoints.PROTOBUF_PORT, TcpProtocol)
        
        # Output directory
        from path_utils import get_data_directory
        base_data_dir = get_data_directory()
        self.output_dir = base_data_dir / "trade_candles"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Data storage
        self.trade_candles = {}
        self.pending_requests = 0
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        print("🕯️ Trade Candle Fetcher initialized")
    
    async def authenticate(self):
        """Authenticate with cTrader API"""
        try:
            print("🔐 Authenticating with cTrader...")
            
            # Connect to server
            await self.client.connect()
            
            # Authenticate application
            app_auth_req = ProtoOAApplicationAuthReq()
            app_auth_req.clientId = self.client_id
            app_auth_req.clientSecret = self.client_secret
            
            app_auth_response = await self.client.send(app_auth_req)
            
            # Authenticate user account  
            account_auth_req = ProtoOAAccountAuthReq()
            account_auth_req.ctidTraderAccountId = self.account_id
            account_auth_req.accessToken = "your_access_token"  # You'll need to provide this
            
            account_auth_response = await self.client.send(account_auth_req)
            
            print("✅ Successfully authenticated with cTrader")
            return True
            
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            return False
    
    def fetch_trade_candles(self, trade: Dict, candles_before: int = 10, candles_after: int = 10, 
                           timeframe: str = "M15") -> Dict:
        """
        Fetch candlestick data around a specific trade
        
        Args:
            trade: Trade data dictionary
            candles_before: Number of candles to fetch before trade
            candles_after: Number of candles to fetch after trade  
            timeframe: Timeframe (M15, M30, H1)
        
        Returns:
            Dictionary with candlestick data
        """
        try:
            symbol = trade['pair']
            symbol_id = FOREX_SYMBOLS.get(symbol)
            
            if not symbol_id:
                print(f"❌ Symbol {symbol} not found in FOREX_SYMBOLS")
                return {}
            
            # Parse trade entry time
            entry_time = datetime.datetime.fromisoformat(trade['Entry DateTime'].replace('Z', ''))
            
            # Calculate timeframe minutes
            timeframe_minutes = {
                'M15': 15,
                'M30': 30, 
                'H1': 60,
                'H4': 240,
                'D1': 1440
            }.get(timeframe, 15)
            
            # Calculate time range
            start_time = entry_time - datetime.timedelta(minutes=timeframe_minutes * candles_before)
            end_time = entry_time + datetime.timedelta(minutes=timeframe_minutes * candles_after)
            
            print(f"📊 Fetching {timeframe} candles for {symbol}")
            print(f"📅 Trade time: {entry_time}")
            print(f"📅 Range: {start_time} to {end_time}")
            print(f"🕯️ Requesting {candles_before + 1 + candles_after} candles")
            
            # Create trendbar request
            trendbar_req = ProtoOAGetTrendbarsReq()
            trendbar_req.ctidTraderAccountId = self.account_id
            trendbar_req.symbolId = symbol_id
            
            # Set period
            period_mapping = {
                'M15': ProtoOATrendbarPeriod.M15,
                'M30': ProtoOATrendbarPeriod.M30,
                'H1': ProtoOATrendbarPeriod.H1,
                'H4': ProtoOATrendbarPeriod.H4,
                'D1': ProtoOATrendbarPeriod.D1
            }
            trendbar_req.period = period_mapping.get(timeframe, ProtoOATrendbarPeriod.M15)
            
            trendbar_req.fromTimestamp = int(start_time.timestamp() * 1000)
            trendbar_req.toTimestamp = int(end_time.timestamp() * 1000)
            trendbar_req.count = candles_before + candles_after + 10  # Get extra to ensure coverage
            
            # This would be used in async context
            request_data = {
                'symbol': symbol,
                'trade_id': trade.get('Trade ID', 'unknown'),
                'entry_time': entry_time,
                'timeframe': timeframe,
                'candles_before': candles_before,
                'candles_after': candles_after,
                'request': trendbar_req
            }
            
            return request_data
            
        except Exception as e:
            print(f"❌ Error preparing candle request for {trade.get('pair', 'unknown')}: {e}")
            return {}
    
    def process_candle_response(self, response, request_data: Dict) -> List[Dict]:
        """Process the candlestick response from cTrader API"""
        try:
            parsed = Protobuf.extract(response)
            
            if not hasattr(parsed, 'trendbar') or not parsed.trendbar:
                print(f"❌ No trendbar data in response")
                return []
            
            candles = []
            trade_time = request_data['entry_time']
            timeframe = request_data['timeframe']
            symbol = request_data['symbol']
            
            timeframe_minutes = {
                'M15': 15, 'M30': 30, 'H1': 60, 'H4': 240, 'D1': 1440
            }.get(timeframe, 15)
            
            for bar in parsed.trendbar:
                # Convert timestamp
                bar_time = datetime.datetime.utcfromtimestamp(bar.utcTimestampInMinutes * 60)
                
                # Get OHLC values (no conversion needed - API returns correct format)
                open_price = float(getattr(bar, 'open', 0))
                high_price = float(getattr(bar, 'high', 0))
                low_price = float(getattr(bar, 'low', 0))
                close_price = float(getattr(bar, 'close', 0))
                volume = getattr(bar, 'volume', 0)
                
                # Skip invalid candles
                if open_price == 0 and high_price == 0 and low_price == 0 and close_price == 0:
                    continue
                
                # Calculate if this is the trade entry candle
                time_diff_minutes = abs((bar_time - trade_time).total_seconds() / 60)
                is_trade_candle = time_diff_minutes < (timeframe_minutes / 2)
                
                # Calculate position relative to trade (-10 to +10)
                candle_position = int((bar_time - trade_time).total_seconds() / (timeframe_minutes * 60))
                
                candle_data = {
                    'timestamp': bar_time.isoformat(),
                    'open': open_price,
                    'high': high_price,
                    'low': low_price,
                    'close': close_price,
                    'volume': volume,
                    'is_trade_candle': is_trade_candle,
                    'position': candle_position,  # -10 to +10 relative to trade
                    'timeframe': timeframe,
                    'symbol': symbol,
                    'time_to_trade_minutes': int((bar_time - trade_time).total_seconds() / 60)
                }
                
                candles.append(candle_data)
            
            # Sort by timestamp
            candles.sort(key=lambda x: x['timestamp'])
            
            print(f"✅ Processed {len(candles)} valid candles for {symbol}")
            return candles
            
        except Exception as e:
            print(f"❌ Error processing candle response: {e}")
            return []
    
    def save_trade_candles(self, trade_id: str, candles: List[Dict]):
        """Save trade candles to JSON file"""
        try:
            filename = f"trade_{trade_id}_candles.json"
            filepath = self.output_dir / filename
            
            with open(filepath, 'w') as f:
                json.dump(candles, f, indent=2)
            
            print(f"💾 Saved {len(candles)} candles to {filename}")
            
        except Exception as e:
            print(f"❌ Error saving candles: {e}")
    
    def generate_sample_data(self, trade: Dict, candles_before: int = 10, candles_after: int = 10, 
                           timeframe: str = "M15") -> List[Dict]:
        """
        Generate sample candlestick data for testing (when API is not available)
        """
        try:
            entry_time = datetime.datetime.fromisoformat(trade['Entry DateTime'].replace('Z', ''))
            entry_price = float(trade['Entry Price'])
            symbol = trade['pair']
            
            timeframe_minutes = {
                'M15': 15, 'M30': 30, 'H1': 60, 'H4': 240, 'D1': 1440
            }.get(timeframe, 15)
            
            candles = []
            total_candles = candles_before + 1 + candles_after
            
            # Generate realistic price movement around the trade
            for i in range(-candles_before, candles_after + 1):
                candle_time = entry_time + datetime.timedelta(minutes=i * timeframe_minutes)
                
                # Create realistic OHLC around entry price
                base_price = entry_price
                volatility = 0.001 if 'JPY' not in symbol else 0.1
                
                # Add some realistic price movement
                price_change = (i * 0.0001) + (0.0002 * (i % 3 - 1))  # Some price drift
                open_price = base_price + price_change
                
                # Create realistic OHLC for this candle
                high_price = open_price + (volatility * 0.5)
                low_price = open_price - (volatility * 0.5)
                close_price = open_price + (volatility * 0.2 * (1 if i % 2 == 0 else -1))
                
                # Ensure OHLC rules (H >= max(O,C), L <= min(O,C))
                high_price = max(high_price, open_price, close_price)
                low_price = min(low_price, open_price, close_price)
                
                candle_data = {
                    'timestamp': candle_time.isoformat(),
                    'open': round(open_price, 5),
                    'high': round(high_price, 5),
                    'low': round(low_price, 5),
                    'close': round(close_price, 5),
                    'volume': 1000 + (i * 50),  # Vary volume slightly
                    'is_trade_candle': i == 0,  # The middle candle is the trade candle
                    'position': i,  # Position relative to trade
                    'timeframe': timeframe,
                    'symbol': symbol,
                    'time_to_trade_minutes': i * timeframe_minutes
                }
                
                candles.append(candle_data)
            
            print(f"📊 Generated {len(candles)} sample candles for {symbol}")
            return candles
            
        except Exception as e:
            print(f"❌ Error generating sample data: {e}")
            return []

def main():
    """Test the trade candle fetcher with sample data"""
    print("🕯️ Testing Trade Candle Fetcher...")
    
    fetcher = TradeCandleFetcher()
    
    # Sample trade data
    sample_trade = {
        'Trade ID': 12345,
        'pair': 'GBP/USD',
        'Entry DateTime': '2025-08-27T08:15:53.416000',
        'Entry Price': 1.34596,
        'Buy/Sell': 'BUY'
    }
    
    # Generate sample candlestick data
    candles = fetcher.generate_sample_data(sample_trade, candles_before=10, candles_after=10, timeframe='M15')
    
    if candles:
        # Save to file
        fetcher.save_trade_candles(str(sample_trade['Trade ID']), candles)
        
        print(f"\n📈 Sample candles generated:")
        print(f"   Total candles: {len(candles)}")
        print(f"   Trade candle: {next((c for c in candles if c['is_trade_candle']), 'Not found')}")
        print(f"   Time range: {candles[0]['timestamp']} to {candles[-1]['timestamp']}")
        
        return True
    else:
        print("❌ Failed to generate sample data")
        return False

if __name__ == "__main__":
    main()
