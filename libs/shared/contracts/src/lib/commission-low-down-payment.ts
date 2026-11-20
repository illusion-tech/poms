import { z } from 'zod';
import { ProjectReceiptJudgmentModeSchema, SensitiveStringFieldProjectionSchema } from './shared-contracts';

export const COMMISSION_LOW_DOWN_PAYMENT_DECISIONS = ['raise-first-cap', 'release-standard'] as const;
export const CommissionLowDownPaymentDecisionSchema = z.enum(COMMISSION_LOW_DOWN_PAYMENT_DECISIONS).meta({ id: 'CommissionLowDownPaymentDecision' });
export type CommissionLowDownPaymentDecision = z.infer<typeof CommissionLowDownPaymentDecisionSchema>;

export const ApproveCommissionLowDownPaymentReleaseRequestSchema = z.object({
    freezeVersionId: z.uuid(),
    expectedFreezeVersion: z.number().int().positive().max(2147483647),
    contractIds: z.array(z.uuid()).min(1).refine(ids => new Set(ids).size === ids.length, '合同不能重复').meta({ uniqueItems: true }),
    decision: CommissionLowDownPaymentDecisionSchema,
    conditionsConfirmed: z.literal(true),
    reason: z.string().trim().min(1).max(2000),
}).meta({ id: 'ApproveCommissionLowDownPaymentReleaseRequest' });
export type ApproveCommissionLowDownPaymentReleaseRequest = z.infer<typeof ApproveCommissionLowDownPaymentReleaseRequestSchema>;

export const CommissionLowDownPaymentReleaseSummarySchema = z.object({
    id: z.uuid(),
    projectId: z.uuid(),
    freezeVersionId: z.uuid(),
    sourceHandoverId: z.uuid(),
    contractIds: z.array(z.uuid()).min(1),
    decision: CommissionLowDownPaymentDecisionSchema,
    reasonProjection: SensitiveStringFieldProjectionSchema,
    approvedBy: z.uuid(),
    approvedAt: z.iso.datetime(),
    rowVersion: z.number().int().positive(),
    currentApplicable: z.boolean(),
}).meta({ id: 'CommissionLowDownPaymentReleaseSummary' });
export type CommissionLowDownPaymentReleaseSummary = z.infer<typeof CommissionLowDownPaymentReleaseSummarySchema>;

export const CommissionLowDownPaymentContractContextSchema = z.object({
    contractId: z.uuid(),
    contractNo: z.string(),
    amountTaxExclusiveProjection: SensitiveStringFieldProjectionSchema,
    confirmedReceiptsTaxExclusiveProjection: SensitiveStringFieldProjectionSchema,
    lowDownPayment: z.boolean(),
    availableDecisions: z.array(CommissionLowDownPaymentDecisionSchema),
}).meta({ id: 'CommissionLowDownPaymentContractContext' });

export const CommissionLowDownPaymentContextSchema = z.object({
    freezeVersionId: z.uuid(),
    expectedFreezeVersion: z.number().int().positive(),
    sourceHandoverId: z.uuid(),
    receiptJudgmentMode: ProjectReceiptJudgmentModeSchema,
    contracts: z.array(CommissionLowDownPaymentContractContextSchema),
}).meta({ id: 'CommissionLowDownPaymentContext' });

export const CommissionLowDownPaymentReleaseListViewSchema = z.object({
    projectId: z.uuid(),
    currentContext: CommissionLowDownPaymentContextSchema.nullable(),
    blockingReason: z.string().nullable(),
    records: z.array(CommissionLowDownPaymentReleaseSummarySchema),
}).meta({ id: 'CommissionLowDownPaymentReleaseListView' });
export type CommissionLowDownPaymentReleaseListView = z.infer<typeof CommissionLowDownPaymentReleaseListViewSchema>;
