import { BadRequestException, ConflictException } from '@nestjs/common';
import {
    AttachmentStorageProviderConfigStatusValue,
    AttachmentStorageProviderConnectionTestStatusValue,
    AttachmentStorageProviderTypeValue
} from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { SecretCipherService } from '../../core/secret/secret-cipher.service';
import { AttachmentStorageProviderConfig } from './attachment-storage-provider-config.entity';
import { AttachmentStorageProviderRepository } from './attachment-storage-provider.repository';
import { AttachmentStorageProviderService } from './attachment-storage-provider.service';

describe('AttachmentStorageProviderService', () => {
    const operatorId = '00000000-0000-4000-8000-000000000001';
    const configId = '95000000-0000-4000-8000-000000000001';
    const previousConfigId = '95000000-0000-4000-8000-000000000002';
    let repository: {
        findConfigs: jest.Mock;
        findConfigById: jest.Mock;
        findEnabledConfigByProviderLocation: jest.Mock;
        findDefaultConfig: jest.Mock;
        createConfig: jest.Mock;
        saveAll: jest.Mock;
    };
    let runtimeAuditService: {
        recordAuditLog: jest.Mock;
    };
    let service: AttachmentStorageProviderService;

    beforeEach(() => {
        repository = {
            findConfigs: jest.fn(),
            findConfigById: jest.fn(),
            findEnabledConfigByProviderLocation: jest.fn(),
            findDefaultConfig: jest.fn(),
            createConfig: jest.fn((input) => createConfig(input)),
            saveAll: jest.fn().mockResolvedValue(undefined)
        };
        runtimeAuditService = {
            recordAuditLog: jest.fn().mockResolvedValue(undefined)
        };
        service = new AttachmentStorageProviderService(repository as never as AttachmentStorageProviderRepository, runtimeAuditService as never as RuntimeAuditService, new SecretCipherService());
    });

    it('creates an enabled Huawei OBS config with encrypted write-only credentials and redacted audit', async () => {
        repository.findEnabledConfigByProviderLocation.mockResolvedValue(null);
        repository.findDefaultConfig.mockResolvedValue(null);

        const result = await service.createAttachmentStorageProviderConfig(
            {
                providerType: AttachmentStorageProviderTypeValue.HuaweiObsS3,
                displayName: '华为云 OBS',
                enabled: true,
                isDefault: true,
                endpoint: 'https://obs.cn-south-1.myhuaweicloud.com',
                region: 'cn-south-1',
                bucket: 'poms-prod',
                keyPrefix: 'attachments',
                forcePathStyle: true,
                accessKeyId: 'raw-ak',
                secretAccessKey: 'raw-sk'
            },
            operatorId
        );

        const saved = repository.saveAll.mock.calls[0][0][0] as AttachmentStorageProviderConfig;
        expect(saved.encryptedAccessKeyId).toMatch(/^v1:/);
        expect(saved.encryptedSecretAccessKey).toMatch(/^v1:/);
        expect(saved.encryptedAccessKeyId).not.toContain('raw-ak');
        expect(saved.encryptedSecretAccessKey).not.toContain('raw-sk');
        expect(result).toMatchObject({
            providerType: AttachmentStorageProviderTypeValue.HuaweiObsS3,
            status: AttachmentStorageProviderConfigStatusValue.Active,
            enabled: true,
            isDefault: true,
            accessKeyConfigured: true,
            secretAccessKeyConfigured: true
        });
        expect(result).not.toHaveProperty('encryptedAccessKeyId');
        expect(result).not.toHaveProperty('encryptedSecretAccessKey');
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'attachment-storage-provider.config.created',
                targetType: 'AttachmentStorageProviderConfig',
                operatorId,
                beforeSnapshot: null,
                metadata: expect.objectContaining({ secretRedacted: true })
            })
        );
        expect(runtimeAuditService.recordAuditLog.mock.calls[0][0].afterSnapshot).not.toHaveProperty('encryptedAccessKeyId');
        expect(runtimeAuditService.recordAuditLog.mock.calls[0][0].afterSnapshot).not.toHaveProperty('secretAccessKey');
    });

    it('rejects local provider configs with OBS-only fields', async () => {
        repository.findEnabledConfigByProviderLocation.mockResolvedValue(null);

        await expect(
            service.createAttachmentStorageProviderConfig({
                providerType: AttachmentStorageProviderTypeValue.Local,
                displayName: '本地存储',
                enabled: true,
                endpoint: 'https://obs.example.com'
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('returns failed connection test for incomplete OBS config', async () => {
        repository.findConfigById.mockResolvedValue(
            createConfig({
                providerType: AttachmentStorageProviderTypeValue.HuaweiObsS3,
                enabled: true,
                status: AttachmentStorageProviderConfigStatusValue.Misconfigured,
                endpoint: 'https://obs.cn-south-1.myhuaweicloud.com'
            })
        );

        const result = await service.testAttachmentStorageProviderConnection(configId, { expectedVersion: 1 });

        expect(result.status).toBe(AttachmentStorageProviderConnectionTestStatusValue.Failed);
        expect(result.message).toContain('bucket');
        expect(result.message).toContain('accessKeyId');
        expect(result.message).toContain('secretAccessKey');
    });

    it('sets an active provider as default and demotes the previous default', async () => {
        const config = createConfig({ enabled: true, status: AttachmentStorageProviderConfigStatusValue.Active, isDefault: false });
        const previousDefault = createConfig({ id: previousConfigId, enabled: true, status: AttachmentStorageProviderConfigStatusValue.Active, isDefault: true });
        repository.findConfigById.mockResolvedValue(config);
        repository.findDefaultConfig.mockResolvedValue(previousDefault);

        const result = await service.setDefaultAttachmentStorageProvider(configId, { expectedVersion: 1 }, operatorId);

        expect(previousDefault.isDefault).toBe(false);
        expect(config.isDefault).toBe(true);
        expect(repository.saveAll).toHaveBeenCalledWith([previousDefault, config]);
        expect(result.isDefault).toBe(true);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'attachment-storage-provider.config.default-set',
                metadata: expect.objectContaining({ previousDefaultConfigId: previousConfigId })
            })
        );
    });

    it('rejects update version conflicts before mutating the entity', async () => {
        const config = createConfig({ displayName: '本地存储', rowVersion: 2 });
        repository.findConfigById.mockResolvedValue(config);

        await expect(service.updateAttachmentStorageProviderConfig(configId, { displayName: '新名称', expectedVersion: 3 }, operatorId)).rejects.toThrow(ConflictException);

        expect(config.displayName).toBe('本地存储');
        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    function createConfig(overrides: Partial<AttachmentStorageProviderConfig> = {}): AttachmentStorageProviderConfig {
        return {
            id: configId,
            providerType: AttachmentStorageProviderTypeValue.Local,
            displayName: '本地存储',
            status: AttachmentStorageProviderConfigStatusValue.Draft,
            enabled: false,
            isDefault: false,
            endpoint: null,
            region: null,
            bucket: null,
            keyPrefix: null,
            forcePathStyle: false,
            encryptedAccessKeyId: null,
            encryptedSecretAccessKey: null,
            credentialsUpdatedAt: null,
            rowVersion: 1,
            createdAt: new Date('2026-05-11T00:00:00.000Z'),
            createdBy: operatorId,
            updatedAt: new Date('2026-05-11T00:00:00.000Z'),
            updatedBy: operatorId,
            ...overrides
        } as AttachmentStorageProviderConfig;
    }
});
