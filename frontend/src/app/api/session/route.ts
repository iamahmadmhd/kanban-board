import { NextRequest } from 'next/server';
import { getSessionById } from '@/lib/session';

export async function GET(request: NextRequest) {
    try {
        const sidCookie = request.cookies.get('sid')?.value;

        if (!sidCookie) {
            return Response.json({
                isLoggedIn: false,
                userInfo: null,
            });
        }

        const session = await getSessionById(sidCookie);

        if (!session || !session.isLoggedIn) {
            return Response.json({
                isLoggedIn: false,
                userInfo: null,
            });
        }

        return Response.json({
            isLoggedIn: session.isLoggedIn,
            userInfo: session.userInfo,
        });
    } catch (error) {
        console.error('Session API error:', error);
        return Response.json({ error: 'Failed to retrieve session' }, { status: 500 });
    }
}
