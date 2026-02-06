const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const getQrBaseUrl = () => {
    const base =
        process.env.QR_BASE_URL ||
        process.env.FRONTEND_URL ||
        process.env.PUBLIC_APP_URL ||
        'https://assuredrewards.in';
    return String(base).replace(/\/$/, '');
};

/**
 * Generate a PDF with QR codes for an order
 * @param {Object} options
 * @param {Array} options.qrCodes - Array of QR code objects with uniqueHash, cashbackAmount
 * @param {string} options.campaignTitle - Campaign name
 * @param {string} options.orderId - Order ID
 * @param {string} [options.brandName] - Brand Name
 * @param {string} [options.brandLogoUrl] - Brand Logo URL
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateQrPdf({ qrCodes, campaignTitle, orderId, brandName, brandLogoUrl }) {
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

            let brandLogoBuffer = null;
            if (brandLogoUrl) {
                try {
                    const response = await axios.get(brandLogoUrl, { responseType: 'arraybuffer' });
                    brandLogoBuffer = response.data;
                } catch (err) {
                    console.error('Failed to fetch brand logo for PDF:', err.message);
                }
            }

            // --- Header Section ---
            let yPos = 30;

            // 1. Platform Branding (Assured Rewards)
            // Try to load local platform logo
            // Assuming the backend is running from cashback/src/index.js, so up two dirs to root of backend, then... 
            // wait, the 'public' folder found was in e:\webapp\public. Backend is in e:\webapp\cashback backend\cashback.
            // If the backend doesn't have access to the frontend public folder easily, we might fallback to text or need a hardcoded path.
            // Let's rely on text "Assured Rewards" primarily and try to load logo if possible, but path might be tricky across environments.
            // For now, I'll use a bold text header for "Assured Rewards".

            doc.fontSize(24).font('Helvetica-Bold').fillColor('#10b981').text('Assured Rewards', { align: 'center' }); // Emerald-500 color
            doc.fillColor('black'); // Reset
            yPos += 35;

            // 2. Brand Branding
            if (brandLogoBuffer) {
                const logoWidth = 60;
                doc.image(brandLogoBuffer, (doc.page.width - logoWidth) / 2, yPos, { width: logoWidth });
                yPos += 70;
            } else if (brandName) {
                doc.fontSize(18).font('Helvetica-Bold').text(brandName, { align: 'center' });
                yPos += 25;
            }

            if (brandLogoBuffer && brandName) {
                doc.fontSize(16).font('Helvetica-Bold').text(brandName, { align: 'center' });
                yPos += 20;
            }

            doc.fontSize(14).font('Helvetica-Bold').text('QR Code Sheet', 30, yPos, { width: doc.page.width - 60, align: 'center' });
            yPos += 20;

            doc.fontSize(10).font('Helvetica').text(`Campaign: ${campaignTitle}`, { align: 'center' });
            yPos += 15;

            doc.text(`Order ID: ${orderId.slice(-8)}`, { align: 'center' });
            yPos += 15;

            doc.text(`Total QR Codes: ${qrCodes.length}`, { align: 'center' });
            yPos += 25; // Space before grid

            // Grid settings
            const startY = yPos;
            const qrSize = 80;
            const labelHeight = 35;
            const cellWidth = 100;
            const cellHeight = qrSize + labelHeight + 10;
            const cols = 5;
            const startX = 30;
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
                const qrTarget = `${getQrBaseUrl()}/redeem/${qr.uniqueHash}`;
                const qrDataUrl = await QRCode.toDataURL(qrTarget, {
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

                // Using 'Helvetica-Bold' which doesn't support '₹'. Changed to 'Rs. '
                doc.fontSize(9).font('Helvetica-Bold');
                doc.text(`Rs. ${Number(qr.cashbackAmount).toFixed(0)}`, currentX, labelY + 10, {
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
