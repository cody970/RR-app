/**
 * CWR Acknowledgement (ACK) File Parser
 *
 * Ported from Django Music Publisher (DMP) admin.py — ACKImportAdmin.process()
 * and forms.py — ACKImportForm.clean()
 *
 * Parses CWR acknowledgement files returned by PROs/CMOs after work registration.
 * Supports CWR 2.1 and CWR 3.0 ACK file formats.
 *
 * Key features (mirroring DMP):
 *   - Detects CWR version from HDR record
 *   - Extracts WorkAcknowledgement records (status, remote work ID, date)
 *   - Extracts ISWCs from ISW records (CWR 2.1) and ACK records (CWR 3.0)
 *   - Detects ISWC conflicts (different ISWC for same work)
 *   - Detects duplicate work entries (same ISWC on two different works)
 *   - Idempotent: reports already-existing records without re-creating
 */

import { validateIswc } from "./validators";
import type { AckRecord, AckParseResult, AckStatus } from "./cwr-types";

// ---------------------------------------------------------------------------
// Regex patterns (ported directly from DMP)
// ---------------------------------------------------------------------------

/**
 * CWR 2.1 ACK record pattern.
 * Captures: transactionType, workId, remoteWorkId, date, status, rest
 *
 * Original DMP pattern:
 *   r"(?<=\n)ACK.{43}(NWR|REV).{60}(.{20})(.{20})(.{8})(.{2})(.*?)(?=^ACK|^GRT)"
 */
const RE_ACK_21 = /(?<=\n)ACK.{43}(NWR|REV).{60}(.{20})(.{20})(.{8})(.{2})([\s\S]*?)(?=\nACK|\nGRT)/gm;

/**
 * CWR 3.0 ACK record pattern.
 * Captures: transactionType, workId, remoteWorkId, date, status, rest
 *
 * Original DMP pattern:
 *   r"(?<=\n)ACK.{43}(WRK).{60}(.{20})(.{20}){20}(.{8})(.{2})(.*?)(?=^ACK|^GRT)"
 */
const RE_ACK_30 = /(?<=\n)ACK.{43}(WRK).{60}(.{20})(.{20}).{20}(.{8})(.{2})([\s\S]*?)(?=\nACK|\nGRT)/gm;

/**
 * CWR 2.1 ISW record pattern (ISWC extraction).
 * Captures: workId, iswc
 *
 * Original DMP pattern:
 *   r"(?<=\n)ISW.{78}(.{14})(.{11}).*?(?=^ISW|^GRT)"
 */
const RE_ISW_21 = /(?<=\n)ISW.{78}(.{14})(.{11})[\s\S]*?(?=\nISW|\nGRT)/gm;

/**
 * CWR HDR record pattern for version detection.
 * CWR 2.1: contains "01.10"
 * CWR 3.0: contains "3.0000"
 */
const RE_HDR_21 = /^HDR(?:SO|AA)([ \d]{9})(.{45})01\.10(\d{8})\d{6}(\d{8})/;
const RE_HDR_30 = /^HDR(?:SO|AA)(.{4})(.{45})(\d{8})\d{6}(\d{8}).{15}3\.0000/;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AckFileMetadata {
  societyCode: string;
  societyName: string;
  date: Date;
  version: "21" | "30";
}

export interface ParsedAckRecord {
  transactionType: string;
  workId: string;
  remoteWorkId: string;
  date: Date;
  status: AckStatus;
  /** ISWC extracted from the record (if present and valid) */
  iswc?: string;
}

export interface IswcConflict {
  workId: string;
  existingIswc: string;
  newIswc: string;
}

export interface AckProcessResult {
  /** Parsed file metadata */
  metadata: AckFileMetadata;
  /** Successfully parsed ACK records */
  records: ParsedAckRecord[];
  /** Work IDs referenced in ACK but not found in our system */
  unknownWorkIds: string[];
  /** ISWC values extracted from ISW/ACK records, keyed by workId */
  extractedIswcs: Map<string, string>;
  /** ISWC conflicts detected */
  iswcConflicts: IswcConflict[];
  /** Errors encountered during parsing */
  errors: string[];
}

// ---------------------------------------------------------------------------
// Header parser
// ---------------------------------------------------------------------------

/**
 * Parse the HDR record from a CWR ACK file.
 * Returns metadata including society code, name, date, and CWR version.
 *
 * Mirrors DMP's ACKImportForm.clean() header parsing.
 */
export function parseAckHeader(content: string): AckFileMetadata | null {
  const firstLine = content.split("\n")[0] ?? "";

  // Try CWR 2.1 header
  const match21 = RE_HDR_21.exec(firstLine);
  if (match21) {
    const [, code, name, date1, date2] = match21;
    const dateStr = date1 > date2 ? date1 : date2;
    return {
      societyCode: code.trim().replace(/^0+/, ""),
      societyName: name.trim(),
      date: parseDate(dateStr),
      version: "21",
    };
  }

  // Try CWR 3.0 header
  const match30 = RE_HDR_30.exec(firstLine);
  if (match30) {
    const [, code, name, date1, date2] = match30;
    const dateStr = date1 > date2 ? date1 : date2;
    return {
      societyCode: code.trim().replace(/^0+/, ""),
      societyName: name.trim(),
      date: parseDate(dateStr),
      version: "30",
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// ISWC extractor
// ---------------------------------------------------------------------------

/**
 * Extract ISWC from the "rest" portion of an ACK record (CWR 3.0).
 * In CWR 3.0, the ISWC appears at position 95-106 of the first line of "rest".
 *
 * Mirrors DMP's validate_iswc() method.
 */
function extractIswcFromRest(rest: string): string | null {
  if (!rest || rest.trim().length === 0) return null;

  const firstLine = rest.trim().split("\n")[0] ?? "";
  if (firstLine.length < 106) return null;

  const iswcRaw = firstLine.substring(95, 106).trim();
  if (!iswcRaw) return null;

  const result = validateIswc(iswcRaw);
  return result.valid ? iswcRaw : null;
}

// ---------------------------------------------------------------------------
// Date parser
// ---------------------------------------------------------------------------

function parseDate(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1;
  const day = parseInt(dateStr.substring(6, 8), 10);
  return new Date(year, month, day);
}

// ---------------------------------------------------------------------------
// Main ACK parser
// ---------------------------------------------------------------------------

/**
 * Parse a CWR ACK file content string.
 *
 * This is the core parser, equivalent to DMP's ACKImportAdmin.process().
 * It does NOT interact with the database — it returns structured data
 * that the caller can use to update WorkAcknowledgement records.
 *
 * @param content - Raw ACK file content (latin1 decoded)
 * @param importIswcs - Whether to extract ISWCs from the file
 * @returns Structured parse result
 *
 * @example
 * ```typescript
 * const content = fs.readFileSync("ACK_FILE.V21", "latin1");
 * const result = parseAckFile(content, true);
 * console.log(result.records); // Array of ParsedAckRecord
 * console.log(result.extractedIswcs); // Map<workId, iswc>
 * ```
 */
export function parseAckFile(
  content: string,
  importIswcs = false
): AckProcessResult {
  const errors: string[] = [];
  const records: ParsedAckRecord[] = [];
  const unknownWorkIds: string[] = [];
  const extractedIswcs = new Map<string, string>();
  const iswcConflicts: IswcConflict[] = [];

  // Parse header
  const metadata = parseAckHeader(content);
  if (!metadata) {
    return {
      metadata: {
        societyCode: "",
        societyName: "",
        date: new Date(),
        version: "21",
      },
      records: [],
      unknownWorkIds: [],
      extractedIswcs,
      iswcConflicts: [],
      errors: ["Could not parse CWR ACK header. Invalid file format."],
    };
  }

  // Normalise line endings
  const normalised = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Select pattern based on version
  const pattern = metadata.version === "21" ? RE_ACK_21 : RE_ACK_30;

  // Reset regex lastIndex
  pattern.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(normalised)) !== null) {
    const [, transactionType, rawWorkId, rawRemoteWorkId, rawDate, status, rest] = match;

    const workId = rawWorkId.trim();
    const remoteWorkId = rawRemoteWorkId.trim();
    const date = parseDate(rawDate.trim());
    const ackStatus = status.trim() as AckStatus;

    if (!workId) continue;

    // Extract ISWC if requested
    let iswc: string | undefined;
    if (importIswcs && rest) {
      const extracted = extractIswcFromRest(rest);
      if (extracted) {
        iswc = extracted;
        extractedIswcs.set(workId, extracted);
      }
    }

    records.push({
      transactionType: transactionType.trim(),
      workId,
      remoteWorkId,
      date,
      status: ackStatus,
      iswc,
    });
  }

  // CWR 2.1: also parse ISW records for ISWC extraction
  if (metadata.version === "21" && importIswcs) {
    RE_ISW_21.lastIndex = 0;
    let iswMatch: RegExpExecArray | null;
    while ((iswMatch = RE_ISW_21.exec(normalised)) !== null) {
      const [, rawWorkId, rawIswc] = iswMatch;
      const workId = rawWorkId.trim();
      const iswcRaw = rawIswc.trim();

      if (!workId || !iswcRaw) continue;

      const validation = validateIswc(iswcRaw);
      if (!validation.valid) continue;

      // Check for conflict with already-extracted ISWC
      const existing = extractedIswcs.get(workId);
      if (existing && existing !== iswcRaw) {
        iswcConflicts.push({
          workId,
          existingIswc: existing,
          newIswc: iswcRaw,
        });
        errors.push(
          `ISWC conflict for work ${workId}: existing ${existing} vs new ${iswcRaw}. Existing kept.`
        );
      } else if (!existing) {
        extractedIswcs.set(workId, iswcRaw);
      }
    }
  }

  return {
    metadata,
    records,
    unknownWorkIds,
    extractedIswcs,
    iswcConflicts,
    errors,
  };
}

// ---------------------------------------------------------------------------
// ISWC conflict detector
// ---------------------------------------------------------------------------

/**
 * Check for ISWC conflicts against an existing work map.
 *
 * Given a map of workId → existingIswc (from the database),
 * and the newly extracted ISWCs from an ACK file,
 * returns conflicts where the new ISWC differs from the existing one.
 *
 * Mirrors DMP's conflict detection in ACKImportAdmin.process().
 *
 * @param existingIswcs - Map of workId → current ISWC in database
 * @param extractedIswcs - Map of workId → ISWC from ACK file
 */
export function detectIswcConflicts(
  existingIswcs: Map<string, string>,
  extractedIswcs: Map<string, string>
): IswcConflict[] {
  const conflicts: IswcConflict[] = [];

  for (const [workId, newIswc] of extractedIswcs) {
    const existing = existingIswcs.get(workId);
    if (existing && existing.toLowerCase() !== newIswc.toLowerCase()) {
      conflicts.push({ workId, existingIswc: existing, newIswc });
    }
  }

  return conflicts;
}

/**
 * Check for duplicate ISWC usage across different works.
 *
 * One ISWC cannot be assigned to two different works.
 * Mirrors DMP's duplicate detection in ACKImportAdmin.process().
 *
 * @param existingWorksByIswc - Map of iswc → workId (all works in database)
 * @param extractedIswcs - Map of workId → ISWC from ACK file
 * @returns Array of { iswc, existingWorkId, newWorkId } conflicts
 */
export function detectDuplicateIswcs(
  existingWorksByIswc: Map<string, string>,
  extractedIswcs: Map<string, string>
): Array<{ iswc: string; existingWorkId: string; newWorkId: string }> {
  const duplicates: Array<{
    iswc: string;
    existingWorkId: string;
    newWorkId: string;
  }> = [];

  for (const [workId, iswc] of extractedIswcs) {
    const existingWorkId = existingWorksByIswc.get(iswc.toLowerCase());
    if (existingWorkId && existingWorkId !== workId) {
      duplicates.push({ iswc, existingWorkId, newWorkId: workId });
    }
  }

  return duplicates;
}

// ---------------------------------------------------------------------------
// Filename validator (mirrors DMP's ACKImportForm.clean())
// ---------------------------------------------------------------------------

/**
 * Validate a CWR ACK filename format.
 *
 * Valid formats:
 *   - 18-19 characters total
 *   - Extension: .V21 or .V22 (case-insensitive)
 *
 * @example isValidAckFilename("SOCIETY_ACK.V21") // true
 */
export function isValidAckFilename(filename: string): boolean {
  if (filename.length < 18 || filename.length > 19) return false;
  const ext = filename.slice(-4).toUpperCase();
  return ext === ".V21" || ext === ".V22";
}

// ---------------------------------------------------------------------------
// Status display helper
// ---------------------------------------------------------------------------

const ACK_STATUS_LABELS: Record<string, string> = {
  RA: "Registration Accepted",
  AS: "Accepted with Changes",
  AC: "Conflict",
  DU: "Duplicate",
  NP: "Not Processed",
  RC: "Registration Conflict",
  RE: "Rejected",
  TE: "Transaction Error",
  WA: "Work Accepted",
};

/**
 * Get a human-readable label for an ACK status code.
 */
export function getAckStatusLabel(status: string): string {
  return ACK_STATUS_LABELS[status] ?? status;
}

// ---------------------------------------------------------------------------
// Report generator
// ---------------------------------------------------------------------------

/**
 * Generate an HTML report from ACK parse results.
 * Mirrors DMP's HTML report generation in ACKImportAdmin.process().
 *
 * @param result - The parse result from parseAckFile()
 * @param workTitles - Optional map of workId → title for display
 */
export function generateAckReport(
  result: AckProcessResult,
  workTitles?: Map<string, string>
): string {
  let report = "";

  for (const record of result.records) {
    const title = workTitles?.get(record.workId) ?? record.workId;
    const statusLabel = getAckStatusLabel(record.status);
    const dateStr = record.date.toISOString().split("T")[0];
    report += `<strong>${title}</strong> (${record.workId}) — ${statusLabel} [${dateStr}]<br/>\n`;
  }

  if (result.iswcConflicts.length > 0) {
    report += `<br/>\n<strong>ISWC Conflicts:</strong><br/>\n`;
    for (const conflict of result.iswcConflicts) {
      report += `Work ${conflict.workId}: existing ISWC ${conflict.existingIswc} conflicts with new ${conflict.newIswc}. Existing kept.<br/>\n`;
    }
  }

  if (result.unknownWorkIds.length > 0) {
    report += `<br/>\n<strong>Unknown Work IDs:</strong> ${result.unknownWorkIds.join(", ")}<br/>\n`;
  }

  if (result.errors.length > 0) {
    report += `<br/>\n<strong>Errors:</strong><br/>\n`;
    for (const error of result.errors) {
      report += `${error}<br/>\n`;
    }
  }

  return report;
}