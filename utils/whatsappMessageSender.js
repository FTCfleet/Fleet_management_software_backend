const axios = require("axios");
const crypto = require('node:crypto');

// Load environment variables if not already loaded
if (!process.env.WHATSAPP_URL || !process.env.WHATSAPP_TOKEN) {
    require('dotenv').config();
}

const otpStore = new Map();

function generateOTP() {
    return crypto.randomInt(0, 999999).toString().padStart(6, '0');   
}

async function storeOTP(phoneNo, otp) {
    otpStore.set(phoneNo, {
        otp,
        expires: Date.now() + 25 * 60 * 1000 // 25min
    });

    setTimeout(() => {
        otpStore.delete(phoneNo);
    }, 25 * 60 * 1000);
}

async function verifyOTP(phoneNo, userOtp) {
    const otpData = otpStore.get(phoneNo);
    console.log(otpData);
    if (!otpData) return false;
    
    if (Date.now() > otpData.expires) {
        otpStore.delete(phoneNo);
        return false;
    }

    const isValid = otpData.otp === userOtp;
    if (isValid) {
        otpStore.delete(phoneNo);
    }
    return isValid;
}

// Helper function to format phone number (extract last 10 digits)
function formatPhoneNumber(phoneNo) {
    if (!phoneNo) return null;
    
    // Remove all non-digit characters
    const digitsOnly = phoneNo.toString().replace(/\D/g, '');
    
    // Take last 10 digits
    const last10Digits = digitsOnly.slice(-10);
    
    // Return formatted number
    return last10Digits;
}

// NEW: Send order booked notification to receiver
async function sendOrderBookedMessage(phoneNo, lrNumber) {
    try {
        // Format phone number (extract last 10 digits)
        const formattedPhone = formatPhoneNumber(phoneNo);
        
        if (!formattedPhone || formattedPhone.length !== 10) {
            console.log(`Invalid phone number: ${phoneNo}`);
            return 0;
        }

        console.log(`Sending order booked notification to: +91 ${formattedPhone}, LR: ${lrNumber}`);

        const response = await axios({
            url: process.env.WHATSAPP_URL,
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
            },
            data: JSON.stringify({
                messaging_product: 'whatsapp',
                to: `+91${formattedPhone}`,
                type: 'template',
                template: {
                    name: 'order_booked',
                    language: {
                        code: 'en'
                    },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                {
                                    type: 'text',
                                    text: lrNumber,
                                }
                            ]
                        },
                        {
                            type: 'button',
                            sub_type: 'copy_code',
                            index: '0',
                            parameters: [
                                {
                                    type: 'coupon_code',
                                    coupon_code: lrNumber
                                }
                            ]
                        }
                    ]
                }
            })
        });

        console.log(`✓ WhatsApp notification sent to receiver: ${formattedPhone}`);
        return 1;
    } catch (err) {
        console.error('Failed to send order booked message:', err.response?.data || err.message);
        return 0;
    }
}

async function sendDeliveryMessage(phoneNo, name, trackingId){
    try{
        // Format phone number
        const formattedPhone = formatPhoneNumber(phoneNo);
        
        if (!formattedPhone || formattedPhone.length !== 10) {
            console.log(`Invalid phone number: ${phoneNo}`);
            return 0;
        }

        const respose= await axios({
            url: process.env.WHATSAPP_URL,
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
            },
            data: JSON.stringify({
                messaging_product: 'whatsapp',
                to: `+91${formattedPhone}`,
                type: 'template',
                template: {
                    name: 'parcel_dispatched',
                    language: {
                        code: 'en'
                    },
                    components:[
                        {
                            type: 'body',
                            parameters:[
                                {
                                    type: 'text',
                                    text: name,
                                },
                                {
                                    type: 'text',
                                    text: trackingId,
                                }
                            ]
                        }
                    ]
                }
            })
        });
        return 1;
        // console.log(respose.data); 
        // console.log({name, phoneNo, trackingId});
    }catch(err){
        console.log("Failed to send delivery message:", err.response?.data || err.message);
        return 0;
    }
}

async function sendOTPMessage(phoneNo){
    try{
        const otp = generateOTP();
        storeOTP(phoneNo, otp);
        
        // Format phone number
        const formattedPhone = formatPhoneNumber(phoneNo);
        
        if (!formattedPhone || formattedPhone.length !== 10) {
            console.log(`Invalid phone number: ${phoneNo}`);
            return 0;
        }
    
        const respose = await axios({
            url: process.env.WHATSAPP_URL,
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
            },
            data: JSON.stringify({
                messaging_product: 'whatsapp',
                to: `+91${formattedPhone}`,
                type: 'template',
                template: {
                    name: 'otp',
                    language: {
                        code: 'en_US'
                    },
                    components:[
                        {
                            type: 'body',
                            parameters:[
                                {
                                    type: 'text',
                                    text: otp,
                                },
                            ]
                        },
                        {
                            type: 'button',
                                sub_type: 'url',
                                index: "0",
                                parameters: [
                                    {
                                        type: 'text',
                                        text: otp
                                    }
                            ]
                        }
                    ]    
                }
            })
        });
        // console.log(respose.data);
        // console.log(`OTP for ${phoneNo} is ${otp}`);
        return 1;
    }catch(err){
        console.log("Failed to send OTP message:", err.response?.data || err.message);
        return 0;
    }
}

module.exports = {
    sendDeliveryMessage,
    sendOTPMessage,
    sendOrderBookedMessage,
    verifyOTP
};