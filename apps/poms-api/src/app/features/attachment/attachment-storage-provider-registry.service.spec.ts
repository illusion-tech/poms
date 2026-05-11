import { Readable } from 'node:stream';
import { AttachmentStorageProviderConfigStatusValue, AttachmentStorageProviderConnectionTestStatusValue, AttachmentStorageProviderTypeValue } from '@poms/shared-contracts';
import { SecretCipherService } from '../../core/secret/secret-cipher.service';
import { AttachmentStorageProviderConfig } from './attachment-storage-provider-config.entity';
import { AttachmentStorageProviderRepository } from './attachment-storage-provider.repository';
import { AttachmentStorageProviderRegistry } from './attachment-storage-provider-registry.service';
import { HuaweiObsS3AttachmentObjectStorageProvider } from './huawei-obs-s3-attachment-object-storage.provider';
import { LocalAttachmentObjectStorageProvider } from './local-attachment-object-storage.provider';

describe('AttachmentStorageProviderRegistry', () => {
    const configId = '95000000-0000-4000-8000-000000000001';
    let repository: {
        findDefaultConfig: jest.Mock;
        findConfigsByProviderLocation: jest.Mock;
    };
    let localProvider: jest.Mocked<LocalAttachmentObjectStorageProvider>;
    let huaweiObsProvider: jest.Mocked<HuaweiObsS3AttachmentObjectStorageProvider>;
    let registry: AttachmentStorageProviderRegistry;

    beforeEach(() => {
        repository = {
            findDefaultConfig: jest.fn(),
            findConfigsByProviderLocation: jest.fn()
        };
        localProvider = {
            providerType: AttachmentStorageProviderTypeValue.Local,
            putObject: jest.fn().mockResolvedValue({
                storageProvider: AttachmentStorageProviderTypeValue.Local,
                storageBucket: null,
                storageKey: 'attachments/file.txt'
            }),
            readObject: jest.fn().mockResolvedValue(Readable.from(['local'])),
            headObject: jest.fn(),
            deleteObject: jest.fn(),
            testConnection: jest.fn().mockResolvedValue({
                status: AttachmentStorageProviderConnectionTestStatusValue.Success,
                message: 'local ok',
                checkedAt: '2026-05-11T00:00:00.000Z'
            })
        } as unknown as jest.Mocked<LocalAttachmentObjectStorageProvider>;
        huaweiObsProvider = {
            providerType: AttachmentStorageProviderTypeValue.HuaweiObsS3,
            putObject: jest.fn(),
            readObject: jest.fn().mockResolvedValue(Readable.from(['obs'])),
            headObject: jest.fn(),
            deleteObject: jest.fn(),
            testConnection: jest.fn()
        } as unknown as jest.Mocked<HuaweiObsS3AttachmentObjectStorageProvider>;
        registry = new AttachmentStorageProviderRegistry(
            repository as never as AttachmentStorageProviderRepository,
            new SecretCipherService(),
            localProvider,
            huaweiObsProvider
        );
    });

    it('falls back to implicit local provider when no default config exists', async () => {
        repository.findDefaultConfig.mockResolvedValue(null);

        await registry.putWithDefaultProvider({
            storageKey: 'attachments/file.txt',
            body: Buffer.from('file')
        });

        expect(localProvider.putObject).toHaveBeenCalledWith(
            expect.objectContaining({
                id: null,
                providerType: AttachmentStorageProviderTypeValue.Local
            }),
            expect.objectContaining({
                storageKey: 'attachments/file.txt'
            })
        );
    });

    it('applies configured key prefix for default provider writes', async () => {
        repository.findDefaultConfig.mockResolvedValue(
            createConfig({
                enabled: true,
                status: AttachmentStorageProviderConfigStatusValue.Active,
                keyPrefix: 'tenant-a'
            })
        );

        await registry.putWithDefaultProvider({
            storageKey: '/attachments/file.txt',
            body: Buffer.from('file')
        });

        expect(localProvider.putObject).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
                storageKey: 'tenant-a/attachments/file.txt'
            })
        );
    });

    it('resolves historical reads using the longest matching key prefix even when provider is disabled', async () => {
        const fallback = createConfig({
            providerType: AttachmentStorageProviderTypeValue.HuaweiObsS3,
            bucket: 'poms-prod',
            keyPrefix: null,
            enabled: false,
            status: AttachmentStorageProviderConfigStatusValue.Disabled
        });
        const prefixed = createConfig({
            id: '95000000-0000-4000-8000-000000000002',
            providerType: AttachmentStorageProviderTypeValue.HuaweiObsS3,
            bucket: 'poms-prod',
            keyPrefix: 'attachments/2026',
            enabled: false,
            status: AttachmentStorageProviderConfigStatusValue.Disabled
        });
        repository.findConfigsByProviderLocation.mockResolvedValue([fallback, prefixed]);

        await registry.readObject({
            storageProvider: AttachmentStorageProviderTypeValue.HuaweiObsS3,
            storageBucket: 'poms-prod',
            storageKey: 'attachments/2026/05/file.pdf'
        });

        expect(huaweiObsProvider.readObject).toHaveBeenCalledWith(
            expect.objectContaining({
                id: prefixed.id,
                keyPrefix: 'attachments/2026'
            }),
            expect.objectContaining({
                storageBucket: 'poms-prod'
            })
        );
    });

    it('converts provider test failures into failed test results', async () => {
        const config = createConfig({ enabled: true, status: AttachmentStorageProviderConfigStatusValue.Active });
        localProvider.testConnection.mockRejectedValue(new Error('disk unavailable'));

        const result = await registry.testConfig(config);

        expect(result).toMatchObject({
            status: AttachmentStorageProviderConnectionTestStatusValue.Failed,
            message: 'disk unavailable'
        });
    });

    function createConfig(overrides: Partial<AttachmentStorageProviderConfig> = {}): AttachmentStorageProviderConfig {
        return {
            id: configId,
            providerType: AttachmentStorageProviderTypeValue.Local,
            displayName: '本地存储',
            status: AttachmentStorageProviderConfigStatusValue.Active,
            enabled: true,
            isDefault: true,
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
            createdBy: null,
            updatedAt: new Date('2026-05-11T00:00:00.000Z'),
            updatedBy: null,
            ...overrides
        } as AttachmentStorageProviderConfig;
    }
});
