import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PlatformRoleSummary, PlatformOrgUnitSummary } from '@poms/admin-data-access';
import { PlatformStore } from '@poms/admin-data-access';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
        TagModule,
        DialogModule,
        SelectModule,
        MultiSelectModule,
        CheckboxModule,
        MenuModule,
        ConfirmDialogModule,
        ToastModule
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <p-toast />
        <div class="flex flex-col bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            <!-- Header -->
            <div class="px-6 py-5 border-b border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 class="text-surface-950 dark:text-surface-0 text-lg font-medium leading-7">用户管理</h1>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <p-iconfield class="w-full sm:w-[217px]">
                        <p-inputicon class="pi pi-search" />
                        <input pInputText [(ngModel)]="searchValue" (input)="onGlobalFilter(dt, $event)" placeholder="搜索用户" class="w-full! py-2! rounded-xl!" />
                    </p-iconfield>

                    <p-button icon="pi pi-plus" label="新建用户" severity="primary" [rounded]="true" class="w-full sm:w-auto cursor-pointer" (onClick)="openCreateDialog()" />
                </div>
            </div>

            <!-- Table -->
            <div class="flex-1 px-6 py-5">
                <p-table
                    #dt
                    [value]="platformStore.users()"
                    [paginator]="true"
                    [rows]="rows"
                    [first]="first"
                    sortMode="multiple"
                    [tableStyle]="{ width: '100%' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示第 {first} 至 {last} 条，共 {totalRecords} 条"
                    [globalFilterFields]="['displayName', 'username', 'primaryOrgUnitName']"
                    class="bg-surface-0 dark:bg-surface-800 overflow-hidden"
                    [pt]="{ pcPaginator: { root: { class: 'rounded-none!' } } }"
                >
                    <ng-template #header>
                        <tr>
                            <th pSortableColumn="displayName" class="flex-1">
                                <span class="flex items-center gap-2">姓名 <p-sortIcon field="displayName" /></span>
                            </th>
                            <th pSortableColumn="username" class="flex-1">
                                <span class="flex items-center gap-2">用户名 <p-sortIcon field="username" /></span>
                            </th>
                            <th class="flex-1">角色</th>
                            <th pSortableColumn="primaryOrgUnitName" class="flex-1">
                                <span class="flex items-center gap-2">所属组织 <p-sortIcon field="primaryOrgUnitName" /></span>
                            </th>
                            <th pSortableColumn="isActive" class="flex-1">
                                <span class="flex items-center gap-2">状态 <p-sortIcon field="isActive" /></span>
                            </th>
                            <th style="width: 6rem">操作</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-user>
                        <tr>
                            <td>
                                <span class="text-surface-950 dark:text-surface-0 text-sm font-medium">{{ user.displayName }}</span>
                            </td>
                            <td>
                                <span class="text-surface-500 dark:text-surface-400 text-sm">{{ user.username }}</span>
                            </td>
                            <td>
                                <span class="text-surface-500 dark:text-surface-400 text-sm">{{ user.roleNames.join(' / ') || '未分配' }}</span>
                            </td>
                            <td>
                                <span class="text-surface-500 dark:text-surface-400 text-sm">{{ user.primaryOrgUnitName ?? '未分配' }}</span>
                            </td>
                            <td>
                                <p-tag [value]="user.isActive ? '启用' : '停用'" [severity]="user.isActive ? 'success' : 'danger'" class="px-2 py-1 rounded-[6px]" />
                            </td>
                            <td>
                                <p-button (onClick)="toggleMenu($event, user.id)" [rounded]="true" [text]="true" icon="pi pi-ellipsis-h" size="small" severity="secondary" class="cursor-pointer" />
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="6" class="text-center py-8 text-surface-400">{{ platformStore.loadingUsers() ? '加载中...' : '暂无用户' }}</td>
                        </tr>
                    </ng-template>
                </p-table>
                <p-menu #actionMenu [model]="menuItems()" [popup]="true" styleClass="w-48!" appendTo="body" />
            </div>

            <!-- Create User Dialog -->
            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新建用户" [style]="{ width: '30rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">用户名 *</label>
                        <input pInputText [(ngModel)]="createForm.username" placeholder="登录用户名" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">姓名 *</label>
                        <input pInputText [(ngModel)]="createForm.displayName" placeholder="显示名称" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">邮箱</label>
                        <input pInputText [(ngModel)]="createForm.email" placeholder="可选" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">手机</label>
                        <input pInputText [(ngModel)]="createForm.phone" placeholder="可选" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">所属组织</label>
                        <p-select [(ngModel)]="createForm.primaryOrgUnitId" [options]="orgUnitOptions()" optionLabel="label" optionValue="value" placeholder="选择组织" class="w-full" appendTo="body" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">初始角色</label>
                        <p-multiselect [(ngModel)]="createForm.initialRoleIds" [options]="roleOptions()" optionLabel="label" optionValue="value" placeholder="选择角色（可多选）" class="w-full" appendTo="body" />
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="createDialogVisible = false" />
                        <p-button label="创建" [loading]="platformStore.savingUser()" (onClick)="createUser()" />
                    </div>
                </ng-template>
            </p-dialog>

            <!-- Assign Roles Dialog -->
            <p-dialog [(visible)]="assignRolesDialogVisible" [modal]="true" header="分配角色" [style]="{ width: '28rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <p class="text-surface-600">为用户 <strong>{{ selectedUserDisplayName() }}</strong> 分配角色（全量替换）</p>
                    <p-multiselect [(ngModel)]="assignRolesForm.roleIds" [options]="roleOptions()" optionLabel="label" optionValue="value" placeholder="选择角色" class="w-full" appendTo="body" />
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="assignRolesDialogVisible = false" />
                        <p-button label="保存" [loading]="platformStore.savingUser()" (onClick)="saveUserRoles()" />
                    </div>
                </ng-template>
            </p-dialog>

            <!-- Assign Org Dialog -->
            <p-dialog [(visible)]="assignOrgDialogVisible" [modal]="true" header="分配组织" [style]="{ width: '28rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <p class="text-surface-600">为用户 <strong>{{ selectedUserDisplayName() }}</strong> 分配所属组织</p>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">主组织</label>
                        <p-select [(ngModel)]="assignOrgForm.primaryOrgUnitId" [options]="orgUnitOptions()" optionLabel="label" optionValue="value" placeholder="选择主组织" class="w-full" appendTo="body" [showClear]="true" />
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="assignOrgDialogVisible = false" />
                        <p-button label="保存" [loading]="platformStore.savingUser()" (onClick)="saveUserOrg()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-confirmdialog [style]="{ width: '450px' }" />
        </div>
    `
})
export class UserList {
    readonly platformStore = inject(PlatformStore);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);

    @ViewChild('dt') dt!: Table;
    @ViewChild('actionMenu') actionMenu!: Menu;

    searchValue = '';
    first = 0;
    rows = 10;
    selectedUserId = signal<string | null>(null);

    roleOptions = computed(() =>
        this.platformStore.roles().map((r: PlatformRoleSummary) => ({ label: r.name, value: r.id }))
    );

    orgUnitOptions = computed(() =>
        this.platformStore.orgUnits().map((o: PlatformOrgUnitSummary) => ({ label: o.name, value: o.id }))
    );

    selectedUserDisplayName = computed(() => {
        const id = this.selectedUserId();
        return this.platformStore.users().find((u) => u.id === id)?.displayName ?? '';
    });

    menuItems = computed(() => {
        const userId = this.selectedUserId();
        if (!userId) return [];
        const user = this.platformStore.users().find((u) => u.id === userId);
        return [
            {
                label: '分配角色',
                icon: 'pi pi-shield',
                command: () => this.openAssignRolesDialog(userId)
            },
            {
                label: '分配组织',
                icon: 'pi pi-building',
                command: () => this.openAssignOrgDialog(userId)
            },
            { separator: true },
            user?.isActive
                ? { label: '停用', icon: 'pi pi-ban', command: () => this.confirmDeactivate(userId) }
                : { label: '启用', icon: 'pi pi-check-circle', command: () => this.activateUser(userId) }
        ];
    });

    // ── Create dialog ──────────────────────────────────────────────────────

    createDialogVisible = false;
    createForm = { username: '', displayName: '', email: '', phone: '', primaryOrgUnitId: null as string | null, initialRoleIds: [] as string[] };

    openCreateDialog() {
        this.createForm = { username: '', displayName: '', email: '', phone: '', primaryOrgUnitId: null, initialRoleIds: [] };
        this.createDialogVisible = true;
    }

    async createUser() {
        if (!this.createForm.username.trim() || !this.createForm.displayName.trim()) {
            this.messageService.add({ severity: 'warn', summary: '请填写必填项', detail: '用户名和姓名为必填项' });
            return;
        }
        try {
            await this.platformStore.createUser({
                username: this.createForm.username.trim(),
                displayName: this.createForm.displayName.trim(),
                email: this.createForm.email.trim() || null,
                phone: this.createForm.phone.trim() || null,
                primaryOrgUnitId: this.createForm.primaryOrgUnitId,
                initialRoleIds: this.createForm.initialRoleIds
            });
            this.createDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '创建成功', detail: `用户 ${this.createForm.displayName} 已创建` });
        } catch {
            this.messageService.add({ severity: 'error', summary: '创建失败', detail: '请检查用户名是否已存在' });
        }
    }

    // ── Assign roles dialog ────────────────────────────────────────────────

    assignRolesDialogVisible = false;
    assignRolesForm = { roleIds: [] as string[] };

    openAssignRolesDialog(userId: string) {
        this.selectedUserId.set(userId);
        const user = this.platformStore.users().find((u) => u.id === userId);
        const currentRoleIds = this.platformStore.roles()
            .filter((r) => user?.roleNames.includes(r.name))
            .map((r) => r.id);
        this.assignRolesForm = { roleIds: currentRoleIds };
        this.assignRolesDialogVisible = true;
    }

    async saveUserRoles() {
        const userId = this.selectedUserId();
        if (!userId) return;
        try {
            await this.platformStore.assignUserRoles(userId, { roleIds: this.assignRolesForm.roleIds });
            this.assignRolesDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '保存成功', detail: '角色分配已更新' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '保存失败', detail: '角色分配操作失败' });
        }
    }

    // ── Assign org dialog ──────────────────────────────────────────────────

    assignOrgDialogVisible = false;
    assignOrgForm = { primaryOrgUnitId: null as string | null };

    openAssignOrgDialog(userId: string) {
        this.selectedUserId.set(userId);
        const user = this.platformStore.users().find((u) => u.id === userId);
        this.assignOrgForm = { primaryOrgUnitId: user?.primaryOrgUnitId ?? null };
        this.assignOrgDialogVisible = true;
    }

    async saveUserOrg() {
        const userId = this.selectedUserId();
        if (!userId) return;
        try {
            await this.platformStore.assignUserOrgMemberships(userId, {
                primaryOrgUnitId: this.assignOrgForm.primaryOrgUnitId,
                secondaryOrgUnitIds: []
            });
            this.assignOrgDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '保存成功', detail: '组织分配已更新' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '保存失败', detail: '组织分配操作失败' });
        }
    }

    // ── Activate / deactivate ──────────────────────────────────────────────

    async activateUser(userId: string) {
        try {
            await this.platformStore.activateUser(userId);
            this.messageService.add({ severity: 'success', summary: '已启用', detail: '用户已启用' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '操作失败', detail: '启用用户失败' });
        }
    }

    confirmDeactivate(userId: string) {
        this.confirmationService.confirm({
            message: '确认停用该用户？停用后该用户将无法登录。',
            header: '确认停用',
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: { label: '取消', severity: 'secondary', outlined: true },
            acceptButtonProps: { label: '停用', severity: 'danger' },
            accept: () => void this.deactivateUser(userId)
        });
    }

    async deactivateUser(userId: string) {
        try {
            await this.platformStore.deactivateUser(userId);
            this.messageService.add({ severity: 'success', summary: '已停用', detail: '用户已停用' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '操作失败', detail: '停用用户失败' });
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    toggleMenu(event: Event, userId: string) {
        this.selectedUserId.set(userId);
        this.actionMenu.toggle(event);
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    constructor() {
        void this.platformStore.loadUsers();
        void this.platformStore.loadRoles();
        void this.platformStore.loadOrgUnits();
    }
}
