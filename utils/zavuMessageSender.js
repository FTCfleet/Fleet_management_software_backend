const axios = require("axios");
const { formatToIST, getNow } = require("./dateFormatter");

// Load environment variables if not already loaded
if (!process.env.ZAVU_API_KEY) {
    require('dotenv').config();
}

const ZAVU_API_KEY = process.env.ZAVU_API_KEY;
const ZAVU_API_URL = 'https://api.zavu.dev/v1/messages';

/**
 * Send order booked notification via Zavu (auto WhatsApp/SMS fallback)
 * @param {string} phoneNo - Receiver's phone number
 * @param {string} lrNumber - LR tracking number
 * @returns {Promise<Object>} - Result with success status and details
 */
async function sendOrderBookedViaZavu(phoneNo, lrNumber) {
    try {
        // Format phone number (ensure it has country code)
        const formattedPhone = formatPhoneNumber(phoneNo);
        
        if (!formattedPhone) {
            console.log(`❌ Invalid phone number: ${phoneNo}`);
            return {
                success: false,
                channel: null,
                error: 'Invalid phone number'
            };
        }

        if (!ZAVU_API_KEY) {
            console.log('❌ ZAVU_API_KEY not configured in .env');
            return {
                success: false,
                channel: null,
                error: 'Zavu API key not configured'
            };
        }

        const message = `Your order with LR NO. ${lrNumber} has been booked with FRIENDS Transport Co., Please track your shipment at www.friendstransport.in`;

        console.log(`📱 Sending notification via Zavu to: ${formattedPhone}, LR: ${lrNumber}`);

        const response = await axios({
            url: ZAVU_API_URL,
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ZAVU_API_KEY}`
            },
            data: {
                to: formattedPhone,
                text: message
            }
        });

        const result = response.data.message;
        
        console.log(`✓ Message sent via ${result.channel.toUpperCase()}`);
        console.log(`  Message ID: ${result.id}`);
        console.log(`  Status: ${result.status}`);
        console.log(`  Channel: ${result.channel} (${result.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'})`);

        return {
            success: true,
            channel: result.channel,
            messageId: result.id,
            status: result.status,
            to: formattedPhone
        };

    } catch (err) {
        console.error('❌ Zavu message failed:', err.response?.data || err.message);
        
        return {
            success: false,
            channel: null,
            error: err.response?.data?.error?.message || err.message
        };
    }
}

/**
 * Format phone number to international format
 * @param {string} phoneNo - Phone number (with or without country code)
 * @returns {string|null} - Formatted phone number (+91XXXXXXXXXX) or null if invalid
 */
function formatPhoneNumber(phoneNo) {
    if (!phoneNo) return null;
    
    // Remove all non-digit characters
    const digitsOnly = phoneNo.toString().replace(/\D/g, '');
    
    // If starts with 91, use as is
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
        return `+${digitsOnly}`;
    }
    
    // If 10 digits, add +91
    if (digitsOnly.length === 10) {
        return `+91${digitsOnly}`;
    }
    
    // If more than 10 digits, take last 10 and add +91
    if (digitsOnly.length > 10) {
        const last10 = digitsOnly.slice(-10);
        return `+91${last10}`;
    }
    
    // Invalid format
    return null;
}

/**
 * Log notification attempt to database/file
 * @param {Object} data - Notification data
 */
async function logNotification(data) {
    const logEntry = {
        timestamp: formatToIST(getNow()),
        lrNumber: data.lrNumber,
        phoneNumber: data.phoneNumber,
        channel: data.channel || 'failed',
        success: data.success,
        messageId: data.messageId || null,
        error: data.error || null
    };
    
    // Log to console
    console.log('📝 Notification Log:', JSON.stringify(logEntry, null, 2));
    
    // TODO: Save to database if needed
    // await NotificationLog.create(logEntry);
}

module.exports = {
    sendOrderBookedViaZavu,
    formatPhoneNumber,
    logNotification
};
