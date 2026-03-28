import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type { AuditLogList, AuditLogListQuery, SecurityEventList, SecurityEventListQuery } from './types';

export async function listAuditLogs(client: AxiosInstance, query: AuditLogListQuery = {}): Promise<AuditLogList> {
    const response = await client.get<AuditLogList>('/audit-logs', { params: query });
    return expectStatus(response, 200);
}

export async function listSecurityEvents(client: AxiosInstance, query: SecurityEventListQuery = {}): Promise<SecurityEventList> {
    const response = await client.get<SecurityEventList>('/security-events', { params: query });
    return expectStatus(response, 200);
}
