import { KanbanItem, BoardItem, ListItem, CardItem } from '../models/types';

// Helper type guards
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
export const KeyUtils = {
    userKey: (userId: string): `USER#${string}` => `USER#${userId}`,
    boardKey: (boardId: string): `BOARD#${string}` => `BOARD#${boardId}`,
    listKey: (listId: string): `LIST#${string}` => `LIST#${listId}`,
    cardKey: (cardId: string): `CARD#${string}` => `CARD#${cardId}`,
} as const;
