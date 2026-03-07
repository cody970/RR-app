/**
 * Bulk ACK Import Service
 * 
 * Handles bulk import of ACK files with progress tracking
 * and batch processing for improved performance.
 */

import type { AckProcessResult } from './ack-parser';

export interface BulkAckImportOptions {
  batchSize?: number; // Number of ACK files to process in each batch (default: 10)
  onProgress?: (progress: ImportProgress) => void; // Progress callback
  onComplete?: (results: BatchImportResult) => void; // Completion callback
  onError?: (error: Error, file: string) => void; // Error callback
}

export interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentage: number;
  currentFile?: string;
  eta?: number; // Estimated time to completion in seconds
}

export interface BatchImportResult {
  total: number;
  successful: number;
  failed: number;
  results: Map<string, AckProcessResult | Error>;
  duration: number;
}

export interface AckFileItem {
  filename: string;
  content: string;
}

/**
 * Process ACK files in batches with progress tracking
 */
export async function importAckFiles(
  files: AckFileItem[],
  options: BulkAckImportOptions = {}
): Promise<BatchImportResult> {
  const {
    batchSize = 10,
    onProgress,
    onComplete,
    onError,
  } = options;

  const startTime = Date.now();
  const results = new Map<string, AckProcessResult | Error>();
  let successful = 0;
  let failed = 0;

  // Calculate ETA based on processing speed
  let startTimeFirstFile = Date.now();
  let filesProcessedForEta = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // Parse ACK file (using the existing ack parser)
      const { parseAckFile } = await import('./ack-parser');
      const result = parseAckFile(file.content);
      
      results.set(file.filename, result);
      successful++;
      
      // Track timing for ETA calculation
      if (filesProcessedForEta === 0) {
        startTimeFirstFile = Date.now();
      }
      filesProcessedForEta++;
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      results.set(file.filename, err);
      failed++;
      
      if (onError) {
        onError(err, file.filename);
      }
    }

    // Report progress
    if (onProgress) {
      const elapsed = Date.now() - startTimeFirstFile;
      const avgTimePerFile = filesProcessedForEta > 0 ? elapsed / filesProcessedForEta : 0;
      const remainingFiles = files.length - (i + 1);
      const eta = avgTimePerFile * remainingFiles / 1000;
      
      onProgress({
        total: files.length,
        processed: i + 1,
        successful,
        failed,
        percentage: Math.round(((i + 1) / files.length) * 100),
        currentFile: file.filename,
        eta: eta > 0 ? Math.round(eta) : undefined,
      });
    }

    // Add delay between batches to prevent overwhelming the system
    if ((i + 1) % batchSize === 0 && i + 1 < files.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const duration = Date.now() - startTime;

  const result: BatchImportResult = {
    total: files.length,
    successful,
    failed,
    results,
    duration,
  };

  if (onComplete) {
    onComplete(result);
  }

  return result;
}

/**
 * Validate ACK files before processing
 */
export async function validateAckFiles(files: AckFileItem[]): Promise<{
  valid: AckFileItem[];
  invalid: { file: AckFileItem; error: string }[];
}> {
  const valid: AckFileItem[] = [];
  const invalid: { file: AckFileItem; error: string }[] = [];

  for (const file of files) {
    try {
      // Basic validation
      if (!file.content || file.content.trim().length === 0) {
        invalid.push({ file, error: 'Empty file' });
        continue;
      }

      // Check for HDR record
      if (!file.content.startsWith('HDR')) {
        invalid.push({ file, error: 'Missing HDR record' });
        continue;
      }

      valid.push(file);
    } catch (error) {
      invalid.push({ 
        file, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { valid, invalid };
}

/**
 * Get import statistics
 */
export function getImportStats(result: BatchImportResult): {
  totalRecords: number;
  acceptedRecords: number;
  rejectedRecords: number;
  conflictRecords: number;
} {
  let totalRecords = 0;
  let acceptedRecords = 0;
  let rejectedRecords = 0;
  let conflictRecords = 0;

  for (const [_, value] of result.results) {
    if (value instanceof Error) continue;

    totalRecords += value.records.length;
    acceptedRecords += value.records.filter(r => r.status === 'RA').length;
    rejectedRecords += value.records.filter(r => r.status === 'RJ').length;
    conflictRecords += value.iswcConflicts.length;
  }

  return {
    totalRecords,
    acceptedRecords,
    rejectedRecords,
    conflictRecords,
  };
}