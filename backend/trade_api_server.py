#!/usr/bin/env python3
"""
Simple HTTP server for trade candlestick API
Serves trade-focused candlestick data to the frontend
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from pathlib import Path
from api.trade_candles import TradeCandleAPI
import firebase_service

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# Initialize API
trade_api = TradeCandleAPI()

@app.route('/api/trades', methods=['GET'])
def get_available_trades():
    """Get list of available trades"""
    try:
        result = trade_api.get_available_trades()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/trade/<trade_id>/candles', methods=['GET'])
def get_trade_candles(trade_id):
    """Get candlestick data for a specific trade"""
    try:
        # Get query parameters
        candles_before = int(request.args.get('before', 10))
        candles_after = int(request.args.get('after', 10))
        timeframe = request.args.get('timeframe', 'M15')
        
        # Validate parameters
        if candles_before < 1 or candles_before > 50:
            return jsonify({
                "success": False,
                "error": "candles_before must be between 1 and 50"
            }), 400
        
        if candles_after < 1 or candles_after > 50:
            return jsonify({
                "success": False,
                "error": "candles_after must be between 1 and 50"
            }), 400
        
        if timeframe not in ['M15', 'M30', 'H1', 'H4', 'D1']:
            return jsonify({
                "success": False,
                "error": "timeframe must be one of: M15, M30, H1, H4, D1"
            }), 400
        
        # Get candles data
        result = trade_api.get_trade_candles(trade_id, candles_before, candles_after, timeframe)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/send-notification', methods=['POST'])
def send_notification():
    """Sends a push notification to a device token."""
    try:
        data = request.get_json()
        token = data.get('token')
        title = data.get('title', 'Notification')
        body = data.get('body', 'You have a new message.')
        notification_data = data.get('data', {})

        if not token:
            return jsonify({"success": False, "error": "Device token is required"}), 400

        firebase_service.send_push_notification(token, title, body, notification_data)

        return jsonify({"success": True, "message": "Notification sent"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "trade-candles-api",
        "version": "1.0.0",
        "notification_service": "active"
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Endpoint not found"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500

if __name__ == '__main__':
    import os
    
    print("🚀 Starting Trade Candles API Server...")
    print("📊 Available endpoints:")
    print("   GET  /api/trades                     - Get available trades")
    print("   GET  /api/trade/<id>/candles         - Get trade candles")
    print("   GET  /api/health                     - Health check")
    print("   POST /api/send-notification          - Send push notification")
    print("   POST /api/register-token           - Register device token for notifications")
    print("")
    
    # Get port from environment variable (Railway provides PORT)
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"🌐 Server running on port {port}")
    if debug:
        print("⚠️  Debug mode enabled")
    
    app.run(host='0.0.0.0', port=port, debug=debug)


@app.route('/api/register-token', methods=['POST'])
def register_token():
    """Registers a device token for push notifications."""
    try:
        data = request.get_json()
        token = data.get('token')

        if not token:
            return jsonify({"success": False, "error": "Device token is required"}), 400

        firebase_service.save_device_token(token)

        return jsonify({"success": True, "message": "Token registered successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
