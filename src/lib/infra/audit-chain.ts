/**
 * Blockchain-Anchored Audit Trail
 *
 * Provides Merkle tree computation, checkpoint creation, and verification
 * for tamper-proof audit logs. Each checkpoint contains a Merkle root
 * of all audit log entries in the period, chained to the previous checkpoint.
 *
 * In production, the anchor step would submit the Merkle root to a
 * blockchain (Ethereum, Polygon, etc.) for immutable timestamping.
 */

import crypto from "crypto";
import { db } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";

// ---------- Merkle Tree ----------

/**
 * Compute SHA-256 hash of a string.
 */
export function sha256(data: string): string {
    return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Compute the hash of an audit log entry.
 * Includes all critical fields to detect any tampering.
 */
export function hashAuditLog(log: {
    id: string;
    action: string;
    details: string;
    evidenceHash: string;
    userId: string | null;
    orgId: string;
    timestamp: Date;
}): string {
    const canonical = JSON.stringify({
        id: log.id,
        action: log.action,
        details: log.details,
        evidenceHash: log.evidenceHash,
        userId: log.userId,
        orgId: log.orgId,
        timestamp: log.timestamp.toISOString(),
    });
    return sha256(canonical);
}

/**
 * Build a Merkle tree from an array of leaf hashes.
 * Returns the Merkle root and the full tree structure for proof generation.
 */
export function buildMerkleTree(leaves: string[]): {
    root: string;
    tree: string[][];
} {
    if (leaves.length === 0) {
        return { root: sha256("EMPTY"), tree: [[]] };
    }

    if (leaves.length === 1) {
        return { root: leaves[0], tree: [leaves] };
    }

    const tree: string[][] = [leaves];
    let currentLevel = [...leaves];

    while (currentLevel.length > 1) {
        const nextLevel: string[] = [];

        for (let i = 0; i < currentLevel.length; i += 2) {
            if (i + 1 < currentLevel.length) {
                // Hash pair of nodes
                nextLevel.push(sha256(currentLevel[i] + currentLevel[i + 1]));
            } else {
                // Odd node — promote to next level
                nextLevel.push(currentLevel[i]);
            }
        }

        tree.push(nextLevel);
        currentLevel = nextLevel;
    }

    return { root: currentLevel[0], tree };
}

/**
 * Generate a Merkle proof for a specific leaf.
 * The proof allows verification that a leaf is part of the tree
 * without needing the entire dataset.
 */
export function generateMerkleProof(
    leafIndex: number,
    tree: string[][],
): Array<{ hash: string; position: "left" | "right" }> {
    const proof: Array<{ hash: string; position: "left" | "right" }> = [];

    let index = leafIndex;

    for (let level = 0; level < tree.length - 1; level++) {
        const currentLevel = tree[level];
        const isRightNode = index % 2 === 1;
        const siblingIndex = isRightNode ? index - 1 : index + 1;

        if (siblingIndex < currentLevel.length) {
            proof.push({
                hash: currentLevel[siblingIndex],
                position: isRightNode ? "left" : "right",
            });
        }

        index = Math.floor(index / 2);
    }

    return proof;
}

/**
 * Verify a Merkle proof for a given leaf hash against a root.
 */
export function verifyMerkleProof(
    leafHash: string,
    proof: Array<{ hash: string; position: "left" | "right" }>,
    root: string,
): boolean {
    let currentHash = leafHash;

    for (const step of proof) {
        if (step.position === "left") {
            currentHash = sha256(step.hash + currentHash);
        } else {
            currentHash = sha256(currentHash + step.hash);
        }
    }

    return currentHash === root;
}

// ---------- Checkpoint Operations ----------

/**
 * Create a new audit checkpoint for an organization.
 * Computes the Merkle root of all audit logs since the last checkpoint.
 */
export async function createCheckpoint(orgId: string): Promise<{
    checkpointId: string;
    merkleRoot: string;
    logCount: number;
    periodStart: Date;
    periodEnd: Date;
}> {
    // Find the last checkpoint for this org
    const lastCheckpoint = await db.auditCheckpoint.findFirst({
        where: { orgId },
        orderBy: { createdAt: "desc" },
    });

    const periodStart = lastCheckpoint?.periodEnd ?? new Date(0);
    const periodEnd = new Date();

    // Fetch all audit logs in the period
    const logs = await db.auditLog.findMany({
        where: {
            orgId,
            timestamp: {
                gt: periodStart,
                lte: periodEnd,
            },
        },
        orderBy: { timestamp: "asc" },
    });

    if (logs.length === 0) {
        throw new Error("No new audit logs to checkpoint");
    }

    // Compute leaf hashes
    const leaves = logs.map((log) => hashAuditLog(log));

    // Build Merkle tree
    const { root } = buildMerkleTree(leaves);

    // Chain to previous checkpoint
    const previousHash = lastCheckpoint?.merkleRoot ?? null;
    const chainedRoot = previousHash ? sha256(previousHash + root) : root;

    // Create checkpoint record
    const checkpoint = await db.auditCheckpoint.create({
        data: {
            orgId,
            merkleRoot: chainedRoot,
            logCount: logs.length,
            periodStart,
            periodEnd,
            previousHash,
            anchorStatus: "PENDING",
            metadata: JSON.stringify({
                rawMerkleRoot: root,
                firstLogId: logs[0].id,
                lastLogId: logs[logs.length - 1].id,
            }),
        },
    });

    logger.info(
        { orgId, checkpointId: checkpoint.id, logCount: logs.length },
        "Audit checkpoint created",
    );

    return {
        checkpointId: checkpoint.id,
        merkleRoot: chainedRoot,
        logCount: logs.length,
        periodStart,
        periodEnd,
    };
}

/**
 * Verify the integrity of a checkpoint by recomputing the Merkle root.
 */
export async function verifyCheckpoint(checkpointId: string): Promise<{
    valid: boolean;
    checkpointId: string;
    merkleRoot: string;
    recomputedRoot: string;
    logCount: number;
    chainValid: boolean;
    details: string;
}> {
    const checkpoint = await db.auditCheckpoint.findUnique({
        where: { id: checkpointId },
    });

    if (!checkpoint) {
        throw new Error("Checkpoint not found");
    }

    // Fetch all audit logs in the checkpoint period
    const logs = await db.auditLog.findMany({
        where: {
            orgId: checkpoint.orgId,
            timestamp: {
                gt: checkpoint.periodStart,
                lte: checkpoint.periodEnd,
            },
        },
        orderBy: { timestamp: "asc" },
    });

    // Recompute Merkle root
    const leaves = logs.map((log) => hashAuditLog(log));
    const { root: rawRoot } = buildMerkleTree(leaves);

    // Apply chain linking
    const recomputedRoot = checkpoint.previousHash
        ? sha256(checkpoint.previousHash + rawRoot)
        : rawRoot;

    const rootValid = recomputedRoot === checkpoint.merkleRoot;

    // Verify chain link to previous checkpoint
    let chainValid = true;
    if (checkpoint.previousHash) {
        const prevCheckpoint = await db.auditCheckpoint.findFirst({
            where: {
                orgId: checkpoint.orgId,
                merkleRoot: checkpoint.previousHash,
            },
        });
        chainValid = prevCheckpoint !== null;
    }

    const valid = rootValid && chainValid && logs.length === checkpoint.logCount;

    // Update verification timestamp
    if (valid) {
        await db.auditCheckpoint.update({
            where: { id: checkpointId },
            data: { verifiedAt: new Date() },
        });
    }

    return {
        valid,
        checkpointId: checkpoint.id,
        merkleRoot: checkpoint.merkleRoot,
        recomputedRoot,
        logCount: logs.length,
        chainValid,
        details: valid
            ? `Checkpoint verified: ${logs.length} logs, Merkle root matches, chain intact`
            : `Verification failed: root ${rootValid ? "OK" : "MISMATCH"}, chain ${chainValid ? "OK" : "BROKEN"}, logs ${logs.length}/${checkpoint.logCount}`,
    };
}

/**
 * Export a verification bundle for a checkpoint.
 * This bundle can be independently verified without access to the database.
 */
export async function exportVerificationBundle(checkpointId: string): Promise<{
    checkpoint: {
        id: string;
        merkleRoot: string;
        previousHash: string | null;
        logCount: number;
        periodStart: string;
        periodEnd: string;
        anchorTxHash: string | null;
        anchorChain: string | null;
    };
    logs: Array<{
        id: string;
        action: string;
        details: string;
        evidenceHash: string;
        timestamp: string;
        leafHash: string;
    }>;
    merkleTree: {
        root: string;
        leaves: string[];
    };
    verification: {
        recomputedRoot: string;
        valid: boolean;
        verifiedAt: string;
    };
}> {
    const checkpoint = await db.auditCheckpoint.findUnique({
        where: { id: checkpointId },
    });

    if (!checkpoint) {
        throw new Error("Checkpoint not found");
    }

    const logs = await db.auditLog.findMany({
        where: {
            orgId: checkpoint.orgId,
            timestamp: {
                gt: checkpoint.periodStart,
                lte: checkpoint.periodEnd,
            },
        },
        orderBy: { timestamp: "asc" },
    });

    const leaves = logs.map((log) => hashAuditLog(log));
    const { root: rawRoot } = buildMerkleTree(leaves);
    const recomputedRoot = checkpoint.previousHash
        ? sha256(checkpoint.previousHash + rawRoot)
        : rawRoot;

    return {
        checkpoint: {
            id: checkpoint.id,
            merkleRoot: checkpoint.merkleRoot,
            previousHash: checkpoint.previousHash,
            logCount: checkpoint.logCount,
            periodStart: checkpoint.periodStart.toISOString(),
            periodEnd: checkpoint.periodEnd.toISOString(),
            anchorTxHash: checkpoint.anchorTxHash,
            anchorChain: checkpoint.anchorChain,
        },
        logs: logs.map((log, i) => ({
            id: log.id,
            action: log.action,
            details: log.details,
            evidenceHash: log.evidenceHash,
            timestamp: log.timestamp.toISOString(),
            leafHash: leaves[i],
        })),
        merkleTree: {
            root: recomputedRoot,
            leaves,
        },
        verification: {
            recomputedRoot,
            valid: recomputedRoot === checkpoint.merkleRoot,
            verifiedAt: new Date().toISOString(),
        },
    };
}