import { headers } from 'next/headers';

/**
 * Get the CSP nonce from request headers
 * This should be called in Server Components or Route Handlers
 */
export function getScriptNonce(): string {
    try {
        const headersList = headers();
        return headersList.get('x-script-nonce') || '';
    } catch {
        // Fallback for cases where headers are not available (e.g., during build)
        return '';
    }
}

/**
 * Generate a script tag with nonce attribute
 * Use this for any inline scripts in Server Components
 */
export function createScriptWithNonce(html: string): string {
    const nonce = getScriptNonce();
    if (nonce) {
        return html.replace('<script', `<script nonce="${nonce}"`);
    }
    return html;
}