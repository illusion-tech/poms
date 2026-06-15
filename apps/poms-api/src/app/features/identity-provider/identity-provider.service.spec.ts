import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
    ExternalIdentityBindingStatusValue,
    IdentityProviderConfigStatusValue,
    IdentityProviderConnectionDiagnosticStatusValue,
    IdentityProviderConnectionTestCapabilityValue,
    IdentityProviderOAuthGrantStatusValue,
    IdentityProviderSearchGrantModeValue,
    IdentityProviderValue
} from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { SecretCipherService } from '../../core/secret/secret-cipher.service';
import { ExternalOrgDirectoryAdapterError } from '../external-org-sync/external-org-directory.adapter';
import { ExternalOrgDirectoryAdapterRegistry } from '../external-org-sync/external-org-directory-adapter.registry';
import { ExternalIdentity } from './external-identity.entity';
import { ExternalLoginTicket, ExternalLoginTicketStatusValue } from './external-login-ticket.entity';
import { IdentityProviderAdapterRegistry } from './identity-provider-adapter.registry';
import { IdentityProviderConfig } from './identity-provider-config.entity';
import { IdentityProviderOAuthGrant } from './identity-provider-oauth-grant.entity';
import { IdentityProviderRepository } from './identity-provider.repository';
import { IdentityProviderService } from './identity-provider.service';

describe('IdentityProviderService', () => {
    const operatorId = '00000000-0000-4000-8000-000000000001';
    const providerConfigId = '91000000-0000-4000-8000-000000000001';
    const externalIdentityId = '92000000-0000-4000-8000-000000000001';
    const externalLoginTicketId = '94000000-0000-4000-8000-000000000001';
    const oauthGrantId = '93000000-0000-4000-8000-000000000001';
    const pomsUserId = '00000000-0000-4000-8000-000000000002';
    let repository: {
        findConfigs: jest.Mock;
        findLoginEnabledConfigs: jest.Mock;
        findConfigById: jest.Mock;
        findConfigByProviderTenant: jest.Mock;
        findPlatformUserById: jest.Mock;
        findExternalIdentitiesByUserId: jest.Mock;
        findExternalIdentityById: jest.Mock;
        findActiveExternalIdentityBySubject: jest.Mock;
        findActiveExternalIdentityByUserProvider: jest.Mock;
        findOAuthGrantByUserProvider: jest.Mock;
        findExternalLoginTicketByHash: jest.Mock;
        createConfig: jest.Mock;
        createExternalIdentity: jest.Mock;
        createOAuthGrant: jest.Mock;
        createExternalLoginTicket: jest.Mock;
        saveAll: jest.Mock;
    };
    let runtimeAuditService: {
        recordAuditLog: jest.Mock;
    };
    let adapterRegistry: {
        get: jest.Mock;
    };
    let externalOrgDirectoryAdapterRegistry: {
        get: jest.Mock;
    };
    let externalOrgDirectoryAdapter: {
        testDepartmentReadAccess: jest.Mock;
    };
    let adapter: {
        buildAdminGrantAuthorizeUrl: jest.Mock;
        buildExternalLoginAuthorizeUrl: jest.Mock;
        exchangeAdminGrantCode: jest.Mock;
        exchangeExternalLoginCode: jest.Mock;
        fetchExternalLoginIdentity: jest.Mock;
        searchExternalUsers: jest.Mock;
    };
    let service: IdentityProviderService;

    beforeEach(() => {
        repository = {
            findConfigs: jest.fn(),
            findLoginEnabledConfigs: jest.fn(),
            findConfigById: jest.fn(),
            findConfigByProviderTenant: jest.fn(),
            findPlatformUserById: jest.fn(),
            findExternalIdentitiesByUserId: jest.fn(),
            findExternalIdentityById: jest.fn(),
            findActiveExternalIdentityBySubject: jest.fn(),
            findActiveExternalIdentityByUserProvider: jest.fn(),
            findOAuthGrantByUserProvider: jest.fn(),
            findExternalLoginTicketByHash: jest.fn(),
            createConfig: jest.fn((input) => createConfig(input)),
            createExternalIdentity: jest.fn((input) => createExternalIdentity(input)),
            createOAuthGrant: jest.fn((input) => createOAuthGrant(input)),
            createExternalLoginTicket: jest.fn((input) => createExternalLoginTicket(input)),
            saveAll: jest.fn().mockResolvedValue(undefined)
        };
        runtimeAuditService = {
            recordAuditLog: jest.fn().mockResolvedValue(undefined)
        };
        adapter = {
            buildAdminGrantAuthorizeUrl: jest.fn().mockReturnValue('https://accounts.feishu.cn/open-apis/authen/v1/authorize?state=test'),
            buildExternalLoginAuthorizeUrl: jest.fn().mockReturnValue('https://accounts.feishu.cn/open-apis/authen/v1/authorize?state=login'),
            exchangeAdminGrantCode: jest.fn().mockResolvedValue({
                accessToken: 'user-access-token',
                refreshToken: 'refresh-token',
                expiresInSeconds: 7200,
                refreshExpiresInSeconds: 30 * 24 * 60 * 60,
                scopes: ['contact:user:search']
            }),
            exchangeExternalLoginCode: jest.fn().mockResolvedValue({
                accessToken: 'login-access-token',
                refreshToken: null,
                expiresInSeconds: 7200,
                refreshExpiresInSeconds: null,
                scopes: ['openid']
            }),
            fetchExternalLoginIdentity: jest.fn().mockResolvedValue({
                subjectId: 'ou_feishu_user_1',
                unionId: 'on_union_1',
                displayName: '张三',
                avatarUrl: null,
                email: 'zhangsan@example.com',
                mobile: null
            }),
            searchExternalUsers: jest.fn().mockResolvedValue([
                {
                    subjectId: 'ou_feishu_user_1',
                    unionId: 'on_union_1',
                    displayName: '张三',
                    avatarUrl: null,
                    email: 'zhangsan@example.com',
                    mobile: null,
                    departmentNames: ['销售部']
                }
            ])
        };
        adapterRegistry = {
            get: jest.fn().mockReturnValue(adapter)
        };
        externalOrgDirectoryAdapter = {
            testDepartmentReadAccess: jest.fn().mockResolvedValue({
                rootDepartmentId: '0',
                childDepartmentCount: 2
            })
        };
        externalOrgDirectoryAdapterRegistry = {
            get: jest.fn().mockReturnValue(externalOrgDirectoryAdapter)
        };
        service = new IdentityProviderService(
            repository as never as IdentityProviderRepository,
            runtimeAuditService as never as RuntimeAuditService,
            adapterRegistry as never as IdentityProviderAdapterRegistry,
            new SecretCipherService(),
            externalOrgDirectoryAdapterRegistry as never as ExternalOrgDirectoryAdapterRegistry
        );
    });

    it('creates an enabled Feishu config with encrypted write-only secret and audit redaction', async () => {
        repository.findConfigByProviderTenant.mockResolvedValue(null);

        const result = await service.createIdentityProviderConfig(
            {
                provider: IdentityProviderValue.Feishu,
                tenantId: 'tenant-a',
                displayName: '飞书',
                enabled: true,
                loginEnabled: true,
                bindingEnabled: true,
                searchEnabled: true,
                clientId: 'cli_a',
                clientSecret: 'raw-secret',
                redirectUri: 'https://poms.example.com/auth/identity-providers/callback',
                searchRedirectUri: 'https://poms.example.com/api/platform/identity-provider-oauth-grants:callback',
                loginScopes: ['openid', 'profile'],
                searchScopes: ['contact:user:search']
            },
            operatorId
        );

        const saved = repository.saveAll.mock.calls[0][0][0] as IdentityProviderConfig;
        expect(saved.encryptedClientSecret).toMatch(/^v1:/);
        expect(saved.encryptedClientSecret).not.toContain('raw-secret');
        expect(result).toMatchObject({
            provider: IdentityProviderValue.Feishu,
            tenantId: 'tenant-a',
            status: IdentityProviderConfigStatusValue.Active,
            enabled: true,
            secretConfigured: true
        });
        expect(result).not.toHaveProperty('encryptedClientSecret');
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'identity-provider.config.created',
                targetType: 'IdentityProviderConfig',
                operatorId,
                beforeSnapshot: null,
                metadata: { secretRedacted: true }
            })
        );
        expect(runtimeAuditService.recordAuditLog.mock.calls[0][0].afterSnapshot).not.toHaveProperty('encryptedClientSecret');
        expect(runtimeAuditService.recordAuditLog.mock.calls[0][0].afterSnapshot).not.toHaveProperty('clientSecret');
    });

    it('rejects duplicate provider tenant configs', async () => {
        repository.findConfigByProviderTenant.mockResolvedValue(createConfig());

        await expect(
            service.createIdentityProviderConfig({
                provider: IdentityProviderValue.Feishu,
                tenantId: null,
                displayName: '飞书',
                clientId: 'cli_a'
            })
        ).rejects.toThrow(ConflictException);
    });

    it('keeps first version on per-admin provider search grants only', async () => {
        repository.findConfigByProviderTenant.mockResolvedValue(null);

        await expect(
            service.createIdentityProviderConfig({
                provider: IdentityProviderValue.Feishu,
                displayName: '飞书',
                clientId: 'cli_a',
                searchGrantMode: IdentityProviderSearchGrantModeValue.ServiceAccount
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('saves enabled login configs without a redirect URI as misconfigured', async () => {
        repository.findConfigByProviderTenant.mockResolvedValue(null);

        const result = await service.createIdentityProviderConfig(
            {
                provider: IdentityProviderValue.Feishu,
                displayName: '飞书',
                enabled: true,
                loginEnabled: true,
                clientId: 'cli_a',
                clientSecret: 'raw-secret'
            },
            operatorId
        );

        const saved = repository.saveAll.mock.calls[0][0][0] as IdentityProviderConfig;
        expect(saved.status).toBe(IdentityProviderConfigStatusValue.Misconfigured);
        expect(result.status).toBe(IdentityProviderConfigStatusValue.Misconfigured);
    });

    it('saves enabled search configs without a search redirect URI as misconfigured', async () => {
        repository.findConfigByProviderTenant.mockResolvedValue(null);

        const result = await service.createIdentityProviderConfig(
            {
                provider: IdentityProviderValue.Feishu,
                displayName: '飞书',
                enabled: true,
                searchEnabled: true,
                clientId: 'cli_a',
                clientSecret: 'raw-secret'
            },
            operatorId
        );

        const saved = repository.saveAll.mock.calls[0][0][0] as IdentityProviderConfig;
        expect(saved.status).toBe(IdentityProviderConfigStatusValue.Misconfigured);
        expect(result.status).toBe(IdentityProviderConfigStatusValue.Misconfigured);
    });

    it('updates config with optimistic lock and redacted audit snapshots', async () => {
        const existing = createConfig({
            displayName: '旧飞书',
            rowVersion: 3,
            encryptedClientSecret: 'v1:old-secret'
        });
        repository.findConfigById.mockResolvedValue(existing);

        const result = await service.updateIdentityProviderConfig(
            providerConfigId,
            {
                displayName: '飞书正式环境',
                clientSecret: 'new-secret',
                expectedVersion: 3
            },
            operatorId
        );

        expect(existing.displayName).toBe('飞书正式环境');
        expect(existing.encryptedClientSecret).toMatch(/^v1:/);
        expect(existing.encryptedClientSecret).not.toContain('new-secret');
        expect(result.displayName).toBe('飞书正式环境');
        expect(result.secretConfigured).toBe(true);
        expect(repository.saveAll).toHaveBeenCalledWith([existing]);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'identity-provider.config.updated',
                beforeSnapshot: expect.objectContaining({ displayName: '旧飞书', secretConfigured: true }),
                afterSnapshot: expect.objectContaining({ displayName: '飞书正式环境', secretConfigured: true }),
                metadata: { secretRedacted: true }
            })
        );
    });

    it('derives active status when a complete config is enabled', async () => {
        const existing = createConfig({
            enabled: false,
            status: IdentityProviderConfigStatusValue.Draft,
            encryptedClientSecret: encryptedSecret('client-secret')
        });
        repository.findConfigById.mockResolvedValue(existing);

        const result = await service.updateIdentityProviderConfig(providerConfigId, { enabled: true }, operatorId);

        expect(existing.status).toBe(IdentityProviderConfigStatusValue.Active);
        expect(result.status).toBe(IdentityProviderConfigStatusValue.Active);
    });

    it('derives misconfigured status when an incomplete config is enabled', async () => {
        const existing = createConfig({
            enabled: false,
            status: IdentityProviderConfigStatusValue.Draft,
            encryptedClientSecret: null
        });
        repository.findConfigById.mockResolvedValue(existing);

        const result = await service.updateIdentityProviderConfig(providerConfigId, { enabled: true }, operatorId);

        expect(existing.status).toBe(IdentityProviderConfigStatusValue.Misconfigured);
        expect(result.status).toBe(IdentityProviderConfigStatusValue.Misconfigured);
        expect(repository.saveAll).toHaveBeenCalledWith([existing]);
    });

    it('derives disabled status when a previously active config is turned off', async () => {
        const existing = createConfig({
            enabled: true,
            status: IdentityProviderConfigStatusValue.Active,
            encryptedClientSecret: encryptedSecret('client-secret')
        });
        repository.findConfigById.mockResolvedValue(existing);

        const result = await service.updateIdentityProviderConfig(providerConfigId, { enabled: false }, operatorId);

        expect(existing.status).toBe(IdentityProviderConfigStatusValue.Disabled);
        expect(result.status).toBe(IdentityProviderConfigStatusValue.Disabled);
    });

    it('rejects update version conflicts before mutating the entity', async () => {
        const existing = createConfig({ rowVersion: 2, displayName: '旧飞书' });
        repository.findConfigById.mockResolvedValue(existing);

        await expect(service.updateIdentityProviderConfig(providerConfigId, { displayName: '新飞书', expectedVersion: 3 }, operatorId)).rejects.toThrow(ConflictException);

        expect(existing.displayName).toBe('旧飞书');
        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    it('returns not found for missing configs', async () => {
        repository.findConfigById.mockResolvedValue(null);

        await expect(service.getIdentityProviderConfig(providerConfigId)).rejects.toThrow(NotFoundException);
    });

    it('tests local connection state without provider network calls by default', async () => {
        repository.findConfigById.mockResolvedValue(
            createConfig({
                enabled: true,
                status: IdentityProviderConfigStatusValue.Active,
                encryptedClientSecret: encryptedSecret('client-secret')
            })
        );

        const result = await service.testIdentityProviderConnection(providerConfigId, { expectedVersion: 1 });

        expect(result.status).toBe('success');
        expect(result.capability).toBe(IdentityProviderConnectionTestCapabilityValue.Basic);
        expect(result.message).toContain('Local configuration is complete');
        expect(result.checks).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'enabled', status: IdentityProviderConnectionDiagnosticStatusValue.Passed })]));
        expect(externalOrgDirectoryAdapterRegistry.get).not.toHaveBeenCalled();
    });

    it('fails connection test when config is disabled', async () => {
        repository.findConfigById.mockResolvedValue(createConfig({ enabled: false, status: IdentityProviderConfigStatusValue.Disabled }));

        const result = await service.testIdentityProviderConnection(providerConfigId);

        expect(result).toMatchObject({
            status: 'failed',
            message: 'Identity provider is disabled.'
        });
        expect(result.checks).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'enabled', status: IdentityProviderConnectionDiagnosticStatusValue.Failed })]));
    });

    it('checks Feishu organization sync readiness with a read-only department probe', async () => {
        const config = createConfig({
            enabled: true,
            status: IdentityProviderConfigStatusValue.Active,
            encryptedClientSecret: encryptedSecret('client-secret')
        });
        repository.findConfigById.mockResolvedValue(config);

        const result = await service.testIdentityProviderConnection(providerConfigId, {
            capability: IdentityProviderConnectionTestCapabilityValue.ExternalOrgSync,
            externalRootDepartmentId: 'od-root',
            expectedVersion: 1
        });

        expect(externalOrgDirectoryAdapterRegistry.get).toHaveBeenCalledWith('feishu');
        expect(externalOrgDirectoryAdapter.testDepartmentReadAccess).toHaveBeenCalledWith({
            providerConfig: config,
            clientSecret: 'client-secret',
            rootDepartmentId: 'od-root'
        });
        expect(result).toMatchObject({
            status: 'success',
            capability: IdentityProviderConnectionTestCapabilityValue.ExternalOrgSync,
            message: '组织同步可用性检查通过，飞书通讯录读取正常。'
        });
        expect(result.checks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'tenantAccessToken', status: IdentityProviderConnectionDiagnosticStatusValue.Passed }),
                expect.objectContaining({ key: 'departmentReadAccess', status: IdentityProviderConnectionDiagnosticStatusValue.Passed })
            ])
        );
    });

    it('does not call Feishu when organization sync local readiness fails', async () => {
        repository.findConfigById.mockResolvedValue(
            createConfig({
                enabled: true,
                status: IdentityProviderConfigStatusValue.Misconfigured,
                encryptedClientSecret: null
            })
        );

        const result = await service.testIdentityProviderConnection(providerConfigId, {
            capability: IdentityProviderConnectionTestCapabilityValue.ExternalOrgSync
        });

        expect(result.status).toBe('failed');
        expect(result.message).toContain('组织同步可用性检查未通过');
        expect(result.nextActions).toEqual(expect.arrayContaining(['完善 Client Secret 或已启用能力的回调地址，使接入状态恢复为已激活。']));
        expect(result.checks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'configStatus', status: IdentityProviderConnectionDiagnosticStatusValue.Failed }),
                expect.objectContaining({ key: 'tenantAccessToken', status: IdentityProviderConnectionDiagnosticStatusValue.Skipped })
            ])
        );
        expect(externalOrgDirectoryAdapter.testDepartmentReadAccess).not.toHaveBeenCalled();
    });

    it('returns actionable organization sync diagnostics when Feishu department read fails', async () => {
        repository.findConfigById.mockResolvedValue(
            createConfig({
                enabled: true,
                status: IdentityProviderConfigStatusValue.Active,
                encryptedClientSecret: encryptedSecret('client-secret')
            })
        );
        externalOrgDirectoryAdapter.testDepartmentReadAccess.mockRejectedValueOnce(new ExternalOrgDirectoryAdapterError('飞书应用身份通讯录权限未开通或未生效，请在飞书开放平台检查应用身份权限并发布应用。（飞书返回：permission denied，code 99991663）'));

        const result = await service.testIdentityProviderConnection(providerConfigId, {
            capability: IdentityProviderConnectionTestCapabilityValue.ExternalOrgSync
        });

        expect(result.status).toBe('failed');
        expect(result.message).toContain('飞书应用身份通讯录权限未开通');
        expect(result.nextActions).toEqual(expect.arrayContaining(['在飞书开放平台开通应用身份通讯录部门读取权限，并发布应用后重试。']));
        expect(result.checks).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'departmentReadAccess', status: IdentityProviderConnectionDiagnosticStatusValue.Failed })]));
    });

    it('lists enabled login providers without secrets', async () => {
        repository.findLoginEnabledConfigs.mockResolvedValue([createLoginEnabledConfig()]);

        const result = await service.listEnabledLoginProviders();

        expect(result).toEqual([
            {
                id: providerConfigId,
                provider: IdentityProviderValue.Feishu,
                tenantId: null,
                displayName: '飞书',
                loginScopes: ['openid']
            }
        ]);
    });

    it('builds external login authorize URL with login scopes', async () => {
        repository.findConfigById.mockResolvedValue(createLoginEnabledConfig());

        const result = await service.authorizeExternalLogin(providerConfigId);

        expect(adapter.buildExternalLoginAuthorizeUrl).toHaveBeenCalledWith(
            expect.objectContaining({
                config: expect.objectContaining({ id: providerConfigId }),
                redirectUri: 'https://poms.example.com/auth/identity-providers:callback',
                scopes: ['openid'],
                state: expect.any(String)
            })
        );
        expect(result.authorizeUrl).toContain('state=login');
    });

    it('handles external login callback by issuing a short-lived one-time ticket for a bound user', async () => {
        const config = createLoginEnabledConfig();
        repository.findConfigById.mockResolvedValue(config);
        repository.findActiveExternalIdentityBySubject.mockResolvedValue(createExternalIdentity());
        repository.findPlatformUserById.mockResolvedValue({ id: pomsUserId, isActive: true });

        await service.authorizeExternalLogin(providerConfigId);
        const state = adapter.buildExternalLoginAuthorizeUrl.mock.calls[0][0].state as string;

        const result = await service.handleExternalLoginCallback({ code: 'auth-code', state });

        expect(adapter.exchangeExternalLoginCode).toHaveBeenCalledWith(expect.objectContaining({ config, redirectUri: 'https://poms.example.com/auth/identity-providers:callback', clientSecret: 'client-secret', code: 'auth-code' }));
        expect(adapter.fetchExternalLoginIdentity).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'login-access-token' }));
        expect(repository.findActiveExternalIdentityBySubject).toHaveBeenCalledWith(providerConfigId, null, 'ou_feishu_user_1');
        const saved = repository.saveAll.mock.calls.at(-1)?.[0][0] as ExternalLoginTicket;
        expect(saved.ticketHash).toHaveLength(64);
        expect(saved.status).toBe(ExternalLoginTicketStatusValue.Issued);
        expect(result).toMatchObject({
            provider: IdentityProviderValue.Feishu,
            identityProviderConfigId: providerConfigId,
            pomsUserId,
            ticket: expect.any(String)
        });
        expect(result.ticket).not.toBe(saved.ticketHash);
    });

    it('rejects external login callback when the external subject is not bound', async () => {
        repository.findConfigById.mockResolvedValue(createLoginEnabledConfig());
        repository.findActiveExternalIdentityBySubject.mockResolvedValue(null);

        await service.authorizeExternalLogin(providerConfigId);
        const state = adapter.buildExternalLoginAuthorizeUrl.mock.calls[0][0].state as string;

        await expect(service.handleExternalLoginCallback({ code: 'auth-code', state })).rejects.toThrow('External identity is not bound');
    });

    it('consumes an issued external login ticket only once', async () => {
        const ticket = createExternalLoginTicket();
        repository.findExternalLoginTicketByHash.mockResolvedValue(ticket);

        const result = await service.consumeExternalLoginSession('ticket-value');

        expect(ticket.status).toBe(ExternalLoginTicketStatusValue.Consumed);
        expect(ticket.consumedAt).toBeInstanceOf(Date);
        expect(result).toMatchObject({
            pomsUserId,
            externalIdentityId,
            identityProviderConfigId: providerConfigId
        });
    });

    it('rejects expired external login tickets before issuing a POMS session', async () => {
        const ticket = createExternalLoginTicket({ expiresAt: new Date(Date.now() - 60_000) });
        repository.findExternalLoginTicketByHash.mockResolvedValue(ticket);

        await expect(service.consumeExternalLoginSession('ticket-value')).rejects.toThrow('expired');

        expect(ticket.status).toBe(ExternalLoginTicketStatusValue.Expired);
    });

    it('returns missing current-admin provider grant status before authorization', async () => {
        repository.findPlatformUserById.mockResolvedValue({ id: operatorId });
        repository.findConfigById.mockResolvedValue(createSearchEnabledConfig());
        repository.findOAuthGrantByUserProvider.mockResolvedValue(null);

        const result = await service.getCurrentAdminProviderGrant(providerConfigId, operatorId);

        expect(result).toMatchObject({
            id: null,
            identityProviderConfigId: providerConfigId,
            pomsUserId: operatorId,
            status: IdentityProviderOAuthGrantStatusValue.Missing
        });
    });

    it('builds a provider authorization URL for current-admin search grant', async () => {
        repository.findPlatformUserById.mockResolvedValue({ id: operatorId });
        repository.findConfigById.mockResolvedValue(createSearchEnabledConfig());

        const result = await service.authorizeCurrentAdminProviderGrant(providerConfigId, operatorId);

        expect(adapterRegistry.get).toHaveBeenCalledWith(IdentityProviderValue.Feishu);
        expect(adapter.buildAdminGrantAuthorizeUrl).toHaveBeenCalledWith(
            expect.objectContaining({
                config: expect.objectContaining({ id: providerConfigId }),
                redirectUri: 'https://poms.example.com/api/platform/identity-provider-oauth-grants:callback',
                scopes: ['contact:user:search'],
                state: expect.any(String)
            })
        );
        expect(result).toMatchObject({
            authorizeUrl: 'https://accounts.feishu.cn/open-apis/authen/v1/authorize?state=test',
            stateExpiresAt: expect.any(String)
        });
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'identity-provider.oauth-grant.authorize-started' }));
    });

    it('exchanges provider callback code and stores encrypted current-admin grant tokens', async () => {
        const config = createSearchEnabledConfig();
        repository.findPlatformUserById.mockResolvedValue({ id: operatorId });
        repository.findConfigById.mockResolvedValue(config);
        repository.findOAuthGrantByUserProvider.mockResolvedValue(null);

        await service.authorizeCurrentAdminProviderGrant(providerConfigId, operatorId);
        const state = adapter.buildAdminGrantAuthorizeUrl.mock.calls[0][0].state as string;

        const result = await service.handleCurrentAdminProviderGrantCallback({ code: 'auth-code', state });

        expect(adapter.exchangeAdminGrantCode).toHaveBeenCalledWith(
            expect.objectContaining({
                config,
                redirectUri: 'https://poms.example.com/api/platform/identity-provider-oauth-grants:callback',
                clientSecret: 'client-secret',
                code: 'auth-code'
            })
        );
        const saved = repository.saveAll.mock.calls.at(-1)?.[0][0] as IdentityProviderOAuthGrant;
        expect(saved.encryptedAccessToken).toMatch(/^v1:/);
        expect(saved.encryptedAccessToken).not.toContain('user-access-token');
        expect(saved.encryptedRefreshToken).toMatch(/^v1:/);
        expect(result).toMatchObject({
            identityProviderConfigId: providerConfigId,
            pomsUserId: operatorId,
            status: IdentityProviderOAuthGrantStatusValue.Active,
            scopes: ['contact:user:search']
        });
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'identity-provider.oauth-grant.updated' }));
    });

    it('searches external users through the current admin provider grant', async () => {
        repository.findPlatformUserById.mockResolvedValue({ id: operatorId });
        repository.findConfigById.mockResolvedValue(createSearchEnabledConfig());
        repository.findOAuthGrantByUserProvider.mockResolvedValue(createOAuthGrant({ encryptedAccessToken: encryptedSecret('user-access-token') }));

        const result = await service.searchExternalUsers(providerConfigId, { q: '张', limit: 10 }, operatorId);

        expect(adapter.searchExternalUsers).toHaveBeenCalledWith(
            expect.objectContaining({
                accessToken: 'user-access-token',
                query: '张',
                limit: 10
            })
        );
        expect(result.items).toEqual([
            expect.objectContaining({
                identityProviderConfigId: providerConfigId,
                subjectId: 'ou_feishu_user_1',
                displayName: '张三'
            })
        ]);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'identity-provider.external-users.searched' }));
    });

    it('rejects external user search when the current admin grant is expired', async () => {
        repository.findPlatformUserById.mockResolvedValue({ id: operatorId });
        repository.findConfigById.mockResolvedValue(createSearchEnabledConfig());
        repository.findOAuthGrantByUserProvider.mockResolvedValue(createOAuthGrant({ expiresAt: new Date(Date.now() - 60_000) }));

        await expect(service.searchExternalUsers(providerConfigId, { q: '张' }, operatorId)).rejects.toThrow(BadRequestException);

        expect(adapter.searchExternalUsers).not.toHaveBeenCalled();
    });

    it('lists external identity bindings for an existing platform user', async () => {
        repository.findPlatformUserById.mockResolvedValue({ id: pomsUserId });
        repository.findExternalIdentitiesByUserId.mockResolvedValue([createExternalIdentity()]);

        const result = await service.listUserExternalIdentities(pomsUserId);

        expect(repository.findPlatformUserById).toHaveBeenCalledWith(pomsUserId);
        expect(repository.findExternalIdentitiesByUserId).toHaveBeenCalledWith(pomsUserId);
        expect(result).toEqual([
            expect.objectContaining({
                id: externalIdentityId,
                pomsUserId,
                subjectId: 'ou_feishu_user_1',
                status: ExternalIdentityBindingStatusValue.Active
            })
        ]);
    });

    it('binds an external subject to an existing POMS user with conflict checks and audit', async () => {
        repository.findPlatformUserById.mockResolvedValue({ id: pomsUserId });
        repository.findConfigById.mockResolvedValue(
            createConfig({
                enabled: true,
                bindingEnabled: true,
                status: IdentityProviderConfigStatusValue.Active,
                tenantId: 'tenant-a',
                encryptedClientSecret: 'v1:secret'
            })
        );
        repository.findActiveExternalIdentityBySubject.mockResolvedValue(null);
        repository.findActiveExternalIdentityByUserProvider.mockResolvedValue(null);

        const result = await service.bindUserExternalIdentity(
            pomsUserId,
            {
                identityProviderConfigId: providerConfigId,
                subjectId: 'ou_feishu_user_1',
                unionId: 'on_union_1',
                subjectDisplayName: '张三',
                email: 'zhangsan@example.com'
            },
            operatorId
        );

        expect(repository.findActiveExternalIdentityBySubject).toHaveBeenCalledWith(providerConfigId, 'tenant-a', 'ou_feishu_user_1');
        expect(repository.findActiveExternalIdentityByUserProvider).toHaveBeenCalledWith(pomsUserId, providerConfigId);
        expect(repository.saveAll.mock.calls[0][0][0]).toMatchObject({
            pomsUserId,
            subjectId: 'ou_feishu_user_1',
            unionId: 'on_union_1',
            subjectDisplayName: '张三',
            status: ExternalIdentityBindingStatusValue.Active
        });
        expect(result).toMatchObject({
            pomsUserId,
            subjectId: 'ou_feishu_user_1',
            tenantId: 'tenant-a',
            status: ExternalIdentityBindingStatusValue.Active
        });
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'external-identity.bound',
                targetType: 'ExternalIdentity',
                operatorId,
                beforeSnapshot: null
            })
        );
    });

    it('rejects binding when provider config is not binding-enabled', async () => {
        repository.findPlatformUserById.mockResolvedValue({ id: pomsUserId });
        repository.findConfigById.mockResolvedValue(
            createConfig({
                enabled: true,
                bindingEnabled: false,
                status: IdentityProviderConfigStatusValue.Active,
                encryptedClientSecret: 'v1:secret'
            })
        );

        await expect(
            service.bindUserExternalIdentity(pomsUserId, {
                identityProviderConfigId: providerConfigId,
                subjectId: 'ou_feishu_user_1'
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects binding when external subject is already active', async () => {
        repository.findPlatformUserById.mockResolvedValue({ id: pomsUserId });
        repository.findConfigById.mockResolvedValue(
            createConfig({
                enabled: true,
                bindingEnabled: true,
                status: IdentityProviderConfigStatusValue.Active,
                encryptedClientSecret: 'v1:secret'
            })
        );
        repository.findActiveExternalIdentityBySubject.mockResolvedValue(createExternalIdentity());

        await expect(
            service.bindUserExternalIdentity(pomsUserId, {
                identityProviderConfigId: providerConfigId,
                subjectId: 'ou_feishu_user_1'
            })
        ).rejects.toThrow(ConflictException);
    });

    it('unbinds an active external identity with optimistic lock and audit', async () => {
        const binding = createExternalIdentity({ rowVersion: 2 });
        repository.findExternalIdentityById.mockResolvedValue(binding);

        const result = await service.unbindExternalIdentity(externalIdentityId, { expectedVersion: 2 }, operatorId);

        expect(binding.status).toBe(ExternalIdentityBindingStatusValue.Revoked);
        expect(binding.revokedBy).toBe(operatorId);
        expect(binding.revokedAt).toBeInstanceOf(Date);
        expect(result.status).toBe(ExternalIdentityBindingStatusValue.Revoked);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'external-identity.unbound',
                beforeSnapshot: expect.objectContaining({ status: ExternalIdentityBindingStatusValue.Active }),
                afterSnapshot: expect.objectContaining({ status: ExternalIdentityBindingStatusValue.Revoked })
            })
        );
    });

    it('rejects unbind version conflicts before mutating the binding', async () => {
        const binding = createExternalIdentity({ rowVersion: 1 });
        repository.findExternalIdentityById.mockResolvedValue(binding);

        await expect(service.unbindExternalIdentity(externalIdentityId, { expectedVersion: 2 }, operatorId)).rejects.toThrow(ConflictException);

        expect(binding.status).toBe(ExternalIdentityBindingStatusValue.Active);
        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    function createConfig(overrides: Partial<IdentityProviderConfig> = {}): IdentityProviderConfig {
        return {
            id: providerConfigId,
            provider: IdentityProviderValue.Feishu,
            tenantId: null,
            displayName: '飞书',
            status: IdentityProviderConfigStatusValue.Draft,
            enabled: false,
            loginEnabled: false,
            bindingEnabled: false,
            searchEnabled: false,
            clientId: 'cli_a',
            encryptedClientSecret: null,
            secretUpdatedAt: null,
            redirectUri: null,
            searchRedirectUri: null,
            loginScopes: [],
            searchScopes: [],
            tenantAllowlist: [],
            searchGrantMode: IdentityProviderSearchGrantModeValue.PerAdmin,
            rowVersion: 1,
            createdAt: new Date('2026-05-07T00:00:00.000Z'),
            createdBy: operatorId,
            updatedAt: new Date('2026-05-07T00:00:00.000Z'),
            updatedBy: operatorId,
            ...overrides
        } as IdentityProviderConfig;
    }

    function createSearchEnabledConfig(overrides: Partial<IdentityProviderConfig> = {}): IdentityProviderConfig {
        return createConfig({
            enabled: true,
            searchEnabled: true,
            status: IdentityProviderConfigStatusValue.Active,
            encryptedClientSecret: encryptedSecret('client-secret'),
            searchRedirectUri: 'https://poms.example.com/api/platform/identity-provider-oauth-grants:callback',
            searchScopes: ['contact:user:search'],
            ...overrides
        });
    }

    function createLoginEnabledConfig(overrides: Partial<IdentityProviderConfig> = {}): IdentityProviderConfig {
        return createConfig({
            enabled: true,
            loginEnabled: true,
            status: IdentityProviderConfigStatusValue.Active,
            encryptedClientSecret: encryptedSecret('client-secret'),
            redirectUri: 'https://poms.example.com/auth/identity-providers:callback',
            loginScopes: ['openid'],
            ...overrides
        });
    }

    function createExternalIdentity(overrides: Partial<ExternalIdentity> = {}): ExternalIdentity {
        return {
            id: externalIdentityId,
            identityProviderConfigId: providerConfigId,
            provider: IdentityProviderValue.Feishu,
            tenantId: 'tenant-a',
            pomsUserId,
            subjectId: 'ou_feishu_user_1',
            unionId: null,
            subjectDisplayName: '张三',
            avatarUrl: null,
            email: 'zhangsan@example.com',
            mobile: null,
            status: ExternalIdentityBindingStatusValue.Active,
            boundAt: new Date('2026-05-07T01:00:00.000Z'),
            boundBy: operatorId,
            revokedAt: null,
            revokedBy: null,
            rowVersion: 1,
            createdAt: new Date('2026-05-07T01:00:00.000Z'),
            createdBy: operatorId,
            updatedAt: new Date('2026-05-07T01:00:00.000Z'),
            updatedBy: operatorId,
            ...overrides
        } as ExternalIdentity;
    }

    function createOAuthGrant(overrides: Partial<IdentityProviderOAuthGrant> = {}): IdentityProviderOAuthGrant {
        return {
            id: oauthGrantId,
            identityProviderConfigId: providerConfigId,
            provider: IdentityProviderValue.Feishu,
            tenantId: 'tenant-a',
            pomsUserId: operatorId,
            encryptedAccessToken: encryptedSecret('user-access-token'),
            encryptedRefreshToken: encryptedSecret('refresh-token'),
            scopes: ['contact:user:search'],
            status: IdentityProviderOAuthGrantStatusValue.Active,
            grantedAt: new Date('2026-05-07T01:00:00.000Z'),
            expiresAt: new Date(Date.now() + 60 * 60_000),
            refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
            lastUsedAt: null,
            revokedAt: null,
            lastError: null,
            rowVersion: 1,
            createdAt: new Date('2026-05-07T01:00:00.000Z'),
            createdBy: operatorId,
            updatedAt: new Date('2026-05-07T01:00:00.000Z'),
            updatedBy: operatorId,
            ...overrides
        } as IdentityProviderOAuthGrant;
    }

    function createExternalLoginTicket(overrides: Partial<ExternalLoginTicket> = {}): ExternalLoginTicket {
        return {
            id: externalLoginTicketId,
            ticketHash: createHash('sha256').update('ticket-value').digest('hex'),
            identityProviderConfigId: providerConfigId,
            externalIdentityId,
            pomsUserId,
            provider: IdentityProviderValue.Feishu,
            tenantId: null,
            subjectId: 'ou_feishu_user_1',
            status: ExternalLoginTicketStatusValue.Issued,
            expiresAt: new Date(Date.now() + 60_000),
            consumedAt: null,
            rowVersion: 1,
            createdAt: new Date('2026-05-07T01:00:00.000Z'),
            updatedAt: new Date('2026-05-07T01:00:00.000Z'),
            ...overrides
        } as ExternalLoginTicket;
    }

    function encryptedSecret(secret: string): string {
        const key = createHash('sha256')
            .update(process.env['IDENTITY_PROVIDER_SECRET_KEY'] ?? process.env['JWT_SECRET'] ?? 'poms-dev-secret-change-in-production')
            .digest();
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
    }
});
