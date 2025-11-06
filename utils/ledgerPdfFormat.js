const formatToIST = require('../utils/dateFormatter.js')

const generateLedger = (ledger, driver, options = {}) => {
    const { logoDataUrl } = options;
    console.log(ledger)
    let index = 1
    const toPayParcels = (ledger.parcels || []).filter(p => p.payment === 'To Pay');
    const paidParcels = (ledger.parcels || []).filter(p => p.payment === 'Paid');
    const safeNumber = (value) => Number(value) || 0;
    const formatHamaliCell = (parcel) => {
        const hamali = safeNumber(parcel.hamali);
        const doorDelivery = safeNumber(parcel.doorDeliveryCharge);
        const combined = hamali + doorDelivery;
        if (doorDelivery > 0)
            return `${hamali} + ${doorDelivery} (DD) = ${combined}`;
        else return `${hamali}`;
    };
    const formatHamaliTotal = (parcels) => {
        const hamaliSum = parcels.reduce((sum, p) => sum + safeNumber(p.hamali), 0);
        const doorSum = parcels.reduce((sum, p) => sum + safeNumber(p.doorDeliveryCharge), 0);
        const combined = hamaliSum + doorSum;
        if (doorSum > 0)
            return `${hamaliSum} + ${doorSum} (DD) = ${combined}`;
        else return `${hamaliSum}`;
    };

    const renderParcelRow = (parcel, dd) => {
        
        let hamaliRow = parcel.hamali;
        if (dd)
            hamaliRow = formatHamaliCell(parcel);
        return `
        <tr>
            <td>${index++}</td>
            <td>${parcel.placedAt.toISOString().split("T")[0]}</td>
            <td>${parcel.trackingId}</td>
            <td>${parcel.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
            <td>${(parcel.receiver && parcel.receiver.name) ? parcel.receiver.name : 'NA'}</td>
            <td>${parcel.payment}</td>
            <td>${parcel.freight}</td>
            <td>${hamaliRow}</td>
        </tr>
    `;};

    const toPayRows = toPayParcels.map((ele) => renderParcelRow(ele, false)).join('');
    const paidRows = paidParcels.map((ele) => renderParcelRow(ele, true)).join('');

    let details =
        driver ? 
            `
            <div class="ledger-header">
                <div><strong>Vehicle No: </strong>${driver.vehicleNo}</div>
                <div><strong>Driver Name: </strong>${driver.name}</div>
                <div><strong>Driver Phone: </strong>${driver.phoneNo}</div>
            </div>
            <div class="ledger-header" style="margin-top: -10px">
                <div><strong>Source Station: </strong>${ledger.sourceWarehouse.name}</div>
                <div><strong>Delivery Station: </strong>${ledger.destinationWarehouse.name}</div>
            </div>
            ` : 
            `<div class="ledger-header">
                <div><strong>Vehicle No: </strong>${ledger.vehicleNo}</div>
                <div><strong>Source Station: </strong>${ledger.sourceWarehouse.name}</div>
                <div><strong>Delivery Station: </strong>${ledger.destinationWarehouse.name}</div>
            </div>` ;

    let totalFreight = ledger.parcels.reduce(
        (sum, parcel) => sum + parcel.freight,
        0
    )
    let totalHamali = ledger.parcels.reduce(
        (sum, parcel) => sum + safeNumber(parcel.hamali) + safeNumber(parcel.doorDeliveryCharge),
        0
    )
    let totalItems = ledger.parcels.reduce(
        (sum, parcel) =>
            sum + parcel.items.reduce((qty, item) => qty + item.quantity, 0),
        0
    )

    // Compute Paid and To Pay subtotals
    const paidAmount = paidParcels.reduce((sum, p) => sum + (p.freight || 0) + safeNumber(p.hamali) + safeNumber(p.doorDeliveryCharge), 0);
    const toPayAmount = toPayParcels.reduce((sum, p) => sum + (p.freight || 0) + safeNumber(p.hamali) + safeNumber(p.doorDeliveryCharge), 0);

    const paidItems = paidParcels.reduce((sum, p) => sum + p.items.reduce((q, it) => q + it.quantity, 0), 0);
    const toPayItems = toPayParcels.reduce((sum, p) => sum + p.items.reduce((q, it) => q + it.quantity, 0), 0);

    const logoImg = logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Friends Transport Company</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.4;
                    padding: 10px;
                }

                @page {
                    size: A4;
                    margin: 4mm;
                }

                @media print {
                    html, body {
                        width: 210mm;
                        height: max-content;
                        background: white;
                    }

                    thead {
                        display: table-header-group;
                    }
                }

                .header h1 {
                    font-size: 22px;
                    margin-bottom: 3px;
                }

                h2{
                    color: #333;
                    font-size: 18px;
                }

                .header-bar {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }

                .logo {
                    width: 68px;
                    height: auto;
                }

                .header-center {
                    text-align: center;
                    flex: 1;
                }

                .contact {
                    text-align: right;
                    font-size: 12px;
                    line-height: 1.4;
                }

                .contact .phone-icon {
                    font-size: 14px;
                }

                .address {
                    color: #666;
                    font-size: 12px;
                    margin-bottom: 8px;
                }

                .ledger-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding: 0 8px;
                }

                .ledger-header div {
                    font-size: 12px;
                }

                .table-container {
                    width: 100%;
                    margin: 0 auto 15px;
                    border-radius: 6px;
                    overflow: hidden;
                    border: 1px solid #333;
                }

                table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                }

                table th,
                table td {
                    padding: 5px;
                    text-align: left;
                    border: 1px solid #333;
                    font-size: 11px;
                }

                table th {
                    background-color: #f5f5f5;
                    border: 1px solid #333;
                    border-collapse: collapse;
                    font-size: 12px;
                }

                .totals {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid #333;
                    font-weight: bold;
                }

                #date-time{
                    font-size: 13px;
                    margin-left: 6px;
                    margin-bottom: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
            </style>
        </head>
        <body>
            <div class="header-bar">
                <div class="header-left">${logoImg}</div>
                <div class="header-center">
                    <h1>FRIENDS TRANSPORT CO.</h1>
                    <h2>MEMO</h2>
                </div>
                <div class="contact">
                    <div class="phone-icon">☎</div>
                    <div><strong>Hyd.</strong> 24614381</div>
                    <div>24604381</div>
                    <div><strong>Sec'bad:</strong> 29331533</div>
                </div>
            </div>

            <div id="date-time">
                <span><strong>Date and Time:</strong> ${formatToIST(
        ledger.dispatchedAt
    )}</span>
                <span><strong>Memo No:</strong> ${ledger.ledgerId}</span>
                <span><strong>Lorry Freight:</strong> ${ledger.lorryFreight
        }</span>
            </div>

            ${details}

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>S.No.</th>
                            <th>Date</th>
                            <th>LR No.</th>
                            <th>Pkgs (Qty)</th>
                            <th>Receiver</th>
                            <th>Type</th>
                            <th>Freight</th>
                            <th>Hamali</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${toPayRows}
                        <tr style="font-weight: bold; background-color: #f5f5f5;">
                            <td colspan="3" style="text-align: right">To Pay Total</td>
                            <td>${toPayItems}</td>
                            <td></td>
                            <td></td>
                            <td>₹${toPayParcels.reduce((s,p)=>s+(p.freight||0), 0)}</td>
                            <td>₹${toPayParcels.reduce((sum, p) => sum + safeNumber(p.hamali), 0)}</td>
                        </tr>
                        ${paidRows}
                        <tr style="font-weight: bold; background-color: #f5f5f5;">
                            <td colspan="3" style="text-align: right">Paid Total</td>
                            <td>${paidItems}</td>
                            <td></td>
                            <td></td>
                            <td>₹${paidParcels.reduce((s,p)=>s+(p.freight||0),0)}</td>
                            <td>₹${formatHamaliTotal(paidParcels)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style="text-align: right; display: absolute; bottom: 0;">Created by: ${ledger.verifiedBySource.name}</div>
        </body>
        </html>
    `
}

module.exports = generateLedger
