const prisma = require('../config/prismaClient');
const { safeLogVendorActivity } = require('../utils/vendorActivityLogger');

const logVendorRequest = async (req, _res, next) => {
  if (!req.user?.id) return next();
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
      select: { id: true }
    });
    if (vendor) {
      safeLogVendorActivity({
        vendorId: vendor.id,
        action: 'api_request',
        entityType: 'endpoint',
        entityId: req.originalUrl,
        metadata: {
          method: req.method,
          path: req.originalUrl
        },
        req
      });
    }
  } catch (error) {
    console.error('Vendor request log failed:', error.message);
  }
  next();
};

module.exports = { logVendorRequest };
