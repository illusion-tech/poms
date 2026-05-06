import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    IdentityProvider,
    IdentityProviderConfigStatus,
    IdentityProviderConnectionTestStatus,
    IdentityProviderSearchGrantMode,
    IdentityProviderStore,
    type IdentityProviderConfigSummary,
    type IdentityProviderConnectionTestResult
} from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

type ProviderFilterValue = IdentityProvider | 'all';
type StatusFilterValue = IdentityProviderConfigStatus | 'all';

interface Option<T extends string> {
    label: string;
    value: T;
}

interface IdentityProviderForm {
    id: string;
    provider: IdentityProvider;
    tenantId: string;
    displayName: string;
    enabled: boolean;
    loginEnabled: boolean;
    bindingEnabled: boolean;
    searchEnabled: boolean;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    loginScopesText: string;
    searchScopesText: string;
    tenantAllowlistText: string;
    searchGrantMode: IdentityProviderSearchGrantMode;
    status: IdentityProviderConfigStatus;
    secretConfigured: boolean;
    expectedVersion: number;
}

const ALL_FILTER_VALUE = 'all';

const PROVIDER_LABELS: Record<IdentityProvider, string> = {
    [IdentityProvider.Feishu]: '飞书'
};

const STATUS_LABELS: Record<IdentityProviderConfigStatus, string> = {
    [IdentityProviderConfigStatus.Draft]: '草稿',
    [IdentityProviderConfigStatus.Active]: '已激活',
    [IdentityProviderConfigStatus.Disabled]: '已停用',
    [IdentityProviderConfigStatus.Misconfigured]: '配置异常'
};

const SEARCH_GRANT_MODE_LABELS: Record<IdentityProviderSearchGrantMode, string> = {
    [IdentityProviderSearchGrantMode.PerAdmin]: '管理员授权',
    [IdentityProviderSearchGrantMode.ServiceAccount]: '服务账号'
};

const PROVIDER_OPTIONS: Option<IdentityProvider>[] = (Object.values(IdentityProvider) as IdentityProvider[]).map((provider) => ({
    label: PROVIDER_LABELS[provider] ?? provider,
    value: provider
}));

const PROVIDER_FILTER_OPTIONS: Option<ProviderFilterValue>[] = [{ label: '全部 provider', value: ALL_FILTER_VALUE }, ...PROVIDER_OPTIONS];

const STATUS_OPTIONS: Option<IdentityProviderConfigStatus>[] = (Object.values(IdentityProviderConfigStatus) as IdentityProviderConfigStatus[]).map((status) => ({
    label: STATUS_LABELS[status] ?? status,
    value: status
}));

const STATUS_FILTER_OPTIONS: Option<StatusFilterValue>[] = [{ label: '全部状态', value: ALL_FILTER_VALUE }, ...STATUS_OPTIONS];

const SEARCH_GRANT_MODE_OPTIONS: Option<IdentityProviderSearchGrantMode>[] = (Object.values(IdentityProviderSearchGrantMode) as IdentityProviderSearchGrantMode[]).map((mode) => ({
    label: SEARCH_GRANT_MODE_LABELS[mode] ?? mode,
    value: mode
}));

const EMPTY_FORM: IdentityProviderForm = {
    id: '',
    provider: IdentityProvider.Feishu,
    tenantId: '',
    displayName: '',
    enabled: false,
    loginEnabled: false,
    bindingEnabled: false,
    searchEnabled: false,
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    loginScopesText: '',
    searchScopesText: '',
    tenantAllowlistText: '',
    searchGrantMode: IdentityProviderSearchGrantMode.PerAdmin,
    status: IdentityProviderConfigStatus.Draft,
    secretConfigured: false,
    expectedVersion: 0
};

@Component({
    selector: 'app-identity-provider-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        SelectModule,
        TagModule,
        TextareaModule,
        ToastModule,
        ToggleSwitchModule,
        TooltipModule
    ],
    providers: [IdentityProviderStore, MessageService],
    template: `
        <p-toast />
        <div class="flex flex-col gap-5">
            <section class="flex flex-col gap-4 border-b border-surface-200 pb-5 dark:border-surface-700">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-surface-500 dark:text-surface-400">平台配置</p>
                        <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">外部身份提供商</h1>
                    </div>

                    <p-button label="新增 Provider" icon="pi pi-plus" severity="primary" styleClass="w-full sm:w-auto rounded-md!" (onClick)="showCreateDialog()" />
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">配置数</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ configs().length }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">已激活</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-emerald-700 dark:text-emerald-300">{{ activeCount() }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">登录入口</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-sky-700 dark:text-sky-300">{{ loginEnabledCount() }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">搜索绑定</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ searchEnabledCount() }}</div>
                    </div>
                </div>
            </section>

            @if (pageError()) {
                <div class="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{{ pageError() }}</div>
            }

            <section class="overflow-hidden rounded-[8px] border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900">
                <p-table
                    [value]="configs()"
                    [loading]="store.loading()"
                    [rowHover]="true"
                    [showGridlines]="true"
                    [paginator]="true"
                    [rows]="10"
                    dataKey="id"
                    responsiveLayout="scroll"
                    [tableStyle]="{ width: '100%', 'min-width': '92rem' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示 {first} 到 {last}，共 {totalRecords} 个 Provider 配置"
                    [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                >
                    <ng-template #caption>
                        <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div class="flex flex-col gap-3 md:flex-row md:items-center">
                                <p-select
                                    [ngModel]="providerFilter()"
                                    (ngModelChange)="setProviderFilter($event)"
                                    [options]="providerFilterOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo="body"
                                    ariaLabel="按 provider 筛选"
                                    styleClass="w-full md:w-48 rounded-md!"
                                />

                                <p-select
                                    [ngModel]="statusFilter()"
                                    (ngModelChange)="setStatusFilter($event)"
                                    [options]="statusFilterOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo="body"
                                    ariaLabel="按状态筛选"
                                    styleClass="w-full md:w-40 rounded-md!"
                                />
                            </div>

                            <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" styleClass="rounded-md!" [loading]="store.loading()" (onClick)="reload()" />
                        </div>
                    </ng-template>

                    <ng-template #header>
                        <tr>
                            <th class="min-w-64">Provider</th>
                            <th class="min-w-40">状态</th>
                            <th class="min-w-64">能力开关</th>
                            <th class="min-w-64">凭据</th>
                            <th class="min-w-64">OAuth</th>
                            <th class="min-w-48">搜索授权</th>
                            <th class="min-w-28">版本</th>
                            <th class="min-w-56">操作</th>
                        </tr>
                    </ng-template>

                    <ng-template #body let-config>
                        <tr>
                            <td>
                                <div class="flex flex-col gap-1">
                                    <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ config.displayName }}</span>
                                    <span class="text-xs font-mono text-surface-500">{{ providerLabel(config.provider) }}</span>
                                    <span class="text-xs text-surface-500">租户: {{ config.tenantId || '默认' }}</span>
                                </div>
                            </td>
                            <td>
                                <p-tag [value]="statusLabel(config.status)" [severity]="statusSeverity(config.status)" styleClass="rounded-[6px]" />
                            </td>
                            <td>
                                <div class="flex flex-wrap gap-2">
                                    <p-tag [value]="config.enabled ? '总开关' : '总开关关闭'" [severity]="config.enabled ? 'success' : 'secondary'" styleClass="rounded-[6px]" />
                                    <p-tag [value]="config.loginEnabled ? '登录' : '登录关闭'" [severity]="config.loginEnabled ? 'info' : 'secondary'" styleClass="rounded-[6px]" />
                                    <p-tag [value]="config.bindingEnabled ? '绑定' : '绑定关闭'" [severity]="config.bindingEnabled ? 'info' : 'secondary'" styleClass="rounded-[6px]" />
                                    <p-tag [value]="config.searchEnabled ? '搜索' : '搜索关闭'" [severity]="config.searchEnabled ? 'info' : 'secondary'" styleClass="rounded-[6px]" />
                                </div>
                            </td>
                            <td>
                                <div class="flex flex-col gap-1">
                                    <span class="text-xs font-mono text-surface-700 dark:text-surface-200">{{ config.clientId }}</span>
                                    <p-tag [value]="config.secretConfigured ? 'secret 已配置' : 'secret 未配置'" [severity]="config.secretConfigured ? 'success' : 'warn'" styleClass="w-fit rounded-[6px]" />
                                </div>
                            </td>
                            <td>
                                <div class="flex flex-col gap-1">
                                    <span class="break-all text-xs text-surface-600 dark:text-surface-300">{{ config.redirectUri || '未配置 redirect URI' }}</span>
                                    <span class="text-xs text-surface-500">login scopes: {{ scopeText(config.loginScopes) }}</span>
                                </div>
                            </td>
                            <td>
                                <div class="flex flex-col gap-1">
                                    <span class="text-sm text-surface-700 dark:text-surface-200">{{ searchGrantModeLabel(config.searchGrantMode) }}</span>
                                    <span class="text-xs text-surface-500">search scopes: {{ scopeText(config.searchScopes) }}</span>
                                </div>
                            </td>
                            <td>
                                <span class="text-xs font-mono text-surface-600 dark:text-surface-300">v{{ config.rowVersion }}</span>
                            </td>
                            <td>
                                <div class="flex flex-wrap gap-2">
                                    <p-button icon="pi pi-pencil" label="编辑" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="showEditDialog(config)" />
                                    <p-button
                                        icon="pi pi-bolt"
                                        label="测试"
                                        size="small"
                                        severity="secondary"
                                        [outlined]="true"
                                        styleClass="rounded-md!"
                                        [loading]="store.testingConfigId() === config.id"
                                        (onClick)="testConnection(config)"
                                    />
                                </div>
                                @if (testResults()[config.id]; as result) {
                                    <div class="mt-2">
                                        <p-tag [value]="connectionResultLabel(result)" [severity]="connectionResultSeverity(result)" styleClass="rounded-[6px]" />
                                    </div>
                                }
                            </td>
                        </tr>
                    </ng-template>

                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="8" class="px-6 py-12 text-center text-surface-500 dark:text-surface-400">{{ store.loading() ? '正在读取 Provider 配置' : '暂无 Provider 配置' }}</td>
                        </tr>
                    </ng-template>
                </p-table>
            </section>

            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新增 Provider 配置" [style]="{ width: 'min(52rem, 94vw)' }" styleClass="p-fluid" (onHide)="resetFormError()">
                <ng-container *ngTemplateOutlet="providerFormTemplate; context: { mode: 'create' }" />
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="createDialogVisible = false" />
                        <p-button label="创建" [loading]="store.saving()" [disabled]="!canSubmitCreate()" styleClass="rounded-md!" (onClick)="createConfig()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑 Provider 配置" [style]="{ width: 'min(52rem, 94vw)' }" styleClass="p-fluid" (onHide)="resetFormError()">
                <ng-container *ngTemplateOutlet="providerFormTemplate; context: { mode: 'edit' }" />
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="editDialogVisible = false" />
                        <p-button label="保存" [loading]="store.saving()" [disabled]="!canSubmitEdit()" styleClass="rounded-md!" (onClick)="updateConfig()" />
                    </div>
                </ng-template>
            </p-dialog>

            <ng-template #providerFormTemplate let-mode="mode">
                <div class="flex flex-col gap-5 py-2">
                    @if (formError()) {
                        <div class="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{{ formError() }}</div>
                    }

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label for="identityProviderProvider" class="text-sm font-medium text-surface-900 dark:text-surface-0">Provider *</label>
                            <p-select
                                inputId="identityProviderProvider"
                                [ngModel]="form().provider"
                                (ngModelChange)="updateProvider($event)"
                                [options]="providerOptions"
                                optionLabel="label"
                                optionValue="value"
                                appendTo="body"
                                [disabled]="mode === 'edit'"
                                styleClass="w-full rounded-md!"
                            />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="identityProviderTenant" class="text-sm font-medium text-surface-900 dark:text-surface-0">租户 ID</label>
                            <input pInputText id="identityProviderTenant" [ngModel]="form().tenantId" (ngModelChange)="updateText('tenantId', $event)" [disabled]="mode === 'edit'" placeholder="默认租户可留空" class="w-full rounded-md!" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="identityProviderDisplayName" class="text-sm font-medium text-surface-900 dark:text-surface-0">显示名称 *</label>
                            <input pInputText id="identityProviderDisplayName" [ngModel]="form().displayName" (ngModelChange)="updateText('displayName', $event)" class="w-full rounded-md!" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="identityProviderClientId" class="text-sm font-medium text-surface-900 dark:text-surface-0">Client ID *</label>
                            <input pInputText id="identityProviderClientId" [ngModel]="form().clientId" (ngModelChange)="updateText('clientId', $event)" class="w-full rounded-md!" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="identityProviderClientSecret" class="text-sm font-medium text-surface-900 dark:text-surface-0">Client Secret</label>
                            <input
                                pInputText
                                id="identityProviderClientSecret"
                                type="password"
                                [ngModel]="form().clientSecret"
                                (ngModelChange)="updateText('clientSecret', $event)"
                                [placeholder]="mode === 'edit' && form().secretConfigured ? '留空则不更新已有 secret' : '输入 provider client secret'"
                                class="w-full rounded-md!"
                            />
                            @if (mode === 'edit') {
                                <span class="text-xs text-surface-500 dark:text-surface-400">{{ form().secretConfigured ? '当前已有 secret；保存时只有填写新值才会覆盖。' : '当前未配置 secret。' }}</span>
                            }
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="identityProviderRedirectUri" class="text-sm font-medium text-surface-900 dark:text-surface-0">Redirect URI</label>
                            <input pInputText id="identityProviderRedirectUri" [ngModel]="form().redirectUri" (ngModelChange)="updateText('redirectUri', $event)" placeholder="https://poms.example.com/auth/identity-providers:callback" class="w-full rounded-md!" />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <label class="flex items-center justify-between gap-3 rounded-[8px] border border-surface-200 px-3 py-3 dark:border-surface-700">
                            <span class="text-sm font-medium text-surface-800 dark:text-surface-100">总开关</span>
                            <p-toggleswitch [ngModel]="form().enabled" (ngModelChange)="updateToggle('enabled', $event)" />
                        </label>
                        <label class="flex items-center justify-between gap-3 rounded-[8px] border border-surface-200 px-3 py-3 dark:border-surface-700">
                            <span class="text-sm font-medium text-surface-800 dark:text-surface-100">登录</span>
                            <p-toggleswitch [ngModel]="form().loginEnabled" (ngModelChange)="updateToggle('loginEnabled', $event)" />
                        </label>
                        <label class="flex items-center justify-between gap-3 rounded-[8px] border border-surface-200 px-3 py-3 dark:border-surface-700">
                            <span class="text-sm font-medium text-surface-800 dark:text-surface-100">绑定</span>
                            <p-toggleswitch [ngModel]="form().bindingEnabled" (ngModelChange)="updateToggle('bindingEnabled', $event)" />
                        </label>
                        <label class="flex items-center justify-between gap-3 rounded-[8px] border border-surface-200 px-3 py-3 dark:border-surface-700">
                            <span class="text-sm font-medium text-surface-800 dark:text-surface-100">搜索</span>
                            <p-toggleswitch [ngModel]="form().searchEnabled" (ngModelChange)="updateToggle('searchEnabled', $event)" />
                        </label>
                    </div>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label for="identityProviderSearchMode" class="text-sm font-medium text-surface-900 dark:text-surface-0">搜索授权模式</label>
                            <p-select inputId="identityProviderSearchMode" [ngModel]="form().searchGrantMode" (ngModelChange)="updateSearchGrantMode($event)" [options]="searchGrantModeOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full rounded-md!" />
                        </div>
                        @if (mode === 'edit') {
                            <div class="flex flex-col gap-2">
                                <label for="identityProviderStatus" class="text-sm font-medium text-surface-900 dark:text-surface-0">状态</label>
                                <p-select inputId="identityProviderStatus" [ngModel]="form().status" (ngModelChange)="updateStatus($event)" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full rounded-md!" />
                            </div>
                        }
                    </div>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div class="flex flex-col gap-2">
                            <label for="identityProviderLoginScopes" class="text-sm font-medium text-surface-900 dark:text-surface-0">Login scopes</label>
                            <textarea pTextarea id="identityProviderLoginScopes" rows="3" [ngModel]="form().loginScopesText" (ngModelChange)="updateText('loginScopesText', $event)" placeholder="每行或空格分隔一个 scope" class="w-full rounded-md!"></textarea>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="identityProviderSearchScopes" class="text-sm font-medium text-surface-900 dark:text-surface-0">Search scopes</label>
                            <textarea pTextarea id="identityProviderSearchScopes" rows="3" [ngModel]="form().searchScopesText" (ngModelChange)="updateText('searchScopesText', $event)" placeholder="每行或空格分隔一个 scope" class="w-full rounded-md!"></textarea>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="identityProviderTenantAllowlist" class="text-sm font-medium text-surface-900 dark:text-surface-0">Tenant allowlist</label>
                            <textarea pTextarea id="identityProviderTenantAllowlist" rows="3" [ngModel]="form().tenantAllowlistText" (ngModelChange)="updateText('tenantAllowlistText', $event)" placeholder="每行一个外部租户 ID" class="w-full rounded-md!"></textarea>
                        </div>
                    </div>
                </div>
            </ng-template>
        </div>
    `
})
export class IdentityProviderList {
    readonly store = inject(IdentityProviderStore);
    readonly #messageService = inject(MessageService);

    readonly providerOptions = PROVIDER_OPTIONS;
    readonly providerFilterOptions = PROVIDER_FILTER_OPTIONS;
    readonly statusOptions = STATUS_OPTIONS;
    readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
    readonly searchGrantModeOptions = SEARCH_GRANT_MODE_OPTIONS;

    readonly providerFilter = signal<ProviderFilterValue>(ALL_FILTER_VALUE);
    readonly statusFilter = signal<StatusFilterValue>(ALL_FILTER_VALUE);
    readonly pageError = signal<string | null>(null);
    readonly formError = signal<string | null>(null);
    readonly form = signal<IdentityProviderForm>({ ...EMPTY_FORM });
    readonly testResults = signal<Record<string, IdentityProviderConnectionTestResult>>({});

    createDialogVisible = false;
    editDialogVisible = false;

    readonly configs = this.store.configs;
    readonly activeCount = computed(() => this.configs().filter((config) => config.status === IdentityProviderConfigStatus.Active).length);
    readonly loginEnabledCount = computed(() => this.configs().filter((config) => config.enabled && config.loginEnabled).length);
    readonly searchEnabledCount = computed(() => this.configs().filter((config) => config.enabled && config.searchEnabled).length);

    constructor() {
        void this.reload();
    }

    async reload(): Promise<void> {
        this.pageError.set(null);
        const provider = this.providerFilter();
        const status = this.statusFilter();
        try {
            await this.store.loadConfigs({
                provider: provider === ALL_FILTER_VALUE ? undefined : provider,
                status: status === ALL_FILTER_VALUE ? undefined : status
            });
        } catch {
            this.pageError.set('Provider 配置没有读取成功，请确认权限或稍后重试。');
        }
    }

    setProviderFilter(value: ProviderFilterValue | null | undefined): void {
        this.providerFilter.set(value ?? ALL_FILTER_VALUE);
        void this.reload();
    }

    setStatusFilter(value: StatusFilterValue | null | undefined): void {
        this.statusFilter.set(value ?? ALL_FILTER_VALUE);
        void this.reload();
    }

    showCreateDialog(): void {
        this.form.set({ ...EMPTY_FORM });
        this.formError.set(null);
        this.createDialogVisible = true;
    }

    showEditDialog(config: IdentityProviderConfigSummary): void {
        this.form.set({
            id: config.id,
            provider: config.provider,
            tenantId: config.tenantId ?? '',
            displayName: config.displayName,
            enabled: config.enabled,
            loginEnabled: config.loginEnabled,
            bindingEnabled: config.bindingEnabled,
            searchEnabled: config.searchEnabled,
            clientId: config.clientId,
            clientSecret: '',
            redirectUri: config.redirectUri ?? '',
            loginScopesText: config.loginScopes.join('\n'),
            searchScopesText: config.searchScopes.join('\n'),
            tenantAllowlistText: config.tenantAllowlist.join('\n'),
            searchGrantMode: config.searchGrantMode,
            status: config.status,
            secretConfigured: config.secretConfigured,
            expectedVersion: config.rowVersion
        });
        this.formError.set(null);
        this.editDialogVisible = true;
    }

    resetFormError(): void {
        this.formError.set(null);
    }

    updateProvider(value: IdentityProvider | null | undefined): void {
        this.form.update((form) => ({ ...form, provider: value ?? IdentityProvider.Feishu }));
        this.formError.set(null);
    }

    updateStatus(value: IdentityProviderConfigStatus | null | undefined): void {
        this.form.update((form) => ({ ...form, status: value ?? IdentityProviderConfigStatus.Draft }));
        this.formError.set(null);
    }

    updateSearchGrantMode(value: IdentityProviderSearchGrantMode | null | undefined): void {
        this.form.update((form) => ({ ...form, searchGrantMode: value ?? IdentityProviderSearchGrantMode.PerAdmin }));
        this.formError.set(null);
    }

    updateText(field: 'tenantId' | 'displayName' | 'clientId' | 'clientSecret' | 'redirectUri' | 'loginScopesText' | 'searchScopesText' | 'tenantAllowlistText', value: string): void {
        this.form.update((form) => ({ ...form, [field]: value }));
        this.formError.set(null);
    }

    updateToggle(field: 'enabled' | 'loginEnabled' | 'bindingEnabled' | 'searchEnabled', value: boolean): void {
        this.form.update((form) => ({ ...form, [field]: Boolean(value) }));
        this.formError.set(null);
    }

    canSubmitCreate(): boolean {
        return this.validateForm(false, false);
    }

    canSubmitEdit(): boolean {
        return this.validateForm(true, false);
    }

    async createConfig(): Promise<void> {
        if (!this.validateForm(false, true)) return;

        const form = this.form();
        try {
            await this.store.createConfig({
                provider: form.provider,
                tenantId: this.optionalText(form.tenantId),
                displayName: form.displayName.trim(),
                enabled: form.enabled,
                loginEnabled: form.loginEnabled,
                bindingEnabled: form.bindingEnabled,
                searchEnabled: form.searchEnabled,
                clientId: form.clientId.trim(),
                clientSecret: this.optionalText(form.clientSecret) ?? undefined,
                redirectUri: this.optionalText(form.redirectUri),
                loginScopes: this.toList(form.loginScopesText),
                searchScopes: this.toList(form.searchScopesText),
                tenantAllowlist: this.toList(form.tenantAllowlistText),
                searchGrantMode: form.searchGrantMode
            });
            this.createDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '创建成功', detail: `${form.displayName.trim()} 已创建` });
            await this.reload();
        } catch {
            this.formError.set('Provider 配置没有创建成功，请确认租户未重复、secret 和 redirect URI 满足启用条件。');
        }
    }

    async updateConfig(): Promise<void> {
        if (!this.validateForm(true, true)) return;

        const form = this.form();
        try {
            await this.store.updateConfig(form.id, {
                displayName: form.displayName.trim(),
                enabled: form.enabled,
                loginEnabled: form.loginEnabled,
                bindingEnabled: form.bindingEnabled,
                searchEnabled: form.searchEnabled,
                clientId: form.clientId.trim(),
                ...(this.optionalText(form.clientSecret) ? { clientSecret: form.clientSecret.trim() } : {}),
                redirectUri: this.optionalText(form.redirectUri),
                loginScopes: this.toList(form.loginScopesText),
                searchScopes: this.toList(form.searchScopesText),
                tenantAllowlist: this.toList(form.tenantAllowlistText),
                searchGrantMode: form.searchGrantMode,
                status: form.status,
                expectedVersion: form.expectedVersion
            });
            this.editDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '保存成功', detail: `${form.displayName.trim()} 已更新` });
            await this.reload();
        } catch {
            this.formError.set('Provider 配置没有保存成功，请刷新后重试。');
        }
    }

    async testConnection(config: IdentityProviderConfigSummary): Promise<void> {
        try {
            const result = await this.store.testConnection(config.id, { expectedVersion: config.rowVersion });
            this.testResults.update((results) => ({ ...results, [config.id]: result }));
            this.#messageService.add({
                severity: result.status === IdentityProviderConnectionTestStatus.Success ? 'success' : 'warn',
                summary: result.status === IdentityProviderConnectionTestStatus.Success ? '测试通过' : '测试失败',
                detail: result.message
            });
        } catch {
            this.pageError.set('测试连接没有完成，请刷新配置后重试。');
        }
    }

    providerLabel(provider: IdentityProvider): string {
        return PROVIDER_LABELS[provider] ?? provider;
    }

    statusLabel(status: IdentityProviderConfigStatus): string {
        return STATUS_LABELS[status] ?? status;
    }

    statusSeverity(status: IdentityProviderConfigStatus): 'success' | 'secondary' | 'warn' | 'danger' {
        switch (status) {
            case IdentityProviderConfigStatus.Active:
                return 'success';
            case IdentityProviderConfigStatus.Disabled:
                return 'secondary';
            case IdentityProviderConfigStatus.Misconfigured:
                return 'danger';
            default:
                return 'warn';
        }
    }

    searchGrantModeLabel(mode: IdentityProviderSearchGrantMode): string {
        return SEARCH_GRANT_MODE_LABELS[mode] ?? mode;
    }

    scopeText(scopes: string[]): string {
        return scopes.length ? scopes.join(', ') : '未配置';
    }

    connectionResultLabel(result: IdentityProviderConnectionTestResult): string {
        return result.status === IdentityProviderConnectionTestStatus.Success ? '测试通过' : '测试失败';
    }

    connectionResultSeverity(result: IdentityProviderConnectionTestResult): 'success' | 'danger' {
        return result.status === IdentityProviderConnectionTestStatus.Success ? 'success' : 'danger';
    }

    private validateForm(isEdit: boolean, setError: boolean): boolean {
        const form = this.form();
        const hasSecret = Boolean(form.clientSecret.trim()) || (isEdit && form.secretConfigured);
        const requiresSecret = form.enabled || form.loginEnabled || form.bindingEnabled || form.searchEnabled || form.status === IdentityProviderConfigStatus.Active;

        let error: string | null = null;
        if (!form.displayName.trim()) {
            error = '请填写显示名称。';
        } else if (!form.clientId.trim()) {
            error = '请填写 Client ID。';
        } else if (requiresSecret && !hasSecret) {
            error = '启用 provider、登录、绑定、搜索或激活状态前必须配置 Client Secret。';
        } else if (form.loginEnabled && !form.redirectUri.trim()) {
            error = '启用登录前必须配置 Redirect URI。';
        } else if (form.status === IdentityProviderConfigStatus.Active && !form.enabled) {
            error = '激活状态必须同时打开总开关。';
        }

        if (setError) {
            this.formError.set(error);
        }
        return error === null;
    }

    private optionalText(value: string): string | null {
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
    }

    private toList(value: string): string[] {
        return value
            .split(/[\s,;]+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
}
