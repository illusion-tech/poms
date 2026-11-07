import type { ProjectActualCostRecordDetailView } from '@poms/shared-contracts';
import { emptyExpenseDraft, expenseMappingState, expenseRequest, manualStageRequest, type ProjectExpenseDraft } from './project-expense-cost-facts';

const contractId = '00000000-0000-4000-8000-000000001001';
const draft = (): ProjectExpenseDraft => ({ contractId, category: 'travel', description: '真实费用事实说明', businessDate: '2026-11-08', currency: 'CNY',
    gross: '113.00', taxKnowledge: 'known', net: '100.00', tax: '13.00', evidenceSummary: '经办人依据实际票据和项目业务说明登记。' });
const request = (value = draft()) => expenseRequest(value, ['travel'], [contractId]);
const cost = (): Pick<ProjectActualCostRecordDetailView, 'rowVersion' | 'recordStatus' | 'isIncludedInProjectCost' | 'stageDerivedFromId' | 'occurredOn'> => ({
    rowVersion: 7, recordStatus: 'registered', isIncludedInProjectCost: false, stageDerivedFromId: null, occurredOn: '2026-11-08'
});

describe('费用与阶段来源的精确表单输入', () => {
    it('does not infer currency, date, tax or contract in a new expense', () => {
        expect(emptyExpenseDraft()).toEqual({ contractId: '', category: '', description: '', businessDate: '', currency: '', gross: '', taxKnowledge: '', net: '', tax: '', evidenceSummary: '' });
        expect(() => request({ ...draft(), currency: '' })).toThrow('币种');
    });
    it('preserves MAX in JSON as three decimal strings without a tax rate', () => {
        const result = request({ ...draft(), gross: '9999999999999999.99', net: '9999999999999999.99', tax: '0.00' });
        expect(JSON.stringify(result)).toContain('"amountIncludingTax":"9999999999999999.99"');
        expect(result.taxAmount).toBe('0.00'); expect(result.amountExcludingTax).toBe('9999999999999999.99'); expect(result).not.toHaveProperty('taxRate');
    });
    it('accepts an exact cent split near MAX and a project-level null contract', () => {
        expect(request({ ...draft(), contractId: '', gross: '9999999999999999.99', net: '9999999999999999.98', tax: '0.01' }).contractId).toBeNull();
    });
    it('keeps explicitly unknown net/tax as null and distinguishes known zero tax', () => {
        const unknown = request({ ...draft(), taxKnowledge: 'unknown', net: '', tax: '' }); expect(unknown.amountExcludingTax).toBeNull(); expect(unknown.taxAmount).toBeNull();
        expect(request({ ...draft(), gross: '1.00', net: '1.00', tax: '0.00' }).taxAmount).toBe('0.00');
        expect(() => request({ ...draft(), taxKnowledge: '' })).toThrow('依据');
    });
    it.each(['10000000000000000.00', '-1.00', '1e3', '0.001', '1.2340'])('rejects unsupported expense amount %s', gross => {
        expect(() => request({ ...draft(), gross, net: gross, tax: '0.00' })).toThrow();
    });
    it('does not round a one-cent mismatch or submit a zero gross amount', () => {
        expect(() => request({ ...draft(), tax: '12.99' })).toThrow('精确');
        expect(() => request({ ...draft(), gross: '0.00', net: '0.00', tax: '0.00' })).toThrow('大于零');
    });
    it('uses only actual category and same-project contract options', () => {
        expect(() => request({ ...draft(), category: 'invented' })).toThrow('服务器');
        expect(() => request({ ...draft(), contractId: '00000000-0000-4000-8000-000000001002' })).toThrow('服务器');
    });
    it('keeps unknown mapping blocked while a full matching source proves present', () => {
        expect(expenseMappingState('expense', [undefined])).toBe('unknown');
        expect(expenseMappingState('expense', [{ mode: 'masked', value: null }])).toBe('unknown');
        expect(expenseMappingState('expense', [{ mode: 'full', value: null }])).toBe('unknown');
        expect(expenseMappingState('expense', [{ mode: 'full', value: 'expense' }, { mode: 'masked', value: null }])).toBe('present');
        expect(expenseMappingState('expense', [{ mode: 'full', value: 'other-expense' }])).toBe('absent');
        expect(expenseMappingState('expense', [])).toBe('absent');
    });
    it('freezes manual evidence with the actual cost date and CAS, without invented stage refs', () => {
        const result = manualStageRequest(cost(), 'execution', '经办人核对实际交付成本归属。', '本判断采用本人实际业务记录，不认证历史阶段台账。');
        expect(result.expectedVersion).toBe(7); expect(result.stageAttributionMode).toBe('manual');
        expect(result.attributionEvidence).toEqual({ kind: 'manual', businessDate: '2026-11-08', reason: '经办人核对实际交付成本归属。', evidenceSummary: '本判断采用本人实际业务记录，不认证历史阶段台账。', attachmentIds: [] });
        expect(result.attributionEvidence).not.toHaveProperty('sourceId'); expect(result).not.toHaveProperty('lockedBySnapshotId');
    });
    it('does not manufacture a missing date, unknown stage, fixed attribution or consumed-cost correction', () => {
        for (const value of [{ ...cost(), occurredOn: null }, { ...cost(), isIncludedInProjectCost: true }, { ...cost(), stageDerivedFromId: 'actual-old-stage' }]) expect(() => manualStageRequest(value, 'execution', '理由', '事实')).toThrow();
        expect(() => manualStageRequest(cost(), 'invented', '理由', '事实')).toThrow();
    });
});
