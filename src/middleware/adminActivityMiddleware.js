const { safeLogActivity } = require('../utils/activityLogger');

const logAdminRequest = async (req, _res, next) => {
  if (!req.user || req.user.role !== 'admin') return next();
  try {
    await safeLogActivity({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'api_request',
      entityType: 'endpoint',
      entityId: req.originalUrl,
      metadata: {
        method: req.method,
        path: req.originalUrl
      },
      req
    });
  } catch (error) {
    console.error('Admin request log failed:', error.message);
  }
  next();
};

module.exports = { logAdminRequest };
