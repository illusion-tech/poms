import { EntityManager, EntityRepository, QueryOrder, type FilterQuery } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { AccountingTaxTreatmentSnapshot } from './accounting-tax-treatment-snapshot.entity';
import { ChangePackageBaseline } from './change-package-baseline.entity';
import { CostStageAttributionSnapshot } from './cost-stage-attribution-snapshot.entity';
import { ExpenseRecord } from './expense-record.entity';
import { InternalCostRateVersion } from './internal-cost-rate-version.entity';
import { OperatingBaselinePackage } from './operating-baseline-package.entity';
import { OperatingRestatementRecord } from './operating-restatement-record.entity';
import { PeriodClosingSnapshot } from './period-closing-snapshot.entity';
import { ProjectActualCostRecord } from './project-actual-cost-record.entity';
import { ProjectOperatingSnapshot } from './project-operating-snapshot.entity';
import { SharedCostAllocationBasis } from './shared-cost-allocation-basis.entity';
import { SharedCostAllocationResult } from './shared-cost-allocation-result.entity';

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
        const where: FilterQuery<InternalCostRateVersion> = {
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
        const where: FilterQuery<InternalCostRateVersion> = {
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

    async findCurrentEffectiveBySource(
        sourceType: string,
        sourceId: string,
        activeStatuses: string[] = ['CONFIRMED', 'INCLUDED']
    ): Promise<ProjectActualCostRecord | null> {
        return this.repository.findOne(
            {
                sourceType,
                sourceId,
                recordStatus: { $in: activeStatuses }
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

    async transactional<T>(work: (em: EntityManager) => Promise<T>): Promise<T> {
        return this.repository.getEntityManager().transactional(work);
    }
}

@Injectable()
export class OperatingBaselinePackageRepository {
    constructor(
        @InjectRepository(OperatingBaselinePackage)
        private readonly repository: EntityRepository<OperatingBaselinePackage>
    ) {}

    async findCurrentByProjectId(projectId: string): Promise<OperatingBaselinePackage | null> {
        return this.repository.findOne(
            { projectId, isCurrent: true },
            { orderBy: { effectiveAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    async findById(id: string): Promise<OperatingBaselinePackage | null> {
        return this.repository.findOne({ id });
    }

    create(input: ConstructorParameters<typeof OperatingBaselinePackage>[0]): OperatingBaselinePackage {
        return this.repository.create(input);
    }

    async save(entity: OperatingBaselinePackage): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }

    async saveAll(entities: OperatingBaselinePackage[]): Promise<void> {
        await this.repository.getEntityManager().persist(entities).flush();
    }
}

@Injectable()
export class ChangePackageBaselineRepository {
    constructor(
        @InjectRepository(ChangePackageBaseline)
        private readonly repository: EntityRepository<ChangePackageBaseline>
    ) {}

    create(input: ConstructorParameters<typeof ChangePackageBaseline>[0]): ChangePackageBaseline {
        return this.repository.create(input);
    }

    async saveAll(entities: ChangePackageBaseline[]): Promise<void> {
        if (entities.length === 0) {
            return;
        }
        await this.repository.getEntityManager().persist(entities).flush();
    }
}

@Injectable()
export class ProjectOperatingSnapshotRepository {
    constructor(
        @InjectRepository(ProjectOperatingSnapshot)
        private readonly repository: EntityRepository<ProjectOperatingSnapshot>
    ) {}

    async findById(id: string): Promise<ProjectOperatingSnapshot | null> {
        return this.repository.findOne({ id });
    }

    create(input: ConstructorParameters<typeof ProjectOperatingSnapshot>[0]): ProjectOperatingSnapshot {
        return this.repository.create(input);
    }

    async save(entity: ProjectOperatingSnapshot): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }

    async saveAll(entities: ProjectOperatingSnapshot[]): Promise<void> {
        await this.repository.getEntityManager().persist(entities).flush();
    }
}

@Injectable()
export class PeriodClosingSnapshotRepository {
    constructor(
        @InjectRepository(PeriodClosingSnapshot)
        private readonly repository: EntityRepository<PeriodClosingSnapshot>
    ) {}

    async findById(id: string): Promise<PeriodClosingSnapshot | null> {
        return this.repository.findOne({ id });
    }

    async findActiveByProjectAndPeriod(projectId: string, periodKey: string): Promise<PeriodClosingSnapshot | null> {
        return this.repository.findOne({ projectId, periodKey, snapshotMode: 'period-end', status: 'active' });
    }

    create(input: ConstructorParameters<typeof PeriodClosingSnapshot>[0]): PeriodClosingSnapshot {
        return this.repository.create(input);
    }

    async save(entity: PeriodClosingSnapshot): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }
}

@Injectable()
export class OperatingRestatementRecordRepository {
    constructor(
        @InjectRepository(OperatingRestatementRecord)
        private readonly repository: EntityRepository<OperatingRestatementRecord>
    ) {}

    async findById(id: string): Promise<OperatingRestatementRecord | null> {
        return this.repository.findOne({ id });
    }

    async findByProjectId(projectId: string): Promise<OperatingRestatementRecord[]> {
        return this.repository.find(
            { projectId },
            { orderBy: { handledAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    async findActiveByRestatesSnapshotId(restatesSnapshotId: string): Promise<OperatingRestatementRecord | null> {
        return this.repository.findOne({ restatesSnapshotId, status: 'active' });
    }

    create(input: ConstructorParameters<typeof OperatingRestatementRecord>[0]): OperatingRestatementRecord {
        return this.repository.create(input);
    }

    async save(entity: OperatingRestatementRecord): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }
}

@Injectable()
export class SharedCostAllocationBasisRepository {
    constructor(
        @InjectRepository(SharedCostAllocationBasis)
        private readonly repository: EntityRepository<SharedCostAllocationBasis>
    ) {}

    async findById(id: string): Promise<SharedCostAllocationBasis | null> {
        return this.repository.findOne({ id });
    }

    async findActiveByScopeKey(sourceCostScopeKey: string): Promise<SharedCostAllocationBasis | null> {
        return this.repository.findOne(
            { sourceCostScopeKey, status: 'active' },
            { orderBy: { effectiveAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    create(input: ConstructorParameters<typeof SharedCostAllocationBasis>[0]): SharedCostAllocationBasis {
        return this.repository.create(input);
    }

    async save(entity: SharedCostAllocationBasis): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }
}

@Injectable()
export class SharedCostAllocationResultRepository {
    constructor(
        @InjectRepository(SharedCostAllocationResult)
        private readonly repository: EntityRepository<SharedCostAllocationResult>
    ) {}

    async findById(id: string): Promise<SharedCostAllocationResult | null> {
        return this.repository.findOne({ id });
    }

    async findByBasisId(basisId: string): Promise<SharedCostAllocationResult[]> {
        return this.repository.find(
            { basisId },
            { orderBy: { status: QueryOrder.ASC, createdAt: QueryOrder.ASC } }
        );
    }

    async findActiveByBasisAndProject(basisId: string, projectId: string): Promise<SharedCostAllocationResult | null> {
        return this.repository.findOne({ basisId, projectId, status: 'active' });
    }

    create(input: ConstructorParameters<typeof SharedCostAllocationResult>[0]): SharedCostAllocationResult {
        return this.repository.create(input);
    }

    async saveAll(entities: SharedCostAllocationResult[]): Promise<void> {
        if (entities.length === 0) {
            return;
        }
        await this.repository.getEntityManager().persist(entities).flush();
    }
}

@Injectable()
export class CostStageAttributionSnapshotRepository {
    constructor(
        @InjectRepository(CostStageAttributionSnapshot)
        private readonly repository: EntityRepository<CostStageAttributionSnapshot>
    ) {}

    async findById(id: string): Promise<CostStageAttributionSnapshot | null> {
        return this.repository.findOne({ id });
    }

    async findByCostRecordId(costRecordId: string): Promise<CostStageAttributionSnapshot[]> {
        return this.repository.find(
            { costRecordId },
            { orderBy: { handledAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    async findActiveByCostRecordId(costRecordId: string): Promise<CostStageAttributionSnapshot | null> {
        return this.repository.findOne({ costRecordId, status: 'active' });
    }

    create(input: ConstructorParameters<typeof CostStageAttributionSnapshot>[0]): CostStageAttributionSnapshot {
        return this.repository.create(input);
    }

    async save(entity: CostStageAttributionSnapshot): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }

    async saveAll(entities: CostStageAttributionSnapshot[]): Promise<void> {
        await this.repository.getEntityManager().persist(entities).flush();
    }
}

@Injectable()
export class AccountingTaxTreatmentSnapshotRepository {
    constructor(
        @InjectRepository(AccountingTaxTreatmentSnapshot)
        private readonly repository: EntityRepository<AccountingTaxTreatmentSnapshot>
    ) {}

    async findById(id: string): Promise<AccountingTaxTreatmentSnapshot | null> {
        return this.repository.findOne({ id });
    }

    async findByProjectId(projectId: string): Promise<AccountingTaxTreatmentSnapshot[]> {
        return this.repository.find(
            { projectId },
            { orderBy: { confirmedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    async findActiveByProjectAndTaxTreatmentType(
        projectId: string,
        taxTreatmentType: string
    ): Promise<AccountingTaxTreatmentSnapshot | null> {
        return this.repository.findOne(
            { projectId, taxTreatmentType, status: 'active' },
            { orderBy: { confirmedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    create(input: ConstructorParameters<typeof AccountingTaxTreatmentSnapshot>[0]): AccountingTaxTreatmentSnapshot {
        return this.repository.create(input);
    }

    async save(entity: AccountingTaxTreatmentSnapshot): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }

    async saveAll(entities: AccountingTaxTreatmentSnapshot[]): Promise<void> {
        await this.repository.getEntityManager().persist(entities).flush();
    }
}
