import { Inject, BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
    AttachmentStorageProviderConfigStatusValue,
    AttachmentStorageProviderConnectionTestStatusValue,
    AttachmentStorageProviderTypeValue,
    type AttachmentStorageProviderConfigDetail,
    type AttachmentStorageProviderConfigList,
    type AttachmentStorageProviderConfigListQuery,
    type AttachmentStorageProviderConnectionTestResult,
    type CreateAttachmentStorageProviderConfigRequest,
    type SetDefaultAttachmentStorageProviderRequest,
    type TestAttachmentStorageProviderConnectionRequest,
    type UpdateAttachmentStorageProviderConfigRequest
} from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { SecretCipherService } from '../../core/secret/secret-cipher.service';
import { AttachmentStorageProviderConfig } from './attachment-storage-provider-config.entity';
import { AttachmentStorageProviderRegistry } from './attachment-storage-provider-registry.service';
import { AttachmentStorageProviderRepository } from './attachment-storage-provider.repository';
import { ATTACHMENT_STORAGE_SECRET_CIPHER_OPTIONS } from './attachment-storage-provider-secret.constants';

@Injectable()
export class AttachmentStorageProviderService {
    constructor(
        @Inject(AttachmentStorageProviderRepository) private readonly repository: AttachmentStorageProviderRepository,
        @Inject(RuntimeAuditService) private readonly runtimeAuditService: RuntimeAuditService,
        @Inject(SecretCipherService) private readonly secretCipherService: SecretCipherService,
        @Inject(AttachmentStorageProviderRegistry) private readonly storageProviderRegistry: AttachmentStorageProviderRegistry
    ) {}

    async listAttachmentStorageProviderConfigs(query: AttachmentStorageProviderConfigListQuery = {}): Promise<AttachmentStorageProviderConfigList> {
        const configs = await this.repository.findConfigs(query);
        return configs.map((config) => this.toDetail(config));
    }

    async getAttachmentStorageProviderConfig(id: string): Promise<AttachmentStorageProviderConfigDetail> {
        const config = await this.requireConfig(id);
        return this.toDetail(config);
    }

    async createAttachmentStorageProviderConfig(request: CreateAttachmentStorageProviderConfigRequest, operatorId?: string | null): Promise<AttachmentStorageProviderConfigDetail> {
        const encryptedAccessKeyId = request.accessKeyId ? this.encryptSecret(request.accessKeyId) : null;
        const encryptedSecretAccessKey = request.secretAccessKey ? this.encryptSecret(request.secretAccessKey) : null;
        const now = encryptedAccessKeyId || encryptedSecretAccessKey ? new Date() : null;
        const enabled = request.enabled ?? false;

        const config = this.repository.createConfig({
            providerType: request.providerType,
            displayName: request.displayName,
            status: enabled ? AttachmentStorageProviderConfigStatusValue.Active : AttachmentStorageProviderConfigStatusValue.Draft,
            enabled,
            isDefault: request.isDefault ?? false,
            endpoint: request.endpoint ?? null,
            region: request.region ?? null,
            bucket: request.bucket ?? null,
            keyPrefix: request.keyPrefix ?? null,
            forcePathStyle: request.forcePathStyle ?? false,
            encryptedAccessKeyId,
            encryptedSecretAccessKey,
            credentialsUpdatedAt: now,
            createdBy: operatorId ?? null,
            updatedBy: operatorId ?? null
        });

        this.normalizeStatus(config);
        await this.assertConfigCanBeSaved(config);

        const previousDefault = config.isDefault ? await this.repository.findDefaultConfig() : null;
        if (previousDefault && previousDefault.id !== config.id) {
            previousDefault.isDefault = false;
            previousDefault.updatedBy = operatorId ?? null;
        }

        await this.repository.saveAll(previousDefault && previousDefault.id !== config.id ? [previousDefault, config] : [config]);
        await this.recordConfigAudit('attachment-storage-provider.config.created', config, operatorId, null, this.auditSnapshot(config), {
            previousDefaultConfigId: previousDefault?.id ?? null
        });

        return this.toDetail(config);
    }

    async updateAttachmentStorageProviderConfig(id: string, request: UpdateAttachmentStorageProviderConfigRequest, operatorId?: string | null): Promise<AttachmentStorageProviderConfigDetail> {
        const config = await this.requireConfig(id);
        if (request.expectedVersion !== undefined && request.expectedVersion !== config.rowVersion) {
            throw new ConflictException(`Attachment storage provider config version conflict: expected ${request.expectedVersion}, actual ${config.rowVersion}`);
        }

        const beforeSnapshot = this.auditSnapshot(config);
        let credentialsChanged = false;

        if (request.displayName !== undefined) config.displayName = request.displayName;
        if (request.enabled !== undefined) config.enabled = request.enabled;
        if (request.status !== undefined) config.status = request.status;
        if (request.enabled === false && request.status === undefined) config.status = AttachmentStorageProviderConfigStatusValue.Disabled;
        if (request.endpoint !== undefined) config.endpoint = request.endpoint ?? null;
        if (request.region !== undefined) config.region = request.region ?? null;
        if (request.bucket !== undefined) config.bucket = request.bucket ?? null;
        if (request.keyPrefix !== undefined) config.keyPrefix = request.keyPrefix ?? null;
        if (request.forcePathStyle !== undefined) config.forcePathStyle = request.forcePathStyle;
        if (request.accessKeyId !== undefined) {
            config.encryptedAccessKeyId = request.accessKeyId ? this.encryptSecret(request.accessKeyId) : null;
            credentialsChanged = true;
        }
        if (request.secretAccessKey !== undefined) {
            config.encryptedSecretAccessKey = request.secretAccessKey ? this.encryptSecret(request.secretAccessKey) : null;
            credentialsChanged = true;
        }
        if (credentialsChanged) config.credentialsUpdatedAt = new Date();
        config.updatedBy = operatorId ?? null;

        this.normalizeStatus(config);
        await this.assertConfigCanBeSaved(config);

        await this.repository.saveAll([config]);
        await this.recordConfigAudit('attachment-storage-provider.config.updated', config, operatorId, beforeSnapshot, this.auditSnapshot(config), {
            secretRedacted: true
        });

        return this.toDetail(config);
    }

    async testAttachmentStorageProviderConnection(id: string, request: TestAttachmentStorageProviderConnectionRequest = {}): Promise<AttachmentStorageProviderConnectionTestResult> {
        const config = await this.requireConfig(id);
        if (request.expectedVersion !== undefined && request.expectedVersion !== config.rowVersion) {
            throw new ConflictException(`Attachment storage provider config version conflict: expected ${request.expectedVersion}, actual ${config.rowVersion}`);
        }

        if (!config.enabled || config.status === AttachmentStorageProviderConfigStatusValue.Disabled) {
            return this.connectionTestResult(AttachmentStorageProviderConnectionTestStatusValue.Failed, 'Attachment storage provider is disabled.');
        }

        const missing = this.missingOperationalFields(config);
        if (missing.length > 0) {
            return this.connectionTestResult(AttachmentStorageProviderConnectionTestStatusValue.Failed, `Attachment storage provider configuration is incomplete: ${missing.join(', ')}.`);
        }

        return this.storageProviderRegistry.testConfig(config);
    }

    async setDefaultAttachmentStorageProvider(id: string, request: SetDefaultAttachmentStorageProviderRequest = {}, operatorId?: string | null): Promise<AttachmentStorageProviderConfigDetail> {
        const config = await this.requireConfig(id);
        if (request.expectedVersion !== undefined && request.expectedVersion !== config.rowVersion) {
            throw new ConflictException(`Attachment storage provider config version conflict: expected ${request.expectedVersion}, actual ${config.rowVersion}`);
        }
        if (!config.enabled || config.status !== AttachmentStorageProviderConfigStatusValue.Active) {
            throw new BadRequestException('Only active and enabled attachment storage provider config can be set as default.');
        }

        const previousDefault = await this.repository.findDefaultConfig();
        if (previousDefault?.id === config.id && config.isDefault) {
            return this.toDetail(config);
        }

        const beforeSnapshot = this.auditSnapshot(config);
        if (previousDefault) {
            previousDefault.isDefault = false;
            previousDefault.updatedBy = operatorId ?? null;
        }
        config.isDefault = true;
        config.updatedBy = operatorId ?? null;

        await this.repository.saveAll(previousDefault ? [previousDefault, config] : [config]);
        await this.recordConfigAudit('attachment-storage-provider.config.default-set', config, operatorId, beforeSnapshot, this.auditSnapshot(config), {
            previousDefaultConfigId: previousDefault?.id ?? null
        });

        return this.toDetail(config);
    }

    private async requireConfig(id: string): Promise<AttachmentStorageProviderConfig> {
        const config = await this.repository.findConfigById(id);
        if (!config) throw new NotFoundException(`Attachment storage provider config ${id} not found`);
        return config;
    }

    private normalizeStatus(config: AttachmentStorageProviderConfig): void {
        if (!config.enabled) {
            if (config.status === AttachmentStorageProviderConfigStatusValue.Active) {
                config.status = AttachmentStorageProviderConfigStatusValue.Disabled;
            }
            config.isDefault = false;
            return;
        }
        if (config.status === AttachmentStorageProviderConfigStatusValue.Disabled) {
            config.enabled = false;
            config.isDefault = false;
            return;
        }
        if (this.missingOperationalFields(config).length === 0) {
            if (config.status === AttachmentStorageProviderConfigStatusValue.Draft || config.status === AttachmentStorageProviderConfigStatusValue.Misconfigured) {
                config.status = AttachmentStorageProviderConfigStatusValue.Active;
            }
        } else if (config.status === AttachmentStorageProviderConfigStatusValue.Active) {
            config.status = AttachmentStorageProviderConfigStatusValue.Misconfigured;
            config.isDefault = false;
        }
    }

    private async assertConfigCanBeSaved(config: AttachmentStorageProviderConfig): Promise<void> {
        this.assertConfigState(config);
        if (config.enabled) {
            const existing = await this.repository.findEnabledConfigByProviderLocation(config.providerType, config.bucket ?? null, config.keyPrefix ?? null);
            if (existing && existing.id !== config.id) {
                throw new ConflictException(`Enabled attachment storage provider config already exists for ${config.providerType}/${config.bucket ?? 'default'}/${config.keyPrefix ?? 'root'}`);
            }
        }
    }

    private assertConfigState(config: AttachmentStorageProviderConfig): void {
        if (config.providerType === AttachmentStorageProviderTypeValue.Local) {
            if (config.endpoint || config.region || config.bucket || config.encryptedAccessKeyId || config.encryptedSecretAccessKey) {
                throw new BadRequestException('Local attachment storage provider does not accept OBS endpoint, bucket or access keys.');
            }
        }
        if (config.status === AttachmentStorageProviderConfigStatusValue.Active && (!config.enabled || this.missingOperationalFields(config).length > 0)) {
            throw new BadRequestException('Active attachment storage provider config must be enabled and complete.');
        }
        if (config.isDefault && (!config.enabled || config.status !== AttachmentStorageProviderConfigStatusValue.Active)) {
            throw new BadRequestException('Default attachment storage provider must be active and enabled.');
        }
    }

    private missingOperationalFields(config: AttachmentStorageProviderConfig): string[] {
        if (config.providerType === AttachmentStorageProviderTypeValue.Local) return [];

        const missing: string[] = [];
        if (!config.endpoint) missing.push('endpoint');
        if (!config.region) missing.push('region');
        if (!config.bucket) missing.push('bucket');
        if (!config.encryptedAccessKeyId) missing.push('accessKeyId');
        if (!config.encryptedSecretAccessKey) missing.push('secretAccessKey');
        return missing;
    }

    private toDetail(config: AttachmentStorageProviderConfig): AttachmentStorageProviderConfigDetail {
        return {
            id: config.id,
            providerType: config.providerType as AttachmentStorageProviderConfigDetail['providerType'],
            displayName: config.displayName,
            status: config.status as AttachmentStorageProviderConfigDetail['status'],
            enabled: config.enabled,
            isDefault: config.isDefault,
            endpoint: config.endpoint ?? null,
            region: config.region ?? null,
            bucket: config.bucket ?? null,
            keyPrefix: config.keyPrefix ?? null,
            forcePathStyle: config.forcePathStyle,
            accessKeyConfigured: Boolean(config.encryptedAccessKeyId),
            secretAccessKeyConfigured: Boolean(config.encryptedSecretAccessKey),
            credentialsUpdatedAt: config.credentialsUpdatedAt?.toISOString() ?? null,
            rowVersion: config.rowVersion,
            createdAt: config.createdAt.toISOString(),
            createdBy: config.createdBy ?? null,
            updatedAt: config.updatedAt.toISOString(),
            updatedBy: config.updatedBy ?? null
        };
    }

    private auditSnapshot(config: AttachmentStorageProviderConfig): Record<string, unknown> {
        return {
            providerType: config.providerType,
            displayName: config.displayName,
            status: config.status,
            enabled: config.enabled,
            isDefault: config.isDefault,
            endpoint: config.endpoint ?? null,
            region: config.region ?? null,
            bucket: config.bucket ?? null,
            keyPrefix: config.keyPrefix ?? null,
            forcePathStyle: config.forcePathStyle,
            accessKeyConfigured: Boolean(config.encryptedAccessKeyId),
            secretAccessKeyConfigured: Boolean(config.encryptedSecretAccessKey),
            credentialsUpdatedAt: config.credentialsUpdatedAt?.toISOString() ?? null,
            rowVersion: config.rowVersion
        };
    }

    private async recordConfigAudit(
        eventType: string,
        config: AttachmentStorageProviderConfig,
        operatorId: string | null | undefined,
        beforeSnapshot: Record<string, unknown> | null,
        afterSnapshot: Record<string, unknown>,
        metadata: Record<string, unknown> = {}
    ): Promise<void> {
        await this.runtimeAuditService.recordAuditLog({
            eventType,
            targetType: 'AttachmentStorageProviderConfig',
            targetId: config.id,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot,
            afterSnapshot,
            metadata: {
                secretRedacted: true,
                ...metadata
            }
        });
    }

    private connectionTestResult(status: AttachmentStorageProviderConnectionTestResult['status'], message: string): AttachmentStorageProviderConnectionTestResult {
        return {
            status,
            message,
            checkedAt: new Date().toISOString()
        };
    }

    private encryptSecret(secret: string): string {
        return this.secretCipherService.encrypt(secret, ATTACHMENT_STORAGE_SECRET_CIPHER_OPTIONS);
    }
}
