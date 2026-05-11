import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'node:stream';
import {
    AttachmentStorageProviderConfigStatusValue,
    AttachmentStorageProviderConnectionTestStatusValue,
    AttachmentStorageProviderTypeValue,
    type AttachmentStorageProviderConnectionTestResult,
    type AttachmentStorageProviderType
} from '@poms/shared-contracts';
import { SecretCipherService } from '../../core/secret/secret-cipher.service';
import { AttachmentStorageProviderConfig } from './attachment-storage-provider-config.entity';
import { AttachmentStorageProviderRepository } from './attachment-storage-provider.repository';
import { ATTACHMENT_STORAGE_SECRET_CIPHER_OPTIONS } from './attachment-storage-provider-secret.constants';
import type {
    AttachmentObjectLocation,
    AttachmentObjectMetadata,
    AttachmentObjectPutInput,
    AttachmentObjectStorageProvider,
    AttachmentStorageProviderRuntimeConfig,
    StoredAttachmentFile
} from './attachment-object-storage-provider.types';
import { HuaweiObsS3AttachmentObjectStorageProvider } from './huawei-obs-s3-attachment-object-storage.provider';
import { LocalAttachmentObjectStorageProvider } from './local-attachment-object-storage.provider';

@Injectable()
export class AttachmentStorageProviderRegistry {
    constructor(
        private readonly repository: AttachmentStorageProviderRepository,
        private readonly secretCipherService: SecretCipherService,
        private readonly localProvider: LocalAttachmentObjectStorageProvider,
        private readonly huaweiObsS3Provider: HuaweiObsS3AttachmentObjectStorageProvider
    ) {}

    async putWithDefaultProvider(input: AttachmentObjectPutInput): Promise<StoredAttachmentFile> {
        const config = await this.resolveDefaultRuntimeConfig();
        const storageKey = this.applyKeyPrefix(config.keyPrefix, input.storageKey);
        return this.providerFor(config.providerType).putObject(config, {
            ...input,
            storageKey
        });
    }

    async readObject(location: AttachmentObjectLocation): Promise<Readable> {
        const config = await this.resolveRuntimeConfigForLocation(location);
        return this.providerFor(location.storageProvider).readObject(config, location);
    }

    async readBuffer(location: AttachmentObjectLocation): Promise<Buffer> {
        const stream = await this.readObject(location);
        const chunks: Buffer[] = [];

        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        return Buffer.concat(chunks);
    }

    async headObject(location: AttachmentObjectLocation): Promise<AttachmentObjectMetadata> {
        const config = await this.resolveRuntimeConfigForLocation(location);
        return this.providerFor(location.storageProvider).headObject(config, location);
    }

    async deleteObject(location: AttachmentObjectLocation): Promise<void> {
        const config = await this.resolveRuntimeConfigForLocation(location);
        await this.providerFor(location.storageProvider).deleteObject(config, location);
    }

    async testConfig(config: AttachmentStorageProviderConfig): Promise<AttachmentStorageProviderConnectionTestResult> {
        try {
            return await this.providerFor(config.providerType).testConnection(this.runtimeConfigFromEntity(config));
        } catch (error) {
            return {
                status: AttachmentStorageProviderConnectionTestStatusValue.Failed,
                message: error instanceof Error ? error.message : 'Attachment storage provider connection test failed.',
                checkedAt: new Date().toISOString()
            };
        }
    }

    private async resolveDefaultRuntimeConfig(): Promise<AttachmentStorageProviderRuntimeConfig> {
        const config = await this.repository.findDefaultConfig();
        if (!config) {
            return this.implicitLocalConfig();
        }
        if (!config.enabled || config.status !== AttachmentStorageProviderConfigStatusValue.Active) {
            throw new BadRequestException('Default attachment storage provider is not active.');
        }

        return this.runtimeConfigFromEntity(config);
    }

    private async resolveRuntimeConfigForLocation(location: AttachmentObjectLocation): Promise<AttachmentStorageProviderRuntimeConfig> {
        if (location.storageProvider === AttachmentStorageProviderTypeValue.Local && !location.storageBucket) {
            const configs = await this.repository.findConfigsByProviderLocation(location.storageProvider, null);
            const matched = this.matchConfigByKeyPrefix(configs, location.storageKey);
            return matched ? this.runtimeConfigFromEntity(matched) : this.implicitLocalConfig();
        }

        const configs = await this.repository.findConfigsByProviderLocation(location.storageProvider, location.storageBucket);
        const matched = this.matchConfigByKeyPrefix(configs, location.storageKey);
        if (!matched) {
            throw new NotFoundException(`Attachment storage provider config for ${location.storageProvider}/${location.storageBucket ?? 'default'} not found`);
        }

        return this.runtimeConfigFromEntity(matched);
    }

    private matchConfigByKeyPrefix(configs: AttachmentStorageProviderConfig[], storageKey: string): AttachmentStorageProviderConfig | null {
        return (
            configs
                .filter((config) => this.keyMatchesPrefix(storageKey, config.keyPrefix))
                .sort((left, right) => (right.keyPrefix?.length ?? 0) - (left.keyPrefix?.length ?? 0))[0] ?? null
        );
    }

    private keyMatchesPrefix(storageKey: string, keyPrefix: string | null | undefined): boolean {
        if (!keyPrefix) return true;
        const normalizedPrefix = this.normalizeStorageKey(keyPrefix);
        const normalizedKey = this.normalizeStorageKey(storageKey);
        return normalizedKey === normalizedPrefix || normalizedKey.startsWith(`${normalizedPrefix}/`);
    }

    private applyKeyPrefix(keyPrefix: string | null | undefined, storageKey: string): string {
        const normalizedKey = this.normalizeStorageKey(storageKey);
        if (!keyPrefix) return normalizedKey;

        const normalizedPrefix = this.normalizeStorageKey(keyPrefix);
        if (!normalizedPrefix) return normalizedKey;
        return `${normalizedPrefix}/${normalizedKey}`;
    }

    private normalizeStorageKey(value: string): string {
        return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    }

    private providerFor(providerType: AttachmentStorageProviderType): AttachmentObjectStorageProvider {
        switch (providerType) {
            case AttachmentStorageProviderTypeValue.Local:
                return this.localProvider;
            case AttachmentStorageProviderTypeValue.HuaweiObsS3:
                return this.huaweiObsS3Provider;
        }
    }

    private runtimeConfigFromEntity(config: AttachmentStorageProviderConfig): AttachmentStorageProviderRuntimeConfig {
        return {
            id: config.id,
            providerType: config.providerType,
            displayName: config.displayName,
            status: config.status,
            enabled: config.enabled,
            endpoint: config.endpoint ?? null,
            region: config.region ?? null,
            bucket: config.bucket ?? null,
            keyPrefix: config.keyPrefix ?? null,
            forcePathStyle: config.forcePathStyle,
            accessKeyId: config.encryptedAccessKeyId ? this.secretCipherService.decrypt(config.encryptedAccessKeyId, ATTACHMENT_STORAGE_SECRET_CIPHER_OPTIONS) : null,
            secretAccessKey: config.encryptedSecretAccessKey ? this.secretCipherService.decrypt(config.encryptedSecretAccessKey, ATTACHMENT_STORAGE_SECRET_CIPHER_OPTIONS) : null
        };
    }

    private implicitLocalConfig(): AttachmentStorageProviderRuntimeConfig {
        return {
            id: null,
            providerType: AttachmentStorageProviderTypeValue.Local,
            displayName: 'Local attachment storage',
            status: AttachmentStorageProviderConfigStatusValue.Active,
            enabled: true,
            endpoint: null,
            region: null,
            bucket: null,
            keyPrefix: null,
            forcePathStyle: false,
            accessKeyId: null,
            secretAccessKey: null
        };
    }
}
