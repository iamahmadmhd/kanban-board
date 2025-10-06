import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, updateSession, destroySession } from '@/lib/session';
import { clientConfig, getCognitoDomain, getIssuerBaseUrl, getJwksUri } from '@/lib/auth';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { config } from '@/lib/config';

async function extractParams(request: NextRequest): Promise<Record<string, string>> {
    const url = new URL(request.url);
    if ([...url.searchParams].length) {
        return Object.fromEntries(url.searchParams.entries());
    }
    const form = await request.formData();
    if ([...form].length) {
        return Object.fromEntries(form.entries() as Iterable<readonly [string, string]>);
    }
    return {};
}

async function verifyIdToken(idToken: string, expectedNonce: string | undefined) {
    const JWKS = createRemoteJWKSet(new URL(getJwksUri()));

    const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: getIssuerBaseUrl(),
        audience: clientConfig.clientId,
    });

    if (expectedNonce && payload.nonce !== expectedNonce) {
        throw new Error('nonce mismatch');
    }
    return payload;
}

export async function GET(request: NextRequest) {
    const params = await extractParams(request);
    const code = params.code;
    const returnedState = params.state;

    const sidCookie = request.cookies.get('sid')?.value;
    if (!sidCookie) {
        return new Response('Missing session cookie', { status: 400 });
    }

    const session = await getSessionById(sidCookie);
    if (!session) {
        return new Response('Session expired', { status: 400 });
    }

    if (!code) {
        return new Response('Missing code', { status: 400 });
    }

    if (!returnedState || returnedState !== session.state) {
        await destroySession(sidCookie);
        return new Response('Invalid state', { status: 403 });
    }

    // Exchange authorization code for tokens using Cognito domain
    const tokenUrl = `${getCognitoDomain()}/oauth2/token`;
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientConfig.clientId,
        code,
        redirect_uri: clientConfig.redirectUri,
        code_verifier: session.verifier!,
    });

    const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!tokenRes.ok) {
        const text = await tokenRes.text();
        console.error('Token endpoint error:', tokenRes.status, text);
        return new Response('Token exchange failed', { status: 502 });
    }

    const tokenJson = await tokenRes.json();
    const { access_token, id_token, refresh_token } = tokenJson;
    const now = Math.floor(Date.now() / 1000);
    const tokenExpiry = now + (tokenJson.expires_in || 3600);

    // Verify ID token signature and nonce
    try {
        const claims = await verifyIdToken(id_token, session.nonce);

        // Store user info and tokens in Redis session
        await updateSession(
            sidCookie,
            {
                isLoggedIn: true,
                accessToken: access_token,
                idToken: id_token,
                refreshToken: refresh_token,
                tokenExpiry: tokenExpiry,
                userInfo: {
                    sub: claims.sub as string,
                    email: claims.email as string,
                    firstname: claims.given_name as string,
                    lastname: claims.family_name as string,
                    picture: claims.picture as string,
                },
            },
            config.sessionTtl
        );
    } catch (err) {
        console.error('ID token verification failed:', err);
        return new Response('Invalid ID token', { status: 401 });
    }

    // Extend cookie lifetime to match session TTL
    const res = NextResponse.redirect(clientConfig.loginRedirectUri);
    res.cookies.set({
        name: 'sid',
        value: sidCookie,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: config.sessionTtl,
    });

    return res;
}
