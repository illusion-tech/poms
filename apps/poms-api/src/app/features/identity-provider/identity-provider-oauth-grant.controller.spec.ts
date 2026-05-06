import { IdentityProviderOAuthGrantStatusValue, IdentityProviderValue } from '@poms/shared-contracts';
import { IdentityProviderOAuthGrantController } from './identity-provider-oauth-grant.controller';
import { IdentityProviderService } from './identity-provider.service';

describe('IdentityProviderOAuthGrantController', () => {
    const operatorRequest = { user: { sub: '00000000-0000-4000-8000-000000000001' } };
    const configId = '91000000-0000-4000-8000-000000000001';
    let service: jest.Mocked<Pick<IdentityProviderService, 'getCurrentAdminProviderGrant' | 'authorizeCurrentAdminProviderGrant' | 'handleCurrentAdminProviderGrantCallback'>>;
    let controller: IdentityProviderOAuthGrantController;

    beforeEach(() => {
        service = {
            getCurrentAdminProviderGrant: jest.fn(),
            authorizeCurrentAdminProviderGrant: jest.fn(),
            handleCurrentAdminProviderGrantCallback: jest.fn()
        };
        controller = new IdentityProviderOAuthGrantController(service as never as IdentityProviderService);
    });

    it('delegates current-admin grant status with the current operator id', async () => {
        service.getCurrentAdminProviderGrant.mockResolvedValue(createGrantSummary());

        const result = await controller.getCurrentAdminProviderGrant(configId, operatorRequest as never);

        expect(service.getCurrentAdminProviderGrant).toHaveBeenCalledWith(configId, operatorRequest.user.sub);
        expect(result.status).toBe(IdentityProviderOAuthGrantStatusValue.Active);
    });

    it('delegates current-admin grant authorize with the current operator id', async () => {
        service.authorizeCurrentAdminProviderGrant.mockResolvedValue({
            authorizeUrl: 'https://accounts.feishu.cn/open-apis/authen/v1/authorize?state=test',
            stateExpiresAt: '2026-05-07T00:10:00.000Z'
        });

        const result = await controller.authorizeCurrentAdminProviderGrant(configId, operatorRequest as never);

        expect(service.authorizeCurrentAdminProviderGrant).toHaveBeenCalledWith(configId, operatorRequest.user.sub);
        expect(result.authorizeUrl).toContain('accounts.feishu.cn');
    });

    it('delegates provider callback query to the service', async () => {
        service.handleCurrentAdminProviderGrantCallback.mockResolvedValue(createGrantSummary());

        const result = await controller.handleCurrentAdminProviderGrantCallback({
            code: 'auth-code',
            state: 'state',
            error: undefined,
            error_description: undefined
        });

        expect(service.handleCurrentAdminProviderGrantCallback).toHaveBeenCalledWith({
            code: 'auth-code',
            state: 'state',
            error: undefined,
            error_description: undefined
        });
        expect(result.identityProviderConfigId).toBe(configId);
    });

    function createGrantSummary() {
        return {
            id: '93000000-0000-4000-8000-000000000001',
            identityProviderConfigId: configId,
            provider: IdentityProviderValue.Feishu,
            tenantId: null,
            pomsUserId: operatorRequest.user.sub,
            status: IdentityProviderOAuthGrantStatusValue.Active,
            scopes: ['contact:user:search'],
            grantedAt: '2026-05-07T00:00:00.000Z',
            expiresAt: '2026-05-07T02:00:00.000Z',
            refreshExpiresAt: '2026-06-07T00:00:00.000Z',
            lastUsedAt: null,
            lastError: null,
            rowVersion: 1,
            updatedAt: '2026-05-07T00:00:00.000Z'
        };
    }
});
