import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { KanbanCognito } from '../../lib/constructs/cognito';

describe('KanbanCognito', () => {
    test('creates Cognito User Pool with correct configuration', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        new KanbanCognito(stack, 'TestCognito');
        const template = Template.fromStack(stack);

        template.hasResourceProperties('AWS::Cognito::UserPool', {
            UserPoolName: 'kanban-user-pool',
            AutoVerifiedAttributes: ['email'],
            UsernameAttributes: ['email'],
            Policies: {
                PasswordPolicy: {
                    MinimumLength: 8,
                    RequireLowercase: true,
                    RequireNumbers: true,
                    RequireSymbols: false,
                    RequireUppercase: true,
                },
            },
            AccountRecoverySetting: {
                RecoveryMechanisms: [{ Name: 'verified_email', Priority: 1 }],
            },
        });
    });

    test('creates User Pool Client with correct configuration', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        new KanbanCognito(stack, 'TestCognito');
        const template = Template.fromStack(stack);

        template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
            ClientName: 'kanban-web-client',
            GenerateSecret: false,
            ExplicitAuthFlows: [
                'ALLOW_USER_PASSWORD_AUTH',
                'ALLOW_USER_SRP_AUTH',
                'ALLOW_REFRESH_TOKEN_AUTH',
            ],
            PreventUserExistenceErrors: 'ENABLED',
            RefreshTokenValidity: 43200,
            AccessTokenValidity: 60,
            IdTokenValidity: 60,
        });
    });

    test('accepts custom names', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'CustomStack');
        new KanbanCognito(stack, 'CustomCognito', {
            userPoolName: 'custom-user-pool',
            clientName: 'custom-client',
        });

        const template = Template.fromStack(stack);
        template.hasResourceProperties('AWS::Cognito::UserPool', {
            UserPoolName: 'custom-user-pool',
        });
        template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
            ClientName: 'custom-client',
        });
    });
});
