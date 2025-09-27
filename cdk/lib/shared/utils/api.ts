import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ApiResponse, HttpStatusCode, ValidationError } from '../types/api';
import { AuthUtils } from './auth';
import { APIGatewayEventWithAuth, UserContext } from '../types/auth';

export class ApiUtils {
    /**
     * Create a successful API response
     */
    static success<T>(data: T, statusCode: number = HttpStatusCode.OK): APIGatewayProxyResultV2 {
        const response: ApiResponse<T> = {
            success: true,
            data,
        };

        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            },
            body: JSON.stringify(response),
        };
    }

    /**
     * Create an error API response
     */
    static error(
        message: string,
        statusCode: number = HttpStatusCode.INTERNAL_SERVER_ERROR,
        code?: string
    ): APIGatewayProxyResultV2 {
        const response: ApiResponse = {
            success: false,
            error: {
                message,
                code,
            },
        };

        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            },
            body: JSON.stringify(response),
        };
    }

    /**
     * Create a validation error response
     */
    static validationError(errors: ValidationError[]): APIGatewayProxyResultV2 {
        console.error('Validation errors:', errors);
        return this.error('Validation failed', HttpStatusCode.BAD_REQUEST, 'VALIDATION_ERROR');
    }

    /**
     * Parse JSON body safely
     */
    static parseBody<T>(body: string | undefined): T | null {
        if (!body) return null;

        try {
            return JSON.parse(body) as T;
        } catch (error) {
            console.error('Failed to parse request body:', error);
            return null;
        }
    }

    /**
     * Extract path parameters safely
     */
    static getPathParameter(event: APIGatewayEventWithAuth, name: string): string | null {
        return event.pathParameters?.[name] || null;
    }

    /**
     * Extract query parameters safely
     */
    static getQueryParameter(event: APIGatewayEventWithAuth, name: string): string | null {
        return event.queryStringParameters?.[name] || null;
    }

    /**
     * Wrapper for Lambda handlers with error handling and auth
     */
    static withErrorHandling(
        handler: (
            event: APIGatewayEventWithAuth,
            userContext: UserContext
        ) => Promise<APIGatewayProxyResultV2>
    ): APIGatewayProxyHandlerV2 {
        return async (event): Promise<APIGatewayProxyResultV2> => {
            try {
                // Handle CORS preflight
                if (event.requestContext.http.method === 'OPTIONS') {
                    return {
                        statusCode: 200,
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                        },
                    };
                }

                // Extract user context
                const userContext = AuthUtils.extractUserContext(event as APIGatewayEventWithAuth);

                // Call the actual handler
                return await handler(event as APIGatewayEventWithAuth, userContext);
            } catch (error) {
                console.error('Lambda handler error:', error);

                if (error instanceof Error) {
                    // Handle specific error types
                    if (
                        error.message.includes('not authenticated') ||
                        error.message.includes('Missing X-Local-User')
                    ) {
                        return this.error(
                            'Authentication required',
                            HttpStatusCode.UNAUTHORIZED,
                            'AUTH_REQUIRED'
                        );
                    }

                    if (error.message.includes('does not have access')) {
                        return this.error('Access denied', HttpStatusCode.FORBIDDEN, 'ACCESS_DENIED');
                    }

                    if (error.message.includes('not found')) {
                        return this.error('Resource not found', HttpStatusCode.NOT_FOUND, 'NOT_FOUND');
                    }
                }

                return this.error(
                    'Internal server error',
                    HttpStatusCode.INTERNAL_SERVER_ERROR,
                    'INTERNAL_ERROR'
                );
            }
        };
    }
}
