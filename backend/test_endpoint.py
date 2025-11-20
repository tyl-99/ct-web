#!/usr/bin/env python3
"""
Simple test script to verify the application can fetch data from http://localhost:8000/account-data
"""

import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

def test_endpoint():
    """Test fetching data from the account-data endpoint"""
    account_id = os.getenv("CTRADER_ACCOUNT_ID", "45073191")
    account_data_api_url = os.getenv("ACCOUNT_DATA_API_URL", "http://localhost:8000")
    url = f"{account_data_api_url}/account-data?account_id={account_id}"
    
    print(f"🔍 Testing endpoint: {url}")
    print(f"📊 Account ID: {account_id}")
    print("-" * 60)
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        print("✅ SUCCESS! Data fetched successfully!")
        print("-" * 60)
        print(f"📦 Response keys: {list(data.keys())}")
        
        # Check for expected data structure
        if "summary_stats" in data:
            summary = data["summary_stats"]
            print(f"\n📈 Summary Stats:")
            print(f"   - Total trades: {summary.get('total_trades', 'N/A')}")
            print(f"   - Total pairs: {summary.get('total_pairs', 'N/A')}")
            print(f"   - Total PnL: {summary.get('total_pnl', 'N/A')}")
        
        if "trades_by_symbol" in data:
            trades = data["trades_by_symbol"]
            print(f"\n💼 Trades by Symbol:")
            for symbol, symbol_trades in trades.items():
                print(f"   - {symbol}: {len(symbol_trades)} trades")
        
        print("\n✅ Endpoint test PASSED!")
        return True
        
    except requests.exceptions.ConnectionError:
        account_data_api_url = os.getenv("ACCOUNT_DATA_API_URL", "http://localhost:8000")
        print(f"❌ ERROR: Could not connect to {account_data_api_url}/account-data")
        print("   Make sure your endpoint server is running!")
        return False
        
    except requests.exceptions.Timeout:
        print("❌ ERROR: Request timed out")
        return False
        
    except requests.exceptions.HTTPError as e:
        print(f"❌ ERROR: HTTP {e.response.status_code}")
        print(f"   Response: {e.response.text[:200]}")
        return False
        
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_endpoint()

