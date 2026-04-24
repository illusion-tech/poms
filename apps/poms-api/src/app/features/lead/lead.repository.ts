import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { LeadStatus } from '@poms/shared-contracts';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Lead } from './lead.entity';

@Injectable()
export class LeadRepository {
    constructor(
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>,
        @InjectRepository(PlatformUser)
        private readonly platformUserRepository: EntityRepository<PlatformUser>,
        @InjectRepository(OrgUnit)
        private readonly orgUnitRepository: EntityRepository<OrgUnit>
    ) {}

    async findMany(input: {
        status?: LeadStatus;
        ownerOrgId?: string;
        keyword?: string;
    }): Promise<Lead[]> {
        const where: FilterQuery<Lead> = {};

        if (input.status) {
            where.status = input.status;
        }

        if (input.ownerOrgId) {
            where.ownerOrgId = input.ownerOrgId;
        }

        if (input.keyword) {
            (where as FilterQuery<Lead> & { $or?: FilterQuery<Lead>[] }).$or = [
                { leadCode: { $ilike: `%${input.keyword}%` } },
                { leadName: { $ilike: `%${input.keyword}%` } },
                { customerName: { $ilike: `%${input.keyword}%` } }
            ];
        }

        return this.leadRepository.find(where, {
            orderBy: { updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
        });
    }

    async findById(id: string): Promise<Lead | null> {
        return this.leadRepository.findOne({ id });
    }

    async findByCode(leadCode: string): Promise<Lead | null> {
        return this.leadRepository.findOne({ leadCode });
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

    async save(lead: Lead): Promise<void> {
        await this.leadRepository.getEntityManager().persist(lead).flush();
    }
}
