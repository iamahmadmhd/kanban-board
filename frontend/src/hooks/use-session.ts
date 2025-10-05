import { useEffect, useState } from 'react';

export interface SessionData {
    isLoggedIn: boolean;
    userInfo?: {
        sub: string;
        firstname: string;
        lastname: string;
        email: string;
        picture?: string;
    } | null;
}

export default function useSession() {
    const [session, setSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const response = await fetch('/api/session');
                if (response.ok) {
                    const data = (await response.json()) as SessionData;
                    setSession(data);
                }
            } catch (error) {
                console.error('Failed to fetch session:', error);
                setSession({ isLoggedIn: false, userInfo: null });
            } finally {
                setLoading(false);
            }
        };
        fetchSession();
    }, []);

    return { session, loading };
}
