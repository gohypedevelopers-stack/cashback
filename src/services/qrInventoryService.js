const crypto = require('crypto');

const generateQrHash = () => crypto.randomBytes(32).toString('hex');
const DEFAULT_AUTO_SERIES = 'AUTO';

const normalizeSeriesCode = (value, fallback = DEFAULT_AUTO_SERIES) => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    return trimmed.slice(0, 64);
};

const buildInventoryRows = (
    vendorId,
    count,
    {
        seriesCode = DEFAULT_AUTO_SERIES,
        startOrder = 1,
        sourceBatch = 'AUTO_SEED',
        importedAt = new Date(),
        prebuiltHashes = null
    } = {}
) => {
    const rows = [];
    for (let i = 0; i < count; i += 1) {
        const uniqueHash = Array.isArray(prebuiltHashes) ? prebuiltHashes[i] : generateQrHash();
        rows.push({
            vendorId,
            uniqueHash,
            seriesCode: seriesCode || null,
            seriesOrder: Number.isFinite(startOrder + i) ? startOrder + i : null,
            sourceBatch: sourceBatch || null,
            importedAt,
            status: 'inventory',
            cashbackAmount: 0,
            campaignId: null,
            campaignBudgetId: null,
            orderId: null
        });
    }
    return rows;
};

const createInChunks = async (tx, rows, chunkSize = 250) => {
    if (!rows.length) return 0;
    let created = 0;
    for (let index = 0; index < rows.length; index += chunkSize) {
        const chunk = rows.slice(index, index + chunkSize);
        const result = await tx.qRCode.createMany({
            data: chunk,
            skipDuplicates: true
        });
        created += Number(result?.count || 0);
    }
    return created;
};

const normalizeSeriesCodes = (seriesCodes = []) => {
    if (!Array.isArray(seriesCodes)) return [];
    const values = seriesCodes
        .map((value) => normalizeSeriesCode(value, null))
        .filter(Boolean);
    return Array.from(new Set(values));
};

const relabelLegacyAutoInventory = async (
    tx,
    vendorId,
    normalizedSeriesCodes,
    safePerSeriesCount
) => {
    if (!normalizedSeriesCodes.length || !safePerSeriesCount) return 0;

    const alreadyStructuredCount = await tx.qRCode.count({
        where: {
            vendorId,
            status: 'inventory',
            seriesCode: { in: normalizedSeriesCodes }
        }
    });
    if (alreadyStructuredCount > 0) return 0;

    const expectedTotal = normalizedSeriesCodes.length * safePerSeriesCount;
    const legacyRows = await tx.qRCode.findMany({
        where: {
            vendorId,
            status: 'inventory',
            OR: [{ seriesCode: DEFAULT_AUTO_SERIES }, { seriesCode: null }]
        },
        orderBy: [{ createdAt: 'asc' }],
        take: expectedTotal,
        select: { id: true }
    });

    if (legacyRows.length < expectedTotal) return 0;

    const importedAt = new Date();
    let cursor = 0;
    for (const seriesCode of normalizedSeriesCodes) {
        for (let order = 1; order <= safePerSeriesCount; order += 1) {
            const row = legacyRows[cursor];
            if (!row) break;
            await tx.qRCode.update({
                where: { id: row.id },
                data: {
                    seriesCode,
                    seriesOrder: order,
                    sourceBatch: 'AUTO_SERIES_REMAP',
                    importedAt
                }
            });
            cursor += 1;
        }
    }

    return cursor;
};

const seedVendorInventory = async (
    tx,
    vendorId,
    targetCount = 1000,
    { seriesCodes = null, perSeriesCount = null, sourceBatch = 'AUTO_SEED' } = {}
) => {
    const currentInventoryCount = await tx.qRCode.count({
        where: {
            vendorId,
            status: 'inventory'
        }
    });

    // IMPORTANT:
    // Seed only once for a vendor (initial inventory). Do not top up automatically
    // after redemptions/funding, otherwise inventory becomes infinite.
    const existingQrCount = await tx.qRCode.count({
        where: { vendorId }
    });

    const normalizedSeriesCodes = normalizeSeriesCodes(seriesCodes || []);
    const safePerSeriesCount = Number.parseInt(perSeriesCount, 10);

    if (existingQrCount > 0) {
        const remapped = await relabelLegacyAutoInventory(
            tx,
            vendorId,
            normalizedSeriesCodes,
            Number.isFinite(safePerSeriesCount) && safePerSeriesCount > 0
                ? safePerSeriesCount
                : 0
        );
        const total = await tx.qRCode.count({
            where: {
                vendorId,
                status: 'inventory'
            }
        });
        return { created: 0, total, seeded: false, remapped };
    }

    if (normalizedSeriesCodes.length > 0 && Number.isFinite(safePerSeriesCount) && safePerSeriesCount > 0) {
        let created = 0;
        for (const seriesCode of normalizedSeriesCodes) {
            const rows = buildInventoryRows(vendorId, safePerSeriesCount, {
                seriesCode,
                startOrder: 1,
                sourceBatch
            });
            created += await createInChunks(tx, rows);
        }

        const total = await tx.qRCode.count({
            where: {
                vendorId,
                status: 'inventory'
            }
        });

        return {
            created,
            total,
            seeded: true,
            series: normalizedSeriesCodes.map((seriesCode) => ({
                seriesCode,
                created: safePerSeriesCount
            }))
        };
    }

    const safeTargetCount = Number.isFinite(Number(targetCount))
        ? Math.max(0, Number.parseInt(targetCount, 10))
        : 0;
    if (!safeTargetCount) {
        return { created: 0, total: currentInventoryCount, seeded: false };
    }

    const seriesOrderCursor = await tx.qRCode.aggregate({
        where: {
            vendorId,
            seriesCode: DEFAULT_AUTO_SERIES
        },
        _max: { seriesOrder: true }
    });
    const startOrder = Number(seriesOrderCursor?._max?.seriesOrder || 0) + 1;
    const rows = buildInventoryRows(vendorId, safeTargetCount, {
        seriesCode: DEFAULT_AUTO_SERIES,
        startOrder,
        sourceBatch
    });
    const created = await createInChunks(tx, rows);

    const total = await tx.qRCode.count({
        where: {
            vendorId,
            status: 'inventory'
        }
    });
    return { created, total, seeded: true };
};

const importInventorySeries = async (
    tx,
    { vendorId, seriesCode, hashes, sourceBatch = null }
) => {
    const normalizedSeries = normalizeSeriesCode(seriesCode, null);
    if (!normalizedSeries) {
        const error = new Error('seriesCode is required');
        error.status = 400;
        throw error;
    }

    const sanitizedHashes = Array.from(
        new Set(
            (Array.isArray(hashes) ? hashes : [])
                .map((item) => (item === undefined || item === null ? '' : String(item).trim()))
                .filter(Boolean)
        )
    );

    if (!sanitizedHashes.length) {
        const error = new Error('At least one QR hash is required');
        error.status = 400;
        throw error;
    }

    const seriesOrderCursor = await tx.qRCode.aggregate({
        where: {
            vendorId,
            seriesCode: normalizedSeries
        },
        _max: { seriesOrder: true }
    });
    const startOrder = Number(seriesOrderCursor?._max?.seriesOrder || 0) + 1;

    const rows = buildInventoryRows(vendorId, sanitizedHashes.length, {
        seriesCode: normalizedSeries,
        startOrder,
        sourceBatch: sourceBatch || `IMPORT_${normalizedSeries}`,
        importedAt: new Date(),
        prebuiltHashes: sanitizedHashes
    });

    const created = await createInChunks(tx, rows);
    const duplicates = sanitizedHashes.length - created;

    return {
        seriesCode: normalizedSeries,
        requested: sanitizedHashes.length,
        created,
        duplicates
    };
};

const allocateInventoryQrs = async (
    tx,
    { vendorId, campaignId, campaignBudgetId, quantity, cashbackAmount, orderId = null, seriesCode = null }
) => {
    const safeQuantity = Number.parseInt(quantity, 10);
    if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) {
        const error = new Error('Quantity must be a positive integer');
        error.status = 400;
        throw error;
    }

    const normalizedSeries = normalizeSeriesCode(seriesCode, null);
    const where = {
        vendorId,
        status: 'inventory'
    };
    if (normalizedSeries) {
        where.seriesCode = normalizedSeries;
    }

    const inventoryQrs = await tx.qRCode.findMany({
        where,
        orderBy: normalizedSeries
            ? [{ seriesOrder: 'asc' }, { createdAt: 'asc' }]
            : [{ createdAt: 'asc' }],
        take: safeQuantity,
        select: { id: true, uniqueHash: true }
    });

    if (inventoryQrs.length < safeQuantity) {
        const seriesMessage = normalizedSeries ? ` for series "${normalizedSeries}"` : '';
        const error = new Error(`Insufficient QR inventory${seriesMessage}. Please contact admin to provision more codes.`);
        error.status = 400;
        throw error;
    }

    const qrIds = inventoryQrs.map((qr) => qr.id);

    await tx.qRCode.updateMany({
        where: { id: { in: qrIds } },
        data: {
            status: 'funded',
            campaignId,
            campaignBudgetId,
            cashbackAmount,
            orderId
        }
    });

    return tx.qRCode.findMany({
        where: { id: { in: qrIds } },
        orderBy: normalizedSeries
            ? [{ seriesOrder: 'asc' }, { createdAt: 'asc' }]
            : [{ createdAt: 'asc' }]
    });
};

module.exports = {
    allocateInventoryQrs,
    generateQrHash,
    importInventorySeries,
    normalizeSeriesCode,
    seedVendorInventory
};
