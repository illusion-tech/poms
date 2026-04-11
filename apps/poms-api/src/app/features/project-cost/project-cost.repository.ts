import { EntityRepository, QueryOrder } from '@mikro-orm/core';
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

    async findActiveVersionByRateKey(rateKey: string, date: string): Promise<InternalCostRateVersion | null> {
        return this.repository.findOne(
            {
                rateKey,
                status: 'active',
                effectiveFrom: { $lte: date },
                $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }]
            },
            {
                orderBy: { effectiveFrom: QueryOrder.DESC }
            }
        );
    }

    async findOverlappingActiveVersion(
        rateKey: string,
        effectiveFrom: string,
        effectiveTo: string | null,
        excludeId?: string
    ): Promise<InternalCostRateVersion | null> {
        const effectiveUpperBound = effectiveTo ?? '9999-12-31';
        const where: any = {
            rateKey,
            status: 'active',
            effectiveFrom: { $lte: effectiveUpperBound },
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: effectiveFrom } }]
        };

        if (excludeId) {
            where.id = { $ne: excludeId };
        }

        return this.repository.findOne(where, {
            orderBy: { effectiveFrom: QueryOrder.DESC }
        });
    }

    async findCurrentByRateKey(rateKey: string): Promise<InternalCostRateVersion | null> {
        return this.repository.findOne(
            {
                rateKey,
                isCurrent: true
            },
            {
                orderBy: { version: QueryOrder.DESC }
            }
        );
    }

    async findActiveVersion(rateScopeType: string, date: string, personId?: string, roleCode?: string, rateUnit?: string): Promise<InternalCostRateVersion | null> {
        const where: any = {
            rateScopeType,
            status: 'active',
            effectiveFrom: { $lte: date },
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }]
        };

        if (personId) {
            where.personId = personId;
        } else if (roleCode) {
            where.roleCode = roleCode;
        }
        if (rateUnit) {
            where.rateUnit = rateUnit;
        }

        return this.repository.findOne(where, {
            orderBy: { effectiveFrom: QueryOrder.DESC }
        });
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

    async saveAll(entities: InternalCostRateVersion[]): Promise<void> {
        await this.repository.getEntityManager().persist(entities).flush();
    }
}

@Injectable()
export class ProjectActualCostRecordRepository {
    constructor(
        @InjectRepository(ProjectActualCostRecord)
        private readonly repository: EntityRepository<ProjectActualCostRecord>
    ) {}

    async findByProjectId(projectId: string): Promise<ProjectActualCostRecord[]> {
        return this.repository.find({ projectId }, {
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

    async saveAll(entities: ProjectActualCostRecord[]): Promise<void> {
        await this.repository.getEntityManager().persist(entities).flush();
    }
}
