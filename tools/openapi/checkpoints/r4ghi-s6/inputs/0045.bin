import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { ApprovalSummaryFieldProjection, ApprovalSummaryPackageDefinition, ApprovalSummarySnapshot } from './approval-summary.entity';

@Injectable()
export class ApprovalSummaryPackageDefinitionRepository {
    constructor(
        @InjectRepository(ApprovalSummaryPackageDefinition)
        private readonly repository: EntityRepository<ApprovalSummaryPackageDefinition>
    ) {}

    async findActiveByScenarioAndPackage(approvalScenarioKey: string, summaryPackageKey: string): Promise<ApprovalSummaryPackageDefinition | null> {
        return this.repository.findOne({
            approvalScenarioKey,
            summaryPackageKey,
            status: 'active'
        });
    }

    create(input: ConstructorParameters<typeof ApprovalSummaryPackageDefinition>[0]): ApprovalSummaryPackageDefinition {
        return this.repository.create(input);
    }

    async save(entity: ApprovalSummaryPackageDefinition): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }
}

@Injectable()
export class ApprovalSummarySnapshotRepository {
    constructor(
        @InjectRepository(ApprovalSummarySnapshot)
        private readonly repository: EntityRepository<ApprovalSummarySnapshot>
    ) {}

    async findById(id: string): Promise<ApprovalSummarySnapshot | null> {
        return this.repository.findOne({ id });
    }

    async findActiveByTarget(targetType: string, targetId: string, approvalScenarioKey: string, projectionLevel: string): Promise<ApprovalSummarySnapshot | null> {
        return this.repository.findOne(
            {
                targetType,
                targetId,
                approvalScenarioKey,
                projectionLevel,
                status: 'active'
            },
            { orderBy: { generatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    async findByTarget(targetType: string, targetId: string): Promise<ApprovalSummarySnapshot[]> {
        return this.repository.find(
            { targetType, targetId },
            { orderBy: { generatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    create(input: ConstructorParameters<typeof ApprovalSummarySnapshot>[0]): ApprovalSummarySnapshot {
        return this.repository.create(input);
    }

    async save(entity: ApprovalSummarySnapshot): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }
}

@Injectable()
export class ApprovalSummaryFieldProjectionRepository {
    constructor(
        @InjectRepository(ApprovalSummaryFieldProjection)
        private readonly repository: EntityRepository<ApprovalSummaryFieldProjection>
    ) {}

    async findBySummarySnapshotId(summarySnapshotId: string): Promise<ApprovalSummaryFieldProjection[]> {
        return this.repository.find(
            { summarySnapshotId },
            { orderBy: { fieldOrder: QueryOrder.ASC, createdAt: QueryOrder.ASC } }
        );
    }

    create(input: ConstructorParameters<typeof ApprovalSummaryFieldProjection>[0]): ApprovalSummaryFieldProjection {
        return this.repository.create(input);
    }

    async saveAll(entities: ApprovalSummaryFieldProjection[]): Promise<void> {
        if (entities.length === 0) {
            return;
        }
        await this.repository.getEntityManager().persist(entities).flush();
    }
}
