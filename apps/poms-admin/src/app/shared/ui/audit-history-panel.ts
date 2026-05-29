import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { AuditHistoryStore, type EntityAuditHistoryRecord, type EntityAuditHistoryTargetType } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import type { UiTagSeverity } from './ui-severity';
import { WorkspaceFeedback } from './workspace-feedback';

const TARGET_TYPE_LABELS: Record<EntityAuditHistoryTargetType, string> = {
    lead: '线索',
    customer: '客户',
    'customer-contact': '客户联系人',
    'opportunity-stakeholder': '决策关系人',
    'competitor-intelligence': '竞争态势',
    'sales-discovery-record': '销售发现',
    'sales-follow-up-record': '销售跟进',
    project: '项目',
    contract: '合同'
};

const RESULT_LABELS: Record<EntityAuditHistoryRecord['result'], string> = {
    success: '成功',
    rejected: '被拒绝',
    failed: '失败'
};

const RESULT_SEVERITIES: Record<EntityAuditHistoryRecord['result'], UiTagSeverity> = {
    success: 'success',
    rejected: 'warn',
    failed: 'danger'
};

const FIELD_LABELS: Record<string, string> = {
    leadName: '线索名称',
    sourceCode: '线索来源',
    demandDescription: '需求描述',
    budgetStatus: '预算情况',
    estimatedAmount: '预计金额',
    urgency: '紧迫程度',
    expectedDecisionDate: '预计决策日期',
    displayName: '客户名称',
    legalName: '法定名称',
    shortName: '简称',
    sourceChannel: '来源渠道',
    remark: '备注',
    customerId: '客户',
    customerProjectNo: '客户项目编号',
    projectName: '项目名称',
    ownerUserId: '销售主责',
    ownerOrgId: '主责组织'
};

@Component({
    selector: 'app-audit-history-panel',
    standalone: true,
    imports: [CommonModule, ButtonModule, DialogModule, TagModule, WorkspaceFeedback],
    providers: [AuditHistoryStore],
    template: `
        <p-button [label]="buttonLabel" icon="pi pi-history" severity="secondary" [outlined]="true" styleClass="rounded-md!" [disabled]="!targetId" [loading]="store.loading()" (onClick)="openDialog()" />

        <p-dialog [(visible)]="dialogVisible" [modal]="true" appendTo="body" [header]="dialogTitle" [style]="{ width: 'min(56rem, 94vw)' }" (onHide)="clearDialog()">
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-3 rounded-[8px] border border-surface-200 p-4 dark:border-surface-700 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                        <div class="text-xs text-surface-500 dark:text-surface-400">{{ targetTypeLabel }}</div>
                        <h3 class="mt-1 truncate text-base font-semibold text-surface-950 dark:text-surface-0">{{ displayText(targetTitle, targetId) }}</h3>
                    </div>
                    <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" styleClass="rounded-md!" [loading]="store.loading()" (onClick)="reload()" />
                </div>

                @if (store.error()) {
                    <app-workspace-feedback severity="error" summary="编辑历史暂时不可用" [detail]="store.error()" />
                } @else if (store.loading()) {
                    <app-workspace-feedback severity="info" summary="正在读取编辑历史" detail="请稍候。" />
                } @else if (store.records().length > 0) {
                    <div class="flex flex-col divide-y divide-surface-200 rounded-[8px] border border-surface-200 dark:divide-surface-700 dark:border-surface-700">
                        @for (record of store.records(); track record.id) {
                            <article class="px-4 py-3">
                                <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div class="min-w-0">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="text-sm font-semibold text-surface-950 dark:text-surface-0">{{ record.eventType }}</span>
                                            <p-tag [value]="resultLabel(record.result)" [severity]="resultSeverity(record.result)" class="rounded-[6px]!" />
                                        </div>
                                        <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-500 dark:text-surface-400">
                                            <span>{{ record.occurredAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                            <span>操作人 {{ displayText(record.operatorId, '未记录') }}</span>
                                            @if (record.requestId) {
                                                <span>请求 {{ record.requestId }}</span>
                                            }
                                        </div>
                                    </div>
                                </div>

                                @if (changedFields(record); as fields) {
                                    @if (fields.length > 0) {
                                        <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                            @for (field of fields; track field) {
                                                <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                                    <div class="text-xs font-medium text-surface-500 dark:text-surface-400">{{ fieldLabel(field) }}</div>
                                                    <div class="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                                        <div>
                                                            <div class="text-surface-500 dark:text-surface-400">变更前</div>
                                                            <div class="mt-1 break-words text-surface-900 dark:text-surface-0">{{ snapshotValue(record.beforeSnapshot, field) }}</div>
                                                        </div>
                                                        <div>
                                                            <div class="text-surface-500 dark:text-surface-400">变更后</div>
                                                            <div class="mt-1 break-words text-surface-900 dark:text-surface-0">{{ snapshotValue(record.afterSnapshot, field) }}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            }
                                        </div>
                                    } @else if (hasSnapshot(record)) {
                                        <app-workspace-feedback class="mt-3 block" severity="secondary" summary="审计快照" detail="该记录包含结构化快照，但没有声明变更字段。" />
                                    } @else {
                                        <app-workspace-feedback class="mt-3 block" severity="secondary" summary="没有字段快照" detail="该审计事件没有返回可展示的 before / after 字段。" />
                                    }
                                }
                            </article>
                        }
                    </div>
                } @else {
                    <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无编辑历史。</div>
                }
            </div>
        </p-dialog>
    `
})
export class AuditHistoryPanel {
    readonly store = inject(AuditHistoryStore);

    @Input({ required: true }) targetType!: EntityAuditHistoryTargetType;
    @Input({ required: true }) targetId!: string;
    @Input() targetTitle = '';
    @Input() buttonLabel = '编辑历史';
    @Input() limit = 50;

    dialogVisible = false;

    get dialogTitle(): string {
        return `${this.targetTypeLabel}编辑历史`;
    }

    get targetTypeLabel(): string {
        return TARGET_TYPE_LABELS[this.targetType] ?? this.targetType;
    }

    openDialog(): void {
        if (!this.targetId) {
            return;
        }
        this.dialogVisible = true;
        void this.reload();
    }

    async reload(): Promise<void> {
        if (!this.targetId) {
            return;
        }
        await this.store.loadEntityAuditLogs({
            targetType: this.targetType,
            targetId: this.targetId,
            limit: this.limit
        });
    }

    clearDialog(): void {
        this.store.clear();
    }

    changedFields(record: EntityAuditHistoryRecord): string[] {
        const fields = this.recordObject(record.metadata)['changedFields'];
        return Array.isArray(fields) ? fields.filter((field): field is string => typeof field === 'string' && field.trim().length > 0) : [];
    }

    hasSnapshot(record: EntityAuditHistoryRecord): boolean {
        return Object.keys(this.recordObject(record.beforeSnapshot)).length > 0 || Object.keys(this.recordObject(record.afterSnapshot)).length > 0;
    }

    snapshotValue(snapshot: EntityAuditHistoryRecord['beforeSnapshot'], field: string): string {
        const value = this.recordObject(snapshot)[field];
        return this.formatUnknown(value);
    }

    fieldLabel(field: string): string {
        return FIELD_LABELS[field] ?? field;
    }

    resultLabel(result: EntityAuditHistoryRecord['result']): string {
        return RESULT_LABELS[result] ?? result;
    }

    resultSeverity(result: EntityAuditHistoryRecord['result']): UiTagSeverity {
        return RESULT_SEVERITIES[result] ?? 'secondary';
    }

    displayText(value: string | null | undefined, fallback: string): string {
        return value && value.trim() ? value : fallback;
    }

    private recordObject(value: unknown): Record<string, unknown> {
        return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    }

    private formatUnknown(value: unknown): string {
        if (value === null || value === undefined || value === '') {
            return '未记录';
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        try {
            return JSON.stringify(value);
        } catch {
            return '无法展示';
        }
    }
}
