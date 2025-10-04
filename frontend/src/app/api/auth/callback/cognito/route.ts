import { exchangeCodeForTokens, createUserSession, saveSession } from '@/app/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            console.error('Cognito auth error:', error);
            return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
        }

        if (!code) {
            return NextResponse.redirect(new URL('/?error=missing_code', request.url));
        }

        // Exchange code for tokens
        const redirectUri = `${request.nextUrl.origin}/api/auth/callback/cognito`;
        const tokens = await exchangeCodeForTokens(code, redirectUri);

        // Create and save session
        const session = await createUserSession(tokens);
        await saveSession(session);

        // Redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
    }
}
