import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatformStore } from '@poms/admin-data-access';
import type { PermissionKey } from '@poms/shared-contracts';
import { PermissionsMeta } from '@poms/shared-contracts';
import { AssignRolePermissionsRequestPermissionKeysEnum } from '@poms/shared-api-client';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

const PERMISSION_GROUPS = Object.entries(
    Object.values(AssignRolePermissionsRequestPermissionKeysEnum).reduce<Record<string, AssignRolePermissionsRequestPermissionKeysEnum[]>>((groups, key) => {
        const group = PermissionsMeta[key as PermissionKey].group;
        const existing = groups[group] ?? [];
        existing.push(key);
        groups[group] = existing;
        return groups;
    }, {})
).map(([group, keys]) => ({ group, keys }));

@Component({
    selector: 'app-role-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, ChipModule, DialogModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast />
        <div class="flex flex-col bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            <!-- Header -->
            <div class="px-6 py-5 border-b border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 class="text-surface-950 dark:text-surface-0 text-lg font-medium leading-7">角色管理</h1>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <p-iconfield class="w-full sm:w-[217px]">
                        <p-inputicon class="pi pi-search" />
                        <input pInputText [(ngModel)]="searchValue" (input)="onGlobalFilter(dt, $event)" placeholder="搜索角色" class="w-full! py-2! rounded-xl!" />
                    </p-iconfield>
                    <p-button icon="pi pi-plus" label="新建角色" severity="primary" [rounded]="true" (onClick)="openCreateDialog()" class="w-full sm:w-auto cursor-pointer" />
                </div>
            </div>

            <!-- Table -->
            <div class="flex-1 px-6 py-5">
                <p-table
                    #dt
                    [value]="platformStore.roles()"
                    [paginator]="true"
                    [rows]="10"
                    [globalFilterFields]="['name', 'roleKey']"
                    [tableStyle]="{ width: '100%' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示第 {first} 至 {last} 条，共 {totalRecords} 条"
                    [pt]="{ pcPaginator: { root: { class: 'rounded-none!' } } }"
                >
                    <ng-template #header>
                        <tr>
                            <th pSortableColumn="name">
                                <span class="flex items-center gap-2">角色名称 <p-sortIcon field="name" /></span>
                            </th>
                            <th pSortableColumn="roleKey">
                                <span class="flex items-center gap-2">角色 Key <p-sortIcon field="roleKey" /></span>
                            </th>
                            <th style="width: 6rem">操作</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-role>
                        <tr>
                            <td>
                                <span class="text-surface-950 dark:text-surface-0 text-sm font-medium">{{ role.name }}</span>
                            </td>
                            <td>
                                <span class="text-surface-400 text-xs font-mono">{{ role.roleKey }}</span>
                            </td>
                            <td>
                                <p-button icon="pi pi-key" [rounded]="true" [text]="true" size="small" severity="secondary" pTooltip="分配权限" tooltipPosition="top" (onClick)="openAssignPermissionsDialog(role.id, role.name)" class="cursor-pointer" />
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="3" class="text-center py-8 text-surface-400">{{ platformStore.loadingRoles() ? '加载中...' : '暂无角色' }}</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>

            <!-- Create Role Dialog -->
            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新建角色" [style]="{ width: '28rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">角色 Key *</label>
                        <input pInputText [(ngModel)]="createForm.roleKey" placeholder="如 sales-manager（英文、连字符）" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">角色名称 *</label>
                        <input pInputText [(ngModel)]="createForm.name" placeholder="如 销售经理" class="w-full" />
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="createDialogVisible = false" />
                        <p-button label="创建" [loading]="platformStore.savingRole()" (onClick)="createRole()" />
                    </div>
                </ng-template>
            </p-dialog>

            <!-- Assign Permissions Dialog -->
            <p-dialog [(visible)]="assignPermDialogVisible" [modal]="true" [header]="'分配权限 — ' + assigningRoleName()" [style]="{ width: '36rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <p class="text-surface-500 text-sm">选中的权限将全量替换该角色现有权限。</p>
                    @for (group of permissionGroups; track group.group) {
                        <div>
                            <p class="font-medium text-sm mb-2">{{ group.group }}</p>
                            <div class="flex flex-wrap gap-2">
                                @for (key of group.keys; track key) {
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" [checked]="selectedPermissions().has(key)" (change)="togglePermission(key)" class="rounded" />
                                        <span class="text-xs font-mono">{{ key }}</span>
                                    </label>
                                }
                            </div>
                        </div>
                    }
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="assignPermDialogVisible = false" />
                        <p-button label="保存" [loading]="platformStore.savingRole()" (onClick)="savePermissions()" />
                    </div>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class RoleList {
    readonly platformStore = inject(PlatformStore);
    private readonly messageService = inject(MessageService);

    @ViewChild('dt') dt!: Table;

    searchValue = '';
    permissionGroups = PERMISSION_GROUPS;

    // ── Create role ────────────────────────────────────────────────────────

    createDialogVisible = false;
    createForm = { roleKey: '', name: '' };

    openCreateDialog() {
        this.createForm = { roleKey: '', name: '' };
        this.createDialogVisible = true;
    }

    async createRole() {
        if (!this.createForm.roleKey.trim() || !this.createForm.name.trim()) {
            this.messageService.add({ severity: 'warn', summary: '请填写必填项' });
            return;
        }
        try {
            await this.platformStore.createRole({ roleKey: this.createForm.roleKey.trim(), name: this.createForm.name.trim() });
            this.createDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '创建成功', detail: `角色 ${this.createForm.name} 已创建` });
        } catch {
            this.messageService.add({ severity: 'error', summary: '创建失败', detail: '角色 Key 可能已存在' });
        }
    }

    // ── Assign permissions ─────────────────────────────────────────────────

    assignPermDialogVisible = false;
    assigningRoleId = signal('');
    assigningRoleName = signal('');
    selectedPermissions = signal(new Set<AssignRolePermissionsRequestPermissionKeysEnum>());

    openAssignPermissionsDialog(roleId: string, roleName: string) {
        this.assigningRoleId.set(roleId);
        this.assigningRoleName.set(roleName);
        this.selectedPermissions.set(new Set<AssignRolePermissionsRequestPermissionKeysEnum>());
        this.assignPermDialogVisible = true;
    }

    togglePermission(key: AssignRolePermissionsRequestPermissionKeysEnum) {
        this.selectedPermissions.update((set) => {
            const next = new Set(set);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    async savePermissions() {
        const roleId = this.assigningRoleId();
        if (!roleId) return;
        try {
            await this.platformStore.assignRolePermissions(roleId, { permissionKeys: Array.from(this.selectedPermissions()) });
            this.assignPermDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '保存成功', detail: '权限分配已更新' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '保存失败', detail: '权限分配操作失败' });
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    constructor() {
        void this.platformStore.loadRoles();
    }
}
