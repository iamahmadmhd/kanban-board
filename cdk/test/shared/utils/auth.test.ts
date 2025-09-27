import { AuthUtils } from '../../../lib/shared/utils/auth';
import { APIGatewayEventWithAuth } from '../../../lib/shared/types/auth';

describe('AuthUtils', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('Local Development Mode', () => {
        beforeEach(() => {
            process.env.LOCAL_AUTH = 'true';
        });

        test('extracts user context from JSON format header', () => {
            const event: APIGatewayEventWithAuth = {
                headers: {
                    'X-Local-User': JSON.stringify({
                        sub: 'local-123',
                        email: 'test@example.com',
                        given_name: 'Test',
                        family_name: 'User',
                    }),
                },
                requestContext: {},
            };

            const context = AuthUtils.extractUserContext(event);

            expect(context).toEqual({
                userId: 'local-123',
                email: 'test@example.com',
                name: 'Test User',
                isAuthenticated: true,
            });
        });

        test('extracts user context from string format header', () => {
            const event: APIGatewayEventWithAuth = {
                headers: { 'X-Local-User': 'testuser123' },
                requestContext: {},
            };

            const context = AuthUtils.extractUserContext(event);

            expect(context).toEqual({
                userId: 'testuser123',
                email: 'testuser123@example.com',
                name: 'Local User',
                isAuthenticated: true,
            });
        });
    });

    describe('Cognito Mode', () => {
        beforeEach(() => {
            process.env.LOCAL_AUTH = 'false';
        });

        test('extracts user context from Cognito JWT claims', () => {
            const event: APIGatewayEventWithAuth = {
                headers: {},
                requestContext: {
                    authorizer: {
                        jwt: {
                            claims: {
                                sub: 'cognito-123',
                                email: 'user@example.com',
                                given_name: 'John',
                                family_name: 'Doe',
                            },
                        },
                    },
                },
            };

            const context = AuthUtils.extractUserContext(event);

            expect(context).toEqual({
                userId: 'cognito-123',
                email: 'user@example.com',
                name: 'John Doe',
                isAuthenticated: true,
            });
        });
    });

    describe('Validation and Utilities', () => {
        test('validateUserAccess allows matching user', () => {
            const userContext = {
                userId: 'user123',
                email: 'test@example.com',
                name: 'Test User',
                isAuthenticated: true,
            };

            expect(() => {
                AuthUtils.validateUserAccess(userContext, 'user123');
            }).not.toThrow();
        });

        test('validateUserAccess denies different user', () => {
            const userContext = {
                userId: 'user123',
                email: 'test@example.com',
                name: 'Test User',
                isAuthenticated: true,
            };

            expect(() => {
                AuthUtils.validateUserAccess(userContext, 'user456');
            }).toThrow('User does not have access to this resource');
        });

        test('extractUserIdFromKey works correctly', () => {
            const userId = AuthUtils.extractUserIdFromKey('USER#abc123');
            expect(userId).toBe('abc123');
        });
    });
});
