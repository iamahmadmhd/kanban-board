import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand,
    QueryCommandInput,
    UpdateCommandInput,
    NativeAttributeValue,
} from '@aws-sdk/lib-dynamodb';
import { KanbanItem } from '../types/database';

export class DatabaseClient {
    private readonly docClient: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor(tableName: string, client?: DynamoDBClient) {
        const dynamoClient =
            client ||
            new DynamoDBClient({
                region: process.env.AWS_REGION || 'us-east-1',
                ...(process.env.LOCAL_DYNAMODB === 'true' && {
                    endpoint: 'http://localhost:8000',
                    credentials: {
                        accessKeyId: 'local',
                        secretAccessKey: 'local',
                    },
                }),
            });

        this.docClient = DynamoDBDocumentClient.from(dynamoClient);
        this.tableName = tableName;
    }

    async get(pk: string, sk: string): Promise<KanbanItem | null> {
        try {
            const result = await this.docClient.send(
                new GetCommand({
                    TableName: this.tableName,
                    Key: { PK: pk, SK: sk },
                })
            );
            return (result.Item as KanbanItem) || null;
        } catch (error) {
            console.error('Database get error:', error);
            throw new Error('Failed to retrieve item from database');
        }
    }

    async put(item: KanbanItem): Promise<void> {
        try {
            await this.docClient.send(
                new PutCommand({
                    TableName: this.tableName,
                    Item: item,
                })
            );
        } catch (error) {
            console.error('Database put error:', error);
            throw new Error('Failed to save item to database');
        }
    }

    async query(pk: string, skPrefix?: string): Promise<KanbanItem[]> {
        try {
            const params: QueryCommandInput = {
                TableName: this.tableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': pk,
                },
            };

            if (skPrefix) {
                params.KeyConditionExpression += ' AND begins_with(SK, :sk)';
                params.ExpressionAttributeValues![':sk'] = skPrefix;
            }

            const result = await this.docClient.send(new QueryCommand(params));
            return (result.Items as KanbanItem[]) || [];
        } catch (error) {
            console.error('Database query error:', error);
            throw new Error('Failed to query items from database');
        }
    }

    async update(
        pk: string,
        sk: string,
        updateExpression: string,
        expressionAttributeValues: Record<string, NativeAttributeValue>,
        expressionAttributeNames?: Record<string, string>
    ): Promise<KanbanItem> {
        try {
            const params: UpdateCommandInput = {
                TableName: this.tableName,
                Key: { PK: pk, SK: sk },
                UpdateExpression: updateExpression,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            };

            if (expressionAttributeNames) {
                params.ExpressionAttributeNames = expressionAttributeNames;
            }

            const result = await this.docClient.send(new UpdateCommand(params));
            return result.Attributes as KanbanItem;
        } catch (error) {
            console.error('Database update error:', error);
            throw new Error('Failed to update item in database');
        }
    }

    async delete(pk: string, sk: string): Promise<void> {
        try {
            await this.docClient.send(
                new DeleteCommand({
                    TableName: this.tableName,
                    Key: { PK: pk, SK: sk },
                })
            );
        } catch (error) {
            console.error('Database delete error:', error);
            throw new Error('Failed to delete item from database');
        }
    }
}
