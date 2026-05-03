import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    ActiveInactiveStatus,
    AttachmentRelationType,
    AttachmentSecurityLevel,
    AttachmentStore,
    DictionaryDomain,
    DictionaryStore,
    type AttachmentSummary,
    type AttachmentTargetType
} from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { WorkspaceFeedback } from './workspace-feedback';

interface AttachmentOption<T extends string> {
    label: string;
    value: T;
}

interface AttachmentUploadForm {
    category: string;
    securityLevel: AttachmentSecurityLevel;
    displayName: string;
    description: string;
}

const ATTACHMENT_SECURITY_LABELS: Record<AttachmentSecurityLevel, string> = {
    [AttachmentSecurityLevel.Normal]: '普通',
    [AttachmentSecurityLevel.Internal]: '内部',
    [AttachmentSecurityLevel.Sensitive]: '敏感',
    [AttachmentSecurityLevel.Confidential]: '机密',
    [AttachmentSecurityLevel.Restricted]: '高机密'
};

const ATTACHMENT_SECURITY_SEVERITY: Record<AttachmentSecurityLevel, 'secondary' | 'info' | 'warn' | 'danger'> = {
    [AttachmentSecurityLevel.Normal]: 'secondary',
    [AttachmentSecurityLevel.Internal]: 'info',
    [AttachmentSecurityLevel.Sensitive]: 'warn',
    [AttachmentSecurityLevel.Confidential]: 'danger',
    [AttachmentSecurityLevel.Restricted]: 'danger'
};

const DEFAULT_UPLOAD_FORM: AttachmentUploadForm = {
    category: 'demand',
    securityLevel: AttachmentSecurityLevel.Internal,
    displayName: '',
    description: ''
};

const ATTACHMENT_SECURITY_OPTIONS: AttachmentOption<AttachmentSecurityLevel>[] = [
    { label: ATTACHMENT_SECURITY_LABELS[AttachmentSecurityLevel.Normal], value: AttachmentSecurityLevel.Normal },
    { label: ATTACHMENT_SECURITY_LABELS[AttachmentSecurityLevel.Internal], value: AttachmentSecurityLevel.Internal },
    { label: ATTACHMENT_SECURITY_LABELS[AttachmentSecurityLevel.Sensitive], value: AttachmentSecurityLevel.Sensitive },
    { label: ATTACHMENT_SECURITY_LABELS[AttachmentSecurityLevel.Confidential], value: AttachmentSecurityLevel.Confidential },
    { label: ATTACHMENT_SECURITY_LABELS[AttachmentSecurityLevel.Restricted], value: AttachmentSecurityLevel.Restricted }
];

@Component({
    selector: 'app-attachment-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TagModule, TextareaModule, WorkspaceFeedback],
    providers: [AttachmentStore, DictionaryStore],
    template: `
        <section class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 class="m-0 text-base font-semibold text-surface-950 dark:text-surface-0">{{ title }}</h3>
                    <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">{{ description }}</p>
                </div>
                <div class="flex shrink-0 flex-wrap gap-2">
                    <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" styleClass="rounded-md!" [loading]="store.loading()" (onClick)="reload()" />
                    @if (canWrite) {
                        <p-button icon="pi pi-upload" label="上传附件" severity="primary" [outlined]="true" styleClass="rounded-md!" [disabled]="!targetId" (onClick)="showUploadDialog()" />
                    }
                </div>
            </div>

            <div class="mt-4 flex flex-col gap-3">
                @if (error()) {
                    <app-workspace-feedback severity="error" summary="附件暂时无法处理" [detail]="error()" />
                } @else if (store.loading()) {
                    <app-workspace-feedback severity="info" summary="正在读取附件" detail="请稍候。" />
                } @else if (store.attachments().length) {
                    @for (attachment of store.attachments(); track attachment.id) {
                        <article class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div class="min-w-0">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="truncate text-sm font-semibold text-surface-950 dark:text-surface-0">{{ attachment.displayName }}</span>
                                        <p-tag [value]="categoryLabel(attachment.category)" severity="secondary" styleClass="rounded-[6px]" />
                                        <p-tag [value]="securityLabel(attachment.securityLevel)" [severity]="securitySeverity(attachment.securityLevel)" styleClass="rounded-[6px]" />
                                    </div>
                                    <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-500 dark:text-surface-400">
                                        <span>{{ attachment.extension | uppercase }}</span>
                                        <span>{{ formatSize(attachment.sizeBytes) }}</span>
                                        <span>{{ attachment.uploadedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                        <span>{{ attachment.uploadedByName || '未知上传人' }}</span>
                                    </div>
                                    @if (attachment.description) {
                                        <p class="mt-2 whitespace-pre-line text-sm leading-6 text-surface-600 dark:text-surface-300">{{ attachment.description }}</p>
                                    }
                                </div>
                                <div class="flex shrink-0 flex-wrap gap-2">
                                    <p-button icon="pi pi-download" label="下载" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="download(attachment)" />
                                    @if (canWrite) {
                                        <p-button icon="pi pi-ban" label="作废" size="small" severity="danger" [outlined]="true" styleClass="rounded-md!" (onClick)="voidAttachment(attachment)" />
                                    }
                                </div>
                            </div>
                        </article>
                    }
                } @else {
                    <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无附件。</div>
                }
            </div>
        </section>

        <p-dialog [(visible)]="uploadDialogVisible" [modal]="true" header="上传附件" [style]="{ width: '34rem' }" styleClass="p-fluid" (onHide)="resetUploadDialog()">
            <div class="flex flex-col gap-4 py-2">
                @if (uploadError()) {
                    <app-workspace-feedback severity="error" summary="附件没有上传成功" [detail]="uploadError()" />
                }

                <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                    <input #fileInput type="file" class="hidden" (change)="onFileSelected($event)" />
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div class="min-w-0">
                            <div class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ selectedFile()?.name || '尚未选择文件' }}</div>
                            <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ selectedFile() ? formatSize(selectedFile()?.size ?? 0) : '支持常见文档、图片、表格和压缩包，单文件不超过后端限制。' }}</div>
                        </div>
                        <p-button label="选择文件" icon="pi pi-folder-open" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="fileInput.click()" />
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2">
                        <label for="attachmentCategory" class="text-sm font-medium text-surface-900 dark:text-surface-0">附件分类</label>
                        <p-select
                            inputId="attachmentCategory"
                            [ngModel]="uploadForm().category"
                            (ngModelChange)="updateUploadField('category', $event)"
                            [options]="categoryOptions()"
                            optionLabel="label"
                            optionValue="value"
                            appendTo="body"
                            styleClass="w-full rounded-md!"
                        />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="attachmentSecurity" class="text-sm font-medium text-surface-900 dark:text-surface-0">安全等级</label>
                        <p-select
                            inputId="attachmentSecurity"
                            [ngModel]="uploadForm().securityLevel"
                            (ngModelChange)="updateUploadField('securityLevel', $event)"
                            [options]="securityOptions"
                            optionLabel="label"
                            optionValue="value"
                            appendTo="body"
                            styleClass="w-full rounded-md!"
                        />
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label for="attachmentDisplayName" class="text-sm font-medium text-surface-900 dark:text-surface-0">展示名称</label>
                    <input
                        pInputText
                        id="attachmentDisplayName"
                        [ngModel]="uploadForm().displayName"
                        (ngModelChange)="updateUploadField('displayName', $event)"
                        class="w-full rounded-md!"
                        placeholder="不填则使用原始文件名"
                    />
                </div>

                <div class="flex flex-col gap-2">
                    <label for="attachmentDescription" class="text-sm font-medium text-surface-900 dark:text-surface-0">附件说明</label>
                    <textarea
                        pTextarea
                        id="attachmentDescription"
                        rows="3"
                        [ngModel]="uploadForm().description"
                        (ngModelChange)="updateUploadField('description', $event)"
                        class="w-full rounded-md!"
                        placeholder="例如：客户首次提供的需求清单、会议纪要或沟通截图。"
                    ></textarea>
                </div>
            </div>

            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="uploadDialogVisible = false" />
                    <p-button label="上传" icon="pi pi-upload" [loading]="store.saving()" [disabled]="!selectedFile() || !uploadForm().category" styleClass="rounded-md!" (onClick)="upload()" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class AttachmentPanel implements OnChanges, OnInit {
    readonly store = inject(AttachmentStore);
    readonly dictionaryStore = inject(DictionaryStore);

    @Input({ required: true }) targetType!: AttachmentTargetType;
    @Input({ required: true }) targetId!: string;
    @Input() canWrite = false;
    @Input() title = '附件';
    @Input() description = '沉淀当前业务对象的关键资料和过程证据。';

    readonly error = signal<string | null>(null);
    readonly uploadError = signal<string | null>(null);
    readonly selectedFile = signal<File | null>(null);
    readonly uploadForm = signal<AttachmentUploadForm>({ ...DEFAULT_UPLOAD_FORM });

    uploadDialogVisible = false;

    readonly categoryOptions = computed<AttachmentOption<string>[]>(() => this.dictionaryStore.activeItems().map((item) => ({ label: item.name, value: item.code })));
    readonly categoryLookup = computed(() => new Map(this.dictionaryStore.items().map((item) => [item.code, item.name])));
    readonly securityOptions = ATTACHMENT_SECURITY_OPTIONS;

    ngOnInit(): void {
        void this.loadCategoryOptions();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['targetType'] || changes['targetId']) && this.targetType && this.targetId) {
            void this.reload();
        }
    }

    async reload(): Promise<void> {
        if (!this.targetType || !this.targetId) {
            this.store.clearAttachments();
            return;
        }

        this.error.set(null);
        try {
            await this.store.loadAttachments({
                targetType: this.targetType,
                targetId: this.targetId
            });
        } catch {
            this.error.set('附件列表没有读取成功，请稍后重试。');
        }
    }

    async loadCategoryOptions(): Promise<void> {
        try {
            const items = await this.dictionaryStore.loadItems({
                domain: DictionaryDomain.AttachmentCategory,
                status: ActiveInactiveStatus.Active
            });
            this.ensureUploadCategory(items.map((item) => item.code));
        } catch {
            this.error.set('附件分类没有读取成功，请稍后重试。');
        }
    }

    showUploadDialog(): void {
        this.uploadDialogVisible = true;
        this.uploadError.set(null);
    }

    resetUploadDialog(): void {
        this.selectedFile.set(null);
        this.uploadForm.set({
            ...DEFAULT_UPLOAD_FORM,
            category: this.defaultCategory()
        });
        this.uploadError.set(null);
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        this.selectedFile.set(file);
        if (file && !this.uploadForm().displayName) {
            this.updateUploadField('displayName', file.name);
        }
        input.value = '';
    }

    updateUploadField<K extends keyof AttachmentUploadForm>(field: K, value: AttachmentUploadForm[K]): void {
        this.uploadForm.update((form) => ({
            ...form,
            [field]: value
        }));
        this.uploadError.set(null);
    }

    async upload(): Promise<void> {
        const file = this.selectedFile();
        if (!file || !this.targetType || !this.targetId) {
            return;
        }

        const form = this.uploadForm();
        this.uploadError.set(null);
        try {
            await this.store.uploadAttachment({
                targetType: this.targetType,
                targetId: this.targetId,
                file,
                category: form.category,
                securityLevel: form.securityLevel,
                relationType: AttachmentRelationType.Normal,
                displayName: form.displayName.trim() || undefined,
                description: form.description.trim() || null
            });
            this.uploadDialogVisible = false;
            this.resetUploadDialog();
            await this.reload();
        } catch {
            this.uploadError.set('请确认文件类型、大小和当前权限后重试。');
        }
    }

    async download(attachment: AttachmentSummary): Promise<void> {
        try {
            const result = await this.store.downloadAttachment(attachment.id);
            const url = URL.createObjectURL(result.blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = result.fileName || attachment.originalName;
            anchor.click();
            URL.revokeObjectURL(url);
        } catch {
            this.error.set('附件下载没有成功，请稍后重试。');
        }
    }

    async voidAttachment(attachment: AttachmentSummary): Promise<void> {
        try {
            await this.store.voidAttachment(attachment.id, {
                reason: '用户在线索详情中作废附件。'
            });
            await this.reload();
        } catch {
            this.error.set('附件没有作废成功，请确认权限后重试。');
        }
    }

    categoryLabel(category: string): string {
        return this.categoryLookup().get(category) ?? category;
    }

    securityLabel(securityLevel: AttachmentSecurityLevel): string {
        return ATTACHMENT_SECURITY_LABELS[securityLevel];
    }

    securitySeverity(securityLevel: AttachmentSecurityLevel): 'secondary' | 'info' | 'warn' | 'danger' {
        return ATTACHMENT_SECURITY_SEVERITY[securityLevel];
    }

    formatSize(sizeBytes: number): string {
        if (sizeBytes < 1024) {
            return `${sizeBytes} B`;
        }

        const units = ['KB', 'MB', 'GB'];
        let value = sizeBytes / 1024;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }

        return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
    }

    private ensureUploadCategory(codes: string[]): void {
        if (!codes.length) {
            return;
        }

        const currentCategory = this.uploadForm().category;
        if (codes.includes(currentCategory)) {
            return;
        }

        this.uploadForm.update((form) => ({
            ...form,
            category: codes.includes(DEFAULT_UPLOAD_FORM.category) ? DEFAULT_UPLOAD_FORM.category : codes[0]
        }));
    }

    private defaultCategory(): string {
        const options = this.categoryOptions();
        return options.some((option) => option.value === DEFAULT_UPLOAD_FORM.category) ? DEFAULT_UPLOAD_FORM.category : options[0]?.value ?? DEFAULT_UPLOAD_FORM.category;
    }
}
