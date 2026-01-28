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
                    <span style="white-space: nowrap;"><strong>Created by:</strong> ${parcel.addedBy?.name || "____"}</span>
                </div>
                <div class="company-name" style="margin-left: -19px;">FRIENDS TRANSPORT CO.</div>
                <div class="lr-number" style="margin-top: 5px; margin-left: 65px">LR No: ${parcel.trackingId}</div>
                <div class="phone-row" style="margin-top: 12px;">
                    <span><strong>${parcel.sourceWarehouse.warehouseID} Ph.:</strong> ${parcel.sourceWarehouse.phoneNo || "____"}</span>
                    <span><strong>${parcel.destinationWarehouse.warehouseID} Ph.:</strong> ${parcel.destinationWarehouse.phoneNo || "____"}</span>
                </div>
                <div class="website" style="margin-left: -56px; margin-top: 10px;">Track your order at: <strong>www.friendstransport.in</strong></div>
            </div>
            
            <div class="route-bar">
                <div><strong>From:</strong> ${parcel.sourceWarehouse.name}</div>
                <div style="margin-top: 6px;"><strong>To:</strong> ${parcel.destinationWarehouse.name}</div>
            </div>
            
            <div class="party-section" style="margin-bottom: 16px">
                <div style="margin-bottom: 1mm;"><strong>Consignor: ${parcel.sender.name}</strong></div>
                <div style="margin-bottom: 2.5mm;"><strong>Ph: ${parcel.sender.phoneNo || "NA"}</strong></div>
                <div style="margin-bottom: 1mm;"><strong>Consignee: ${parcel.receiver.name}</strong></div>
                <div><strong>Ph: ${parcel.receiver.phoneNo || "NA"}</strong></div>
            </div>
            
            <table class="items-table ${auto === 1 && parcel.payment === 'To Pay' ? 'auto-table' : 'normal-table'}">
                <thead>${tableHeaders}</thead>
                <tbody>${allItems}${totalRow}</tbody>
            </table>
            
            <div class="footer-info" style="margin-top: 10px;">
                <div class="delivery-row" style="margin-top: 5px;">
                    <span style="margin-right: 25px;">Door Delivery: <strong>${parcel.isDoorDelivery ? (auto ? 'Yes' : displayValue(parcel.doorDeliveryCharge)) : 'No'}</strong></span>
                    ${auto === 1 && parcel.payment === 'To Pay' ? '' : `<span>Payment: <strong>${parcel.payment.toUpperCase()}</strong></span>`}
                </div>
                <div class="gst-center" style="margin-left: -30px; margin-bottom: 10px; margin-top: 3px;">GST: 36AAFFF2744R1ZX</div>
                <div class="jurisdiction" style="margin-left: -30px;">SUBJECT TO HYDERABAD JURISDICTION</div>
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
                .top-row { display: flex; align-items: center; font-size: 9px; margin-bottom: 1mm; flex-wrap: nowrap; gap: 20px; }
                .company-name { font-size: 18px; font-weight: 600; text-align: center; letter-spacing: 0.8px; font-family: 'Verdana', 'Geneva', sans-serif; }
                .phone-row { display: flex; font-size: 9px; text-align: center; margin-top: 0.5mm; gap: 25px; justify-content: flex-start; }
                .website { font-size: 9px; text-align: center; margin-top: 0.3mm; margin-left: -27px; }
                
                /* Route Bar */
                .route-bar { 
                    font-size: 11px; 
                    padding: 1mm 0; 
                    margin-bottom: 1mm; 
                }
                .route-bar div { margin-bottom: 0.3mm; }
                .route-bar div:last-child { margin-bottom: 1mm; }
                
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
                .delivery-row { display: flex; margin-bottom: 3mm; gap: 32px }
                .gst-center { 
                    text-align: center; 
                    font-size: 9px;
                    margin-bottom: 0.5mm;
                }
                .jurisdiction { text-align: center; margin-bottom: 20px; }
                .lr-number {font-size: 11px; font-weight: 1000; margin-bottom: 1mm; }
                
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
