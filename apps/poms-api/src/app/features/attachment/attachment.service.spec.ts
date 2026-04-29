import { ForbiddenException } from '@nestjs/common';
import type { UserPayload } from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { Lead } from '../lead/lead.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Attachment, AttachmentLink } from './attachment.entity';
import { AttachmentRepository } from './attachment.repository';
import { AttachmentStorageService } from './attachment-storage.service';
import { AttachmentService } from './attachment.service';

describe('AttachmentService', () => {
    const attachmentId = '60000000-0000-4000-8000-000000000001';
    const leadId = '50000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const baseDate = new Date('2026-04-30T08:00:00.000Z');

    let service: AttachmentService;
    let repository: jest.Mocked<AttachmentRepository>;
    let storageService: jest.Mocked<AttachmentStorageService>;
    let runtimeAuditService: jest.Mocked<RuntimeAuditService>;

    beforeEach(() => {
        repository = {
            createAttachment: jest.fn((input) => createAttachment(input as Partial<Attachment>)),
            createLink: jest.fn((input) => createLink(input as Partial<AttachmentLink>)),
            saveAttachmentWithLink: jest.fn().mockResolvedValue(undefined),
            saveAll: jest.fn().mockResolvedValue(undefined),
            findAttachmentById: jest.fn(),
            findLinkById: jest.fn(),
            findActiveLinksByAttachmentId: jest.fn(),
            findAttachmentsByTarget: jest.fn(),
            findExistingActiveLink: jest.fn(),
            findCustomerById: jest.fn(),
            findLeadById: jest.fn().mockResolvedValue(Object.assign(new Lead(), { id: leadId })),
            findProjectById: jest.fn(),
            findContractById: jest.fn(),
            findSalesFollowUpById: jest.fn(),
            findPlatformUsersByIds: jest.fn()
        } as unknown as jest.Mocked<AttachmentRepository>;
        storageService = {
            saveOriginal: jest.fn().mockResolvedValue({
                storageProvider: 'local',
                storageBucket: null,
                storageKey: 'attachments/2026/04/30/file/original.pdf'
            }),
            openReadStream: jest.fn(),
            remove: jest.fn()
        } as unknown as jest.Mocked<AttachmentStorageService>;
        runtimeAuditService = {
            recordAuditLog: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<RuntimeAuditService>;

        service = new AttachmentService(repository, storageService, runtimeAuditService);
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
                uploadedBy: userId
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
                targetType: 'attachment',
                operatorId: userId,
                requestId: 'request-1',
                result: 'success'
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

    it('blocks download when no linked target is readable', async () => {
        const attachment = createAttachment();
        repository.findAttachmentById.mockResolvedValue(attachment);
        repository.findActiveLinksByAttachmentId.mockResolvedValue([createLink({ targetType: 'project', targetId: projectId })]);

        await expect(service.openAttachmentDownload(attachment.id, user(['lead:read']))).rejects.toThrow(ForbiddenException);
        expect(storageService.openReadStream).not.toHaveBeenCalled();
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
        return Object.assign(new Attachment(), {
            id: attachmentId,
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
            versionGroupId: null,
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

    function createPlatformUser(): PlatformUser {
        return Object.assign(new PlatformUser(), {
            id: userId,
            username: 'sales_rep',
            displayName: '张销售'
        });
    }
});
