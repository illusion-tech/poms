import { Injectable } from '@nestjs/common';
import { ExternalOrgProviderValue } from '@poms/shared-contracts';
import axios from 'axios';
import type { ExternalDepartmentReadAccessResult, ExternalDepartmentSnapshot, ExternalOrgDirectoryAdapter, FetchExternalDepartmentTreeInput, TestExternalDepartmentReadAccessInput } from './external-org-directory.adapter';
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

    async testDepartmentReadAccess(input: TestExternalDepartmentReadAccessInput): Promise<ExternalDepartmentReadAccessResult> {
        const accessToken = await this.fetchTenantAccessToken(input.providerConfig.clientId, input.clientSecret);
        const rootDepartmentId = input.rootDepartmentId ?? '0';
        const children = await this.fetchChildren(accessToken, rootDepartmentId);

        return {
            rootDepartmentId,
            childDepartmentCount: children.length
        };
    }

    private async fetchTenantAccessToken(appId: string, appSecret: string): Promise<string> {
        const endpoint = process.env['FEISHU_TENANT_ACCESS_TOKEN_URL'] ?? `${this.baseUrl()}/open-apis/auth/v3/tenant_access_token/internal`;
        try {
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
        } catch (error) {
            throw this.normalizeAdapterError(error, 'Feishu tenant access token request failed');
        }
    }

    private async fetchChildren(accessToken: string, departmentId: string): Promise<ExternalDepartmentSnapshot[]> {
        const items: ExternalDepartmentSnapshot[] = [];
        let pageToken: string | null = null;

        do {
            try {
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
            } catch (error) {
                throw this.normalizeAdapterError(error, 'Feishu department children request failed');
            }
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
            const providerMessage = this.readString(root, ['msg', 'message']);
            throw new ExternalOrgDirectoryAdapterError(this.formatFeishuErrorMessage(fallbackMessage, code, providerMessage));
        }

        if (!expectData) return root;
        return this.asRecord(root['data'] ?? root);
    }

    private normalizeAdapterError(error: unknown, fallbackMessage: string): ExternalOrgDirectoryAdapterError {
        if (error instanceof ExternalOrgDirectoryAdapterError) return error;

        const response = this.readHttpResponse(error);
        if (response) {
            const root = this.asRecord(response.data);
            const code = this.readNumber(root, ['code']);
            const providerMessage = this.readString(root, ['msg', 'message']);
            return new ExternalOrgDirectoryAdapterError(this.formatFeishuErrorMessage(fallbackMessage, code, providerMessage, response.status));
        }

        if (error instanceof Error && error.message.trim()) {
            return new ExternalOrgDirectoryAdapterError(`${fallbackMessage}: ${error.message.trim()}`);
        }

        return new ExternalOrgDirectoryAdapterError(fallbackMessage);
    }

    private readHttpResponse(error: unknown): { status?: number; data?: unknown } | null {
        const root = this.asRecord(error);
        const response = this.asRecord(root['response']);
        if (Object.keys(response).length === 0) return null;

        const status = this.readNumber(response, ['status']);
        return { status: status ?? undefined, data: response['data'] };
    }

    private formatFeishuErrorMessage(fallbackMessage: string, code: number | null, providerMessage: string | null, status?: number): string {
        const diagnosis = this.feishuErrorDiagnosis(code, providerMessage);
        const providerDetails = [providerMessage ? `飞书返回：${providerMessage}` : null, code !== null ? `code ${code}` : null, status ? `HTTP ${status}` : null].filter((item): item is string => Boolean(item));

        if (diagnosis) return providerDetails.length > 0 ? `${diagnosis}（${providerDetails.join('，')}）` : diagnosis;

        const baseMessage = providerMessage && providerMessage !== fallbackMessage ? `${fallbackMessage}: ${providerMessage}` : fallbackMessage;
        const technicalDetails = [code !== null ? `code ${code}` : null, status ? `HTTP ${status}` : null].filter((item): item is string => Boolean(item));
        return technicalDetails.length > 0 ? `${baseMessage}（${technicalDetails.join('，')}）` : baseMessage;
    }

    private feishuErrorDiagnosis(code: number | null, providerMessage: string | null): string | null {
        const normalizedMessage = providerMessage?.toLowerCase() ?? '';
        if (code === 40011 || normalizedMessage.includes('page size')) {
            return '飞书部门分页大小超过限制，请将 page_size 调整为 50 或更小。';
        }
        if (normalizedMessage.includes('permission') || normalizedMessage.includes('scope')) {
            return '飞书应用身份通讯录权限未开通或未生效，请在飞书开放平台检查应用身份权限并发布应用。';
        }
        if (normalizedMessage.includes('access token')) {
            return '飞书访问令牌无效或已过期，请检查企业协同接入的 Client ID / Secret。';
        }
        return null;
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
        if (Number.isFinite(configured) && configured > 0) return Math.min(Math.floor(configured), 50);
        return 50;
    }

    private timeoutMs(): number {
        const configured = Number(process.env['FEISHU_API_TIMEOUT_MS']);
        return Number.isFinite(configured) && configured > 0 ? configured : 10_000;
    }
}
