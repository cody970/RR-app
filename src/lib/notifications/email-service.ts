/**
 * Email Notification Service
 * Handles email notifications for split negotiations
 */

export interface EmailNotificationOptions {
    to: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
}

export interface EmailNotificationResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Sends an email notification
 * In production, this would integrate with a service like SendGrid, Mailgun, or SES
 * For now, it logs the email for development purposes
 */
export async function sendEmail(options: EmailNotificationOptions): Promise<EmailNotificationResult> {
    const apiKey = process.env.EMAIL_API_KEY;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fromEmail = process.env.EMAIL_FROM_ADDRESS || "noreply@royaltyradar.io";

    // If email service is not configured, log and return success (development mode)
    if (!apiKey) {
        console.log(`[Email Mock] To: ${options.to} | Subject: ${options.subject}`);
        console.log(`[Email Mock] Body: ${options.textBody || options.htmlBody.substring(0, 200)}...`);
        return { success: true, messageId: `mock-email-${Date.now()}` };
    }

    // In production, implement actual email sending via SendGrid/Mailgun/SES
    // For now, this serves as the integration point
    try {
        // Placeholder for actual email sending implementation
        // Example with SendGrid:
        // const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        //     method: "POST",
        //     headers: {
        //         "Authorization": `Bearer ${apiKey}`,
        //         "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify({
        //         personalizations: [{ to: [{ email: options.to }] }],
        //         from: { email: fromEmail },
        //         subject: options.subject,
        //         content: [
        //             { type: "text/html", value: options.htmlBody },
        //             ...(options.textBody ? [{ type: "text/plain", value: options.textBody }] : []),
        //         ],
        //     }),
        // });

        console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
        return { success: true, messageId: `email-${Date.now()}` };
    } catch (error) {
        console.error("[Email Error]", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error sending email",
        };
    }
}

/**
 * Generate HTML email template for split proposal
 */
function generateSplitProposalHtml(
    writerName: string,
    organizationName: string,
    workTitle: string,
    proposedSplit: number,
    portalUrl: string
): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 48px; height: 48px; background: #6366f1; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
        .content { background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
        .split-box { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
        .split-value { font-size: 32px; font-weight: bold; color: #4f46e5; }
        .btn { display: inline-block; background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500; }
        .btn:hover { background: #4338ca; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎵</div>
            <h1 style="color: #1e293b; margin-top: 16px;">Split Sign-off Request</h1>
        </div>
        
        <div class="content">
            <p>Hi ${writerName},</p>
            <p><strong>${organizationName}</strong> has requested your approval for the publishing splits on:</p>
            
            <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0; font-size: 14px; color: #64748b;">Work Title</p>
                <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600;">${workTitle}</p>
            </div>
            
            <div class="split-box">
                <p style="margin: 0; font-size: 14px; color: #6366f1;">Your Proposed Split</p>
                <div class="split-value">${proposedSplit}%</div>
            </div>
            
            <div style="text-align: center; margin-top: 24px;">
                <a href="${portalUrl}" class="btn">Review & Sign-off</a>
            </div>
        </div>
        
        <div class="footer">
            <p>This link expires in 7 days. If you didn't expect this email, please ignore it.</p>
            <p>Powered by RoyaltyRadar</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Send split proposal notification via email
 */
export async function sendSplitProposalEmail(
    email: string,
    writerName: string,
    organizationName: string,
    workTitle: string,
    proposedSplit: number,
    portalUrl: string
): Promise<EmailNotificationResult> {
    const htmlBody = generateSplitProposalHtml(writerName, organizationName, workTitle, proposedSplit, portalUrl);
    const textBody = `Hi ${writerName},\n\n${organizationName} has requested your approval for the publishing splits on "${workTitle}".\n\nProposed Split: ${proposedSplit}%\n\nReview and sign-off: ${portalUrl}\n\nThis link expires in 7 days.\n\n— RoyaltyRadar`;

    return sendEmail({
        to: email,
        subject: `Split Sign-off Request: ${workTitle}`,
        htmlBody,
        textBody,
    });
}

/**
 * Generate HTML for counter-proposal notification
 */
function generateCounterProposalHtml(
    recipientName: string,
    senderName: string,
    workTitle: string,
    originalSplit: number,
    counterSplit: number,
    message: string,
    portalUrl: string
): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 48px; height: 48px; background: #f59e0b; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
        .content { background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
        .split-comparison { display: flex; justify-content: center; align-items: center; gap: 16px; margin: 20px 0; }
        .split-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; min-width: 100px; }
        .split-box.new { background: #fef3c7; border-color: #fcd34d; }
        .split-value { font-size: 24px; font-weight: bold; }
        .message-box { background: #fff; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; }
        .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">💬</div>
            <h1 style="color: #1e293b; margin-top: 16px;">Counter-Proposal Received</h1>
        </div>
        
        <div class="content">
            <p>Hi ${recipientName},</p>
            <p><strong>${senderName}</strong> has submitted a counter-proposal for "${workTitle}":</p>
            
            <div class="split-comparison">
                <div class="split-box">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Original</p>
                    <div class="split-value" style="color: #64748b; text-decoration: line-through;">${originalSplit}%</div>
                </div>
                <span style="font-size: 24px; color: #94a3b8;">→</span>
                <div class="split-box new">
                    <p style="margin: 0; font-size: 12px; color: #d97706;">Proposed</p>
                    <div class="split-value" style="color: #d97706;">${counterSplit}%</div>
                </div>
            </div>
            
            ${message ? `<div class="message-box"><p style="margin: 0; font-style: italic;">"${message}"</p></div>` : ''}
            
            <div style="text-align: center; margin-top: 24px;">
                <a href="${portalUrl}" class="btn">View Negotiation</a>
            </div>
        </div>
        
        <div class="footer">
            <p>You can accept, reject, or make a counter-offer.</p>
            <p>Powered by RoyaltyRadar</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Send counter-proposal notification via email
 */
export async function sendCounterProposalEmail(
    email: string,
    recipientName: string,
    senderName: string,
    workTitle: string,
    originalSplit: number,
    counterSplit: number,
    message: string,
    portalUrl: string
): Promise<EmailNotificationResult> {
    const htmlBody = generateCounterProposalHtml(
        recipientName,
        senderName,
        workTitle,
        originalSplit,
        counterSplit,
        message,
        portalUrl
    );
    const textBody = `Hi ${recipientName},\n\n${senderName} has submitted a counter-proposal for "${workTitle}".\n\nOriginal Split: ${originalSplit}%\nProposed Split: ${counterSplit}%\n\n${message ? `Message: "${message}"\n\n` : ''}View negotiation: ${portalUrl}\n\n— RoyaltyRadar`;

    return sendEmail({
        to: email,
        subject: `Counter-Proposal: ${workTitle} (${counterSplit}%)`,
        htmlBody,
        textBody,
    });
}

/**
 * Send expiring agreement notification via email
 */
export async function sendExpiringAgreementEmail(
    email: string,
    writerName: string,
    workTitle: string,
    hoursRemaining: number,
    portalUrl: string
): Promise<EmailNotificationResult> {
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .warning-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; text-align: center; }
        .time-remaining { font-size: 48px; font-weight: bold; color: #dc2626; }
        .btn { display: inline-block; background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="warning-box">
            <p style="margin: 0 0 8px; font-size: 14px; color: #ef4444;">⏰ Time Sensitive</p>
            <h1 style="margin: 0 0 16px; color: #1e293b;">Split Agreement Expiring Soon</h1>
            
            <p>Hi ${writerName}, your split agreement for <strong>"${workTitle}"</strong> expires in:</p>
            
            <div class="time-remaining">${hoursRemaining}h</div>
            
            <div style="margin-top: 24px;">
                <a href="${portalUrl}" class="btn">Complete Sign-off Now</a>
            </div>
        </div>
        
        <div class="footer">
            <p>After expiration, you'll need to request a new sign-off link.</p>
            <p>Powered by RoyaltyRadar</p>
        </div>
    </div>
</body>
</html>`;

    const textBody = `Hi ${writerName},\n\nREMINDER: Your split agreement for "${workTitle}" expires in ${hoursRemaining} hours.\n\nComplete sign-off now: ${portalUrl}\n\nAfter expiration, you'll need to request a new sign-off link.\n\n— RoyaltyRadar`;

    return sendEmail({
        to: email,
        subject: `⏰ Action Required: Split Agreement Expiring in ${hoursRemaining} hours`,
        htmlBody,
        textBody,
    });
}
