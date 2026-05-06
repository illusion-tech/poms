import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RuntimeAuditModule } from '../../core/runtime-audit/runtime-audit.module';
import { PlatformUser } from '../platform/platform-user.entity';
import { ExternalIdentity } from './external-identity.entity';
import { ExternalLoginTicket } from './external-login-ticket.entity';
import { FeishuIdentityProviderAdapter } from './feishu-identity-provider.adapter';
import { IdentityProviderAdapterRegistry } from './identity-provider-adapter.registry';
import { IdentityProviderConfig } from './identity-provider-config.entity';
import { ExternalIdentityController } from './external-identity.controller';
import { IdentityProviderController } from './identity-provider.controller';
import { IdentityProviderOAuthGrantController } from './identity-provider-oauth-grant.controller';
import { IdentityProviderOAuthGrant } from './identity-provider-oauth-grant.entity';
import { IdentityProviderRepository } from './identity-provider.repository';
import { IdentityProviderService } from './identity-provider.service';

@Module({
    imports: [MikroOrmModule.forFeature([IdentityProviderConfig, ExternalIdentity, IdentityProviderOAuthGrant, ExternalLoginTicket, PlatformUser]), RuntimeAuditModule],
    controllers: [IdentityProviderController, ExternalIdentityController, IdentityProviderOAuthGrantController],
    providers: [IdentityProviderRepository, IdentityProviderService, IdentityProviderAdapterRegistry, FeishuIdentityProviderAdapter],
    exports: [IdentityProviderService]
})
export class IdentityProviderModule {}
