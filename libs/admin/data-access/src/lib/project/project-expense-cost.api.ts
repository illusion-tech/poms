import { Injectable, inject } from '@angular/core';
import {
    ActiveInactiveStatus, ConfirmCostStageAttributionMode, ContractApi, CreateExpenseProjectActualCostRecordRequestCostTypeEnum,
    DictionaryApi, DictionaryDomain, ExpenseSourceType, ProjectCostApi, R4FManualAssessmentEvidenceKindEnum
} from '@poms/shared-api-client';
import {
    CommandResultSchema, ConfirmCostStageAttributionRequestSchema, ConfirmCostStageAttributionResultSchema, ContractListSchema,
    CostStageAttributionHistoryViewSchema, CreateExpenseProjectActualCostRecordRequestSchema, CreateExpenseRecordRequestSchema,
    ExpenseRecordDetailViewSchema, ExpenseRecordListSchema, ExpenseRecordSummarySchema, FullProjectDetailViewSchema,
    ProjectActualCostRecordDetailViewSchema, ProjectActualCostRecordListViewSchema,
    type ConfirmCostStageAttributionRequest, type ContractSummary, type CreateExpenseRecordRequest,
    type ExpenseRecordDetailView, type ExpenseRecordSummary, type FullProjectDetailView, type ProjectActualCostRecordDetailView,
    type ProjectActualCostRecordSummary
} from '@poms/shared-contracts';
import { firstValueFrom } from 'rxjs';

export interface ProjectExpenseCostWorkspace {
    categories: { code: string; name: string }[];
    contracts: ContractSummary[];
    expenses: ExpenseRecordSummary[];
    costs: ProjectActualCostRecordSummary[];
}

/** One component-scoped adapter. It accepts only an actual Full branch and server-listed IDs. */
@Injectable()
export class ProjectExpenseCostApi {
    private readonly costs = inject(ProjectCostApi);
    private readonly dictionary = inject(DictionaryApi);
    private readonly contracts = inject(ContractApi);
    private projectId: string | null = null;
    private epoch = 0;
    private expenseIds = new Set<string>();
    private costIds = new Set<string>();
    private contractIds = new Set<string>();
    private categoryCodes = new Set<string>();

    private scope(project: FullProjectDetailView, requireLoaded = true) {
        const full = FullProjectDetailViewSchema.parse(project);
        if (requireLoaded && this.projectId !== full.id) throw new Error('请先读取当前项目的费用与成本范围。');
        return full.id;
    }
    private current(epoch: number, projectId: string) {
        if (epoch !== this.epoch || projectId !== this.projectId) throw new Error('项目范围已变化，请核对原操作的实际结果。');
    }
    async load(project: FullProjectDetailView): Promise<ProjectExpenseCostWorkspace> {
        const projectId = this.scope(project, false), epoch = ++this.epoch;
        this.projectId = null; this.expenseIds.clear(); this.costIds.clear(); this.contractIds.clear(); this.categoryCodes.clear();
        const [dictionary, contracts, expenses, costs] = await Promise.all([
            firstValueFrom(this.dictionary.dictionaryControllerList({ domain: DictionaryDomain.ExpenseCategory, status: ActiveInactiveStatus.Active })),
            firstValueFrom(this.contracts.contractControllerList({ projectId })),
            firstValueFrom(this.costs.projectCostControllerListExpenseRecords({ projectId })),
            firstValueFrom(this.costs.projectCostControllerListProjectActualCostRecords({ projectId }))
        ]);
        const result = {
            categories: dictionary.filter(item => item.domain === 'expense-category' && item.status === 'active').map(item => ({ code: item.code, name: item.name })),
            contracts: ContractListSchema.parse(contracts), expenses: ExpenseRecordListSchema.parse(expenses), costs: ProjectActualCostRecordListViewSchema.parse(costs)
        };
        if (epoch !== this.epoch) throw new Error('项目范围已变化，请重新读取。');
        if ([...result.contracts, ...result.expenses, ...result.costs].some(item => item.projectId !== projectId)) throw new Error('费用或成本来源不属于当前项目。');
        this.projectId = projectId; this.expenseIds = new Set(result.expenses.map(item => item.id)); this.costIds = new Set(result.costs.map(item => item.id));
        this.contractIds = new Set(result.contracts.map(item => item.id)); this.categoryCodes = new Set(result.categories.map(item => item.code));
        return result;
    }
    async createExpense(project: FullProjectDetailView, request: CreateExpenseRecordRequest) {
        const projectId = this.scope(project), epoch = this.epoch, value = CreateExpenseRecordRequestSchema.parse(request);
        if (!this.categoryCodes.has(value.expenseCategory) || (value.contractId && !this.contractIds.has(value.contractId)) || value.sourceType !== 'manual') throw new Error('请选择当前项目的真实合同和有效费用类别。');
        const result = ExpenseRecordSummarySchema.parse(await firstValueFrom(this.costs.projectCostControllerCreateExpenseRecord({ projectId,
            createExpenseRecordRequest: { ...value, sourceType: ExpenseSourceType.Manual } })));
        this.current(epoch, projectId);
        if (result.projectId !== projectId) throw new Error('已返回的费用不属于当前项目，请核对实际结果。');
        this.expenseIds.add(result.id); return result;
    }
    async expense(project: FullProjectDetailView, id: string) {
        const projectId = this.scope(project), epoch = this.epoch; if (!this.expenseIds.has(id)) throw new Error('请从当前服务器费用列表选择。');
        const value = ExpenseRecordDetailViewSchema.parse(await firstValueFrom(this.costs.projectCostControllerGetExpenseRecordDetail({ id })));
        this.current(epoch, projectId);
        if (value.projectId !== projectId) throw new Error('费用项目已变化。'); return value;
    }
    async confirmExpense(project: FullProjectDetailView, expense: ExpenseRecordDetailView) {
        const projectId = this.scope(project), epoch = this.epoch;
        if (!this.expenseIds.has(expense.id) || expense.projectId !== projectId || !expense.allowedActions.includes('confirm') || expense.status !== 'recorded') throw new Error('此费用当前不允许确认，请重新读取。');
        const result = ExpenseRecordSummarySchema.parse(await firstValueFrom(this.costs.projectCostControllerConfirmExpenseRecord({ id: expense.id, confirmExpenseRecordRequest: { expectedVersion: expense.rowVersion } })));
        this.current(epoch, projectId); if (result.id !== expense.id || result.projectId !== projectId) throw new Error('费用确认返回了不同来源，请核对原始结果。'); return result;
    }
    async postExpense(project: FullProjectDetailView, expense: ExpenseRecordDetailView, costDescription: string, evidenceSummary: string) {
        const projectId = this.scope(project), epoch = this.epoch;
        if (!this.expenseIds.has(expense.id) || expense.projectId !== projectId || expense.status !== 'confirmed') throw new Error('请选择当前已确认的真实费用。');
        const request = CreateExpenseProjectActualCostRecordRequestSchema.parse({ costType: 'expense', expenseRecordId: expense.id, expectedSourceVersion: expense.rowVersion, costDescription, evidenceSummary });
        const result = CommandResultSchema.parse(await firstValueFrom(this.costs.projectCostControllerCreateProjectActualCostRecord({ projectId,
            createProjectActualCostRecordRequest: { ...request, costType: CreateExpenseProjectActualCostRecordRequestCostTypeEnum.Expense } })));
        this.current(epoch, projectId);
        this.costIds.add(result.targetId); return result;
    }
    async cost(project: FullProjectDetailView, id: string) {
        const projectId = this.scope(project), epoch = this.epoch; if (!this.costIds.has(id)) throw new Error('请从当前服务器成本列表选择。');
        const value = ProjectActualCostRecordDetailViewSchema.parse(await firstValueFrom(this.costs.projectCostControllerGetProjectActualCostRecordDetail({ id })));
        this.current(epoch, projectId);
        if (value.projectId !== projectId || value.costType !== 'expense' || value.sourceType !== 'expense-record') throw new Error('请选择当前项目的真实费用来源成本。'); return value;
    }
    async stageHistory(project: FullProjectDetailView, cost: ProjectActualCostRecordDetailView) {
        const projectId = this.scope(project), epoch = this.epoch; if (!this.costIds.has(cost.id) || cost.projectId !== projectId) throw new Error('成本范围已变化。');
        const history = CostStageAttributionHistoryViewSchema.parse(await firstValueFrom(this.costs.projectCostControllerListCostStageAttributions({ costRecordId: cost.id })));
        this.current(epoch, projectId);
        if (history.some(item => item.costRecordId !== cost.id)) throw new Error('阶段归属不属于所选真实成本。'); return history;
    }
    async attributeManual(project: FullProjectDetailView, cost: ProjectActualCostRecordDetailView, request: ConfirmCostStageAttributionRequest) {
        const projectId = this.scope(project), epoch = this.epoch, value = ConfirmCostStageAttributionRequestSchema.parse(request);
        if (!this.costIds.has(cost.id) || cost.projectId !== projectId || value.expectedVersion !== cost.rowVersion || value.stageAttributionMode !== 'manual' || value.attributionEvidence.kind !== 'manual') throw new Error('人工阶段判断必须引用当前真实成本版本。');
        const result = ConfirmCostStageAttributionResultSchema.parse(await firstValueFrom(this.costs.projectCostControllerConfirmCostStageAttribution({ id: cost.id,
            confirmCostStageAttributionRequest: { ...value, stageAttributionMode: ConfirmCostStageAttributionMode.Manual,
                attributionEvidence: { ...value.attributionEvidence, kind: R4FManualAssessmentEvidenceKindEnum.Manual } } })));
        this.current(epoch, projectId); if (result.costRecordId !== cost.id) throw new Error('阶段判断返回了不同成本来源，请核对原始结果。'); return result;
    }
}
