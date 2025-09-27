import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface KanbanCognitoProps {
    userPoolName?: string;
    clientName?: string;
    removalPolicy?: cdk.RemovalPolicy;
}

export class KanbanCognito extends Construct {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;

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
                requireSymbols: false, // Keep it simple for users
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

        // User Pool Client for web application
        this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: props.clientName || 'kanban-web-client',
            generateSecret: false, // Required for public clients (web/mobile)
            authFlows: {
                userSrp: true, // Enable SRP auth flow
                userPassword: true, // Enable username/password auth
            },
            preventUserExistenceErrors: true, // Better security
            refreshTokenValidity: cdk.Duration.days(30),
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
            supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
        });
    }
}
