// Monitoring endpoints for system health
import { Router, Response } from 'express';
import { DatabaseClient } from './database/client';
import { Logger } from './utils/logger';

const router = Router();

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: string };
    lastSync: { status: string; historyId?: string };
    recentActivity: { status: string };
  };
}

interface SystemMetrics {
  emails: {
    total: number;
    last24h: number;
    last7d: number;
    latestReceivedAt: string | null;
  };
  transactions: {
    total: number;
    last24h: number;
    last7d: number;
    latestDate: string | null;
  };
  syncState: {
    lastSyncedAt: string | null;
    historyId: string | null;
  };
}

/**
 * GET /monitoring/health
 * Returns overall system health status
 */
router.get('/health', async (_req, res: Response) => {
  const timer = Logger.startTimer();

  try {
    const dbClient = new DatabaseClient();
    const checks: SystemHealth['checks'] = {
      database: { status: 'unknown' },
      lastSync: { status: 'unknown' },
      recentActivity: { status: 'unknown' },
    };

    // Check database connection
    try {
      await (dbClient as any).dataConnect;
      checks.database = { status: 'healthy' };
    } catch (_error) {
      checks.database = { status: 'unhealthy' };
    }

    // Check last sync status
    try {
      const lastHistoryId = await dbClient.getLastHistoryId();
      if (lastHistoryId) {
        checks.lastSync = {
          status: 'healthy',
          historyId: lastHistoryId,
        };
      } else {
        checks.lastSync = {
          status: 'warning',
        };
      }
    } catch (_error) {
      checks.lastSync = {
        status: 'unhealthy',
      };
    }

    await dbClient.close();

    // Determine overall status
    let status: SystemHealth['status'] = 'healthy';
    if (checks.database.status === 'unhealthy' || checks.lastSync.status === 'unhealthy') {
      status = 'unhealthy';
    } else if (checks.lastSync.status === 'warning') {
      status = 'degraded';
    }

    const health: SystemHealth = {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };

    Logger.info('Health check completed', {
      event: 'health_check',
      status,
      duration_ms: timer(),
    });

    res.json(health);
  } catch (error) {
    Logger.error('Health check failed', {
      event: 'health_check_failed',
      duration_ms: timer(),
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /monitoring/metrics
 * Returns detailed system metrics
 */
router.get('/metrics', async (_req, res: Response) => {
  const timer = Logger.startTimer();

  try {
    const dbClient = new DatabaseClient();

    // Get email and transaction stats
    const emailStats = await dbClient.getEmailStats();
    const transactionStats = await dbClient.getTransactionStats();

    const metrics: SystemMetrics = {
      emails: emailStats,
      transactions: transactionStats,
      syncState: {
        lastSyncedAt: null,
        historyId: await dbClient.getLastHistoryId(),
      },
    };

    await dbClient.close();

    Logger.info('Metrics fetched', {
      event: 'metrics_fetch',
      duration_ms: timer(),
    });

    res.json(metrics);
  } catch (error) {
    Logger.error('Failed to fetch metrics', {
      event: 'metrics_fetch_failed',
      duration_ms: timer(),
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
