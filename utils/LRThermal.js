const { formatToIST } = require("../utils/dateFormatter.js");
const { fromDbValue, fromDbValueNum } = require("../utils/currencyUtils.js");

const generateLR = (parcel, auto = 0, options = {}) => {
    const displayValue = (dbValue) => fromDbValue(dbValue);
    const displayValueNum = (dbValue) => fromDbValueNum(dbValue);
    
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
            return `
                <tr>
                    <td>${index++}</td>
                    <td>${item.name} (${item.itemType.name})</td>
                    <td>${item.quantity}</td>
                    <td>₹${itemAmount.toFixed(2)}</td>
                </tr>
            `;
        }
    }).join('');
    
    const totalFreight = displayValueNum(parcel.freight);
    const totalHamali = displayValueNum(parcel.hamali);
    const totalItems = parcel.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = totalFreight + 2 * totalHamali;
    
    let tableHeaders = '';
    let totalRow = '';
    
    if (auto === 1 && parcel.payment === 'To Pay') {
        tableHeaders = `<tr><th>No.</th><th>Item</th><th>Qty</th></tr>`;
        totalRow = `<tr class="total-row"><td colspan="2">Total</td><td>${totalItems}</td></tr>`;
    } else {
        tableHeaders = `<tr><th>No.</th><th>Item</th><th>Qty</th><th>Amount</th></tr>`;
        totalRow = `<tr class="total-row"><td colspan="2">Total</td><td>${totalItems}</td><td>₹${totalAmount.toFixed(2)}</td></tr>`;
    }
    
    return `
        <div class="lr-receipt">
            <div class="header">
                <div class="top-row">
                    <span><strong>Date:</strong> ${formatToIST(parcel.placedAt)}</span>
                    <span><strong>LR No:</strong> ${parcel.trackingId}</span>
                </div>
                <div class="company-name">FRIENDS TRANSPORT CO.</div>
            </div>
            
            <div class="route-bar">
                <div><strong>From:</strong> ${parcel.sourceWarehouse.name}</div>
                <div><strong>To:</strong> ${parcel.destinationWarehouse.name}</div>
            </div>
            
            <div class="party-section">
                <div><strong>Consignor:</strong> ${parcel.sender.name} &nbsp; <strong>Ph:</strong> ${parcel.sender.phoneNo || "NA"}</div>
                <div><strong>Consignee:</strong> ${parcel.receiver.name} &nbsp; <strong>Ph:</strong> ${parcel.receiver.phoneNo || "NA"}</div>
            </div>
            
            <table class="items-table ${auto === 1 && parcel.payment === 'To Pay' ? 'auto-table' : 'normal-table'}">
                <thead>${tableHeaders}</thead>
                <tbody>${allItems}${totalRow}</tbody>
            </table>
            
            <div class="footer-info">
                <div class="delivery-row">
                    <span>Door Delivery: ${parcel.isDoorDelivery ? (auto ? 'Yes' : displayValue(parcel.doorDeliveryCharge)) : 'No'}</span>
                    ${auto === 1 && parcel.payment === 'To Pay' ? '' : `<span><strong>Total: ₹${totalAmount.toFixed(2)} (${parcel.payment.toUpperCase()})</strong></span>`}
                </div>
                <div class="bottom-info">
                    <div>Source Ph: ${parcel.sourceWarehouse.phoneNo || "24604381"}</div>
                    <div>GST: 36AAFFF2744R1ZX</div>
                </div>
                <div class="created-by">Created By: ${parcel.addedBy?.name || "____"}</div>
                <div class="jurisdiction">SUBJECT TO HYDERABAD JURISDICTION</div>
            </div>
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
                @page { size: 78mm auto; margin: 0; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { width: 78mm; margin: 0; padding: 1mm 0; font-family: Arial, sans-serif; line-height: 1.3; }
                
                .lr-receipt { width: 100%; padding: 2mm 0; margin-bottom: 2mm; page-break-after: always; }
                .lr-receipt:last-child { margin-bottom: 0; }
                
                /* Header */
                .header { margin-bottom: 1.5mm; }
                .top-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 1mm; }
                .company-name { font-size: 20px; font-weight: bold; text-align: center; letter-spacing: 0.3px; }
                
                /* Route Bar */
                .route-bar { 
                    font-size: 13px; 
                    padding: 1mm 0; 
                    margin-bottom: 1mm; 
                }
                .route-bar div { margin-bottom: 0.3mm; }
                .route-bar div:last-child { margin-bottom: 0; }
                
                /* Party Section */
                .party-section { font-size: 13px; margin-bottom: 1.5mm; }
                .party-section div { margin-bottom: 0.5mm; }
                
                /* Items Table */
                .items-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    font-size: 12px; 
                    margin-bottom: 1.5mm; 
                }
                .items-table th, .items-table td { padding: 0.8mm; text-align: center; }
                .items-table th { font-weight: bold; border-bottom: 1px dashed #000; }
                .items-table tbody tr { }
                .items-table tbody tr:last-child { border-bottom: none; }
                
                /* Column widths - Normal (4 columns) */
                .normal-table th:nth-child(1), .normal-table td:nth-child(1) { width: 10%; }
                .normal-table th:nth-child(2), .normal-table td:nth-child(2) { width: 50%; text-align: left; }
                .normal-table th:nth-child(3), .normal-table td:nth-child(3) { width: 15%; }
                .normal-table th:nth-child(4), .normal-table td:nth-child(4) { width: 25%; }
                
                /* Column widths - Auto (3 columns) */
                .auto-table th:nth-child(1), .auto-table td:nth-child(1) { width: 12%; }
                .auto-table th:nth-child(2), .auto-table td:nth-child(2) { width: 68%; text-align: left; }
                .auto-table th:nth-child(3), .auto-table td:nth-child(3) { width: 20%; }
                
                .total-row { font-weight: bold; border-top: 1px dashed #000 !important; }
                
                /* Footer Info */
                .footer-info { font-size: 12px; }
                .delivery-row { display: flex; justify-content: space-between; margin-bottom: 1mm; }
                .bottom-info { 
                    display: flex; 
                    justify-content: space-between; 
                    font-size: 11px;
                    margin-bottom: 0.5mm;
                }
                .jurisdiction { text-align: center; margin-bottom: 0.5mm; }
                .created-by { text-align: right; font-size: 11px; }
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
