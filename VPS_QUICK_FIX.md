# VPS Puppeteer Quick Fix

## ⚠️ IMPORTANT: VPS ONLY - DO NOT USE ON RENDER

**This fix is ONLY for VPS/dedicated servers.**

**Render users**: Your setup is already working correctly with `@sparticuz/chromium`. Do NOT install Chromium on Render or change any configuration.

---

## The Problem (VPS Only)
```
"Browser was not found at the configured executablePath (/usr/bin/google-chrome)"
```

## How the Code Works (Priority Order)

The code automatically detects your environment:

1. **RENDER/AWS Lambda** → Uses `@sparticuz/chromium` (cloud-optimized) ✅
2. **VPS with PUPPETEER_EXECUTABLE_PATH** → Uses your custom path
3. **VPS with Chromium installed** → Auto-detects common paths
4. **Fallback** → Tries `@sparticuz/chromium`

**This means Render will ALWAYS use `@sparticuz/chromium` regardless of VPS changes.**

---

## The Solution (Choose One)

### ⚡ FASTEST - Use Auto-Detection (Recommended)
The code now auto-detects Chromium. Just install it:

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Install Chromium
sudo apt-get update
sudo apt-get install -y chromium-browser

# Restart your app
pm2 restart all
```

**That's it!** The code will automatically find and use Chromium.

---

### 🤖 AUTOMATED - Use Installation Script

```bash
# On your VPS
wget https://your-repo/install-chromium-vps.sh
chmod +x install-chromium-vps.sh
./install-chromium-vps.sh

# Follow the on-screen instructions
```

---

### 🔧 MANUAL - Set Environment Variable

```bash
# Install Chromium
sudo apt-get update
sudo apt-get install -y chromium-browser

# Find the path
which chromium-browser

# Add to .env file
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> .env

# Restart
pm2 restart all
```

---

## Verify It Works

```bash
# Check if Chromium is installed
chromium-browser --version

# Check if path exists
ls -la /usr/bin/chromium-browser

# Check app logs
pm2 logs

# Look for this message:
# "Found Chrome/Chromium at: /usr/bin/chromium-browser"
```

---

## Still Not Working?

### Missing Dependencies?
```bash
sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils
```

### Check Logs
```bash
pm2 logs --lines 100
```

Look for:
- ✓ "Found Chrome/Chromium at: ..." = Good!
- ✗ "WARNING: No Chrome/Chromium found" = Install Chromium
- ✗ "Failed to launch browser" = Missing dependencies

---

## For Different OS

**Ubuntu/Debian:**
```bash
sudo apt-get install -y chromium-browser
```

**CentOS/RHEL:**
```bash
sudo yum install -y chromium
```

**Amazon Linux:**
```bash
sudo amazon-linux-extras install epel -y
sudo yum install -y chromium
```

---

## Test PDF Generation

After fixing:
1. Restart your app: `pm2 restart all`
2. Go to your frontend: `https://friendstransport.in`
3. Try to generate an LR receipt
4. Should work now! ✅

---

## Need More Help?

See detailed documentation:
- `VPS_PUPPETEER_FIX.md` - Full troubleshooting guide
- `install-chromium-vps.sh` - Automated installation script

Or check the logs:
```bash
pm2 logs
```
