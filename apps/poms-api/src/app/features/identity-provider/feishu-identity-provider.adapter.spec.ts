import { IdentityProviderConfigStatusValue, IdentityProviderSearchGrantModeValue, IdentityProviderValue } from '@poms/shared-contracts';
import axios from 'axios';
import { FeishuIdentityProviderAdapter } from './feishu-identity-provider.adapter';
import { IdentityProviderConfig } from './identity-provider-config.entity';

jest.mock('axios');

describe('FeishuIdentityProviderAdapter', () => {
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    let adapter: FeishuIdentityProviderAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new FeishuIdentityProviderAdapter();
    });

    it('builds a Feishu OAuth authorize URL with scopes and signed state placeholder', () => {
        const url = adapter.buildAdminGrantAuthorizeUrl({
            config: createConfig(),
            state: 'state-token',
            scopes: ['contact:user:search']
        });

        expect(url).toContain('https://accounts.feishu.cn/open-apis/authen/v1/authorize');
        expect(url).toContain('client_id=cli_a');
        expect(url).toContain('response_type=code');
        expect(url).toContain('state=state-token');
        expect(url).toContain('scope=contact%3Auser%3Asearch');
    });

    it('exchanges a Feishu authorization code for user-level tokens', async () => {
        mockedAxios.post.mockResolvedValue({
            data: {
                code: 0,
                data: {
                    access_token: 'user-access-token',
                    refresh_token: 'refresh-token',
                    expires_in: 7200,
                    refresh_expires_in: 30 * 24 * 60 * 60,
                    scope: 'contact:user:search'
                }
            }
        });

        const result = await adapter.exchangeAdminGrantCode({
            config: createConfig(),
            clientSecret: 'client-secret',
            code: 'auth-code'
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
            'https://open.feishu.cn/open-apis/authen/v2/oauth/token',
            expect.objectContaining({
                grant_type: 'authorization_code',
                client_id: 'cli_a',
                client_secret: 'client-secret',
                code: 'auth-code'
            }),
            expect.objectContaining({ timeout: 10_000 })
        );
        expect(result).toMatchObject({
            accessToken: 'user-access-token',
            refreshToken: 'refresh-token',
            scopes: ['contact:user:search']
        });
    });

    it('maps Feishu user search results into provider-neutral candidates', async () => {
        mockedAxios.get.mockResolvedValue({
            data: {
                code: 0,
                data: {
                    users: [
                        {
                            open_id: 'ou_feishu_user_1',
                            union_id: 'on_union_1',
                            name: '张三',
                            email: 'zhangsan@example.com',
                            department_names: ['销售部']
                        }
                    ]
                }
            }
        });

        const result = await adapter.searchExternalUsers({
            config: createConfig(),
            accessToken: 'user-access-token',
            query: '张',
            limit: 10
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
            'https://open.feishu.cn/open-apis/search/v1/user',
            expect.objectContaining({
                headers: { Authorization: 'Bearer user-access-token' },
                params: { query: '张', page_size: 10 },
                timeout: 10_000
            })
        );
        expect(result).toEqual([
            {
                subjectId: 'ou_feishu_user_1',
                unionId: 'on_union_1',
                displayName: '张三',
                avatarUrl: null,
                email: 'zhangsan@example.com',
                mobile: null,
                departmentNames: ['销售部']
            }
        ]);
    });

    function createConfig(): IdentityProviderConfig {
        return {
            id: '91000000-0000-4000-8000-000000000001',
            provider: IdentityProviderValue.Feishu,
            tenantId: null,
            displayName: '飞书',
            status: IdentityProviderConfigStatusValue.Active,
            enabled: true,
            loginEnabled: false,
            bindingEnabled: true,
            searchEnabled: true,
            clientId: 'cli_a',
            encryptedClientSecret: 'v1:redacted',
            secretUpdatedAt: null,
            redirectUri: 'https://poms.example.com/platform/identity-provider-oauth-grants:callback',
            loginScopes: [],
            searchScopes: ['contact:user:search'],
            tenantAllowlist: [],
            searchGrantMode: IdentityProviderSearchGrantModeValue.PerAdmin,
            rowVersion: 1,
            createdAt: new Date('2026-05-07T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-05-07T00:00:00.000Z'),
            updatedBy: null
        } as IdentityProviderConfig;
    }
});
