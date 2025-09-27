import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { KanbanDynamoDB } from './constructs/dynamodb';
import { KanbanCognito } from './constructs/cognito';

export class KanbanStack extends cdk.Stack {
    public readonly database: KanbanDynamoDB;
    public readonly auth: KanbanCognito;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Database infrastructure
        this.database = new KanbanDynamoDB(this, 'Database', {
            tableName: 'KanbanTable',
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
        });

        // Authentication infrastructure
        this.auth = new KanbanCognito(this, 'Auth', {
            userPoolName: 'kanban-user-pool',
            clientName: 'kanban-web-client',
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
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

        new cdk.CfnOutput(this, 'UserPoolDomain', {
            value: `${this.auth.userPool.userPoolId}.auth.${this.region}.amazoncognito.com`,
            description: 'Cognito User Pool Domain',
            exportName: `${this.stackName}-UserPoolDomain`,
        });
    }
}
