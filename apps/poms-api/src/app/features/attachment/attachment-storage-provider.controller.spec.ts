import { AttachmentStorageProviderConfigStatusValue, AttachmentStorageProviderConnectionTestStatusValue, AttachmentStorageProviderTypeValue } from '@poms/shared-contracts';
import { AttachmentStorageProviderController } from './attachment-storage-provider.controller';
import { AttachmentStorageProviderService } from './attachment-storage-provider.service';

describe('AttachmentStorageProviderController', () => {
    const operatorRequest = { user: { sub: '00000000-0000-4000-8000-000000000001' } };
    const configId = '95000000-0000-4000-8000-000000000001';
    let service: jest.Mocked<
        Pick<
            AttachmentStorageProviderService,
            | 'listAttachmentStorageProviderConfigs'
            | 'createAttachmentStorageProviderConfig'
            | 'getAttachmentStorageProviderConfig'
            | 'updateAttachmentStorageProviderConfig'
            | 'testAttachmentStorageProviderConnection'
            | 'setDefaultAttachmentStorageProvider'
        >
    >;
    let controller: AttachmentStorageProviderController;

    beforeEach(() => {
        service = {
            listAttachmentStorageProviderConfigs: jest.fn(),
            createAttachmentStorageProviderConfig: jest.fn(),
            getAttachmentStorageProviderConfig: jest.fn(),
            updateAttachmentStorageProviderConfig: jest.fn(),
            testAttachmentStorageProviderConnection: jest.fn(),
            setDefaultAttachmentStorageProvider: jest.fn()
        };
        controller = new AttachmentStorageProviderController(service as never as AttachmentStorageProviderService);
    });

    it('delegates config list query to the service', async () => {
        service.listAttachmentStorageProviderConfigs.mockResolvedValue([createConfigDetail()]);

        const result = await controller.listAttachmentStorageProviderConfigs({
            providerType: AttachmentStorageProviderTypeValue.HuaweiObsS3,
            status: AttachmentStorageProviderConfigStatusValue.Active,
            enabled: true
        });

        expect(service.listAttachmentStorageProviderConfigs).toHaveBeenCalledWith({
            providerType: AttachmentStorageProviderTypeValue.HuaweiObsS3,
            status: AttachmentStorageProviderConfigStatusValue.Active,
            enabled: true
        });
        expect(result).toHaveLength(1);
    });

    it('delegates create, update, connection test and set-default with operator id', async () => {
        const detail = createConfigDetail();
        const createBody = {
            providerType: AttachmentStorageProviderTypeValue.Local,
            displayName: '本地存储',
            enabled: true
        };
        service.createAttachmentStorageProviderConfig.mockResolvedValue(detail);
        service.getAttachmentStorageProviderConfig.mockResolvedValue(detail);
        service.updateAttachmentStorageProviderConfig.mockResolvedValue({ ...detail, displayName: '本地附件存储' });
        service.testAttachmentStorageProviderConnection.mockResolvedValue({
            status: AttachmentStorageProviderConnectionTestStatusValue.Success,
            message: 'Local configuration is complete.',
            checkedAt: '2026-05-11T00:00:00.000Z'
        });
        service.setDefaultAttachmentStorageProvider.mockResolvedValue({ ...detail, isDefault: true });

        await controller.createAttachmentStorageProviderConfig(createBody, operatorRequest as never);
        await expect(controller.getAttachmentStorageProviderConfig(configId)).resolves.toBe(detail);
        await controller.updateAttachmentStorageProviderConfig(configId, { displayName: '本地附件存储' }, operatorRequest as never);
        await controller.testAttachmentStorageProviderConnection(configId, { expectedVersion: 1 });
        await controller.setDefaultAttachmentStorageProvider(configId, { expectedVersion: 1 }, operatorRequest as never);

        expect(service.createAttachmentStorageProviderConfig).toHaveBeenCalledWith(createBody, operatorRequest.user.sub);
        expect(service.getAttachmentStorageProviderConfig).toHaveBeenCalledWith(configId);
        expect(service.updateAttachmentStorageProviderConfig).toHaveBeenCalledWith(configId, { displayName: '本地附件存储' }, operatorRequest.user.sub);
        expect(service.testAttachmentStorageProviderConnection).toHaveBeenCalledWith(configId, { expectedVersion: 1 });
        expect(service.setDefaultAttachmentStorageProvider).toHaveBeenCalledWith(configId, { expectedVersion: 1 }, operatorRequest.user.sub);
    });

    function createConfigDetail() {
        return {
            id: configId,
            providerType: AttachmentStorageProviderTypeValue.Local,
            displayName: '本地存储',
            status: AttachmentStorageProviderConfigStatusValue.Active,
            enabled: true,
            isDefault: false,
            endpoint: null,
            region: null,
            bucket: null,
            keyPrefix: null,
            forcePathStyle: false,
            accessKeyConfigured: false,
            secretAccessKeyConfigured: false,
            credentialsUpdatedAt: null,
            rowVersion: 1,
            createdAt: '2026-05-11T00:00:00.000Z',
            createdBy: operatorRequest.user.sub,
            updatedAt: '2026-05-11T00:00:00.000Z',
            updatedBy: operatorRequest.user.sub
        };
    }
});
