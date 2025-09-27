import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand,
    UpdateCommandInput,
    QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { KanbanItem } from '../models/types';

export class DynamoDB {
    private readonly docClient: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor(tableName: string, client?: DynamoDBClient) {
        const dynamoClient =
            client ||
            new DynamoDBClient({
                region: process.env.AWS_REGION || 'eu-central-1',
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

    async getItem(pk: string, sk: string): Promise<KanbanItem | null> {
        try {
            const result = await this.docClient.send(
                new GetCommand({
                    TableName: this.tableName,
                    Key: { PK: pk, SK: sk },
                })
            );
            return (result.Item as KanbanItem) || null;
        } catch (error) {
            console.error('Error getting item:', error);
            throw new Error('Failed to retrieve item from database');
        }
    }

    async putItem(item: KanbanItem): Promise<void> {
        try {
            await this.docClient.send(
                new PutCommand({
                    TableName: this.tableName,
                    Item: item,
                })
            );
        } catch (error) {
            console.error('Error putting item:', error);
            throw new Error('Failed to save item to database');
        }
    }

    async queryItems(pk: string, skBeginsWith?: string): Promise<KanbanItem[]> {
        try {
            const params: QueryCommandInput = {
                TableName: this.tableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': pk,
                },
            };

            if (skBeginsWith) {
                params.KeyConditionExpression += ' AND begins_with(SK, :sk)';
                params.ExpressionAttributeValues![':sk'] = skBeginsWith;
            }

            const result = await this.docClient.send(new QueryCommand(params));
            return (result.Items as KanbanItem[]) || [];
        } catch (error) {
            console.error('Error querying items:', error);
            throw new Error('Failed to query items from database');
        }
    }

    async updateItem(
        pk: string,
        sk: string,
        updateExpression: string,
        expressionAttributeValues: Record<string, UpdateCommandInput>,
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
                params.ExpressionAttributeValues = expressionAttributeNames;
            }

            const result = await this.docClient.send(new UpdateCommand(params));
            return result.Attributes as KanbanItem;
        } catch (error) {
            console.error('Error updating item:', error);
            throw new Error('Failed to update item in database');
        }
    }

    async deleteItem(pk: string, sk: string): Promise<void> {
        try {
            await this.docClient.send(
                new DeleteCommand({
                    TableName: this.tableName,
                    Key: { PK: pk, SK: sk },
                })
            );
        } catch (error) {
            console.error('Error deleting item:', error);
            throw new Error('Failed to delete item from database');
        }
    }
}
