import { ExternalIdentityBindingStatusValue, IdentityProviderValue } from '@poms/shared-contracts';
import { ExternalIdentityController } from './external-identity.controller';
import { IdentityProviderService } from './identity-provider.service';

describe('ExternalIdentityController', () => {
    const operatorRequest = { user: { sub: '00000000-0000-4000-8000-000000000001' } };
    const pomsUserId = '00000000-0000-4000-8000-000000000002';
    const identityProviderConfigId = '91000000-0000-4000-8000-000000000001';
    const externalIdentityId = '92000000-0000-4000-8000-000000000001';
    let service: jest.Mocked<Pick<IdentityProviderService, 'listUserExternalIdentities' | 'bindUserExternalIdentity' | 'unbindExternalIdentity'>>;
    let controller: ExternalIdentityController;

    beforeEach(() => {
        service = {
            listUserExternalIdentities: jest.fn(),
            bindUserExternalIdentity: jest.fn(),
            unbindExternalIdentity: jest.fn()
        };
        controller = new ExternalIdentityController(service as never as IdentityProviderService);
    });

    it('delegates listing user bindings to the service', async () => {
        service.listUserExternalIdentities.mockResolvedValue([createBinding()]);

        const result = await controller.listUserExternalIdentities(pomsUserId);

        expect(service.listUserExternalIdentities).toHaveBeenCalledWith(pomsUserId);
        expect(result).toHaveLength(1);
    });

    it('delegates binding with current operator id', async () => {
        const body = {
            identityProviderConfigId,
            subjectId: 'ou_feishu_user_1',
            subjectDisplayName: '张三'
        };
        service.bindUserExternalIdentity.mockResolvedValue(createBinding());

        const result = await controller.bindUserExternalIdentity(pomsUserId, body, operatorRequest as never);

        expect(service.bindUserExternalIdentity).toHaveBeenCalledWith(pomsUserId, body, operatorRequest.user.sub);
        expect(result.id).toBe(externalIdentityId);
    });

    it('delegates unbind with current operator id', async () => {
        service.unbindExternalIdentity.mockResolvedValue(createBinding({ status: ExternalIdentityBindingStatusValue.Revoked }));

        const result = await controller.unbindExternalIdentity(externalIdentityId, { expectedVersion: 1 }, operatorRequest as never);

        expect(service.unbindExternalIdentity).toHaveBeenCalledWith(externalIdentityId, { expectedVersion: 1 }, operatorRequest.user.sub);
        expect(result.status).toBe(ExternalIdentityBindingStatusValue.Revoked);
    });

    function createBinding(overrides: Record<string, unknown> = {}) {
        return {
            id: externalIdentityId,
            identityProviderConfigId,
            provider: IdentityProviderValue.Feishu,
            tenantId: 'tenant-a',
            pomsUserId,
            subjectId: 'ou_feishu_user_1',
            unionId: null,
            subjectDisplayName: '张三',
            avatarUrl: null,
            email: null,
            mobile: null,
            status: ExternalIdentityBindingStatusValue.Active,
            boundAt: '2026-05-07T01:00:00.000Z',
            boundBy: operatorRequest.user.sub,
            revokedAt: null,
            revokedBy: null,
            rowVersion: 1,
            createdAt: '2026-05-07T01:00:00.000Z',
            createdBy: operatorRequest.user.sub,
            updatedAt: '2026-05-07T01:00:00.000Z',
            updatedBy: operatorRequest.user.sub,
            ...overrides
        };
    }
});
