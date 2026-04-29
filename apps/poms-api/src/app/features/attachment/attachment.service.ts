import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import {
    ATTACHMENT_CATEGORIES,
    ATTACHMENT_RELATION_TYPES,
    ATTACHMENT_SECURITY_LEVELS,
    ATTACHMENT_TARGET_TYPES,
    type AttachmentCategory,
    type AttachmentListQuery,
    type AttachmentRelationType,
    type AttachmentSecurityLevel,
    type AttachmentSummary,
    type AttachmentTargetType,
    type CreateAttachmentLinkRequest,
    type PermissionKey,
    type UpdateAttachmentRequest,
    type UserPayload,
    type VoidAttachmentRequest
} from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { Contract } from '../contract/contract.entity';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { Attachment, AttachmentLink } from './attachment.entity';
import { mapAttachmentToSummary } from './attachment.mapper';
import { AttachmentRepository } from './attachment.repository';
import { AttachmentStorageService } from './attachment-storage.service';

export interface UploadedAttachmentFile {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export interface UploadAttachmentMetadata {
    targetType: string;
    targetId: string;
    category: string;
    securityLevel?: string;
    relationType?: string;
    displayName?: string;
    description?: string | null;
}

const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'md', 'zip']);
const SENSITIVE_READ_PERMISSIONS: PermissionKey[] = ['contract:finance:sensitive:read', 'operating:finance:sensitive:read', 'commission:amount:sensitive:read', 'platform:roles:manage'];

@Injectable()
export class AttachmentService {
    constructor(
        private readonly attachmentRepository: AttachmentRepository,
        private readonly storageService: AttachmentStorageService,
        private readonly runtimeAuditService: RuntimeAuditService
    ) {}

    async uploadAttachment(file: UploadedAttachmentFile | undefined, metadata: UploadAttachmentMetadata, user: UserPayload, requestId?: string | null): Promise<AttachmentSummary> {
        if (!file?.buffer?.length) {
            throw new BadRequestException('Attachment file is required');
        }

        if (file.size > this.maxAttachmentSizeBytes()) {
            throw new BadRequestException('Attachment file exceeds size limit');
        }

        const targetType = this.parseTargetType(metadata.targetType);
        const targetId = metadata.targetId;
        const category = this.parseCategory(metadata.category);
        const securityLevel = this.parseSecurityLevel(metadata.securityLevel ?? this.defaultSecurityLevel(category));
        const relationType = this.parseRelationType(metadata.relationType ?? 'normal');
        await this.requireTargetAccess(targetType, targetId, user, 'write');

        const originalName = this.sanitizeOriginalName(file.originalname);
        const extension = this.extractExtension(originalName);
        this.assertAllowedExtension(extension);

        const attachmentId = randomUUID();
        const uploadedAt = new Date();
        const checksumSha256 = createHash('sha256').update(file.buffer).digest('hex');
        const stored = await this.storageService.saveOriginal({
            attachmentId,
            originalName,
            buffer: file.buffer,
            uploadedAt
        });

        try {
            const attachment = this.attachmentRepository.createAttachment({
                id: attachmentId,
                originalName,
                displayName: metadata.displayName?.trim() || originalName,
                extension,
                mimeType: file.mimetype || 'application/octet-stream',
                sizeBytes: file.size,
                checksumSha256,
                category,
                securityLevel,
                storageProvider: stored.storageProvider,
                storageBucket: stored.storageBucket,
                storageKey: stored.storageKey,
                status: 'active',
                description: metadata.description?.trim() || null,
                versionGroupId: null,
                versionNo: 1,
                isLatest: true,
                isFinal: false,
                previousAttachmentId: null,
                changeNote: null,
                uploadedBy: user.sub,
                uploadedAt,
                createdAt: uploadedAt,
                updatedAt: uploadedAt
            });
            const link = this.attachmentRepository.createLink({
                attachmentId,
                targetType,
                targetId,
                relationType,
                status: 'active',
                linkedBy: user.sub,
                linkedAt: uploadedAt
            });

            await this.attachmentRepository.saveAttachmentWithLink(attachment, link);
            await this.recordAudit('attachment.uploaded', attachment.id, user.sub, requestId, 'success', {
                targetType,
                targetId,
                category,
                securityLevel,
                relationType,
                fileName: originalName,
                sizeBytes: file.size
            });

            return mapAttachmentToSummary(attachment, [link], { uploadedBy: null });
        } catch (error) {
            await this.storageService.remove(stored.storageKey);
            throw error;
        }
    }

    async listAttachments(query: AttachmentListQuery, user: UserPayload): Promise<AttachmentSummary[]> {
        await this.requireTargetAccess(query.targetType, query.targetId, user, 'read');
        const rows = await this.attachmentRepository.findAttachmentsByTarget(query);
        const visibleRows = rows.filter(({ attachment }) => this.canReadAttachmentSecurity(attachment, user.permissions));
        const uploaderMap = await this.loadUploaderMap(visibleRows.map(({ attachment }) => attachment));

        return visibleRows.map(({ attachment, links }) =>
            mapAttachmentToSummary(attachment, links, {
                uploadedBy: attachment.uploadedBy ? uploaderMap.get(attachment.uploadedBy) ?? null : null
            })
        );
    }

    async getAttachment(id: string, user: UserPayload): Promise<AttachmentSummary> {
        const { attachment, links } = await this.requireReadableAttachment(id, user);
        const uploaderMap = await this.loadUploaderMap([attachment]);
        return mapAttachmentToSummary(attachment, links, {
            uploadedBy: attachment.uploadedBy ? uploaderMap.get(attachment.uploadedBy) ?? null : null
        });
    }

    async openAttachmentDownload(id: string, user: UserPayload, requestId?: string | null): Promise<{ attachment: Attachment; stream: Readable }> {
        const { attachment } = await this.requireReadableAttachment(id, user);
        const stream = await this.storageService.openReadStream(attachment.storageKey);
        await this.recordAudit('attachment.downloaded', attachment.id, user.sub, requestId, 'success', {
            fileName: attachment.originalName,
            category: attachment.category,
            securityLevel: attachment.securityLevel
        });

        return { attachment, stream };
    }

    async updateAttachment(id: string, input: UpdateAttachmentRequest, user: UserPayload, requestId?: string | null): Promise<AttachmentSummary> {
        const attachment = await this.requireAttachment(id);
        const links = await this.attachmentRepository.findActiveLinksByAttachmentId(id);
        this.assertCanMutateAttachment(attachment, links, user);

        const before = this.auditSnapshot(attachment);

        if (input.displayName !== undefined) {
            attachment.displayName = input.displayName.trim();
        }

        if (input.category !== undefined) {
            attachment.category = input.category;
        }

        if (input.securityLevel !== undefined) {
            attachment.securityLevel = input.securityLevel;
        }

        if (input.description !== undefined) {
            attachment.description = input.description?.trim() || null;
        }

        await this.attachmentRepository.saveAll([attachment]);
        await this.recordAudit('attachment.metadata_updated', attachment.id, user.sub, requestId, 'success', {
            before,
            after: this.auditSnapshot(attachment)
        });

        return this.getAttachment(id, user);
    }

    async voidAttachment(id: string, input: VoidAttachmentRequest, user: UserPayload, requestId?: string | null): Promise<AttachmentSummary> {
        const attachment = await this.requireAttachment(id);
        const links = await this.attachmentRepository.findActiveLinksByAttachmentId(id);
        this.assertCanMutateAttachment(attachment, links, user);

        if (attachment.status !== 'active') {
            throw new ConflictException(`Attachment ${id} is not active`);
        }

        attachment.status = 'voided';
        attachment.deletedBy = user.sub;
        attachment.deletedAt = new Date();

        await this.attachmentRepository.saveAll([attachment]);
        await this.recordAudit('attachment.voided', attachment.id, user.sub, requestId, 'success', {
            reason: input.reason,
            category: attachment.category,
            securityLevel: attachment.securityLevel
        });

        const uploaderMap = await this.loadUploaderMap([attachment]);
        return mapAttachmentToSummary(attachment, links, {
            uploadedBy: attachment.uploadedBy ? uploaderMap.get(attachment.uploadedBy) ?? null : null
        });
    }

    async linkAttachment(id: string, input: CreateAttachmentLinkRequest, user: UserPayload, requestId?: string | null): Promise<AttachmentSummary> {
        const { attachment } = await this.requireReadableAttachment(id, user);
        await this.requireTargetAccess(input.targetType, input.targetId, user, 'write');

        const existing = await this.attachmentRepository.findExistingActiveLink({
            attachmentId: attachment.id,
            targetType: input.targetType,
            targetId: input.targetId,
            relationType: input.relationType
        });

        if (existing) {
            return this.getAttachment(id, user);
        }

        const link = this.attachmentRepository.createLink({
            attachmentId: attachment.id,
            targetType: input.targetType,
            targetId: input.targetId,
            relationType: input.relationType,
            status: 'active',
            linkedBy: user.sub,
            linkedAt: new Date()
        });

        await this.attachmentRepository.saveAll([link]);
        await this.recordAudit('attachment.linked', attachment.id, user.sub, requestId, 'success', {
            targetType: input.targetType,
            targetId: input.targetId,
            relationType: input.relationType
        });

        const activeLinks = await this.attachmentRepository.findActiveLinksByAttachmentId(id);
        const uploaderMap = await this.loadUploaderMap([attachment]);
        return mapAttachmentToSummary(attachment, activeLinks, {
            uploadedBy: attachment.uploadedBy ? uploaderMap.get(attachment.uploadedBy) ?? null : null
        });
    }

    async unlinkAttachment(id: string, linkId: string, user: UserPayload, requestId?: string | null): Promise<AttachmentSummary> {
        const attachment = await this.requireAttachment(id);
        const link = await this.attachmentRepository.findLinkById(linkId);

        if (!link || link.attachmentId !== attachment.id) {
            throw new NotFoundException(`Attachment link ${linkId} not found`);
        }

        await this.requireTargetAccess(link.targetType, link.targetId, user, 'write');

        if (link.status === 'active') {
            link.status = 'unlinked';
            link.unlinkedBy = user.sub;
            link.unlinkedAt = new Date();
            await this.attachmentRepository.saveAll([link]);
            await this.recordAudit('attachment.unlinked', attachment.id, user.sub, requestId, 'success', {
                targetType: link.targetType,
                targetId: link.targetId,
                relationType: link.relationType
            });
        }

        return this.getAttachment(id, user);
    }

    async copyActiveLinksToTarget(input: {
        from: { targetType: AttachmentTargetType; targetId: string };
        to: { targetType: AttachmentTargetType; targetId: string };
        relationType: AttachmentRelationType;
        operatorUserId: string;
        requestId?: string | null;
        entityManager?: EntityManager;
        excludeCategories?: AttachmentCategory[];
    }): Promise<void> {
        const rows = await this.attachmentRepository.findAttachmentsByTarget({
            targetType: input.from.targetType,
            targetId: input.from.targetId,
            status: 'active'
        });
        const excludeCategories = new Set(input.excludeCategories ?? []);
        const em = input.entityManager;
        const linksToPersist: AttachmentLink[] = [];

        for (const { attachment } of rows) {
            if (excludeCategories.has(attachment.category)) {
                continue;
            }

            const existing = await this.attachmentRepository.findExistingActiveLink({
                attachmentId: attachment.id,
                targetType: input.to.targetType,
                targetId: input.to.targetId,
                relationType: input.relationType
            });

            if (existing) {
                continue;
            }

            const linkInput = {
                attachmentId: attachment.id,
                targetType: input.to.targetType,
                targetId: input.to.targetId,
                relationType: input.relationType,
                status: 'active' as const,
                linkedBy: input.operatorUserId,
                linkedAt: new Date()
            };
            const link = em ? em.create(AttachmentLink, linkInput) : this.attachmentRepository.createLink(linkInput);
            linksToPersist.push(link);
        }

        if (linksToPersist.length === 0) {
            return;
        }

        if (em) {
            em.persist(linksToPersist);
        } else {
            await this.attachmentRepository.saveAll(linksToPersist);
        }

        await this.recordAudit('attachment.link_copied_to_project', input.to.targetId, input.operatorUserId, input.requestId, 'success', {
            from: input.from,
            to: input.to,
            relationType: input.relationType,
            copiedCount: linksToPersist.length
        });
    }

    private async requireReadableAttachment(id: string, user: UserPayload): Promise<{ attachment: Attachment; links: AttachmentLink[] }> {
        const attachment = await this.requireAttachment(id);
        const links = await this.attachmentRepository.findActiveLinksByAttachmentId(id);

        if (attachment.status !== 'active') {
            throw new NotFoundException(`Attachment ${id} not found`);
        }

        if (!this.canReadAttachmentSecurity(attachment, user.permissions)) {
            throw new ForbiddenException('Insufficient attachment security permission');
        }

        const canReadAnyLink = await this.canAccessAnyLink(links, user, 'read');
        if (!canReadAnyLink) {
            throw new ForbiddenException('Insufficient attachment target permission');
        }

        return { attachment, links };
    }

    private async requireAttachment(id: string): Promise<Attachment> {
        const attachment = await this.attachmentRepository.findAttachmentById(id);
        if (!attachment) {
            throw new NotFoundException(`Attachment ${id} not found`);
        }

        return attachment;
    }

    private assertCanMutateAttachment(attachment: Attachment, links: AttachmentLink[], user: UserPayload): void {
        if (attachment.uploadedBy === user.sub) {
            return;
        }

        const permissions = new Set(user.permissions);
        for (const link of links) {
            if (this.hasTargetPermission(link.targetType, permissions, 'write')) {
                return;
            }
        }

        throw new ForbiddenException('Insufficient attachment mutation permission');
    }

    private async canAccessAnyLink(links: AttachmentLink[], user: UserPayload, mode: 'read' | 'write'): Promise<boolean> {
        for (const link of links) {
            try {
                await this.requireTargetAccess(link.targetType, link.targetId, user, mode);
                return true;
            } catch {
                continue;
            }
        }

        return false;
    }

    private async requireTargetAccess(targetType: AttachmentTargetType, targetId: string, user: UserPayload, mode: 'read' | 'write'): Promise<Customer | Lead | Project | Contract | SalesFollowUpRecord> {
        const permissions = new Set(user.permissions);

        if (!this.hasTargetPermission(targetType, permissions, mode)) {
            throw new ForbiddenException(`Missing ${targetType} ${mode} permission`);
        }

        switch (targetType) {
            case 'customer': {
                const customer = await this.attachmentRepository.findCustomerById(targetId);
                if (!customer) throw new NotFoundException(`Customer ${targetId} not found`);
                return customer;
            }
            case 'lead': {
                const lead = await this.attachmentRepository.findLeadById(targetId);
                if (!lead) throw new NotFoundException(`Lead ${targetId} not found`);
                return lead;
            }
            case 'project': {
                const project = await this.attachmentRepository.findProjectById(targetId);
                if (!project) throw new NotFoundException(`Project ${targetId} not found`);
                return project;
            }
            case 'contract': {
                const contract = await this.attachmentRepository.findContractById(targetId);
                if (!contract) throw new NotFoundException(`Contract ${targetId} not found`);
                return contract;
            }
            case 'sales_follow_up': {
                const record = await this.attachmentRepository.findSalesFollowUpById(targetId);
                if (!record) throw new NotFoundException(`Sales follow-up record ${targetId} not found`);
                return record;
            }
        }
    }

    private hasTargetPermission(targetType: AttachmentTargetType, permissions: Set<PermissionKey>, mode: 'read' | 'write'): boolean {
        const permission = mode === 'read' ? 'read' : 'write';

        switch (targetType) {
            case 'customer':
                return permissions.has(`customer:${permission}` as PermissionKey);
            case 'lead':
                return permissions.has(`lead:${permission}` as PermissionKey);
            case 'project':
            case 'contract':
                return permissions.has(`project:${permission}` as PermissionKey);
            case 'sales_follow_up':
                return permissions.has(`customer:${permission}` as PermissionKey) || permissions.has(`lead:${permission}` as PermissionKey) || permissions.has(`project:${permission}` as PermissionKey);
        }
    }

    private canReadAttachmentSecurity(attachment: Attachment, permissions: PermissionKey[]): boolean {
        if (!['confidential', 'restricted'].includes(attachment.securityLevel)) {
            return true;
        }

        const permissionSet = new Set(permissions);
        return SENSITIVE_READ_PERMISSIONS.some((permission) => permissionSet.has(permission));
    }

    private parseTargetType(value: string): AttachmentTargetType {
        if (ATTACHMENT_TARGET_TYPES.includes(value as AttachmentTargetType)) {
            return value as AttachmentTargetType;
        }

        throw new BadRequestException(`Unsupported attachment target type ${value}`);
    }

    private parseCategory(value: string): AttachmentCategory {
        if (ATTACHMENT_CATEGORIES.includes(value as AttachmentCategory)) {
            return value as AttachmentCategory;
        }

        throw new BadRequestException(`Unsupported attachment category ${value}`);
    }

    private parseSecurityLevel(value: string): AttachmentSecurityLevel {
        if (ATTACHMENT_SECURITY_LEVELS.includes(value as AttachmentSecurityLevel)) {
            return value as AttachmentSecurityLevel;
        }

        throw new BadRequestException(`Unsupported attachment security level ${value}`);
    }

    private parseRelationType(value: string): AttachmentRelationType {
        if (ATTACHMENT_RELATION_TYPES.includes(value as AttachmentRelationType)) {
            return value as AttachmentRelationType;
        }

        throw new BadRequestException(`Unsupported attachment relation type ${value}`);
    }

    private defaultSecurityLevel(category: AttachmentCategory): AttachmentSecurityLevel {
        if (['quotation', 'contract', 'finance', 'internal_assessment'].includes(category)) {
            return 'sensitive';
        }

        return 'internal';
    }

    private sanitizeOriginalName(originalName: string): string {
        const normalized = originalName.replace(/\\/g, '/').split('/').pop()?.trim();
        if (!normalized) {
            throw new BadRequestException('Attachment original filename is required');
        }

        return normalized.slice(0, 255);
    }

    private extractExtension(originalName: string): string {
        return extname(originalName).replace('.', '').toLowerCase();
    }

    private assertAllowedExtension(extension: string): void {
        if (!ALLOWED_EXTENSIONS.has(extension)) {
            throw new BadRequestException(`Unsupported attachment extension ${extension}`);
        }
    }

    private maxAttachmentSizeBytes(): number {
        const configured = Number(process.env['POMS_ATTACHMENT_MAX_SIZE_MB']);
        if (Number.isFinite(configured) && configured > 0) {
            return configured * 1024 * 1024;
        }

        return MAX_ATTACHMENT_SIZE_BYTES;
    }

    private async loadUploaderMap(attachments: Attachment[]) {
        const uploaderIds = [...new Set(attachments.map((attachment) => attachment.uploadedBy).filter((id): id is string => Boolean(id)))];
        const uploaders = await this.attachmentRepository.findPlatformUsersByIds(uploaderIds);
        return new Map(uploaders.map((user) => [user.id, user]));
    }

    private auditSnapshot(attachment: Attachment): Record<string, unknown> {
        return {
            displayName: attachment.displayName,
            category: attachment.category,
            securityLevel: attachment.securityLevel,
            description: attachment.description,
            status: attachment.status
        };
    }

    private async recordAudit(eventType: string, targetId: string, operatorId: string | null, requestId: string | null | undefined, result: 'success' | 'rejected' | 'failed', metadata: Record<string, unknown>): Promise<void> {
        await this.runtimeAuditService.recordAuditLog({
            eventType,
            targetType: 'attachment',
            targetId,
            operatorId,
            requestId: requestId ?? null,
            result,
            metadata
        });
    }
}
