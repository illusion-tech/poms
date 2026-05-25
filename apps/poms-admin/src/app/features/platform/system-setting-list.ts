import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SystemSettingKey, SystemSettingStore, type SystemSettingSummary } from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

const ATTACHMENT_MAX_UPLOAD_SIZE_KEY: SystemSettingSummary['key'] = SystemSettingKey.AttachmentMaxUploadSizeMb;
const AUTH_EXPIRED_MESSAGE = '登录已过期，请重新登录后再操作。';

function isAuthExpiredError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
}

function isConflictError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 409;
}

@Component({
    selector: 'app-system-setting-list',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, TagModule, ToastModule],
    providers: [SystemSettingStore, MessageService],
    template: `
        <p-toast />
        <div class="flex flex-col gap-5">
            <section class="flex flex-col gap-4 border-b border-surface-200 pb-5 dark:border-surface-700">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-surface-500 dark:text-surface-400">平台配置</p>
                        <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">系统设置</h1>
                    </div>
                    <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" styleClass="rounded-md!" [loading]="store.loading()" (onClick)="reload()" />
                </div>
            </section>

            @if (pageError()) {
                <div class="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{{ pageError() }}</div>
            }

            @if (store.loading()) {
                <section class="rounded-[8px] border border-surface-200 bg-surface-0 px-6 py-12 text-center text-surface-500 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400">
                    正在读取系统设置
                </section>
            } @else if (attachmentSetting(); as setting) {
                <section class="rounded-[8px] border border-surface-200 bg-surface-0 p-5 shadow-sm dark:border-surface-700 dark:bg-surface-900">
                    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <h2 class="text-lg font-semibold leading-7 text-surface-950 dark:text-surface-0">{{ setting.displayName }}</h2>
                                <p-tag [value]="setting.value + ' ' + setting.unit" severity="info" />
                            </div>
                            <p class="mt-2 max-w-3xl text-sm leading-6 text-surface-600 dark:text-surface-300">{{ setting.description }}</p>
                            <div class="mt-3 flex flex-wrap gap-3 text-sm text-surface-500 dark:text-surface-400">
                                <span>范围 {{ setting.minValue }}-{{ setting.maxValue }} {{ setting.unit }}</span>
                                <span>版本 {{ setting.rowVersion }}</span>
                                <span>更新时间 {{ setting.updatedAt ? (setting.updatedAt | date: 'yyyy-MM-dd HH:mm') : '默认值' }}</span>
                            </div>
                        </div>

                        <div class="flex w-full flex-col gap-3 lg:w-[22rem]">
                            <label for="attachmentMaxUploadSize" class="text-sm font-medium text-surface-900 dark:text-surface-0">附件上传大小上限</label>
                            <p-inputnumber
                                inputId="attachmentMaxUploadSize"
                                [ngModel]="attachmentMaxUploadSizeDraft()"
                                (ngModelChange)="updateAttachmentMaxUploadSizeDraft($event)"
                                [min]="setting.minValue ?? undefined"
                                [max]="setting.maxValue ?? undefined"
                                [step]="1"
                                [showButtons]="true"
                                suffix=" MB"
                                mode="decimal"
                                [useGrouping]="false"
                                inputStyleClass="w-full"
                                styleClass="w-full"
                            />
                            @if (attachmentMaxUploadSizeError()) {
                                <div class="text-sm text-red-600 dark:text-red-300">{{ attachmentMaxUploadSizeError() }}</div>
                            }
                            <div class="flex justify-end gap-2">
                                <p-button label="重置" severity="secondary" [outlined]="true" styleClass="rounded-md!" [disabled]="store.saving()" (onClick)="resetAttachmentDraft()" />
                                <p-button
                                    icon="pi pi-save"
                                    label="保存"
                                    styleClass="rounded-md!"
                                    [loading]="isSavingAttachmentSetting()"
                                    [disabled]="!canSaveAttachmentSetting()"
                                    (onClick)="saveAttachmentMaxUploadSize()"
                                />
                            </div>
                        </div>
                    </div>
                </section>
            } @else {
                <section class="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                    未找到附件上传大小上限设置
                </section>
            }
        </div>
    `
})
export class SystemSettingList {
    readonly store = inject(SystemSettingStore);
    readonly #messageService = inject(MessageService);

    readonly pageError = signal<string | null>(null);
    readonly attachmentMaxUploadSizeDraft = signal<number | null>(null);

    readonly attachmentSetting = computed(() => this.store.settings().find((setting) => setting.key === ATTACHMENT_MAX_UPLOAD_SIZE_KEY) ?? null);
    readonly attachmentMaxUploadSizeError = computed(() => {
        const setting = this.attachmentSetting();
        const value = this.attachmentMaxUploadSizeDraft();
        if (!setting || value === null) {
            return '请输入附件上传大小上限';
        }
        if (!Number.isInteger(value)) {
            return '附件上传大小上限必须为整数';
        }
        if (setting.minValue !== null && value < setting.minValue) {
            return `附件上传大小上限不能小于 ${setting.minValue} ${setting.unit}`;
        }
        if (setting.maxValue !== null && value > setting.maxValue) {
            return `附件上传大小上限不能大于 ${setting.maxValue} ${setting.unit}`;
        }
        return null;
    });
    readonly canSaveAttachmentSetting = computed(() => {
        const setting = this.attachmentSetting();
        const value = this.attachmentMaxUploadSizeDraft();
        return Boolean(setting && value !== null && !this.attachmentMaxUploadSizeError() && value !== setting.value && !this.store.saving());
    });
    readonly isSavingAttachmentSetting = computed(() => this.store.saving() && this.store.updatingKey() === ATTACHMENT_MAX_UPLOAD_SIZE_KEY);

    constructor() {
        void this.reload();
    }

    async reload(): Promise<void> {
        this.pageError.set(null);
        try {
            const settings = await this.store.loadSettings();
            const attachmentSetting = settings.find((setting) => setting.key === ATTACHMENT_MAX_UPLOAD_SIZE_KEY);
            this.attachmentMaxUploadSizeDraft.set(attachmentSetting?.value ?? null);
        } catch (error) {
            this.pageError.set(this.resolveErrorMessage(error, '系统设置读取失败'));
        }
    }

    updateAttachmentMaxUploadSizeDraft(value: number | null): void {
        this.attachmentMaxUploadSizeDraft.set(value);
    }

    resetAttachmentDraft(): void {
        this.attachmentMaxUploadSizeDraft.set(this.attachmentSetting()?.value ?? null);
    }

    async saveAttachmentMaxUploadSize(): Promise<void> {
        const setting = this.attachmentSetting();
        const value = this.attachmentMaxUploadSizeDraft();
        if (!setting || value === null || this.attachmentMaxUploadSizeError()) {
            return;
        }

        this.pageError.set(null);
        try {
            const updated = await this.store.updateSetting(setting.key, {
                value,
                expectedVersion: setting.rowVersion
            });
            this.attachmentMaxUploadSizeDraft.set(updated.value);
            this.#messageService.add({ severity: 'success', summary: '已保存', detail: '系统设置已更新' });
        } catch (error) {
            this.pageError.set(this.resolveErrorMessage(error, '系统设置保存失败'));
        }
    }

    private resolveErrorMessage(error: unknown, fallback: string): string {
        if (isAuthExpiredError(error)) {
            return AUTH_EXPIRED_MESSAGE;
        }
        if (isConflictError(error)) {
            return '系统设置已被其他人更新，请刷新后重试。';
        }
        return fallback;
    }
}
