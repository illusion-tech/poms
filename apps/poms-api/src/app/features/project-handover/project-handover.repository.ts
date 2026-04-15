import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import {
    ContractHandoverRebaselineRecord,
    HandoverBaselineImpactItem,
    ProjectHandover,
    ProjectReceiptJudgmentFreeze
} from './project-handover.entity';

@Injectable()
export class ProjectHandoverRepository {
    constructor(
        @InjectRepository(ProjectHandover)
        private readonly repository: EntityRepository<ProjectHandover>
    ) {}

    async findById(id: string): Promise<ProjectHandover | null> {
        return this.repository.findOne({ id });
    }

    async findByProjectId(projectId: string): Promise<ProjectHandover[]> {
        return this.repository.find(
            { projectId },
            { orderBy: { confirmedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    async findLatestConfirmedByProjectId(projectId: string): Promise<ProjectHandover | null> {
        return this.repository.findOne(
            { projectId, status: 'confirmed' },
            { orderBy: { confirmedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    create(input: ConstructorParameters<typeof ProjectHandover>[0]): ProjectHandover {
        return this.repository.create(input);
    }

    async save(entity: ProjectHandover): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }
}

@Injectable()
export class ContractHandoverRebaselineRecordRepository {
    constructor(
        @InjectRepository(ContractHandoverRebaselineRecord)
        private readonly repository: EntityRepository<ContractHandoverRebaselineRecord>
    ) {}

    async findById(id: string): Promise<ContractHandoverRebaselineRecord | null> {
        return this.repository.findOne({ id });
    }

    async findByContractAmendmentId(contractAmendmentId: string): Promise<ContractHandoverRebaselineRecord[]> {
        return this.repository.find(
            { contractAmendmentId },
            { orderBy: { handledAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    async findEffectiveByContractAmendmentId(contractAmendmentId: string): Promise<ContractHandoverRebaselineRecord | null> {
        return this.repository.findOne(
            { contractAmendmentId, status: 'effective' },
            { orderBy: { handledAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    async findLatestByProjectId(projectId: string): Promise<ContractHandoverRebaselineRecord | null> {
        return this.repository.findOne(
            { projectId },
            { orderBy: { handledAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    create(input: ConstructorParameters<typeof ContractHandoverRebaselineRecord>[0]): ContractHandoverRebaselineRecord {
        return this.repository.create(input);
    }

    async save(entity: ContractHandoverRebaselineRecord): Promise<void> {
        await this.repository.getEntityManager().persist(entity).flush();
    }

    async saveWithImpactsAndHandover(input: {
        rebaselineRecord: ContractHandoverRebaselineRecord;
        impactItems: HandoverBaselineImpactItem[];
        handover: ProjectHandover;
        supersededRecord?: ContractHandoverRebaselineRecord | null;
    }): Promise<void> {
        await this.repository
            .getEntityManager()
            .persist([
                input.rebaselineRecord,
                ...input.impactItems,
                input.handover,
                ...(input.supersededRecord ? [input.supersededRecord] : [])
            ])
            .flush();
    }
}

@Injectable()
export class HandoverBaselineImpactItemRepository {
    constructor(
        @InjectRepository(HandoverBaselineImpactItem)
        private readonly repository: EntityRepository<HandoverBaselineImpactItem>
    ) {}

    async findByRebaselineRecordId(rebaselineRecordId: string): Promise<HandoverBaselineImpactItem[]> {
        return this.repository.find(
            { rebaselineRecordId },
            { orderBy: { createdAt: QueryOrder.ASC } }
        );
    }

    create(input: ConstructorParameters<typeof HandoverBaselineImpactItem>[0]): HandoverBaselineImpactItem {
        return this.repository.create(input);
    }

    async saveAll(entities: HandoverBaselineImpactItem[]): Promise<void> {
        if (entities.length === 0) {
            return;
        }
        await this.repository.getEntityManager().persist(entities).flush();
    }
}

@Injectable()
export class ProjectReceiptJudgmentFreezeRepository {
    constructor(
        @InjectRepository(ProjectReceiptJudgmentFreeze)
        private readonly repository: EntityRepository<ProjectReceiptJudgmentFreeze>
    ) {}

    async findCurrentByProjectId(projectId: string): Promise<ProjectReceiptJudgmentFreeze | null> {
        return this.repository.findOne(
            { projectId, isCurrent: true },
            { orderBy: { frozenAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    create(input: ConstructorParameters<typeof ProjectReceiptJudgmentFreeze>[0]): ProjectReceiptJudgmentFreeze {
        return this.repository.create(input);
    }

    async saveWithHandover(input: {
        handover: ProjectHandover;
        receiptJudgmentFreeze: ProjectReceiptJudgmentFreeze;
    }): Promise<void> {
        await this.repository
            .getEntityManager()
            .persist([input.handover, input.receiptJudgmentFreeze])
            .flush();
    }
}
