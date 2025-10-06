import crypto from 'crypto';

export function base64url(input: Buffer) {
    return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateCodeVerifier(length = 128) {
    return base64url(crypto.randomBytes(length));
}

export async function generateCodeChallenge(verifier: string) {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return base64url(hash);
}

export function generateState() {
    return base64url(crypto.randomBytes(16));
}

export function generateNonce() {
    return base64url(crypto.randomBytes(16));
}
