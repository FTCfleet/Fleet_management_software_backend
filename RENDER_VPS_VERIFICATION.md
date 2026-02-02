# Render vs VPS Verification Guide

## How to Verify Your Setup is Correct

### On Render (Should see this in logs):

```
Configuring Puppeteer launch options...
✓ Cloud environment detected (Render/Lambda) - using @sparticuz/chromium
```

**What this means**: Render is using the cloud-optimized `@sparticuz/chromium` package. ✅

### On VPS (Should see this in logs):

```
Configuring Puppeteer launch options...
✓ Found Chrome/Chromium at: /usr/bin/chromium-browser (VPS mode)
```

**What this means**: VPS is using locally installed Chromium. ✅

---

## Environment Detection Logic

### Priority Order (How the Code Decides):

```
1. Is RENDER env var set? → Use @sparticuz/chromium
   └─ YES → STOP HERE (Render mode) ✅
   └─ NO → Continue to step 2

2. Is PUPPETEER_EXECUTABLE_PATH set? → Use custom path
   └─ YES → Use that path
   └─ NO → Continue to step 3

3. Does /usr/bin/chromium-browser exist? → Use it
   └─ YES → Use local Chromium (VPS mode)
   └─ NO → Continue to step 4

4. Try @sparticuz/chromium as fallback
```

**Key Point**: Render is checked in Step 1, so it NEVER reaches Steps 2-4.

---

## Testing on Render

### Before Deploying:
1. Check your Render environment variables
2. Make sure `RENDER` env var exists (Render sets this automatically)
3. Make sure `PUPPETEER_EXECUTABLE_PATH` is NOT set

### After Deploying:
1. Check Render logs for: `✓ Cloud environment detected`
2. Try generating a PDF from your frontend
3. Should work exactly as before ✅

### If Something Goes Wrong:
- Check logs for which path is being used
- Verify `@sparticuz/chromium` is in `package.json`
- Make sure `PUPPETEER_EXECUTABLE_PATH` is not set in Render env vars

---

## Testing on VPS

### Before Installing Chromium:
```bash
# Check if Chromium is already installed
which chromium-browser
which chromium
which google-chrome

# If nothing found, install it
sudo apt-get update
sudo apt-get install -y chromium-browser
```

### After Installing:
1. Restart your app: `pm2 restart all`
2. Check logs: `pm2 logs`
3. Look for: `✓ Found Chrome/Chromium at: /usr/bin/chromium-browser (VPS mode)`
4. Try generating a PDF
5. Should work now ✅

### If Something Goes Wrong:
- Check if Chromium is installed: `chromium-browser --version`
- Check if path exists: `ls -la /usr/bin/chromium-browser`
- Check app logs: `pm2 logs --lines 100`
- Try setting env var: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`

---

## Environment Variables Comparison

### Render (Automatic):
```env
# Render sets these automatically:
RENDER=true
NODE_ENV=production

# You should NOT set:
# PUPPETEER_EXECUTABLE_PATH=...  ← Don't set this on Render!
```

### VPS (Optional):
```env
# Optional - code will auto-detect if not set:
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Or leave it unset and let auto-detection work
```

---

## Quick Verification Commands

### On Render:
```bash
# Check Render logs
# Look for: "Cloud environment detected"
```

### On VPS:
```bash
# Check if Chromium is installed
chromium-browser --version

# Check app logs
pm2 logs | grep "Puppeteer"

# Should see: "Found Chrome/Chromium at: ..."
```

---

## Safety Guarantees

### Code-Level Protection:
```javascript
// This check happens FIRST, before any VPS logic
if (process.env.RENDER || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    // Render ALWAYS takes this path
    return @sparticuz/chromium;
}
// VPS logic only runs if above check is false
```

### Script-Level Protection:
```bash
# install-chromium-vps.sh checks for cloud platforms
if [ ! -z "$RENDER" ]; then
    echo "ERROR: Do not run on Render!"
    exit 1
fi
```

### Documentation Protection:
- Multiple warnings in all docs
- Clear "VPS ONLY" labels
- Explanation of priority order

---

## Summary

✅ **Render**: Uses `@sparticuz/chromium` (checked FIRST)
✅ **VPS**: Uses local Chromium (only if NOT Render)
✅ **Safe**: Render logic is completely isolated from VPS logic
✅ **Tested**: Priority order ensures no conflicts

**Your Render deployment will continue working exactly as before.**
