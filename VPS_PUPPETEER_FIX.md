# VPS Puppeteer Fix Guide

## ⚠️ CRITICAL: READ THIS FIRST

### This Guide is for VPS/Dedicated Servers ONLY

**DO NOT use this guide if you're deploying on:**
- ✗ Render (already uses `@sparticuz/chromium` automatically)
- ✗ AWS Lambda (already uses `@sparticuz/chromium` automatically)
- ✗ Heroku, Vercel, Netlify, or other cloud platforms

**ONLY use this guide if:**
- ✓ You have a VPS (Virtual Private Server)
- ✓ You have a dedicated server
- ✓ You're getting the error: "Browser was not found at executablePath"

### How the Code Protects Render

The code checks for Render **FIRST** before trying VPS paths:

```javascript
// PRIORITY 1: Render/Lambda (checked FIRST)
if (process.env.RENDER || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    return @sparticuz/chromium; // ✅ Render always uses this
}

// PRIORITY 2-4: VPS detection (only runs if NOT Render)
// ... VPS-specific logic here ...
```

**Your Render deployment is safe and will continue working exactly as before.**

---

## Problem
Error: `Browser was not found at the configured executablePath (/usr/bin/google-chrome)`

This happens because Puppeteer needs Chrome/Chromium to generate PDFs, but it's not installed on your VPS.

## Solution Options

### Option 1: Install Chromium on VPS (Recommended for VPS)

```bash
# For Ubuntu/Debian VPS
sudo apt-get update
sudo apt-get install -y chromium-browser

# For CentOS/RHEL VPS
sudo yum install -y chromium

# For Amazon Linux 2
sudo amazon-linux-extras install epel -y
sudo yum install -y chromium
```

After installation, find the Chromium path:
```bash
which chromium-browser
# or
which chromium
```

Then update your `.env` file:
```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# or
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Option 2: Use Chrome Binary (Alternative)

```bash
# Download and install Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb

# Verify installation
which google-chrome
```

Update `.env`:
```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

### Option 3: Install Required Dependencies

Sometimes Chromium is installed but missing dependencies:

```bash
# Install dependencies
sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

### Option 4: Use Puppeteer (Full Package) Instead of puppeteer-core

If you want Puppeteer to download and manage Chrome automatically:

```bash
# Install full puppeteer (includes Chrome)
npm install puppeteer

# Remove puppeteer-core
npm uninstall puppeteer-core
```

Then update `package.json` to use `puppeteer` instead of `puppeteer-core`.

**Note**: This will increase deployment size significantly (~300MB).

---

## Quick Fix for Your VPS

Run these commands on your VPS:

```bash
# 1. Update package list
sudo apt-get update

# 2. Install Chromium
sudo apt-get install -y chromium-browser

# 3. Find the path
which chromium-browser

# 4. Test if it works
chromium-browser --version
```

Then add to your `.env` file on the VPS:
```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

Restart your Node.js application:
```bash
pm2 restart all
# or
sudo systemctl restart your-app-service
```

---

## Testing

After installation, test the PDF generation:

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Test Chromium
chromium-browser --version
# or
google-chrome --version

# Check if the path exists
ls -la /usr/bin/chromium-browser
# or
ls -la /usr/bin/google-chrome

# Restart your app
pm2 restart all
```

Then try generating an LR receipt from the frontend.

---

## Environment-Specific Configuration

Your `.env` should look like this:

**For VPS (after installing Chromium):**
```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**For Render (using @sparticuz/chromium):**
```env
# Leave commented - Render will use @sparticuz/chromium automatically
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

**For Local Development:**
```env
# Leave commented - will use locally installed Chrome
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

---

## Troubleshooting

### Error: "Failed to launch the browser process"
- Install missing dependencies (see Option 3 above)
- Check if Chromium is executable: `chmod +x /usr/bin/chromium-browser`

### Error: "Running as root without --no-sandbox is not supported"
- The code already includes `--no-sandbox` flag, so this should work

### Error: "libgobject-2.0.so.0: cannot open shared object file"
- Install missing libraries: `sudo apt-get install -y libglib2.0-0`

### Still not working?
- Check logs: `pm2 logs` or `journalctl -u your-service -f`
- Verify environment variable is loaded: `echo $PUPPETEER_EXECUTABLE_PATH`
- Try using full path in code instead of env variable

---

## Alternative: Use a Different PDF Library

If Puppeteer continues to cause issues, consider using a lighter PDF library:

- **pdfkit**: Pure JavaScript, no browser needed
- **html-pdf-node**: Lighter alternative
- **jsPDF**: Client-side PDF generation

However, these would require rewriting your PDF generation logic.

---

## Summary

**Quickest Solution for VPS:**
1. `sudo apt-get update && sudo apt-get install -y chromium-browser`
2. Add `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser` to `.env`
3. Restart your app

This should resolve the issue immediately.
