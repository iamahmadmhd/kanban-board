import { NextResponse } from 'next/server';
import {
    generateCodeVerifier,
    generateCodeChallenge,
    generateState,
    generateNonce,
} from '@/lib/oauth';
import { createSession } from '@/lib/session';
import { clientConfig, getCognitoDomain } from '@/lib/auth';
import { config } from '@/lib/config';

export async function GET() {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateState();
    const nonce = generateNonce();

    // Persist PKCE parameters in Redis with 5-minute TTL
    const sid = await createSession({ verifier, state, nonce, createdAt: Date.now() }, 300);

    const authorizationEndpoint = `${getCognitoDomain()}/oauth2/authorize`;
    const params = new URLSearchParams({
        client_id: clientConfig.clientId,
        response_type: 'code',
        scope: clientConfig.scope,
        redirect_uri: clientConfig.redirectUri,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        nonce,
    });

    const redirectTo = `${authorizationEndpoint}?${params.toString()}`;

    const res = NextResponse.redirect(redirectTo);
    res.cookies.set({
        name: 'sid',
        value: sid,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: config.sessionTtl,
    });

    return res;
}
