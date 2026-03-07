import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Security Headers (CSP is set in next.config.ts — do NOT duplicate here)
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

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
