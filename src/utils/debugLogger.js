const fs = require('fs');
const path = require('path');

const LOG_FILE = path.resolve(__dirname, '..', '..', 'debug_invoice.log');

function logInvoiceCreation(context, data) {
    try {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] [${context}] ${JSON.stringify(data, null, 2)}\n---\n`;
        fs.appendFileSync(LOG_FILE, entry);
    } catch (e) {
        // ignore errors in debug logger
    }
}

module.exports = { logInvoiceCreation };
