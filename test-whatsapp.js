#!/usr/bin/env node

/**
 * WhatsApp Integration Test Script
 * 
 * Usage:
 *   node test-whatsapp.js                    # Test with hello_world template
 *   node test-whatsapp.js order              # Test order_booked template
 *   node test-whatsapp.js order 6268970238   # Test with specific phone number
 */

require('dotenv').config();
const axios = require('axios');
const { sendOrderBookedMessage } = require('./utils/whatsappMessageSender');

const WHATSAPP_URL = process.env.WHATSAPP_URL;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const DEFAULT_TEST_PHONE = '6268970238'; // Your test number

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

async function testHelloWorld(phoneNumber) {
    log('\n📱 Testing WhatsApp Connection with hello_world template...', 'cyan');
    log(`Phone: +91 ${phoneNumber}`, 'blue');
    
    try {
        const response = await axios({
            url: WHATSAPP_URL,
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`
            },
            data: {
                messaging_product: 'whatsapp',
                to: `91${phoneNumber}`,
                type: 'template',
                template: {
                    name: 'hello_world',
                    language: {
                        code: 'en_US'
                    }
                }
            }
        });
        
        log('\n✓ SUCCESS! Message sent successfully!', 'green');
        log(`Message ID: ${response.data.messages[0].id}`, 'blue');
        log('\nCheck your WhatsApp for the hello_world message.', 'cyan');
        return true;
        
    } catch (error) {
        log('\n✗ FAILED! Error sending message:', 'red');
        
        if (error.response?.data) {
            const errorData = error.response.data.error;
            log(`Error: ${errorData.message}`, 'red');
            log(`Code: ${errorData.code}`, 'yellow');
            
            // Provide helpful suggestions
            if (errorData.code === 190) {
                log('\n💡 Token expired or invalid!', 'yellow');
                log('Fix: Generate new token - see TOKEN_REGENERATION_GUIDE.md', 'cyan');
            } else if (errorData.code === 100) {
                log('\n💡 Template not found or not approved!', 'yellow');
                log('Fix: Create and approve template in Meta Business Manager', 'cyan');
            } else if (errorData.code === 131047) {
                log('\n💡 Phone number not registered!', 'yellow');
                log('Fix: Verify phone number in WhatsApp Manager', 'cyan');
            }
        } else {
            log(error.message, 'red');
        }
        
        return false;
    }
}

async function testOrderBooked(phoneNumber, lrNumber = 'TEST-00001') {
    log('\n📦 Testing Order Booked Notification...', 'cyan');
    log(`Phone: +91 ${phoneNumber}`, 'blue');
    log(`LR Number: ${lrNumber}`, 'blue');
    
    try {
        const result = await sendOrderBookedMessage(phoneNumber, lrNumber);
        
        if (result === 1) {
            log('\n✓ SUCCESS! Order booked notification sent!', 'green');
            log('\nCheck your WhatsApp for the order notification.', 'cyan');
            log('Message should include:', 'blue');
            log(`  - LR Number: ${lrNumber}`, 'blue');
            log('  - Copy LR No. button', 'blue');
            return true;
        } else {
            log('\n✗ FAILED! Message not sent (returned 0)', 'red');
            log('Check logs above for error details.', 'yellow');
            return false;
        }
        
    } catch (error) {
        log('\n✗ FAILED! Error:', 'red');
        log(error.message, 'red');
        return false;
    }
}

function checkEnvVars() {
    log('\n🔍 Checking environment variables...', 'cyan');
    
    if (!WHATSAPP_URL) {
        log('✗ WHATSAPP_URL not found in .env', 'red');
        return false;
    }
    log(`✓ WHATSAPP_URL: ${WHATSAPP_URL}`, 'green');
    
    if (!WHATSAPP_TOKEN) {
        log('✗ WHATSAPP_TOKEN not found in .env', 'red');
        return false;
    }
    log(`✓ WHATSAPP_TOKEN: ${WHATSAPP_TOKEN.substring(0, 20)}...`, 'green');
    
    return true;
}

async function main() {
    log('═══════════════════════════════════════════', 'cyan');
    log('   WhatsApp Integration Test', 'cyan');
    log('═══════════════════════════════════════════', 'cyan');
    
    // Check environment variables
    if (!checkEnvVars()) {
        log('\n❌ Environment variables missing!', 'red');
        log('Make sure .env file has WHATSAPP_URL and WHATSAPP_TOKEN', 'yellow');
        process.exit(1);
    }
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const testType = args[0] || 'hello';
    const phoneNumber = args[1] || DEFAULT_TEST_PHONE;
    const lrNumber = args[2] || 'TEST-00001';
    
    let success = false;
    
    if (testType === 'order') {
        success = await testOrderBooked(phoneNumber, lrNumber);
    } else {
        success = await testHelloWorld(phoneNumber);
    }
    
    log('\n═══════════════════════════════════════════', 'cyan');
    if (success) {
        log('   ✓ Test Completed Successfully!', 'green');
    } else {
        log('   ✗ Test Failed', 'red');
        log('\n   See TOKEN_REGENERATION_GUIDE.md for help', 'yellow');
    }
    log('═══════════════════════════════════════════', 'cyan');
    
    process.exit(success ? 0 : 1);
}

// Run the test
main().catch(error => {
    log('\n✗ Unexpected error:', 'red');
    log(error.message, 'red');
    process.exit(1);
});
