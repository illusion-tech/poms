import { Injectable } from '@nestjs/common';
import { ExternalOrgProviderValue } from '@poms/shared-contracts';
import axios from 'axios';
import type { ExternalDepartmentSnapshot, ExternalOrgDirectoryAdapter, FetchExternalDepartmentTreeInput } from './external-org-directory.adapter';
import { ExternalOrgDirectoryAdapterError } from './external-org-directory.adapter';

type JsonRecord = Record<string, unknown>;

@Injectable()
export class FeishuExternalOrgDirectoryAdapter implements ExternalOrgDirectoryAdapter {
    readonly provider = ExternalOrgProviderValue.Feishu;

    async fetchDepartmentTree(input: FetchExternalDepartmentTreeInput): Promise<ExternalDepartmentSnapshot[]> {
        const accessToken = await this.fetchTenantAccessToken(input.providerConfig.clientId, input.clientSecret);
        const rootDepartmentId = input.source.externalRootDepartmentId ?? '0';
        const snapshots: ExternalDepartmentSnapshot[] = [];
        const visited = new Set<string>();
        const queue = [rootDepartmentId];

        while (queue.length > 0) {
            const parentDepartmentId = queue.shift();
            if (!parentDepartmentId || visited.has(parentDepartmentId)) continue;
            visited.add(parentDepartmentId);

            const children = await this.fetchChildren(accessToken, parentDepartmentId);
            for (const child of children) {
                snapshots.push(child);
                if (child.isActive) queue.push(child.externalDepartmentId);
            }
        }

        return snapshots;
    }

    private async fetchTenantAccessToken(appId: string, appSecret: string): Promise<string> {
        const endpoint = process.env['FEISHU_TENANT_ACCESS_TOKEN_URL'] ?? `${this.baseUrl()}/open-apis/auth/v3/tenant_access_token/internal`;
        const response = await axios.post(
            endpoint,
            {
                app_id: appId,
                app_secret: appSecret
            },
            {
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                timeout: this.timeoutMs()
            }
        );

        const payload = this.unwrapFeishuPayload(response.data, 'Feishu tenant access token request failed', false);
        const token = this.readString(payload, ['tenant_access_token']);
        if (!token) {
            throw new ExternalOrgDirectoryAdapterError('Feishu tenant access token response did not include a token.');
        }

        return token;
    }

    private async fetchChildren(accessToken: string, departmentId: string): Promise<ExternalDepartmentSnapshot[]> {
        const items: ExternalDepartmentSnapshot[] = [];
        let pageToken: string | null = null;

        do {
            const response = await axios.get(this.departmentChildrenUrl(departmentId), {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                params: {
                    department_id_type: 'open_department_id',
                    user_id_type: 'open_id',
                    fetch_child: false,
                    page_size: this.pageSize(),
                    ...(pageToken ? { page_token: pageToken } : {})
                },
                timeout: this.timeoutMs()
            });

            const payload = this.unwrapFeishuPayload(response.data, 'Feishu department children request failed', true);
            items.push(...this.readArray(payload, ['items', 'departments']).map((item) => this.toDepartmentSnapshot(item, departmentId)).filter((item): item is ExternalDepartmentSnapshot => Boolean(item)));
            pageToken = this.readBoolean(payload, ['has_more']) ? this.readString(payload, ['page_token']) : null;
        } while (pageToken);

        return items;
    }

    private departmentChildrenUrl(departmentId: string): string {
        const encodedDepartmentId = encodeURIComponent(departmentId);
        const template = process.env['FEISHU_DEPARTMENT_CHILDREN_URL_TEMPLATE'];
        if (template) return template.replace('{departmentId}', encodedDepartmentId);
        return `${this.baseUrl()}/open-apis/contact/v3/departments/${encodedDepartmentId}/children`;
    }

    private toDepartmentSnapshot(raw: unknown, fallbackParentDepartmentId: string): ExternalDepartmentSnapshot | null {
        const item = this.asRecord(raw);
        const externalDepartmentId = this.readString(item, ['open_department_id', 'department_id', 'id']);
        const externalDepartmentName = this.readString(item, ['name', 'department_name']);
        if (!externalDepartmentId || !externalDepartmentName) return null;

        const status = this.asRecord(item['status']);
        const isDeleted = this.readBoolean(status, ['is_deleted', 'deleted']) ?? false;

        return {
            externalDepartmentId,
            externalParentDepartmentId: this.readString(item, ['parent_department_id', 'parent_open_department_id', 'parent_id']) ?? fallbackParentDepartmentId,
            externalDepartmentName,
            isActive: !isDeleted,
            displayOrder: this.readNumber(item, ['order', 'department_order', 'display_order']),
            raw: item
        };
    }

    private unwrapFeishuPayload(raw: unknown, fallbackMessage: string, expectData: boolean): JsonRecord {
        const root = this.asRecord(raw);
        const code = this.readNumber(root, ['code']);
        if (code !== null && code !== 0) {
            const message = this.readString(root, ['msg', 'message']) ?? fallbackMessage;
            throw new ExternalOrgDirectoryAdapterError(`${message} (${code})`);
        }

        if (!expectData) return root;
        return this.asRecord(root['data'] ?? root);
    }

    private readArray(record: JsonRecord, keys: string[]): unknown[] {
        for (const key of keys) {
            const value = record[key];
            if (Array.isArray(value)) return value;
        }
        return [];
    }

    private readString(record: JsonRecord, keys: string[]): string | null {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'string' && value.trim()) return value;
        }
        return null;
    }

    private readNumber(record: JsonRecord, keys: string[]): number | null {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'number' && Number.isFinite(value)) return value;
            if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
        }
        return null;
    }

    private readBoolean(record: JsonRecord, keys: string[]): boolean | null {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'boolean') return value;
            if (typeof value === 'string') {
                if (value === 'true') return true;
                if (value === 'false') return false;
            }
        }
        return null;
    }

    private asRecord(value: unknown): JsonRecord {
        return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
    }

    private baseUrl(): string {
        return (process.env['FEISHU_OPEN_API_BASE_URL'] ?? 'https://open.feishu.cn').replace(/\/+$/g, '');
    }

    private pageSize(): number {
        const configured = Number(process.env['FEISHU_ORG_DEPARTMENT_PAGE_SIZE']);
        if (Number.isFinite(configured) && configured > 0) return Math.min(Math.floor(configured), 100);
        return 100;
    }

    private timeoutMs(): number {
        const configured = Number(process.env['FEISHU_API_TIMEOUT_MS']);
        return Number.isFinite(configured) && configured > 0 ? configured : 10_000;
    }
}
