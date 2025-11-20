const {formatToIST} = require("../utils/dateFormatter.js");

const generateLR = (parcel, auto = 0, options = {}) => {
    const { logoDataUrl } = options;
    let index = 1;
    let allitems = parcel.items.map(item => {
        if (auto == 1) {
            return `
            <tr>
                <td>${index++}</td>
                <td>${item.name}</td>  
                <td>${item.quantity}</td>
            </tr>
            `;
        } else {
            return `
            <tr>
                <td>${index++}</td>
                <td>${item.name}</td>  
                <td>${item.quantity}</td>
                <td>${`₹${item.freight}`}</td>
                <td>${`₹${item.hamali}`}</td>
                <td>${`₹${item.statisticalCharges}`}</td>
            </tr>
            `;
        }
    }).join('');

    let totalFreight = parcel.freight;
    let totalHamali = parcel.hamali;
    let totalCharges = parcel.charges;
    let totalItems = parcel.items.reduce((sum, item) => sum + item.quantity, 0);
    let totalAmount = totalFreight + totalHamali + totalCharges;

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
                <th>Freight</th>
                <th>Hamali</th>
                <th>Statical</th>
            </tr>
        `;
        totalRow = `
            <tr class="total-row">
                <td colspan="2">Total</td>
                <td>${totalItems}</td>
                <td>${`₹${totalFreight}`}</td>
                <td>${`₹${totalHamali}`}</td>
                <td>${`₹${totalCharges}`}</td>
            </tr>
            `;
    }

    const logoImg = logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : '';

    return `
            <div class="lr-receipt">
                <div class="content-wrapper">
                    <div class="header">
                        <div class="jurisdiction">SUBJECT TO HYDERABAD JURISDICTION</div>
                        <div class="lr-no">LR No: ${parcel.trackingId}</div>
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
                                <div><strong>BDPURA: </strong>9515409041   </div>
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
                    <div style="display: flex; justify-content: space-between;">
                        <div style="text-align: left;">Door Delivery: ${parcel.isDoorDelivery ? auto ? 'Yes' : parcel.doorDeliveryCharge : 'No'}</div>
                        ${auto == 0 ? `<div class="total-value">Total Value: ₹${totalAmount} (${parcel.payment.toUpperCase()})</div>` : ''}
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
                <div style="text-align: right; display: absolute;font-size: 6px">Created by: ${parcel.addedBy.name}</div>
            </div>
    `;
};

const generateLRSheet = (parcel, options = {}) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>FTC LR Receipt</title>
            <style>
                @page {
                    size: 4in 6in;
                    margin: 0;
                }
                body { width: 4in; height: 6in; margin: 0; padding: 1.5mm; font-family: Arial, sans-serif; font-size: 6px; }
                .sheet {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .lr-receipt {
                    width: 100%;
                    height: 100%;
                    border: 1px dotted #000;
                    padding: 1mm 2mm 2mm 2mm; /* reduce top padding to offset larger header spacing */
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                }
                .content-wrapper {
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                }
                .footer {
                    margin-top: auto; /* Push footer to the bottom */
                }
                .jurisdiction {
                    text-align: center;
                    text-decoration: underline;
                    font-size: 5px;
                    margin-top: 0.6mm; /* push jurisdiction lower */
                    margin-bottom: 2mm; /* tighter gap before company header */
                }

                .lr-no{
                    position: absolute;
                    right: 3.5mm;
                    margin-top: -3.5mm;
                    font-weight: bold;
                    font-size: 7px;
                }

                .header {
                    text-align: center;
                    margin-bottom: 0.6mm;
                }
                .top-bar {
                    display: grid;
                    grid-template-columns: auto 1fr auto;
                    align-items: flex-start;
                    column-gap: 3mm;
                    margin-top: -1mm;  /* keep header in place despite added top padding */
                    font-family: Arial, sans-serif;
                }

                .logo-wrapper {
                    margin-top:-1mm;
                    justify-self: start;
                    align-self: flex-start;
                    text-align: left;
                }

                .logo-wrapper .logo {
                    width: 14mm; /* more prominent logo */
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
                    font-size: 14px; /* increased font for better readability */
                    font-weight: bold;
                    letter-spacing: 0.6px; /* wider lettering */
                    white-space: nowrap;
                }

                .contact {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    text-align: right;
                    font-size: 4.5px; /* smaller than title */
                    line-height: 1.2;
                    justify-self: end;
                }

                .phone-icon {
                    margin-right: 2mm;
                }

                .top-bar .right { font-size: 5px; }
                .company-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: relative;
                    text-align: center;
                    font-size: 6px;
                    margin-bottom: 2px;
                }
                .route-from, .route-to {
                    position: absolute;
                }
                .route-from {
                    left: 0;
                }

                .date {
                    position: absolute;
                    left: 40%;
                }
                .route-to {
                    right: 0;
                }
                .header h1 {
                    margin: 0;
                    padding: 0;
                    font-size: 8px;
                    font-weight: bold;
                    text-align: center;
                    width: 100%;
                }
                .address {
                    font-size: 5px;
                    margin-bottom: 2px;
                }
                .route { display: flex; justify-content: center; gap: 2mm; font-size: 6px; margin: 0.5mm 0; }
                .route .sep { margin: 0 1mm; }
                .lr-header-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 6px;
                    margin: 0.5mm 0 0.3mm 0;
                }
                .consignor-consignee {
                    display: flex;
                    justify-content: space-between;
                    font-size: 6px;
                    margin: 0.5mm 0;
                }
                .consignor, .consignee {
                    display: flex;
                    gap: 1mm;
                    align-items: center;
                }
                .label {
                    font-weight: bold;
                }
                .phone {
                    color: #666;
                }
                .main-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 6px;
                    margin: 0.7mm 0;
                    table-layout: fixed;
                }
        /* 6-column widths: S.No | Item | Qty | Freight | Hamali | Statical */
        .main-table thead tr th:nth-child(1), .main-table tbody tr td:nth-child(1) { width: 8%; }
        .main-table thead tr th:nth-child(2), .main-table tbody tr td:nth-child(2) { width: 42%; }
        .main-table thead tr th:nth-child(3), .main-table tbody tr td:nth-child(3) { width: 10%; }
        .main-table thead tr th:nth-child(4), .main-table tbody tr td:nth-child(4) { width: 13%; }
        .main-table thead tr th:nth-child(5), .main-table tbody tr td:nth-child(5) { width: 13%; }
        .main-table thead tr th:nth-child(6), .main-table tbody tr td:nth-child(6) { width: 14%; }
        /* 4-column widths for auto table: S.No | Item | Qty */
        .auto-table thead tr th:nth-child(1), .auto-table tbody tr td:nth-child(1) { width: 12%; }
        .auto-table thead tr th:nth-child(2), .auto-table tbody tr td:nth-child(2) { width: 68%; }
        .auto-table thead tr th:nth-child(3), .auto-table tbody tr td:nth-child(3) { width: 20%; }
        .main-table th, .main-table td {
            border: 1px solid #000;
            padding: 0.4mm;
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
            .meta { display: flex; align-items: center; justify-content: space-between; font-size: 6px; margin: 0.5mm 0; }
            .branches { font-size: 4px; text-align: center; line-height: 1.1; margin: 0.5mm 0; }
            .total-value {
                font-weight: bold;
                text-align: right;
                font-size: 6px;
                margin-top: 0.1mm;

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

module.exports = { generateLRSheet };
