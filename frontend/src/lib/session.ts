import crypto from 'crypto';
import { getRedis } from './redis';
import { cookies } from 'next/headers';
import { getValidAccessToken } from './auth';

export interface SessionData {
    isLoggedIn?: boolean;
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    tokenExpiry?: number;
    userInfo?: {
        sub: string;
        email: string;
        firstname: string;
        lastname: string;
        picture?: string;
    };
    verifier?: string;
    state?: string;
    nonce?: string;
    createdAt?: number;
}

const PREFIX = 'sess:';
function genId() {
    return crypto.randomBytes(18).toString('hex');
}

export async function createSession(data: Record<string, unknown>, ttlSeconds = 300) {
    const id = genId();
    const r = getRedis();
    await r.set(PREFIX + id, JSON.stringify(data), { ex: ttlSeconds });
    return id;
}

export async function getSessionById(id: string | undefined) {
    if (!id) return null;
    const r = getRedis();
    const raw = await r.get<SessionData>(PREFIX + id);
    return raw ?? null;
}

export async function updateSession(
    id: string,
    data: Record<string, unknown>,
    ttlSeconds = 60 * 60 * 24 * 7
) {
    const r = getRedis();
    await r.set(PREFIX + id, JSON.stringify(data), { ex: ttlSeconds });
}

export async function destroySession(id: string) {
    const r = getRedis();
    await r.del(PREFIX + id);
}

export async function getSession(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid')?.value;

    if (!sidCookie) {
        return null;
    }

    const session = await getSessionById(sidCookie);

    if (!session || !session.isLoggedIn) {
        return null;
    }

    return {
        isLoggedIn: session.isLoggedIn,
        userInfo: session.userInfo,
    };
}

export async function isAuthenticated(): Promise<boolean> {
    const session = await getSession();
    return session?.isLoggedIn ?? false;
}

export async function getAccessToken(): Promise<string | null> {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid')?.value;

    if (!sidCookie) {
        return null;
    }

    return await getValidAccessToken(sidCookie);
}

export async function getUserInfo() {
    const session = await getSession();
    return session?.userInfo ?? null;
}
