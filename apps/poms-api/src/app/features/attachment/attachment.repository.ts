import { EntityManager, EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { AttachmentCategory, AttachmentStatus, AttachmentTargetType } from '@poms/shared-contracts';
import { Contract } from '../contract/contract.entity';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { Attachment, AttachmentLink } from './attachment.entity';

export interface AttachmentListFilters {
    targetType: AttachmentTargetType;
    targetId: string;
    category?: AttachmentCategory;
    status?: AttachmentStatus;
}

@Injectable()
export class AttachmentRepository {
    constructor(
        @InjectRepository(Attachment)
        private readonly attachmentRepository: EntityRepository<Attachment>,
        @InjectRepository(AttachmentLink)
        private readonly attachmentLinkRepository: EntityRepository<AttachmentLink>,
        @InjectRepository(Customer)
        private readonly customerRepository: EntityRepository<Customer>,
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>,
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>,
        @InjectRepository(Contract)
        private readonly contractRepository: EntityRepository<Contract>,
        @InjectRepository(SalesFollowUpRecord)
        private readonly salesFollowUpRepository: EntityRepository<SalesFollowUpRecord>,
        @InjectRepository(PlatformUser)
        private readonly platformUserRepository: EntityRepository<PlatformUser>
    ) {}

    getEntityManager(): EntityManager {
        return this.attachmentRepository.getEntityManager();
    }

    createAttachment(input: ConstructorParameters<typeof Attachment>[0]): Attachment {
        return this.attachmentRepository.create(input);
    }

    createLink(input: ConstructorParameters<typeof AttachmentLink>[0]): AttachmentLink {
        return this.attachmentLinkRepository.create(input);
    }

    async saveAttachmentWithLink(attachment: Attachment, link: AttachmentLink): Promise<void> {
        await this.getEntityManager().persist([attachment, link]).flush();
    }

    async saveAll(entities: Array<Attachment | AttachmentLink>): Promise<void> {
        await this.getEntityManager().persist(entities).flush();
    }

    async findAttachmentById(id: string): Promise<Attachment | null> {
        return this.attachmentRepository.findOne({ id });
    }

    async findLinkById(id: string): Promise<AttachmentLink | null> {
        return this.attachmentLinkRepository.findOne({ id });
    }

    async findActiveLinksByAttachmentId(attachmentId: string): Promise<AttachmentLink[]> {
        return this.attachmentLinkRepository.find(
            { attachmentId, status: 'active' },
            {
                orderBy: { linkedAt: QueryOrder.DESC }
            }
        );
    }

    async findAttachmentsByTarget(filters: AttachmentListFilters): Promise<Array<{ attachment: Attachment; links: AttachmentLink[] }>> {
        const targetLinks = await this.attachmentLinkRepository.find(
            {
                targetType: filters.targetType,
                targetId: filters.targetId,
                status: 'active'
            },
            { orderBy: { linkedAt: QueryOrder.DESC } }
        );

        const attachmentIds = [...new Set(targetLinks.map((link) => link.attachmentId))];
        if (attachmentIds.length === 0) {
            return [];
        }

        const where: FilterQuery<Attachment> = {
            id: { $in: attachmentIds },
            status: filters.status ?? 'active',
            ...(filters.category ? { category: filters.category } : {})
        };
        const attachments = await this.attachmentRepository.find(where, { orderBy: { uploadedAt: QueryOrder.DESC } });
        const activeLinks = await this.attachmentLinkRepository.find(
            {
                attachmentId: { $in: attachments.map((attachment) => attachment.id) },
                status: 'active'
            },
            { orderBy: { linkedAt: QueryOrder.DESC } }
        );
        const linksByAttachmentId = new Map<string, AttachmentLink[]>();

        for (const link of activeLinks) {
            const list = linksByAttachmentId.get(link.attachmentId) ?? [];
            list.push(link);
            linksByAttachmentId.set(link.attachmentId, list);
        }

        return attachments.map((attachment) => ({
            attachment,
            links: linksByAttachmentId.get(attachment.id) ?? []
        }));
    }

    async findExistingActiveLink(input: Pick<AttachmentLink, 'attachmentId' | 'targetType' | 'targetId' | 'relationType'>): Promise<AttachmentLink | null> {
        return this.attachmentLinkRepository.findOne({
            attachmentId: input.attachmentId,
            targetType: input.targetType,
            targetId: input.targetId,
            relationType: input.relationType,
            status: 'active'
        });
    }

    async findCustomerById(id: string): Promise<Customer | null> {
        return this.customerRepository.findOne({ id });
    }

    async findLeadById(id: string): Promise<Lead | null> {
        return this.leadRepository.findOne({ id });
    }

    async findProjectById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
    }

    async findContractById(id: string): Promise<Contract | null> {
        return this.contractRepository.findOne({ id });
    }

    async findSalesFollowUpById(id: string): Promise<SalesFollowUpRecord | null> {
        return this.salesFollowUpRepository.findOne({ id });
    }

    async findPlatformUsersByIds(ids: string[]): Promise<PlatformUser[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.platformUserRepository.find({ id: { $in: ids } });
    }
}
