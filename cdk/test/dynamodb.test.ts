import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDB } from '../lib/db/dynamodb';
import { BoardItem } from '../lib/models/types';
import { KeyUtils } from '../lib/utils/types';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoDB', () => {
    let helper: DynamoDB;

    beforeEach(() => {
        ddbMock.reset();
        helper = new DynamoDB('test-table');
    });

    test('getItem returns item when found', async () => {
        const mockBoard: BoardItem = {
            PK: KeyUtils.userKey('user123'),
            SK: KeyUtils.boardKey('board456'),
            GSI1PK: KeyUtils.userKey('user123'),
            GSI1SK: KeyUtils.boardKey('board456'),
            title: 'Test Board',
            itemType: 'BOARD',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
        };

        ddbMock.on(GetCommand).resolves({ Item: mockBoard });

        const result = await helper.getItem('USER#user123', 'BOARD#board456');
        expect(result).toEqual(mockBoard);
    });

    test('getItem returns null when item not found', async () => {
        ddbMock.on(GetCommand).resolves({});

        const result = await helper.getItem('USER#user123', 'BOARD#nonexistent');
        expect(result).toBeNull();
    });

    test('putItem saves item successfully', async () => {
        const mockBoard: BoardItem = {
            PK: KeyUtils.userKey('user123'),
            SK: KeyUtils.boardKey('board456'),
            GSI1PK: KeyUtils.userKey('user123'),
            GSI1SK: KeyUtils.boardKey('board456'),
            title: 'Test Board',
            itemType: 'BOARD',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
        };

        ddbMock.on(PutCommand).resolves({});

        await expect(helper.putItem(mockBoard)).resolves.not.toThrow();
        expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
    });
});
