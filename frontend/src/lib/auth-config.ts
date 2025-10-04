export const authConfig = {
    region: process.env.NEXT_PUBLIC_AWS_REGION!,
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
    redirectSignIn: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    redirectSignOut: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    scopes: ['email', 'openid', 'profile'],
} as const;

export function getCognitoAuthUrl(type: 'login' | 'signup' = 'login'): string {
    const { domain, clientId, redirectSignIn, scopes } = authConfig;

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        scope: scopes.join(' '),
        redirect_uri: `${redirectSignIn}/api/auth/callback/cognito`,
    });

    const endpoint = type === 'signup' ? 'signup' : 'login';
    return `https://${domain}/${endpoint}?${params.toString()}`;
}

export function getCognitoLogoutUrl(): string {
    const { domain, clientId, redirectSignOut } = authConfig;

    const params = new URLSearchParams({
        client_id: clientId,
        logout_uri: redirectSignOut,
    });

    return `https://${domain}/logout?${params.toString()}`;
}
