import {
    ConfirmCostStageAttributionRequestSchema, CreateExpenseRecordRequestSchema, ProjectStageSchema,
    type CreateExpenseRecordRequest, type ProjectActualCostRecordDetailView
} from '@poms/shared-contracts';

export interface ProjectExpenseDraft {
    contractId: string; category: string; description: string; businessDate: string; currency: string;
    gross: string; taxKnowledge: string; net: string; tax: string; evidenceSummary: string;
}
export const emptyExpenseDraft = (): ProjectExpenseDraft => ({ contractId: '', category: '', description: '', businessDate: '', currency: '', gross: '', taxKnowledge: '', net: '', tax: '', evidenceSummary: '' });

/** A protected or unknown source identity cannot prove that an expense is unmapped. */
export function expenseMappingState(expenseId: string, projections: readonly ({ mode: string; value: string | null } | null | undefined)[]): 'present' | 'unknown' | 'absent' {
    if (projections.some(source => source?.mode === 'full' && source.value === expenseId)) return 'present';
    if (projections.some(source => source?.mode !== 'full' || typeof source.value !== 'string')) return 'unknown';
    return 'absent';
}

function cents(value: string): bigint {
    const text = value.trim(); if (text.length > 64 || !/^[0-9]+(?:\.[0-9]{1,2})?$/.test(text)) throw new Error('金额请填写最多两位小数的非负十进制文字。');
    const [whole, fraction = ''] = text.split('.'), amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
    if (amount > 999999999999999999n) throw new Error('金额超过当前业务允许范围。'); return amount;
}
export function expenseRequest(draft: ProjectExpenseDraft, categoryCodes: readonly string[], contractIds: readonly string[]): CreateExpenseRecordRequest {
    if (!categoryCodes.includes(draft.category) || (draft.contractId && !contractIds.includes(draft.contractId))) throw new Error('请选择服务器返回的费用类别和当前项目合同。');
    const currency = draft.currency.trim(); if (!/^[A-Z]{3}$/.test(currency)) throw new Error('请明确填写三个大写字母的实际币种。');
    const gross = cents(draft.gross); if (gross === 0n) throw new Error('含税金额必须大于零。');
    if (!['known', 'unknown'].includes(draft.taxKnowledge)) throw new Error('请明确净税金额是否已有实际依据。');
    if (draft.taxKnowledge === 'known' && gross !== cents(draft.net) + cents(draft.tax)) throw new Error('含税金额应精确等于未税金额加税额。');
    return CreateExpenseRecordRequestSchema.parse({ contractId: draft.contractId || null, expenseCategory: draft.category,
        expenseDescription: draft.description, expenseDate: draft.businessDate, currency, amountIncludingTax: draft.gross.trim(),
        amountExcludingTax: draft.taxKnowledge === 'known' ? draft.net.trim() : null, taxAmount: draft.taxKnowledge === 'known' ? draft.tax.trim() : null,
        sourceType: 'manual', evidenceSummary: draft.evidenceSummary, attachmentCount: 0 });
}
export function manualStageRequest(cost: Pick<ProjectActualCostRecordDetailView, 'rowVersion' | 'recordStatus' | 'isIncludedInProjectCost' | 'stageDerivedFromId' | 'occurredOn'>, stage: string, reason: string, evidenceSummary: string) {
    if (!['registered', 'confirmed'].includes(cost.recordStatus) || cost.isIncludedInProjectCost || cost.stageDerivedFromId) throw new Error('已纳入或已固定阶段的成本须使用受控纠正流程。');
    if (!cost.occurredOn) throw new Error('真实成本发生日缺失，不能补造阶段证据日期。');
    return ConfirmCostStageAttributionRequestSchema.parse({ stageAttributionMode: 'manual', attributedStage: ProjectStageSchema.parse(stage),
        expectedVersion: cost.rowVersion, attributionSummary: reason, attributionEvidence: { kind: 'manual', businessDate: cost.occurredOn,
            reason, evidenceSummary, attachmentIds: [] } });
}
