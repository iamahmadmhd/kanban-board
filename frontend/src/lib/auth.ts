import * as client from 'openid-client';
import { getSessionById, updateSession } from './session';
import { config } from './config';

export const clientConfig = {
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
    issuer: process.env.NEXT_PUBLIC_COGNITO_ISSUER_URL!,
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
    scope: process.env.NEXT_PUBLIC_SCOPE || 'openid profile email',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    loginRedirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    logoutRedirectUri: `${process.env.NEXT_PUBLIC_APP_URL}`,
};

export async function getClientConfig() {
    return await client.discovery(new URL(clientConfig.issuer), clientConfig.clientId);
}

export function getCognitoDomain() {
    return clientConfig.domain.replace(/\/$/, '');
}

export function getIssuerBaseUrl() {
    return clientConfig.issuer.replace(/\/$/, '');
}

export function getJwksUri() {
    return `${getIssuerBaseUrl()}/.well-known/jwks.json`;
}

interface TokenResponse {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    expires_in: number;
}

/**
 * Refresh access token using refresh token
 * @param refreshToken The refresh token from the session
 * @returns New tokens or null if refresh failed
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
    const tokenUrl = `${getCognitoDomain()}/oauth2/token`;
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientConfig.clientId,
        refresh_token: refreshToken,
    });

    try {
        const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });

        if (!tokenRes.ok) {
            console.error('Token refresh failed:', tokenRes.status);
            return null;
        }

        return await tokenRes.json();
    } catch (error) {
        console.error('Token refresh error:', error);
        return null;
    }
}

/**
 * Get valid access token, refreshing if necessary
 * @param sessionId The session ID from cookie
 * @returns Valid access token or null if session invalid/refresh failed
 */
export async function getValidAccessToken(sessionId: string): Promise<string | null> {
    const session = await getSessionById(sessionId);

    if (!session || !session.isLoggedIn || !session.refreshToken) {
        return null;
    }

    // Check if token needs refresh (check expiry timestamp)
    const now = Math.floor(Date.now() / 1000);
    const tokenExpiry = session.tokenExpiry || 0;

    // If token is still valid (with buffer), return it
    if (tokenExpiry > now + config.tokenRefreshBuffer) {
        return session.idToken;
    }

    // Token expired or about to expire - refresh it
    console.log('Refreshing access token for session:', sessionId);
    const newTokens = await refreshAccessToken(session.refreshToken);

    if (!newTokens) {
        // Refresh failed - session is no longer valid
        return null;
    }

    // Calculate new expiry time
    const newExpiry = now + newTokens.expires_in;

    // Update session with new tokens
    await updateSession(
        sessionId,
        {
            ...session,
            accessToken: newTokens.access_token,
            idToken: newTokens.id_token,
            tokenExpiry: newExpiry,
            // Keep existing refresh token if new one not provided
            refreshToken: newTokens.refresh_token || session.refreshToken,
        },
        config.sessionTtl
    );

    return newTokens.id_token;
}
