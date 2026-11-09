import { EntityManager, EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { AttachmentLinkStatusValue, AttachmentStatusValue } from '@poms/shared-contracts';
import type { AttachmentCategory, AttachmentStatus, AttachmentTargetType } from '@poms/shared-contracts';
import { Contract } from '../contract/contract.entity';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { ProjectHandover } from '../project-handover/project-handover.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { Attachment, AttachmentDownloadPackage, AttachmentDownloadPackageItem, AttachmentLink, ProjectHandoverAttachmentSelection } from './attachment.entity';
import { AttachmentUploadSession } from './attachment-upload-session.entity';

export interface AttachmentListFilters {
    targetType: AttachmentTargetType;
    targetId: string;
    category?: AttachmentCategory;
    status?: AttachmentStatus;
    includeVersions?: boolean;
}

export interface AttachmentCenterListFilters {
    targetTypes: AttachmentTargetType[];
    category?: AttachmentCategory;
    status?: AttachmentStatus;
    includeVersions?: boolean;
}

export interface AttachmentCenterRepositoryRow {
    attachment: Attachment;
    link: AttachmentLink;
    links: AttachmentLink[];
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
        @InjectRepository(ProjectHandover)
        private readonly projectHandoverRepository: EntityRepository<ProjectHandover>,
        @InjectRepository(ProjectHandoverAttachmentSelection)
        private readonly handoverAttachmentSelectionRepository: EntityRepository<ProjectHandoverAttachmentSelection>,
        @InjectRepository(AttachmentDownloadPackage)
        private readonly attachmentDownloadPackageRepository: EntityRepository<AttachmentDownloadPackage>,
        @InjectRepository(AttachmentDownloadPackageItem)
        private readonly attachmentDownloadPackageItemRepository: EntityRepository<AttachmentDownloadPackageItem>,
        @InjectRepository(AttachmentUploadSession)
        private readonly attachmentUploadSessionRepository: EntityRepository<AttachmentUploadSession>,
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

    createHandoverAttachmentSelection(input: ConstructorParameters<typeof ProjectHandoverAttachmentSelection>[0]): ProjectHandoverAttachmentSelection {
        return this.handoverAttachmentSelectionRepository.create(input);
    }

    createDownloadPackage(input: ConstructorParameters<typeof AttachmentDownloadPackage>[0]): AttachmentDownloadPackage {
        return this.attachmentDownloadPackageRepository.create(input);
    }

    createDownloadPackageItem(input: ConstructorParameters<typeof AttachmentDownloadPackageItem>[0]): AttachmentDownloadPackageItem {
        return this.attachmentDownloadPackageItemRepository.create(input);
    }

    createUploadSession(input: ConstructorParameters<typeof AttachmentUploadSession>[0]): AttachmentUploadSession {
        return this.attachmentUploadSessionRepository.create(input);
    }

    async saveAttachmentWithLink(attachment: Attachment, link: AttachmentLink): Promise<void> {
        await this.getEntityManager().persist([attachment, link]).flush();
    }

    async saveAll(entities: object[]): Promise<void> {
        await this.getEntityManager().persist(entities).flush();
    }

    async saveHandoverEntities(entities: Array<AttachmentLink | ProjectHandoverAttachmentSelection | AttachmentDownloadPackage | AttachmentDownloadPackageItem>): Promise<void> {
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
            { attachmentId, status: AttachmentLinkStatusValue.Active },
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
                status: AttachmentLinkStatusValue.Active
            },
            { orderBy: { linkedAt: QueryOrder.DESC } }
        );

        const attachmentIds = [...new Set(targetLinks.map((link) => link.attachmentId))];
        if (attachmentIds.length === 0) {
            return [];
        }

        const where: FilterQuery<Attachment> = {
            id: { $in: attachmentIds },
            status: filters.status ?? AttachmentStatusValue.Active,
            ...(filters.includeVersions ? {} : { isLatest: true }),
            ...(filters.category ? { category: filters.category } : {})
        };
        const attachments = await this.attachmentRepository.find(where, { orderBy: { uploadedAt: QueryOrder.DESC } });
        const activeLinks = await this.attachmentLinkRepository.find(
            {
                attachmentId: { $in: attachments.map((attachment) => attachment.id) },
                status: AttachmentLinkStatusValue.Active
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

    async findAttachmentCenterRows(filters: AttachmentCenterListFilters): Promise<AttachmentCenterRepositoryRow[]> {
        if (filters.targetTypes.length === 0) {
            return [];
        }

        const targetLinks = await this.attachmentLinkRepository.find(
            {
                targetType: { $in: filters.targetTypes },
                status: AttachmentLinkStatusValue.Active
            },
            { orderBy: { linkedAt: QueryOrder.DESC } }
        );

        const attachmentIds = [...new Set(targetLinks.map((link) => link.attachmentId))];
        if (attachmentIds.length === 0) {
            return [];
        }

        const where: FilterQuery<Attachment> = {
            id: { $in: attachmentIds },
            status: filters.status ?? AttachmentStatusValue.Active,
            ...(filters.includeVersions ? {} : { isLatest: true }),
            ...(filters.category ? { category: filters.category } : {})
        };
        const attachments = await this.attachmentRepository.find(where, { orderBy: { uploadedAt: QueryOrder.DESC } });
        if (attachments.length === 0) {
            return [];
        }

        const attachmentsById = new Map(attachments.map((attachment) => [attachment.id, attachment]));
        const activeLinks = await this.attachmentLinkRepository.find(
            {
                attachmentId: { $in: attachments.map((attachment) => attachment.id) },
                status: AttachmentLinkStatusValue.Active
            },
            { orderBy: { linkedAt: QueryOrder.DESC } }
        );
        const linksByAttachmentId = new Map<string, AttachmentLink[]>();

        for (const link of activeLinks) {
            const list = linksByAttachmentId.get(link.attachmentId) ?? [];
            list.push(link);
            linksByAttachmentId.set(link.attachmentId, list);
        }

        const rows: AttachmentCenterRepositoryRow[] = [];
        const seen = new Set<string>();
        for (const link of targetLinks) {
            const attachment = attachmentsById.get(link.attachmentId);
            if (!attachment) continue;

            const key = `${link.targetType}:${link.targetId}:${link.attachmentId}`;
            if (seen.has(key)) continue;

            seen.add(key);
            rows.push({
                attachment,
                link,
                links: linksByAttachmentId.get(link.attachmentId) ?? []
            });
        }

        return rows.sort((a, b) => b.attachment.uploadedAt.getTime() - a.attachment.uploadedAt.getTime());
    }

    async findAttachmentsByVersionGroupId(versionGroupId: string): Promise<Attachment[]> {
        return this.attachmentRepository.find(
            { versionGroupId },
            {
                orderBy: { versionNo: QueryOrder.DESC, uploadedAt: QueryOrder.DESC }
            }
        );
    }

    async findLatestAttachmentByVersionGroupId(versionGroupId: string): Promise<Attachment | null> {
        return this.attachmentRepository.findOne(
            { versionGroupId, status: AttachmentStatusValue.Active, isLatest: true },
            {
                orderBy: { versionNo: QueryOrder.DESC, uploadedAt: QueryOrder.DESC }
            }
        );
    }

    async findFinalAttachmentByVersionGroupId(versionGroupId: string): Promise<Attachment | null> {
        return this.attachmentRepository.findOne(
            { versionGroupId, status: AttachmentStatusValue.Active, isFinal: true },
            {
                orderBy: { versionNo: QueryOrder.DESC, uploadedAt: QueryOrder.DESC }
            }
        );
    }

    async findExistingActiveLink(input: Pick<AttachmentLink, 'attachmentId' | 'targetType' | 'targetId' | 'relationType'>): Promise<AttachmentLink | null> {
        return this.attachmentLinkRepository.findOne({
            attachmentId: input.attachmentId,
            targetType: input.targetType,
            targetId: input.targetId,
            relationType: input.relationType,
            status: AttachmentLinkStatusValue.Active
        });
    }

    async findCustomerById(id: string): Promise<Customer | null> {
        return this.customerRepository.findOne({ id });
    }

    async findCustomersByIds(ids: string[]): Promise<Customer[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.customerRepository.find({ id: { $in: ids } });
    }

    async findLeadById(id: string): Promise<Lead | null> {
        return this.leadRepository.findOne({ id });
    }

    async findLeadsByIds(ids: string[]): Promise<Lead[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.leadRepository.find({ id: { $in: ids } });
    }

    async findProjectById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
    }

    async findProjectsByIds(ids: string[]): Promise<Project[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.projectRepository.find({ id: { $in: ids } });
    }

    async findContractById(id: string): Promise<Contract | null> {
        return this.contractRepository.findOne({ id });
    }

    async findContractsByIds(ids: string[]): Promise<Contract[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.contractRepository.find({ id: { $in: ids } });
    }

    async findContractsByProjectId(projectId: string): Promise<Contract[]> {
        return this.contractRepository.find(
            { projectId },
            {
                orderBy: { createdAt: QueryOrder.DESC }
            }
        );
    }

    async findSalesFollowUpById(id: string): Promise<SalesFollowUpRecord | null> {
        return this.salesFollowUpRepository.findOne({ id });
    }

    async findSalesFollowUpsForHandoverSources(input: { projectId: string; sourceLeadId?: string | null }): Promise<SalesFollowUpRecord[]> {
        const filters: FilterQuery<SalesFollowUpRecord>[] = [{ projectId: input.projectId }];
        if (input.sourceLeadId) {
            filters.push({ leadId: input.sourceLeadId });
        }

        return this.salesFollowUpRepository.find(
            { $or: filters },
            {
                orderBy: { occurredAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findProjectHandoverById(id: string): Promise<ProjectHandover | null> {
        return this.projectHandoverRepository.findOne({ id });
    }

    async findHandoverSelectionsByHandoverId(handoverId: string): Promise<ProjectHandoverAttachmentSelection[]> {
        return this.handoverAttachmentSelectionRepository.find(
            { handoverId },
            {
                orderBy: { updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    async findHandoverSelectionsByIds(ids: string[]): Promise<ProjectHandoverAttachmentSelection[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.handoverAttachmentSelectionRepository.find({ id: { $in: ids } });
    }

    async findDownloadPackageById(id: string): Promise<AttachmentDownloadPackage | null> {
        return this.attachmentDownloadPackageRepository.findOne({ id });
    }

    async findDownloadPackageItemsByPackageId(packageId: string): Promise<AttachmentDownloadPackageItem[]> {
        return this.attachmentDownloadPackageItemRepository.find(
            { packageId },
            {
                orderBy: { createdAt: QueryOrder.ASC }
            }
        );
    }

    async findUploadSessionById(id: string): Promise<AttachmentUploadSession | null> {
        return this.attachmentUploadSessionRepository.findOne({ id });
    }

    async saveUploadSession(uploadSession: AttachmentUploadSession): Promise<void> {
        await this.attachmentUploadSessionRepository.getEntityManager().persist(uploadSession).flush();
    }

    async findPlatformUsersByIds(ids: string[]): Promise<PlatformUser[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.platformUserRepository.find({ id: { $in: ids } });
    }
}
