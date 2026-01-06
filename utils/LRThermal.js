const { formatToIST } = require("../utils/dateFormatter.js");
const { fromDbValue, fromDbValueNum } = require("../utils/currencyUtils.js");

/**
 * Generate a single LR receipt HTML
 * @param {Object} parcel - The parcel data
 * @param {number} auto - 0 for normal (with amounts), 1 for auto (without amounts)
 * @param {Object} options - Additional options like logoDataUrl
 */
const generateLR = (parcel, auto = 0, options = {}) => {
    const { logoDataUrl } = options;
    
    // Helper to convert DB value to display format
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
            // Calculate item amount: (freight + hamali + hamali) × quantity
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
    
    // Calculate totals
    const totalFreight = displayValueNum(parcel.freight);
    const totalHamali = displayValueNum(parcel.hamali);
    const totalItems = parcel.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = totalFreight + 2 * totalHamali;
    
    // Build table headers and total row based on auto mode
    let tableHeaders = '';
    let totalRow = '';
    
    if (auto === 1 && parcel.payment === 'To Pay') {
        tableHeaders = `
            <tr>
                <th>S.No.</th>
                <th>Item</th>
                <th>Qty</th>
            </tr>
        `;
        totalRow = `
            <tr class="total-row">
                <td colspan="2">Total</td>
                <td style="text-align: center;">${totalItems}</td>
            </tr>
        `;
    } else {
        tableHeaders = `
            <tr>
                <th>S.No.</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Amount</th>
            </tr>
        `;
        totalRow = `
            <tr class="total-row">
                <td colspan="2">Total</td>
                <td style="text-align: center;">${totalItems}</td>
                <td>₹${totalAmount.toFixed(2)}</td>
            </tr>
        `;
    }
    
    const logoImg = logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : '';
    
    return `
        <div class="lr-receipt">
            <!-- Header Section -->
            <div class="header">
                <div class="lr-top-row">
                    <span class="jurisdiction">SUBJECT TO HYDERABAD JURISDICTION</span>
                    <span class="lr-no">LR No: ${parcel.trackingId}</span>
                </div>
                <div class="header-top-row">
                    <div class="logo-section">
                        ${logoImg}
                    </div>
                    <div class="company-section">
                        <div class="company-name">FRIENDS TRANSPORT CO.</div>
                    </div>
                    <div class="lr-contact-section">
                        <div class="contact-numbers">
                            <div><span class="phone-icon">☎</span><strong>HYD-01:</strong> 24614381</div>
                            <div><strong>HYD-02:</strong> 24604381</div>
                            <div><strong>SECBAD:</strong> 29331533</div>
                            <div><strong>BDPURA:</strong> 9515409041</div>
                        </div>
                    </div>
                </div>
                <div class="address">
                    H.O.: 15-1-196/2, Feelkhana, Hyd. Br. O.: Nallagutta, Secunderabad.<br/>
                    Br. Off. Near Mir Alam Filter, Bahadurpura, Hyd.
                </div>
            </div>
            
            <!-- Route Bar -->
            <div class="route-bar">
                <div class="route-from"><strong>From:</strong> ${parcel.sourceWarehouse.name}</div>
                <div class="route-date"><strong>Date:</strong> ${formatToIST(parcel.placedAt)}</div>
                <div class="route-to"><strong>To:</strong> ${parcel.destinationWarehouse.name}</div>
            </div>
            
            <!-- Consignor/Consignee Section -->
            <div class="consignment-section">
                <div class="consignor">
                    <span class="label">Consignor:</span>
                    <span class="value">${parcel.sender.name}</span>
                    <span class="label">Phone:</span>
                    <span class="value">${parcel.sender.phoneNo || "____"}</span>
                </div>
                <div class="consignee">
                    <span class="label">Consignee:</span>
                    <span class="value">${parcel.receiver.name}</span>
                    <span class="label">Phone:</span>
                    <span class="value">${parcel.receiver.phoneNo || "____"}</span>
                </div>
            </div>
            
            <!-- Items Table -->
            <table class="items-table ${auto === 1 && parcel.payment === 'To Pay' ? 'auto-table' : 'normal-table'}">
                <thead>${tableHeaders}</thead>
                <tbody>
                    ${allItems}
                    ${totalRow}
                </tbody>
            </table>
            
            <!-- Meta Section -->
            <div class="meta-section">
                <div class="delivery-row">
                    <span>Door Delivery: ${parcel.isDoorDelivery ? (auto ? 'Yes' : displayValue(parcel.doorDeliveryCharge)) : 'No'}</span>
                    ${auto === 1 && parcel.payment === 'To Pay' ?  '': `<span class="total-value">Total Value: ₹${totalAmount.toFixed(2)} (${parcel.payment.toUpperCase()})</span>`}
                </div>
                <div class="disclaimer-row">
                    <span>Goods are at owner's risk</span>
                    <span>GSTID: 36AAFFF2744R1ZX</span>
                </div>
            </div>
            
            <!-- Footer Section -->
            <div class="footer">
                <div class="branches">
                    ◆ Karimnagar-9908690827 ◆ Sultanabad-Ph: 9849701721 ◆ Peddapally-Cell: 7036323006 <br>◆ Godavari Khani-Cell: 9949121267 ◆ Mancherial-Cell: 8977185376
                </div>
                <div class="leakage-notice">FTC is not responsible for Leakage & Breakage.</div>
            </div>
            
            <!-- Created By -->
            <div class="created-by">Created by: ${parcel.addedBy.name}</div>
        </div>
    `;
};

/**
 * Generate the complete thermal LR sheet with 3 stacked receipts
 * Width: 78mm (mandatory), Height: dynamic based on content
 * @param {Object} parcel - The parcel data
 * @param {Object} options - Additional options like logoDataUrl
 */
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
                
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                
                body {
                    width: 78mm;
                    margin: 0;
                    padding: 1mm;
                    justify-content: center;
                    font-family: Arial, sans-serif;
                    font-size: 8px;
                    line-height: 1.3;
                    height: auto;
                    overflow: visible;
                }
                
                .sheet {
                    width: 78mm;
                    height: auto;
                    display: flex;
                    flex-direction: column;
                }
                
                /* Each LR Receipt Container */
                .lr-receipt {
                    width: 100%;
                    border: 2px dotted #000;
                    padding: 2mm;
                    margin-bottom: 1mm;
                    break-inside: auto;
                    page-break-inside: auto;
                }
                
                .lr-receipt:last-child {
                    margin-bottom: 0;
                }
                
                /* Header Section */
                .header {
                    margin-bottom: 1.5mm;
                }

                .lr-top-row{
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2mm;
                    margin-bottom: 1mm;
                }
                
                .header-top-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2mm;
                }
                
                .logo-section {
                    flex-shrink: 0;
                }
                
                .logo-section .logo {
                    width: 11mm;
                    height: auto;
                }
                
                .company-section {
                    flex: 1;
                    text-align: center;
                }
                
                .jurisdiction {
                    width: 100%;
                    font-size: 4px;
                    text-decoration: underline;
                    text-align: center;
                    align-self: center;
                    margin-bottom: 0.5mm;
                }
                
                .company-name {
                    font-size: 12px;
                    font-weight: bold;
                    letter-spacing: 0.2px;
                    margin-bottom: 0.5mm;
                }
                
                .address {
                    font-size: 6px;
                    line-height: 1.2;
                    text-align: center;
                }
                
                .lr-contact-section {
                    text-align: right;
                    flex-shrink: 0;
                }
                
                .lr-no {
                    font-size: 9px;
                    font-weight: bold;
                    position: absolute;
                    right: 25mm;
                    margin-bottom: 1mm;
                }
                
                .contact-numbers {
                    font-size: 5.5px;
                    line-height: 1.3;
                }
                
                .contact-numbers div {
                    white-space: nowrap;
                }
                
                .phone-icon {
                    margin-right: 0.5mm;
                }
                
                /* Route Bar */
                .route-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 7px;
                    padding: 1mm 0;
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                    margin-bottom: 1mm;
                }
                
                .route-from, .route-date, .route-to {
                    flex: 1;
                }
                
                .route-from {
                    text-align: left;
                }
                
                .route-date {
                    text-align: center;
                }
                
                .route-to {
                    text-align: right;
                }
                
                /* Consignment Section */
                .consignment-section {
                    margin-bottom: 1.5mm;
                }
                
                .consignor, .consignee {
                    display: flex;
                    align-items: center;
                    gap: 1mm;
                    font-size: 8px;
                    margin-bottom: 0.5mm;
                }
                
                .consignment-section .label {
                    font-weight: bold;
                }
                
                .consignment-section .value {
                    font-size: 9px;
                }
                
                /* Items Table */
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 7px;
                    margin-bottom: 1.5mm;
                    table-layout: fixed;
                }
                
                .items-table th,
                .items-table td {
                    border: 1px solid #000;
                    padding: 0.8mm;
                    text-align: center;
                    word-wrap: break-word;
                }
                
                .items-table th {
                    background-color: #f0f0f0;
                    font-weight: bold;
                }
                
                /* Normal table column widths (4 columns) */
                .normal-table th:nth-child(1),
                .normal-table td:nth-child(1) {
                    width: 12%;
                }
                
                .normal-table th:nth-child(2),
                .normal-table td:nth-child(2) {
                    width: 48%;
                    text-align: left;
                }
                
                .normal-table th:nth-child(3),
                .normal-table td:nth-child(3) {
                    width: 15%;
                }
                
                .normal-table th:nth-child(4),
                .normal-table td:nth-child(4) {
                    width: 25%;
                }
                
                /* Auto table column widths (3 columns) */
                .auto-table th:nth-child(1),
                .auto-table td:nth-child(1) {
                    width: 15%;
                }
                
                .auto-table th:nth-child(2),
                .auto-table td:nth-child(2) {
                    width: 65%;
                    text-align: left;
                }
                
                .auto-table th:nth-child(3),
                .auto-table td:nth-child(3) {
                    width: 20%;
                }
                
                .total-row {
                    font-weight: bold;
                    background-color: #f0f0f0;
                    text-align: center;
                }
                
                /* Meta Section */
                .meta-section {
                    margin-bottom: 1mm;
                }
                
                .delivery-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 7px;
                    margin-bottom: 0.5mm;
                }
                
                .total-value {
                    font-weight: bold;
                    font-size: 8px;
                }
                
                .disclaimer-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 6px;
                    color: #333;
                }
                
                /* Footer Section */
                .footer {
                    border-top: 1px solid #000;
                    padding-top: 1mm;
                    margin-top: 1mm;
                }
                
                .branches {
                    font-size: 5px;
                    text-align: center;
                    line-height: 1.3;
                    margin-bottom: 0.5mm;
                }
                
                .leakage-notice {
                    font-size: 5.5px;
                    text-align: center;
                    font-style: italic;
                }
                
                /* Created By */
                .created-by {
                    text-align: right;
                    font-size: 6px;
                    margin-top: 1mm;
                    padding-top: 0.5mm;
                    border-top: 1px dotted #999;
                }
            </style>
        </head>
        <body>
            <div class="sheet">
                ${generateLR(parcel, 0, options)}
                ${generateLR(parcel, 0, options)}
                ${generateLR(parcel, 1, options)}
            </div>
        </body>
        </html>
    `;
};

module.exports = { generateLRSheetThermal };
