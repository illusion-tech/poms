import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormField, disabled, form, maxLength, required } from '@angular/forms/signals';
import { ProjectExpenseCostApi, type ProjectExpenseCostWorkspace } from '@poms/admin-data-access';
import {
    ExpenseRecordStatusLabel, ProjectStageOptions,
    type CostStageAttributionSnapshotSummary, type ExpenseRecordDetailView, type FullProjectDetailView, type ProjectActualCostRecordDetailView, type ProjectActualCostRecordStatus
} from '@poms/shared-contracts';
import { formatSensitiveAmountProjection, sensitiveProjectionDisplayText } from '../../shared/ui/sensitive-visibility';
import { emptyExpenseDraft, expenseMappingState, expenseRequest, manualStageRequest } from './project-expense-cost-facts';

@Component({
    selector: 'app-project-expense-cost-authoring', standalone: true, imports: [FormField], providers: [ProjectExpenseCostApi],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="grid gap-4 rounded-xl border border-surface p-4" aria-label="费用与实际成本办理">
            <h2 class="text-lg font-semibold">费用与实际成本</h2>
            <p>登记真实费用，确认后由服务器从同一来源生产实际成本，再固定有依据的阶段归属。</p>
            @if (busy()) { <p role="status">正在读取或保存费用与成本…</p> }
            @if (error()) { <p role="alert">{{ error() }}</p> }
            @if (notice()) { <p role="status">{{ notice() }}</p> }
            <button type="button" class="justify-self-start rounded border px-3 py-2" [disabled]="busy()" (click)="reload()">重新读取费用、成本与版本</button>
            @if (workspace(); as data) {
                <form class="grid gap-3 rounded border p-3" (submit)="create($event)" aria-label="登记实际费用">
                    <h3 class="font-semibold">登记一笔实际费用</h3>
                    <label>关联范围 <select [formField]="expenseForm.contractId"><option value="">项目级费用（不关联某一合同）</option>@for (contract of data.contracts; track contract.id) { <option [value]="contract.id">{{ contract.contractNo }}</option> }</select></label>
                    <label>费用类别 <select [formField]="expenseForm.category"><option value="">请选择有效费用类别</option>@for (category of data.categories; track category.code) { <option [value]="category.code">{{ category.name }}</option> }</select></label>
                    <label>实际费用说明 <textarea [formField]="expenseForm.description"></textarea></label>
                    <label>实际发生日期 <input type="date" [formField]="expenseForm.businessDate" /></label>
                    <label>实际币种（三位大写代码） <input [formField]="expenseForm.currency" placeholder="例如 CNY" autocomplete="off" /></label>
                    <label>含税金额 <input [formField]="expenseForm.gross" inputmode="decimal" autocomplete="off" /></label>
                    <label>净税金额依据 <select [formField]="expenseForm.taxKnowledge"><option value="">请选择依据状态</option><option value="known">未税金额与税额均有实际依据</option><option value="unknown">净税金额尚未证实</option></select></label>
                    @if (model().taxKnowledge === 'known') {
                        <label>未税金额 <input [formField]="expenseForm.net" inputmode="decimal" autocomplete="off" /></label>
                        <label>税额 <input [formField]="expenseForm.tax" inputmode="decimal" autocomplete="off" /></label>
                        <p>逐项填写原始净税金额；含税额应精确等于未税额加税额。</p>
                    } @else if (model().taxKnowledge === 'unknown') { <p>净额和税额将保留为未知，后续核算仍需补齐真实依据。</p> }
                    <label>费用事实依据 <textarea [formField]="expenseForm.evidenceSummary"></textarea></label>
                    @if (draftError() && model().gross) { <p role="status">{{ draftError() }}</p> }
                    <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy() || !canCreate()">登记本笔实际费用</button>
                    @if (createOutcome() === 'complete') { <button type="button" class="justify-self-start underline" [disabled]="busy()" (click)="newExpense()">开始另一笔费用</button> }
                    @if (createOutcome() === 'uncertain') { <p role="alert">本次登记尚未取得明确结果。请核对实际费用列表与原请求结果，当前表单不会自动再次登记。</p> }
                </form>
                <label>已登记的真实费用
                    <select [value]="selectedExpense()?.id ?? ''" [disabled]="busy()" (change)="chooseExpense($event)"><option value="">请选择本项目费用</option>@for (expense of data.expenses; track expense.id) { <option [value]="expense.id">{{ expense.expenseDate }} · {{ expense.expenseCategory }} · {{ expenseStatus[expense.status] }} · v{{ expense.rowVersion }}</option> }</select>
                </label>
                @if (selectedExpense(); as expense) {
                    <article class="grid gap-2 rounded border p-3" aria-label="当前费用事实">
                        <p>{{ expenseStatus[expense.status] }} · 版本 {{ expense.rowVersion }} · {{ expense.currency }}</p>
                        <p>费用说明：{{ projected(expense.financialProjection.expenseDescription) }}</p>
                        <p>含税 {{ amount(expense.financialProjection.amountIncludingTax, expense.currency) }} · 未税 {{ amount(expense.financialProjection.amountExcludingTax, expense.currency) }} · 税额 {{ amount(expense.financialProjection.taxAmount, expense.currency) }}</p>
                        @if (canConfirm()) { <button type="button" class="justify-self-start rounded border px-3 py-2" [disabled]="busy()" (click)="confirm()">确认所选费用事实</button> }
                        @if (expense.status === 'confirmed') {
                            @if (mappingState() === 'absent') {
                                <form class="grid gap-3" (submit)="post($event)" aria-label="由费用生产实际成本">
                                    <label>实际成本说明 <textarea [formField]="postForm.description"></textarea></label>
                                    <label>成本来源依据 <textarea [formField]="postForm.evidenceSummary"></textarea></label>
                                    <p>只引用此费用的真实ID和当前版本；金额、日期和币种由服务器读取原来源。</p>
                                    <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy() || !postForm().valid()">由所选已确认费用生产实际成本</button>
                                </form>
                            } @else { <p role="status">{{ mappingState() === 'present' ? '该费用已有真实实际成本，请从成本列表核对。' : '来源映射受保护或尚不明确，不能认定该费用尚未入成本。' }}</p> }
                        }
                    </article>
                }
                <label>真实费用来源成本
                    <select [value]="selectedCost()?.id ?? ''" [disabled]="busy()" (change)="chooseCost($event)"><option value="">请选择已生产的实际成本</option>@for (cost of expenseCosts(); track cost.id) { <option [value]="cost.id">{{ cost.recordNo }} · {{ costStatus[cost.recordStatus] }} · v{{ cost.rowVersion }}</option> }</select>
                </label>
                @if (selectedCost(); as cost) {
                    <article class="grid gap-3 rounded border p-3" aria-label="当前实际成本">
                        <p>{{ cost.recordNo }} · {{ costStatus[cost.recordStatus] }} · v{{ cost.rowVersion }}</p>
                        <p>含税 {{ amount(cost.financialProjection?.amountIncludingTax, cost.currency) }} · 未税 {{ amount(cost.financialProjection?.amountExcludingTax, cost.currency) }} · 税额 {{ amount(cost.financialProjection?.taxCostAmount, cost.currency) }}</p>
                        @if (canAttribute()) {
                            <form class="grid gap-3" (submit)="attribute($event)" aria-label="人工评估成本阶段归属">
                                <h3 class="font-semibold">人工评估阶段归属</h3>
                                <p>本次按人工评估固定归属，请说明实际业务事实与本人判断依据。</p>
                                <p>证据发生日来自此成本原始事实：{{ cost.occurredOn }}</p>
                                <label>有依据的归属阶段 <select [formField]="stageForm.stage"><option value="">请选择业务阶段</option>@for (stage of stageOptions; track stage.value) { <option [value]="stage.value">{{ stage.label }}</option> }</select></label>
                                <label>人工判断理由 <textarea [formField]="stageForm.reason"></textarea></label>
                                <label>人工评估事实与依据 <textarea [formField]="stageForm.evidenceSummary"></textarea></label>
                                <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy() || !stageForm().valid()">固定人工评估的成本阶段归属</button>
                            </form>
                        } @else { <p role="status">当前成本已固定阶段、已纳入口径或发生日缺失。请核对历史；受控来源纠正须走重述流程。</p> }
                        @for (entry of stageHistory(); track entry.id) { <p>{{ entry.status }} · {{ entry.attributedStage }} · {{ entry.attributionMode }} · {{ projected(entry.evidenceProjection) }}</p> }
                    </article>
                }
            }
        </section>
    `
})
export class ProjectExpenseCostAuthoring {
    readonly project = input.required<FullProjectDetailView>();
    readonly changed = output<void>();
    private readonly api = inject(ProjectExpenseCostApi);
    readonly busy = signal(false); readonly error = signal(''); readonly notice = signal('');
    readonly workspace = signal<ProjectExpenseCostWorkspace | null>(null);
    readonly selectedExpense = signal<ExpenseRecordDetailView | null>(null);
    readonly selectedCost = signal<ProjectActualCostRecordDetailView | null>(null);
    readonly stageHistory = signal<CostStageAttributionSnapshotSummary[]>([]);
    readonly createOutcome = signal<'none' | 'uncertain' | 'complete'>('none');
    private readonly confirmAttempts = signal<Record<string, 'uncertain' | 'complete'>>({});
    private readonly postAttempts = signal<Record<string, 'uncertain' | 'complete'>>({});
    private readonly stageAttempts = signal<Record<string, 'uncertain' | 'complete'>>({});
    readonly model = signal(emptyExpenseDraft());
    readonly postModel = signal({ description: '', evidenceSummary: '' });
    readonly stageModel = signal({ stage: '', reason: '', evidenceSummary: '' });
    readonly expenseForm = form(this.model, fields => {
        required(fields.category); required(fields.description); maxLength(fields.description, 2000); required(fields.businessDate); required(fields.currency); maxLength(fields.currency, 3);
        required(fields.gross); required(fields.taxKnowledge); required(fields.net, { when: ({ valueOf }) => valueOf(fields.taxKnowledge) === 'known' }); required(fields.tax, { when: ({ valueOf }) => valueOf(fields.taxKnowledge) === 'known' });
        required(fields.evidenceSummary); maxLength(fields.evidenceSummary, 2000);
        disabled(fields, () => this.busy());
    });
    readonly postForm = form(this.postModel, fields => { required(fields.description); maxLength(fields.description, 1000); required(fields.evidenceSummary); maxLength(fields.evidenceSummary, 2000); disabled(fields, () => this.busy()); });
    readonly stageForm = form(this.stageModel, fields => { required(fields.stage); required(fields.reason); maxLength(fields.reason, 2000); required(fields.evidenceSummary); maxLength(fields.evidenceSummary, 2000); disabled(fields, () => this.busy()); });
    readonly stageOptions = ProjectStageOptions;
    readonly expenseStatus = ExpenseRecordStatusLabel;
    readonly costStatus: Record<ProjectActualCostRecordStatus, string> = { draft: '草稿', registered: '已登记', confirmed: '已确认', included: '已纳入成本', voided: '已作废', replaced: '已被替代' };
    readonly amount = formatSensitiveAmountProjection; readonly projected = sensitiveProjectionDisplayText;
    readonly expenseCosts = computed(() => this.workspace()?.costs.filter(cost => cost.costType === 'expense' && cost.sourceType === 'expense-record') ?? []);
    readonly mappingState = computed(() => {
        const expense = this.selectedExpense(); if (!expense) return 'unknown';
        if (this.postAttempts()[expense.id] === 'complete') return 'present';
        if (this.postAttempts()[expense.id] === 'uncertain') return 'unknown';
        return expenseMappingState(expense.id, this.expenseCosts().map(cost => cost.financialProjection?.sourceId));
    });
    readonly canConfirm = computed(() => { const expense = this.selectedExpense(); return !!expense && expense.status === 'recorded' && expense.allowedActions.includes('confirm') && !this.confirmAttempts()[expense.id]; });
    readonly draftError = computed(() => { try { this.request(); return ''; } catch (error) { return error instanceof Error ? error.message : '请核对实际费用。'; } });
    readonly canCreate = computed(() => !!this.workspace() && this.createOutcome() === 'none' && !this.draftError() && this.expenseForm().valid());
    readonly canAttribute = computed(() => { const cost = this.selectedCost(); return !!cost && !this.stageAttempts()[cost.id] && ['registered', 'confirmed'].includes(cost.recordStatus) && !cost.isIncludedInProjectCost && !cost.stageDerivedFromId && !!cost.occurredOn && !this.stageHistory().some(item => item.status === 'active'); });
    private epoch = 0;
    constructor() { effect(() => { const project = this.project(); void this.load(project); }); }
    private request() { const data = this.workspace(); if (!data) throw new Error('请先读取当前项目费用依据。'); return expenseRequest(this.model(), data.categories.map(item => item.code), data.contracts.map(item => item.id)); }
    reload() { void this.load(this.project()); }
    private async load(project: FullProjectDetailView) {
        const epoch = ++this.epoch; this.busy.set(true); this.error.set(''); this.workspace.set(null); this.selectedExpense.set(null); this.selectedCost.set(null); this.stageHistory.set([]);
        try { const data = await this.api.load(project); if (epoch === this.epoch) this.workspace.set(data); }
        catch (error) { if (epoch === this.epoch) this.error.set(this.errorText(error)); }
        finally { if (epoch === this.epoch) this.busy.set(false); }
    }
    private async refresh(expenseId?: string, costId?: string) {
        const project = this.project(), data = await this.api.load(project); this.workspace.set(data);
        if (expenseId) this.selectedExpense.set(await this.api.expense(project, expenseId));
        if (costId) { const cost = await this.api.cost(project, costId); this.selectedCost.set(cost); this.stageHistory.set(await this.api.stageHistory(project, cost)); }
    }
    private async perform(action: () => Promise<void>) {
        if (this.busy()) return; this.busy.set(true); this.error.set(''); this.notice.set('');
        try { await action(); } catch (error) { this.error.set(this.errorText(error)); } finally { this.busy.set(false); }
    }
    async create(event: Event) {
        event.preventDefault(); if (!this.canCreate()) return; const request = this.request();
        await this.perform(async () => { this.createOutcome.set('uncertain'); const expense = await this.api.createExpense(this.project(), request); this.createOutcome.set('complete'); this.notice.set('本笔真实费用已登记。'); await this.refresh(expense.id); });
    }
    newExpense() { if (this.busy() || this.createOutcome() !== 'complete') return; this.model.set(emptyExpenseDraft()); this.createOutcome.set('none'); this.notice.set(''); }
    async chooseExpense(event: Event) { const target = event.target; if (!(target instanceof HTMLSelectElement)) return; const id = target.value; this.selectedExpense.set(null); if (!id) return; await this.perform(async () => this.selectedExpense.set(await this.api.expense(this.project(), id))); }
    async chooseCost(event: Event) { const target = event.target; if (!(target instanceof HTMLSelectElement)) return; const id = target.value; this.selectedCost.set(null); this.stageHistory.set([]); if (!id) return; await this.perform(async () => { const cost = await this.api.cost(this.project(), id); this.selectedCost.set(cost); this.stageHistory.set(await this.api.stageHistory(this.project(), cost)); }); }
    async confirm() { const expense = this.selectedExpense(); if (!expense || !this.canConfirm()) return; await this.perform(async () => { this.confirmAttempts.update(value => ({ ...value, [expense.id]: 'uncertain' })); await this.api.confirmExpense(this.project(), expense); this.confirmAttempts.update(value => ({ ...value, [expense.id]: 'complete' })); this.notice.set('已确认此费用原始事实。'); await this.refresh(expense.id); }); }
    async post(event: Event) { event.preventDefault(); const expense = this.selectedExpense(); if (!expense || expense.status !== 'confirmed' || this.mappingState() !== 'absent' || !this.postForm().valid()) return; await this.perform(async () => { this.postAttempts.update(value => ({ ...value, [expense.id]: 'uncertain' })); const input = this.postModel(), result = await this.api.postExpense(this.project(), expense, input.description, input.evidenceSummary); this.postAttempts.update(value => ({ ...value, [expense.id]: 'complete' })); this.notice.set('服务器已从真实费用生产实际成本。'); await this.refresh(expense.id, result.targetId); this.changed.emit(); }); }
    async attribute(event: Event) { event.preventDefault(); const cost = this.selectedCost(); if (!cost || !this.canAttribute() || !this.stageForm().valid()) return; const input = this.stageModel(); const request = manualStageRequest(cost, input.stage, input.reason, input.evidenceSummary); await this.perform(async () => { this.stageAttempts.update(value => ({ ...value, [cost.id]: 'uncertain' })); await this.api.attributeManual(this.project(), cost, request); this.stageAttempts.update(value => ({ ...value, [cost.id]: 'complete' })); this.notice.set('已固定本次人工判断及真实成本版本。'); await this.refresh(this.selectedExpense()?.id, cost.id); this.changed.emit(); }); }
    private errorText(error: unknown) { if (error instanceof HttpErrorResponse) { if (error.status === 409) return '来源或版本已变化，请重新读取后核对；本页不会自动重试。'; if (error.status === 403 || error.status === 404) return '当前责任范围或权限不允许此操作，请重新核对项目。'; if (error.status === 0) return '尚未取得服务器明确结果，请核对实际记录后处理。'; } return error instanceof Error ? error.message : '费用办理未完成，请核对原始结果。'; }
}
