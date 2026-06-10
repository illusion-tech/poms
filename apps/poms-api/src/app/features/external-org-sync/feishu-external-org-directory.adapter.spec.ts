import { ExternalOrgProviderValue } from '@poms/shared-contracts';
import axios from 'axios';
import { IdentityProviderConfig } from '../identity-provider/identity-provider-config.entity';
import { ExternalOrgSource } from './external-org-source.entity';
import { FeishuExternalOrgDirectoryAdapter } from './feishu-external-org-directory.adapter';

jest.mock('axios');

describe('FeishuExternalOrgDirectoryAdapter', () => {
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    let adapter: FeishuExternalOrgDirectoryAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new FeishuExternalOrgDirectoryAdapter();
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
                    page_size: 100
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
