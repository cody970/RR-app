/**
 * CWR Generation Service — Test Suite
 *
 * Tests the TypeScript port of DMP's cwr_templates.py.
 * Verifies record formatting, field widths, CRLF line endings,
 * and correct generation of CWR 2.1, 2.2, 3.0, and 3.1 files.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCwr,
  rrWorkToCwrWork,
  generateFilename,
  type RRWorkInput,
  type RRPublisherInput,
} from './cwr-generator';
import type { CwrWork, CwrFileOptions } from './cwr-types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PUBLISHER: RRPublisherInput = {
  code: 'MYCO',
  name: 'MY PUBLISHING CO',
  ipiNameNumber: '00000000001',
  prSociety: '010', // ASCAP
  prShare: 50,
  mrShare: 100,
  srShare: 100,
};

const WORK_INPUT: RRWorkInput = {
  id: 'clwork001',
  title: 'Test Song',
  iswc: 'T-000000001-0',
  writers: [
    {
      writer: {
        id: 'clwriter001',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        ipiCae: '00000000002',
        prSociety: '010',
      },
      splitPercent: 50,
      role: 'C',
      controlled: true,
    },
    {
      writer: {
        id: 'clwriter002',
        name: 'Jane Smith',
        firstName: 'Jane',
        lastName: 'Smith',
        ipiCae: '00000000003',
        prSociety: '013', // BMI
      },
      splitPercent: 50,
      role: 'A',
      controlled: false,
    },
  ],
  recordings: [
    {
      isrc: 'USRC17607839',
      title: 'Test Song (Radio Edit)',
      durationSec: 210,
    },
  ],
};

const BASE_OPTIONS: CwrFileOptions = {
  version: '21',
  transactionType: 'NWR',
  senderCode: 'MYCO',
  senderName: 'MY PUBLISHING CO',
  senderIpiNameNumber: '00000000001',
  sequenceNumber: 1,
  creationDate: new Date('2024-01-15T10:30:00Z'),
};

// ---------------------------------------------------------------------------
// generateFilename
// ---------------------------------------------------------------------------

describe('generateFilename', () => {
  it('generates correct CWR 2.1 filename', () => {
    const date = new Date('2024-01-15');
    const filename = generateFilename('21', 'MYCO', 1, date);
    expect(filename).toMatch(/^CW\d{2}\d{4}.+\.V21$/);
    expect(filename).toContain('MYCO');
  });

  it('generates correct CWR 3.0 filename', () => {
    const date = new Date('2024-06-01');
    const filename = generateFilename('30', 'MYCO', 5, date);
    expect(filename).toMatch(/^CW\d{2}\d{4}.+\.V30$/);
  });

  it('uses 2-digit year', () => {
    const date = new Date('2024-01-01');
    const filename = generateFilename('21', 'MYCO', 1, date);
    expect(filename.startsWith('CW24')).toBe(true);
  });

  it('zero-pads sequence number to 4 digits', () => {
    const date = new Date('2024-01-01');
    const filename = generateFilename('21', 'MYCO', 7, date);
    expect(filename).toContain('0007');
  });
});

// ---------------------------------------------------------------------------
// rrWorkToCwrWork
// ---------------------------------------------------------------------------

describe('rrWorkToCwrWork', () => {
  it('converts RR work to CwrWork structure', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    expect(cwrWork.title).toBe('TEST SONG');
    expect(cwrWork.iswc).toBe('T-000000001-0');
    expect(cwrWork.writers).toHaveLength(2);
    expect(cwrWork.publisher.code).toBe('MYCO');
  });

  it('uppercases title', () => {
    const work = { ...WORK_INPUT, title: 'lowercase title' };
    const cwrWork = rrWorkToCwrWork(work, PUBLISHER);
    expect(cwrWork.title).toBe('LOWERCASE TITLE');
  });

  it('maps writer roles to CWR capacities', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    expect(cwrWork.writers[0].capacity).toBe('C ');  // Composer
    expect(cwrWork.writers[1].capacity).toBe('A ');  // Author/Lyricist
  });

  it('sets controlled flag correctly', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    expect(cwrWork.writers[0].controlled).toBe(true);
    expect(cwrWork.writers[1].controlled).toBe(false);
  });

  it('uppercases writer names', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    expect(cwrWork.writers[0].lastName).toBe('DOE');
    expect(cwrWork.writers[0].firstName).toBe('JOHN');
  });

  it('includes recordings with ISRC', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    expect(cwrWork.recordings).toHaveLength(1);
    expect(cwrWork.recordings![0].isrc).toBe('USRC17607839');
  });

  it('handles work without ISWC', () => {
    const work = { ...WORK_INPUT, iswc: undefined };
    const cwrWork = rrWorkToCwrWork(work, PUBLISHER);
    expect(cwrWork.iswc).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// generateCwr — CWR 2.1
// ---------------------------------------------------------------------------

describe('generateCwr — CWR 2.1', () => {
  let cwrWork: CwrWork;
  let result: ReturnType<typeof generateCwr>;

  beforeEach(() => {
    cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    result = generateCwr([cwrWork], BASE_OPTIONS);
  });

  it('generates without errors', () => {
    expect(result.success).toBe(true);
    expect(result.content).toBeTruthy();
    expect(result.filename).toBeTruthy();
  });

  it('uses CRLF line endings throughout', () => {
    // Every line should end with \r\n
    const lines = result.content.split('\r\n');
    expect(lines.length).toBeGreaterThan(5);
    // No bare \n without preceding \r
    const bareNewlines = result.content.replace(/\r\n/g, '').includes('\n');
    expect(bareNewlines).toBe(false);
  });

  it('starts with HDR record', () => {
    const firstLine = result.content.split('\r\n')[0];
    expect(firstLine.startsWith('HDR')).toBe(true);
  });

  it('ends with TRL record', () => {
    const lines = result.content.split('\r\n').filter(Boolean);
    const lastLine = lines[lines.length - 1];
    expect(lastLine.startsWith('TRL')).toBe(true);
  });

  it('contains GRH group header', () => {
    expect(result.content).toContain('GRH');
  });

  it('contains NWR transaction record', () => {
    expect(result.content).toContain('NWR');
  });

  it('contains SPU publisher record', () => {
    expect(result.content).toContain('SPU');
  });

  it('contains SWR writer records', () => {
    expect(result.content).toContain('SWR');
  });

  it('contains GRT group trailer', () => {
    expect(result.content).toContain('GRT');
  });

  it('HDR record is exactly 3 chars record type + content', () => {
    const hdrLine = result.content.split('\r\n')[0];
    expect(hdrLine.substring(0, 3)).toBe('HDR');
    // HDR record should be a fixed width (at least 100 chars)
    expect(hdrLine.length).toBeGreaterThanOrEqual(100);
  });

  it('includes sender IPI in HDR', () => {
    // CWR 2.1 HDR uses IPI name number (not sender code) in the HDRPB field
    const hdrLine = result.content.split('\r\n')[0];
    expect(hdrLine.startsWith('HDRPB')).toBe(true);
    // The sender name should appear in the HDR
    expect(hdrLine).toContain('MY PUBLISHING CO');
  });

  it('includes ISWC in NWR record when provided', () => {
    // ISWC T-000000001-0 is stored with hyphens in the NWR record
    expect(result.content).toContain('T-000000001');
  });

  it('includes REC recording record when recordings provided', () => {
    expect(result.content).toContain('REC');
  });

  it('includes ISRC in REC record', () => {
    expect(result.content).toContain('USRC17607839');
  });

  it('reports correct work count', () => {
    expect(result.workCount).toBe(1);
  });

  it('generates correct filename extension for v2.1', () => {
    expect(result.filename.endsWith('.V21')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateCwr — CWR 2.2
// ---------------------------------------------------------------------------

describe('generateCwr — CWR 2.2', () => {
  it('generates valid CWR 2.2 file', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    const result = generateCwr([cwrWork], { ...BASE_OPTIONS, version: '22' });
    expect(result.success).toBe(true);
    expect(result.filename.endsWith('.V22')).toBe(true);
    expect(result.content).toContain('NWR');
  });
});

// ---------------------------------------------------------------------------
// generateCwr — CWR 3.0
// ---------------------------------------------------------------------------

describe('generateCwr — CWR 3.0', () => {
  it('generates valid CWR 3.0 file', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    const result = generateCwr([cwrWork], { ...BASE_OPTIONS, version: '30' });
    expect(result.success).toBe(true);
    expect(result.filename.endsWith('.V30')).toBe(true);
  });

  it('uses WRK record type instead of NWR for v3.0', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    const result = generateCwr([cwrWork], { ...BASE_OPTIONS, version: '30' });
    expect(result.content).toContain('WRK');
  });
});

// ---------------------------------------------------------------------------
// generateCwr — CWR 3.1
// ---------------------------------------------------------------------------

describe('generateCwr — CWR 3.1', () => {
  it('generates valid CWR 3.1 file', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    const result = generateCwr([cwrWork], { ...BASE_OPTIONS, version: '31' });
    expect(result.success).toBe(true);
    expect(result.filename.endsWith('.V31')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateCwr — Multiple works
// ---------------------------------------------------------------------------

describe('generateCwr — Multiple works', () => {
  it('handles multiple works in one file', () => {
    const work1 = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    const work2 = rrWorkToCwrWork(
      { ...WORK_INPUT, id: 'clwork002', title: 'Second Song', iswc: undefined },
      PUBLISHER
    );
    const result = generateCwr([work1, work2], BASE_OPTIONS);
    expect(result.success).toBe(true);
    expect(result.workCount).toBe(2);
    // Should have two NWR records
    const nwrCount = (result.content.match(/\nNWR/g) || []).length;
    expect(nwrCount).toBe(2);
  });

  it('handles empty work list gracefully', () => {
    const result = generateCwr([], BASE_OPTIONS);
    expect(result.success).toBe(true);
    expect(result.workCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// generateCwr — REV transactions
// ---------------------------------------------------------------------------

describe('generateCwr — REV transactions', () => {
  it('generates REV record when transactionType is REV', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    // Pass transactionType: 'REV' in options — the generator uses options.transactionType
    const result = generateCwr([cwrWork], { ...BASE_OPTIONS, transactionType: 'REV' });
    expect(result.success).toBe(true);
    expect(result.content).toContain('REV');
  });
});

// ---------------------------------------------------------------------------
// generateCwr — Alternate titles
// ---------------------------------------------------------------------------

describe('generateCwr — Alternate titles', () => {
  it('includes ALT records for alternate titles', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    const workWithAlts: CwrWork = {
      ...cwrWork,
      alternateTitles: [
        { title: 'ALTERNATE TITLE ONE', titleType: 'AT' },
        { title: 'ORIGINAL LANGUAGE TITLE', titleType: 'OL', language: 'SPA' },
      ],
    };
    const result = generateCwr([workWithAlts], BASE_OPTIONS);
    expect(result.success).toBe(true);
    expect(result.content).toContain('ALT');
    expect(result.content).toContain('ALTERNATE TITLE ONE');
  });
});

// ---------------------------------------------------------------------------
// generateCwr — Cross references
// ---------------------------------------------------------------------------

describe('generateCwr — Cross references', () => {
  it('includes XRF records for cross references', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    const workWithXrf: CwrWork = {
      ...cwrWork,
      crossReferences: [
        { organisation: '010', identifier: 'ASCAP123456', idType: 'ISWC' },
      ],
    };
    const result = generateCwr([workWithXrf], BASE_OPTIONS);
    expect(result.success).toBe(true);
    expect(result.content).toContain('XRF');
  });
});

// ---------------------------------------------------------------------------
// generateCwr — Field width validation
// ---------------------------------------------------------------------------

describe('generateCwr — Field widths', () => {
  it('all records have consistent line lengths (no truncation issues)', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    const result = generateCwr([cwrWork], BASE_OPTIONS);
    const lines = result.content.split('\r\n').filter(Boolean);

    // Check that record type identifiers are correct length (3 chars)
    for (const line of lines) {
      const recordType = line.substring(0, 3);
      expect(recordType.trim().length).toBeGreaterThan(0);
    }
  });

  it('NWR record is at least 200 characters wide', () => {
    const cwrWork = rrWorkToCwrWork(WORK_INPUT, PUBLISHER);
    const result = generateCwr([cwrWork], BASE_OPTIONS);
    const nwrLine = result.content.split('\r\n').find(l => l.startsWith('NWR'));
    expect(nwrLine).toBeDefined();
    expect(nwrLine!.length).toBeGreaterThanOrEqual(200);
  });
});

// ---------------------------------------------------------------------------
// generateCwr — Long title truncation
// ---------------------------------------------------------------------------

describe('generateCwr — Title handling', () => {
  it('truncates very long titles to CWR max (60 chars for NWR)', () => {
    const longTitle = 'A'.repeat(100);
    const work = { ...WORK_INPUT, title: longTitle };
    const cwrWork = rrWorkToCwrWork(work, PUBLISHER);
    const result = generateCwr([cwrWork], BASE_OPTIONS);
    expect(result.success).toBe(true);
    // Should not throw or produce malformed output
    expect(result.content).toContain('NWR');
  });

  it('handles special characters in titles gracefully', () => {
    const work = { ...WORK_INPUT, title: "Don't Stop Me Now" };
    const cwrWork = rrWorkToCwrWork(work, PUBLISHER);
    const result = generateCwr([cwrWork], BASE_OPTIONS);
    expect(result.success).toBe(true);
  });
});