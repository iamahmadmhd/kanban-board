import { APIGatewayProxyEvent } from 'aws-lambda';
import { UserContext, LocalAuthHeaders, LocalUserData } from '../types/auth';

export class AuthUtils {
    /**
     * Extract user context from API Gateway event
     * Supports both Cognito JWT and local development auth
     */
    static extractUserContext(event: APIGatewayProxyEvent): UserContext {
        // Extract from Cognito authorizer context
        return this.extractCognitoUser(event);
    }

    private static extractLocalUser(event: APIGatewayProxyEvent): UserContext {
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

    /**
     * Extract user context from Cognito authorizer context
     */
    private static extractCognitoUser(event: APIGatewayProxyEvent): UserContext {
        const authorizer = event.requestContext.authorizer;

        if (!authorizer) {
            console.error('No authorizer context found');
            throw new Error('No authorization context found');
        }

        // Cognito User Pool authorizer puts claims directly in authorizer object
        const claims = authorizer.claims;

        if (!claims) {
            console.error('No claims found. Authorizer context:', JSON.stringify(authorizer, null, 2));
            throw new Error('No claims found in authorization context');
        }

        const sub = claims.sub;
        const email = claims.email;
        const givenName = claims.given_name;
        const familyName = claims.family_name;

        if (!sub) {
            console.error('Claims missing sub:', claims);
            throw new Error('Invalid claims - missing sub');
        }

        return {
            userId: sub,
            email: email || '',
            name: `${givenName || ''} ${familyName || ''}`.trim() || 'Unknown User',
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
