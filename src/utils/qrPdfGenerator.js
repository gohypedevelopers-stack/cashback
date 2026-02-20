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

const toRoman = (num) => {
    const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    let n = Math.max(1, Math.floor(num));
    for (let i = 0; i < vals.length; i++) {
        while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
    }
    return result;
};
const QRS_PER_SHEET = 25;
const ALLOWED_QR_ECC_LEVELS = new Set(['L', 'M', 'Q', 'H']);
const QR_ERROR_CORRECTION_LEVEL = (() => {
    const configured = String(process.env.QR_PDF_ECC_LEVEL || 'L').trim().toUpperCase();
    return ALLOWED_QR_ECC_LEVELS.has(configured) ? configured : 'L';
})();
const QR_MARGIN = (() => {
    const parsed = Number.parseInt(process.env.QR_PDF_MARGIN || '0', 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
})();
const LOGO_FETCH_TIMEOUT_MS = (() => {
    const parsed = Number.parseInt(process.env.QR_PDF_LOGO_TIMEOUT_MS || '1200', 10);
    if (!Number.isFinite(parsed) || parsed < 100) return 1200;
    return parsed;
})();
const LOGO_CACHE_SUCCESS_TTL_MS = (() => {
    const parsed = Number.parseInt(process.env.QR_PDF_LOGO_CACHE_TTL_MS || '1800000', 10);
    if (!Number.isFinite(parsed) || parsed < 1000) return 1800000;
    return parsed;
})();
const LOGO_CACHE_FAILURE_TTL_MS = (() => {
    const parsed = Number.parseInt(process.env.QR_PDF_LOGO_FAIL_CACHE_TTL_MS || '300000', 10);
    if (!Number.isFinite(parsed) || parsed < 1000) return 300000;
    return parsed;
})();
const LOGO_CACHE_MAX_ITEMS = (() => {
    const parsed = Number.parseInt(process.env.QR_PDF_LOGO_CACHE_MAX_ITEMS || '100', 10);
    if (!Number.isFinite(parsed) || parsed < 10) return 100;
    return parsed;
})();
const logoCache = new Map();

const getApiBaseUrl = () => {
    const port = process.env.PORT || 5000;
    const base =
        process.env.BACKEND_URL ||
        process.env.API_BASE_URL ||
        process.env.PUBLIC_API_URL ||
        `http://localhost:${port}`;
    return String(base).replace(/\/$/, '');
};

const getCachedLogoValue = (key) => {
    const cached = logoCache.get(key);
    if (!cached) return { hit: false, value: null };

    if (cached.expiresAt <= Date.now()) {
        logoCache.delete(key);
        return { hit: false, value: null };
    }

    return { hit: true, value: cached.value };
};

const setCachedLogoValue = (key, value, isFailure = false) => {
    if (!key) return;

    logoCache.set(key, {
        value,
        expiresAt: Date.now() + (isFailure ? LOGO_CACHE_FAILURE_TTL_MS : LOGO_CACHE_SUCCESS_TTL_MS)
    });

    while (logoCache.size > LOGO_CACHE_MAX_ITEMS) {
        const oldestKey = logoCache.keys().next().value;
        if (!oldestKey) break;
        logoCache.delete(oldestKey);
    }
};

const normalizeUploadRelativePath = (value) => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized.toLowerCase().startsWith('uploads/')) return null;

    const filePart = normalized.slice('uploads/'.length);
    if (!filePart || filePart.includes('..')) return null;

    return filePart;
};

const getLocalUploadLogoBuffer = (logoValue) => {
    const uploadFile = normalizeUploadRelativePath(logoValue);
    if (!uploadFile) return null;

    const uploadsRoot = path.resolve(__dirname, '../../uploads');
    const absolutePath = path.resolve(uploadsRoot, uploadFile);

    if (!absolutePath.toLowerCase().startsWith(uploadsRoot.toLowerCase())) {
        return null;
    }

    if (!fs.existsSync(absolutePath)) {
        return null;
    }

    return fs.readFileSync(absolutePath);
};

const fetchRemoteLogo = async (logoUrl) => {
    const response = await axios.get(logoUrl, {
        responseType: 'arraybuffer',
        timeout: LOGO_FETCH_TIMEOUT_MS,
        validateStatus: (status) => status >= 200 && status < 300
    });
    return Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);
};

const getBrandLogoBuffer = async (brandLogoUrl) => {
    if (typeof brandLogoUrl !== 'string') return null;
    const raw = brandLogoUrl.trim();
    if (!raw) return null;
    const cachedRaw = getCachedLogoValue(raw);
    if (cachedRaw.hit) return cachedRaw.value;

    if (raw.startsWith('data:image/')) {
        const base64 = raw.split(',')[1];
        if (!base64) {
            setCachedLogoValue(raw, null, true);
            return null;
        }
        const decoded = Buffer.from(base64, 'base64');
        setCachedLogoValue(raw, decoded);
        return decoded;
    }

    const uploadRelativePath = normalizeUploadRelativePath(raw);
    if (uploadRelativePath) {
        const localLogo = getLocalUploadLogoBuffer(raw);
        if (localLogo) {
            setCachedLogoValue(raw, localLogo);
            return localLogo;
        }
        // If upload path is missing locally, do not attempt slow network fallback.
        setCachedLogoValue(raw, null, true);
        return null;
    }

    let resolved = raw;
    try {
        if (!/^https?:\/\//i.test(resolved)) {
            resolved = new URL(raw, `${getApiBaseUrl()}/`).toString();
        }

        if (/^https?:\/\//i.test(resolved)) {
            const cachedResolved = getCachedLogoValue(resolved);
            if (cachedResolved.hit) {
                setCachedLogoValue(raw, cachedResolved.value, cachedResolved.value === null);
                return cachedResolved.value;
            }

            const remoteLogo = await fetchRemoteLogo(resolved);
            setCachedLogoValue(resolved, remoteLogo);
            setCachedLogoValue(raw, remoteLogo);
            return remoteLogo;
        }
    } catch (err) {
        console.error('Failed to fetch brand logo for PDF:', err.message);
        setCachedLogoValue(raw, null, true);
        if (resolved && resolved !== raw) {
            setCachedLogoValue(resolved, null, true);
        }
        return null;
    }

    setCachedLogoValue(raw, null, true);
    return null;
};

const buildQrTarget = (uniqueHash) => `${getQrBaseUrl()}/redeem/${uniqueHash}`;

const renderQrBuffer = async (uniqueHash, width) => {
    return QRCode.toBuffer(buildQrTarget(uniqueHash), {
        type: 'png',
        width,
        margin: QR_MARGIN,
        errorCorrectionLevel: QR_ERROR_CORRECTION_LEVEL
    });
};

const renderQrBatch = async (qrItems, width) => {
    return Promise.all(
        qrItems.map((item) => renderQrBuffer(item.uniqueHash, width))
    );
};

/**
 * Generate a PDF with QR codes for an order
 * @param {Object} options
 * @param {Array} options.qrCodes - Array of QR code objects with uniqueHash, cashbackAmount
 * @param {string} options.campaignTitle - Campaign name
 * @param {string} options.orderId - Order ID
 * @param {string} [options.brandName] - Brand Name
 * @param {string} [options.brandLogoUrl] - Brand Logo URL
 * @param {string} [options.planType] - 'prepaid' or 'postpaid'
 * @param {string} [options.productName] - Product Name
 * @param {boolean} [options.compactMode] - Faster layout without per-QR labels
 * @param {number} [options.startSheetIndex] - Zero-based sheet offset for partial postpaid exports
 * @param {number} [options.totalSheetCount] - Total postpaid sheet count across full campaign
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateQrPdf({
    qrCodes,
    campaignTitle,
    orderId,
    brandName,
    brandLogoUrl,
    planType,
    productName,
    compactMode,
    startSheetIndex,
    totalSheetCount
}) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 30
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const brandLogoBuffer = await getBrandLogoBuffer(brandLogoUrl);

            const isPostpaid = planType === 'postpaid';

            if (isPostpaid) {
                // --- POSTPAID: 25 QRs per sheet, labeled Sheet A, Sheet B, etc. ---
                const totalSheets = Math.ceil(qrCodes.length / QRS_PER_SHEET);
                const sheetOffset = Number.isFinite(Number(startSheetIndex))
                    ? Math.max(0, Number(startSheetIndex))
                    : 0;
                const displayTotalSheets = Number.isFinite(Number(totalSheetCount)) && Number(totalSheetCount) > 0
                    ? Number(totalSheetCount)
                    : sheetOffset + totalSheets;

                for (let sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
                    if (sheetIdx > 0) doc.addPage();

                    const globalSheetIdx = sheetOffset + sheetIdx;
                    const sheetLetter = toRoman(globalSheetIdx + 1);
                    const sheetQrs = qrCodes.slice(sheetIdx * QRS_PER_SHEET, (sheetIdx + 1) * QRS_PER_SHEET);

                    // --- Header ---
                    let yPos = 20;

                    // Cashback amount for this sheet (pick first positive value, fallback 0)
                    const sheetCashback =
                        sheetQrs
                            .map((item) => Number(item?.cashbackAmount))
                            .find((value) => Number.isFinite(value) && value > 0) || 0;
                    if (sheetCashback > 0) {
                        doc.fontSize(11).font('Helvetica-Bold').fillColor('#10b981');
                        doc.text(`Rs. ${sheetCashback.toFixed(0)}`, 30, yPos, { width: 120, align: 'left' });
                        doc.fillColor('black');
                    }

                    doc.fontSize(20).font('Helvetica-Bold').fillColor('#10b981').text('Assured Rewards', 30, yPos, { width: doc.page.width - 60, align: 'center' });
                    doc.fillColor('black');
                    yPos += 28;

                    if (brandLogoBuffer) {
                        const logoWidth = 50;
                        doc.image(brandLogoBuffer, (doc.page.width - logoWidth) / 2, yPos, { width: logoWidth });
                        yPos += 55;
                    } else if (brandName) {
                        doc.fontSize(16).font('Helvetica-Bold').text(brandName, 30, yPos, { width: doc.page.width - 60, align: 'center' });
                        yPos += 22;
                    }

                    if (brandLogoBuffer && brandName) {
                        doc.fontSize(14).font('Helvetica-Bold').text(brandName, 30, yPos, { width: doc.page.width - 60, align: 'center' });
                        yPos += 18;
                    }

                    doc.fontSize(14).font('Helvetica-Bold').text(`Sheet ${sheetLetter}`, 30, yPos, { width: doc.page.width - 60, align: 'center' });
                    yPos += 18;

                    doc.fontSize(9).font('Helvetica').text(`Campaign: ${campaignTitle}`, 30, yPos, { width: doc.page.width - 60, align: 'center' });
                    yPos += 13;

                    doc.text(`Product: ${productName || 'N/A'}`, 30, yPos, { width: doc.page.width - 60, align: 'center' });
                    yPos += 13;

                    doc.text(`Sheet ${globalSheetIdx + 1} of ${displayTotalSheets}  |  ${sheetQrs.length} QR Codes`, 30, yPos, { width: doc.page.width - 60, align: 'center' });
                    yPos += 18;

                    // --- Grid: 5 cols x 5 rows = 25 QRs per sheet ---
                    const qrSize = 85;
                    const labelHeight = 30;
                    const cellWidth = (doc.page.width - 60) / 5;
                    const cellHeight = qrSize + labelHeight + 6;
                    const startX = 30;
                    const qrImageBuffers = await renderQrBatch(sheetQrs, qrSize);

                    for (let i = 0; i < sheetQrs.length; i++) {
                        const qr = sheetQrs[i];
                        const col = i % 5;
                        const row = Math.floor(i / 5);
                        const currentX = startX + col * cellWidth;
                        const currentY = yPos + row * cellHeight;

                        doc.image(qrImageBuffers[i], currentX + (cellWidth - qrSize) / 2, currentY, {
                            width: qrSize,
                            height: qrSize
                        });

                        // Sheet-based ID label: A1, A2, ... A25, B1, B2, ...
                        const SHEET_ID_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                        const idLetter = globalSheetIdx < SHEET_ID_LETTERS.length
                            ? SHEET_ID_LETTERS[globalSheetIdx]
                            : `${globalSheetIdx + 1}`;
                        const qrLabel = `${idLetter}${i + 1}`;
                        const labelY = currentY + qrSize + 2;
                        doc.fontSize(9).font('Helvetica-Bold');
                        doc.text(qrLabel, currentX, labelY, {
                            width: cellWidth,
                            align: 'center'
                        });

                        const qrCashback = Number(qr?.cashbackAmount) || 0;
                        if (qrCashback > 0) {
                            doc.fontSize(8).font('Helvetica');
                            doc.text(`Rs. ${qrCashback.toFixed(0)}`, currentX, labelY + 10, {
                                width: cellWidth,
                                align: 'center'
                            });
                        }
                    }
                }
            } else {
                // --- PREPAID: Original layout (continuous grid with auto page-break) ---
                let yPos = 30;

                doc.fontSize(24).font('Helvetica-Bold').fillColor('#10b981').text('Assured Rewards', { align: 'center' });
                doc.fillColor('black');
                yPos += 35;

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

                doc.text(`Product: ${productName || 'N/A'}`, { align: 'center' });
                yPos += 15;

                doc.text(`Order ID: ${orderId.slice(-8)}`, { align: 'center' });
                yPos += 15;

                doc.text(`Total QR Codes: ${qrCodes.length}`, { align: 'center' });
                yPos += 25;

                const startY = yPos;
                const qrSize = 80;
                const labelHeight = 35;
                const cellWidth = 100;
                const cellHeight = qrSize + labelHeight + 10;
                const cols = 5;
                const startX = 30;
                const pageHeight = 780;
                const qrImageBuffers = await renderQrBatch(qrCodes, qrSize);

                let currentX = startX;
                let currentY = startY;
                let col = 0;

                for (let i = 0; i < qrCodes.length; i++) {
                    const qr = qrCodes[i];

                    if (currentY + cellHeight > pageHeight) {
                        doc.addPage();
                        currentY = 50;
                        currentX = startX;
                        col = 0;
                    }

                    doc.image(qrImageBuffers[i], currentX + (cellWidth - qrSize) / 2, currentY, {
                        width: qrSize,
                        height: qrSize
                    });

                    const labelY = currentY + qrSize + 2;
                    doc.fontSize(7).font('Helvetica');
                    doc.text(`#${qr.uniqueHash.slice(-6)}`, currentX, labelY, {
                        width: cellWidth,
                        align: 'center'
                    });

                    doc.fontSize(9).font('Helvetica-Bold');
                    doc.text(`Rs. ${Number(qr.cashbackAmount).toFixed(0)}`, currentX, labelY + 10, {
                        width: cellWidth,
                        align: 'center'
                    });

                    col++;
                    if (col >= cols) {
                        col = 0;
                        currentX = startX;
                        currentY += cellHeight;
                    } else {
                        currentX += cellWidth + 5;
                    }
                }
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generateQrPdf };
