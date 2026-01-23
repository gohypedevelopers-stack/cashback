const prisma = require('../config/prismaClient');

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

const normalizeRole = (value) => {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  if (['admin', 'vendor', 'customer'].includes(normalized)) {
    return normalized;
  }
  return null;
};

const extractMetadataId = (metadata, key) => {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value : null;
};

const resolveLogIds = ({ vendorId, brandId, campaignId, entityType, entityId, metadata }) => {
  const resolvedVendor = vendorId || extractMetadataId(metadata, 'vendorId');
  const resolvedBrand =
    brandId ||
    extractMetadataId(metadata, 'brandId') ||
    (entityType === 'brand' ? entityId : null);
  const resolvedCampaign =
    campaignId ||
    extractMetadataId(metadata, 'campaignId') ||
    (entityType === 'campaign' ? entityId : null);

  return {
    vendorId: resolvedVendor || null,
    brandId: resolvedBrand || null,
    campaignId: resolvedCampaign || null
  };
};

const safeLogActivity = async ({
  actorUserId,
  actorRole,
  vendorId,
  brandId,
  campaignId,
  action,
  entityType,
  entityId,
  description,
  metadata,
  req,
  tx
}) => {
  return;
};

module.exports = { safeLogActivity, buildRequestMeta };
