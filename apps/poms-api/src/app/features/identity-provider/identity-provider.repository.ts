import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { IdentityProvider, IdentityProviderConfigListQuery } from '@poms/shared-contracts';
import { PlatformUser } from '../platform/platform-user.entity';
import { ExternalIdentity } from './external-identity.entity';
import { IdentityProviderConfig } from './identity-provider-config.entity';
import { IdentityProviderOAuthGrant } from './identity-provider-oauth-grant.entity';

@Injectable()
export class IdentityProviderRepository {
    constructor(
        @InjectRepository(IdentityProviderConfig)
        private readonly configRepository: EntityRepository<IdentityProviderConfig>,
        @InjectRepository(ExternalIdentity)
        private readonly externalIdentityRepository: EntityRepository<ExternalIdentity>,
        @InjectRepository(IdentityProviderOAuthGrant)
        private readonly oauthGrantRepository: EntityRepository<IdentityProviderOAuthGrant>,
        @InjectRepository(PlatformUser)
        private readonly platformUserRepository: EntityRepository<PlatformUser>
    ) {}

    findConfigs(query: IdentityProviderConfigListQuery = {}): Promise<IdentityProviderConfig[]> {
        return this.configRepository.find(
            {
                ...(query.provider ? { provider: query.provider } : {}),
                ...(query.status ? { status: query.status } : {})
            },
            { orderBy: { createdAt: QueryOrder.DESC } }
        );
    }

    findConfigById(id: string): Promise<IdentityProviderConfig | null> {
        return this.configRepository.findOne({ id });
    }

    findConfigByProviderTenant(provider: IdentityProvider, tenantId: string | null): Promise<IdentityProviderConfig | null> {
        return this.configRepository.findOne({ provider, tenantId });
    }

    createConfig(input: ConstructorParameters<typeof IdentityProviderConfig>[0]): IdentityProviderConfig {
        return this.configRepository.create(input);
    }

    findPlatformUserById(id: string): Promise<PlatformUser | null> {
        return this.platformUserRepository.findOne({ id });
    }

    findExternalIdentitiesByUserId(userId: string): Promise<ExternalIdentity[]> {
        return this.externalIdentityRepository.find({ pomsUserId: userId }, { orderBy: { createdAt: QueryOrder.DESC } });
    }

    findExternalIdentityById(id: string): Promise<ExternalIdentity | null> {
        return this.externalIdentityRepository.findOne({ id });
    }

    findActiveExternalIdentityBySubject(identityProviderConfigId: string, tenantId: string | null, subjectId: string): Promise<ExternalIdentity | null> {
        return this.externalIdentityRepository.findOne({
            identityProviderConfigId,
            tenantId,
            subjectId,
            status: 'active'
        });
    }

    findActiveExternalIdentityByUserProvider(pomsUserId: string, identityProviderConfigId: string): Promise<ExternalIdentity | null> {
        return this.externalIdentityRepository.findOne({
            pomsUserId,
            identityProviderConfigId,
            status: 'active'
        });
    }

    createExternalIdentity(input: ConstructorParameters<typeof ExternalIdentity>[0]): ExternalIdentity {
        return this.externalIdentityRepository.create(input);
    }

    findOAuthGrantByUserProvider(identityProviderConfigId: string, pomsUserId: string): Promise<IdentityProviderOAuthGrant | null> {
        return this.oauthGrantRepository.findOne({ identityProviderConfigId, pomsUserId }, { orderBy: { updatedAt: QueryOrder.DESC } });
    }

    createOAuthGrant(input: ConstructorParameters<typeof IdentityProviderOAuthGrant>[0]): IdentityProviderOAuthGrant {
        return this.oauthGrantRepository.create(input);
    }

    async saveAll(entities: object[]): Promise<void> {
        await this.configRepository.getEntityManager().persist(entities).flush();
    }
}
