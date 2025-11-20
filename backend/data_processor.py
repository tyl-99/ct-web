# Standard library imports
import datetime
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

# Third-party imports  
import pandas as pd
import requests
from dotenv import load_dotenv

# cTrader API imports (exactly like ctrader.py)
# from ctrader_open_api import Client, Protobuf, TcpProtocol, Auth, EndPoints
# from ctrader_open_api.endpoints import EndPoints
# from ctrader_open_api.messages.OpenApiCommonMessages_pb2 import *
# from ctrader_open_api.messages.OpenApiMessages_pb2 import *
# from ctrader_open_api.messages.OpenApiModelMessages_pb2 import *

# Forex symbols mapping with IDs (same as ctrader.py)
# FOREX_SYMBOLS = {
#     "EUR/USD": 1,
#     "GBP/USD": 2,
#     "EUR/JPY": 3,
#     "USD/JPY": 4,
#     "GBP/JPY": 7,
#     "EUR/GBP": 9
# }

# Symbol ID to name mapping
# ID_TO_SYMBOL = {v: k for k, v in FOREX_SYMBOLS.items()}

class CTraderDataProcessor:
    """
    Connects to account API to fetch real trading data:
    - Closed deals (real trades)
    - Open positions 
    - Account statistics
    """
    
    def __init__(self, account_id: Optional[int] = None):
        """
        Initialize CTraderDataProcessor
        
        Args:
            account_id: Account ID to process. If None, loads from CTRADER_ACCOUNT_ID env var
        """
        # Removed cTrader credentials and API connection setup
        # self.client_id = os.getenv("CTRADER_CLIENT_ID")
        # self.client_secret = os.getenv("CTRADER_CLIENT_SECRET")
        
        if account_id is None:
            account_id = os.getenv("CTRADER_ACCOUNT_ID")
            if account_id:
                account_id = int(account_id)
        
        self.account_id = account_id
        
        if not self.account_id: # Only account_id is strictly needed now
            raise ValueError("Missing account ID in environment variables")
        
        # Removed cTrader API connection
        # self.host = EndPoints.PROTOBUF_DEMO_HOST
        # self.client = Client(self.host, EndPoints.PROTOBUF_PORT, TcpProtocol)
        
        # Output directory for web app (per-account folder)
        # Use path utility for environment-aware paths
        from path_utils import get_data_directory
        base_output_dir = get_data_directory()
        self.output_dir = base_output_dir / f"account_{self.account_id}"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Data storage (will be populated directly from API)
        self.closed_deals: List[Dict[str, Any]] = []
        self.open_positions: List[Dict[str, Any]] = []
        self.account_info: Dict[str, Any] = {}
        
        # Removed cTrader request tracking
        # self.pending_requests = 0
        # self.max_wait_time = 60  # Increased timeout for order detail requests
        # self.max_order_detail_requests = 50  # Maximum number of order detail requests (increase from 10)
        # self.order_detail_timeout = 30  # Timeout for individual order detail requests (seconds)
        
        # Removed exit tracking
        # self.exit_code = None  # Store exit code to exit after reactor stops
        
        # Setup logging
        logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO) # Set to INFO to see save messages
        
        self.logger.info("🚀 Data Processor initialized for account %s", self.account_id)
    
    def _fetch_data_from_account_api(self) -> Dict[str, Any]:
        """Fetches data from the account-data endpoint."""
        account_data_api_url = os.getenv('ACCOUNT_DATA_API_URL', 'http://localhost:8000')
        url = f"{account_data_api_url}/account-data?account_id={self.account_id}"
        print(f"🔗 [DATA PROCESSOR] Calling account-data endpoint: {url}")
        print(f"📊 [DATA PROCESSOR] Account ID: {self.account_id}")
        try:
            print(f"⏳ [DATA PROCESSOR] Sending GET request to {url}...")
            response = requests.get(url, timeout=30)
            print(f"✅ [DATA PROCESSOR] Received response status: {response.status_code}")
            response.raise_for_status()  # Raise an exception for HTTP errors
            data = response.json()
            print(f"📦 [DATA PROCESSOR] Response data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
            if isinstance(data, dict) and 'summary_stats' in data:
                summary = data.get('summary_stats', {})
                print(f"📈 [DATA PROCESSOR] Summary stats - Total trades: {summary.get('total_trades', 'N/A')}, Total PnL: {summary.get('total_pnl', 'N/A')}")
            return data
        except requests.exceptions.ConnectionError as e:
            print(f"❌ [DATA PROCESSOR] Connection error - Could not connect to {url}")
            print(f"❌ [DATA PROCESSOR] Error details: {e}")
            self.logger.error(f"Error fetching data from account API: {e}")
            raise
        except requests.exceptions.Timeout as e:
            print(f"❌ [DATA PROCESSOR] Timeout error - Request took too long")
            print(f"❌ [DATA PROCESSOR] Error details: {e}")
            self.logger.error(f"Timeout fetching data from account API: {e}")
            raise
        except requests.exceptions.RequestException as e:
            print(f"❌ [DATA PROCESSOR] Request error: {e}")
            print(f"❌ [DATA PROCESSOR] Response status: {getattr(e.response, 'status_code', 'N/A') if hasattr(e, 'response') else 'N/A'}")
            self.logger.error(f"Error fetching data from account API: {e}")
            raise

    def connect_and_fetch_data(self):
        """Main entry point to connect and fetch all data"""
        try:
            print(f"🚀 [DATA PROCESSOR] Starting data fetch for account {self.account_id}")
            self.logger.info("🔌 Fetching data from account API...")
            account_data = self._fetch_data_from_account_api()
            
            print(f"✅ [DATA PROCESSOR] Successfully fetched data from API")
            if not account_data:
                print(f"❌ [DATA PROCESSOR] No data received from account API")
                raise ValueError("No data received from account API")

            # Populate data storage from the fetched data
            self.account_info = account_data.get("summary_stats", {}).get("account_info", {})
            self.open_positions = account_data.get("summary_stats", {}).get("open_positions", [])
            self.closed_deals = []
            for symbol_trades in account_data.get("trades_by_symbol", {}).values():
                self.closed_deals.extend(symbol_trades)

            self.process_and_save_data()
            self.cleanup_and_exit(True)
        except Exception as e:
            self.logger.error(f"❌ Connection/Fetch error: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            self.cleanup_and_exit(False)
    
    # def on_connected(self, client): # Removed cTrader specific on_connected
    #     """Called when connected to cTrader"""
    #     # print("✅ Connected to cTrader server") # Suppress this print
    #     self.authenticate_app()
    
    # def on_disconnected(self, client, reason): # Removed cTrader specific on_disconnected
    #     """Called when disconnected from cTrader"""
    #     # This is normal when script completes - don't log as warning
    #     # Only log if it's an unexpected disconnection (not during cleanup)
    #     if self.exit_code is None:
    #         self.logger.warning(f"Unexpected disconnection from cTrader server: {reason}")
    #     else:
    #         self.logger.debug(f"Disconnected from cTrader server (normal shutdown)")
    
    # def on_message_received(self, client, message): # Removed cTrader specific on_message_received
    #     """Handle incoming messages"""
    #     pass  # Let individual handlers manage responses
    
    # def authenticate_app(self): # Removed cTrader specific authenticate_app
    #     """Authenticate the application"""
    #     # print("🔐 Authenticating application...") # Suppress this print
    #     app_auth = ProtoOAApplicationAuthReq()
    #     app_auth.clientId = self.client_id
    #     app_auth.clientSecret = self.client_secret
        
    #     deferred = self.client.send(app_auth)
    #     deferred.addCallbacks(self.on_app_auth_success, self.on_error)
    
    # def on_app_auth_success(self, response): # Removed cTrader specific on_app_auth_success
    #     """App authentication successful"""
    #     # print("✅ Application authenticated") # Suppress this print
    #     access_token = os.getenv("CTRADER_ACCESS_TOKEN")
    #     self.authenticate_user(access_token)
    
    # def authenticate_user(self, access_token): # Removed cTrader specific authenticate_user
    #     """Authenticate the user with access token"""
    #     # print("🔐 Authenticating user...") # Suppress this print
    #     user_auth = ProtoOAAccountAuthReq()
    #     user_auth.ctidTraderAccountId = self.account_id
    #     user_auth.accessToken = access_token
        
    #     deferred = self.client.send(user_auth)
    #     deferred.addCallbacks(self.on_user_auth_success, self.on_error)
    
    # def on_user_auth_success(self, response): # Removed cTrader specific on_user_auth_success
    #     """User authentication successful - start data fetching"""
    #     # print("✅ User authenticated") # Suppress this print
    #     # print("📊 Starting data collection...") # Suppress this print
        
    #     # Fetch all required data
    #     self.fetch_closed_deals()
    #     self.fetch_open_positions()
    #     self.fetch_account_info()
    #     self.fetch_trendbars_for_pairs()
    
    def fetch_closed_deals(self, days_back=365):
        """Fetch closed deals using exact timestamp filtering"""
        try:
            # Use exact statement period timestamps from your CSV
            # Statement start: 14 Jul 2025 09:34:39.775, end with current datetime for latest data
            start_date = datetime.datetime(2025, 7, 14, 9, 34, 39)  # Exact start from statement
            end_date = datetime.datetime.now()  # Current datetime to get all trades up to now
            
            from_timestamp = int(start_date.timestamp() * 1000)
            to_timestamp = int(end_date.timestamp() * 1000)
            
            # print(f"📈 Fetching deals from {start_date} to {end_date}") # Suppress this print
            # print(f"📅 Timestamp range: {from_timestamp} to {to_timestamp}") # Suppress this print
            
            # deal_req = ProtoOADealListReq() # Removed cTrader specific deal_req
            # deal_req.ctidTraderAccountId = self.account_id
            # deal_req.fromTimestamp = from_timestamp
            # deal_req.toTimestamp = to_timestamp
            # deal_req.maxRows = 1000  # Request max possible
            
            # self.pending_requests += 1 # Removed cTrader pending_requests
            # deferred = self.client.send(deal_req) # Removed cTrader deferred
            # deferred.addCallbacks(self.on_deals_received, self.on_error) # Removed cTrader on_deals_received
            
            # Placeholder for new API call
            self.logger.info(f"Fetching closed deals for account {self.account_id} from {start_date} to {end_date}")
            # In a real scenario, you would make an HTTP request to your backend API
            # that would then call the cTrader OpenAPI.
            # For now, we'll simulate fetching data.
            
            # Simulate fetching data from a new API endpoint
            # This part would involve making an HTTP request to your backend API
            # that would then call the cTrader OpenAPI.
            # For demonstration, we'll just add a placeholder deal.
            
            # Example placeholder deal (replace with actual API call)
            placeholder_deal = {
                'deal_id': 123456789,
                'order_id': 'ORD-1234567890',
                'symbol_name': 'EUR/USD',
                'deal_time': datetime.datetime.now().isoformat(),
                'direction': 'BUY',
                'actual_price': 1.20000,
                'actual_close': 1.20500,
                'pips': 50.0,
                'lots': 1.0,
                'net_pnl': 10.0,
                'commission_usd': -5.0,
                'swap_usd': 0.0,
                'pip_size': 0.0001,
                'actual_sl': 1.19500,
                'actual_tp': 1.21000
            }
            self.closed_deals.append(placeholder_deal)
            self.logger.info(f"Added placeholder deal for {placeholder_deal['symbol_name']}")
            
        except Exception as e:
            self.logger.error(f"Error fetching deals: {e}")
    
    # def on_deals_received(self, response): # Removed cTrader specific on_deals_received
    #     """Process received deals"""
    #     try:
    #         parsed = Protobuf.extract(response) # Removed cTrader Protobuf.extract
    #         self.pending_requests -= 1 # Removed cTrader pending_requests
            
    #         if hasattr(parsed, 'deal') and parsed.deal: # Removed cTrader parsed.deal
    #             for deal in parsed.deal: # Removed cTrader deal
    #                 # Only process closed positions with actual P&L
    #                 if (hasattr(deal, 'closePositionDetail') and 
    #                     deal.closePositionDetail and 
    #                     deal.closePositionDetail.grossProfit != 0): # Removed cTrader deal.closePositionDetail
                        
    #                     # Convert timestamp and get symbol
    #                     deal_time = datetime.datetime.utcfromtimestamp(deal.executionTimestamp / 1000) # Removed cTrader deal.executionTimestamp
    #                     symbol_name = ID_TO_SYMBOL.get(deal.symbolId, "UNKNOWN") # Removed cTrader deal.symbolId
                        

    #                     # Convert raw cTrader values to proper format (matching your statement)
    #                     raw_volume = getattr(deal, 'volume', 0) # Removed cTrader deal.volume
    #                     raw_profit = deal.closePositionDetail.grossProfit # Removed cTrader deal.closePositionDetail.grossProfit
    #                     raw_commission = getattr(deal.closePositionDetail, 'commission', 0) # Removed cTrader deal.closePositionDetail.commission
    #                     raw_swap = getattr(deal.closePositionDetail, 'swap', 0) # Removed cTrader deal.closePositionDetail.swap
    #                     # Use entryPrice from closePositionDetail as requested
    #                     raw_price = getattr(deal.closePositionDetail, 'entryPrice', 0) or getattr(deal, 'executionPrice', 0) # Removed cTrader deal.closePositionDetail.entryPrice
                        
    #                     # Try to get SL and TP from closePositionDetail or deal
    #                     raw_sl = getattr(deal.closePositionDetail, 'stopLoss', 0) or getattr(deal, 'stopLoss', 0) # Removed cTrader deal.closePositionDetail.stopLoss
    #                     raw_tp = getattr(deal.closePositionDetail, 'takeProfit', 0) or getattr(deal, 'takeProfit', 0) # Removed cTrader deal.closePositionDetail.takeProfit
    #                     raw_close_price = getattr(deal.closePositionDetail, 'closePrice', 0) or getattr(deal, 'closePrice', 0) # Removed cTrader deal.closePositionDetail.closePrice
                        
    #                     # DEBUG: Print available fields for first few deals
    #                     if len(self.closed_deals) < 3: # Suppress this print
    #                         # print(f"🔍 DEBUG: Deal {len(self.closed_deals)+1} fields:") # Suppress this print
    #                         # print(f"  Deal attributes: {dir(deal)}") # Suppress this print
    #                         if hasattr(deal, 'closePositionDetail') and deal.closePositionDetail: # Suppress this print
    #                             # print(f"  ClosePositionDetail attributes: {dir(deal.closePositionDetail)}") # Suppress this print
    #                             # print(f"  Entry Price from closePositionDetail: {getattr(deal.closePositionDetail, 'entryPrice', 'Not available')}") # Suppress this print
    #                             pass # Keep pass to avoid empty if block
    #                         # print(f"  Raw Entry: {raw_price}, Raw SL: {raw_sl}, Raw TP: {raw_tp}, Raw Close: {raw_close_price}") # Suppress this print
    #                         # print(f"  Order ID: {getattr(deal, 'orderId', 'Not available')}") # Suppress this print
    #                         # print(f"  Position ID: {getattr(deal, 'positionId', 'Not available')}") # Suppress this print
                        
    #                     # cTrader API returns values in different formats, let's try minimal conversion
    #                     # Based on your statement vs API data comparison
    #                     lots = raw_volume / 100000000  # Much smaller divisor for lots
                        
    #                     # Fix P&L conversion based on statement comparison
    #                     # Your statement shows "Net USD" which includes gross profit + commission + swap
    #                     profit_usd = raw_profit / 100  # Gross profit
    #                     commission_usd = raw_commission / 100  # Commission (usually negative)
    #                     swap_usd = raw_swap / 100  # Swap
                        
    #                     # Calculate net P&L like your statement (Net USD = gross + commission + swap)
    #                     net_pnl = profit_usd + commission_usd + swap_usd
                        
    #                     # Deal prices are already in correct format - NO conversion needed
    #                     actual_price = raw_price
    #                     actual_sl = raw_sl if raw_sl else 0
    #                     actual_tp = raw_tp if raw_tp else 0
    #                     actual_close = raw_close_price if raw_close_price else actual_price
                        
    #                     # Set pip size based on symbol
    #                     if 'JPY' in symbol_name: # Removed cTrader symbol_name
    #                         pip_size = 0.01  # JPY pairs
    #                     else:
    #                         pip_size = 0.0001  # Major pairs
                        
    #                     # Calculate pips gained
    #                     direction = 'BUY' if getattr(deal, 'tradeSide', 0) == ProtoOATradeSide.BUY else 'SELL' # Removed cTrader deal.tradeSide
                        
    #                     # If we have proper entry and close prices, use them
    #                     if actual_close > 0 and abs(actual_close - actual_price) > pip_size * 0.1: # Removed cTrader actual_close
    #                         if direction == "BUY":
    #                             pips = (actual_close - actual_price) / pip_size
    #                         else:  # SELL
    #                             pips = (actual_price - actual_close) / pip_size
                        
    #                         # print(f"💰 Using price difference for pips: {pips:.2f}") # Suppress this print
    #                     else:
    #                         # Calculate pips from P&L (more reliable when close price = entry price)
    #                         # More realistic pip value calculation for smaller accounts/lots
    #                         if 'JPY' in symbol_name: # Removed cTrader symbol_name
    #                             # For JPY pairs: 1 pip = 0.01, typical value per lot is lower for small accounts
    #                             pip_value_per_lot = 1.0  # More realistic for small lot sizes
    #                         else:
    #                             # For major pairs: 1 pip = 0.0001, typical value per lot for small accounts
    #                             pip_value_per_lot = 1.0  # More realistic for small lot sizes
                                
    #                         # Calculate pips from profit/loss: pips = profit / (lots * pip_value)
    #                         if lots > 0:
    #                             estimated_pips = profit_usd / (lots * pip_value_per_lot)
    #                             # Cap pips to realistic ranges (10-100 pips for normal trades)
    #                             if abs(estimated_pips) > 100:
    #                                 # Scale down if too high - probably different pip value
    #                                 estimated_pips = estimated_pips / 10
    #                             if abs(estimated_pips) > 100:
    #                                 # Scale down again if still too high
    #                                 estimated_pips = estimated_pips / 5
    #                             pips = estimated_pips
    #                         else:
    #                             pips = 0
                                
    #                         # print(f"💰 Using P&L for pips: ${profit_usd:.2f} / ({lots} lots * ${pip_value_per_lot}) = {pips:.1f} pips") # Suppress this print
                        
    #                     # Debug pips calculation from deal data
    #                     if len(self.closed_deals) < 3: # Suppress this print
    #                         # print(f"💰 Deal {len(self.closed_deals)+1} pips: {direction} {symbol_name}") # Suppress this print
    #                         # print(f"   Entry: {actual_price:.5f}, Close: {actual_close:.5f}") # Suppress this print
    #                         # print(f"   Pip size: {pip_size}, Final pips: {pips:.2f}") # Suppress this print
    #                         pass # Keep pass to avoid empty if block
                        
    #                     # Store deal data and fetch order details for actual SL/TP
    #                     order_id = getattr(deal, 'orderId', None) # Removed cTrader deal.orderId
                        
    #                     # Create basic trade data first
    #                     basic_trade_data = { # Removed cTrader basic_trade_data
    #                         'deal_id': getattr(deal, 'dealId', 0), # Removed cTrader deal.dealId
    #                         'order_id': order_id,
    #                         'symbol_name': symbol_name,
    #                         'deal_time': deal_time.isoformat(),
    #                         'direction': direction,
    #                         'actual_price': actual_price,
    #                         'actual_close': actual_close,
    #                         'pips': pips,
    #                         'lots': lots,
    #                         'net_pnl': net_pnl,
    #                         'commission_usd': commission_usd,
    #                         'swap_usd': swap_usd,
    #                         'pip_size': pip_size
    #                     }
                        
    #                     # If SL/TP available from deal, use them directly
    #                     if actual_sl and actual_tp: # Removed cTrader actual_sl, actual_tp
    #                         self.complete_trade_data(basic_trade_data, actual_sl, actual_tp)
    #                     # Otherwise, fetch order details for actual SL/TP (limit to prevent API overload)
    #                     elif order_id and len(self.pending_deal_orders) < self.max_order_detail_requests: # Removed cTrader pending_deal_orders, max_order_detail_requests
    #                         self.pending_deal_orders[order_id] = basic_trade_data # Removed cTrader pending_deal_orders
    #                         self.fetch_order_details(order_id) # Removed cTrader fetch_order_details
    #                     else:
    #                         # Fallback: use estimation for remaining deals
    #                         if not order_id:
    #                             self.logger.warning(f"No order ID for deal {basic_trade_data['deal_id']}, using estimation") # Use logger.warning
    #                         else:
    #                             self.logger.warning(f"Limiting order details requests ({len(self.pending_deal_orders)}/{self.max_order_detail_requests}), using estimation for deal {basic_trade_data['deal_id']}") # Use logger.warning
    #                         estimated_sl, estimated_tp = self.estimate_sl_tp(basic_trade_data) # Removed cTrader estimate_sl_tp
    #                         self.complete_trade_data(basic_trade_data, estimated_sl, estimated_tp) # Removed cTrader complete_trade_data

            
    #             self.logger.info(f"Processed {len(self.closed_deals)} closed deals") # Change to logger.info
            
    #             # No filtering - use raw API data with exact timestamps
    #             # print("🔍 DEBUG: Using exact timestamps - no additional filtering") # Suppress this print
            
    #             # DEBUG: Show sample deals for analysis
    #             # print("\n🔍 DEBUG: Sample deals from API:") # Suppress this print
    #             # for i, deal in enumerate(self.closed_deals[:5]): # Suppress this print
    #             #     print(f"  {i+1}. Trade ID: {deal.get('Trade ID')}, " # Suppress this print
    #             #           f"Pair: {deal.get('pair')}, Date: {deal.get('Entry DateTime')[:10]}, " # Suppress this print
    #             #           f"PnL: {deal.get('PnL')}") # Suppress this print
            
    #             # if len(self.closed_deals) > 5: # Suppress this print
    #             #     print(f"  ... and {len(self.closed_deals) - 5} more deals") # Suppress this print
    #             # print() # Suppress this print
            
    #             self.check_completion()
            
    #         except Exception as e:
    #             self.logger.error(f"Error processing deals: {e}")
    #             self.pending_requests -= 1
    #             self.check_completion()
    
    # def fetch_order_details(self, order_id): # Removed cTrader specific fetch_order_details
    #     """Fetch order details to get actual SL/TP values"""
    #     try:
    #         # print(f"📋 Fetching order details for order {order_id}") # Suppress this print
            
    #         order_req = ProtoOAOrderDetailsReq() # Removed cTrader specific order_req
    #         order_req.ctidTraderAccountId = self.account_id
    #         order_req.orderId = order_id
            
    #         self.pending_requests += 1
    #         deferred = self.client.send(order_req)
    #         deferred.addCallbacks(
    #             lambda resp, oid=order_id: self.on_order_details_received(resp, oid),
    #             lambda failure, oid=order_id: self.on_order_error(failure, oid)
    #         )
            
    #         # Add timeout for this specific request
    #         reactor.callLater(self.order_detail_timeout, self.timeout_order_request, order_id) # Removed cTrader order_detail_timeout
            
    #     except Exception as e:
    #         self.logger.error(f"Error fetching order details for {order_id}: {e}")
    
    # def on_order_details_received(self, response, order_id): # Removed cTrader specific on_order_details_received
    #     """Process received order details"""
    #     try:
    #         parsed = Protobuf.extract(response) # Removed cTrader Protobuf.extract
    #         self.pending_requests -= 1
            
    #         # Check if order is still pending (might have timed out already)
    #         if order_id not in self.pending_deal_orders: # Removed cTrader pending_deal_orders
    #             # Order details arrived but order was already removed (timeout or error)
    #             # This is not necessarily an error - just means we already handled it
    #             self.logger.debug(f"Received order details for order {order_id} that was already processed (likely timed out)") # Use debug level instead of warning
    #             self.check_completion()
    #             return
            
    #         basic_trade_data = self.pending_deal_orders[order_id] # Removed cTrader pending_deal_orders
            
    #         # Extract SL/TP from order details
    #         actual_sl = 0
    #         actual_tp = 0
            
    #         if hasattr(parsed, 'order') and parsed.order: # Removed cTrader parsed.order
    #             order = parsed.order # Removed cTrader order
                
    #             # DEBUG: Print order fields for first few orders
    #             if len(self.closed_deals) < 3: # Suppress this print
    #                 # print(f"🔍 DEBUG: Order {order_id} fields:") # Suppress this print
    #                 # print(f"  Order attributes: {dir(order)}") # Suppress this print
    #                 pass # Keep pass to avoid empty if block
                
    #             # Try to get SL/TP and execution price from order using correct attributes
    #             raw_limit_price = getattr(order, 'limitPrice', 0)  # Usually Take Profit # Removed cTrader order.limitPrice
    #             raw_stop_price = getattr(order, 'stopPrice', 0)    # Usually Stop Loss # Removed cTrader order.stopPrice
    #             raw_execution_price = getattr(order, 'executionPrice', 0)  # Actual entry price # Removed cTrader order.executionPrice
                
    #             # Also check traditional attributes as fallback
    #             raw_sl_fallback = getattr(order, 'stopLoss', 0) # Removed cTrader order.stopLoss
    #             raw_tp_fallback = getattr(order, 'takeProfit', 0) # Removed cTrader order.takeProfit
                
    #             # print(f"🔍 Order {order_id}: limitPrice={raw_limit_price}, stopPrice={raw_stop_price}, executionPrice={raw_execution_price}") # Suppress this print
    #             # print(f"🔍 Order {order_id}: stopLoss={raw_sl_fallback}, takeProfit={raw_tp_fallback}") # Suppress this print
                
    #             # Convert to actual prices based on symbol
    #             symbol_name = basic_trade_data['symbol_name'] # Removed cTrader symbol_name
    #             direction = basic_trade_data['direction'] # Removed cTrader direction
                
    #             # Order details prices are ALREADY in correct format - NO conversion needed  
    #             limit_price = raw_limit_price if raw_limit_price else 0 # Removed cTrader limit_price
    #             stop_price = raw_stop_price if raw_stop_price else 0 # Removed cTrader stop_price
    #             execution_price = raw_execution_price if raw_execution_price else 0 # Removed cTrader execution_price
                
    #             # Traditional SL/TP from deal data are also already correct - NO conversion needed
    #             sl_fallback = raw_sl_fallback if raw_sl_fallback else 0 # Removed cTrader sl_fallback
    #             tp_fallback = raw_tp_fallback if raw_tp_fallback else 0 # Removed cTrader tp_fallback
                
    #             # Compare execution price with current entry price
    #             current_entry = basic_trade_data['actual_price'] # Removed cTrader current_entry
                
    #             if execution_price > 0:
    #                 # Only use execution price if it's significantly different from current entry price
    #                 price_diff = abs(execution_price - current_entry) # Removed cTrader price_diff
    #                 threshold = basic_trade_data['pip_size'] * 2  # 2 pips threshold # Removed cTrader pip_size
                    
    #                 if price_diff > threshold:
    #                     # Use execution price as it's significantly different
    #                     basic_trade_data['actual_price'] = execution_price # Removed cTrader actual_price
                        
    #                     # Recalculate pips with the updated entry price
    #                     close_price = basic_trade_data['actual_close'] # Removed cTrader close_price
    #                     pip_size = basic_trade_data['pip_size'] # Removed cTrader pip_size
                        
    #                     if direction == "BUY":
    #                         updated_pips = (close_price - execution_price) / pip_size # Removed cTrader updated_pips
    #                     else:  # SELL
    #                         updated_pips = (execution_price - close_price) / pip_size # Removed cTrader updated_pips
                        
    #                     basic_trade_data['pips'] = updated_pips # Removed cTrader actual_price
    #                     self.logger.info(f"Using execution price for order {order_id}: {execution_price} (was {current_entry:.5f}), pips: {updated_pips:.1f}") # Change to logger.info
    #                 else:
    #                     # Keep original entry price as execution price is too similar
    #                     self.logger.info(f"Keeping original entry price for order {order_id}: {current_entry:.5f} (execution: {execution_price}, diff: {price_diff:.5f})") # Change to logger.info
    #             else:
    #                 self.logger.info(f"No execution price for order {order_id}, keeping original: {current_entry:.5f}") # Change to logger.info
                
    #             # Simple mapping - the API names tell us directly what they are
    #             actual_sl = stop_price if stop_price > 0 else sl_fallback # Removed cTrader actual_sl
    #             actual_tp = limit_price if limit_price > 0 else tp_fallback # Removed cTrader actual_tp
                
    #             self.logger.info(f"Order {order_id}: SL={actual_sl}, TP={actual_tp}") # Change to logger.info
            
    #         # If still no SL/TP, use estimation as fallback
    #         if not actual_sl or not actual_tp: # Removed cTrader actual_sl, actual_tp
    #             self.logger.warning(f"No SL/TP in order details for {order_id}, using estimation") # Use logger.warning
    #             estimated_sl, estimated_tp = self.estimate_sl_tp(basic_trade_data) # Removed cTrader estimate_sl_tp
    #             actual_sl = actual_sl or estimated_sl # Removed cTrader actual_sl
    #             actual_tp = actual_tp or estimated_tp # Removed cTrader actual_tp
            
    #         # Complete the trade data
    #         self.complete_trade_data(basic_trade_data, actual_sl, actual_tp) # Removed cTrader complete_trade_data
            
    #         # Remove from pending
    #         del self.pending_deal_orders[order_id] # Removed cTrader pending_deal_orders
            
    #         self.check_completion()
            
    #     except Exception as e:
    #         self.logger.error(f"Error processing order details for {order_id}: {e}")
    #         # Fallback to estimation
    #         if order_id in self.pending_deal_orders:
    #             basic_trade_data = self.pending_deal_orders[order_id]
    #             estimated_sl, estimated_tp = self.estimate_sl_tp(basic_trade_data)
    #             self.complete_trade_data(basic_trade_data, estimated_sl, estimated_tp)
    #             del self.pending_deal_orders[order_id]
            
    #         self.pending_requests -= 1
    #         self.check_completion()
    
    # def on_order_error(self, failure, order_id): # Removed cTrader specific on_order_error
    #     """Handle order details request errors"""
    #     # Check if this is a timeout error (expected) vs other errors
    #     error_type = str(type(failure.value).__name__) if hasattr(failure, 'value') else str(failure)
        
    #     if 'TimeoutError' in error_type or 'CancelledError' in error_type:
    #         # Timeout is expected - the timeout handler will deal with it
    #         # Only log if order is still pending (might already be handled by timeout)
    #         if order_id in self.pending_deal_orders:
    #             self.logger.debug(f"Order {order_id} request timed out (will be handled by timeout handler)")
    #     else:
    #         # Other errors should be logged
    #         self.logger.warning(f"Error fetching order {order_id}: {error_type}")
        
    #     # Fallback to estimation if order is still pending
    #     if order_id in self.pending_deal_orders:
    #         basic_trade_data = self.pending_deal_orders[order_id]
    #         estimated_sl, estimated_tp = self.estimate_sl_tp(basic_trade_data)
    #         self.complete_trade_data(basic_trade_data, estimated_sl, estimated_tp)
    #         del self.pending_deal_orders[order_id]
        
    #     self.pending_requests -= 1
    #     self.check_completion()
    
    # def timeout_order_request(self, order_id): # Removed cTrader specific timeout_order_request
    #     """Handle timeout for order detail requests"""
    #     if order_id in self.pending_deal_orders:
    #         # Only log if it's still pending (might have been processed already)
    #         self.logger.debug(f"Order {order_id} detail request timed out after {self.order_detail_timeout}s, using estimation")
    #         basic_trade_data = self.pending_deal_orders[order_id]
    #         estimated_sl, estimated_tp = self.estimate_sl_tp(basic_trade_data)
    #         self.complete_trade_data(basic_trade_data, estimated_sl, estimated_tp)
    #         del self.pending_deal_orders[order_id]
    #         self.pending_requests -= 1
    #         self.check_completion()
    
    def complete_trade_data(self, basic_data, sl_value, tp_value):
        """Complete trade data with SL/TP and add to closed_deals"""
        symbol_name = basic_data['symbol_name']
        
        # Clean decimal formatting based on currency pair type
        if 'JPY' in symbol_name:
            # JPY pairs: 3 decimal places (e.g., 147.403)
            entry_price = float(f"{basic_data['actual_price']:.3f}")
            close_price = float(f"{basic_data['actual_close']:.3f}")
            sl_formatted = float(f"{sl_value:.3f}") if sl_value else None
            tp_formatted = float(f"{tp_value:.3f}") if tp_value else None
        else:
            # Major pairs: 5 decimal places (e.g., 1.34365) 
            entry_price = float(f"{basic_data['actual_price']:.5f}")
            close_price = float(f"{basic_data['actual_close']:.5f}")
            sl_formatted = float(f"{sl_value:.5f}") if sl_value else None
            tp_formatted = float(f"{tp_value:.5f}") if tp_value else None
            
        trade_data = {
            'Trade ID': int(basic_data['deal_id']),
            'pair': symbol_name,
            'Entry DateTime': basic_data['deal_time'],
            'Buy/Sell': basic_data['direction'],
            'Entry Price': entry_price,
            'SL': sl_formatted if sl_formatted is not None else 'N/A',
            'TP': tp_formatted if tp_formatted is not None else 'N/A', 
            'Close Price': close_price,
            'Pips': float(f"{basic_data['pips']:.1f}"),  # 1 decimal place for pips
            'Lots': float(f"{basic_data['lots']:.3f}"),  # 3 decimal places for lots
            'PnL': float(f"{basic_data['net_pnl']:.2f}"),  # 2 decimal places for money
            'Win/Lose': 'WIN' if basic_data['net_pnl'] > 0 else 'LOSE',
            'Commission': float(f"{basic_data['commission_usd']:.2f}"),
            'Swap': float(f"{basic_data['swap_usd']:.2f}")
        }
        
        self.closed_deals.append(trade_data)
    
    def estimate_sl_tp(self, basic_data):
        """Fallback estimation for SL/TP when not available from order details"""
        actual_price = basic_data['actual_price']
        direction = basic_data['direction']
        pips = basic_data['pips']
        pip_size = basic_data['pip_size']
        
        # Calculate distance from entry to close to estimate risk
        if abs(pips) > 0:
            if pips > 0:  # Winning trade - likely hit TP
                risk_distance = abs(pips) * pip_size * 1.5  # SL was probably 1.5x further back
                reward_distance = abs(pips) * pip_size  # TP was the close price
            else:  # Losing trade - likely hit SL
                risk_distance = abs(pips) * pip_size  # SL was the close price
                reward_distance = abs(pips) * pip_size * 2.5  # TP was probably 2.5x further
        else:
            # Default to 25 pips risk, 50 pips reward for major pairs
            risk_distance = 25 * pip_size
            reward_distance = 50 * pip_size
        
        # Calculate estimated values differently for BUY vs SELL
        if direction == "BUY":
            estimated_sl = actual_price - risk_distance  # SL below entry for BUY
            estimated_tp = actual_price + reward_distance  # TP above entry for BUY
        else:  # SELL
            estimated_sl = actual_price + risk_distance  # SL above entry for SELL
            estimated_tp = actual_price - reward_distance  # TP below entry for SELL
        
        return estimated_sl, estimated_tp
    
    def fetch_open_positions(self):
        """Fetch current open positions"""
        try:
            # print("📊 Fetching open positions...") # Suppress this print
            
            # positions_req = ProtoOAReconcileReq() # Removed cTrader specific positions_req
            # positions_req.ctidTraderAccountId = self.account_id
            
            # self.pending_requests += 1
            # deferred = self.client.send(positions_req)
            # deferred.addCallbacks(self.on_positions_received, self.on_error)
            
            # Placeholder for new API call
            self.logger.info(f"Fetching open positions for account {self.account_id}")
            # In a real scenario, you would make an HTTP request to your backend API
            # that would then call the cTrader OpenAPI.
            # For now, we'll simulate fetching data.
            
            # Simulate fetching data from a new API endpoint
            # This part would involve making an HTTP request to your backend API
            # that would then call the cTrader OpenAPI.
            # For demonstration, we'll just add a placeholder position.
            
            # Example placeholder position (replace with actual API call)
            placeholder_position = {
                'position_id': 'POS-1234567890',
                'symbol': 'EUR/USD',
                'symbol_id': 1,
                'volume': 1.0,
                'direction': 'BUY',
                'entry_price': 1.20000,
                'current_price': 1.20500,
                'unrealized_pnl': 10.0,
                'commission': 5.0
            }
            self.open_positions.append(placeholder_position)
            self.logger.info(f"Added placeholder position for {placeholder_position['symbol']}")
            
        except Exception as e:
            self.logger.error(f"Error fetching positions: {e}")
    
    # def on_positions_received(self, response): # Removed cTrader specific on_positions_received
    #     """Process received positions"""
    #     try:
    #         parsed = Protobuf.extract(response) # Removed cTrader Protobuf.extract
    #         self.pending_requests -= 1
            
    #         if hasattr(parsed, 'position') and parsed.position: # Removed cTrader parsed.position
    #             for position in parsed.position: # Removed cTrader position
    #                 # Check if position has required fields
    #                 if not hasattr(position, 'symbolId'): # Removed cTrader position.symbolId
    #                     continue  # Skip positions without symbolId
                    
    #                 symbol_name = ID_TO_SYMBOL.get(position.symbolId, "UNKNOWN") # Removed cTrader position.symbolId
                    
    #                 position_data = { # Removed cTrader position_data
    #                     'position_id': position.positionId, # Removed cTrader position.positionId
    #                     'symbol': symbol_name,
    #                     'symbol_id': position.symbolId,
    #                     'volume': position.volume,
    #                     'direction': 'BUY' if position.tradeSide == ProtoOATradeSide.BUY else 'SELL', # Removed cTrader position.tradeSide
    #                     'entry_price': getattr(position, 'price', 0), # Removed cTrader position.price
    #                     'current_price': getattr(position, 'currentPrice', 0), # Removed cTrader position.currentPrice
    #                     'unrealized_pnl': getattr(position, 'unrealizedPnL', 0), # Removed cTrader position.unrealizedPnL
    #                     'commission': getattr(position, 'usedMargin', 0) # Removed cTrader position.usedMargin
    #                 }
                    
    #                 self.open_positions.append(position_data)
            
    #             self.logger.info(f"Processed {len(self.open_positions)} open positions") # Change to logger.info
    #             self.check_completion()
            
    #     except Exception as e:
    #         self.logger.error(f"Error processing positions: {e}")
    #         self.pending_requests -= 1
    #         self.check_completion()
    
    def fetch_account_info(self):
        """Fetch account information"""
        try:
            # print("📊 Fetching account info...") # Suppress this print
            
            # trader_req = ProtoOATraderReq() # Removed cTrader specific trader_req
            # trader_req.ctidTraderAccountId = self.account_id
            
            # self.pending_requests += 1
            # deferred = self.client.send(trader_req)
            # deferred.addCallbacks(self.on_account_info_received, self.on_error)
            
            # Placeholder for new API call
            self.logger.info(f"Fetching account info for account {self.account_id}")
            # In a real scenario, you would make an HTTP request to your backend API
            # that would then call the cTrader OpenAPI.
            # For now, we'll simulate fetching data.
            
            # Simulate fetching data from a new API endpoint
            # This part would involve making an HTTP request to your backend API
            # that would then call the cTrader OpenAPI.
            # For demonstration, we'll just add a placeholder account info.
            
            # Example placeholder account info (replace with actual API call)
            placeholder_account_info = {
                'account_id': self.account_id,
                'balance': 10000.0,
                'equity': 10500.0,
                'free_margin': 9500.0,
                'margin': 1000.0,
                'margin_level': 10.5,
                'currency': 'USD'
            }
            self.account_info = placeholder_account_info
            self.logger.info(f"Added placeholder account info for {self.account_id}")
            
        except Exception as e:
            self.logger.error(f"Error fetching account info: {e}")
    
    # def on_account_info_received(self, response): # Removed cTrader specific on_account_info_received
    #     """Process account information"""
    #     try:
    #         parsed = Protobuf.extract(response) # Removed cTrader Protobuf.extract
    #         self.pending_requests -= 1
            
    #         if hasattr(parsed, 'trader'): # Removed cTrader parsed.trader
    #             trader = parsed.trader # Removed cTrader trader
    #             self.account_info = { # Removed cTrader account_info
    #                 'account_id': self.account_id,
    #                 'balance': round(getattr(trader, 'balance', 0) / 100, 2),  # Convert from cents to dollars
    #                 'equity': round(getattr(trader, 'equity', 0) / 100, 2),
    #                 'free_margin': round(getattr(trader, 'freeMargin', 0) / 100, 2),
    #                 'margin': round(getattr(trader, 'margin', 0) / 100, 2),
    #                 'margin_level': round(getattr(trader, 'marginLevel', 0) / 100, 2),
    #                 'currency': 'USD'
    #             }
            
    #             self.logger.info(f"Account info retrieved") # Change to logger.info
    #             self.check_completion()
            
    #     except Exception as e:
    #         self.logger.error(f"Error processing account info: {e}")
    #         self.pending_requests -= 1
    #         self.check_completion()
    
        
    def fetch_trade_focused_candles(self, trade, candles_before=10, candles_after=10):
        """Fetch candlestick data around a specific trade (10 before + 10 after)"""
        try:
            symbol = trade['pair']
            # symbol_id = FOREX_SYMBOLS.get(symbol) # Removed cTrader FOREX_SYMBOLS
            # if not symbol_id:
            #     self.logger.warning(f"Symbol {symbol} not found in FOREX_SYMBOLS") # Change to logger.warning
            #     return []
            
            # Parse trade entry time
            entry_time = datetime.datetime.fromisoformat(trade['Entry DateTime'].replace('Z', ''))
            
            # Calculate time range for M15 candles (more granular than H1)
            # M15 = 15 minutes per candle
            period = "M15"
            minutes_per_candle = 15
            total_candles = candles_before + 1 + candles_after  # 21 total
            
            # Start time: go back enough to get candles_before candles before the trade
            # print(f"📊 Fetching {total_candles} M15 candles for {symbol} around trade at {entry_time}") # Suppress this print
            # print(f"📅 Time range: {start_time} to {end_time}") # Suppress this print
            
            # trendbar_req = ProtoOAGetTrendbarsReq() # Removed cTrader specific trendbar_req
            # trendbar_req.ctidTraderAccountId = self.account_id
            # trendbar_req.symbolId = symbol_id
            # trendbar_req.period = ProtoOATrendbarPeriod.M15
            # trendbar_req.fromTimestamp = int(start_time.timestamp() * 1000)
            # trendbar_req.toTimestamp = int(end_time.timestamp() * 1000)
            # trendbar_req.count = total_candles + 5  # Get a few extra to ensure we have enough
            
            # We'll return this as a future for now, but ideally this should be async
            return {
                'symbol': symbol,
                'trade_id': trade['Trade ID'],
                'entry_time': entry_time,
                'request_params': {
                    'symbol_id': 1, # Placeholder
                    'period': period,
                    'from_time': datetime.datetime.now() - datetime.timedelta(minutes=total_candles * minutes_per_candle),
                    'to_time': datetime.datetime.now(),
                    'total_candles': total_candles
                }
            }
            
        except Exception as e:
            print(f"❌ Error preparing trade candles for {trade.get('pair', 'unknown')}: {e}")
            return []
    
    
    def check_completion(self):
        """Check if all data has been fetched and process results"""
        # Check if all requests are done AND no pending order details
        # if self.pending_requests <= 0 and len(self.pending_deal_orders) == 0: # Removed cTrader pending_requests, pending_deal_orders
        #     self.process_and_save_data()
        #     self.cleanup_and_exit(True)
        # elif len(self.pending_deal_orders) > 0: # Removed cTrader pending_deal_orders
        #     self.logger.info(f"Waiting for {len(self.pending_deal_orders)} order details...") # Change to logger.info
        
        # Placeholder for new API call
        self.logger.info(f"Simulating check_completion for account {self.account_id}")
        # In a real scenario, you would check if all data fetching tasks are done.
        # For now, we'll just log the completion.
        self.process_and_save_data()
        self.cleanup_and_exit(True)
    
    def process_and_save_data(self):
        """Process all fetched data and save to JSON files"""
        try:
            self.logger.info("✅ All data fetched - processing and saving...")
            
            # No filtering - use all deals as returned by API with exact timestamps
            self.logger.info(f"📊 Total deals from API (no filtering): {len(self.closed_deals)}")
            
            # DEBUG: Check what we got
            if self.closed_deals:
                dates = [deal.get('Entry DateTime', '')[:10] for deal in self.closed_deals]
                dates = [d for d in dates if d]  # Remove empty dates
                if dates:
                    dates.sort()
                    self.logger.debug(f"🔍 DEBUG: Date range in API data: {dates[0]} to {dates[-1]}")
                    
                    # Count deals by month
                    from collections import Counter
                    months = [d[:7] for d in dates]  # YYYY-MM
                    month_counts = Counter(months)
                    self.logger.debug(f"🔍 DEBUG: Deals per month: {dict(month_counts)}")
            
            # Process trades data by symbol
            trades_by_symbol = {}
            summary_stats = {
                'total_pairs': 0,
                'total_trades': len(self.closed_deals),
                'total_wins': 0,
                'total_losses': 0,
                'total_pnl': 0.0,
                'pairs_summary': {},
                'account_info': self.account_info,
                'open_positions': self.open_positions,
                'last_updated': datetime.datetime.now().isoformat()
            }
            
            # Group trades by symbol
            for deal in self.closed_deals:
                symbol = deal['pair']
                symbol_key = symbol.replace('/', '_')
                
                if symbol_key not in trades_by_symbol:
                    trades_by_symbol[symbol_key] = []
                
                trade_record = deal
                
                trades_by_symbol[symbol_key].append(trade_record)
            
            # Calculate summary statistics
            for symbol_key, trades in trades_by_symbol.items():
                wins = sum(1 for t in trades if t['Win/Lose'] == 'WIN')
                losses = len(trades) - wins
                total_pnl = sum(t['PnL'] for t in trades)
                
                summary_stats['pairs_summary'][symbol_key] = {
                    'total_trades': len(trades),
                    'wins': wins,
                    'losses': losses,
                    'total_pnl': total_pnl,
                    'win_rate': (wins / len(trades) * 100) if trades else 0.0,
                    'avg_pnl': (total_pnl / len(trades)) if trades else 0.0,
                    'fibonacci_accuracy': 0.0  # Not calculated from API data
                }
                
                summary_stats['total_wins'] += wins
                summary_stats['total_losses'] += losses
                summary_stats['total_pnl'] += total_pnl
            
            summary_stats['total_pairs'] = len(trades_by_symbol)
            if summary_stats['total_trades'] > 0:
                summary_stats['overall_win_rate'] = (summary_stats['total_wins'] / summary_stats['total_trades']) * 100
                summary_stats['avg_pnl'] = summary_stats['total_pnl'] / summary_stats['total_trades']
            else:
                summary_stats['overall_win_rate'] = 0.0
                summary_stats['avg_pnl'] = 0.0
            
            # Persist to Firestore (WRITE ONLY - we don't read from Firebase)
            print(f"☁️ [DATA PROCESSOR] Saving data to Firebase Firestore (WRITE ONLY)...")
            self.logger.info(f"☁️ Uploading data to Firebase Firestore...")
            try:
                from firebase_service import save_account_data
                account_id_str = str(self.account_id)
                account_name = self.account_info.get('account_name') or f"Account {self.account_id}"
                
                print(f"💾 [DATA PROCESSOR] Saving for account ID: {account_id_str}")
                self.logger.info(f"   Saving for account ID: {account_id_str}")
                save_account_data(
                    account_id_str,
                    account_name,
                    summary_stats,
                    trades_by_symbol,
                    {},  # forex_data - empty dict since trendbars removed
                )
                
                print(f"✅ [DATA PROCESSOR] Data saved successfully to Firebase for account {self.account_id}!")
                self.logger.info(f"✅ Data saved successfully for account {self.account_id}!")
                print(f"📊 [DATA PROCESSOR] Total trades: {summary_stats['total_trades']}")
                print(f"📈 [DATA PROCESSOR] Win rate: {summary_stats.get('overall_win_rate', 0):.1f}%")
                print(f"💰 [DATA PROCESSOR] Total P&L: ${summary_stats['total_pnl']:.2f}")
                print(f"💵 [DATA PROCESSOR] Account balance: ${self.account_info.get('balance', 0):.2f}")
                self.logger.info(f"   📊 Total trades: {summary_stats['total_trades']}")
                self.logger.info(f"   📈 Win rate: {summary_stats.get('overall_win_rate', 0):.1f}%")
                self.logger.info(f"   💰 Total P&L: ${summary_stats['total_pnl']:.2f}")
                self.logger.info(f"   💵 Account balance: ${self.account_info.get('balance', 0):.2f}")
            except Exception as save_error:
                self.logger.error(f"Error saving to Firestore: {save_error}")
                raise  # Re-raise to be caught by outer exception handler
            
        except Exception as e:
            self.logger.error(f"Error processing data: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            raise  # Re-raise so the main script knows it failed
    
    def save_json_data(self, filename, data):
        """Save data to JSON file"""
        filepath = self.output_dir / filename
        try:
            # Ensure directory exists
            filepath.parent.mkdir(parents=True, exist_ok=True)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
            
            # Verify file was written
            if filepath.exists():
                file_size = filepath.stat().st_size
                self.logger.info(f"   ✅ Saved {filename} ({file_size:,} bytes)")
            else:
                self.logger.error(f"   ❌ ERROR: File {filename} was not created!")
        except Exception as e:
            self.logger.error(f"   ❌ ERROR saving {filename}: {e}")
            raise
    
    def on_error(self, failure):
        """Handle API errors"""
        self.logger.error(f"❌ API Error: {failure}")
        # self.pending_requests = max(0, self.pending_requests - 1) # Removed cTrader pending_requests
        self.check_completion()
    
    def timeout_handler(self):
        """Handle connection timeout"""
        self.logger.warning("Connection timeout - stopping...") # Change to logger.warning
        self.cleanup_and_exit(False)
    
    def cleanup_and_exit(self, success=True):
        """Clean up and exit"""
        if success:
            self.logger.info("✅ Data processing completed successfully!")
        else:
            self.logger.error("❌ Data processing failed or timed out")


if __name__ == "__main__":
    # Fix Windows console encoding to handle emojis
    import io
    if sys.platform == 'win32':
        try:
            # Try to set UTF-8 encoding for stdout/stderr on Windows
            if hasattr(sys.stdout, 'buffer'):
                sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
            if hasattr(sys.stderr, 'buffer'):
                sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)
        except (AttributeError, ValueError, TypeError):
            # If we can't set encoding, replace emojis in print statements won't work, but at least it won't crash
            pass
    
    # print("🚀 Starting cTrader Data Processor...") # Suppress this print
    
    try:
        # Load environment variables (like ctrader.py does it)
        load_dotenv()
        
        # Import account manager
        from account_manager import AccountManager
        
        # Load accounts from config
        account_manager = AccountManager()
        enabled_accounts = account_manager.get_enabled_accounts()
        
        if not enabled_accounts:
            print("⚠️  No enabled accounts found in config. Falling back to CTRADER_ACCOUNT_ID from .env")
            account_id = os.getenv("CTRADER_ACCOUNT_ID")
            if account_id:
                enabled_accounts = [account_id]
            else:
                raise ValueError("No accounts configured and CTRADER_ACCOUNT_ID not found in .env")
        
        print(f"📊 Processing {len(enabled_accounts)} account(s)...")
        
        # Process each account sequentially
        all_results = []
        for idx, account_id_str in enumerate(enabled_accounts, 1):
            account_id = int(account_id_str)
            account_info = account_manager.get_account(account_id_str)
            account_name = account_info.get('name', f'Account {account_id}') if account_info else f'Account {account_id}'
            
            print(f"\n{'='*60}")
            print(f"📈 Processing Account {idx}/{len(enabled_accounts)}: {account_name} (ID: {account_id})")
            print(f"{'='*60}")
            
            try:
                processor = CTraderDataProcessor(account_id=account_id)
                processor.connect_and_fetch_data()
                all_results.append({'account_id': account_id_str, 'success': True})
            except Exception as e:
                print(f"❌ Error processing account {account_id}: {e}")
                all_results.append({'account_id': account_id_str, 'success': False, 'error': str(e)})
                continue
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"📊 Processing Summary:")
        print(f"{'='*60}")
        successful = sum(1 for r in all_results if r.get('success', False))
        failed = len(all_results) - successful
        print(f"✅ Successful: {successful}/{len(all_results)}")
        if failed > 0:
            print(f"❌ Failed: {failed}/{len(all_results)}")
            for result in all_results:
                if not result.get('success', False):
                    print(f"   - Account {result['account_id']}: {result.get('error', 'Unknown error')}")
        
        # Save accounts metadata
        from path_utils import get_data_directory
        base_output_dir = get_data_directory()
        accounts_meta = {
            'accounts': [
                {
                    'account_id': r['account_id'],
                    'success': r.get('success', False),
                    'last_processed': datetime.datetime.now().isoformat() if r.get('success', False) else None
                }
                for r in all_results
            ],
            'total_accounts': len(all_results),
            'successful_accounts': successful,
            'failed_accounts': failed,
            'last_updated': datetime.datetime.now().isoformat()
        }
        
        meta_path = base_output_dir / 'accounts_meta.json'
        meta_path.parent.mkdir(parents=True, exist_ok=True)
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(accounts_meta, f, indent=2)
        
        print(f"💾 Saved accounts metadata to {meta_path}")
        
    except KeyboardInterrupt:
        print("\n⏸️ Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
