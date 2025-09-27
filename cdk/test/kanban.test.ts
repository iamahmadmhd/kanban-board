import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { KanbanStack } from '../lib/kanban-stack';

describe('KanbanStack', () => {
    let app: cdk.App;
    let stack: KanbanStack;
    let template: Template;

    beforeEach(() => {
        app = new cdk.App();
        stack = new KanbanStack(app, 'TestKanbanStack');
        template = Template.fromStack(stack);
    });

    test('creates DynamoDB table with correct configuration', () => {
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: 'KanbanTable',
            BillingMode: 'PAY_PER_REQUEST',
            AttributeDefinitions: [
                {
                    AttributeName: 'PK',
                    AttributeType: 'S',
                },
                {
                    AttributeName: 'SK',
                    AttributeType: 'S',
                },
                {
                    AttributeName: 'GSI1PK',
                    AttributeType: 'S',
                },
                {
                    AttributeName: 'GSI1SK',
                    AttributeType: 'S',
                },
            ],
            KeySchema: [
                {
                    AttributeName: 'PK',
                    KeyType: 'HASH',
                },
                {
                    AttributeName: 'SK',
                    KeyType: 'RANGE',
                },
            ],
        });
    });

    test('creates GSI1 for user queries', () => {
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'GSI1',
                    KeySchema: [
                        {
                            AttributeName: 'GSI1PK',
                            KeyType: 'HASH',
                        },
                        {
                            AttributeName: 'GSI1SK',
                            KeyType: 'RANGE',
                        },
                    ],
                },
            ],
        });
    });

    test('outputs table name and ARN', () => {
        template.hasOutput('TableName', {});
        template.hasOutput('TableArn', {});
    });
});
