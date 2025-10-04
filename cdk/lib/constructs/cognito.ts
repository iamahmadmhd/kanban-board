import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface KanbanCognitoProps {
    userPoolName?: string;
    clientName?: string;
    removalPolicy?: cdk.RemovalPolicy;
    callbackUrls?: string[];
    logoutUrls?: string[];
}

export class KanbanCognito extends Construct {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;
    public readonly userPoolDomain: cognito.UserPoolDomain;
    public readonly hostedUiUrl: string;

    constructor(scope: Construct, id: string, props: KanbanCognitoProps = {}) {
        super(scope, id);

        // Cognito User Pool
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: props.userPoolName || 'kanban-user-pool',
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                givenName: {
                    required: true,
                    mutable: true,
                },
                familyName: {
                    required: true,
                    mutable: true,
                },
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: props.removalPolicy || cdk.RemovalPolicy.DESTROY,
            autoVerify: {
                email: true,
            },
            userVerification: {
                emailSubject: 'Verify your email for Kanban Board',
                emailBody: 'Hello, Thanks for signing up to Kanban Board! Your verification code is {####}',
                emailStyle: cognito.VerificationEmailStyle.CODE,
            },
            signInCaseSensitive: false,
        });

        // Hosted UI Domain
        const domainPrefix = `kanban-${cdk.Stack.of(this).account}`;

        this.userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
            userPool: this.userPool,
            cognitoDomain: {
                domainPrefix,
            },
        });

        // Default callback/logout URLs for local development
        const defaultCallbackUrls = props.callbackUrls || [
            'http://localhost:3000/api/auth/callback/cognito',
            'http://localhost:3000',
        ];

        const defaultLogoutUrls = props.logoutUrls || [
            'http://localhost:3000',
            'http://localhost:3000/login',
        ];

        // User Pool Client with OAuth configuration
        this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: props.clientName || 'kanban-web-client',
            generateSecret: false, // SPA/SSR apps don't use client secret
            authFlows: {
                userSrp: true,
                userPassword: true,
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
                callbackUrls: defaultCallbackUrls,
                logoutUrls: defaultLogoutUrls,
            },
            preventUserExistenceErrors: true,
            refreshTokenValidity: cdk.Duration.days(30),
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
            supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
        });

        // Construct hosted UI URL
        const region = cdk.Stack.of(this).region;
        this.hostedUiUrl = `https://${domainPrefix}.auth.${region}.amazoncognito.com`;
    }
}
