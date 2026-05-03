import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessDiscussionTargetObjectTypeValue } from '@poms/shared-contracts';
import type {
    BusinessDiscussionCommentSummary,
    BusinessDiscussionListQuery,
    BusinessDiscussionTargetObjectType,
    CreateBusinessDiscussionCommentRequest
} from '@poms/shared-contracts';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { CompetitorIntelligenceRecord, CustomerContact } from '../sales-intelligence/sales-intelligence.entity';
import { BusinessDiscussionComment, BusinessDiscussionThread } from './business-discussion.entity';
import { BusinessDiscussionRepository, type BusinessDiscussionTargetRef } from './business-discussion.repository';

interface ResolvedDiscussionTarget {
    targetObjectType: BusinessDiscussionTargetObjectType;
    targetObjectId: string;
    customerId: string | null;
    leadId: string | null;
    projectId: string | null;
    targetTitle: string;
    sourceLeadId?: string | null;
}

@Injectable()
export class BusinessDiscussionService {
    constructor(private readonly businessDiscussionRepository: BusinessDiscussionRepository) {}

    async listBusinessDiscussionComments(query: BusinessDiscussionListQuery): Promise<BusinessDiscussionCommentSummary[]> {
        const targets = await this.resolveListTargets(query);
        const threads = await this.businessDiscussionRepository.findThreadsByTargets(targets.map((target) => this.toTargetRef(target)));
        const comments = await this.businessDiscussionRepository.findCommentsByThreadIds(threads.map((thread) => thread.id));
        const context = await this.loadCommentContext(threads, comments);

        return comments.map((comment) => this.mapComment(comment, context)).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    }

    async createBusinessDiscussionComment(input: CreateBusinessDiscussionCommentRequest, operatorUserId: string): Promise<BusinessDiscussionCommentSummary> {
        const target = await this.resolveCreateTarget(input.targetObjectType, input.targetObjectId);
        const [relatedContact, relatedCompetitorRecord, relatedFollowUpRecord] = await Promise.all([
            input.relatedContactId ? this.requireRelatedContact(input.relatedContactId, target) : Promise.resolve(null),
            input.relatedCompetitorRecordId ? this.requireRelatedCompetitorRecord(input.relatedCompetitorRecordId, target) : Promise.resolve(null),
            input.relatedFollowUpRecordId ? this.requireRelatedFollowUpRecord(input.relatedFollowUpRecordId, target) : Promise.resolve(null)
        ]);
        let thread = await this.businessDiscussionRepository.findThreadByTarget(target.targetObjectType, target.targetObjectId);
        const isNewThread = !thread;

        thread ??= this.businessDiscussionRepository.createThread({
            id: randomUUID(),
            targetObjectType: target.targetObjectType,
            targetObjectId: target.targetObjectId,
            customerId: target.customerId,
            leadId: target.leadId,
            projectId: target.projectId,
            targetTitle: target.targetTitle,
            createdBy: operatorUserId
        });

        const comment = this.businessDiscussionRepository.createComment({
            id: randomUUID(),
            threadId: thread.id,
            discussionType: input.discussionType,
            body: input.body.trim(),
            relatedContactId: relatedContact?.id ?? null,
            relatedCompetitorRecordId: relatedCompetitorRecord?.id ?? null,
            relatedFollowUpRecordId: relatedFollowUpRecord?.id ?? null,
            isPinned: input.isPinned ?? false,
            isKeyConclusion: input.isKeyConclusion ?? false,
            createdBy: operatorUserId
        });

        if (isNewThread) {
            await this.businessDiscussionRepository.saveThreadAndComment(thread, comment);
        } else {
            await this.businessDiscussionRepository.saveComment(comment);
        }

        const users = await this.businessDiscussionRepository.findPlatformUsersByIds([operatorUserId]);
        return this.mapComment(comment, {
            threadMap: new Map([[thread.id, thread]]),
            contactMap: relatedContact ? new Map([[relatedContact.id, relatedContact]]) : new Map(),
            userMap: new Map(users.map((user) => [user.id, user]))
        });
    }

    private async resolveListTargets(query: BusinessDiscussionListQuery): Promise<ResolvedDiscussionTarget[]> {
        const targets: ResolvedDiscussionTarget[] = [];

        if (query.customerId) {
            const customer = await this.requireCustomer(query.customerId);
            targets.push(this.customerTarget(customer));
        }

        if (query.leadId) {
            const lead = await this.requireLead(query.leadId);
            targets.push(this.leadTarget(lead));
        }

        if (query.projectId) {
            const project = await this.requireProject(query.projectId);
            targets.push(this.projectTarget(project));
            if (project.sourceLeadId) {
                const sourceLead = await this.businessDiscussionRepository.findLeadById(project.sourceLeadId);
                if (sourceLead) {
                    targets.push(this.leadTarget(sourceLead));
                }
            }
        }

        this.assertTargetCustomerAlignment(targets);
        return this.uniqueTargets(targets);
    }

    private async resolveCreateTarget(targetObjectType: BusinessDiscussionTargetObjectType, targetObjectId: string): Promise<ResolvedDiscussionTarget> {
        if (targetObjectType === BusinessDiscussionTargetObjectTypeValue.Customer) {
            return this.customerTarget(await this.requireCustomer(targetObjectId));
        }

        if (targetObjectType === BusinessDiscussionTargetObjectTypeValue.Lead) {
            return this.leadTarget(await this.requireLead(targetObjectId));
        }

        if (targetObjectType === BusinessDiscussionTargetObjectTypeValue.Project) {
            return this.projectTarget(await this.requireProject(targetObjectId));
        }

        throw new BadRequestException(`Unsupported discussion target: ${targetObjectType}`);
    }

    private async requireCustomer(id: string): Promise<Customer> {
        const customer = await this.businessDiscussionRepository.findCustomerById(id);
        if (!customer) {
            throw new NotFoundException(`Customer ${id} not found`);
        }
        return customer;
    }

    private async requireLead(id: string): Promise<Lead> {
        const lead = await this.businessDiscussionRepository.findLeadById(id);
        if (!lead) {
            throw new NotFoundException(`Lead ${id} not found`);
        }
        return lead;
    }

    private async requireProject(id: string): Promise<Project> {
        const project = await this.businessDiscussionRepository.findProjectById(id);
        if (!project) {
            throw new NotFoundException(`Project ${id} not found`);
        }
        return project;
    }

    private async requireRelatedContact(id: string, target: ResolvedDiscussionTarget): Promise<CustomerContact> {
        const contact = await this.businessDiscussionRepository.findCustomerContactById(id);
        if (!contact) {
            throw new NotFoundException(`CustomerContact ${id} not found`);
        }
        if (target.customerId && contact.customerId !== target.customerId) {
            throw new BadRequestException(`CustomerContact ${id} does not belong to customer ${target.customerId}`);
        }
        return contact;
    }

    private async requireRelatedCompetitorRecord(id: string, target: ResolvedDiscussionTarget): Promise<CompetitorIntelligenceRecord> {
        const record = await this.businessDiscussionRepository.findCompetitorRecordById(id);
        if (!record) {
            throw new NotFoundException(`CompetitorIntelligenceRecord ${id} not found`);
        }
        this.assertRelatedOpportunityAnchor('CompetitorIntelligenceRecord', id, record.customerId, record.leadId ?? null, record.projectId ?? null, target);
        return record;
    }

    private async requireRelatedFollowUpRecord(id: string, target: ResolvedDiscussionTarget): Promise<SalesFollowUpRecord> {
        const record = await this.businessDiscussionRepository.findFollowUpRecordById(id);
        if (!record) {
            throw new NotFoundException(`SalesFollowUpRecord ${id} not found`);
        }
        this.assertRelatedOpportunityAnchor('SalesFollowUpRecord', id, record.customerId, record.leadId ?? null, record.projectId ?? null, target);
        return record;
    }

    private assertRelatedOpportunityAnchor(typeName: string, id: string, customerId: string, leadId: string | null, projectId: string | null, target: ResolvedDiscussionTarget): void {
        if (target.customerId && customerId !== target.customerId) {
            throw new BadRequestException(`${typeName} ${id} does not belong to customer ${target.customerId}`);
        }

        if (target.projectId && projectId && projectId !== target.projectId) {
            throw new BadRequestException(`${typeName} ${id} does not belong to project ${target.projectId}`);
        }

        if (target.leadId && leadId && leadId !== target.leadId) {
            throw new BadRequestException(`${typeName} ${id} does not belong to lead ${target.leadId}`);
        }
    }

    private customerTarget(customer: Customer): ResolvedDiscussionTarget {
        return {
            targetObjectType: BusinessDiscussionTargetObjectTypeValue.Customer,
            targetObjectId: customer.id,
            customerId: customer.id,
            leadId: null,
            projectId: null,
            targetTitle: customer.displayName
        };
    }

    private leadTarget(lead: Lead): ResolvedDiscussionTarget {
        return {
            targetObjectType: BusinessDiscussionTargetObjectTypeValue.Lead,
            targetObjectId: lead.id,
            customerId: lead.customerId,
            leadId: lead.id,
            projectId: null,
            targetTitle: lead.leadName
        };
    }

    private projectTarget(project: Project): ResolvedDiscussionTarget {
        return {
            targetObjectType: BusinessDiscussionTargetObjectTypeValue.Project,
            targetObjectId: project.id,
            customerId: project.customerId ?? null,
            leadId: null,
            projectId: project.id,
            targetTitle: project.projectName,
            sourceLeadId: project.sourceLeadId ?? null
        };
    }

    private assertTargetCustomerAlignment(targets: ResolvedDiscussionTarget[]): void {
        const customerIds = [...new Set(targets.map((target) => target.customerId).filter((id): id is string => Boolean(id)))];
        if (customerIds.length > 1) {
            throw new BadRequestException('Discussion query anchors must belong to the same customer');
        }
    }

    private uniqueTargets(targets: ResolvedDiscussionTarget[]): ResolvedDiscussionTarget[] {
        const result = new Map<string, ResolvedDiscussionTarget>();
        for (const target of targets) {
            result.set(`${target.targetObjectType}:${target.targetObjectId}`, target);
        }
        return [...result.values()];
    }

    private toTargetRef(target: ResolvedDiscussionTarget): BusinessDiscussionTargetRef {
        return {
            targetObjectType: target.targetObjectType,
            targetObjectId: target.targetObjectId
        };
    }

    private async loadCommentContext(
        threads: BusinessDiscussionThread[],
        comments: BusinessDiscussionComment[]
    ): Promise<{ threadMap: Map<string, BusinessDiscussionThread>; contactMap: Map<string, CustomerContact>; userMap: Map<string, PlatformUser> }> {
        const contactIds = [...new Set(comments.map((comment) => comment.relatedContactId).filter((id): id is string => Boolean(id)))];
        const userIds = [...new Set(comments.map((comment) => comment.createdBy).filter((id): id is string => Boolean(id)))];
        const [contacts, users] = await Promise.all([
            this.businessDiscussionRepository.findCustomerContactsByIds(contactIds),
            this.businessDiscussionRepository.findPlatformUsersByIds(userIds)
        ]);

        return {
            threadMap: new Map(threads.map((thread) => [thread.id, thread])),
            contactMap: new Map(contacts.map((contact) => [contact.id, contact])),
            userMap: new Map(users.map((user) => [user.id, user]))
        };
    }

    private mapComment(
        comment: BusinessDiscussionComment,
        context: { threadMap: Map<string, BusinessDiscussionThread>; contactMap: Map<string, CustomerContact>; userMap: Map<string, PlatformUser> }
    ): BusinessDiscussionCommentSummary {
        const thread = context.threadMap.get(comment.threadId);
        if (!thread) {
            throw new NotFoundException(`BusinessDiscussionThread ${comment.threadId} not found`);
        }

        const relatedContact = comment.relatedContactId ? context.contactMap.get(comment.relatedContactId) ?? null : null;
        const createdByUser = comment.createdBy ? context.userMap.get(comment.createdBy) ?? null : null;

        return {
            id: comment.id,
            threadId: comment.threadId,
            targetObjectType: thread.targetObjectType,
            targetObjectId: thread.targetObjectId,
            targetTitle: thread.targetTitle,
            customerId: thread.customerId ?? null,
            leadId: thread.leadId ?? null,
            projectId: thread.projectId ?? null,
            discussionType: comment.discussionType,
            body: comment.body,
            relatedContactId: comment.relatedContactId ?? null,
            relatedContactName: relatedContact?.name ?? null,
            relatedCompetitorRecordId: comment.relatedCompetitorRecordId ?? null,
            relatedFollowUpRecordId: comment.relatedFollowUpRecordId ?? null,
            isPinned: comment.isPinned,
            isKeyConclusion: comment.isKeyConclusion,
            createdAt: comment.createdAt.toISOString(),
            createdBy: comment.createdBy ?? null,
            createdByName: createdByUser?.displayName ?? null
        };
    }
}
