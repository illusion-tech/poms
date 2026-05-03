import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BusinessNumberService } from '../business-number/business-number.service';
import { CustomerService } from '../customer/customer.service';
import type {
    AcceptanceRecordResult,
    AcceptanceRecordType,
    CreateProjectBidCommercialProcessRequest,
    CreateProjectPricingMarginReviewRequest,
    CreateProjectTechnicalCostPackageRequest,
    PreSigningRiskLevel,
    ProjectCompletionRecordResult,
    ProjectOwnerReassignmentResult,
    ProjectStatus,
    ProjectStage
} from '@poms/shared-contracts';
import { ProjectStageValue, ProjectStatusValue } from '@poms/shared-contracts';
import { AcceptanceRecord } from './acceptance-record.entity';
import { ProjectArchiveRecord } from './project-archive-record.entity';
import { ProjectBidCommercialProcess } from './project-bid-commercial-process.entity';
import { ProjectCompletionRecord } from './project-completion-record.entity';
import { ProjectOwnerReassignmentRecord } from './project-owner-reassignment-record.entity';
import { ProjectPricingMarginReview } from './project-pricing-margin-review.entity';
import { ProjectTechnicalCostPackage } from './project-technical-cost-package.entity';
import { Project } from './project.entity';
import { ProjectRepository } from './project.repository';

export interface CreateProjectRecord {
    projectName: string;
    customerId: string;
    customerProjectNo?: string | null;
    sourceLeadId?: string | null;
    currentStage?: ProjectStage;
    plannedSignAt?: Date | null;
}

export interface FindProjectsQuery {
    status?: ProjectStatus;
    currentStage?: ProjectStage;
    ownerOrgId?: string;
    keyword?: string;
}

export interface UpdateProjectBasicInfoRecord {
    projectName?: string;
    customerId?: string;
    customerProjectNo?: string | null;
    plannedSignAt?: Date | null;
}

export interface ReassignProjectOwnerRecord {
    ownerUserId: string;
    ownerOrgId?: string | null;
    reason: string;
    expectedVersion?: number;
}

export interface CreateAcceptanceRecordInput {
    acceptanceType: AcceptanceRecordType;
    acceptanceResult: AcceptanceRecordResult;
    scopeSummary: string;
    evidenceSummary: string;
    comment?: string | null;
}

export interface CreateProjectCompletionRecordInput {
    acceptanceRecordId: string;
    completionResult: ProjectCompletionRecordResult;
    completedAt: Date;
    completionSummary: string;
    evidenceSummary: string;
}

export interface CreateProjectArchiveRecordInput {
    archivedAt: Date;
    archiveSummary: string;
    evidenceSummary: string;
}

export interface ReplaceProjectArchiveRecordInput {
    archivedAt: Date;
    archiveSummary: string;
    evidenceSummary: string;
    replacementReason: string;
    expectedVersion?: number;
}

export interface VoidProjectArchiveRecordInput {
    reason: string;
    comment?: string | null;
    expectedVersion?: number;
}

const PRESIGNING_PROJECT_STAGES: readonly ProjectStage[] = [ProjectStageValue.Assessment, ProjectStageValue.ScopeConfirmation, ProjectStageValue.CommercialClosure, ProjectStageValue.Contracting];
const EDITABLE_PROJECT_STATUSES: readonly ProjectStatus[] = [ProjectStatusValue.Active, ProjectStatusValue.Blocked];
const CLOSED_PROJECT_STAGES: readonly ProjectStage[] = [ProjectStageValue.ClosedLost, ProjectStageValue.ClosedTerminated];
const TECHNICAL_COST_ALLOWED_PROJECT_STAGES = PRESIGNING_PROJECT_STAGES;
const BID_COMMERCIAL_ALLOWED_PROJECT_STAGES = PRESIGNING_PROJECT_STAGES;
const PRICING_MARGIN_ALLOWED_PROJECT_STAGES = PRESIGNING_PROJECT_STAGES;
const RISK_LEVEL_WEIGHT: Record<PreSigningRiskLevel, number> = {
    R1: 1,
    R2: 2,
    R3: 3,
    R4: 4
};

@Injectable()
export class ProjectService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly businessNumberService: BusinessNumberService,
        private readonly customerService: CustomerService
    ) {}

    async findAll(): Promise<Project[]> {
        return this.projectRepository.findAll();
    }

    async findMany(query: FindProjectsQuery): Promise<Project[]> {
        return this.projectRepository.findMany(query);
    }

    async findById(id: string): Promise<Project | null> {
        return this.projectRepository.findById(id);
    }

    async findByIds(ids: string[]): Promise<Project[]> {
        return this.projectRepository.findByIds(ids);
    }

    async findByNo(projectNo: string): Promise<Project | null> {
        return this.projectRepository.findByNo(projectNo);
    }

    async createAndSave(input: CreateProjectRecord, operatorUserId: string): Promise<Project> {
        const operator = await this.projectRepository.findPlatformUserById(operatorUserId);
        if (!operator) {
            throw new NotFoundException(`Platform user ${operatorUserId} not found`);
        }

        const customer = await this.customerService.requireActiveCustomer(input.customerId);
        return this.projectRepository.getEntityManager().transactional(async (em) => {
            const projectNo = await this.businessNumberService.next('project', new Date(), em);
            const project = em.create(Project, {
                projectNo,
                projectName: input.projectName,
                sourceLeadId: input.sourceLeadId ?? null,
                status: ProjectStatusValue.Active,
                currentStage: input.currentStage ?? ProjectStageValue.Assessment,
                customerId: customer.id,
                customerName: customer.displayName,
                customerProjectNo: input.customerProjectNo?.trim() || null,
                ownerOrgId: operator.primaryOrgUnitId ?? null,
                ownerUserId: operator.id,
                plannedSignAt: input.plannedSignAt ?? null,
                createdBy: operator.id,
                updatedBy: operator.id
            });

            em.persist(project);
            await em.flush();
            return project;
        });
    }

    async updateBasicInfo(id: string, input: UpdateProjectBasicInfoRecord, operatorUserId: string): Promise<Project> {
        const project = await this.projectRepository.findById(id);
        if (!project) {
            throw new NotFoundException(`Project ${id} not found`);
        }

        if (!EDITABLE_PROJECT_STATUSES.includes(project.status)) {
            throw new BadRequestException(`Project ${id} cannot be edited in status ${project.status}`);
        }

        if (input.projectName !== undefined) {
            project.projectName = input.projectName;
        }

        if (input.customerId !== undefined) {
            const customer = await this.customerService.requireActiveCustomer(input.customerId);
            project.customerId = customer.id;
            project.customerName = customer.displayName;
        }

        if (input.customerProjectNo !== undefined) {
            project.customerProjectNo = input.customerProjectNo?.trim() || null;
        }

        if (input.plannedSignAt !== undefined) {
            project.plannedSignAt = input.plannedSignAt;
        }

        project.updatedBy = operatorUserId;

        await this.projectRepository.save(project);

        return project;
    }

    async reassignOwner(id: string, input: ReassignProjectOwnerRecord, operatorUserId: string): Promise<ProjectOwnerReassignmentResult> {
        const project = await this.projectRepository.findById(id);
        if (!project) {
            throw new NotFoundException(`Project ${id} not found`);
        }

        this.assertExpectedVersion(project.rowVersion, input.expectedVersion, 'project');

        if (!EDITABLE_PROJECT_STATUSES.includes(project.status)) {
            throw new BadRequestException(`Project ${id} cannot reassign owner in status ${project.status}`);
        }

        const targetOwner = await this.projectRepository.findPlatformUserById(input.ownerUserId);
        if (!targetOwner) {
            throw new NotFoundException(`Platform user ${input.ownerUserId} not found`);
        }
        if (targetOwner.isActive === false) {
            throw new BadRequestException(`Platform user ${input.ownerUserId} is not active`);
        }

        const nextOwnerOrgId = input.ownerOrgId === undefined ? (targetOwner.primaryOrgUnitId ?? null) : (input.ownerOrgId ?? null);

        if (nextOwnerOrgId) {
            const targetOrg = await this.projectRepository.findOrgUnitById(nextOwnerOrgId);
            if (!targetOrg) {
                throw new NotFoundException(`Org unit ${nextOwnerOrgId} not found`);
            }
            if (targetOrg.isActive === false) {
                throw new BadRequestException(`Org unit ${nextOwnerOrgId} is not active`);
            }
        }

        if (project.ownerUserId === input.ownerUserId && (project.ownerOrgId ?? null) === nextOwnerOrgId) {
            throw new BadRequestException(`Project ${id} already has the requested owner`);
        }

        const previousOwnerUserId = project.ownerUserId ?? null;
        const previousOwnerOrgId = project.ownerOrgId ?? null;
        const now = new Date();
        const record = this.projectRepository.createProjectOwnerReassignmentRecord({
            id: randomUUID(),
            projectId: project.id,
            previousOwnerOrgId,
            previousOwnerUserId,
            newOwnerOrgId: nextOwnerOrgId,
            newOwnerUserId: input.ownerUserId,
            reason: input.reason.trim(),
            reassignedAt: now,
            reassignedBy: operatorUserId,
            createdAt: now,
            createdBy: operatorUserId
        });

        project.ownerUserId = input.ownerUserId;
        project.ownerOrgId = nextOwnerOrgId;
        project.updatedBy = operatorUserId;

        await this.projectRepository.saveProjectOwnerReassignment({
            project,
            record
        });

        return this.mapProjectOwnerReassignmentResult(project, record);
    }

    async createAcceptanceRecord(projectId: string, input: CreateAcceptanceRecordInput, operatorUserId: string): Promise<AcceptanceRecord> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        if (project.currentStage !== ProjectStageValue.Acceptance) {
            throw new BadRequestException(`Project ${projectId} cannot record acceptance in stage ${project.currentStage}`);
        }

        const now = new Date();
        const record = this.projectRepository.createAcceptanceRecord({
            projectId,
            acceptanceType: input.acceptanceType,
            acceptanceResult: input.acceptanceResult,
            status: 'confirmed',
            scopeSummary: input.scopeSummary,
            evidenceSummary: input.evidenceSummary,
            comment: input.comment?.trim() || null,
            confirmationRecordId: null,
            confirmedAt: now,
            confirmedBy: operatorUserId,
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });

        await this.projectRepository.saveAcceptanceRecord(record);

        return record;
    }

    async createProjectCompletionRecord(projectId: string, input: CreateProjectCompletionRecordInput, operatorUserId: string): Promise<ProjectCompletionRecord> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        if (project.status === ProjectStatusValue.Closed || CLOSED_PROJECT_STAGES.includes(project.currentStage)) {
            throw new BadRequestException(`Project ${projectId} cannot record completion because it is closed`);
        }

        if (project.currentStage !== ProjectStageValue.Acceptance) {
            throw new BadRequestException(`Project ${projectId} cannot record completion in stage ${project.currentStage}`);
        }

        const acceptanceRecord = await this.projectRepository.findAcceptanceRecordById(input.acceptanceRecordId);
        if (!acceptanceRecord || acceptanceRecord.projectId !== project.id) {
            throw new BadRequestException(`Acceptance record ${input.acceptanceRecordId} is not valid for project ${projectId}`);
        }

        if (acceptanceRecord.status !== 'confirmed' || !['accepted', 'conditional'].includes(acceptanceRecord.acceptanceResult)) {
            throw new BadRequestException(`Acceptance record ${input.acceptanceRecordId} is not an effective acceptance source`);
        }

        const record = this.projectRepository.createProjectCompletionRecord({
            projectId,
            acceptanceRecordId: acceptanceRecord.id,
            completionResult: input.completionResult,
            status: 'confirmed',
            completedAt: input.completedAt,
            completedBy: operatorUserId,
            completionSummary: input.completionSummary,
            evidenceSummary: input.evidenceSummary,
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });

        project.currentStage = ProjectStageValue.Completed;
        project.status = ProjectStatusValue.Completed;
        project.updatedBy = operatorUserId;

        await this.projectRepository.saveProjectCompletionRecord(record, project);

        return record;
    }

    async createProjectArchiveRecord(projectId: string, input: CreateProjectArchiveRecordInput, operatorUserId: string): Promise<ProjectArchiveRecord> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        if (project.currentStage === ProjectStageValue.Completed) {
            if (project.status !== ProjectStatusValue.Completed) {
                throw new BadRequestException(`Project ${projectId} cannot record archive because completion is not effective`);
            }

            await this.assertNoCurrentArchiveRecord(project.id);

            const completionRecord = await this.projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId(project.id);
            if (!completionRecord) {
                throw new BadRequestException(`Project ${projectId} cannot record archive without an effective completion source`);
            }

            const record = this.projectRepository.createProjectArchiveRecord({
                projectId,
                archiveAnchorStage: ProjectStageValue.Completed,
                archiveAnchorSourceType: 'project-completion-record',
                archiveAnchorSourceId: completionRecord.id,
                status: 'recorded',
                archivedAt: input.archivedAt,
                archivedBy: operatorUserId,
                archiveSummary: input.archiveSummary,
                evidenceSummary: input.evidenceSummary,
                createdBy: operatorUserId,
                updatedBy: operatorUserId
            });

            await this.projectRepository.saveProjectArchiveRecord(record);

            return record;
        }

        if (CLOSED_PROJECT_STAGES.includes(project.currentStage)) {
            if (project.status !== ProjectStatusValue.Closed || !project.closedAt) {
                throw new BadRequestException(`Project ${projectId} cannot record archive because close fact is not effective`);
            }

            await this.assertNoCurrentArchiveRecord(project.id);

            const record = this.projectRepository.createProjectArchiveRecord({
                projectId,
                archiveAnchorStage: project.currentStage,
                archiveAnchorSourceType: 'project',
                archiveAnchorSourceId: project.id,
                status: 'recorded',
                archivedAt: input.archivedAt,
                archivedBy: operatorUserId,
                archiveSummary: input.archiveSummary,
                evidenceSummary: input.evidenceSummary,
                createdBy: operatorUserId,
                updatedBy: operatorUserId
            });

            await this.projectRepository.saveProjectArchiveRecord(record);

            return record;
        }

        throw new BadRequestException(`Project ${projectId} cannot record archive in stage ${project.currentStage}`);
    }

    async replaceProjectArchiveRecord(id: string, input: ReplaceProjectArchiveRecordInput, operatorUserId: string): Promise<ProjectArchiveRecord> {
        const supersededRecord = await this.projectRepository.findProjectArchiveRecordById(id);
        if (!supersededRecord) {
            throw new NotFoundException(`ProjectArchiveRecord ${id} not found`);
        }

        this.assertExpectedVersion(supersededRecord.rowVersion, input.expectedVersion, 'ProjectArchiveRecord');
        if (supersededRecord.status !== 'recorded') {
            throw new BadRequestException(`Only recorded project archive records can be replaced, current status: ${supersededRecord.status}`);
        }

        const currentRecord = await this.projectRepository.findLatestRecordedProjectArchiveRecordByProjectId(supersededRecord.projectId);
        if (currentRecord && currentRecord.id !== supersededRecord.id) {
            throw new ConflictException(`Project ${supersededRecord.projectId} has a newer current archive record ${currentRecord.id}`);
        }

        supersededRecord.status = 'superseded';
        supersededRecord.updatedBy = operatorUserId;

        const replacementRecord = this.projectRepository.createProjectArchiveRecord({
            projectId: supersededRecord.projectId,
            archiveAnchorStage: supersededRecord.archiveAnchorStage,
            archiveAnchorSourceType: supersededRecord.archiveAnchorSourceType,
            archiveAnchorSourceId: supersededRecord.archiveAnchorSourceId,
            status: 'recorded',
            archivedAt: input.archivedAt,
            archivedBy: operatorUserId,
            archiveSummary: input.archiveSummary,
            evidenceSummary: input.evidenceSummary,
            supersedesArchiveRecordId: supersededRecord.id,
            replacementReason: input.replacementReason.trim(),
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });

        await this.projectRepository.saveProjectArchiveRecordReplacement({
            supersededRecord,
            replacementRecord
        });

        return replacementRecord;
    }

    async voidProjectArchiveRecord(id: string, input: VoidProjectArchiveRecordInput, operatorUserId: string): Promise<ProjectArchiveRecord> {
        const record = await this.projectRepository.findProjectArchiveRecordById(id);
        if (!record) {
            throw new NotFoundException(`ProjectArchiveRecord ${id} not found`);
        }

        this.assertExpectedVersion(record.rowVersion, input.expectedVersion, 'ProjectArchiveRecord');
        if (record.status !== 'recorded') {
            throw new BadRequestException(`Only recorded project archive records can be voided, current status: ${record.status}`);
        }

        const currentRecord = await this.projectRepository.findLatestRecordedProjectArchiveRecordByProjectId(record.projectId);
        if (currentRecord && currentRecord.id !== record.id) {
            throw new ConflictException(`Project ${record.projectId} has a newer current archive record ${currentRecord.id}`);
        }

        record.status = 'voided';
        record.voidedAt = new Date();
        record.voidedBy = operatorUserId;
        record.voidReason = this.appendComment(input.reason.trim(), input.comment);
        record.updatedBy = operatorUserId;

        await this.projectRepository.saveProjectArchiveRecord(record);

        return record;
    }

    async createProjectBidCommercialProcess(projectId: string, input: CreateProjectBidCommercialProcessRequest, operatorUserId: string): Promise<ProjectBidCommercialProcess> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        if (project.status === ProjectStatusValue.Closed || !BID_COMMERCIAL_ALLOWED_PROJECT_STAGES.includes(project.currentStage)) {
            throw new BadRequestException(`Project ${projectId} cannot record bid commercial process in stage ${project.currentStage}`);
        }

        this.assertBidCommercialPathConsistent(input);

        const previousProcess = await this.projectRepository.findCurrentProjectBidCommercialProcessByProjectId(projectId);
        if (previousProcess) {
            previousProcess.isCurrent = false;
            previousProcess.status = 'superseded';
            previousProcess.updatedBy = operatorUserId;
        }

        const currentProcessId = randomUUID();
        const currentProcess = this.projectRepository.createProjectBidCommercialProcess({
            id: currentProcessId,
            projectId,
            version: previousProcess ? previousProcess.version + 1 : 1,
            isCurrent: true,
            supersedesId: previousProcess?.id ?? null,
            status: 'effective',
            bidMode: input.bidMode,
            currentStage: input.currentStage,
            decision: input.decision,
            resultStatus: input.resultStatus,
            processSummary: input.processSummary,
            decisionSummary: input.decisionSummary ?? null,
            resultSummary: input.resultSummary ?? null,
            tenderNo: input.tenderNo?.trim() || null,
            bidPackageNo: input.bidPackageNo?.trim() || null,
            ownerRole: input.ownerRole ?? null,
            blockerCount: this.countBidCommercialBlockers(input),
            effectiveAt: new Date(),
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });
        const materialItems = input.materialItems.map((item, index) =>
            this.projectRepository.createProjectBidCommercialMaterialItem({
                processId: currentProcessId,
                materialKey: item.materialKey,
                label: item.label,
                materialStatus: item.materialStatus,
                responsibleRole: item.responsibleRole ?? null,
                dueAt: item.dueAt ? new Date(item.dueAt) : null,
                blocksNextStep: item.blocksNextStep ?? false,
                navigationHint: item.navigationHint ?? null,
                sortOrder: item.sortOrder ?? index + 1
            })
        );
        const timelineItems = input.timelineItems.map((item, index) =>
            this.projectRepository.createProjectBidCommercialTimelineItem({
                processId: currentProcessId,
                eventKey: item.eventKey,
                label: item.label,
                summary: item.summary ?? null,
                timelineStatus: item.timelineStatus,
                occurredAt: item.occurredAt ? new Date(item.occurredAt) : null,
                dueAt: item.dueAt ? new Date(item.dueAt) : null,
                responsibleRole: item.responsibleRole ?? null,
                sortOrder: item.sortOrder ?? index + 1
            })
        );

        await this.projectRepository.saveProjectBidCommercialProcess({
            currentProcess,
            previousProcess,
            materialItems,
            timelineItems
        });

        return currentProcess;
    }

    async createProjectPricingMarginReview(projectId: string, input: CreateProjectPricingMarginReviewRequest, operatorUserId: string): Promise<ProjectPricingMarginReview> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        if (project.status === ProjectStatusValue.Closed || !PRICING_MARGIN_ALLOWED_PROJECT_STAGES.includes(project.currentStage)) {
            throw new BadRequestException(`Project ${projectId} cannot record pricing margin review in stage ${project.currentStage}`);
        }

        const currentTechnicalCostPackage = await this.projectRepository.findCurrentProjectTechnicalCostPackageByProjectId(projectId);
        if (!currentTechnicalCostPackage || currentTechnicalCostPackage.id !== input.technicalCostPackageId) {
            throw new BadRequestException('technicalCostPackageId must match the current effective technical cost package');
        }

        if (currentTechnicalCostPackage.currencyCode !== input.currencyCode) {
            throw new BadRequestException(`currencyCode must equal technical cost package currencyCode ${currentTechnicalCostPackage.currencyCode}`);
        }

        const currentBidCommercialProcess = await this.projectRepository.findCurrentProjectBidCommercialProcessByProjectId(projectId);
        this.assertPricingMarginReferencesConsistent(input, currentBidCommercialProcess);
        this.assertPricingAmounts(input);

        const previousReview = await this.projectRepository.findCurrentProjectPricingMarginReviewByProjectId(projectId);
        if (previousReview) {
            previousReview.isCurrent = false;
            previousReview.status = 'superseded';
            previousReview.updatedBy = operatorUserId;
        }

        const reviewId = randomUUID();
        const blockerCount = this.countPricingMarginBlockers(input);
        const readyForContracting = ['released', 'conditional-release'].includes(input.decision) && blockerCount === 0;
        const currentReview = this.projectRepository.createProjectPricingMarginReview({
            id: reviewId,
            projectId,
            version: previousReview ? previousReview.version + 1 : 1,
            isCurrent: true,
            supersedesId: previousReview?.id ?? null,
            status: 'effective',
            technicalCostPackageId: input.technicalCostPackageId,
            bidCommercialProcessId: input.bidCommercialProcessId ?? null,
            commercialReleaseBaselineId: input.commercialReleaseBaselineId ?? null,
            pricingPath: input.pricingPath,
            quoteVersion: input.quoteVersion,
            currencyCode: input.currencyCode,
            quoteAmountTaxInclusive: this.formatMoney(this.parseNonNegativeDecimal(input.quoteAmountTaxInclusive, 'quoteAmountTaxInclusive')),
            quoteAmountTaxExclusive: this.formatMoney(this.parseNonNegativeDecimal(input.quoteAmountTaxExclusive, 'quoteAmountTaxExclusive')),
            taxRate: input.taxRate,
            taxConditionSummary: input.taxConditionSummary,
            paymentTermsSummary: input.paymentTermsSummary,
            grossMarginRate: input.grossMarginRate ?? null,
            grossMarginBand: input.grossMarginBand,
            grossMarginSummary: input.grossMarginSummary,
            decision: input.decision,
            decisionSummary: input.decisionSummary,
            approvalScenarioKey: input.approvalScenarioKey ?? null,
            summaryPackageKey: input.summaryPackageKey ?? null,
            summarySnapshotId: input.summarySnapshotId ?? null,
            projectionLevel: input.projectionLevel ?? null,
            exportPolicy: input.exportPolicy ?? null,
            readyForContracting,
            ownerRole: input.ownerRole ?? null,
            blockerCount,
            effectiveAt: new Date(),
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });
        const conditionItems = input.conditionItems.map((item, index) =>
            this.projectRepository.createProjectPricingMarginConditionItem({
                reviewId,
                conditionKey: item.conditionKey,
                conditionType: item.conditionType,
                label: item.label,
                conditionSummary: item.conditionSummary,
                conditionStatus: item.conditionStatus,
                requiredForContracting: item.requiredForContracting ?? false,
                responsibleRole: item.responsibleRole ?? null,
                dueAt: item.dueAt ? new Date(item.dueAt) : null,
                resolutionSummary: item.resolutionSummary ?? null,
                sortOrder: item.sortOrder ?? index + 1
            })
        );

        await this.projectRepository.saveProjectPricingMarginReview({
            currentReview,
            previousReview,
            conditionItems
        });

        return currentReview;
    }

    async createProjectTechnicalCostPackage(projectId: string, input: CreateProjectTechnicalCostPackageRequest, operatorUserId: string): Promise<ProjectTechnicalCostPackage> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        if (project.status === ProjectStatusValue.Closed || !TECHNICAL_COST_ALLOWED_PROJECT_STAGES.includes(project.currentStage)) {
            throw new BadRequestException(`Project ${projectId} cannot record technical cost package in stage ${project.currentStage}`);
        }

        for (const [index, item] of input.costItems.entries()) {
            if (item.currencyCode !== input.currencyCode) {
                throw new BadRequestException(`costItems[${index}].currencyCode must equal package currencyCode ${input.currencyCode}`);
            }

            this.assertMoneyConsistent(item.amountExcludingTax, item.taxCostAmount, item.amountIncludingTax, `costItems[${index}]`);
        }

        const previousPackage = await this.projectRepository.findCurrentProjectTechnicalCostPackageByProjectId(projectId);
        if (previousPackage) {
            previousPackage.isCurrent = false;
            previousPackage.status = 'superseded';
            previousPackage.updatedBy = operatorUserId;
        }

        const totals = input.costItems.reduce(
            (sum, item) => ({
                amountExcludingTax: sum.amountExcludingTax + this.parseNonNegativeDecimal(item.amountExcludingTax, 'amountExcludingTax'),
                taxCostAmount: sum.taxCostAmount + this.parseNonNegativeDecimal(item.taxCostAmount, 'taxCostAmount'),
                amountIncludingTax: sum.amountIncludingTax + this.parseNonNegativeDecimal(item.amountIncludingTax, 'amountIncludingTax')
            }),
            {
                amountExcludingTax: 0,
                taxCostAmount: 0,
                amountIncludingTax: 0
            }
        );
        const highestRiskLevel = this.resolveHighestRiskLevel(input.riskItems.map((item) => item.riskLevel));
        const blockerCount = input.riskItems.filter((item) => item.blocksNextStage && item.riskStatus !== 'closed').length + (input.allowNextStage ? 0 : 1);
        const now = new Date();
        const currentPackageId = randomUUID();
        const currentPackage = this.projectRepository.createProjectTechnicalCostPackage({
            id: currentPackageId,
            projectId,
            version: previousPackage ? previousPackage.version + 1 : 1,
            isCurrent: true,
            supersedesId: previousPackage?.id ?? null,
            status: 'effective',
            technicalFeasibilityDecision: input.technicalFeasibilityDecision,
            technicalConclusionSummary: input.technicalConclusionSummary,
            allowNextStage: input.allowNextStage,
            currencyCode: input.currencyCode,
            totalEstimatedAmountExcludingTax: this.formatMoney(totals.amountExcludingTax),
            totalTaxCostAmount: this.formatMoney(totals.taxCostAmount),
            totalEstimatedAmountIncludingTax: this.formatMoney(totals.amountIncludingTax),
            taxAssumptionSummary: input.taxAssumptionSummary,
            taxReviewStatus: input.taxReviewStatus,
            highestRiskLevel,
            blockerCount,
            effectiveAt: now,
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });
        const scopeItems = input.scopeItems.map((item, index) =>
            this.projectRepository.createProjectTechnicalScopeItem({
                packageId: currentPackageId,
                scopeType: item.scopeType,
                label: item.label,
                description: item.description,
                sortOrder: item.sortOrder ?? index + 1
            })
        );
        const riskItems = input.riskItems.map((item, index) =>
            this.projectRepository.createProjectTechnicalRiskItem({
                packageId: currentPackageId,
                riskCategory: item.riskCategory,
                riskLevel: item.riskLevel,
                riskDescription: item.riskDescription,
                impactScope: item.impactScope,
                mitigationPlan: item.mitigationPlan,
                ownerRole: item.ownerRole,
                riskStatus: item.riskStatus,
                blocksNextStage: item.blocksNextStage,
                sortOrder: item.sortOrder ?? index + 1
            })
        );
        const costItems = input.costItems.map((item, index) =>
            this.projectRepository.createProjectTechnicalCostItem({
                packageId: currentPackageId,
                costCategory: item.costCategory,
                costSubcategory: item.costSubcategory ?? null,
                costDescription: item.costDescription,
                estimationBasis: item.estimationBasis,
                quantity: item.quantity ?? null,
                unit: item.unit ?? null,
                unitPrice: item.unitPrice ?? null,
                amountExcludingTax: this.formatMoney(this.parseNonNegativeDecimal(item.amountExcludingTax, 'amountExcludingTax')),
                taxCostAmount: this.formatMoney(this.parseNonNegativeDecimal(item.taxCostAmount, 'taxCostAmount')),
                amountIncludingTax: this.formatMoney(this.parseNonNegativeDecimal(item.amountIncludingTax, 'amountIncludingTax')),
                currencyCode: item.currencyCode,
                confidenceLevel: item.confidenceLevel,
                highUncertainty: item.highUncertainty,
                responsibleRole: item.responsibleRole ?? null,
                sortOrder: item.sortOrder ?? index + 1
            })
        );

        await this.projectRepository.saveProjectTechnicalCostPackage({
            currentPackage,
            previousPackage,
            scopeItems,
            riskItems,
            costItems
        });

        return currentPackage;
    }

    private assertBidCommercialPathConsistent(input: CreateProjectBidCommercialProcessRequest): void {
        if (input.bidMode === 'not-required') {
            if (input.decision !== 'not-required' || input.resultStatus !== 'not-applicable') {
                throw new BadRequestException('not-required bidMode must use not-required decision and not-applicable resultStatus');
            }
            return;
        }

        if (input.decision === 'not-required') {
            throw new BadRequestException('not-required decision requires not-required bidMode');
        }

        if (input.resultStatus === 'not-applicable') {
            throw new BadRequestException('not-applicable resultStatus requires not-required bidMode');
        }
    }

    private countBidCommercialBlockers(input: CreateProjectBidCommercialProcessRequest): number {
        const materialBlockers = input.materialItems.filter((item) => item.blocksNextStep && !['ready', 'not-required'].includes(item.materialStatus)).length;
        const decisionBlocker = input.decision === 'pending' || input.decision === 'no-bid' ? 1 : 0;
        const resultBlocker = ['lost', 'cancelled'].includes(input.resultStatus) ? 1 : 0;

        return materialBlockers + decisionBlocker + resultBlocker;
    }

    private assertPricingMarginReferencesConsistent(input: CreateProjectPricingMarginReviewRequest, currentBidCommercialProcess: ProjectBidCommercialProcess | null): void {
        if (input.pricingPath === 'bid') {
            if (!input.bidCommercialProcessId) {
                throw new BadRequestException('bid pricingPath requires bidCommercialProcessId');
            }

            if (!currentBidCommercialProcess || currentBidCommercialProcess.id !== input.bidCommercialProcessId) {
                throw new BadRequestException('bidCommercialProcessId must match the current effective bid commercial process');
            }

            if (['lost', 'cancelled', 'not-applicable'].includes(currentBidCommercialProcess.resultStatus)) {
                throw new BadRequestException('current bid commercial process result cannot support bid pricing review');
            }
        }

        if (input.pricingPath === 'direct-commercial' && input.bidCommercialProcessId) {
            if (!currentBidCommercialProcess || currentBidCommercialProcess.id !== input.bidCommercialProcessId) {
                throw new BadRequestException('bidCommercialProcessId must match the current effective bid commercial process');
            }

            if (!['direct-commercial', 'not-required'].includes(currentBidCommercialProcess.bidMode)) {
                throw new BadRequestException('direct-commercial pricingPath can only reference a direct-commercial or not-required process');
            }
        }

        if (['released', 'conditional-release', 'escalation-required'].includes(input.decision)) {
            const missingApprovalReference = [input.commercialReleaseBaselineId, input.approvalScenarioKey, input.summaryPackageKey, input.summarySnapshotId, input.projectionLevel, input.exportPolicy].some((value) => !value);

            if (missingApprovalReference) {
                throw new BadRequestException('released, conditional-release and escalation-required decisions require commercial baseline and approval summary references');
            }
        }

        if (input.decision === 'rejected' && input.commercialReleaseBaselineId) {
            throw new BadRequestException('rejected decision must not reference a commercial release baseline');
        }
    }

    private assertPricingAmounts(input: CreateProjectPricingMarginReviewRequest): void {
        const taxInclusive = this.parseNonNegativeDecimal(input.quoteAmountTaxInclusive, 'quoteAmountTaxInclusive');
        const taxExclusive = this.parseNonNegativeDecimal(input.quoteAmountTaxExclusive, 'quoteAmountTaxExclusive');
        this.parseNonNegativeDecimal(input.taxRate, 'taxRate');

        if (taxInclusive + 0.0001 < taxExclusive) {
            throw new BadRequestException('quoteAmountTaxInclusive must be greater than or equal to quoteAmountTaxExclusive');
        }

        if (input.grossMarginRate !== null && input.grossMarginRate !== undefined) {
            this.parseSignedDecimal(input.grossMarginRate, 'grossMarginRate');
        }
    }

    private countPricingMarginBlockers(input: CreateProjectPricingMarginReviewRequest): number {
        const conditionBlockers = input.conditionItems.filter((item) => item.requiredForContracting && item.conditionStatus === 'open').length;
        const decisionBlocker = ['pending', 'rejected', 'escalation-required'].includes(input.decision) ? 1 : 0;

        return conditionBlockers + decisionBlocker;
    }

    private assertMoneyConsistent(amountExcludingTax: string, taxCostAmount: string, amountIncludingTax: string, fieldPrefix: string): void {
        const excluding = this.parseNonNegativeDecimal(amountExcludingTax, `${fieldPrefix}.amountExcludingTax`);
        const tax = this.parseNonNegativeDecimal(taxCostAmount, `${fieldPrefix}.taxCostAmount`);
        const including = this.parseNonNegativeDecimal(amountIncludingTax, `${fieldPrefix}.amountIncludingTax`);

        if (Math.abs(including - (excluding + tax)) > 0.0001) {
            throw new BadRequestException(`${fieldPrefix}.amountIncludingTax must equal amountExcludingTax + taxCostAmount`);
        }
    }

    private parseNonNegativeDecimal(value: string | number, fieldName: string): number {
        const parsed = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            throw new BadRequestException(`${fieldName} must be a non-negative decimal`);
        }

        return parsed;
    }

    private parseSignedDecimal(value: string | number, fieldName: string): number {
        const parsed = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(parsed)) {
            throw new BadRequestException(`${fieldName} must be a decimal`);
        }

        return parsed;
    }

    private formatMoney(value: number): string {
        return value.toFixed(2);
    }

    private async assertNoCurrentArchiveRecord(projectId: string): Promise<void> {
        const currentArchiveRecord = await this.projectRepository.findLatestRecordedProjectArchiveRecordByProjectId(projectId);
        if (currentArchiveRecord) {
            throw new ConflictException(`Project ${projectId} already has current archive record ${currentArchiveRecord.id}; use replaceProjectArchiveRecord instead`);
        }
    }

    private assertExpectedVersion(currentVersion: number, expectedVersion: number | undefined, targetType: string): void {
        if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
            throw new ConflictException(`${targetType} version ${expectedVersion} does not match current version ${currentVersion}`);
        }
    }

    private mapProjectOwnerReassignmentResult(project: Project, record: ProjectOwnerReassignmentRecord): ProjectOwnerReassignmentResult {
        return {
            targetId: project.id,
            projectOwnerReassignmentRecordId: record.id,
            previousOwnerUserId: record.previousOwnerUserId ?? null,
            previousOwnerOrgId: record.previousOwnerOrgId ?? null,
            newOwnerUserId: record.newOwnerUserId,
            newOwnerOrgId: record.newOwnerOrgId ?? null,
            businessStatusAfter: project.status
        };
    }

    private appendComment(value: string, comment: string | null | undefined): string {
        const suffix = comment?.trim();
        return suffix ? `${value}: ${suffix}` : value;
    }

    private resolveHighestRiskLevel(riskLevels: PreSigningRiskLevel[]): PreSigningRiskLevel | null {
        return riskLevels.reduce<PreSigningRiskLevel | null>((highest, current) => {
            if (!highest || RISK_LEVEL_WEIGHT[current] > RISK_LEVEL_WEIGHT[highest]) {
                return current;
            }

            return highest;
        }, null);
    }
}
