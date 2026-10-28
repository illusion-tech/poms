export interface BatchRequest {
    formatVersion: 1;
    runId: string;
    backend: 'nest' | 'rust';
    action: string;
    [key: string]: unknown;
}
export function invokeBatchFixture(request: BatchRequest): Promise<any>;
