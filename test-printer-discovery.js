#!/usr/bin/env node

/**
 * Printer Discovery Test Script
 * Tests mDNS/Bonjour printer discovery
 * 
 * Usage: node test-printer-discovery.js
 */

const axios = require('axios');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDiscovery() {
    log('\n═══════════════════════════════════════════', 'cyan');
    log('   Network Printer Discovery Test', 'cyan');
    log('═══════════════════════════════════════════', 'cyan');
    
    log('\n🔍 Scanning network for printers...', 'cyan');
    log('This will take about 5 seconds...', 'blue');
    
    try {
        const response = await axios({
            method: 'get',
            url: 'http://localhost:8000/api/parcel/print/discover-printers',
            timeout: 10000
        });
        
        if (response.data.success) {
            const printers = response.data.printers;
            
            if (printers.length === 0) {
                log('\n⚠️  No printers found', 'yellow');
                log(response.data.message, 'yellow');
                
                if (response.data.suggestion) {
                    log(`\n💡 ${response.data.suggestion}`, 'cyan');
                }
                
                log('\nPossible reasons:', 'yellow');
                log('  1. No printers on network', 'blue');
                log('  2. Printer doesn\'t support mDNS/Bonjour', 'blue');
                log('  3. Printer is offline', 'blue');
                log('  4. Firewall blocking mDNS (port 5353)', 'blue');
                
                log('\nTry manual IP entry instead:', 'cyan');
                log('  node test-network-print.js 192.168.1.100 9100', 'blue');
                
            } else {
                log(`\n✓ Found ${printers.length} printer(s)!`, 'green');
                
                printers.forEach((printer, index) => {
                    log(`\n${index + 1}. ${printer.name}`, 'cyan');
                    log(`   IP: ${printer.ip}:${printer.port}`, 'blue');
                    log(`   Model: ${printer.model}`, 'blue');
                    log(`   Manufacturer: ${printer.manufacturer}`, 'blue');
                    log(`   Protocol: ${printer.protocol}`, 'blue');
                    log(`   Supports Raw: ${printer.supportsRaw ? '✓ Yes' : '⚠️  Unknown'}`, 
                        printer.supportsRaw ? 'green' : 'yellow');
                    
                    if (printer.supportsRaw || printer.port === 9100) {
                        log(`\n   Test this printer:`, 'cyan');
                        log(`   node test-network-print.js ${printer.ip} ${printer.port}`, 'blue');
                    }
                });
                
                log('\n💡 Tip: Use the IP and port above in your frontend', 'cyan');
            }
            
            log('\n═══════════════════════════════════════════', 'cyan');
            log('   ✓ Discovery Complete', 'green');
            log('═══════════════════════════════════════════', 'cyan');
            
            process.exit(0);
            
        } else {
            log('\n✗ Discovery failed', 'red');
            log(`Error: ${response.data.error}`, 'red');
            process.exit(1);
        }
        
    } catch (error) {
        log('\n✗ FAILED! Error during discovery', 'red');
        
        if (error.response) {
            log(`Error: ${error.response.data.error || error.response.data}`, 'red');
        } else if (error.request) {
            log('Error: Backend server not responding', 'red');
            log('\n💡 Make sure backend is running:', 'yellow');
            log('  pm2 status', 'blue');
            log('  or: npm start', 'blue');
        } else {
            log(`Error: ${error.message}`, 'red');
        }
        
        log('\n═══════════════════════════════════════════', 'cyan');
        log('   ✗ Discovery Failed', 'red');
        log('═══════════════════════════════════════════', 'cyan');
        
        process.exit(1);
    }
}

// Run discovery
testDiscovery();
