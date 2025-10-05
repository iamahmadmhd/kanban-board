import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, destroySession } from '@/lib/session';
import { getClientConfig, clientConfig } from '@/lib/auth';
import * as client from 'openid-client';

export async function GET(request: NextRequest) {
    const sidCookie = request.cookies.get('sid')?.value;

    if (!sidCookie) {
        // No session, redirect to home
        return NextResponse.redirect(clientConfig.logoutRedirectUri);
    }

    const session = await getSessionById(sidCookie);

    if (!session || !session.idToken) {
        // Session doesn't exist or no ID token, just clear cookie and redirect
        const res = NextResponse.redirect(clientConfig.logoutRedirectUri);
        res.cookies.delete('sid');
        return res;
    }

    // Build Cognito end session URL
    const openIdClientConfig = await getClientConfig();
    const endSessionUrl = client.buildEndSessionUrl(openIdClientConfig, {
        client_id: clientConfig.clientId,
        response_type: 'code',
        scope: clientConfig.scope,
        logout_uri: clientConfig.logoutRedirectUri,
    });

    console.log({ endSessionUrl });

    // Destroy the session in Redis
    await destroySession(sidCookie);

    // Clear the cookie and redirect to Cognito logout
    const res = NextResponse.redirect(endSessionUrl.href);
    res.cookies.delete('sid');

    return res;
}
