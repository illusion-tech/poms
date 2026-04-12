import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { ExpenseRecord } from './expense-record.entity';
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
export class ExpenseRecordRepository {
    constructor(
        @InjectRepository(ExpenseRecord)
        private readonly repository: EntityRepository<ExpenseRecord>
    ) {}

    async findByProjectId(projectId: string): Promise<ExpenseRecord[]> {
        return this.repository.find(
            { projectId },
            { orderBy: { expenseDate: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    async findById(id: string): Promise<ExpenseRecord | null> {
        return this.repository.findOne({ id });
    }

    create(input: ConstructorParameters<typeof ExpenseRecord>[0]): ExpenseRecord {
        return this.repository.create(input);
    }

    async save(entity: ExpenseRecord): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }
}

@Injectable()
export class ProjectActualCostRecordRepository {
    constructor(
        @InjectRepository(ProjectActualCostRecord)
        private readonly repository: EntityRepository<ProjectActualCostRecord>
    ) {}

    async findByProjectId(
        projectId: string,
        filters?: {
            costType?: string;
            recordStatus?: string;
            sourceType?: string;
        }
    ): Promise<ProjectActualCostRecord[]> {
        const where: Record<string, unknown> = { projectId };
        if (filters?.costType) {
            where['costType'] = filters.costType;
        }
        if (filters?.recordStatus) {
            where['recordStatus'] = filters.recordStatus;
        }
        if (filters?.sourceType) {
            where['sourceType'] = filters.sourceType;
        }

        return this.repository.find(where, {
            orderBy: { occurredOn: QueryOrder.DESC, createdAt: QueryOrder.DESC }
        });
    }

    async findById(id: string): Promise<ProjectActualCostRecord | null> {
        return this.repository.findOne({ id });
    }

    async findCurrentEffectiveBySource(sourceType: string, sourceId: string): Promise<ProjectActualCostRecord | null> {
        return this.repository.findOne(
            {
                sourceType,
                sourceId,
                recordStatus: { $in: ['CONFIRMED', 'INCLUDED'] }
            },
            {
                orderBy: { createdAt: QueryOrder.DESC }
            }
        );
    }

    async findReplacementBySupersedesRecordId(supersedesRecordId: string): Promise<ProjectActualCostRecord | null> {
        return this.repository.findOne(
            { supersedesRecordId },
            { orderBy: { createdAt: QueryOrder.DESC } }
        );
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
