const crypto = require('crypto');

const generateQrHash = () => crypto.randomBytes(32).toString('hex');
const DEFAULT_AUTO_SERIES = 'AUTO';
const DEFAULT_DB_CHUNK_SIZE = Number.parseInt(
    process.env.QR_ALLOCATION_DB_CHUNK_SIZE || '10000',
    10
) || 10000;
const DEFAULT_RESPONSE_SAMPLE_LIMIT = Number.parseInt(
    process.env.QR_ALLOCATION_SAMPLE_LIMIT || '100',
    10
) || 100;

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
        prebuiltHashes = null,
        status = 'inventory',
        cashbackAmount = 0,
        campaignId = null,
        campaignBudgetId = null,
        orderId = null
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
            status,
            cashbackAmount,
            campaignId,
            campaignBudgetId,
            orderId
        });
    }
    return rows;
};

const createInChunks = async (tx, rows, chunkSize = DEFAULT_DB_CHUNK_SIZE) => {
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

const createGeneratedInventoryInChunks = async (
    tx,
    {
        vendorId,
        count,
        seriesCode = DEFAULT_AUTO_SERIES,
        startOrder = 1,
        sourceBatch = 'AUTO_SEED',
        importedAt = new Date(),
        chunkSize = DEFAULT_DB_CHUNK_SIZE
    }
) => {
    const safeCount = Math.max(0, Number.parseInt(count, 10) || 0);
    if (!safeCount) return 0;

    let created = 0;
    for (let offset = 0; offset < safeCount; offset += chunkSize) {
        const size = Math.min(chunkSize, safeCount - offset);
        const rows = buildInventoryRows(vendorId, size, {
            seriesCode,
            startOrder: startOrder + offset,
            sourceBatch,
            importedAt
        });
        created += await createInChunks(tx, rows, chunkSize);
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
            created += await createGeneratedInventoryInChunks(tx, {
                vendorId,
                count: safePerSeriesCount,
                seriesCode,
                startOrder: 1,
                sourceBatch
            });
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
    const created = await createGeneratedInventoryInChunks(tx, {
        vendorId,
        count: safeTargetCount,
        seriesCode: DEFAULT_AUTO_SERIES,
        startOrder,
        sourceBatch
    });

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
    {
        vendorId,
        campaignId,
        campaignBudgetId,
        quantity,
        cashbackAmount,
        orderId = null,
        seriesCode = null,
        onProgress = null
    }
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

    const orderBy = normalizedSeries
        ? [{ seriesOrder: 'asc' }, { createdAt: 'asc' }]
        : [{ createdAt: 'asc' }];
    const dbChunkSize = Math.max(100, DEFAULT_DB_CHUNK_SIZE);
    const sampleLimit = Math.max(0, DEFAULT_RESPONSE_SAMPLE_LIMIT);
    let remaining = safeQuantity;
    let fundedCount = 0;
    const sampleQrs = [];

    while (remaining > 0) {
        const chunkTake = Math.min(remaining, dbChunkSize);
        const chunk = await tx.qRCode.findMany({
            where,
            orderBy,
            take: chunkTake,
            select: {
                id: true,
                uniqueHash: true,
                seriesCode: true,
                seriesOrder: true
            }
        });
        if (!chunk.length) break;

        const qrIds = chunk.map((qr) => qr.id);
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

        fundedCount += chunk.length;
        remaining -= chunk.length;

        if (typeof onProgress === 'function') {
            await onProgress({
                chunkCount: chunk.length,
                fundedCount,
                totalRequested: safeQuantity
            });
        }

        if (sampleQrs.length < sampleLimit) {
            const freeSlots = sampleLimit - sampleQrs.length;
            const sampleChunk = chunk.slice(0, freeSlots).map((qr) => ({
                id: qr.id,
                uniqueHash: qr.uniqueHash,
                seriesCode: qr.seriesCode || null,
                seriesOrder: Number.isFinite(qr.seriesOrder) ? qr.seriesOrder : null,
                cashbackAmount
            }));
            sampleQrs.push(...sampleChunk);
        }
    }

    if (remaining > 0) {
        const fundingSeriesCode = normalizedSeries || DEFAULT_AUTO_SERIES;
        const seriesOrderCursor = await tx.qRCode.aggregate({
            where: {
                vendorId,
                seriesCode: fundingSeriesCode
            },
            _max: { seriesOrder: true }
        });
        let nextSeriesOrder = Number(seriesOrderCursor?._max?.seriesOrder || 0) + 1;
        const importedAt = new Date();

        while (remaining > 0) {
            const createCount = Math.min(remaining, dbChunkSize);
            const rows = buildInventoryRows(vendorId, createCount, {
                seriesCode: fundingSeriesCode,
                startOrder: nextSeriesOrder,
                sourceBatch: 'AUTO_ON_DEMAND_FUNDED',
                importedAt,
                status: 'funded',
                cashbackAmount,
                campaignId,
                campaignBudgetId,
                orderId
            });
            const created = await createInChunks(tx, rows, dbChunkSize);
            if (!created) break;

            fundedCount += created;
            remaining -= created;
            nextSeriesOrder += createCount;

            if (typeof onProgress === 'function') {
                await onProgress({
                    chunkCount: created,
                    fundedCount,
                    totalRequested: safeQuantity
                });
            }

            if (sampleQrs.length < sampleLimit) {
                const freeSlots = sampleLimit - sampleQrs.length;
                const sampleChunk = rows.slice(0, Math.min(freeSlots, created)).map((qr) => ({
                    id: null,
                    uniqueHash: qr.uniqueHash,
                    seriesCode: qr.seriesCode || null,
                    seriesOrder: Number.isFinite(qr.seriesOrder) ? qr.seriesOrder : null,
                    cashbackAmount
                }));
                sampleQrs.push(...sampleChunk);
            }
        }
    }

    if (fundedCount < safeQuantity) {
        const seriesMessage = normalizedSeries ? ` for series "${normalizedSeries}"` : '';
        const error = new Error(`Insufficient QR inventory${seriesMessage}. Please contact admin to provision more codes.`);
        error.status = 400;
        throw error;
    }

    return {
        fundedCount,
        sampleQrs,
        sampled: fundedCount > sampleQrs.length
    };
};

module.exports = {
    allocateInventoryQrs,
    generateQrHash,
    importInventorySeries,
    normalizeSeriesCode,
    seedVendorInventory
};
