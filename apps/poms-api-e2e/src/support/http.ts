import type { AxiosResponse } from 'axios';

export interface ApiErrorBody {
    statusCode: number;
    message: string | string[];
    error?: string;
    errors?: unknown[];
}

export function expectStatus<T>(response: AxiosResponse<T>, expectedStatus: number): T {
    if (response.status !== expectedStatus) {
        // Do not dump authentication bodies or Axios request configuration.
        console.error(`Status mismatch: Expected ${expectedStatus}, but got ${response.status}.`);
    }
    expect(response.status).toBe(expectedStatus);
    return response.data;
}

export function expectErrorStatus(response: AxiosResponse<ApiErrorBody>, expectedStatus: number, messageIncludes?: string): ApiErrorBody {
    expect(response.status).toBe(expectedStatus);
    expect(response.data.statusCode).toBe(expectedStatus);

    if (messageIncludes) {
        const message = Array.isArray(response.data.message) ? response.data.message.join(' | ') : response.data.message;
        expect(message).toContain(messageIncludes);
    }

    return response.data;
}
