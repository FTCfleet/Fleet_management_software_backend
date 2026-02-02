# VPS Setup - Run These Commands NOW

## Quick Fix (Copy & Paste)

```bash
# 1. SSH into your VPS
ssh user@your-vps-ip

# 2. Go to backend folder
cd /path/to/your/backend

# 3. Pull latest code
git pull origin main

# 4. Run the setup script
chmod +x vps-quick-setup.sh
./vps-quick-setup.sh

# 5. Restart your app
pm2 restart all
```

---

## OR Manual Steps (if script doesn't work)

```bash
# 1. Install Chromium
sudo apt-get update
sudo apt-get install -y chromium-browser

# 2. Find the path
which chromium-browser

# 3. Add to .env file (replace with actual path from step 2)
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> .env

# 4. Restart
pm2 restart all
```

---

## Verify Installation

```bash
# Check if Chromium is installed
chromium-browser --version

# Should output something like:
# Chromium 120.0.6099.109 Built on Ubuntu

# Check if path exists
ls -la /usr/bin/chromium-browser

# Check .env file
cat .env | grep PUPPETEER

# Should show:
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

---

## Check Logs After Restart

```bash
pm2 logs

# Look for one of these messages:
# ✓ "Using custom Chrome path: /usr/bin/chromium-browser"
# ✓ "Found Chrome/Chromium at: /usr/bin/chromium-browser (VPS mode)"
```

---

## Test PDF Generation

After setup, try generating:
1. LR Receipt from frontend
2. Memo/Ledger from frontend

Both should work now!

---

## Still Getting Error?

If you still see: `An executablePath or channel must be specified`

**Check:**
1. Is Chromium installed? `chromium-browser --version`
2. Is path in .env? `cat .env | grep PUPPETEER`
3. Did you restart? `pm2 restart all`
4. Check logs: `pm2 logs --lines 50`

**If still failing, manually set the path:**
```bash
# Edit .env file
nano .env

# Add this line (or uncomment if exists):
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Save (Ctrl+X, Y, Enter)

# Restart
pm2 restart all
```
