/**
 * CWR (Common Works Registration) Type Definitions
 *
 * Covers CWR versions 2.1, 2.2, 3.0, and 3.1
 * Based on CISAC CWR specification and DMP's model design.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type CwrVersion = "21" | "22" | "30" | "31";

export type TransactionType = "NWR" | "REV";

/** Writer capacity codes (CWR standard) */
export type WriterCapacity =
  | "C " // Composer
  | "A " // Author/Lyricist
  | "CA" // Composer & Author
  | "AR" // Arranger
  | "AD" // Adaptor
  | "TR" // Translator
  | "ES" // Composer of sampled excerpt
  | "E " // Original publisher
  | "SE" // Sub-publisher
  | "PA" // Income participant
  | "AQ" // Acquirer
  | "AM" // Administrator
  | "  "; // Unknown

/** Publisher role codes */
export type PublisherRole = "E " | "SE" | "ES" | "AM" | "AQ" | "PA";

/** CWR transaction status */
export type AckStatus =
  | "RA" // Registration Accepted
  | "AS" // Accepted with changes
  | "AC" // Conflict
  | "DU" // Duplicate
  | "NP" // Not Processed
  | "RC" // Registration Conflict
  | "RE" // Rejected
  | "TE" // Transaction Error
  | "WA"; // Work Accepted

// ---------------------------------------------------------------------------
// Society / Territory
// ---------------------------------------------------------------------------

export interface Society {
  /** TIS-N code (e.g. "010" for ASCAP) */
  code: string;
  /** Full name (e.g. "ASCAP (US)") */
  name: string;
}

// ---------------------------------------------------------------------------
// Publisher
// ---------------------------------------------------------------------------

export interface CwrPublisher {
  /** Publisher code (up to 9 chars) */
  code: string;
  /** Publisher name (up to 45 chars) */
  name: string;
  /** IPI Name Number (11 digits) */
  ipiNameNumber?: string;
  /** IPI Base Number (I-NNNNNNNNN-C) */
  ipiBaseNumber?: string;
  /** PR society code */
  prSociety?: string;
  /** MR society code */
  mrSociety?: string;
  /** SR society code */
  srSociety?: string;
  /** PR share (0-100) */
  prShare?: number;
  /** MR share (0-100) */
  mrShare?: number;
  /** SR share (0-100) */
  srShare?: number;
  /** Publisher role */
  role?: PublisherRole;
  /** Society-Assigned Agreement Number */
  saan?: string;
  /** USA license indicator */
  usaLicense?: string;
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

export interface CwrWriter {
  /** Writer code (up to 9 chars) */
  code?: string;
  /** Last name (up to 45 chars) */
  lastName: string;
  /** First name (up to 30 chars) */
  firstName?: string;
  /** IPI Name Number (11 digits) */
  ipiNameNumber?: string;
  /** IPI Base Number */
  ipiBaseNumber?: string;
  /** Writer capacity/role */
  capacity: WriterCapacity;
  /** PR society code */
  prSociety?: string;
  /** MR society code */
  mrSociety?: string;
  /** SR society code */
  srSociety?: string;
  /** PR share (0-100) */
  prShare?: number;
  /** MR share (0-100) */
  mrShare?: number;
  /** SR share (0-100) */
  srShare?: number;
  /** Whether this writer is controlled by the publisher */
  controlled: boolean;
  /** Society-Assigned Agreement Number */
  saan?: string;
  /** Publisher fee percentage (0-100) */
  publisherFee?: number;
  /** Relative manuscript share (0-100) */
  relativeShare: number;
  /** Linked publisher code for PWR record */
  publisherCode?: string;
  /** Linked publisher name for PWR record */
  publisherName?: string;
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

export interface CwrRecording {
  /** ISRC */
  isrc?: string;
  /** Recording title (up to 60 chars) */
  recordingTitle?: string;
  /** Version title */
  versionTitle?: string;
  /** Duration as HH:MM:SS or seconds */
  duration?: string | number;
  /** Release date YYYYMMDD */
  releaseDate?: string;
  /** Record label name */
  recordLabel?: string;
  /** Artist last name */
  artistLastName?: string;
  /** Artist first name */
  artistFirstName?: string;
  /** Artist ISNI */
  artistIsni?: string;
}

// ---------------------------------------------------------------------------
// Alternate Title
// ---------------------------------------------------------------------------

export interface CwrAlternateTitle {
  /** Alternate title text (up to 60 chars) */
  title: string;
  /**
   * Title type:
   *   AT = Alternative Title
   *   OT = Original Title
   *   TT = Translated Title
   *   FT = Formal Title
   *   IT = Incorrect Title
   *   OL = Original Language Title
   *   AL = Alternative Language Title
   */
  titleType?: "AT" | "OT" | "TT" | "FT" | "IT" | "OL" | "AL";
}

// ---------------------------------------------------------------------------
// Cross Reference
// ---------------------------------------------------------------------------

export interface CwrCrossReference {
  /** Society/organisation code */
  organisationCode: string;
  /** Work identifier at that organisation */
  identifier: string;
  /** Identifier type (e.g. "ISWC", "ISRC") */
  identifierType?: string;
}

// ---------------------------------------------------------------------------
// Work (main transaction entity)
// ---------------------------------------------------------------------------

export interface CwrWork {
  /** Internal work code (up to 14 chars) */
  code: string;
  /** Work title (up to 60 chars) */
  title: string;
  /** ISWC (T-NNNNNNNNN-C) */
  iswc?: string;
  /**
   * Version type:
   *   ORI = Original work
   *   MOD = Modified work
   */
  versionType?: "ORI" | "MOD";
  /** Original title (for MOD works) */
  originalTitle?: string;
  /** Duration as HH:MM:SS */
  duration?: string;
  /** Whether the work has been recorded */
  recordedIndicator?: "Y" | "N" | "U";
  /** Writers in this work */
  writers: CwrWriter[];
  /** Publisher */
  publisher: CwrPublisher;
  /** Recordings */
  recordings?: CwrRecording[];
  /** Alternate titles */
  alternateTitles?: CwrAlternateTitle[];
  /** Cross references */
  crossReferences?: CwrCrossReference[];
  /** Library/production music origin */
  libraryCode?: string;
  /** CD identifier for library music */
  cdIdentifier?: string;
}

// ---------------------------------------------------------------------------
// File-level options
// ---------------------------------------------------------------------------

export interface CwrFileOptions {
  /** CWR version to generate */
  version: CwrVersion;
  /** Transaction type: NWR (new) or REV (revision) */
  transactionType: TransactionType;
  /** Sender IPI Name Number (11 digits) */
  senderIpiNameNumber: string;
  /** Sender name (up to 45 chars) */
  senderName: string;
  /** Sender code (up to 9 chars) */
  senderCode?: string;
  /** Creation date (defaults to now) */
  creationDate?: Date;
  /** Sequence number within the year */
  sequenceNumber?: number;
}

// ---------------------------------------------------------------------------
// Generated output
// ---------------------------------------------------------------------------

export interface CwrGenerationResult {
  /** The full CWR file content (CRLF line endings) */
  content: string;
  /** Filename following CWR naming convention */
  filename: string;
  /** Number of works included */
  workCount: number;
  /** CWR version used */
  version: CwrVersion;
  /** Transaction type used */
  transactionType: TransactionType;
}

// ---------------------------------------------------------------------------
// ACK parsing types
// ---------------------------------------------------------------------------

export interface AckRecord {
  /** Transaction type from ACK (NWR/REV/WRK) */
  transactionType: string;
  /** Our work ID */
  workId: string;
  /** Society's remote work ID */
  remoteWorkId: string;
  /** Processing date */
  date: Date;
  /** Status code */
  status: AckStatus;
  /** ISWC extracted from ACK (if present) */
  iswc?: string;
}

export interface AckParseResult {
  /** Society code from HDR */
  societyCode: string;
  /** Society name from HDR */
  societyName: string;
  /** File date */
  date: Date;
  /** Parsed ACK records */
  records: AckRecord[];
  /** Work IDs not found in our system */
  unknownWorkIds: string[];
  /** HTML report */
  report: string;
}