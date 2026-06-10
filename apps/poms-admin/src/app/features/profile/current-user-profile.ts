import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore, type UpdateCurrentUserProfileRequest } from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SectionCard } from '../../shared/ui/sectioncard';

interface PermissionGroup {
    items: string[];
    label: string;
}

@Component({
    selector: 'app-current-user-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, TagModule, ToastModule, SectionCard],
    providers: [MessageService],
    template: `
        <p-toast />
        @if (currentUser(); as user) {
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div class="flex items-start gap-4">
                        <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-100 text-lg font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                            {{ avatarText() }}
                        </div>
                        <div class="min-w-0">
                            <h1 class="text-2xl font-semibold text-surface-950 dark:text-surface-0">个人中心</h1>
                            <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
                                <span>{{ user.displayName }}</span>
                                <span>·</span>
                                <span>@{{ user.username }}</span>
                                @if (primaryOrg(); as org) {
                                    <span>·</span>
                                    <span>{{ org.name }}</span>
                                }
                            </div>
                            <p class="mt-3 max-w-3xl text-sm text-surface-500 dark:text-surface-400">
                                当前页直接展示登录用户的真实资料聚合结果，包括角色、权限和组织归属，不再复用平台用户管理页面。
                            </p>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <p-tag [value]="user.isActive ? '账号已启用' : '账号已停用'" [severity]="user.isActive ? 'success' : 'danger'" />
                        <p-tag [value]="user.emailVerified ? '邮箱已验证' : '邮箱未验证'" [severity]="user.emailVerified ? 'success' : 'secondary'" />
                        <p-tag [value]="user.phoneVerified ? '手机已验证' : '手机未验证'" [severity]="user.phoneVerified ? 'success' : 'secondary'" />
                        <p-button label="返回工作台" icon="pi pi-home" severity="secondary" [outlined]="true" [rounded]="true" (onClick)="goToDashboard()" class="cursor-pointer" />
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <section-card>
                        <ng-template #title>账户信息</ng-template>
                        <ng-template #description>当前登录身份与基础资料。</ng-template>
                        <ng-template #action>
                            <p-button label="编辑资料" icon="pi pi-pencil" severity="secondary" [outlined]="true" (onClick)="openEditDialog()" class="cursor-pointer" />
                        </ng-template>
                        <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">姓名</span>
                                <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ user.displayName }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">用户名</span>
                                <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ user.username }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">邮箱</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ user.email || '未填写' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">手机</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ user.phone || '未填写' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">最后登录</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ user.lastLoginAt ? (user.lastLoginAt | date: 'yyyy-MM-dd HH:mm') : '暂无记录' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">当前状态</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ user.isActive ? '启用' : '停用' }}</span>
                            </div>
                            <div class="flex flex-col gap-1 md:col-span-2">
                                <span class="text-xs text-surface-500 dark:text-surface-400">头像地址</span>
                                <span class="break-all text-sm text-surface-950 dark:text-surface-0">{{ user.avatarUrl || '未设置' }}</span>
                            </div>
                            <div class="rounded-lg border border-surface-200 px-4 py-3 text-sm text-surface-600 dark:border-surface-700 dark:text-surface-300 md:col-span-2">
                                当前只开放姓名、邮箱和手机自助维护。修改邮箱或手机后，对应验证状态会重置为未验证。
                            </div>
                        </div>
                    </section-card>

                    <section-card>
                        <ng-template #title>组织归属</ng-template>
                        <ng-template #description>以 auth/profile 返回的主责 / 附属组织事实为准。</ng-template>
                        <div class="mt-4 flex flex-col gap-5">
                            <div class="flex flex-col gap-2">
                                <span class="text-xs text-surface-500 dark:text-surface-400">主组织</span>
                                @if (primaryOrg(); as org) {
                                    <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                                        <div class="flex items-center gap-2">
                                            <p-tag value="主" severity="info" />
                                            <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ org.name }}</span>
                                            @if (org.code) {
                                                <span class="text-xs text-surface-400 dark:text-surface-500">({{ org.code }})</span>
                                            }
                                        </div>
                                        @if (org.description) {
                                            <p class="mt-2 text-sm text-surface-500 dark:text-surface-400">{{ org.description }}</p>
                                        }
                                    </div>
                                } @else {
                                    <span class="text-sm text-surface-400 dark:text-surface-500">未分配主组织</span>
                                }
                            </div>

                            <div class="flex flex-col gap-2">
                                <span class="text-xs text-surface-500 dark:text-surface-400">附属组织</span>
                                @if (secondaryOrgs().length === 0) {
                                    <span class="text-sm text-surface-400 dark:text-surface-500">无附属组织</span>
                                } @else {
                                    <div class="flex flex-col gap-3">
                                        @for (org of secondaryOrgs(); track org.id) {
                                            <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                                                <div class="flex items-center gap-2">
                                                    <p-tag value="副" severity="secondary" />
                                                    <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ org.name }}</span>
                                                    @if (org.code) {
                                                        <span class="text-xs text-surface-400 dark:text-surface-500">({{ org.code }})</span>
                                                    }
                                                </div>
                                                @if (org.description) {
                                                    <p class="mt-2 text-sm text-surface-500 dark:text-surface-400">{{ org.description }}</p>
                                                }
                                            </div>
                                        }
                                    </div>
                                }
                            </div>
                        </div>
                    </section-card>
                </div>

                <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <section-card>
                        <ng-template #title>角色与权限</ng-template>
                        <ng-template #description>角色是职责口径，权限是当前会话的有效能力事实。</ng-template>
                        <div class="mt-4 flex flex-col gap-5">
                            <div class="flex flex-col gap-2">
                                <span class="text-xs text-surface-500 dark:text-surface-400">当前角色</span>
                                @if (user.roles.length === 0) {
                                    <span class="text-sm text-surface-400 dark:text-surface-500">未分配角色</span>
                                } @else {
                                    <div class="flex flex-wrap gap-2">
                                        @for (role of user.roles; track role) {
                                            <p-tag [value]="role" severity="contrast" />
                                        }
                                    </div>
                                }
                            </div>

                            <div class="flex flex-col gap-3">
                                <span class="text-xs text-surface-500 dark:text-surface-400">权限摘要</span>
                                @for (group of permissionGroups(); track group.label) {
                                    <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                                        <div class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ group.label }}</div>
                                        <div class="mt-3 flex flex-wrap gap-2">
                                            @for (permission of group.items; track permission) {
                                                <p-tag [value]="permission" severity="secondary" />
                                            }
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    </section-card>

                    <section-card>
                        <ng-template #title>当前可见能力边界</ng-template>
                        <ng-template #description>这里只展示由当前有效权限直接导出的基础边界，不替代对象级业务授权。</ng-template>
                        <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            @for (entry of capabilityEntries(); track entry.label) {
                                <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ entry.label }}</span>
                                        <p-tag [value]="entry.enabled ? '可用' : '不可用'" [severity]="entry.enabled ? 'success' : 'secondary'" />
                                    </div>
                                    <p class="mt-2 text-sm text-surface-500 dark:text-surface-400">{{ entry.description }}</p>
                                </div>
                            }
                        </div>
                    </section-card>
                </div>

                <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑资料" [style]="{ width: '32rem' }" styleClass="p-fluid" (onHide)="handleEditDialogHide()">
                    <div class="flex flex-col gap-4 py-4">
                        <div class="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:border-primary-900/50 dark:bg-primary-950/30 dark:text-primary-200">
                            当前页只允许编辑姓名、邮箱和手机。邮箱或手机留空表示清空；若联系方式发生变化，对应验证状态会变为未验证。
                        </div>

                        @if (submitError) {
                            <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                                {{ submitError }}
                            </div>
                        }

                        <div class="flex flex-col gap-2">
                            <label for="profile-edit-display-name" class="font-medium text-surface-900 dark:text-surface-0">姓名 *</label>
                            <input
                                id="profile-edit-display-name"
                                pInputText
                                [(ngModel)]="editForm.displayName"
                                maxlength="128"
                                [disabled]="savingProfile"
                                placeholder="请输入展示姓名"
                                class="w-full"
                            />
                            @if (formErrors.displayName) {
                                <small class="text-red-500">{{ formErrors.displayName }}</small>
                            }
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="profile-edit-email" class="font-medium text-surface-900 dark:text-surface-0">邮箱</label>
                            <input
                                id="profile-edit-email"
                                pInputText
                                type="email"
                                [(ngModel)]="editForm.email"
                                [disabled]="savingProfile"
                                placeholder="留空则清空邮箱"
                                class="w-full"
                            />
                            @if (formErrors.email) {
                                <small class="text-red-500">{{ formErrors.email }}</small>
                            } @else {
                                <small class="text-surface-500 dark:text-surface-400">留空后会把邮箱提交为 null。</small>
                            }
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="profile-edit-phone" class="font-medium text-surface-900 dark:text-surface-0">手机</label>
                            <input
                                id="profile-edit-phone"
                                pInputText
                                [(ngModel)]="editForm.phone"
                                maxlength="64"
                                [disabled]="savingProfile"
                                placeholder="留空则清空手机"
                                class="w-full"
                            />
                            @if (formErrors.phone) {
                                <small class="text-red-500">{{ formErrors.phone }}</small>
                            } @else {
                                <small class="text-surface-500 dark:text-surface-400">留空后会把手机提交为 null。</small>
                            }
                        </div>

                        <div class="grid grid-cols-1 gap-3 rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">用户名</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ user.username }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">头像地址</span>
                                <span class="break-all text-sm text-surface-950 dark:text-surface-0">{{ user.avatarUrl || '未设置' }}</span>
                            </div>
                        </div>
                    </div>
                    <ng-template #footer>
                        <div class="flex justify-end gap-2">
                            <p-button label="取消" severity="secondary" [outlined]="true" [disabled]="savingProfile" (onClick)="editDialogVisible = false" />
                            <p-button label="保存" [loading]="savingProfile" (onClick)="saveProfile()" />
                        </div>
                    </ng-template>
                </p-dialog>
            </div>
        } @else {
            <div class="py-20 text-center">
                <i class="pi pi-user text-4xl text-surface-300 dark:text-surface-600 mb-3 block"></i>
                <p class="text-surface-500 dark:text-surface-400">当前未加载到个人资料。</p>
                <p-button label="返回登录页" icon="pi pi-arrow-left" [text]="true" (onClick)="goToLogin()" class="mt-4 cursor-pointer" />
            </div>
        }
    `
})
export class CurrentUserProfile {
    readonly #authStore = inject(AuthStore);
    readonly #router = inject(Router);
    readonly #messageService = inject(MessageService);

    readonly currentUser = computed(() => this.#authStore.currentUser());
    readonly primaryOrg = computed(() => this.currentUser()?.orgUnits.find((org) => org.membershipType === 'primary') ?? null);
    readonly secondaryOrgs = computed(() => this.currentUser()?.orgUnits.filter((org) => org.membershipType === 'secondary') ?? []);
    readonly avatarText = computed(() => {
        const user = this.currentUser();
        if (!user) {
            return '--';
        }

        const source = user.displayName || user.username;
        return source.slice(0, 1).toUpperCase();
    });
    readonly permissionGroups = computed<PermissionGroup[]>(() => {
        const permissions = [...(this.currentUser()?.permissions ?? [])] as string[];
        const groups = new Map<string, string[]>();

        for (const permission of permissions) {
            const [prefix] = permission.split(':');
            const key = prefix || 'other';
            const current = groups.get(key) ?? [];
            current.push(permission);
            groups.set(key, current);
        }

        const orderedKeys = ['nav', 'project', 'contract', 'commission', 'platform', 'other'];
        return orderedKeys
            .filter((key) => groups.has(key))
            .map((key) => ({
                label: this.permissionGroupLabel(key),
                items: groups.get(key) ?? []
            }));
    });
    readonly capabilityEntries = computed(() => {
        const permissions = new Set((this.currentUser()?.permissions ?? []) as string[]);
        return [
            {
                label: '工作台',
                description: '查看当前待办、近期项目和基础统计。',
                enabled: permissions.has('nav:dashboard:view')
            },
            {
                label: '项目管理',
                description: '查看项目列表并在已有对象上执行项目域动作。',
                enabled: permissions.has('nav:projects:view') && permissions.has('project:read')
            },
            {
                label: '合同管理',
                description: '查看合同列表并进入合同详情。',
                enabled: permissions.has('nav:contracts:view')
            },
            {
                label: '平台治理',
                description: '进入用户、角色、组织和导航菜单页面。',
                enabled:
                    permissions.has('platform:users:manage') ||
                    permissions.has('platform:roles:manage') ||
                    permissions.has('platform:org-units:manage') ||
                    permissions.has('platform:navigation:manage')
            }
        ];
    });
    editDialogVisible = false;
    savingProfile = false;
    submitError: string | null = null;
    editForm = {
        displayName: '',
        email: '',
        phone: ''
    };
    formErrors: Record<'displayName' | 'email' | 'phone', string | null> = {
        displayName: null,
        email: null,
        phone: null
    };

    goToDashboard() {
        this.#router.navigate(['/dashboard']);
    }

    goToLogin() {
        this.#router.navigate(['/auth/login']);
    }

    openEditDialog() {
        const user = this.currentUser();
        if (!user) {
            return;
        }

        this.editForm = {
            displayName: user.displayName ?? '',
            email: user.email ?? '',
            phone: user.phone ?? ''
        };
        this.resetFormErrors();
        this.submitError = null;
        this.editDialogVisible = true;
    }

    handleEditDialogHide() {
        this.resetFormErrors();
        this.submitError = null;
    }

    async saveProfile() {
        if (!this.validateEditForm() || this.savingProfile) {
            return;
        }

        this.savingProfile = true;
        this.submitError = null;

        try {
            await this.#authStore.updateCurrentUserProfile(this.buildRequest());
            this.editDialogVisible = false;
            this.#messageService.add({
                severity: 'success',
                summary: '保存成功',
                detail: '个人资料已更新'
            });
        } catch (error) {
            const message = this.extractErrorMessage(error);
            this.submitError = message;
            this.#messageService.add({
                severity: 'error',
                summary: '保存失败',
                detail: message
            });
        } finally {
            this.savingProfile = false;
        }
    }

    private permissionGroupLabel(group: string): string {
        const labels: Record<string, string> = {
            nav: '导航可见性',
            project: '项目域能力',
            contract: '合同资金域能力',
            commission: '提成治理域能力',
            platform: '平台治理能力',
            other: '其他能力'
        };
        return labels[group] ?? labels['other'];
    }

    private buildRequest(): UpdateCurrentUserProfileRequest {
        const displayName = this.editForm.displayName.trim();
        const email = this.editForm.email.trim();
        const phone = this.editForm.phone.trim();

        return {
            displayName,
            email: email === '' ? null : email,
            phone: phone === '' ? null : phone
        };
    }

    private validateEditForm(): boolean {
        this.resetFormErrors();

        const displayName = this.editForm.displayName.trim();
        const email = this.editForm.email.trim();
        const phone = this.editForm.phone.trim();

        if (!displayName) {
            this.formErrors.displayName = '姓名不能为空。';
        } else if (displayName.length > 128) {
            this.formErrors.displayName = '姓名长度不能超过 128 个字符。';
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.formErrors.email = '请输入有效的邮箱地址。';
        }

        if (phone.length > 64) {
            this.formErrors.phone = '手机号长度不能超过 64 个字符。';
        }

        return !this.formErrors.displayName && !this.formErrors.email && !this.formErrors.phone;
    }

    private resetFormErrors() {
        this.formErrors = {
            displayName: null,
            email: null,
            phone: null
        };
    }

    private extractErrorMessage(error: unknown): string {
        if (error instanceof HttpErrorResponse) {
            if (typeof error.error === 'string' && error.error.trim()) {
                return error.error.trim();
            }

            if (error.error && typeof error.error === 'object') {
                const message = (error.error as { message?: unknown }).message;
                if (Array.isArray(message)) {
                    return message.join('；');
                }
                if (typeof message === 'string' && message.trim()) {
                    return message.trim();
                }
            }

            if (error.status === 400) {
                return '提交内容未通过校验，请检查输入字段。';
            }
        }

        return '当前资料保存失败，请稍后重试。';
    }
}
