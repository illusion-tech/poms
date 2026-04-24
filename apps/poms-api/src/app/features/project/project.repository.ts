import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Contract } from '../contract/contract.entity';
import { Lead } from '../lead/lead.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { ProjectHandover } from '../project-handover/project-handover.entity';
import { AcceptanceRecord } from './acceptance-record.entity';
import { ProjectArchiveRecord } from './project-archive-record.entity';
import {
    ProjectBidCommercialMaterialItem,
    ProjectBidCommercialProcess,
    ProjectBidCommercialTimelineItem
} from './project-bid-commercial-process.entity';
import { ProjectCompletionRecord } from './project-completion-record.entity';
import {
    ProjectPricingMarginConditionItem,
    ProjectPricingMarginReview
} from './project-pricing-margin-review.entity';
import {
    ProjectTechnicalCostItem,
    ProjectTechnicalCostPackage,
    ProjectTechnicalRiskItem,
    ProjectTechnicalScopeItem
} from './project-technical-cost-package.entity';
import { Project } from './project.entity';

@Injectable()
export class ProjectRepository {
    constructor(
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>,
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>,
        @InjectRepository(PlatformUser)
        private readonly platformUserRepository: EntityRepository<PlatformUser>,
        @InjectRepository(OrgUnit)
        private readonly orgUnitRepository: EntityRepository<OrgUnit>,
        @InjectRepository(Contract)
        private readonly contractRepository: EntityRepository<Contract>,
        @InjectRepository(ProjectHandover)
        private readonly projectHandoverRepository: EntityRepository<ProjectHandover>,
        @InjectRepository(AcceptanceRecord)
        private readonly acceptanceRecordRepository: EntityRepository<AcceptanceRecord>,
        @InjectRepository(ProjectCompletionRecord)
        private readonly projectCompletionRecordRepository: EntityRepository<ProjectCompletionRecord>,
        @InjectRepository(ProjectArchiveRecord)
        private readonly projectArchiveRecordRepository: EntityRepository<ProjectArchiveRecord>,
        @InjectRepository(ProjectBidCommercialProcess)
        private readonly projectBidCommercialProcessRepository: EntityRepository<ProjectBidCommercialProcess>,
        @InjectRepository(ProjectBidCommercialMaterialItem)
        private readonly projectBidCommercialMaterialItemRepository: EntityRepository<ProjectBidCommercialMaterialItem>,
        @InjectRepository(ProjectBidCommercialTimelineItem)
        private readonly projectBidCommercialTimelineItemRepository: EntityRepository<ProjectBidCommercialTimelineItem>,
        @InjectRepository(ProjectPricingMarginReview)
        private readonly projectPricingMarginReviewRepository: EntityRepository<ProjectPricingMarginReview>,
        @InjectRepository(ProjectPricingMarginConditionItem)
        private readonly projectPricingMarginConditionItemRepository: EntityRepository<ProjectPricingMarginConditionItem>,
        @InjectRepository(ProjectTechnicalCostPackage)
        private readonly projectTechnicalCostPackageRepository: EntityRepository<ProjectTechnicalCostPackage>,
        @InjectRepository(ProjectTechnicalScopeItem)
        private readonly projectTechnicalScopeItemRepository: EntityRepository<ProjectTechnicalScopeItem>,
        @InjectRepository(ProjectTechnicalRiskItem)
        private readonly projectTechnicalRiskItemRepository: EntityRepository<ProjectTechnicalRiskItem>,
        @InjectRepository(ProjectTechnicalCostItem)
        private readonly projectTechnicalCostItemRepository: EntityRepository<ProjectTechnicalCostItem>
    ) {}

    async findAll(): Promise<Project[]> {
        return this.projectRepository.findAll({
            orderBy: { createdAt: QueryOrder.DESC }
        });
    }

    async findMany(input: {
        status?: string;
        currentStage?: string;
        ownerOrgId?: string;
        keyword?: string;
    }): Promise<Project[]> {
        const where: FilterQuery<Project> = {};

        if (input.status) {
            where.status = input.status;
        }

        if (input.currentStage) {
            where.currentStage = input.currentStage;
        }

        if (input.ownerOrgId) {
            where.ownerOrgId = input.ownerOrgId;
        }

        if (input.keyword) {
            (where as FilterQuery<Project> & { $or?: FilterQuery<Project>[] }).$or = [
                { projectCode: { $ilike: `%${input.keyword}%` } },
                { projectName: { $ilike: `%${input.keyword}%` } }
            ];
        }

        return this.projectRepository.find(where, {
            orderBy: { createdAt: QueryOrder.DESC }
        });
    }

    async findById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
    }

    async findByIds(ids: string[]): Promise<Project[]> {
        if (ids.length === 0) {
            return [];
        }
        return this.projectRepository.find({ id: { $in: ids } });
    }

    async findByCode(projectCode: string): Promise<Project | null> {
        return this.projectRepository.findOne({ projectCode });
    }

    async findLeadsByIds(ids: string[]): Promise<Lead[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.leadRepository.find({ id: { $in: ids } });
    }

    async findPlatformUserById(id: string): Promise<PlatformUser | null> {
        return this.platformUserRepository.findOne({ id });
    }

    async findPlatformUsersByIds(ids: string[]): Promise<PlatformUser[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.platformUserRepository.find({ id: { $in: ids } });
    }

    async findOrgUnitsByIds(ids: string[]): Promise<OrgUnit[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.orgUnitRepository.find({ id: { $in: ids } });
    }

    async findLatestSignedContractAtByProjectIds(projectIds: string[]): Promise<Map<string, Date>> {
        if (projectIds.length === 0) {
            return new Map();
        }

        const contracts = await this.contractRepository.find(
            {
                projectId: { $in: projectIds },
                signedAt: { $ne: null }
            },
            {
                orderBy: { signedAt: QueryOrder.DESC, updatedAt: QueryOrder.DESC }
            }
        );

        const latestSignedAtByProjectId = new Map<string, Date>();
        for (const contract of contracts) {
            if (!contract.signedAt || latestSignedAtByProjectId.has(contract.projectId)) {
                continue;
            }

            latestSignedAtByProjectId.set(contract.projectId, contract.signedAt);
        }

        return latestSignedAtByProjectId;
    }

    async findContractsByProjectId(projectId: string): Promise<Contract[]> {
        return this.contractRepository.find(
            { projectId },
            {
                orderBy: { signedAt: QueryOrder.DESC, updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findLatestConfirmedHandoverByProjectId(projectId: string): Promise<ProjectHandover | null> {
        return this.projectHandoverRepository.findOne(
            {
                projectId,
                status: 'confirmed',
                confirmedAt: { $ne: null }
            },
            {
                orderBy: { confirmedAt: QueryOrder.DESC, updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findAcceptanceRecordsByProjectId(projectId: string): Promise<AcceptanceRecord[]> {
        return this.acceptanceRecordRepository.find(
            { projectId },
            {
                orderBy: { confirmedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findAcceptanceRecordById(id: string): Promise<AcceptanceRecord | null> {
        return this.acceptanceRecordRepository.findOne({ id });
    }

    async findLatestAcceptedAcceptanceRecordByProjectId(projectId: string): Promise<AcceptanceRecord | null> {
        return this.acceptanceRecordRepository.findOne(
            {
                projectId,
                status: 'confirmed',
                acceptanceResult: { $in: ['accepted', 'conditional'] },
                confirmedAt: { $ne: null }
            },
            {
                orderBy: { confirmedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findProjectCompletionRecordsByProjectId(projectId: string): Promise<ProjectCompletionRecord[]> {
        return this.projectCompletionRecordRepository.find(
            { projectId },
            {
                orderBy: { completedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findLatestConfirmedProjectCompletionRecordByProjectId(projectId: string): Promise<ProjectCompletionRecord | null> {
        return this.projectCompletionRecordRepository.findOne(
            {
                projectId,
                status: 'confirmed',
                completedAt: { $ne: null }
            },
            {
                orderBy: { completedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findProjectArchiveRecordsByProjectId(projectId: string): Promise<ProjectArchiveRecord[]> {
        return this.projectArchiveRecordRepository.find(
            { projectId },
            {
                orderBy: { archivedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findLatestRecordedProjectArchiveRecordByProjectId(projectId: string): Promise<ProjectArchiveRecord | null> {
        return this.projectArchiveRecordRepository.findOne(
            {
                projectId,
                status: 'recorded',
                archivedAt: { $ne: null }
            },
            {
                orderBy: { archivedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findProjectBidCommercialProcessesByProjectId(projectId: string): Promise<ProjectBidCommercialProcess[]> {
        return this.projectBidCommercialProcessRepository.find(
            { projectId },
            {
                orderBy: { version: QueryOrder.DESC, effectiveAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findCurrentProjectBidCommercialProcessByProjectId(projectId: string): Promise<ProjectBidCommercialProcess | null> {
        return this.projectBidCommercialProcessRepository.findOne(
            {
                projectId,
                isCurrent: true,
                status: 'effective'
            },
            {
                orderBy: { version: QueryOrder.DESC, effectiveAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findProjectBidCommercialProcessById(id: string): Promise<ProjectBidCommercialProcess | null> {
        return this.projectBidCommercialProcessRepository.findOne({ id });
    }

    async findProjectBidCommercialMaterialItemsByProcessIds(processIds: string[]): Promise<ProjectBidCommercialMaterialItem[]> {
        if (processIds.length === 0) {
            return [];
        }

        return this.projectBidCommercialMaterialItemRepository.find(
            { processId: { $in: processIds } },
            { orderBy: { processId: QueryOrder.ASC, sortOrder: QueryOrder.ASC } }
        );
    }

    async findProjectBidCommercialTimelineItemsByProcessIds(processIds: string[]): Promise<ProjectBidCommercialTimelineItem[]> {
        if (processIds.length === 0) {
            return [];
        }

        return this.projectBidCommercialTimelineItemRepository.find(
            { processId: { $in: processIds } },
            { orderBy: { processId: QueryOrder.ASC, sortOrder: QueryOrder.ASC } }
        );
    }

    async findProjectTechnicalCostPackagesByProjectId(projectId: string): Promise<ProjectTechnicalCostPackage[]> {
        return this.projectTechnicalCostPackageRepository.find(
            { projectId },
            {
                orderBy: { version: QueryOrder.DESC, effectiveAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findProjectTechnicalCostPackageById(id: string): Promise<ProjectTechnicalCostPackage | null> {
        return this.projectTechnicalCostPackageRepository.findOne({ id });
    }

    async findCurrentProjectTechnicalCostPackageByProjectId(projectId: string): Promise<ProjectTechnicalCostPackage | null> {
        return this.projectTechnicalCostPackageRepository.findOne(
            {
                projectId,
                isCurrent: true,
                status: 'effective'
            },
            {
                orderBy: { version: QueryOrder.DESC, effectiveAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findProjectPricingMarginReviewsByProjectId(projectId: string): Promise<ProjectPricingMarginReview[]> {
        return this.projectPricingMarginReviewRepository.find(
            { projectId },
            {
                orderBy: { version: QueryOrder.DESC, effectiveAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findCurrentProjectPricingMarginReviewByProjectId(projectId: string): Promise<ProjectPricingMarginReview | null> {
        return this.projectPricingMarginReviewRepository.findOne(
            {
                projectId,
                isCurrent: true,
                status: 'effective'
            },
            {
                orderBy: { version: QueryOrder.DESC, effectiveAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findProjectPricingMarginConditionItemsByReviewIds(reviewIds: string[]): Promise<ProjectPricingMarginConditionItem[]> {
        if (reviewIds.length === 0) {
            return [];
        }

        return this.projectPricingMarginConditionItemRepository.find(
            { reviewId: { $in: reviewIds } },
            { orderBy: { reviewId: QueryOrder.ASC, sortOrder: QueryOrder.ASC } }
        );
    }

    async findProjectTechnicalScopeItemsByPackageIds(packageIds: string[]): Promise<ProjectTechnicalScopeItem[]> {
        if (packageIds.length === 0) {
            return [];
        }

        return this.projectTechnicalScopeItemRepository.find(
            { packageId: { $in: packageIds } },
            { orderBy: { packageId: QueryOrder.ASC, sortOrder: QueryOrder.ASC } }
        );
    }

    async findProjectTechnicalRiskItemsByPackageIds(packageIds: string[]): Promise<ProjectTechnicalRiskItem[]> {
        if (packageIds.length === 0) {
            return [];
        }

        return this.projectTechnicalRiskItemRepository.find(
            { packageId: { $in: packageIds } },
            { orderBy: { packageId: QueryOrder.ASC, sortOrder: QueryOrder.ASC } }
        );
    }

    async findProjectTechnicalCostItemsByPackageIds(packageIds: string[]): Promise<ProjectTechnicalCostItem[]> {
        if (packageIds.length === 0) {
            return [];
        }

        return this.projectTechnicalCostItemRepository.find(
            { packageId: { $in: packageIds } },
            { orderBy: { packageId: QueryOrder.ASC, sortOrder: QueryOrder.ASC } }
        );
    }

    create(input: ConstructorParameters<typeof Project>[0]): Project {
        return this.projectRepository.create(input);
    }

    createAcceptanceRecord(input: ConstructorParameters<typeof AcceptanceRecord>[0]): AcceptanceRecord {
        return this.acceptanceRecordRepository.create(input);
    }

    createProjectCompletionRecord(input: ConstructorParameters<typeof ProjectCompletionRecord>[0]): ProjectCompletionRecord {
        return this.projectCompletionRecordRepository.create(input);
    }

    createProjectArchiveRecord(input: ConstructorParameters<typeof ProjectArchiveRecord>[0]): ProjectArchiveRecord {
        return this.projectArchiveRecordRepository.create(input);
    }

    createProjectBidCommercialProcess(input: ConstructorParameters<typeof ProjectBidCommercialProcess>[0]): ProjectBidCommercialProcess {
        return this.projectBidCommercialProcessRepository.create(input);
    }

    createProjectBidCommercialMaterialItem(input: ConstructorParameters<typeof ProjectBidCommercialMaterialItem>[0]): ProjectBidCommercialMaterialItem {
        return this.projectBidCommercialMaterialItemRepository.create(input);
    }

    createProjectBidCommercialTimelineItem(input: ConstructorParameters<typeof ProjectBidCommercialTimelineItem>[0]): ProjectBidCommercialTimelineItem {
        return this.projectBidCommercialTimelineItemRepository.create(input);
    }

    createProjectPricingMarginReview(input: ConstructorParameters<typeof ProjectPricingMarginReview>[0]): ProjectPricingMarginReview {
        return this.projectPricingMarginReviewRepository.create(input);
    }

    createProjectPricingMarginConditionItem(
        input: ConstructorParameters<typeof ProjectPricingMarginConditionItem>[0]
    ): ProjectPricingMarginConditionItem {
        return this.projectPricingMarginConditionItemRepository.create(input);
    }

    createProjectTechnicalCostPackage(input: ConstructorParameters<typeof ProjectTechnicalCostPackage>[0]): ProjectTechnicalCostPackage {
        return this.projectTechnicalCostPackageRepository.create(input);
    }

    createProjectTechnicalScopeItem(input: ConstructorParameters<typeof ProjectTechnicalScopeItem>[0]): ProjectTechnicalScopeItem {
        return this.projectTechnicalScopeItemRepository.create(input);
    }

    createProjectTechnicalRiskItem(input: ConstructorParameters<typeof ProjectTechnicalRiskItem>[0]): ProjectTechnicalRiskItem {
        return this.projectTechnicalRiskItemRepository.create(input);
    }

    createProjectTechnicalCostItem(input: ConstructorParameters<typeof ProjectTechnicalCostItem>[0]): ProjectTechnicalCostItem {
        return this.projectTechnicalCostItemRepository.create(input);
    }

    async save(project: Project): Promise<void> {
        await this.projectRepository.getEntityManager().persist(project).flush();
    }

    async saveAcceptanceRecord(record: AcceptanceRecord): Promise<void> {
        await this.acceptanceRecordRepository.getEntityManager().persist(record).flush();
    }

    async saveProjectCompletionRecord(record: ProjectCompletionRecord, project: Project): Promise<void> {
        await this.projectCompletionRecordRepository.getEntityManager().persist([record, project]).flush();
    }

    async saveProjectArchiveRecord(record: ProjectArchiveRecord): Promise<void> {
        await this.projectArchiveRecordRepository.getEntityManager().persist(record).flush();
    }

    async saveProjectBidCommercialProcess(input: {
        currentProcess: ProjectBidCommercialProcess;
        previousProcess: ProjectBidCommercialProcess | null;
        materialItems: ProjectBidCommercialMaterialItem[];
        timelineItems: ProjectBidCommercialTimelineItem[];
    }): Promise<void> {
        const entities = [
            input.currentProcess,
            ...input.materialItems,
            ...input.timelineItems
        ];
        if (input.previousProcess) {
            entities.push(input.previousProcess);
        }

        await this.projectBidCommercialProcessRepository.getEntityManager().persist(entities).flush();
    }

    async saveProjectPricingMarginReview(input: {
        currentReview: ProjectPricingMarginReview;
        previousReview: ProjectPricingMarginReview | null;
        conditionItems: ProjectPricingMarginConditionItem[];
    }): Promise<void> {
        const entities: object[] = [input.currentReview, ...input.conditionItems];
        if (input.previousReview) {
            entities.push(input.previousReview);
        }

        await this.projectPricingMarginReviewRepository.getEntityManager().persist(entities).flush();
    }

    async saveProjectTechnicalCostPackage(input: {
        currentPackage: ProjectTechnicalCostPackage;
        previousPackage: ProjectTechnicalCostPackage | null;
        scopeItems: ProjectTechnicalScopeItem[];
        riskItems: ProjectTechnicalRiskItem[];
        costItems: ProjectTechnicalCostItem[];
    }): Promise<void> {
        const entities = [
            input.currentPackage,
            ...input.scopeItems,
            ...input.riskItems,
            ...input.costItems
        ];
        if (input.previousPackage) {
            entities.push(input.previousPackage);
        }

        await this.projectTechnicalCostPackageRepository.getEntityManager().persist(entities).flush();
    }
}
