import { DatabaseClient } from '../../../lib/shared/utils/database';
import { BoardItem, DatabaseKeys } from '../../../lib/shared/types/database';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DatabaseClient', () => {
    let client: DatabaseClient;

    beforeEach(() => {
        ddbMock.reset();
        client = new DatabaseClient('test-table');
    });

    test('get returns item when found', async () => {
        const mockBoard: BoardItem = {
            PK: DatabaseKeys.user('user123'),
            SK: DatabaseKeys.board('board456'),
            GSI1PK: DatabaseKeys.user('user123'),
            GSI1SK: DatabaseKeys.board('board456'),
            title: 'Test Board',
            itemType: 'BOARD',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
        };

        ddbMock.on(GetCommand).resolves({ Item: mockBoard });

        const result = await client.get('USER#user123', 'BOARD#board456');
        expect(result).toEqual(mockBoard);
    });

    test('get returns null when item not found', async () => {
        ddbMock.on(GetCommand).resolves({});

        const result = await client.get('USER#user123', 'BOARD#nonexistent');
        expect(result).toBeNull();
    });

    test('put saves item successfully', async () => {
        const mockBoard: BoardItem = {
            PK: DatabaseKeys.user('user123'),
            SK: DatabaseKeys.board('board456'),
            GSI1PK: DatabaseKeys.user('user123'),
            GSI1SK: DatabaseKeys.board('board456'),
            title: 'Test Board',
            itemType: 'BOARD',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
        };

        ddbMock.on(PutCommand).resolves({});

        await expect(client.put(mockBoard)).resolves.not.toThrow();
        expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
    });
});
