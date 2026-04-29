import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpRecord } from './sales-follow-up-record.entity';

export interface SalesFollowUpRecordFilters {
    customerId?: string;
    leadId?: string;
    projectId?: string;
}

@Injectable()
export class SalesFollowUpRepository {
    constructor(
        @InjectRepository(SalesFollowUpRecord)
        private readonly followUpRepository: EntityRepository<SalesFollowUpRecord>,
        @InjectRepository(Customer)
        private readonly customerRepository: EntityRepository<Customer>,
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>,
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>,
        @InjectRepository(PlatformUser)
        private readonly platformUserRepository: EntityRepository<PlatformUser>,
        @InjectRepository(OrgUnit)
        private readonly orgUnitRepository: EntityRepository<OrgUnit>
    ) {}

    async findMany(filters: SalesFollowUpRecordFilters): Promise<SalesFollowUpRecord[]> {
        const where: FilterQuery<SalesFollowUpRecord> = {};
        const anchorFilters: FilterQuery<SalesFollowUpRecord>[] = [];

        if (filters.leadId) {
            anchorFilters.push({ leadId: filters.leadId });
        }

        if (filters.projectId) {
            anchorFilters.push({ projectId: filters.projectId });
        }

        if (filters.customerId) {
            where.customerId = filters.customerId;
        }

        if (anchorFilters.length > 0) {
            (where as FilterQuery<SalesFollowUpRecord> & { $or: FilterQuery<SalesFollowUpRecord>[] }).$or = anchorFilters;
        }

        return this.followUpRepository.find(where, {
            orderBy: { occurredAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
        });
    }

    create(input: ConstructorParameters<typeof SalesFollowUpRecord>[0]): SalesFollowUpRecord {
        return this.followUpRepository.create(input);
    }

    async save(record: SalesFollowUpRecord): Promise<void> {
        await this.followUpRepository.getEntityManager().persist(record).flush();
    }

    async findCustomerById(id: string): Promise<Customer | null> {
        return this.customerRepository.findOne({ id });
    }

    async findCustomersByIds(ids: string[]): Promise<Customer[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.customerRepository.find({ id: { $in: ids } });
    }

    async findLeadById(id: string): Promise<Lead | null> {
        return this.leadRepository.findOne({ id });
    }

    async findLeadsByIds(ids: string[]): Promise<Lead[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.leadRepository.find({ id: { $in: ids } });
    }

    async findProjectById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
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
}
