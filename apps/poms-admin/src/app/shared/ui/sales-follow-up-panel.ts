import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SalesFollowUpStore, type SalesFollowUpOutcome, type SalesFollowUpRecordSummary, type SalesFollowUpType } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { WorkspaceFeedback } from './workspace-feedback';

interface SalesFollowUpOption<T extends string> {
    label: string;
    value: T;
}

interface SalesFollowUpForm {
    followUpType: SalesFollowUpType;
    occurredAt: Date | null;
    summary: string;
    detail: string;
    outcome: SalesFollowUpOutcome;
    nextFollowUpAt: Date | null;
}

const SALES_FOLLOW_UP_TYPE_LABELS: Record<SalesFollowUpType, string> = {
    phone: '电话',
    meeting: '会议',
    wechat: '微信',
    email: '邮件',
    onsite: '现场拜访',
    other: '其他'
};

const SALES_FOLLOW_UP_OUTCOME_LABELS: Record<SalesFollowUpOutcome, string> = {
    progress: '有进展',
    'waiting-customer': '待客户反馈',
    'risk-discovered': '发现风险',
    deferred: '暂缓',
    'close-recommended': '建议关闭',
    'no-response': '暂无回应',
    other: '其他'
};

const DEFAULT_FOLLOW_UP_TYPE = 'meeting' as SalesFollowUpType;
const DEFAULT_FOLLOW_UP_OUTCOME = 'progress' as SalesFollowUpOutcome;

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
    imports: [CommonModule, FormsModule, ButtonModule, DatePickerModule, DialogModule, InputTextModule, SelectModule, TagModule, TextareaModule, WorkspaceFeedback],
    providers: [SalesFollowUpStore],
    template: `
        <section class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 class="m-0 text-base font-semibold text-surface-950 dark:text-surface-0">{{ title }}</h3>
                    <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">{{ description }}</p>
                </div>
                <div class="flex shrink-0 flex-wrap gap-2">
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
                        <article class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div class="min-w-0">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="text-sm font-semibold text-surface-950 dark:text-surface-0">{{ record.summary }}</span>
                                        <p-tag [value]="getOutcomeName(record.outcome)" severity="secondary" styleClass="rounded-[6px]" />
                                    </div>
                                    <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-500 dark:text-surface-400">
                                        <span>{{ record.occurredAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                        <span>{{ getTypeName(record.followUpType) }}</span>
                                        <span>{{ contextLabel(record) }}</span>
                                        <span>{{ record.ownerName || '未指定销售' }}</span>
                                    </div>
                                </div>
                                @if (record.nextFollowUpAt) {
                                    <div class="shrink-0 rounded-[6px] bg-primary-50 px-2 py-1 text-xs text-primary-700 dark:bg-primary-950/40 dark:text-primary-200">
                                        下次 {{ record.nextFollowUpAt | date: 'MM-dd HH:mm' }}
                                    </div>
                                }
                            </div>
                            @if (record.detail) {
                                <p class="mt-2 whitespace-pre-line text-sm leading-6 text-surface-600 dark:text-surface-300">{{ record.detail }}</p>
                            }
                        </article>
                    }
                } @else if (canReadContext()) {
                    <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无销售跟进记录。</div>
                }
            </div>
        </section>

        <p-dialog [(visible)]="dialogVisible" [modal]="true" appendTo="body" header="记录销售跟进" [style]="{ width: '36rem' }" styleClass="p-fluid" (onHide)="resetDialog()">
            <div class="flex flex-col gap-4 py-2">
                <app-workspace-feedback severity="info" summary="跟进上下文" [detail]="createContextDetail" />

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
                            [options]="typeOptions"
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
                    <p-button label="保存跟进" [loading]="store.saving()" [disabled]="!isFormValid()" styleClass="rounded-md!" (onClick)="createFollowUp()" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class SalesFollowUpPanel implements OnChanges {
    readonly store = inject(SalesFollowUpStore);

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

    dialogVisible = false;

    readonly typeOptions: SalesFollowUpOption<SalesFollowUpType>[] = Object.entries(SALES_FOLLOW_UP_TYPE_LABELS).map(([value, label]) => ({
        label,
        value: value as SalesFollowUpType
    }));

    readonly outcomeOptions: SalesFollowUpOption<SalesFollowUpOutcome>[] = Object.entries(SALES_FOLLOW_UP_OUTCOME_LABELS).map(([value, label]) => ({
        label,
        value: value as SalesFollowUpOutcome
    }));

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
                projectId: this.projectId ?? undefined
            });
        } catch {
            this.error.set('销售跟进记录没有读取成功，请稍后重试。');
        }
    }

    showDialog(): void {
        if (!this.canWrite || !this.canCreateContext()) {
            return;
        }

        this.form.set(this.defaultForm());
        this.attempted.set(false);
        this.error.set(null);
        this.dialogVisible = true;
    }

    resetDialog(): void {
        this.attempted.set(false);
        this.error.set(null);
    }

    updateType(value: string | null | undefined): void {
        this.form.update((form) => ({
            ...form,
            followUpType: (value ?? DEFAULT_FOLLOW_UP_TYPE) as SalesFollowUpType
        }));
        this.error.set(null);
    }

    updateOutcome(value: string | null | undefined): void {
        this.form.update((form) => ({
            ...form,
            outcome: (value ?? DEFAULT_FOLLOW_UP_OUTCOME) as SalesFollowUpOutcome
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

    async createFollowUp(): Promise<void> {
        this.attempted.set(true);
        const form = this.form();

        if (!this.canWrite || !this.canCreateContext() || !this.isFormValid() || !form.occurredAt || !this.customerId) {
            return;
        }

        const createProjectId = this.projectId ?? null;
        const createLeadId = createProjectId ? null : this.leadId;

        try {
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
            await this.reload();
            this.dialogVisible = false;
        } catch {
            this.error.set('请确认客户、线索或项目仍然有效，或稍后重试。');
        }
    }

    isFormValid(): boolean {
        const form = this.form();
        return Boolean(form.occurredAt && form.summary.trim());
    }

    canReadContext(): boolean {
        return Boolean(this.customerId || this.leadId || this.projectId);
    }

    canCreateContext(): boolean {
        return Boolean(this.customerId);
    }

    getTypeName(type: SalesFollowUpType | string): string {
        return SALES_FOLLOW_UP_TYPE_LABELS[type as SalesFollowUpType] ?? type;
    }

    getOutcomeName(outcome: SalesFollowUpOutcome | string): string {
        return SALES_FOLLOW_UP_OUTCOME_LABELS[outcome as SalesFollowUpOutcome] ?? outcome;
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
            occurredAt: new Date()
        };
    }

    private optionalText(value: string): string | null {
        const normalized = value.trim();
        return normalized.length ? normalized : null;
    }
}
