import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
    AttachmentStorageProviderConfigStatus,
    AttachmentStorageProviderConnectionTestStatus,
    AttachmentStorageProviderType,
    type AttachmentStorageProviderConfigSummary,
    type AttachmentStorageProviderConnectionTestResult
} from '@poms/admin-data-access';
import {
    attachmentStorageProviderDescription,
    attachmentStorageProviderIcon,
    attachmentStorageProviderLabel,
    attachmentStorageProviderShortLabel
} from '../../shared/ui/attachment-storage-provider-presentation';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

type TagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

const STATUS_LABELS: Record<AttachmentStorageProviderConfigStatus, string> = {
    [AttachmentStorageProviderConfigStatus.Draft]: '草稿',
    [AttachmentStorageProviderConfigStatus.Active]: '已激活',
    [AttachmentStorageProviderConfigStatus.Disabled]: '已停用',
    [AttachmentStorageProviderConfigStatus.Misconfigured]: '配置异常'
};

@Component({
    selector: 'app-attachment-storage-provider-card',
    standalone: true,
    imports: [CommonModule, ButtonModule, TagModule],
    template: `
        <article class="flex h-full min-h-[30rem] flex-col rounded border border-surface-200 bg-surface-0 p-6 dark:border-surface-700 dark:bg-surface-900">
            <div class="flex items-start justify-between gap-4">
                <div class="flex min-w-0 items-start gap-3">
                    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-surface-100 text-primary-700 dark:bg-surface-800 dark:text-primary-300">
                        <i [class]="attachmentStorageProviderIcon(providerType())"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">{{ attachmentStorageProviderShortLabel(providerType()) }}</p>
                        @if (config(); as currentConfig) {
                            <h2 class="mt-1 truncate text-lg font-semibold leading-7 text-surface-950 dark:text-surface-0">{{ currentConfig.displayName }}</h2>
                        } @else {
                            <h2 class="mt-1 truncate text-lg font-semibold leading-7 text-surface-950 dark:text-surface-0">{{ attachmentStorageProviderLabel(providerType()) }}</h2>
                        }
                        <p class="mt-1 line-clamp-2 text-sm leading-5 text-surface-500 dark:text-surface-400">{{ attachmentStorageProviderDescription(providerType()) }}</p>
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
                    <p-tag [value]="currentConfig.enabled ? '启用' : '停用'" [severity]="currentConfig.enabled ? 'success' : 'secondary'" styleClass="justify-center rounded-[6px]" />
                    <p-tag [value]="currentConfig.isDefault ? '默认存储' : '非默认'" [severity]="currentConfig.isDefault ? 'info' : 'secondary'" styleClass="justify-center rounded-[6px]" />
                    <p-tag [value]="credentialsLabel(currentConfig)" [severity]="credentialsSeverity(currentConfig)" styleClass="justify-center rounded-[6px]" />
                    <p-tag [value]="accessModeLabel(currentConfig)" severity="secondary" styleClass="justify-center rounded-[6px]" />
                </div>

                <div class="mt-5 flex flex-col gap-4">
                    <div class="grid grid-cols-[7rem_1fr] gap-3 text-sm">
                        <span class="text-surface-500 dark:text-surface-400">Provider</span>
                        <span class="text-surface-800 dark:text-surface-100">{{ attachmentStorageProviderLabel(currentConfig.providerType) }}</span>

                        <span class="text-surface-500 dark:text-surface-400">Endpoint</span>
                        <span class="truncate font-mono text-surface-800 dark:text-surface-100">{{ currentConfig.endpoint || endpointFallback(currentConfig.providerType) }}</span>

                        <span class="text-surface-500 dark:text-surface-400">Region</span>
                        <span class="truncate font-mono text-surface-800 dark:text-surface-100">{{ currentConfig.region || '-' }}</span>

                        <span class="text-surface-500 dark:text-surface-400">Bucket</span>
                        <span class="truncate font-mono text-surface-800 dark:text-surface-100">{{ currentConfig.bucket || bucketFallback(currentConfig.providerType) }}</span>

                        <span class="text-surface-500 dark:text-surface-400">Key Prefix</span>
                        <span class="truncate font-mono text-surface-800 dark:text-surface-100">{{ currentConfig.keyPrefix || 'root' }}</span>

                        <span class="text-surface-500 dark:text-surface-400">版本</span>
                        <span class="font-mono text-surface-800 dark:text-surface-100">v{{ currentConfig.rowVersion }}</span>
                    </div>

                    <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <div class="flex flex-col gap-1">
                            <span class="text-sm font-medium text-surface-700 dark:text-surface-200">凭据更新时间</span>
                            <span class="line-clamp-2 break-all text-xs text-surface-500 dark:text-surface-400">{{ currentConfig.credentialsUpdatedAt || '未更新凭据' }}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-sm font-medium text-surface-700 dark:text-surface-200">更新时间</span>
                            <span class="line-clamp-2 break-all text-xs text-surface-500 dark:text-surface-400">{{ currentConfig.updatedAt }}</span>
                        </div>
                    </div>
                </div>
            } @else {
                <div class="mt-5 grid grid-cols-2 gap-2">
                    <p-tag value="未启用" severity="secondary" styleClass="justify-center rounded-[6px]" />
                    <p-tag value="非默认" severity="secondary" styleClass="justify-center rounded-[6px]" />
                    <p-tag [value]="providerType() === huaweiObsProviderType ? 'AK/SK 未配置' : '无需 AK/SK'" [severity]="providerType() === huaweiObsProviderType ? 'warn' : 'success'" styleClass="justify-center rounded-[6px]" />
                    <p-tag value="待配置" severity="warn" styleClass="justify-center rounded-[6px]" />
                </div>

                <div class="mt-5 flex flex-col gap-4">
                    <div class="grid grid-cols-[7rem_1fr] gap-3 text-sm">
                        <span class="text-surface-500 dark:text-surface-400">Provider</span>
                        <span class="text-surface-800 dark:text-surface-100">{{ attachmentStorageProviderLabel(providerType()) }}</span>

                        <span class="text-surface-500 dark:text-surface-400">Endpoint</span>
                        <span class="text-surface-800 dark:text-surface-100">{{ endpointFallback(providerType()) }}</span>

                        <span class="text-surface-500 dark:text-surface-400">Bucket</span>
                        <span class="text-surface-800 dark:text-surface-100">{{ bucketFallback(providerType()) }}</span>

                        <span class="text-surface-500 dark:text-surface-400">Key Prefix</span>
                        <span class="font-mono text-surface-800 dark:text-surface-100">root</span>
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
                    <p-button
                        icon="pi pi-check-circle"
                        [label]="currentConfig.isDefault ? '已是默认' : '设为默认'"
                        severity="success"
                        [outlined]="!currentConfig.isDefault"
                        styleClass="w-full rounded-md!"
                        [disabled]="!canSetDefault(currentConfig)"
                        [loading]="settingDefault()"
                        (onClick)="setDefaultRequested.emit(currentConfig)"
                    />
                } @else {
                    <p-button icon="pi pi-cog" label="配置" severity="primary" styleClass="w-full rounded-md!" (onClick)="configureRequested.emit(providerType())" />
                }
            </div>
        </article>
    `
})
export class AttachmentStorageProviderCard {
    readonly providerType = input.required<AttachmentStorageProviderType>();
    readonly config = input<AttachmentStorageProviderConfigSummary | null>(null);
    readonly testing = input(false);
    readonly settingDefault = input(false);
    readonly testResult = input<AttachmentStorageProviderConnectionTestResult | null>(null);

    readonly configureRequested = output<AttachmentStorageProviderType>();
    readonly editRequested = output<AttachmentStorageProviderConfigSummary>();
    readonly testRequested = output<AttachmentStorageProviderConfigSummary>();
    readonly setDefaultRequested = output<AttachmentStorageProviderConfigSummary>();

    readonly huaweiObsProviderType = AttachmentStorageProviderType.HuaweiObsS3;
    readonly attachmentStorageProviderLabel = attachmentStorageProviderLabel;
    readonly attachmentStorageProviderShortLabel = attachmentStorageProviderShortLabel;
    readonly attachmentStorageProviderIcon = attachmentStorageProviderIcon;
    readonly attachmentStorageProviderDescription = attachmentStorageProviderDescription;

    statusLabel(status: AttachmentStorageProviderConfigStatus): string {
        return STATUS_LABELS[status] ?? status;
    }

    statusSeverity(status: AttachmentStorageProviderConfigStatus): TagSeverity {
        switch (status) {
            case AttachmentStorageProviderConfigStatus.Active:
                return 'success';
            case AttachmentStorageProviderConfigStatus.Disabled:
                return 'secondary';
            case AttachmentStorageProviderConfigStatus.Misconfigured:
                return 'danger';
            default:
                return 'warn';
        }
    }

    credentialsLabel(config: AttachmentStorageProviderConfigSummary): string {
        if (config.providerType === AttachmentStorageProviderType.Local) return '无需 AK/SK';
        return config.accessKeyConfigured && config.secretAccessKeyConfigured ? 'AK/SK 已配置' : 'AK/SK 未完整';
    }

    credentialsSeverity(config: AttachmentStorageProviderConfigSummary): TagSeverity {
        if (config.providerType === AttachmentStorageProviderType.Local) return 'success';
        return config.accessKeyConfigured && config.secretAccessKeyConfigured ? 'success' : 'warn';
    }

    accessModeLabel(config: AttachmentStorageProviderConfigSummary): string {
        if (config.providerType === AttachmentStorageProviderType.Local) return 'Proxy';
        return config.forcePathStyle ? 'Path-style' : 'Virtual-hosted';
    }

    endpointFallback(providerType: AttachmentStorageProviderType): string {
        return providerType === AttachmentStorageProviderType.Local ? 'POMS local proxy' : '未配置 endpoint';
    }

    bucketFallback(providerType: AttachmentStorageProviderType): string {
        return providerType === AttachmentStorageProviderType.Local ? '本地附件目录' : '未配置 bucket';
    }

    canSetDefault(config: AttachmentStorageProviderConfigSummary): boolean {
        return config.enabled && config.status === AttachmentStorageProviderConfigStatus.Active && !config.isDefault;
    }

    connectionResultLabel(result: AttachmentStorageProviderConnectionTestResult): string {
        return result.status === AttachmentStorageProviderConnectionTestStatus.Success ? '测试通过' : '测试失败';
    }

    connectionResultSeverity(result: AttachmentStorageProviderConnectionTestResult): 'success' | 'danger' {
        return result.status === AttachmentStorageProviderConnectionTestStatus.Success ? 'success' : 'danger';
    }
}
