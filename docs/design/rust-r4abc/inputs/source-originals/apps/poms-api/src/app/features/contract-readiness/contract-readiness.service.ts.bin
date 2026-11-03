import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Inject, BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
    CommercialBaselineReviewDecision,
    CommercialDiffReviewResult,
    CommercialReleaseBaselineSummary,
    ContractDiffReviewHistoryView,
    ContractReadinessDetail,
    CreateCommercialReleaseBaselineRequest,
    CreateContractReadinessPackageRequest,
    ReadinessInitializationResult,
    ReviewCommercialReleaseBaselineDiffRequest
} from '@poms/shared-contracts';
import { randomUUID } from 'node:crypto';
import { ProjectService } from '../project/project.service';
import { CommercialBaselineDiffItem, CommercialBaselineDiffResult, CommercialBaselineReviewRecord, CommercialReleaseBaseline } from './commercial-release-baseline.entity';
import { CommercialReleaseBaselineRepository } from './commercial-release-baseline.repository';
import { ContractReadinessPackage, ContractReadinessPackageItem } from './contract-readiness-package.entity';
import { ContractReadinessPackageRepository } from './contract-readiness-package.repository';

export interface ContractActivationReadiness {
    allowed: boolean;
    reason: string | null;
    sourceReadinessId: string | null;
    snapshotId: string | null;
}

@Injectable()
export class ContractReadinessService {
    constructor(
        @Inject(ProjectService) private readonly projectService: ProjectService,
        @Inject(CommercialReleaseBaselineRepository) private readonly commercialReleaseBaselineRepository: CommercialReleaseBaselineRepository,
        @Inject(ContractReadinessPackageRepository) private readonly contractReadinessPackageRepository: ContractReadinessPackageRepository,
        @InjectRepository(CommercialBaselineDiffItem)
        private readonly diffItemRepository: EntityRepository<CommercialBaselineDiffItem>
    ) {}

    async createCommercialReleaseBaseline(input: CreateCommercialReleaseBaselineRequest): Promise<CommercialReleaseBaselineSummary> {
        const project = await this.projectService.findById(input.projectId);
        if (!project) {
            throw new NotFoundException(`Project ${input.projectId} not found`);
        }

        const existingCurrent = await this.commercialReleaseBaselineRepository.findCurrentByProjectId(input.projectId);
        if (existingCurrent && existingCurrent.baselineCode === input.baselineCode) {
            throw new ConflictException(`CommercialReleaseBaseline ${input.baselineCode} already exists for project ${input.projectId}`);
        }

        return this.commercialReleaseBaselineRepository.getEntityManager().transactional(async (em) => {
            const currentBaselines = await em.find(CommercialReleaseBaseline, { projectId: input.projectId, isCurrent: true });
            currentBaselines.forEach((baseline) => {
                baseline.isCurrent = false;
                baseline.baselineStatus = 'superseded';
                baseline.updatedBy = input.updatedBy ?? input.createdBy ?? null;
            });

            const baselineId = randomUUID();
            const diffResultId = randomUUID();
            const baseline = em.create(CommercialReleaseBaseline, {
                id: baselineId,
                projectId: input.projectId,
                baselineCode: input.baselineCode,
                quotationReviewId: input.quotationReviewId ?? null,
                baselineStatus: 'effective',
                isCurrent: true,
                grossMarginSummary: input.grossMarginSummary ?? null,
                paymentTermsSummary: input.paymentTermsSummary ?? null,
                amountTaxInclusive: input.amountTaxInclusive ?? null,
                amountTaxExclusive: input.amountTaxExclusive ?? null,
                taxRate: input.taxRate ?? null,
                downPaymentRate: input.downPaymentRate ?? null,
                retentionRate: input.retentionRate ?? null,
                paymentTerms: input.paymentTerms ?? null,
                latestDiffResultId: null,
                createdBy: input.createdBy ?? null,
                updatedBy: input.updatedBy ?? input.createdBy ?? null
            });

            em.persist([baseline, ...currentBaselines]);
            await em.flush();

            const diffResult = em.create(CommercialBaselineDiffResult, {
                id: diffResultId,
                projectId: input.projectId,
                baselineId,
                diffLevel: input.diffLevel,
                reviewStatus: input.diffLevel === 'prompt' ? 'not-required' : 'pending-review',
                diffSummary: input.diffSummary ?? null,
                currentReviewDecision: null,
                reviewedAt: null
            });

            const diffItems = input.diffItems.map((item, index) =>
                em.create(CommercialBaselineDiffItem, {
                    id: randomUUID(),
                    diffResultId,
                    fieldKey: item.fieldKey,
                    fieldLabel: item.fieldLabel,
                    oldValueSummary: item.oldValueSummary ?? null,
                    newValueSummary: item.newValueSummary ?? null,
                    diffLevel: item.diffLevel,
                    isBlocking: item.isBlocking ?? item.diffLevel === 'reapproval-required',
                    sortOrder: item.sortOrder ?? index
                })
            );

            baseline.latestDiffResultId = diffResultId;

            em.persist([diffResult, ...diffItems, baseline]);
            await em.flush();

            return mapCommercialReleaseBaselineSummary(baseline, diffResult);
        });
    }

    async findCommercialReleaseBaselineById(id: string): Promise<CommercialReleaseBaselineSummary> {
        const baseline = await this.commercialReleaseBaselineRepository.findById(id);
        if (!baseline) {
            throw new NotFoundException(`CommercialReleaseBaseline ${id} not found`);
        }

        const diffResult = await this.getRequiredDiffResult(baseline.latestDiffResultId);
        return mapCommercialReleaseBaselineSummary(baseline, diffResult);
    }

    async findDiffHistoryByBaselineId(id: string): Promise<ContractDiffReviewHistoryView> {
        const baseline = await this.commercialReleaseBaselineRepository.findById(id);
        if (!baseline) {
            throw new NotFoundException(`CommercialReleaseBaseline ${id} not found`);
        }

        const diffResult = await this.getRequiredDiffResult(baseline.latestDiffResultId);
        const [diffItems, reviewHistory] = await Promise.all([
            this.diffItemRepository.find(
                { diffResultId: diffResult.id },
                {
                    orderBy: { sortOrder: QueryOrder.ASC }
                }
            ),
            this.commercialReleaseBaselineRepository.findReviewHistory(diffResult.id)
        ]);

        return {
            baseline: mapCommercialReleaseBaselineSummary(baseline, diffResult),
            diffItems: diffItems.map(mapCommercialBaselineDiffItem),
            reviewHistory: reviewHistory.map(mapCommercialBaselineReviewRecord)
        };
    }

    async reviewCommercialReleaseBaselineDiff(baselineId: string, actorUserId: string, input: ReviewCommercialReleaseBaselineDiffRequest): Promise<CommercialDiffReviewResult> {
        const baseline = await this.commercialReleaseBaselineRepository.findById(baselineId);
        if (!baseline) {
            throw new NotFoundException(`CommercialReleaseBaseline ${baselineId} not found`);
        }

        this.assertExpectedVersion(baseline.rowVersion, input.expectedVersion, 'CommercialReleaseBaseline');

        const diffResult = await this.getRequiredDiffResult(baseline.latestDiffResultId);
        if (diffResult.diffLevel === 'prompt') {
            throw new BadRequestException(`CommercialReleaseBaseline ${baselineId} does not require diff review`);
        }

        if (diffResult.diffLevel === 'reapproval-required' && input.diffDecision === 'approved') {
            throw new BadRequestException(`CommercialReleaseBaseline ${baselineId} requires a new baseline before contract flow can continue`);
        }

        return this.commercialReleaseBaselineRepository.getEntityManager().transactional(async (em) => {
            const managedBaseline = await em.findOne(CommercialReleaseBaseline, { id: baselineId });
            const managedDiffResult = await em.findOne(CommercialBaselineDiffResult, { id: diffResult.id });
            if (!managedBaseline || !managedDiffResult) {
                throw new NotFoundException(`CommercialReleaseBaseline ${baselineId} review context not found`);
            }

            const decision: CommercialBaselineReviewDecision = managedDiffResult.diffLevel === 'reapproval-required' ? 'rejected' : input.diffDecision;

            const reviewRecord = em.create(CommercialBaselineReviewRecord, {
                baselineId: managedBaseline.id,
                diffResultId: managedDiffResult.id,
                projectId: managedBaseline.projectId,
                decision,
                reviewedFieldKeys: input.reviewedFieldKeys,
                comment: input.comment ?? null,
                reviewerUserId: actorUserId
            });

            managedDiffResult.reviewStatus = decision === 'approved' ? 'approved' : 'rejected';
            managedDiffResult.currentReviewDecision = decision;
            managedDiffResult.reviewedAt = new Date();
            managedBaseline.updatedBy = actorUserId;

            em.persist([managedBaseline, managedDiffResult, reviewRecord]);
            await em.flush();

            return {
                targetId: managedBaseline.id,
                diffResultId: managedDiffResult.id,
                baselineReviewDecision: decision,
                resultStatus: 'reviewed'
            };
        });
    }

    async createContractReadinessPackage(input: CreateContractReadinessPackageRequest): Promise<ContractReadinessDetail> {
        const project = await this.projectService.findById(input.projectId);
        if (!project) {
            throw new NotFoundException(`Project ${input.projectId} not found`);
        }

        const baseline = await this.commercialReleaseBaselineRepository.findById(input.sourceBaselineId);
        if (!baseline || baseline.projectId !== input.projectId) {
            throw new NotFoundException(`CommercialReleaseBaseline ${input.sourceBaselineId} not found for project ${input.projectId}`);
        }

        const diffResult = await this.commercialReleaseBaselineRepository.findDiffResultById(input.latestDiffResultId);
        if (!diffResult || diffResult.baselineId !== baseline.id) {
            throw new NotFoundException(`CommercialBaselineDiffResult ${input.latestDiffResultId} not found for baseline ${input.sourceBaselineId}`);
        }

        if (input.guardDecision === 'allowed' && !isDiffReadyForContract(diffResult)) {
            throw new ConflictException(`CommercialBaselineDiffResult ${diffResult.id} is not ready for contract activation`);
        }

        return this.contractReadinessPackageRepository.getEntityManager().transactional(async (em) => {
            const currentPackages = await em.find(ContractReadinessPackage, { projectId: input.projectId, isCurrent: true });
            currentPackages.forEach((pkg) => {
                pkg.isCurrent = false;
                pkg.updatedBy = input.updatedBy ?? input.createdBy ?? null;
            });

            const readinessPackageId = randomUUID();
            const readinessPackage = em.create(ContractReadinessPackage, {
                id: readinessPackageId,
                projectId: input.projectId,
                sourceBaselineId: input.sourceBaselineId,
                latestDiffResultId: input.latestDiffResultId,
                packageStatus: input.packageStatus,
                guardDecision: input.guardDecision,
                currentEffectiveDecisionSummary: input.currentEffectiveDecisionSummary ?? null,
                blockingReasonSummary: input.blockingReasonSummary ?? null,
                missingPrerequisiteCount: input.missingPrerequisiteCount ?? 0,
                initializedContractSnapshotId: null,
                initializedReceivablePlanVersionId: null,
                contractSnapshotInitializedAt: null,
                receivablePlanInitializedAt: null,
                isCurrent: true,
                createdBy: input.createdBy ?? null,
                updatedBy: input.updatedBy ?? input.createdBy ?? null
            });

            const items = input.items.map((item, index) =>
                em.create(ContractReadinessPackageItem, {
                    id: randomUUID(),
                    packageId: readinessPackageId,
                    itemType: item.itemType,
                    itemKey: item.itemKey,
                    label: item.label,
                    summary: item.summary ?? null,
                    status: item.status,
                    responsibleRole: item.responsibleRole ?? null,
                    navigationHint: item.navigationHint ?? null,
                    sortOrder: item.sortOrder ?? index
                })
            );

            em.persist([readinessPackage, ...items, ...currentPackages]);
            await em.flush();

            return mapContractReadinessDetail(readinessPackage, diffResult, items);
        });
    }

    async findContractReadinessById(id: string): Promise<ContractReadinessDetail> {
        const readinessPackage = await this.contractReadinessPackageRepository.findById(id);
        if (!readinessPackage) {
            throw new NotFoundException(`ContractReadinessPackage ${id} not found`);
        }

        const [diffResult, items] = await Promise.all([this.getRequiredDiffResult(readinessPackage.latestDiffResultId), this.contractReadinessPackageRepository.findItems(id)]);

        return mapContractReadinessDetail(readinessPackage, diffResult, items);
    }

    async findCurrentContractReadinessByProjectId(projectId: string): Promise<ContractReadinessDetail> {
        const readinessPackage = await this.contractReadinessPackageRepository.findCurrentByProjectId(projectId);
        if (!readinessPackage) {
            throw new NotFoundException(`No current ContractReadinessPackage found for project ${projectId}`);
        }

        const [diffResult, items] = await Promise.all([this.getRequiredDiffResult(readinessPackage.latestDiffResultId), this.contractReadinessPackageRepository.findItems(readinessPackage.id)]);

        return mapContractReadinessDetail(readinessPackage, diffResult, items);
    }

    async initializeContractSnapshot(packageId: string, actorUserId: string, expectedVersion?: number): Promise<ReadinessInitializationResult> {
        return this.initializeFromReadinessPackage(packageId, actorUserId, expectedVersion, 'contract-snapshot');
    }

    async initializeReceivablePlan(packageId: string, actorUserId: string, expectedVersion?: number): Promise<ReadinessInitializationResult> {
        return this.initializeFromReadinessPackage(packageId, actorUserId, expectedVersion, 'receivable-plan');
    }

    async resolveActivationReadiness(projectId: string): Promise<ContractActivationReadiness> {
        const readinessPackage = await this.contractReadinessPackageRepository.findCurrentByProjectId(projectId);
        if (!readinessPackage) {
            return {
                allowed: false,
                reason: `Project ${projectId} has no current contract readiness package`,
                sourceReadinessId: null,
                snapshotId: null
            };
        }

        const diffResult = await this.commercialReleaseBaselineRepository.findDiffResultById(readinessPackage.latestDiffResultId);
        if (!diffResult) {
            return {
                allowed: false,
                reason: `ContractReadinessPackage ${readinessPackage.id} is missing its current diff result`,
                sourceReadinessId: readinessPackage.id,
                snapshotId: readinessPackage.initializedContractSnapshotId ?? null
            };
        }

        const canProceed = readinessPackage.guardDecision === 'allowed' && readinessPackage.packageStatus !== 'blocked' && isDiffReadyForContract(diffResult);
        if (!canProceed) {
            return {
                allowed: false,
                reason: readinessPackage.blockingReasonSummary ?? readinessPackage.currentEffectiveDecisionSummary ?? mapDiffBlockingReason(diffResult),
                sourceReadinessId: readinessPackage.id,
                snapshotId: readinessPackage.initializedContractSnapshotId ?? null
            };
        }

        return {
            allowed: true,
            reason: null,
            sourceReadinessId: readinessPackage.id,
            snapshotId: readinessPackage.initializedContractSnapshotId ?? null
        };
    }

    private async initializeFromReadinessPackage(packageId: string, actorUserId: string, expectedVersion: number | undefined, target: 'contract-snapshot' | 'receivable-plan'): Promise<ReadinessInitializationResult> {
        const readinessPackage = await this.contractReadinessPackageRepository.findById(packageId);
        if (!readinessPackage) {
            throw new NotFoundException(`ContractReadinessPackage ${packageId} not found`);
        }

        this.assertExpectedVersion(readinessPackage.rowVersion, expectedVersion, 'ContractReadinessPackage');

        const diffResult = await this.getRequiredDiffResult(readinessPackage.latestDiffResultId);
        if (readinessPackage.packageStatus === 'blocked' || readinessPackage.guardDecision === 'blocked') {
            throw new BadRequestException(readinessPackage.blockingReasonSummary ?? `ContractReadinessPackage ${packageId} is blocked and cannot initialize formal outputs`);
        }

        if (!isDiffReadyForContract(diffResult)) {
            throw new BadRequestException(mapDiffBlockingReason(diffResult));
        }

        return this.contractReadinessPackageRepository.getEntityManager().transactional(async (em) => {
            const managedPackage = await em.findOne(ContractReadinessPackage, { id: packageId });
            if (!managedPackage) {
                throw new NotFoundException(`ContractReadinessPackage ${packageId} not found`);
            }

            managedPackage.updatedBy = actorUserId;

            if (target === 'contract-snapshot') {
                managedPackage.initializedContractSnapshotId = managedPackage.initializedContractSnapshotId ?? randomUUID();
                managedPackage.contractSnapshotInitializedAt = new Date();
            } else {
                managedPackage.initializedReceivablePlanVersionId = managedPackage.initializedReceivablePlanVersionId ?? randomUUID();
                managedPackage.receivablePlanInitializedAt = new Date();
            }

            em.persist(managedPackage);
            await em.flush();

            return {
                targetId: managedPackage.id,
                targetType: 'ContractReadinessPackage',
                sourceReadinessId: managedPackage.id,
                resultStatus: 'initialized',
                businessStatusAfter: managedPackage.packageStatus,
                snapshotId: target === 'contract-snapshot' ? managedPackage.initializedContractSnapshotId : null,
                newVersionId: target === 'receivable-plan' ? managedPackage.initializedReceivablePlanVersionId : null
            };
        });
    }

    private async getRequiredDiffResult(diffResultId: string | null | undefined): Promise<CommercialBaselineDiffResult> {
        if (!diffResultId) {
            throw new NotFoundException('CommercialReleaseBaseline has no current diff result');
        }

        const diffResult = await this.commercialReleaseBaselineRepository.findDiffResultById(diffResultId);
        if (!diffResult) {
            throw new NotFoundException(`CommercialBaselineDiffResult ${diffResultId} not found`);
        }

        return diffResult;
    }

    private assertExpectedVersion(actualVersion: number, expectedVersion: number | undefined, resourceType: string): void {
        if (expectedVersion !== undefined && actualVersion !== expectedVersion) {
            throw new ConflictException(`${resourceType} version ${expectedVersion} does not match current version ${actualVersion}`);
        }
    }
}

function mapCommercialReleaseBaselineSummary(baseline: CommercialReleaseBaseline, diffResult: CommercialBaselineDiffResult): CommercialReleaseBaselineSummary {
    return {
        id: baseline.id,
        projectId: baseline.projectId,
        baselineCode: baseline.baselineCode,
        quotationReviewId: baseline.quotationReviewId ?? null,
        baselineStatus: baseline.baselineStatus,
        isCurrent: baseline.isCurrent,
        grossMarginSummary: baseline.grossMarginSummary ?? null,
        paymentTermsSummary: baseline.paymentTermsSummary ?? null,
        amountTaxInclusive: baseline.amountTaxInclusive ?? null,
        amountTaxExclusive: baseline.amountTaxExclusive ?? null,
        taxRate: baseline.taxRate ?? null,
        downPaymentRate: baseline.downPaymentRate ?? null,
        retentionRate: baseline.retentionRate ?? null,
        paymentTerms: baseline.paymentTerms ?? null,
        latestDiffResultId: diffResult.id,
        diffLevel: diffResult.diffLevel,
        reviewStatus: diffResult.reviewStatus,
        diffSummary: diffResult.diffSummary ?? null,
        rowVersion: baseline.rowVersion,
        createdAt: baseline.createdAt.toISOString(),
        createdBy: baseline.createdBy ?? null,
        updatedAt: baseline.updatedAt.toISOString(),
        updatedBy: baseline.updatedBy ?? null
    };
}

function mapCommercialBaselineDiffItem(item: CommercialBaselineDiffItem) {
    return {
        id: item.id,
        fieldKey: item.fieldKey,
        fieldLabel: item.fieldLabel,
        oldValueSummary: item.oldValueSummary ?? null,
        newValueSummary: item.newValueSummary ?? null,
        diffLevel: item.diffLevel,
        isBlocking: item.isBlocking,
        sortOrder: item.sortOrder
    };
}

function mapCommercialBaselineReviewRecord(record: CommercialBaselineReviewRecord) {
    return {
        id: record.id,
        baselineId: record.baselineId,
        diffResultId: record.diffResultId,
        projectId: record.projectId,
        decision: record.decision,
        reviewedFieldKeys: record.reviewedFieldKeys,
        comment: record.comment ?? null,
        reviewerUserId: record.reviewerUserId,
        createdAt: record.createdAt.toISOString()
    };
}

function mapContractReadinessItem(item: ContractReadinessPackageItem) {
    return {
        id: item.id,
        itemType: item.itemType,
        itemKey: item.itemKey,
        label: item.label,
        summary: item.summary ?? null,
        status: item.status,
        responsibleRole: item.responsibleRole ?? null,
        navigationHint: item.navigationHint ?? null,
        sortOrder: item.sortOrder
    };
}

function mapContractReadinessDetail(readinessPackage: ContractReadinessPackage, diffResult: CommercialBaselineDiffResult, items: ContractReadinessPackageItem[]): ContractReadinessDetail {
    const allowedActions = buildAllowedActions(readinessPackage, diffResult);

    return {
        id: readinessPackage.id,
        projectId: readinessPackage.projectId,
        sourceBaselineId: readinessPackage.sourceBaselineId,
        commercialReleaseBaselineId: readinessPackage.sourceBaselineId,
        latestDiffResultId: readinessPackage.latestDiffResultId,
        diffLevel: diffResult.diffLevel,
        reviewStatus: diffResult.reviewStatus,
        packageStatus: readinessPackage.packageStatus,
        guardDecision: readinessPackage.guardDecision,
        currentEffectiveDecisionSummary: readinessPackage.currentEffectiveDecisionSummary ?? null,
        blockingReasonSummary: readinessPackage.blockingReasonSummary ?? null,
        missingPrerequisiteCount: readinessPackage.missingPrerequisiteCount,
        initializedContractSnapshotId: readinessPackage.initializedContractSnapshotId ?? null,
        initializedReceivablePlanVersionId: readinessPackage.initializedReceivablePlanVersionId ?? null,
        contractSnapshotInitializedAt: readinessPackage.contractSnapshotInitializedAt?.toISOString() ?? null,
        receivablePlanInitializedAt: readinessPackage.receivablePlanInitializedAt?.toISOString() ?? null,
        isCurrent: readinessPackage.isCurrent,
        rowVersion: readinessPackage.rowVersion,
        createdAt: readinessPackage.createdAt.toISOString(),
        createdBy: readinessPackage.createdBy ?? null,
        updatedAt: readinessPackage.updatedAt.toISOString(),
        updatedBy: readinessPackage.updatedBy ?? null,
        allowedActions,
        items: items.map(mapContractReadinessItem)
    };
}

function buildAllowedActions(readinessPackage: ContractReadinessPackage, diffResult: CommercialBaselineDiffResult): string[] {
    const actions: string[] = [];
    if (diffResult.reviewStatus === 'pending-review') {
        actions.push('review-diff');
    }

    if (readinessPackage.guardDecision === 'allowed' && readinessPackage.packageStatus !== 'blocked' && isDiffReadyForContract(diffResult)) {
        actions.push('initialize-contract-snapshot', 'initialize-receivable-plan');
    }

    return actions;
}

function isDiffReadyForContract(diffResult: CommercialBaselineDiffResult): boolean {
    if (diffResult.diffLevel === 'prompt') {
        return true;
    }

    if (diffResult.diffLevel === 'review-required') {
        return diffResult.reviewStatus === 'approved';
    }

    return false;
}

function mapDiffBlockingReason(diffResult: CommercialBaselineDiffResult): string {
    if (diffResult.diffLevel === 'review-required' && diffResult.reviewStatus !== 'approved') {
        return 'Commercial release baseline diff still requires review approval before contract activation';
    }

    if (diffResult.diffLevel === 'reapproval-required') {
        return 'Commercial release baseline diff requires a new quotation review baseline before contract activation';
    }

    return 'Commercial release baseline diff is not ready for contract activation';
}
