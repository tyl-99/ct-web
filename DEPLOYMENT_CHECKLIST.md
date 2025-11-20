# 🚀 Deployment Readiness Checklist

**Date**: 2025-01-19  
**Status**: ✅ **READY FOR DEPLOYMENT** (with notes)

## ✅ Configuration Files Verified

### Backend (Python)
- ✅ `requirements.txt` - All dependencies present:
  - `pandas==2.2.3` ✅
  - `numpy>=1.23.5,<3.0` ✅
  - `requests==2.32.3` ✅
  - `python-dotenv==1.1.0` ✅
  - `matplotlib==3.7.5` ✅
  - `openpyxl==3.1.0` ✅
  - `firebase-admin==6.5.0` ✅
  - `Flask==3.0.0` ✅
  - `flask-cors==4.0.0` ✅

- ✅ `runtime.txt` - Python 3.10.16 specified ✅

### Frontend (Next.js)
- ✅ `frontend/package.json` - All dependencies present ✅
- ✅ `frontend/next.config.js` - VAPID key now uses environment variable ✅
- ✅ Node.js engines specified: `>=18.17.0` ✅

### Deployment Configuration
- ✅ `railway.json` - Railway configuration present ✅
- ✅ `Procfile` - Process definition: `web: cd frontend && npm start` ✅
- ✅ `.gitignore` - Properly excludes sensitive files ✅

## ✅ Code Quality Checks

### Environment Variables
- ✅ **Fixed**: VAPID key now uses `process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY` with fallback
- ✅ Flask server uses `PORT` environment variable ✅
- ✅ Flask debug mode controlled by `FLASK_DEBUG` env var ✅
- ✅ Firebase credentials loaded from environment variables ✅
- ✅ Data directory uses `DATA_DIR` environment variable ✅

### Production Readiness
- ✅ No hardcoded secrets (VAPID key fixed) ✅
- ✅ Port configuration uses environment variables ✅
- ✅ Debug mode disabled by default ✅
- ✅ Error handling in place ✅
- ✅ Health check endpoint available (`/api/health`) ✅

## ⚠️ Required Environment Variables for Railway

**You MUST set these in Railway dashboard → Variables tab:**

### Required:
```bash
# Firebase Admin SDK (for backend API routes)
FIREBASE_ADMIN_CREDENTIALS={"type":"service_account","project_id":"my-trader-9e446",...}
# OR use file path (if using Railway volume):
FIREBASE_ADMIN_CREDENTIALS_PATH=/path/to/service-account.json

# Firebase VAPID Key (for web push notifications)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BEirJUyHHEE0th0-6V0T8vQAlOGiyOTFXvt38xzgZW8XtABz7VloUCYNvJQ77oE3ZBqXbs3WqIK_u41bTfBIxQQ
```

### Optional (if using data processor):
```bash
CTRADER_CLIENT_ID=your_client_id
CTRADER_CLIENT_SECRET=your_client_secret
CTRADER_ACCOUNT_ID=your_account_id
```

### Optional (for file-based storage):
```bash
DATA_DIR=/app/data
FLASK_DEBUG=false
NODE_ENV=production
```

## 📋 Pre-Deployment Steps

1. **Set Environment Variables** in Railway dashboard
   - Go to your Railway project → Variables tab
   - Add all required variables listed above

2. **Verify Firebase Credentials**
   - Ensure `FIREBASE_ADMIN_CREDENTIALS` is valid JSON
   - Test locally with: `python backend/test_firebase_credentials.py`

3. **Test Build Locally** (Recommended)
   ```bash
   cd frontend
   npm install
   npm run build
   npm start
   ```

4. **Deploy to Railway**
   - Push to GitHub (if connected)
   - Or use Railway CLI: `railway up`

## 🎯 What Railway Will Do

1. **Detect Project**: Recognizes Next.js project from `package.json`
2. **Install Dependencies**: Runs `npm install` in `frontend/` directory
3. **Build Application**: Runs `npm run build` in `frontend/` directory
4. **Start Application**: Runs `npm start` (from Procfile)
5. **Set PORT**: Automatically assigns and exposes PORT

## ✅ Post-Deployment Verification

After deployment, verify:

1. **Health Check**: Visit `https://your-app.railway.app/api/health`
   - Should return: `{"status":"healthy","service":"trade-candles-api","version":"1.0.0"}`

2. **Frontend Loads**: Visit `https://your-app.railway.app`
   - Should load the trading dashboard

3. **Firebase Connection**: Check browser console for Firebase errors
   - Should see successful Firebase initialization

4. **Notifications**: Test push notification registration
   - Should see FCM token in console logs

## 📝 Notes

- **Python Backend**: The Python backend (`backend/`) is not automatically deployed with Railway. If you need it, you'll need to:
  - Create a separate Railway service for Python
  - Or use Next.js API routes (already implemented in `frontend/app/api/`)

- **Data Storage**: The app uses Firebase Firestore as primary storage, so no persistent volumes needed unless you want file-based fallback.

- **Service Worker**: The service worker (`sw.js`) is properly configured and will be served from `/sw.js`

## 🔧 Troubleshooting

If deployment fails:

1. **Check Build Logs**: Look for missing dependencies or build errors
2. **Verify Environment Variables**: Ensure all required vars are set
3. **Check Node Version**: Railway should use Node 18+ (specified in package.json)
4. **Verify Port**: Railway sets PORT automatically, don't override it

## ✅ Final Checklist

- [x] All dependencies in requirements.txt
- [x] All dependencies in package.json
- [x] Railway configuration files created
- [x] Environment variables use env vars (no hardcoded secrets)
- [x] Port configuration uses environment variables
- [x] Debug mode disabled in production
- [x] Build scripts work without conda
- [x] VAPID key uses environment variable
- [ ] Environment variables set in Railway dashboard
- [ ] Firebase credentials configured
- [ ] Test deployment

---

**Ready to deploy!** 🚀

Set the environment variables in Railway and push to deploy.

