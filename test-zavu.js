#!/usr/bin/env node

/**
 * Zavu Integration Test Script
 * 
 * Usage:
 *   node test-zavu.js                    # Test with default number
 *   node test-zavu.js 6268970238         # Test with specific number
 *   node test-zavu.js 6268970238 HYD02-00001  # Test with LR number
 */

require('dotenv').config();
const { sendOrderBookedViaZavu, logNotification } = require('./utils/zavuMessageSender');

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

async function testZavu(phoneNumber, lrNumber = 'TEST-00001') {
    log('\n═══════════════════════════════════════════', 'cyan');
    log('   Zavu SMS/WhatsApp Test', 'cyan');
    log('═══════════════════════════════════════════', 'cyan');
    
    // Check environment variables
    log('\n🔍 Checking environment variables...', 'cyan');
    
    if (!process.env.ZAVU_API_KEY) {
        log('✗ ZAVU_API_KEY not found in .env', 'red');
        log('\nPlease add to .env:', 'yellow');
        log('ZAVU_API_KEY=zv_live_your_api_key_here', 'blue');
        log('\nSee ZAVU_SMS_SETUP.md for setup instructions', 'cyan');
        process.exit(1);
    }
    
    log(`✓ ZAVU_API_KEY: ${process.env.ZAVU_API_KEY.substring(0, 15)}...`, 'green');
    
    // Send test message
    log('\n📱 Sending test notification...', 'cyan');
    log(`Phone: +91 ${phoneNumber}`, 'blue');
    log(`LR Number: ${lrNumber}`, 'blue');
    
    try {
        const result = await sendOrderBookedViaZavu(phoneNumber, lrNumber);
        
        // Log the attempt
        await logNotification({
            lrNumber: lrNumber,
            phoneNumber: phoneNumber,
            channel: result.channel,
            success: result.success,
            messageId: result.messageId,
            error: result.error
        });
        
        if (result.success) {
            log('\n✓ SUCCESS! Message sent!', 'green');
            log(`Channel: ${result.channel.toUpperCase()} ${result.channel === 'whatsapp' ? '(WhatsApp)' : '(SMS)'}`, 'blue');
            log(`Message ID: ${result.messageId}`, 'blue');
            log(`Status: ${result.status}`, 'blue');
            log(`\nCheck ${result.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} on +91 ${phoneNumber}`, 'cyan');
            
            log('\n═══════════════════════════════════════════', 'cyan');
            log('   ✓ Test Completed Successfully!', 'green');
            log('═══════════════════════════════════════════', 'cyan');
            
            process.exit(0);
        } else {
            log('\n✗ FAILED! Message not sent', 'red');
            log(`Error: ${result.error}`, 'red');
            
            if (result.error && result.error.includes('sandbox')) {
                log('\n💡 Tip: You need to verify this number in Zavu sandbox', 'yellow');
                log('1. Go to: https://dashboard.zavu.dev/', 'cyan');
                log('2. Click "Sandbox" in sidebar', 'cyan');
                log('3. Add and verify +91 ' + phoneNumber, 'cyan');
            } else if (result.error && result.error.includes('API key')) {
                log('\n💡 Tip: Check your ZAVU_API_KEY in .env', 'yellow');
                log('Make sure it starts with "zv_live_" or "zv_test_"', 'cyan');
            }
            
            log('\n═══════════════════════════════════════════', 'cyan');
            log('   ✗ Test Failed', 'red');
            log('\n   See ZAVU_SMS_SETUP.md for help', 'yellow');
            log('═══════════════════════════════════════════', 'cyan');
            
            process.exit(1);
        }
        
    } catch (error) {
        log('\n✗ Unexpected error:', 'red');
        log(error.message, 'red');
        
        log('\n═══════════════════════════════════════════', 'cyan');
        log('   ✗ Test Failed', 'red');
        log('═══════════════════════════════════════════', 'cyan');
        
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const phoneNumber = args[0] || '6268970238';
const lrNumber = args[1] || 'TEST-00001';

// Run the test
testZavu(phoneNumber, lrNumber);
