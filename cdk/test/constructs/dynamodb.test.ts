import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { KanbanDynamoDB } from '../../lib/constructs/dynamodb';

describe('KanbanDynamoDB', () => {
    test('creates DynamoDB table with correct configuration', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        new KanbanDynamoDB(stack, 'TestDynamoDB');
        const template = Template.fromStack(stack);

        template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: 'KanbanTable',
            BillingMode: 'PAY_PER_REQUEST',
            AttributeDefinitions: [
                { AttributeName: 'PK', AttributeType: 'S' },
                { AttributeName: 'SK', AttributeType: 'S' },
                { AttributeName: 'GSI1PK', AttributeType: 'S' },
                { AttributeName: 'GSI1SK', AttributeType: 'S' },
            ],
            KeySchema: [
                { AttributeName: 'PK', KeyType: 'HASH' },
                { AttributeName: 'SK', KeyType: 'RANGE' },
            ],
        });
    });

    test('creates GSI1 for efficient queries', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        new KanbanDynamoDB(stack, 'TestDynamoDB');
        const template = Template.fromStack(stack);

        template.hasResourceProperties('AWS::DynamoDB::Table', {
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'GSI1',
                    KeySchema: [
                        { AttributeName: 'GSI1PK', KeyType: 'HASH' },
                        { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
                    ],
                },
            ],
        });
    });

    test('accepts custom table name', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'CustomStack');
        new KanbanDynamoDB(stack, 'CustomDynamoDB', {
            tableName: 'CustomKanbanTable',
        });

        const template = Template.fromStack(stack);
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: 'CustomKanbanTable',
        });
    });
});
