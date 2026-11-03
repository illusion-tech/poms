import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { CommercialBaselineDiffResult, CommercialBaselineReviewRecord, CommercialReleaseBaseline } from './commercial-release-baseline.entity';

@Injectable()
export class CommercialReleaseBaselineRepository {
    constructor(
        @InjectRepository(CommercialReleaseBaseline)
        private readonly baselineRepository: EntityRepository<CommercialReleaseBaseline>,
        @InjectRepository(CommercialBaselineDiffResult)
        private readonly diffResultRepository: EntityRepository<CommercialBaselineDiffResult>,
        @InjectRepository(CommercialBaselineReviewRecord)
        private readonly reviewRecordRepository: EntityRepository<CommercialBaselineReviewRecord>
    ) {}

    async findById(id: string): Promise<CommercialReleaseBaseline | null> {
        return this.baselineRepository.findOne({ id });
    }

    async findCurrentByProjectId(projectId: string): Promise<CommercialReleaseBaseline | null> {
        return this.baselineRepository.findOne(
            { projectId, isCurrent: true },
            {
                orderBy: { updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    create(input: ConstructorParameters<typeof CommercialReleaseBaseline>[0]): CommercialReleaseBaseline {
        return this.baselineRepository.create(input);
    }

    async save(entity: CommercialReleaseBaseline): Promise<void> {
        await this.baselineRepository.getEntityManager().persist(entity).flush();
    }

    getEntityManager() {
        return this.baselineRepository.getEntityManager();
    }

    async findDiffResultById(id: string): Promise<CommercialBaselineDiffResult | null> {
        return this.diffResultRepository.findOne({ id });
    }

    async findReviewHistory(diffResultId: string): Promise<CommercialBaselineReviewRecord[]> {
        return this.reviewRecordRepository.find(
            { diffResultId },
            {
                orderBy: { createdAt: QueryOrder.ASC }
            }
        );
    }
}
