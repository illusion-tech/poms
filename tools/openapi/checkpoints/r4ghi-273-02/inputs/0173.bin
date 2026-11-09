import { EntityManager, EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { LeadBudgetStatus, LeadRating, LeadUrgency } from '@poms/shared-contracts';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { Lead } from './lead.entity';
import { LeadOwnerAssignmentRecord } from './lead-owner-assignment-record.entity';

@Injectable()
export class LeadRepository {
    constructor(
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>,
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
        sourceCode?: string;
        budgetStatus?: LeadBudgetStatus;
        urgency?: LeadUrgency;
        rating?: LeadRating;
        ownerOrgId?: string;
        ownerUserId?: string;
        unassignedOnly?: boolean;
        keyword?: string;
    }): Promise<Lead[]> {
        const where: FilterQuery<Lead> = {};

        if (input.sourceCode) {
            where.sourceCode = input.sourceCode;
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
                { sourceCode: { $ilike: `%${input.keyword}%` } }
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

    createProject(input: ConstructorParameters<typeof Project>[0]): Project {
        return this.projectRepository.create(input);
    }

    createLeadOwnerAssignmentRecord(input: ConstructorParameters<typeof LeadOwnerAssignmentRecord>[0]): LeadOwnerAssignmentRecord {
        return this.leadOwnerAssignmentRecordRepository.create(input);
    }

    async save(lead: Lead): Promise<void> {
        await this.leadRepository.getEntityManager().persist(lead).flush();
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
