import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { BusinessDiscussionTargetObjectType } from '@poms/shared-contracts';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { CompetitorIntelligenceRecord, CustomerContact } from '../sales-intelligence/sales-intelligence.entity';
import { BusinessDiscussionComment, BusinessDiscussionThread } from './business-discussion.entity';

export interface BusinessDiscussionTargetRef {
    targetObjectType: BusinessDiscussionTargetObjectType;
    targetObjectId: string;
}

@Injectable()
export class BusinessDiscussionRepository {
    constructor(
        @InjectRepository(BusinessDiscussionThread)
        private readonly threadRepository: EntityRepository<BusinessDiscussionThread>,
        @InjectRepository(BusinessDiscussionComment)
        private readonly commentRepository: EntityRepository<BusinessDiscussionComment>,
        @InjectRepository(Customer)
        private readonly customerRepository: EntityRepository<Customer>,
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>,
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>,
        @InjectRepository(PlatformUser)
        private readonly platformUserRepository: EntityRepository<PlatformUser>,
        @InjectRepository(CustomerContact)
        private readonly contactRepository: EntityRepository<CustomerContact>,
        @InjectRepository(CompetitorIntelligenceRecord)
        private readonly competitorRepository: EntityRepository<CompetitorIntelligenceRecord>,
        @InjectRepository(SalesFollowUpRecord)
        private readonly followUpRepository: EntityRepository<SalesFollowUpRecord>
    ) {}

    async findCustomerById(id: string): Promise<Customer | null> {
        return this.customerRepository.findOne({ id });
    }

    async findLeadById(id: string): Promise<Lead | null> {
        return this.leadRepository.findOne({ id });
    }

    async findProjectById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
    }

    async findThreadByTarget(targetObjectType: BusinessDiscussionTargetObjectType, targetObjectId: string): Promise<BusinessDiscussionThread | null> {
        return this.threadRepository.findOne({ targetObjectType, targetObjectId });
    }

    async findThreadsByTargets(targets: BusinessDiscussionTargetRef[]): Promise<BusinessDiscussionThread[]> {
        if (targets.length === 0) {
            return [];
        }

        return this.threadRepository.find({
            $or: targets.map((target) => ({
                targetObjectType: target.targetObjectType,
                targetObjectId: target.targetObjectId
            }))
        });
    }

    async findCommentsByThreadIds(threadIds: string[]): Promise<BusinessDiscussionComment[]> {
        if (threadIds.length === 0) {
            return [];
        }

        return this.commentRepository.find({ threadId: { $in: threadIds } }, { orderBy: { createdAt: QueryOrder.ASC } });
    }

    async findCustomerContactsByIds(ids: string[]): Promise<CustomerContact[]> {
        if (ids.length === 0) {
            return [];
        }
        return this.contactRepository.find({ id: { $in: ids } });
    }

    async findCustomerContactById(id: string): Promise<CustomerContact | null> {
        return this.contactRepository.findOne({ id });
    }

    async findCompetitorRecordById(id: string): Promise<CompetitorIntelligenceRecord | null> {
        return this.competitorRepository.findOne({ id });
    }

    async findFollowUpRecordById(id: string): Promise<SalesFollowUpRecord | null> {
        return this.followUpRepository.findOne({ id });
    }

    async findPlatformUsersByIds(ids: string[]): Promise<PlatformUser[]> {
        if (ids.length === 0) {
            return [];
        }
        return this.platformUserRepository.find({ id: { $in: ids } });
    }

    createThread(input: ConstructorParameters<typeof BusinessDiscussionThread>[0]): BusinessDiscussionThread {
        return this.threadRepository.create(input);
    }

    createComment(input: ConstructorParameters<typeof BusinessDiscussionComment>[0]): BusinessDiscussionComment {
        return this.commentRepository.create(input);
    }

    async saveThreadAndComment(thread: BusinessDiscussionThread, comment: BusinessDiscussionComment): Promise<void> {
        await this.threadRepository.getEntityManager().persist([thread, comment]).flush();
    }

    async saveComment(comment: BusinessDiscussionComment): Promise<void> {
        await this.commentRepository.getEntityManager().persist(comment).flush();
    }
}
