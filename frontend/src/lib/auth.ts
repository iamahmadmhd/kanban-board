import * as client from 'openid-client';

export const clientConfig = {
    // This should be your Cognito domain, e.g., https://your-domain.auth.region.amazoncognito.com
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
    // This is the issuer for JWT verification, e.g., https://cognito-idp.region.amazonaws.com/region_POOLID
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
