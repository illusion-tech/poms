import { computed, inject, Injectable, signal } from '@angular/core';
import type {
    AssignRolePermissionsRequest,
    AssignUserOrgMembershipsRequest,
    AssignUserRolesRequest,
    CreateOrgUnitRequest,
    CreatePlatformUserRequest,
    CreateRoleRequest,
    MoveOrgUnitRequest,
    PlatformPermissionSummary,
    PlatformOrgUnitSummary,
    PlatformRoleDetail,
    PlatformRoleSummary,
    PlatformUserSummary,
    UpdateOrgUnitActivationRequest,
    UpdateOrgUnitRequest,
    UpdateRoleActivationRequest,
    UpdateRoleRequest
} from '@poms/shared-api-client';
import { PlatformApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PlatformStore {
    readonly #platformApi = inject(PlatformApi);

    // ── Users ──────────────────────────────────────────────────────────────

    readonly #users = signal<PlatformUserSummary[]>([]);
    readonly #loadingUsers = signal(false);
    readonly #loadedUsers = signal(false);
    readonly #savingUser = signal(false);

    readonly users = this.#users.asReadonly();
    readonly loadingUsers = this.#loadingUsers.asReadonly();
    readonly loadedUsers = this.#loadedUsers.asReadonly();
    readonly savingUser = this.#savingUser.asReadonly();
    readonly activeUsersCount = computed(() => this.#users().filter((user) => user.isActive).length);

    async loadUsers() {
        this.#loadingUsers.set(true);
        try {
            const users = await firstValueFrom(this.#platformApi.platformControllerListUsers());
            this.#users.set(users ?? []);
            this.#loadedUsers.set(true);
            return users;
        } finally {
            this.#loadingUsers.set(false);
        }
    }

    async createUser(body: CreatePlatformUserRequest) {
        this.#savingUser.set(true);
        try {
            const created = await firstValueFrom(this.#platformApi.platformControllerCreateUser({ createPlatformUserRequest: body }));
            await this.loadUsers();
            return created;
        } finally {
            this.#savingUser.set(false);
        }
    }

    async activateUser(id: string) {
        this.#savingUser.set(true);
        try {
            await firstValueFrom(this.#platformApi.platformControllerActivateUser({ id, updatePlatformUserActivationRequest: {} }));
            this.#users.update((list) => list.map((u) => (u.id === id ? { ...u, isActive: true } : u)));
        } finally {
            this.#savingUser.set(false);
        }
    }

    async deactivateUser(id: string) {
        this.#savingUser.set(true);
        try {
            await firstValueFrom(this.#platformApi.platformControllerDeactivateUser({ id, updatePlatformUserActivationRequest: {} }));
            this.#users.update((list) => list.map((u) => (u.id === id ? { ...u, isActive: false } : u)));
        } finally {
            this.#savingUser.set(false);
        }
    }

    async assignUserRoles(id: string, body: AssignUserRolesRequest) {
        this.#savingUser.set(true);
        try {
            await firstValueFrom(this.#platformApi.platformControllerAssignUserRoles({ id, assignUserRolesRequest: body }));
            await this.loadUsers();
        } finally {
            this.#savingUser.set(false);
        }
    }

    async assignUserOrgMemberships(id: string, body: AssignUserOrgMembershipsRequest) {
        this.#savingUser.set(true);
        try {
            await firstValueFrom(this.#platformApi.platformControllerAssignUserOrgMemberships({ id, assignUserOrgMembershipsRequest: body }));
            await this.loadUsers();
        } finally {
            this.#savingUser.set(false);
        }
    }

    // ── Roles ──────────────────────────────────────────────────────────────

    readonly #roles = signal<PlatformRoleSummary[]>([]);
    readonly #permissions = signal<PlatformPermissionSummary[]>([]);
    readonly #activeRoleDetail = signal<PlatformRoleDetail | null>(null);
    readonly #loadingRoles = signal(false);
    readonly #loadedRoles = signal(false);
    readonly #savingRole = signal(false);

    readonly roles = this.#roles.asReadonly();
    readonly permissions = this.#permissions.asReadonly();
    readonly activeRoleDetail = this.#activeRoleDetail.asReadonly();
    readonly loadingRoles = this.#loadingRoles.asReadonly();
    readonly loadedRoles = this.#loadedRoles.asReadonly();
    readonly savingRole = this.#savingRole.asReadonly();

    async loadRoles() {
        this.#loadingRoles.set(true);
        try {
            const roles = await firstValueFrom(this.#platformApi.platformControllerListRoles());
            this.#roles.set(roles ?? []);
            this.#loadedRoles.set(true);
            return roles;
        } finally {
            this.#loadingRoles.set(false);
        }
    }

    async createRole(body: CreateRoleRequest) {
        this.#savingRole.set(true);
        try {
            const created = await firstValueFrom(this.#platformApi.platformControllerCreateRole({ createRoleRequest: body }));
            await this.loadRoles();
            return created;
        } finally {
            this.#savingRole.set(false);
        }
    }

    async loadPermissions() {
        const permissions = await firstValueFrom(this.#platformApi.platformControllerListPermissions());
        this.#permissions.set(permissions ?? []);
        return permissions;
    }

    async loadRoleDetail(id: string) {
        const role = await firstValueFrom(this.#platformApi.platformControllerGetRole({ id }));
        this.#activeRoleDetail.set(role);
        return role;
    }

    clearActiveRoleDetail() {
        this.#activeRoleDetail.set(null);
    }

    async updateRole(id: string, body: UpdateRoleRequest) {
        this.#savingRole.set(true);
        try {
            const updated = await firstValueFrom(this.#platformApi.platformControllerUpdateRole({ id, updateRoleRequest: body }));
            await this.loadRoles();
            this.#activeRoleDetail.update((current) => (current && current.id === id ? { ...current, ...updated } : current));
            return updated;
        } finally {
            this.#savingRole.set(false);
        }
    }

    async activateRole(id: string, body: UpdateRoleActivationRequest = {}) {
        this.#savingRole.set(true);
        try {
            const updated = await firstValueFrom(this.#platformApi.platformControllerActivateRole({ id, updateRoleActivationRequest: body }));
            await this.loadRoles();
            this.#activeRoleDetail.update((current) => (current && current.id === id ? { ...current, ...updated } : current));
            return updated;
        } finally {
            this.#savingRole.set(false);
        }
    }

    async deactivateRole(id: string, body: UpdateRoleActivationRequest = {}) {
        this.#savingRole.set(true);
        try {
            const updated = await firstValueFrom(this.#platformApi.platformControllerDeactivateRole({ id, updateRoleActivationRequest: body }));
            await this.loadRoles();
            this.#activeRoleDetail.update((current) => (current && current.id === id ? { ...current, ...updated } : current));
            return updated;
        } finally {
            this.#savingRole.set(false);
        }
    }

    async assignRolePermissions(id: string, body: AssignRolePermissionsRequest) {
        this.#savingRole.set(true);
        try {
            await firstValueFrom(this.#platformApi.platformControllerAssignRolePermissions({ id, assignRolePermissionsRequest: body }));
            await this.loadRoles();
            await this.loadRoleDetail(id);
        } finally {
            this.#savingRole.set(false);
        }
    }

    // ── Org Units ──────────────────────────────────────────────────────────

    readonly #orgUnits = signal<PlatformOrgUnitSummary[]>([]);
    readonly #loadingOrgUnits = signal(false);
    readonly #loadedOrgUnits = signal(false);
    readonly #savingOrgUnit = signal(false);

    readonly orgUnits = this.#orgUnits.asReadonly();
    readonly loadingOrgUnits = this.#loadingOrgUnits.asReadonly();
    readonly loadedOrgUnits = this.#loadedOrgUnits.asReadonly();
    readonly savingOrgUnit = this.#savingOrgUnit.asReadonly();

    async loadOrgUnits() {
        this.#loadingOrgUnits.set(true);
        try {
            const orgUnits = await firstValueFrom(this.#platformApi.platformControllerListOrgUnits());
            this.#orgUnits.set(orgUnits ?? []);
            this.#loadedOrgUnits.set(true);
            return orgUnits;
        } finally {
            this.#loadingOrgUnits.set(false);
        }
    }

    async createOrgUnit(body: CreateOrgUnitRequest) {
        this.#savingOrgUnit.set(true);
        try {
            const created = await firstValueFrom(this.#platformApi.platformControllerCreateOrgUnit({ createOrgUnitRequest: body }));
            await this.loadOrgUnits();
            return created;
        } finally {
            this.#savingOrgUnit.set(false);
        }
    }

    async updateOrgUnit(id: string, body: UpdateOrgUnitRequest) {
        this.#savingOrgUnit.set(true);
        try {
            const updated = await firstValueFrom(this.#platformApi.platformControllerUpdateOrgUnit({ id, updateOrgUnitRequest: body }));
            await this.loadOrgUnits();
            return updated;
        } finally {
            this.#savingOrgUnit.set(false);
        }
    }

    async activateOrgUnit(id: string, body: UpdateOrgUnitActivationRequest = {}) {
        this.#savingOrgUnit.set(true);
        try {
            const updated = await firstValueFrom(this.#platformApi.platformControllerActivateOrgUnit({ id, updateOrgUnitActivationRequest: body }));
            await this.loadOrgUnits();
            return updated;
        } finally {
            this.#savingOrgUnit.set(false);
        }
    }

    async deactivateOrgUnit(id: string, body: UpdateOrgUnitActivationRequest = {}) {
        this.#savingOrgUnit.set(true);
        try {
            const updated = await firstValueFrom(this.#platformApi.platformControllerDeactivateOrgUnit({ id, updateOrgUnitActivationRequest: body }));
            await this.loadOrgUnits();
            return updated;
        } finally {
            this.#savingOrgUnit.set(false);
        }
    }

    async moveOrgUnit(id: string, body: MoveOrgUnitRequest) {
        this.#savingOrgUnit.set(true);
        try {
            const updated = await firstValueFrom(this.#platformApi.platformControllerMoveOrgUnit({ id, moveOrgUnitRequest: body }));
            await this.loadOrgUnits();
            return updated;
        } finally {
            this.#savingOrgUnit.set(false);
        }
    }
}
