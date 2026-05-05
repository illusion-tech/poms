import { AttachmentDownloadPackageStatusValue, ProjectHandoverAttachmentChecklistItemStatusValue, type UserPayload } from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { DictionaryService } from '../dictionary/dictionary.service';
import { Project } from '../project/project.entity';
import { ProjectHandover } from '../project-handover/project-handover.entity';
import {
    Attachment,
    AttachmentDownloadPackage,
    AttachmentDownloadPackageItem,
    AttachmentLink,
    ProjectHandoverAttachmentSelection
} from './attachment.entity';
import { AttachmentRepository } from './attachment.repository';
import { AttachmentStorageService } from './attachment-storage.service';
import { AttachmentService } from './attachment.service';

describe('AttachmentService handover runtime', () => {
    const handoverId = '71000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const leadId = '50000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const baseDate = new Date('2026-05-05T08:00:00.000Z');

    let service: AttachmentService;
    let repository: jest.Mocked<AttachmentRepository>;
    let storageService: jest.Mocked<AttachmentStorageService>;
    let runtimeAuditService: jest.Mocked<RuntimeAuditService>;

    beforeEach(() => {
        repository = {
            findProjectHandoverById: jest.fn().mockResolvedValue(makeHandover()),
            findProjectById: jest.fn().mockResolvedValue(makeProject()),
            findContractsByProjectId: jest.fn().mockResolvedValue([]),
            findSalesFollowUpsForHandoverSources: jest.fn().mockResolvedValue([]),
            findAttachmentsByTarget: jest.fn().mockResolvedValue([]),
            findFinalAttachmentByVersionGroupId: jest.fn().mockResolvedValue(null),
            findHandoverSelectionsByHandoverId: jest.fn().mockResolvedValue([]),
            findHandoverSelectionsByIds: jest.fn().mockResolvedValue([]),
            createHandoverAttachmentSelection: jest.fn((input) => Object.assign(new ProjectHandoverAttachmentSelection(), { rowVersion: 1, createdAt: baseDate, updatedAt: baseDate }, input)),
            createLink: jest.fn((input) => Object.assign(new AttachmentLink(), { id: 'link-1', linkedAt: baseDate }, input)),
            findExistingActiveLink: jest.fn().mockResolvedValue(null),
            createDownloadPackage: jest.fn((input) => Object.assign(new AttachmentDownloadPackage(), input)),
            createDownloadPackageItem: jest.fn((input) => Object.assign(new AttachmentDownloadPackageItem(), { id: `item-${input.attachmentId ?? 'excluded'}`, createdAt: baseDate }, input)),
            saveHandoverEntities: jest.fn().mockResolvedValue(undefined),
            findAttachmentById: jest.fn(),
            findDownloadPackageById: jest.fn(),
            findDownloadPackageItemsByPackageId: jest.fn()
        } as unknown as jest.Mocked<AttachmentRepository>;
        storageService = {
            readBuffer: jest.fn(),
            saveDownloadPackage: jest.fn(),
            openReadStream: jest.fn()
        } as unknown as jest.Mocked<AttachmentStorageService>;
        runtimeAuditService = {
            recordAuditLog: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<RuntimeAuditService>;

        service = new AttachmentService(repository, storageService, runtimeAuditService, {} as DictionaryService);
    });

    it('refreshes a handover checklist with final-version selection and sensitive exclusion', async () => {
        const versionGroupId = '77000000-0000-4000-8000-000000000001';
        const latest = makeAttachment({
            id: '60000000-0000-4000-8000-000000000001',
            versionGroupId,
            versionNo: 2,
            isLatest: true,
            isFinal: false,
            displayName: '需求确认-v2.pdf'
        });
        const finalVersion = makeAttachment({
            id: '60000000-0000-4000-8000-000000000002',
            versionGroupId,
            versionNo: 1,
            isLatest: false,
            isFinal: true,
            displayName: '需求确认-final.pdf'
        });
        const sensitive = makeAttachment({
            id: '60000000-0000-4000-8000-000000000003',
            versionGroupId: '77000000-0000-4000-8000-000000000003',
            displayName: '内部测算.xlsx',
            securityLevel: 'sensitive'
        });
        repository.findAttachmentsByTarget.mockImplementation(async (query) => {
            if (query.targetType === 'lead') {
                return [{ attachment: latest, links: [makeLink({ attachmentId: latest.id, targetType: 'lead', targetId: leadId })] }];
            }

            if (query.targetType === 'project') {
                return [{ attachment: sensitive, links: [makeLink({ attachmentId: sensitive.id, targetType: 'project', targetId: projectId })] }];
            }

            return [];
        });
        repository.findFinalAttachmentByVersionGroupId.mockImplementation(async (inputVersionGroupId) => (inputVersionGroupId === versionGroupId ? finalVersion : null));

        const result = await service.refreshProjectHandoverAttachmentChecklist(
            handoverId,
            { preserveManualExclusions: true, includeHistoricalSelections: true },
            user(['project:write'])
        );

        expect(result.counts.included).toBe(1);
        expect(result.counts.sensitiveExcluded).toBe(1);
        expect(result.items.find((item) => item.displayName === '需求确认-final.pdf')).toMatchObject({
            attachmentId: finalVersion.id,
            selectionReason: 'final',
            status: ProjectHandoverAttachmentChecklistItemStatusValue.Included
        });
        expect(repository.createLink).toHaveBeenCalledWith(
            expect.objectContaining({
                attachmentId: finalVersion.id,
                targetType: 'project-handover',
                targetId: handoverId,
                relationType: 'handover'
            })
        );
        expect(repository.saveHandoverEntities).toHaveBeenCalled();
    });

    it('creates a ready short-lived zip download package from included selections', async () => {
        const attachment = makeAttachment({ id: '60000000-0000-4000-8000-000000000010', displayName: '交付清单.pdf' });
        const selection = makeSelection({ attachmentId: attachment.id, displayName: attachment.displayName });
        repository.findHandoverSelectionsByHandoverId.mockResolvedValue([selection]);
        repository.findAttachmentById.mockResolvedValue(attachment);
        storageService.readBuffer.mockResolvedValue(Buffer.from('attachment-bytes'));
        storageService.saveDownloadPackage.mockResolvedValue({
            storageProvider: 'local',
            storageBucket: null,
            storageKey: 'attachment-download-packages/pkg.zip'
        });

        const result = await service.createProjectHandoverAttachmentDownloadPackage(
            handoverId,
            { confirmedSensitiveExclusion: true },
            user(['project:read'])
        );

        expect(result.status).toBe(AttachmentDownloadPackageStatusValue.Ready);
        expect(result.manifestSummary.includedAttachmentIds).toEqual([attachment.id]);
        expect(storageService.saveDownloadPackage).toHaveBeenCalledWith(
            expect.objectContaining({
                buffer: expect.any(Buffer)
            })
        );
        const savedBuffer = storageService.saveDownloadPackage.mock.calls[0][0].buffer;
        expect(savedBuffer.subarray(0, 4).toString('hex')).toBe('504b0304');
    });

    function user(permissions: string[]): UserPayload {
        return {
            sub: userId,
            username: 'sales',
            permissions: permissions as UserPayload['permissions'],
            roles: [],
            orgUnitIds: []
        };
    }

    function makeHandover(overrides: Partial<ProjectHandover> = {}): ProjectHandover {
        return Object.assign(new ProjectHandover(), {
            id: handoverId,
            projectId,
            status: 'draft',
            rowVersion: 1,
            createdAt: baseDate,
            updatedAt: baseDate,
            ...overrides
        });
    }

    function makeProject(overrides: Partial<Project> = {}): Project {
        return Object.assign(new Project(), {
            id: projectId,
            sourceLeadId: leadId,
            projectNo: 'PRJ-2026-001',
            projectName: '项目移交测试',
            ...overrides
        });
    }

    function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
        const id = overrides.id ?? '60000000-0000-4000-8000-000000000001';
        return Object.assign(new Attachment(), {
            id,
            originalName: '需求确认.pdf',
            displayName: '需求确认.pdf',
            extension: 'pdf',
            mimeType: 'application/pdf',
            sizeBytes: 16,
            checksumSha256: 'a'.repeat(64),
            category: 'demand',
            securityLevel: 'internal',
            storageProvider: 'local',
            storageBucket: null,
            storageKey: `attachments/${id}/original.pdf`,
            status: 'active',
            description: null,
            versionGroupId: overrides.versionGroupId ?? id,
            versionNo: 1,
            isLatest: true,
            isFinal: false,
            previousAttachmentId: null,
            changeNote: null,
            uploadedBy: userId,
            uploadedAt: baseDate,
            updatedAt: baseDate,
            rowVersion: 1,
            ...overrides
        });
    }

    function makeLink(overrides: Partial<AttachmentLink> = {}): AttachmentLink {
        return Object.assign(new AttachmentLink(), {
            id: 'link-1',
            attachmentId: overrides.attachmentId ?? '60000000-0000-4000-8000-000000000001',
            targetType: 'lead',
            targetId: leadId,
            relationType: 'normal',
            status: 'active',
            linkedBy: userId,
            linkedAt: baseDate,
            ...overrides
        });
    }

    function makeSelection(overrides: Partial<ProjectHandoverAttachmentSelection> = {}): ProjectHandoverAttachmentSelection {
        const attachmentId = overrides.attachmentId ?? '60000000-0000-4000-8000-000000000010';
        return Object.assign(new ProjectHandoverAttachmentSelection(), {
            id: '78000000-0000-4000-8000-000000000001',
            handoverId,
            projectId,
            attachmentId,
            versionGroupId: attachmentId,
            displayName: '交付清单.pdf',
            category: 'demand',
            securityLevel: 'internal',
            status: 'included',
            selectionReason: 'latest-no-final',
            exclusionReason: null,
            sourceRefs: [{ sourceType: 'project', sourceId: projectId, relationType: 'normal', label: '项目附件' }],
            rowVersion: 1,
            createdAt: baseDate,
            updatedAt: baseDate,
            ...overrides
        });
    }
});
