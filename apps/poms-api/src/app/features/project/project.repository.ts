import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Contract } from '../contract/contract.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { ProjectHandover } from '../project-handover/project-handover.entity';
import { AcceptanceRecord } from './acceptance-record.entity';
import { ProjectCompletionRecord } from './project-completion-record.entity';
import { Project } from './project.entity';

@Injectable()
export class ProjectRepository {
    constructor(
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>,
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
        private readonly projectCompletionRecordRepository: EntityRepository<ProjectCompletionRecord>
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

    create(input: ConstructorParameters<typeof Project>[0]): Project {
        return this.projectRepository.create(input);
    }

    createAcceptanceRecord(input: ConstructorParameters<typeof AcceptanceRecord>[0]): AcceptanceRecord {
        return this.acceptanceRecordRepository.create(input);
    }

    createProjectCompletionRecord(input: ConstructorParameters<typeof ProjectCompletionRecord>[0]): ProjectCompletionRecord {
        return this.projectCompletionRecordRepository.create(input);
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
}
