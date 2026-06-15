import { ExternalOrgProviderValue } from '@poms/shared-contracts';
import axios from 'axios';
import { IdentityProviderConfig } from '../identity-provider/identity-provider-config.entity';
import { ExternalOrgDirectoryAdapterError } from './external-org-directory.adapter';
import { ExternalOrgSource } from './external-org-source.entity';
import { FeishuExternalOrgDirectoryAdapter } from './feishu-external-org-directory.adapter';

jest.mock('axios');

describe('FeishuExternalOrgDirectoryAdapter', () => {
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    const originalDepartmentPageSize = process.env['FEISHU_ORG_DEPARTMENT_PAGE_SIZE'];
    let adapter: FeishuExternalOrgDirectoryAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        if (originalDepartmentPageSize === undefined) {
            delete process.env['FEISHU_ORG_DEPARTMENT_PAGE_SIZE'];
        } else {
            process.env['FEISHU_ORG_DEPARTMENT_PAGE_SIZE'] = originalDepartmentPageSize;
        }
        adapter = new FeishuExternalOrgDirectoryAdapter();
    });

    afterAll(() => {
        if (originalDepartmentPageSize === undefined) {
            delete process.env['FEISHU_ORG_DEPARTMENT_PAGE_SIZE'];
        } else {
            process.env['FEISHU_ORG_DEPARTMENT_PAGE_SIZE'] = originalDepartmentPageSize;
        }
    });

    it('fetches tenant token and walks Feishu department children with open department ids', async () => {
        mockedAxios.post.mockResolvedValue({
            data: {
                code: 0,
                msg: 'ok',
                tenant_access_token: 'tenant-token',
                expire: 7200
            }
        });
        mockedAxios.get
            .mockResolvedValueOnce({
                data: {
                    code: 0,
                    msg: 'success',
                    data: {
                        has_more: false,
                        items: [
                            {
                                open_department_id: 'od-sales',
                                parent_department_id: '0',
                                name: '销售部',
                                order: 7,
                                status: { is_deleted: false }
                            }
                        ]
                    }
                }
            })
            .mockResolvedValueOnce({
                data: {
                    code: 0,
                    msg: 'success',
                    data: {
                        has_more: false,
                        items: []
                    }
                }
            });

        const result = await adapter.fetchDepartmentTree({
            source: createSource(),
            providerConfig: createProviderConfig(),
            clientSecret: 'client-secret'
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
            'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
            {
                app_id: 'cli_a',
                app_secret: 'client-secret'
            },
            expect.objectContaining({ timeout: 10_000 })
        );
        expect(mockedAxios.get).toHaveBeenCalledWith(
            'https://open.feishu.cn/open-apis/contact/v3/departments/0/children',
            expect.objectContaining({
                headers: { Authorization: 'Bearer tenant-token' },
                params: expect.objectContaining({
                    department_id_type: 'open_department_id',
                    user_id_type: 'open_id',
                    fetch_child: false,
                    page_size: 50
                })
            })
        );
        expect(result).toEqual([
            {
                externalDepartmentId: 'od-sales',
                externalParentDepartmentId: '0',
                externalDepartmentName: '销售部',
                isActive: true,
                displayOrder: 7,
                raw: expect.objectContaining({ open_department_id: 'od-sales' })
            }
        ]);
    });

    it('caps configured department page size at Feishu limit', async () => {
        process.env['FEISHU_ORG_DEPARTMENT_PAGE_SIZE'] = '100';
        mockedAxios.post.mockResolvedValue({
            data: {
                code: 0,
                msg: 'ok',
                tenant_access_token: 'tenant-token',
                expire: 7200
            }
        });
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                code: 0,
                msg: 'success',
                data: {
                    has_more: false,
                    items: []
                }
            }
        });

        await adapter.fetchDepartmentTree({
            source: createSource(),
            providerConfig: createProviderConfig(),
            clientSecret: 'client-secret'
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                params: expect.objectContaining({
                    page_size: 50
                })
            })
        );
    });

    it('tests department read access with a single root children request', async () => {
        mockedAxios.post.mockResolvedValue({
            data: {
                code: 0,
                msg: 'ok',
                tenant_access_token: 'tenant-token',
                expire: 7200
            }
        });
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                code: 0,
                msg: 'success',
                data: {
                    has_more: false,
                    items: [
                        {
                            open_department_id: 'od-sales',
                            parent_department_id: 'od-root',
                            name: '销售部',
                            status: { is_deleted: false }
                        }
                    ]
                }
            }
        });

        const result = await adapter.testDepartmentReadAccess({
            providerConfig: createProviderConfig(),
            clientSecret: 'client-secret',
            rootDepartmentId: 'od-root'
        });

        expect(result).toEqual({
            rootDepartmentId: 'od-root',
            childDepartmentCount: 1
        });
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith('https://open.feishu.cn/open-apis/contact/v3/departments/od-root/children', expect.any(Object));
    });

    it('normalizes Feishu HTTP errors into adapter diagnostics', async () => {
        mockedAxios.post.mockResolvedValue({
            data: {
                code: 0,
                msg: 'ok',
                tenant_access_token: 'tenant-token',
                expire: 7200
            }
        });
        mockedAxios.get.mockRejectedValueOnce({
            response: {
                status: 400,
                data: {
                    code: 40011,
                    msg: 'page size is more than 50 error'
                }
            }
        });

        let thrown: unknown;
        try {
            await adapter.fetchDepartmentTree({
                source: createSource(),
                providerConfig: createProviderConfig(),
                clientSecret: 'client-secret'
            });
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(ExternalOrgDirectoryAdapterError);
        expect((thrown as Error).message).toContain('飞书部门分页大小超过限制');
        expect((thrown as Error).message).toContain('code 40011');
    });

    it('normalizes Feishu payload errors into adapter diagnostics', async () => {
        mockedAxios.post.mockResolvedValue({
            data: {
                code: 0,
                msg: 'ok',
                tenant_access_token: 'tenant-token',
                expire: 7200
            }
        });
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                code: 40011,
                msg: 'page size is more than 50 error'
            }
        });

        let thrown: unknown;
        try {
            await adapter.fetchDepartmentTree({
                source: createSource(),
                providerConfig: createProviderConfig(),
                clientSecret: 'client-secret'
            });
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(ExternalOrgDirectoryAdapterError);
        expect((thrown as Error).message).toContain('飞书部门分页大小超过限制');
        expect((thrown as Error).message).toContain('code 40011');
    });

    it('uses fallback message once when Feishu payload error has no provider message', async () => {
        mockedAxios.post.mockResolvedValue({
            data: {
                code: 0,
                msg: 'ok',
                tenant_access_token: 'tenant-token',
                expire: 7200
            }
        });
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                code: 12345
            }
        });

        let thrown: unknown;
        try {
            await adapter.fetchDepartmentTree({
                source: createSource(),
                providerConfig: createProviderConfig(),
                clientSecret: 'client-secret'
            });
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(ExternalOrgDirectoryAdapterError);
        expect((thrown as Error).message).toBe('Feishu department children request failed（code 12345）');
    });

    it('does not repeat provider message for generic Feishu HTTP errors', async () => {
        mockedAxios.post.mockResolvedValue({
            data: {
                code: 0,
                msg: 'ok',
                tenant_access_token: 'tenant-token',
                expire: 7200
            }
        });
        mockedAxios.get.mockRejectedValueOnce({
            response: {
                status: 400,
                data: {
                    code: 12345,
                    msg: 'provider internal error'
                }
            }
        });

        let thrown: unknown;
        try {
            await adapter.fetchDepartmentTree({
                source: createSource(),
                providerConfig: createProviderConfig(),
                clientSecret: 'client-secret'
            });
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(ExternalOrgDirectoryAdapterError);
        expect((thrown as Error).message).toBe('Feishu department children request failed: provider internal error（code 12345，HTTP 400）');
    });

    function createSource(): ExternalOrgSource {
        return {
            id: '97000000-0000-4000-8000-000000000001',
            provider: ExternalOrgProviderValue.Feishu,
            externalTenantId: null,
            displayName: '飞书通讯录',
            status: 'active',
            providerConfigId: '97000000-0000-4000-8000-000000000031',
            authoritativeOrgUnitId: null,
            externalRootDepartmentId: '0',
            syncScopes: [],
            rowVersion: 1,
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-06-10T00:00:00.000Z'),
            updatedBy: null
        } as ExternalOrgSource;
    }

    function createProviderConfig(): IdentityProviderConfig {
        return {
            id: '97000000-0000-4000-8000-000000000031',
            provider: ExternalOrgProviderValue.Feishu,
            tenantId: null,
            displayName: '飞书',
            status: 'active',
            enabled: true,
            loginEnabled: true,
            bindingEnabled: true,
            searchEnabled: true,
            clientId: 'cli_a',
            encryptedClientSecret: 'redacted',
            secretUpdatedAt: null,
            redirectUri: null,
            searchRedirectUri: null,
            loginScopes: [],
            searchScopes: [],
            tenantAllowlist: [],
            searchGrantMode: 'per-admin',
            rowVersion: 1,
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-06-10T00:00:00.000Z'),
            updatedBy: null
        } as IdentityProviderConfig;
    }
});
