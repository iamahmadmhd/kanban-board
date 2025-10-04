import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { KanbanDynamoDB } from './constructs/dynamodb';
import { KanbanCognito } from './constructs/cognito';
import { KanbanApi } from './constructs/api';

export class KanbanStack extends cdk.Stack {
    public readonly database: KanbanDynamoDB;
    public readonly auth: KanbanCognito;
    public readonly api: KanbanApi;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Get frontend URLs from context or environment
        const frontendUrlParam = ssm.StringParameter.fromStringParameterName(
            this,
            'FrontendUrlParam',
            '/kanban/frontend-url'
        );
        const frontendUrl = frontendUrlParam.stringValue;

        const callbackUrls = [`${frontendUrl}/api/auth/callback/cognito`, frontendUrl];

        const logoutUrls = [`${frontendUrl}/login`, frontendUrl];

        // Database infrastructure
        this.database = new KanbanDynamoDB(this, 'Database', {
            tableName: 'KanbanTable',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Authentication infrastructure
        this.auth = new KanbanCognito(this, 'Auth', {
            userPoolName: 'kanban-user-pool',
            clientName: 'kanban-web-client',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            callbackUrls,
            logoutUrls,
        });

        // API Gateway with Lambda functions
        this.api = new KanbanApi(this, 'Api', {
            table: this.database.table,
            userPool: this.auth.userPool,
            apiName: 'kanban-api',
        });

        // Stack outputs for frontend integration
        new cdk.CfnOutput(this, 'TableName', {
            value: this.database.table.tableName,
            description: 'DynamoDB table name',
            exportName: `${this.stackName}-TableName`,
        });

        new cdk.CfnOutput(this, 'TableArn', {
            value: this.database.table.tableArn,
            description: 'DynamoDB table ARN',
            exportName: `${this.stackName}-TableArn`,
        });

        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.auth.userPool.userPoolId,
            description: 'Cognito User Pool ID',
            exportName: `${this.stackName}-UserPoolId`,
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: this.auth.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
            exportName: `${this.stackName}-UserPoolClientId`,
        });

        new cdk.CfnOutput(this, 'CognitoHostedUiUrl', {
            value: this.auth.hostedUiUrl,
            description: 'Cognito Hosted UI URL',
            exportName: `${this.stackName}-CognitoHostedUiUrl`,
        });

        new cdk.CfnOutput(this, 'UserPoolDomain', {
            value: `${this.auth.userPool.userPoolId}.auth.${this.region}.amazoncognito.com`,
            description: 'Cognito User Pool Domain',
            exportName: `${this.stackName}-UserPoolDomain`,
        });

        new cdk.CfnOutput(this, 'ApiUrl', {
            value: this.api.api.url,
            description: 'API Gateway URL',
            exportName: `${this.stackName}-ApiUrl`,
        });

        new cdk.CfnOutput(this, 'Region', {
            value: this.region,
            description: 'AWS Region',
            exportName: `${this.stackName}-Region`,
        });
    }
}
