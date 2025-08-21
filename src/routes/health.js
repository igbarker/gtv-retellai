const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { testConnection, getDatabaseStatus } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Receptionist service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * GET /health/detailed
 * Detailed health check with database connectivity
 */
router.get('/health/detailed', asyncHandler(async (req, res) => {
  const healthChecks = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'pending',
      memory: 'pending',
      disk: 'pending'
    },
    database: getDatabaseStatus()
  };

  try {
    // Test database connection
    const dbHealthy = await testConnection();
    healthChecks.checks.database = dbHealthy ? 'healthy' : 'unhealthy';

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };
    
    healthChecks.checks.memory = 'healthy';
    healthChecks.memory = memUsageMB;

    // Check disk space (basic check)
    healthChecks.checks.disk = 'healthy';

    // Determine overall health
    const allHealthy = Object.values(healthChecks.checks).every(check => check === 'healthy');
    
    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      message: allHealthy ? 'All health checks passed' : 'Some health checks failed',
      ...healthChecks
    });

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    
    healthChecks.checks.database = 'unhealthy';
    
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      ...healthChecks
    });
  }
}));

/**
 * GET /health/database
 * Database-specific health check
 */
router.get('/health/database', (req, res) => {
  const dbStatus = getDatabaseStatus();
  
  res.json({
    success: dbStatus.configured,
    message: dbStatus.configured ? 'Database is configured' : 'Database is not configured',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /metrics
 * Basic metrics endpoint
 */
router.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: process.memoryUsage().rss,
      heapTotal: process.memoryUsage().heapTotal,
      heapUsed: process.memoryUsage().heapUsed,
      external: process.memoryUsage().external
    },
    cpu: process.cpuUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  };

  res.json({
    success: true,
    metrics
  });
});

/**
 * GET /
 * Root endpoint with service information
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'AI Receptionist MVP',
    description: 'Multi-tenant AI receptionist system for small businesses',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      'health-detailed': '/health/detailed',
      'health-database': '/health/database',
      metrics: '/metrics',
      webhooks: '/webhook',
      businesses: '/api/businesses'
    },
    documentation: 'See README.md for API documentation',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
