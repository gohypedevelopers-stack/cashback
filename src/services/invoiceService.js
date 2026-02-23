const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
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
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const PAGE_W = doc.page.width;
        const M = 50; // margin
        const CONTENT_W = PAGE_W - M * 2;

        // Colors
        const GREEN = '#059669';
        const DARK = '#111827';
        const GRAY = '#6B7280';
        const LIGHT_BG = '#F0FDF4';
        const WHITE = '#FFFFFF';

        // ──────────────── HEADER ────────────────
        // Assured Rewards logo
        const logoSize = 60;
        const logoPath = path.resolve(__dirname, '..', '..', '..', '..', 'public', 'light theme incentify logo.png');
        try {
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, M, M, { width: logoSize, height: logoSize });
            }
        } catch (_e) { /* silently skip if logo not found */ }

        // Company name + address (right side)
        const companyName = invoice?.Brand?.name || 'Assured Rewards';
        doc.fillColor(GREEN).fontSize(16).font('Helvetica-Bold')
            .text(companyName, M + 70, M, { align: 'right', width: CONTENT_W - 70 });
        doc.fillColor(GRAY).fontSize(8).font('Helvetica')
            .text('Assured Rewards Platform', M + 70, M + 20, { align: 'right', width: CONTENT_W - 70 })
            .text('Billing & Invoicing', M + 70, M + 30, { align: 'right', width: CONTENT_W - 70 })
            .text('India', M + 70, M + 40, { align: 'right', width: CONTENT_W - 70 });

        // ──────────────── INVOICE TITLE ────────────────
        let y = M + logoSize + 24;
        doc.fillColor(DARK).fontSize(22).font('Helvetica-Bold')
            .text('INVOICE', M, y, { align: 'center', width: CONTENT_W });

        // ──────────────── BILL TO ────────────────
        y += 36;
        const vendorName = invoice?.Vendor?.businessName || 'Vendor';
        const vendorEmail = invoice?.Vendor?.contactEmail || '';
        const vendorPhone = invoice?.Vendor?.contactPhone || '';

        doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold').text('Bill To:', M, y);
        y += 12;
        doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text(vendorName, M, y);
        y += 14;
        doc.fillColor(GRAY).fontSize(8).font('Helvetica');
        if (vendorEmail) { doc.text(vendorEmail, M, y); y += 10; }
        if (vendorPhone) { doc.text(vendorPhone, M, y); y += 10; }

        // Invoice # on the right side
        const invInfoY = y - (vendorEmail ? 34 : 24);
        doc.fillColor(GRAY).fontSize(8).font('Helvetica').text('Invoice#', PAGE_W - M - 150, invInfoY);
        doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text(invoice.number || '-', PAGE_W - M - 150, invInfoY + 12);

        // ──────────────── DATE ROW (Green bar) ────────────────
        y += 12;
        const dateRowH = 28;
        doc.rect(M, y, CONTENT_W, dateRowH).fill(GREEN);

        const issuedDate = invoice.issuedAt ? new Date(invoice.issuedAt) : new Date();
        const formattedDate = issuedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const invoiceType = String(invoice.type || '').replace(/_/g, ' ');

        const colW = CONTENT_W / 3;
        doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold');
        doc.text('Invoice Date', M + 8, y + 4, { width: colW });
        doc.text('Type', M + colW + 8, y + 4, { width: colW });
        doc.text('Due Date', M + colW * 2 + 8, y + 4, { width: colW });

        doc.fontSize(8).font('Helvetica');
        doc.text(formattedDate, M + 8, y + 16, { width: colW });
        doc.text(invoiceType, M + colW + 8, y + 16, { width: colW });
        doc.text('Due on Receipt', M + colW * 2 + 8, y + 16, { width: colW });

        // ──────────────── ITEMS TABLE ────────────────
        y += dateRowH + 18;
        const items = Array.isArray(invoice?.Items) ? invoice.Items : [];

        // Table column widths
        const tblX = M;
        const col0 = 28;   // #
        const col4 = 80;   // Amount
        const col3 = 60;   // Rate
        const col2 = 40;   // Qty
        const col1 = CONTENT_W - col0 - col2 - col3 - col4; // Item & Description

        const headerH = 24;

        const drawHeader = () => {
            doc.rect(tblX, y, CONTENT_W, headerH).fill(GREEN);
            doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold');
            doc.text('#', tblX + 6, y + 8, { width: col0 });
            doc.text('Item & Description', tblX + col0 + 6, y + 8, { width: col1 });
            doc.text('Qty', tblX + col0 + col1 + 4, y + 8, { width: col2, align: 'center' });
            doc.text('Rate', tblX + col0 + col1 + col2 + 4, y + 8, { width: col3 - 4, align: 'right' });
            doc.text('Amount', tblX + col0 + col1 + col2 + col3 + 4, y + 8, { width: col4 - 10, align: 'right' });
            y += headerH;
        };

        const checkPageBreak = (needed) => {
            if (y + needed > doc.page.height - M - 20) {
                doc.addPage();
                y = M;
                drawHeader();
                return true;
            }
            return false;
        };

        // Table header (green)
        drawHeader();

        if (!items.length) {
            doc.fillColor(GRAY).fontSize(9).font('Helvetica')
                .text('No line items', tblX + col0 + 6, y + 8);
            y += 30;
        } else {
            items.forEach((item, index) => {
                const rowH = 38;
                checkPageBreak(rowH);

                // Alternating row background
                if (index % 2 === 1) {
                    doc.rect(tblX, y, CONTENT_W, rowH).fill('#F9FAFB');
                }

                const label = item.label || 'Item';
                const hsnLine = item.hsnSac ? `HSN/SAC: ${item.hsnSac}` : '';
                const qty = item.qty || 1;
                const unitPrice = toNumber(item.unitPrice, 0);
                const amount = toNumber(item.amount, 0);

                doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold');
                doc.text(`${index + 1}`, tblX + 6, y + 6, { width: col0 });

                doc.text(label, tblX + col0 + 6, y + 6, { width: col1 - 12 });
                if (hsnLine) {
                    doc.fillColor(GRAY).fontSize(7).font('Helvetica')
                        .text(hsnLine, tblX + col0 + 6, y + 18, { width: col1 - 12 });
                }

                doc.fillColor(DARK).fontSize(9).font('Helvetica');
                doc.text(String(qty), tblX + col0 + col1 + 4, y + 6, { width: col2, align: 'center' });
                doc.text(toNumber(unitPrice).toFixed(2), tblX + col0 + col1 + col2 + 4, y + 6, { width: col3 - 4, align: 'right' });
                doc.fillColor(DARK).font('Helvetica-Bold');
                doc.text(toNumber(amount).toFixed(2), tblX + col0 + col1 + col2 + col3 + 4, y + 6, { width: col4 - 10, align: 'right' });

                y += rowH;

                // Row bottom border
                doc.moveTo(tblX, y).lineTo(tblX + CONTENT_W, y).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
            });
        }

        // ──────────────── THANK YOU + SUMMARY ────────────────
        y += 16;
        
        // Summary box (right-aligned)
        const summaryW = 190;
        const summaryX = PAGE_W - M - summaryW;
        const hasLineItems = items.length > 0;
        const derivedSubtotal = toNumber(
            items.reduce((sum, item) => sum + toNumber(item?.amount, 0), 0),
            0
        );
        const derivedTax = toNumber(
            items.reduce((sum, item) => {
                const base = toNumber(item?.amount, 0);
                const rate = toNumber(item?.taxRate, 0);
                return sum + toNumber(base * (rate / 100), 0);
            }, 0),
            0
        );
        const subtotal = hasLineItems ? derivedSubtotal : toNumber(invoice.subtotal, 0);
        const tax = hasLineItems ? derivedTax : toNumber(invoice.tax, 0);
        const total = hasLineItems
            ? toNumber(derivedSubtotal + derivedTax, 0)
            : toNumber(invoice.total, 0);

        const summaryBoxH = 120; // Approx height needed for summary
        if (y + summaryBoxH > doc.page.height - M) {
            doc.addPage();
            y = M;
        }

        doc.fillColor(GRAY).fontSize(9).font('Helvetica-Oblique')
            .text('Thank you for your business.', M, y);

        const summaryStartY = y;
        const rowH = 20;

        // Sub Total
        doc.rect(summaryX, summaryStartY, summaryW, rowH).fill('#F9FAFB');
        doc.fillColor(GRAY).fontSize(9).font('Helvetica')
            .text('Sub Total', summaryX + 10, summaryStartY + 5, { width: 100 });
        doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
            .text(subtotal.toFixed(2), summaryX + 110, summaryStartY + 5, { width: 70, align: 'right' });

        // Tax (show GST % if available)
        const taxY = summaryStartY + rowH;
        const itemTaxRate = toNumber(
            items.find((item) => toNumber(item?.taxRate, 0) > 0)?.taxRate,
            0
        );
        const taxLabel = itemTaxRate > 0 ? `GST @ ${itemTaxRate}%` : 'Tax/GST';
        doc.rect(summaryX, taxY, summaryW, rowH).fill(WHITE);
        doc.fillColor(GRAY).fontSize(9).font('Helvetica')
            .text(taxLabel, summaryX + 10, taxY + 5, { width: 100 });
        doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
            .text(tax.toFixed(2), summaryX + 110, taxY + 5, { width: 70, align: 'right' });

        // Total (green bg)
        const totalY = taxY + rowH;
        doc.rect(summaryX, totalY, summaryW, rowH + 2).fill(GREEN);
        doc.fillColor(WHITE).fontSize(10).font('Helvetica-Bold')
            .text('Total', summaryX + 10, totalY + 5, { width: 100 });
        doc.text(formatCurrency(total), summaryX + 80, totalY + 5, { width: 100, align: 'right' });

        // Balance Due / Amount Paid (depends on invoice type)
        const isReceipt = String(invoice.type || '').toUpperCase().includes('RECEIPT') ||
                          String(invoice.type || '').toUpperCase().includes('DEPOSIT');
        const balY = totalY + rowH + 2;

        if (isReceipt) {
            // DEPOSIT_RECEIPT — payment already received
            doc.rect(summaryX, balY, summaryW, rowH + 2).fill('#F0FDF4');
            doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold')
                .text('Amount Paid', summaryX + 10, balY + 6, { width: 100 });
            doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold')
                .text(formatCurrency(total), summaryX + 80, balY + 6, { width: 100, align: 'right' });

            const bal2Y = balY + rowH + 2;
            doc.rect(summaryX, bal2Y, summaryW, rowH + 4).fill(LIGHT_BG);
            doc.fillColor(GRAY).fontSize(10).font('Helvetica-Bold')
                .text('Balance Due', summaryX + 10, bal2Y + 7, { width: 100 });
            doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold')
                .text(formatCurrency(0), summaryX + 80, bal2Y + 7, { width: 100, align: 'right' });
        } else {
            // FEE_TAX_INVOICE — amount already paid from wallet
            doc.rect(summaryX, balY, summaryW, rowH + 2).fill('#F0FDF4');
            doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold')
                .text('Amount Paid', summaryX + 10, balY + 6, { width: 100 });
            doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold')
                .text(formatCurrency(total), summaryX + 80, balY + 6, { width: 100, align: 'right' });

            const bal2Y = balY + rowH + 2;
            doc.rect(summaryX, bal2Y, summaryW, rowH + 4).fill(LIGHT_BG);
            doc.fillColor(GRAY).fontSize(10).font('Helvetica-Bold')
                .text('Balance Due', summaryX + 10, bal2Y + 7, { width: 100 });
            doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold')
                .text(formatCurrency(0), summaryX + 80, bal2Y + 7, { width: 100, align: 'right' });
        }

        // ──────────────── TERMS & CONDITIONS ────────────────
        const lastSummaryY = balY + (rowH * 2) + 12;
        const termsY = Math.max(y + 90, lastSummaryY);
        
        if (termsY + 40 > doc.page.height - M) {
            doc.addPage();
            y = M;
        } else {
            y = termsY;
        }

        doc.moveTo(M, y).lineTo(M + CONTENT_W, y).strokeColor('#D1D5DB').lineWidth(0.5).stroke();

        doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold')
            .text('Terms & Conditions', M, y + 8);
        doc.fillColor(GRAY).fontSize(7).font('Helvetica')
            .text(
                'Full payment is due upon receipt of this invoice. Late payments may incur additional charges as outlined as per the applicable laws.',
                M, y + 22, { width: CONTENT_W }
            );

        // ──────────────── FOOTER ────────────────
        doc.fillColor('#9CA3AF').fontSize(7).font('Helvetica')
            .text('Generated by Assured Rewards Billing Engine', M, doc.page.height - 40, { align: 'center', width: CONTENT_W });

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
