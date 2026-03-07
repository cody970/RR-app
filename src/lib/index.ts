/**
 * Library barrel export
 * 
 * Provides access to all library utilities including:
 * - Music metadata (DMP integration)
 * - Cache utilities
 * - Monitoring and metrics
 * - Performance benchmarking
 */

// ──── Music Metadata ───────────────────────────────────────────────────────
export * from './music-metadata';

// ──── Cache ───────────────────────────────────────────────────────────────
export {
  get,
  set,
  del,
  delPattern,
  clear,
  getStats,
  getKeys,
  type CacheOptions,
  type CacheStats,
} from './cache/redis-cache';

// ──── Monitoring ──────────────────────────────────────────────────────────
export {
  logCwrGeneration,
  logAckImport,
  logValidation,
  getCwrGenerationMetrics,
  getAckImportMetrics,
  getValidationMetrics,
  getAllMetrics,
  getMetricsSummary,
  clearMetrics,
  type CwrGenerationMetrics,
  type AckImportMetrics,
  type ValidationMetrics,
  type MetricsSummary,
} from './monitoring/cwr-metrics';

// ──── Benchmarking ────────────────────────────────────────────────────────
export {
  benchmark,
  compareBenchmarks,
  type BenchmarkOptions,
  type BenchmarkResult,
  type BenchmarkComparison,
} from './utils/benchmark';