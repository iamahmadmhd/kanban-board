import { getSession } from '../app/actions';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ApiError {
    message: string;
    code?: string;
    statusCode: number;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async getAuthHeaders(): Promise<HeadersInit> {
        const session = await getSession();

        if (!session) {
            throw new Error('Not authenticated');
        }

        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.idToken}`,
        };
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const error: ApiError = {
                message: response.statusText,
                statusCode: response.status,
            };

            try {
                const errorData = await response.json();
                error.message = errorData.error?.message || errorData.message || error.message;
                error.code = errorData.error?.code || errorData.code;
            } catch {
                // If response is not JSON, use status text
            }

            throw error;
        }

        const data = await response.json();
        return data.data || data;
    }

    async get<T>(path: string): Promise<T> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        return this.handleResponse<T>(response);
    }

    async post<T>(path: string, body: unknown): Promise<T> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            cache: 'no-store',
        });

        return this.handleResponse<T>(response);
    }

    async put<T>(path: string, body: unknown): Promise<T> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
            cache: 'no-store',
        });

        return this.handleResponse<T>(response);
    }

    async delete<T>(path: string): Promise<T> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'DELETE',
            headers,
            cache: 'no-store',
        });

        return this.handleResponse<T>(response);
    }
}

export const apiClient = new ApiClient(API_URL!);

// Type-safe API methods
export interface Board {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface List {
    id: string;
    boardId: string;
    title: string;
    order: number;
    createdAt: string;
    updatedAt: string;
}

export interface Card {
    id: string;
    listId: string;
    title: string;
    description?: string;
    status: string;
    order: number;
    createdAt: string;
    updatedAt: string;
}

export const boardsApi = {
    getAll: () => apiClient.get<Board[]>('/boards'),
    getById: (id: string) => apiClient.get<Board>(`/boards/${id}`),
    create: (data: { title: string; description?: string }) =>
        apiClient.post<Board>('/boards', data),
    update: (id: string, data: { title?: string; description?: string }) =>
        apiClient.put<Board>(`/boards/${id}`, data),
    delete: (id: string) => apiClient.delete<{ deleted: boolean }>(`/boards/${id}`),
};

export const listsApi = {
    getAll: (boardId: string) => apiClient.get<List[]>(`/boards/${boardId}/lists`),
    create: (boardId: string, data: { title: string; order?: number }) =>
        apiClient.post<List>(`/boards/${boardId}/lists`, data),
    update: (boardId: string, listId: string, data: { title?: string; order?: number }) =>
        apiClient.put<List>(`/boards/${boardId}/lists/${listId}`, data),
    delete: (boardId: string, listId: string) =>
        apiClient.delete<{ deleted: boolean }>(`/boards/${boardId}/lists/${listId}`),
};

export const cardsApi = {
    getAll: (boardId: string, listId: string) =>
        apiClient.get<Card[]>(`/boards/${boardId}/lists/${listId}/cards`),
    create: (
        boardId: string,
        listId: string,
        data: { title: string; description?: string; order?: number }
    ) => apiClient.post<Card>(`/boards/${boardId}/lists/${listId}/cards`, data),
    update: (
        boardId: string,
        listId: string,
        cardId: string,
        data: {
            title?: string;
            description?: string;
            status?: string;
            order?: number;
            listId?: string;
        }
    ) => apiClient.put<Card>(`/boards/${boardId}/lists/${listId}/cards/${cardId}`, data),
    delete: (boardId: string, listId: string, cardId: string) =>
        apiClient.delete<{ deleted: boolean }>(
            `/boards/${boardId}/lists/${listId}/cards/${cardId}`
        ),
};
