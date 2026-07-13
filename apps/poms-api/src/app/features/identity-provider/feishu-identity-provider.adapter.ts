import { Injectable } from '@nestjs/common';
import { ExternalUserCandidateFieldAvailabilityValue, IdentityProviderValue, type ExternalUserCandidateFieldAvailability, type ExternalUserCandidateFieldAvailabilitySummary } from '@poms/shared-contracts';
import axios from 'axios';
import type { BuildAdminGrantAuthorizeUrlInput, ExchangeAdminGrantCodeInput, IdentityProviderAdapter, ProviderExternalLoginIdentity, ProviderExternalUserCandidate, ProviderOAuthTokenSet, SearchExternalUsersInput } from './identity-provider.adapter';
import { IdentityProviderAdapterError } from './identity-provider.adapter';

type JsonRecord = Record<string, unknown>;
type FeishuBatchQueryParameter = 'user_id_type' | 'department_id_type';
type FeishuBatchFixedQueryParams = Readonly<Partial<Record<FeishuBatchQueryParameter, string>>>;

const FEISHU_BATCH_REQUEST_LIMIT = 50;
const FEISHU_DEPARTMENT_BATCH_CONCURRENCY = 4;
const MAX_CANDIDATE_DEPARTMENTS = 16;

interface FeishuExternalUserSearchHit {
    subjectId: string;
    unionId: string | null;
    displayName: string;
    avatarUrl: string | null;
    departmentIds: string[];
    departmentAvailability: ExternalUserCandidateFieldAvailability;
}

interface FeishuCandidateFieldValue {
    value: string | null;
    availability: ExternalUserCandidateFieldAvailability;
}

@Injectable()
export class FeishuIdentityProviderAdapter implements IdentityProviderAdapter {
    readonly provider = IdentityProviderValue.Feishu;

    buildAdminGrantAuthorizeUrl(input: BuildAdminGrantAuthorizeUrlInput): string {
        return this.buildAuthorizeUrl(input);
    }

    buildExternalLoginAuthorizeUrl(input: BuildAdminGrantAuthorizeUrlInput): string {
        return this.buildAuthorizeUrl(input);
    }

    private buildAuthorizeUrl(input: BuildAdminGrantAuthorizeUrlInput): string {
        if (!input.redirectUri) {
            throw new IdentityProviderAdapterError('Feishu redirect URI is required before starting provider authorization.');
        }

        const url = new URL(process.env['FEISHU_OAUTH_AUTHORIZE_URL'] ?? 'https://accounts.feishu.cn/open-apis/authen/v1/authorize');
        url.searchParams.set('client_id', input.config.clientId);
        url.searchParams.set('redirect_uri', input.redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('state', input.state);
        if (input.scopes.length > 0) {
            url.searchParams.set('scope', input.scopes.join(' '));
        }

        return url.toString();
    }

    async exchangeAdminGrantCode(input: ExchangeAdminGrantCodeInput): Promise<ProviderOAuthTokenSet> {
        return this.exchangeOAuthCode(input);
    }

    async exchangeExternalLoginCode(input: ExchangeAdminGrantCodeInput): Promise<ProviderOAuthTokenSet> {
        return this.exchangeOAuthCode(input);
    }

    private async exchangeOAuthCode(input: ExchangeAdminGrantCodeInput): Promise<ProviderOAuthTokenSet> {
        if (!input.redirectUri) {
            throw new IdentityProviderAdapterError('Feishu redirect URI is required before exchanging provider authorization code.');
        }

        const endpoint = process.env['FEISHU_OAUTH_TOKEN_URL'] ?? 'https://open.feishu.cn/open-apis/authen/v2/oauth/token';
        let response: { data: unknown };
        try {
            response = await axios.post(
                endpoint,
                {
                    grant_type: 'authorization_code',
                    client_id: input.config.clientId,
                    client_secret: input.clientSecret,
                    code: input.code,
                    redirect_uri: input.redirectUri
                },
                { timeout: this.timeoutMs() }
            );
        } catch (error) {
            throw this.normalizeHttpError(error, 'Feishu OAuth token exchange failed');
        }
        const payload = this.unwrapFeishuPayload(response.data, 'Feishu OAuth token exchange failed');
        const accessToken = this.readString(payload, ['access_token', 'user_access_token']);
        if (!accessToken) {
            throw new IdentityProviderAdapterError('Feishu OAuth token response did not include an access token.');
        }

        return {
            accessToken,
            refreshToken: this.readString(payload, ['refresh_token']),
            expiresInSeconds: this.readNumber(payload, ['expires_in', 'expire']),
            refreshExpiresInSeconds: this.readNumber(payload, ['refresh_expires_in']),
            scopes: this.readScopes(payload)
        };
    }

    async fetchExternalLoginIdentity(input: { accessToken: string }): Promise<ProviderExternalLoginIdentity> {
        const endpoint = process.env['FEISHU_USER_INFO_URL'] ?? 'https://open.feishu.cn/open-apis/authen/v1/user_info';
        let response: { data: unknown };
        try {
            response = await axios.get(endpoint, {
                headers: {
                    Authorization: `Bearer ${input.accessToken}`
                },
                timeout: this.timeoutMs()
            });
        } catch (error) {
            throw this.normalizeHttpError(error, 'Feishu user info failed');
        }
        const payload = this.unwrapFeishuPayload(response.data, 'Feishu user info failed');
        const subjectId = this.readString(payload, ['open_id', 'user_id', 'sub']);
        const displayName = this.readString(payload, ['name', 'display_name', 'en_name']);
        if (!subjectId || !displayName) {
            throw new IdentityProviderAdapterError('Feishu user info response did not include a subject id and display name.');
        }

        return {
            subjectId,
            unionId: this.readString(payload, ['union_id']),
            displayName,
            avatarUrl: this.readString(payload, ['avatar_url', 'avatar_thumb', 'avatar_middle', 'avatar_big']),
            email: this.readString(payload, ['email']),
            mobile: this.readString(payload, ['mobile', 'mobile_visible'])
        };
    }

    async searchExternalUsers(input: SearchExternalUsersInput): Promise<ProviderExternalUserCandidate[]> {
        const endpoint = process.env['FEISHU_USER_SEARCH_URL'] ?? 'https://open.feishu.cn/open-apis/search/v1/user';
        let response: { data: unknown };
        try {
            response = await axios.get(endpoint, {
                headers: {
                    Authorization: `Bearer ${input.accessToken}`
                },
                params: {
                    query: input.query,
                    page_size: input.limit
                },
                timeout: this.timeoutMs()
            });
        } catch (error) {
            throw this.normalizeHttpError(error, 'Feishu user search failed');
        }
        const payload = this.unwrapFeishuPayload(response.data, 'Feishu user search failed');
        const users = this.readArray(payload, ['users', 'items', 'user_list']);
        const hits = users.map((user) => this.toExternalUserSearchHit(user)).filter((user): user is FeishuExternalUserSearchHit => Boolean(user));
        if (hits.length === 0) return [];

        const detailsBySubjectId = await this.fetchUserDetails(
            input,
            hits.map((hit) => hit.subjectId)
        );
        const departmentIds = this.uniqueStrings(hits.filter((hit) => hit.departmentAvailability === ExternalUserCandidateFieldAvailabilityValue.Available).flatMap((hit) => hit.departmentIds));
        const departmentNamesById = departmentIds.length > 0 ? await this.fetchDepartmentNames(input, departmentIds) : new Map<string, string>();

        return hits.map((hit) => this.toExternalUserCandidate(hit, detailsBySubjectId.get(hit.subjectId) ?? null, departmentNamesById));
    }

    private async fetchUserDetails(input: SearchExternalUsersInput, subjectIds: string[]): Promise<Map<string, JsonRecord>> {
        const endpoint = process.env['FEISHU_USER_BATCH_URL'] ?? `${this.openApiBaseUrl()}/open-apis/contact/v3/users/batch`;
        const uniqueSubjectIds = this.uniqueStrings(subjectIds);
        let response: { data: unknown };
        try {
            response = await axios.get(endpoint, {
                headers: {
                    Authorization: `Bearer ${input.accessToken}`
                },
                params: this.repeatedQueryParams('user_ids', uniqueSubjectIds, {
                    user_id_type: 'open_id',
                    department_id_type: 'open_department_id'
                }),
                timeout: this.timeoutMs()
            });
        } catch (error) {
            throw this.normalizeHttpError(error, 'Feishu user profile enrichment failed');
        }

        const payload = this.unwrapFeishuPayload(response.data, 'Feishu user profile enrichment failed');
        const detailsBySubjectId = new Map<string, JsonRecord>();
        for (const item of this.readArray(payload, ['items', 'users', 'user_list'])) {
            const user = this.asRecord(item);
            const subjectId = this.readString(user, ['open_id']);
            if (subjectId) detailsBySubjectId.set(subjectId, user);
        }
        return detailsBySubjectId;
    }

    private async fetchDepartmentNames(input: SearchExternalUsersInput, departmentIds: string[]): Promise<Map<string, string>> {
        const departmentBatches = this.chunk(this.uniqueStrings(departmentIds), FEISHU_BATCH_REQUEST_LIMIT);
        const batchResults = await this.mapWithConcurrency(departmentBatches, FEISHU_DEPARTMENT_BATCH_CONCURRENCY, (batch) => this.fetchDepartmentNameBatch(input, batch));
        const departmentNamesById = new Map<string, string>();
        for (const batchResult of batchResults) {
            for (const [departmentId, name] of batchResult) {
                departmentNamesById.set(departmentId, name);
            }
        }
        return departmentNamesById;
    }

    private async fetchDepartmentNameBatch(input: SearchExternalUsersInput, departmentIds: string[]): Promise<Map<string, string>> {
        const endpoint = process.env['FEISHU_DEPARTMENT_BATCH_URL'] ?? `${this.openApiBaseUrl()}/open-apis/contact/v3/departments/batch`;
        let response: { data: unknown };
        try {
            response = await axios.get(endpoint, {
                headers: {
                    Authorization: `Bearer ${input.accessToken}`
                },
                params: this.repeatedQueryParams('department_ids', departmentIds, {
                    department_id_type: 'open_department_id'
                }),
                timeout: this.timeoutMs()
            });
        } catch (error) {
            throw this.normalizeHttpError(error, 'Feishu department enrichment failed');
        }

        const payload = this.unwrapFeishuPayload(response.data, 'Feishu department enrichment failed');
        const departmentNamesById = new Map<string, string>();
        for (const item of this.readArray(payload, ['items', 'departments'])) {
            const department = this.asRecord(item);
            const departmentId = this.readString(department, ['open_department_id']);
            const name = this.readString(department, ['name']);
            if (departmentId && name) departmentNamesById.set(departmentId, name);
        }
        return departmentNamesById;
    }

    private unwrapFeishuPayload(raw: unknown, fallbackMessage: string): JsonRecord {
        const root = this.asRecord(raw);
        const code = this.readNumber(root, ['code']);
        if (code !== null && code !== 0) {
            throw this.createFeishuError(raw, fallbackMessage);
        }

        return this.asRecord(root['data'] ?? root);
    }

    private normalizeHttpError(error: unknown, fallbackMessage: string): IdentityProviderAdapterError {
        if (axios.isAxiosError(error)) {
            const response = error.response;
            if (response) {
                return this.createFeishuError(response.data, fallbackMessage, response.status);
            }
            const code = typeof error.code === 'string' && error.code.trim() ? error.code.trim() : 'network_error';
            return new IdentityProviderAdapterError(`${fallbackMessage}: ${code}`);
        }

        return new IdentityProviderAdapterError(fallbackMessage);
    }

    private createFeishuError(raw: unknown, fallbackMessage: string, status?: number): IdentityProviderAdapterError {
        const root = this.asRecord(raw);
        const code = this.readNumber(root, ['code']);
        const providerMessage = this.readString(root, ['msg', 'message']);
        const error = this.asRecord(root['error']);
        const providerLogId = this.readString(error, ['log_id', 'logId']);
        const details = [code !== null ? `code ${code}` : null, status ? `HTTP ${status}` : null, providerLogId ? `log_id ${providerLogId}` : null].filter(Boolean).join(', ');
        const suffix = details ? ` (${details})` : '';
        const message = providerMessage ? `${fallbackMessage}: ${providerMessage}${suffix}` : `${fallbackMessage}${suffix}`;
        return new IdentityProviderAdapterError(message, {
            providerCode: code,
            providerMessage,
            providerLogId
        });
    }

    private toExternalUserSearchHit(raw: unknown): FeishuExternalUserSearchHit | null {
        const user = this.asRecord(raw);
        const subjectId = this.readString(user, ['open_id']);
        const displayName = this.readString(user, ['name', 'display_name', 'en_name']);
        if (!subjectId || !displayName) return null;

        return {
            subjectId,
            unionId: this.readString(user, ['union_id']),
            displayName,
            avatarUrl: this.readAvatarUrl(user),
            departmentIds: this.readStringArray(user, ['department_ids']).slice(0, MAX_CANDIDATE_DEPARTMENTS),
            departmentAvailability: this.arrayFieldAvailability(user, 'department_ids')
        };
    }

    private toExternalUserCandidate(hit: FeishuExternalUserSearchHit, detail: JsonRecord | null, departmentNamesById: Map<string, string>): ProviderExternalUserCandidate {
        const email = this.candidateFieldValue(detail, 'email');
        const mobile = this.candidateFieldValue(detail, 'mobile');
        const department = this.resolveDepartments(hit, departmentNamesById);
        const fieldAvailability: ExternalUserCandidateFieldAvailabilitySummary = {
            department: department.availability,
            email: email.availability,
            mobile: mobile.availability
        };

        return {
            subjectId: hit.subjectId,
            unionId: detail ? (this.readString(detail, ['union_id']) ?? hit.unionId) : hit.unionId,
            displayName: hit.displayName,
            avatarUrl: hit.avatarUrl,
            email: email.value,
            mobile: mobile.value,
            departmentNames: department.names,
            fieldAvailability
        };
    }

    private resolveDepartments(hit: FeishuExternalUserSearchHit, departmentNamesById: Map<string, string>): { names: string[]; availability: ExternalUserCandidateFieldAvailability } {
        if (hit.departmentAvailability !== ExternalUserCandidateFieldAvailabilityValue.Available) {
            return { names: [], availability: hit.departmentAvailability };
        }

        const uniqueDepartmentIds = this.uniqueStrings(hit.departmentIds);
        const names = uniqueDepartmentIds.map((departmentId) => departmentNamesById.get(departmentId)).filter((name): name is string => Boolean(name));
        if (names.length !== uniqueDepartmentIds.length) {
            return { names: [], availability: ExternalUserCandidateFieldAvailabilityValue.NotReturned };
        }
        return { names, availability: ExternalUserCandidateFieldAvailabilityValue.Available };
    }

    private candidateFieldValue(record: JsonRecord | null, key: string): FeishuCandidateFieldValue {
        if (!record || !this.hasOwn(record, key)) {
            return { value: null, availability: ExternalUserCandidateFieldAvailabilityValue.NotReturned };
        }

        const value = this.readString(record, [key]);
        return value ? { value, availability: ExternalUserCandidateFieldAvailabilityValue.Available } : { value: null, availability: ExternalUserCandidateFieldAvailabilityValue.NotProvided };
    }

    private arrayFieldAvailability(record: JsonRecord, key: string): ExternalUserCandidateFieldAvailability {
        if (!this.hasOwn(record, key)) return ExternalUserCandidateFieldAvailabilityValue.NotReturned;
        return this.readStringArray(record, [key]).length > 0 ? ExternalUserCandidateFieldAvailabilityValue.Available : ExternalUserCandidateFieldAvailabilityValue.NotProvided;
    }

    private readAvatarUrl(record: JsonRecord): string | null {
        const directUrl = this.readString(record, ['avatar_url', 'avatar_thumb', 'avatar_middle', 'avatar_big']);
        if (directUrl) return directUrl;
        return this.readString(this.asRecord(record['avatar']), ['avatar_240', 'avatar_72', 'avatar_640', 'avatar_origin']);
    }

    private repeatedQueryParams(key: string, values: string[], fixedValues: FeishuBatchFixedQueryParams): URLSearchParams {
        const params = new URLSearchParams();
        for (const [fixedKey, fixedValue] of Object.entries(fixedValues)) {
            params.set(fixedKey, fixedValue);
        }
        for (const value of values) {
            params.append(key, value);
        }
        return params;
    }

    private readScopes(payload: JsonRecord): string[] {
        const arrayScopes = this.readStringArray(payload, ['scopes', 'scope_list']);
        if (arrayScopes.length > 0) return arrayScopes;
        const raw = this.readString(payload, ['scope']);
        return raw
            ? raw
                  .split(/[,\s]+/)
                  .map((scope) => scope.trim())
                  .filter(Boolean)
            : [];
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

    private readStringArray(record: JsonRecord, keys: string[]): string[] {
        for (const key of keys) {
            const value = record[key];
            if (Array.isArray(value)) return this.uniqueStrings(value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())));
        }
        return [];
    }

    private uniqueStrings(values: string[]): string[] {
        return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
    }

    private chunk<T>(items: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let index = 0; index < items.length; index += size) {
            chunks.push(items.slice(index, index + size));
        }
        return chunks;
    }

    private async mapWithConcurrency<T, TResult>(items: T[], concurrency: number, mapper: (item: T) => Promise<TResult>): Promise<TResult[]> {
        const results = new Array<TResult>(items.length);
        let nextIndex = 0;
        const worker = async (): Promise<void> => {
            while (nextIndex < items.length) {
                const index = nextIndex++;
                results[index] = await mapper(items[index]);
            }
        };

        await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
        return results;
    }

    private readNumber(record: JsonRecord, keys: string[]): number | null {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'number' && Number.isFinite(value)) return value;
            if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
        }
        return null;
    }

    private asRecord(value: unknown): JsonRecord {
        return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
    }

    private hasOwn(record: JsonRecord, key: string): boolean {
        return Object.prototype.hasOwnProperty.call(record, key);
    }

    private openApiBaseUrl(): string {
        return (process.env['FEISHU_OPEN_API_BASE_URL'] ?? 'https://open.feishu.cn').replace(/\/+$/g, '');
    }

    private timeoutMs(): number {
        const configured = Number(process.env['FEISHU_API_TIMEOUT_MS']);
        return Number.isFinite(configured) && configured > 0 ? configured : 10_000;
    }
}
