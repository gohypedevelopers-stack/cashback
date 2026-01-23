const parsePagination = (req, { defaultLimit = 50, maxLimit = 200 } = {}) => {
    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : defaultLimit;
    const safeLimit = Math.min(limit, maxLimit);
    const skip = (page - 1) * safeLimit;

    return { page, limit: safeLimit, skip };
};

module.exports = { parsePagination };
