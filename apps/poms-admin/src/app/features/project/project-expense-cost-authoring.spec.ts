import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ContractApi, DictionaryApi, ProjectCostApi, ProjectExpenseCostApi, type ProjectExpenseCostWorkspace } from '@poms/admin-data-access';
import { CommandResultSchema, DictionaryItemSummarySchema, ExpenseRecordDetailViewSchema, ExpenseRecordSummarySchema, FullProjectDetailViewSchema, type ExpenseRecordSummary } from '@poms/shared-contracts';
import { of, Subject } from 'rxjs';
import { ProjectExpenseCostAuthoring } from './project-expense-cost-authoring';
import { expenseRequest } from './project-expense-cost-facts';

const id = '00000000-0000-4000-8000-000000001001', expenseId = '00000000-0000-4000-8000-000000002001';
const instant = '2026-11-08T00:00:00.000Z';
function project() {
    return FullProjectDetailViewSchema.parse({ scopeKind: 'full-project', projectRowVersion: 3, currentStageRecordId: null, executionAdmissionContext: null,
        id, projectNo: 'UNIT-EF-17', projectName: '合成表单单元项目', sourceLeadId: null, customerId: null, customerName: null, customerProjectNo: null,
        status: 'active', currentStage: 'execution', ownerOrgId: '00000000-0000-4000-8000-000000003001', ownerUserId: '00000000-0000-4000-8000-000000004001',
        plannedSignAt: null, closedAt: null, closedReason: null, rowVersion: 3, createdAt: instant, createdBy: null, updatedAt: instant, updatedBy: null,
        ownerName: '单元经办人', ownerOrgName: '单元组织', sourceLeadSummary: null,
        stageSummary: { currentStage: 'execution', status: 'active', plannedSignAt: null, closedAt: null, closedReason: null, blockingReasons: [] },
        currentBidSummary: { tenderNo: null, bidPackageNo: null, bidProcessId: null, bidStatus: 'not_configured', resultStatus: null, summary: null },
        currentContractSummary: { activeContractCount: 0, latestContractId: null, latestContractNo: null, latestContractStatus: null,
            signedAmountProjection: { fieldPackageKey: 'contract-finance', mode: 'masked', value: null, displayText: '已隐藏', reasonCode: 'missing-sensitive-read-permission' },
            currencyCode: null, signedAt: null, currentSnapshotId: null },
        currentApprovalSummary: { summarySnapshotId: null, summaryPackageKey: null, projectionLevel: null, exportPolicy: null, generatedAt: null },
        currentConfirmationSummary: { confirmationRecordId: null, status: 'not_configured', requiredCount: 0, confirmedCount: 0, pendingCount: 0, confirmedAt: null },
        summarySnapshotId: null, projectionLevel: null, exportPolicy: null, allowedActions: [], generatedAt: instant });
}
function expense(masked = false) {
    const projection = (value: string) => ({ fieldPackageKey: 'operating-finance', mode: masked ? 'masked' : 'full', value: masked ? null : value,
        displayText: masked ? '经营敏感字段已隐藏' : value || '—', reasonCode: masked ? 'missing-sensitive-read-permission' : 'allowed' });
    return ExpenseRecordSummarySchema.parse({ id: expenseId, projectId: id, contractId: null, expenseCategory: 'travel', expenseDescription: null,
        expenseDate: '2026-11-08', currency: 'CNY', amountIncludingTax: null, taxAmount: null, amountExcludingTax: null, sourceType: 'manual', status: 'recorded',
        evidenceSummary: null, attachmentCount: 0, confirmedAt: null, confirmedBy: null, voidedAt: null, voidReason: null, rowVersion: 1, createdAt: instant, updatedAt: instant,
        financialProjection: { amountIncludingTax: projection('9999999999999999.99'), taxAmount: projection('0.00'), amountExcludingTax: projection('9999999999999999.99'),
            expenseDescription: projection('仅授权projection可见的说明'), evidenceSummary: projection('原始费用依据'), voidReason: projection('') } });
}
const draft = () => ({ contractId: '', category: 'travel', description: '本人登记的实际费用', businessDate: '2026-11-08', currency: 'CNY',
    gross: '9999999999999999.99', taxKnowledge: 'known', net: '9999999999999999.99', tax: '0.00', evidenceSummary: '本单元核对字符串金额的表单提交，不是业务验收。' });

describe('ProjectExpenseCostAuthoring', () => {
    let data: ProjectExpenseCostWorkspace;
    const api = { load: jest.fn(), createExpense: jest.fn(), expense: jest.fn(), confirmExpense: jest.fn(), postExpense: jest.fn(), cost: jest.fn(), stageHistory: jest.fn(), attributeManual: jest.fn() };
    beforeEach(async () => {
        jest.resetAllMocks(); data = { categories: [{ code: 'travel', name: '差旅费用' }], contracts: [], expenses: [], costs: [] };
        api.load.mockImplementation(async () => data); api.createExpense.mockImplementation(async () => { const value = expense(); data = { ...data, expenses: [value] }; return value; });
        api.expense.mockImplementation(async () => ExpenseRecordDetailViewSchema.parse({ ...expense(), allowedActions: ['confirm', 'update', 'void'] }));
        await TestBed.configureTestingModule({ imports: [ProjectExpenseCostAuthoring] }).overrideComponent(ProjectExpenseCostAuthoring, { set: { providers: [{ provide: ProjectExpenseCostApi, useValue: api }] } }).compileComponents();
    });
    async function createComponent() { const fixture = TestBed.createComponent(ProjectExpenseCostAuthoring); fixture.componentRef.setInput('project', project()); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); return fixture; }
    it('starts with no inferred currency/date/amounts and requires actual category options', async () => {
        const fixture = await createComponent(), component = fixture.componentInstance;
        expect(component.model().currency).toBe(''); expect(component.model().businessDate).toBe(''); expect(component.canCreate()).toBe(false);
        component.model.set({ ...draft(), category: 'invented' }); fixture.detectChanges(); expect(component.canCreate()).toBe(false); expect(api.createExpense).not.toHaveBeenCalled();
    });
    it('submits MAX as exact decimal strings and never repeats a successful creation after a failed refresh', async () => {
        const fixture = await createComponent(), component = fixture.componentInstance; component.model.set(draft()); fixture.detectChanges(); await fixture.whenStable();
        api.load.mockRejectedValueOnce(new Error('读取列表失败，原登记已返回真实ID'));
        await component.create(new Event('submit')); await component.create(new Event('submit'));
        expect(api.createExpense).toHaveBeenCalledTimes(1);
        expect(api.createExpense.mock.calls[0][1]).toEqual({ contractId: null, expenseCategory: 'travel', expenseDescription: draft().description, expenseDate: '2026-11-08',
            currency: 'CNY', amountIncludingTax: '9999999999999999.99', amountExcludingTax: '9999999999999999.99', taxAmount: '0.00', sourceType: 'manual', evidenceSummary: draft().evidenceSummary, attachmentCount: 0 });
        expect(component.createOutcome()).toBe('complete'); expect(component.error()).toContain('读取列表失败');
    });
    it('keeps a missing ACK uncertain and does not automatically repeat the POST after a list reload', async () => {
        const fixture = await createComponent(), component = fixture.componentInstance; component.model.set(draft()); fixture.detectChanges(); await fixture.whenStable();
        api.createExpense.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 })); await component.create(new Event('submit'));
        component.reload(); await fixture.whenStable(); fixture.detectChanges(); await component.create(new Event('submit'));
        expect(api.createExpense).toHaveBeenCalledTimes(1); expect(component.createOutcome()).toBe('uncertain'); expect(component.canCreate()).toBe(false);
    });
    it('renders masked server projections without using literal-null compatibility fields', async () => {
        const fixture = await createComponent(), component = fixture.componentInstance;
        component.selectedExpense.set(ExpenseRecordDetailViewSchema.parse({ ...expense(true), allowedActions: [] })); fixture.detectChanges();
        const text = fixture.nativeElement.textContent; expect(text).toContain('经营敏感字段已隐藏'); expect(text).not.toContain('9,999,999,999,999,999.99'); expect(text).not.toContain('仅授权projection可见的说明');
    });
    it('keeps the actual loaded expense version and does not reconfirm after an acknowledged write with a failed refresh', async () => {
        const fixture = await createComponent(), component = fixture.componentInstance;
        const selected = ExpenseRecordDetailViewSchema.parse({ ...expense(), rowVersion: 7, allowedActions: ['confirm'] }); component.selectedExpense.set(selected);
        api.confirmExpense.mockResolvedValueOnce({ ...expense(), status: 'confirmed', rowVersion: 8 }); api.load.mockRejectedValueOnce(new Error('确认之后读取失败'));
        await component.confirm(); await component.confirm();
        expect(api.confirmExpense).toHaveBeenCalledTimes(1); expect(api.confirmExpense.mock.calls[0][1].rowVersion).toBe(7); expect(component.canConfirm()).toBe(false);
    });
    it('does not re-post a confirmed expense after an uncertain actual-cost response', async () => {
        const fixture = await createComponent(), component = fixture.componentInstance;
        component.selectedExpense.set(ExpenseRecordDetailViewSchema.parse({ ...expense(), status: 'confirmed', rowVersion: 8, allowedActions: ['void'] }));
        component.postModel.set({ description: '按真实已确认费用生产成本', evidenceSummary: '由服务器读取费用净税金额及发生日' }); fixture.detectChanges(); await fixture.whenStable();
        api.postExpense.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 })); await component.post(new Event('submit')); await component.post(new Event('submit'));
        expect(api.postExpense).toHaveBeenCalledTimes(1); expect(component.mappingState()).toBe('unknown');
    });
});

describe('ProjectExpenseCostApi with real generated-client method names', () => {
    const sdk = { projectCostControllerListExpenseRecords: jest.fn(), projectCostControllerListProjectActualCostRecords: jest.fn(), projectCostControllerCreateExpenseRecord: jest.fn(),
        projectCostControllerGetExpenseRecordDetail: jest.fn(), projectCostControllerConfirmExpenseRecord: jest.fn(), projectCostControllerCreateProjectActualCostRecord: jest.fn() };
    beforeEach(() => {
        jest.resetAllMocks(); sdk.projectCostControllerListExpenseRecords.mockReturnValue(of([])); sdk.projectCostControllerListProjectActualCostRecords.mockReturnValue(of([]));
        const category = DictionaryItemSummarySchema.parse({ id: '00000000-0000-4000-8000-000000005001', domain: 'expense-category', code: 'travel', name: '差旅费用',
            description: null, status: 'active', sortOrder: 1, isSystem: false, usageCount: 0, rowVersion: 1, createdAt: instant, createdBy: null, updatedAt: instant, updatedBy: null });
        TestBed.configureTestingModule({ providers: [ProjectExpenseCostApi, { provide: ProjectCostApi, useValue: sdk },
            { provide: DictionaryApi, useValue: { dictionaryControllerList: () => of([category]) } }, { provide: ContractApi, useValue: { contractControllerList: () => of([]) } }] });
    });
    it('does not issue financial detail GET for an ID absent from the actual project list', async () => {
        const api = TestBed.inject(ProjectExpenseCostApi); await api.load(project());
        await expect(api.expense(project(), expenseId)).rejects.toThrow('服务器费用列表'); expect(sdk.projectCostControllerGetExpenseRecordDetail).not.toHaveBeenCalled();
    });
    it('does not let a late create ACK authorize its source ID in another project', async () => {
        const api = TestBed.inject(ProjectExpenseCostApi), response = new Subject<ExpenseRecordSummary>();
        await api.load(project()); sdk.projectCostControllerCreateExpenseRecord.mockReturnValue(response);
        const creating = api.createExpense(project(), expenseRequest(draft(), ['travel'], []));
        const other = FullProjectDetailViewSchema.parse({ ...project(), id: '00000000-0000-4000-8000-000000001002' }); await api.load(other);
        response.next(expense()); response.complete(); await expect(creating).rejects.toThrow('项目范围已变化');
        await expect(api.expense(other, expenseId)).rejects.toThrow('服务器费用列表'); expect(sdk.projectCostControllerGetExpenseRecordDetail).not.toHaveBeenCalled();
    });
    it('passes real expense CAS and source-only cost input to the exact generated methods', async () => {
        const api = TestBed.inject(ProjectExpenseCostApi); sdk.projectCostControllerListExpenseRecords.mockReturnValue(of([expense()])); await api.load(project());
        const selected = ExpenseRecordDetailViewSchema.parse({ ...expense(), rowVersion: 7, allowedActions: ['confirm'] });
        sdk.projectCostControllerConfirmExpenseRecord.mockReturnValue(of(ExpenseRecordSummarySchema.parse({ ...expense(), status: 'confirmed', rowVersion: 8 })));
        await api.confirmExpense(project(), selected); expect(sdk.projectCostControllerConfirmExpenseRecord).toHaveBeenCalledWith({ id: expenseId, confirmExpenseRecordRequest: { expectedVersion: 7 } });
        sdk.projectCostControllerCreateProjectActualCostRecord.mockReturnValue(of(CommandResultSchema.parse({ targetId: '00000000-0000-4000-8000-000000006001', targetType: 'ProjectActualCostRecord',
            resultStatus: 'success', businessStatusAfter: 'registered', approvalRecordId: null, confirmationRecordId: null, todoItemIds: [] })));
        const confirmed = ExpenseRecordDetailViewSchema.parse({ ...selected, status: 'confirmed', rowVersion: 8, allowedActions: ['void'] });
        await api.postExpense(project(), confirmed, '费用转成本', '只引用真实已确认来源');
        expect(sdk.projectCostControllerCreateProjectActualCostRecord).toHaveBeenCalledWith({ projectId: id, createProjectActualCostRecordRequest: {
            costType: 'expense', expenseRecordId: expenseId, expectedSourceVersion: 8, costDescription: '费用转成本', evidenceSummary: '只引用真实已确认来源' } });
    });
});
