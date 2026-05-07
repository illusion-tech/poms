import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
    IdentityProvider,
    IdentityProviderConfigStatus,
    IdentityProviderConnectionTestStatus,
    IdentityProviderSearchGrantMode,
    type IdentityProviderConfigSummary,
    type IdentityProviderConnectionTestResult
} from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

type TagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

const PROVIDER_LABELS: Record<IdentityProvider, string> = {
    [IdentityProvider.Feishu]: '飞书'
};

const PROVIDER_ICONS: Record<IdentityProvider, string> = {
    [IdentityProvider.Feishu]: 'pi pi-send'
};

const PROVIDER_LOGOS: Partial<Record<IdentityProvider, string>> = {
    [IdentityProvider.Feishu]: '/identity-providers/feishu.svg'
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

@Component({
    selector: 'app-identity-provider-card',
    standalone: true,
    imports: [CommonModule, ButtonModule, TagModule],
    template: `
        <article class="flex h-full min-h-[28rem] flex-col rounded-[8px] border border-surface-200 bg-surface-0 p-5 shadow-sm transition-colors hover:border-primary-200 dark:border-surface-700 dark:bg-surface-900 dark:hover:border-primary-700" [class.border-dashed]="!config()">
            <div class="flex items-start justify-between gap-4">
                <div class="flex min-w-0 items-start gap-3">
                    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300">
                        @if (providerLogo(provider()); as logoSrc) {
                            <img [src]="logoSrc" [alt]="providerLabel(provider()) + ' logo'" class="h-7 w-7 object-contain" />
                        } @else {
                            <i [class]="providerIcon(provider())"></i>
                        }
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">{{ providerLabel(provider()) }}</p>
                        @if (config(); as currentConfig) {
                            <h2 class="mt-1 truncate text-lg font-semibold leading-7 text-surface-950 dark:text-surface-0">{{ currentConfig.displayName }}</h2>
                            <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">租户: {{ currentConfig.tenantId || '默认' }}</p>
                        } @else {
                            <h2 class="mt-1 truncate text-lg font-semibold leading-7 text-surface-950 dark:text-surface-0">{{ providerLabel(provider()) }}</h2>
                            <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">租户: 默认</p>
                        }
                    </div>
                </div>
                @if (config(); as currentConfig) {
                    <p-tag [value]="statusLabel(currentConfig.status)" [severity]="statusSeverity(currentConfig.status)" styleClass="rounded-[6px]" />
                } @else {
                    <p-tag value="待配置" severity="warn" styleClass="rounded-[6px]" />
                }
            </div>

            @if (config(); as currentConfig) {
                <div class="mt-5 grid grid-cols-2 gap-2">
                    <p-tag [value]="currentConfig.enabled ? '总开关' : '总开关关闭'" [severity]="currentConfig.enabled ? 'success' : 'secondary'" styleClass="justify-center rounded-[6px]" />
                    <p-tag [value]="currentConfig.loginEnabled ? '登录' : '登录关闭'" [severity]="currentConfig.loginEnabled ? 'info' : 'secondary'" styleClass="justify-center rounded-[6px]" />
                    <p-tag [value]="currentConfig.bindingEnabled ? '绑定' : '绑定关闭'" [severity]="currentConfig.bindingEnabled ? 'info' : 'secondary'" styleClass="justify-center rounded-[6px]" />
                    <p-tag [value]="currentConfig.searchEnabled ? '搜索' : '搜索关闭'" [severity]="currentConfig.searchEnabled ? 'info' : 'secondary'" styleClass="justify-center rounded-[6px]" />
                </div>

                <div class="mt-5 flex flex-col gap-4">
                    <div class="grid grid-cols-[7rem_1fr] gap-3 text-sm">
                        <span class="text-surface-500 dark:text-surface-400">Client ID</span>
                        <span class="truncate font-mono text-surface-800 dark:text-surface-100">{{ currentConfig.clientId }}</span>

                        <span class="text-surface-500 dark:text-surface-400">Secret</span>
                        <span>
                            <p-tag [value]="currentConfig.secretConfigured ? 'secret 已配置' : 'secret 未配置'" [severity]="currentConfig.secretConfigured ? 'success' : 'warn'" styleClass="rounded-[6px]" />
                        </span>

                        <span class="text-surface-500 dark:text-surface-400">授权模式</span>
                        <span class="text-surface-800 dark:text-surface-100">{{ searchGrantModeLabel(currentConfig.searchGrantMode) }}</span>

                        <span class="text-surface-500 dark:text-surface-400">版本</span>
                        <span class="font-mono text-surface-800 dark:text-surface-100">v{{ currentConfig.rowVersion }}</span>
                    </div>

                    <div class="flex flex-col gap-2">
                        <span class="text-sm font-medium text-surface-700 dark:text-surface-200">Redirect URI</span>
                        <span class="line-clamp-2 break-all text-sm text-surface-500 dark:text-surface-400">{{ currentConfig.redirectUri || '未配置 redirect URI' }}</span>
                    </div>

                    <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <div class="flex flex-col gap-1">
                            <span class="text-sm font-medium text-surface-700 dark:text-surface-200">Login scopes</span>
                            <span class="line-clamp-2 break-all text-xs text-surface-500 dark:text-surface-400">{{ scopeText(currentConfig.loginScopes) }}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-sm font-medium text-surface-700 dark:text-surface-200">Search scopes</span>
                            <span class="line-clamp-2 break-all text-xs text-surface-500 dark:text-surface-400">{{ scopeText(currentConfig.searchScopes) }}</span>
                        </div>
                    </div>
                </div>
            } @else {
                <div class="mt-5 grid grid-cols-2 gap-2">
                    <p-tag value="总开关" severity="secondary" styleClass="justify-center rounded-[6px]" />
                    <p-tag value="登录" severity="secondary" styleClass="justify-center rounded-[6px]" />
                    <p-tag value="绑定" severity="secondary" styleClass="justify-center rounded-[6px]" />
                    <p-tag value="搜索" severity="secondary" styleClass="justify-center rounded-[6px]" />
                </div>

                <div class="mt-5 flex flex-col gap-4">
                    <div class="grid grid-cols-[7rem_1fr] gap-3 text-sm">
                        <span class="text-surface-500 dark:text-surface-400">Provider</span>
                        <span class="text-surface-800 dark:text-surface-100">{{ providerLabel(provider()) }}</span>

                        <span class="text-surface-500 dark:text-surface-400">Secret</span>
                        <span>
                            <p-tag value="secret 未配置" severity="warn" styleClass="rounded-[6px]" />
                        </span>

                        <span class="text-surface-500 dark:text-surface-400">授权模式</span>
                        <span class="text-surface-800 dark:text-surface-100">{{ searchGrantModeLabel(defaultSearchGrantMode) }}</span>

                        <span class="text-surface-500 dark:text-surface-400">版本</span>
                        <span class="font-mono text-surface-800 dark:text-surface-100">-</span>
                    </div>

                    <div class="flex flex-col gap-2">
                        <span class="text-sm font-medium text-surface-700 dark:text-surface-200">Redirect URI</span>
                        <span class="line-clamp-2 break-all text-sm text-surface-500 dark:text-surface-400">未配置 redirect URI</span>
                    </div>

                    <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <div class="flex flex-col gap-1">
                            <span class="text-sm font-medium text-surface-700 dark:text-surface-200">Login scopes</span>
                            <span class="line-clamp-2 break-all text-xs text-surface-500 dark:text-surface-400">未配置</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-sm font-medium text-surface-700 dark:text-surface-200">Search scopes</span>
                            <span class="line-clamp-2 break-all text-xs text-surface-500 dark:text-surface-400">未配置</span>
                        </div>
                    </div>
                </div>
            }

            <div class="mt-auto flex flex-col gap-3 pt-5">
                @if (config(); as currentConfig) {
                    @if (testResult(); as result) {
                        <div class="flex items-center justify-between gap-3 rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                            <div class="min-w-0">
                                <p class="text-sm font-medium text-surface-800 dark:text-surface-100">{{ connectionResultLabel(result) }}</p>
                                <p class="truncate text-xs text-surface-500 dark:text-surface-400">{{ result.message }}</p>
                            </div>
                            <p-tag [value]="connectionResultLabel(result)" [severity]="connectionResultSeverity(result)" styleClass="rounded-[6px]" />
                        </div>
                    }

                    <div class="flex flex-col gap-2 sm:flex-row">
                        <p-button icon="pi pi-pencil" label="编辑" severity="secondary" [outlined]="true" styleClass="w-full rounded-md!" (onClick)="editRequested.emit(currentConfig)" />
                        <p-button icon="pi pi-bolt" label="测试连接" severity="secondary" [outlined]="true" styleClass="w-full rounded-md!" [loading]="testing()" (onClick)="testRequested.emit(currentConfig)" />
                    </div>
                } @else {
                    <p-button icon="pi pi-cog" label="配置" severity="primary" styleClass="w-full rounded-md!" (onClick)="configureRequested.emit(provider())" />
                }
            </div>
        </article>
    `
})
export class IdentityProviderCard {
    readonly provider = input.required<IdentityProvider>();
    readonly config = input<IdentityProviderConfigSummary | null>(null);
    readonly testing = input(false);
    readonly testResult = input<IdentityProviderConnectionTestResult | null>(null);
    readonly configureRequested = output<IdentityProvider>();
    readonly editRequested = output<IdentityProviderConfigSummary>();
    readonly testRequested = output<IdentityProviderConfigSummary>();

    readonly defaultSearchGrantMode = IdentityProviderSearchGrantMode.PerAdmin;

    providerLogo(provider: IdentityProvider): string | null {
        return PROVIDER_LOGOS[provider] ?? null;
    }

    providerLabel(provider: IdentityProvider): string {
        return PROVIDER_LABELS[provider] ?? provider;
    }

    providerIcon(provider: IdentityProvider): string {
        return PROVIDER_ICONS[provider] ?? 'pi pi-id-card';
    }

    statusLabel(status: IdentityProviderConfigStatus): string {
        return STATUS_LABELS[status] ?? status;
    }

    statusSeverity(status: IdentityProviderConfigStatus): TagSeverity {
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
}
