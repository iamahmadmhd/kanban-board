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

/**
 * Generic DatabaseClient backed by DynamoDB DocumentClient.
 */
export default class DatabaseClient<TItem extends Record<string, NativeAttributeValue> = KanbanItem> {
    private readonly docClient: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor(tableName: string, client?: DynamoDBClient) {
        if (!tableName) throw new Error('TABLE_NAME is required');

        const dynamoClient =
            client ||
            new DynamoDBClient({
                region: process.env.AWS_REGION,
            });

        this.docClient = DynamoDBDocumentClient.from(dynamoClient);
        this.tableName = tableName;
    }

    async get(pk: string, sk: string): Promise<TItem | null> {
        try {
            const result = await this.docClient.send(
                new GetCommand({
                    TableName: this.tableName,
                    Key: { PK: pk, SK: sk },
                })
            );
            return (result.Item as TItem) || null;
        } catch (error) {
            console.error('Database get error:', error);
            throw new Error('Failed to retrieve item from database');
        }
    }

    async put(item: TItem): Promise<void> {
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

    async query(pk: string, skPrefix?: string): Promise<TItem[]> {
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
            return (result.Items as TItem[]) || [];
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
    ): Promise<TItem> {
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
            if (!result.Attributes) {
                throw new Error('Update returned no attributes');
            }
            return result.Attributes as TItem;
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
