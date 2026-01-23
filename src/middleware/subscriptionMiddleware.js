const prisma = require('../config/prismaClient');
const { isSubscriptionActive } = require('../utils/subscriptionUtils');

const requireActiveSubscription = async (req, res, next) => {
    if (!req.user || req.user.role !== 'vendor') {
        return next();
    }

    try {
        const vendor = await prisma.vendor.findUnique({
            where: { userId: req.user.id },
            include: {
                Brand: {
                    include: {
                        Subscription: true
                    }
                }
            }
        });

        if (!vendor || !vendor.Brand || !vendor.Brand.Subscription) {
            return res.status(403).json({ message: 'Vendor subscription is not configured yet' });
        }

        let { Subscription } = vendor.Brand;

        const now = new Date();
        if (Subscription.endDate && new Date(Subscription.endDate) <= now && Subscription.status !== 'EXPIRED') {
            Subscription = await prisma.subscription.update({
                where: { id: Subscription.id },
                data: { status: 'EXPIRED' }
            });
            await prisma.vendor.update({
                where: { id: vendor.id },
                data: { status: 'expired' }
            });
        }

        if (Subscription.status === 'PAUSED' && vendor.status !== 'paused') {
            await prisma.vendor.update({
                where: { id: vendor.id },
                data: { status: 'paused' }
            });
        }

        const vendorStatus = String(vendor.status || '').toLowerCase();
        if (vendorStatus !== 'active') {
            return res.status(403).json({ message: `Vendor account is ${vendorStatus}. Please contact admin.` });
        }

        const brandStatus = String(vendor.Brand?.status || '').toLowerCase();
        if (brandStatus && brandStatus !== 'active') {
            return res.status(403).json({ message: `Brand status is ${brandStatus}. Please contact admin.` });
        }

        if (!isSubscriptionActive(Subscription)) {
            return res.status(403).json({ message: 'Subscription is not active; please contact admin' });
        }

        req.vendor = vendor;
        req.subscription = Subscription;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Subscription validation failed', error: error.message });
    }
};

module.exports = { requireActiveSubscription };
