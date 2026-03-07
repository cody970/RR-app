/**
 * CWR Metrics and Monitoring
 * 
 * Provides logging and metrics tracking for CWR operations:
 * - CWR generation metrics
 * - ACK import tracking
 * - Validation performance monitoring
 * 
 * **Note:** Now uses database persistence for production use.
 * In-memory fallback is provided for offline/development scenarios.
 */

import { db } from '@/lib/infra/db';

// Types matching the Prisma models
export interface CwrGenerationMetrics {
  workCount: number;
  fileSize: number;
  duration: number;
  version: string;
  timestamp: Date;
  orgId: string;
}

export interface AckImportMetrics {
  recordCount: number;
  acceptedCount: number;
  rejectedCount: number;
  conflictCount: number;
  duration: number;
  societyCode: string;
  timestamp: Date;
  orgId: string;
}

export interface ValidationMetrics {
  validatorType: string;
  successCount: number;
  failureCount: number;
  avgDuration: number;
  timestamp: Date;
}

// Configuration
const USE_DATABASE = process.env.USE_DATABASE_METRICS !== 'false';
const MEMORY_MAX_METRICS = 1000; // Fallback limit when database is unavailable

// In-memory fallback storage (only used when database is unavailable)
const memoryCwrMetrics: CwrGenerationMetrics[] = [];
const memoryAckMetrics: AckImportMetrics[] = [];
const memoryValidationMetrics: ValidationMetrics[] = [];

/**
 * Log CWR generation metrics to database
 */
export async function logCwrGeneration(metrics: CwrGenerationMetrics): Promise<void> {
  const timestamp = metrics.timestamp || new Date();
  
  try {
    if (USE_DATABASE) {
      await db.cwrGenerationMetrics.create({
        data: {
          orgId: metrics.orgId,
          workCount: metrics.workCount,
          fileSize: metrics.fileSize,
          duration: metrics.duration,
          version: metrics.version,
          timestamp,
        },
      });
    } else {
      // Fallback to in-memory storage
      memoryCwrMetrics.push({ ...metrics, timestamp });
      if (memoryCwrMetrics.length > MEMORY_MAX_METRICS) {
        memoryCwrMetrics.shift();
      }
    }
    console.log('[CWR Metrics]', JSON.stringify(metrics));
  } catch (error) {
    console.error('[CWR Metrics] Failed to log to database, falling back to memory:', error);
    // Fallback to in-memory storage
    memoryCwrMetrics.push({ ...metrics, timestamp });
    if (memoryCwrMetrics.length > MEMORY_MAX_METRICS) {
      memoryCwrMetrics.shift();
    }
  }
}

/**
 * Log ACK import metrics to database
 */
export async function logAckImport(metrics: AckImportMetrics): Promise<void> {
  const timestamp = metrics.timestamp || new Date();
  
  try {
    if (USE_DATABASE) {
      await db.ackImportMetrics.create({
        data: {
          orgId: metrics.orgId,
          recordCount: metrics.recordCount,
          acceptedCount: metrics.acceptedCount,
          rejectedCount: metrics.rejectedCount,
          conflictCount: metrics.conflictCount,
          duration: metrics.duration,
          societyCode: metrics.societyCode,
          timestamp,
        },
      });
    } else {
      // Fallback to in-memory storage
      memoryAckMetrics.push({ ...metrics, timestamp });
      if (memoryAckMetrics.length > MEMORY_MAX_METRICS) {
        memoryAckMetrics.shift();
      }
    }
    console.log('[ACK Metrics]', JSON.stringify(metrics));
  } catch (error) {
    console.error('[ACK Metrics] Failed to log to database, falling back to memory:', error);
    // Fallback to in-memory storage
    memoryAckMetrics.push({ ...metrics, timestamp });
    if (memoryAckMetrics.length > MEMORY_MAX_METRICS) {
      memoryAckMetrics.shift();
    }
  }
}

/**
 * Log validation metrics to database
 */
export async function logValidation(metrics: ValidationMetrics): Promise<void> {
  const timestamp = metrics.timestamp || new Date();
  
  try {
    if (USE_DATABASE) {
      await db.validationMetrics.create({
        data: {
          validatorType: metrics.validatorType,
          successCount: metrics.successCount,
          failureCount: metrics.failureCount,
          avgDuration: metrics.avgDuration,
          timestamp,
        },
      });
    } else {
      // Fallback to in-memory storage
      memoryValidationMetrics.push({ ...metrics, timestamp });
      if (memoryValidationMetrics.length > MEMORY_MAX_METRICS) {
        memoryValidationMetrics.shift();
      }
    }
    console.log('[Validation Metrics]', JSON.stringify(metrics));
  } catch (error) {
    console.error('[Validation Metrics] Failed to log to database, falling back to memory:', error);
    // Fallback to in-memory storage
    memoryValidationMetrics.push({ ...metrics, timestamp });
    if (memoryValidationMetrics.length > MEMORY_MAX_METRICS) {
      memoryValidationMetrics.shift();
    }
  }
}

/**
 * Get CWR generation statistics from database
 */
export async function getCwrGenerationStats(
  orgId?: string,
  since?: Date
): Promise<{
  total: number;
  avgWorkCount: number;
  avgFileSize: number;
  avgDuration: number;
  versionBreakdown: Record<string, number>;
}> {
  try {
    if (USE_DATABASE) {
      const where: any = {};
      if (orgId) where.orgId = orgId;
      if (since) where.timestamp = { gte: since };

      const metrics = await db.cwrGenerationMetrics.findMany({
        where,
        orderBy: { timestamp: 'desc' },
      });

      if (metrics.length === 0) {
        return {
          total: 0,
          avgWorkCount: 0,
          avgFileSize: 0,
          avgDuration: 0,
          versionBreakdown: {},
        };
      }

      const total = metrics.length;
      const avgWorkCount = metrics.reduce((sum, m) => sum + m.workCount, 0) / total;
      const avgFileSize = metrics.reduce((sum, m) => sum + m.fileSize, 0) / total;
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / total;

      const versionBreakdown: Record<string, number> = {};
      for (const m of metrics) {
        versionBreakdown[m.version] = (versionBreakdown[m.version] || 0) + 1;
      }

      return { total, avgWorkCount, avgFileSize, avgDuration, versionBreakdown };
    } else {
      // Use in-memory fallback
      let metrics = [...memoryCwrMetrics];
      if (orgId) metrics = metrics.filter(m => m.orgId === orgId);
      if (since) metrics = metrics.filter(m => m.timestamp >= since);

      if (metrics.length === 0) {
        return {
          total: 0,
          avgWorkCount: 0,
          avgFileSize: 0,
          avgDuration: 0,
          versionBreakdown: {},
        };
      }

      const total = metrics.length;
      const avgWorkCount = metrics.reduce((sum, m) => sum + m.workCount, 0) / total;
      const avgFileSize = metrics.reduce((sum, m) => sum + m.fileSize, 0) / total;
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / total;

      const versionBreakdown: Record<string, number> = {};
      for (const m of metrics) {
        versionBreakdown[m.version] = (versionBreakdown[m.version] || 0) + 1;
      }

      return { total, avgWorkCount, avgFileSize, avgDuration, versionBreakdown };
    }
  } catch (error) {
    console.error('[CWR Metrics] Failed to get stats from database:', error);
    return {
      total: 0,
      avgWorkCount: 0,
      avgFileSize: 0,
      avgDuration: 0,
      versionBreakdown: {},
    };
  }
}

/**
 * Get ACK import statistics from database
 */
export async function getAckImportStats(
  orgId?: string,
  since?: Date
): Promise<{
  total: number;
  avgRecordCount: number;
  avgAcceptedRate: number;
  avgRejectedRate: number;
  avgConflictRate: number;
  avgDuration: number;
}> {
  try {
    if (USE_DATABASE) {
      const where: any = {};
      if (orgId) where.orgId = orgId;
      if (since) where.timestamp = { gte: since };

      const metrics = await db.ackImportMetrics.findMany({
        where,
        orderBy: { timestamp: 'desc' },
      });

      if (metrics.length === 0) {
        return {
          total: 0,
          avgRecordCount: 0,
          avgAcceptedRate: 0,
          avgRejectedRate: 0,
          avgConflictRate: 0,
          avgDuration: 0,
        };
      }

      const total = metrics.length;
      const avgRecordCount = metrics.reduce((sum, m) => sum + m.recordCount, 0) / total;
      const avgAcceptedRate =
        metrics.reduce((sum, m) => sum + (m.acceptedCount / m.recordCount), 0) / total;
      const avgRejectedRate =
        metrics.reduce((sum, m) => sum + (m.rejectedCount / m.recordCount), 0) / total;
      const avgConflictRate =
        metrics.reduce((sum, m) => sum + (m.conflictCount / m.recordCount), 0) / total;
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / total;

      return {
        total,
        avgRecordCount,
        avgAcceptedRate,
        avgRejectedRate,
        avgConflictRate,
        avgDuration,
      };
    } else {
      // Use in-memory fallback
      let metrics = [...memoryAckMetrics];
      if (orgId) metrics = metrics.filter(m => m.orgId === orgId);
      if (since) metrics = metrics.filter(m => m.timestamp >= since);

      if (metrics.length === 0) {
        return {
          total: 0,
          avgRecordCount: 0,
          avgAcceptedRate: 0,
          avgRejectedRate: 0,
          avgConflictRate: 0,
          avgDuration: 0,
        };
      }

      const total = metrics.length;
      const avgRecordCount = metrics.reduce((sum, m) => sum + m.recordCount, 0) / total;
      const avgAcceptedRate =
        metrics.reduce((sum, m) => sum + (m.acceptedCount / m.recordCount), 0) / total;
      const avgRejectedRate =
        metrics.reduce((sum, m) => sum + (m.rejectedCount / m.recordCount), 0) / total;
      const avgConflictRate =
        metrics.reduce((sum, m) => sum + (m.conflictCount / m.recordCount), 0) / total;
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / total;

      return {
        total,
        avgRecordCount,
        avgAcceptedRate,
        avgRejectedRate,
        avgConflictRate,
        avgDuration,
      };
    }
  } catch (error) {
    console.error('[ACK Metrics] Failed to get stats from database:', error);
    return {
      total: 0,
      avgRecordCount: 0,
      avgAcceptedRate: 0,
      avgRejectedRate: 0,
      avgConflictRate: 0,
      avgDuration: 0,
    };
  }
}

/**
 * Get validation statistics from database
 */
export async function getValidationStats(
  validatorType?: string,
  since?: Date
): Promise<{
  total: number;
  successRate: number;
  avgDuration: number;
  typeBreakdown: Record<string, { total: number; successRate: number }>;
}> {
  try {
    if (USE_DATABASE) {
      const where: any = {};
      if (validatorType) where.validatorType = validatorType;
      if (since) where.timestamp = { gte: since };

      const metrics = await db.validationMetrics.findMany({
        where,
        orderBy: { timestamp: 'desc' },
      });

      if (metrics.length === 0) {
        return {
          total: 0,
          successRate: 0,
          avgDuration: 0,
          typeBreakdown: {},
        };
      }

      const total = metrics.length;
      const successCount = metrics.reduce((sum, m) => sum + m.successCount, 0);
      const failureCount = metrics.reduce((sum, m) => sum + m.failureCount, 0);
      const successRate = successCount / (successCount + failureCount);
      const avgDuration = metrics.reduce((sum, m) => sum + m.avgDuration, 0) / total;

      const typeBreakdown: Record<string, { total: number; successRate: number }> = {};
      const typeGroups = new Map<string, typeof metrics>();

      for (const m of metrics) {
        if (!typeGroups.has(m.validatorType)) {
          typeGroups.set(m.validatorType, []);
        }
        typeGroups.get(m.validatorType)!.push(m);
      }

      for (const [type, typeMetrics] of typeGroups.entries()) {
        const typeTotal = typeMetrics.length;
        const typeSuccessCount = typeMetrics.reduce((sum, m) => sum + m.successCount, 0);
        const typeFailureCount = typeMetrics.reduce((sum, m) => sum + m.failureCount, 0);
        typeBreakdown[type] = {
          total: typeTotal,
          successRate: typeSuccessCount / (typeSuccessCount + typeFailureCount),
        };
      }

      return { total, successRate, avgDuration, typeBreakdown };
    } else {
      // Use in-memory fallback
      let metrics = [...memoryValidationMetrics];
      if (validatorType) metrics = metrics.filter(m => m.validatorType === validatorType);
      if (since) metrics = metrics.filter(m => m.timestamp >= since);

      if (metrics.length === 0) {
        return {
          total: 0,
          successRate: 0,
          avgDuration: 0,
          typeBreakdown: {},
        };
      }

      const total = metrics.length;
      const successCount = metrics.reduce((sum, m) => sum + m.successCount, 0);
      const failureCount = metrics.reduce((sum, m) => sum + m.failureCount, 0);
      const successRate = successCount / (successCount + failureCount);
      const avgDuration = metrics.reduce((sum, m) => sum + m.avgDuration, 0) / total;

      const typeBreakdown: Record<string, { total: number; successRate: number }> = {};
      const typeGroups = new Map<string, typeof metrics>();

      for (const m of metrics) {
        if (!typeGroups.has(m.validatorType)) {
          typeGroups.set(m.validatorType, []);
        }
        typeGroups.get(m.validatorType)!.push(m);
      }

      for (const [type, typeMetrics] of typeGroups.entries()) {
        const typeTotal = typeMetrics.length;
        const typeSuccessCount = typeMetrics.reduce((sum, m) => sum + m.successCount, 0);
        const typeFailureCount = typeMetrics.reduce((sum, m) => sum + m.failureCount, 0);
        typeBreakdown[type] = {
          total: typeTotal,
          successRate: typeSuccessCount / (typeSuccessCount + typeFailureCount),
        };
      }

      return { total, successRate, avgDuration, typeBreakdown };
    }
  } catch (error) {
    console.error('[Validation Metrics] Failed to get stats from database:', error);
    return {
      total: 0,
      successRate: 0,
      avgDuration: 0,
      typeBreakdown: {},
    };
  }
}

/**
 * Clear all metrics from database (useful for testing)
 */
export async function clearMetrics(): Promise<void> {
  try {
    if (USE_DATABASE) {
      await db.cwrGenerationMetrics.deleteMany({});
      await db.ackImportMetrics.deleteMany({});
      await db.validationMetrics.deleteMany({});
    } else {
      memoryCwrMetrics.length = 0;
      memoryAckMetrics.length = 0;
      memoryValidationMetrics.length = 0;
    }
    console.log('[Metrics] All metrics cleared');
  } catch (error) {
    console.error('[Metrics] Failed to clear metrics:', error);
  }
}

/**
 * Get all metrics (for debugging)
 */
export async function getAllMetrics(): Promise<{
  cwrGeneration: CwrGenerationMetrics[];
  ackImport: AckImportMetrics[];
  validation: ValidationMetrics[];
}> {
  try {
    if (USE_DATABASE) {
      const [cwrGeneration, ackImport, validation] = await Promise.all([
        db.cwrGenerationMetrics.findMany({ orderBy: { timestamp: 'desc' }, take: 100 }),
        db.ackImportMetrics.findMany({ orderBy: { timestamp: 'desc' }, take: 100 }),
        db.validationMetrics.findMany({ orderBy: { timestamp: 'desc' }, take: 100 }),
      ]);

      return {
        cwrGeneration,
        ackImport,
        validation,
      };
    } else {
      return {
        cwrGeneration: [...memoryCwrMetrics],
        ackImport: [...memoryAckMetrics],
        validation: [...memoryValidationMetrics],
      };
    }
  } catch (error) {
    console.error('[Metrics] Failed to get all metrics:', error);
    return {
      cwrGeneration: [],
      ackImport: [],
      validation: [],
    };
  }
}