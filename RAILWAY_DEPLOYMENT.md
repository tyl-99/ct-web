# 🚂 Railway Deployment Guide

This guide will help you deploy TraderWeb to Railway.

## ✅ Pre-Deployment Checklist

### Required Files (All Present ✅)
- ✅ `railway.json` - Railway configuration
- ✅ `Procfile` - Process definition
- ✅ `requirements.txt` - Python dependencies (includes Flask)
- ✅ `runtime.txt` - Python version specification
- ✅ `frontend/package.json` - Node.js dependencies and scripts
- ✅ `.gitignore` - Git ignore rules

### Code Fixes Applied ✅
- ✅ Added Flask and flask-cors to requirements.txt
- ✅ Fixed Flask server to use PORT environment variable
- ✅ Disabled debug mode in production (uses FLASK_DEBUG env var)
- ✅ Removed conda dependencies from package.json scripts
- ✅ Created Railway configuration files

## 🚀 Deployment Steps

### 1. Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Create a new project

### 2. Connect Repository
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your TraderWeb repository
4. Railway will detect it's a Node.js project

### 3. Configure Build Settings

Railway should auto-detect, but verify:
- **Root Directory**: `/` (project root)
- **Build Command**: `cd frontend && npm install && npm run build`
- **Start Command**: `cd frontend && npm start`
- **Node Version**: 18+ (specified in package.json engines)

### 4. Set Environment Variables

In Railway dashboard → Variables tab, add:

#### Required Variables:
```bash
# Firebase Admin (for Next.js API routes)
FIREBASE_ADMIN_CREDENTIALS={"type":"service_account","project_id":"my-trader-9e446",...}
# OR use file path:
FIREBASE_ADMIN_CREDENTIALS_PATH=/path/to/service-account.json

# Firebase VAPID Key (for web push notifications)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here

# cTrader API Credentials (if using data processor)
CTRADER_CLIENT_ID=your_client_id
CTRADER_CLIENT_SECRET=your_client_secret
CTRADER_ACCOUNT_ID=your_account_id

# Data Directory (for persistent storage)
DATA_DIR=/app/data

# Optional: Flask Debug Mode (set to false for production)
FLASK_DEBUG=false

# Next.js Port (Railway sets PORT automatically, but you can override)
PORT=3000
```

#### Firebase Credentials Setup:
1. Get your Firebase service account JSON
2. Copy the entire JSON content
3. Paste it as `FIREBASE_ADMIN_CREDENTIALS` (single line, no newlines)
4. Or upload the file and set `FIREBASE_ADMIN_CREDENTIALS_PATH`

### 5. Configure Persistent Storage

**Important**: Railway provides ephemeral storage by default. For data persistence:

1. Go to your service → Settings → Volumes
2. Create a new volume:
   - **Name**: `data`
   - **Mount Path**: `/app/data`
3. Set `DATA_DIR=/app/data` in environment variables

### 6. Deploy

1. Railway will automatically deploy on git push
2. Or click "Deploy" in the dashboard
3. Monitor the build logs for any errors

### 7. Set Up Data Updates (Optional)

If you need to run `data_processor.py` periodically:

#### Option A: Railway Cron Jobs
1. Create a new service
2. Set start command: `python backend/data_processor.py`
3. Configure as a cron job: `*/15 * * * *` (every 15 minutes)

#### Option B: External Cron Service
Use a service like [cron-job.org](https://cron-job.org) to call a webhook endpoint.

## 🔍 Troubleshooting

### Build Fails
- **Error**: "Module not found"
  - **Solution**: Check `frontend/package.json` dependencies are correct
- **Error**: "Python not found"
  - **Solution**: Verify `runtime.txt` specifies Python 3.10

### Runtime Errors
- **Error**: "Firebase credentials not found"
  - **Solution**: Verify `FIREBASE_ADMIN_CREDENTIALS` is set correctly
- **Error**: "Port already in use"
  - **Solution**: Railway sets PORT automatically, don't hardcode it
- **Error**: "Data directory not found"
  - **Solution**: Set `DATA_DIR` environment variable and ensure volume is mounted

### Application Not Starting
- Check Railway logs for errors
- Verify all environment variables are set
- Ensure `npm run build` completes successfully
- Check that PORT is accessible (Railway handles this automatically)

## 📊 Monitoring

1. **Logs**: View real-time logs in Railway dashboard
2. **Metrics**: Monitor CPU, memory, and network usage
3. **Health Check**: Your app has `/api/health` endpoint for monitoring

## 🔄 Updating Deployment

1. Push changes to your GitHub repository
2. Railway will automatically redeploy
3. Or trigger manual deploy from Railway dashboard

## 💰 Cost Considerations

- **Free Tier**: $5 credit/month
- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage

**Note**: Persistent volumes may incur additional costs.

## 📝 Additional Notes

### Architecture
- **Frontend**: Next.js application (runs on Railway)
- **Backend**: Python scripts (can run as separate services or cron jobs)
- **Storage**: Firebase Firestore (primary) + JSON files (secondary)

### Data Flow
1. Data processor (`backend/data_processor.py`) fetches from cTrader API
2. Stores data in Firebase Firestore
3. Next.js API routes read from Firestore
4. Frontend displays data

### Environment-Specific Behavior
- **Development**: Uses local JSON files in `frontend/public/data`
- **Production**: Uses Firebase Firestore (configured via env vars)
- **Railway**: Uses `DATA_DIR` environment variable for any file-based storage

## ✅ Post-Deployment Verification

1. ✅ Application starts without errors
2. ✅ Health check endpoint responds: `https://your-app.railway.app/api/health`
3. ✅ Frontend loads correctly
4. ✅ Firebase connection works (check logs)
5. ✅ Data displays correctly
6. ✅ No hardcoded localhost URLs
7. ✅ Push notifications registered successfully (check console logs)

## 🆘 Support

If you encounter issues:
1. Check Railway logs
2. Verify environment variables
3. Test locally with same environment variables
4. Check Railway status page

---

**Ready to deploy!** 🚀