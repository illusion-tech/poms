/**
 * POMS API
 *
 *
 *
 * NOTE: This class is auto generated style-compatible shim written manually until OpenAPI regeneration catches up.
 */

import { Inject, Injectable, Optional } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { PlatformUserList, PlatformUserListItem } from '../model/platform-user-list';
import type { PlatformRoleSummary } from '../model/platform-role-summary';
import type { PlatformOrgUnitSummary } from '../model/platform-org-unit-summary';
import type { CreatePlatformUserRequest } from '../model/create-platform-user-request';
import type { AssignUserRolesRequest } from '../model/assign-user-roles-request';
import type { AssignUserOrgMembershipsRequest } from '../model/assign-user-org-memberships-request';
import type { CreateRoleRequest } from '../model/create-role-request';
import type { AssignRolePermissionsRequest } from '../model/assign-role-permissions-request';
import type { CreateOrgUnitRequest } from '../model/create-org-unit-request';
import type { UpdateOrgUnitRequest } from '../model/update-org-unit-request';
import { BASE_PATH } from '../variables';
import { PomsApiConfiguration } from '../configuration';
import { BaseService } from '../api.base.service';

@Injectable({
    providedIn: 'root'
})
export class PlatformApi extends BaseService {
    constructor(
        protected httpClient: HttpClient,
        @Optional() @Inject(BASE_PATH) basePath: string | string[],
        @Optional() configuration?: PomsApiConfiguration
    ) {
        super(basePath, configuration);
    }

    private get headers() {
        let h = this.defaultHeaders;
        h = this.configuration.addCredentialToHeaders('bearer', 'Authorization', h, 'Bearer ');
        h = h.set('Accept', 'application/json');
        return h;
    }

    private baseUrl(path: string): string {
        return `${this.configuration.basePath}${path}`;
    }

    // ── Users ─────────────────────────────────────────────────────────────────

    public platformControllerListUsers(): Observable<PlatformUserList> {
        return this.httpClient.get<PlatformUserList>(this.baseUrl('/api/platform/users'), {
            headers: this.headers
        });
    }

    public platformControllerCreateUser(body: CreatePlatformUserRequest): Observable<PlatformUserListItem> {
        return this.httpClient.post<PlatformUserListItem>(this.baseUrl('/api/platform/users'), body, {
            headers: this.headers
        });
    }

    public platformControllerActivateUser(id: string, body: Record<string, never> = {}): Observable<PlatformUserListItem> {
        return this.httpClient.post<PlatformUserListItem>(this.baseUrl(`/api/platform/users/${id}/activate`), body, {
            headers: this.headers
        });
    }

    public platformControllerDeactivateUser(id: string, body: Record<string, never> = {}): Observable<PlatformUserListItem> {
        return this.httpClient.post<PlatformUserListItem>(this.baseUrl(`/api/platform/users/${id}/deactivate`), body, {
            headers: this.headers
        });
    }

    public platformControllerAssignUserRoles(id: string, body: AssignUserRolesRequest): Observable<unknown> {
        return this.httpClient.post<unknown>(this.baseUrl(`/api/platform/users/${id}/roles`), body, {
            headers: this.headers
        });
    }

    public platformControllerAssignUserOrgMemberships(id: string, body: AssignUserOrgMembershipsRequest): Observable<unknown> {
        return this.httpClient.post<unknown>(this.baseUrl(`/api/platform/users/${id}/org-memberships`), body, {
            headers: this.headers
        });
    }

    // ── Roles ─────────────────────────────────────────────────────────────────

    public platformControllerListRoles(): Observable<PlatformRoleSummary[]> {
        return this.httpClient.get<PlatformRoleSummary[]>(this.baseUrl('/api/platform/roles'), {
            headers: this.headers
        });
    }

    public platformControllerCreateRole(body: CreateRoleRequest): Observable<PlatformRoleSummary> {
        return this.httpClient.post<PlatformRoleSummary>(this.baseUrl('/api/platform/roles'), body, {
            headers: this.headers
        });
    }

    public platformControllerAssignRolePermissions(id: string, body: AssignRolePermissionsRequest): Observable<unknown> {
        return this.httpClient.post<unknown>(this.baseUrl(`/api/platform/roles/${id}/permissions`), body, {
            headers: this.headers
        });
    }

    // ── Org Units ─────────────────────────────────────────────────────────────

    public platformControllerListOrgUnits(): Observable<PlatformOrgUnitSummary[]> {
        return this.httpClient.get<PlatformOrgUnitSummary[]>(this.baseUrl('/api/platform/org-units'), {
            headers: this.headers
        });
    }

    public platformControllerCreateOrgUnit(body: CreateOrgUnitRequest): Observable<PlatformOrgUnitSummary> {
        return this.httpClient.post<PlatformOrgUnitSummary>(this.baseUrl('/api/platform/org-units'), body, {
            headers: this.headers
        });
    }

    public platformControllerUpdateOrgUnit(id: string, body: UpdateOrgUnitRequest): Observable<PlatformOrgUnitSummary> {
        return this.httpClient.patch<PlatformOrgUnitSummary>(this.baseUrl(`/api/platform/org-units/${id}`), body, {
            headers: this.headers
        });
    }
}

