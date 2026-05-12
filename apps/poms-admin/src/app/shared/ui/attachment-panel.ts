import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, computed, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import {
    ActiveInactiveStatus,
    AttachmentRelationType,
    AttachmentSecurityLevel,
    AttachmentStore,
    AttachmentUploadMode,
    DictionaryDomain,
    DictionaryStore,
    type AttachmentSummary,
    type AttachmentTargetType
} from '@poms/admin-data-access';
import { AttachmentSecurityLevelLabel, AttachmentSecurityLevelOptions, AttachmentSecurityLevelSeverity } from '@poms/shared-contracts';
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

interface AttachmentVersionUploadForm extends AttachmentUploadForm {
    changeNote: string;
}

type PreviewKind = 'image' | 'pdf' | 'unsupported';

const ATTACHMENT_SECURITY_LABELS = AttachmentSecurityLevelLabel as Record<AttachmentSecurityLevel, string>;

const ATTACHMENT_SECURITY_SEVERITY = AttachmentSecurityLevelSeverity as Record<AttachmentSecurityLevel, 'secondary' | 'info' | 'warn' | 'danger'>;

const DEFAULT_UPLOAD_FORM: AttachmentUploadForm = {
    category: '',
    securityLevel: AttachmentSecurityLevel.Internal,
    displayName: '',
    description: ''
};

const DEFAULT_VERSION_UPLOAD_FORM: AttachmentVersionUploadForm = {
    ...DEFAULT_UPLOAD_FORM,
    changeNote: ''
};

const ATTACHMENT_SECURITY_OPTIONS = [...(AttachmentSecurityLevelOptions as ReadonlyArray<AttachmentOption<AttachmentSecurityLevel>>)];

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
                            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div class="flex min-w-0 gap-3">
                                    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-surface-200 bg-surface-50 text-surface-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
                                        <i class="pi text-lg" [ngClass]="fileIcon(attachment)"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="max-w-full truncate text-sm font-semibold text-surface-950 dark:text-surface-0">{{ attachment.displayName }}</span>
                                            <p-tag [value]="categoryLabel(attachment.category)" severity="secondary" class="rounded-[6px]" />
                                            <p-tag [value]="securityLabel(attachment.securityLevel)" [severity]="securitySeverity(attachment.securityLevel)" class="rounded-[6px]" />
                                            <p-tag [value]="'v' + attachment.versionNo" severity="info" class="rounded-[6px]" />
                                            @if (attachment.isLatest) {
                                                <p-tag value="最新" severity="success" class="rounded-[6px]" />
                                            }
                                            @if (attachment.isFinal) {
                                                <p-tag value="最终版" severity="warn" class="rounded-[6px]" />
                                            }
                                        </div>
                                        <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-500 dark:text-surface-400">
                                            <span>{{ attachment.extension | uppercase }}</span>
                                            <span>{{ formatSize(attachment.sizeBytes) }}</span>
                                            <span>{{ attachment.uploadedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                            <span>{{ attachment.uploadedByName || '未知上传人' }}</span>
                                            @if (!attachment.previewSupported) {
                                                <span>不支持预览</span>
                                            }
                                        </div>
                                        @if (attachment.description) {
                                            <p class="mt-2 whitespace-pre-line text-sm leading-6 text-surface-600 dark:text-surface-300">{{ attachment.description }}</p>
                                        }
                                        @if (attachment.changeNote) {
                                            <p class="mt-2 text-xs leading-5 text-surface-500 dark:text-surface-400">版本说明：{{ attachment.changeNote }}</p>
                                        }
                                    </div>
                                </div>
                                <div class="flex shrink-0 flex-wrap gap-2">
                                    <p-button icon="pi pi-eye" label="预览" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" [disabled]="!attachment.previewSupported" (onClick)="openPreview(attachment)" />
                                    <p-button icon="pi pi-history" label="版本" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="openVersions(attachment)" />
                                    <p-button icon="pi pi-download" label="下载" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="download(attachment)" />
                                    @if (canWrite) {
                                        <p-button icon="pi pi-upload" label="新版本" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="showVersionUploadDialog(attachment)" />
                                        @if (attachment.isFinal) {
                                            <p-button icon="pi pi-undo" label="撤销最终版" size="small" severity="warn" [outlined]="true" styleClass="rounded-md!" (onClick)="showClearFinalDialog(attachment)" />
                                        } @else {
                                            <p-button icon="pi pi-check-circle" label="标记最终版" size="small" severity="success" [outlined]="true" styleClass="rounded-md!" (onClick)="showMarkFinalDialog(attachment)" />
                                        }
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

        <p-dialog [(visible)]="uploadDialogVisible" [modal]="true" header="上传附件" [style]="{ width: '34rem' }" styleClass="p-fluid" [closable]="!store.saving()" [closeOnEscape]="!store.saving()" (onHide)="resetUploadDialog()">
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

                <ng-container *ngTemplateOutlet="uploadSessionProgressTemplate" />

                <ng-container *ngTemplateOutlet="metadataForm; context: { form: uploadForm(), mode: 'create' }" />
            </div>

            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" [disabled]="store.saving()" (onClick)="uploadDialogVisible = false" />
                    <p-button [label]="store.uploadProgress().phase === 'failed' ? '重试上传' : '上传'" icon="pi pi-upload" [loading]="store.saving()" [disabled]="!selectedFile() || !uploadForm().category || store.saving()" styleClass="rounded-md!" (onClick)="upload()" />
                </div>
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="previewDialogVisible" [modal]="true" [header]="selectedPreviewAttachment()?.displayName || '附件预览'" [style]="{ width: 'min(960px, 92vw)' }" styleClass="p-fluid" (onHide)="closePreview()">
            <div class="min-h-[28rem]">
                @if (previewLoading()) {
                    <app-workspace-feedback severity="info" summary="正在打开预览" detail="请稍候。" />
                } @else if (previewError()) {
                    <app-workspace-feedback severity="error" summary="附件无法预览" [detail]="previewError()" />
                } @else if (previewObjectUrl()) {
                    @if (previewKind() === 'image') {
                        <div class="flex max-h-[70vh] items-center justify-center overflow-auto rounded-[8px] bg-surface-50 p-3 dark:bg-surface-900">
                            <img [src]="previewObjectUrl()" [alt]="selectedPreviewAttachment()?.displayName || '附件预览'" class="max-h-[68vh] max-w-full object-contain" />
                        </div>
                    } @else if (previewKind() === 'pdf') {
                        <iframe class="h-[70vh] w-full rounded-[8px] border border-surface-200 dark:border-surface-700" [src]="safePreviewUrl()" title="附件 PDF 预览"></iframe>
                    } @else {
                        <app-workspace-feedback severity="warn" summary="当前文件不支持内嵌预览" detail="可以下载后在本地查看。" />
                    }
                } @else {
                    <app-workspace-feedback severity="warn" summary="当前文件没有可用预览" detail="可以下载后在本地查看。" />
                }
            </div>

            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    @if (selectedPreviewAttachment(); as attachment) {
                        <p-button icon="pi pi-download" label="下载" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="download(attachment)" />
                    }
                    <p-button label="关闭" severity="secondary" styleClass="rounded-md!" (onClick)="previewDialogVisible = false" />
                </div>
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="versionsDialogVisible" [modal]="true" [header]="versionRootAttachment()?.displayName || '版本历史'" [style]="{ width: '42rem' }" styleClass="p-fluid" (onHide)="resetVersionsDialog()">
            <div class="flex flex-col gap-3 py-2">
                @if (versionsError()) {
                    <app-workspace-feedback severity="error" summary="版本历史没有读取成功" [detail]="versionsError()" />
                } @else if (versionsLoading()) {
                    <app-workspace-feedback severity="info" summary="正在读取版本历史" detail="请稍候。" />
                } @else if (versions().length) {
                    @for (version of versions(); track version.id) {
                        <article class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div class="min-w-0">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="font-semibold text-surface-950 dark:text-surface-0">v{{ version.versionNo }}</span>
                                        <span class="truncate text-sm text-surface-700 dark:text-surface-200">{{ version.displayName }}</span>
                                        @if (version.isLatest) {
                                            <p-tag value="最新" severity="success" class="rounded-[6px]" />
                                        }
                                        @if (version.isFinal) {
                                            <p-tag value="最终版" severity="warn" class="rounded-[6px]" />
                                        }
                                    </div>
                                    <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-500 dark:text-surface-400">
                                        <span>{{ version.uploadedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                        <span>{{ version.uploadedByName || '未知上传人' }}</span>
                                        <span>{{ formatSize(version.sizeBytes) }}</span>
                                    </div>
                                    @if (version.changeNote) {
                                        <p class="mt-2 text-sm leading-6 text-surface-600 dark:text-surface-300">{{ version.changeNote }}</p>
                                    }
                                </div>
                                <div class="flex shrink-0 flex-wrap gap-2">
                                    <p-button icon="pi pi-eye" label="预览" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" [disabled]="!version.previewSupported" (onClick)="openPreview(version)" />
                                    <p-button icon="pi pi-download" label="下载" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="download(version)" />
                                    @if (canWrite) {
                                        @if (version.isFinal) {
                                            <p-button icon="pi pi-undo" label="撤销" size="small" severity="warn" [outlined]="true" styleClass="rounded-md!" (onClick)="showClearFinalDialog(version)" />
                                        } @else {
                                            <p-button icon="pi pi-check-circle" label="最终版" size="small" severity="success" [outlined]="true" styleClass="rounded-md!" (onClick)="showMarkFinalDialog(version)" />
                                        }
                                    }
                                </div>
                            </div>
                        </article>
                    }
                } @else {
                    <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无历史版本。</div>
                }
            </div>

            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    @if (canWrite && versionRootAttachment(); as attachment) {
                        <p-button icon="pi pi-upload" label="上传新版本" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="showVersionUploadDialog(attachment)" />
                    }
                    <p-button label="关闭" severity="secondary" styleClass="rounded-md!" (onClick)="versionsDialogVisible = false" />
                </div>
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="versionUploadDialogVisible" [modal]="true" header="上传新版本" [style]="{ width: '34rem' }" styleClass="p-fluid" [closable]="!store.saving()" [closeOnEscape]="!store.saving()" (onHide)="resetVersionUploadDialog()">
            <div class="flex flex-col gap-4 py-2">
                @if (versionUploadError()) {
                    <app-workspace-feedback severity="error" summary="新版本没有上传成功" [detail]="versionUploadError()" />
                }

                <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                    <input #versionFileInput type="file" class="hidden" (change)="onVersionFileSelected($event)" />
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div class="min-w-0">
                            <div class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ selectedVersionFile()?.name || '尚未选择新版本文件' }}</div>
                            <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ selectedVersionFile() ? formatSize(selectedVersionFile()?.size ?? 0) : '新版本会继承当前附件关联，旧版本仍保留在历史中。' }}</div>
                        </div>
                        <p-button label="选择文件" icon="pi pi-folder-open" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="versionFileInput.click()" />
                    </div>
                </div>

                <ng-container *ngTemplateOutlet="uploadSessionProgressTemplate" />

                <div class="flex flex-col gap-2">
                    <label for="attachmentChangeNote" class="text-sm font-medium text-surface-900 dark:text-surface-0">版本说明</label>
                    <textarea
                        pTextarea
                        id="attachmentChangeNote"
                        rows="3"
                        [ngModel]="versionUploadForm().changeNote"
                        (ngModelChange)="updateVersionUploadField('changeNote', $event)"
                        class="w-full rounded-md!"
                        placeholder="例如：替换为客户确认版、补充盖章页或更新报价附件。"
                    ></textarea>
                </div>

                <ng-container *ngTemplateOutlet="metadataForm; context: { form: versionUploadForm(), mode: 'version' }" />
            </div>

            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" [disabled]="store.saving()" (onClick)="versionUploadDialogVisible = false" />
                    <p-button [label]="store.uploadProgress().phase === 'failed' ? '重试上传新版本' : '上传新版本'" icon="pi pi-upload" [loading]="store.saving()" [disabled]="!selectedVersionFile() || !versionUploadForm().changeNote.trim() || store.saving()" styleClass="rounded-md!" (onClick)="uploadVersion()" />
                </div>
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="markFinalDialogVisible" [modal]="true" header="标记最终版" [style]="{ width: '30rem' }" styleClass="p-fluid" (onHide)="resetFinalDialogs()">
            <div class="flex flex-col gap-3 py-2">
                @if (finalDialogError()) {
                    <app-workspace-feedback severity="error" summary="最终版状态没有更新成功" [detail]="finalDialogError()" />
                }
                <p class="m-0 text-sm leading-6 text-surface-600 dark:text-surface-300">标记后，同一版本组内其他最终版会由后端撤销。</p>
                <div class="flex flex-col gap-2">
                    <label for="markFinalNote" class="text-sm font-medium text-surface-900 dark:text-surface-0">说明</label>
                    <textarea pTextarea id="markFinalNote" rows="3" [ngModel]="markFinalNote()" (ngModelChange)="markFinalNote.set($event)" class="w-full rounded-md!" placeholder="可选，例如：客户已确认该版本。"></textarea>
                </div>
            </div>
            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="markFinalDialogVisible = false" />
                    <p-button label="确认标记" icon="pi pi-check-circle" severity="success" [loading]="store.saving()" styleClass="rounded-md!" (onClick)="confirmMarkFinal()" />
                </div>
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="clearFinalDialogVisible" [modal]="true" header="撤销最终版" [style]="{ width: '30rem' }" styleClass="p-fluid" (onHide)="resetFinalDialogs()">
            <div class="flex flex-col gap-3 py-2">
                @if (finalDialogError()) {
                    <app-workspace-feedback severity="error" summary="最终版状态没有更新成功" [detail]="finalDialogError()" />
                }
                <div class="flex flex-col gap-2">
                    <label for="clearFinalReason" class="text-sm font-medium text-surface-900 dark:text-surface-0">撤销原因</label>
                    <textarea pTextarea id="clearFinalReason" rows="3" [ngModel]="clearFinalReason()" (ngModelChange)="clearFinalReason.set($event)" class="w-full rounded-md!"></textarea>
                </div>
            </div>
            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="clearFinalDialogVisible = false" />
                    <p-button label="确认撤销" icon="pi pi-undo" severity="warn" [loading]="store.saving()" [disabled]="!clearFinalReason().trim()" styleClass="rounded-md!" (onClick)="confirmClearFinal()" />
                </div>
            </ng-template>
        </p-dialog>

        <ng-template #uploadSessionProgressTemplate>
            @if (store.uploadProgress().phase !== 'idle') {
                <div class="rounded-[8px] border border-surface-200 bg-surface-0 p-3 dark:border-surface-700 dark:bg-surface-900">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-sm font-semibold text-surface-950 dark:text-surface-0">{{ uploadPhaseLabel() }}</span>
                                <p-tag [value]="uploadModeLabel()" [severity]="uploadProgressSeverity()" class="rounded-[6px]" />
                            </div>
                            <p class="mt-1 text-xs leading-5 text-surface-500 dark:text-surface-400">{{ store.uploadProgress().message }}</p>
                        </div>
                        @if (store.uploadProgress().canAbort) {
                            <p-button icon="pi pi-times" label="中止" size="small" severity="warn" [outlined]="true" styleClass="rounded-md!" (onClick)="abortUpload()" />
                        }
                    </div>
                    <div class="mt-3 h-2 w-full overflow-hidden rounded bg-surface-100 dark:bg-surface-800" aria-hidden="true">
                        <div class="h-2 rounded bg-primary transition-all" [style.width.%]="store.uploadProgress().progressPercent"></div>
                    </div>
                    <div class="mt-2 flex flex-wrap justify-between gap-2 text-xs text-surface-500 dark:text-surface-400">
                        <span>{{ uploadProgressDetail() }}</span>
                        <span>{{ store.uploadProgress().progressPercent }}%</span>
                    </div>
                </div>
            }
        </ng-template>

        <ng-template #metadataForm let-form="form" let-mode="mode">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-2">
                    <label [for]="mode + 'AttachmentCategory'" class="text-sm font-medium text-surface-900 dark:text-surface-0">附件分类</label>
                    <p-select
                        [inputId]="mode + 'AttachmentCategory'"
                        [ngModel]="form.category"
                        (ngModelChange)="mode === 'create' ? updateUploadField('category', $event) : updateVersionUploadField('category', $event)"
                        [options]="categoryOptions()"
                        optionLabel="label"
                        optionValue="value"
                        appendTo="body"
                        styleClass="w-full rounded-md!"
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <label [for]="mode + 'AttachmentSecurity'" class="text-sm font-medium text-surface-900 dark:text-surface-0">安全等级</label>
                    <p-select
                        [inputId]="mode + 'AttachmentSecurity'"
                        [ngModel]="form.securityLevel"
                        (ngModelChange)="mode === 'create' ? updateUploadField('securityLevel', $event) : updateVersionUploadField('securityLevel', $event)"
                        [options]="securityOptions"
                        optionLabel="label"
                        optionValue="value"
                        appendTo="body"
                        styleClass="w-full rounded-md!"
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <label [for]="mode + 'AttachmentDisplayName'" class="text-sm font-medium text-surface-900 dark:text-surface-0">展示名称</label>
                <input
                    pInputText
                    [id]="mode + 'AttachmentDisplayName'"
                    [ngModel]="form.displayName"
                    (ngModelChange)="mode === 'create' ? updateUploadField('displayName', $event) : updateVersionUploadField('displayName', $event)"
                    class="w-full rounded-md!"
                    placeholder="不填则使用原始文件名"
                />
            </div>

            <div class="flex flex-col gap-2">
                <label [for]="mode + 'AttachmentDescription'" class="text-sm font-medium text-surface-900 dark:text-surface-0">附件说明</label>
                <textarea
                    pTextarea
                    [id]="mode + 'AttachmentDescription'"
                    rows="3"
                    [ngModel]="form.description"
                    (ngModelChange)="mode === 'create' ? updateUploadField('description', $event) : updateVersionUploadField('description', $event)"
                    class="w-full rounded-md!"
                    placeholder="例如：客户首次提供的需求清单、会议纪要或沟通截图。"
                ></textarea>
            </div>
        </ng-template>
    `
})
export class AttachmentPanel implements OnChanges, OnDestroy, OnInit {
    readonly store = inject(AttachmentStore);
    readonly dictionaryStore = inject(DictionaryStore);
    readonly #sanitizer = inject(DomSanitizer);

    @Input({ required: true }) targetType!: AttachmentTargetType;
    @Input({ required: true }) targetId!: string;
    @Input() canWrite = false;
    @Input() title = '附件';
    @Input() description = '沉淀当前业务对象的关键资料和过程证据。';

    readonly error = signal<string | null>(null);
    readonly uploadError = signal<string | null>(null);
    readonly selectedFile = signal<File | null>(null);
    readonly uploadForm = signal<AttachmentUploadForm>({ ...DEFAULT_UPLOAD_FORM });

    readonly selectedPreviewAttachment = signal<AttachmentSummary | null>(null);
    readonly previewObjectUrl = signal<string | null>(null);
    readonly safePreviewUrl = signal<SafeResourceUrl | null>(null);
    readonly previewMimeType = signal<string | null>(null);
    readonly previewLoading = signal(false);
    readonly previewError = signal<string | null>(null);
    readonly previewKind = computed<PreviewKind>(() => {
        const mimeType = this.previewMimeType() ?? this.selectedPreviewAttachment()?.previewMimeType ?? '';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'pdf';
        return 'unsupported';
    });

    readonly versionRootAttachment = signal<AttachmentSummary | null>(null);
    readonly versions = signal<AttachmentSummary[]>([]);
    readonly versionsLoading = signal(false);
    readonly versionsError = signal<string | null>(null);
    readonly versionUploadTarget = signal<AttachmentSummary | null>(null);
    readonly selectedVersionFile = signal<File | null>(null);
    readonly versionUploadForm = signal<AttachmentVersionUploadForm>({ ...DEFAULT_VERSION_UPLOAD_FORM });
    readonly versionUploadError = signal<string | null>(null);

    readonly finalTarget = signal<AttachmentSummary | null>(null);
    readonly markFinalNote = signal('');
    readonly clearFinalReason = signal('业务确认状态变更，撤销最终版标记。');
    readonly finalDialogError = signal<string | null>(null);

    uploadDialogVisible = false;
    previewDialogVisible = false;
    versionsDialogVisible = false;
    versionUploadDialogVisible = false;
    markFinalDialogVisible = false;
    clearFinalDialogVisible = false;

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

    ngOnDestroy(): void {
        this.revokePreviewUrl();
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
        this.store.clearUploadProgress();
    }

    resetUploadDialog(): void {
        if (this.store.saving()) {
            return;
        }
        this.selectedFile.set(null);
        this.uploadForm.set({
            ...DEFAULT_UPLOAD_FORM,
            category: this.defaultCategory()
        });
        this.uploadError.set(null);
        this.store.clearUploadProgress();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        this.selectedFile.set(file);
        this.store.clearUploadProgress();
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

    updateVersionUploadField<K extends keyof AttachmentVersionUploadForm>(field: K, value: AttachmentVersionUploadForm[K]): void {
        this.versionUploadForm.update((form) => ({
            ...form,
            [field]: value
        }));
        this.versionUploadError.set(null);
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
            if (this.store.uploadProgress().phase !== 'aborted') {
                this.uploadError.set('请确认文件类型、大小、存储 provider 和当前权限后重试。');
            }
        }
    }

    async openPreview(attachment: AttachmentSummary): Promise<void> {
        this.previewDialogVisible = true;
        this.selectedPreviewAttachment.set(attachment);
        this.previewLoading.set(true);
        this.previewError.set(null);
        this.revokePreviewUrl();

        if (!attachment.previewSupported) {
            this.previewLoading.set(false);
            this.previewError.set('该文件类型暂不支持在线预览。');
            return;
        }

        try {
            const preview = await this.store.previewAttachment(attachment.id);
            const objectUrl = URL.createObjectURL(preview.blob);
            this.previewObjectUrl.set(objectUrl);
            this.previewMimeType.set(preview.mimeType);
            this.safePreviewUrl.set(this.#sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
        } catch {
            this.previewError.set('附件预览没有打开成功，请稍后重试或下载查看。');
        } finally {
            this.previewLoading.set(false);
        }
    }

    closePreview(): void {
        this.revokePreviewUrl();
        this.selectedPreviewAttachment.set(null);
        this.previewError.set(null);
        this.previewLoading.set(false);
    }

    async openVersions(attachment: AttachmentSummary): Promise<void> {
        this.versionRootAttachment.set(attachment);
        this.versionsDialogVisible = true;
        await this.refreshVersions();
    }

    async refreshVersions(): Promise<void> {
        const attachment = this.versionRootAttachment();
        if (!attachment) {
            this.versions.set([]);
            return;
        }

        this.versionsLoading.set(true);
        this.versionsError.set(null);
        try {
            const versions = await this.store.loadAttachmentVersions(attachment.id);
            this.versions.set(versions);
        } catch {
            this.versionsError.set('附件版本历史没有读取成功，请稍后重试。');
        } finally {
            this.versionsLoading.set(false);
        }
    }

    resetVersionsDialog(): void {
        this.versionRootAttachment.set(null);
        this.versions.set([]);
        this.versionsError.set(null);
    }

    showVersionUploadDialog(attachment: AttachmentSummary): void {
        this.versionUploadTarget.set(attachment);
        this.selectedVersionFile.set(null);
        this.store.clearUploadProgress();
        this.versionUploadForm.set({
            category: attachment.category || this.defaultCategory(),
            securityLevel: attachment.securityLevel,
            displayName: attachment.displayName,
            description: attachment.description ?? '',
            changeNote: ''
        });
        this.versionUploadError.set(null);
        this.versionUploadDialogVisible = true;
    }

    resetVersionUploadDialog(): void {
        if (this.store.saving()) {
            return;
        }
        this.versionUploadTarget.set(null);
        this.selectedVersionFile.set(null);
        this.versionUploadForm.set({
            ...DEFAULT_VERSION_UPLOAD_FORM,
            category: this.defaultCategory()
        });
        this.versionUploadError.set(null);
        this.store.clearUploadProgress();
    }

    onVersionFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        this.selectedVersionFile.set(file);
        this.store.clearUploadProgress();
        if (file && !this.versionUploadForm().displayName) {
            this.updateVersionUploadField('displayName', file.name);
        }
        input.value = '';
    }

    async uploadVersion(): Promise<void> {
        const target = this.versionUploadTarget();
        const file = this.selectedVersionFile();
        const form = this.versionUploadForm();
        if (!target || !file || !form.changeNote.trim()) {
            return;
        }

        this.versionUploadError.set(null);
        try {
            await this.store.uploadAttachmentVersion({
                id: target.id,
                file,
                changeNote: form.changeNote.trim(),
                displayName: form.displayName.trim() || undefined,
                category: form.category || undefined,
                securityLevel: form.securityLevel,
                description: form.description.trim() || null
            });
            this.versionUploadDialogVisible = false;
            this.resetVersionUploadDialog();
            await this.reload();
            if (this.versionsDialogVisible) {
                await this.refreshVersions();
            }
        } catch {
            if (this.store.uploadProgress().phase !== 'aborted') {
                this.versionUploadError.set('请确认新版本文件、版本说明、存储 provider 和当前权限后重试。');
            }
        }
    }

    async abortUpload(): Promise<void> {
        try {
            await this.store.abortCurrentUpload('用户在附件面板中止附件上传。');
        } catch {
            const message = '上传会话没有中止成功，请稍后重试。';
            if (this.versionUploadDialogVisible) {
                this.versionUploadError.set(message);
            } else {
                this.uploadError.set(message);
            }
        }
    }

    showMarkFinalDialog(attachment: AttachmentSummary): void {
        this.finalTarget.set(attachment);
        this.markFinalNote.set('');
        this.finalDialogError.set(null);
        this.markFinalDialogVisible = true;
    }

    showClearFinalDialog(attachment: AttachmentSummary): void {
        this.finalTarget.set(attachment);
        this.clearFinalReason.set('业务确认状态变更，撤销最终版标记。');
        this.finalDialogError.set(null);
        this.clearFinalDialogVisible = true;
    }

    resetFinalDialogs(): void {
        this.finalTarget.set(null);
        this.markFinalNote.set('');
        this.clearFinalReason.set('业务确认状态变更，撤销最终版标记。');
        this.finalDialogError.set(null);
    }

    async confirmMarkFinal(): Promise<void> {
        const attachment = this.finalTarget();
        if (!attachment) {
            return;
        }

        try {
            await this.store.markAttachmentFinal(attachment.id, { note: this.markFinalNote().trim() || null });
            this.markFinalDialogVisible = false;
            this.resetFinalDialogs();
            await this.reload();
            if (this.versionsDialogVisible) {
                await this.refreshVersions();
            }
        } catch {
            this.finalDialogError.set('请确认当前权限后重试。');
        }
    }

    async confirmClearFinal(): Promise<void> {
        const attachment = this.finalTarget();
        const reason = this.clearFinalReason().trim();
        if (!attachment || !reason) {
            return;
        }

        try {
            await this.store.clearAttachmentFinal(attachment.id, { reason });
            this.clearFinalDialogVisible = false;
            this.resetFinalDialogs();
            await this.reload();
            if (this.versionsDialogVisible) {
                await this.refreshVersions();
            }
        } catch {
            this.finalDialogError.set('请确认当前权限后重试。');
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
                reason: '用户在附件面板中作废附件。'
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

    fileIcon(attachment: AttachmentSummary): string {
        const mimeType = attachment.mimeType;
        if (mimeType.startsWith('image/')) return 'pi-image';
        if (mimeType === 'application/pdf') return 'pi-file-pdf';
        if (['xls', 'xlsx', 'csv'].includes(attachment.extension.toLowerCase())) return 'pi-file-excel';
        if (['zip', 'rar', '7z'].includes(attachment.extension.toLowerCase())) return 'pi-box';
        return 'pi-file';
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

    uploadPhaseLabel(): string {
        switch (this.store.uploadProgress().phase) {
            case 'creating-session':
                return '创建上传会话';
            case 'creating-target':
                return '准备上传目标';
            case 'uploading':
                return '正在上传';
            case 'completing':
                return '正在完成';
            case 'completed':
                return '上传完成';
            case 'aborting':
                return '正在中止';
            case 'aborted':
                return '已中止';
            case 'failed':
                return '上传失败';
            default:
                return '等待上传';
        }
    }

    uploadModeLabel(): string {
        const state = this.store.uploadProgress();
        if (!state.uploadMode) {
            return 'Session';
        }
        if (state.uploadMode === AttachmentUploadMode.Proxy) {
            return 'POMS Proxy';
        }
        if (state.uploadMode === AttachmentUploadMode.PresignedPut) {
            return 'OBS Direct';
        }
        return 'Multipart';
    }

    uploadProgressSeverity(): 'success' | 'secondary' | 'info' | 'warn' | 'danger' {
        const phase = this.store.uploadProgress().phase;
        if (phase === 'completed') return 'success';
        if (phase === 'failed') return 'danger';
        if (phase === 'aborted' || phase === 'aborting') return 'warn';
        if (phase === 'idle') return 'secondary';
        return 'info';
    }

    uploadProgressDetail(): string {
        const state = this.store.uploadProgress();
        if (state.phase === 'failed' && state.error) {
            return state.error;
        }
        if (state.loadedBytes || state.totalBytes) {
            return `${this.formatSize(state.loadedBytes)} / ${this.formatSize(state.totalBytes || state.loadedBytes)}`;
        }
        return state.fileName ?? '等待上传文件';
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
            category: this.defaultCategory()
        }));
        this.versionUploadForm.update((form) => ({
            ...form,
            category: this.defaultCategory()
        }));
    }

    private defaultCategory(): string {
        const options = this.categoryOptions();
        return options[0]?.value ?? DEFAULT_UPLOAD_FORM.category;
    }

    private revokePreviewUrl(): void {
        const currentUrl = this.previewObjectUrl();
        if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
        }
        this.previewObjectUrl.set(null);
        this.safePreviewUrl.set(null);
        this.previewMimeType.set(null);
    }
}
