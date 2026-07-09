import { BadRequestException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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

    it('routes authorize requests to the authorize handler before the generic grant-status route', async () => {
        service.authorizeCurrentAdminProviderGrant.mockResolvedValue({
            authorizeUrl: 'https://accounts.feishu.cn/open-apis/authen/v1/authorize?state=test',
            stateExpiresAt: '2026-05-07T00:10:00.000Z'
        });
        const app = await createRouteTestApp();

        try {
            const response = await fetch(`${await app.getUrl()}/platform/identity-provider-oauth-grants/${configId}:authorize`);
            const body = (await response.json()) as { authorizeUrl: string };

            expect(response.status).toBe(200);
            expect(body.authorizeUrl).toContain('accounts.feishu.cn');
            expect(service.authorizeCurrentAdminProviderGrant).toHaveBeenCalledWith(configId, operatorRequest.user.sub);
            expect(service.getCurrentAdminProviderGrant).not.toHaveBeenCalled();
        } finally {
            await app.close();
        }
    });

    it('rejects malformed provider ids before reaching the grant service', async () => {
        const app = await createRouteTestApp();

        try {
            const response = await fetch(`${await app.getUrl()}/platform/identity-provider-oauth-grants/not-a-uuid`);

            expect(response.status).toBe(400);
            expect(service.getCurrentAdminProviderGrant).not.toHaveBeenCalled();
            expect(service.authorizeCurrentAdminProviderGrant).not.toHaveBeenCalled();
        } finally {
            await app.close();
        }
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
        expect(result).toEqual(expect.objectContaining({ identityProviderConfigId: configId }));
    });

    it('redirects browser callback requests back to the admin user page instead of rendering JSON', async () => {
        service.handleCurrentAdminProviderGrantCallback.mockResolvedValue(createGrantSummary());
        const response = { redirect: jest.fn() };

        const result = await controller.handleCurrentAdminProviderGrantCallback(
            {
                code: 'auth-code',
                state: 'state',
                error: undefined,
                error_description: undefined
            },
            { headers: { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } },
            response
        );

        expect(result).toBeUndefined();
        expect(response.redirect).toHaveBeenCalledWith(`/platform/users?identityProviderGrant=success&provider=feishu&identityProviderConfigId=${configId}`);
    });

    it('redirects browser callback failures back to the admin user page instead of rendering JSON errors', async () => {
        service.handleCurrentAdminProviderGrantCallback.mockRejectedValue(new BadRequestException('invalid state'));
        const response = { redirect: jest.fn() };

        const result = await controller.handleCurrentAdminProviderGrantCallback(
            {
                code: undefined,
                state: 'invalid-state',
                error: 'access_denied',
                error_description: 'user denied'
            },
            { headers: { accept: 'text/html,application/xhtml+xml' } },
            response
        );

        expect(result).toBeUndefined();
        expect(response.redirect).toHaveBeenCalledWith('/platform/users?identityProviderGrant=failed&reason=oauth_callback_failed');
    });

    it('keeps JSON callback failures as API errors', async () => {
        const error = new BadRequestException('invalid state');
        service.handleCurrentAdminProviderGrantCallback.mockRejectedValue(error);
        const response = { redirect: jest.fn() };

        await expect(
            controller.handleCurrentAdminProviderGrantCallback(
                {
                    code: undefined,
                    state: 'invalid-state',
                    error: 'access_denied',
                    error_description: 'user denied'
                },
                { headers: { accept: 'application/json' } },
                response
            )
        ).rejects.toBe(error);
        expect(response.redirect).not.toHaveBeenCalled();
    });

    async function createRouteTestApp(): Promise<INestApplication> {
        const moduleRef = await Test.createTestingModule({
            controllers: [IdentityProviderOAuthGrantController],
            providers: [{ provide: IdentityProviderService, useValue: service }]
        }).compile();
        const app = moduleRef.createNestApplication();
        app.use((request: { user?: typeof operatorRequest.user }, _response: unknown, next: () => void) => {
            request.user = operatorRequest.user;
            next();
        });
        await app.init();
        await app.listen(0);
        return app;
    }

    function createGrantSummary() {
        return {
            id: '93000000-0000-4000-8000-000000000001',
            identityProviderConfigId: configId,
            provider: IdentityProviderValue.Feishu,
            tenantId: null,
            pomsUserId: operatorRequest.user.sub,
            status: IdentityProviderOAuthGrantStatusValue.Active,
            scopes: ['contact:user:search'],
            requiredScopes: ['contact:user:search'],
            missingRequiredScopes: [],
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
