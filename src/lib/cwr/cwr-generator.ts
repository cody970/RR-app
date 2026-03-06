/**
 * CWR (Common Works Registration) File Generator
 *
 * Generates fixed-width CWR v2.2 files for direct upload to PRO portals.
 * This is the inverse of cwr-parser.ts.
 *
 * Record types generated:
 *   - HDR: Header (file metadata)
 *   - NWR: New Work Registration
 *   - SPU: Publisher Control (interested party)
 *   - SWR: Writer Control (interested party)
 *   - TRL: Trailer
 *
 * Spec: CISAC CWR v2.2
 */

// ---------- Types ----------

export interface CwrWorkInput {
    title: string;
    iswc?: string | null;
    writers: CwrWriterInput[];
    publishers: CwrPublisherInput[];
}

export interface CwrWriterInput {
    firstName: string;
    lastName: string;
    ipiNameNumber?: string;
    role: string; // C, A, CA, AR, etc.
    prAffiliation?: string; // ASCAP, BMI, SESAC
    prShare: number; // 0-100
    mrShare?: number;
}

export interface CwrPublisherInput {
    name: string;
    ipiNameNumber?: string;
    role: string; // E, AM, SE, ES
    prAffiliation?: string;
    prShare: number;
    mrShare?: number;
}

export interface CwrFileOptions {
    senderName: string;
    senderId: string;
    receiverSociety?: string;
    creationDate?: Date;
}

// Society name to CISAC code mapping
const SOCIETY_NAME_TO_CODE: Record<string, string> = {
    ASCAP: "010",
    BMI: "021",
    SESAC: "034",
    PRS: "052",
    GEMA: "058",
    SACEM: "074",
    JASRAC: "089",
    APRA: "101",
    SGAE: "079",
};

// ---------- Formatting Helpers ----------

/** Pad/truncate string to fixed width, right-padded with spaces */
function padRight(str: string, len: number): string {
    return (str || "").substring(0, len).padEnd(len, " ");
}

/** Pad/truncate number string to fixed width, left-padded with zeros */
function padLeft(str: string, len: number): string {
    return (str || "").substring(0, len).padStart(len, "0");
}

/** Format a share value (0-100) to 5-char CWR format (implied 2 decimal places) */
function formatShare(share: number): string {
    const scaled = Math.round(share * 100);
    return padLeft(String(scaled), 5);
}

/** Format date as YYYYMMDD */
function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
}

/** Format time as HHMMSS */
function formatTime(date: Date): string {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${h}${m}${s}`;
}

// ---------- Record Generators ----------

/**
 * Generate HDR (Header) record.
 * CWR v2.2 HDR layout:
 *   Pos 0-2:   Record Type "HDR" (3)
 *   Pos 3-4:   Sender Type "PB" (2) — publisher
 *   Pos 5-13:  Sender ID (9)
 *   Pos 14-58: Sender Name (45)
 *   Pos 59-63: EDI Standard Version "01.10" (5)
 *   Pos 64-68: Creation Date YYMMDD → using 8-char YYYYMMDD (8)
 *   Pos 69-74: Creation Time HHMMSS (6)
 *   Pos 75-79: Transmission Date (8)
 *   Pos 80-84: Character Set "00000" (5)
 */
function generateHDR(options: CwrFileOptions): string {
    const now = options.creationDate || new Date();
    return (
        "HDR" +
        "PB" +
        padRight(options.senderId, 9) +
        padRight(options.senderName, 45) +
        "01.10" +
        formatDate(now) +
        formatTime(now) +
        formatDate(now) +
        padRight("", 5)
    );
}

/**
 * Generate NWR (New Work Registration) record.
 *   Pos 0-2:   Record Type (3)
 *   Pos 3-5:   Transaction Seq (3)
 *   Pos 6-13:  Record Seq (8)
 *   Pos 14-73: Work Title (60)
 *   Pos 74-84: ISWC (11)
 */
function generateNWR(
    transactionSeq: number,
    recordSeq: number,
    work: CwrWorkInput
): string {
    return (
        "NWR" +
        padLeft(String(transactionSeq), 3) +
        padLeft(String(recordSeq), 8) +
        padRight(work.title, 60) +
        padRight(work.iswc || "", 11) +
        padRight("", 13) // remaining fields (language, etc.)
    );
}

/**
 * Generate SPU (Publisher Control) record.
 *   Pos 0-2:   Record Type (3)
 *   Pos 3-5:   Transaction Seq (3)
 *   Pos 6-13:  Record Seq (8)
 *   Pos 14-22: Publisher IP# (9)
 *   Pos 23-67: Publisher Name (45)
 *   Pos 68-76: IPI Name# (9)
 *   Pos 77-79: PR Society (3)
 *   Pos 80-84: PR Share (5, implied 2 decimal)
 *   Pos 85-89: MR Share (5)
 *   Pos 90-91: Publisher Type (2)
 */
function generateSPU(
    transactionSeq: number,
    recordSeq: number,
    publisher: CwrPublisherInput
): string {
    const societyCode =
        SOCIETY_NAME_TO_CODE[publisher.prAffiliation || ""] || "   ";

    return (
        "SPU" +
        padLeft(String(transactionSeq), 3) +
        padLeft(String(recordSeq), 8) +
        padRight(publisher.ipiNameNumber || "", 9) +
        padRight(publisher.name, 45) +
        padRight(publisher.ipiNameNumber || "", 9) +
        padRight(societyCode, 3) +
        formatShare(publisher.prShare) +
        formatShare(publisher.mrShare ?? publisher.prShare) +
        padRight(publisher.role, 2)
    );
}

/**
 * Generate SWR (Writer Control) record.
 *   Pos 0-2:   Record Type (3)
 *   Pos 3-5:   Transaction Seq (3)
 *   Pos 6-13:  Record Seq (8)
 *   Pos 14-22: Writer IP# (9)
 *   Pos 23-67: Writer Last Name (45)
 *   Pos 68-97: Writer First Name (30)
 *   Pos 98-99: Writer Designation (2)
 *   Pos 100-102: PR Society (3)
 *   Pos 103-107: PR Share (5)
 *   Pos 108-112: MR Share (5)
 */
function generateSWR(
    transactionSeq: number,
    recordSeq: number,
    writer: CwrWriterInput
): string {
    const societyCode =
        SOCIETY_NAME_TO_CODE[writer.prAffiliation || ""] || "   ";

    return (
        "SWR" +
        padLeft(String(transactionSeq), 3) +
        padLeft(String(recordSeq), 8) +
        padRight(writer.ipiNameNumber || "", 9) +
        padRight(writer.lastName, 45) +
        padRight(writer.firstName, 30) +
        padRight(writer.role, 2) +
        padRight(societyCode, 3) +
        formatShare(writer.prShare) +
        formatShare(writer.mrShare ?? writer.prShare)
    );
}

/**
 * Generate TRL (Trailer) record.
 *   Pos 0-2:   Record Type (3)
 *   Pos 3-10:  Group count (8)
 *   Pos 11-18: Transaction count (8)
 *   Pos 19-26: Record count (8)
 */
function generateTRL(
    groupCount: number,
    transactionCount: number,
    recordCount: number
): string {
    return (
        "TRL" +
        padLeft(String(groupCount), 8) +
        padLeft(String(transactionCount), 8) +
        padLeft(String(recordCount), 8)
    );
}

// ---------- Public API ----------

/**
 * Generate a complete CWR v2.2 file from a list of works and publisher info.
 *
 * @param works - Array of works with writers and publishers
 * @param options - File metadata (sender name, ID, etc.)
 * @returns CWR file content as a string
 */
export function generateCwrFile(
    works: CwrWorkInput[],
    options: CwrFileOptions
): string {
    const lines: string[] = [];
    let transactionSeq = 0;
    let totalRecords = 0;

    // Header
    lines.push(generateHDR(options));
    totalRecords++;

    // Each work = NWR + SPU(s) + SWR(s)
    for (const work of works) {
        transactionSeq++;
        let recordSeq = 0;

        // NWR record
        recordSeq++;
        lines.push(generateNWR(transactionSeq, recordSeq, work));
        totalRecords++;

        // SPU records for each publisher
        for (const publisher of work.publishers) {
            recordSeq++;
            lines.push(generateSPU(transactionSeq, recordSeq, publisher));
            totalRecords++;
        }

        // SWR records for each writer
        for (const writer of work.writers) {
            recordSeq++;
            lines.push(generateSWR(transactionSeq, recordSeq, writer));
            totalRecords++;
        }
    }

    // Trailer
    lines.push(generateTRL(1, transactionSeq, totalRecords + 1)); // +1 for TRL itself

    return lines.join("\r\n") + "\r\n";
}

/**
 * Generate a CWR file with a default co-publisher setup.
 * Automatically adds the RoyaltyRadar co-publisher entity at the specified split.
 *
 * @param works - Works to register
 * @param publisherName - User's publisher name
 * @param publisherIpi - User's publisher IPI
 * @param coPublisherSplit - Co-publisher share (default 5%)
 * @param options - CWR file options
 */
export function generateCwrWithCoPublisher(
    works: CwrWorkInput[],
    publisherName: string,
    publisherIpi: string,
    coPublisherSplit: number = 5,
    options: CwrFileOptions
): string {
    const artistShare = 100 - coPublisherSplit;

    const enrichedWorks = works.map((work) => ({
        ...work,
        publishers: [
            // Original publisher (the artist/client)
            {
                name: publisherName,
                ipiNameNumber: publisherIpi,
                role: "E" as const, // Original publisher
                prAffiliation: work.publishers[0]?.prAffiliation || "ASCAP",
                prShare: artistShare / 2, // Publisher gets half of their share
                mrShare: artistShare / 2,
            },
            // Co-publisher (RoyaltyRadar / admin entity)
            {
                name: "RoyaltyRadar Publishing",
                ipiNameNumber: process.env.ROYALTYRADAR_IPI || "",
                role: "AM" as const, // Admin publisher
                prAffiliation:
                    work.publishers[0]?.prAffiliation || "ASCAP",
                prShare: coPublisherSplit / 2,
                mrShare: coPublisherSplit / 2,
            },
        ],
    }));

    return generateCwrFile(enrichedWorks, options);
}
