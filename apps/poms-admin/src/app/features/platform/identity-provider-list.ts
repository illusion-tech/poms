import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
import { identityProviderLabel } from '../../shared/ui/identity-provider-presentation';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { IdentityProviderCard } from './identity-provider-card';
import { ProviderCardGrid } from './provider-card-grid';

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
    searchRedirectUri: string;
    loginScopesText: string;
    searchScopesText: string;
    tenantAllowlistText: string;
    searchGrantMode: IdentityProviderSearchGrantMode;
    status: IdentityProviderConfigStatus;
    secretConfigured: boolean;
    expectedVersion: number;
}

interface IdentityProviderCardSlot {
    key: string;
    provider: IdentityProvider;
    config: IdentityProviderConfigSummary | null;
}

const ALL_FILTER_VALUE = 'all';

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
    label: identityProviderLabel(provider),
    value: provider
}));

const PROVIDER_FILTER_OPTIONS: Option<ProviderFilterValue>[] = [{ label: '全部提供商', value: ALL_FILTER_VALUE }, ...PROVIDER_OPTIONS];

const STATUS_OPTIONS: Option<IdentityProviderConfigStatus>[] = (Object.values(IdentityProviderConfigStatus) as IdentityProviderConfigStatus[]).map((status) => ({
    label: STATUS_LABELS[status] ?? status,
    value: status
}));

const STATUS_FILTER_OPTIONS: Option<StatusFilterValue>[] = [{ label: '全部状态', value: ALL_FILTER_VALUE }, ...STATUS_OPTIONS];

const SEARCH_GRANT_MODE_OPTIONS: Option<IdentityProviderSearchGrantMode>[] = (Object.values(IdentityProviderSearchGrantMode) as IdentityProviderSearchGrantMode[]).map((mode) => ({
    label: SEARCH_GRANT_MODE_LABELS[mode] ?? mode,
    value: mode
}));

const FEISHU_CONFIG_TIPS = {
    clientId: '填写飞书开放平台应用凭证中的 AppID。',
    clientSecret: '填写飞书开放平台应用凭证中的 AppSecret。POMS 只保存加密后的 secret，保存后不会回显明文。',
    redirectUri: '填写飞书登录 OAuth 回调地址，并在飞书开放平台的重定向 URL 白名单中配置完全一致的地址。登录联调使用前端 /auth/identity-providers:callback。',
    searchRedirectUri: '填写管理员搜索授权 OAuth 回调地址，并加入飞书重定向 URL 白名单。第一版通常使用后端 /api/platform/identity-provider-oauth-grants:callback。',
    loginScopes: '用于员工登录身份读取的飞书授权范围。按飞书开放平台实际开通的权限填写，每行或空格分隔一个 scope。',
    searchScopes: '用于管理员姓名模糊搜索飞书用户的授权范围。第一版通常需要 contact:user:search，并要求管理员完成个人授权。',
    searchGrantMode: '第一版选择“管理员授权”。每个管理员用自己的飞书授权进行搜索，不使用全局通讯录同步。',
    tenantAllowlist: '限制允许登录或绑定的飞书租户 ID。默认租户可留空；多租户场景每行填写一个外部租户 ID。'
} as const;

const AUTH_EXPIRED_MESSAGE = '登录已过期，请重新登录后再操作。';

function isAuthExpiredError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
}

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
    searchRedirectUri: '',
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
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TextareaModule, ToastModule, ToggleSwitchModule, TooltipModule, IdentityProviderCard, ProviderCardGrid],
    providers: [IdentityProviderStore, MessageService],
    styles: [
        `
            .provider-help-trigger {
                display: inline-flex;
                width: 1rem;
                height: 1rem;
                min-width: 1rem;
                align-items: center;
                justify-content: center;
                border: 1px solid currentColor;
                border-radius: 9999px;
                color: var(--p-surface-400);
                background: transparent;
                line-height: 1;
                transition:
                    color 0.15s ease,
                    box-shadow 0.15s ease;
            }

            .provider-help-trigger:hover,
            .provider-help-trigger:focus-visible {
                color: var(--p-primary-color);
            }

            .provider-help-trigger:focus-visible {
                outline: 2px solid var(--p-primary-color);
                outline-offset: 2px;
            }

            .provider-help-icon {
                font-size: 0.5rem;
                line-height: 1;
            }
        `
    ],
    template: `
        <p-toast />
        <div class="flex flex-col gap-5">
            <section class="flex flex-col gap-4 border-b border-surface-200 pb-5 dark:border-surface-700">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-surface-500 dark:text-surface-400">平台配置</p>
                        <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">企业协同接入</h1>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">已配置</div>
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

            <section class="flex flex-col gap-4">
                <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div class="flex flex-col gap-3 md:flex-row md:items-center">
                        <p-select
                            [ngModel]="providerFilter()"
                            (ngModelChange)="setProviderFilter($event)"
                            [options]="providerFilterOptions"
                            optionLabel="label"
                            optionValue="value"
                            appendTo="body"
                            ariaLabel="按提供商筛选"
                            class="w-full md:w-48 rounded-md!"
                        />

                        <p-select
                            [ngModel]="statusFilter()"
                            (ngModelChange)="setStatusFilter($event)"
                            [options]="statusFilterOptions"
                            optionLabel="label"
                            optionValue="value"
                            appendTo="body"
                            ariaLabel="按状态筛选"
                            class="w-full md:w-40 rounded-md!"
                        />
                    </div>

                    <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" styleClass="rounded-md!" [loading]="store.loading()" (onClick)="reload()" />
                </div>

                @if (store.loading()) {
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-6 py-12 text-center text-surface-500 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400">正在读取企业协同接入配置</div>
                } @else if (providerCards().length === 0) {
                    <div class="rounded-[8px] border border-dashed border-surface-300 bg-surface-0 px-6 py-12 text-center dark:border-surface-700 dark:bg-surface-900">
                        <p class="text-base font-medium text-surface-900 dark:text-surface-0">没有符合筛选条件的提供商配置</p>
                    </div>
                } @else {
                    <app-provider-card-grid>
                        @for (card of providerCards(); track card.key) {
                            <app-identity-provider-card
                                [provider]="card.provider"
                                [config]="card.config"
                                [testing]="isCardTesting(card)"
                                [testResult]="testResultForCard(card)"
                                (configureRequested)="showCreateDialog($event)"
                                (editRequested)="showEditDialog($event)"
                                (testRequested)="testConnection($event)"
                            />
                        }
                    </app-provider-card-grid>
                }
            </section>

            <p-dialog [(visible)]="createDialogVisible" [modal]="true" [header]="createDialogHeader()" [style]="{ width: 'min(52rem, 94vw)' }" styleClass="p-fluid" (onHide)="resetFormError()">
                <ng-container *ngTemplateOutlet="providerFormTemplate; context: { mode: 'create' }" />
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="createDialogVisible = false" />
                        <p-button label="创建" [loading]="store.saving()" [disabled]="!canSubmitCreate()" styleClass="rounded-md!" (onClick)="createConfig()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑提供商配置" [style]="{ width: 'min(52rem, 94vw)' }" styleClass="p-fluid" (onHide)="resetFormError()">
                <ng-container *ngTemplateOutlet="providerFormTemplate; context: { mode: 'edit' }" />
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="editDialogVisible = false" />
                        <p-button
                            icon="pi pi-bolt"
                            label="保存并测试"
                            severity="secondary"
                            [outlined]="true"
                            [loading]="store.saving() || isEditDialogTesting()"
                            [disabled]="!canSubmitEdit()"
                            styleClass="rounded-md!"
                            (onClick)="updateAndTestConfig()"
                        />
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
                            <label for="identityProviderProvider" class="text-sm font-medium text-surface-900 dark:text-surface-0">提供商 *</label>
                            <p-select
                                inputId="identityProviderProvider"
                                [ngModel]="form().provider"
                                (ngModelChange)="updateProvider($event)"
                                [options]="providerOptions"
                                optionLabel="label"
                                optionValue="value"
                                appendTo="body"
                                [disabled]="mode === 'edit' || createProviderLocked"
                                class="w-full rounded-md!"
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
                            <div class="flex items-center gap-2">
                                <label for="identityProviderClientId" class="text-sm font-medium text-surface-900 dark:text-surface-0">Client ID *</label>
                                <button type="button" class="provider-help-trigger" [pTooltip]="feishuConfigTip('clientId')" tooltipPosition="top" aria-label="飞书 AppID 配置说明">
                                    <i class="pi pi-question provider-help-icon"></i>
                                </button>
                            </div>
                            <input pInputText id="identityProviderClientId" [ngModel]="form().clientId" (ngModelChange)="updateText('clientId', $event)" class="w-full rounded-md!" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <label for="identityProviderClientSecret" class="text-sm font-medium text-surface-900 dark:text-surface-0">Client Secret</label>
                                <button type="button" class="provider-help-trigger" [pTooltip]="feishuConfigTip('clientSecret')" tooltipPosition="top" aria-label="飞书 AppSecret 配置说明">
                                    <i class="pi pi-question provider-help-icon"></i>
                                </button>
                            </div>
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
                            <div class="flex items-center gap-2">
                                <label for="identityProviderRedirectUri" class="text-sm font-medium text-surface-900 dark:text-surface-0">Redirect URI</label>
                                <button type="button" class="provider-help-trigger" [pTooltip]="feishuConfigTip('redirectUri')" tooltipPosition="top" aria-label="飞书 Redirect URI 配置说明">
                                    <i class="pi pi-question provider-help-icon"></i>
                                </button>
                            </div>
                            <input
                                pInputText
                                id="identityProviderRedirectUri"
                                [ngModel]="form().redirectUri"
                                (ngModelChange)="updateText('redirectUri', $event)"
                                placeholder="https://poms.example.com/auth/identity-providers:callback"
                                class="w-full rounded-md!"
                            />
                        </div>
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <label for="identityProviderSearchRedirectUri" class="text-sm font-medium text-surface-900 dark:text-surface-0">Search Redirect URI</label>
                                <button type="button" class="provider-help-trigger" [pTooltip]="feishuConfigTip('searchRedirectUri')" tooltipPosition="top" aria-label="飞书 Search Redirect URI 配置说明">
                                    <i class="pi pi-question provider-help-icon"></i>
                                </button>
                            </div>
                            <input
                                pInputText
                                id="identityProviderSearchRedirectUri"
                                [ngModel]="form().searchRedirectUri"
                                (ngModelChange)="updateText('searchRedirectUri', $event)"
                                placeholder="https://poms.example.com/api/platform/identity-provider-oauth-grants:callback"
                                class="w-full rounded-md!"
                            />
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
                            <div class="flex items-center gap-2">
                                <label for="identityProviderSearchMode" class="text-sm font-medium text-surface-900 dark:text-surface-0">搜索授权模式</label>
                                <button type="button" class="provider-help-trigger" [pTooltip]="feishuConfigTip('searchGrantMode')" tooltipPosition="top" aria-label="飞书搜索授权模式配置说明">
                                    <i class="pi pi-question provider-help-icon"></i>
                                </button>
                            </div>
                            <p-select
                                inputId="identityProviderSearchMode"
                                [ngModel]="form().searchGrantMode"
                                (ngModelChange)="updateSearchGrantMode($event)"
                                [options]="searchGrantModeOptions"
                                optionLabel="label"
                                optionValue="value"
                                appendTo="body"
                                class="w-full rounded-md!"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <label for="identityProviderLoginScopes" class="text-sm font-medium text-surface-900 dark:text-surface-0">Login scopes</label>
                                <button type="button" class="provider-help-trigger" [pTooltip]="feishuConfigTip('loginScopes')" tooltipPosition="top" aria-label="飞书 Login scopes 配置说明">
                                    <i class="pi pi-question provider-help-icon"></i>
                                </button>
                            </div>
                            <textarea
                                pTextarea
                                id="identityProviderLoginScopes"
                                rows="3"
                                [ngModel]="form().loginScopesText"
                                (ngModelChange)="updateText('loginScopesText', $event)"
                                placeholder="每行或空格分隔一个 scope"
                                class="w-full rounded-md!"
                            ></textarea>
                        </div>
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <label for="identityProviderSearchScopes" class="text-sm font-medium text-surface-900 dark:text-surface-0">Search scopes</label>
                                <button type="button" class="provider-help-trigger" [pTooltip]="feishuConfigTip('searchScopes')" tooltipPosition="top" aria-label="飞书 Search scopes 配置说明">
                                    <i class="pi pi-question provider-help-icon"></i>
                                </button>
                            </div>
                            <textarea
                                pTextarea
                                id="identityProviderSearchScopes"
                                rows="3"
                                [ngModel]="form().searchScopesText"
                                (ngModelChange)="updateText('searchScopesText', $event)"
                                placeholder="每行或空格分隔一个 scope"
                                class="w-full rounded-md!"
                            ></textarea>
                        </div>
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <label for="identityProviderTenantAllowlist" class="text-sm font-medium text-surface-900 dark:text-surface-0">Tenant allowlist</label>
                                <button type="button" class="provider-help-trigger" [pTooltip]="feishuConfigTip('tenantAllowlist')" tooltipPosition="top" aria-label="飞书 Tenant allowlist 配置说明">
                                    <i class="pi pi-question provider-help-icon"></i>
                                </button>
                            </div>
                            <textarea
                                pTextarea
                                id="identityProviderTenantAllowlist"
                                rows="3"
                                [ngModel]="form().tenantAllowlistText"
                                (ngModelChange)="updateText('tenantAllowlistText', $event)"
                                placeholder="每行一个外部租户 ID"
                                class="w-full rounded-md!"
                            ></textarea>
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
    createProviderLocked = false;

    readonly configs = this.store.configs;
    readonly providerCards = computed<IdentityProviderCardSlot[]>(() => {
        const configs = this.configs();
        const configuredCards = configs.map((config) => ({
            key: config.id,
            provider: config.provider,
            config
        }));

        if (this.statusFilter() !== ALL_FILTER_VALUE) {
            return configuredCards;
        }

        const providerFilter = this.providerFilter();
        const configuredProviders = new Set(configs.map((config) => config.provider));
        const missingProviderCards = PROVIDER_OPTIONS.filter((option) => providerFilter === ALL_FILTER_VALUE || option.value === providerFilter)
            .filter((option) => !configuredProviders.has(option.value))
            .map((option) => ({
                key: `unconfigured-${option.value}`,
                provider: option.value,
                config: null
            }));

        return [...configuredCards, ...missingProviderCards];
    });
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
        } catch (error) {
            this.pageError.set(isAuthExpiredError(error) ? AUTH_EXPIRED_MESSAGE : '提供商配置没有读取成功，请确认权限或稍后重试。');
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

    showCreateDialog(provider: IdentityProvider = IdentityProvider.Feishu): void {
        this.createProviderLocked = true;
        this.form.set({
            ...EMPTY_FORM,
            provider,
            displayName: this.identityProviderLabel(provider)
        });
        this.formError.set(null);
        this.createDialogVisible = true;
    }

    showEditDialog(config: IdentityProviderConfigSummary): void {
        this.createProviderLocked = false;
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
            searchRedirectUri: config.searchRedirectUri ?? '',
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

    updateSearchGrantMode(value: IdentityProviderSearchGrantMode | null | undefined): void {
        this.form.update((form) => ({ ...form, searchGrantMode: value ?? IdentityProviderSearchGrantMode.PerAdmin }));
        this.formError.set(null);
    }

    updateText(field: 'tenantId' | 'displayName' | 'clientId' | 'clientSecret' | 'redirectUri' | 'searchRedirectUri' | 'loginScopesText' | 'searchScopesText' | 'tenantAllowlistText', value: string): void {
        this.form.update((form) => ({ ...form, [field]: value }));
        this.formError.set(null);
    }

    updateToggle(field: 'enabled' | 'loginEnabled' | 'bindingEnabled' | 'searchEnabled', value: boolean): void {
        this.form.update((form) => ({ ...form, [field]: Boolean(value) }));
        this.formError.set(null);
    }

    canSubmitCreate(): boolean {
        return this.validateForm(false);
    }

    canSubmitEdit(): boolean {
        return this.validateForm(false);
    }

    async createConfig(): Promise<void> {
        if (!this.validateForm(true)) return;

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
                searchRedirectUri: this.optionalText(form.searchRedirectUri),
                loginScopes: this.toList(form.loginScopesText),
                searchScopes: this.toList(form.searchScopesText),
                tenantAllowlist: this.toList(form.tenantAllowlistText),
                searchGrantMode: form.searchGrantMode
            });
            this.createDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '创建成功', detail: `${form.displayName.trim()} 已创建` });
            await this.reload();
        } catch (error) {
            this.formError.set(isAuthExpiredError(error) ? AUTH_EXPIRED_MESSAGE : '提供商配置没有创建成功，请确认租户未重复后重试。');
        }
    }

    async updateConfig(): Promise<IdentityProviderConfigSummary | null> {
        if (!this.validateForm(true)) return null;

        const form = this.form();
        try {
            const updatedConfig = await this.store.updateConfig(form.id, {
                displayName: form.displayName.trim(),
                enabled: form.enabled,
                loginEnabled: form.loginEnabled,
                bindingEnabled: form.bindingEnabled,
                searchEnabled: form.searchEnabled,
                clientId: form.clientId.trim(),
                ...(this.optionalText(form.clientSecret) ? { clientSecret: form.clientSecret.trim() } : {}),
                redirectUri: this.optionalText(form.redirectUri),
                searchRedirectUri: this.optionalText(form.searchRedirectUri),
                loginScopes: this.toList(form.loginScopesText),
                searchScopes: this.toList(form.searchScopesText),
                tenantAllowlist: this.toList(form.tenantAllowlistText),
                searchGrantMode: form.searchGrantMode,
                expectedVersion: form.expectedVersion
            });
            this.editDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '保存成功', detail: `${form.displayName.trim()} 已更新` });
            await this.reload();
            return updatedConfig;
        } catch (error) {
            this.formError.set(isAuthExpiredError(error) ? AUTH_EXPIRED_MESSAGE : '提供商配置没有保存成功，请刷新后重试。');
            return null;
        }
    }

    async updateAndTestConfig(): Promise<void> {
        const updatedConfig = await this.updateConfig();
        if (!updatedConfig) return;

        await this.testConnection(updatedConfig);
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
        } catch (error) {
            this.pageError.set(isAuthExpiredError(error) ? AUTH_EXPIRED_MESSAGE : '测试连接没有完成，请刷新配置后重试。');
        }
    }

    createDialogHeader(): string {
        return `配置 ${this.identityProviderLabel(this.form().provider)}`;
    }

    isCardTesting(card: IdentityProviderCardSlot): boolean {
        return Boolean(card.config && this.store.testingConfigId() === card.config.id);
    }

    isEditDialogTesting(): boolean {
        return Boolean(this.form().id && this.store.testingConfigId() === this.form().id);
    }

    testResultForCard(card: IdentityProviderCardSlot): IdentityProviderConnectionTestResult | null {
        return card.config ? this.testResultFor(card.config.id) : null;
    }

    readonly identityProviderLabel = identityProviderLabel;

    feishuConfigTip(field: keyof typeof FEISHU_CONFIG_TIPS): string {
        return FEISHU_CONFIG_TIPS[field];
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

    testResultFor(configId: string): IdentityProviderConnectionTestResult | null {
        return this.testResults()[configId] ?? null;
    }

    private validateForm(setError: boolean): boolean {
        const form = this.form();

        let error: string | null = null;
        if (!form.displayName.trim()) {
            error = '请填写显示名称。';
        } else if (!form.clientId.trim()) {
            error = '请填写 Client ID。';
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
