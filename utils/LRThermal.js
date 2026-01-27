const { formatToIST } = require("../utils/dateFormatter.js");
const { fromDbValue, fromDbValueNum } = require("../utils/currencyUtils.js");

const generateLR = (parcel, auto = 0, options = {}) => {
    const displayValue = (dbValue) => fromDbValue(dbValue);
    const displayValueNum = (dbValue) => fromDbValueNum(dbValue);
    
    // Helper to display value or blank space for zero/null
    const displayOrBlank = (dbValue) => {
        if (dbValue === null || dbValue === undefined || dbValue === 0) {
            return '____';
        }
        const num = fromDbValueNum(dbValue);
        return num === 0 ? '____' : `₹${num.toFixed(2)}`;
    };
    
    // Build items table rows
    let index = 1;
    const allItems = parcel.items.map(item => {
        if (auto === 1 && parcel.payment === 'To Pay') {
            return `
                <tr>
                    <td>${index++}</td>
                    <td>${item.name} (${item.itemType.name})</td>
                    <td>${item.quantity}</td>
                </tr>
            `;
        } else {
            const itemRate = displayValueNum(item.freight) + displayValueNum(item.hamali) + displayValueNum(item.hamali);
            const itemAmount = itemRate * item.quantity;
            const displayAmount = itemAmount === 0 ? '____' : `₹${itemAmount.toFixed(2)}`;
            return `
                <tr>
                    <td>${index++}</td>
                    <td>${item.name} (${item.itemType.name})</td>
                    <td>${item.quantity}</td>
                    <td>${displayAmount}</td>
                </tr>
            `;
        }
    }).join('');
    
    const totalFreight = displayValueNum(parcel.freight);
    const totalHamali = displayValueNum(parcel.hamali);
    const totalItems = parcel.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = totalFreight + 2 * totalHamali;
    
    // Display total as blank if zero
    const displayTotalAmount = totalAmount === 0 ? '____' : `₹${totalAmount.toFixed(2)}`;
    
    let tableHeaders = '';
    let totalRow = '';
    
    if (auto === 1 && parcel.payment === 'To Pay') {
        tableHeaders = `<tr><th>No.</th><th>Item</th><th>Qty</th></tr>`;
        totalRow = `<tr class="total-row"><td></td><td>Total</td><td>${totalItems}</td></tr>`;
    } else {
        tableHeaders = `<tr><th>No.</th><th>Item</th><th>Qty</th><th>Amount</th></tr>`;
        totalRow = `<tr class="total-row"><td></td><td>Total</td><td>${totalItems}</td><td>${displayTotalAmount}</td></tr>`;
    }
    
    return `
        <div class="lr-receipt">
            <div class="header">
                <div class="top-row">
                    <span style="white-space: nowrap;"><strong>Date:</strong> ${formatToIST(parcel.placedAt)}</span>
                    <span style="white-space: nowrap;"><strong>LR No:</strong> ${parcel.trackingId}</span>
                </div>
                <div class="company-name" style="margin-left: -15px;">FRIENDS TRANSPORT CO.</div>
                <div class="source-phone" style="margin-left: -15px;">${parcel.sourceWarehouse.warehouseID} Ph.: ${parcel.sourceWarehouse.phoneNo || "____"}</div>
                <div class="dest-phone-top" style="margin-left: -15px;">${parcel.destinationWarehouse.warehouseID} Ph.: ${parcel.destinationWarehouse.phoneNo || "____"}</div>
                <div class="website" style="margin-left: -15px;">www.friendstransport.in</div>
            </div>
            
            <div class="route-bar">
                <div><strong>From:</strong> ${parcel.sourceWarehouse.name}</div>
                <div><strong>To:</strong> ${parcel.destinationWarehouse.name}</div>
            </div>
            
            <div class="party-section">
                <div><strong>Consignor:</strong> ${parcel.sender.name}</div>
                <div><strong>Ph:</strong> ${parcel.sender.phoneNo || "NA"}</div>
                <div><strong>Consignee:</strong> ${parcel.receiver.name}</div>
                <div><strong>Ph:</strong> ${parcel.receiver.phoneNo || "NA"}</div>
            </div>
            
            <table class="items-table ${auto === 1 && parcel.payment === 'To Pay' ? 'auto-table' : 'normal-table'}">
                <thead>${tableHeaders}</thead>
                <tbody>${allItems}${totalRow}</tbody>
            </table>
            
            <div class="footer-info">
                <div class="delivery-row">
                    <span>Door Delivery: <strong>${parcel.isDoorDelivery ? (auto ? 'Yes' : displayValue(parcel.doorDeliveryCharge)) : 'No'}</strong></span>
                    ${auto === 1 && parcel.payment === 'To Pay' ? '' : `<span><strong>Total: ${displayTotalAmount}<span style="font-size: 8px">(${parcel.payment.toUpperCase()})</span></strong></span>`}
                </div>
                <div class="gst-center" style="margin-left: -15px;">GST: 36AAFFF2744R1ZX</div>
                <div class="created-by" style="margin-left: -15px;">Created By: ${parcel.addedBy?.name || "____"}</div>
                <div class="jurisdiction" style="margin-left: -15px;">SUBJECT TO HYDERABAD JURISDICTION</div>
            </div>
            <div class="cut-line"></div>
        </div>
    `;
};

const generateLRSheetThermal = (parcel, options = {}) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>FTC LR Receipt</title>
            <style>
                @page { 
                    size: 78mm auto; 
                    margin: 0; 
                }
                @media print {
                    .lr-receipt {
                        page-break-after: always;
                        break-after: page;
                    }
                    .lr-receipt:last-child {
                        page-break-after: auto;
                        break-after: auto;
                    }
                }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { width: 78mm; margin: 0; padding: 1mm 0; font-family: 'Courier New', 'Courier', monospace; line-height: 1.3; }
                
                .lr-receipt { 
                    width: 100%; 
                    padding: 2mm 0; 
                    margin-bottom: 0; 
                    page-break-after: always;
                    break-after: page;
                }
                .lr-receipt:last-child { 
                    margin-bottom: 0; 
                    page-break-after: auto;
                    break-after: auto;
                }
                
                /* Header */
                .header { margin-bottom: 1.5mm; }
                .top-row { display: flex; align-items: center; font-size: 9px; margin-bottom: 1mm; flex-wrap: nowrap; gap: 30px; }
                .company-name { font-size: 16px; font-weight: 600; text-align: center; letter-spacing: 0.8px; font-family: 'Verdana', 'Geneva', sans-serif; }
                .source-phone { font-size: 9px; text-align: center; margin-top: 0.5mm; }
                .dest-phone-top { font-size: 9px; text-align: center; margin-top: 0.3mm; }
                .website { font-size: 9px; text-align: center; margin-top: 0.3mm; }
                
                /* Route Bar */
                .route-bar { 
                    font-size: 11px; 
                    padding: 1mm 0; 
                    margin-bottom: 1mm; 
                }
                .route-bar div { margin-bottom: 0.3mm; }
                .route-bar div:last-child { margin-bottom: 0; }
                
                /* Party Section */
                .party-section { font-size: 11px; margin-bottom: 1.5mm; }
                .party-section div { margin-bottom: 0.5mm; }
                
                /* Items Table */
                .items-table { 
                    width: calc(100% - 30px); 
                    margin: 0 0 1.5mm 0;
                    border-collapse: collapse; 
                    font-size: 10px; 
                }
                .items-table th, .items-table td { padding: 0.8mm; text-align: center; vertical-align: middle; }
                .items-table th { font-weight: bold; border-bottom: 1px dashed #000; }
                .items-table tbody tr { }
                .items-table tbody tr:last-child { border-bottom: none; }
                
                /* Column widths - Normal (4 columns) */
                .normal-table th:nth-child(1), .normal-table td:nth-child(1) { width: 10%; text-align: center; }
                .normal-table th:nth-child(2), .normal-table td:nth-child(2) { width: 45%; text-align: left; }
                .normal-table th:nth-child(3), .normal-table td:nth-child(3) { width: 15%; text-align: center; }
                .normal-table th:nth-child(4), .normal-table td:nth-child(4) { width: 30%; text-align: right; padding-right: 2mm; }
                
                /* Column widths - Auto (3 columns) */
                .auto-table th:nth-child(1), .auto-table td:nth-child(1) { width: 12%; text-align: center; }
                .auto-table th:nth-child(2), .auto-table td:nth-child(2) { width: 63%; text-align: left; }
                .auto-table th:nth-child(3), .auto-table td:nth-child(3) { width: 25%; text-align: center; }
                
                .total-row { font-weight: bold; border-top: 1px dashed #000 !important;}
                
                /* Footer Info */
                .footer-info { font-size: 10px; }
                .delivery-row { display: flex; margin-bottom: 1mm; gap: 25px }
                .gst-center { 
                    text-align: center; 
                    font-size: 9px;
                    margin-bottom: 0.5mm;
                }
                .jurisdiction { text-align: center; margin-bottom: 0.5mm; }
                .created-by { text-align: center; font-size: 9px; }
                
                /* Cut Line */
                .cut-line { 
                    height: 0; 
                    margin: 0;
                    padding: 0;
                    page-break-after: always;
                    break-after: page;
                }
            </style>
        </head>
        <body>
            ${generateLR(parcel, 0, options)}
            ${generateLR(parcel, 0, options)}
            ${generateLR(parcel, 1, options)}
        </body>
        </html>
    `;
};

module.exports = { generateLRSheetThermal };
