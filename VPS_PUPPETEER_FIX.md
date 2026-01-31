# VPS Puppeteer/Chrome Fix

## Problem
Getting error: `Browser was not found at the configured executablePath (/usr/bin/google-chrome)`

This happens because Chrome/Chromium is not installed at the expected path on your VPS.

## Solution Applied

### 1. Updated `controllers/parcelController.js`

Added a helper function `getPuppeteerLaunchOptions()` that:
- First checks if running on Render or AWS Lambda → uses `@sparticuz/chromium`
- Then checks if `PUPPETEER_EXECUTABLE_PATH` env var is set → uses that path
- Falls back to `@sparticuz/chromium` for VPS environments
- Last resort: lets Puppeteer find Chrome automatically

### 2. Updated `.env`

Commented out the incorrect Chrome path:
```bash
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome  # Commented out
```

Now the app will use `@sparticuz/chromium` package which is already installed.

## How It Works

The `@sparticuz/chromium` package:
- Downloads a pre-built Chromium binary optimized for serverless/VPS
- Works on Linux environments without needing system Chrome
- Automatically handles the executable path
- Smaller footprint than full Chrome installation

## Testing on VPS

1. **Deploy the updated code to your VPS**
   ```bash
   git pull origin main
   npm install  # Just to be safe
   pm2 restart all  # Or however you restart your app
   ```

2. **Test PDF generation**
   - Try generating an LR receipt from the frontend
   - Check the logs: `pm2 logs` or your log viewer
   - You should see: "Attempting to use @sparticuz/chromium..."

3. **If it still fails**, check the logs for the exact error

## Alternative: Install Chrome on VPS (Not Recommended)

If you really want to use system Chrome instead of the package:

```bash
# For Ubuntu/Debian VPS
sudo apt-get update
sudo apt-get install -y chromium-browser

# Then update .env with the correct path
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

But using `@sparticuz/chromium` is better because:
- No system dependencies
- Consistent across environments
- Easier to maintain
- Works on Render, AWS Lambda, and VPS

## Environment Variables

### Current Setup (Recommended)
```bash
# .env
# PUPPETEER_EXECUTABLE_PATH is commented out
# Will use @sparticuz/chromium automatically
```

### For Render (Already Handled)
```bash
RENDER=true  # Automatically set by Render
```

### For Custom Chrome Path (If Needed)
```bash
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

## Affected Endpoints

These endpoints generate PDFs and are now fixed:
- `GET /api/parcel/generate-lr-receipt/:id` - Standard LR receipt
- `GET /api/parcel/preview-lr-thermal/:id` - Thermal receipt preview
- Any other endpoint using Puppeteer

## Logs to Watch For

**Success:**
```
Configuring Puppeteer launch options...
Attempting to use @sparticuz/chromium...
Chromium path: /tmp/chromium-...
```

**Failure (old error):**
```
Browser was not found at the configured executablePath (/usr/bin/google-chrome)
```

## Troubleshooting

### Error: "Cannot find module '@sparticuz/chromium'"
```bash
npm install @sparticuz/chromium
```

### Error: "Chromium not available"
The code will fall back to default Puppeteer. Check if puppeteer is installed:
```bash
npm install puppeteer-core
```

### Still getting Chrome path error
Make sure you've:
1. Pulled the latest code
2. Commented out `PUPPETEER_EXECUTABLE_PATH` in .env
3. Restarted your Node.js process

## Production Checklist

- [x] Updated parcelController.js with helper function
- [x] Commented out incorrect Chrome path in .env
- [x] @sparticuz/chromium package is installed
- [ ] Deploy to VPS
- [ ] Restart Node.js process
- [ ] Test PDF generation
- [ ] Monitor logs for any errors

## Support

If you still face issues:
1. Check the exact error message in logs
2. Verify @sparticuz/chromium version: `npm list @sparticuz/chromium`
3. Check Node.js version: `node --version` (should be 18+)
4. Check available memory on VPS: `free -h` (Chromium needs ~200MB)
