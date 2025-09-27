import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { DatabaseClient } from '../../shared/utils/database';
import { ApiUtils } from '../../shared/utils/api';
import { APIGatewayEventWithAuth, UserContext } from '../../shared/types/auth';
import {
    CreateBoardRequest,
    UpdateBoardRequest,
    boardToResponse,
    HttpStatusCode,
} from '../../shared/types/api';
import { BoardItem, DatabaseKeys } from '../../shared/types/database';
import { NativeAttributeValue } from '@aws-sdk/lib-dynamodb';

const dbClient = new DatabaseClient(process.env.TABLE_NAME!);

// Validation schemas
const createBoardSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
});

const updateBoardSchema = z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
});

export const handler = ApiUtils.withErrorHandling(
    async (event: APIGatewayEventWithAuth, userContext: UserContext): Promise<APIGatewayProxyResultV2> => {
        const method = event.requestContext.http.method;
        const boardId = ApiUtils.getPathParameter(event, 'boardId');

        switch (method) {
            case 'GET':
                if (boardId) {
                    return await getBoard(userContext, boardId);
                } else {
                    return await listBoards(userContext);
                }

            case 'POST':
                return await createBoard(event, userContext);

            case 'PUT':
                if (!boardId) {
                    return ApiUtils.error('Board ID is required', HttpStatusCode.BAD_REQUEST);
                }
                return await updateBoard(event, userContext, boardId);

            case 'DELETE':
                if (!boardId) {
                    return ApiUtils.error('Board ID is required', HttpStatusCode.BAD_REQUEST);
                }
                return await deleteBoard(userContext, boardId);

            default:
                return ApiUtils.error('Method not allowed', 405);
        }
    }
);

async function listBoards(userContext: UserContext): Promise<APIGatewayProxyResultV2> {
    const userKey = DatabaseKeys.user(userContext.userId);
    const boards = await dbClient.query(userKey, 'BOARD#');

    const boardResponses = (boards || []).map(item => boardToResponse(item as BoardItem));

    return ApiUtils.success(boardResponses);
}

async function getBoard(userContext: UserContext, boardId: string): Promise<APIGatewayProxyResultV2> {
    const userKey = DatabaseKeys.user(userContext.userId);
    const boardKey = DatabaseKeys.board(boardId);

    const board = await dbClient.get(userKey, boardKey);

    if (!board) {
        return ApiUtils.error('Board not found', HttpStatusCode.NOT_FOUND);
    }

    return ApiUtils.success(boardToResponse(board as BoardItem));
}

async function createBoard(
    event: APIGatewayEventWithAuth,
    userContext: UserContext
): Promise<APIGatewayProxyResultV2> {
    const body = ApiUtils.parseBody<CreateBoardRequest>(event.body);

    if (!body) {
        return ApiUtils.error('Request body is required', HttpStatusCode.BAD_REQUEST);
    }

    const validation = createBoardSchema.safeParse(body);
    if (!validation.success) {
        return ApiUtils.error('Invalid request data', HttpStatusCode.BAD_REQUEST, 'VALIDATION_ERROR');
    }

    const boardId = uuidv4();
    const now = new Date().toISOString();
    const userKey = DatabaseKeys.user(userContext.userId);
    const boardKey = DatabaseKeys.board(boardId);

    const boardItem: BoardItem = {
        PK: userKey,
        SK: boardKey,
        GSI1PK: userKey,
        GSI1SK: boardKey,
        title: validation.data.title,
        description: validation.data.description,
        itemType: 'BOARD',
        createdAt: now,
        updatedAt: now,
    };

    await dbClient.put(boardItem);

    return ApiUtils.success(boardToResponse(boardItem), HttpStatusCode.CREATED);
}

async function updateBoard(
    event: APIGatewayEventWithAuth,
    userContext: UserContext,
    boardId: string
): Promise<APIGatewayProxyResultV2> {
    const body = ApiUtils.parseBody<UpdateBoardRequest>(event.body);

    if (!body) {
        return ApiUtils.error('Request body is required', HttpStatusCode.BAD_REQUEST);
    }

    const validation = updateBoardSchema.safeParse(body);
    if (!validation.success) {
        return ApiUtils.error('Invalid request data', HttpStatusCode.BAD_REQUEST, 'VALIDATION_ERROR');
    }

    const userKey = DatabaseKeys.user(userContext.userId);
    const boardKey = DatabaseKeys.board(boardId);

    // Check if board exists and belongs to user
    const existingBoard = await dbClient.get(userKey, boardKey);
    if (!existingBoard) {
        return ApiUtils.error('Board not found', HttpStatusCode.NOT_FOUND);
    }

    // Build update expression dynamically
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

    if (validation.data.description !== undefined) {
        updateExpressions.push('#description = :description');
        expressionAttributeNames['#description'] = 'description';
        expressionAttributeValues[':description'] = validation.data.description;
    }

    const updatedBoard = await dbClient.update(
        userKey,
        boardKey,
        `SET ${updateExpressions.join(', ')}`,
        expressionAttributeValues,
        expressionAttributeNames
    );

    return ApiUtils.success(boardToResponse(updatedBoard as BoardItem));
}

async function deleteBoard(userContext: UserContext, boardId: string): Promise<APIGatewayProxyResultV2> {
    const userKey = DatabaseKeys.user(userContext.userId);
    const boardKey = DatabaseKeys.board(boardId);

    // Check if board exists and belongs to user
    const existingBoard = await dbClient.get(userKey, boardKey);
    if (!existingBoard) {
        return ApiUtils.error('Board not found', HttpStatusCode.NOT_FOUND);
    }

    // TODO: Also delete associated lists and cards
    // For now, just delete the board
    await dbClient.delete(userKey, boardKey);

    return ApiUtils.success({ deleted: true });
}
