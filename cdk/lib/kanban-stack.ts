import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class KanbanStack extends cdk.Stack {
    public readonly table: dynamodb.Table;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // DynamoDB table with single-table design
        this.table = new dynamodb.Table(this, 'KanbanTable', {
            tableName: 'KanbanTable',
            partitionKey: {
                name: 'PK',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'SK',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
            pointInTimeRecovery: false, // Keep costs down
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
        });

        // GSI for querying boards by user
        this.table.addGlobalSecondaryIndex({
            indexName: 'GSI1',
            partitionKey: {
                name: 'GSI1PK',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'GSI1SK',
                type: dynamodb.AttributeType.STRING,
            },
        });

        // Output table name for frontend integration
        new cdk.CfnOutput(this, 'TableName', {
            value: this.table.tableName,
            description: 'DynamoDB table name',
            exportName: 'KanbanTableName',
        });

        // Output table ARN for Lambda permissions
        new cdk.CfnOutput(this, 'TableArn', {
            value: this.table.tableArn,
            description: 'DynamoDB table ARN',
            exportName: 'KanbanTableArn',
        });
    }
}
