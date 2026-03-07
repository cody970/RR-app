/**
 * CWR Metrics and Monitoring
 * 
 * Provides logging and metrics tracking for CWR operations:
 * - CWR generation metrics
 * - ACK import tracking
 * - Validation performance monitoring
 */

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

// In-memory metrics storage (in production, use a database or time-series database)
const cwrGenerationMetrics: CwrGenerationMetrics[] = [];
const ackImportMetrics: AckImportMetrics[] = [];
const validationMetrics: ValidationMetrics[] = [];

// Keep last 1000 metrics
const MAX_METRICS = 1000;

/**
 * Log CWR generation metrics
 */
export function logCwrGeneration(metrics: CwrGenerationMetrics): void {
  cwrGenerationMetrics.push({
    ...metrics,
    timestamp: metrics.timestamp || new Date(),
  });

  // Trim if necessary
  if (cwrGenerationMetrics.length > MAX_METRICS) {
    cwrGenerationMetrics.shift();
  }

  console.log('[CWR Metrics]', JSON.stringify(metrics));
}

/**
 * Log ACK import metrics
 */
export function logAckImport(metrics: AckImportMetrics): void {
  ackImportMetrics.push({
    ...metrics,
    timestamp: metrics.timestamp || new Date(),
  });

  // Trim if necessary
  if (ackImportMetrics.length > MAX_METRICS) {
    ackImportMetrics.shift();
  }

  console.log('[ACK Metrics]', JSON.stringify(metrics));
}

/**
 * Log validation metrics
 */
export function logValidation(metrics: ValidationMetrics): void {
  validationMetrics.push({
    ...metrics,
    timestamp: metrics.timestamp || new Date(),
  });

  // Trim if necessary
  if (validationMetrics.length > MAX_METRICS) {
    validationMetrics.shift();
  }

  console.log('[Validation Metrics]', JSON.stringify(metrics));
}

/**
 * Get CWR generation statistics
 */
export function getCwrGenerationStats(orgId?: string, since?: Date): {
  total: number;
  avgWorkCount: number;
  avgFileSize: number;
  avgDuration: number;
  versionBreakdown: Record&lt;string, number&gt;;
} {
  let metrics = cwrGenerationMetrics;

  // Filter by orgId if provided
  if (orgId) {
    metrics = metrics.filter(m => m.orgId === orgId);
  }

  // Filter by date if provided
  if (since) {
    metrics = metrics.filter(m => m.timestamp >= since);
  }

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

  const versionBreakdown: Record&lt;string, number&gt; = {};
  for (const m of metrics) {
    versionBreakdown[m.version] = (versionBreakdown[m.version] || 0) + 1;
  }

  return {
    total,
    avgWorkCount,
    avgFileSize,
    avgDuration,
    versionBreakdown,
  };
}

/**
 * Get ACK import statistics
 */
export function getAckImportStats(orgId?: string, since?: Date): {
  total: number;
  avgRecordCount: number;
  avgAcceptedRate: number;
  avgRejectedRate: number;
  avgConflictRate: number;
  avgDuration: number;
} {
  let metrics = ackImportMetrics;

  // Filter by orgId if provided
  if (orgId) {
    metrics = metrics.filter(m => m.orgId === orgId);
  }

  // Filter by date if provided
  if (since) {
    metrics = metrics.filter(m => m.timestamp >= since);
  }

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
  const avgAcceptedRate = metrics.reduce((sum, m) => sum + (m.acceptedCount / m.recordCount), 0) / total;
  const avgRejectedRate = metrics.reduce((sum, m) => sum + (m.rejectedCount / m.recordCount), 0) / total;
  const avgConflictRate = metrics.reduce((sum, m) => sum + (m.conflictCount / m.recordCount), 0) / total;
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

/**
 * Get validation statistics
 */
export function getValidationStats(validatorType?: string, since?: Date): {
  total: number;
  successRate: number;
  avgDuration: number;
  typeBreakdown: Record&lt;string, { total: number; successRate: number }&gt;;
} {
  let metrics = validationMetrics;

  // Filter by validator type if provided
  if (validatorType) {
    metrics = metrics.filter(m => m.validatorType === validatorType);
  }

  // Filter by date if provided
  if (since) {
    metrics = metrics.filter(m => m.timestamp >= since);
  }

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

  const typeBreakdown: Record&lt;string, { total: number; successRate: number }&gt; = {};
  const typeGroups = new Map&lt;string, ValidationMetrics[]&gt;();
  
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

  return {
    total,
    successRate,
    avgDuration,
    typeBreakdown,
  };
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  cwrGenerationMetrics.length = 0;
  ackImportMetrics.length = 0;
  validationMetrics.length = 0;
}

/**
 * Get all metrics (for debugging)
 */
export function getAllMetrics() {
  return {
    cwrGeneration: [...cwrGenerationMetrics],
    ackImport: [...ackImportMetrics],
    validation: [...validationMetrics],
  };
}