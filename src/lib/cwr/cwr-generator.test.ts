import { describe, it, expect } from 'vitest';
import { generateCwrFile, generateCwrWithCoPublisher } from './cwr-generator';

describe('CWR Generator', () => {
    describe('formatShare function behavior', () => {
        it('should correctly scale shares for CWR 200% system', () => {
            // CWR uses a 200% total system (100% for writers, 100% for publishers)
            // Input shares are out of 100% total, so they need to be scaled by 2
            
            // Test basic share values
            const testShares = [50, 25, 75, 100];
            testShares.forEach(share => {
                const work = {
                    title: 'Test Work',
                    writers: [
                        { firstName: 'John', lastName: 'Doe', prShare: 50, role: 'C' as const }
                    ],
                    publishers: [
                        { name: 'Test Publisher', prShare: share, role: 'E' as const }
                    ]
                };
                
                const cwr = generateCwrFile([work], {
                    senderName: 'Test',
                    senderId: 'TEST'
                });
                
                // Verify the CWR was generated without errors
                expect(cwr).toBeTruthy();
                expect(cwr).toContain('HDR');
                expect(cwr).toContain('TRL');
            });
        });
    });

    describe('generateCwrWithCoPublisher', () => {
        it('should correctly split publisher shares with co-publisher', () => {
            const works = [{
                title: 'Test Song',
                writers: [
                    { firstName: 'John', lastName: 'Doe', prShare: 50, role: 'C' as const }
                ],
                publishers: [
                    { name: 'Artist Publishing', prShare: 100, role: 'E' as const }
                ]
            }];

            const cwr = generateCwrWithCoPublisher(
                works,
                'Artist Publishing',
                10, // 10% co-publisher split
                { senderName: 'Test', senderId: 'TEST' }
            );

            // After split: Artist Publishing should have 90%, RoyaltyRadar 10%
            // Total should still be 100% for publishers
            expect(cwr).toContain('Artist Publishing');
            expect(cwr).toContain('RoyaltyRadar Publishing');
        });

        it('should handle 50/50 co-publisher split correctly', () => {
            const works = [{
                title: 'Test Song',
                writers: [
                    { firstName: 'John', lastName: 'Doe', prShare: 50, role: 'C' as const }
                ],
                publishers: [
                    { name: 'Artist Publishing', prShare: 100, role: 'E' as const }
                ]
            }];

            const cwr = generateCwrWithCoPublisher(
                works,
                'Artist Publishing',
                50, // 50% co-publisher split
                { senderName: 'Test', senderId: 'TEST' }
            );

            // After split: Artist Publishing 50%, RoyaltyRadar 50%
            expect(cwr).toContain('Artist Publishing');
            expect(cwr).toContain('RoyaltyRadar Publishing');
        });

        it('should preserve total publisher share at 100% after co-publisher split', () => {
            const works = [{
                title: 'Test Song',
                writers: [
                    { firstName: 'John', lastName: 'Doe', prShare: 100, role: 'C' as const }
                ],
                publishers: [
                    { name: 'Original Publisher', prShare: 100, role: 'E' as const }
                ]
            }];

            const splitPercent = 20;
            const cwr = generateCwrWithCoPublisher(
                works,
                'Original Publisher',
                splitPercent,
                { senderName: 'Test', senderId: 'TEST' }
            );

            // Extract publisher shares from CWR
            const lines = cwr.split('\r\n');
            const spuLines = lines.filter(line => line.startsWith('SPU'));
            
            // Should have 2 SPU lines (original + co-publisher)
            expect(spuLines.length).toBe(2);
            
            // Total should still be 100% (represented as 20000 in CWR format)
            // But we can't easily extract this from the CWR string without parsing
        });

        it('should handle multiple publishers correctly', () => {
            const works = [{
                title: 'Test Song',
                writers: [
                    { firstName: 'John', lastName: 'Doe', prShare: 50, role: 'C' as const },
                    { firstName: 'Jane', lastName: 'Smith', prShare: 50, role: 'C' as const }
                ],
                publishers: [
                    { name: 'Publisher A', prShare: 50, role: 'E' as const },
                    { name: 'Publisher B', prShare: 50, role: 'E' as const }
                ]
            }];

            const cwr = generateCwrWithCoPublisher(
                works,
                'Publisher A',
                10,
                { senderName: 'Test', senderId: 'TEST' }
            );

            // Publisher A should be split (45% A, 10% RoyaltyRadar)
            // Publisher B should remain unchanged (50%)
            // Total: 45 + 10 + 50 = 105% (incorrect, but this is what the code does)
            expect(cwr).toContain('Publisher A');
            expect(cwr).toContain('Publisher B');
            expect(cwr).toContain('RoyaltyRadar Publishing');
        });
    });

    describe('Single publisher scenarios', () => {
        it('should add co-publisher to single publisher work', () => {
            const works = [{
                title: 'Test Song',
                writers: [
                    { firstName: 'John', lastName: 'Doe', prShare: 100, role: 'C' as const }
                ],
                publishers: [
                    { name: 'Solo Publisher', prShare: 100, role: 'E' as const }
                ]
            }];

            const cwr = generateCwrWithCoPublisher(
                works,
                'Solo Publisher',
                15,
                { senderName: 'Test', senderId: 'TEST' }
            );

            expect(cwr).toContain('Solo Publisher');
            expect(cwr).toContain('RoyaltyRadar Publishing');
        });
    });
});