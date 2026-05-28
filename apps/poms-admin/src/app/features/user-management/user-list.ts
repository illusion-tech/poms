import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PlatformRoleSummary, PlatformOrgUnitSummary, UpdatePlatformUserRequest } from '@poms/admin-data-access';
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
import { AdminListToolbar } from '../../shared/ui/admin-list-toolbar';
import { AdminListShell } from '../../shared/ui/admin-list-shell';
import { UserExternalIdentityPanel } from './user-external-identity-panel';

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
        ToastModule,
        AdminListShell,
        AdminListToolbar,
        UserExternalIdentityPanel
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <p-toast />
        <app-admin-list-shell>
            <app-admin-list-toolbar>
                <div adminToolbarStart class="flex flex-col gap-3 md:flex-row md:items-center">
                    <p-button label="清空筛选" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" styleClass="w-full md:w-auto rounded-md!" (onClick)="clearFilters(dt)" />

                    <p-iconfield class="w-full md:w-80">
                        <p-inputicon class="pi pi-search" />
                        <input pInputText [(ngModel)]="searchValue" (input)="onGlobalFilter(dt, $event)" placeholder="搜索用户、用户名、组织" class="w-full! rounded-md! py-2!" />
                    </p-iconfield>
                </div>

                <div adminToolbarEnd class="flex flex-col gap-3 text-sm text-surface-500 dark:text-surface-400 sm:flex-row sm:items-center">
                    <span>共 {{ platformStore.users().length }} 个用户</span>
                    <p-button icon="pi pi-plus" label="新建用户" severity="primary" styleClass="w-full sm:w-auto rounded-md!" class="w-full sm:w-auto cursor-pointer" (onClick)="openCreateDialog()" />
                </div>
            </app-admin-list-toolbar>

            <!-- Table -->
            <div class="flex-1 px-6 py-5">
                <p-table
                    #dt
                    [value]="platformStore.users()"
                    [paginator]="true"
                    [rows]="rows"
                    [first]="first"
                    dataKey="id"
                    [rowHover]="true"
                    sortMode="multiple"
                    responsiveLayout="scroll"
                    [tableStyle]="{ width: '100%', 'min-width': '56rem' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示第 {first} 至 {last} 条，共 {totalRecords} 条"
                    [globalFilterFields]="['displayName', 'username', 'primaryOrgUnitName']"
                    [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
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
                    <p class="text-surface-600">
                        为用户 <strong>{{ selectedUserDisplayName() }}</strong> 分配角色（全量替换）
                    </p>
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
                    <p class="text-surface-600">
                        为用户 <strong>{{ selectedUserDisplayName() }}</strong> 分配所属组织
                    </p>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">主组织</label>
                        <p-select [(ngModel)]="assignOrgForm.primaryOrgUnitId" [options]="orgUnitOptions()" optionLabel="label" optionValue="value" placeholder="选择主组织" class="w-full" appendTo="body" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">副组织</label>
                        <p-multiselect [(ngModel)]="assignOrgForm.secondaryOrgUnitIds" [options]="orgUnitOptions()" optionLabel="label" optionValue="value" placeholder="选择副组织（可多选）" class="w-full" appendTo="body" />
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="assignOrgDialogVisible = false" />
                        <p-button label="保存" [loading]="platformStore.savingUser()" (onClick)="saveUserOrg()" />
                    </div>
                </ng-template>
            </p-dialog>

            <!-- User Detail Dialog -->
            <p-dialog [(visible)]="userDetailDialogVisible" [modal]="true" header="用户详情" [style]="{ width: '42rem' }" styleClass="p-fluid" (onHide)="platformStore.clearActiveUserDetail()">
                @if (platformStore.loadingUserDetail()) {
                    <div class="flex justify-center py-8 text-surface-400">加载中...</div>
                } @else if (platformStore.activeUserDetail(); as user) {
                    <div class="flex flex-col gap-5 py-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1">
                                <span class="text-surface-500 text-xs uppercase tracking-wide">用户名</span>
                                <span class="font-medium">{{ user.username }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-surface-500 text-xs uppercase tracking-wide">姓名</span>
                                <span class="font-medium">{{ user.displayName }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-surface-500 text-xs uppercase tracking-wide">邮箱</span>
                                <span>{{ user.email || '未填写' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-surface-500 text-xs uppercase tracking-wide">手机</span>
                                <span>{{ user.phone || '未填写' }}</span>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <span class="text-surface-500 text-xs uppercase tracking-wide">状态</span>
                            <div class="flex gap-2 flex-wrap">
                                <p-tag [value]="user.isActive ? '启用' : '停用'" [severity]="user.isActive ? 'success' : 'danger'" />
                                <p-tag [value]="user.emailVerified ? '邮箱已验证' : '邮箱未验证'" [severity]="user.emailVerified ? 'success' : 'secondary'" />
                                <p-tag [value]="user.phoneVerified ? '手机已验证' : '手机未验证'" [severity]="user.phoneVerified ? 'success' : 'secondary'" />
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <span class="text-surface-500 text-xs uppercase tracking-wide">角色</span>
                            <span>{{ user.roleNames.join(' / ') || '未分配' }}</span>
                        </div>
                        <div class="flex flex-col gap-2">
                            <span class="text-surface-500 text-xs uppercase tracking-wide">组织归属</span>
                            @if (user.orgUnits.length === 0) {
                                <span class="text-surface-400">未分配</span>
                            } @else {
                                <div class="flex flex-col gap-2">
                                    @for (org of user.orgUnits; track org.id) {
                                        <div class="flex items-center gap-2">
                                            <p-tag [value]="org.membershipType === 'primary' ? '主' : '副'" [severity]="org.membershipType === 'primary' ? 'info' : 'secondary'" />
                                            <span class="text-sm">{{ org.name }}</span>
                                            @if (org.code) {
                                                <span class="text-surface-400 text-xs">({{ org.code }})</span>
                                            }
                                        </div>
                                    }
                                </div>
                            }
                        </div>
                        <app-user-external-identity-panel [userId]="user.id" [userDisplayName]="user.displayName" />
                        @if (user.lastLoginAt) {
                            <div class="flex flex-col gap-1">
                                <span class="text-surface-500 text-xs uppercase tracking-wide">最后登录</span>
                                <span class="text-sm">{{ user.lastLoginAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                            </div>
                        }
                    </div>
                }
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="关闭" severity="secondary" [outlined]="true" (onClick)="userDetailDialogVisible = false" />
                        <p-button label="编辑信息" icon="pi pi-pencil" (onClick)="switchToEditInfo()" [disabled]="!platformStore.activeUserDetail()" />
                    </div>
                </ng-template>
            </p-dialog>

            <!-- Edit Basic Info Dialog -->
            <p-dialog [(visible)]="editInfoDialogVisible" [modal]="true" header="编辑用户信息" [style]="{ width: '30rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">姓名 *</label>
                        <input pInputText [(ngModel)]="editInfoForm.displayName" placeholder="显示名称" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">邮箱</label>
                        <input pInputText [(ngModel)]="editInfoForm.email" placeholder="可选" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">手机</label>
                        <input pInputText [(ngModel)]="editInfoForm.phone" placeholder="可选" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">头像 URL</label>
                        <input pInputText [(ngModel)]="editInfoForm.avatarUrl" placeholder="可选" class="w-full" />
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="editInfoDialogVisible = false" />
                        <p-button label="保存" [loading]="platformStore.savingUserDetail()" (onClick)="saveUserInfo()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-confirmdialog [style]="{ width: '450px' }" />
        </app-admin-list-shell>
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

    roleOptions = computed(() => this.platformStore.roles().map((r: PlatformRoleSummary) => ({ label: r.name, value: r.id })));

    orgUnitOptions = computed(() => this.platformStore.orgUnits().map((o: PlatformOrgUnitSummary) => ({ label: o.name, value: o.id })));

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
                label: '查看详情',
                icon: 'pi pi-eye',
                command: () => void this.openUserDetailDialog(userId)
            },
            {
                label: '编辑信息',
                icon: 'pi pi-pencil',
                command: () => void this.openEditInfoDialog(userId)
            },
            { separator: true },
            {
                label: '分配角色',
                icon: 'pi pi-shield',
                command: () => this.openAssignRolesDialog(userId)
            },
            {
                label: '分配组织',
                icon: 'pi pi-building',
                command: () => void this.openAssignOrgDialog(userId)
            },
            { separator: true },
            user?.isActive ? { label: '停用', icon: 'pi pi-ban', command: () => this.confirmDeactivate(userId) } : { label: '启用', icon: 'pi pi-check-circle', command: () => this.activateUser(userId) }
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
        const currentRoleIds = this.platformStore
            .roles()
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
    assignOrgForm = { primaryOrgUnitId: '', secondaryOrgUnitIds: [] as string[] };

    async openAssignOrgDialog(userId: string) {
        this.selectedUserId.set(userId);
        await this.platformStore.loadUserDetail(userId);
        const detail = this.platformStore.activeUserDetail();
        const primaryOrg = detail?.orgUnits.find((o) => o.membershipType === 'primary');
        const secondaryOrgs = detail?.orgUnits.filter((o) => o.membershipType === 'secondary') ?? [];
        this.assignOrgForm = {
            primaryOrgUnitId: primaryOrg?.id ?? '',
            secondaryOrgUnitIds: secondaryOrgs.map((o) => o.id)
        };
        this.assignOrgDialogVisible = true;
    }

    async saveUserOrg() {
        const userId = this.selectedUserId();
        if (!userId) return;
        if (!this.assignOrgForm.primaryOrgUnitId) {
            this.messageService.add({ severity: 'warn', summary: '请选择主组织', detail: '当前接口要求必须设置一个主组织' });
            return;
        }
        try {
            await this.platformStore.assignUserOrgMemberships(userId, {
                primaryOrgUnitId: this.assignOrgForm.primaryOrgUnitId,
                secondaryOrgUnitIds: this.assignOrgForm.secondaryOrgUnitIds
            });
            this.assignOrgDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '保存成功', detail: '组织分配已更新' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '保存失败', detail: '组织分配操作失败' });
        }
    }

    // ── User detail dialog ─────────────────────────────────────────────────

    userDetailDialogVisible = false;

    async openUserDetailDialog(userId: string) {
        this.selectedUserId.set(userId);
        this.userDetailDialogVisible = true;
        await this.platformStore.loadUserDetail(userId);
    }

    switchToEditInfo() {
        const selectedUserId = this.selectedUserId();
        if (!selectedUserId) {
            return;
        }
        this.userDetailDialogVisible = false;
        void this.openEditInfoDialog(selectedUserId);
    }

    // ── Edit basic info dialog ─────────────────────────────────────────────

    editInfoDialogVisible = false;
    editInfoForm = { displayName: '', email: '', phone: '', avatarUrl: '' };

    async openEditInfoDialog(userId: string) {
        this.selectedUserId.set(userId);
        if (this.platformStore.activeUserDetail()?.id !== userId) {
            await this.platformStore.loadUserDetail(userId);
        }
        const detail = this.platformStore.activeUserDetail();
        if (detail) {
            this.editInfoForm = {
                displayName: detail.displayName,
                email: detail.email ?? '',
                phone: detail.phone ?? '',
                avatarUrl: detail.avatarUrl ?? ''
            };
        }
        this.editInfoDialogVisible = true;
    }

    async saveUserInfo() {
        const userId = this.selectedUserId();
        if (!userId) return;
        if (!this.editInfoForm.displayName.trim()) {
            this.messageService.add({ severity: 'warn', summary: '请填写姓名', detail: '姓名为必填项' });
            return;
        }
        const body: UpdatePlatformUserRequest = {
            displayName: this.editInfoForm.displayName.trim(),
            email: this.editInfoForm.email.trim() || null,
            phone: this.editInfoForm.phone.trim() || null,
            avatarUrl: this.editInfoForm.avatarUrl.trim() || null
        };
        try {
            await this.platformStore.updateUser(userId, body);
            this.editInfoDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '保存成功', detail: '用户信息已更新' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '保存失败', detail: '更新用户信息失败' });
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
        this.first = 0;
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    clearFilters(table: Table) {
        this.searchValue = '';
        this.first = 0;
        table.clear();
    }

    constructor() {
        void this.platformStore.loadUsers();
        void this.platformStore.loadRoles();
        void this.platformStore.loadOrgUnits();
    }
}
