// API request and response types

import { BoardItem, ListItem, CardItem } from './database';

// Standard API response wrapper
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
    };
}

// Error response structure
export interface ApiError {
    message: string;
    code?: string;
    statusCode: number;
}

// Common HTTP status codes
export enum HttpStatusCode {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    INTERNAL_SERVER_ERROR = 500,
}

// Request validation error details
export interface ValidationError {
    field: string;
    message: string;
    value?: unknown;
}

// Board API types
export interface CreateBoardRequest {
    title: string;
    description?: string;
}

export interface UpdateBoardRequest {
    title?: string;
    description?: string;
}

export interface BoardResponse {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

// List API types
export interface CreateListRequest {
    title: string;
    order?: number;
}

export interface UpdateListRequest {
    title?: string;
    order?: number;
}

export interface ListResponse {
    id: string;
    boardId: string;
    title: string;
    order: number;
    createdAt: string;
    updatedAt: string;
}

// Card API types
export interface CreateCardRequest {
    title: string;
    description?: string;
    order?: number;
}

export interface UpdateCardRequest {
    title?: string;
    description?: string;
    status?: string;
    order?: number;
    listId?: string; // For moving cards between lists
}

export interface CardResponse {
    id: string;
    listId: string;
    title: string;
    description?: string;
    status: string;
    order: number;
    createdAt: string;
    updatedAt: string;
}

// Utility functions to convert database items to API responses
export function boardToResponse(item: BoardItem): BoardResponse {
    const boardId = item.SK.replace('BOARD#', '');
    return {
        id: boardId,
        title: item.title,
        description: item.description,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

export function listToResponse(item: ListItem): ListResponse {
    const listId = item.SK.replace('LIST#', '');
    const boardId = item.PK.replace('BOARD#', '');
    return {
        id: listId,
        boardId,
        title: item.title,
        order: item.order,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

export function cardToResponse(item: CardItem): CardResponse {
    const cardId = item.SK.replace('CARD#', '');
    const listId = item.PK.replace('LIST#', '');
    return {
        id: cardId,
        listId,
        title: item.title,
        description: item.description,
        status: item.status,
        order: item.order,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}
