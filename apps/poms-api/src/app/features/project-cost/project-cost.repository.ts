import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { InternalCostRateVersion } from './internal-cost-rate-version.entity';
import { ProjectActualCostRecord } from './project-actual-cost-record.entity';

@Injectable()
export class InternalCostRateVersionRepository {
    constructor(
        @InjectRepository(InternalCostRateVersion)
        private readonly repository: EntityRepository<InternalCostRateVersion>
    ) {}

    async findActiveVersion(rateScopeType: string, date: Date, personId?: string, roleCode?: string): Promise<InternalCostRateVersion | null> {
        const where: any = {
            rateScopeType,
            effectiveFrom: { $lte: date },
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }]
        };

        if (personId) {
            where.personId = personId;
        } else if (roleCode) {
            where.roleCode = roleCode;
        }

        return this.repository.findOne(where, {
            orderBy: { effectiveFrom: QueryOrder.DESC }
        });
    }

    async findById(id: string): Promise<InternalCostRateVersion | null> {
        return this.repository.findOne({ id });
    }

    async findById(id: string): Promise<InternalCostRateVersion | null> {
        return this.repository.findOne({ id });
    }

    create(input: ConstructorParameters<typeof InternalCostRateVersion>[0]): InternalCostRateVersion {
        return this.repository.create(input);
    }

    async save(entity: InternalCostRateVersion): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }
}

@Injectable()
export class ProjectActualCostRecordRepository {
    constructor(
        @InjectRepository(ProjectActualCostRecord)
        private readonly repository: EntityRepository<ProjectActualCostRecord>
    ) {}

    async findByProjectId(projectId: string): Promise<ProjectActualCostRecord[]> {
        return this.repository.find({ project: projectId }, {
            orderBy: { occurredOn: QueryOrder.DESC, createdAt: QueryOrder.DESC }
        });
    }

    async findById(id: string): Promise<ProjectActualCostRecord | null> {
        return this.repository.findOne({ id });
    }

    create(input: ConstructorParameters<typeof ProjectActualCostRecord>[0]): ProjectActualCostRecord {
        return this.repository.create(input);
    }

    async save(entity: ProjectActualCostRecord): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }
}
