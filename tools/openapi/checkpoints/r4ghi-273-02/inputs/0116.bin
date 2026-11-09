import type { ContractReadinessDetail, CreateContractReadinessPackageRequest } from "../../core/rust-r4def-frozen-native-reference";
/**
 * Historical Native reference shapes only. This adapter does not implement or
 * certify R4's real prepared terms, review binding, snapshot or receivable plan.
 * Never fill a new required identity with one of the old random UUID markers.
 */
import type { CommercialBaselineReviewRecordSummary, CommercialDiffLevel, CommercialDiffReviewStatus, CommercialReleaseBaselineSummary, ContractDiffReviewHistoryView, ContractReadinessGuardDecision, ContractReadinessStatus, CreateCommercialReleaseBaselineRequest, ReviewCommercialReleaseBaselineDiffRequest } from '@poms/shared-contracts';

export type LegacyCommercialReleaseBaselineSummary = Omit<
    CommercialReleaseBaselineSummary,
    'contractTerms' | 'currencyCode' | 'financialProjection' | 'latestDiffResultId' | 'diffLevel' | 'reviewStatus'
> & {
    latestDiffResultId: string;
    diffLevel: CommercialDiffLevel;
    reviewStatus: CommercialDiffReviewStatus;
};

export type LegacyCommercialBaselineReviewRecordSummary = Omit<CommercialBaselineReviewRecordSummary, 'attachmentIds'>;

export type LegacyContractDiffReviewHistoryView = Omit<ContractDiffReviewHistoryView, 'baseline' | 'reviewHistory'> & {
    baseline: LegacyCommercialReleaseBaselineSummary;
    reviewHistory: LegacyCommercialBaselineReviewRecordSummary[];
};

export type LegacyContractReadinessDetail = Omit<ContractReadinessDetail, 'contractId' | 'candidateTerms' | 'currentPreparation' | 'financialProjection'>;

export type LegacyCreateCommercialReleaseBaselineRequest = Omit<CreateCommercialReleaseBaselineRequest, 'contractTerms' | 'diffLevel'> & {
    contractTerms?: CreateCommercialReleaseBaselineRequest['contractTerms'];
    diffLevel: CommercialDiffLevel;
};

export type LegacyCreateContractReadinessPackageRequest = Omit<
    CreateContractReadinessPackageRequest,
    'contractId' | 'candidateTerms' | 'latestDiffResultId' | 'packageStatus' | 'guardDecision'
> & {
    contractId?: string;
    candidateTerms?: CreateContractReadinessPackageRequest['candidateTerms'];
    latestDiffResultId: string;
    packageStatus: ContractReadinessStatus;
    guardDecision: ContractReadinessGuardDecision;
};

export type LegacyReviewCommercialReleaseBaselineDiffRequest = Omit<ReviewCommercialReleaseBaselineDiffRequest, 'contractId' | 'diffResultId'> & {
    contractId?: string;
    diffResultId?: string;
};

export interface LegacyReadinessInitializationResult {
    targetId: string;
    targetType: string;
    sourceReadinessId: string;
    resultStatus: string;
    businessStatusAfter: string;
    snapshotId?: string | null;
    newVersionId?: string | null;
}
