const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// URL to encode in QR code
const trackingURL = 'https://friendstransport.in/track';

// Output file path
const outputPath = path.join(__dirname, 'tracking-qr-code.png');

// QR Code options
const qrOptions = {
    errorCorrectionLevel: 'H', // High error correction (30% damage tolerance)
    type: 'png',
    quality: 1,
    margin: 2,
    width: 500, // 500x500 pixels
    color: {
        dark: '#000000',  // Black
        light: '#FFFFFF'  // White background
    }
};

// Generate QR Code
QRCode.toFile(outputPath, trackingURL, qrOptions, (err) => {
    if (err) {
        console.error('❌ Error generating QR code:', err);
        process.exit(1);
    }
    
    console.log('✅ QR Code generated successfully!');
    console.log('📍 Location:', outputPath);
    console.log('🔗 URL:', trackingURL);
    console.log('📐 Size: 500x500 pixels');
    console.log('🎨 Format: PNG');
    console.log('');
    console.log('💡 This QR code will redirect users to your tracking page.');
    console.log('   Users can scan it to quickly access the tracking portal.');
});
