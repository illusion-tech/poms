import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    ActiveInactiveStatus,
    DictionaryDomain,
    DictionaryStore,
    SalesFollowUpOutcome,
    SalesFollowUpRecordLifecycleScope,
    SalesFollowUpRecordStatus,
    SalesFollowUpStore,
    type SalesFollowUpRecordSummary
} from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { WorkspaceFeedback } from './workspace-feedback';

interface SalesFollowUpOption<T extends string> {
    label: string;
    value: T;
}

interface SalesFollowUpForm {
    followUpType: string;
    occurredAt: Date | null;
    summary: string;
    detail: string;
    outcome: SalesFollowUpOutcome;
    nextFollowUpAt: Date | null;
}

type SalesFollowUpDialogMode = 'create' | 'replace';

const SALES_FOLLOW_UP_OUTCOME_LABELS: Record<SalesFollowUpOutcome, string> = {
    [SalesFollowUpOutcome.Progress]: '有进展',
    [SalesFollowUpOutcome.WaitingCustomer]: '待客户反馈',
    [SalesFollowUpOutcome.RiskDiscovered]: '发现风险',
    [SalesFollowUpOutcome.Deferred]: '暂缓',
    [SalesFollowUpOutcome.CloseRecommended]: '建议关闭',
    [SalesFollowUpOutcome.NoResponse]: '暂无回应',
    [SalesFollowUpOutcome.Other]: '其他'
};

const SALES_FOLLOW_UP_STATUS_LABELS: Record<SalesFollowUpRecordStatus, string> = {
    [SalesFollowUpRecordStatus.Active]: '当前',
    [SalesFollowUpRecordStatus.Superseded]: '已替代',
    [SalesFollowUpRecordStatus.Voided]: '已作废'
};

const DEFAULT_FOLLOW_UP_TYPE = 'meeting';
const DEFAULT_FOLLOW_UP_OUTCOME = SalesFollowUpOutcome.Progress;

const SALES_FOLLOW_UP_OUTCOME_OPTIONS: SalesFollowUpOption<SalesFollowUpOutcome>[] = [
    { label: SALES_FOLLOW_UP_OUTCOME_LABELS[SalesFollowUpOutcome.Progress], value: SalesFollowUpOutcome.Progress },
    { label: SALES_FOLLOW_UP_OUTCOME_LABELS[SalesFollowUpOutcome.WaitingCustomer], value: SalesFollowUpOutcome.WaitingCustomer },
    { label: SALES_FOLLOW_UP_OUTCOME_LABELS[SalesFollowUpOutcome.RiskDiscovered], value: SalesFollowUpOutcome.RiskDiscovered },
    { label: SALES_FOLLOW_UP_OUTCOME_LABELS[SalesFollowUpOutcome.Deferred], value: SalesFollowUpOutcome.Deferred },
    { label: SALES_FOLLOW_UP_OUTCOME_LABELS[SalesFollowUpOutcome.CloseRecommended], value: SalesFollowUpOutcome.CloseRecommended },
    { label: SALES_FOLLOW_UP_OUTCOME_LABELS[SalesFollowUpOutcome.NoResponse], value: SalesFollowUpOutcome.NoResponse },
    { label: SALES_FOLLOW_UP_OUTCOME_LABELS[SalesFollowUpOutcome.Other], value: SalesFollowUpOutcome.Other }
];

const EMPTY_FOLLOW_UP_FORM: SalesFollowUpForm = {
    followUpType: DEFAULT_FOLLOW_UP_TYPE,
    occurredAt: null,
    summary: '',
    detail: '',
    outcome: DEFAULT_FOLLOW_UP_OUTCOME,
    nextFollowUpAt: null
};

@Component({
    selector: 'app-sales-follow-up-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DatePickerModule, DialogModule, InputTextModule, SelectModule, TagModule, TextareaModule, ToggleSwitchModule, WorkspaceFeedback],
    providers: [SalesFollowUpStore, DictionaryStore],
    template: `
        <section class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 class="m-0 text-base font-semibold text-surface-950 dark:text-surface-0">{{ title }}</h3>
                    <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">{{ description }}</p>
                </div>
                <div class="flex shrink-0 flex-wrap items-center gap-3">
                    <label class="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                        <span>显示历史</span>
                        <p-toggleswitch [ngModel]="includeHistory()" (ngModelChange)="toggleHistory($event)" />
                    </label>
                    <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" styleClass="rounded-md!" [loading]="store.loading()" [disabled]="!canReadContext()" (onClick)="reload()" />
                    @if (canWrite) {
                        <p-button icon="pi pi-plus" label="记录跟进" severity="primary" [outlined]="true" styleClass="rounded-md!" [disabled]="!canCreateContext()" (onClick)="showDialog()" />
                    }
                </div>
            </div>

            <div class="mt-4 flex flex-col gap-3">
                @if (!canReadContext()) {
                    <app-workspace-feedback severity="warn" summary="暂时不能读取销售跟进" detail="当前业务对象缺少客户或对象标识，无法形成销售跟进查询上下文。" />
                } @else if (!canCreateContext()) {
                    <app-workspace-feedback severity="warn" summary="暂时不能新增销售跟进" detail="当前项目缺少客户主档，新增跟进前需要先补齐客户绑定。" />
                }

                @if (error()) {
                    <app-workspace-feedback severity="error" summary="销售跟进暂时无法处理" [detail]="error()" />
                } @else if (store.loading()) {
                    <app-workspace-feedback severity="info" summary="正在读取销售跟进" detail="请稍候。" />
                } @else if (store.followUps().length) {
                    @for (record of store.followUps(); track record.id) {
                        <article [class]="getRecordCardClass(record)">
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div class="min-w-0">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="text-sm font-semibold text-surface-950 dark:text-surface-0">{{ record.summary }}</span>
                                        <p-tag [value]="getStatusName(record.status)" [severity]="getStatusSeverity(record.status)" styleClass="rounded-[6px]" />
                                        <p-tag [value]="getOutcomeName(record.outcome)" severity="secondary" styleClass="rounded-[6px]" />
                                    </div>
                                    <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-500 dark:text-surface-400">
                                        <span>{{ record.occurredAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                        <span>{{ getTypeName(record.followUpType) }}</span>
                                        <span>{{ contextLabel(record) }}</span>
                                        <span>{{ record.ownerName || '未指定销售' }}</span>
                                    </div>
                                </div>
                                <div class="flex shrink-0 flex-wrap justify-end gap-2">
                                    @if (record.status === SalesFollowUpRecordStatus.Active && record.nextFollowUpAt) {
                                        <div class="rounded-[6px] bg-primary-50 px-2 py-1 text-xs text-primary-700 dark:bg-primary-950/40 dark:text-primary-200">
                                            下次 {{ record.nextFollowUpAt | date: 'MM-dd HH:mm' }}
                                        </div>
                                    }
                                    @if (canWrite && record.status === SalesFollowUpRecordStatus.Active) {
                                        <p-button icon="pi pi-pencil" label="更正" severity="secondary" [outlined]="true" size="small" styleClass="rounded-md!" (onClick)="showReplaceDialog(record)" />
                                        <p-button icon="pi pi-ban" label="作废" severity="danger" [outlined]="true" size="small" styleClass="rounded-md!" (onClick)="showVoidDialog(record)" />
                                    }
                                </div>
                            </div>
                            @if (record.detail) {
                                <p class="mt-2 whitespace-pre-line text-sm leading-6 text-surface-600 dark:text-surface-300">{{ record.detail }}</p>
                            }
                            @if (record.replacementReason) {
                                <p class="mt-2 text-xs text-surface-500 dark:text-surface-400">更正原因：{{ record.replacementReason }}</p>
                            }
                            @if (record.voidReason) {
                                <p class="mt-2 text-xs text-rose-600 dark:text-rose-300">作废原因：{{ record.voidReason }}</p>
                            }
                        </article>
                    }
                } @else if (canReadContext()) {
                    <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无销售跟进记录。</div>
                }
            </div>
        </section>

        <p-dialog [(visible)]="dialogVisible" [modal]="true" appendTo="body" [header]="dialogTitle()" [style]="{ width: '36rem' }" styleClass="p-fluid" (onHide)="resetDialog()">
            <div class="flex flex-col gap-4 py-2">
                <app-workspace-feedback severity="info" summary="跟进上下文" [detail]="dialogContextDetail()" />

                @if (error()) {
                    <app-workspace-feedback severity="error" summary="跟进记录没有保存成功" [detail]="error()" />
                }

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2">
                        <label for="salesFollowUpType" class="text-sm font-medium text-surface-900 dark:text-surface-0">跟进方式</label>
                        <p-select
                            inputId="salesFollowUpType"
                            [ngModel]="form().followUpType"
                            (ngModelChange)="updateType($event)"
                            [options]="typeOptions()"
                            optionLabel="label"
                            optionValue="value"
                            appendTo="body"
                            styleClass="w-full rounded-md!"
                        />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="salesFollowUpOccurredAt" class="text-sm font-medium text-surface-900 dark:text-surface-0">发生时间</label>
                        <p-datepicker
                            inputId="salesFollowUpOccurredAt"
                            [ngModel]="form().occurredAt"
                            (ngModelChange)="updateDate('occurredAt', $event)"
                            [showButtonBar]="true"
                            [showTime]="true"
                            hourFormat="24"
                            appendTo="body"
                            dateFormat="yy-mm-dd"
                            styleClass="w-full"
                            inputStyleClass="w-full rounded-md!"
                        />
                        @if (attempted() && !form().occurredAt) {
                            <span class="text-xs text-red-600 dark:text-red-300">请选择发生时间。</span>
                        }
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label for="salesFollowUpSummary" class="text-sm font-medium text-surface-900 dark:text-surface-0">摘要</label>
                    <input pInputText id="salesFollowUpSummary" [ngModel]="form().summary" (ngModelChange)="updateText('summary', $event)" placeholder="例如：完成预算口径确认" class="w-full rounded-md!" />
                    @if (attempted() && !form().summary.trim()) {
                        <span class="text-xs text-red-600 dark:text-red-300">请填写跟进摘要。</span>
                    }
                </div>

                <div class="flex flex-col gap-2">
                    <label for="salesFollowUpDetail" class="text-sm font-medium text-surface-900 dark:text-surface-0">详情</label>
                    <textarea
                        pTextarea
                        id="salesFollowUpDetail"
                        rows="4"
                        [ngModel]="form().detail"
                        (ngModelChange)="updateText('detail', $event)"
                        placeholder="记录客户反馈、风险、承诺事项和下一步动作"
                        class="w-full rounded-md!"
                    ></textarea>
                </div>

                @if (dialogMode() === 'replace') {
                    <div class="flex flex-col gap-2">
                        <label for="salesFollowUpReplacementReason" class="text-sm font-medium text-surface-900 dark:text-surface-0">更正原因</label>
                        <textarea
                            pTextarea
                            id="salesFollowUpReplacementReason"
                            rows="3"
                            [ngModel]="replacementReason()"
                            (ngModelChange)="updateReplacementReason($event)"
                            placeholder="说明为什么需要生成新版本，例如摘要不完整、跟进结果登记错误"
                            class="w-full rounded-md!"
                        ></textarea>
                        @if (attempted() && !replacementReason().trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写更正原因。</span>
                        }
                    </div>
                }

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2">
                        <label for="salesFollowUpOutcome" class="text-sm font-medium text-surface-900 dark:text-surface-0">结果</label>
                        <p-select
                            inputId="salesFollowUpOutcome"
                            [ngModel]="form().outcome"
                            (ngModelChange)="updateOutcome($event)"
                            [options]="outcomeOptions"
                            optionLabel="label"
                            optionValue="value"
                            appendTo="body"
                            styleClass="w-full rounded-md!"
                        />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="salesFollowUpNextAt" class="text-sm font-medium text-surface-900 dark:text-surface-0">下次跟进</label>
                        <p-datepicker
                            inputId="salesFollowUpNextAt"
                            [ngModel]="form().nextFollowUpAt"
                            (ngModelChange)="updateDate('nextFollowUpAt', $event)"
                            [showButtonBar]="true"
                            [showTime]="true"
                            hourFormat="24"
                            appendTo="body"
                            dateFormat="yy-mm-dd"
                            placeholder="可留空"
                            styleClass="w-full"
                            inputStyleClass="w-full rounded-md!"
                        />
                    </div>
                </div>
            </div>

            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="dialogVisible = false" />
                    <p-button [label]="dialogSubmitLabel()" [loading]="store.saving()" [disabled]="!canSubmitDialog()" styleClass="rounded-md!" (onClick)="createFollowUp()" />
                </div>
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="voidDialogVisible" [modal]="true" appendTo="body" header="作废销售跟进" [style]="{ width: '32rem' }" styleClass="p-fluid" (onHide)="resetVoidDialog()">
            <div class="flex flex-col gap-4 py-2">
                @if (voidTarget(); as record) {
                    <app-workspace-feedback severity="warn" summary="作废后默认列表将不再显示" [detail]="'将作废：' + record.summary" />
                }

                @if (error()) {
                    <app-workspace-feedback severity="error" summary="跟进记录没有作废成功" [detail]="error()" />
                }

                <div class="flex flex-col gap-2">
                    <label for="salesFollowUpVoidReason" class="text-sm font-medium text-surface-900 dark:text-surface-0">作废原因</label>
                    <textarea
                        pTextarea
                        id="salesFollowUpVoidReason"
                        rows="3"
                        [ngModel]="voidReason()"
                        (ngModelChange)="updateVoidReason($event)"
                        placeholder="例如：重复录入、登记对象错误、内容无效"
                        class="w-full rounded-md!"
                    ></textarea>
                    @if (voidAttempted() && !voidReason().trim()) {
                        <span class="text-xs text-red-600 dark:text-red-300">请填写作废原因。</span>
                    }
                </div>

                <div class="flex flex-col gap-2">
                    <label for="salesFollowUpVoidComment" class="text-sm font-medium text-surface-900 dark:text-surface-0">补充说明</label>
                    <textarea
                        pTextarea
                        id="salesFollowUpVoidComment"
                        rows="3"
                        [ngModel]="voidComment()"
                        (ngModelChange)="updateVoidComment($event)"
                        placeholder="可选，记录补充背景"
                        class="w-full rounded-md!"
                    ></textarea>
                </div>
            </div>

            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="voidDialogVisible = false" />
                    <p-button label="确认作废" severity="danger" [loading]="store.saving()" [disabled]="!canSubmitVoid()" styleClass="rounded-md!" (onClick)="voidFollowUp()" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class SalesFollowUpPanel implements OnChanges, OnInit {
    readonly store = inject(SalesFollowUpStore);
    readonly dictionaryStore = inject(DictionaryStore);
    readonly SalesFollowUpRecordStatus = SalesFollowUpRecordStatus;

    @Input({ required: true }) customerId!: string | null;
    @Input() leadId: string | null = null;
    @Input() projectId: string | null = null;
    @Input() canWrite = false;
    @Input() title = '销售跟进';
    @Input() description = '记录客户沟通、风险、承诺事项和下一步动作。';
    @Input() createContextDetail = '本次记录会挂到当前业务对象，同时保留客户维度。';

    readonly error = signal<string | null>(null);
    readonly attempted = signal(false);
    readonly form = signal<SalesFollowUpForm>({ ...EMPTY_FOLLOW_UP_FORM });
    readonly dialogMode = signal<SalesFollowUpDialogMode>('create');
    readonly replaceTarget = signal<SalesFollowUpRecordSummary | null>(null);
    readonly replacementReason = signal('');
    readonly includeHistory = signal(false);
    readonly voidTarget = signal<SalesFollowUpRecordSummary | null>(null);
    readonly voidReason = signal('');
    readonly voidComment = signal('');
    readonly voidAttempted = signal(false);

    dialogVisible = false;
    voidDialogVisible = false;

    readonly typeOptions = computed<SalesFollowUpOption<string>[]>(() => this.dictionaryStore.activeItems().map((item) => ({ label: item.name, value: item.code })));
    readonly typeLookup = computed(() => new Map(this.dictionaryStore.items().map((item) => [item.code, item.name])));
    readonly outcomeOptions = SALES_FOLLOW_UP_OUTCOME_OPTIONS;

    ngOnInit(): void {
        void this.loadTypeOptions();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['customerId'] || changes['leadId'] || changes['projectId']) {
            void this.reload();
        }
    }

    async reload(): Promise<void> {
        if (!this.canReadContext()) {
            this.store.clearFollowUps();
            return;
        }

        this.error.set(null);
        try {
            await this.store.loadFollowUps({
                customerId: this.customerId ?? undefined,
                leadId: this.leadId ?? undefined,
                projectId: this.projectId ?? undefined,
                lifecycleScope: this.includeHistory() ? SalesFollowUpRecordLifecycleScope.All : SalesFollowUpRecordLifecycleScope.Active
            });
        } catch {
            this.error.set('销售跟进记录没有读取成功，请稍后重试。');
        }
    }

    async loadTypeOptions(): Promise<void> {
        try {
            const items = await this.dictionaryStore.loadItems({
                domain: DictionaryDomain.SalesFollowUpType,
                status: ActiveInactiveStatus.Active
            });
            this.ensureFollowUpType(items.map((item) => item.code));
        } catch {
            this.error.set('跟进方式没有读取成功，请稍后重试。');
        }
    }

    showDialog(): void {
        if (!this.canWrite || !this.canCreateContext()) {
            return;
        }

        this.form.set(this.defaultForm());
        this.dialogMode.set('create');
        this.replaceTarget.set(null);
        this.replacementReason.set('');
        this.attempted.set(false);
        this.error.set(null);
        this.dialogVisible = true;
    }

    showReplaceDialog(record: SalesFollowUpRecordSummary): void {
        if (!this.canWrite || record.status !== SalesFollowUpRecordStatus.Active) {
            return;
        }

        this.form.set({
            followUpType: record.followUpType,
            occurredAt: new Date(record.occurredAt),
            summary: record.summary,
            detail: record.detail ?? '',
            outcome: record.outcome,
            nextFollowUpAt: record.nextFollowUpAt ? new Date(record.nextFollowUpAt) : null
        });
        this.dialogMode.set('replace');
        this.replaceTarget.set(record);
        this.replacementReason.set('');
        this.attempted.set(false);
        this.error.set(null);
        this.dialogVisible = true;
    }

    showVoidDialog(record: SalesFollowUpRecordSummary): void {
        if (!this.canWrite || record.status !== SalesFollowUpRecordStatus.Active) {
            return;
        }

        this.voidTarget.set(record);
        this.voidReason.set('');
        this.voidComment.set('');
        this.voidAttempted.set(false);
        this.error.set(null);
        this.voidDialogVisible = true;
    }

    resetDialog(): void {
        this.attempted.set(false);
        this.error.set(null);
    }

    resetVoidDialog(): void {
        this.voidAttempted.set(false);
        this.error.set(null);
    }

    updateType(value: string | null | undefined): void {
        this.form.update((form) => ({
            ...form,
            followUpType: value ?? DEFAULT_FOLLOW_UP_TYPE
        }));
        this.error.set(null);
    }

    updateOutcome(value: SalesFollowUpOutcome | null | undefined): void {
        this.form.update((form) => ({
            ...form,
            outcome: value ?? DEFAULT_FOLLOW_UP_OUTCOME
        }));
        this.error.set(null);
    }

    updateText(field: 'summary' | 'detail', value: string): void {
        this.form.update((form) => ({
            ...form,
            [field]: value
        }));
        this.error.set(null);
    }

    updateDate(field: 'occurredAt' | 'nextFollowUpAt', value: Date | null): void {
        this.form.update((form) => ({
            ...form,
            [field]: value
        }));
        this.error.set(null);
    }

    updateReplacementReason(value: string): void {
        this.replacementReason.set(value);
        this.error.set(null);
    }

    updateVoidReason(value: string): void {
        this.voidReason.set(value);
        this.error.set(null);
    }

    updateVoidComment(value: string): void {
        this.voidComment.set(value);
        this.error.set(null);
    }

    toggleHistory(value: boolean): void {
        this.includeHistory.set(Boolean(value));
        void this.reload();
    }

    async createFollowUp(): Promise<void> {
        this.attempted.set(true);
        const form = this.form();

        if (!this.canWrite || !this.canSubmitDialog() || !form.occurredAt) {
            return;
        }

        try {
            if (this.dialogMode() === 'replace') {
                const target = this.replaceTarget();
                if (!target) {
                    return;
                }

                await this.store.replaceFollowUp(target.id, {
                    followUpType: form.followUpType,
                    occurredAt: form.occurredAt.toISOString(),
                    summary: form.summary.trim(),
                    detail: this.optionalText(form.detail),
                    outcome: form.outcome,
                    nextFollowUpAt: form.nextFollowUpAt ? form.nextFollowUpAt.toISOString() : null,
                    ownerOrgId: target.ownerOrgId,
                    ownerUserId: target.ownerUserId,
                    replacementReason: this.replacementReason().trim(),
                    expectedVersion: target.rowVersion
                });
            } else {
                if (!this.customerId) {
                    return;
                }

                const createProjectId = this.projectId ?? null;
                const createLeadId = createProjectId ? null : this.leadId;

                await this.store.createFollowUp({
                    customerId: this.customerId,
                    leadId: createLeadId,
                    projectId: createProjectId,
                    followUpType: form.followUpType,
                    occurredAt: form.occurredAt.toISOString(),
                    summary: form.summary.trim(),
                    detail: this.optionalText(form.detail),
                    outcome: form.outcome,
                    nextFollowUpAt: form.nextFollowUpAt ? form.nextFollowUpAt.toISOString() : null
                });
            }
            await this.reload();
            this.dialogVisible = false;
        } catch {
            this.error.set(this.dialogMode() === 'replace' ? '跟进记录没有更正成功，请刷新后重试。' : '请确认客户、线索或项目仍然有效，或稍后重试。');
        }
    }

    async voidFollowUp(): Promise<void> {
        this.voidAttempted.set(true);
        const target = this.voidTarget();

        if (!this.canWrite || !target || !this.canSubmitVoid()) {
            return;
        }

        try {
            await this.store.voidFollowUp(target.id, {
                reason: this.voidReason().trim(),
                comment: this.optionalText(this.voidComment()),
                expectedVersion: target.rowVersion
            });
            await this.reload();
            this.voidDialogVisible = false;
        } catch {
            this.error.set('跟进记录没有作废成功，请刷新后重试。');
        }
    }

    isFormValid(): boolean {
        const form = this.form();
        return Boolean(form.followUpType && form.occurredAt && form.summary.trim());
    }

    canSubmitDialog(): boolean {
        if (!this.isFormValid()) {
            return false;
        }

        if (this.dialogMode() === 'replace') {
            return Boolean(this.replaceTarget() && this.replacementReason().trim());
        }

        return this.canCreateContext();
    }

    canSubmitVoid(): boolean {
        return Boolean(this.voidTarget() && this.voidReason().trim());
    }

    canReadContext(): boolean {
        return Boolean(this.customerId || this.leadId || this.projectId);
    }

    canCreateContext(): boolean {
        return Boolean(this.customerId);
    }

    getTypeName(type: string): string {
        return this.typeLookup().get(type) ?? type;
    }

    getOutcomeName(outcome: SalesFollowUpOutcome): string {
        return SALES_FOLLOW_UP_OUTCOME_LABELS[outcome];
    }

    getStatusName(status: SalesFollowUpRecordStatus): string {
        return SALES_FOLLOW_UP_STATUS_LABELS[status];
    }

    getStatusSeverity(status: SalesFollowUpRecordStatus): 'success' | 'secondary' | 'danger' {
        if (status === SalesFollowUpRecordStatus.Active) {
            return 'success';
        }

        if (status === SalesFollowUpRecordStatus.Voided) {
            return 'danger';
        }

        return 'secondary';
    }

    getRecordCardClass(record: SalesFollowUpRecordSummary): string {
        const base = 'rounded-[8px] border p-3';
        if (record.status === SalesFollowUpRecordStatus.Active) {
            return `${base} border-surface-200 dark:border-surface-700`;
        }

        return `${base} border-surface-200 bg-surface-50/70 opacity-80 dark:border-surface-700 dark:bg-surface-900/40`;
    }

    dialogTitle(): string {
        return this.dialogMode() === 'replace' ? '更正销售跟进' : '记录销售跟进';
    }

    dialogSubmitLabel(): string {
        return this.dialogMode() === 'replace' ? '保存新版本' : '保存跟进';
    }

    dialogContextDetail(): string {
        if (this.dialogMode() === 'replace') {
            return '更正会生成一条新的当前记录，原记录保留为已替代历史。';
        }

        return this.createContextDetail;
    }

    contextLabel(record: Pick<SalesFollowUpRecordSummary, 'leadId' | 'projectId'>): string {
        if (record.projectId) {
            return '项目跟进';
        }

        if (record.leadId) {
            return '线索跟进';
        }

        return '客户跟进';
    }

    private defaultForm(): SalesFollowUpForm {
        return {
            ...EMPTY_FOLLOW_UP_FORM,
            followUpType: this.defaultFollowUpType(),
            occurredAt: new Date()
        };
    }

    private optionalText(value: string): string | null {
        const normalized = value.trim();
        return normalized.length ? normalized : null;
    }

    private ensureFollowUpType(codes: string[]): void {
        if (!codes.length) {
            return;
        }

        const currentType = this.form().followUpType;
        if (codes.includes(currentType)) {
            return;
        }

        this.form.update((form) => ({
            ...form,
            followUpType: codes.includes(DEFAULT_FOLLOW_UP_TYPE) ? DEFAULT_FOLLOW_UP_TYPE : codes[0]
        }));
    }

    private defaultFollowUpType(): string {
        const options = this.typeOptions();
        return options.some((option) => option.value === DEFAULT_FOLLOW_UP_TYPE) ? DEFAULT_FOLLOW_UP_TYPE : options[0]?.value ?? DEFAULT_FOLLOW_UP_TYPE;
    }
}
