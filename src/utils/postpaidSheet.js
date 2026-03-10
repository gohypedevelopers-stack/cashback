const MIN_QRS_PER_SHEET = 25;
const MAX_QRS_PER_SHEET = 2500;
const QRS_PER_SHEET_STEP = 25;
const POSTPAID_SHEET_SIZE_TIERS = [
    { maxTotalQrs: 25000, qrsPerSheet: 25 },
    { maxTotalQrs: 100000, qrsPerSheet: 100 },
    { maxTotalQrs: 500000, qrsPerSheet: 500 },
    { maxTotalQrs: 1000000, qrsPerSheet: 1000 },
    { maxTotalQrs: Number.POSITIVE_INFINITY, qrsPerSheet: 2500 }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const alignSheetSize = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;

    const aligned = Math.ceil(parsed / QRS_PER_SHEET_STEP) * QRS_PER_SHEET_STEP;
    return clamp(aligned, MIN_QRS_PER_SHEET, MAX_QRS_PER_SHEET);
};

const resolvePostpaidSheetSize = (totalQrs, requestedSheetSize = null) => {
    const requested = alignSheetSize(requestedSheetSize);
    if (requested) return requested;

    const total = Math.max(0, Number.parseInt(totalQrs, 10) || 0);
    if (!total) return MIN_QRS_PER_SHEET;

    const matchedTier = POSTPAID_SHEET_SIZE_TIERS.find((tier) => total <= tier.maxTotalQrs);
    return matchedTier?.qrsPerSheet || MIN_QRS_PER_SHEET;
};

const resolvePostpaidSheetCount = (totalQrs) => {
    const total = Math.max(0, Number.parseInt(totalQrs, 10) || 0);
    if (!total) return 0;
    return Math.ceil(total / resolvePostpaidSheetSize(total));
};

module.exports = {
    MIN_QRS_PER_SHEET,
    MAX_QRS_PER_SHEET,
    POSTPAID_SHEET_SIZE_TIERS,
    resolvePostpaidSheetSize,
    resolvePostpaidSheetCount
};
