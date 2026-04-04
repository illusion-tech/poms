import type {
    AssignRolePermissionsRequest,
    AssignUserOrgMembershipsRequest,
    AssignUserRolesRequest,
    CreateOrgUnitRequest,
    CreatePlatformUserRequest,
    CreateRoleRequest,
    MoveOrgUnitRequest,
    NavigationSyncSummary,
    OrgUnitTreeNode,
    PermissionKey,
    PlatformOrgUnitDetail,
    PlatformOrgUnitSummary,
    PlatformOrgUnitTree,
    PlatformRoleSummary,
    PlatformUserList,
    PlatformUserSummary,
    SanitizedUserWithOrgUnits,
    UpdateOrgUnitActivationRequest,
    UpdateOrgUnitRequest,
    UpdatePlatformUserActivationRequest
} from '@poms/shared-contracts';
import { ConflictException, NotFoundException, Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { NavigationService } from '../navigation/navigation.service';
import { OrgUnit } from './org-unit.entity';
import { PlatformRepository } from './platform.repository';
import { PlatformRole } from './role.entity';

@Injectable()
export class PlatformService {
    constructor(
        private readonly platformRepository: PlatformRepository,
        private readonly runtimeAuditService: RuntimeAuditService,
        private readonly navigationService: NavigationService
    ) {}

    async verifyCredentials(username: string, password: string): Promise<{ userId: string; username: string; permissions: PermissionKey[] } | null> {
        const user = await this.platformRepository.findActiveUserByUsername(username);
        if (!user || !user.passwordHash) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        const permissions = await this.getPermissionsForUser(user.id);
        return { userId: user.id, username: user.username, permissions };
    }

    async resolveActiveAuthUser(userId: string): Promise<{ userId: string; username: string; permissions: PermissionKey[] } | null> {
        const user = await this.platformRepository.findUserById(userId);
        if (!user || !user.isActive) return null;

        const permissions = await this.getPermissionsForUser(user.id);
        return {
            userId: user.id,
            username: user.username,
            permissions
        };
    }

    async isKnownPlatformUser(userId: string): Promise<boolean> {
        return (await this.platformRepository.findUserById(userId)) !== null;
    }

    async isKnownPlatformUsername(username: string): Promise<boolean> {
        return (await this.platformRepository.findUserByUsername(username)) !== null;
    }

    async getPermissionsForUser(userId: string): Promise<PermissionKey[]> {
        const userRoleAssignments = await this.platformRepository.findActiveUserRoleAssignments();
        const roleIds = userRoleAssignments.filter((a) => a.userId === userId).map((a) => a.roleId);
        if (roleIds.length === 0) return [];

        const rolePermissionAssignments = await this.platformRepository.findActiveRolePermissionAssignments();
        const permissions = rolePermissionAssignments
            .filter((a) => roleIds.includes(a.roleId))
            .map((a) => a.permissionKey as PermissionKey);

        return [...new Set(permissions)];
    }

    async listUsers(): Promise<PlatformUserList> {
        const { users, orgUnitMap, roleNamesByUserId, primaryOrgByUserId } = await this.#loadUserAggregationContext();

        return users.map<PlatformUserSummary>((user) => ({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            email: user.email ?? null,
            phone: user.phone ?? null,
            isActive: user.isActive,
            primaryOrgUnitId: primaryOrgByUserId.get(user.id) ?? user.primaryOrgUnitId ?? null,
            primaryOrgUnitName: (primaryOrgByUserId.get(user.id) ?? user.primaryOrgUnitId) ? (orgUnitMap.get(primaryOrgByUserId.get(user.id) ?? user.primaryOrgUnitId ?? '')?.name ?? null) : null,
            roleNames: roleNamesByUserId.get(user.id) ?? [],
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString()
        }));
    }

    async getSanitizedUserProfile(
        userId: string,
        fallback: {
            username: string;
            permissions: PermissionKey[];
        }
    ): Promise<SanitizedUserWithOrgUnits | null> {
        const { orgUnitMap, roleNamesByUserId, primaryOrgByUserId } = await this.#loadUserAggregationContext();
        const user = await this.platformRepository.findUserById(userId);
        if (!user) {
            return null;
        }

        const primaryOrgId = primaryOrgByUserId.get(user.id) ?? user.primaryOrgUnitId ?? null;
        const orgUnits = primaryOrgId
            ? [orgUnitMap.get(primaryOrgId)]
                  .filter((orgUnit): orgUnit is NonNullable<typeof orgUnit> => orgUnit !== undefined)
                  .map((orgUnit) => ({
                      id: orgUnit.id,
                      name: orgUnit.name,
                      code: orgUnit.code,
                      description: orgUnit.description ?? null
                  }))
            : [];

        return {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            roles: roleNamesByUserId.get(user.id) ?? [],
            permissions: fallback.permissions,
            email: user.email ?? null,
            avatarUrl: user.avatarUrl ?? null,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
            emailVerified: false,
            phoneVerified: false,
            phone: user.phone ?? null,
            orgUnits
        };
    }

    async listRoles(): Promise<PlatformRoleSummary[]> {
        const roles = await this.platformRepository.findAllRoles();
        return roles.map((role) => this.#toRoleSummary(role));
    }

    async createRole(request: CreateRoleRequest, operatorId?: string | null): Promise<PlatformRoleSummary> {
        const existing = await this.platformRepository.findRoleByKey(request.roleKey);
        if (existing) throw new ConflictException(`Role key ${request.roleKey} already exists`);

        const role = this.platformRepository.createRole({
            roleKey: request.roleKey,
            name: request.name,
            description: request.description ?? null,
            isActive: true,
            isSystemRole: false,
            displayOrder: request.displayOrder ?? 0,
            createdBy: null,
            updatedBy: null
        });
        await this.platformRepository.saveAll([role]);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.role.created',
            targetType: 'PlatformRole',
            targetId: role.id,
            operatorId: operatorId ?? null,
            result: 'success',
            afterSnapshot: {
                roleKey: role.roleKey,
                name: role.name,
                isActive: role.isActive,
                isSystemRole: role.isSystemRole,
                displayOrder: role.displayOrder
            }
        });
        return this.#toRoleSummary(role);
    }

    async assignRolePermissions(roleId: string, request: AssignRolePermissionsRequest, operatorId?: string | null): Promise<PlatformRoleSummary> {
        const role = await this.platformRepository.findRoleById(roleId);
        if (!role) throw new NotFoundException(`Role ${roleId} not found`);
        const previousPermissionKeys = (await this.platformRepository.findActiveRolePermissionAssignments())
            .filter((assignment) => assignment.roleId === roleId)
            .map((assignment) => assignment.permissionKey);

        await this.platformRepository.deleteRolePermissionAssignments(roleId);
        const assignments = request.permissionKeys.map((permissionKey) =>
            this.platformRepository.createRolePermissionAssignment({
                roleId,
                permissionKey,
                status: 'active',
                assignedBy: null,
                revokedAt: null,
                revokedBy: null,
                changeReason: null,
                createdBy: null
            })
        );
        await this.platformRepository.saveAll(assignments);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.role.permissions.replaced',
            targetType: 'PlatformRole',
            targetId: roleId,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot: {
                permissionKeys: previousPermissionKeys
            },
            afterSnapshot: {
                permissionKeys: request.permissionKeys
            }
        });
        return this.#toRoleSummary(role);
    }

    async listOrgUnits(): Promise<PlatformOrgUnitSummary[]> {
        const orgUnits = await this.platformRepository.findAllOrgUnits();
        return orgUnits.map((orgUnit) => this.#toOrgUnitSummary(orgUnit));
    }

    async listOrgUnitTree(): Promise<PlatformOrgUnitTree> {
        const orgUnits = await this.platformRepository.findAllOrgUnits();
        const membershipCountsByOrgUnitId = await this.#getActiveMembershipCountsByOrgUnitId();

        return this.#buildOrgUnitTree(orgUnits, membershipCountsByOrgUnitId);
    }

    async getOrgUnit(id: string): Promise<PlatformOrgUnitDetail> {
        const orgUnits = await this.platformRepository.findAllOrgUnits();
        const orgUnit = orgUnits.find((candidate) => candidate.id === id);
        if (!orgUnit) throw new NotFoundException(`OrgUnit ${id} not found`);

        const children = orgUnits.filter((candidate) => candidate.parentId === id);
        const activeMembershipCount = (await this.#getActiveMembershipCountsByOrgUnitId()).get(id) ?? 0;

        return {
            ...this.#toOrgUnitSummary(orgUnit),
            childCount: children.length,
            activeMembershipCount,
            canDelete: children.length === 0 && activeMembershipCount === 0
        };
    }

    async createOrgUnit(request: CreateOrgUnitRequest, operatorId?: string | null): Promise<PlatformOrgUnitSummary> {
        const existing = await this.platformRepository.findOrgUnitByCode(request.code);
        if (existing) throw new ConflictException(`OrgUnit code ${request.code} already exists`);

        const orgUnits = await this.platformRepository.findAllOrgUnits();
        const parent = this.#resolveRequestedParent(orgUnits, request.parentId);
        this.#assertSiblingNameAvailable(orgUnits, parent?.id ?? null, request.name);

        const orgUnit = this.platformRepository.createOrgUnit({
            name: request.name,
            code: request.code,
            description: request.description ?? null,
            parentId: request.parentId ?? null,
            isActive: true,
            displayOrder: this.#resolveDisplayOrder(orgUnits, parent?.id ?? null, request.displayOrder),
            createdBy: null,
            updatedBy: null
        });
        await this.platformRepository.saveAll([orgUnit]);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.org-unit.created',
            targetType: 'OrgUnit',
            targetId: orgUnit.id,
            operatorId: operatorId ?? null,
            result: 'success',
            afterSnapshot: {
                code: orgUnit.code,
                name: orgUnit.name,
                parentId: orgUnit.parentId,
                displayOrder: orgUnit.displayOrder,
                isActive: orgUnit.isActive
            }
        });
        return this.#toOrgUnitSummary(orgUnit);
    }

    async updateOrgUnit(id: string, request: UpdateOrgUnitRequest, operatorId?: string | null): Promise<PlatformOrgUnitSummary> {
        const orgUnits = await this.platformRepository.findAllOrgUnits();
        const orgUnit = await this.platformRepository.findOrgUnitById(id);
        if (!orgUnit) throw new NotFoundException(`OrgUnit ${id} not found`);
        const beforeSnapshot = {
            name: orgUnit.name,
            code: orgUnit.code,
            description: orgUnit.description,
            displayOrder: orgUnit.displayOrder
        };

        if (request.code !== undefined && request.code !== orgUnit.code) {
            const existing = await this.platformRepository.findOrgUnitByCode(request.code);
            if (existing && existing.id !== orgUnit.id) throw new ConflictException(`OrgUnit code ${request.code} already exists`);
            orgUnit.code = request.code;
        }
        if (request.name !== undefined && request.name !== orgUnit.name) {
            this.#assertSiblingNameAvailable(orgUnits, orgUnit.parentId ?? null, request.name, orgUnit.id);
            orgUnit.name = request.name;
        }
        if (request.description !== undefined) orgUnit.description = request.description ?? null;
        if (request.displayOrder !== undefined) orgUnit.displayOrder = request.displayOrder;

        await this.platformRepository.saveAll([orgUnit]);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.org-unit.updated',
            targetType: 'OrgUnit',
            targetId: orgUnit.id,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot,
            afterSnapshot: {
                name: orgUnit.name,
                code: orgUnit.code,
                description: orgUnit.description,
                displayOrder: orgUnit.displayOrder
            }
        });
        return this.#toOrgUnitSummary(orgUnit);
    }

    async activateOrgUnit(id: string, request: UpdateOrgUnitActivationRequest, operatorId?: string | null): Promise<PlatformOrgUnitSummary> {
        const orgUnits = await this.platformRepository.findAllOrgUnits();
        const orgUnit = orgUnits.find((candidate) => candidate.id === id);
        if (!orgUnit) throw new NotFoundException(`OrgUnit ${id} not found`);

        const parent = orgUnit.parentId ? orgUnits.find((candidate) => candidate.id === orgUnit.parentId) ?? null : null;
        if (parent && !parent.isActive) {
            await this.runtimeAuditService.recordAuditLog({
                eventType: 'platform.org-unit.activate.rejected',
                targetType: 'OrgUnit',
                targetId: orgUnit.id,
                operatorId: operatorId ?? null,
                result: 'rejected',
                reason: 'inactive-parent',
                beforeSnapshot: { isActive: orgUnit.isActive, parentId: orgUnit.parentId },
                metadata: { request }
            });
            throw new ConflictException(`OrgUnit ${id} cannot be activated under an inactive parent`);
        }

        const beforeSnapshot = { isActive: orgUnit.isActive };
        orgUnit.isActive = true;
        await this.platformRepository.saveAll([orgUnit]);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.org-unit.activated',
            targetType: 'OrgUnit',
            targetId: orgUnit.id,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot,
            afterSnapshot: { isActive: orgUnit.isActive }
        });
        return this.#toOrgUnitSummary(orgUnit);
    }

    async deactivateOrgUnit(id: string, request: UpdateOrgUnitActivationRequest, operatorId?: string | null): Promise<PlatformOrgUnitSummary> {
        const orgUnits = await this.platformRepository.findAllOrgUnits();
        const orgUnit = orgUnits.find((candidate) => candidate.id === id);
        if (!orgUnit) throw new NotFoundException(`OrgUnit ${id} not found`);

        const descendantIds = this.#collectDescendantIds(orgUnits, id);
        const affectedOrgUnits = orgUnits.filter((candidate) => candidate.id === id || descendantIds.has(candidate.id));
        const beforeSnapshot = affectedOrgUnits.map((candidate) => ({ id: candidate.id, isActive: candidate.isActive }));
        for (const candidate of affectedOrgUnits) {
            candidate.isActive = false;
        }

        await this.platformRepository.saveAll(affectedOrgUnits);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.org-unit.deactivated',
            targetType: 'OrgUnit',
            targetId: orgUnit.id,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot: {
                orgUnits: beforeSnapshot
            },
            afterSnapshot: {
                orgUnits: affectedOrgUnits.map((candidate) => ({ id: candidate.id, isActive: candidate.isActive }))
            },
            metadata: {
                request,
                cascadedCount: Math.max(affectedOrgUnits.length - 1, 0)
            }
        });
        return this.#toOrgUnitSummary(orgUnit);
    }

    async moveOrgUnit(id: string, request: MoveOrgUnitRequest, operatorId?: string | null): Promise<PlatformOrgUnitSummary> {
        const orgUnits = await this.platformRepository.findAllOrgUnits();
        const orgUnit = orgUnits.find((candidate) => candidate.id === id);
        if (!orgUnit) throw new NotFoundException(`OrgUnit ${id} not found`);

        const nextParentId = request.parentId !== undefined ? request.parentId : orgUnit.parentId ?? null;
        const nextParent = this.#resolveRequestedParent(orgUnits, nextParentId);

        if (nextParent && !nextParent.isActive) {
            await this.runtimeAuditService.recordAuditLog({
                eventType: 'platform.org-unit.move.rejected',
                targetType: 'OrgUnit',
                targetId: orgUnit.id,
                operatorId: operatorId ?? null,
                result: 'rejected',
                reason: 'inactive-parent',
                beforeSnapshot: { parentId: orgUnit.parentId, displayOrder: orgUnit.displayOrder },
                metadata: { request }
            });
            throw new ConflictException(`OrgUnit ${id} cannot move under an inactive parent`);
        }

        const descendantIds = this.#collectDescendantIds(orgUnits, id);
        if (nextParent && descendantIds.has(nextParent.id)) {
            await this.runtimeAuditService.recordAuditLog({
                eventType: 'platform.org-unit.move.rejected',
                targetType: 'OrgUnit',
                targetId: orgUnit.id,
                operatorId: operatorId ?? null,
                result: 'rejected',
                reason: 'cycle-detected',
                beforeSnapshot: { parentId: orgUnit.parentId, displayOrder: orgUnit.displayOrder },
                metadata: { request }
            });
            throw new ConflictException(`OrgUnit ${id} cannot move under its own descendant`);
        }

        this.#assertSiblingNameAvailable(orgUnits, nextParent?.id ?? null, orgUnit.name, orgUnit.id);

        const beforeSnapshot = {
            parentId: orgUnit.parentId,
            displayOrder: orgUnit.displayOrder
        };

        orgUnit.parentId = nextParent?.id ?? null;
        orgUnit.displayOrder = this.#resolveDisplayOrder(
            orgUnits.filter((candidate) => candidate.id !== orgUnit.id),
            orgUnit.parentId ?? null,
            request.displayOrder ?? orgUnit.displayOrder
        );

        await this.platformRepository.saveAll([orgUnit]);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.org-unit.moved',
            targetType: 'OrgUnit',
            targetId: orgUnit.id,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot,
            afterSnapshot: {
                parentId: orgUnit.parentId,
                displayOrder: orgUnit.displayOrder
            },
            metadata: {
                request
            }
        });
        return this.#toOrgUnitSummary(orgUnit);
    }

    async createUser(request: CreatePlatformUserRequest, operatorId?: string | null) {
        const existingUser = await this.platformRepository.findUserByUsername(request.username);
        if (existingUser) {
            throw new ConflictException(`Platform user ${request.username} already exists`);
        }

        if (request.primaryOrgUnitId) {
            await this.#assertOrgUnitIdsAreActive([request.primaryOrgUnitId]);
        }
 
        const user = this.platformRepository.createUser({
            username: request.username,
            displayName: request.displayName,
            email: request.email ?? null,
            phone: request.phone ?? null,
            avatarUrl: null,
            isActive: true,
            primaryOrgUnitId: request.primaryOrgUnitId,
            lastLoginAt: null,
            createdBy: null,
            updatedBy: null
        });

        const memberships = request.primaryOrgUnitId
            ? [
                  this.platformRepository.createUserOrgMembership({
                      userId: user.id,
                      orgUnitId: request.primaryOrgUnitId,
                      membershipType: 'primary',
                      assignedBy: null,
                      createdBy: null
                  })
              ]
            : [];

        const roleAssignments = request.initialRoleIds.map((roleId) =>
            this.platformRepository.createUserRoleAssignment({
                userId: user.id,
                roleId,
                assignedBy: null,
                createdBy: null
            })
        );

        await this.platformRepository.saveAll([user, ...memberships, ...roleAssignments]);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.user.created',
            targetType: 'PlatformUser',
            targetId: user.id,
            operatorId: operatorId ?? null,
            result: 'success',
            afterSnapshot: {
                username: user.username,
                displayName: user.displayName,
                primaryOrgUnitId: user.primaryOrgUnitId,
                initialRoleIds: request.initialRoleIds
            }
        });

        return user;
    }

    async activateUser(userId: string, request: UpdatePlatformUserActivationRequest, operatorId?: string | null) {
        const user = await this.platformRepository.findUserById(userId);
        if (!user) throw new NotFoundException(`Platform user ${userId} not found`);
        void request;
        const beforeIsActive = user.isActive;
        user.isActive = true;
        await this.platformRepository.saveAll([user]);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.user.activated',
            targetType: 'PlatformUser',
            targetId: user.id,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot: { isActive: beforeIsActive },
            afterSnapshot: { isActive: user.isActive }
        });
        return user;
    }

    async deactivateUser(userId: string, request: UpdatePlatformUserActivationRequest, operatorId?: string | null) {
        const user = await this.platformRepository.findUserById(userId);
        if (!user) throw new NotFoundException(`Platform user ${userId} not found`);
        void request;
        const beforeIsActive = user.isActive;
        user.isActive = false;
        await this.platformRepository.saveAll([user]);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.user.deactivated',
            targetType: 'PlatformUser',
            targetId: user.id,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot: { isActive: beforeIsActive },
            afterSnapshot: { isActive: user.isActive }
        });
        return user;
    }

    async assignUserRoles(userId: string, request: AssignUserRolesRequest, operatorId?: string | null) {
        const user = await this.platformRepository.findUserById(userId);
        if (!user) throw new NotFoundException(`Platform user ${userId} not found`);
        const previousRoleIds = (await this.platformRepository.findActiveUserRoleAssignments())
            .filter((assignment) => assignment.userId === userId)
            .map((assignment) => assignment.roleId);

        await this.platformRepository.deleteUserRoleAssignments(userId);
        const assignments = request.roleIds.map((roleId) =>
            this.platformRepository.createUserRoleAssignment({
                userId,
                roleId,
                assignedBy: null,
                createdBy: null
            })
        );
        await this.platformRepository.saveAll(assignments);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.user.roles.replaced',
            targetType: 'PlatformUser',
            targetId: userId,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot: {
                roleIds: previousRoleIds
            },
            afterSnapshot: {
                roleIds: request.roleIds
            }
        });
        return this.getSanitizedUserProfile(userId, { username: user.username, permissions: [] });
    }

    async assignUserOrgMemberships(userId: string, request: AssignUserOrgMembershipsRequest, operatorId?: string | null) {
        const user = await this.platformRepository.findUserById(userId);
        if (!user) throw new NotFoundException(`Platform user ${userId} not found`);
        const uniqueTargetIds = new Set([request.primaryOrgUnitId, ...request.secondaryOrgUnitIds]);
        if (uniqueTargetIds.size !== request.secondaryOrgUnitIds.length + 1) {
            throw new ConflictException('Duplicate org unit assignments are not allowed');
        }
        await this.#assertOrgUnitIdsAreActive([...uniqueTargetIds]);
        const previousMemberships = (await this.platformRepository.findActiveUserOrgMemberships())
            .filter((membership) => membership.userId === userId)
            .map((membership) => ({
                orgUnitId: membership.orgUnitId,
                membershipType: membership.membershipType
            }));

        await this.platformRepository.deleteUserOrgMemberships(userId);
        user.primaryOrgUnitId = request.primaryOrgUnitId;

        const memberships = [
            this.platformRepository.createUserOrgMembership({
                userId,
                orgUnitId: request.primaryOrgUnitId,
                membershipType: 'primary',
                assignedBy: null,
                createdBy: null
            }),
            ...request.secondaryOrgUnitIds.map((orgUnitId) =>
                this.platformRepository.createUserOrgMembership({
                    userId,
                    orgUnitId,
                    membershipType: 'secondary',
                    assignedBy: null,
                    createdBy: null
                })
            )
        ];

        await this.platformRepository.saveAll([user, ...memberships]);
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.user.org-memberships.replaced',
            targetType: 'PlatformUser',
            targetId: userId,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot: {
                memberships: previousMemberships
            },
            afterSnapshot: {
                primaryOrgUnitId: request.primaryOrgUnitId,
                secondaryOrgUnitIds: request.secondaryOrgUnitIds
            }
        });
        return this.getSanitizedUserProfile(userId, { username: user.username, permissions: [] });
    }

    async syncNavigationAudit(operatorId?: string | null, requestId?: string | null): Promise<NavigationSyncSummary> {
        const snapshot = this.navigationService.getNavigationAuditSnapshot();
        await this.runtimeAuditService.recordAuditLog({
            eventType: 'platform.navigation.synced',
            targetType: 'NavigationTree',
            targetId: snapshot.targetId,
            operatorId: operatorId ?? null,
            requestId: requestId ?? null,
            result: 'success',
            afterSnapshot: snapshot,
            metadata: {
                source: 'static-navigation-ssot'
            }
        });
        return snapshot;
    }

    async #loadUserAggregationContext() {
        const [users, roles, orgUnits, userRoleAssignments, userOrgMemberships] = await Promise.all([
            this.platformRepository.findAllUsers(),
            this.platformRepository.findAllRoles(),
            this.platformRepository.findAllOrgUnits(),
            this.platformRepository.findActiveUserRoleAssignments(),
            this.platformRepository.findActiveUserOrgMemberships()
        ]);

        const orgUnitMap = new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit]));
        const roleMap = new Map(roles.map((role) => [role.id, role]));

        const roleNamesByUserId = new Map<string, string[]>();
        for (const assignment of userRoleAssignments) {
            const roleName = roleMap.get(assignment.roleId)?.name;
            if (!roleName) continue;

            const current = roleNamesByUserId.get(assignment.userId) ?? [];
            current.push(roleName);
            roleNamesByUserId.set(assignment.userId, current);
        }

        const primaryOrgByUserId = new Map<string, string>();
        for (const membership of userOrgMemberships) {
            if (membership.membershipType !== 'primary') continue;
            primaryOrgByUserId.set(membership.userId, membership.orgUnitId);
        }

        return { users, orgUnitMap, roleNamesByUserId, primaryOrgByUserId };
    }

    async #assertOrgUnitIdsAreActive(orgUnitIds: string[]): Promise<void> {
        const uniqueOrgUnitIds = [...new Set(orgUnitIds)];
        if (uniqueOrgUnitIds.length === 0) return;

        const orgUnits = await this.platformRepository.findAllOrgUnits();
        const orgUnitMap = new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit]));

        for (const orgUnitId of uniqueOrgUnitIds) {
            const orgUnit = orgUnitMap.get(orgUnitId);
            if (!orgUnit) throw new NotFoundException(`OrgUnit ${orgUnitId} not found`);
            if (!orgUnit.isActive) throw new ConflictException(`OrgUnit ${orgUnitId} is inactive`);
        }
    }

    async #getActiveMembershipCountsByOrgUnitId(): Promise<Map<string, number>> {
        const counts = new Map<string, number>();
        for (const membership of await this.platformRepository.findActiveUserOrgMemberships()) {
            counts.set(membership.orgUnitId, (counts.get(membership.orgUnitId) ?? 0) + 1);
        }
        return counts;
    }

    #resolveRequestedParent(orgUnits: OrgUnit[], parentId: string | null | undefined): OrgUnit | null {
        if (!parentId) return null;
        const parent = orgUnits.find((candidate) => candidate.id === parentId);
        if (!parent) throw new NotFoundException(`OrgUnit ${parentId} not found`);
        if (!parent.isActive) throw new ConflictException(`OrgUnit ${parentId} is inactive`);
        return parent;
    }

    #assertSiblingNameAvailable(orgUnits: OrgUnit[], parentId: string | null, name: string, excludedOrgUnitId?: string): void {
        const normalizedName = name.trim().toLocaleLowerCase();
        const conflict = orgUnits.find(
            (candidate) =>
                candidate.id !== excludedOrgUnitId &&
                (candidate.parentId ?? null) === parentId &&
                candidate.name.trim().toLocaleLowerCase() === normalizedName
        );

        if (conflict) {
            throw new ConflictException(`OrgUnit name ${name} already exists under the same parent`);
        }
    }

    #resolveDisplayOrder(orgUnits: OrgUnit[], parentId: string | null, requestedDisplayOrder: number | undefined): number {
        if (requestedDisplayOrder !== undefined) return requestedDisplayOrder;

        const siblingDisplayOrders = orgUnits
            .filter((candidate) => (candidate.parentId ?? null) === parentId)
            .map((candidate) => candidate.displayOrder);

        return siblingDisplayOrders.length === 0 ? 0 : Math.max(...siblingDisplayOrders) + 1;
    }

    #collectDescendantIds(orgUnits: OrgUnit[], rootId: string): Set<string> {
        const descendants = new Set<string>();
        const queue = [rootId];

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (!currentId) continue;

            for (const candidate of orgUnits) {
                if (candidate.parentId !== currentId || descendants.has(candidate.id)) continue;
                descendants.add(candidate.id);
                queue.push(candidate.id);
            }
        }

        return descendants;
    }

    #buildOrgUnitTree(orgUnits: OrgUnit[], membershipCountsByOrgUnitId: Map<string, number>): PlatformOrgUnitTree {
        const sortedOrgUnits = [...orgUnits].sort((left, right) => this.#compareOrgUnits(left, right));
        const childrenByParentId = new Map<string | null, OrgUnit[]>();

        for (const orgUnit of sortedOrgUnits) {
            const parentId = orgUnit.parentId ?? null;
            const siblings = childrenByParentId.get(parentId) ?? [];
            siblings.push(orgUnit);
            childrenByParentId.set(parentId, siblings);
        }

        const buildNode = (orgUnit: OrgUnit): OrgUnitTreeNode => {
            const children = (childrenByParentId.get(orgUnit.id) ?? []).map(buildNode);
            const activeMembershipCount = membershipCountsByOrgUnitId.get(orgUnit.id) ?? 0;

            return {
                ...this.#toOrgUnitSummary(orgUnit),
                childCount: children.length,
                activeMembershipCount,
                canDelete: children.length === 0 && activeMembershipCount === 0,
                children
            };
        };

        return (childrenByParentId.get(null) ?? []).map(buildNode);
    }

    #compareOrgUnits(left: OrgUnit, right: OrgUnit): number {
        return (
            left.displayOrder - right.displayOrder ||
            left.createdAt.getTime() - right.createdAt.getTime() ||
            left.name.localeCompare(right.name, 'zh-CN') ||
            left.id.localeCompare(right.id)
        );
    }

    #toRoleSummary(role: PlatformRole): PlatformRoleSummary {
        return {
            id: role.id,
            roleKey: role.roleKey,
            name: role.name,
            description: role.description ?? null,
            isActive: role.isActive,
            isSystemRole: role.isSystemRole,
            displayOrder: role.displayOrder,
            createdAt: role.createdAt.toISOString(),
            updatedAt: role.updatedAt.toISOString()
        };
    }

    #toOrgUnitSummary(orgUnit: OrgUnit): PlatformOrgUnitSummary {
        return {
            id: orgUnit.id,
            name: orgUnit.name,
            code: orgUnit.code,
            description: orgUnit.description ?? null,
            parentId: orgUnit.parentId ?? null,
            isActive: orgUnit.isActive,
            displayOrder: orgUnit.displayOrder,
            createdAt: orgUnit.createdAt.toISOString(),
            updatedAt: orgUnit.updatedAt.toISOString()
        };
    }
}
