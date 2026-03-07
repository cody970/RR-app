/**
 * SMS Notification Service
 * Handles SMS notifications for split negotiations via Twilio
 */

export interface SmsNotificationOptions {
    to: string;
    message: string;
}

export interface SmsNotificationResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Sends an SMS notification using Twilio
 * Note: Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER env vars
 */
export async function sendSms(options: SmsNotificationOptions): Promise<SmsNotificationResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    // If Twilio is not configured, log and return success (development mode)
    if (!accountSid || !authToken || !fromNumber) {
        console.log(`[SMS Mock] To: ${options.to} | Message: ${options.message}`);
        return { success: true, messageId: `mock-${Date.now()}` };
    }

    try {
        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    To: options.to,
                    From: fromNumber,
                    Body: options.message,
                }).toString(),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("[SMS Error]", errorData);
            return { success: false, error: errorData.message || "Failed to send SMS" };
        }

        const data = await response.json();
        return { success: true, messageId: data.sid };
    } catch (error) {
        console.error("[SMS Error]", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error sending SMS",
        };
    }
}

/**
 * Send split proposal notification via SMS
 */
export async function sendSplitProposalSms(
    phoneNumber: string,
    writerName: string,
    workTitle: string,
    proposedSplit: number,
    portalUrl: string
): Promise<SmsNotificationResult> {
    const message = `Hi ${writerName}, ${workTitle} split proposal (${proposedSplit}%) is waiting for your review. View: ${portalUrl}`;
    return sendSms({ to: phoneNumber, message });
}

/**
 * Send counter-proposal notification via SMS
 */
export async function sendCounterProposalSms(
    phoneNumber: string,
    recipientName: string,
    senderName: string,
    workTitle: string,
    counterSplit: number,
    portalUrl: string
): Promise<SmsNotificationResult> {
    const message = `${senderName} proposed ${counterSplit}% split for "${workTitle}". Review their counter-proposal: ${portalUrl}`;
    return sendSms({ to: phoneNumber, message });
}

/**
 * Send expiring agreement notification via SMS
 */
export async function sendExpiringAgreementSms(
    phoneNumber: string,
    writerName: string,
    workTitle: string,
    hoursRemaining: number,
    portalUrl: string
): Promise<SmsNotificationResult> {
    const message = `Reminder: Your split agreement for "${workTitle}" expires in ${hoursRemaining} hours. Sign now: ${portalUrl}`;
    return sendSms({ to: phoneNumber, message });
}
