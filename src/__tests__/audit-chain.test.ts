import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    sha256,
    hashAuditLog,
    buildMerkleTree,
    generateMerkleProof,
    verifyMerkleProof,
} from '@/lib/infra/audit-chain';

// Tests for the pure cryptographic functions in audit-chain
// Database interactions are mocked for integration tests

describe('Audit Chain - Cryptographic Functions', () => {
    describe('sha256', () => {
        it('should compute consistent SHA-256 hash', () => {
            const hash1 = sha256('test data');
            const hash2 = sha256('test data');
            expect(hash1).toBe(hash2);
        });

        it('should produce different hashes for different inputs', () => {
            const hash1 = sha256('data 1');
            const hash2 = sha256('data 2');
            expect(hash1).not.toBe(hash2);
        });

        it('should produce 64-character hex string', () => {
            const hash = sha256('any input');
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('hashAuditLog', () => {
        it('should produce consistent hash for same log entry', () => {
            const log = {
                id: 'log-123',
                action: 'FINDING_STATUS_UPDATE',
                details: '{"status":"CONFIRMED"}',
                evidenceHash: 'abc123',
                userId: 'user-456',
                orgId: 'org-789',
                timestamp: new Date('2024-01-15T10:00:00Z'),
            };

            const hash1 = hashAuditLog(log);
            const hash2 = hashAuditLog(log);
            expect(hash1).toBe(hash2);
        });

        it('should detect tampering in any field', () => {
            const baseLog = {
                id: 'log-123',
                action: 'FINDING_STATUS_UPDATE',
                details: '{"status":"CONFIRMED"}',
                evidenceHash: 'abc123',
                userId: 'user-456',
                orgId: 'org-789',
                timestamp: new Date('2024-01-15T10:00:00Z'),
            };

            const baseHash = hashAuditLog(baseLog);

            // Tampering with any field should change the hash
            expect(hashAuditLog({ ...baseLog, action: 'MODIFIED' })).not.toBe(baseHash);
            expect(hashAuditLog({ ...baseLog, details: '{"status":"DISPUTED"}' })).not.toBe(baseHash);
            expect(hashAuditLog({ ...baseLog, userId: 'attacker' })).not.toBe(baseHash);
            expect(hashAuditLog({ ...baseLog, timestamp: new Date('2024-01-16T10:00:00Z') })).not.toBe(baseHash);
        });

        it('should handle null userId', () => {
            const log = {
                id: 'log-123',
                action: 'SYSTEM_EVENT',
                details: '{}',
                evidenceHash: 'abc',
                userId: null,
                orgId: 'org-789',
                timestamp: new Date(),
            };

            const hash = hashAuditLog(log);
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('buildMerkleTree', () => {
        it('should handle empty leaves array', () => {
            const { root, tree } = buildMerkleTree([]);
            expect(root).toBe(sha256('EMPTY'));
            expect(tree).toEqual([[]]);
        });

        it('should handle single leaf', () => {
            const leaf = sha256('single entry');
            const { root, tree } = buildMerkleTree([leaf]);
            expect(root).toBe(leaf);
            expect(tree).toEqual([[leaf]]);
        });

        it('should build correct tree for two leaves', () => {
            const leaf1 = sha256('entry 1');
            const leaf2 = sha256('entry 2');
            const { root, tree } = buildMerkleTree([leaf1, leaf2]);

            expect(tree[0]).toEqual([leaf1, leaf2]);
            expect(root).toBe(sha256(leaf1 + leaf2));
        });

        it('should handle odd number of leaves', () => {
            const leaves = [
                sha256('entry 1'),
                sha256('entry 2'),
                sha256('entry 3'),
            ];
            const { root, tree } = buildMerkleTree(leaves);

            expect(tree[0]).toEqual(leaves);
            expect(tree.length).toBeGreaterThan(1);
            expect(root).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should produce same root for same inputs', () => {
            const leaves = [sha256('a'), sha256('b'), sha256('c'), sha256('d')];
            const { root: root1 } = buildMerkleTree(leaves);
            const { root: root2 } = buildMerkleTree([...leaves]);
            expect(root1).toBe(root2);
        });

        it('should produce different root for different inputs', () => {
            const leaves1 = [sha256('a'), sha256('b')];
            const leaves2 = [sha256('c'), sha256('d')];
            const { root: root1 } = buildMerkleTree(leaves1);
            const { root: root2 } = buildMerkleTree(leaves2);
            expect(root1).not.toBe(root2);
        });
    });

    describe('generateMerkleProof & verifyMerkleProof', () => {
        it('should generate valid proof for any leaf', () => {
            const leaves = [
                sha256('log 1'),
                sha256('log 2'),
                sha256('log 3'),
                sha256('log 4'),
            ];
            const { root, tree } = buildMerkleTree(leaves);

            // Test proof for each leaf
            for (let i = 0; i < leaves.length; i++) {
                const proof = generateMerkleProof(i, tree);
                const isValid = verifyMerkleProof(leaves[i], proof, root);
                expect(isValid).toBe(true);
            }
        });

        it('should reject proof with modified leaf', () => {
            const leaves = [sha256('log 1'), sha256('log 2')];
            const { root, tree } = buildMerkleTree(leaves);

            const proof = generateMerkleProof(0, tree);
            const tamperedLeaf = sha256('tampered');
            const isValid = verifyMerkleProof(tamperedLeaf, proof, root);
            expect(isValid).toBe(false);
        });

        it('should reject proof with wrong root', () => {
            const leaves = [sha256('log 1'), sha256('log 2')];
            const { tree } = buildMerkleTree(leaves);

            const proof = generateMerkleProof(0, tree);
            const wrongRoot = sha256('wrong root');
            const isValid = verifyMerkleProof(leaves[0], proof, wrongRoot);
            expect(isValid).toBe(false);
        });

        it('should handle single-leaf tree', () => {
            const leaf = sha256('only entry');
            const { root, tree } = buildMerkleTree([leaf]);

            const proof = generateMerkleProof(0, tree);
            expect(proof).toEqual([]);
            const isValid = verifyMerkleProof(leaf, proof, root);
            expect(isValid).toBe(true);
        });
    });

    describe('Merkle chain integrity', () => {
        it('should detect tampering in linked checkpoints', () => {
            // Simulate two consecutive checkpoints
            const checkpoint1Logs = [sha256('log1'), sha256('log2')];
            const { root: checkpoint1Root } = buildMerkleTree(checkpoint1Logs);

            // Checkpoint 2 chains to checkpoint 1
            const checkpoint2Logs = [sha256('log3'), sha256('log4')];
            const { root: checkpoint2RawRoot } = buildMerkleTree(checkpoint2Logs);
            const checkpoint2ChainedRoot = sha256(checkpoint1Root + checkpoint2RawRoot);

            // Verify chain integrity by recomputing
            const recomputedChainedRoot = sha256(checkpoint1Root + checkpoint2RawRoot);
            expect(checkpoint2ChainedRoot).toBe(recomputedChainedRoot);

            // Tampering with checkpoint 1 breaks the chain
            const tamperedCheckpoint1Root = sha256('tampered');
            const brokenChainedRoot = sha256(tamperedCheckpoint1Root + checkpoint2RawRoot);
            expect(brokenChainedRoot).not.toBe(checkpoint2ChainedRoot);
        });
    });
});
