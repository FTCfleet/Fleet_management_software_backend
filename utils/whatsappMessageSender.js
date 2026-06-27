const axios = require("axios");
const crypto = require('node:crypto');
const whatsappQueue = require('./whatsappQueue');

const deliveryOffices = {
    "KNR": { name: "Karimnagar (KNR)", phone: "+919908690827", mapUrl: "https://maps.app.goo.gl/hvLQ4sweDfUqjVTG9?g_st=iw" },
    "SBD": { name: "Sultanabad (SBD)", phone: "+919849701721", mapUrl: "https://maps.app.goo.gl/WrqfuAtsLyZU5q8u5?g_st=iw" },
    "PDPL": { name: "Peddapally (PDPL)", phone: "+919030478492", mapUrl: "https://www.google.com/maps?q=18.61289405822754,79.37779235839844&z=17&hl=en" },
    "NTPC": { name: "Ramagundam NTPC (NTPC)", phone: "+919866239010", mapUrl: "https://maps.app.goo.gl/9xqQvY6h1ch97uW99?g_st=iw" },
    "GDK": { name: "Godavarikhani (GDK)", phone: "+919949121267", mapUrl: "https://maps.google.com/maps?q=18.742761611938477%2C79.50328063964844&z=17&hl=en" },
    "MNCL": { name: "Mancherial (MNCL)", phone: "+918977185376", mapUrl: "https://www.google.com/maps?q=18.872785568237305,79.44837951660156&z=17&hl=en" },
};

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

function idFormatter(trackingIds) {
    return trackingIds.join(", ");
};

async function sendOrderBookedMessage(phoneNo, trackingId, destination, paymentType, receiverName, itemCount, items, senderName){
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("authkey", process.env.WHATSAPP_TOKEN);
    
    var raw = JSON.stringify({
        "integrated_number": `91${process.env.WHATSAPP_NUMBER}`,
        "content_type": "template",
        "payload": {
            "messaging_product": "whatsapp",
            "type": "template",
            "template": {
                "name": "order_created",
                "language": {
                    "code": "en",
                    "policy": "deterministic"
                },
                "namespace": `${process.env.WHATSAPP_NAMESPACE}`,
                "to_and_components": [
                    {
                        "to": [
                            `91${formatPhoneNumber(phoneNo)}`
                        ],
                        "components": {
                            "body_item_count": {
                                "type": "text",
                                "value": `${itemCount}`,
                                "parameter_name": "item_count"
                            },
                            "body_items": {
                                "type": "text",
                                "value": `${items}`,
                                "parameter_name": "items"
                            },
                            "body_sender_name": {
                                "type": "text",
                                "value": `${senderName}`,
                                "parameter_name": "sender_name"
                            },
                            "body_payment_type": {
                                "type": "text",
                                "value": `${paymentType}`,
                                "parameter_name": "payment_type"
                            },
                            "body_tracking_id": {
                                "type": "text",
                                "value": `${trackingId}`,
                                "parameter_name": "tracking_id"
                            },
                            "body_dest": {
                                "type": "text",
                                "value": `${destination}`,
                                "parameter_name": "dest"
                            },
                            "body_receiver_name": {
                                "type": "text",
                                "value": `${receiverName}`,
                                "parameter_name": "receiver_name"
                            },
                            "body_website_url": {
                                "type": "text",
                                "value": "https://www.friendstransport.in",
                                "parameter_name": "website_url"
                            }
                        }
                    }
                ]
            }
        }
    });

    var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
    };

    whatsappQueue.enqueue(
        () => fetch(`${process.env.WHATSAPP_URL}`, requestOptions)
            .then(response => response.text())
            .then(result => console.log(result)),
        `OrderBooked:${formatPhoneNumber(phoneNo)}`
    );

};

async function sendOrderDispatchedMessage(phoneNo, trackingIds, src, destination, vehicleNo, receiverName) {
    const mapUrl = deliveryOffices[destination].mapUrl;
    const formattedTrackingIds = idFormatter(trackingIds);
    const destinationName = `${deliveryOffices[destination].name} (${deliveryOffices[destination].phone})`;
    console.log(` ${phoneNo} ${formattedTrackingIds}
        src: ${src}, vehicleNo: ${vehicleNo}
        mapUrl: ${mapUrl}, destinationName: ${destinationName}
        `);
    
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("authkey", process.env.WHATSAPP_TOKEN);

    var raw = JSON.stringify({
        "integrated_number": `91${process.env.WHATSAPP_NUMBER}`,
        "content_type": "template",
        "payload": {
            "messaging_product": "whatsapp",
            "type": "template",
            "template": {
                "name": "order_delivered",
                "language": {
                    "code": "en_US",
                    "policy": "deterministic"
                },
                "namespace": `${process.env.WHATSAPP_NAMESPACE}`,
                "to_and_components": [
                    {
                        "to": [
                            `91${formatPhoneNumber(phoneNo)}`
                        ],
                        "components": {
                            "body_map_url": {
                                "type": "text",
                                "value": `${mapUrl}`,
                                "parameter_name": "map_url"
                            },
                            "body_tracking_ids": {
                                "type": "text",
                                "value": `${formattedTrackingIds}`,
                                "parameter_name": "tracking_ids"
                            },
                            "body_dest": {
                                "type": "text",
                                "value": `${destinationName}`,
                                "parameter_name": "dest"
                            },
                            "body_vehicle_no": {
                                "type": "text",
                                "value": `${vehicleNo}`,
                                "parameter_name": "vehicle_no"
                            },
                            "body_src": {
                                "type": "text",
                                "value": `${src}`,
                                "parameter_name": "src"
                            },
                            "body_receiver_name": {
                                "type": "text",
                                "value": `${receiverName}`,
                                "parameter_name": "receiver_name"
                            },
                            "body_website_url": {
                                "type": "text",
                                "value": "https://www.friendstransport.in",
                                "parameter_name": "website_url"
                            }
                        }
                    }
                ]
            }
        }
    });
    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    whatsappQueue.enqueue(
        () => fetch(`${process.env.WHATSAPP_URL}`, requestOptions)
            .then(response => response.text())
            .then(result => console.log(result)),
        `OrderDispatched:${formatPhoneNumber(phoneNo)}`
    );

};

async function sendOTPMessage(phoneNo) {
    return `Implementation pending, received phoneNo: ${phoneNo}`;
};



module.exports = {
    sendOrderDispatchedMessage,
    sendOTPMessage,
    sendOrderBookedMessage,
    verifyOTP
};