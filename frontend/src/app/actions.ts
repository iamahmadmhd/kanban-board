'use server';

import { cookies } from 'next/headers';
import { authConfig } from '../lib/auth-config';

interface CognitoTokens {
    access_token: string;
    id_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}

interface UserSession {
    userId: string;
    email: string;
    name: string;
    accessToken: string;
    idToken: string;
    expiresAt: number;
}

const COOKIE_NAME = 'kanban_app_session';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
};

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
    code: string,
    redirectUri: string
): Promise<CognitoTokens> {
    const { domain, clientId } = authConfig;

    const tokenUrl = `https://${domain}/oauth2/token`;

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return response.json();
}

/**
 * Decode JWT token (without verification - already verified by API Gateway)
 */
function decodeJwt(token: string): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT token');
    }

    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
}

/**
 * Create user session from tokens
 */
export async function createUserSession(tokens: CognitoTokens): Promise<UserSession> {
    const idTokenPayload = decodeJwt(tokens.id_token);

    return {
        userId: idTokenPayload.sub as string,
        email: idTokenPayload.email as string,
        name: (idTokenPayload.name as string) || (idTokenPayload.email as string),
        accessToken: tokens.access_token,
        idToken: tokens.id_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
    };
}

/**
 * Save session to HTTP-only cookie
 */
export async function saveSession(session: UserSession): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, JSON.stringify(session), COOKIE_OPTIONS);
}

/**
 * Get current session from cookie
 */
export async function getSession(): Promise<UserSession | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie) {
        return null;
    }

    try {
        const session: UserSession = JSON.parse(sessionCookie.value);

        // Check if token is expired
        if (session.expiresAt < Date.now()) {
            return null;
        }

        return session;
    } catch (error) {
        console.error('Failed to parse session:', error);
        return null;
    }
}

/**
 * Clear session cookie
 */
export async function clearSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

/**
 * Require authentication (for server components/actions)
 */
export async function requireAuth(): Promise<UserSession> {
    const session = await getSession();

    if (!session) {
        throw new Error('Unauthorized - Please log in');
    }

    return session;
}

/**
 * Get user or null (for server components)
 */
export async function getCurrentUser(): Promise<UserSession | null> {
    return getSession();
}
