const { formatToIST } = require("../utils/dateFormatter.js");
const { fromDbValue, fromDbValueNum } = require("../utils/currencyUtils.js");

/**
 * Generate a single LR receipt HTML
 * @param {Object} parcel - The parcel data
 * @param {number} auto - 0 for normal (with amounts), 1 for auto (without amounts)
 */
const generateLR = (parcel, auto = 0) => {
    // Helper to convert DB value to display format
    const displayValue = (dbValue) => fromDbValue(dbValue);
    const displayValueNum = (dbValue) => fromDbValueNum(dbValue);

    // Build items table rows
    let index = 1;
    const allItems = parcel.items.map(item => {
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

    // Calculate totals
    const totalFreight = displayValueNum(parcel.items.reduce((sum, item) => sum + item.freight, 0));
    const totalHamali = displayValueNum(parcel.items.reduce((sum, item) => sum + item.hamali, 0));
    const totalItems = parcel.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = totalFreight + 2 * totalHamali;

    let tableHeaders;
    let totalRow;
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
                <td colspan="2" style="text-align: right;">Total</td>
                <td style="text-align: center;">${totalItems}</td>
            </tr>
        `;
    } 
    else {
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
                <td colspan="2" style="text-align: right;">Total</td>
                <td style="text-align: center;">${totalItems}</td>
                <td style="text-align: center;">₹${totalAmount.toFixed(2)}</td>
            </tr>
        `;
    }

    // Door Delivery display logic
    const doorDeliveryDisplay = parcel.isDoorDelivery
        ? (auto ? 'Yes' : '₹'+displayValue(parcel.doorDeliveryCharge))
        : 'No';

    return `
        <div class="lr-receipt">
            <div class="lr-content">
                <!-- Header Section -->
                <div class="header">
                    <div class="date">Date: ${formatToIST(parcel.placedAt)}</div>
                    <div class="header-title">
                        <div class="jurisdiction">SUBJECT TO HYDERABAD JURISDICTION</div>
                        <div class="company-name">FRIENDS TRANSPORT CO.</div>
                    </div>
                    <div class="lr-no">LR No: ${parcel.trackingId}</div>
                </div>
                
                <!-- Top Bar (From/To) in one row -->
                <div class="route-bar">
                    <span><strong>From:</strong> ${parcel.sourceWarehouse.name}</span>
                    <span><strong>To:</strong> ${parcel.destinationWarehouse.name}</span>
                </div>
                
                <!-- Consignor/Consignee in one row -->
                <div class="consignment-row">
                    <span><strong>Consignor:</strong> ${parcel.sender.name} <strong>Ph:</strong> ${parcel.sender.phoneNo || "____"}</span>
                    <span><strong>Consignee:</strong> ${parcel.receiver.name} <strong>Ph:</strong> ${parcel.receiver.phoneNo || "____"}</span>
                </div>
                
                <!-- Data Section: Items Table -->
                <div class="data-section">
                    <table class="items-table">
                        <thead>${tableHeaders}</thead>
                        <tbody>
                            ${allItems}
                            ${totalRow}
                        </tbody>
                    </table>
                    
                    <!-- Meta Section -->
                    <div class="meta-section">
                        <span>Door Delivery: ${doorDeliveryDisplay}</span>
                        ${auto == 1 ? '' : `<span class="total-value">Total Value: ₹${totalAmount.toFixed(2)} (${parcel.payment.toUpperCase()})</span>`}
                    </div>
                </div>
                
                <!-- Footer Section - always at bottom -->
                <div class="created-by">
                    <p style="text-align: right;">Created by: ${parcel.addedBy.name}</p>
                </div>
            </div>
        </div>
    `;
};

/**
 * Generate the complete thermal LR sheet with 3 stacked receipts
 * Page dimensions: 77mm width × 175mm height per receipt
 * Text rotated 90 degrees clockwise
 * @param {Object} parcel - The parcel data
 * @param {Object} options - Additional options
 */
const generateLRSheetThermal = (parcel, options = {}) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>FTC LR Receipt</title>
            <style>
                @page {
                    size: 115mm 180mm;
                    margin: 0;
                }

                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                body {
                    width: 77mm;
                    margin: 0;
                    font-family: Arial, sans-serif;
                    font-size: 10px;
                    line-height: 1.1;
                }

                /* Outer receipt – NO flex centering */
                .lr-receipt {
                    width: 77mm;
                    height: 175mm;
                    margin: 2mm;
                    border: 1px dashed #000;
                    position: relative;
                    page-break-after: always;
                }

                /* Rotated content */
                .lr-content {
                    width: 175mm;
                    height: 77mm;

                    padding: 4mm; /* was 4mm */

                    transform: rotate(90deg) translate(0mm, -77mm);
                    transform-origin: top left;

                    display: flex;
                    flex-direction: column;
                }

                .lr-content > div {
                    padding-top: 1mm;
                    padding-bottom: 1mm;
                }


                /* HEADER */
                .header {
                    margin-bottom: 1mm;
                    display: flex;
                }
                
                .date {
                    flex: 1;
                }

                .header-title {
                    font-size: 13px;
                    align-items: center;
                    display: flex;
                    flex-direction: column;
                }


                .jurisdiction {
                    flex: 2;
                    text-align: center;
                    text-decoration: underline;
                }

                
                .company-name {
                    font-size: 26px;
                    font-weight: bold;
                    text-align: center;
                    margin-top: 0.5mm;
                }
                    
                .lr-no {
                    flex: 1;
                    text-align: right;
                    font-size: 17px;
                    font-weight: bold;
                }
                
                /* FROM / TO */
                .route-bar {
                    display: flex;
                    justify-content: space-between;
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                    padding: 0.5mm 0;
                    font-size: 14px;
                }

                /* CONSIGNMENT */
                .consignment-row {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 1px solid #000;
                    padding: 0.5mm 0;
                    font-size: 16px;
                }

                /* DATA */
                .data-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                /* TABLE */
                .items-table {
                    border-collapse: collapse;
                    text-align: center;
                    font-size: 14px;
                    width: 98%;
                }

                .items-table th,
                .items-table td {
                    border: 1px solid #000;
                    padding: 0.5mm;
                }

                .items-table th {
                    background: #eee;
                }
                
                .items-table td:nth-child(2) { text-align: left; }

                .total-row {
                    font-weight: bold;
                    background: #eee;
                }

                /* META */
                .meta-section {
                    display: flex;
                    justify-content: space-between;
                    font-size: 13px;
                    margin-top: 5px;
                    }
                    
                    .total-value {
                    font-weight: bold;
                    font-size: 13px;
                }

                .created-by {
                    width: 100%;
                    border-top: 1px dotted #999;
                    margin-top: auto; /* PUSHES FOOTER TO BOTTOM */
                    padding-top: 0.5mm;
                    text-align: right;
                    font-size: 12px;
                }

                @media print {
                    body {
                        width: 77mm;
                    }
                }

            </style>
        </head>
        <body>
            ${generateLR(parcel)}
            ${generateLR(parcel)}
            ${generateLR(parcel,1)}
            <!-- End of file marker for thermal printer -->
            <div style="page-break-after: always; break-after: page;"></div>
        </body>
        </html>
    `;
};

module.exports = { generateLRSheetThermal };
