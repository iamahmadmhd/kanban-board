import { APIGatewayProxyEvent } from 'aws-lambda';
import { UserContext } from '../types/auth';

export class AuthUtils {
    /**
     * Extract user context from API Gateway event
     */
    static extractUserContext(event: APIGatewayProxyEvent): UserContext {
        // Extract from Cognito authorizer context
        return this.extractCognitoUser(event);
    }

    /**
     * Extract user context from API Gateway event
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
