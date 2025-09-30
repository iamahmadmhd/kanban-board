// Authentication types and interfaces

// User context extracted from authentication
export interface UserContext {
    userId: string;
    email: string;
    name: string;
    isAuthenticated: boolean;
}

// Cognito JWT token payload
export interface CognitoJWTClaims {
    sub: string; // Cognito user ID
    email: string;
    email_verified: boolean;
    given_name: string;
    family_name: string;
    aud: string; // Client ID
    iss: string; // Issuer
    iat: number; // Issued at
    exp: number; // Expires at
    token_use: 'access' | 'id';
}

// Local development auth header format
export interface LocalAuthHeaders {
    'X-Local-User'?: string;
    'x-local-user'?: string;
}

// Local development user data structure
export interface LocalUserData {
    sub?: string;
    email?: string;
    given_name?: string;
    family_name?: string;
}
