import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    sendSms,
    sendSplitProposalSms,
    sendCounterProposalSms,
    sendExpiringAgreementSms,
} from '@/lib/notifications/sms-service';
import {
    sendEmail,
    sendSplitProposalEmail,
    sendCounterProposalEmail,
    sendExpiringAgreementEmail,
} from '@/lib/notifications/email-service';

describe('Notification Services', () => {
    describe('SMS Service', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            // Clear environment variables
            delete process.env.TWILIO_ACCOUNT_SID;
            delete process.env.TWILIO_AUTH_TOKEN;
            delete process.env.TWILIO_PHONE_NUMBER;
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should log SMS in development mode when Twilio is not configured', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const result = await sendSms({
                to: '+1234567890',
                message: 'Test message',
            });

            expect(result.success).toBe(true);
            expect(result.messageId).toContain('mock-');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[SMS Mock]')
            );
        });

        it('should generate correct split proposal SMS', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const result = await sendSplitProposalSms(
                '+1234567890',
                'John Doe',
                'Test Song',
                50,
                'https://example.com/portal'
            );

            expect(result.success).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('John Doe')
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('50%')
            );
        });

        it('should generate correct counter-proposal SMS', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const result = await sendCounterProposalSms(
                '+1234567890',
                'Jane Doe',
                'John Doe',
                'Test Song',
                60,
                'https://example.com/portal'
            );

            expect(result.success).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('John Doe')
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('60%')
            );
        });

        it('should generate correct expiring agreement SMS', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const result = await sendExpiringAgreementSms(
                '+1234567890',
                'John Doe',
                'Test Song',
                24,
                'https://example.com/portal'
            );

            expect(result.success).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('24 hours')
            );
        });
    });

    describe('Email Service', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            delete process.env.EMAIL_API_KEY;
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should log email in development mode when API key is not configured', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const result = await sendEmail({
                to: 'test@example.com',
                subject: 'Test Subject',
                htmlBody: '<p>Test body</p>',
            });

            expect(result.success).toBe(true);
            expect(result.messageId).toContain('mock-email-');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[Email Mock]')
            );
        });

        it('should generate correct split proposal email', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const result = await sendSplitProposalEmail(
                'writer@example.com',
                'John Doe',
                'Test Organization',
                'Test Song',
                50,
                'https://example.com/portal'
            );

            expect(result.success).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Split Sign-off Request')
            );
        });

        it('should generate correct counter-proposal email', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const result = await sendCounterProposalEmail(
                'publisher@example.com',
                'Publisher Name',
                'John Doe',
                'Test Song',
                50,
                60,
                'I think my contribution was larger',
                'https://example.com/portal'
            );

            expect(result.success).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Counter-Proposal')
            );
        });

        it('should generate correct expiring agreement email', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const result = await sendExpiringAgreementEmail(
                'writer@example.com',
                'John Doe',
                'Test Song',
                24,
                'https://example.com/portal'
            );

            expect(result.success).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Action Required')
            );
        });
    });
});
