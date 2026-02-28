const DEFAULT_MIN_QRS_PER_SHEET = 25;
const DEFAULT_TARGET_SHEET_COUNT = 4000;
const DEFAULT_MAX_QRS_PER_SHEET = 500;

const toPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const MIN_QRS_PER_SHEET = toPositiveInt(
    process.env.POSTPAID_MIN_QRS_PER_SHEET,
    DEFAULT_MIN_QRS_PER_SHEET
);
const TARGET_SHEET_COUNT = toPositiveInt(
    process.env.POSTPAID_TARGET_SHEET_COUNT,
    DEFAULT_TARGET_SHEET_COUNT
);
const MAX_QRS_PER_SHEET = Math.max(
    MIN_QRS_PER_SHEET,
    toPositiveInt(process.env.POSTPAID_MAX_QRS_PER_SHEET, DEFAULT_MAX_QRS_PER_SHEET)
);

const resolvePostpaidSheetSize = (totalQrs) => {
    const total = Math.max(0, Number.parseInt(totalQrs, 10) || 0);
    if (!total) return MIN_QRS_PER_SHEET;

    const rawSize = Math.ceil(total / TARGET_SHEET_COUNT);
    const bounded = clamp(rawSize, MIN_QRS_PER_SHEET, MAX_QRS_PER_SHEET);
    const alignedToStep =
        Math.ceil(bounded / MIN_QRS_PER_SHEET) * MIN_QRS_PER_SHEET;
    return clamp(alignedToStep, MIN_QRS_PER_SHEET, MAX_QRS_PER_SHEET);
};

const resolvePostpaidSheetCount = (totalQrs) => {
    const total = Math.max(0, Number.parseInt(totalQrs, 10) || 0);
    if (!total) return 0;
    return Math.ceil(total / resolvePostpaidSheetSize(total));
};

module.exports = {
    MIN_QRS_PER_SHEET,
    TARGET_SHEET_COUNT,
    MAX_QRS_PER_SHEET,
    resolvePostpaidSheetSize,
    resolvePostpaidSheetCount
};

