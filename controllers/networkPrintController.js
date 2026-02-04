const net = require('net');
const Bonjour = require('bonjour-service');

/**
 * Discover network printers using mDNS/Bonjour
 * GET /api/print/discover-printers
 * 
 * Returns list of discovered printers with IP, name, model
 */
module.exports.discoverPrinters = async (req, res) => {
    console.log('🔍 Starting printer discovery via mDNS...');
    
    const bonjour = new Bonjour();
    const discoveredPrinters = [];
    const timeout = 5000; // 5 seconds discovery timeout
    
    try {
        // Browse for printer services
        const browser = bonjour.find({ 
            type: 'printer',
            protocol: 'tcp'
        });

        // Also look for IPP (Internet Printing Protocol) printers
        const ippBrowser = bonjour.find({ 
            type: 'ipp',
            protocol: 'tcp'
        });

        // Handle discovered printers
        const handleService = (service) => {
            console.log(`✓ Found printer: ${service.name}`);
            
            // Extract IP address
            const ip = service.referer?.address || 
                      service.addresses?.find(addr => addr.includes('.')) ||
                      null;
            
            // Check if this printer supports raw printing (port 9100)
            const supportsRaw = service.port === 9100 || 
                              service.txt?.pdl?.includes('application/octet-stream');
            
            const printer = {
                name: service.name,
                ip: ip,
                port: service.port || 9100,
                type: service.type,
                model: service.txt?.ty || service.txt?.product || 'Unknown',
                manufacturer: service.txt?.mfg || 'Unknown',
                supportsRaw: supportsRaw,
                protocol: service.type === 'ipp' ? 'IPP' : 'Raw TCP/IP'
            };
            
            // Only add if we have an IP and it's not a duplicate
            if (ip && !discoveredPrinters.find(p => p.ip === ip)) {
                discoveredPrinters.push(printer);
            }
        };

        browser.on('up', handleService);
        ippBrowser.on('up', handleService);

        // Wait for discovery timeout
        await new Promise((resolve) => {
            setTimeout(() => {
                browser.stop();
                ippBrowser.stop();
                bonjour.destroy();
                resolve();
            }, timeout);
        });

        console.log(`✓ Discovery complete. Found ${discoveredPrinters.length} printer(s)`);

        // If no printers found via mDNS, suggest manual entry
        if (discoveredPrinters.length === 0) {
            return res.json({
                success: true,
                printers: [],
                message: 'No printers found via mDNS. Try manual IP entry or check if printer supports Bonjour/mDNS.',
                suggestion: 'Most thermal printers use IP:9100 for raw printing'
            });
        }

        return res.json({
            success: true,
            printers: discoveredPrinters,
            message: `Found ${discoveredPrinters.length} printer(s)`
        });

    } catch (err) {
        console.error('❌ Printer discovery error:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to discover printers',
            details: err.message,
            printers: []
        });
    }
};

/**
 * Send ESC/POS commands directly to network thermal printer
 * POST /api/print/thermal-network
 * 
 * Request body:
 * {
 *   escPosCommands: "ESC/POS command string",
 *   printerIP: "192.168.1.100",
 *   printerPort: 9100
 * }
 */
module.exports.printToNetworkPrinter = async (req, res) => {
    const { escPosCommands, printerIP, printerPort } = req.body;

    // Validation
    if (!escPosCommands) {
        return res.status(400).json({ 
            success: false, 
            error: 'ESC/POS commands are required' 
        });
    }

    if (!printerIP) {
        return res.status(400).json({ 
            success: false, 
            error: 'Printer IP address is required' 
        });
    }

    const port = parseInt(printerPort) || 9100;

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(printerIP)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid IP address format' 
        });
    }

    // Validate port range
    if (port < 1 || port > 65535) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid port number (must be 1-65535)' 
        });
    }

    console.log(`📡 Sending print job to ${printerIP}:${port}`);
    console.log(`📄 Command length: ${escPosCommands.length} bytes`);

    const client = new net.Socket();
    let connectionTimeout;
    let isResolved = false;

    // Set connection timeout (5 seconds)
    connectionTimeout = setTimeout(() => {
        if (!isResolved) {
            isResolved = true;
            client.destroy();
            console.error(`❌ Connection timeout to ${printerIP}:${port}`);
            return res.status(504).json({ 
                success: false, 
                error: 'Connection timeout - printer not responding',
                code: 'ETIMEDOUT'
            });
        }
    }, 5000);

    // Connect to printer
    client.connect(port, printerIP, () => {
        clearTimeout(connectionTimeout);
        console.log(`✓ Connected to printer at ${printerIP}:${port}`);

        try {
            // Convert ESC/POS commands to buffer
            const buffer = Buffer.from(escPosCommands, 'binary');
            
            console.log(`📤 Sending ${buffer.length} bytes to printer...`);
            
            // Send to printer
            client.write(buffer, (err) => {
                if (err) {
                    console.error('❌ Error writing to printer:', err.message);
                    if (!isResolved) {
                        isResolved = true;
                        client.destroy();
                        return res.status(500).json({ 
                            success: false, 
                            error: 'Failed to send data to printer',
                            details: err.message
                        });
                    }
                } else {
                    console.log('✓ Data sent successfully');
                }
            });

            // Close connection after sending
            client.end();
        } catch (err) {
            clearTimeout(connectionTimeout);
            console.error('❌ Error processing print job:', err.message);
            if (!isResolved) {
                isResolved = true;
                client.destroy();
                return res.status(500).json({ 
                    success: false, 
                    error: 'Failed to process print job',
                    details: err.message
                });
            }
        }
    });

    // Handle successful close
    client.on('close', () => {
        clearTimeout(connectionTimeout);
        if (!isResolved) {
            isResolved = true;
            console.log(`✓ Print job completed for ${printerIP}:${port}`);
            return res.json({ 
                success: true, 
                message: 'Print job sent successfully' 
            });
        }
    });

    // Handle errors
    client.on('error', (err) => {
        clearTimeout(connectionTimeout);
        if (!isResolved) {
            isResolved = true;
            console.error(`❌ Printer connection error:`, err.message);
            
            let errorMessage = 'Failed to connect to printer';
            let errorCode = err.code;

            // User-friendly error messages
            switch (err.code) {
                case 'ECONNREFUSED':
                    errorMessage = 'Printer offline or wrong IP address';
                    break;
                case 'ETIMEDOUT':
                    errorMessage = 'Printer not responding (timeout)';
                    break;
                case 'EHOSTUNREACH':
                    errorMessage = 'Printer not reachable on network';
                    break;
                case 'ENETUNREACH':
                    errorMessage = 'Network unreachable';
                    break;
                case 'ENOTFOUND':
                    errorMessage = 'Invalid printer IP address';
                    break;
                default:
                    errorMessage = err.message;
            }

            return res.status(500).json({ 
                success: false, 
                error: errorMessage,
                code: errorCode,
                details: err.message
            });
        }
    });

    // Handle timeout
    client.on('timeout', () => {
        clearTimeout(connectionTimeout);
        if (!isResolved) {
            isResolved = true;
            client.destroy();
            console.error(`❌ Socket timeout for ${printerIP}:${port}`);
            return res.status(504).json({ 
                success: false, 
                error: 'Connection timeout - printer not responding',
                code: 'ETIMEDOUT'
            });
        }
    });

    // Set socket timeout (10 seconds)
    client.setTimeout(10000);
};
