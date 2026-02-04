#!/usr/bin/env node

/**
 * Network Printer Test Script
 * 
 * Usage:
 *   node test-network-print.js                           # Test with default IP
 *   node test-network-print.js 192.168.1.100            # Test with specific IP
 *   node test-network-print.js 192.168.1.100 9100       # Test with IP and port
 */

const axios = require('axios');

// Colors for console output
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

// Simple ESC/POS test commands
function generateTestReceipt() {
    const ESC = '\x1B';
    const GS = '\x1D';
    
    let commands = '';
    
    // Initialize printer
    commands += ESC + '@';
    
    // Center align
    commands += ESC + 'a' + '\x01';
    
    // Bold on
    commands += ESC + 'E' + '\x01';
    
    // Test header
    commands += 'NETWORK PRINT TEST\n';
    
    // Bold off
    commands += ESC + 'E' + '\x00';
    
    // Left align
    commands += ESC + 'a' + '\x00';
    
    commands += '\n';
    commands += 'Date: ' + new Date().toLocaleString() + '\n';
    commands += 'Test ID: TEST-' + Date.now() + '\n';
    commands += '\n';
    commands += 'If you can read this,\n';
    commands += 'network printing is working!\n';
    commands += '\n';
    
    // Feed and cut
    commands += '\n\n\n';
    commands += GS + 'V' + '\x41' + '\x03'; // Partial cut
    
    return commands;
}

async function testNetworkPrint(printerIP, printerPort) {
    log('\n═══════════════════════════════════════════', 'cyan');
    log('   Network Printer Test', 'cyan');
    log('═══════════════════════════════════════════', 'cyan');
    
    log(`\n📡 Testing printer at ${printerIP}:${printerPort}`, 'cyan');
    
    // Generate test receipt
    const escPosCommands = generateTestReceipt();
    
    log(`📄 Generated ${escPosCommands.length} bytes of ESC/POS commands`, 'blue');
    
    try {
        log('\n📤 Sending print job to backend...', 'cyan');
        
        const response = await axios({
            method: 'post',
            url: 'http://localhost:8000/api/parcel/print/thermal-network',
            data: {
                escPosCommands: escPosCommands,
                printerIP: printerIP,
                printerPort: parseInt(printerPort)
            },
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 15000 // 15 second timeout
        });
        
        if (response.data.success) {
            log('\n✓ SUCCESS! Print job sent!', 'green');
            log(`Message: ${response.data.message}`, 'blue');
            log('\nCheck your printer for the test receipt.', 'cyan');
            
            log('\n═══════════════════════════════════════════', 'cyan');
            log('   ✓ Test Completed Successfully!', 'green');
            log('═══════════════════════════════════════════', 'cyan');
            
            process.exit(0);
        } else {
            log('\n✗ FAILED! Backend returned error', 'red');
            log(`Error: ${response.data.error}`, 'red');
            process.exit(1);
        }
        
    } catch (error) {
        log('\n✗ FAILED! Error sending print job', 'red');
        
        if (error.response) {
            // Backend returned error
            const errorData = error.response.data;
            log(`Error: ${errorData.error}`, 'red');
            
            if (errorData.code) {
                log(`Code: ${errorData.code}`, 'yellow');
            }
            
            // Provide helpful suggestions
            if (errorData.code === 'ECONNREFUSED') {
                log('\n💡 Printer is offline or wrong IP address', 'yellow');
                log('Fix:', 'cyan');
                log('  1. Check printer is powered on', 'blue');
                log('  2. Verify IP address is correct', 'blue');
                log('  3. Check printer is on same network', 'blue');
            } else if (errorData.code === 'ETIMEDOUT') {
                log('\n💡 Printer not responding (timeout)', 'yellow');
                log('Fix:', 'cyan');
                log('  1. Check printer is connected to network', 'blue');
                log('  2. Verify firewall is not blocking', 'blue');
                log('  3. Try pinging the printer IP', 'blue');
            } else if (errorData.code === 'EHOSTUNREACH') {
                log('\n💡 Printer not reachable on network', 'yellow');
                log('Fix:', 'cyan');
                log('  1. Check printer and server are on same network', 'blue');
                log('  2. Verify network configuration', 'blue');
            }
            
        } else if (error.request) {
            // No response from backend
            log('Error: Backend server not responding', 'red');
            log('\n💡 Backend server might be down', 'yellow');
            log('Fix:', 'cyan');
            log('  1. Check backend is running: pm2 status', 'blue');
            log('  2. Verify backend URL: http://localhost:8000', 'blue');
            
        } else {
            // Other error
            log(`Error: ${error.message}`, 'red');
        }
        
        log('\n═══════════════════════════════════════════', 'cyan');
        log('   ✗ Test Failed', 'red');
        log('═══════════════════════════════════════════', 'cyan');
        
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const printerIP = args[0] || '192.168.1.100';
const printerPort = args[1] || '9100';

// Validate IP format
const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
if (!ipRegex.test(printerIP)) {
    log('✗ Invalid IP address format', 'red');
    log('Usage: node test-network-print.js 192.168.1.100 9100', 'yellow');
    process.exit(1);
}

// Run the test
testNetworkPrint(printerIP, printerPort);
