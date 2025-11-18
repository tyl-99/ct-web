#!/bin/bash
# Deployment script for TraderWeb
# Sets up the application for hosting

set -e

echo "🚀 TraderWeb Deployment Script"
echo "================================"

# Check if DATA_DIR is set
if [ -z "$DATA_DIR" ]; then
    echo "⚠️  DATA_DIR not set. Using default: ./data"
    export DATA_DIR="./data"
fi

# Create data directory
echo "📁 Creating data directory: $DATA_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$DATA_DIR/trade_candles"

# Create symlink from frontend/public/data to DATA_DIR (for VPS hosting)
if [ -d "frontend/public" ]; then
    echo "🔗 Creating symlink from frontend/public/data to $DATA_DIR"
    if [ -L "frontend/public/data" ]; then
        echo "   Symlink already exists, removing old one..."
        rm "frontend/public/data"
    elif [ -d "frontend/public/data" ]; then
        echo "   Directory exists, backing up..."
        mv "frontend/public/data" "frontend/public/data.backup"
    fi
    ln -s "$(realpath $DATA_DIR)" "frontend/public/data"
    echo "   ✅ Symlink created"
fi

# Set permissions
echo "🔐 Setting permissions..."
chmod -R 755 "$DATA_DIR"

# Check Python environment
echo "🐍 Checking Python environment..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo "❌ Python not found!"
    exit 1
fi

echo "   Python found: $PYTHON_CMD"

# Check Node.js
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   Node.js found: $NODE_VERSION"
else
    echo "❌ Node.js not found!"
    exit 1
fi

# Install Python dependencies
echo "📥 Installing Python dependencies..."
$PYTHON_CMD -m pip install -q -r requirements.txt

# Install Node.js dependencies
echo "📥 Installing Node.js dependencies..."
cd frontend
npm install --silent
cd ..

# Build frontend
echo "🏗️  Building frontend..."
cd frontend
npm run build
cd ..

echo ""
echo "✅ Deployment setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Set environment variables:"
echo "      export DATA_DIR=$DATA_DIR"
echo "      export CTRADER_CLIENT_ID=your_id"
echo "      export CTRADER_CLIENT_SECRET=your_secret"
echo "      export CTRADER_ACCOUNT_ID=your_account_id"
echo ""
echo "   2. Test data processor:"
echo "      $PYTHON_CMD backend/data_processor.py"
echo ""
echo "   3. Start frontend:"
echo "      cd frontend && npm start"
echo ""
echo "   4. Set up cron job for data updates:"
echo "      */15 * * * * cd $(pwd) && $PYTHON_CMD backend/data_processor.py >> /var/log/traderweb.log 2>&1"



