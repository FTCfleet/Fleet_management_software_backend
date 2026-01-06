const {formatToIST} = require("../utils/dateFormatter.js");
const { fromDbValue, fromDbValueNum } = require("../utils/currencyUtils.js");

const generateLR = (parcel, auto = 0, options = {}) => {
    const { logoDataUrl } = options;
    let index = 1;
    
    // Helper to convert DB value to display format
    const displayValue = (dbValue) => fromDbValue(dbValue);
    const displayValueNum = (dbValue) => fromDbValueNum(dbValue);
    
    let allitems = parcel.items.map(item => {
        if (auto == 1) {
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
                <td>${item.name}  (${item.itemType.name})</td>  
                <td>${item.quantity}</td>
                <td>${`₹${itemAmount.toFixed(2)}`}</td>
            </tr>
            `;
        }
    }).join('');

    let totalFreight = displayValueNum(parcel.freight);
    let totalHamali = displayValueNum(parcel.hamali);
    let totalItems = parcel.items.reduce((sum, item) => sum + item.quantity, 0);
    let totalAmount = totalFreight + 2*totalHamali;

    let tableHeaders = '';
    let totalRow = '';
    
    if (auto == 1) {
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
                <td>${totalItems}</td>
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
                <td>${totalItems}</td>
                <td>${`₹${totalAmount.toFixed(2)}`}</td>
            </tr>
            `;
    }

    const logoImg = logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : '';

    return `
            <div class="lr-receipt">
                <div class="content-wrapper">
                    <div class="header">
                        <div class="header-top-row">
                            <div class="jurisdiction">SUBJECT TO HYDERABAD JURISDICTION</div>
                            <div class="lr-no">LR No: ${parcel.trackingId}</div>
                        </div>
                        <div class="top-bar">
                            <div class="logo-wrapper">
                                ${logoImg}
                            </div>
                            <div class="top-title">
                                <div class="company-name">FRIENDS TRANSPORT CO.</div>
                                <div class="address">H.O.: 15-1-196/2, Feelkhana, Hyd. Br. O.: Nallagutta, Secunderabad.<br> Br. Off. Near Mir Alam Filter, Bahadurpura, Hyd.</div>
                            </div>
                            <div class="contact">
                                <div><span class="phone-icon">☎</span> <strong>HYD-01: </strong>24614381</div>
                                <div><strong>HYD-02: </strong>24604381 </div>
                                <div><strong>SECBAD: </strong>29331533  </div>
                                <div><strong>BDPURA: </strong>9515409041</div>
                            </div>
                        </div>
                    </div>
                    <div class="company-row">
                        <div class="route-from"><strong>From: </strong> ${parcel.sourceWarehouse.name}</div>
                        <div class="date"><strong>Date: </strong>${formatToIST(parcel.placedAt)}</div>
                        <div class="route-to"><strong>To: </strong>${parcel.destinationWarehouse.name}</div>
                    </div>

                    <div class="consignor-consignee">
                        <div class="consignor">
                            <span class="label">Consignor:</span>
                            <span class="value">${parcel.sender.name}</span>
                            <span class="label">Ph: </span>
                            <span class="value">${parcel.sender.phoneNo || "____"}</span>
                        </div>
                        <div class="consignee">
                            <span class="label">Consignee:</span>
                            <span class="value">${parcel.receiver.name}</span>
                            <span class="label">Ph: </span>
                            <span class="value">${parcel.receiver.phoneNo || "____"}</span>
                        </div>
                    </div>

                    <table class="main-table ${auto == 1 ? 'auto-table' : 'normal-table'}">
                        <thead>${tableHeaders}</thead>
                        <tbody>
                            ${allitems}
                            ${totalRow}
                        </tbody>
                    </table>
                    <div class="delivery-total-row">
                        <div>Door Delivery: ${parcel.isDoorDelivery ? auto ? 'Yes' : displayValue(parcel.doorDeliveryCharge) : 'No'}</div>
                        ${auto == 0 ? `<div class="total-value">Total Value: ₹${totalAmount.toFixed(2)} (${parcel.payment.toUpperCase()})</div>` : ''}
                    </div>
                    <div class="meta">
                        <span>Declared goods value ₹${parcel.declaredValue || "____"}</span>
                        <span>Goods are at owner's risk</span>
                        <span>GSTID: 36AAFFF2744R1ZX</span>
                    </div>
                </div>
            
                <div class="footer">
                    <div class="branches">◆ Karimnagar-9908690827 ◆ Sultanabad-Ph: 9849701721 ◆ Peddapally-Cell: 7036323006 ◆ Godavari Khani-Cell: 9949121267 ◆ Mancherial-Cell: 8977185376</div>
                    <div class="branches">FTC is not responsible for Leakage & Breakage.</div>
                </div>
                <div class="created-by">Created by: ${parcel.addedBy.name}</div>
            </div>
    `;
};

const generateLRSheetThermal = (parcel, options = {}) => {
    // Each LR: 8cm wide (left to right) × 6in tall (top to bottom) after rotation
    // Content is laid out as 6in wide × 8cm tall, then rotated 90° clockwise
    // Total page: 8cm wide × 18in tall (3 × 6in)
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>FTC LR Receipt</title>
            <style>
                @page {
                    size: 80mm 18in;
                    margin: 0;
                }
                * {
                    box-sizing: border-box;
                }
                body {
                    width: 80mm;
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                }
                .sheet {
                    width: 80mm;
                    display: flex;
                    flex-direction: column;
                }
                /* Each wrapper is 80mm wide × 6in tall on the page */
                .lr-wrapper {
                    width: 80mm;
                    height: 6in;
                    position: relative;
                    overflow: hidden;
                    page-break-inside: avoid;
                }
                /* Content is 6in wide × 76mm tall before rotation */
                /* After 90° clockwise rotation: 76mm wide × 6in tall */
                .lr-rotated {
                    width: 6in;
                    height: 76mm;
                    transform: rotate(90deg);
                    transform-origin: top left;
                    position: absolute;
                    top: 0;
                    left: 80mm;
                }
                .lr-receipt {
                    width: 100%;
                    height: 100%;
                    border: 1px dotted #000;
                    padding: 2mm 3mm;
                    margin: 2mm;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    font-size: 8px;
                }
                .content-wrapper {
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                }
                .footer {
                    margin-top: auto;
                }
                .header-top-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1.5mm;
                }
                .jurisdiction {
                    text-decoration: underline;
                    font-size: 7px;
                }
                .lr-no {
                    font-weight: bold;
                    font-size: 10px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 1mm;
                }
                .top-bar {
                    display: grid;
                    grid-template-columns: auto 1fr auto;
                    align-items: flex-start;
                    column-gap: 3mm;
                    font-family: Arial, sans-serif;
                }
                .logo-wrapper {
                    justify-self: start;
                    align-self: flex-start;
                    text-align: left;
                }
                .logo-wrapper .logo {
                    width: 14mm;
                    height: auto;
                }
                .top-title {
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    width: 100%;
                }
                .company-name {
                    display: inline-block;
                    font-size: 16px;
                    font-weight: bold;
                    letter-spacing: 0.5px;
                    white-space: nowrap;
                }
                .address {
                    font-size: 7px;
                    margin-bottom: 2px;
                    line-height: 1.3;
                }
                .contact {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    text-align: right;
                    font-size: 6px;
                    line-height: 1.3;
                    justify-self: end;
                }
                .phone-icon {
                    margin-right: 1mm;
                }
                .company-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 8px;
                    margin-bottom: 2px;
                }
                .route-from, .date, .route-to {
                    flex: 1;
                }
                .route-from { text-align: left; }
                .date { text-align: center; }
                .route-to { text-align: right; }
                .consignor-consignee {
                    display: flex;
                    justify-content: space-between;
                    font-size: 8px;
                    margin: 1mm 0;
                }
                .consignor, .consignee {
                    display: flex;
                    gap: 1mm;
                    align-items: center;
                }
                .label {
                    font-weight: bold;
                }
                .main-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 8px;
                    margin: 1mm 0;
                    table-layout: fixed;
                }
                .main-table thead tr th:nth-child(1), .main-table tbody tr td:nth-child(1) { width: 10%; }
                .main-table thead tr th:nth-child(2), .main-table tbody tr td:nth-child(2) { width: 50%; }
                .main-table thead tr th:nth-child(3), .main-table tbody tr td:nth-child(3) { width: 15%; }
                .main-table thead tr th:nth-child(4), .main-table tbody tr td:nth-child(4) { width: 25%; }
                .auto-table thead tr th:nth-child(1), .auto-table tbody tr td:nth-child(1) { width: 15%; }
                .auto-table thead tr th:nth-child(2), .auto-table tbody tr td:nth-child(2) { width: 65%; }
                .auto-table thead tr th:nth-child(3), .auto-table tbody tr td:nth-child(3) { width: 20%; }
                .main-table th, .main-table td {
                    border: 1px solid #000;
                    padding: 0.5mm;
                    text-align: center;
                }
                .main-table th {
                    background-color: #f0f0f0;
                    font-weight: bold;
                }
                .total-row {
                    font-weight: bold;
                    background-color: #f0f0f0;
                }
                .delivery-total-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 8px;
                    margin-top: 1mm;
                }
                .total-value {
                    font-weight: bold;
                    text-align: right;
                    font-size: 8px;
                }
                .meta {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 7px;
                    margin: 1mm 0;
                }
                .branches {
                    font-size: 5px;
                    text-align: center;
                    line-height: 1.2;
                    margin: 0.5mm 0;
                }
                .created-by {
                    text-align: right;
                    font-size: 6px;
                    margin-top: 1mm;
                }
            </style>
        </head>
        <body>
            <div class="sheet">
                <div class="lr-wrapper">
                    <div class="lr-rotated">
                        ${generateLR(parcel, 0, options)}
                    </div>
                </div>
                <div class="lr-wrapper">
                    <div class="lr-rotated">
                        ${generateLR(parcel, 0, options)}
                    </div>
                </div>
                <div class="lr-wrapper">
                    <div class="lr-rotated">
                        ${generateLR(parcel, 1, options)}
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

module.exports = { generateLRSheetThermal };
