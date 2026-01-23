const SUBSCRIPTION_LENGTHS = {
    MONTHS_6: 6,
    MONTHS_12: 12,
    MONTHS_24: 24
};

const ALIAS_MAP = {
    '6M': 'MONTHS_6',
    '6MONTHS': 'MONTHS_6',
    '6 MONTHS': 'MONTHS_6',
    '6-MONTHS': 'MONTHS_6',
    '6MONTH': 'MONTHS_6',
    '6-MONTH': 'MONTHS_6',
    '12M': 'MONTHS_12',
    '12MONTHS': 'MONTHS_12',
    '12 MONTHS': 'MONTHS_12',
    '12-MONTHS': 'MONTHS_12',
    '24M': 'MONTHS_24',
    '24MONTHS': 'MONTHS_24',
    '24 MONTHS': 'MONTHS_24',
    '24-MONTHS': 'MONTHS_24'
};

const normalizeSubscriptionType = (value) => {
    if (!value) {
        return 'MONTHS_12';
    }
    const normalized = value.toString().trim().toUpperCase();
    if (SUBSCRIPTION_LENGTHS[normalized]) return normalized;
    if (ALIAS_MAP[normalized]) return ALIAS_MAP[normalized];
    return 'MONTHS_12';
};

const calculateSubscriptionWindow = (type, startAt = new Date()) => {
    const subscriptionType = normalizeSubscriptionType(type);
    const months = SUBSCRIPTION_LENGTHS[subscriptionType];
    const startDate = new Date(startAt);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    return {
        subscriptionType,
        startDate,
        endDate
    };
};

const isSubscriptionActive = (subscription) => {
    if (!subscription) return false;
    const now = new Date();
    if (subscription.status === 'EXPIRED') return false;
    if (subscription.status === 'PAUSED') return false;
    if (subscription.endDate && new Date(subscription.endDate) <= now) {
        return false;
    }
    return subscription.status === 'ACTIVE';
};

module.exports = {
    normalizeSubscriptionType,
    calculateSubscriptionWindow,
    isSubscriptionActive,
    SUBSCRIPTION_LENGTHS
};
