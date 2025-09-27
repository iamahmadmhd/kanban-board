import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { DatabaseClient } from '../../shared/utils/database';
import { ApiUtils } from '../../shared/utils/api';
import { APIGatewayEventWithAuth, UserContext } from '../../shared/types/auth';
import { CreateListRequest, UpdateListRequest, listToResponse, HttpStatusCode } from '../../shared/types/api';
import { ListItem, DatabaseKeys } from '../../shared/types/database';
import { NativeAttributeValue } from '@aws-sdk/lib-dynamodb';

const dbClient = new DatabaseClient(process.env.TABLE_NAME!);

// Validation schemas
const createListSchema = z.object({
    title: z.string().min(1).max(100),
    order: z.number().int().min(0).optional(),
});

const updateListSchema = z.object({
    title: z.string().min(1).max(100).optional(),
    order: z.number().int().min(0).optional(),
});

export const handler = ApiUtils.withErrorHandling(
    async (event: APIGatewayEventWithAuth, userContext: UserContext): Promise<APIGatewayProxyResultV2> => {
        const method = event.requestContext.http.method;
        const boardId = ApiUtils.getPathParameter(event, 'boardId');
        const listId = ApiUtils.getPathParameter(event, 'listId');

        if (!boardId) {
            return ApiUtils.error('Board ID is required', HttpStatusCode.BAD_REQUEST);
        }

        // Verify board belongs to user
        await verifyBoardAccess(userContext, boardId);

        switch (method) {
            case 'GET':
                return await getLists(boardId);

            case 'POST':
                return await createList(event, userContext, boardId);

            case 'PUT':
                if (!listId) {
                    return ApiUtils.error('List ID is required', HttpStatusCode.BAD_REQUEST);
                }
                return await updateList(event, userContext, boardId, listId);

            case 'DELETE':
                if (!listId) {
                    return ApiUtils.error('List ID is required', HttpStatusCode.BAD_REQUEST);
                }
                return await deleteList(userContext, boardId, listId);

            default:
                return ApiUtils.error('Method not allowed', 405);
        }
    }
);

async function verifyBoardAccess(userContext: UserContext, boardId: string): Promise<void> {
    const userKey = DatabaseKeys.user(userContext.userId);
    const boardKey = DatabaseKeys.board(boardId);

    const board = await dbClient.get(userKey, boardKey);
    if (!board) {
        throw new Error('Board not found or access denied');
    }
}

async function getLists(boardId: string): Promise<APIGatewayProxyResultV2> {
    const boardKey = DatabaseKeys.board(boardId);
    const lists = await dbClient.query(boardKey, 'LIST#');

    const listResponses = (lists || [])
        .map(item => listToResponse(item as ListItem))
        .sort((a, b) => a.order - b.order);

    return ApiUtils.success(listResponses);
}

async function createList(
    event: APIGatewayEventWithAuth,
    userContext: UserContext,
    boardId: string
): Promise<APIGatewayProxyResultV2> {
    const body = ApiUtils.parseBody<CreateListRequest>(event.body);

    if (!body) {
        return ApiUtils.error('Request body is required', HttpStatusCode.BAD_REQUEST);
    }

    const validation = createListSchema.safeParse(body);
    if (!validation.success) {
        return ApiUtils.error('Invalid request data', HttpStatusCode.BAD_REQUEST, 'VALIDATION_ERROR');
    }

    const listId = uuidv4();
    const now = new Date().toISOString();
    const boardKey = DatabaseKeys.board(boardId);
    const listKey = DatabaseKeys.list(listId);

    // Get current list count for default order
    const existingLists = await dbClient.query(boardKey, 'LIST#');
    const defaultOrder = validation.data.order ?? (existingLists || []).length;

    const listItem: ListItem = {
        PK: boardKey,
        SK: listKey,
        GSI1PK: boardKey,
        GSI1SK: listKey,
        title: validation.data.title,
        order: defaultOrder,
        itemType: 'LIST',
        createdAt: now,
        updatedAt: now,
    };

    await dbClient.put(listItem);

    return ApiUtils.success(listToResponse(listItem), HttpStatusCode.CREATED);
}

async function updateList(
    event: APIGatewayEventWithAuth,
    userContext: UserContext,
    boardId: string,
    listId: string
): Promise<APIGatewayProxyResultV2> {
    const body = ApiUtils.parseBody<UpdateListRequest>(event.body);

    if (!body) {
        return ApiUtils.error('Request body is required', HttpStatusCode.BAD_REQUEST);
    }

    const validation = updateListSchema.safeParse(body);
    if (!validation.success) {
        return ApiUtils.error('Invalid request data', HttpStatusCode.BAD_REQUEST, 'VALIDATION_ERROR');
    }

    const boardKey = DatabaseKeys.board(boardId);
    const listKey = DatabaseKeys.list(listId);

    // Check if list exists
    const existingList = await dbClient.get(boardKey, listKey);
    if (!existingList) {
        return ApiUtils.error('List not found', HttpStatusCode.NOT_FOUND);
    }

    // Build update expression
    const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
    const expressionAttributeValues: Record<string, NativeAttributeValue> = {
        ':updatedAt': new Date().toISOString(),
    };

    if (validation.data.title) {
        updateExpressions.push('#title = :title');
        expressionAttributeNames['#title'] = 'title';
        expressionAttributeValues[':title'] = validation.data.title;
    }

    if (validation.data.order !== undefined) {
        updateExpressions.push('#order = :order');
        expressionAttributeNames['#order'] = 'order';
        expressionAttributeValues[':order'] = validation.data.order;
    }

    const updatedList = await dbClient.update(
        boardKey,
        listKey,
        `SET ${updateExpressions.join(', ')}`,
        expressionAttributeValues,
        expressionAttributeNames
    );

    return ApiUtils.success(listToResponse(updatedList as ListItem));
}

async function deleteList(
    userContext: UserContext,
    boardId: string,
    listId: string
): Promise<APIGatewayProxyResultV2> {
    const boardKey = DatabaseKeys.board(boardId);
    const listKey = DatabaseKeys.list(listId);

    // Check if list exists
    const existingList = await dbClient.get(boardKey, listKey);
    if (!existingList) {
        return ApiUtils.error('List not found', HttpStatusCode.NOT_FOUND);
    }

    // TODO: Also delete associated cards
    // For now, just delete the list
    await dbClient.delete(boardKey, listKey);

    return ApiUtils.success({ deleted: true });
}
