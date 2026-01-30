const { formatToIST } = require("../utils/dateFormatter.js");
const { fromDbValueNum } = require("../utils/currencyUtils.js");

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';

const generateESCPOSReceipt = (parcel, auto = 0) => {
    const displayValueNum = (dbValue) => fromDbValueNum(dbValue);
    
    const displayOrBlank = (dbValue) => {
        if (dbValue === null || dbValue === undefined || dbValue === 0) {
            return '____';
        }
        const num = fromDbValueNum(dbValue);
        return num === 0 ? '____' : `₹${num.toFixed(2)}`;
    };

    let receipt = '';
    
    // Initialize printer
    receipt += ESC + '@'; // Initialize
    receipt += ESC + 'a' + '\x00'; // Left align
    
    // Date (small font)
    receipt += ESC + '!' + '\x00'; // Normal font
    receipt += `Date: ${formatToIST(parcel.placedAt)}${LF}`;
    
    // LR Number (bold, slightly larger)
    receipt += ESC + '!' + '\x10'; // Bold
    receipt += `LR No: ${parcel.trackingId}${LF}`;
    receipt += ESC + '!' + '\x00'; // Reset to normal
    
    // Separator line
    receipt += ESC + 'a' + '\x01'; // Center align
    receipt += '--------------------------------' + LF;
    
    // Company name (bold, large)
    receipt += ESC + '!' + '\x30'; // Double height + bold
    receipt += 'FRIENDS TRANSPORT CO.' + LF;
    receipt += ESC + '!' + '\x00'; // Reset
    
    // Phone numbers
    receipt += `${parcel.sourceWarehouse.warehouseID} Ph.: ${parcel.sourceWarehouse.phoneNo || "____"}${LF}`;
    receipt += `${parcel.destinationWarehouse.warehouseID} Ph.: ${parcel.destinationWarehouse.phoneNo || "____"}${LF}`;
    
    // Website
    receipt += 'Track your order at:' + LF;
    receipt += ESC + '!' + '\x10'; // Bold
    receipt += 'www.friendstransport.in' + LF;
    receipt += ESC + '!' + '\x00'; // Reset
    
    // Separator line (dashed)
    receipt += '- - - - - - - - - - - - - - - -' + LF;
    
    // Route bar
    receipt += ESC + 'a' + '\x00'; // Left align
    receipt += ESC + '!' + '\x10'; // Bold
    receipt += `From: ${parcel.sourceWarehouse.name}${LF}`;
    receipt += `To: ${parcel.destinationWarehouse.name}${LF}`;
    receipt += ESC + '!' + '\x00'; // Reset
    receipt += LF;
    
    // Party section
    receipt += ESC + '!' + '\x10'; // Bold
    receipt += `Consignor: ${parcel.sender.name}${LF}`;
    receipt += ESC + '!' + '\x00'; // Reset
    receipt += `Ph: ${parcel.sender.phoneNo || "NA"}${LF}`;
    
    receipt += ESC + '!' + '\x10'; // Bold
    receipt += `Consignee: ${parcel.receiver.name}${LF}`;
    receipt += ESC + '!' + '\x00'; // Reset
    receipt += `Ph: ${parcel.receiver.phoneNo || "NA"}${LF}`;
    receipt += LF;
    
    // Items table header
    receipt += '--------------------------------' + LF;
    if (auto === 1 && parcel.payment === 'To Pay') {
        receipt += 'No. Item              Qty' + LF;
    } else {
        receipt += 'No. Item         Qty  Amount' + LF;
    }
    receipt += '--------------------------------' + LF;
    
    // Items
    let index = 1;
    let totalQty = 0;
    for (const item of parcel.items) {
        totalQty += item.quantity;
        const itemLine = `${index}. ${item.name} (${item.itemType.name})`;
        
        if (auto === 1 && parcel.payment === 'To Pay') {
            // 3 column layout
            receipt += `${itemLine.padEnd(20, ' ')} ${item.quantity}${LF}`;
        } else {
            // 4 column layout with amount
            const itemRate = displayValueNum(item.freight) + displayValueNum(item.hamali) + displayValueNum(item.hamali);
            const itemAmount = itemRate * item.quantity;
            const amountStr = itemAmount === 0 ? '____' : `₹${itemAmount.toFixed(2)}`;
            receipt += `${itemLine.padEnd(15, ' ')} ${item.quantity.toString().padStart(3, ' ')} ${amountStr.padStart(8, ' ')}${LF}`;
        }
        index++;
    }
    
    // Total row
    receipt += '- - - - - - - - - - - - - - - -' + LF;
    const totalFreight = displayValueNum(parcel.freight);
    const totalHamali = displayValueNum(parcel.hamali);
    const totalAmount = totalFreight + 2 * totalHamali;
    const displayTotal = totalAmount === 0 ? '____' : `₹${totalAmount.toFixed(2)}`;
    
    receipt += ESC + '!' + '\x10'; // Bold
    if (auto === 1 && parcel.payment === 'To Pay') {
        receipt += `Total:              ${totalQty}${LF}`;
    } else {
        receipt += `Total:         ${totalQty}  ${displayTotal}${LF}`;
    }
    receipt += ESC + '!' + '\x00'; // Reset
    receipt += '--------------------------------' + LF;
    receipt += LF;
    
    // Footer info
    const doorDelivery = parcel.isDoorDelivery 
        ? (auto ? 'Yes' : displayOrBlank(parcel.doorDeliveryCharge))
        : 'No';
    receipt += `Door Delivery: ${doorDelivery}${LF}`;
    
    if (!(auto === 1 && parcel.payment === 'To Pay')) {
        receipt += ESC + '!' + '\x10'; // Bold
        receipt += `Total: ${displayTotal} (${parcel.payment.toUpperCase()})${LF}`;
        receipt += ESC + '!' + '\x00'; // Reset
    }
    
    receipt += LF;
    receipt += ESC + 'a' + '\x01'; // Center align
    receipt += 'GST: 36AAFFF2744R1ZX' + LF;
    receipt += `Created By: ${parcel.addedBy?.name || "____"}${LF}`;
    receipt += 'SUBJECT TO HYDERABAD' + LF;
    receipt += 'JURISDICTION' + LF;
    
    // Cut paper
    receipt += GS + 'V' + '\x00'; // Full cut
    
    return receipt;
};

// Generate 3 copies (2 normal + 1 auto)
const generateThreeCopies = (parcel) => {
    let receipt = '';
    
    // Copy 1 (normal)
    receipt += generateESCPOSReceipt(parcel, 0);
    
    // Copy 2 (normal)
    receipt += generateESCPOSReceipt(parcel, 0);
    
    // Copy 3 (auto - for To Pay parcels)
    receipt += generateESCPOSReceipt(parcel, 1);
    
    return receipt;
};

module.exports = { generateESCPOSReceipt, generateThreeCopies };
