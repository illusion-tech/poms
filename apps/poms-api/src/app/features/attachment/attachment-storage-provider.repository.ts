import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { AttachmentStorageProviderConfigListQuery, AttachmentStorageProviderType } from '@poms/shared-contracts';
import { AttachmentStorageProviderConfig } from './attachment-storage-provider-config.entity';

@Injectable()
export class AttachmentStorageProviderRepository {
    constructor(
        @InjectRepository(AttachmentStorageProviderConfig)
        private readonly configRepository: EntityRepository<AttachmentStorageProviderConfig>
    ) {}

    findConfigs(query: AttachmentStorageProviderConfigListQuery = {}): Promise<AttachmentStorageProviderConfig[]> {
        return this.configRepository.find(
            {
                ...(query.providerType ? { providerType: query.providerType } : {}),
                ...(query.status ? { status: query.status } : {}),
                ...(query.enabled !== undefined ? { enabled: query.enabled } : {})
            },
            { orderBy: { createdAt: QueryOrder.DESC } }
        );
    }

    findConfigById(id: string): Promise<AttachmentStorageProviderConfig | null> {
        return this.configRepository.findOne({ id });
    }

    findEnabledConfigByProviderLocation(providerType: AttachmentStorageProviderType, bucket: string | null, keyPrefix: string | null): Promise<AttachmentStorageProviderConfig | null> {
        return this.configRepository.findOne({
            providerType,
            bucket,
            keyPrefix,
            enabled: true
        });
    }

    findConfigsByProviderLocation(providerType: AttachmentStorageProviderType, bucket: string | null): Promise<AttachmentStorageProviderConfig[]> {
        return this.configRepository.find(
            {
                providerType,
                bucket
            },
            {
                orderBy: { createdAt: QueryOrder.DESC }
            }
        );
    }

    findDefaultConfig(): Promise<AttachmentStorageProviderConfig | null> {
        return this.configRepository.findOne({ enabled: true, isDefault: true });
    }

    createConfig(input: ConstructorParameters<typeof AttachmentStorageProviderConfig>[0]): AttachmentStorageProviderConfig {
        return this.configRepository.create(input);
    }

    async saveAll(entities: object[]): Promise<void> {
        await this.configRepository.getEntityManager().persist(entities).flush();
    }
}
