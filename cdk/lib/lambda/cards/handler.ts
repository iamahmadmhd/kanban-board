import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import DatabaseClient from '../../shared/utils/database';
import { ApiUtils } from '../../shared/utils/api';
import { UserContext } from '../../shared/types/auth';
import { CreateCardRequest, UpdateCardRequest, cardToResponse, HttpStatusCode } from '../../shared/types/api';
import { CardItem, DatabaseKeys } from '../../shared/types/database';
import { NativeAttributeValue } from '@aws-sdk/lib-dynamodb';

const dbClient = new DatabaseClient(process.env.TABLE_NAME!);

// Validation schemas
const createCardSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    order: z.number().int().min(0).optional(),
});

const updateCardSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    status: z.string().max(50).optional(),
    order: z.number().int().min(0).optional(),
    listId: z.string().uuid().optional(), // For moving cards
});

export const handler = ApiUtils.withErrorHandling(
    async (event: APIGatewayProxyEvent, userContext: UserContext): Promise<APIGatewayProxyResult> => {
        const method = event.requestContext.httpMethod;
        const boardId = ApiUtils.getPathParameter(event, 'boardId');
        const listId = ApiUtils.getPathParameter(event, 'listId');
        const cardId = ApiUtils.getPathParameter(event, 'cardId');

        if (!boardId) {
            return ApiUtils.error('Board ID is required', HttpStatusCode.BAD_REQUEST);
        }

        if (!listId) {
            return ApiUtils.error('List ID is required', HttpStatusCode.BAD_REQUEST);
        }

        // Verify board belongs to user
        await verifyBoardAccess(userContext, boardId);
        // Verify list exists in board
        await verifyListExists(boardId, listId);

        switch (method) {
            case 'GET':
                return await getCards(listId);

            case 'POST':
                return await createCard(event, userContext, listId);

            case 'PUT':
                if (!cardId) {
                    return ApiUtils.error('Card ID is required', HttpStatusCode.BAD_REQUEST);
                }
                return await updateCard(event, userContext, listId, cardId);

            case 'DELETE':
                if (!cardId) {
                    return ApiUtils.error('Card ID is required', HttpStatusCode.BAD_REQUEST);
                }
                return await deleteCard(userContext, listId, cardId);

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

async function verifyListExists(boardId: string, listId: string): Promise<void> {
    const boardKey = DatabaseKeys.board(boardId);
    const listKey = DatabaseKeys.list(listId);

    const list = await dbClient.get(boardKey, listKey);
    if (!list) {
        throw new Error('List not found');
    }
}

async function getCards(listId: string): Promise<APIGatewayProxyResult> {
    const listKey = DatabaseKeys.list(listId);
    const cards = await dbClient.query(listKey, 'CARD#');

    const cardResponses = (cards || [])
        .map(item => cardToResponse(item as CardItem))
        .sort((a, b) => a.order - b.order);

    return ApiUtils.success(cardResponses);
}

async function createCard(
    event: APIGatewayProxyEvent,
    userContext: UserContext,
    listId: string
): Promise<APIGatewayProxyResult> {
    const body = ApiUtils.parseBody<CreateCardRequest>(event.body);

    if (!body) {
        return ApiUtils.error('Request body is required', HttpStatusCode.BAD_REQUEST);
    }

    const validation = createCardSchema.safeParse(body);
    if (!validation.success) {
        return ApiUtils.error('Invalid request data', HttpStatusCode.BAD_REQUEST, 'VALIDATION_ERROR');
    }

    const cardId = uuidv4();
    const now = new Date().toISOString();
    const listKey = DatabaseKeys.list(listId);
    const cardKey = DatabaseKeys.card(cardId);

    // Get current card count for default order
    const existingCards = await dbClient.query(listKey, 'CARD#');
    const defaultOrder = validation.data.order ?? (existingCards || []).length;

    const cardItem: CardItem = {
        PK: listKey,
        SK: cardKey,
        GSI1PK: listKey,
        GSI1SK: cardKey,
        title: validation.data.title,
        description: validation.data.description,
        status: 'open',
        order: defaultOrder,
        itemType: 'CARD',
        createdAt: now,
        updatedAt: now,
    };

    await dbClient.put(cardItem);

    return ApiUtils.success(cardToResponse(cardItem), HttpStatusCode.CREATED);
}

async function updateCard(
    event: APIGatewayProxyEvent,
    userContext: UserContext,
    listId: string,
    cardId: string
): Promise<APIGatewayProxyResult> {
    const body = ApiUtils.parseBody<UpdateCardRequest>(event.body);

    if (!body) {
        return ApiUtils.error('Request body is required', HttpStatusCode.BAD_REQUEST);
    }

    const validation = updateCardSchema.safeParse(body);
    if (!validation.success) {
        return ApiUtils.error('Invalid request data', HttpStatusCode.BAD_REQUEST, 'VALIDATION_ERROR');
    }

    const listKey = DatabaseKeys.list(listId);
    const cardKey = DatabaseKeys.card(cardId);

    // Check if card exists
    const existingCard = await dbClient.get(listKey, cardKey);
    if (!existingCard) {
        return ApiUtils.error('Card not found', HttpStatusCode.NOT_FOUND);
    }

    // Handle moving card to different list
    if (validation.data.listId && validation.data.listId !== listId) {
        return await moveCard(existingCard as CardItem, validation.data.listId, validation.data);
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

    if (validation.data.description !== undefined) {
        updateExpressions.push('#description = :description');
        expressionAttributeNames['#description'] = 'description';
        expressionAttributeValues[':description'] = validation.data.description;
    }

    if (validation.data.status) {
        updateExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = validation.data.status;
    }

    if (validation.data.order !== undefined) {
        updateExpressions.push('#order = :order');
        expressionAttributeNames['#order'] = 'order';
        expressionAttributeValues[':order'] = validation.data.order;
    }

    const updatedCard = await dbClient.update(
        listKey,
        cardKey,
        `SET ${updateExpressions.join(', ')}`,
        expressionAttributeValues,
        expressionAttributeNames
    );

    return ApiUtils.success(cardToResponse(updatedCard as CardItem));
}

async function moveCard(
    existingCard: CardItem,
    newListId: string,
    updateData: UpdateCardRequest
): Promise<APIGatewayProxyResult> {
    const oldListKey = existingCard.PK;
    const cardKey = existingCard.SK;
    const newListKey = DatabaseKeys.list(newListId);
    const now = new Date().toISOString();

    // Create new card item in destination list
    const newCardItem: CardItem = {
        ...existingCard,
        PK: newListKey,
        GSI1PK: newListKey,
        title: updateData.title || existingCard.title,
        description: updateData.description !== undefined ? updateData.description : existingCard.description,
        status: updateData.status || existingCard.status,
        order: updateData.order !== undefined ? updateData.order : 0,
        updatedAt: now,
    };

    // Put new card and delete old card (transaction would be better)
    await dbClient.put(newCardItem);
    await dbClient.delete(oldListKey, cardKey);

    return ApiUtils.success(cardToResponse(newCardItem));
}

async function deleteCard(
    userContext: UserContext,
    listId: string,
    cardId: string
): Promise<APIGatewayProxyResult> {
    const listKey = DatabaseKeys.list(listId);
    const cardKey = DatabaseKeys.card(cardId);

    // Check if card exists
    const existingCard = await dbClient.get(listKey, cardKey);
    if (!existingCard) {
        return ApiUtils.error('Card not found', HttpStatusCode.NOT_FOUND);
    }

    await dbClient.delete(listKey, cardKey);

    return ApiUtils.success({ deleted: true });
}
