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
async function sendDeliveryMessage(phoneNo,trackingId, destination, mapUrl) {
    try {
        // Format phone number (extract last 10 digits)
        const formattedPhone = formatPhoneNumber(phoneNo);
        
        if (!formattedPhone || formattedPhone.length !== 10) {
            console.log(`Invalid phone number: ${phoneNo}`);
            return 0;
        }
        
        const websiteUrl = "https://friendstransport.in/track";
        const options = {
            method: 'POST',
            url: process.env.WHATSAPP_URL,
            headers: {
                accept: 'application/json',
                authkey: process.env.WHATSAPP_TOKEN,
                'content-type': 'application/json'
            },
            data: `{\n    "integrated_number": "${process.env.WHATSAPP_NUMBER}",\n    "content_type": "template",\n    "payload": {\n        "messaging_product": "whatsapp",\n        "type": "template",\n        "template": {\n            "name": "order_delivered",\n            "language": {\n                "code": "en_US",\n                "policy": "deterministic"\n            },\n            "namespace": "d3550953_8229_42fd_b2d2_4d3ae4991ae9",\n            "to_and_components": [\n                {\n                    "to": [\n                        "+91${formattedPhone}"\n                    ],\n                    "components": {\n                        "body_map_url": {\n                            "type": "text",\n                            "value": "${mapUrl}",\n                            "parameter_name": "map_url"\n                        },\n                        "body_destination": {\n                            "type": "text",\n                            "value": "${destination}",\n                            "parameter_name": "destination"\n                        },\n                        "body_website_url": {\n                            "type": "text",\n                            "value": "${websiteUrl}",\n                            "parameter_name": "website_url"\n                        },\n                        "body_tracking_id": {\n                            "type": "text",\n                            "value": "${trackingId}",\n                            "parameter_name": "tracking_id"\n                        }\n                    }\n                }\n            ]\n        }\n    }\n}`
        };

        console.log(`Sending order booked notification to: +91 ${formattedPhone}, LR: ${lrNumber}`);

        const { data } = await axios.request(options);

        return 1;
    } catch (err) {
        console.error('Failed to send order booked message:', err.response?.data || err.message);
        return 0;
    }
}

async function sendOrderBookedMessage(phoneNo, trackingId, destination) {
    try{
        // Format phone number
        const formattedPhone = formatPhoneNumber(phoneNo);
        
        if (!formattedPhone || formattedPhone.length !== 10) {
            console.log(`Invalid phone number: ${phoneNo}`);
            return 0;
        }


        const options = {
            method: 'POST',
            url: process.env.WHATSAPP_URL,
            headers: {
                accept: 'application/json',
                authkey: process.env.WHATSAPP_TOKEN,
                'content-type': 'application/json'
            },
            data: `{\n    "integrated_number": "${process.env.WHATSAPP_NUMBER}",\n    "content_type": "template",\n    "payload": {\n        "messaging_product": "whatsapp",\n        "type": "template",\n        "template": {\n            "name": "order_received",\n            "language": {\n                "code": "en_US",\n                "policy": "deterministic"\n            },\n            "namespace": "d3550953_8229_42fd_b2d2_4d3ae4991ae9",\n            "to_and_components": [\n                {\n                    "to": [\n                        "${formattedPhone}"\n                    ],\n                    "components": {\n                        "body_tracking_id": {\n                            "type": "text",\n                            "value": "${trackingId}",\n                            "parameter_name": "tracking_id"\n                        },\n                        "body_website_url": {\n                            "type": "text",\n                            "value": "${websiteUrl}>",\n                            "parameter_name": "website_url"\n                        },\n                        "body_destination": {\n                            "type": "text",\n                            "value": "${destination}>",\n                            "parameter_name": "destination"\n                        }\n                    }\n                }\n            ]\n        }\n    }\n}`
        };

        const { data } = await axios.request(options);
        console.log(data);
        return 1;
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