import { clearSession } from '@/app/actions';
import { getCognitoLogoutUrl } from '@/lib/auth-config';
import { NextResponse } from 'next/server';

export async function GET() {
    // Clear session cookie
    await clearSession();

    // Redirect to Cognito logout (which then redirects back to login page)
    const logoutUrl = getCognitoLogoutUrl();
    return NextResponse.redirect(logoutUrl);
}

export async function POST() {
    // Support POST for client-side logout
    await clearSession();
    return NextResponse.json({ success: true });
}
