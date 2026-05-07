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
        <article class="flex h-full min-h-[28rem] flex-col rounded-[8px] border border-surface-200 bg-surface-0 p-5 shadow-sm transition-colors hover:border-primary-200 dark:border-surface-700 dark:bg-surface-900 dark:hover:border-primary-700">
            <div class="flex items-start justify-between gap-4">
                <div class="flex min-w-0 items-start gap-3">
                    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300">
                        <i [class]="providerIcon(config().provider)"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">{{ providerLabel(config().provider) }}</p>
                        <h2 class="mt-1 truncate text-lg font-semibold leading-7 text-surface-950 dark:text-surface-0">{{ config().displayName }}</h2>
                        <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">租户: {{ config().tenantId || '默认' }}</p>
                    </div>
                </div>
                <p-tag [value]="statusLabel(config().status)" [severity]="statusSeverity(config().status)" styleClass="rounded-[6px]" />
            </div>

            <div class="mt-5 grid grid-cols-2 gap-2">
                <p-tag [value]="config().enabled ? '总开关' : '总开关关闭'" [severity]="config().enabled ? 'success' : 'secondary'" styleClass="justify-center rounded-[6px]" />
                <p-tag [value]="config().loginEnabled ? '登录' : '登录关闭'" [severity]="config().loginEnabled ? 'info' : 'secondary'" styleClass="justify-center rounded-[6px]" />
                <p-tag [value]="config().bindingEnabled ? '绑定' : '绑定关闭'" [severity]="config().bindingEnabled ? 'info' : 'secondary'" styleClass="justify-center rounded-[6px]" />
                <p-tag [value]="config().searchEnabled ? '搜索' : '搜索关闭'" [severity]="config().searchEnabled ? 'info' : 'secondary'" styleClass="justify-center rounded-[6px]" />
            </div>

            <div class="mt-5 flex flex-col gap-4">
                <div class="grid grid-cols-[7rem_1fr] gap-3 text-sm">
                    <span class="text-surface-500 dark:text-surface-400">Client ID</span>
                    <span class="truncate font-mono text-surface-800 dark:text-surface-100">{{ config().clientId }}</span>

                    <span class="text-surface-500 dark:text-surface-400">Secret</span>
                    <span>
                        <p-tag [value]="config().secretConfigured ? 'secret 已配置' : 'secret 未配置'" [severity]="config().secretConfigured ? 'success' : 'warn'" styleClass="rounded-[6px]" />
                    </span>

                    <span class="text-surface-500 dark:text-surface-400">授权模式</span>
                    <span class="text-surface-800 dark:text-surface-100">{{ searchGrantModeLabel(config().searchGrantMode) }}</span>

                    <span class="text-surface-500 dark:text-surface-400">版本</span>
                    <span class="font-mono text-surface-800 dark:text-surface-100">v{{ config().rowVersion }}</span>
                </div>

                <div class="flex flex-col gap-2">
                    <span class="text-sm font-medium text-surface-700 dark:text-surface-200">Redirect URI</span>
                    <span class="line-clamp-2 break-all text-sm text-surface-500 dark:text-surface-400">{{ config().redirectUri || '未配置 redirect URI' }}</span>
                </div>

                <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <div class="flex flex-col gap-1">
                        <span class="text-sm font-medium text-surface-700 dark:text-surface-200">Login scopes</span>
                        <span class="line-clamp-2 break-all text-xs text-surface-500 dark:text-surface-400">{{ scopeText(config().loginScopes) }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                        <span class="text-sm font-medium text-surface-700 dark:text-surface-200">Search scopes</span>
                        <span class="line-clamp-2 break-all text-xs text-surface-500 dark:text-surface-400">{{ scopeText(config().searchScopes) }}</span>
                    </div>
                </div>
            </div>

            <div class="mt-auto flex flex-col gap-3 pt-5">
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
                    <p-button icon="pi pi-pencil" label="编辑" severity="secondary" [outlined]="true" styleClass="w-full rounded-md!" (onClick)="editRequested.emit(config())" />
                    <p-button icon="pi pi-bolt" label="测试连接" severity="secondary" [outlined]="true" styleClass="w-full rounded-md!" [loading]="testing()" (onClick)="testRequested.emit(config())" />
                </div>
            </div>
        </article>
    `
})
export class IdentityProviderCard {
    readonly config = input.required<IdentityProviderConfigSummary>();
    readonly testing = input(false);
    readonly testResult = input<IdentityProviderConnectionTestResult | null>(null);
    readonly editRequested = output<IdentityProviderConfigSummary>();
    readonly testRequested = output<IdentityProviderConfigSummary>();

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
