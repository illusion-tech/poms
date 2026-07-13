import { ExternalUserCandidateFieldAvailabilityValue, IdentityProviderConfigStatusValue, IdentityProviderSearchGrantModeValue, IdentityProviderValue } from '@poms/shared-contracts';
import axios from 'axios';
import { FeishuIdentityProviderAdapter } from './feishu-identity-provider.adapter';
import { IdentityProviderAdapterError } from './identity-provider.adapter';
import { IdentityProviderConfig } from './identity-provider-config.entity';

jest.mock('axios');

type AxiosErrorLike = {
    isAxiosError: true;
    response?: {
        status?: number;
        data?: unknown;
    };
    code?: string;
};

describe('FeishuIdentityProviderAdapter', () => {
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    const mockedIsAxiosError = mockedAxios.isAxiosError as unknown as jest.MockedFunction<(error: unknown) => error is AxiosErrorLike>;
    let adapter: FeishuIdentityProviderAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        mockedIsAxiosError.mockImplementation((error: unknown): error is AxiosErrorLike => Boolean(error && typeof error === 'object' && 'isAxiosError' in error));
        adapter = new FeishuIdentityProviderAdapter();
    });

    it('builds a Feishu OAuth authorize URL with scopes and signed state placeholder', () => {
        const url = adapter.buildAdminGrantAuthorizeUrl({
            config: createConfig(),
            redirectUri: 'https://poms.example.com/api/platform/identity-provider-oauth-grants:callback',
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
            redirectUri: 'https://poms.example.com/api/platform/identity-provider-oauth-grants:callback',
            clientSecret: 'client-secret',
            code: 'auth-code'
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
            'https://open.feishu.cn/open-apis/authen/v2/oauth/token',
            expect.objectContaining({
                grant_type: 'authorization_code',
                client_id: 'cli_a',
                client_secret: 'client-secret',
                code: 'auth-code',
                redirect_uri: 'https://poms.example.com/api/platform/identity-provider-oauth-grants:callback'
            }),
            expect.objectContaining({ timeout: 10_000 })
        );
        expect(result).toMatchObject({
            accessToken: 'user-access-token',
            refreshToken: 'refresh-token',
            scopes: ['contact:user:search']
        });
    });

    it('fetches Feishu login identity with a user access token', async () => {
        mockedAxios.get.mockResolvedValue({
            data: {
                code: 0,
                data: {
                    open_id: 'ou_feishu_user_1',
                    union_id: 'on_union_1',
                    name: '张三',
                    email: 'zhangsan@example.com'
                }
            }
        });

        const result = await adapter.fetchExternalLoginIdentity({
            config: createConfig(),
            accessToken: 'login-access-token'
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
            'https://open.feishu.cn/open-apis/authen/v1/user_info',
            expect.objectContaining({
                headers: { Authorization: 'Bearer login-access-token' },
                timeout: 10_000
            })
        );
        expect(result).toMatchObject({
            subjectId: 'ou_feishu_user_1',
            unionId: 'on_union_1',
            displayName: '张三',
            email: 'zhangsan@example.com'
        });
    });

    it('hydrates documented search hits with batch user and department data', async () => {
        mockedAxios.get
            .mockResolvedValueOnce({
                data: {
                    code: 0,
                    data: {
                        users: [
                            {
                                open_id: 'ou_feishu_user_1',
                                union_id: 'on_union_1',
                                name: '张三',
                                department_ids: ['source_department_id']
                            }
                        ]
                    }
                }
            })
            .mockResolvedValueOnce({
                data: {
                    code: 0,
                    data: {
                        items: [
                            {
                                open_id: 'ou_feishu_user_1',
                                union_id: 'on_union_1',
                                email: 'zhangsan@example.com',
                                mobile: '13800000000',
                                department_ids: ['od_sales']
                            }
                        ]
                    }
                }
            })
            .mockResolvedValueOnce({
                data: {
                    code: 0,
                    data: {
                        items: [{ open_department_id: 'od_sales', name: '销售部' }]
                    }
                }
            });

        const result = await adapter.searchExternalUsers({
            config: createConfig(),
            accessToken: 'user-access-token',
            query: '张',
            limit: 10
        });

        expect(mockedAxios.get).toHaveBeenNthCalledWith(
            1,
            'https://open.feishu.cn/open-apis/search/v1/user',
            expect.objectContaining({
                headers: { Authorization: 'Bearer user-access-token' },
                params: { query: '张', page_size: 10 },
                timeout: 10_000
            })
        );
        expect(mockedAxios.get).toHaveBeenNthCalledWith(
            2,
            'https://open.feishu.cn/open-apis/contact/v3/users/batch',
            expect.objectContaining({
                headers: { Authorization: 'Bearer user-access-token' },
                params: expect.any(URLSearchParams),
                timeout: 10_000
            })
        );
        expect(mockedAxios.get).toHaveBeenNthCalledWith(
            3,
            'https://open.feishu.cn/open-apis/contact/v3/departments/batch',
            expect.objectContaining({
                headers: { Authorization: 'Bearer user-access-token' },
                params: expect.any(URLSearchParams),
                timeout: 10_000
            })
        );
        const userDetailParams = mockedAxios.get.mock.calls[1]?.[1]?.params as URLSearchParams;
        const departmentParams = mockedAxios.get.mock.calls[2]?.[1]?.params as URLSearchParams;
        expect(userDetailParams.toString()).toBe('user_id_type=open_id&department_id_type=open_department_id&user_ids=ou_feishu_user_1');
        expect(departmentParams.toString()).toBe('department_id_type=open_department_id&department_ids=od_sales');
        expect(result).toEqual([
            {
                subjectId: 'ou_feishu_user_1',
                unionId: 'on_union_1',
                displayName: '张三',
                avatarUrl: null,
                email: 'zhangsan@example.com',
                mobile: '13800000000',
                departmentNames: ['销售部'],
                fieldAvailability: {
                    department: ExternalUserCandidateFieldAvailabilityValue.Available,
                    email: ExternalUserCandidateFieldAvailabilityValue.Available,
                    mobile: ExternalUserCandidateFieldAvailabilityValue.Available
                }
            }
        ]);
    });

    it('distinguishes profile fields not provided by the user from fields not returned by Feishu', async () => {
        mockedAxios.get
            .mockResolvedValueOnce({
                data: {
                    code: 0,
                    data: {
                        users: [{ open_id: 'ou_feishu_user_1', name: '张三', department_ids: ['search_department_id'] }]
                    }
                }
            })
            .mockResolvedValueOnce({
                data: {
                    code: 0,
                    data: {
                        items: [{ open_id: 'ou_feishu_user_1', email: '' }]
                    }
                }
            });

        const result = await adapter.searchExternalUsers({
            config: createConfig(),
            accessToken: 'user-access-token',
            query: '张',
            limit: 10
        });

        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        expect(result).toEqual([
            expect.objectContaining({
                email: null,
                mobile: null,
                departmentNames: [],
                fieldAvailability: {
                    department: ExternalUserCandidateFieldAvailabilityValue.NotReturned,
                    email: ExternalUserCandidateFieldAvailabilityValue.NotProvided,
                    mobile: ExternalUserCandidateFieldAvailabilityValue.NotReturned
                }
            })
        ]);
    });

    it('batches department resolution for a full search page instead of issuing one request per department', async () => {
        const departmentIds = Array.from({ length: 64 }, (_value, index) => `od_department_${index + 1}`);
        const users = Array.from({ length: 4 }, (_value, index) => ({
            open_id: `ou_feishu_user_${index + 1}`,
            name: `用户${index + 1}`,
            department_ids: [`search_department_${index + 1}`]
        }));
        mockedAxios.get
            .mockResolvedValueOnce({
                data: {
                    code: 0,
                    data: { users }
                }
            })
            .mockResolvedValueOnce({
                data: {
                    code: 0,
                    data: {
                        items: users.map((user, index) => ({
                            open_id: user.open_id,
                            email: `${user.open_id}@example.com`,
                            mobile: '13800000000',
                            department_ids: departmentIds.slice(index * 16, (index + 1) * 16)
                        }))
                    }
                }
            })
            .mockResolvedValueOnce({
                data: {
                    code: 0,
                    data: {
                        items: departmentIds.slice(0, 50).map((departmentId) => ({ open_department_id: departmentId, name: departmentId }))
                    }
                }
            })
            .mockResolvedValueOnce({
                data: {
                    code: 0,
                    data: {
                        items: departmentIds.slice(50).map((departmentId) => ({ open_department_id: departmentId, name: departmentId }))
                    }
                }
            });

        const result = await adapter.searchExternalUsers({
            config: createConfig(),
            accessToken: 'user-access-token',
            query: '用户',
            limit: 4
        });

        const firstDepartmentParams = mockedAxios.get.mock.calls[2]?.[1]?.params as URLSearchParams;
        const secondDepartmentParams = mockedAxios.get.mock.calls[3]?.[1]?.params as URLSearchParams;
        expect(mockedAxios.get).toHaveBeenCalledTimes(4);
        expect(firstDepartmentParams.getAll('department_ids')).toHaveLength(50);
        expect(secondDepartmentParams.getAll('department_ids')).toHaveLength(14);
        expect(result).toHaveLength(4);
        expect(result.every((candidate) => candidate.departmentNames.length === 16 && candidate.fieldAvailability.department === ExternalUserCandidateFieldAvailabilityValue.Available)).toBe(true);
    });

    it('normalizes Feishu user search permission errors without leaking bearer tokens', async () => {
        mockedAxios.get.mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 400,
                data: {
                    code: 99991679,
                    msg: 'Unauthorized',
                    error: {
                        log_id: '202607021506300D005719E2BED5C7B160'
                    }
                }
            },
            config: {
                headers: {
                    Authorization: 'Bearer user-access-token'
                }
            }
        });

        try {
            await adapter.searchExternalUsers({
                config: createConfig(),
                accessToken: 'user-access-token',
                query: '张',
                limit: 10
            });
            throw new Error('Expected IdentityProviderAdapterError');
        } catch (error) {
            expect(error).toBeInstanceOf(IdentityProviderAdapterError);
            expect(error).toMatchObject({
                providerCode: 99991679,
                providerMessage: 'Unauthorized',
                providerLogId: '202607021506300D005719E2BED5C7B160'
            });
            expect((error as Error).message).toContain('Unauthorized');
            expect((error as Error).message).not.toContain('user-access-token');
        }
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
            redirectUri: 'https://poms.example.com/auth/identity-providers:callback',
            searchRedirectUri: 'https://poms.example.com/api/platform/identity-provider-oauth-grants:callback',
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
