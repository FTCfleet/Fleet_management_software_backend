#!/bin/bash

# Chromium Installation Script for VPS ONLY
# ⚠️  WARNING: DO NOT RUN THIS ON RENDER OR AWS LAMBDA ⚠️
# This script is ONLY for VPS/dedicated servers
# Render and AWS Lambda use @sparticuz/chromium automatically

echo "=========================================="
echo "Chromium Installation for VPS"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This script is for VPS/dedicated servers ONLY!"
echo "⚠️  DO NOT run on Render, AWS Lambda, or other cloud platforms"
echo ""

# Check if running on Render or AWS Lambda
if [ ! -z "$RENDER" ] || [ ! -z "$AWS_LAMBDA_FUNCTION_VERSION" ]; then
    echo "❌ ERROR: Cloud platform detected!"
    echo "This script should NOT be run on Render or AWS Lambda."
    echo "These platforms use @sparticuz/chromium automatically."
    echo "Exiting..."
    exit 1
fi

# Confirm with user
read -p "Are you running this on a VPS/dedicated server? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Installation cancelled."
    exit 0
fi

echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    echo "Detected OS: $OS"
else
    echo "Cannot detect OS. Please install Chromium manually."
    exit 1
fi

# Update package list
echo ""
echo "Updating package list..."
sudo apt-get update -y || sudo yum update -y

# Install Chromium based on OS
echo ""
echo "Installing Chromium..."

if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    # Ubuntu/Debian
    sudo apt-get install -y chromium-browser
    CHROME_PATH="/usr/bin/chromium-browser"
    
    # Install dependencies
    echo "Installing dependencies..."
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

elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    # CentOS/RHEL
    sudo yum install -y chromium
    CHROME_PATH="/usr/bin/chromium"

elif [ "$OS" = "amzn" ]; then
    # Amazon Linux
    sudo amazon-linux-extras install epel -y
    sudo yum install -y chromium
    CHROME_PATH="/usr/bin/chromium"

else
    echo "Unsupported OS: $OS"
    echo "Please install Chromium manually:"
    echo "  Ubuntu/Debian: sudo apt-get install -y chromium-browser"
    echo "  CentOS/RHEL: sudo yum install -y chromium"
    exit 1
fi

# Verify installation
echo ""
echo "Verifying installation..."

if [ -f "$CHROME_PATH" ]; then
    echo "✓ Chromium installed successfully at: $CHROME_PATH"
    
    # Test version
    $CHROME_PATH --version 2>/dev/null || echo "Note: Version check failed, but binary exists"
    
    echo ""
    echo "=========================================="
    echo "Installation Complete!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Add this line to your .env file:"
    echo "   PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH"
    echo ""
    echo "2. Restart your Node.js application:"
    echo "   pm2 restart all"
    echo "   # or"
    echo "   sudo systemctl restart your-app-service"
    echo ""
    echo "3. Test PDF generation from your frontend"
    echo ""
else
    echo "✗ Installation failed. Chromium not found at expected path."
    echo ""
    echo "Try installing manually:"
    echo "  sudo apt-get install -y chromium-browser"
    echo ""
    echo "Then find the path:"
    echo "  which chromium-browser"
    echo "  which chromium"
    echo "  which google-chrome"
    exit 1
fi
