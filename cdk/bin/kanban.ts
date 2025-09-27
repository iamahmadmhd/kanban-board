import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KanbanStack } from '../lib/kanban-stack';

const app = new cdk.App();

const stack = new KanbanStack(app, 'KanbanStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
    description: 'Serverless Kanban Board Application Stack',
});

// Add tags for cost tracking
cdk.Tags.of(stack).add('Project', 'Kanban');
cdk.Tags.of(stack).add('Environment', process.env.ENVIRONMENT || 'development');
cdk.Tags.of(stack).add('ManagedBy', 'CDK');

app.synth();
