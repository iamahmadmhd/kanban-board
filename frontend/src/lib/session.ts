// lib/session.ts
import crypto from 'crypto';
import { getRedis } from './redis';

const PREFIX = 'sess:';
function genId() {
    return crypto.randomBytes(18).toString('hex');
}

export async function createSession(data: Record<string, unknown>, ttlSeconds = 300) {
    const id = genId();
    const r = await getRedis();
    await r.set(PREFIX + id, JSON.stringify(data), { EX: ttlSeconds });
    return id;
}

export async function getSessionById(id: string | undefined) {
    if (!id) return null;
    const r = await getRedis();
    const raw = await r.get(PREFIX + id);
    return raw ? JSON.parse(raw) : null;
}

export async function updateSession(
    id: string,
    data: Record<string, unknown>,
    ttlSeconds = 60 * 60 * 24 * 7
) {
    const r = await getRedis();
    await r.set(PREFIX + id, JSON.stringify(data), { EX: ttlSeconds });
}

export async function destroySession(id: string) {
    const r = await getRedis();
    await r.del(PREFIX + id);
}
