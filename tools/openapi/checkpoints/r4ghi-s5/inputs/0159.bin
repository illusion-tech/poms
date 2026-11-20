import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
    type IdentityProviderConfigStatus,
    type IdentityProviderConnectionDiagnosticCheck,
    type IdentityProviderConnectionTestResult,
    IDENTITY_PROVIDER_SCOPE_MAX_ITEMS,
    IDENTITY_PROVIDER_SCOPE_MAX_LENGTH,
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

const FEISHU_BINDING_CANDIDATE_REQUIRED_SCOPES = ['contact:user:search', 'contact:contact.base:readonly', 'contact:user.department:readonly', 'contact:department.base:readonly', 'contact:user.email:readonly', 'contact:user.phone:readonly'] as const;

@Injectable()
export class IdentityProviderService {
    constructor(
        @Inject(IdentityProviderRepository) private readonly identityProviderRepository: IdentityProviderRepository,
        @Inject(RuntimeAuditService) private readonly runtimeAuditService: RuntimeAuditService,
        @Inject(IdentityProviderAdapterRegistry) private readonly adapterRegistry: IdentityProviderAdapterRegistry,
        @Inject(SecretCipherService) private readonly secretCipherService: SecretCipherService,
        @Inject(ExternalOrgDirectoryAdapterRegistry) private readonly externalOrgDirectoryAdapterRegistry: ExternalOrgDirectoryAdapterRegistry
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

        const searchEnabled = request.searchEnabled ?? false;
        const searchScopes = this.normalizeAdditionalSearchScopes(request.provider, searchEnabled, request.searchScopes ?? []);
        this.validateSearchGrantScopes(request.provider, searchEnabled, searchScopes);

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
            searchEnabled,
            clientId: request.clientId,
            encryptedClientSecret,
            secretUpdatedAt: encryptedClientSecret ? new Date() : null,
            redirectUri: request.redirectUri ?? null,
            searchRedirectUri: request.searchRedirectUri ?? null,
            loginScopes: this.uniqueScopes(request.loginScopes ?? []),
            searchScopes,
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

        const searchEnabled = request.searchEnabled ?? config.searchEnabled;
        const searchScopes = this.normalizeAdditionalSearchScopes(config.provider, searchEnabled, request.searchScopes ?? config.searchScopes ?? []);
        this.validateSearchGrantScopes(config.provider, searchEnabled, searchScopes);

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
        if (request.loginScopes !== undefined) config.loginScopes = this.uniqueScopes(request.loginScopes);
        config.searchScopes = searchScopes;
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
        const scopes = this.searchGrantRequestedScopes(config);
        const authorizeUrl = this.adapterRegistry.get(config.provider).buildAdminGrantAuthorizeUrl({
            config,
            redirectUri,
            state: state.value,
            scopes
        });

        await this.recordConfigAudit('identity-provider.oauth-grant.authorize-started', config, operatorId, null, {
            identityProviderConfigId: config.id,
            provider: config.provider,
            tenantId: config.tenantId ?? null,
            stateExpiresAt: state.expiresAt.toISOString(),
            scopes
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

        const grantScopes = this.resolveOAuthGrantScopes(tokenSet.scopes, config);
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
        grant.scopes = grantScopes;
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
        const grantScopeSnapshot = this.normalizeOAuthGrantScopeSnapshot(grant.scopes ?? []);
        if (!grantScopeSnapshot.isValid) {
            grant.lastError = this.invalidOAuthGrantScopeSnapshotMessage();
            grant.updatedBy = operatorId;
            await this.identityProviderRepository.saveAll([grant]);
            throw this.invalidOAuthGrantScopeSnapshotException(config);
        }

        const missingRequiredScopes = this.missingRequiredSearchGrantScopes(config, grantScopeSnapshot.scopes);
        if (missingRequiredScopes.length > 0) {
            grant.lastError = this.missingRequiredScopesMessage(missingRequiredScopes);
            grant.updatedBy = operatorId;
            await this.identityProviderRepository.saveAll([grant]);
            throw this.missingRequiredScopesException(config, grantScopeSnapshot.scopes, missingRequiredScopes);
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
            grant.lastError = this.userSearchFailureMessage(error);
            grant.updatedBy = operatorId;
            await this.identityProviderRepository.saveAll([grant]);
            if (error instanceof IdentityProviderAdapterError) throw this.providerUserSearchException(config, error);
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
        this.validateSearchGrantScopes(config.provider, config.searchEnabled, config.searchScopes ?? []);
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
        const grantScopeSnapshot = this.normalizeOAuthGrantScopeSnapshot(grant?.scopes ?? []);
        const scopes = grantScopeSnapshot.isValid ? grantScopeSnapshot.scopes : [];
        const requiredScopes = this.requiredSearchGrantScopes(config);
        return {
            id: grant?.id ?? null,
            identityProviderConfigId: config.id,
            provider: config.provider as IdentityProviderOAuthGrantSummary['provider'],
            tenantId: config.tenantId ?? null,
            pomsUserId,
            status: grant ? this.resolveOAuthGrantStatus(grant) : IdentityProviderOAuthGrantStatusValue.Missing,
            scopes,
            requiredScopes,
            missingRequiredScopes: this.missingScopes(requiredScopes, scopes),
            grantedAt: grant?.grantedAt.toISOString() ?? null,
            expiresAt: grant?.expiresAt?.toISOString() ?? null,
            refreshExpiresAt: grant?.refreshExpiresAt?.toISOString() ?? null,
            lastUsedAt: grant?.lastUsedAt?.toISOString() ?? null,
            lastError: grant && !grantScopeSnapshot.isValid ? this.invalidOAuthGrantScopeSnapshotMessage() : (grant?.lastError ?? null),
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

    private searchGrantRequestedScopes(config: IdentityProviderConfig): string[] {
        return this.validateSearchGrantScopes(config.provider, config.searchEnabled, config.searchScopes ?? []);
    }

    private requiredSearchGrantScopes(config: IdentityProviderConfig): string[] {
        return this.requiredSearchGrantScopesFor(config.provider, config.searchEnabled);
    }

    private requiredSearchGrantScopesFor(provider: IdentityProvider, searchEnabled: boolean): string[] {
        if (!searchEnabled) return [];
        if (provider === IdentityProviderValue.Feishu) return [...FEISHU_BINDING_CANDIDATE_REQUIRED_SCOPES];
        return [];
    }

    private missingRequiredSearchGrantScopes(config: IdentityProviderConfig, grantedScopes: string[]): string[] {
        return this.missingScopes(this.requiredSearchGrantScopes(config), grantedScopes);
    }

    private missingScopes(requiredScopes: string[], grantedScopes: string[]): string[] {
        const granted = new Set(grantedScopes.map((scope) => scope.trim()).filter(Boolean));
        return requiredScopes.filter((scope) => !granted.has(scope));
    }

    private uniqueScopes(scopes: string[]): string[] {
        return [...new Set(scopes.map((scope) => scope.trim()).filter(Boolean))];
    }

    private normalizeAdditionalSearchScopes(provider: IdentityProvider, searchEnabled: boolean, scopes: string[]): string[] {
        const requiredScopes = new Set(this.requiredSearchGrantScopesFor(provider, searchEnabled));
        return this.uniqueScopes(scopes).filter((scope) => !requiredScopes.has(scope));
    }

    private validateSearchGrantScopes(provider: IdentityProvider, searchEnabled: boolean, additionalScopes: string[]): string[] {
        const requiredScopes = this.requiredSearchGrantScopesFor(provider, searchEnabled);
        const scopes = this.uniqueScopes([...requiredScopes, ...this.normalizeAdditionalSearchScopes(provider, searchEnabled, additionalScopes)]);
        if (scopes.length > IDENTITY_PROVIDER_SCOPE_MAX_ITEMS) {
            const requiredScopeHint = requiredScopes.length > 0 ? `POMS 会自动请求 ${requiredScopes.join(', ')}，请减少额外 Search scopes。` : '请减少额外 Search scopes。';
            throw new BadRequestException({
                statusCode: 400,
                code: 'identity_provider_search_scope_capacity_exceeded',
                message: `用户搜索最终授权范围最多支持 ${IDENTITY_PROVIDER_SCOPE_MAX_ITEMS} 项。${requiredScopeHint}`,
                maxScopes: IDENTITY_PROVIDER_SCOPE_MAX_ITEMS,
                requiredScopes,
                effectiveScopeCount: scopes.length,
                maxAdditionalScopes: Math.max(0, IDENTITY_PROVIDER_SCOPE_MAX_ITEMS - requiredScopes.length)
            });
        }
        if (scopes.some((scope) => scope.length > IDENTITY_PROVIDER_SCOPE_MAX_LENGTH)) {
            throw new BadRequestException({
                statusCode: 400,
                code: 'identity_provider_search_scope_invalid',
                message: `用户搜索授权范围单项不能超过 ${IDENTITY_PROVIDER_SCOPE_MAX_LENGTH} 个字符。`,
                maxScopeLength: IDENTITY_PROVIDER_SCOPE_MAX_LENGTH
            });
        }
        return scopes;
    }

    private resolveOAuthGrantScopes(providerScopes: string[], config: IdentityProviderConfig): string[] {
        const scopeSnapshot = this.normalizeOAuthGrantScopeSnapshot(providerScopes);
        if (scopeSnapshot.scopes.length === 0) return this.searchGrantRequestedScopes(config);
        if (!scopeSnapshot.isValid) {
            throw new BadRequestException({
                statusCode: 400,
                code: 'identity_provider_grant_scope_list_invalid',
                message: '飞书返回的授权范围超出 POMS 支持范围，无法安全保存授权结果，请调整飞书应用授权范围后重新授权。',
                maxScopes: IDENTITY_PROVIDER_SCOPE_MAX_ITEMS,
                maxScopeLength: IDENTITY_PROVIDER_SCOPE_MAX_LENGTH
            });
        }
        return scopeSnapshot.scopes;
    }

    private normalizeOAuthGrantScopeSnapshot(scopes: string[]): { scopes: string[]; isValid: boolean } {
        const normalizedScopes = this.uniqueScopes(scopes);
        return {
            scopes: normalizedScopes,
            isValid: normalizedScopes.length <= IDENTITY_PROVIDER_SCOPE_MAX_ITEMS && normalizedScopes.every((scope) => scope.length <= IDENTITY_PROVIDER_SCOPE_MAX_LENGTH)
        };
    }

    private invalidOAuthGrantScopeSnapshotMessage(): string {
        return '当前飞书授权范围快照异常，请重新授权后再搜索用户。';
    }

    private invalidOAuthGrantScopeSnapshotException(config: IdentityProviderConfig): BadRequestException {
        return new BadRequestException({
            statusCode: 400,
            code: 'identity_provider_grant_scope_snapshot_invalid',
            message: this.invalidOAuthGrantScopeSnapshotMessage(),
            provider: config.provider,
            identityProviderConfigId: config.id,
            requiredScopes: this.requiredSearchGrantScopes(config),
            maxScopes: IDENTITY_PROVIDER_SCOPE_MAX_ITEMS,
            maxScopeLength: IDENTITY_PROVIDER_SCOPE_MAX_LENGTH,
            nextActions: ['回到 POMS 重新发起当前管理员授权。']
        });
    }

    private missingRequiredScopesMessage(missingRequiredScopes: string[]): string {
        return `当前飞书授权缺少绑定候选资料读取所需权限（${missingRequiredScopes.join(', ')}），请在飞书开放平台开通并发布应用后重新授权。`;
    }

    private missingRequiredScopesException(config: IdentityProviderConfig, grantedScopes: string[], missingRequiredScopes: string[]): BadRequestException {
        return new BadRequestException({
            statusCode: 400,
            code: 'identity_provider_missing_required_scopes',
            message: this.missingRequiredScopesMessage(missingRequiredScopes),
            provider: config.provider,
            identityProviderConfigId: config.id,
            grantedScopes,
            requiredScopes: this.requiredSearchGrantScopes(config),
            missingRequiredScopes,
            nextActions: ['在飞书开放平台为当前应用开通用户搜索、通讯录基础资料、部门、邮箱和手机号读取权限。', '发布飞书应用权限变更后，回到 POMS 重新发起当前管理员授权。']
        });
    }

    private providerUserSearchException(config: IdentityProviderConfig, error: IdentityProviderAdapterError): BadRequestException {
        const isUnauthorized = this.isUserSearchPermissionDenied(error);
        return new BadRequestException({
            statusCode: 400,
            code: isUnauthorized ? 'identity_provider_search_permission_denied' : 'identity_provider_external_user_search_failed',
            message: this.userSearchFailureMessage(error),
            provider: config.provider,
            identityProviderConfigId: config.id,
            providerCode: error.providerCode,
            providerMessage: error.providerMessage,
            providerLogId: error.providerLogId,
            requiredScopes: this.requiredSearchGrantScopes(config),
            nextActions: isUnauthorized
                ? ['在飞书开放平台确认已开通用户搜索、通讯录基础资料、部门、邮箱和手机号读取权限。', '发布飞书应用权限变更后，回到 POMS 重新授权当前管理员。', '如仍失败，可使用飞书 log_id 在开放平台排查。']
                : error.providerLogId
                  ? ['稍后重试；如持续失败，请检查企业协同接入配置。', '可使用飞书 log_id 在开放平台排查。']
                  : ['稍后重试；如持续失败，请检查企业协同接入配置。']
        });
    }

    private isUserSearchPermissionDenied(error: IdentityProviderAdapterError): boolean {
        return error.providerCode === 99991679 || error.providerMessage?.toLowerCase() === 'unauthorized';
    }

    private userSearchFailureMessage(error: unknown): string {
        if (!(error instanceof IdentityProviderAdapterError)) {
            return '飞书用户搜索或候选资料补全失败，请稍后重试或检查企业协同接入配置。';
        }
        if (this.isUserSearchPermissionDenied(error)) {
            return '飞书拒绝了用户搜索或候选资料读取请求，请确认已开通并发布所需权限后重新授权。';
        }
        if (error.providerLogId) {
            return `飞书用户搜索或候选资料补全失败，请稍后重试；如持续失败，请使用飞书 log_id ${error.providerLogId} 在开放平台排查。`;
        }
        return '飞书用户搜索或候选资料补全失败，请稍后重试或检查企业协同接入配置。';
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
        const message = status === IdentityProviderConnectionTestStatusValue.Success ? '本地配置检查通过。服务商网络连通性由对应适配器能力检查。' : (firstFailed?.message ?? '企业协同接入配置未就绪。');

        return this.connectionTestResult(IdentityProviderConnectionTestCapabilityValue.Basic, checks, message);
    }

    private async testExternalOrgSyncReadiness(config: IdentityProviderConfig, request: TestIdentityProviderConnectionRequest): Promise<IdentityProviderConnectionTestResult> {
        const secretReadiness = this.resolveExternalOrgSyncClientSecret(config);
        const checks = this.externalOrgSyncLocalChecks(config, secretReadiness.failureMessage);
        if (checks.some((check) => check.status === IdentityProviderConnectionDiagnosticStatusValue.Failed)) {
            checks.push(this.diagnosticCheck('tenantAccessToken', '飞书 tenant_access_token', IdentityProviderConnectionDiagnosticStatusValue.Skipped, '本地接入配置未就绪，暂不请求飞书 tenant_access_token。'));
            checks.push(this.diagnosticCheck('departmentReadAccess', '飞书部门读取', IdentityProviderConnectionDiagnosticStatusValue.Skipped, '本地接入配置未就绪，暂不读取飞书部门。'));

            return this.connectionTestResult(IdentityProviderConnectionTestCapabilityValue.ExternalOrgSync, checks, this.connectionFailureMessage(checks), this.nextActionsForChecks(checks));
        }

        try {
            const result = await this.externalOrgDirectoryAdapterRegistry.get(ExternalOrgProviderValue.Feishu).testDepartmentReadAccess({
                providerConfig: config,
                clientSecret: secretReadiness.clientSecret ?? '',
                rootDepartmentId: request.externalRootDepartmentId ?? null
            });
            checks.push(this.diagnosticCheck('tenantAccessToken', '飞书 tenant_access_token', IdentityProviderConnectionDiagnosticStatusValue.Passed, '已使用应用凭证获取飞书 tenant_access_token。'));
            checks.push(
                this.diagnosticCheck('departmentReadAccess', '飞书部门读取', IdentityProviderConnectionDiagnosticStatusValue.Passed, `根部门 ${result.rootDepartmentId} 可访问，已完成单页读取探测（返回 ${result.childDepartmentCount} 个子部门样本）。`)
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
        const message = status === IdentityProviderConnectionTestStatusValue.Success ? '组织同步可用性检查通过，飞书通讯录读取正常。' : this.connectionFailureMessage(checks);
        return this.connectionTestResult(IdentityProviderConnectionTestCapabilityValue.ExternalOrgSync, checks, message, this.nextActionsForChecks(checks));
    }

    private basicConnectionChecks(config: IdentityProviderConfig): IdentityProviderConnectionDiagnosticCheck[] {
        const checks = [
            this.diagnosticCheck(
                'enabled',
                '总开关',
                config.enabled && config.status !== IdentityProviderConfigStatusValue.Disabled ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed,
                config.enabled && config.status !== IdentityProviderConfigStatusValue.Disabled ? '企业协同接入总开关已启用。' : '企业协同接入已停用。'
            ),
            this.diagnosticCheck(
                'clientCredentials',
                'Client ID / Secret',
                config.clientId && config.encryptedClientSecret ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed,
                config.clientId && config.encryptedClientSecret ? 'Client ID 和 Client Secret 已配置。' : 'Client ID 和 Client Secret 不能为空。'
            )
        ];

        checks.push(
            config.loginEnabled
                ? this.diagnosticCheck(
                      'loginRedirectUri',
                      '登录 Redirect URI',
                      config.redirectUri ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed,
                      config.redirectUri ? '登录 Redirect URI 已配置。' : '启用登录能力时必须配置登录 Redirect URI。'
                  )
                : this.diagnosticCheck('loginRedirectUri', '登录 Redirect URI', IdentityProviderConnectionDiagnosticStatusValue.Skipped, '登录能力未启用。')
        );
        checks.push(
            config.searchEnabled
                ? this.diagnosticCheck(
                      'searchRedirectUri',
                      '搜索 Redirect URI',
                      config.searchRedirectUri ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed,
                      config.searchRedirectUri ? '搜索 Redirect URI 已配置。' : '启用搜索能力时必须配置 Search Redirect URI。'
                  )
                : this.diagnosticCheck('searchRedirectUri', '搜索 Redirect URI', IdentityProviderConnectionDiagnosticStatusValue.Skipped, '搜索能力未启用。')
        );

        return checks;
    }

    private externalOrgSyncLocalChecks(config: IdentityProviderConfig, clientCredentialFailure: string | null): IdentityProviderConnectionDiagnosticCheck[] {
        const hasReadableClientCredentials = Boolean(config.clientId && config.encryptedClientSecret && !clientCredentialFailure);
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
                config.status === IdentityProviderConfigStatusValue.Active ? '接入配置状态已激活。' : `接入配置状态为「${this.identityProviderConfigStatusLabel(config.status)}」，尚未就绪。`
            ),
            this.diagnosticCheck(
                'clientCredentials',
                'Client ID / Secret',
                hasReadableClientCredentials ? IdentityProviderConnectionDiagnosticStatusValue.Passed : IdentityProviderConnectionDiagnosticStatusValue.Failed,
                hasReadableClientCredentials ? 'Client ID 和 Client Secret 已配置且可读取。' : (clientCredentialFailure ?? '组织同步需要完整的 Client ID 和 Client Secret。')
            )
        ];
    }

    private identityProviderConfigStatusLabel(status: IdentityProviderConfigStatus): string {
        return (
            {
                [IdentityProviderConfigStatusValue.Draft]: '草稿',
                [IdentityProviderConfigStatusValue.Active]: '已激活',
                [IdentityProviderConfigStatusValue.Disabled]: '已停用',
                [IdentityProviderConfigStatusValue.Misconfigured]: '配置异常'
            } satisfies Record<IdentityProviderConfigStatus, string>
        )[status];
    }

    private resolveExternalOrgSyncClientSecret(config: IdentityProviderConfig): { clientSecret: string | null; failureMessage: string | null } {
        if (!config.clientId || !config.encryptedClientSecret) {
            return { clientSecret: null, failureMessage: null };
        }

        try {
            const clientSecret = this.decryptSecret(config.encryptedClientSecret);
            return clientSecret ? { clientSecret, failureMessage: null } : { clientSecret: null, failureMessage: 'Client Secret 已保存但为空，请重新填写并保存。' };
        } catch {
            return { clientSecret: null, failureMessage: 'Client Secret 已保存但无法读取，请重新填写并保存。' };
        }
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
        if (failedKeys.has('clientCredentials')) actions.push('填写或重新填写飞书应用的 Client ID 和 Client Secret 后保存。');
        if (failedKeys.has('tenantAccessToken')) actions.push('检查飞书应用凭证是否正确，并确认应用已发布。');
        if (failedKeys.has('departmentReadAccess')) actions.push('在飞书开放平台开通应用身份通讯录部门读取权限，并发布应用后重试。');
        if (failedKeys.has('provider')) actions.push('当前组织同步诊断仅支持飞书接入配置。');
        return actions;
    }

    private safeDiagnosticErrorMessage(error: unknown): string {
        const rawMessage = error instanceof ExternalOrgDirectoryAdapterError || error instanceof Error ? error.message.trim() : '';
        const message = rawMessage || '飞书组织同步只读探测失败。';
        return this.redactDiagnosticSecrets(message);
    }

    private redactDiagnosticSecrets(message: string): string {
        return message
            .replace(
                /(["']?)(tenant_access_token|app_secret|client_secret|access_token|refresh_token)\1\s*([:=])\s*(["']?)[^\s"',，)}\]]+\4/gi,
                (_match, keyQuote: string, key: string, separator: string, valueQuote: string) => `${keyQuote}${key}${keyQuote}${separator}${valueQuote}<redacted>${valueQuote}`
            )
            .replace(/\bBearer\s+\S+/gi, 'Bearer <redacted>');
    }

    private connectionTestResult(capability: IdentityProviderConnectionTestResult['capability'], checks: IdentityProviderConnectionDiagnosticCheck[], message: string, nextActions: string[] = []): IdentityProviderConnectionTestResult {
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
