import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCognitoAuthUrl } from '@/lib/auth-config';

export function middleware(request: NextRequest) {
    const session = request.cookies.get('kanban_app_session');
    const isApiRoute = request.nextUrl.pathname.startsWith('/api');
    const isHomeRoute = request.nextUrl.pathname === '/';

    // Allow API routes to handle their own auth
    if (isApiRoute || isHomeRoute) {
        return NextResponse.next();
    }

    // Redirect to Cognito if not logged in
    if (!session) {
        const cognitoUrl = getCognitoAuthUrl('login');
        return NextResponse.redirect(cognitoUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
