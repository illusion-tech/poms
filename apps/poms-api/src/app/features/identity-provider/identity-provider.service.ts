import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
    type EnabledLoginProviderList,
    ExternalIdentityBindingStatusValue,
    ExternalOrgProviderValue,
    type ExternalLoginAuthorizeResult,
    type ExternalLoginCallbackQuery,
    type ExternalLoginCallbackResult,
    type ExternalUserSearchQuery,
    type ExternalUserSearchResult,
    IdentityProviderConfigStatusValue,
    IdentityProviderConnectionDiagnosticStatusValue,
    IdentityProviderConnectionTestCapabilityValue,
    IdentityProviderConnectionTestStatusValue,
    IdentityProviderValue,
    type IdentityProviderOAuthAuthorizeResult,
    type IdentityProviderOAuthCallbackQuery,
    type IdentityProviderOAuthGrantSummary,
    IdentityProviderOAuthGrantStatusValue,
    IdentityProviderSearchGrantModeValue,
    type BindUserExternalIdentityRequest,
    type ExternalIdentityBindingList,
    type ExternalIdentityBindingSummary,
    type CreateIdentityProviderConfigRequest,
    type IdentityProvider,
    type IdentityProviderConfigDetail,
    type IdentityProviderConfigList,
    type IdentityProviderConfigListQuery,
    type IdentityProviderConnectionDiagnosticCheck,
    type IdentityProviderConnectionTestResult,
    type TestIdentityProviderConnectionRequest,
    type UnbindExternalIdentityRequest,
    type UpdateIdentityProviderConfigRequest
} from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { SecretCipherService } from '../../core/secret/secret-cipher.service';
import { ExternalOrgDirectoryAdapterError } from '../external-org-sync/external-org-directory.adapter';
import { ExternalOrgDirectoryAdapterRegistry } from '../external-org-sync/external-org-directory-adapter.registry';
import { ExternalIdentity } from './external-identity.entity';
import { ExternalLoginTicketStatusValue } from './external-login-ticket.entity';
import { IdentityProviderAdapterError, type ProviderOAuthTokenSet } from './identity-provider.adapter';
import { IdentityProviderAdapterRegistry } from './identity-provider-adapter.registry';
import { IdentityProviderConfig } from './identity-provider-config.entity';
import { IdentityProviderOAuthGrant } from './identity-provider-oauth-grant.entity';
import { IdentityProviderRepository } from './identity-provider.repository';
import { IDENTITY_PROVIDER_SECRET_CIPHER_OPTIONS } from './identity-provider-secret.constants';

@Injectable()
export class IdentityProviderService {
    constructor(
        private readonly identityProviderRepository: IdentityProviderRepository,
        private readonly runtimeAuditService: RuntimeAuditService,
        private readonly adapterRegistry: IdentityProviderAdapterRegistry,
        private readonly secretCipherService: SecretCipherService,
        private readonly externalOrgDirectoryAdapterRegistry: ExternalOrgDirectoryAdapterRegistry
    ) {}

    async listIdentityProviderConfigs(query: IdentityProviderConfigListQuery = {}): Promise<IdentityProviderConfigList> {
        const configs = await this.identityProviderRepository.findConfigs(query);
        return configs.map((config) => this.toDetail(config));
    }

    async getIdentityProviderConfig(id: string): Promise<IdentityProviderConfigDetail> {
        const config = await this.requireConfig(id);
        return this.toDetail(config);
    }

    async createIdentityProviderConfig(request: CreateIdentityProviderConfigRequest, operatorId?: string | null): Promise<IdentityProviderConfigDetail> {
        await this.assertProviderTenantAvailable(request.provider, request.tenantId ?? null);
        this.assertSupportedSearchGrantMode(request.searchGrantMode ?? IdentityProviderSearchGrantModeValue.PerAdmin);

        const encryptedClientSecret = request.clientSecret ? this.encryptSecret(request.clientSecret) : null;
        const enabled = request.enabled ?? false;
        const config = this.identityProviderRepository.createConfig({
            provider: request.provider,
            tenantId: request.tenantId ?? null,
            displayName: request.displayName,
            status: IdentityProviderConfigStatusValue.Draft,
            enabled,
            loginEnabled: request.loginEnabled ?? false,
            bindingEnabled: request.bindingEnabled ?? false,
            searchEnabled: request.searchEnabled ?? false,
            clientId: request.clientId,
            encryptedClientSecret,
            secretUpdatedAt: encryptedClientSecret ? new Date() : null,
            redirectUri: request.redirectUri ?? null,
            searchRedirectUri: request.searchRedirectUri ?? null,
            loginScopes: request.loginScopes ?? [],
            searchScopes: request.searchScopes ?? [],
            tenantAllowlist: request.tenantAllowlist ?? [],
            searchGrantMode: request.searchGrantMode ?? IdentityProviderSearchGrantModeValue.PerAdmin,
            createdBy: operatorId ?? null,
            updatedBy: operatorId ?? null
        });

        this.normalizeConfigStatus(config);
        this.assertConfigState(config);
        await this.identityProviderRepository.saveAll([config]);
        await this.recordConfigAudit('identity-provider.config.created', config, operatorId, null, this.auditSnapshot(config));

        return this.toDetail(config);
    }

    async updateIdentityProviderConfig(id: string, request: UpdateIdentityProviderConfigRequest, operatorId?: string | null): Promise<IdentityProviderConfigDetail> {
        const config = await this.requireConfig(id);
        if (request.expectedVersion !== undefined && request.expectedVersion !== config.rowVersion) {
            throw new ConflictException(`Identity provider config version conflict: expected ${request.expectedVersion}, actual ${config.rowVersion}`);
        }

        const beforeSnapshot = this.auditSnapshot(config);
        const previousStatus = config.status;

        if (request.displayName !== undefined) config.displayName = request.displayName;
        if (request.enabled !== undefined) config.enabled = request.enabled;
        if (request.loginEnabled !== undefined) config.loginEnabled = request.loginEnabled;
        if (request.bindingEnabled !== undefined) config.bindingEnabled = request.bindingEnabled;
        if (request.searchEnabled !== undefined) config.searchEnabled = request.searchEnabled;
        if (request.clientId !== undefined) config.clientId = request.clientId;
        if (request.clientSecret !== undefined) {
            config.encryptedClientSecret = this.encryptSecret(request.clientSecret);
            config.secretUpdatedAt = new Date();
        }
        if (request.redirectUri !== undefined) config.redirectUri = request.redirectUri ?? null;
        if (request.searchRedirectUri !== undefined) config.searchRedirectUri = request.searchRedirectUri ?? null;
        if (request.loginScopes !== undefined) config.loginScopes = request.loginScopes;
        if (request.searchScopes !== undefined) config.searchScopes = request.searchScopes;
        if (request.tenantAllowlist !== undefined) config.tenantAllowlist = request.tenantAllowlist;
        if (request.searchGrantMode !== undefined) {
            this.assertSupportedSearchGrantMode(request.searchGrantMode);
            config.searchGrantMode = request.searchGrantMode;
        }
        this.normalizeConfigStatus(config, previousStatus);
        config.updatedBy = operatorId ?? null;

        this.assertConfigState(config);
        await this.identityProviderRepository.saveAll([config]);
        await this.recordConfigAudit('identity-provider.config.updated', config, operatorId, beforeSnapshot, this.auditSnapshot(config));

        return this.toDetail(config);
    }

    async testIdentityProviderConnection(id: string, request: TestIdentityProviderConnectionRequest = {}): Promise<IdentityProviderConnectionTestResult> {
        const config = await this.requireConfig(id);
        if (request.expectedVersion !== undefined && request.expectedVersion !== config.rowVersion) {
            throw new ConflictException(`Identity provider config version conflict: expected ${request.expectedVersion}, actual ${config.rowVersion}`);
        }

        const capability = request.capability ?? IdentityProviderConnectionTestCapabilityValue.Basic;
        if (capability === IdentityProviderConnectionTestCapabilityValue.ExternalOrgSync) {
            return this.testExternalOrgSyncReadiness(config, request);
        }

        return this.testBasicConnection(config);
    }

    async listEnabledLoginProviders(): Promise<EnabledLoginProviderList> {
        const configs = await this.identityProviderRepository.findLoginEnabledConfigs();
        return configs.map((config) => ({
            id: config.id,
            provider: config.provider as EnabledLoginProviderList[number]['provider'],
            tenantId: config.tenantId ?? null,
            displayName: config.displayName,
            loginScopes: config.loginScopes ?? []
        }));
    }

    async authorizeExternalLogin(identityProviderConfigId: string): Promise<ExternalLoginAuthorizeResult> {
        const config = await this.requireConfig(identityProviderConfigId);
        this.assertLoginAllowed(config);

        const redirectUri = this.requireLoginRedirectUri(config);
        const state = this.createExternalLoginState(config.id);
        const authorizeUrl = this.adapterRegistry.get(config.provider).buildExternalLoginAuthorizeUrl({
            config,
            redirectUri,
            state: state.value,
            scopes: config.loginScopes ?? []
        });

        await this.recordConfigAudit('identity-provider.external-login.authorize-started', config, null, null, {
            identityProviderConfigId: config.id,
            provider: config.provider,
            tenantId: config.tenantId ?? null,
            stateExpiresAt: state.expiresAt.toISOString()
        });

        return {
            authorizeUrl,
            stateExpiresAt: state.expiresAt.toISOString()
        };
    }

    async handleExternalLoginCallback(query: ExternalLoginCallbackQuery): Promise<ExternalLoginCallbackResult> {
        if (query.error) {
            throw new UnauthorizedException(query.error_description ? `${query.error}: ${query.error_description}` : query.error);
        }
        if (!query.code) {
            throw new UnauthorizedException('Provider OAuth callback requires an authorization code.');
        }

        const state = this.verifyExternalLoginState(query.state);
        const config = await this.requireConfig(state.identityProviderConfigId);
        this.assertLoginAllowed(config);

        const redirectUri = this.requireLoginRedirectUri(config);
        let tokenSet: ProviderOAuthTokenSet;
        try {
            tokenSet = await this.adapterRegistry.get(config.provider).exchangeExternalLoginCode({
                config,
                redirectUri,
                clientSecret: this.decryptSecret(config.encryptedClientSecret ?? ''),
                code: query.code
            });
            const externalIdentity = await this.adapterRegistry.get(config.provider).fetchExternalLoginIdentity({
                config,
                accessToken: tokenSet.accessToken
            });
            const tenantId = config.tenantId ?? null;
            const binding = await this.identityProviderRepository.findActiveExternalIdentityBySubject(config.id, tenantId, externalIdentity.subjectId);
            if (!binding) {
                await this.recordExternalLoginFailure(config, externalIdentity.subjectId, 'external_identity_not_bound');
                throw new UnauthorizedException('External identity is not bound to a POMS user.');
            }

            const user = await this.identityProviderRepository.findPlatformUserById(binding.pomsUserId);
            if (!user?.isActive) {
                await this.recordExternalLoginFailure(config, externalIdentity.subjectId, 'poms_user_inactive');
                throw new UnauthorizedException('Bound POMS user is inactive or missing.');
            }

            const ticket = this.createLoginTicketValue();
            const expiresAt = new Date(Date.now() + 2 * 60_000);
            const entity = this.identityProviderRepository.createExternalLoginTicket({
                ticketHash: this.ticketHash(ticket),
                identityProviderConfigId: config.id,
                externalIdentityId: binding.id,
                pomsUserId: binding.pomsUserId,
                provider: config.provider,
                tenantId,
                subjectId: externalIdentity.subjectId,
                status: ExternalLoginTicketStatusValue.Issued,
                expiresAt,
                consumedAt: null
            });

            await this.identityProviderRepository.saveAll([entity]);
            await this.runtimeAuditService.recordAuditLog({
                eventType: 'identity-provider.external-login.ticket-issued',
                targetType: 'ExternalLoginTicket',
                targetId: entity.id,
                operatorId: binding.pomsUserId,
                result: 'success',
                afterSnapshot: {
                    identityProviderConfigId: config.id,
                    provider: config.provider,
                    tenantId,
                    externalIdentityId: binding.id,
                    pomsUserId: binding.pomsUserId,
                    subjectId: externalIdentity.subjectId,
                    expiresAt: expiresAt.toISOString(),
                    ticketRedacted: true
                }
            });

            return {
                ticket,
                expiresAt: expiresAt.toISOString(),
                provider: config.provider as ExternalLoginCallbackResult['provider'],
                identityProviderConfigId: config.id,
                pomsUserId: binding.pomsUserId
            };
        } catch (error) {
            if (error instanceof IdentityProviderAdapterError) throw new UnauthorizedException(error.message);
            throw error;
        }
    }

    async consumeExternalLoginSession(ticket: string): Promise<{ pomsUserId: string; externalIdentityId: string; identityProviderConfigId: string }> {
        const entity = await this.identityProviderRepository.findExternalLoginTicketByHash(this.ticketHash(ticket));
        if (!entity) {
            throw new UnauthorizedException('External login ticket is invalid.');
        }
        if (entity.status !== ExternalLoginTicketStatusValue.Issued) {
            throw new UnauthorizedException('External login ticket has already been consumed.');
        }
        if (entity.expiresAt.getTime() <= Date.now()) {
            entity.status = ExternalLoginTicketStatusValue.Expired;
            await this.identityProviderRepository.saveAll([entity]);
            throw new UnauthorizedException('External login ticket has expired.');
        }

        entity.status = ExternalLoginTicketStatusValue.Consumed;
        entity.consumedAt = new Date();
        await this.identityProviderRepository.saveAll([entity]);

        await this.runtimeAuditService.recordAuditLog({
            eventType: 'identity-provider.external-login.ticket-consumed',
            targetType: 'ExternalLoginTicket',
            targetId: entity.id,
            operatorId: entity.pomsUserId,
            result: 'success',
            afterSnapshot: {
                identityProviderConfigId: entity.identityProviderConfigId,
                provider: entity.provider,
                tenantId: entity.tenantId ?? null,
                externalIdentityId: entity.externalIdentityId,
                pomsUserId: entity.pomsUserId,
                subjectId: entity.subjectId,
                consumedAt: entity.consumedAt.toISOString(),
                ticketRedacted: true
            }
        });

        return {
            pomsUserId: entity.pomsUserId,
            externalIdentityId: entity.externalIdentityId,
            identityProviderConfigId: entity.identityProviderConfigId
        };
    }

    async getCurrentAdminProviderGrant(identityProviderConfigId: string, operatorId: string): Promise<IdentityProviderOAuthGrantSummary> {
        await this.requirePlatformUser(operatorId);
        const config = await this.requireConfig(identityProviderConfigId);
        const grant = await this.identityProviderRepository.findOAuthGrantByUserProvider(config.id, operatorId);
        return this.toOAuthGrantSummary(config, operatorId, grant);
    }

    async authorizeCurrentAdminProviderGrant(identityProviderConfigId: string, operatorId: string): Promise<IdentityProviderOAuthAuthorizeResult> {
        await this.requirePlatformUser(operatorId);
        const config = await this.requireConfig(identityProviderConfigId);
        this.assertSearchGrantAllowed(config);

        const redirectUri = this.requireSearchRedirectUri(config);
        const state = this.createOAuthState(config.id, operatorId);
        const authorizeUrl = this.adapterRegistry.get(config.provider).buildAdminGrantAuthorizeUrl({
            config,
            redirectUri,
            state: state.value,
            scopes: config.searchScopes ?? []
        });

        await this.recordConfigAudit('identity-provider.oauth-grant.authorize-started', config, operatorId, null, {
            identityProviderConfigId: config.id,
            provider: config.provider,
            tenantId: config.tenantId ?? null,
            stateExpiresAt: state.expiresAt.toISOString()
        });

        return {
            authorizeUrl,
            stateExpiresAt: state.expiresAt.toISOString()
        };
    }

    async handleCurrentAdminProviderGrantCallback(query: IdentityProviderOAuthCallbackQuery): Promise<IdentityProviderOAuthGrantSummary> {
        if (query.error) {
            throw new BadRequestException(query.error_description ? `${query.error}: ${query.error_description}` : query.error);
        }
        if (!query.code) {
            throw new BadRequestException('Provider OAuth callback requires an authorization code.');
        }

        const state = this.verifyOAuthState(query.state);
        await this.requirePlatformUser(state.operatorId);
        const config = await this.requireConfig(state.identityProviderConfigId);
        this.assertSearchGrantAllowed(config);

        const redirectUri = this.requireSearchRedirectUri(config);
        let tokenSet: ProviderOAuthTokenSet;
        try {
            tokenSet = await this.adapterRegistry.get(config.provider).exchangeAdminGrantCode({
                config,
                redirectUri,
                clientSecret: this.decryptSecret(config.encryptedClientSecret ?? ''),
                code: query.code
            });
        } catch (error) {
            if (error instanceof IdentityProviderAdapterError) throw new BadRequestException(error.message);
            throw error;
        }

        const existingGrant = await this.identityProviderRepository.findOAuthGrantByUserProvider(config.id, state.operatorId);
        const beforeSnapshot = existingGrant ? this.oauthGrantAuditSnapshot(existingGrant) : null;
        const now = new Date();
        const grant =
            existingGrant ??
            this.identityProviderRepository.createOAuthGrant({
                identityProviderConfigId: config.id,
                provider: config.provider,
                tenantId: config.tenantId ?? null,
                pomsUserId: state.operatorId,
                encryptedAccessToken: '',
                encryptedRefreshToken: null,
                scopes: [],
                status: IdentityProviderOAuthGrantStatusValue.Active,
                grantedAt: now,
                expiresAt: null,
                refreshExpiresAt: null,
                lastUsedAt: null,
                revokedAt: null,
                lastError: null,
                createdBy: state.operatorId,
                updatedBy: state.operatorId
            });

        grant.provider = config.provider;
        grant.tenantId = config.tenantId ?? null;
        grant.encryptedAccessToken = this.encryptSecret(tokenSet.accessToken);
        grant.encryptedRefreshToken = tokenSet.refreshToken ? this.encryptSecret(tokenSet.refreshToken) : null;
        grant.scopes = tokenSet.scopes.length > 0 ? tokenSet.scopes : (config.searchScopes ?? []);
        grant.status = IdentityProviderOAuthGrantStatusValue.Active;
        grant.grantedAt = now;
        grant.expiresAt = this.expiresAtFromNow(tokenSet.expiresInSeconds);
        grant.refreshExpiresAt = this.expiresAtFromNow(tokenSet.refreshExpiresInSeconds);
        grant.revokedAt = null;
        grant.lastError = null;
        grant.updatedBy = state.operatorId;

        await this.identityProviderRepository.saveAll([grant]);
        await this.recordOAuthGrantAudit('identity-provider.oauth-grant.updated', grant, state.operatorId, beforeSnapshot, this.oauthGrantAuditSnapshot(grant));

        return this.toOAuthGrantSummary(config, state.operatorId, grant);
    }

    async searchExternalUsers(identityProviderConfigId: string, query: ExternalUserSearchQuery, operatorId: string): Promise<ExternalUserSearchResult> {
        await this.requirePlatformUser(operatorId);
        const config = await this.requireConfig(identityProviderConfigId);
        this.assertSearchGrantAllowed(config);

        const grant = await this.identityProviderRepository.findOAuthGrantByUserProvider(config.id, operatorId);
        if (!grant || this.resolveOAuthGrantStatus(grant) !== IdentityProviderOAuthGrantStatusValue.Active) {
            throw new BadRequestException('Current admin must authorize this identity provider before searching external users.');
        }

        try {
            const candidates = await this.adapterRegistry.get(config.provider).searchExternalUsers({
                config,
                accessToken: this.decryptSecret(grant.encryptedAccessToken),
                query: query.q,
                limit: query.limit ?? 20
            });

            grant.lastUsedAt = new Date();
            grant.lastError = null;
            grant.updatedBy = operatorId;
            await this.identityProviderRepository.saveAll([grant]);
            await this.recordOAuthGrantAudit('identity-provider.external-users.searched', grant, operatorId, null, {
                identityProviderConfigId: config.id,
                provider: config.provider,
                tenantId: config.tenantId ?? null,
                queryLength: query.q.length,
                itemCount: candidates.length
            });

            return {
                identityProviderConfigId: config.id,
                provider: config.provider as ExternalUserSearchResult['provider'],
                tenantId: config.tenantId ?? null,
                query: query.q,
                items: candidates.map((candidate) => ({
                    identityProviderConfigId: config.id,
                    provider: config.provider as ExternalUserSearchResult['provider'],
                    tenantId: config.tenantId ?? null,
                    ...candidate
                })),
                searchedAt: new Date().toISOString()
            };
        } catch (error) {
            grant.lastError = error instanceof Error ? error.message.slice(0, 1024) : 'Provider user search failed.';
            grant.updatedBy = operatorId;
            await this.identityProviderRepository.saveAll([grant]);
            if (error instanceof IdentityProviderAdapterError) throw new BadRequestException(error.message);
            throw error;
        }
    }

    async listUserExternalIdentities(userId: string): Promise<ExternalIdentityBindingList> {
        await this.requirePlatformUser(userId);
        const bindings = await this.identityProviderRepository.findExternalIdentitiesByUserId(userId);
        return bindings.map((binding) => this.toExternalIdentityBindingSummary(binding));
    }

    async bindUserExternalIdentity(userId: string, request: BindUserExternalIdentityRequest, operatorId?: string | null): Promise<ExternalIdentityBindingSummary> {
        await this.requirePlatformUser(userId);
        const config = await this.requireConfig(request.identityProviderConfigId);
        this.assertBindingAllowed(config);

        const tenantId = request.tenantId ?? config.tenantId ?? null;
        const existingSubject = await this.identityProviderRepository.findActiveExternalIdentityBySubject(config.id, tenantId, request.subjectId);
        if (existingSubject) {
            throw new ConflictException(`External subject is already bound: ${config.provider}/${tenantId ?? 'default'}/${request.subjectId}`);
        }

        const existingUserProvider = await this.identityProviderRepository.findActiveExternalIdentityByUserProvider(userId, config.id);
        if (existingUserProvider) {
            throw new ConflictException(`POMS user ${userId} already has an active binding for identity provider config ${config.id}`);
        }

        const now = new Date();
        const binding = this.identityProviderRepository.createExternalIdentity({
            identityProviderConfigId: config.id,
            provider: config.provider,
            tenantId,
            pomsUserId: userId,
            subjectId: request.subjectId,
            unionId: request.unionId ?? null,
            subjectDisplayName: request.subjectDisplayName ?? null,
            avatarUrl: request.avatarUrl ?? null,
            email: request.email ?? null,
            mobile: request.mobile ?? null,
            status: ExternalIdentityBindingStatusValue.Active,
            boundAt: now,
            boundBy: operatorId ?? null,
            revokedAt: null,
            revokedBy: null,
            createdBy: operatorId ?? null,
            updatedBy: operatorId ?? null
        });

        await this.identityProviderRepository.saveAll([binding]);
        await this.recordExternalIdentityAudit('external-identity.bound', binding, operatorId, null, this.externalIdentityAuditSnapshot(binding));

        return this.toExternalIdentityBindingSummary(binding);
    }

    async unbindExternalIdentity(id: string, request: UnbindExternalIdentityRequest = {}, operatorId?: string | null): Promise<ExternalIdentityBindingSummary> {
        const binding = await this.requireExternalIdentity(id);
        if (request.expectedVersion !== undefined && request.expectedVersion !== binding.rowVersion) {
            throw new ConflictException(`External identity binding version conflict: expected ${request.expectedVersion}, actual ${binding.rowVersion}`);
        }
        if (binding.status !== ExternalIdentityBindingStatusValue.Active) {
            throw new ConflictException(`External identity binding ${id} is not active`);
        }

        const beforeSnapshot = this.externalIdentityAuditSnapshot(binding);
        binding.status = ExternalIdentityBindingStatusValue.Revoked;
        binding.revokedAt = new Date();
        binding.revokedBy = operatorId ?? null;
        binding.updatedBy = operatorId ?? null;

        await this.identityProviderRepository.saveAll([binding]);
        await this.recordExternalIdentityAudit('external-identity.unbound', binding, operatorId, beforeSnapshot, this.externalIdentityAuditSnapshot(binding));

        return this.toExternalIdentityBindingSummary(binding);
    }

    private async requireConfig(id: string): Promise<IdentityProviderConfig> {
        const config = await this.identityProviderRepository.findConfigById(id);
        if (!config) throw new NotFoundException(`Identity provider config ${id} not found`);
        return config;
    }

    private async requirePlatformUser(userId: string): Promise<void> {
        const user = await this.identityProviderRepository.findPlatformUserById(userId);
        if (!user) throw new NotFoundException(`Platform user ${userId} not found`);
    }

    private async requireExternalIdentity(id: string): Promise<ExternalIdentity> {
        const binding = await this.identityProviderRepository.findExternalIdentityById(id);
        if (!binding) throw new NotFoundException(`External identity binding ${id} not found`);
        return binding;
    }

    private async assertProviderTenantAvailable(provider: IdentityProvider, tenantId: string | null): Promise<void> {
        const existing = await this.identityProviderRepository.findConfigByProviderTenant(provider, tenantId);
        if (existing) {
            throw new ConflictException(`Identity provider config already exists: ${provider}/${tenantId ?? 'default'}`);
        }
    }

    private assertSupportedSearchGrantMode(mode: string): void {
        if (mode !== IdentityProviderSearchGrantModeValue.PerAdmin) {
            throw new BadRequestException('Only per-admin provider search grants are supported in the first version.');
        }
    }

    private assertConfigState(config: IdentityProviderConfig): void {
        if (config.status === IdentityProviderConfigStatusValue.Active && !config.enabled) {
            throw new BadRequestException('Active identity provider config must be enabled.');
        }
        if (config.status === IdentityProviderConfigStatusValue.Active && !this.hasMinimumActiveConfig(config)) {
            throw new BadRequestException('Active identity provider config requires complete client credentials and enabled capability redirect URIs.');
        }
    }

    private normalizeConfigStatus(config: IdentityProviderConfig, previousStatus = config.status): void {
        if (!config.enabled) {
            config.status = previousStatus === IdentityProviderConfigStatusValue.Draft ? IdentityProviderConfigStatusValue.Draft : IdentityProviderConfigStatusValue.Disabled;
            return;
        }

        config.status = this.hasMinimumActiveConfig(config) ? IdentityProviderConfigStatusValue.Active : IdentityProviderConfigStatusValue.Misconfigured;
    }

    private hasMinimumActiveConfig(config: IdentityProviderConfig): boolean {
        if (!config.clientId || !config.encryptedClientSecret) return false;
        if (config.loginEnabled && !config.redirectUri) return false;
        if (config.searchEnabled && !config.searchRedirectUri) return false;
        return true;
    }

    private assertBindingAllowed(config: IdentityProviderConfig): void {
        if (!config.enabled || config.status !== IdentityProviderConfigStatusValue.Active) {
            throw new BadRequestException('Active and enabled identity provider config is required before binding external identities.');
        }
        if (!config.bindingEnabled) {
            throw new BadRequestException('Identity provider config does not allow binding.');
        }
    }

    private assertSearchGrantAllowed(config: IdentityProviderConfig): void {
        if (!config.enabled || config.status !== IdentityProviderConfigStatusValue.Active) {
            throw new BadRequestException('Active and enabled identity provider config is required before searching external users.');
        }
        if (!config.searchEnabled) {
            throw new BadRequestException('Identity provider config does not allow external user search.');
        }
        if (config.searchGrantMode !== IdentityProviderSearchGrantModeValue.PerAdmin) {
            throw new BadRequestException('Only per-admin external user search grants are supported.');
        }
        if (!config.encryptedClientSecret) {
            throw new BadRequestException('Identity provider client secret is required before starting provider authorization.');
        }
        this.requireSearchRedirectUri(config);
    }

    private assertLoginAllowed(config: IdentityProviderConfig): void {
        if (!config.enabled || config.status !== IdentityProviderConfigStatusValue.Active) {
            throw new BadRequestException('Active and enabled identity provider config is required before external login.');
        }
        if (!config.loginEnabled) {
            throw new BadRequestException('Identity provider config does not allow external login.');
        }
        if (!config.encryptedClientSecret) {
            throw new BadRequestException('Identity provider client secret is required before external login.');
        }
        this.requireLoginRedirectUri(config);
    }

    private requireLoginRedirectUri(config: IdentityProviderConfig): string {
        if (!config.redirectUri) {
            throw new BadRequestException('Identity provider redirect URI is required before external login.');
        }
        return config.redirectUri;
    }

    private requireSearchRedirectUri(config: IdentityProviderConfig): string {
        if (!config.searchRedirectUri) {
            throw new BadRequestException('Identity provider search redirect URI is required before starting provider authorization.');
        }
        return config.searchRedirectUri;
    }

    private toDetail(config: IdentityProviderConfig): IdentityProviderConfigDetail {
        return {
            id: config.id,
            provider: config.provider as IdentityProviderConfigDetail['provider'],
            tenantId: config.tenantId ?? null,
            displayName: config.displayName,
            status: config.status as IdentityProviderConfigDetail['status'],
            enabled: config.enabled,
            loginEnabled: config.loginEnabled,
            bindingEnabled: config.bindingEnabled,
            searchEnabled: config.searchEnabled,
            clientId: config.clientId,
            secretConfigured: Boolean(config.encryptedClientSecret),
            redirectUri: config.redirectUri ?? null,
            searchRedirectUri: config.searchRedirectUri ?? null,
            loginScopes: config.loginScopes ?? [],
            searchScopes: config.searchScopes ?? [],
            tenantAllowlist: config.tenantAllowlist ?? [],
            searchGrantMode: config.searchGrantMode as IdentityProviderConfigDetail['searchGrantMode'],
            rowVersion: config.rowVersion,
            createdAt: config.createdAt.toISOString(),
            createdBy: config.createdBy ?? null,
            updatedAt: config.updatedAt.toISOString(),
            updatedBy: config.updatedBy ?? null
        };
    }

    private auditSnapshot(config: IdentityProviderConfig): Record<string, unknown> {
        return {
            provider: config.provider,
            tenantId: config.tenantId ?? null,
            displayName: config.displayName,
            status: config.status,
            enabled: config.enabled,
            loginEnabled: config.loginEnabled,
            bindingEnabled: config.bindingEnabled,
            searchEnabled: config.searchEnabled,
            clientId: config.clientId,
            secretConfigured: Boolean(config.encryptedClientSecret),
            redirectUri: config.redirectUri ?? null,
            searchRedirectUri: config.searchRedirectUri ?? null,
            loginScopes: config.loginScopes ?? [],
            searchScopes: config.searchScopes ?? [],
            tenantAllowlist: config.tenantAllowlist ?? [],
            searchGrantMode: config.searchGrantMode,
            rowVersion: config.rowVersion
        };
    }

    private toExternalIdentityBindingSummary(binding: ExternalIdentity): ExternalIdentityBindingSummary {
        return {
            id: binding.id,
            identityProviderConfigId: binding.identityProviderConfigId,
            provider: binding.provider as ExternalIdentityBindingSummary['provider'],
            tenantId: binding.tenantId ?? null,
            pomsUserId: binding.pomsUserId,
            subjectId: binding.subjectId,
            unionId: binding.unionId ?? null,
            subjectDisplayName: binding.subjectDisplayName ?? null,
            avatarUrl: binding.avatarUrl ?? null,
            email: binding.email ?? null,
            mobile: binding.mobile ?? null,
            status: binding.status as ExternalIdentityBindingSummary['status'],
            boundAt: binding.boundAt.toISOString(),
            boundBy: binding.boundBy ?? null,
            revokedAt: binding.revokedAt?.toISOString() ?? null,
            revokedBy: binding.revokedBy ?? null,
            rowVersion: binding.rowVersion,
            createdAt: binding.createdAt.toISOString(),
            createdBy: binding.createdBy ?? null,
            updatedAt: binding.updatedAt.toISOString(),
            updatedBy: binding.updatedBy ?? null
        };
    }

    private externalIdentityAuditSnapshot(binding: ExternalIdentity): Record<string, unknown> {
        return {
            identityProviderConfigId: binding.identityProviderConfigId,
            provider: binding.provider,
            tenantId: binding.tenantId ?? null,
            pomsUserId: binding.pomsUserId,
            subjectId: binding.subjectId,
            unionId: binding.unionId ?? null,
            subjectDisplayName: binding.subjectDisplayName ?? null,
            email: binding.email ?? null,
            mobile: binding.mobile ?? null,
            status: binding.status,
            boundAt: binding.boundAt.toISOString(),
            boundBy: binding.boundBy ?? null,
            revokedAt: binding.revokedAt?.toISOString() ?? null,
            revokedBy: binding.revokedBy ?? null,
            rowVersion: binding.rowVersion
        };
    }

    private toOAuthGrantSummary(config: IdentityProviderConfig, pomsUserId: string, grant: IdentityProviderOAuthGrant | null): IdentityProviderOAuthGrantSummary {
        return {
            id: grant?.id ?? null,
            identityProviderConfigId: config.id,
            provider: config.provider as IdentityProviderOAuthGrantSummary['provider'],
            tenantId: config.tenantId ?? null,
            pomsUserId,
            status: grant ? this.resolveOAuthGrantStatus(grant) : IdentityProviderOAuthGrantStatusValue.Missing,
            scopes: grant?.scopes ?? [],
            grantedAt: grant?.grantedAt.toISOString() ?? null,
            expiresAt: grant?.expiresAt?.toISOString() ?? null,
            refreshExpiresAt: grant?.refreshExpiresAt?.toISOString() ?? null,
            lastUsedAt: grant?.lastUsedAt?.toISOString() ?? null,
            lastError: grant?.lastError ?? null,
            rowVersion: grant?.rowVersion ?? null,
            updatedAt: grant?.updatedAt.toISOString() ?? null
        };
    }

    private resolveOAuthGrantStatus(grant: IdentityProviderOAuthGrant): IdentityProviderOAuthGrantSummary['status'] {
        if (grant.status === IdentityProviderOAuthGrantStatusValue.Revoked) return IdentityProviderOAuthGrantStatusValue.Revoked;
        if (grant.expiresAt && grant.expiresAt.getTime() <= Date.now()) return IdentityProviderOAuthGrantStatusValue.Expired;
        return grant.status as IdentityProviderOAuthGrantSummary['status'];
    }

    private oauthGrantAuditSnapshot(grant: IdentityProviderOAuthGrant): Record<string, unknown> {
        return {
            identityProviderConfigId: grant.identityProviderConfigId,
            provider: grant.provider,
            tenantId: grant.tenantId ?? null,
            pomsUserId: grant.pomsUserId,
            status: this.resolveOAuthGrantStatus(grant),
            scopes: grant.scopes ?? [],
            grantedAt: grant.grantedAt.toISOString(),
            expiresAt: grant.expiresAt?.toISOString() ?? null,
            refreshExpiresAt: grant.refreshExpiresAt?.toISOString() ?? null,
            lastUsedAt: grant.lastUsedAt?.toISOString() ?? null,
            lastError: grant.lastError ?? null,
            rowVersion: grant.rowVersion,
            tokenRedacted: true
        };
    }

    private async recordConfigAudit(eventType: string, config: IdentityProviderConfig, operatorId: string | null | undefined, beforeSnapshot: Record<string, unknown> | null, afterSnapshot: Record<string, unknown>): Promise<void> {
        await this.runtimeAuditService.recordAuditLog({
            eventType,
            targetType: 'IdentityProviderConfig',
            targetId: config.id,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot,
            afterSnapshot,
            metadata: {
                secretRedacted: true
            }
        });
    }

    private async recordExternalIdentityAudit(eventType: string, binding: ExternalIdentity, operatorId: string | null | undefined, beforeSnapshot: Record<string, unknown> | null, afterSnapshot: Record<string, unknown>): Promise<void> {
        await this.runtimeAuditService.recordAuditLog({
            eventType,
            targetType: 'ExternalIdentity',
            targetId: binding.id,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot,
            afterSnapshot,
            metadata: {
                identityProviderConfigId: binding.identityProviderConfigId,
                provider: binding.provider,
                tenantId: binding.tenantId ?? null
            }
        });
    }

    private async recordOAuthGrantAudit(eventType: string, grant: IdentityProviderOAuthGrant, operatorId: string | null | undefined, beforeSnapshot: Record<string, unknown> | null, afterSnapshot: Record<string, unknown>): Promise<void> {
        await this.runtimeAuditService.recordAuditLog({
            eventType,
            targetType: 'IdentityProviderOAuthGrant',
            targetId: grant.id,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot,
            afterSnapshot,
            metadata: {
                identityProviderConfigId: grant.identityProviderConfigId,
                provider: grant.provider,
                tenantId: grant.tenantId ?? null,
                tokenRedacted: true
            }
        });
    }

    private async recordExternalLoginFailure(config: IdentityProviderConfig, subjectId: string, reason: string): Promise<void> {
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'identity-provider.external-login.failed',
            targetType: 'IdentityProviderConfig',
            targetId: config.id,
            operatorId: null,
            result: 'failed',
            reason,
            metadata: {
                provider: config.provider,
                tenantId: config.tenantId ?? null,
                subjectId
            }
        });
    }

    private testBasicConnection(config: IdentityProviderConfig): IdentityProviderConnectionTestResult {
        const checks = this.basicConnectionChecks(config);
        const status = this.connectionStatusForChecks(checks);
        const firstFailed = checks.find((check) => check.status === IdentityProviderConnectionDiagnosticStatusValue.Failed);
        const message =
            status === IdentityProviderConnectionTestStatusValue.Success
                ? 'Local configuration is complete. Provider network verification is handled by the adapter slice.'
                : (firstFailed?.message ?? 'Identity provider configuration is not ready.');

        return this.connectionTestResult(IdentityProviderConnectionTestCapabilityValue.Basic, checks, message);
    }

    private async testExternalOrgSyncReadiness(config: IdentityProviderConfig, request: TestIdentityProviderConnectionRequest): Promise<IdentityProviderConnectionTestResult> {
        const checks = this.externalOrgSyncLocalChecks(config);
        if (checks.some((check) => check.status === IdentityProviderConnectionDiagnosticStatusValue.Failed)) {
            checks.push(this.diagnosticCheck('tenantAccessToken', '飞书 tenant_access_token', IdentityProviderConnectionDiagnosticStatusValue.Skipped, '本地接入配置未就绪，暂不请求飞书 tenant_access_token。'));
            checks.push(this.diagnosticCheck('departmentReadAccess', '飞书部门读取', IdentityProviderConnectionDiagnosticStatusValue.Skipped, '本地接入配置未就绪，暂不读取飞书部门。'));

            return this.connectionTestResult(IdentityProviderConnectionTestCapabilityValue.ExternalOrgSync, checks, this.connectionFailureMessage(checks), this.nextActionsForChecks(checks));
        }

        try {
            const result = await this.externalOrgDirectoryAdapterRegistry.get(ExternalOrgProviderValue.Feishu).testDepartmentReadAccess({
                providerConfig: config,
                clientSecret: this.decryptSecret(config.encryptedClientSecret ?? ''),
                rootDepartmentId: request.externalRootDepartmentId ?? null
            });
            checks.push(this.diagnosticCheck('tenantAccessToken', '飞书 tenant_access_token', IdentityProviderConnectionDiagnosticStatusValue.Passed, '已使用应用凭证获取飞书 tenant_access_token。'));
            checks.push(
                this.diagnosticCheck(
                    'departmentReadAccess',
                    '飞书部门读取',
                    IdentityProviderConnectionDiagnosticStatusValue.Passed,
                    `根部门 ${result.rootDepartmentId} 可访问，已读取 ${result.childDepartmentCount} 个直接子部门。`
                )
            );
        } catch (error) {
            const message = this.safeDiagnosticErrorMessage(error);
            const failedKey = message.includes('tenant access token') || message.includes('访问令牌') ? 'tenantAccessToken' : 'departmentReadAccess';
            if (failedKey === 'tenantAccessToken') {
                checks.push(this.diagnosticCheck('tenantAccessToken', '飞书 tenant_access_token', IdentityProviderConnectionDiagnosticStatusValue.Failed, message));
                checks.push(this.diagnosticCheck('departmentReadAccess', '飞书部门读取', IdentityProviderConnectionDiagnosticStatusValue.Skipped, 'tenant_access_token 获取失败，暂不读取飞书部门。'));
            } else {
                checks.push(this.diagnosticCheck('tenantAccessToken', '飞书 tenant_access_token', IdentityProviderConnectionDiagnosticStatusValue.Passed, '已使用应用凭证获取飞书 tenant_access_token。'));
                checks.push(this.diagnosticCheck('departmentReadAccess', '飞书部门读取', IdentityProviderConnectionDiagnosticStatusValue.Failed, message));
            }
        }

        const status = this.connectionStatusForChecks(checks);
        const message =
            status === IdentityProviderConnectionTestStatusValue.Success ? '组织同步可用性检查通过，飞书通讯录读取正常。' : this.connectionFailureMessage(checks);
        return this.connectionTestResult(IdentityProviderConnectionTestCapabilityValue.ExternalOrgSync, checks, message, this.nextActionsForChecks(checks));
    }

    private basicConnectionChecks(config: IdentityProviderConfig): IdentityProviderConnectionDiagnosticCheck[] {
        const checks = [
            this.diagnosticCheck(
                'enabled',
                '总开关',
                config.enabled && config.status !== IdentityProviderConfigStatusValue.Disabled ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed,
                config.enabled && config.status !== IdentityProviderConfigStatusValue.Disabled ? '企业协同接入总开关已启用。' : 'Identity provider is disabled.'
            ),
            this.diagnosticCheck(
                'clientCredentials',
                'Client ID / Secret',
                config.clientId && config.encryptedClientSecret ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed,
                config.clientId && config.encryptedClientSecret ? 'Client ID 和 Client Secret 已配置。' : 'Client id and client secret are required.'
            )
        ];

        checks.push(
            config.loginEnabled
                ? this.diagnosticCheck('loginRedirectUri', '登录 Redirect URI', config.redirectUri ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed, config.redirectUri ? '登录 Redirect URI 已配置。' : 'Login redirect URI is required.')
                : this.diagnosticCheck('loginRedirectUri', '登录 Redirect URI', IdentityProviderConnectionDiagnosticStatusValue.Skipped, '登录能力未启用。')
        );
        checks.push(
            config.searchEnabled
                ? this.diagnosticCheck('searchRedirectUri', '搜索 Redirect URI', config.searchRedirectUri ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed, config.searchRedirectUri ? '搜索 Redirect URI 已配置。' : 'Search redirect URI is required.')
                : this.diagnosticCheck('searchRedirectUri', '搜索 Redirect URI', IdentityProviderConnectionDiagnosticStatusValue.Skipped, '搜索能力未启用。')
        );

        return checks;
    }

    private externalOrgSyncLocalChecks(config: IdentityProviderConfig): IdentityProviderConnectionDiagnosticCheck[] {
        return [
            this.diagnosticCheck(
                'provider',
                '外部平台',
                config.provider === IdentityProviderValue.Feishu ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed,
                config.provider === IdentityProviderValue.Feishu ? '当前接入配置为飞书，可用于外部组织同步诊断。' : '当前仅支持飞书组织同步诊断。'
            ),
            this.diagnosticCheck(
                'enabled',
                '总开关',
                config.enabled ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed,
                config.enabled ? '企业协同接入总开关已启用。' : '企业协同接入总开关未启用。'
            ),
            this.diagnosticCheck(
                'configStatus',
                '接入状态',
                config.status === IdentityProviderConfigStatusValue.Active ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed,
                config.status === IdentityProviderConfigStatusValue.Active ? '接入配置状态已激活。' : `接入配置状态为 ${config.status}，尚未就绪。`
            ),
            this.diagnosticCheck(
                'clientCredentials',
                'Client ID / Secret',
                config.clientId && config.encryptedClientSecret ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed,
                config.clientId && config.encryptedClientSecret ? 'Client ID 和 Client Secret 已配置。' : '组织同步需要完整的 Client ID 和 Client Secret。'
            )
        ];
    }

    private diagnosticCheck(key: string, label: string, status: IdentityProviderConnectionDiagnosticCheck['status'], message: string, details: string | null = null): IdentityProviderConnectionDiagnosticCheck {
        return {
            key,
            label,
            status,
            message,
            ...(details ? { details } : {})
        };
    }

    private connectionStatusForChecks(checks: IdentityProviderConnectionDiagnosticCheck[]): IdentityProviderConnectionTestResult['status'] {
        return checks.some((check) => check.status === IdentityProviderConnectionDiagnosticStatusValue.Failed) ? IdentityProviderConnectionTestStatusValue.Failed : IdentityProviderConnectionTestStatusValue.Success;
    }

    private connectionFailureMessage(checks: IdentityProviderConnectionDiagnosticCheck[]): string {
        const failed = checks.find((check) => check.status === IdentityProviderConnectionDiagnosticStatusValue.Failed);
        return failed ? `组织同步可用性检查未通过：${failed.message}` : '组织同步可用性检查未通过。';
    }

    private nextActionsForChecks(checks: IdentityProviderConnectionDiagnosticCheck[]): string[] {
        const actions: string[] = [];
        const failedKeys = new Set(checks.filter((check) => check.status === IdentityProviderConnectionDiagnosticStatusValue.Failed).map((check) => check.key));
        if (failedKeys.has('enabled')) actions.push('在企业协同接入中启用总开关并保存。');
        if (failedKeys.has('configStatus')) actions.push('完善 Client Secret 或已启用能力的回调地址，使接入状态恢复为已激活。');
        if (failedKeys.has('clientCredentials')) actions.push('填写飞书应用的 Client ID 和 Client Secret 后保存。');
        if (failedKeys.has('tenantAccessToken')) actions.push('检查飞书应用凭证是否正确，并确认应用已发布。');
        if (failedKeys.has('departmentReadAccess')) actions.push('在飞书开放平台开通应用身份通讯录部门读取权限，并发布应用后重试。');
        if (failedKeys.has('provider')) actions.push('当前组织同步诊断仅支持飞书接入配置。');
        return actions;
    }

    private safeDiagnosticErrorMessage(error: unknown): string {
        const rawMessage =
            error instanceof ExternalOrgDirectoryAdapterError || error instanceof Error
                ? error.message.trim()
                : '';
        const message = rawMessage || '飞书组织同步只读探测失败。';
        return message
            .replace(/tenant_access_token[=:]\s*[\w.-]+/gi, 'tenant_access_token=<redacted>')
            .replace(/Bearer\s+[\w.-]+/gi, 'Bearer <redacted>')
            .replace(/app_secret[=:]\s*[^,\s，）)]+/gi, 'app_secret=<redacted>');
    }

    private connectionTestResult(
        capability: IdentityProviderConnectionTestResult['capability'],
        checks: IdentityProviderConnectionDiagnosticCheck[],
        message: string,
        nextActions: string[] = []
    ): IdentityProviderConnectionTestResult {
        return {
            status: this.connectionStatusForChecks(checks),
            capability,
            message,
            checkedAt: new Date().toISOString(),
            checks,
            nextActions
        };
    }

    private createOAuthState(identityProviderConfigId: string, operatorId: string): { value: string; expiresAt: Date } {
        const expiresAt = new Date(Date.now() + 10 * 60_000);
        const payload = {
            purpose: 'identity-provider-admin-grant',
            identityProviderConfigId,
            operatorId,
            nonce: randomBytes(16).toString('base64url'),
            exp: expiresAt.getTime()
        };
        const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
        return {
            value: `${encodedPayload}.${this.signOAuthState(encodedPayload)}`,
            expiresAt
        };
    }

    private createExternalLoginState(identityProviderConfigId: string): { value: string; expiresAt: Date } {
        const expiresAt = new Date(Date.now() + 10 * 60_000);
        const payload = {
            purpose: 'identity-provider-login',
            identityProviderConfigId,
            nonce: randomBytes(16).toString('base64url'),
            exp: expiresAt.getTime()
        };
        const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
        return {
            value: `${encodedPayload}.${this.signOAuthState(encodedPayload)}`,
            expiresAt
        };
    }

    private verifyOAuthState(state: string): { identityProviderConfigId: string; operatorId: string } {
        const [encodedPayload, signature, ...rest] = state.split('.');
        if (!encodedPayload || !signature || rest.length > 0) {
            throw new BadRequestException('Invalid provider OAuth state.');
        }

        const expected = this.signOAuthState(encodedPayload);
        const actualSignature = Buffer.from(signature, 'base64url');
        const expectedSignature = Buffer.from(expected, 'base64url');
        if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) {
            throw new BadRequestException('Invalid provider OAuth state signature.');
        }

        let payload: Record<string, unknown>;
        try {
            payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Record<string, unknown>;
        } catch {
            throw new BadRequestException('Invalid provider OAuth state payload.');
        }

        if (payload['purpose'] !== 'identity-provider-admin-grant' || typeof payload['identityProviderConfigId'] !== 'string' || typeof payload['operatorId'] !== 'string' || typeof payload['exp'] !== 'number') {
            throw new BadRequestException('Invalid provider OAuth state payload.');
        }
        if (payload['exp'] <= Date.now()) {
            throw new BadRequestException('Provider OAuth state has expired.');
        }

        return {
            identityProviderConfigId: payload['identityProviderConfigId'],
            operatorId: payload['operatorId']
        };
    }

    private verifyExternalLoginState(state: string): { identityProviderConfigId: string } {
        const [encodedPayload, signature, ...rest] = state.split('.');
        if (!encodedPayload || !signature || rest.length > 0) {
            throw new UnauthorizedException('Invalid provider OAuth state.');
        }

        const expected = this.signOAuthState(encodedPayload);
        const actualSignature = Buffer.from(signature, 'base64url');
        const expectedSignature = Buffer.from(expected, 'base64url');
        if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) {
            throw new UnauthorizedException('Invalid provider OAuth state signature.');
        }

        let payload: Record<string, unknown>;
        try {
            payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Record<string, unknown>;
        } catch {
            throw new UnauthorizedException('Invalid provider OAuth state payload.');
        }

        if (payload['purpose'] !== 'identity-provider-login' || typeof payload['identityProviderConfigId'] !== 'string' || typeof payload['exp'] !== 'number') {
            throw new UnauthorizedException('Invalid provider OAuth state payload.');
        }
        if (payload['exp'] <= Date.now()) {
            throw new UnauthorizedException('Provider OAuth state has expired.');
        }

        return {
            identityProviderConfigId: payload['identityProviderConfigId']
        };
    }

    private signOAuthState(encodedPayload: string): string {
        return createHmac('sha256', this.stateKey()).update(encodedPayload).digest('base64url');
    }

    private expiresAtFromNow(expiresInSeconds: number | null): Date | null {
        if (expiresInSeconds === null || expiresInSeconds <= 0) return null;
        return new Date(Date.now() + expiresInSeconds * 1000);
    }

    private createLoginTicketValue(): string {
        return randomBytes(32).toString('base64url');
    }

    private ticketHash(ticket: string): string {
        return createHash('sha256').update(ticket).digest('hex');
    }

    private encryptSecret(secret: string): string {
        return this.secretCipherService.encrypt(secret, IDENTITY_PROVIDER_SECRET_CIPHER_OPTIONS);
    }

    private decryptSecret(encryptedSecret: string): string {
        return this.secretCipherService.decrypt(encryptedSecret, IDENTITY_PROVIDER_SECRET_CIPHER_OPTIONS);
    }

    private stateKey(): Buffer {
        const source = process.env['IDENTITY_PROVIDER_STATE_KEY'] ?? process.env['IDENTITY_PROVIDER_SECRET_KEY'] ?? process.env['JWT_SECRET'] ?? 'poms-dev-secret-change-in-production';
        return createHash('sha256').update(source).digest();
    }
}
