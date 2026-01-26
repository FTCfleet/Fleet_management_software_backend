#!/usr/bin/env bash
echo "============================"
echo " 🚀 build.sh is RUNNING 🚀 "
echo "============================"

# Skip Puppeteer's bundled Chromium download in server environments
set -x
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

if [ "$RENDER" = "true" ]; then
    echo "Render environment detected..."
    npm install puppeteer-core @sparticuz/chromium
else
    echo "Local environment detected..."
    # Install full Puppeteer locally for convenience
    npm install puppeteer
fi