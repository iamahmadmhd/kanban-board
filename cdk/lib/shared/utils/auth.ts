import { UserContext, APIGatewayEventWithAuth, LocalAuthHeaders, LocalUserData } from '../types/auth';

export class AuthUtils {
    /**
     * Extract user context from API Gateway event
     * Supports both Cognito JWT and local development auth
     */
    static extractUserContext(event: APIGatewayEventWithAuth): UserContext {
        // Check for local development mode
        if (process.env.LOCAL_AUTH === 'true') {
            return this.extractLocalUser(event);
        }

        // Extract from Cognito authorizer context
        return this.extractCognitoUser(event);
    }

    private static extractLocalUser(event: APIGatewayEventWithAuth): UserContext {
        const headers = event.headers as LocalAuthHeaders;
        const localUser = headers['X-Local-User'] || headers['x-local-user'];

        if (!localUser) {
            throw new Error('Missing X-Local-User header in local development mode');
        }

        // Check if it's JSON format (starts with '{' or '[')
        if (localUser.trim().startsWith('{') || localUser.trim().startsWith('[')) {
            try {
                const userData: LocalUserData = JSON.parse(localUser);
                return {
                    userId: userData.sub || 'local-user',
                    email: userData.email || 'local@example.com',
                    name: `${userData.given_name || 'Local'} ${userData.family_name || 'User'}`,
                    isAuthenticated: true,
                };
            } catch (error) {
                console.error('Error parsing local user JSON data:', error);
                // Fall through to simple string handling
            }
        }

        // Handle as simple string format
        return {
            userId: localUser,
            email: `${localUser}@example.com`,
            name: 'Local User',
            isAuthenticated: true,
        };
    }

    private static extractCognitoUser(event: APIGatewayEventWithAuth): UserContext {
        const authorizer = event.requestContext.authorizer;

        if (!authorizer || !authorizer.jwt) {
            throw new Error('No JWT authorizer context found');
        }

        const claims = authorizer.jwt.claims;

        if (!claims?.sub) {
            throw new Error('Invalid JWT claims - missing sub');
        }

        return {
            userId: claims.sub as string,
            email: (claims.email as string) || '',
            name: `${claims.given_name || ''} ${claims.family_name || ''}`.trim() || 'Unknown User',
            isAuthenticated: true,
        };
    }

    /**
     * Validate that user has access to a resource
     */
    static validateUserAccess(userContext: UserContext, resourceUserId: string): void {
        if (!userContext.isAuthenticated) {
            throw new Error('User not authenticated');
        }

        if (userContext.userId !== resourceUserId) {
            throw new Error('User does not have access to this resource');
        }
    }

    /**
     * Extract user ID from resource key (e.g., "USER#123" -> "123")
     */
    static extractUserIdFromKey(userKey: string): string {
        const match = userKey.match(/^USER#(.+)$/);
        if (!match) {
            throw new Error('Invalid user key format');
        }
        return match[1];
    }
}
