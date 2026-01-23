const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Generate a PDF with QR codes for an order
 * @param {Object} options
 * @param {Array} options.qrCodes - Array of QR code objects with uniqueHash, cashbackAmount
 * @param {string} options.campaignTitle - Campaign name
 * @param {string} options.orderId - Order ID
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateQrPdf({ qrCodes, campaignTitle, orderId }) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 30,
                bufferPages: true
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(18).font('Helvetica-Bold').text('QR Code Sheet', { align: 'center' });
            doc.fontSize(12).font('Helvetica').text(`Campaign: ${campaignTitle}`, { align: 'center' });
            doc.text(`Order ID: ${orderId.slice(-8)}`, { align: 'center' });
            doc.text(`Total QR Codes: ${qrCodes.length}`, { align: 'center' });
            doc.moveDown(1);

            // Grid settings
            const qrSize = 80;
            const labelHeight = 35;
            const cellWidth = 100;
            const cellHeight = qrSize + labelHeight + 10;
            const cols = 5;
            const startX = 30;
            const startY = 130;
            const pageHeight = 780;

            let currentX = startX;
            let currentY = startY;
            let col = 0;

            for (let i = 0; i < qrCodes.length; i++) {
                const qr = qrCodes[i];

                // Check if we need a new page
                if (currentY + cellHeight > pageHeight) {
                    doc.addPage();
                    currentY = 50;
                    currentX = startX;
                    col = 0;
                }

                // Generate QR code as data URL
                const qrDataUrl = await QRCode.toDataURL(qr.uniqueHash, {
                    width: qrSize,
                    margin: 1,
                    errorCorrectionLevel: 'M'
                });

                // Draw QR code
                doc.image(qrDataUrl, currentX + (cellWidth - qrSize) / 2, currentY, {
                    width: qrSize,
                    height: qrSize
                });

                // Draw label below QR
                const labelY = currentY + qrSize + 2;
                doc.fontSize(7).font('Helvetica');
                doc.text(`#${qr.uniqueHash.slice(-6)}`, currentX, labelY, {
                    width: cellWidth,
                    align: 'center'
                });
                doc.fontSize(9).font('Helvetica-Bold');
                doc.text(`₹${Number(qr.cashbackAmount).toFixed(0)}`, currentX, labelY + 10, {
                    width: cellWidth,
                    align: 'center'
                });

                // Move to next cell
                col++;
                if (col >= cols) {
                    col = 0;
                    currentX = startX;
                    currentY += cellHeight;
                } else {
                    currentX += cellWidth + 5;
                }
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generateQrPdf };
