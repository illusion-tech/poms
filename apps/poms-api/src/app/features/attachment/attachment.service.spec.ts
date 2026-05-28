import { BadRequestException, ForbiddenException, UnsupportedMediaTypeException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { AuditLogResultValue } from '@poms/shared-contracts';
import type { UserPayload } from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { DictionaryService } from '../dictionary/dictionary.service';
import { Lead } from '../lead/lead.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { SystemSettingService } from '../system-setting/system-setting.service';
import { Attachment, AttachmentLink } from './attachment.entity';
import { AttachmentUploadSession } from './attachment-upload-session.entity';
import { AttachmentRepository } from './attachment.repository';
import { AttachmentStorageService } from './attachment-storage.service';
import { AttachmentService } from './attachment.service';

describe('AttachmentService', () => {
    const attachmentAuditTargetType = 'attachment';
    const attachmentId = '60000000-0000-4000-8000-000000000001';
    const leadId = '50000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const baseDate = new Date('2026-04-30T08:00:00.000Z');

    let service: AttachmentService;
    let repository: jest.Mocked<AttachmentRepository>;
    let storageService: jest.Mocked<AttachmentStorageService>;
    let runtimeAuditService: jest.Mocked<RuntimeAuditService>;
    let dictionaryService: jest.Mocked<Pick<DictionaryService, 'requireActiveItem'>>;
    let systemSettingService: jest.Mocked<Pick<SystemSettingService, 'getAttachmentMaxUploadSizeBytes'>>;

    beforeEach(() => {
        repository = {
            createAttachment: jest.fn((input) => createAttachment(input as Partial<Attachment>)),
            createLink: jest.fn((input) => createLink(input as Partial<AttachmentLink>)),
            createUploadSession: jest.fn((input) => createUploadSession(input as Partial<AttachmentUploadSession>)),
            saveAttachmentWithLink: jest.fn().mockResolvedValue(undefined),
            saveAll: jest.fn().mockResolvedValue(undefined),
            saveUploadSession: jest.fn().mockResolvedValue(undefined),
            findAttachmentById: jest.fn(),
            findUploadSessionById: jest.fn(),
            findLinkById: jest.fn(),
            findActiveLinksByAttachmentId: jest.fn(),
            findAttachmentsByTarget: jest.fn(),
            findAttachmentCenterRows: jest.fn(),
            findAttachmentsByVersionGroupId: jest.fn().mockResolvedValue([]),
            findLatestAttachmentByVersionGroupId: jest.fn().mockResolvedValue(null),
            findExistingActiveLink: jest.fn(),
            findCustomerById: jest.fn(),
            findCustomersByIds: jest.fn().mockResolvedValue([]),
            findLeadById: jest.fn().mockResolvedValue(Object.assign(new Lead(), { id: leadId })),
            findLeadsByIds: jest.fn().mockResolvedValue([]),
            findProjectById: jest.fn(),
            findProjectsByIds: jest.fn().mockResolvedValue([]),
            findContractById: jest.fn(),
            findContractsByIds: jest.fn().mockResolvedValue([]),
            findSalesFollowUpById: jest.fn(),
            findPlatformUsersByIds: jest.fn()
        } as unknown as jest.Mocked<AttachmentRepository>;
        storageService = {
            saveOriginal: jest.fn().mockResolvedValue({
                storageProvider: 'local',
                storageBucket: null,
                storageKey: 'attachments/2026/04/30/file/original.pdf'
            }),
            createOriginalUploadPlan: jest.fn().mockResolvedValue({
                storageProvider: 'local',
                storageBucket: null,
                storageKey: 'attachments/uploads/2026/04/30/session/original.pdf',
                uploadMode: 'proxy'
            }),
            saveUploadSessionObject: jest.fn().mockResolvedValue({
                storageProvider: 'local',
                storageBucket: null,
                storageKey: 'attachments/uploads/2026/04/30/session/original.pdf'
            }),
            createPresignedPutTarget: jest.fn(),
            headObject: jest.fn(),
            readBuffer: jest.fn(),
            openReadStream: jest.fn(),
            remove: jest.fn()
        } as unknown as jest.Mocked<AttachmentStorageService>;
        runtimeAuditService = {
            recordAuditLog: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<RuntimeAuditService>;
        dictionaryService = {
            requireActiveItem: jest.fn().mockResolvedValue(undefined)
        };
        systemSettingService = {
            getAttachmentMaxUploadSizeBytes: jest.fn().mockResolvedValue(50 * 1024 * 1024)
        };

        service = new AttachmentService(repository, storageService, runtimeAuditService, dictionaryService as never, systemSettingService as never);
    });

    it('creates an upload session without creating an attachment row', async () => {
        const result = await service.createAttachmentUploadSession(
            {
                operationType: 'create-attachment',
                targetType: 'lead',
                targetId: leadId,
                category: 'demand',
                originalName: '需求确认.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 16
            },
            user(['lead:write']),
            'request-session'
        );

        expect(storageService.createOriginalUploadPlan).toHaveBeenCalledWith(
            expect.objectContaining({
                originalName: '需求确认.pdf',
                sizeBytes: 16
            })
        );
        expect(repository.createUploadSession).toHaveBeenCalledWith(
            expect.objectContaining({
                operationType: 'create-attachment',
                status: 'pending',
                uploadMode: 'proxy',
                targetType: 'lead',
                targetId: leadId,
                category: 'demand',
                maxSizeBytes: 50 * 1024 * 1024
            })
        );
        expect(repository.createAttachment).not.toHaveBeenCalled();
        expect(repository.saveUploadSession).toHaveBeenCalledWith(expect.any(AttachmentUploadSession));
        expect(result.status).toBe('pending');
        expect(result.uploadMode).toBe('proxy');
        expect(result.maxSizeBytes).toBe(50 * 1024 * 1024);
    });

    it('rejects upload sessions above the system setting limit', async () => {
        systemSettingService.getAttachmentMaxUploadSizeBytes.mockResolvedValueOnce(8);

        await expect(
            service.createAttachmentUploadSession(
                {
                    operationType: 'create-attachment',
                    targetType: 'lead',
                    targetId: leadId,
                    category: 'demand',
                    originalName: '需求确认.pdf',
                    sizeBytes: 9
                },
                user(['lead:write'])
            )
        ).rejects.toThrow(BadRequestException);

        expect(repository.createUploadSession).not.toHaveBeenCalled();
    });

    it('returns upload target with the upload session frozen max size', async () => {
        const session = createUploadSession({ maxSizeBytes: 8 });
        repository.findUploadSessionById.mockResolvedValue(session);

        const result = await service.createAttachmentUploadTarget(session.id, {}, user(['lead:write']));

        expect(result.maxSizeBytes).toBe(8);
        expect(systemSettingService.getAttachmentMaxUploadSizeBytes).not.toHaveBeenCalled();
    });

    it('stores a proxy upload object and creates the attachment only when the session completes', async () => {
        const buffer = Buffer.from('attachment bytes');
        const checksumSha256 = createHash('sha256').update(buffer).digest('hex');
        const session = createUploadSession({
            sizeBytes: buffer.length,
            checksumSha256
        });
        repository.findUploadSessionById.mockResolvedValue(session);
        storageService.headObject.mockResolvedValue({
            sizeBytes: buffer.length,
            eTag: null,
            lastModified: baseDate.toISOString(),
            contentType: 'application/pdf',
            checksumSha256
        });
        storageService.readBuffer.mockResolvedValue(buffer);

        const uploadResult = await service.proxyUploadAttachmentObject(session.id, buffer, user(['lead:write']));

        expect(storageService.saveUploadSessionObject).toHaveBeenCalledWith(
            expect.objectContaining({
                storageProvider: 'local',
                storageKey: session.storageKey
            }),
            expect.objectContaining({
                buffer
            })
        );
        expect(uploadResult.status).toBe('uploaded');
        expect(repository.createAttachment).not.toHaveBeenCalled();

        const completed = await service.completeAttachmentUploadSession(session.id, { expectedVersion: session.rowVersion }, user(['lead:write']), 'request-complete');

        expect(storageService.headObject).toHaveBeenCalledWith(
            expect.objectContaining({
                storageProvider: 'local',
                storageKey: session.storageKey
            })
        );
        expect(repository.createAttachment).toHaveBeenCalledWith(
            expect.objectContaining({
                originalName: session.originalName,
                storageKey: session.storageKey,
                checksumSha256,
                status: 'active'
            })
        );
        expect(repository.saveAttachmentWithLink).toHaveBeenCalledWith(expect.any(Attachment), expect.any(AttachmentLink));
        expect(completed.links).toHaveLength(1);
        expect(session.status).toBe('completed');
        expect(session.completedAttachmentId).toBe(completed.id);
    });

    it('completes a presigned upload from checksum metadata without downloading the object', async () => {
        const buffer = Buffer.from('attachment bytes');
        const checksumSha256 = createHash('sha256').update(buffer).digest('hex');
        const session = createUploadSession({
            status: 'uploading',
            uploadMode: 'presigned-put',
            providerType: 'huawei-obs-s3',
            storageBucket: 'poms',
            sizeBytes: buffer.length,
            checksumSha256
        });
        repository.findUploadSessionById.mockResolvedValue(session);
        storageService.headObject.mockResolvedValue({
            sizeBytes: buffer.length,
            eTag: null,
            lastModified: baseDate.toISOString(),
            contentType: 'application/pdf',
            checksumSha256
        });

        const completed = await service.completeAttachmentUploadSession(session.id, { checksumSha256 }, user(['lead:write']), 'request-complete');

        expect(storageService.headObject).toHaveBeenCalledWith(
            expect.objectContaining({
                storageProvider: 'huawei-obs-s3',
                storageBucket: 'poms',
                storageKey: session.storageKey
            })
        );
        expect(storageService.readBuffer).not.toHaveBeenCalled();
        expect(repository.createAttachment).toHaveBeenCalledWith(
            expect.objectContaining({
                checksumSha256,
                status: 'active'
            })
        );
        expect(completed.links).toHaveLength(1);
    });

    it('uploads attachment metadata, stores the file, links the target and audits the action', async () => {
        const result = await service.uploadAttachment(
            {
                originalname: '需求确认.pdf',
                mimetype: 'application/pdf',
                size: 16,
                buffer: Buffer.from('attachment bytes')
            },
            {
                targetType: 'lead',
                targetId: leadId,
                category: 'demand',
                securityLevel: 'internal',
                description: '客户首次提供需求'
            },
            user(['lead:write']),
            'request-1'
        );

        expect(storageService.saveOriginal).toHaveBeenCalledWith(
            expect.objectContaining({
                originalName: '需求确认.pdf',
                buffer: Buffer.from('attachment bytes')
            })
        );
        expect(repository.createAttachment).toHaveBeenCalledWith(
            expect.objectContaining({
                originalName: '需求确认.pdf',
                displayName: '需求确认.pdf',
                extension: 'pdf',
                category: 'demand',
                securityLevel: 'internal',
                status: 'active',
                uploadedBy: userId,
                versionGroupId: expect.any(String)
            })
        );
        expect(repository.createLink).toHaveBeenCalledWith(
            expect.objectContaining({
                targetType: 'lead',
                targetId: leadId,
                relationType: 'normal',
                status: 'active',
                linkedBy: userId
            })
        );
        expect(repository.saveAttachmentWithLink).toHaveBeenCalledWith(expect.any(Attachment), expect.any(AttachmentLink));
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'attachment.uploaded',
                targetType: attachmentAuditTargetType,
                operatorId: userId,
                requestId: 'request-1',
                result: AuditLogResultValue.Success
            })
        );
        expect(result.category).toBe('demand');
        expect(result.links).toHaveLength(1);
    });

    it('filters confidential attachments when the user lacks sensitive-read permission', async () => {
        const internal = createAttachment({ id: attachmentId, securityLevel: 'internal', displayName: '需求.pdf' });
        const confidential = createAttachment({
            id: '60000000-0000-4000-8000-000000000002',
            securityLevel: 'confidential',
            displayName: '合同.pdf'
        });
        repository.findAttachmentsByTarget.mockResolvedValue([
            { attachment: internal, links: [createLink({ attachmentId: internal.id })] },
            { attachment: confidential, links: [createLink({ attachmentId: confidential.id })] }
        ]);
        repository.findPlatformUsersByIds.mockResolvedValue([createPlatformUser()]);

        const result = await service.listAttachments(
            {
                targetType: 'lead',
                targetId: leadId
            },
            user(['lead:read'])
        );

        expect(result.map((attachment) => attachment.displayName)).toEqual(['需求.pdf']);
    });

    it('allows confidential attachments only with sensitive-read permission', async () => {
        const confidential = createAttachment({ securityLevel: 'confidential', displayName: '合同.pdf' });
        repository.findAttachmentsByTarget.mockResolvedValue([{ attachment: confidential, links: [createLink({ attachmentId: confidential.id })] }]);
        repository.findPlatformUsersByIds.mockResolvedValue([createPlatformUser()]);

        const result = await service.listAttachments(
            {
                targetType: 'lead',
                targetId: leadId
            },
            user(['lead:read', 'contract:finance:sensitive:read'])
        );

        expect(result).toHaveLength(1);
        expect(result[0].securityLevel).toBe('confidential');
    });

    it('lists attachment center records through one aggregate repository read', async () => {
        const attachment = createAttachment({ displayName: '需求确认.pdf' });
        const link = createLink({ attachmentId: attachment.id, targetType: 'lead', targetId: leadId });
        repository.findAttachmentCenterRows.mockResolvedValue([{ attachment, link, links: [link] }]);
        repository.findLeadsByIds.mockResolvedValue([Object.assign(new Lead(), { id: leadId, leadNo: 'LEAD-001', leadName: '智慧校园' })]);
        repository.findPlatformUsersByIds.mockResolvedValue([createPlatformUser()]);

        const result = await service.listAttachmentCenterRecords(user(['lead:read']));

        expect(repository.findAttachmentCenterRows).toHaveBeenCalledWith({ targetTypes: ['lead'] });
        expect(result).toEqual([
            expect.objectContaining({
                targetType: 'lead',
                targetId: leadId,
                targetNo: 'LEAD-001',
                targetName: '智慧校园',
                attachment: expect.objectContaining({
                    displayName: '需求确认.pdf',
                    uploadedByName: '张销售'
                })
            })
        ]);
    });

    it('blocks download when no linked target is readable', async () => {
        const attachment = createAttachment();
        repository.findAttachmentById.mockResolvedValue(attachment);
        repository.findActiveLinksByAttachmentId.mockResolvedValue([createLink({ targetType: 'project', targetId: projectId })]);

        await expect(service.openAttachmentDownload(attachment.id, user(['lead:read']))).rejects.toThrow(ForbiddenException);
        expect(storageService.openReadStream).not.toHaveBeenCalled();
    });

    it('opens legacy local attachment downloads through the storage service', async () => {
        const stream = Readable.from(['legacy local bytes']);
        const attachment = createAttachment({
            storageProvider: 'local',
            storageBucket: null,
            storageKey: 'attachments/legacy/original.pdf'
        });
        repository.findAttachmentById.mockResolvedValue(attachment);
        repository.findActiveLinksByAttachmentId.mockResolvedValue([createLink({ attachmentId: attachment.id })]);
        storageService.openReadStream.mockResolvedValue(stream);

        const result = await service.openAttachmentDownload(attachment.id, user(['lead:read']), 'request-download');

        expect(result.stream).toBe(stream);
        expect(storageService.openReadStream).toHaveBeenCalledWith({
            storageProvider: 'local',
            storageBucket: null,
            storageKey: 'attachments/legacy/original.pdf'
        });
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'attachment.downloaded',
                targetId: attachment.id,
                requestId: 'request-download'
            })
        );
    });

    it('opens supported previews and audits the read', async () => {
        const stream = Readable.from(['image bytes']);
        const attachment = createAttachment({
            originalName: '现场照片.png',
            displayName: '现场照片.png',
            extension: 'png',
            mimeType: 'image/png'
        });
        repository.findAttachmentById.mockResolvedValue(attachment);
        repository.findActiveLinksByAttachmentId.mockResolvedValue([createLink({ attachmentId: attachment.id })]);
        storageService.openReadStream.mockResolvedValue(stream);

        const result = await service.openAttachmentPreview(attachment.id, user(['lead:read']), 'request-preview');

        expect(result.stream).toBe(stream);
        expect(storageService.openReadStream).toHaveBeenCalledWith({
            storageProvider: attachment.storageProvider,
            storageBucket: attachment.storageBucket,
            storageKey: attachment.storageKey
        });
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'attachment.previewed',
                targetId: attachment.id,
                requestId: 'request-preview'
            })
        );
    });

    it('rejects previews for unsupported file types before opening storage', async () => {
        const attachment = createAttachment({
            originalName: '合同草案.docx',
            displayName: '合同草案.docx',
            extension: 'docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        repository.findAttachmentById.mockResolvedValue(attachment);
        repository.findActiveLinksByAttachmentId.mockResolvedValue([createLink({ attachmentId: attachment.id })]);

        await expect(service.openAttachmentPreview(attachment.id, user(['lead:read']))).rejects.toThrow(UnsupportedMediaTypeException);
        expect(storageService.openReadStream).not.toHaveBeenCalled();
    });

    it('opens image thumbnails through the same protected storage path', async () => {
        const stream = Readable.from(['thumbnail bytes']);
        const attachment = createAttachment({
            originalName: '现场照片.png',
            displayName: '现场照片.png',
            extension: 'png',
            mimeType: 'image/png',
            storageProvider: 'local',
            storageBucket: null,
            storageKey: 'attachments/legacy/photo.png'
        });
        repository.findAttachmentById.mockResolvedValue(attachment);
        repository.findActiveLinksByAttachmentId.mockResolvedValue([createLink({ attachmentId: attachment.id })]);
        storageService.openReadStream.mockResolvedValue(stream);

        const result = await service.openAttachmentThumbnail(attachment.id, user(['lead:read']), 'request-thumbnail');

        expect(result.stream).toBe(stream);
        expect(storageService.openReadStream).toHaveBeenCalledWith({
            storageProvider: 'local',
            storageBucket: null,
            storageKey: 'attachments/legacy/photo.png'
        });
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'attachment.thumbnail_viewed',
                targetId: attachment.id,
                requestId: 'request-thumbnail'
            })
        );
    });

    it('creates a new version from the latest attachment and copies active links', async () => {
        const versionGroupId = '70000000-0000-4000-8000-000000000001';
        const latest = createAttachment({ versionGroupId, versionNo: 1, isLatest: true, isFinal: true });
        const link = createLink({ attachmentId: latest.id });
        repository.findAttachmentById.mockResolvedValue(latest);
        repository.findLatestAttachmentByVersionGroupId.mockResolvedValue(latest);
        repository.findActiveLinksByAttachmentId.mockResolvedValue([link]);

        const result = await service.uploadAttachmentVersion(
            latest.id,
            {
                originalname: '需求确认-v2.pdf',
                mimetype: 'application/pdf',
                size: 20,
                buffer: Buffer.from('attachment v2 bytes')
            },
            {
                changeNote: '替换为客户确认版本'
            },
            user(['lead:write']),
            'request-version'
        );

        expect(latest.isLatest).toBe(false);
        expect(repository.createAttachment).toHaveBeenCalledWith(
            expect.objectContaining({
                originalName: '需求确认-v2.pdf',
                versionGroupId,
                versionNo: 2,
                isLatest: true,
                isFinal: false,
                previousAttachmentId: latest.id,
                changeNote: '替换为客户确认版本'
            })
        );
        expect(repository.createLink).toHaveBeenCalledWith(
            expect.objectContaining({
                attachmentId: result.id,
                targetType: 'lead',
                targetId: leadId,
                relationType: 'normal'
            })
        );
        expect(repository.saveAll).toHaveBeenCalledWith([latest, expect.any(Attachment), expect.any(AttachmentLink)]);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'attachment.version_created',
                targetId: result.id,
                requestId: 'request-version'
            })
        );
        expect(result.versionNo).toBe(2);
        expect(result.previousAttachmentId).toBe(latest.id);
        expect(result.isFinal).toBe(false);
    });

    it('marks one version as final and clears previous final versions in the group', async () => {
        const versionGroupId = '70000000-0000-4000-8000-000000000001';
        const previousFinal = createAttachment({
            id: '60000000-0000-4000-8000-000000000011',
            versionGroupId,
            versionNo: 1,
            isLatest: false,
            isFinal: true
        });
        const current = createAttachment({
            id: '60000000-0000-4000-8000-000000000012',
            versionGroupId,
            versionNo: 2,
            isLatest: true,
            isFinal: false
        });
        repository.findAttachmentById.mockResolvedValue(current);
        repository.findActiveLinksByAttachmentId.mockResolvedValue([createLink({ attachmentId: current.id })]);
        repository.findAttachmentsByVersionGroupId.mockResolvedValue([current, previousFinal]);
        repository.findPlatformUsersByIds.mockResolvedValue([createPlatformUser()]);

        const result = await service.markAttachmentFinal(current.id, { note: '确认盖章版' }, user(['lead:read', 'lead:write']), 'request-final');

        expect(previousFinal.isFinal).toBe(false);
        expect(current.isFinal).toBe(true);
        expect(repository.saveAll).toHaveBeenCalledWith(expect.arrayContaining([current, previousFinal]));
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'attachment.final_marked',
                targetId: current.id,
                requestId: 'request-final'
            })
        );
        expect(result.isFinal).toBe(true);
    });

    it('voids an attachment and returns the voided summary without requiring active status', async () => {
        const attachment = createAttachment();
        repository.findAttachmentById.mockResolvedValue(attachment);
        repository.findActiveLinksByAttachmentId.mockResolvedValue([createLink()]);
        repository.findPlatformUsersByIds.mockResolvedValue([createPlatformUser()]);

        const result = await service.voidAttachment(attachment.id, { reason: '重复上传' }, user(['lead:write']), 'request-2');

        expect(result.status).toBe('voided');
        expect(result.deletedAt).not.toBeNull();
        expect(repository.saveAll).toHaveBeenCalledWith([attachment]);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'attachment.voided',
                targetId: attachment.id,
                requestId: 'request-2'
            })
        );
    });

    it('copies active source links to project and excludes protected categories', async () => {
        const demandAttachment = createAttachment({ id: attachmentId, category: 'demand' });
        const financeAttachment = createAttachment({
            id: '60000000-0000-4000-8000-000000000003',
            category: 'finance'
        });
        repository.findAttachmentsByTarget.mockResolvedValue([
            { attachment: demandAttachment, links: [createLink({ attachmentId: demandAttachment.id })] },
            { attachment: financeAttachment, links: [createLink({ attachmentId: financeAttachment.id })] }
        ]);
        repository.findExistingActiveLink.mockResolvedValue(null);

        await service.copyActiveLinksToTarget({
            from: { targetType: 'lead', targetId: leadId },
            to: { targetType: 'project', targetId: projectId },
            relationType: 'source',
            operatorUserId: userId,
            excludeCategories: ['finance']
        });

        expect(repository.createLink).toHaveBeenCalledTimes(1);
        expect(repository.createLink).toHaveBeenCalledWith(
            expect.objectContaining({
                attachmentId,
                targetType: 'project',
                targetId: projectId,
                relationType: 'source'
            })
        );
        expect(repository.saveAll).toHaveBeenCalledWith([expect.any(AttachmentLink)]);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'attachment.link_copied_to_project',
                targetId: projectId
            })
        );
    });

    function user(permissions: UserPayload['permissions']): UserPayload {
        return {
            sub: userId,
            username: 'sales_rep',
            permissions
        };
    }

    function createAttachment(overrides: Partial<Attachment> = {}): Attachment {
        const id = overrides.id ?? attachmentId;
        return Object.assign(new Attachment(), {
            id,
            originalName: '需求确认.pdf',
            displayName: '需求确认.pdf',
            extension: 'pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1024,
            checksumSha256: 'a'.repeat(64),
            category: 'demand',
            securityLevel: 'internal',
            storageProvider: 'local',
            storageBucket: null,
            storageKey: 'attachments/2026/04/30/file/original.pdf',
            status: 'active',
            description: null,
            versionGroupId: id,
            versionNo: 1,
            isLatest: true,
            isFinal: false,
            previousAttachmentId: null,
            changeNote: null,
            uploadedBy: userId,
            uploadedAt: baseDate,
            deletedBy: null,
            deletedAt: null,
            rowVersion: 1,
            createdAt: baseDate,
            updatedAt: baseDate,
            ...overrides
        });
    }

    function createLink(overrides: Partial<AttachmentLink> = {}): AttachmentLink {
        return Object.assign(new AttachmentLink(), {
            id: '61000000-0000-4000-8000-000000000001',
            attachmentId,
            targetType: 'lead',
            targetId: leadId,
            relationType: 'normal',
            status: 'active',
            linkedBy: userId,
            linkedAt: baseDate,
            unlinkedBy: null,
            unlinkedAt: null,
            ...overrides
        });
    }

    function createUploadSession(overrides: Partial<AttachmentUploadSession> = {}): AttachmentUploadSession {
        return Object.assign(new AttachmentUploadSession(), {
            id: '62000000-0000-4000-8000-000000000001',
            operationType: 'create-attachment',
            status: 'pending',
            uploadMode: 'proxy',
            providerType: 'local',
            storageBucket: null,
            storageKey: 'attachments/uploads/2026/04/30/session/original.pdf',
            targetType: 'lead',
            targetId: leadId,
            baseAttachmentId: null,
            completedAttachmentId: null,
            originalName: '需求确认.pdf',
            displayName: '需求确认.pdf',
            extension: 'pdf',
            mimeType: 'application/pdf',
            sizeBytes: 16,
            maxSizeBytes: 50 * 1024 * 1024,
            checksumSha256: null,
            category: 'demand',
            securityLevel: 'internal',
            relationType: 'normal',
            description: null,
            changeNote: null,
            expiresAt: new Date('2099-05-11T08:00:00.000Z'),
            uploadedAt: null,
            completedAt: null,
            abortedAt: null,
            failedReason: null,
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            ...overrides
        });
    }

    function createPlatformUser(): PlatformUser {
        return Object.assign(new PlatformUser(), {
            id: userId,
            username: 'sales_rep',
            displayName: '张销售'
        });
    }
});
