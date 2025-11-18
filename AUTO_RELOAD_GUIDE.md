# 🔄 Auto-Reload Setup Guide

Your web app now supports multiple auto-reload options for development! Choose the one that fits your workflow.

## 🚀 **Quick Start Options**

### Option 1: Simple Auto-Refresh (Recommended)
**Best for: Easy setup, periodic data updates**

```bash
# Use the enhanced batch script
start_app_auto.bat
```

**What it does:**
- ✅ Starts Next.js dev server (frontend hot reload)
- ✅ Auto-refreshes trading data every 5 minutes
- ✅ Opens browser automatically
- ✅ Simple and reliable

---

### Option 2: Advanced Development Mode
**Best for: Active development, file watching**

```bash
# Use the advanced development script
start_app_dev.bat
```

**What it does:**
- ✅ Next.js dev server (frontend hot reload)
- ✅ Python file watcher (auto data refresh on .py changes)
- ✅ Periodic data refresh (every 10 minutes)
- ✅ Frontend auto-refresh detection
- ✅ Beautiful development UI

**Requirements:**
```bash
pip install watchdog
```

---

### Option 3: Manual Control
**Best for: Custom workflows**

```bash
# Your original script
start_app.bat

# Or run individually:
npm run dev          # Next.js with frontend hot reload
npm run refresh      # Manual data refresh + dev server
```

---

## 🎯 **Auto-Reload Features**

### Frontend (Always Active)
- **Hot Reload**: Edit React/TypeScript files → Instant browser update
- **Cache Busting**: Data requests include timestamps for fresh data
- **Development Indicators**: Shows auto-refresh status in development mode

### Backend Data (Development Mode)
- **File Watching**: Edit Python files → Auto data refresh
- **Periodic Updates**: Fresh data every 5-10 minutes
- **Smart Refresh**: Only refreshes when files actually change
- **Error Handling**: Continues if one refresh fails

---

## 📋 **File Descriptions**

| File | Purpose |
|------|---------|
| `start_app.bat` | 🔸 Original script (manual refresh) |
| `start_app_auto.bat` | 🟢 Simple auto-refresh every 5 min |
| `start_app_dev.bat` | 🔥 Advanced development mode |
| `auto_refresh_data.bat` | 🔄 Data refresh worker |
| `dev_watcher.py` | 👀 Python file watcher |
| `app/hooks/useAutoRefresh.ts` | ⚡ Frontend auto-refresh hooks |

---

## 🛠️ **Development Workflow**

### For Trading Strategy Development:
```bash
# Start advanced mode
start_app_dev.bat

# Edit Python files → Data auto-refreshes
# Edit React files → Frontend auto-reloads
# Perfect for live development!
```

### For Demo/Presentation:
```bash
# Start simple auto mode  
start_app_auto.bat

# Clean, automatic updates every 5 minutes
# No terminal spam, reliable updates
```

---

## 🎮 **Controls**

### In Browser:
- **Refresh Button**: Manual data refresh anytime
- **Auto Status**: Shows if auto-refresh is enabled
- **Live Updates**: See data update timestamps

### In Terminal:
- **Ctrl+C**: Stop file watcher
- **Close Window**: Stop specific service
- **Multiple Windows**: Each service runs independently

---

## 🔧 **Customization**

### Change Refresh Intervals:

**Simple Mode** (`auto_refresh_data.bat`):
```batch
timeout /t 300  # Change 300 to seconds you want
```

**Advanced Mode** (`dev_watcher.py`):
```python
periodic_interval = 600  # Change to seconds you want
```

**Frontend** (`useAutoRefresh.ts`):
```typescript
interval: 30000  # Change to milliseconds you want
```

---

## 🐛 **Troubleshooting**

### Common Issues:

**"watchdog not found"**
```bash
pip install watchdog
```

**"Multiple windows opening"**
- Each service runs in separate window
- Close individual windows or use Ctrl+C

**"Data not refreshing"**
- Check if data_processor.py runs successfully
- Verify JSON files exist in `/public/data/`
- Check browser console for errors

**"Frontend not updating"**
- Refresh browser manually first
- Check if timestamp in data URL changes
- Verify Next.js dev server is running

---

## 💡 **Tips**

1. **Development**: Use `start_app_dev.bat` for active coding
2. **Demo**: Use `start_app_auto.bat` for presentations  
3. **Production**: Use `start_app.bat` for manual control
4. **Debugging**: Watch terminal output for error messages
5. **Performance**: Auto-refresh only runs in development mode

---

## 🎯 **Next Steps**

Your auto-reload setup is ready! Choose the option that fits your workflow and start developing with instant feedback.

**Happy coding!** 🚀
