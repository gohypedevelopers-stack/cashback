const prisma = require('../config/prismaClient');
const os = require('os');

/**
 * Health Check Controller
 * Provides status information about the API and its dependencies
 */
const getHealthStatus = async (req, res) => {
    const healthcheck = {
        status: 'UP',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        system: {
            platform: process.platform,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
        },
        services: {
            database: 'UNKNOWN'
        }
    };

    try {
        // Test database connection with a timeout
        const dbCheck = Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 3000))
        ]);
        
        await dbCheck;
        healthcheck.services.database = 'UP';
    } catch (error) {
        healthcheck.status = 'DEGRADED';
        healthcheck.services.database = 'DOWN';
        healthcheck.message = error.message;
    }

    try {
        res.status(healthcheck.status === 'UP' ? 200 : 503).json(healthcheck);
    } catch (error) {
        res.status(500).json({ status: 'DOWN', message: error.message });
    }
};

module.exports = {
    getHealthStatus
};
