// DynamoDB item types and utilities

export interface BaseItem {
    PK: string;
    SK: string;
    GSI1PK?: string;
    GSI1SK?: string;
    createdAt: string;
    updatedAt: string;
}

export interface BoardItem extends BaseItem {
    PK: `USER#${string}`; // USER#<userId>
    SK: `BOARD#${string}`; // BOARD#<boardId>
    GSI1PK: `USER#${string}`;
    GSI1SK: `BOARD#${string}`;
    title: string;
    description?: string;
    itemType: 'BOARD';
}

export interface ListItem extends BaseItem {
    PK: `BOARD#${string}`; // BOARD#<boardId>
    SK: `LIST#${string}`; // LIST#<listId>
    GSI1PK: `BOARD#${string}`;
    GSI1SK: `LIST#${string}`;
    title: string;
    order: number; // For list ordering within board
    itemType: 'LIST';
}

export interface CardItem extends BaseItem {
    PK: `LIST#${string}`; // LIST#<listId>
    SK: `CARD#${string}`; // CARD#<cardId>
    GSI1PK: `LIST#${string}`;
    GSI1SK: `CARD#${string}`;
    title: string;
    description?: string;
    status: string;
    order: number; // For card ordering within list
    itemType: 'CARD';
}

export type KanbanItem = BoardItem | ListItem | CardItem;

// Type guards
export function isBoardItem(item: KanbanItem): item is BoardItem {
    return item.itemType === 'BOARD';
}

export function isListItem(item: KanbanItem): item is ListItem {
    return item.itemType === 'LIST';
}

export function isCardItem(item: KanbanItem): item is CardItem {
    return item.itemType === 'CARD';
}

// Key generation utilities
export const DatabaseKeys = {
    user: (userId: string): `USER#${string}` => `USER#${userId}`,
    board: (boardId: string): `BOARD#${string}` => `BOARD#${boardId}`,
    list: (listId: string): `LIST#${string}` => `LIST#${listId}`,
    card: (cardId: string): `CARD#${string}` => `CARD#${cardId}`,
} as const;
