import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    ExternalIdentityBindingStatus,
    IdentityProvider,
    IdentityProviderConfigStatus,
    IdentityProviderOAuthGrantStatus,
    IdentityProviderStore,
    type ExternalIdentityBindingSummary,
    type ExternalUserCandidate
} from '@poms/admin-data-access';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

type TagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

interface ProviderOption {
    label: string;
    value: string;
}

const PROVIDER_LABELS: Record<IdentityProvider, string> = {
    [IdentityProvider.Feishu]: '飞书'
};

const BINDING_STATUS_LABELS: Record<ExternalIdentityBindingStatus, string> = {
    [ExternalIdentityBindingStatus.Active]: '已绑定',
    [ExternalIdentityBindingStatus.Revoked]: '已解绑'
};

const GRANT_STATUS_LABELS: Record<IdentityProviderOAuthGrantStatus, string> = {
    [IdentityProviderOAuthGrantStatus.Missing]: '未授权',
    [IdentityProviderOAuthGrantStatus.Active]: '已授权',
    [IdentityProviderOAuthGrantStatus.Expired]: '已过期',
    [IdentityProviderOAuthGrantStatus.Revoked]: '已撤销'
};

type ProviderSearchErrorBody = {
    message?: unknown;
    nextActions?: unknown;
    missingRequiredScopes?: unknown;
    providerLogId?: unknown;
};

function stringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function serverMessage(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) return stringArray(value).join('；') || null;
    return null;
}

@Component({
    selector: 'app-user-external-identity-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TableModule, TagModule],
    providers: [IdentityProviderStore],
    template: `
        <div class="flex flex-col gap-3 border-t border-surface-200 dark:border-surface-700 pt-4">
            <div class="flex items-center justify-between gap-3">
                <div class="flex flex-col gap-1">
                    <span class="text-surface-500 text-xs uppercase tracking-wide">外部身份</span>
                    <span class="text-sm text-surface-500 dark:text-surface-400">{{ bindingSummaryText() }}</span>
                </div>
                <p-button label="绑定飞书" icon="pi pi-link" size="small" severity="secondary" [outlined]="true" (onClick)="openBindingDialog()" />
            </div>

            @if (store.loadingBindingsUserId() === userId()) {
                <span class="text-sm text-surface-400">加载中...</span>
            } @else if (bindings().length === 0) {
                <span class="text-sm text-surface-400">未绑定外部身份</span>
            } @else {
                <div class="flex flex-col gap-2">
                    @for (binding of bindings(); track binding.id) {
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2">
                            <div class="min-w-0 flex flex-col gap-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-medium text-sm">{{ providerLabel(binding.provider) }}</span>
                                    <p-tag [value]="bindingStatusLabel(binding.status)" [severity]="bindingStatusSeverity(binding.status)" />
                                    <span class="text-sm text-surface-500 truncate">{{ binding.subjectDisplayName || binding.subjectId }}</span>
                                </div>
                                <span class="text-xs text-surface-500 break-all">{{ binding.subjectId }}</span>
                                @if (binding.email || binding.mobile) {
                                    <span class="text-xs text-surface-500">{{ binding.email || '无邮箱' }} / {{ binding.mobile || '无手机' }}</span>
                                }
                            </div>
                            @if (binding.status === ExternalIdentityBindingStatus.Active) {
                                <p-button
                                    label="解绑"
                                    icon="pi pi-unlink"
                                    size="small"
                                    severity="danger"
                                    [outlined]="true"
                                    [loading]="store.unbindingIdentityId() === binding.id"
                                    (onClick)="confirmUnbind(binding)"
                                />
                            }
                        </div>
                    }
                </div>
            }
        </div>

        <p-dialog [(visible)]="bindingDialogVisible" [modal]="true" header="绑定飞书身份" [style]="{ width: '56rem' }" styleClass="p-fluid">
            <div class="flex flex-col gap-4 py-2">
                <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">提供商配置</label>
                        <p-select
                            [ngModel]="selectedConfigId()"
                            (ngModelChange)="selectConfig($event)"
                            [options]="providerOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="选择配置"
                            class="w-full"
                            appendTo="body"
                        />
                    </div>
                    <div class="flex items-center gap-2">
                        @if (grant(); as currentGrant) {
                            <p-tag [value]="grantStatusLabel(currentGrant.status)" [severity]="grantStatusSeverity(currentGrant.status)" />
                        } @else {
                            <p-tag value="未授权" severity="secondary" />
                        }
                        <p-button label="授权" icon="pi pi-external-link" size="small" [outlined]="true" [loading]="store.authorizingGrantConfigId() === selectedConfigId()" [disabled]="!selectedConfigId()" (onClick)="authorizeGrant()" />
                        <p-button icon="pi pi-refresh" size="small" severity="secondary" [text]="true" [rounded]="true" [disabled]="!selectedConfigId()" [loading]="store.loadingGrantConfigId() === selectedConfigId()" (onClick)="refreshGrant()" />
                    </div>
                </div>

                @if (grantGuidance(); as guidance) {
                    <div class="flex flex-col gap-3 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100 md:flex-row md:items-center md:justify-between">
                        <span>{{ guidance }}</span>
                        @if (grantRequiresAuthorization()) {
                            <p-button label="重新授权" icon="pi pi-external-link" size="small" severity="warn" [outlined]="true" [loading]="store.authorizingGrantConfigId() === selectedConfigId()" (onClick)="authorizeGrant()" />
                        }
                    </div>
                }

                <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">姓名</label>
                        <input pInputText [(ngModel)]="searchQuery" placeholder="输入姓名搜索" class="w-full" (keyup.enter)="searchCandidates()" />
                    </div>
                    <p-button label="搜索" icon="pi pi-search" [loading]="store.searchingConfigId() === selectedConfigId()" [disabled]="!canSearch()" (onClick)="searchCandidates()" />
                </div>

                <p-table [value]="store.searchResults()" [tableStyle]="{ width: '100%' }">
                    <ng-template #header>
                        <tr>
                            <th>姓名</th>
                            <th>部门</th>
                            <th>邮箱 / 手机</th>
                            <th>Subject ID</th>
                            <th style="width: 6rem">操作</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-candidate>
                        <tr>
                            <td>
                                <div class="flex flex-col">
                                    <span class="font-medium">{{ candidate.displayName }}</span>
                                    @if (candidate.unionId) {
                                        <span class="text-xs text-surface-500">{{ candidate.unionId }}</span>
                                    }
                                </div>
                            </td>
                            <td>
                                <span class="text-sm text-surface-500">{{ departmentText(candidate) }}</span>
                            </td>
                            <td>
                                <span class="text-sm text-surface-500">{{ candidate.email || '无邮箱' }} / {{ candidate.mobile || '无手机' }}</span>
                            </td>
                            <td>
                                <span class="text-xs text-surface-500 break-all">{{ candidate.subjectId }}</span>
                            </td>
                            <td>
                                <p-button label="绑定" size="small" icon="pi pi-check" [loading]="store.savingBindingUserId() === userId()" (onClick)="bindCandidate(candidate)" />
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="5" class="text-center py-6 text-surface-400">{{ emptySearchText() }}</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>
            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="关闭" severity="secondary" [outlined]="true" (onClick)="bindingDialogVisible = false" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class UserExternalIdentityPanel {
    readonly userId = input.required<string>();
    readonly userDisplayName = input.required<string>();
    readonly store = inject(IdentityProviderStore);

    protected readonly ExternalIdentityBindingStatus = ExternalIdentityBindingStatus;

    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);

    readonly selectedConfigId = signal<string | null>(null);
    readonly bindings = computed(() => this.store.bindingsByUserId()[this.userId()] ?? []);
    readonly bindableConfigs = computed(() =>
        this.store
            .configs()
            .filter(
                (config) =>
                    config.provider === IdentityProvider.Feishu &&
                    config.status === IdentityProviderConfigStatus.Active &&
                    config.enabled &&
                    config.bindingEnabled &&
                    config.searchEnabled
            )
    );
    readonly providerOptions = computed<ProviderOption[]>(() => this.bindableConfigs().map((config) => ({ label: `${config.displayName} (${this.providerLabel(config.provider)})`, value: config.id })));
    readonly grant = computed(() => {
        const configId = this.selectedConfigId();
        return configId ? (this.store.grantsByConfigId()[configId] ?? null) : null;
    });
    readonly bindingSummaryText = computed(() => {
        const activeCount = this.bindings().filter((binding) => binding.status === ExternalIdentityBindingStatus.Active).length;
        return activeCount > 0 ? `${activeCount} 个 active 绑定` : '未建立 active 绑定';
    });

    bindingDialogVisible = false;
    searchQuery = '';

    constructor() {
        effect((onCleanup) => {
            const userId = this.userId();
            let active = true;
            queueMicrotask(() => {
                if (active) {
                    void this.reloadForUser(userId);
                }
            });
            onCleanup(() => {
                active = false;
            });
        });
    }

    async openBindingDialog(): Promise<void> {
        this.bindingDialogVisible = true;
        this.searchQuery = '';
        this.store.clearSearchResults();
        await this.ensureConfigsAndGrant();
    }

    async selectConfig(configId: string | null | undefined): Promise<void> {
        this.selectedConfigId.set(configId ?? null);
        this.store.clearSearchResults();
        if (configId) {
            await this.loadGrant(configId);
        }
    }

    async refreshGrant(): Promise<void> {
        const configId = this.selectedConfigId();
        if (!configId) return;
        await this.loadGrant(configId);
    }

    async authorizeGrant(): Promise<void> {
        const configId = this.selectedConfigId();
        if (!configId) return;

        try {
            const result = await this.store.authorizeCurrentAdminGrant(configId);
            window.open(result.authorizeUrl, '_blank', 'noopener,noreferrer');
            this.messageService.add({ severity: 'info', summary: '授权已打开', detail: '授权会自动申请用户搜索所需权限；完成后回到当前窗口刷新状态。' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '授权失败', detail: '无法生成飞书授权地址' });
        }
    }

    async searchCandidates(): Promise<void> {
        const configId = this.selectedConfigId();
        const query = this.searchQuery.trim();
        if (!configId || query.length < 2) {
            this.messageService.add({ severity: 'warn', summary: '请输入姓名', detail: '至少输入 2 个字符' });
            return;
        }
        const blocker = this.searchBlocker();
        if (blocker) {
            this.messageService.add({ severity: 'warn', summary: '暂不能搜索', detail: blocker });
            return;
        }

        try {
            await this.store.searchExternalUsers(configId, query, 20);
        } catch (error) {
            this.messageService.add({ severity: 'error', summary: '搜索失败', detail: this.searchErrorDetail(error) });
            await this.loadGrant(configId);
        }
    }

    async bindCandidate(candidate: ExternalUserCandidate): Promise<void> {
        try {
            await this.store.bindUserExternalIdentity(this.userId(), {
                identityProviderConfigId: candidate.identityProviderConfigId,
                tenantId: candidate.tenantId,
                subjectId: candidate.subjectId,
                unionId: candidate.unionId,
                subjectDisplayName: candidate.displayName,
                avatarUrl: candidate.avatarUrl,
                email: candidate.email,
                mobile: candidate.mobile
            });
            this.bindingDialogVisible = false;
            this.store.clearSearchResults();
            this.messageService.add({ severity: 'success', summary: '绑定成功', detail: `${this.userDisplayName()} 已绑定 ${candidate.displayName}` });
        } catch {
            this.messageService.add({ severity: 'error', summary: '绑定失败', detail: '该外部身份可能已被绑定' });
        }
    }

    confirmUnbind(binding: ExternalIdentityBindingSummary): void {
        this.confirmationService.confirm({
            message: `确认解绑 ${binding.subjectDisplayName || binding.subjectId}？`,
            header: '确认解绑外部身份',
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: { label: '取消', severity: 'secondary', outlined: true },
            acceptButtonProps: { label: '解绑', severity: 'danger' },
            accept: () => void this.unbind(binding)
        });
    }

    async unbind(binding: ExternalIdentityBindingSummary): Promise<void> {
        try {
            await this.store.unbindExternalIdentity(binding, { expectedVersion: binding.rowVersion });
            this.messageService.add({ severity: 'success', summary: '已解绑', detail: '外部身份绑定已解除' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '解绑失败', detail: '绑定状态已变化，请刷新后重试' });
        }
    }

    providerLabel(provider: IdentityProvider): string {
        return PROVIDER_LABELS[provider] ?? provider;
    }

    bindingStatusLabel(status: ExternalIdentityBindingStatus): string {
        return BINDING_STATUS_LABELS[status] ?? status;
    }

    bindingStatusSeverity(status: ExternalIdentityBindingStatus): TagSeverity {
        return status === ExternalIdentityBindingStatus.Active ? 'success' : 'secondary';
    }

    grantStatusLabel(status: IdentityProviderOAuthGrantStatus): string {
        return GRANT_STATUS_LABELS[status] ?? status;
    }

    grantStatusSeverity(status: IdentityProviderOAuthGrantStatus): TagSeverity {
        if (status === IdentityProviderOAuthGrantStatus.Active) return 'success';
        if (status === IdentityProviderOAuthGrantStatus.Missing) return 'secondary';
        return 'warn';
    }

    canSearch(): boolean {
        return this.searchQuery.trim().length >= 2 && this.searchBlocker() === null;
    }

    grantGuidance(): string | null {
        const configId = this.selectedConfigId();
        if (!configId) return null;

        const grant = this.grant();
        if (!grant) return '尚未读取授权状态，请刷新后再搜索飞书用户。';
        if (grant.status === IdentityProviderOAuthGrantStatus.Missing) return '当前管理员尚未授权飞书用户搜索。';
        if (grant.status === IdentityProviderOAuthGrantStatus.Expired) return '飞书搜索授权已过期，请重新授权。';
        if (grant.status === IdentityProviderOAuthGrantStatus.Revoked) return '飞书搜索授权已撤销，请重新授权。';
        const missingScopes = grant.missingRequiredScopes ?? [];
        if (missingScopes.length > 0) return `当前授权缺少飞书用户搜索权限（${missingScopes.join(', ')}），请重新授权。`;
        if (grant.lastError) return `最近一次搜索失败：${grant.lastError}`;
        return null;
    }

    grantRequiresAuthorization(): boolean {
        const grant = this.grant();
        if (!this.selectedConfigId()) return false;
        return !grant || grant.status !== IdentityProviderOAuthGrantStatus.Active || (grant.missingRequiredScopes ?? []).length > 0;
    }

    departmentText(candidate: ExternalUserCandidate): string {
        return candidate.departmentNames.length > 0 ? candidate.departmentNames.join(' / ') : '未返回';
    }

    emptySearchText(): string {
        if (this.store.searchingConfigId() === this.selectedConfigId()) return '搜索中...';
        if (!this.selectedConfigId()) return '请选择配置';
        const blocker = this.searchBlocker();
        if (blocker) return blocker;
        return '暂无候选人';
    }

    private searchBlocker(): string | null {
        const grant = this.grant();
        if (!this.selectedConfigId()) return '请选择配置';
        if (!grant || grant.status === IdentityProviderOAuthGrantStatus.Missing) return '当前管理员尚未授权搜索';
        if (grant.status === IdentityProviderOAuthGrantStatus.Expired) return '飞书搜索授权已过期，请重新授权';
        if (grant.status === IdentityProviderOAuthGrantStatus.Revoked) return '飞书搜索授权已撤销，请重新授权';
        const missingScopes = grant.missingRequiredScopes ?? [];
        if (missingScopes.length > 0) return `缺少飞书搜索权限：${missingScopes.join(', ')}；请重新授权`;
        if (grant.status !== IdentityProviderOAuthGrantStatus.Active) return '当前授权状态不可用';
        return null;
    }

    private searchErrorDetail(error: unknown): string {
        if (!(error instanceof HttpErrorResponse)) return '飞书用户搜索没有完成，请稍后重试。';

        const body = error.error as ProviderSearchErrorBody | string | null;
        if (typeof body === 'string') return body.trim() || '飞书用户搜索没有完成，请稍后重试。';
        if (!body || typeof body !== 'object') return '飞书用户搜索没有完成，请稍后重试。';

        const message = serverMessage(body.message) ?? '飞书用户搜索没有完成。';
        const missingScopes = stringArray(body.missingRequiredScopes);
        const nextActions = stringArray(body.nextActions);
        const providerLogId = typeof body.providerLogId === 'string' && body.providerLogId.trim() ? body.providerLogId.trim() : null;
        const details = [missingScopes.length ? `缺少权限：${missingScopes.join(', ')}` : null, nextActions[0] ?? null, providerLogId ? `飞书 log_id：${providerLogId}` : null].filter(Boolean);
        return [message, ...details].join(' ');
    }

    private async reloadForUser(userId: string): Promise<void> {
        await Promise.all([this.store.loadUserExternalIdentities(userId), this.ensureConfigsAndGrant()]);
    }

    private async ensureConfigsAndGrant(): Promise<void> {
        if (!this.store.loaded()) {
            await this.store.loadConfigs({
                provider: IdentityProvider.Feishu,
                status: IdentityProviderConfigStatus.Active
            });
        }
        const currentConfigId = this.selectedConfigId();
        const configs = this.bindableConfigs();
        const nextConfig = currentConfigId && configs.some((config) => config.id === currentConfigId) ? currentConfigId : (configs[0]?.id ?? null);
        this.selectedConfigId.set(nextConfig);
        if (nextConfig) {
            await this.loadGrant(nextConfig);
        }
    }

    private async loadGrant(configId: string): Promise<void> {
        try {
            await this.store.loadCurrentAdminGrant(configId);
        } catch {
            this.messageService.add({ severity: 'warn', summary: '授权状态不可用', detail: '请稍后重试' });
        }
    }
}
