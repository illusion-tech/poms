import { IdentityProviderConfigStatusValue, IdentityProviderValue } from '@poms/shared-contracts';
import { IdentityProviderController } from './identity-provider.controller';
import { IdentityProviderService } from './identity-provider.service';

describe('IdentityProviderController', () => {
    const operatorRequest = { user: { sub: '00000000-0000-4000-8000-000000000001' } };
    const configId = '91000000-0000-4000-8000-000000000001';
    let service: jest.Mocked<Pick<IdentityProviderService, 'listIdentityProviderConfigs' | 'createIdentityProviderConfig' | 'getIdentityProviderConfig' | 'updateIdentityProviderConfig' | 'testIdentityProviderConnection' | 'searchExternalUsers'>>;
    let controller: IdentityProviderController;

    beforeEach(() => {
        service = {
            listIdentityProviderConfigs: jest.fn(),
            createIdentityProviderConfig: jest.fn(),
            getIdentityProviderConfig: jest.fn(),
            updateIdentityProviderConfig: jest.fn(),
            testIdentityProviderConnection: jest.fn(),
            searchExternalUsers: jest.fn()
        };
        controller = new IdentityProviderController(service as never as IdentityProviderService);
    });

    it('delegates config list query to the service', async () => {
        service.listIdentityProviderConfigs.mockResolvedValue([createConfigDetail()]);

        const result = await controller.listIdentityProviderConfigs({
            provider: IdentityProviderValue.Feishu,
            status: IdentityProviderConfigStatusValue.Active
        });

        expect(service.listIdentityProviderConfigs).toHaveBeenCalledWith({
            provider: IdentityProviderValue.Feishu,
            status: IdentityProviderConfigStatusValue.Active
        });
        expect(result).toHaveLength(1);
    });

    it('delegates create with the current operator id', async () => {
        const body = {
            provider: IdentityProviderValue.Feishu,
            displayName: '飞书',
            clientId: 'cli_a',
            clientSecret: 'raw-secret'
        };
        service.createIdentityProviderConfig.mockResolvedValue(createConfigDetail());

        const result = await controller.createIdentityProviderConfig(body, operatorRequest as never);

        expect(service.createIdentityProviderConfig).toHaveBeenCalledWith(body, operatorRequest.user.sub);
        expect(result.id).toBe(configId);
    });

    it('delegates detail, update, and connection test commands', async () => {
        const detail = createConfigDetail();
        service.getIdentityProviderConfig.mockResolvedValue(detail);
        service.updateIdentityProviderConfig.mockResolvedValue({ ...detail, displayName: '飞书正式环境' });
        service.testIdentityProviderConnection.mockResolvedValue({
            status: 'success',
            message: 'Local configuration is complete.',
            checkedAt: '2026-05-07T00:00:00.000Z'
        });

        await expect(controller.getIdentityProviderConfig(configId)).resolves.toBe(detail);
        await expect(controller.updateIdentityProviderConfig(configId, { displayName: '飞书正式环境' }, operatorRequest as never)).resolves.toMatchObject({ displayName: '飞书正式环境' });
        await expect(controller.testIdentityProviderConnection(configId, { expectedVersion: 1 })).resolves.toMatchObject({ status: 'success' });

        expect(service.getIdentityProviderConfig).toHaveBeenCalledWith(configId);
        expect(service.updateIdentityProviderConfig).toHaveBeenCalledWith(configId, { displayName: '飞书正式环境' }, operatorRequest.user.sub);
        expect(service.testIdentityProviderConnection).toHaveBeenCalledWith(configId, { expectedVersion: 1 });
    });

    it('delegates external user search with the current operator id', async () => {
        service.searchExternalUsers.mockResolvedValue({
            identityProviderConfigId: configId,
            provider: IdentityProviderValue.Feishu,
            tenantId: null,
            query: '张',
            items: [],
            searchedAt: '2026-05-07T00:00:00.000Z'
        });

        await controller.searchExternalUsers(configId, { q: '张', limit: 10 }, operatorRequest as never);

        expect(service.searchExternalUsers).toHaveBeenCalledWith(configId, { q: '张', limit: 10 }, operatorRequest.user.sub);
    });

    function createConfigDetail() {
        return {
            id: configId,
            provider: IdentityProviderValue.Feishu,
            tenantId: null,
            displayName: '飞书',
            status: IdentityProviderConfigStatusValue.Active,
            enabled: true,
            loginEnabled: true,
            bindingEnabled: true,
            searchEnabled: true,
            clientId: 'cli_a',
            secretConfigured: true,
            redirectUri: 'https://poms.example.com/auth/identity-providers/callback',
            searchRedirectUri: 'https://poms.example.com/api/platform/identity-provider-oauth-grants:callback',
            loginScopes: ['openid'],
            searchScopes: ['contact:user:search'],
            tenantAllowlist: [],
            searchGrantMode: 'per-admin' as const,
            rowVersion: 1,
            createdAt: '2026-05-07T00:00:00.000Z',
            createdBy: operatorRequest.user.sub,
            updatedAt: '2026-05-07T00:00:00.000Z',
            updatedBy: operatorRequest.user.sub
        };
    }
});
