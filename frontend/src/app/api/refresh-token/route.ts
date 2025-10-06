import { NextRequest } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const sidCookie = request.cookies.get('sid')?.value;

        if (!sidCookie) {
            return Response.json({ error: 'No session' }, { status: 401 });
        }

        const accessToken = await getValidAccessToken(sidCookie);

        if (!accessToken) {
            return Response.json({ error: 'Session expired' }, { status: 401 });
        }

        return Response.json({
            accessToken,
            message: 'Token refreshed successfully',
        });
    } catch (error) {
        console.error('Token refresh API error:', error);
        return Response.json({ error: 'Failed to refresh token' }, { status: 500 });
    }
}
