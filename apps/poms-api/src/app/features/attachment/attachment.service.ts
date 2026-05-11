import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import {
    ATTACHMENT_RELATION_TYPES,
    ATTACHMENT_SECURITY_LEVELS,
    ATTACHMENT_TARGET_TYPES,
    AttachmentLinkStatusValue,
    AttachmentDownloadPackageItemStatusValue,
    AttachmentDownloadPackageStatusValue,
    AttachmentRelationTypeValue,
    AttachmentSecurityLevelValue,
    AttachmentStatusValue,
    AttachmentTargetTypeValue,
    DictionaryDomainValue,
    ProjectHandoverAttachmentChecklistItemStatusValue,
    type AttachmentCategory,
    type AttachmentDownloadPackageManifestSummary,
    type AttachmentDownloadPackageSummary,
    type AttachmentListQuery,
    type AttachmentRelationType,
    type AttachmentSecurityLevel,
    type AttachmentStorageProviderType,
    type AttachmentSummary,
    type AttachmentTargetType,
    type AttachmentVersionSummary,
    type ClearAttachmentFinalRequest,
    type CreateProjectHandoverAttachmentDownloadPackageRequest,
    type CreateAttachmentVersionRequest,
    type CreateAttachmentLinkRequest,
    type MarkAttachmentFinalRequest,
    type PermissionKey,
    type ProjectHandoverAttachmentChecklistItem,
    type ProjectHandoverAttachmentChecklistItemStatus,
    type ProjectHandoverAttachmentChecklistView,
    type ProjectHandoverAttachmentSourceRef,
    type RefreshProjectHandoverAttachmentChecklistRequest,
    type UpdateAttachmentRequest,
    type UserPayload,
    type VoidAttachmentRequest
} from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { Contract } from '../contract/contract.entity';
import { Customer } from '../customer/customer.entity';
import { DictionaryService } from '../dictionary/dictionary.service';
import { Lead } from '../lead/lead.entity';
import { Project } from '../project/project.entity';
import { ProjectHandover } from '../project-handover/project-handover.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { Attachment, AttachmentDownloadPackage, ProjectHandoverAttachmentSelection, AttachmentLink } from './attachment.entity';
import { mapAttachmentToSummary } from './attachment.mapper';
import { getAttachmentPreviewKind, isThumbnailAvailable } from './attachment-preview.util';
import { AttachmentRepository } from './attachment.repository';
import { AttachmentStorageService } from './attachment-storage.service';
import type { AttachmentObjectLocation } from './attachment-object-storage-provider.types';

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

export type UploadAttachmentVersionMetadata = CreateAttachmentVersionRequest;

const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'md', 'zip']);
const SENSITIVE_READ_PERMISSIONS: PermissionKey[] = ['contract:finance:sensitive:read', 'operating:finance:sensitive:read', 'commission:amount:sensitive:read', 'platform:roles:manage'];
const RESTRICTED_ATTACHMENT_SECURITY_LEVELS: readonly AttachmentSecurityLevel[] = [AttachmentSecurityLevelValue.Confidential, AttachmentSecurityLevelValue.Restricted];
const SENSITIVE_ATTACHMENT_CATEGORIES: readonly AttachmentCategory[] = ['quotation', 'contract', 'finance', 'internal-assessment'];
const BATCH_DOWNLOAD_ALLOWED_SECURITY_LEVELS: readonly AttachmentSecurityLevel[] = [AttachmentSecurityLevelValue.Normal, AttachmentSecurityLevelValue.Internal];
const HANDOVER_DOWNLOAD_PACKAGE_TTL_MS = 24 * 60 * 60 * 1000;

interface HandoverAttachmentCandidate {
    attachment: Attachment;
    sourceRefs: ProjectHandoverAttachmentSourceRef[];
    status: ProjectHandoverAttachmentChecklistItemStatus;
    selectionReason: string;
    exclusionReason: string | null;
}

interface ZipArchiveEntry {
    name: string;
    data: Buffer;
}

@Injectable()
export class AttachmentService {
    constructor(
        private readonly attachmentRepository: AttachmentRepository,
        private readonly storageService: AttachmentStorageService,
        private readonly runtimeAuditService: RuntimeAuditService,
        private readonly dictionaryService: DictionaryService
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
        const category = await this.requireAttachmentCategory(metadata.category);
        const securityLevel = this.parseSecurityLevel(metadata.securityLevel ?? this.defaultSecurityLevel(category));
        const relationType = this.parseRelationType(metadata.relationType ?? AttachmentRelationTypeValue.Normal);
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
                status: AttachmentStatusValue.Active,
                description: metadata.description?.trim() || null,
                versionGroupId: attachmentId,
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
                status: AttachmentLinkStatusValue.Active,
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
            await this.storageService.remove(stored);
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
        const stream = await this.storageService.openReadStream(this.storageLocationForAttachment(attachment));
        await this.recordAudit('attachment.downloaded', attachment.id, user.sub, requestId, 'success', {
            fileName: attachment.originalName,
            category: attachment.category,
            securityLevel: attachment.securityLevel
        });

        return { attachment, stream };
    }

    async openAttachmentPreview(id: string, user: UserPayload, requestId?: string | null): Promise<{ attachment: Attachment; stream: Readable }> {
        const { attachment } = await this.requireReadableAttachment(id, user);
        const previewKind = getAttachmentPreviewKind(attachment);

        if (previewKind === 'unsupported') {
            throw new UnsupportedMediaTypeException(`Attachment ${id} does not support preview`);
        }

        const stream = await this.storageService.openReadStream(this.storageLocationForAttachment(attachment));
        await this.recordAudit('attachment.previewed', attachment.id, user.sub, requestId, 'success', {
            fileName: attachment.originalName,
            category: attachment.category,
            securityLevel: attachment.securityLevel,
            previewKind,
            versionGroupId: attachment.versionGroupId ?? attachment.id,
            versionNo: attachment.versionNo
        });

        return { attachment, stream };
    }

    async openAttachmentThumbnail(id: string, user: UserPayload, requestId?: string | null): Promise<{ attachment: Attachment; stream: Readable }> {
        const { attachment } = await this.requireReadableAttachment(id, user);

        if (!isThumbnailAvailable(attachment)) {
            throw new UnsupportedMediaTypeException(`Attachment ${id} does not have an available thumbnail`);
        }

        const stream = await this.storageService.openReadStream(this.storageLocationForAttachment(attachment));
        await this.recordAudit('attachment.thumbnail_viewed', attachment.id, user.sub, requestId, 'success', {
            fileName: attachment.originalName,
            category: attachment.category,
            securityLevel: attachment.securityLevel,
            versionGroupId: attachment.versionGroupId ?? attachment.id,
            versionNo: attachment.versionNo
        });

        return { attachment, stream };
    }

    async listAttachmentVersions(id: string, user: UserPayload): Promise<AttachmentVersionSummary[]> {
        const { attachment } = await this.requireReadableAttachment(id, user);
        const versionGroupId = this.resolveVersionGroupId(attachment);
        const versions = await this.attachmentRepository.findAttachmentsByVersionGroupId(versionGroupId);
        const versionRows = versions.length > 0 ? versions : [attachment];
        const visibleVersions = versionRows.filter((version) => this.canReadAttachmentSecurity(version, user.permissions));
        const uploaderMap = await this.loadUploaderMap(visibleVersions);

        return Promise.all(
            visibleVersions.map(async (version) => {
                const links = await this.attachmentRepository.findActiveLinksByAttachmentId(version.id);
                return mapAttachmentToSummary(version, links, {
                    uploadedBy: version.uploadedBy ? uploaderMap.get(version.uploadedBy) ?? null : null
                });
            })
        );
    }

    async uploadAttachmentVersion(
        id: string,
        file: UploadedAttachmentFile | undefined,
        metadata: UploadAttachmentVersionMetadata,
        user: UserPayload,
        requestId?: string | null
    ): Promise<AttachmentSummary> {
        if (!file?.buffer?.length) {
            throw new BadRequestException('Attachment file is required');
        }

        if (file.size > this.maxAttachmentSizeBytes()) {
            throw new BadRequestException('Attachment file exceeds size limit');
        }

        if (!metadata.changeNote?.trim()) {
            throw new BadRequestException('Attachment version change note is required');
        }

        const baseAttachment = await this.requireAttachment(id);
        const versionGroupId = this.resolveVersionGroupId(baseAttachment);
        const latest = (await this.attachmentRepository.findLatestAttachmentByVersionGroupId(versionGroupId)) ?? baseAttachment;
        const latestLinks = await this.attachmentRepository.findActiveLinksByAttachmentId(latest.id);
        this.assertCanMutateAttachment(latest, latestLinks, user);

        if (latest.status !== AttachmentStatusValue.Active) {
            throw new ConflictException(`Attachment ${latest.id} is not active`);
        }

        const originalName = this.sanitizeOriginalName(file.originalname);
        const extension = this.extractExtension(originalName);
        this.assertAllowedExtension(extension);

        const category = metadata.category ? await this.requireAttachmentCategory(metadata.category) : latest.category;
        const securityLevel = metadata.securityLevel ? this.parseSecurityLevel(metadata.securityLevel) : latest.securityLevel;
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
            latest.versionGroupId = versionGroupId;
            latest.isLatest = false;

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
                status: AttachmentStatusValue.Active,
                description: metadata.description === undefined ? latest.description : metadata.description?.trim() || null,
                versionGroupId,
                versionNo: latest.versionNo + 1,
                isLatest: true,
                isFinal: false,
                previousAttachmentId: latest.id,
                changeNote: metadata.changeNote.trim(),
                uploadedBy: user.sub,
                uploadedAt,
                createdAt: uploadedAt,
                updatedAt: uploadedAt
            });
            const copiedLinks = latestLinks.map((link) =>
                this.attachmentRepository.createLink({
                    attachmentId,
                    targetType: link.targetType,
                    targetId: link.targetId,
                    relationType: link.relationType,
                    status: AttachmentLinkStatusValue.Active,
                    linkedBy: user.sub,
                    linkedAt: uploadedAt
                })
            );

            await this.attachmentRepository.saveAll([latest, attachment, ...copiedLinks]);
            await this.recordAudit('attachment.version_created', attachment.id, user.sub, requestId, 'success', {
                previousAttachmentId: latest.id,
                versionGroupId,
                versionNo: attachment.versionNo,
                category,
                securityLevel,
                fileName: originalName,
                sizeBytes: file.size,
                changeNote: attachment.changeNote
            });

            return mapAttachmentToSummary(attachment, copiedLinks, { uploadedBy: null });
        } catch (error) {
            await this.storageService.remove(stored);
            throw error;
        }
    }

    async markAttachmentFinal(id: string, input: MarkAttachmentFinalRequest, user: UserPayload, requestId?: string | null): Promise<AttachmentSummary> {
        const attachment = await this.requireAttachment(id);
        const links = await this.attachmentRepository.findActiveLinksByAttachmentId(id);
        this.assertCanMutateAttachment(attachment, links, user);

        if (attachment.status !== AttachmentStatusValue.Active) {
            throw new ConflictException(`Attachment ${id} is not active`);
        }

        const versionGroupId = this.resolveVersionGroupId(attachment);
        const versions = await this.attachmentRepository.findAttachmentsByVersionGroupId(versionGroupId);
        const versionRows = versions.length > 0 ? versions : [attachment];
        const changed = new Set<Attachment>([attachment]);

        attachment.versionGroupId = versionGroupId;
        attachment.isFinal = true;

        for (const version of versionRows) {
            if (version.id === attachment.id) {
                continue;
            }

            if (version.isFinal) {
                version.isFinal = false;
                changed.add(version);
            }
        }

        await this.attachmentRepository.saveAll([...changed]);
        await this.recordAudit('attachment.final_marked', attachment.id, user.sub, requestId, 'success', {
            versionGroupId,
            versionNo: attachment.versionNo,
            note: input.note?.trim() || null
        });

        return this.getAttachment(id, user);
    }

    async clearAttachmentFinal(id: string, input: ClearAttachmentFinalRequest, user: UserPayload, requestId?: string | null): Promise<AttachmentSummary> {
        const attachment = await this.requireAttachment(id);
        const links = await this.attachmentRepository.findActiveLinksByAttachmentId(id);
        this.assertCanMutateAttachment(attachment, links, user);

        if (attachment.status !== AttachmentStatusValue.Active) {
            throw new ConflictException(`Attachment ${id} is not active`);
        }

        const versionGroupId = this.resolveVersionGroupId(attachment);
        const versions = await this.attachmentRepository.findAttachmentsByVersionGroupId(versionGroupId);
        const versionRows = versions.length > 0 ? versions : [attachment];
        const changed = versionRows.filter((version) => version.isFinal);

        if (attachment.isFinal && !changed.some((version) => version.id === attachment.id)) {
            changed.push(attachment);
        }

        for (const version of changed) {
            version.isFinal = false;
        }

        if (changed.length > 0) {
            await this.attachmentRepository.saveAll(changed);
        }

        await this.recordAudit('attachment.final_cleared', attachment.id, user.sub, requestId, 'success', {
            versionGroupId,
            versionNo: attachment.versionNo,
            reason: input.reason
        });

        return this.getAttachment(id, user);
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
            attachment.category = await this.requireAttachmentCategory(input.category);
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

        if (attachment.status !== AttachmentStatusValue.Active) {
            throw new ConflictException(`Attachment ${id} is not active`);
        }

        attachment.status = AttachmentStatusValue.Voided;
        attachment.deletedBy = user.sub;
        attachment.deletedAt = new Date();
        attachment.isFinal = false;

        const entitiesToSave: Attachment[] = [attachment];
        if (attachment.isLatest) {
            attachment.isLatest = false;
            const versionGroupId = this.resolveVersionGroupId(attachment);
            const versions = await this.attachmentRepository.findAttachmentsByVersionGroupId(versionGroupId);
            const replacementLatest = versions.find((version) => version.id !== attachment.id && version.status === AttachmentStatusValue.Active);
            if (replacementLatest) {
                replacementLatest.isLatest = true;
                entitiesToSave.push(replacementLatest);
            }
        }

        await this.attachmentRepository.saveAll(entitiesToSave);
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
            status: AttachmentLinkStatusValue.Active,
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

        if (link.status === AttachmentLinkStatusValue.Active) {
            link.status = AttachmentLinkStatusValue.Unlinked;
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
            status: AttachmentStatusValue.Active
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
                status: AttachmentLinkStatusValue.Active,
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

    async getProjectHandoverAttachmentChecklist(handoverId: string, user: UserPayload, requestId?: string | null): Promise<ProjectHandoverAttachmentChecklistView> {
        const { handover, project } = await this.requireProjectHandoverContext(handoverId, user, 'read');
        const selections = await this.attachmentRepository.findHandoverSelectionsByHandoverId(handoverId);

        await this.recordAudit('attachment.handover_checklist_viewed', handoverId, user.sub, requestId, 'success', {
            projectId: handover.projectId,
            selectionCount: selections.length
        });

        if (selections.length > 0) {
            return this.buildChecklistViewFromSelections(handover, selections);
        }

        const candidates = await this.collectHandoverAttachmentCandidates(handover, project);
        return this.buildChecklistViewFromCandidates(handover, candidates);
    }

    async refreshProjectHandoverAttachmentChecklist(
        handoverId: string,
        input: RefreshProjectHandoverAttachmentChecklistRequest,
        user: UserPayload,
        requestId?: string | null
    ): Promise<ProjectHandoverAttachmentChecklistView> {
        const { handover, project } = await this.requireProjectHandoverContext(handoverId, user, 'write');
        const [existingSelections, candidates] = await Promise.all([
            this.attachmentRepository.findHandoverSelectionsByHandoverId(handoverId),
            this.collectHandoverAttachmentCandidates(handover, project)
        ]);
        const existingByVersionGroupId = new Map(existingSelections.filter((selection) => selection.versionGroupId).map((selection) => [selection.versionGroupId, selection]));
        const preserveManualExclusions = input.preserveManualExclusions ?? true;
        const entitiesToSave: Array<AttachmentLink | ProjectHandoverAttachmentSelection> = [];
        const refreshedSelections: ProjectHandoverAttachmentSelection[] = [];

        for (const candidate of candidates) {
            const versionGroupId = candidate.attachment.versionGroupId ?? candidate.attachment.id;
            const existing = existingByVersionGroupId.get(versionGroupId);
            const selection =
                existing ??
                this.attachmentRepository.createHandoverAttachmentSelection({
                    id: randomUUID(),
                    handoverId: handover.id,
                    projectId: handover.projectId,
                    attachmentId: candidate.attachment.id,
                    versionGroupId,
                    displayName: candidate.attachment.displayName,
                    category: candidate.attachment.category,
                    securityLevel: candidate.attachment.securityLevel,
                    status: candidate.status,
                    selectionReason: candidate.selectionReason,
                    exclusionReason: candidate.exclusionReason,
                    sourceRefs: candidate.sourceRefs,
                    createdBy: user.sub,
                    updatedBy: user.sub
                });

            if (!existing || !preserveManualExclusions || existing.status !== ProjectHandoverAttachmentChecklistItemStatusValue.Excluded) {
                selection.attachmentId = candidate.attachment.id;
                selection.versionGroupId = versionGroupId;
                selection.displayName = candidate.attachment.displayName;
                selection.category = candidate.attachment.category;
                selection.securityLevel = candidate.attachment.securityLevel;
                selection.status = candidate.status;
                selection.selectionReason = candidate.selectionReason;
                selection.exclusionReason = candidate.exclusionReason;
                selection.sourceRefs = candidate.sourceRefs;
                selection.updatedBy = user.sub;
            }

            refreshedSelections.push(selection);
            entitiesToSave.push(selection);

            if (selection.status === ProjectHandoverAttachmentChecklistItemStatusValue.Included && selection.attachmentId) {
                const existingLink = await this.attachmentRepository.findExistingActiveLink({
                    attachmentId: selection.attachmentId,
                    targetType: AttachmentTargetTypeValue.ProjectHandover,
                    targetId: handover.id,
                    relationType: AttachmentRelationTypeValue.Handover
                });

                if (!existingLink) {
                    entitiesToSave.push(
                        this.attachmentRepository.createLink({
                            attachmentId: selection.attachmentId,
                            targetType: AttachmentTargetTypeValue.ProjectHandover,
                            targetId: handover.id,
                            relationType: AttachmentRelationTypeValue.Handover,
                            status: AttachmentLinkStatusValue.Active,
                            linkedBy: user.sub,
                            linkedAt: new Date()
                        })
                    );
                }
            }
        }

        await this.attachmentRepository.saveHandoverEntities(entitiesToSave);
        await this.recordAudit('attachment.handover_checklist_refreshed', handoverId, user.sub, requestId, 'success', {
            projectId: handover.projectId,
            refreshedCount: refreshedSelections.length,
            includedCount: refreshedSelections.filter((selection) => selection.status === ProjectHandoverAttachmentChecklistItemStatusValue.Included).length
        });

        return this.buildChecklistViewFromSelections(handover, refreshedSelections);
    }

    async createProjectHandoverAttachmentDownloadPackage(
        handoverId: string,
        input: CreateProjectHandoverAttachmentDownloadPackageRequest,
        user: UserPayload,
        requestId?: string | null
    ): Promise<AttachmentDownloadPackageSummary> {
        const { handover, project } = await this.requireProjectHandoverContext(handoverId, user, 'read');
        let selections = await this.attachmentRepository.findHandoverSelectionsByHandoverId(handoverId);

        if (selections.length === 0) {
            const refreshed = await this.refreshProjectHandoverAttachmentChecklist(
                handoverId,
                { preserveManualExclusions: true, includeHistoricalSelections: true },
                user,
                requestId
            );
            const refreshedIds = refreshed.items.flatMap((item) => (item.selectionId ? [item.selectionId] : []));
            selections = await this.attachmentRepository.findHandoverSelectionsByIds(refreshedIds);
        }

        const selectedSelectionIds = input.selectionIds ? new Set(input.selectionIds) : null;
        const selectedSelections = selectedSelectionIds ? selections.filter((selection) => selectedSelectionIds.has(selection.id)) : selections;
        if (selectedSelectionIds && selectedSelections.length !== selectedSelectionIds.size) {
            throw new BadRequestException('Some attachment checklist selections do not exist for this handover');
        }

        this.assertExpectedSelectionVersions(selectedSelections, input.expectedSelectionVersions ?? []);

        const includedSelections = selectedSelections.filter(
            (selection) =>
                selection.status === ProjectHandoverAttachmentChecklistItemStatusValue.Included &&
                selection.attachmentId &&
                selection.securityLevel &&
                BATCH_DOWNLOAD_ALLOWED_SECURITY_LEVELS.includes(selection.securityLevel)
        );
        const excludedSelections = selections.filter((selection) => selection.status !== ProjectHandoverAttachmentChecklistItemStatusValue.Included);

        if (includedSelections.length === 0) {
            throw new BadRequestException('No downloadable handover attachment selections are available');
        }

        if (!input.confirmedSensitiveExclusion && excludedSelections.some((selection) => selection.status === ProjectHandoverAttachmentChecklistItemStatusValue.SensitiveExcluded)) {
            throw new BadRequestException('Sensitive exclusions must be confirmed before creating a handover package');
        }

        const now = new Date();
        const packageId = randomUUID();
        const expiresAt = new Date(now.getTime() + HANDOVER_DOWNLOAD_PACKAGE_TTL_MS);
        const manifestSummary = this.buildManifestSummary(includedSelections, excludedSelections);
        const downloadPackage = this.attachmentRepository.createDownloadPackage({
            id: packageId,
            handoverId: handover.id,
            projectId: handover.projectId,
            status: AttachmentDownloadPackageStatusValue.Running,
            manifestSummary,
            storageProvider: null,
            storageBucket: null,
            storageKey: null,
            fileName: this.buildPackageFileName(handover),
            expiresAt,
            createdBy: user.sub,
            createdAt: now,
            updatedAt: now,
            downloadedAt: null,
            downloadCount: 0,
            failedReason: null
        });
        const packageItems = [
            ...includedSelections.map((selection, index) =>
                this.attachmentRepository.createDownloadPackageItem({
                    packageId,
                    handoverId: handover.id,
                    attachmentId: selection.attachmentId,
                    versionGroupId: selection.versionGroupId,
                    status: AttachmentDownloadPackageItemStatusValue.Included,
                    sourceRefs: selection.sourceRefs,
                    fileName: this.buildPackageEntryName(selection, index),
                    exclusionReason: null
                })
            ),
            ...excludedSelections.map((selection) =>
                this.attachmentRepository.createDownloadPackageItem({
                    packageId,
                    handoverId: handover.id,
                    attachmentId: selection.attachmentId,
                    versionGroupId: selection.versionGroupId,
                    status: AttachmentDownloadPackageItemStatusValue.Excluded,
                    sourceRefs: selection.sourceRefs,
                    fileName: null,
                    exclusionReason: selection.exclusionReason ?? selection.status
                })
            )
        ];

        try {
            const archive = await this.createDownloadPackageArchive(downloadPackage, includedSelections, manifestSummary);
            const stored = await this.storageService.saveDownloadPackage({
                packageId,
                fileName: downloadPackage.fileName ?? `${packageId}.zip`,
                buffer: archive,
                createdAt: now
            });
            downloadPackage.status = AttachmentDownloadPackageStatusValue.Ready;
            downloadPackage.storageProvider = stored.storageProvider;
            downloadPackage.storageBucket = stored.storageBucket;
            downloadPackage.storageKey = stored.storageKey;
        } catch (error) {
            downloadPackage.status = AttachmentDownloadPackageStatusValue.Failed;
            downloadPackage.failedReason = error instanceof Error ? error.message : 'Unknown package generation failure';
        }

        await this.attachmentRepository.saveHandoverEntities([downloadPackage, ...packageItems]);
        await this.recordAudit('attachment.batch_package_created', packageId, user.sub, requestId, downloadPackage.status === AttachmentDownloadPackageStatusValue.Ready ? 'success' : 'failed', {
            projectId: project.id,
            projectHandoverId: handover.id,
            packageId,
            attachmentIds: includedSelections.flatMap((selection) => (selection.attachmentId ? [selection.attachmentId] : [])),
            excludedAttachmentIds: excludedSelections.flatMap((selection) => (selection.attachmentId ? [selection.attachmentId] : []))
        });

        return this.mapDownloadPackageToSummary(downloadPackage);
    }

    async getAttachmentDownloadPackage(packageId: string, user: UserPayload): Promise<AttachmentDownloadPackageSummary> {
        const downloadPackage = await this.requireDownloadPackageAccess(packageId, user, 'read');
        return this.mapDownloadPackageToSummary(downloadPackage);
    }

    async openAttachmentDownloadPackage(
        packageId: string,
        user: UserPayload,
        requestId?: string | null
    ): Promise<{ downloadPackage: AttachmentDownloadPackage; stream: Readable }> {
        const downloadPackage = await this.requireDownloadPackageAccess(packageId, user, 'read');

        if (downloadPackage.status === AttachmentDownloadPackageStatusValue.Ready && downloadPackage.expiresAt.getTime() <= Date.now()) {
            downloadPackage.status = AttachmentDownloadPackageStatusValue.Expired;
            await this.attachmentRepository.saveHandoverEntities([downloadPackage]);
            await this.recordAudit('attachment.batch_package_expired', packageId, user.sub, requestId, 'rejected', {
                projectId: downloadPackage.projectId,
                projectHandoverId: downloadPackage.handoverId,
                packageId
            });
            throw new ConflictException(`Attachment download package ${packageId} has expired`);
        }

        if (downloadPackage.status !== AttachmentDownloadPackageStatusValue.Ready || !downloadPackage.storageKey) {
            throw new ConflictException(`Attachment download package ${packageId} is not ready`);
        }

        const stream = await this.storageService.openReadStream(this.storageLocationForDownloadPackage(downloadPackage));
        downloadPackage.downloadedAt = new Date();
        downloadPackage.downloadCount += 1;
        await this.attachmentRepository.saveHandoverEntities([downloadPackage]);
        await this.recordAudit('attachment.batch_package_downloaded', packageId, user.sub, requestId, 'success', {
            projectId: downloadPackage.projectId,
            projectHandoverId: downloadPackage.handoverId,
            packageId,
            downloadCount: downloadPackage.downloadCount
        });

        return { downloadPackage, stream };
    }

    private async requireProjectHandoverContext(handoverId: string, user: UserPayload, mode: 'read' | 'write'): Promise<{ handover: ProjectHandover; project: Project }> {
        const permission = `project:${mode}` as PermissionKey;
        if (!new Set(user.permissions).has(permission)) {
            throw new ForbiddenException(`Missing project ${mode} permission`);
        }

        const handover = await this.attachmentRepository.findProjectHandoverById(handoverId);
        if (!handover) {
            throw new NotFoundException(`Project handover ${handoverId} not found`);
        }

        const project = await this.attachmentRepository.findProjectById(handover.projectId);
        if (!project) {
            throw new NotFoundException(`Project ${handover.projectId} not found`);
        }

        return { handover, project };
    }

    private async requireDownloadPackageAccess(packageId: string, user: UserPayload, mode: 'read' | 'write'): Promise<AttachmentDownloadPackage> {
        const downloadPackage = await this.attachmentRepository.findDownloadPackageById(packageId);
        if (!downloadPackage) {
            throw new NotFoundException(`Attachment download package ${packageId} not found`);
        }

        await this.requireProjectHandoverContext(downloadPackage.handoverId, user, mode);
        return downloadPackage;
    }

    private async collectHandoverAttachmentCandidates(handover: ProjectHandover, project: Project): Promise<HandoverAttachmentCandidate[]> {
        const [contracts, salesFollowUps] = await Promise.all([
            this.attachmentRepository.findContractsByProjectId(handover.projectId),
            this.attachmentRepository.findSalesFollowUpsForHandoverSources({ projectId: handover.projectId, sourceLeadId: project.sourceLeadId })
        ]);
        const targets: Array<{ targetType: AttachmentTargetType; targetId: string; label: string }> = [
            { targetType: AttachmentTargetTypeValue.Project, targetId: project.id, label: '项目附件' },
            ...(project.sourceLeadId ? [{ targetType: AttachmentTargetTypeValue.Lead, targetId: project.sourceLeadId, label: '来源线索附件' }] : []),
            ...contracts.map((contract) => ({ targetType: AttachmentTargetTypeValue.Contract, targetId: contract.id, label: `合同 ${contract.contractNo}` })),
            ...salesFollowUps.map((record) => ({ targetType: AttachmentTargetTypeValue.SalesFollowUp, targetId: record.id, label: '销售跟进附件' })),
            { targetType: AttachmentTargetTypeValue.ProjectHandover, targetId: handover.id, label: '已纳入移交附件' }
        ];
        const candidatesByVersionGroup = new Map<string, HandoverAttachmentCandidate>();

        for (const target of targets) {
            const rows = await this.attachmentRepository.findAttachmentsByTarget({
                targetType: target.targetType,
                targetId: target.targetId,
                status: AttachmentStatusValue.Active
            });

            for (const row of rows) {
                const resolved = await this.resolveHandoverAttachmentVersion(row.attachment);
                const versionGroupId = resolved.attachment.versionGroupId ?? resolved.attachment.id;
                const sourceRefs = this.buildSourceRefs(row.links, target);
                const existing = candidatesByVersionGroup.get(versionGroupId);

                if (existing) {
                    existing.sourceRefs = this.mergeSourceRefs(existing.sourceRefs, sourceRefs);
                    continue;
                }

                candidatesByVersionGroup.set(versionGroupId, {
                    attachment: resolved.attachment,
                    sourceRefs,
                    status: this.resolveSelectionStatus(resolved.attachment),
                    selectionReason: resolved.selectionReason,
                    exclusionReason: this.resolveSelectionExclusionReason(resolved.attachment)
                });
            }
        }

        return [...candidatesByVersionGroup.values()].sort((a, b) => a.attachment.displayName.localeCompare(b.attachment.displayName, 'zh-CN'));
    }

    private async resolveHandoverAttachmentVersion(attachment: Attachment): Promise<{ attachment: Attachment; selectionReason: string }> {
        const versionGroupId = attachment.versionGroupId ?? attachment.id;
        const finalVersion = await this.attachmentRepository.findFinalAttachmentByVersionGroupId(versionGroupId);

        if (finalVersion) {
            return { attachment: finalVersion, selectionReason: 'final' };
        }

        return { attachment, selectionReason: attachment.isFinal ? 'final' : 'latest-no-final' };
    }

    private resolveSelectionStatus(attachment: Attachment): ProjectHandoverAttachmentChecklistItemStatus {
        if (!BATCH_DOWNLOAD_ALLOWED_SECURITY_LEVELS.includes(attachment.securityLevel)) {
            return ProjectHandoverAttachmentChecklistItemStatusValue.SensitiveExcluded;
        }

        return ProjectHandoverAttachmentChecklistItemStatusValue.Included;
    }

    private resolveSelectionExclusionReason(attachment: Attachment): string | null {
        if (BATCH_DOWNLOAD_ALLOWED_SECURITY_LEVELS.includes(attachment.securityLevel)) {
            return null;
        }

        return `Security level ${attachment.securityLevel} is excluded from ordinary handover download packages`;
    }

    private buildSourceRefs(
        links: AttachmentLink[],
        fallback: { targetType: AttachmentTargetType; targetId: string; label: string }
    ): ProjectHandoverAttachmentSourceRef[] {
        const matchingLinks = links.filter((link) => link.targetType === fallback.targetType && link.targetId === fallback.targetId);
        const sourceRefs = matchingLinks.length > 0 ? matchingLinks : [null];

        return sourceRefs.map((link) => ({
            sourceType: fallback.targetType,
            sourceId: fallback.targetId,
            relationType: link?.relationType ?? null,
            label: fallback.label
        }));
    }

    private mergeSourceRefs(left: ProjectHandoverAttachmentSourceRef[], right: ProjectHandoverAttachmentSourceRef[]): ProjectHandoverAttachmentSourceRef[] {
        const refsByKey = new Map<string, ProjectHandoverAttachmentSourceRef>();

        for (const ref of [...left, ...right]) {
            refsByKey.set(`${ref.sourceType}:${ref.sourceId}:${ref.relationType ?? ''}`, ref);
        }

        return [...refsByKey.values()];
    }

    private buildChecklistViewFromCandidates(handover: ProjectHandover, candidates: HandoverAttachmentCandidate[]): ProjectHandoverAttachmentChecklistView {
        const items = candidates.map((candidate): ProjectHandoverAttachmentChecklistItem => this.mapCandidateToChecklistItem(handover, candidate));
        return this.buildChecklistView(handover, items);
    }

    private buildChecklistViewFromSelections(handover: ProjectHandover, selections: ProjectHandoverAttachmentSelection[]): ProjectHandoverAttachmentChecklistView {
        const items = selections.map((selection): ProjectHandoverAttachmentChecklistItem => this.mapSelectionToChecklistItem(selection));
        return this.buildChecklistView(handover, items);
    }

    private buildChecklistView(handover: ProjectHandover, items: ProjectHandoverAttachmentChecklistItem[]): ProjectHandoverAttachmentChecklistView {
        return {
            handoverId: handover.id,
            projectId: handover.projectId,
            generatedAt: new Date().toISOString(),
            counts: {
                total: items.length,
                included: items.filter((item) => item.status === ProjectHandoverAttachmentChecklistItemStatusValue.Included).length,
                missing: items.filter((item) => item.status === ProjectHandoverAttachmentChecklistItemStatusValue.Missing).length,
                excluded: items.filter((item) => item.status === ProjectHandoverAttachmentChecklistItemStatusValue.Excluded).length,
                sensitiveExcluded: items.filter((item) => item.status === ProjectHandoverAttachmentChecklistItemStatusValue.SensitiveExcluded).length,
                staleVersion: items.filter((item) => item.status === ProjectHandoverAttachmentChecklistItemStatusValue.StaleVersion).length,
                downloadable: items.filter((item) => item.downloadEligible).length
            },
            items
        };
    }

    private mapCandidateToChecklistItem(handover: ProjectHandover, candidate: HandoverAttachmentCandidate): ProjectHandoverAttachmentChecklistItem {
        return {
            selectionId: null,
            handoverId: handover.id,
            projectId: handover.projectId,
            attachmentId: candidate.attachment.id,
            versionGroupId: candidate.attachment.versionGroupId ?? candidate.attachment.id,
            displayName: candidate.attachment.displayName,
            category: candidate.attachment.category,
            securityLevel: candidate.attachment.securityLevel,
            status: candidate.status,
            selectionReason: candidate.selectionReason,
            exclusionReason: candidate.exclusionReason,
            downloadEligible: candidate.status === ProjectHandoverAttachmentChecklistItemStatusValue.Included,
            staleVersion: false,
            sourceRefs: candidate.sourceRefs,
            rowVersion: null,
            updatedAt: null
        };
    }

    private mapSelectionToChecklistItem(selection: ProjectHandoverAttachmentSelection): ProjectHandoverAttachmentChecklistItem {
        return {
            selectionId: selection.id,
            handoverId: selection.handoverId,
            projectId: selection.projectId,
            attachmentId: selection.attachmentId ?? null,
            versionGroupId: selection.versionGroupId ?? null,
            displayName: selection.displayName,
            category: selection.category ?? null,
            securityLevel: selection.securityLevel ?? null,
            status: selection.status,
            selectionReason: selection.selectionReason ?? null,
            exclusionReason: selection.exclusionReason ?? null,
            downloadEligible:
                selection.status === ProjectHandoverAttachmentChecklistItemStatusValue.Included &&
                Boolean(selection.attachmentId) &&
                Boolean(selection.securityLevel && BATCH_DOWNLOAD_ALLOWED_SECURITY_LEVELS.includes(selection.securityLevel)),
            staleVersion: selection.status === ProjectHandoverAttachmentChecklistItemStatusValue.StaleVersion,
            sourceRefs: selection.sourceRefs,
            rowVersion: selection.rowVersion,
            updatedAt: selection.updatedAt.toISOString()
        };
    }

    private assertExpectedSelectionVersions(selections: ProjectHandoverAttachmentSelection[], expectations: NonNullable<CreateProjectHandoverAttachmentDownloadPackageRequest['expectedSelectionVersions']>): void {
        const selectionById = new Map(selections.map((selection) => [selection.id, selection]));

        for (const expectation of expectations) {
            const selection = selectionById.get(expectation.selectionId);
            if (!selection) {
                throw new BadRequestException(`Attachment selection ${expectation.selectionId} is not part of this package request`);
            }

            if (selection.rowVersion !== expectation.rowVersion) {
                throw new ConflictException(`Attachment selection ${expectation.selectionId} version mismatch`);
            }
        }
    }

    private buildManifestSummary(includedSelections: ProjectHandoverAttachmentSelection[], excludedSelections: ProjectHandoverAttachmentSelection[]): AttachmentDownloadPackageManifestSummary {
        const excludedReasons = [...new Set(excludedSelections.map((selection) => selection.exclusionReason ?? selection.status))];

        return {
            includedCount: includedSelections.length,
            excludedCount: excludedSelections.length,
            includedAttachmentIds: includedSelections.flatMap((selection) => (selection.attachmentId ? [selection.attachmentId] : [])),
            excludedAttachmentIds: excludedSelections.flatMap((selection) => (selection.attachmentId ? [selection.attachmentId] : [])),
            excludedReasons
        };
    }

    private async createDownloadPackageArchive(
        downloadPackage: AttachmentDownloadPackage,
        includedSelections: ProjectHandoverAttachmentSelection[],
        manifestSummary: AttachmentDownloadPackageManifestSummary
    ): Promise<Buffer> {
        const entries: ZipArchiveEntry[] = [
            {
                name: 'manifest.json',
                data: Buffer.from(
                    JSON.stringify(
                        {
                            packageId: downloadPackage.id,
                            handoverId: downloadPackage.handoverId,
                            projectId: downloadPackage.projectId,
                            createdAt: downloadPackage.createdAt.toISOString(),
                            expiresAt: downloadPackage.expiresAt.toISOString(),
                            manifestSummary,
                            items: includedSelections.map((selection, index) => ({
                                selectionId: selection.id,
                                attachmentId: selection.attachmentId,
                                versionGroupId: selection.versionGroupId,
                                displayName: selection.displayName,
                                category: selection.category,
                                securityLevel: selection.securityLevel,
                                fileName: this.buildPackageEntryName(selection, index),
                                sourceRefs: selection.sourceRefs
                            }))
                        },
                        null,
                        2
                    ),
                    'utf8'
                )
            }
        ];

        for (const [index, selection] of includedSelections.entries()) {
            if (!selection.attachmentId) {
                continue;
            }

            const attachment = await this.requireAttachment(selection.attachmentId);
            const fileBuffer = await this.storageService.readBuffer(this.storageLocationForAttachment(attachment));
            entries.push({
                name: this.buildPackageEntryName(selection, index),
                data: fileBuffer
            });
        }

        return this.buildZipArchive(entries);
    }

    private buildPackageFileName(handover: ProjectHandover): string {
        return `project-handover-${handover.id}-attachments.zip`;
    }

    private buildPackageEntryName(selection: ProjectHandoverAttachmentSelection, index: number): string {
        const extension = selection.displayName.includes('.') ? '' : '.bin';
        return `${String(index + 1).padStart(3, '0')}-${this.sanitizeArchiveEntryName(selection.displayName)}${extension}`;
    }

    private sanitizeArchiveEntryName(name: string): string {
        return name.replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 180) || 'attachment.bin';
    }

    private buildZipArchive(entries: ZipArchiveEntry[]): Buffer {
        const localParts: Buffer[] = [];
        const centralParts: Buffer[] = [];
        let offset = 0;
        const now = new Date();
        const { dosTime, dosDate } = this.toDosDateTime(now);

        for (const entry of entries) {
            const nameBuffer = Buffer.from(entry.name, 'utf8');
            const crc = this.crc32(entry.data);
            const localHeader = Buffer.alloc(30);
            localHeader.writeUInt32LE(0x04034b50, 0);
            localHeader.writeUInt16LE(20, 4);
            localHeader.writeUInt16LE(0x0800, 6);
            localHeader.writeUInt16LE(0, 8);
            localHeader.writeUInt16LE(dosTime, 10);
            localHeader.writeUInt16LE(dosDate, 12);
            localHeader.writeUInt32LE(crc, 14);
            localHeader.writeUInt32LE(entry.data.length, 18);
            localHeader.writeUInt32LE(entry.data.length, 22);
            localHeader.writeUInt16LE(nameBuffer.length, 26);
            localHeader.writeUInt16LE(0, 28);
            localParts.push(localHeader, nameBuffer, entry.data);

            const centralHeader = Buffer.alloc(46);
            centralHeader.writeUInt32LE(0x02014b50, 0);
            centralHeader.writeUInt16LE(20, 4);
            centralHeader.writeUInt16LE(20, 6);
            centralHeader.writeUInt16LE(0x0800, 8);
            centralHeader.writeUInt16LE(0, 10);
            centralHeader.writeUInt16LE(dosTime, 12);
            centralHeader.writeUInt16LE(dosDate, 14);
            centralHeader.writeUInt32LE(crc, 16);
            centralHeader.writeUInt32LE(entry.data.length, 20);
            centralHeader.writeUInt32LE(entry.data.length, 24);
            centralHeader.writeUInt16LE(nameBuffer.length, 28);
            centralHeader.writeUInt16LE(0, 30);
            centralHeader.writeUInt16LE(0, 32);
            centralHeader.writeUInt16LE(0, 34);
            centralHeader.writeUInt16LE(0, 36);
            centralHeader.writeUInt32LE(0, 38);
            centralHeader.writeUInt32LE(offset, 42);
            centralParts.push(centralHeader, nameBuffer);

            offset += localHeader.length + nameBuffer.length + entry.data.length;
        }

        const centralDirectory = Buffer.concat(centralParts);
        const end = Buffer.alloc(22);
        end.writeUInt32LE(0x06054b50, 0);
        end.writeUInt16LE(0, 4);
        end.writeUInt16LE(0, 6);
        end.writeUInt16LE(entries.length, 8);
        end.writeUInt16LE(entries.length, 10);
        end.writeUInt32LE(centralDirectory.length, 12);
        end.writeUInt32LE(offset, 16);
        end.writeUInt16LE(0, 20);

        return Buffer.concat([...localParts, centralDirectory, end]);
    }

    private toDosDateTime(date: Date): { dosTime: number; dosDate: number } {
        const year = Math.max(date.getUTCFullYear(), 1980);
        const dosTime = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);
        const dosDate = ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
        return { dosTime, dosDate };
    }

    private crc32(buffer: Buffer): number {
        let crc = 0xffffffff;

        for (const byte of buffer) {
            crc ^= byte;
            for (let index = 0; index < 8; index += 1) {
                crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
            }
        }

        return (crc ^ 0xffffffff) >>> 0;
    }

    private mapDownloadPackageToSummary(downloadPackage: AttachmentDownloadPackage): AttachmentDownloadPackageSummary {
        return {
            id: downloadPackage.id,
            handoverId: downloadPackage.handoverId,
            projectId: downloadPackage.projectId,
            status: downloadPackage.status,
            manifestSummary: downloadPackage.manifestSummary,
            fileName: downloadPackage.fileName ?? null,
            expiresAt: downloadPackage.expiresAt.toISOString(),
            createdBy: downloadPackage.createdBy ?? null,
            createdAt: downloadPackage.createdAt.toISOString(),
            downloadedAt: downloadPackage.downloadedAt?.toISOString() ?? null,
            downloadCount: downloadPackage.downloadCount,
            failedReason: downloadPackage.failedReason ?? null
        };
    }

    private storageLocationForAttachment(attachment: Attachment): AttachmentObjectLocation {
        return {
            storageProvider: attachment.storageProvider as AttachmentStorageProviderType,
            storageBucket: attachment.storageBucket ?? null,
            storageKey: attachment.storageKey
        };
    }

    private storageLocationForDownloadPackage(downloadPackage: AttachmentDownloadPackage): AttachmentObjectLocation {
        if (!downloadPackage.storageKey) {
            throw new ConflictException(`Attachment download package ${downloadPackage.id} has no stored file`);
        }

        return {
            storageProvider: (downloadPackage.storageProvider ?? 'local') as AttachmentStorageProviderType,
            storageBucket: downloadPackage.storageBucket ?? null,
            storageKey: downloadPackage.storageKey
        };
    }

    private async requireReadableAttachment(id: string, user: UserPayload): Promise<{ attachment: Attachment; links: AttachmentLink[] }> {
        const attachment = await this.requireAttachment(id);
        const links = await this.attachmentRepository.findActiveLinksByAttachmentId(id);

        if (attachment.status !== AttachmentStatusValue.Active) {
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

    private resolveVersionGroupId(attachment: Attachment): string {
        return attachment.versionGroupId ?? attachment.id;
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

    private async requireTargetAccess(targetType: AttachmentTargetType, targetId: string, user: UserPayload, mode: 'read' | 'write'): Promise<Customer | Lead | Project | Contract | SalesFollowUpRecord | ProjectHandover> {
        const permissions = new Set(user.permissions);

        if (!this.hasTargetPermission(targetType, permissions, mode)) {
            throw new ForbiddenException(`Missing ${targetType} ${mode} permission`);
        }

        switch (targetType) {
            case AttachmentTargetTypeValue.Customer: {
                const customer = await this.attachmentRepository.findCustomerById(targetId);
                if (!customer) throw new NotFoundException(`Customer ${targetId} not found`);
                return customer;
            }
            case AttachmentTargetTypeValue.Lead: {
                const lead = await this.attachmentRepository.findLeadById(targetId);
                if (!lead) throw new NotFoundException(`Lead ${targetId} not found`);
                return lead;
            }
            case AttachmentTargetTypeValue.Project: {
                const project = await this.attachmentRepository.findProjectById(targetId);
                if (!project) throw new NotFoundException(`Project ${targetId} not found`);
                return project;
            }
            case AttachmentTargetTypeValue.Contract: {
                const contract = await this.attachmentRepository.findContractById(targetId);
                if (!contract) throw new NotFoundException(`Contract ${targetId} not found`);
                return contract;
            }
            case AttachmentTargetTypeValue.SalesFollowUp: {
                const record = await this.attachmentRepository.findSalesFollowUpById(targetId);
                if (!record) throw new NotFoundException(`Sales follow-up record ${targetId} not found`);
                return record;
            }
            case AttachmentTargetTypeValue.ProjectHandover: {
                const handover = await this.attachmentRepository.findProjectHandoverById(targetId);
                if (!handover) throw new NotFoundException(`Project handover ${targetId} not found`);
                return handover;
            }
        }
    }

    private hasTargetPermission(targetType: AttachmentTargetType, permissions: Set<PermissionKey>, mode: 'read' | 'write'): boolean {
        const permission = mode === 'read' ? 'read' : 'write';

        switch (targetType) {
            case AttachmentTargetTypeValue.Customer:
                return permissions.has(`customer:${permission}` as PermissionKey);
            case AttachmentTargetTypeValue.Lead:
                return permissions.has(`lead:${permission}` as PermissionKey);
            case AttachmentTargetTypeValue.Project:
            case AttachmentTargetTypeValue.Contract:
            case AttachmentTargetTypeValue.ProjectHandover:
                return permissions.has(`project:${permission}` as PermissionKey);
            case AttachmentTargetTypeValue.SalesFollowUp:
                return permissions.has(`customer:${permission}` as PermissionKey) || permissions.has(`lead:${permission}` as PermissionKey) || permissions.has(`project:${permission}` as PermissionKey);
        }
    }

    private canReadAttachmentSecurity(attachment: Attachment, permissions: PermissionKey[]): boolean {
        if (!RESTRICTED_ATTACHMENT_SECURITY_LEVELS.includes(attachment.securityLevel)) {
            return true;
        }

        const permissionSet = new Set(permissions);
        return SENSITIVE_READ_PERMISSIONS.some((permission) => permissionSet.has(permission));
    }

    private parseTargetType(value: string): AttachmentTargetType {
        if (this.isAttachmentTargetType(value)) {
            return value;
        }

        throw new BadRequestException(`Unsupported attachment target type ${value}`);
    }

    private parseSecurityLevel(value: string): AttachmentSecurityLevel {
        if (this.isAttachmentSecurityLevel(value)) {
            return value;
        }

        throw new BadRequestException(`Unsupported attachment security level ${value}`);
    }

    private parseRelationType(value: string): AttachmentRelationType {
        if (this.isAttachmentRelationType(value)) {
            return value;
        }

        throw new BadRequestException(`Unsupported attachment relation type ${value}`);
    }

    private isAttachmentTargetType(value: string): value is AttachmentTargetType {
        return (ATTACHMENT_TARGET_TYPES as readonly string[]).includes(value);
    }

    private isAttachmentSecurityLevel(value: string): value is AttachmentSecurityLevel {
        return (ATTACHMENT_SECURITY_LEVELS as readonly string[]).includes(value);
    }

    private isAttachmentRelationType(value: string): value is AttachmentRelationType {
        return (ATTACHMENT_RELATION_TYPES as readonly string[]).includes(value);
    }

    private defaultSecurityLevel(category: AttachmentCategory): AttachmentSecurityLevel {
        if (SENSITIVE_ATTACHMENT_CATEGORIES.includes(category)) {
            return AttachmentSecurityLevelValue.Sensitive;
        }

        return AttachmentSecurityLevelValue.Internal;
    }

    private async requireAttachmentCategory(value: string): Promise<AttachmentCategory> {
        await this.dictionaryService.requireActiveItem(DictionaryDomainValue.AttachmentCategory, value);
        return value;
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
            status: attachment.status,
            versionGroupId: this.resolveVersionGroupId(attachment),
            versionNo: attachment.versionNo,
            isLatest: attachment.isLatest,
            isFinal: attachment.isFinal
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
