import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse, HttpStatusCode, ValidationError } from '../types/api';
import { AuthUtils } from './auth';
import { UserContext } from '../types/auth';

export class ApiUtils {
    /**
     * Create a successful API response
     */
    static success<T>(data: T, statusCode: number = HttpStatusCode.OK): APIGatewayProxyResult {
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
    ): APIGatewayProxyResult {
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
    static validationError(errors: ValidationError[]): APIGatewayProxyResult {
        console.error('Validation errors:', errors);
        return this.error('Validation failed', HttpStatusCode.BAD_REQUEST, 'VALIDATION_ERROR');
    }

    /**
     * Parse JSON body safely
     */
    static parseBody<T>(body?: string | null): T | null {
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
    static getPathParameter(event: APIGatewayProxyEvent, name: string): string | null {
        return event.pathParameters?.[name] ?? null;
    }

    /**
     * Extract query parameters safely
     */
    static getQueryParameter(event: APIGatewayProxyEvent, name: string): string | null {
        return event.queryStringParameters?.[name] ?? null;
    }

    /**
     * Get HTTP method from event (supports both v1.0 and v2.0 formats)
     */
    static getHttpMethod(event: APIGatewayProxyEvent | APIGatewayProxyEvent): string {
        // API Gateway v1.0 format
        if (event.requestContext?.httpMethod) {
            return event.requestContext.httpMethod;
        }
        // Fallback to httpMethod at root level (v1.0)
        if (event.httpMethod) {
            return event.httpMethod;
        }
        throw new Error('Unable to determine HTTP method from event');
    }

    /**
     * Wrapper for Lambda handlers with error handling and auth
     */
    static withErrorHandling(
        handler: (event: APIGatewayProxyEvent, userContext: UserContext) => Promise<APIGatewayProxyResult>
    ): APIGatewayProxyHandler {
        return async (event): Promise<APIGatewayProxyResult> => {
            try {
                // Handle CORS preflight
                if (event.requestContext.httpMethod === 'OPTIONS') {
                    return {
                        statusCode: 200,
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                        },
                        body: '',
                    };
                }

                // Extract user context (may throw if auth fails)
                const userContext = AuthUtils.extractUserContext(event);

                // Call the actual handler
                return await handler(event, userContext);
            } catch (error) {
                console.error('Lambda handler error:', error);

                if (error instanceof Error) {
                    const msg = error.message.toLowerCase();

                    if (msg.includes('not authenticated') || msg.includes('missing x-local-user')) {
                        return this.error(
                            'Authentication required',
                            HttpStatusCode.UNAUTHORIZED,
                            'AUTH_REQUIRED'
                        );
                    }

                    if (msg.includes('does not have access') || msg.includes('access denied')) {
                        return this.error('Access denied', HttpStatusCode.FORBIDDEN, 'ACCESS_DENIED');
                    }

                    if (msg.includes('not found') || msg.includes('notfound')) {
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
