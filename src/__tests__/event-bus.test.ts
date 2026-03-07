import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getOrgChannel,
    getGlobalChannel,
} from '@/lib/infra/event-bus';

describe('Event Bus', () => {
    describe('Channel Naming', () => {
        it('should create org-specific channel name', () => {
            const channel = getOrgChannel('org123');
            expect(channel).toBe('rr:events:org123');
        });

        it('should create global channel name', () => {
            const channel = getGlobalChannel();
            expect(channel).toBe('rr:events:global');
        });

        it('should handle special characters in orgId', () => {
            const channel = getOrgChannel('org-with-dashes_and_underscores');
            expect(channel).toBe('rr:events:org-with-dashes_and_underscores');
        });

        it('should handle empty orgId', () => {
            const channel = getOrgChannel('');
            expect(channel).toBe('rr:events:');
        });
    });
});
