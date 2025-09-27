import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface KanbanDynamoDBProps {
    tableName?: string;
    removalPolicy?: cdk.RemovalPolicy;
}

export class KanbanDynamoDB extends Construct {
    public readonly table: dynamodb.Table;

    constructor(scope: Construct, id: string, props: KanbanDynamoDBProps = {}) {
        super(scope, id);

        // DynamoDB table with single-table design
        this.table = new dynamodb.Table(this, 'Table', {
            tableName: props.tableName || 'KanbanTable',
            partitionKey: {
                name: 'PK',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'SK',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Free tier friendly
            removalPolicy: props.removalPolicy || cdk.RemovalPolicy.DESTROY,
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: false, // Keep costs down
            },
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
        });

        // GSI for querying boards by user and other access patterns
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
    }
}
