// API request and response types

// Standard API response wrapper
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
    };
}

// Error response structure
export interface ApiError {
    message: string;
    code?: string;
    statusCode: number;
}

// Common HTTP status codes
export enum HttpStatusCode {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    INTERNAL_SERVER_ERROR = 500,
}

// Request validation error details
export interface ValidationError {
    field: string;
    message: string;
    value?: unknown;
}
