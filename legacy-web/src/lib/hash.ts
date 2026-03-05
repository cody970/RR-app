import { createHash } from "crypto";

/**
 * Creates a SHA-256 evidence hash for audit log entries.
 * Optionally chains with the previous hash for tamper-evidence (Merkle chain).
 */
export function createEvidenceHash(details: string, previousHash?: string): string {
    const payload = previousHash
        ? `${previousHash}:${details}`
        : details;

    return createHash("sha256").update(payload).digest("hex");
}
