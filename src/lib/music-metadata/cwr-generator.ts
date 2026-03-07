/**
 * CWR Generation Service
 *
 * Ported and significantly enhanced from Django Music Publisher (DMP) cwr_templates.py
 * Supports CWR versions 2.1, 2.2, 3.0, and 3.1.
 *
 * Architecture mirrors DMP's template-based approach, translated to TypeScript
 * template literals with formatting helpers.
 *
 * Record types generated:
 *   HDR  — Transmission Header
 *   GRH  — Group Header
 *   NWR  — New Work Registration  (or REV for revisions)
 *   SPU  — Publisher Control (Sub-Publisher)
 *   SPT  — Publisher Territory of Control
 *   SWR  — Writer Control
 *   SWT  — Writer Territory of Control
 *   PWR  — Publisher for Writer
 *   ALT  — Alternate Title
 *   REC  — Recording Detail
 *   ORN  — Work Origin (library music)
 *   XRF  — Cross Reference
 *   GRT  — Group Trailer
 *   TRL  — Transmission Trailer
 */

import type {
  CwrWork,
  CwrWriter,
  CwrPublisher,
  CwrRecording,
  CwrAlternateTitle,
  CwrCrossReference,
  CwrFileOptions,
  CwrGenerationResult,
  CwrVersion,
} from "./cwr-types";

// ---------------------------------------------------------------------------
// Formatting helpers (mirrors DMP's template filters)
// ---------------------------------------------------------------------------

/** Pad/truncate string to fixed width, right-padded with spaces */
function padR(str: string | null | undefined, len: number): string {
  return ((str ?? "").substring(0, len)).padEnd(len, " ");
}

/** Pad/truncate string to fixed width, left-padded with spaces */
function padL(str: string | null | undefined, len: number): string {
  return ((str ?? "").substring(0, len)).padStart(len, " ");
}

/** Pad/truncate number string to fixed width, left-padded with zeros */
function padZ(str: string | number | null | undefined, len: number): string {
  return String(str ?? "").substring(0, len).padStart(len, "0");
}

/**
 * Format a share value (0-100) to CWR 5-char format.
 * CWR represents shares as integers with 2 implied decimal places.
 * e.g. 50.00% → "05000", 100.00% → "10000"
 * Mirrors DMP's `cwrshare` template filter.
 */
function cwrShare(share: number | undefined | null): string {
  const val = Math.round((share ?? 0) * 100);
  return String(val).padStart(5, "0");
}

/**
 * Format a society code to 3-char CWR format.
 * Mirrors DMP's `soc` template filter.
 */
function cwrSoc(code: string | undefined | null): string {
  if (!code) return "   ";
  return code.padStart(3, "0").substring(0, 3);
}

/**
 * Format a date to YYYYMMDD.
 */
function cwrDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Format a time to HHMMSS.
 */
function cwrTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}${m}${s}`;
}

/**
 * Format duration to HHMMSS.
 * Accepts "HH:MM:SS", seconds as number, or "HHMMSS".
 */
function cwrDuration(duration: string | number | undefined | null): string {
  if (!duration) return "000000";
  if (typeof duration === "number") {
    const h = Math.floor(duration / 3600);
    const m = Math.floor((duration % 3600) / 60);
    const s = duration % 60;
    return `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}${String(s).padStart(2, "0")}`;
  }
  // HH:MM:SS format
  if (duration.includes(":")) {
    return duration.replace(/:/g, "").padStart(6, "0").substring(0, 6);
  }
  return duration.padStart(6, "0").substring(0, 6);
}

/** CRLF line ending as required by CWR spec */
const CRLF = "\r\n";

// ---------------------------------------------------------------------------
// CWR 2.1 / 2.2 Record Templates
// ---------------------------------------------------------------------------

/** HDR — Transmission Header (CWR 2.1/2.2) */
function hdr21(
  ipiNameNumber: string,
  senderName: string,
  creationDate: Date,
  version: "21" | "22"
): string {
  const versionStr = version === "22" ? "02.20" : "01.10";
  // CWR 2.1 rev 8 uses 11-digit IPI without sender type prefix
  const ipi = padL(ipiNameNumber.slice(-9), 9); // use last 9 digits for 9-char field
  return (
    `HDRPB${padL(ipiNameNumber, 11).slice(2)}` +
    `${padR(senderName, 45)}${versionStr}` +
    `${cwrDate(creationDate)}${cwrTime(creationDate)}` +
    `${cwrDate(creationDate)}               ` +
    CRLF
  );
}

/** GRH — Group Header (CWR 2.1/2.2) */
function grh21(transactionType: string): string {
  return `GRH${padR(transactionType, 3)}0000102.10` + `0000000000  ` + CRLF;
}

/** NWR/REV — Work Registration (CWR 2.1/2.2) */
function nwr21(
  recordType: string,
  transactionSeq: number,
  work: CwrWork
): string {
  const versionType = work.versionType ?? (work.originalTitle ? "MOD" : "ORI");
  const recordedIndicator = work.recordedIndicator ?? (work.recordings?.length ? "Y" : "U");
  return (
    `${padR(recordType, 3)}` +
    `${padZ(transactionSeq, 8)}00000000` +
    `${padR(work.title, 60)}  ` +
    `${padR(work.code, 14)}` +
    `${padR(work.iswc ?? "", 11)}00000000            UNC` +
    `${cwrDuration(work.duration)}${recordedIndicator}` +
    `      ${padR(versionType === "MOD" ? "MOD" : "ORI", 3)}  ` +
    " ".repeat(40) +
    `N00000000000` +
    " ".repeat(51) +
    `N` +
    CRLF
  );
}

/** SPU — Publisher Control (CWR 2.1/2.2) */
function spu21(
  transactionSeq: number,
  recordSeq: number,
  chainSeq: number,
  pub: CwrPublisher
): string {
  return (
    `SPU${padZ(transactionSeq, 8)}` +
    `${padZ(recordSeq, 8)}${padZ(chainSeq, 2)}` +
    `${padR(pub.code, 9)}` +
    `${padR(pub.name, 45)}` +
    ` ${padR(pub.role ?? "E ", 2)}` +
    `000000000${padL(pub.ipiNameNumber ?? "", 11)}              ` +
    `${cwrSoc(pub.prSociety)}${cwrShare(pub.prShare)}` +
    `${cwrSoc(pub.mrSociety)}${cwrShare(pub.mrShare)}` +
    `${cwrSoc(pub.srSociety)}${cwrShare(pub.srShare)}` +
    ` N ${padR(pub.ipiBaseNumber ?? "", 13)}` +
    `              ${padR(pub.saan ?? "", 14)}  ` +
    `${padR(pub.usaLicense ?? "", 1)}` +
    CRLF
  );
}

/** SPT — Publisher Territory of Control (CWR 2.1/2.2) */
function spt21(
  transactionSeq: number,
  recordSeq: number,
  pub: CwrPublisher
): string {
  return (
    `SPT${padZ(transactionSeq, 8)}` +
    `${padZ(recordSeq, 8)}${padR(pub.code, 9)}` +
    `      ${cwrShare(pub.prShare)}` +
    `${cwrShare(pub.mrShare)}` +
    `${cwrShare(pub.srShare)}` +
    `I2136N001` +
    CRLF
  );
}

/** SWR — Writer Control (CWR 2.1/2.2) */
function swr21(
  transactionSeq: number,
  recordSeq: number,
  writer: CwrWriter
): string {
  return (
    `SWR${padZ(transactionSeq, 8)}` +
    `${padZ(recordSeq, 8)}${padR(writer.code ?? "", 9)}` +
    `${padR(writer.lastName, 45)}${padR(writer.firstName ?? "", 30)} ` +
    `${padR(writer.capacity, 2)}000000000${padL(writer.ipiNameNumber ?? "", 11)}` +
    `${cwrSoc(writer.prSociety)}${cwrShare(writer.prShare)}` +
    `${cwrSoc(writer.mrSociety)}${cwrShare(writer.mrShare)}` +
    `${cwrSoc(writer.srSociety)}${cwrShare(writer.srShare)}` +
    ` N  ${padR(writer.ipiBaseNumber ?? "", 13)}             ` +
    CRLF
  );
}

/** SWT — Writer Territory of Control (CWR 2.1/2.2) */
function swt21(
  transactionSeq: number,
  recordSeq: number,
  writer: CwrWriter
): string {
  return (
    `SWT${padZ(transactionSeq, 8)}` +
    `${padZ(recordSeq, 8)}${padR(writer.code ?? "", 9)}` +
    `${cwrShare(writer.prShare)}` +
    `${cwrShare(writer.mrShare)}` +
    `${cwrShare(writer.srShare)}I2136N001` +
    CRLF
  );
}

/** PWR — Publisher for Writer (CWR 2.1/2.2) */
function pwr21(
  transactionSeq: number,
  recordSeq: number,
  pub: CwrPublisher,
  writer: CwrWriter
): string {
  return (
    `PWR${padZ(transactionSeq, 8)}` +
    `${padZ(recordSeq, 8)}${padR(pub.code, 9)}` +
    `${padR(pub.name, 45)}              ` +
    `${padR(writer.saan ?? "", 14)}` +
    `${padR(writer.code ?? "", 9)}` +
    CRLF
  );
}

/** ALT — Alternate Title (CWR 2.1/2.2) */
function alt21(
  transactionSeq: number,
  recordSeq: number,
  alt: CwrAlternateTitle
): string {
  return (
    `ALT${padZ(transactionSeq, 8)}` +
    `${padZ(recordSeq, 8)}` +
    `${padR(alt.title, 60)}` +
    `${padR(alt.titleType ?? "AT", 2)}  ` +
    CRLF
  );
}

/** REC — Recording Detail (CWR 2.1/2.2) */
function rec21(
  transactionSeq: number,
  recordSeq: number,
  rec: CwrRecording
): string {
  return (
    `REC${padZ(transactionSeq, 8)}` +
    `${padZ(recordSeq, 8)}` +
    `${padR(rec.releaseDate ?? "", 8)}` +
    " ".repeat(60) + // release title (not used at recording level)
    `${padR(rec.isrc ?? "", 12)}` +
    " ".repeat(60) + // album title
    " ".repeat(18) + // album label
    `${padZ("", 4)}` + // album ID
    `${cwrDuration(rec.duration)}` +
    `${padR(rec.recordLabel ?? "", 60)}` +
    `${padR(rec.artistLastName ?? "", 45)}` +
    `${padR(rec.artistFirstName ?? "", 30)}` +
    " ".repeat(9) + // ISNI
    CRLF
  );
}

/** ORN — Work Origin (CWR 2.1/2.2, library/production music) */
function orn21(
  transactionSeq: number,
  recordSeq: number,
  work: CwrWork
): string {
  return (
    `ORN${padZ(transactionSeq, 8)}` +
    `${padZ(recordSeq, 8)}` +
    `LIB` + // library indicator
    `${padR(work.libraryCode ?? "", 60)}` +
    " ".repeat(60) + // production title
    " ".repeat(60) + // CD identifier
    `${padR(work.cdIdentifier ?? "", 15)}` +
    " ".repeat(15) + // cut number
    CRLF
  );
}

/** XRF — Cross Reference (CWR 2.1/2.2) */
function xrf21(
  transactionSeq: number,
  recordSeq: number,
  xrf: CwrCrossReference
): string {
  return (
    `XRF${padZ(transactionSeq, 8)}` +
    `${padZ(recordSeq, 8)}` +
    `${padR(xrf.organisationCode, 3)}` +
    `${padR(xrf.identifier, 14)}` +
    `${padR(xrf.identifierType ?? "ISWC", 3)}` +
    ` ` +
    CRLF
  );
}

/** GRT — Group Trailer (CWR 2.1/2.2) */
function grt21(transactionType: string, transactionCount: number, recordCount: number): string {
  return (
    `GRT${padR(transactionType, 3)}` +
    `${padZ(transactionCount, 8)}` +
    `${padZ(recordCount, 8)}` +
    `0000000000  ` +
    CRLF
  );
}

/** TRL — Transmission Trailer (CWR 2.1/2.2) */
function trl21(groupCount: number, transactionCount: number, recordCount: number): string {
  return (
    `TRL${padZ(groupCount, 5)}` +
    `${padZ(transactionCount, 8)}` +
    `${padZ(recordCount, 8)}` +
    CRLF
  );
}

// ---------------------------------------------------------------------------
// CWR 3.0 / 3.1 Record Templates
// (CWR 3.x uses different field layouts and longer records)
// ---------------------------------------------------------------------------

/** HDR — Transmission Header (CWR 3.0/3.1) */
function hdr30(
  ipiNameNumber: string,
  senderName: string,
  creationDate: Date,
  version: "30" | "31"
): string {
  const versionStr = version === "31" ? "3.1000" : "3.0000";
  return (
    `HDRSO${padR(ipiNameNumber.slice(0, 4), 4)}` +
    `${padR(senderName, 45)}` +
    `${cwrDate(creationDate)}${cwrTime(creationDate)}` +
    `${cwrDate(creationDate)}` +
    " ".repeat(15) +
    `${versionStr}` +
    CRLF
  );
}

/** GRH — Group Header (CWR 3.0/3.1) */
function grh30(transactionType: string): string {
  return `GRH${padR(transactionType, 3)}000013.0000000000000  ` + CRLF;
}

/** WRK — Work Registration (CWR 3.0/3.1, replaces NWR/REV) */
function wrk30(
  transactionSeq: number,
  work: CwrWork
): string {
  const versionType = work.versionType ?? (work.originalTitle ? "MOD" : "ORI");
  const recordedIndicator = work.recordedIndicator ?? (work.recordings?.length ? "Y" : "U");
  return (
    `WRK${padZ(transactionSeq, 8)}00000000` +
    `${padR(work.title, 60)}  ` +
    `${padR(work.code, 14)}` +
    `${padR(work.iswc ?? "", 11)}00000000            UNC` +
    `${cwrDuration(work.duration)}${recordedIndicator}` +
    `      ${padR(versionType === "MOD" ? "MOD" : "ORI", 3)}  ` +
    " ".repeat(40) +
    `N00000000000` +
    " ".repeat(51) +
    `N` +
    CRLF
  );
}

// CWR 3.0 uses same SPU/SPT/SWR/SWT/PWR/ALT/REC/XRF structure as 2.x
// with minor field adjustments — reuse 2.1 functions for these records

/** GRT — Group Trailer (CWR 3.0/3.1) */
function grt30(transactionCount: number, recordCount: number): string {
  return (
    `GRTWRK${padZ(transactionCount, 8)}` +
    `${padZ(recordCount, 8)}` +
    `0000000000  ` +
    CRLF
  );
}

/** TRL — Transmission Trailer (CWR 3.0/3.1) */
function trl30(groupCount: number, transactionCount: number, recordCount: number): string {
  return (
    `TRL${padZ(groupCount, 5)}` +
    `${padZ(transactionCount, 8)}` +
    `${padZ(recordCount, 8)}` +
    CRLF
  );
}

// ---------------------------------------------------------------------------
// CWR Filename Generator
// ---------------------------------------------------------------------------

/**
 * Generate a CWR filename following the CISAC naming convention.
 *
 * Format: CW + YY + NNNN + SENDER + VV
 *   YY     — 2-digit year
 *   NNNN   — 4-digit sequence number
 *   SENDER — sender code (up to 9 chars)
 *   VV     — version suffix (.V21, .V22, .V30, .V31)
 *
 * @example "CW2400010MYCO.V21"
 */
export function generateFilename(
  version: CwrVersion,
  senderCode: string,
  sequenceNumber: number,
  date: Date
): string {
  const year = String(date.getFullYear()).slice(-2);
  const seq = padZ(sequenceNumber, 4);
  const sender = padR(senderCode, 9).trimEnd();
  const ext = `.V${version.toUpperCase()}`;
  return `CW${year}${seq}${sender}${ext}`;
}

// ---------------------------------------------------------------------------
// Work Transaction Builder
// ---------------------------------------------------------------------------

/**
 * Build all records for a single work transaction.
 * Returns array of record strings and the total record count.
 */
function buildWorkTransaction(
  version: CwrVersion,
  transactionType: string,
  transactionSeq: number,
  work: CwrWork
): { lines: string[]; recordCount: number } {
  const lines: string[] = [];
  let recordSeq = 0;
  const is30 = version === "30" || version === "31";

  // NWR/REV/WRK record
  if (is30) {
    lines.push(wrk30(transactionSeq, work));
  } else {
    lines.push(nwr21(transactionType, transactionSeq, work));
  }
  recordSeq++;

  // SPU — Publisher (chain sequence 1 = original publisher)
  lines.push(spu21(transactionSeq, recordSeq++, 1, work.publisher));

  // SPT — Publisher territory (World = I2136)
  lines.push(spt21(transactionSeq, recordSeq++, work.publisher));

  // SWR + SWT + PWR for each writer
  for (const writer of work.writers) {
    lines.push(swr21(transactionSeq, recordSeq++, writer));

    if (writer.controlled) {
      lines.push(swt21(transactionSeq, recordSeq++, writer));
      lines.push(pwr21(transactionSeq, recordSeq++, work.publisher, writer));
    }
  }

  // ALT — Alternate titles
  for (const alt of work.alternateTitles ?? []) {
    lines.push(alt21(transactionSeq, recordSeq++, alt));
  }

  // REC — Recordings
  for (const rec of work.recordings ?? []) {
    lines.push(rec21(transactionSeq, recordSeq++, rec));
  }

  // ORN — Library origin (production music only)
  if (work.libraryCode || work.cdIdentifier) {
    lines.push(orn21(transactionSeq, recordSeq++, work));
  }

  // XRF — Cross references
  for (const xrf of work.crossReferences ?? []) {
    lines.push(xrf21(transactionSeq, recordSeq++, xrf));
  }

  return { lines, recordCount: recordSeq };
}

// ---------------------------------------------------------------------------
// Main CWR Generator
// ---------------------------------------------------------------------------

/**
 * Generate a complete CWR file for a set of works.
 *
 * Supports CWR 2.1, 2.2, 3.0, and 3.1.
 * Mirrors DMP's CWRExport.create_cwr() method.
 *
 * @example
 * ```typescript
 * const result = generateCwr(works, {
 *   version: "21",
 *   transactionType: "NWR",
 *   senderIpiNameNumber: "00014107338",
 *   senderName: "MY PUBLISHING CO",
 *   senderCode: "MYPUB",
 * });
 * // result.content — full CWR file text
 * // result.filename — e.g. "CW2400010MYPUB.V21"
 * ```
 */
export function generateCwr(
  works: CwrWork[],
  options: CwrFileOptions
): CwrGenerationResult {
  const {
    version,
    transactionType,
    senderIpiNameNumber,
    senderName,
    senderCode = "RRADAR",
    sequenceNumber = 1,
  } = options;

  const creationDate = options.creationDate ?? new Date();
  const is30 = version === "30" || version === "31";
  const lines: string[] = [];

  // HDR
  if (is30) {
    lines.push(hdr30(senderIpiNameNumber, senderName, creationDate, version as "30" | "31"));
  } else {
    lines.push(hdr21(senderIpiNameNumber, senderName, creationDate, version as "21" | "22"));
  }

  // GRH
  if (is30) {
    lines.push(grh30("WRK"));
  } else {
    lines.push(grh21(transactionType));
  }

  let totalRecordCount = 2; // HDR + GRH
  let transactionCount = 0;

  // Work transactions
  for (let i = 0; i < works.length; i++) {
    const { lines: txLines, recordCount } = buildWorkTransaction(
      version,
      transactionType,
      i,
      works[i]
    );
    lines.push(...txLines);
    totalRecordCount += recordCount;
    transactionCount++;
  }

  // GRT
  if (is30) {
    lines.push(grt30(transactionCount, totalRecordCount));
  } else {
    lines.push(grt21(transactionType, transactionCount, totalRecordCount));
  }
  totalRecordCount++;

  // TRL
  if (is30) {
    lines.push(trl30(1, transactionCount, totalRecordCount));
  } else {
    lines.push(trl21(1, transactionCount, totalRecordCount));
  }

  const content = lines.join(""); // Each line already ends with CRLF
  const filename = generateFilename(version, senderCode, sequenceNumber, creationDate);

  return {
    content,
    filename,
    workCount: works.length,
    version,
    transactionType,
  };
}

// ---------------------------------------------------------------------------
// Convenience: build CwrWork from RoyaltyRadar Prisma models
// ---------------------------------------------------------------------------

export interface RRWorkInput {
  id: string;
  title: string;
  iswc?: string | null;
  writers: Array<{
    writer: {
      id: string;
      name: string;
      ipiCae?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      prSociety?: string | null;
    };
    splitPercent: number;
    role?: string | null;
    controlled?: boolean;
    saan?: string | null;
  }>;
  recordings?: Array<{
    isrc?: string | null;
    title: string;
    durationSec?: number | null;
  }>;
}

export interface RRPublisherInput {
  code: string;
  name: string;
  ipiNameNumber?: string;
  prSociety?: string;
  prShare?: number;
  mrShare?: number;
  srShare?: number;
}

/**
 * Convert a RoyaltyRadar work (from Prisma) to a CwrWork for generation.
 *
 * @example
 * ```typescript
 * const cwrWork = rrWorkToCwrWork(prismaWork, publisher);
 * const result = generateCwr([cwrWork], options);
 * ```
 */
export function rrWorkToCwrWork(
  work: RRWorkInput,
  publisher: RRPublisherInput
): CwrWork {
  // Derive a stable short code from the work ID (last 14 chars)
  const code = work.id.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(-14).padStart(14, "0");

  const writers: CwrWriter[] = work.writers.map((ww) => {
    const nameParts = ww.writer.name.split(" ");
    const lastName = ww.writer.lastName ?? nameParts.slice(-1)[0] ?? ww.writer.name;
    const firstName = ww.writer.firstName ?? (nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : "");

    // Determine capacity from role string
    const capacity = mapRoleToCapacity(ww.role ?? "C");

    return {
      lastName: lastName.toUpperCase(),
      firstName: firstName.toUpperCase(),
      ipiNameNumber: ww.writer.ipiCae ?? undefined,
      capacity,
      prSociety: ww.writer.prSociety ?? undefined,
      prShare: ww.splitPercent * (1 - (publisher.prShare ?? 0.5) / 100),
      mrShare: ww.splitPercent,
      srShare: ww.splitPercent,
      controlled: ww.controlled ?? false,
      saan: ww.saan ?? undefined,
      relativeShare: ww.splitPercent,
      publisherCode: publisher.code,
      publisherName: publisher.name,
    };
  });

  const recordings = work.recordings?.map((rec) => ({
    isrc: rec.isrc ?? undefined,
    recordingTitle: rec.title.toUpperCase(),
    duration: rec.durationSec ?? undefined,
  }));

  return {
    code,
    title: work.title.toUpperCase(),
    iswc: work.iswc ?? undefined,
    writers,
    publisher: {
      code: publisher.code,
      name: publisher.name,
      ipiNameNumber: publisher.ipiNameNumber,
      prSociety: publisher.prSociety,
      prShare: publisher.prShare ?? 50,
      mrShare: publisher.mrShare ?? 100,
      srShare: publisher.srShare ?? 100,
      role: "E ",
    },
    recordings,
  };
}

/**
 * Map a role string to a CWR WriterCapacity code.
 */
function mapRoleToCapacity(role: string): import("./cwr-types").WriterCapacity {
  const map: Record<string, import("./cwr-types").WriterCapacity> = {
    C: "C ",
    COMPOSER: "C ",
    A: "A ",
    AUTHOR: "A ",
    LYRICIST: "A ",
    CA: "CA",
    "COMPOSER/AUTHOR": "CA",
    AR: "AR",
    ARRANGER: "AR",
    AD: "AD",
    ADAPTOR: "AD",
    TR: "TR",
    TRANSLATOR: "TR",
    E: "E ",
    PUBLISHER: "E ",
  };
  return map[role.toUpperCase().trim()] ?? "C ";
}

// Re-export types for convenience
export type { CwrWork, CwrWriter, CwrPublisher, CwrFileOptions, CwrGenerationResult };