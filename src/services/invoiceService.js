const crypto = require('crypto');
const PDFDocument = require('pdfkit');

const toNumber = (value, fallback = 0) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Number(numeric.toFixed(2));
};

const formatCurrency = (value) => `INR ${toNumber(value).toFixed(2)}`;

const getFinancialYearCode = (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startYear = month >= 3 ? year : year - 1;
    const endYear = startYear + 1;
    const shortStart = String(startYear).slice(-2);
    const shortEnd = String(endYear).slice(-2);
    return `${shortStart}-${shortEnd}`;
};

const generateShareToken = () => crypto.randomBytes(20).toString('hex');

const nextInvoiceNumber = async (tx, issuedAt = new Date(), prefix = 'AR') => {
    const fyCode = getFinancialYearCode(issuedAt);
    const count = await tx.invoice.count();
    const sequence = String(count + 1).padStart(6, '0');
    return `${prefix}/${fyCode}/${sequence}`;
};

const normalizeInvoiceItems = (items = []) => {
    if (!Array.isArray(items)) return [];
    return items
        .map((item) => {
            const qty = Number.isFinite(Number(item?.qty)) ? Math.max(1, Math.trunc(Number(item.qty))) : 1;
            const unitPrice = toNumber(item?.unitPrice, 0);
            const amount = item?.amount !== undefined && item?.amount !== null ? toNumber(item.amount, 0) : toNumber(qty * unitPrice, 0);
            const taxRate = item?.taxRate !== undefined && item?.taxRate !== null ? toNumber(item.taxRate, 0) : null;
            return {
                label: String(item?.label || 'Item').trim() || 'Item',
                qty,
                unitPrice,
                amount,
                hsnSac: item?.hsnSac ? String(item.hsnSac).trim() : null,
                taxRate
            };
        })
        .filter((item) => item.amount >= 0);
};

const createInvoice = async (
    tx,
    {
        vendorId,
        brandId,
        campaignBudgetId,
        type,
        items,
        tax,
        subtotal,
        total,
        metadata,
        issuedAt,
        numberPrefix,
        status = 'issued'
    }
) => {
    const safeIssuedAt = issuedAt ? new Date(issuedAt) : new Date();
    const normalizedItems = normalizeInvoiceItems(items);

    const computedSubtotal =
        subtotal !== undefined && subtotal !== null
            ? toNumber(subtotal, 0)
            : toNumber(normalizedItems.reduce((sum, item) => sum + Number(item.amount || 0), 0), 0);

    const computedTax = tax !== undefined && tax !== null ? toNumber(tax, 0) : 0;
    const computedTotal =
        total !== undefined && total !== null ? toNumber(total, 0) : toNumber(computedSubtotal + computedTax, 0);

    const number = await nextInvoiceNumber(tx, safeIssuedAt, numberPrefix || 'AR');

    return tx.invoice.create({
        data: {
            number,
            vendorId,
            brandId: brandId || null,
            campaignBudgetId: campaignBudgetId || null,
            type,
            subtotal: computedSubtotal,
            tax: computedTax,
            total: computedTotal,
            status,
            issuedAt: safeIssuedAt,
            metadata: metadata || null,
            Items: {
                create: normalizedItems
            }
        },
        include: {
            Items: true,
            Vendor: true,
            Brand: true
        }
    });
};

const withShareToken = async (tx, invoiceId, expiresInHours = 48) => {
    const token = generateShareToken();
    const expiry = new Date(Date.now() + Math.max(1, Number(expiresInHours || 48)) * 60 * 60 * 1000);

    const invoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
            shareToken: token,
            shareExpiresAt: expiry
        }
    });

    return { token, expiry, invoice };
};

const renderInvoiceToBuffer = (invoice) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 48, size: 'A4' });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(22).text('Assured Rewards', { align: 'left' });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#444').text(`Invoice No: ${invoice.number}`);
        doc.text(`Type: ${String(invoice.type || '').replace(/_/g, ' ')}`);
        doc.text(`Issued: ${new Date(invoice.issuedAt).toLocaleString('en-IN')}`);

        doc.moveDown();
        doc.fillColor('#111').fontSize(12).text('Billed To', { underline: true });
        doc.fontSize(11);
        doc.text(invoice?.Vendor?.businessName || 'Vendor');
        if (invoice?.Vendor?.contactEmail) doc.text(invoice.Vendor.contactEmail);
        if (invoice?.Vendor?.contactPhone) doc.text(invoice.Vendor.contactPhone);

        doc.moveDown();
        doc.fontSize(12).text('Line Items', { underline: true });
        doc.moveDown(0.5);

        const items = Array.isArray(invoice?.Items) ? invoice.Items : [];
        if (!items.length) {
            doc.fontSize(10).fillColor('#666').text('No line items');
        } else {
            items.forEach((item, index) => {
                doc.fillColor('#111').fontSize(10).text(`${index + 1}. ${item.label}`);
                doc.fillColor('#555').fontSize(9).text(`Qty: ${item.qty}   Unit: ${formatCurrency(item.unitPrice)}   Amount: ${formatCurrency(item.amount)}`);
                if (item?.hsnSac) {
                    doc.text(`HSN/SAC: ${item.hsnSac}`);
                }
                doc.moveDown(0.35);
            });
        }

        doc.moveDown();
        doc.fillColor('#111').fontSize(11).text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, { align: 'right' });
        doc.text(`Tax: ${formatCurrency(invoice.tax)}`, { align: 'right' });
        doc.fontSize(13).text(`Total: ${formatCurrency(invoice.total)}`, { align: 'right' });

        doc.moveDown(2);
        doc.fontSize(9).fillColor('#666').text('Generated by Assured Rewards Billing Engine', { align: 'center' });

        doc.end();
    });
};

module.exports = {
    createInvoice,
    formatCurrency,
    generateShareToken,
    getFinancialYearCode,
    renderInvoiceToBuffer,
    withShareToken
};
