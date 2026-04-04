import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatformStore } from '@poms/admin-data-access';
import type { PlatformRoleSummary } from '@poms/shared-contracts';
import { AssignRolePermissionsRequestPermissionKeysEnum } from '@poms/shared-api-client';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

const assignablePermissionKeyMap = Object.values(AssignRolePermissionsRequestPermissionKeysEnum).reduce<
    Record<string, AssignRolePermissionsRequestPermissionKeysEnum>
>((map, value) => {
    map[value] = value;
    return map;
}, {});

function toAssignablePermissionKey(value: string): AssignRolePermissionsRequestPermissionKeysEnum | null {
    return assignablePermissionKeyMap[value] ?? null;
}

@Component({
    selector: 'app-role-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
        ChipModule,
        DialogModule,
        ToastModule,
        TagModule,
        TooltipModule
    ],
    providers: [MessageService],
    template: `
        <p-toast />
        <div class="flex flex-col bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
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

            <div class="flex-1 px-6 py-5">
                <p-table
                    #dt
                    [value]="platformStore.roles()"
                    [paginator]="true"
                    [rows]="10"
                    [globalFilterFields]="['name', 'roleKey', 'description']"
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
                            <th>说明</th>
                            <th>状态</th>
                            <th>类型</th>
                            <th pSortableColumn="displayOrder">
                                <span class="flex items-center gap-2">排序 <p-sortIcon field="displayOrder" /></span>
                            </th>
                            <th style="width: 12rem">操作</th>
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
                                <span class="text-sm text-surface-600 dark:text-surface-300">{{ role.description || '—' }}</span>
                            </td>
                            <td>
                                <p-tag [value]="role.isActive ? '启用' : '停用'" [severity]="role.isActive ? 'success' : 'warn'" />
                            </td>
                            <td>
                                <p-tag [value]="role.isSystemRole ? '系统角色' : '自定义角色'" [severity]="role.isSystemRole ? 'contrast' : 'info'" />
                            </td>
                            <td>
                                <span class="text-sm">{{ role.displayOrder }}</span>
                            </td>
                            <td>
                                <div class="flex items-center gap-1">
                                     <p-button
                                         icon="pi pi-pencil"
                                         [rounded]="true"
                                         [text]="true"
                                         size="small"
                                         severity="secondary"
                                         pTooltip="编辑角色"
                                         tooltipPosition="top"
                                         [ariaLabel]="'编辑角色 ' + role.name"
                                         (onClick)="openEditDialog(role)"
                                         class="cursor-pointer"
                                     />
                                     <p-button
                                         icon="pi pi-key"
                                         [rounded]="true"
                                         [text]="true"
                                         size="small"
                                         severity="secondary"
                                         pTooltip="分配权限"
                                         tooltipPosition="top"
                                         [ariaLabel]="'分配权限 ' + role.name"
                                         (onClick)="openAssignPermissionsDialog(role)"
                                         class="cursor-pointer"
                                     />
                                     <p-button
                                         [icon]="role.isActive ? 'pi pi-ban' : 'pi pi-check-circle'"
                                         [rounded]="true"
                                         [text]="true"
                                         size="small"
                                         [severity]="role.isActive ? 'danger' : 'success'"
                                         [pTooltip]="role.isActive ? '停用角色' : '启用角色'"
                                         tooltipPosition="top"
                                         [ariaLabel]="(role.isActive ? '停用角色 ' : '启用角色 ') + role.name"
                                         (onClick)="toggleRoleActivation(role)"
                                         class="cursor-pointer"
                                     />
                                </div>
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="7" class="text-center py-8 text-surface-400">{{ platformStore.loadingRoles() ? '加载中...' : '暂无角色' }}</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>

            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新建角色" [style]="{ width: '28rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium" for="create-role-key">角色 Key *</label>
                        <input id="create-role-key" pInputText [(ngModel)]="createForm.roleKey" placeholder="如 sales-manager（英文、连字符）" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium" for="create-role-name">角色名称 *</label>
                        <input id="create-role-name" pInputText [(ngModel)]="createForm.name" placeholder="如 销售经理" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium" for="create-role-description">角色说明</label>
                        <input id="create-role-description" pInputText [(ngModel)]="createForm.description" placeholder="用于说明角色用途（可选）" class="w-full" />
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="createDialogVisible = false" />
                        <p-button label="创建" [loading]="platformStore.savingRole()" (onClick)="createRole()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="editDialogVisible" [modal]="true" [header]="'编辑角色 — ' + editingRoleName()" [style]="{ width: '32rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium" for="edit-role-name">角色名称 *</label>
                        <input id="edit-role-name" pInputText [(ngModel)]="editForm.name" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium" for="edit-role-description">角色说明</label>
                        <input id="edit-role-description" pInputText [(ngModel)]="editForm.description" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium" for="edit-role-order">角色排序</label>
                        <input id="edit-role-order" pInputText type="number" [(ngModel)]="editForm.displayOrder" class="w-full" />
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="closeEditDialog()" />
                        <p-button label="保存" [loading]="platformStore.savingRole()" (onClick)="saveRole()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="assignPermDialogVisible" [modal]="true" [header]="'分配权限 — ' + assigningRoleName()" [style]="{ width: '40rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <p class="text-surface-500 text-sm">选中的权限将全量替换该角色现有权限。系统角色会保留其最小权限基线。</p>
                    @for (group of permissionGroups(); track group.group) {
                        <div>
                            <p class="font-medium text-sm mb-2">{{ group.group }}</p>
                            <div class="flex flex-col gap-2">
                                @for (permission of group.permissions; track permission.key) {
                                    <label class="flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            [checked]="selectedPermissions().has(permission.key)"
                                            (change)="togglePermission(permission.key)"
                                            class="mt-1 rounded"
                                        />
                                        <span class="flex flex-col">
                                            <span class="text-xs font-mono">{{ permission.key }}</span>
                                            <span class="text-xs text-surface-500">{{ permission.description }}</span>
                                        </span>
                                    </label>
                                }
                            </div>
                        </div>
                    }
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="closeAssignPermissionsDialog()" />
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

    readonly permissionGroups = signal<Array<{ group: string; permissions: Array<{ key: AssignRolePermissionsRequestPermissionKeysEnum; description: string }> }>>([]);

    createDialogVisible = false;
    createForm = { roleKey: '', name: '', description: '' };

    editDialogVisible = false;
    editingRoleId = signal('');
    editingRoleName = signal('');
    editForm = { name: '', description: '', displayOrder: 0 };

    assignPermDialogVisible = false;
    assigningRoleId = signal('');
    assigningRoleName = signal('');
    selectedPermissions = signal(new Set<AssignRolePermissionsRequestPermissionKeysEnum>());

    openCreateDialog() {
        this.createForm = { roleKey: '', name: '', description: '' };
        this.createDialogVisible = true;
    }

    async createRole() {
        if (!this.createForm.roleKey.trim() || !this.createForm.name.trim()) {
            this.messageService.add({ severity: 'warn', summary: '请填写必填项' });
            return;
        }
        try {
            await this.platformStore.createRole({
                roleKey: this.createForm.roleKey.trim(),
                name: this.createForm.name.trim(),
                description: this.emptyToNull(this.createForm.description)
            });
            this.createDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '创建成功', detail: `角色 ${this.createForm.name} 已创建` });
        } catch {
            this.messageService.add({ severity: 'error', summary: '创建失败', detail: '角色 Key 可能已存在' });
        }
    }

    async openEditDialog(role: PlatformRoleSummary) {
        try {
            const detail = await this.platformStore.loadRoleDetail(role.id);
            this.editingRoleId.set(role.id);
            this.editingRoleName.set(role.name);
            this.editForm = {
                name: detail.name,
                description: detail.description ?? '',
                displayOrder: detail.displayOrder
            };
            this.editDialogVisible = true;
        } catch {
            this.messageService.add({ severity: 'error', summary: '加载失败', detail: '角色详情加载失败' });
        }
    }

    closeEditDialog() {
        this.editDialogVisible = false;
        this.platformStore.clearActiveRoleDetail();
        this.editingRoleId.set('');
        this.editingRoleName.set('');
    }

    async saveRole() {
        const roleId = this.editingRoleId();
        if (!roleId || !this.editForm.name.trim()) {
            this.messageService.add({ severity: 'warn', summary: '请填写必填项' });
            return;
        }
        try {
            await this.platformStore.updateRole(roleId, {
                name: this.editForm.name.trim(),
                description: this.emptyToNull(this.editForm.description),
                displayOrder: Number(this.editForm.displayOrder) || 0
            });
            this.closeEditDialog();
            this.messageService.add({ severity: 'success', summary: '保存成功', detail: '角色信息已更新' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '保存失败', detail: '角色更新失败' });
        }
    }

    async openAssignPermissionsDialog(role: PlatformRoleSummary) {
        try {
            const [detail] = await Promise.all([this.platformStore.loadRoleDetail(role.id), this.ensurePermissionsLoaded()]);
            this.assigningRoleId.set(role.id);
            this.assigningRoleName.set(role.name);
            this.selectedPermissions.set(
                new Set(
                    detail.permissionKeys
                        .map((permissionKey) => toAssignablePermissionKey(permissionKey))
                        .filter((permissionKey): permissionKey is AssignRolePermissionsRequestPermissionKeysEnum => permissionKey !== null)
                )
            );
            this.assignPermDialogVisible = true;
        } catch {
            this.messageService.add({ severity: 'error', summary: '加载失败', detail: '权限信息加载失败' });
        }
    }

    closeAssignPermissionsDialog() {
        this.assignPermDialogVisible = false;
        this.platformStore.clearActiveRoleDetail();
        this.assigningRoleId.set('');
        this.assigningRoleName.set('');
        this.selectedPermissions.set(new Set<AssignRolePermissionsRequestPermissionKeysEnum>());
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
            this.closeAssignPermissionsDialog();
            this.messageService.add({ severity: 'success', summary: '保存成功', detail: '权限分配已更新' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '保存失败', detail: '权限分配操作失败' });
        }
    }

    async toggleRoleActivation(role: PlatformRoleSummary) {
        try {
            if (role.isActive) {
                await this.platformStore.deactivateRole(role.id);
            } else {
                await this.platformStore.activateRole(role.id);
            }
            this.messageService.add({ severity: 'success', summary: '状态已更新', detail: `角色 ${role.name} 已${role.isActive ? '停用' : '启用'}` });
        } catch {
            this.messageService.add({ severity: 'error', summary: '更新失败', detail: '角色状态更新失败' });
        }
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    constructor() {
        void this.bootstrap();
    }

    private async bootstrap() {
        await Promise.all([this.platformStore.loadRoles(), this.ensurePermissionsLoaded()]);
    }

    private async ensurePermissionsLoaded() {
        const permissions = this.platformStore.permissions().length > 0 ? this.platformStore.permissions() : ((await this.platformStore.loadPermissions()) ?? []);
        const grouped = Object.entries(
            permissions.reduce<Record<string, Array<{ key: AssignRolePermissionsRequestPermissionKeysEnum; description: string }>>>((groups, permission) => {
                const assignablePermissionKey = toAssignablePermissionKey(permission.key);
                if (!assignablePermissionKey) {
                    return groups;
                }

                const group = permission.group;
                const existing = groups[group] ?? [];
                existing.push({
                    key: assignablePermissionKey,
                    description: permission.description
                });
                groups[group] = existing;
                return groups;
            }, {})
        ).map(([group, groupPermissions]) => ({ group, permissions: groupPermissions }));
        this.permissionGroups.set(grouped);
        return permissions;
    }

    private emptyToNull(value: string): string | null {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }
}
