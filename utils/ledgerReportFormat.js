const {formatToIST} = require("../utils/dateFormatter.js");

const generateLedgerReport = (allLedgers, startDate, endDate, isForVehicle) => {
    const ledgerCount= allLedgers.length;
    const vehicleNameHeading= isForVehicle===true?`<h4>For Vehicle No. : <strong>${allLedgers[0].vehicleNo}</strong></h4>`:'';

    const ledgerSections = allLedgers.map((ledger) => {
        const vehicleDetail= isForVehicle===true?'':`<div><strong>Vehicle No:</strong> ${ledger.vehicleNo}</div>`;
        const itemCount= ledger.items.length;
        return`
            <div class="ledger-section">
                <div class="ledger-header">
                    <div><strong>Ledger No:</strong> ${ledger._id}</div>
                    ${vehicleDetail}
                    <div><strong>Charges:</strong> ₹${ledger.charges}</div>
                    <div><strong>Status:</strong> ${ledger.isComplete ? 'Complete' : 'Incomplete'}</div>
                    <div><strong>Dispatched At:</strong> ${formatToIST(ledger.dispatchedAt)}</div>
                    <div><strong>Item Count:</strong> ${itemCount}</div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Friends Transport Corporation - Ledger Report</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.4;
                    padding: 20px;
                }

                @page {
                    size: A4;
                    margin: 6mm;
                }

                @media print {
                    html, body {
                        width: 210mm;
                        height: max-content;
                        background: white;
                    }
                }

                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .header h1 {
                    font-size: 26px;
                    margin-bottom: 5px;
                    }

                h2{
                    color: #333;
                }

                p{
                    font-size: 14px;
                    margin-top: 3px;
                }

                .address {
                    color: #666;
                    font-size: 14px;
                    margin-bottom: 10px;
                }

                .ledger-section {
                    margin-bottom: 20px;
                    padding: 10px;
                    border: 1px solid #333;
                    border-radius: 8px;
                    background-color: #f9f9f9;
                    page-break-inside: avoid;
                }

                .ledger-header {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    font-size: 14px;
                }

                .ledger-header div {
                    margin-bottom: 5px;
                }

                hr {
                    border: none;
                    border-top: 1px solid #ccc;
                }

                .line{
                    border: none;
                    border-top: 1px solid black;
                }

            </style>
        </head>
        <body>
            <div class="header">
                <h1>FRIENDS TRANSPORT CORPORATION</h1>
                <p class="address">1651/2, Something, again something, Hyderabad</p>
                <h2>Ledger Report</h2>
                ${vehicleNameHeading}
                <p><strong>${formatToIST(startDate)} to ${formatToIST(endDate)}</strong></p>
            </div>
            ${ledgerSections}
            <div>
                <hr class="line">
                <div style="margin-top: 7px; margin-left: 3px;">
                    <strong>
                        Total Ledgers: ${ledgerCount}
                    </strong>
                </div>
            </div>
        </body>
        </html>
    `;
};

module.exports = generateLedgerReport;