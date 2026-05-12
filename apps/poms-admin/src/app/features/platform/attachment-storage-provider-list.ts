import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    AttachmentStorageProviderConfigStatus,
    AttachmentStorageProviderConnectionTestStatus,
    AttachmentStorageProviderStore,
    AttachmentStorageProviderType,
    type AttachmentStorageProviderConfigSummary,
    type AttachmentStorageProviderConnectionTestResult,
    type CreateAttachmentStorageProviderConfigRequest,
    type UpdateAttachmentStorageProviderConfigRequest
} from '@poms/admin-data-access';
import { attachmentStorageProviderLabel } from '../../shared/ui/attachment-storage-provider-presentation';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { AttachmentStorageProviderCard } from './attachment-storage-provider-card';
import { ProviderCardGrid } from './provider-card-grid';

interface Option<T extends string> {
    label: string;
    value: T;
}

interface AttachmentStorageProviderForm {
    id: string;
    providerType: AttachmentStorageProviderType;
    displayName: string;
    enabled: boolean;
    status: AttachmentStorageProviderConfigStatus;
    endpoint: string;
    region: string;
    bucket: string;
    keyPrefix: string;
    forcePathStyle: boolean;
    accessKeyId: string;
    secretAccessKey: string;
    accessKeyConfigured: boolean;
    secretAccessKeyConfigured: boolean;
    expectedVersion: number;
}

interface AttachmentStorageProviderCardSlot {
    key: string;
    providerType: AttachmentStorageProviderType;
    config: AttachmentStorageProviderConfigSummary | null;
}

const PROVIDER_TYPES: AttachmentStorageProviderType[] = [AttachmentStorageProviderType.Local, AttachmentStorageProviderType.HuaweiObsS3];

const STATUS_LABELS: Record<AttachmentStorageProviderConfigStatus, string> = {
    [AttachmentStorageProviderConfigStatus.Draft]: '草稿',
    [AttachmentStorageProviderConfigStatus.Active]: '已激活',
    [AttachmentStorageProviderConfigStatus.Disabled]: '已停用',
    [AttachmentStorageProviderConfigStatus.Misconfigured]: '配置异常'
};

const STATUS_OPTIONS: Option<AttachmentStorageProviderConfigStatus>[] = (Object.values(AttachmentStorageProviderConfigStatus) as AttachmentStorageProviderConfigStatus[]).map((status) => ({
    label: STATUS_LABELS[status] ?? status,
    value: status
}));

const PROVIDER_OPTIONS: Option<AttachmentStorageProviderType>[] = PROVIDER_TYPES.map((providerType) => ({
    label: attachmentStorageProviderLabel(providerType),
    value: providerType
}));

const ATTACHMENT_STORAGE_TIPS = {
    endpoint: '填写华为云 OBS 的 S3 兼容 Endpoint，例如 https://obs.cn-north-4.myhuaweicloud.com。',
    region: '填写 OBS bucket 所在 region，用于后端签发 S3-compatible 请求。',
    bucket: '填写用于保存附件对象的 OBS bucket 名称。POMS 只保存对象元数据，不会把 bucket 写权限暴露给用户。',
    keyPrefix: '可选。用于把 POMS 附件对象统一写入指定目录前缀，例如 poms/attachments。',
    forcePathStyle: '如 endpoint 或网关要求 path-style 访问则开启；大多数 OBS S3-compatible endpoint 可保持关闭。',
    accessKeyId: '填写 OBS 访问密钥 ID。保存后只保留加密密文，页面不会回显明文。',
    secretAccessKey: '填写 OBS 访问密钥 Secret。保存后只保留加密密文，页面不会回显明文，编辑时留空不会覆盖已有 secret。'
} as const;

const EMPTY_FORM: AttachmentStorageProviderForm = {
    id: '',
    providerType: AttachmentStorageProviderType.Local,
    displayName: '',
    enabled: false,
    status: AttachmentStorageProviderConfigStatus.Draft,
    endpoint: '',
    region: '',
    bucket: '',
    keyPrefix: '',
    forcePathStyle: false,
    accessKeyId: '',
    secretAccessKey: '',
    accessKeyConfigured: false,
    secretAccessKeyConfigured: false,
    expectedVersion: 0
};

@Component({
    selector: 'app-attachment-storage-provider-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        SelectModule,
        TextareaModule,
        ToastModule,
        ToggleSwitchModule,
        TooltipModule,
        AttachmentStorageProviderCard,
        ProviderCardGrid
    ],
    providers: [AttachmentStorageProviderStore, MessageService],
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
                        <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">附件存储提供商</h1>
                    </div>
                    <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" styleClass="rounded-md!" [loading]="store.loading()" (onClick)="reload()" />
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">已配置</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ configs().length }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">已启用</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-emerald-700 dark:text-emerald-300">{{ enabledCount() }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">默认存储</div>
                        <div class="mt-2 truncate text-2xl font-semibold leading-8 text-sky-700 dark:text-sky-300">{{ defaultProviderLabel() }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">OBS 凭据</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ obsCredentialCount() }}</div>
                    </div>
                </div>
            </section>

            @if (pageError()) {
                <div class="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{{ pageError() }}</div>
            }

            <section class="flex flex-col gap-4">
                @if (store.loading()) {
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-6 py-12 text-center text-surface-500 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400">正在读取附件存储提供商配置</div>
                } @else {
                    <app-provider-card-grid>
                        @for (card of providerCards(); track card.key) {
                            <app-attachment-storage-provider-card
                                [providerType]="card.providerType"
                                [config]="card.config"
                                [testing]="isCardTesting(card)"
                                [settingDefault]="isCardSettingDefault(card)"
                                [testResult]="testResultForCard(card)"
                                (configureRequested)="showCreateDialog($event)"
                                (editRequested)="showEditDialog($event)"
                                (testRequested)="testConnection($event)"
                                (setDefaultRequested)="setDefaultConfig($event)"
                            />
                        }
                    </app-provider-card-grid>
                }
            </section>

            <p-dialog [(visible)]="createDialogVisible" [modal]="true" [header]="createDialogHeader()" [style]="{ width: 'min(52rem, 94vw)' }" styleClass="p-fluid" (onHide)="resetFormError()">
                <ng-container *ngTemplateOutlet="storageProviderFormTemplate; context: { mode: 'create' }" />
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="createDialogVisible = false" />
                        <p-button label="创建" [loading]="store.saving()" [disabled]="!canSubmitCreate()" styleClass="rounded-md!" (onClick)="createConfig()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑附件存储提供商" [style]="{ width: 'min(52rem, 94vw)' }" styleClass="p-fluid" (onHide)="resetFormError()">
                <ng-container *ngTemplateOutlet="storageProviderFormTemplate; context: { mode: 'edit' }" />
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="editDialogVisible = false" />
                        <p-button label="保存" [loading]="store.saving()" [disabled]="!canSubmitEdit()" styleClass="rounded-md!" (onClick)="updateConfig()" />
                    </div>
                </ng-template>
            </p-dialog>

            <ng-template #storageProviderFormTemplate let-mode="mode">
                <div class="flex flex-col gap-5 py-2">
                    @if (formError()) {
                        <div class="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{{ formError() }}</div>
                    }

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label for="attachmentStorageProviderType" class="text-sm font-medium text-surface-900 dark:text-surface-0">提供商 *</label>
                            <p-select
                                inputId="attachmentStorageProviderType"
                                [ngModel]="form().providerType"
                                (ngModelChange)="updateProviderType($event)"
                                [options]="providerOptions"
                                optionLabel="label"
                                optionValue="value"
                                appendTo="body"
                                [disabled]="true"
                                class="w-full rounded-md!"
                            />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="attachmentStorageDisplayName" class="text-sm font-medium text-surface-900 dark:text-surface-0">显示名称 *</label>
                            <input pInputText id="attachmentStorageDisplayName" [ngModel]="form().displayName" (ngModelChange)="updateText('displayName', $event)" class="w-full rounded-md!" />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <label class="flex items-center justify-between gap-3 rounded-[8px] border border-surface-200 px-3 py-3 dark:border-surface-700">
                            <span class="text-sm font-medium text-surface-800 dark:text-surface-100">启用</span>
                            <p-toggleswitch [ngModel]="form().enabled" (ngModelChange)="updateToggle('enabled', $event)" />
                        </label>
                        <label class="flex items-center justify-between gap-3 rounded-[8px] border border-surface-200 px-3 py-3 dark:border-surface-700">
                            <span class="text-sm font-medium text-surface-800 dark:text-surface-100">Path-style</span>
                            <p-toggleswitch [ngModel]="form().forcePathStyle" (ngModelChange)="updateToggle('forcePathStyle', $event)" [disabled]="!isHuaweiObsForm()" />
                        </label>
                        @if (mode === 'edit') {
                            <div class="flex flex-col gap-2">
                                <label for="attachmentStorageStatus" class="text-sm font-medium text-surface-900 dark:text-surface-0">状态</label>
                                <p-select inputId="attachmentStorageStatus" [ngModel]="form().status" (ngModelChange)="updateStatus($event)" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                            </div>
                        }
                    </div>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        @if (isHuaweiObsForm()) {
                            <div class="flex flex-col gap-2">
                                <div class="flex items-center gap-2">
                                    <label for="attachmentStorageEndpoint" class="text-sm font-medium text-surface-900 dark:text-surface-0">Endpoint</label>
                                    <button type="button" class="provider-help-trigger" [pTooltip]="storageTip('endpoint')" tooltipPosition="top" aria-label="OBS Endpoint 配置说明">
                                        <i class="pi pi-question provider-help-icon"></i>
                                    </button>
                                </div>
                                <input pInputText id="attachmentStorageEndpoint" [ngModel]="form().endpoint" (ngModelChange)="updateText('endpoint', $event)" placeholder="https://obs.cn-north-4.myhuaweicloud.com" class="w-full rounded-md!" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <div class="flex items-center gap-2">
                                    <label for="attachmentStorageRegion" class="text-sm font-medium text-surface-900 dark:text-surface-0">Region</label>
                                    <button type="button" class="provider-help-trigger" [pTooltip]="storageTip('region')" tooltipPosition="top" aria-label="OBS Region 配置说明">
                                        <i class="pi pi-question provider-help-icon"></i>
                                    </button>
                                </div>
                                <input pInputText id="attachmentStorageRegion" [ngModel]="form().region" (ngModelChange)="updateText('region', $event)" placeholder="cn-north-4" class="w-full rounded-md!" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <div class="flex items-center gap-2">
                                    <label for="attachmentStorageBucket" class="text-sm font-medium text-surface-900 dark:text-surface-0">Bucket</label>
                                    <button type="button" class="provider-help-trigger" [pTooltip]="storageTip('bucket')" tooltipPosition="top" aria-label="OBS Bucket 配置说明">
                                        <i class="pi pi-question provider-help-icon"></i>
                                    </button>
                                </div>
                                <input pInputText id="attachmentStorageBucket" [ngModel]="form().bucket" (ngModelChange)="updateText('bucket', $event)" class="w-full rounded-md!" />
                            </div>
                        }

                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <label for="attachmentStorageKeyPrefix" class="text-sm font-medium text-surface-900 dark:text-surface-0">Key Prefix</label>
                                <button type="button" class="provider-help-trigger" [pTooltip]="storageTip('keyPrefix')" tooltipPosition="top" aria-label="Key Prefix 配置说明">
                                    <i class="pi pi-question provider-help-icon"></i>
                                </button>
                            </div>
                            <input pInputText id="attachmentStorageKeyPrefix" [ngModel]="form().keyPrefix" (ngModelChange)="updateText('keyPrefix', $event)" placeholder="poms/attachments" class="w-full rounded-md!" />
                        </div>
                    </div>

                    @if (isHuaweiObsForm()) {
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div class="flex flex-col gap-2">
                                <div class="flex items-center gap-2">
                                    <label for="attachmentStorageAccessKeyId" class="text-sm font-medium text-surface-900 dark:text-surface-0">Access Key ID</label>
                                    <button type="button" class="provider-help-trigger" [pTooltip]="storageTip('accessKeyId')" tooltipPosition="top" aria-label="OBS Access Key ID 配置说明">
                                        <i class="pi pi-question provider-help-icon"></i>
                                    </button>
                                </div>
                                <input
                                    pInputText
                                    id="attachmentStorageAccessKeyId"
                                    type="password"
                                    [ngModel]="form().accessKeyId"
                                    (ngModelChange)="updateText('accessKeyId', $event)"
                                    [placeholder]="mode === 'edit' && form().accessKeyConfigured ? '留空则不更新已有 Access Key ID' : '输入 Access Key ID'"
                                    class="w-full rounded-md!"
                                />
                                @if (mode === 'edit') {
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ form().accessKeyConfigured ? '当前已有 Access Key ID；保存时只有填写新值才会覆盖。' : '当前未配置 Access Key ID。' }}</span>
                                }
                            </div>
                            <div class="flex flex-col gap-2">
                                <div class="flex items-center gap-2">
                                    <label for="attachmentStorageSecretAccessKey" class="text-sm font-medium text-surface-900 dark:text-surface-0">Secret Access Key</label>
                                    <button type="button" class="provider-help-trigger" [pTooltip]="storageTip('secretAccessKey')" tooltipPosition="top" aria-label="OBS Secret Access Key 配置说明">
                                        <i class="pi pi-question provider-help-icon"></i>
                                    </button>
                                </div>
                                <input
                                    pInputText
                                    id="attachmentStorageSecretAccessKey"
                                    type="password"
                                    [ngModel]="form().secretAccessKey"
                                    (ngModelChange)="updateText('secretAccessKey', $event)"
                                    [placeholder]="mode === 'edit' && form().secretAccessKeyConfigured ? '留空则不更新已有 Secret Access Key' : '输入 Secret Access Key'"
                                    class="w-full rounded-md!"
                                />
                                @if (mode === 'edit') {
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ form().secretAccessKeyConfigured ? '当前已有 Secret Access Key；保存时只有填写新值才会覆盖。' : '当前未配置 Secret Access Key。' }}</span>
                                }
                            </div>
                        </div>

                        <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 text-sm leading-6 text-surface-600 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300">
                            {{ storageTip('forcePathStyle') }}
                        </div>
                    } @else {
                        <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 text-sm leading-6 text-surface-600 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300">
                            本地存储不接收 OBS endpoint、bucket 或 AK/SK；读写仍经过 POMS 后端鉴权。
                        </div>
                    }
                </div>
            </ng-template>
        </div>
    `
})
export class AttachmentStorageProviderList {
    readonly store = inject(AttachmentStorageProviderStore);
    readonly #messageService = inject(MessageService);

    readonly providerOptions = PROVIDER_OPTIONS;
    readonly statusOptions = STATUS_OPTIONS;

    readonly pageError = signal<string | null>(null);
    readonly formError = signal<string | null>(null);
    readonly form = signal<AttachmentStorageProviderForm>({ ...EMPTY_FORM });
    readonly testResults = signal<Record<string, AttachmentStorageProviderConnectionTestResult>>({});

    createDialogVisible = false;
    editDialogVisible = false;

    readonly configs = this.store.configs;
    readonly isHuaweiObsForm = computed(() => this.form().providerType === AttachmentStorageProviderType.HuaweiObsS3);
    readonly providerCards = computed<AttachmentStorageProviderCardSlot[]>(() => {
        const configsByType = new Map(this.configs().map((config) => [config.providerType, config]));

        return PROVIDER_TYPES.map((providerType) => {
            const config = configsByType.get(providerType) ?? null;
            return {
                key: config?.id ?? `unconfigured-${providerType}`,
                providerType,
                config
            };
        });
    });
    readonly enabledCount = computed(() => this.configs().filter((config) => config.enabled).length);
    readonly defaultProviderLabel = computed(() => {
        const defaultConfig = this.configs().find((config) => config.isDefault);
        return defaultConfig ? attachmentStorageProviderLabel(defaultConfig.providerType) : '-';
    });
    readonly obsCredentialCount = computed(() => {
        const obsConfig = this.configs().find((config) => config.providerType === AttachmentStorageProviderType.HuaweiObsS3);
        return obsConfig?.accessKeyConfigured && obsConfig.secretAccessKeyConfigured ? 1 : 0;
    });

    constructor() {
        void this.reload();
    }

    async reload(): Promise<void> {
        this.pageError.set(null);
        try {
            await this.store.loadConfigs();
        } catch {
            this.pageError.set('附件存储提供商配置没有读取成功，请确认权限或稍后重试。');
        }
    }

    showCreateDialog(providerType: AttachmentStorageProviderType): void {
        this.form.set({
            ...EMPTY_FORM,
            providerType,
            displayName: attachmentStorageProviderLabel(providerType)
        });
        this.formError.set(null);
        this.createDialogVisible = true;
    }

    showEditDialog(config: AttachmentStorageProviderConfigSummary): void {
        this.form.set({
            id: config.id,
            providerType: config.providerType,
            displayName: config.displayName,
            enabled: config.enabled,
            status: config.status,
            endpoint: config.endpoint ?? '',
            region: config.region ?? '',
            bucket: config.bucket ?? '',
            keyPrefix: config.keyPrefix ?? '',
            forcePathStyle: config.forcePathStyle,
            accessKeyId: '',
            secretAccessKey: '',
            accessKeyConfigured: config.accessKeyConfigured,
            secretAccessKeyConfigured: config.secretAccessKeyConfigured,
            expectedVersion: config.rowVersion
        });
        this.formError.set(null);
        this.editDialogVisible = true;
    }

    resetFormError(): void {
        this.formError.set(null);
    }

    updateProviderType(value: AttachmentStorageProviderType | null | undefined): void {
        const providerType = value ?? AttachmentStorageProviderType.Local;
        this.form.update((form) => ({
            ...form,
            providerType,
            displayName: form.displayName || attachmentStorageProviderLabel(providerType)
        }));
        this.formError.set(null);
    }

    updateStatus(value: AttachmentStorageProviderConfigStatus | null | undefined): void {
        this.form.update((form) => ({ ...form, status: value ?? AttachmentStorageProviderConfigStatus.Draft }));
        this.formError.set(null);
    }

    updateText(field: 'displayName' | 'endpoint' | 'region' | 'bucket' | 'keyPrefix' | 'accessKeyId' | 'secretAccessKey', value: string): void {
        this.form.update((form) => ({ ...form, [field]: value }));
        this.formError.set(null);
    }

    updateToggle(field: 'enabled' | 'forcePathStyle', value: boolean): void {
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
        const request = this.createRequestFromForm(form);
        try {
            await this.store.createConfig(request);
            this.createDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '创建成功', detail: `${form.displayName.trim()} 已创建` });
            await this.reload();
        } catch {
            this.formError.set('附件存储提供商配置没有创建成功，请确认提供商未重复且 OBS 字段满足启用条件。');
        }
    }

    async updateConfig(): Promise<void> {
        if (!this.validateForm(true, true)) return;

        const form = this.form();
        const request = this.updateRequestFromForm(form);
        try {
            await this.store.updateConfig(form.id, request);
            this.editDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '保存成功', detail: `${form.displayName.trim()} 已更新` });
            await this.reload();
        } catch {
            this.formError.set('附件存储提供商配置没有保存成功，请刷新后重试。');
        }
    }

    async testConnection(config: AttachmentStorageProviderConfigSummary): Promise<void> {
        try {
            const result = await this.store.testConnection(config.id, { expectedVersion: config.rowVersion });
            this.testResults.update((results) => ({ ...results, [config.id]: result }));
            this.#messageService.add({
                severity: result.status === AttachmentStorageProviderConnectionTestStatus.Success ? 'success' : 'warn',
                summary: result.status === AttachmentStorageProviderConnectionTestStatus.Success ? '测试通过' : '测试失败',
                detail: result.message
            });
        } catch {
            this.pageError.set('测试连接没有完成，请刷新配置后重试。');
        }
    }

    async setDefaultConfig(config: AttachmentStorageProviderConfigSummary): Promise<void> {
        try {
            await this.store.setDefaultConfig(config.id, { expectedVersion: config.rowVersion });
            this.#messageService.add({ severity: 'success', summary: '默认存储已更新', detail: `${config.displayName} 已设为默认` });
            await this.reload();
        } catch {
            this.pageError.set('默认存储没有更新成功，只能将已启用且已激活的配置设为默认。');
        }
    }

    createDialogHeader(): string {
        return `配置 ${attachmentStorageProviderLabel(this.form().providerType)}`;
    }

    isCardTesting(card: AttachmentStorageProviderCardSlot): boolean {
        return Boolean(card.config && this.store.testingConfigId() === card.config.id);
    }

    isCardSettingDefault(card: AttachmentStorageProviderCardSlot): boolean {
        return Boolean(card.config && this.store.settingDefaultConfigId() === card.config.id);
    }

    testResultForCard(card: AttachmentStorageProviderCardSlot): AttachmentStorageProviderConnectionTestResult | null {
        return card.config ? (this.testResults()[card.config.id] ?? null) : null;
    }

    readonly attachmentStorageProviderLabel = attachmentStorageProviderLabel;

    storageTip(field: keyof typeof ATTACHMENT_STORAGE_TIPS): string {
        return ATTACHMENT_STORAGE_TIPS[field];
    }

    private validateForm(isEdit: boolean, setError: boolean): boolean {
        const form = this.form();
        const isHuaweiObs = form.providerType === AttachmentStorageProviderType.HuaweiObsS3;
        const hasAccessKey = Boolean(form.accessKeyId.trim()) || (isEdit && form.accessKeyConfigured);
        const hasSecretAccessKey = Boolean(form.secretAccessKey.trim()) || (isEdit && form.secretAccessKeyConfigured);
        const requiresOperationalFields = form.enabled || form.status === AttachmentStorageProviderConfigStatus.Active;

        let error: string | null = null;
        if (!form.displayName.trim()) {
            error = '请填写显示名称。';
        } else if (form.status === AttachmentStorageProviderConfigStatus.Active && !form.enabled) {
            error = '激活状态必须同时启用 provider。';
        } else if (isHuaweiObs && requiresOperationalFields && !form.endpoint.trim()) {
            error = '启用或激活华为云 OBS 前必须填写 Endpoint。';
        } else if (isHuaweiObs && requiresOperationalFields && !form.region.trim()) {
            error = '启用或激活华为云 OBS 前必须填写 Region。';
        } else if (isHuaweiObs && requiresOperationalFields && !form.bucket.trim()) {
            error = '启用或激活华为云 OBS 前必须填写 Bucket。';
        } else if (isHuaweiObs && requiresOperationalFields && !hasAccessKey) {
            error = '启用或激活华为云 OBS 前必须配置 Access Key ID。';
        } else if (isHuaweiObs && requiresOperationalFields && !hasSecretAccessKey) {
            error = '启用或激活华为云 OBS 前必须配置 Secret Access Key。';
        }

        if (setError) {
            this.formError.set(error);
        }
        return error === null;
    }

    private createRequestFromForm(form: AttachmentStorageProviderForm): CreateAttachmentStorageProviderConfigRequest {
        const request: CreateAttachmentStorageProviderConfigRequest = {
            providerType: form.providerType,
            displayName: form.displayName.trim(),
            enabled: form.enabled,
            keyPrefix: this.optionalText(form.keyPrefix)
        };

        if (form.providerType === AttachmentStorageProviderType.HuaweiObsS3) {
            request.endpoint = this.optionalText(form.endpoint);
            request.region = this.optionalText(form.region);
            request.bucket = this.optionalText(form.bucket);
            request.forcePathStyle = form.forcePathStyle;
            const accessKeyId = this.optionalText(form.accessKeyId);
            const secretAccessKey = this.optionalText(form.secretAccessKey);
            if (accessKeyId) request.accessKeyId = accessKeyId;
            if (secretAccessKey) request.secretAccessKey = secretAccessKey;
        }

        return request;
    }

    private updateRequestFromForm(form: AttachmentStorageProviderForm): UpdateAttachmentStorageProviderConfigRequest {
        const request: UpdateAttachmentStorageProviderConfigRequest = {
            displayName: form.displayName.trim(),
            enabled: form.enabled,
            status: form.status,
            keyPrefix: this.optionalText(form.keyPrefix),
            expectedVersion: form.expectedVersion
        };

        if (form.providerType === AttachmentStorageProviderType.HuaweiObsS3) {
            request.endpoint = this.optionalText(form.endpoint);
            request.region = this.optionalText(form.region);
            request.bucket = this.optionalText(form.bucket);
            request.forcePathStyle = form.forcePathStyle;
            const accessKeyId = this.optionalText(form.accessKeyId);
            const secretAccessKey = this.optionalText(form.secretAccessKey);
            if (accessKeyId) request.accessKeyId = accessKeyId;
            if (secretAccessKey) request.secretAccessKey = secretAccessKey;
        } else {
            request.endpoint = null;
            request.region = null;
            request.bucket = null;
            request.forcePathStyle = false;
        }

        return request;
    }

    private optionalText(value: string): string | null {
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
    }
}
