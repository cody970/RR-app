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
