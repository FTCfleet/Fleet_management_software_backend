const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');

// Shared Puppeteer launch-options helper.
// Priority order:
// 1. Cloud (Render / AWS Lambda) → @sparticuz/chromium
// 2. Explicit PUPPETEER_EXECUTABLE_PATH env var → VPS custom path
// 3. Auto-detect common Linux Chromium/Chrome paths → VPS installations
// 4. Fallback to @sparticuz/chromium
const getPuppeteerLaunchOptions = async () => {
    console.log('Configuring Puppeteer launch options...');

    const vpsArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--disable-extensions',
        '--no-zygote',
        '--disable-crash-reporter',
        '--disable-breakpad',
    ];

    // PRIORITY 1: Cloud environment (Render / AWS Lambda)
    if (process.env.RENDER || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        console.log('✓ Cloud environment detected (Render/Lambda) - using @sparticuz/chromium');
        return {
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            timeout: 60000,
            protocolTimeout: 60000,
        };
    }

    // PRIORITY 2: Explicit custom Chrome path (VPS .env)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        console.log(`Using custom Chrome path: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
        if (fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
            return {
                headless: true,
                args: vpsArgs,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
                timeout: 60000,
                protocolTimeout: 60000,
            };
        } else {
            console.error(`Chrome not found at: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
        }
    }

    // PRIORITY 3: Check for chrome-wrapper.sh (VPS workaround for ld.so.preload)
    const wrapperPath = require('path').join(__dirname, '..', 'chrome-wrapper.sh');
    if (fs.existsSync(wrapperPath) && fs.existsSync('/usr/bin/google-chrome-stable')) {
        console.log('✓ Using chrome-wrapper.sh to bypass VPS LD_PRELOAD issues');
        return {
            headless: true,
            args: vpsArgs,
            executablePath: wrapperPath,
            timeout: 60000,
            protocolTimeout: 60000,
        };
    }

    // PRIORITY 4: Auto-detect common Linux paths
    const commonPaths = [
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/snap/bin/chromium',
    ];

    for (const chromePath of commonPaths) {
        if (fs.existsSync(chromePath)) {
            console.log(`✓ Found Chrome/Chromium at: ${chromePath} (VPS mode)`);
            return {
                headless: true,
                args: vpsArgs,
                executablePath: chromePath,
                timeout: 60000,
                protocolTimeout: 60000,
            };
        }
    }

    // PRIORITY 5: @sparticuz/chromium fallback
    try {
        console.log('Attempting to use @sparticuz/chromium as fallback...');
        const chromiumPath = await chromium.executablePath();
        console.log(`Chromium path: ${chromiumPath}`);
        return {
            args: chromium.args,
            executablePath: chromiumPath,
            headless: chromium.headless,
            timeout: 60000,
            protocolTimeout: 60000,
        };
    } catch (e) {
        console.error('Failed to get chromium path:', e.message);
    }

    // Last resort — let Puppeteer try to find Chrome itself
    console.warn('⚠️  WARNING: No Chrome/Chromium found. PDF generation may fail.');
    console.warn('⚠️  Please install Chromium: sudo apt-get install -y chromium-browser');
    console.warn('⚠️  Or set PUPPETEER_EXECUTABLE_PATH in .env file');

    return {
        headless: true,
        args: vpsArgs,
        env: vpsEnv,
        timeout: 60000,
        protocolTimeout: 60000,
    };
};

module.exports = { getPuppeteerLaunchOptions };
