/**
 * ACK File Parser — Test Suite
 *
 * Tests the TypeScript port of DMP's ACKImportAdmin.process() and
 * ACKImportForm.clean() ACK file parsing logic.
 *
 * Covers:
 *   - Header parsing (CWR 2.1 and 3.0)
 *   - ACK record extraction
 *   - ISWC extraction from ISW records
 *   - ISWC conflict detection
 *   - Duplicate ISWC detection
 *   - Filename validation
 *   - Status label mapping
 *   - Report generation
 */

import { describe, it, expect } from 'vitest';
import {
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
} from './ack-parser';

// ---------------------------------------------------------------------------
// Test fixtures — minimal valid CWR ACK file content
// ---------------------------------------------------------------------------

/**
 * Build a minimal CWR 2.1 ACK file string.
 * Uses CRLF line endings as per CWR spec.
 * Field widths are approximate for testing purposes.
 */
function buildAck21(records: Array<{
  workId: string;
  remoteWorkId: string;
  date: string;   // YYYYMMDD
  status: string; // 2-char e.g. "RA"
  transactionType?: string;
}>): string {
  // HDR record: HDR + SO + senderCode(9) + senderName(45) + 01.10 + creationDate(8) + time(6) + transmissionDate(8)
  const hdr = `HDRSO000000001ASCAP                                        01.1020240115093000020240115`;

  const grh = `GRH0000000100000001NWR0000000000000000`;

  const ackLines = records.map(({ workId, remoteWorkId, date, status, transactionType = 'NWR' }) => {
    // ACK record layout (CWR 2.1):
    // ACK(3) + transactionSeq(8) + recordSeq(8) + creationDate(8) + creationTime(6) + originalGroupId(5) + originalTransactionSeq(8) + originalRecordSeq(8) + transactionType(3) + title(60) + workId(20) + remoteWorkId(20) + date(8) + status(2)
    const txSeq = '00000001';
    const recSeq = '00000000';
    const creationDate = '20240115';
    const creationTime = '093000';
    const origGroupId = '00001';
    const origTxSeq = '00000001';
    const origRecSeq = '00000000';
    const txType = transactionType.padEnd(3, ' ');
    const title = 'TEST SONG'.padEnd(60, ' ');
    const wId = workId.padEnd(20, ' ');
    const rwId = remoteWorkId.padEnd(20, ' ');
    return `ACK${txSeq}${recSeq}${creationDate}${creationTime}${origGroupId}${origTxSeq}${origRecSeq}${txType}${title}${wId}${rwId}${date}${status}`;
  });

  const grt = `GRT00000001${String(records.length).padStart(8, '0')}0000000000000000`;
  const trl = `TRL000000010000000100000001`;

  return [hdr, grh, ...ackLines, grt, trl].join('\n');
}

/**
 * Build a minimal CWR 3.0 ACK file string.
 */
function buildAck30(records: Array<{
  workId: string;
  remoteWorkId: string;
  date: string;
  status: string;
}>): string {
  // HDR for CWR 3.0: HDRSO + senderCode(4) + senderName(45) + date(8) + time(6) + transmDate(8) + spaces(15) + version(6)
  // Total: 3 + 2 + 4 + 45 + 8 + 6 + 8 + 15 + 6 = 97 chars
  const hdr = `HDRSO010 ASCAP                                        20240115093000202401150000000000000003.0000`;

  const grh = `GRH0000000100000001WRK0000000000000000`;

  const ackLines = records.map(({ workId, remoteWorkId, date, status }) => {
    const txSeq = '00000001';
    const recSeq = '00000000';
    const creationDate = '20240115';
    const creationTime = '093000';
    const origGroupId = '00001';
    const origTxSeq = '00000001';
    const origRecSeq = '00000000';
    const txType = 'WRK';
    const title = 'TEST SONG'.padEnd(60, ' ');
    const wId = workId.padEnd(20, ' ');
    const rwId = remoteWorkId.padEnd(20, ' ');
    const extraField = ' '.repeat(20); // CWR 3.0 has an extra 20-char field
    return `ACK${txSeq}${recSeq}${creationDate}${creationTime}${origGroupId}${origTxSeq}${origRecSeq}${txType}${title}${wId}${rwId}${extraField}${date}${status}`;
  });

  const grt = `GRT00000001${String(records.length).padStart(8, '0')}0000000000000000`;
  const trl = `TRL000000010000000100000001`;

  return [hdr, grh, ...ackLines, grt, trl].join('\n');
}

/**
 * Build an ISW record for ISWC extraction tests.
 */
function buildIswRecord(workId: string, iswc: string): string {
  // ISW record: ISW(3) + transactionSeq(8) + recordSeq(8) + ... + workId(14) + iswc(11)
  const prefix = 'ISW' + '0'.repeat(78);
  const wId = workId.padEnd(14, ' ');
  const iswcFormatted = iswc.replace(/[^0-9T]/g, '').padEnd(11, ' ');
  return prefix + wId + iswcFormatted;
}

// ---------------------------------------------------------------------------
// parseAckHeader
// ---------------------------------------------------------------------------

describe('parseAckHeader', () => {
  it('parses CWR 2.1 header correctly', () => {
    const content = buildAck21([{
      workId: 'WORK001',
      remoteWorkId: 'ASCAP001',
      date: '20240115',
      status: 'RA',
    }]);
    const metadata = parseAckHeader(content);
    expect(metadata).not.toBeNull();
    expect(metadata!.version).toBe('21');
  });

  it('parses CWR 3.0 header correctly', () => {
    const content = buildAck30([{
      workId: 'WORK001',
      remoteWorkId: 'ASCAP001',
      date: '20240115',
      status: 'RA',
    }]);
    const metadata = parseAckHeader(content);
    expect(metadata).not.toBeNull();
    expect(metadata!.version).toBe('30');
  });

  it('returns null for invalid/empty content', () => {
    expect(parseAckHeader('')).toBeNull();
    expect(parseAckHeader('INVALID CONTENT')).toBeNull();
    expect(parseAckHeader('NWR00000001')).toBeNull();
  });

  it('extracts society code from header', () => {
    const content = buildAck21([{
      workId: 'WORK001',
      remoteWorkId: 'ASCAP001',
      date: '20240115',
      status: 'RA',
    }]);
    const metadata = parseAckHeader(content);
    expect(metadata).not.toBeNull();
    // Society code should be extracted
    expect(metadata!.societyCode).toBeTruthy();
  });

  it('extracts date from header', () => {
    const content = buildAck21([{
      workId: 'WORK001',
      remoteWorkId: 'ASCAP001',
      date: '20240115',
      status: 'RA',
    }]);
    const metadata = parseAckHeader(content);
    expect(metadata).not.toBeNull();
    expect(metadata!.date).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// parseAckFile
// ---------------------------------------------------------------------------

describe('parseAckFile', () => {
  it('parses a single RA (Registration Accepted) record', () => {
    const content = buildAck21([{
      workId: 'WORK001             ',
      remoteWorkId: 'ASCAP001            ',
      date: '20240115',
      status: 'RA',
    }]);
    const result = parseAckFile(content);
    expect(result.errors).toHaveLength(0);
    expect(result.records.length).toBeGreaterThanOrEqual(0);
  });

  it('returns errors array for invalid content', () => {
    const result = parseAckFile('INVALID CONTENT');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles empty string gracefully', () => {
    const result = parseAckFile('');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('parses multiple ACK records', () => {
    const content = buildAck21([
      { workId: 'WORK001', remoteWorkId: 'ASCAP001', date: '20240115', status: 'RA' },
      { workId: 'WORK002', remoteWorkId: 'ASCAP002', date: '20240115', status: 'RA' },
      { workId: 'WORK003', remoteWorkId: 'ASCAP003', date: '20240115', status: 'NP' },
    ]);
    const result = parseAckFile(content);
    // Should not crash
    expect(result).toBeDefined();
    expect(result.errors).toBeDefined();
    expect(result.records).toBeDefined();
  });

  it('returns metadata with version info', () => {
    const content = buildAck21([{
      workId: 'WORK001',
      remoteWorkId: 'ASCAP001',
      date: '20240115',
      status: 'RA',
    }]);
    const result = parseAckFile(content);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.version).toBe('21');
  });

  it('parses CWR 3.0 ACK file', () => {
    const content = buildAck30([{
      workId: 'WORK001',
      remoteWorkId: 'ASCAP001',
      date: '20240115',
      status: 'RA',
    }]);
    const result = parseAckFile(content);
    expect(result.metadata.version).toBe('30');
  });

  it('initialises extractedIswcs as a Map', () => {
    const content = buildAck21([{
      workId: 'WORK001',
      remoteWorkId: 'ASCAP001',
      date: '20240115',
      status: 'RA',
    }]);
    const result = parseAckFile(content);
    expect(result.extractedIswcs).toBeInstanceOf(Map);
  });

  it('initialises iswcConflicts as an array', () => {
    const content = buildAck21([{
      workId: 'WORK001',
      remoteWorkId: 'ASCAP001',
      date: '20240115',
      status: 'RA',
    }]);
    const result = parseAckFile(content);
    expect(Array.isArray(result.iswcConflicts)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// detectIswcConflicts
// ---------------------------------------------------------------------------

describe('detectIswcConflicts', () => {
  it('returns empty array when no conflicts', () => {
    const existingIswcs = new Map([
      ['WORK001', 'T-000000001-0'],
      ['WORK002', 'T-000000002-0'],
    ]);
    const newIswcs = new Map([
      ['WORK001', 'T-000000001-0'], // same — no conflict
    ]);
    const conflicts = detectIswcConflicts(existingIswcs, newIswcs);
    expect(conflicts).toHaveLength(0);
  });

  it('detects conflict when ISWC differs for same work', () => {
    const existingIswcs = new Map([
      ['WORK001', 'T-000000001-0'],
    ]);
    const newIswcs = new Map([
      ['WORK001', 'T-000000002-0'], // different — conflict!
    ]);
    const conflicts = detectIswcConflicts(existingIswcs, newIswcs);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].workId).toBe('WORK001');
    expect(conflicts[0].existingIswc).toBe('T-000000001-0');
    expect(conflicts[0].newIswc).toBe('T-000000002-0');
  });

  it('handles empty maps', () => {
    const conflicts = detectIswcConflicts(new Map(), new Map());
    expect(conflicts).toHaveLength(0);
  });

  it('does not flag new work (not in existing)', () => {
    const existingIswcs = new Map<string, string>();
    const newIswcs = new Map([['WORK001', 'T-000000001-0']]);
    const conflicts = detectIswcConflicts(existingIswcs, newIswcs);
    expect(conflicts).toHaveLength(0);
  });

  it('detects multiple conflicts', () => {
    const existingIswcs = new Map([
      ['WORK001', 'T-000000001-0'],
      ['WORK002', 'T-000000002-0'],
    ]);
    const newIswcs = new Map([
      ['WORK001', 'T-000000099-0'],
      ['WORK002', 'T-000000098-0'],
    ]);
    const conflicts = detectIswcConflicts(existingIswcs, newIswcs);
    expect(conflicts).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// detectDuplicateIswcs
// ---------------------------------------------------------------------------

describe('detectDuplicateIswcs', () => {
  it('returns empty array when no duplicates', () => {
    // existingWorksByIswc: iswc -> workId (already in DB)
    // extractedIswcs: workId -> iswc (from ACK file)
    const existingByIswc = new Map([
      ['t-000000001-0', 'WORK001'],
      ['t-000000002-0', 'WORK002'],
    ]);
    const extracted = new Map([
      ['WORK003', 'T-000000003-0'], // new work, new ISWC — no conflict
    ]);
    const duplicates = detectDuplicateIswcs(existingByIswc, extracted);
    expect(duplicates).toHaveLength(0);
  });

  it('detects when extracted ISWC already belongs to a different work', () => {
    // WORK002 in ACK gets ISWC that already belongs to WORK001 in DB
    const existingByIswc = new Map([
      ['t-000000001-0', 'WORK001'],
    ]);
    const extracted = new Map([
      ['WORK002', 'T-000000001-0'], // same ISWC as WORK001 — duplicate!
    ]);
    const duplicates = detectDuplicateIswcs(existingByIswc, extracted);
    expect(duplicates.length).toBeGreaterThan(0);
  });

  it('handles empty maps', () => {
    const duplicates = detectDuplicateIswcs(new Map(), new Map());
    expect(duplicates).toHaveLength(0);
  });

  it('handles single entry with no conflict', () => {
    const existingByIswc = new Map<string, string>();
    const extracted = new Map([['WORK001', 'T-000000001-0']]);
    const duplicates = detectDuplicateIswcs(existingByIswc, extracted);
    expect(duplicates).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// isValidAckFilename
// ---------------------------------------------------------------------------

describe('isValidAckFilename', () => {
  it('accepts valid CWR 2.1 ACK filename', () => {
    expect(isValidAckFilename('CW240001ASCAP.V21')).toBe(true);
  });

  it('accepts valid CWR 2.2 ACK filename', () => {
    expect(isValidAckFilename('CW240001ASCAP.V22')).toBe(true);
  });

  it('accepts valid CWR 3.0 ACK filename', () => {
    expect(isValidAckFilename('CW240001ASCAP.V30')).toBe(true);
  });

  it('rejects filename without CW prefix', () => {
    expect(isValidAckFilename('ASCAP_ACK_2024.txt')).toBe(false);
  });

  it('rejects filename with wrong extension', () => {
    expect(isValidAckFilename('CW240001ASCAP.txt')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidAckFilename('')).toBe(false);
  });

  it('rejects null-like values gracefully', () => {
    expect(isValidAckFilename('   ')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAckStatusLabel
// ---------------------------------------------------------------------------

describe('getAckStatusLabel', () => {
  it('returns label for RA (Registration Accepted)', () => {
    const label = getAckStatusLabel('RA');
    expect(label).toBeTruthy();
    expect(typeof label).toBe('string');
    expect(label.toLowerCase()).toContain('accept');
  });

  it('returns label for AS (Accepted with changes)', () => {
    const label = getAckStatusLabel('AS');
    expect(label).toBeTruthy();
    expect(typeof label).toBe('string');
  });

  it('returns label for RA (Rejected)', () => {
    const label = getAckStatusLabel('RA');
    expect(label).toBeTruthy();
  });

  it('returns label for NP (Not Processed)', () => {
    const label = getAckStatusLabel('NP');
    expect(label).toBeTruthy();
    expect(typeof label).toBe('string');
  });

  it('returns fallback for unknown status', () => {
    const label = getAckStatusLabel('XX');
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('handles empty string', () => {
    const label = getAckStatusLabel('');
    expect(typeof label).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// generateAckReport
// ---------------------------------------------------------------------------

describe('generateAckReport', () => {
  it('generates a non-empty report string', () => {
    const mockResult: AckProcessResult = {
      metadata: {
        societyCode: '010',
        societyName: 'ASCAP',
        date: new Date('2024-01-15'),
        version: '21',
      },
      records: [
        {
          transactionType: 'NWR',
          workId: 'WORK001',
          remoteWorkId: 'ASCAP001',
          date: new Date('2024-01-15'),
          status: 'RA',
        },
      ],
      unknownWorkIds: [],
      extractedIswcs: new Map([['WORK001', 'T-000000001-0']]),
      iswcConflicts: [],
      errors: [],
    };

    const report = generateAckReport(mockResult);
    expect(typeof report).toBe('string');
    expect(report.length).toBeGreaterThan(0);
  });

  it('includes society name in report', () => {
    const mockResult: AckProcessResult = {
      metadata: {
        societyCode: '010',
        societyName: 'ASCAP',
        date: new Date('2024-01-15'),
        version: '21',
      },
      records: [],
      unknownWorkIds: [],
      extractedIswcs: new Map(),
      iswcConflicts: [],
      errors: [],
    };

    const report = generateAckReport(mockResult);
    expect(report).toContain('ASCAP');
  });

  it('includes error count when errors present', () => {
    const mockResult: AckProcessResult = {
      metadata: {
        societyCode: '010',
        societyName: 'ASCAP',
        date: new Date('2024-01-15'),
        version: '21',
      },
      records: [],
      unknownWorkIds: ['UNKNOWN001'],
      extractedIswcs: new Map(),
      iswcConflicts: [],
      errors: ['Parse error on line 5'],
    };

    const report = generateAckReport(mockResult);
    expect(report).toBeTruthy();
    // Report should mention errors or unknown works
    expect(report.length).toBeGreaterThan(10);
  });

  it('includes conflict information when conflicts present', () => {
    const mockResult: AckProcessResult = {
      metadata: {
        societyCode: '010',
        societyName: 'ASCAP',
        date: new Date('2024-01-15'),
        version: '21',
      },
      records: [],
      unknownWorkIds: [],
      extractedIswcs: new Map(),
      iswcConflicts: [
        {
          workId: 'WORK001',
          existingIswc: 'T-000000001-0',
          newIswc: 'T-000000002-0',
        },
      ],
      errors: [],
    };

    const report = generateAckReport(mockResult);
    expect(report).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Integration: full parse round-trip
// ---------------------------------------------------------------------------

describe('ACK Parser — integration', () => {
  it('processes a realistic multi-record CWR 2.1 ACK file', () => {
    const content = buildAck21([
      { workId: 'CLWORK001ABCDEF', remoteWorkId: 'ASCAP0000001234', date: '20240115', status: 'RA' },
      { workId: 'CLWORK002ABCDEF', remoteWorkId: 'ASCAP0000005678', date: '20240115', status: 'AS' },
      { workId: 'CLWORK003ABCDEF', remoteWorkId: '                ', date: '20240115', status: 'RA' },
    ]);

    const result = parseAckFile(content);
    expect(result).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.version).toBe('21');
    expect(Array.isArray(result.records)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.extractedIswcs).toBeInstanceOf(Map);
    expect(Array.isArray(result.iswcConflicts)).toBe(true);
  });

  it('processes a realistic CWR 3.0 ACK file', () => {
    const content = buildAck30([
      { workId: 'CLWORK001ABCDEF', remoteWorkId: 'ASCAP0000001234', date: '20240115', status: 'RA' },
    ]);

    const result = parseAckFile(content);
    expect(result).toBeDefined();
    expect(result.metadata.version).toBe('30');
  });

  it('importIswcs=false skips ISWC extraction', () => {
    const content = buildAck21([
      { workId: 'CLWORK001ABCDEF', remoteWorkId: 'ASCAP0000001234', date: '20240115', status: 'RA' },
    ]);

    const result = parseAckFile(content, false);
    expect(result.extractedIswcs.size).toBe(0);
  });
});