import { EntityManager, EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { LeadStatus } from '@poms/shared-contracts';
import type { LeadBudgetStatus, LeadRating, LeadSourceStatus, LeadUrgency } from '@poms/shared-contracts';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { Lead, LeadSource } from './lead.entity';
import { LeadOwnerAssignmentRecord } from './lead-owner-assignment-record.entity';

@Injectable()
export class LeadRepository {
    constructor(
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>,
        @InjectRepository(LeadSource)
        private readonly leadSourceRepository: EntityRepository<LeadSource>,
        @InjectRepository(LeadOwnerAssignmentRecord)
        private readonly leadOwnerAssignmentRecordRepository: EntityRepository<LeadOwnerAssignmentRecord>,
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>,
        @InjectRepository(PlatformUser)
        private readonly platformUserRepository: EntityRepository<PlatformUser>,
        @InjectRepository(OrgUnit)
        private readonly orgUnitRepository: EntityRepository<OrgUnit>
    ) {}

    async findMany(input: {
        status?: LeadStatus;
        sourceId?: string;
        budgetStatus?: LeadBudgetStatus;
        urgency?: LeadUrgency;
        rating?: LeadRating;
        ownerOrgId?: string;
        ownerUserId?: string;
        unassignedOnly?: boolean;
        keyword?: string;
    }): Promise<Lead[]> {
        const where: FilterQuery<Lead> = {};

        if (input.status) {
            where.status = input.status;
        }

        if (input.sourceId) {
            where.sourceId = input.sourceId;
        }

        if (input.budgetStatus) {
            where.budgetStatus = input.budgetStatus;
        }

        if (input.urgency) {
            where.urgency = input.urgency;
        }

        if (input.rating) {
            where.rating = input.rating;
        }

        if (input.ownerOrgId) {
            where.ownerOrgId = input.ownerOrgId;
        }

        if (input.ownerUserId) {
            where.ownerUserId = input.ownerUserId;
        }

        if (input.unassignedOnly) {
            where.ownerUserId = null;
        }

        if (input.keyword) {
            (where as FilterQuery<Lead> & { $or?: FilterQuery<Lead>[] }).$or = [
                { leadNo: { $ilike: `%${input.keyword}%` } },
                { leadName: { $ilike: `%${input.keyword}%` } },
                { customerName: { $ilike: `%${input.keyword}%` } },
                { sourceChannel: { $ilike: `%${input.keyword}%` } }
            ];
        }

        return this.leadRepository.find(where, {
            orderBy: { updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
        });
    }

    async findById(id: string): Promise<Lead | null> {
        return this.leadRepository.findOne({ id });
    }

    async findByNo(leadNo: string): Promise<Lead | null> {
        return this.leadRepository.findOne({ leadNo });
    }

    async findLeadSources(input: { status?: LeadSourceStatus; keyword?: string } = {}): Promise<LeadSource[]> {
        const where: FilterQuery<LeadSource> = {};

        if (input.status) {
            where.status = input.status;
        }

        if (input.keyword) {
            (where as FilterQuery<LeadSource> & { $or?: FilterQuery<LeadSource>[] }).$or = [
                { code: { $ilike: `%${input.keyword}%` } },
                { name: { $ilike: `%${input.keyword}%` } }
            ];
        }

        return this.leadSourceRepository.find(where, {
            orderBy: { sortOrder: QueryOrder.ASC, name: QueryOrder.ASC }
        });
    }

    async findLeadSourceById(id: string): Promise<LeadSource | null> {
        return this.leadSourceRepository.findOne({ id });
    }

    async findLeadSourceByCode(code: string): Promise<LeadSource | null> {
        return this.leadSourceRepository.findOne({ code });
    }

    async countLeadsBySourceIds(sourceIds: string[]): Promise<Map<string, number>> {
        if (sourceIds.length === 0) {
            return new Map();
        }

        const rows = (await this.leadRepository
            .getEntityManager()
            .getConnection()
            .execute(
                `
                    select "source_id", count(*)::text as "count"
                    from "poms"."lead"
                    where "source_id" in (?)
                    group by "source_id"
                `,
                [sourceIds]
            )) as Array<{ source_id: string; count: string }>;

        return new Map(rows.map((row) => [row.source_id, Number(row.count)]));
    }

    async findProjectByNo(projectNo: string): Promise<Project | null> {
        return this.projectRepository.findOne({ projectNo });
    }

    async findProjectsByIds(ids: string[]): Promise<Project[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.projectRepository.find({ id: { $in: ids } });
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

    async findOrgUnitById(id: string): Promise<OrgUnit | null> {
        return this.orgUnitRepository.findOne({ id });
    }

    async findOrgUnitsByIds(ids: string[]): Promise<OrgUnit[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.orgUnitRepository.find({ id: { $in: ids } });
    }

    create(input: ConstructorParameters<typeof Lead>[0]): Lead {
        return this.leadRepository.create(input);
    }

    createLeadSource(input: ConstructorParameters<typeof LeadSource>[0]): LeadSource {
        return this.leadSourceRepository.create(input);
    }

    createProject(input: ConstructorParameters<typeof Project>[0]): Project {
        return this.projectRepository.create(input);
    }

    createLeadOwnerAssignmentRecord(input: ConstructorParameters<typeof LeadOwnerAssignmentRecord>[0]): LeadOwnerAssignmentRecord {
        return this.leadOwnerAssignmentRecordRepository.create(input);
    }

    async save(lead: Lead): Promise<void> {
        await this.leadRepository.getEntityManager().persist(lead).flush();
    }

    async saveLeadSource(source: LeadSource): Promise<void> {
        await this.leadSourceRepository.getEntityManager().persist(source).flush();
    }

    async saveLeadAndProject(lead: Lead, project: Project): Promise<void> {
        await this.leadRepository.getEntityManager().persist([lead, project]).flush();
    }

    async saveLeadOwnerAssignment(input: { lead: Lead; record: LeadOwnerAssignmentRecord }): Promise<void> {
        await this.leadOwnerAssignmentRecordRepository.getEntityManager().persist([input.lead, input.record]).flush();
    }

    getEntityManager(): EntityManager {
        return this.leadRepository.getEntityManager();
    }
}
