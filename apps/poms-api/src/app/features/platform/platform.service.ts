import type { AssignRolePermissionsRequest, AssignUserOrgMembershipsRequest, AssignUserRolesRequest, CreateOrgUnitRequest, CreatePlatformUserRequest, CreateRoleRequest, PermissionKey, PlatformOrgUnitSummary, PlatformRoleSummary, PlatformUserList, PlatformUserSummary, SanitizedUserWithOrgUnits, UpdateOrgUnitRequest, UpdatePlatformUserActivationRequest } from '@poms/shared-contracts';
import { ConflictException, NotFoundException, Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { OrgUnit } from './org-unit.entity';
import { PlatformRepository } from './platform.repository';
import { PlatformRole } from './role.entity';

@Injectable()
export class PlatformService {
    constructor(private readonly platformRepository: PlatformRepository) {}

    async verifyCredentials(username: string, password: string): Promise<{ userId: string; username: string; permissions: PermissionKey[] } | null> {
        const user = await this.platformRepository.findActiveUserByUsername(username);
        if (!user || !user.passwordHash) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        const permissions = await this.getPermissionsForUser(user.id);
        return { userId: user.id, username: user.username, permissions };
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

    async createRole(request: CreateRoleRequest): Promise<PlatformRoleSummary> {
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
        return this.#toRoleSummary(role);
    }

    async assignRolePermissions(roleId: string, request: AssignRolePermissionsRequest): Promise<PlatformRoleSummary> {
        const role = await this.platformRepository.findRoleById(roleId);
        if (!role) throw new NotFoundException(`Role ${roleId} not found`);

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
        return this.#toRoleSummary(role);
    }

    async listOrgUnits(): Promise<PlatformOrgUnitSummary[]> {
        const orgUnits = await this.platformRepository.findAllOrgUnits();
        return orgUnits.map((orgUnit) => this.#toOrgUnitSummary(orgUnit));
    }

    async createOrgUnit(request: CreateOrgUnitRequest): Promise<PlatformOrgUnitSummary> {
        const existing = await this.platformRepository.findOrgUnitByCode(request.code);
        if (existing) throw new ConflictException(`OrgUnit code ${request.code} already exists`);

        const orgUnit = this.platformRepository.createOrgUnit({
            name: request.name,
            code: request.code,
            description: request.description ?? null,
            parentId: request.parentId ?? null,
            isActive: true,
            displayOrder: request.displayOrder ?? 0,
            createdBy: null,
            updatedBy: null
        });
        await this.platformRepository.saveAll([orgUnit]);
        return this.#toOrgUnitSummary(orgUnit);
    }

    async updateOrgUnit(id: string, request: UpdateOrgUnitRequest): Promise<PlatformOrgUnitSummary> {
        const orgUnit = await this.platformRepository.findOrgUnitById(id);
        if (!orgUnit) throw new NotFoundException(`OrgUnit ${id} not found`);

        if (request.name !== undefined) orgUnit.name = request.name;
        if (request.description !== undefined) orgUnit.description = request.description ?? null;
        if (request.displayOrder !== undefined) orgUnit.displayOrder = request.displayOrder;

        await this.platformRepository.saveAll([orgUnit]);
        return this.#toOrgUnitSummary(orgUnit);
    }

    async createUser(request: CreatePlatformUserRequest) {
        const existingUser = await this.platformRepository.findUserByUsername(request.username);
        if (existingUser) {
            throw new ConflictException(`Platform user ${request.username} already exists`);
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

        return user;
    }

    async activateUser(userId: string, request: UpdatePlatformUserActivationRequest) {
        const user = await this.platformRepository.findUserById(userId);
        if (!user) throw new NotFoundException(`Platform user ${userId} not found`);
        void request;
        user.isActive = true;
        await this.platformRepository.saveAll([user]);
        return user;
    }

    async deactivateUser(userId: string, request: UpdatePlatformUserActivationRequest) {
        const user = await this.platformRepository.findUserById(userId);
        if (!user) throw new NotFoundException(`Platform user ${userId} not found`);
        void request;
        user.isActive = false;
        await this.platformRepository.saveAll([user]);
        return user;
    }

    async assignUserRoles(userId: string, request: AssignUserRolesRequest) {
        const user = await this.platformRepository.findUserById(userId);
        if (!user) throw new NotFoundException(`Platform user ${userId} not found`);

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
        return this.getSanitizedUserProfile(userId, { username: user.username, permissions: [] });
    }

    async assignUserOrgMemberships(userId: string, request: AssignUserOrgMembershipsRequest) {
        const user = await this.platformRepository.findUserById(userId);
        if (!user) throw new NotFoundException(`Platform user ${userId} not found`);

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
        return this.getSanitizedUserProfile(userId, { username: user.username, permissions: [] });
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
