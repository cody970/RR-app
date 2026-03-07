import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';

/**
 * Generate a cryptographic nonce for CSP
 */
function generateNonce(): string {
    return randomBytes(16).toString('base64');
}

/**
 * Generate CSP header with nonce (replaces unsafe-inline for scripts)
 */
function generateCspHeader(scriptNonce: string): string {
    return [
        "default-src 'self'",
        `script-src 'self' 'nonce-${scriptNonce}' 'unsafe-eval' https://js.stripe.com`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Note: inline styles still needed for some CSS-in-JS libraries
        "img-src 'self' blob: data: https://images.unsplash.com https://i.scdn.co https://images.muso.ai",
        "font-src 'self' https://fonts.gstatic.com",
        "frame-src 'self' https://js.stripe.com",
        "connect-src 'self' https://api.stripe.com",
        "worker-src 'self' blob:",
        "upgrade-insecure-requests",
        "block-all-mixed-content",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join('; ');
}

export function middleware(request: NextRequest) {
    const nonce = generateNonce();
    const response = NextResponse.next();

    // Security Headers with nonce-based CSP
    response.headers.set('Content-Security-Policy', generateCspHeader(nonce));
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

    // Store nonce for use in Next.js pages (accessible via headers)
    response.headers.set('x-script-nonce', nonce);

    // Basic CSRF Protection for state-changing operations
    const method = request.method;
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const isValidOrigin = origin && (origin.includes(host!) || origin === process.env.NEXTAUTH_URL);
        const isValidReferer = referer && (referer.includes(host!) || referer === process.env.NEXTAUTH_URL);

        if (!isValidOrigin && !isValidReferer && process.env.NODE_ENV === 'production') {
            return new NextResponse('Invalid Origin or Referer (CSRF Protection)', { status: 403 });
        }
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
