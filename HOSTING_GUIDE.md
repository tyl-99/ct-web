# Hosting Deployment Guide

## ⚠️ Current Architecture Limitations

Your application currently uses **JSON files** for data storage. This works for development but has limitations for hosting:

### Issues:
1. **Ephemeral Filesystem**: Many hosting platforms (Vercel, Netlify, Railway) have read-only filesystems
2. **No Persistent Storage**: Files are lost on redeploy
3. **File Paths**: Relative paths break in production
4. **Concurrent Access**: No locking mechanism for file writes

## ✅ What We've Fixed

1. ✅ **Environment-aware paths** - Uses `DATA_DIR` environment variable
2. ✅ **Path utilities** - Centralized path resolution
3. ✅ **Backward compatible** - Still works in development

## 🚀 Hosting Options

### Option 1: VPS/Cloud Server (Recommended for Current Setup)

**Best for**: Full control, persistent storage

**Platforms**: DigitalOcean, AWS EC2, Linode, Hetzner

**Setup**:
```bash
# 1. Install dependencies
sudo apt update
sudo apt install python3.10 python3-pip nodejs npm

# 2. Clone repository
git clone <your-repo>
cd TraderWeb

# 3. Set up Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Set up Node.js
cd frontend
npm install
npm run build

# 5. Set environment variables
export DATA_DIR=/var/www/traderweb/data
export CTRADER_CLIENT_ID=your_id
export CTRADER_CLIENT_SECRET=your_secret
export CTRADER_ACCOUNT_ID=your_account_id

# 6. Create data directory
mkdir -p /var/www/traderweb/data

# 7. Run data processor (cron job)
# Add to crontab: */15 * * * * cd /path/to/TraderWeb && python backend/data_processor.py

# 8. Run Next.js (PM2 or systemd)
pm2 start npm --name "traderweb" -- start
pm2 save
```

**Pros**:
- ✅ Full control
- ✅ Persistent storage
- ✅ Can run Python scripts
- ✅ Works with current JSON setup

**Cons**:
- ❌ Requires server management
- ❌ Higher cost (~$5-20/month)

---

### Option 2: Railway / Render (Hybrid)

**Best for**: Easy deployment with persistent storage

**Setup**:

1. **Create `railway.json` or `render.yaml`**:
```yaml
services:
  - name: traderweb-frontend
    buildCommand: cd frontend && npm install && npm run build
    startCommand: cd frontend && npm start
    env:
      DATA_DIR: /app/data
      PORT: 3000
  
  - name: traderweb-backend
    buildCommand: pip install -r requirements.txt
    startCommand: python backend/data_processor.py
    schedule: "*/15 * * * *"  # Every 15 minutes
    volumes:
      - name: data
        mountPath: /app/data
```

2. **Set environment variables**:
- `DATA_DIR=/app/data`
- `CTRADER_CLIENT_ID=...`
- `CTRADER_CLIENT_SECRET=...`
- `CTRADER_ACCOUNT_ID=...`

**Pros**:
- ✅ Easy deployment
- ✅ Persistent volumes
- ✅ Automatic scaling

**Cons**:
- ❌ More expensive (~$20+/month)
- ❌ Limited Python runtime support

---

### Option 3: Vercel + External Storage (Current Limitations)

**⚠️ NOT RECOMMENDED** - Vercel has read-only filesystem

**Workaround**: Use external storage (S3, Supabase Storage, etc.)

**Setup**:
1. Store JSON files in S3/Supabase Storage
2. Update `path_utils.py` to read/write from S3
3. Use Vercel API routes to proxy data

**Pros**:
- ✅ Free tier available
- ✅ Easy deployment

**Cons**:
- ❌ Requires code changes
- ❌ More complex setup
- ❌ API rate limits

---

### Option 4: Docker + Any Platform

**Best for**: Consistent deployment

**Create `Dockerfile`**:
```dockerfile
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.10-slim
WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ ./backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules

# Create data directory
RUN mkdir -p /app/data

# Set environment
ENV DATA_DIR=/app/data
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start script
CMD ["sh", "-c", "cd frontend && npm start & python backend/data_processor.py"]
```

**Pros**:
- ✅ Works anywhere Docker runs
- ✅ Consistent environment

**Cons**:
- ❌ Requires Docker knowledge
- ❌ Still need persistent volume

---

## 🔧 Environment Variables

Set these in your hosting platform:

```bash
# Required
DATA_DIR=/path/to/persistent/data/directory
CTRADER_CLIENT_ID=your_client_id
CTRADER_CLIENT_SECRET=your_client_secret
CTRADER_ACCOUNT_ID=your_account_id

# Optional
NODE_ENV=production
PORT=3000
```

## 📁 Data Directory Structure

After deployment, your data directory should look like:

```
/data/
├── account_45073189/
│   ├── real_trades_data.json
│   ├── real_summary_stats.json
│   ├── forex_data.json
│   └── real_data_index.json
├── trade_candles/
│   └── trade_*.json
└── accounts_meta.json
```

## 🔄 Data Updates

### Option A: Cron Job (VPS)
```bash
# Add to crontab
*/15 * * * * cd /path/to/TraderWeb && /path/to/venv/bin/python backend/data_processor.py >> /var/log/traderweb.log 2>&1
```

### Option B: Scheduled Tasks (Railway/Render)
Use platform's scheduled task feature to run `data_processor.py` every 15 minutes.

### Option C: API Endpoint
Create an API endpoint that triggers data processing (with authentication).

## 🗄️ Recommended: Migrate to Database

For production, consider migrating to a database:

### SQLite (Easy Migration)
- File-based, no server needed
- Works with current JSON structure
- Better for concurrent access

### PostgreSQL (Production Ready)
- Full-featured database
- Better for scaling
- Requires database server

See `DATABASE_MIGRATION.md` (to be created) for migration guide.

## ✅ Pre-Deployment Checklist

- [ ] Set `DATA_DIR` environment variable
- [ ] Configure persistent storage/volumes
- [ ] Set up cron job or scheduled tasks for data updates
- [ ] Test data directory permissions
- [ ] Verify environment variables are set
- [ ] Test data processor runs successfully
- [ ] Verify frontend can read data files
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy

## 🆘 Troubleshooting

### Issue: Files not persisting
**Solution**: Ensure `DATA_DIR` points to a persistent volume, not ephemeral storage.

### Issue: Permission denied
**Solution**: Check directory permissions:
```bash
chmod 755 /path/to/data
chown www-data:www-data /path/to/data
```

### Issue: Path errors
**Solution**: Verify `DATA_DIR` is set correctly and path exists.

### Issue: Data not updating
**Solution**: Check cron job/scheduled task is running and has correct paths.

## 📚 Next Steps

1. **Choose hosting platform** based on your needs
2. **Set up persistent storage**
3. **Configure environment variables**
4. **Deploy application**
5. **Set up data update schedule**
6. **Monitor and test**

For questions or issues, check the application logs and verify all environment variables are set correctly.



