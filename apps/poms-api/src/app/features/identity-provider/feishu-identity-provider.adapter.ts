import { Injectable } from '@nestjs/common';
import { IdentityProviderValue } from '@poms/shared-contracts';
import axios from 'axios';
import type { BuildAdminGrantAuthorizeUrlInput, ExchangeAdminGrantCodeInput, IdentityProviderAdapter, ProviderExternalUserCandidate, ProviderOAuthTokenSet, SearchExternalUsersInput } from './identity-provider.adapter';
import { IdentityProviderAdapterError } from './identity-provider.adapter';

type JsonRecord = Record<string, unknown>;

@Injectable()
export class FeishuIdentityProviderAdapter implements IdentityProviderAdapter {
    readonly provider = IdentityProviderValue.Feishu;

    buildAdminGrantAuthorizeUrl(input: BuildAdminGrantAuthorizeUrlInput): string {
        if (!input.config.redirectUri) {
            throw new IdentityProviderAdapterError('Feishu redirect URI is required before starting provider authorization.');
        }

        const url = new URL(process.env['FEISHU_OAUTH_AUTHORIZE_URL'] ?? 'https://accounts.feishu.cn/open-apis/authen/v1/authorize');
        url.searchParams.set('client_id', input.config.clientId);
        url.searchParams.set('redirect_uri', input.config.redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('state', input.state);
        if (input.scopes.length > 0) {
            url.searchParams.set('scope', input.scopes.join(' '));
        }

        return url.toString();
    }

    async exchangeAdminGrantCode(input: ExchangeAdminGrantCodeInput): Promise<ProviderOAuthTokenSet> {
        if (!input.config.redirectUri) {
            throw new IdentityProviderAdapterError('Feishu redirect URI is required before exchanging provider authorization code.');
        }

        const endpoint = process.env['FEISHU_OAUTH_TOKEN_URL'] ?? 'https://open.feishu.cn/open-apis/authen/v2/oauth/token';
        const response = await axios.post(
            endpoint,
            {
                grant_type: 'authorization_code',
                client_id: input.config.clientId,
                client_secret: input.clientSecret,
                code: input.code,
                redirect_uri: input.config.redirectUri
            },
            { timeout: this.timeoutMs() }
        );
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

    async searchExternalUsers(input: SearchExternalUsersInput): Promise<ProviderExternalUserCandidate[]> {
        const endpoint = process.env['FEISHU_USER_SEARCH_URL'] ?? 'https://open.feishu.cn/open-apis/search/v1/user';
        const response = await axios.get(endpoint, {
            headers: {
                Authorization: `Bearer ${input.accessToken}`
            },
            params: {
                query: input.query,
                page_size: input.limit
            },
            timeout: this.timeoutMs()
        });
        const payload = this.unwrapFeishuPayload(response.data, 'Feishu user search failed');
        const users = this.readArray(payload, ['users', 'items', 'user_list']);
        return users.map((user) => this.toExternalUserCandidate(user)).filter((user): user is ProviderExternalUserCandidate => Boolean(user));
    }

    private unwrapFeishuPayload(raw: unknown, fallbackMessage: string): JsonRecord {
        const root = this.asRecord(raw);
        const code = this.readNumber(root, ['code']);
        if (code !== null && code !== 0) {
            const message = this.readString(root, ['msg', 'message']) ?? fallbackMessage;
            throw new IdentityProviderAdapterError(`${message} (${code})`);
        }

        return this.asRecord(root['data'] ?? root);
    }

    private toExternalUserCandidate(raw: unknown): ProviderExternalUserCandidate | null {
        const user = this.asRecord(raw);
        const subjectId = this.readString(user, ['open_id', 'user_id', 'id']);
        const displayName = this.readString(user, ['name', 'display_name', 'en_name']);
        if (!subjectId || !displayName) return null;

        return {
            subjectId,
            unionId: this.readString(user, ['union_id']),
            displayName,
            avatarUrl: this.readString(user, ['avatar_url', 'avatar_thumb', 'avatar_middle', 'avatar_big']),
            email: this.readString(user, ['email']),
            mobile: this.readString(user, ['mobile', 'mobile_visible']),
            departmentNames: this.readStringArray(user, ['department_names', 'departments'])
        };
    }

    private readScopes(payload: JsonRecord): string[] {
        const arrayScopes = this.readStringArray(payload, ['scopes', 'scope_list']);
        if (arrayScopes.length > 0) return arrayScopes;
        const raw = this.readString(payload, ['scope']);
        return raw ? raw.split(/[,\s]+/).map((scope) => scope.trim()).filter(Boolean) : [];
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
            if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, 16);
        }
        return [];
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

    private timeoutMs(): number {
        const configured = Number(process.env['FEISHU_API_TIMEOUT_MS']);
        return Number.isFinite(configured) && configured > 0 ? configured : 10_000;
    }
}
