/**
 * music-metadata — DMP Integration barrel export
 *
 * Provides a single import point for all music metadata utilities:
 *   - Validators (ISRC, ISWC, IPI, ISNI, EAN, DPID, CWR title)
 *   - CWR generation service (versions 2.1, 2.2, 3.0, 3.1)
 *   - ACK file parser (CWR 2.1 / 3.0 acknowledgement processing)
 *   - Society lookup utility (384 PROs/CMOs from CISAC TIS-N registry)
 *   - Shared TypeScript types for all of the above
 *
 * @example
 * ```ts
 * import {
 *   validateIsrc, validateIswc, validateIpiName,
 *   generateCwr, parseAckFile,
 *   getSocietyByCode, WELL_KNOWN_SOCIETIES,
 * } from '@/lib/music-metadata';
 * ```
 */

// ─── Validators ──────────────────────────────────────────────────────────────
export {
  // Individual validator functions
  validateCwrTitle,
  validateIsrc,
  validateIswc,
  validateIpiName,
  validateIpiBase,
  validateIsni,
  validateEan,
  validateDpid,
  // Factory & helpers
  getValidator,
  assertValid,
  validateWorkIdentifiers,
  // Normalisation helpers
  normaliseIsrc,
  normaliseIswc,
  normaliseIsni,
  // Types
  type ValidatorType,
  type ValidatorFn,
  type ValidationResult,
  type WorkIdentifiers,
} from './validators';

// ─── CWR Types ───────────────────────────────────────────────────────────────
export {
  type CwrVersion,
  type TransactionType,
  type WriterCapacity,
  type PublisherRole,
  type AckStatus,
  type Society,
  type CwrPublisher,
  type CwrWriter,
  type CwrRecording,
  type CwrAlternateTitle,
  type CwrCrossReference,
  type CwrWork,
  type CwrFileOptions,
  type CwrGenerationResult,
  type AckRecord,
  type AckParseResult,
} from './cwr-types';

// ─── CWR Generator ───────────────────────────────────────────────────────────
export {
  generateCwr,
  rrWorkToCwrWork,
  generateFilename,
  type RRWorkInput,
  type RRPublisherInput,
} from './cwr-generator';

// ─── ACK Parser ──────────────────────────────────────────────────────────────
export {
  parseAckFile,
  parseAckHeader,
  detectIswcConflicts,
  detectDuplicateIswcs,
  isValidAckFilename,
  getAckStatusLabel,
  generateAckReport,
  type AckFileMetadata,
  type ParsedAckRecord,
  type AckProcessResult,
  type IswcConflict,
} from './ack-parser';

// ─── Society Lookup ───────────────────────────────────────────────────────────
export {
  SOCIETIES,
  SOCIETY_BY_CODE,
  SOCIETY_BY_NAME,
  WELL_KNOWN_SOCIETIES,
  getSocietyByCode,
  getSocietyByName,
  searchSocieties,
  getSocietiesByCountry,
  getSocietyLabel,
  getSocietiesForSeed,
  getWellKnownCode,
  type WellKnownSociety,
} from './societies';
// ──── Society Lookup (Cached) ─────────────────────────────────────────────────────
export {
  getSocietyByCode as getSocietyByCodeCached,
  getSocietyByName as getSocietyByNameCached,
  searchSocieties as searchSocietiesCached,
  getSocietiesByCountry as getSocietiesByCountryCached,
  clearSocietyCache,
  getSocietyCacheStats,
  type SocietyCacheStats,
} from './societies-cached';

// ──── CWR Compression ────────────────────────────────────────────────────────
export {
  compressCwr,
  decompressCwr,
  compressCwrFile,
  decompressCwrFile,
  getCompressionStats,
  type CompressionOptions,
  type CompressionStats,
} from './cwr-compression';

// ──── Bulk ACK Import ────────────────────────────────────────────────────────
export {
  importAckFiles,
  validateAckFiles,
  AckImportBatchProcessor,
  type AckFileItem,
  type AckProcessResult,
  type BatchImportResult,
  type BulkAckImportOptions,
  type AckValidationError,
} from './bulk-ack-import';
