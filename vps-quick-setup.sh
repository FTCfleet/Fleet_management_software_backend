#!/bin/bash

echo "=========================================="
echo "VPS Quick Setup for PDF Generation"
echo "=========================================="
echo ""

# Check if Chromium is already installed
if command -v chromium-browser &> /dev/null; then
    echo "✓ Chromium is already installed"
    chromium-browser --version
    CHROME_PATH=$(which chromium-browser)
elif command -v chromium &> /dev/null; then
    echo "✓ Chromium is already installed"
    chromium --version
    CHROME_PATH=$(which chromium)
elif command -v google-chrome &> /dev/null; then
    echo "✓ Google Chrome is already installed"
    google-chrome --version
    CHROME_PATH=$(which google-chrome)
else
    echo "Installing Chromium..."
    sudo apt-get update
    sudo apt-get install -y chromium-browser
    
    if [ $? -eq 0 ]; then
        echo "✓ Chromium installed successfully"
        CHROME_PATH=$(which chromium-browser)
    else
        echo "✗ Installation failed"
        exit 1
    fi
fi

echo ""
echo "Chrome/Chromium path: $CHROME_PATH"
echo ""

# Check if .env file exists
if [ -f .env ]; then
    # Check if PUPPETEER_EXECUTABLE_PATH already exists
    if grep -q "PUPPETEER_EXECUTABLE_PATH" .env; then
        echo "PUPPETEER_EXECUTABLE_PATH already exists in .env"
        echo "Current value:"
        grep "PUPPETEER_EXECUTABLE_PATH" .env
    else
        echo "Adding PUPPETEER_EXECUTABLE_PATH to .env..."
        echo "" >> .env
        echo "# Chromium path for PDF generation" >> .env
        echo "PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> .env
        echo "✓ Added to .env"
    fi
else
    echo "⚠️  .env file not found in current directory"
    echo "Please run this script from your backend folder"
    exit 1
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next step: Restart your app"
echo "  pm2 restart all"
echo ""
