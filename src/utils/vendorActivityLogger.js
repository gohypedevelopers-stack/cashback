const prisma = require('../config/prismaClient');
const { safeLogActivity } = require('./activityLogger');

const buildRequestMeta = (req) => {
  if (!req) return { ipAddress: null, userAgent: null };
  const forwardedFor = req.headers?.['x-forwarded-for'];
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : req.ip || null;
  const userAgent = req.headers?.['user-agent'] || null;
  return { ipAddress, userAgent };
};

const safeLogVendorActivity = async ({
  vendorId,
  action,
  entityType,
  entityId,
  metadata,
  req,
  tx
}) => {
  return;
};

module.exports = { safeLogVendorActivity };
