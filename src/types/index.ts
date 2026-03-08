// ─────────────────────────────────────────────
//  Core Domain Models
// ─────────────────────────────────────────────

export interface Finding {
    id: string;
    type: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    status: "OPEN" | "DISPUTED" | "RECOVERED" | "IGNORED";
    confidence: number;
    estimatedImpact: number;
    recoveredAmount?: number;
    resourceType: string;
    resourceId: string;
    orgId: string;
    metadataFix?: string;
    currency?: string;
}

export interface Task {
    id: string;
    findingId: string;
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
    notes?: string;
    finding?: Finding;
}

export interface Work {
    id: string;
    title: string;
    iswc?: string;
    orgId: string;
}

export interface Recording {
    id: string;
    title: string;
    isrc?: string;
    durationSec?: number;
    workId?: string;
    orgId: string;
}

// ─────────────────────────────────────────────
//  Audit & Discrepancies
// ─────────────────────────────────────────────

export type { Discrepancy } from "@/lib/music/discrepancy-engine";
export type { AuditReportData } from "@/lib/reports/pdf-utils";
export type { AnomalyResult, AnomalyDetectionOptions } from "@/lib/finance/anomaly-detection";

// ─────────────────────────────────────────────
//  Catalog & Scanning
// ─────────────────────────────────────────────

export type { ScanProgress, ProgressCallback } from "@/lib/music/catalog-scanner";

// ─────────────────────────────────────────────
//  Statements & Accounting
// ─────────────────────────────────────────────

export type { ParsedStatementLine, ParsedStatement, StatementFormat } from "@/lib/finance/statement-parser";
export type { PayoutStatementData } from "@/lib/finance/accounting-pdf";

// ─────────────────────────────────────────────
//  CWR (Common Works Registration)
// ─────────────────────────────────────────────

export type { CwrRecord } from "@/lib/cwr/cwr-parser";
export type {
    CwrWorkInput,
    CwrWriterInput,
    CwrPublisherInput,
    CwrFileOptions,
} from "@/lib/cwr/cwr-generator";

// ─────────────────────────────────────────────
//  Registration & Licensing
// ─────────────────────────────────────────────

export type {
    RegistrationMethod,
    RegisterWorksInput,
    RegisterFromGapsInput,
    RegistrationResult,
} from "@/lib/infra/registration-service";

// ─────────────────────────────────────────────
//  External Data-Source Clients
// ─────────────────────────────────────────────

// Spotify
export type { SpotifyTrack } from "@/lib/clients/spotify";

// MusicBrainz
export type { MBRecording, MBWork, MBArtist, MBSearchResult } from "@/lib/clients/musicbrainz-client";

// MLC (Mechanical Licensing Collective)
export type { MLCWork, MLCSearchResult } from "@/lib/clients/mlc-client";

// SoundExchange
export type { SERecording, SESearchResult } from "@/lib/clients/soundexchange-client";

// Muso
export type {
    MusoSearchResult,
    MusoTrack,
    MusoAlbum,
    MusoCredit,
    MusoProfile,
    MusoProfileCredits,
    MusoCollaborator,
    MusoRole,
} from "@/lib/clients/muso-client";

// TuneRegistry
export type {
    TuneRegistryWork,
    TuneRegistryWriter,
    TuneRegistryPublisher,
    TuneRegistryRecording,
    RegistrationSubmission,
    RegistrationResponse,
} from "@/lib/clients/tuneregistry-client";

// Songview
export type { SongviewResult } from "@/lib/clients/songview-client";

// Enrichment
export type { EnrichmentMatch } from "@/lib/music/enrichment";

// ─────────────────────────────────────────────
//  Auth & Permissions
// ─────────────────────────────────────────────

export type { Role, Permission } from "@/lib/auth/rbac";

// ─────────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────────

export type { RateLimitOptions } from "@/lib/infra/rate-limit";
export type { NotificationType } from "@/lib/infra/notify";
export type { CurrencyCode } from "@/lib/finance/currency";
export type { TemplateType } from "@/lib/reports/templates";
