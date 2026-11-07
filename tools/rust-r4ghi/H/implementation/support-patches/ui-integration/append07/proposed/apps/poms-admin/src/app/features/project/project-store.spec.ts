import { FullProjectDetailViewSchema, CreatorFirstAssignmentAnchorViewSchema, LegacyOwnerAnchorViewSchema } from '@poms/shared-contracts';
import { TestBed } from '@angular/core/testing';
import {
    ProjectApi,
    CreateProjectArchiveRecordRequestInputVersionEnum,
    ReplaceProjectArchiveRecordRequestInputVersionEnum,
    VoidProjectArchiveRecordRequestInputVersionEnum,
    ProjectArchiveRecordSummaryArchiveAnchorSourceTypeEnum,
    ProjectArchiveRecordSummaryArchiveAnchorStageEnum,
    ProjectArchiveRecordSummaryStatusEnum,
    ProjectStage,
    ProjectStatus,
    ProjectStore,
    ProjectTimelineEventEventTypeEnum,
    ProjectTimelineEventSourceTypeEnum,
    type ProjectArchiveRecordSummary,
    type FullProjectDetailView as ProjectDetailView,
    type ProjectSummary,
    type ProjectTimelineView
} from '@poms/admin-data-access';
import { of, Subject, throwError } from 'rxjs';

function sensitiveProjection(value: string | null, mode: 'full' | 'masked' = value === null ? 'masked' : 'full') {
    return {
        fieldPackageKey: 'contract-finance',
        mode,
        value,
        displayText: value ?? '经营敏感字段已隐藏',
        reasonCode: value === null ? 'missing-sensitive-read-permission' : 'allowed'
    };
}

function assertFullFixture(value: unknown): asserts value is ProjectDetailView {
    const result = FullProjectDetailViewSchema.safeParse(value);
    if (!result.success) throw new Error('Invalid FullProject fixture: ' + JSON.stringify(result.error.issues));
}

function createDetail(overrides: Partial<ProjectDetailView> = {}): ProjectDetailView {
    const detail = {
        scopeKind: 'full-project',
        projectRowVersion: overrides.projectRowVersion ?? overrides.rowVersion ?? 3,
        currentStageRecordId: null,
        executionAdmissionContext: null,
        id: '00000000-0000-4000-8000-000000001001',
        projectNo: 'P-2026-001',
        projectName: '华南地铁运营平台',
        sourceLeadId: null,
        customerId: null,
        customerName: '华南地铁集团',
        customerProjectNo: null,
        status: ProjectStatus.Active,
        currentStage: ProjectStage.Handover,
        ownerOrgId: '00000000-0000-4000-8000-000000010001',
        ownerUserId: '00000000-0000-4000-8000-000000009001',
        plannedSignAt: null,
        closedAt: null,
        closedReason: null,
        rowVersion: 3,
        createdAt: '2026-04-19T10:00:00.000Z',
        createdBy: null,
        updatedAt: '2026-04-20T10:00:00.000Z',
        updatedBy: null,
        ownerName: '张销售',
        ownerOrgName: '华南销售一部',
        sourceLeadSummary: null,
        stageSummary: {
            currentStage: ProjectStage.Handover,
            status: ProjectStatus.Active,
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            blockingReasons: []
        },
        currentBidSummary: {
            tenderNo: null,
            bidPackageNo: null,
            bidProcessId: null,
            bidStatus: 'not_configured',
            resultStatus: null,
            summary: null
        },
        currentContractSummary: {
            activeContractCount: 0,
            latestContractId: null,
            latestContractNo: null,
            latestContractStatus: null,
            signedAmountProjection: sensitiveProjection(null),
            currencyCode: null,
            signedAt: null,
            currentSnapshotId: null
        },
        currentApprovalSummary: {
            summarySnapshotId: null,
            summaryPackageKey: null,
            projectionLevel: null,
            exportPolicy: null,
            generatedAt: null
        },
        currentConfirmationSummary: {
            confirmationRecordId: null,
            status: 'not_configured',
            requiredCount: 0,
            confirmedCount: 0,
            pendingCount: 0,
            confirmedAt: null
        },
        summarySnapshotId: null,
        projectionLevel: null,
        exportPolicy: null,
        allowedActions: ['view-project-workspace'],
        generatedAt: '2026-04-20T10:00:00.000Z',
        ...overrides
    };
    if (!overrides.stageSummary) detail.stageSummary = { ...detail.stageSummary, currentStage: detail.currentStage, status: detail.status };
    assertFullFixture(detail);
    return detail;
}

function createSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
    return {
        id: '00000000-0000-4000-8000-000000001001',
        projectNo: 'P-2026-001',
        projectName: '更新后的项目',
        sourceLeadId: null,
        customerId: null,
        customerName: null,
        status: ProjectStatus.Active,
        currentStage: ProjectStage.Handover,
        ownerOrgId: null,
        ownerUserId: null,
        plannedSignAt: null,
        closedAt: null,
        closedReason: null,
        rowVersion: 4,
        createdAt: '2026-04-19T10:00:00.000Z',
        createdBy: null,
        updatedAt: '2026-04-20T11:00:00.000Z',
        updatedBy: null,
        ...overrides
    };
}

function createTimeline(overrides: Partial<ProjectTimelineView> = {}): ProjectTimelineView {
    return {
        projectId: '00000000-0000-4000-8000-000000001001',
        events: [
            {
                eventKey: 'contract-signed:00000000-0000-4000-8000-000000004001',
                stage: ProjectStage.Contracting,
                stageLabel: '签约中',
                eventType: ProjectTimelineEventEventTypeEnum.StageCompleted,
                occurredAt: '2026-04-18T08:00:00.000Z',
                actorUserId: '00000000-0000-4000-8000-000000009001',
                actorName: '张销售',
                resultLabel: '合同签约完成',
                sourceType: ProjectTimelineEventSourceTypeEnum.Contract,
                sourceId: '00000000-0000-4000-8000-000000004001',
                evidenceLabel: 'HT-2026-001',
                isAuthoritative: true
            }
        ],
        generatedAt: '2026-04-20T10:00:00.000Z',
        ...overrides
    } as ProjectTimelineView;
}

function createArchiveRecord(overrides: Partial<Record<keyof ProjectArchiveRecordSummary, unknown>> = {}): ProjectArchiveRecordSummary {
    return {
        id: '00000000-0000-4000-8000-000000011001',
        projectId: '00000000-0000-4000-8000-000000001001',
        archiveAnchorStage: ProjectArchiveRecordSummaryArchiveAnchorStageEnum.Completed,
        archiveAnchorSourceType: ProjectArchiveRecordSummaryArchiveAnchorSourceTypeEnum.Project,
        archiveAnchorSourceId: '00000000-0000-4000-8000-000000001001',
        status: ProjectArchiveRecordSummaryStatusEnum.Recorded,
        archivedAt: '2026-04-24T15:20:00.000Z',
        archivedBy: '00000000-0000-4000-8000-000000009004',
        archivedByName: '赵归档',
        archiveSummary: '项目资料已完成归档',
        evidenceSummary: '项目归档清单',
        supersedesArchiveRecordId: null,
        replacementReason: null,
        voidedAt: null,
        voidedBy: null,
        voidedByName: null,
        voidReason: null,
        createdAt: '2026-04-24T15:20:00.000Z',
        createdBy: '00000000-0000-4000-8000-000000009004',
        updatedAt: '2026-04-24T15:20:00.000Z',
        updatedBy: '00000000-0000-4000-8000-000000009004',
        rowVersion: 7,
        allowedActions: ['replace-project-archive-record', 'void-project-archive-record'],
        ...overrides
    } as ProjectArchiveRecordSummary;
}

describe('ProjectStore', () => {
    it('reloads ProjectDetailView after updating basic info instead of downgrading selectedProject to ProjectSummary', async () => {
        const refreshedDetail = createDetail({ projectName: '更新后的项目', rowVersion: 4 });
        const projectApiMock = {
            projectControllerGetById: jest.fn().mockReturnValue(of(refreshedDetail)),
            projectControllerList: jest.fn().mockReturnValue(of([])),
            projectControllerUpdateBasicInfo: jest.fn().mockReturnValue(of(createSummary()))
        };

        TestBed.configureTestingModule({
            providers: [
                ProjectStore,
                {
                    provide: ProjectApi,
                    useValue: projectApiMock
                }
            ]
        });

        const store = TestBed.inject(ProjectStore);

        const result = await store.updateProject('00000000-0000-4000-8000-000000001001', {
            projectName: '更新后的项目'
        });

        expect(projectApiMock.projectControllerUpdateBasicInfo).toHaveBeenCalledWith({
            id: '00000000-0000-4000-8000-000000001001',
            updateProjectBasicInfoRequest: {
                projectName: '更新后的项目'
            }
        });
        expect(projectApiMock.projectControllerGetById).toHaveBeenCalledWith({ id: '00000000-0000-4000-8000-000000001001' });
        expect(result).toEqual(refreshedDetail);
        expect(store.selectedProject()).toEqual(refreshedDetail);
        expect(store.selectedProject()?.currentContractSummary).toEqual(refreshedDetail.currentContractSummary);
    });

    it('reassigns project owner through generated client and refreshes selected detail', async () => {
        const refreshedDetail = createDetail({
            ownerUserId: '00000000-0000-4000-8000-000000009002',
            ownerOrgId: '00000000-0000-4000-8000-000000010002',
            ownerName: '李经理',
            ownerOrgName: '华东销售部',
            rowVersion: 4
        });
        const result = {
            targetId: '00000000-0000-4000-8000-000000001001',
            projectOwnerReassignmentRecordId: '00000000-0000-4000-8000-000000012001',
            previousOwnerUserId: '00000000-0000-4000-8000-000000009001',
            previousOwnerOrgId: '00000000-0000-4000-8000-000000010001',
            newOwnerUserId: '00000000-0000-4000-8000-000000009002',
            newOwnerOrgId: '00000000-0000-4000-8000-000000010002',
            businessStatusAfter: 'active'
        };
        const projectApiMock = {
            projectControllerGetById: jest.fn().mockReturnValue(of(refreshedDetail)),
            projectControllerReassignOwner: jest.fn().mockReturnValue(of(result))
        };

        TestBed.configureTestingModule({
            providers: [
                ProjectStore,
                {
                    provide: ProjectApi,
                    useValue: projectApiMock
                }
            ]
        });

        const store = TestBed.inject(ProjectStore);

        const ownerResult = await store.reassignProjectOwner('00000000-0000-4000-8000-000000001001', {
            ownerUserId: '00000000-0000-4000-8000-000000009002',
            ownerOrgId: '00000000-0000-4000-8000-000000010002',
            reason: '区域销售责任调整',
            expectedVersion: 3
        });

        expect(projectApiMock.projectControllerReassignOwner).toHaveBeenCalledWith({
            id: '00000000-0000-4000-8000-000000001001',
            reassignProjectOwnerRequest: {
                ownerUserId: '00000000-0000-4000-8000-000000009002',
                ownerOrgId: '00000000-0000-4000-8000-000000010002',
                reason: '区域销售责任调整',
                expectedVersion: 3
            }
        });
        expect(projectApiMock.projectControllerGetById).toHaveBeenCalledWith({ id: '00000000-0000-4000-8000-000000001001' });
        expect(ownerResult).toEqual(result);
        expect(store.selectedProject()).toEqual(refreshedDetail);
    });

    it('loads project timeline without replacing selected project detail', async () => {
        const detail = createDetail();
        const timeline = createTimeline();
        const projectApiMock = {
            projectControllerGetById: jest.fn().mockReturnValue(of(detail)),
            projectControllerGetTimeline: jest.fn().mockReturnValue(of(timeline))
        };

        TestBed.configureTestingModule({
            providers: [
                ProjectStore,
                {
                    provide: ProjectApi,
                    useValue: projectApiMock
                }
            ]
        });

        const store = TestBed.inject(ProjectStore);

        await store.loadProject('00000000-0000-4000-8000-000000001001');
        const result = await store.loadProjectTimeline('00000000-0000-4000-8000-000000001001');

        expect(projectApiMock.projectControllerGetTimeline).toHaveBeenCalledWith({ projectId: '00000000-0000-4000-8000-000000001001' });
        expect(result).toEqual(timeline);
        expect(store.selectedProject()).toEqual(detail);
        expect(store.selectedProjectTimeline()).toEqual(timeline);
        expect(store.timelineError()).toBeNull();
    });

    it('loads project archive records into selected archive state', async () => {
        const archiveRecord = createArchiveRecord();
        const projectApiMock = {
            projectControllerListProjectArchiveRecords: jest.fn().mockReturnValue(of([archiveRecord]))
        };

        TestBed.configureTestingModule({
            providers: [
                ProjectStore,
                {
                    provide: ProjectApi,
                    useValue: projectApiMock
                }
            ]
        });

        const store = TestBed.inject(ProjectStore);

        const result = await store.loadProjectArchiveRecords('00000000-0000-4000-8000-000000001001');

        expect(projectApiMock.projectControllerListProjectArchiveRecords).toHaveBeenCalledWith({ projectId: '00000000-0000-4000-8000-000000001001' });
        expect(result).toEqual([archiveRecord]);
        expect(store.selectedProjectArchiveRecords()).toEqual([archiveRecord]);
        expect(store.archiveRecordsError()).toBeNull();
    });

    it('creates project archive records through generated client and refreshes detail context', async () => {
        const detail = createDetail({ currentStage: ProjectStage.Completed, status: ProjectStatus.Completed });
        const timeline = createTimeline();
        const archiveRecord = createArchiveRecord();
        const projectApiMock = {
            projectControllerCreateProjectArchiveRecord: jest.fn().mockReturnValue(of(archiveRecord)),
            projectControllerGetById: jest.fn().mockReturnValue(of(detail)),
            projectControllerGetTimeline: jest.fn().mockReturnValue(of(timeline)),
            projectControllerListProjectArchiveRecords: jest.fn().mockReturnValue(of([archiveRecord]))
        };

        TestBed.configureTestingModule({
            providers: [
                ProjectStore,
                {
                    provide: ProjectApi,
                    useValue: projectApiMock
                }
            ]
        });

        const store = TestBed.inject(ProjectStore);

        const result = await store.createProjectArchiveRecord('00000000-0000-4000-8000-000000001001', {
            inputVersion: CreateProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,
            expectedProjectVersion: detail.projectRowVersion,
            archivedAt: '2026-04-26T10:30:00.000Z',
            archiveSummary: '首次归档结论',
            evidenceSummary: '首次归档清单'
        });

        expect(projectApiMock.projectControllerCreateProjectArchiveRecord).toHaveBeenCalledWith({
            projectId: '00000000-0000-4000-8000-000000001001',
            createProjectArchiveRecordRequest: {
                inputVersion: CreateProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,
                expectedProjectVersion: detail.projectRowVersion,
                archivedAt: '2026-04-26T10:30:00.000Z',
                archiveSummary: '首次归档结论',
                evidenceSummary: '首次归档清单'
            }
        });
        expect(projectApiMock.projectControllerGetById).toHaveBeenCalledWith({ id: '00000000-0000-4000-8000-000000001001' });
        expect(projectApiMock.projectControllerGetTimeline).toHaveBeenCalledWith({ projectId: '00000000-0000-4000-8000-000000001001' });
        expect(projectApiMock.projectControllerListProjectArchiveRecords).toHaveBeenCalledWith({ projectId: '00000000-0000-4000-8000-000000001001' });
        expect(result).toEqual(archiveRecord);
        expect(store.selectedProjectArchiveRecords()).toEqual([archiveRecord]);
    });

    it('replaces project archive records through generated client and refreshes detail context', async () => {
        const detail = createDetail({ currentStage: ProjectStage.Completed });
        const timeline = createTimeline();
        const archiveRecord = createArchiveRecord();
        const projectApiMock = {
            projectArchiveRecordControllerReplaceProjectArchiveRecord: jest.fn().mockReturnValue(of(archiveRecord)),
            projectControllerGetById: jest.fn().mockReturnValue(of(detail)),
            projectControllerGetTimeline: jest.fn().mockReturnValue(of(timeline)),
            projectControllerListProjectArchiveRecords: jest.fn().mockReturnValue(of([archiveRecord]))
        };

        TestBed.configureTestingModule({
            providers: [
                ProjectStore,
                {
                    provide: ProjectApi,
                    useValue: projectApiMock
                }
            ]
        });

        const store = TestBed.inject(ProjectStore);

        const result = await store.replaceProjectArchiveRecord('00000000-0000-4000-8000-000000011001', {
            inputVersion: ReplaceProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,
            archivedAt: '2026-04-26T10:30:00.000Z',
            archiveSummary: '新归档结论',
            evidenceSummary: '新证据摘要',
            replacementReason: '原记录证据不完整',
            expectedVersion: 7
        });

        expect(projectApiMock.projectArchiveRecordControllerReplaceProjectArchiveRecord).toHaveBeenCalledWith({
            id: '00000000-0000-4000-8000-000000011001',
            replaceProjectArchiveRecordRequest: {
                inputVersion: ReplaceProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,
                archivedAt: '2026-04-26T10:30:00.000Z',
                archiveSummary: '新归档结论',
                evidenceSummary: '新证据摘要',
                replacementReason: '原记录证据不完整',
                expectedVersion: 7
            }
        });
        expect(projectApiMock.projectControllerGetById).toHaveBeenCalledWith({ id: '00000000-0000-4000-8000-000000001001' });
        expect(projectApiMock.projectControllerGetTimeline).toHaveBeenCalledWith({ projectId: '00000000-0000-4000-8000-000000001001' });
        expect(projectApiMock.projectControllerListProjectArchiveRecords).toHaveBeenCalledWith({ projectId: '00000000-0000-4000-8000-000000001001' });
        expect(result).toEqual(archiveRecord);
        expect(store.selectedProjectArchiveRecords()).toEqual([archiveRecord]);
    });

    it('voids project archive records through generated client and refreshes detail context', async () => {
        const detail = createDetail({ currentStage: ProjectStage.Completed });
        const timeline = createTimeline();
        const archiveRecord = createArchiveRecord({ status: ProjectArchiveRecordSummaryStatusEnum.Voided });
        const projectApiMock = {
            projectArchiveRecordControllerVoidProjectArchiveRecord: jest.fn().mockReturnValue(of(archiveRecord)),
            projectControllerGetById: jest.fn().mockReturnValue(of(detail)),
            projectControllerGetTimeline: jest.fn().mockReturnValue(of(timeline)),
            projectControllerListProjectArchiveRecords: jest.fn().mockReturnValue(of([archiveRecord]))
        };

        TestBed.configureTestingModule({
            providers: [
                ProjectStore,
                {
                    provide: ProjectApi,
                    useValue: projectApiMock
                }
            ]
        });

        const store = TestBed.inject(ProjectStore);

        const result = await store.voidProjectArchiveRecord('00000000-0000-4000-8000-000000011001', {
            inputVersion: VoidProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,
            reason: '归档事实错误',
            comment: null,
            expectedVersion: 7
        });

        expect(projectApiMock.projectArchiveRecordControllerVoidProjectArchiveRecord).toHaveBeenCalledWith({
            id: '00000000-0000-4000-8000-000000011001',
            voidProjectArchiveRecordRequest: {
                inputVersion: VoidProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,
                reason: '归档事实错误',
                comment: null,
                expectedVersion: 7
            }
        });
        expect(projectApiMock.projectControllerGetById).toHaveBeenCalledWith({ id: '00000000-0000-4000-8000-000000001001' });
        expect(projectApiMock.projectControllerGetTimeline).toHaveBeenCalledWith({ projectId: '00000000-0000-4000-8000-000000001001' });
        expect(projectApiMock.projectControllerListProjectArchiveRecords).toHaveBeenCalledWith({ projectId: '00000000-0000-4000-8000-000000001001' });
        expect(result).toEqual(archiveRecord);
        expect(store.selectedProjectArchiveRecords()).toEqual([archiveRecord]);
    });

    it.each(['creator', 'legacy'] as const)('rejects a genuine %s response and clears a previously full cache', async (kind) => {
        const projectId = '00000000-0000-4000-8000-000000001001';
        const narrow = kind === 'creator'
            ? CreatorFirstAssignmentAnchorViewSchema.parse({ scopeKind: 'creator-first-assignment-only', projectId, projectNo: 'P-bootstrap', projectRowVersion: 4, ownerOrgId: '00000000-0000-4000-8000-000000010001', ownerUserId: null, creatorUserId: '00000000-0000-4000-8000-000000009001', ownershipOriginRowVersion: 1, allowedActions: ['reassign-owner'] })
            : LegacyOwnerAnchorViewSchema.parse({ scopeKind: 'legacy-owner-anchor-only', projectId, projectNo: 'P-legacy', projectName: '历史基础锚点', currentStage: 'assessment', rowVersion: 4, ownerUserId: '00000000-0000-4000-8000-000000009001', ownerOrgId: null, sourceQualification: 'legacy-unverified', allowedActions: [], explanation: '仅可读取缺失组织来源的基础锚点' });
        const api = { projectControllerGetById: jest.fn().mockReturnValueOnce(of(createDetail())).mockReturnValueOnce(of(narrow)) };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        await store.loadProject(projectId);
        expect(store.selectedProject()?.scopeKind).toBe('full-project');
        await expect(store.loadProject(projectId)).rejects.toThrow('完整项目范围');
        expect(store.selectedProject()).toBeNull();
        expect(store.loading()).toBe(false);
    });

    it('does not accept an untagged old-shaped response as a FullProject proof', async () => {
        const untagged = Object.fromEntries(Object.entries(createDetail()).filter(([key]) => key !== 'scopeKind'));
        const api = { projectControllerGetById: jest.fn().mockReturnValue(of(untagged)) };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        await expect(store.loadProject('00000000-0000-4000-8000-000000001001')).rejects.toThrow('完整项目范围');
        expect(store.selectedProject()).toBeNull();
    });

    it('never publishes an older FullProject response over the latest project', async () => {
        const oldRead = new Subject<ProjectDetailView>(), latestRead = new Subject<ProjectDetailView>();
        const api = { projectControllerGetById: jest.fn().mockReturnValueOnce(oldRead).mockReturnValueOnce(latestRead) };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        const oldResult = store.loadProject('00000000-0000-4000-8000-000000001001');
        const rejectedOld = expect(oldResult).rejects.toThrow('项目已变化');
        const latestResult = store.loadProject('00000000-0000-4000-8000-000000001002');
        const latest = createDetail({ id: '00000000-0000-4000-8000-000000001002', projectNo: 'P-latest' });
        latestRead.next(latest); latestRead.complete(); await latestResult;
        oldRead.next(createDetail()); oldRead.complete(); await rejectedOld;
        expect(store.selectedProject()).toEqual(latest);
        expect(store.loading()).toBe(false);
    });

    it('keeps the latest load pending and empty when an older FullProject arrives first', async () => {
        const oldRead = new Subject<ProjectDetailView>(), latestRead = new Subject<ProjectDetailView>();
        const api = { projectControllerGetById: jest.fn().mockReturnValueOnce(oldRead).mockReturnValueOnce(latestRead) };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        const oldResult = store.loadProject('00000000-0000-4000-8000-000000001001');
        const rejectedOld = expect(oldResult).rejects.toThrow('项目已变化');
        const latestResult = store.loadProject('00000000-0000-4000-8000-000000001002');
        oldRead.next(createDetail()); oldRead.complete(); await rejectedOld;
        expect(store.selectedProject()).toBeNull(); expect(store.loading()).toBe(true);
        const latest = createDetail({ id: '00000000-0000-4000-8000-000000001002' });
        latestRead.next(latest); latestRead.complete(); await latestResult;
        expect(store.selectedProject()).toEqual(latest);
    });

    it('clears old FullProject facts when the next project read fails', async () => {
        const api = { projectControllerGetById: jest.fn().mockReturnValueOnce(of(createDetail())).mockReturnValueOnce(throwError(() => new Error('scope denied'))) };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        await store.loadProject('00000000-0000-4000-8000-000000001001');
        await expect(store.loadProject('00000000-0000-4000-8000-000000001002')).rejects.toThrow('scope denied');
        expect(store.selectedProject()).toBeNull(); expect(store.loading()).toBe(false);
    });

    it('does not read timeline or archive lists after a non-Full archive refresh', async () => {
        const projectId = '00000000-0000-4000-8000-000000001001';
        const creator = CreatorFirstAssignmentAnchorViewSchema.parse({ scopeKind: 'creator-first-assignment-only', projectId, projectNo: 'P-bootstrap', projectRowVersion: 4, ownerOrgId: '00000000-0000-4000-8000-000000010001', ownerUserId: null, creatorUserId: '00000000-0000-4000-8000-000000009001', ownershipOriginRowVersion: 1, allowedActions: ['reassign-owner'] });
        const api = { projectControllerCreateProjectArchiveRecord: jest.fn().mockReturnValue(of(createArchiveRecord())), projectControllerGetById: jest.fn().mockReturnValue(of(creator)), projectControllerGetTimeline: jest.fn(), projectControllerListProjectArchiveRecords: jest.fn() };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        await expect(store.createProjectArchiveRecord(projectId, { inputVersion: CreateProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1, expectedProjectVersion: 3, archivedAt: '2026-04-26T08:30:00.000Z', archiveSummary: '模拟归档结论', evidenceSummary: '模拟证据' })).rejects.toThrow('完整项目范围');
        expect(api.projectControllerGetTimeline).not.toHaveBeenCalled();
        expect(api.projectControllerListProjectArchiveRecords).not.toHaveBeenCalled();
        expect(store.selectedProject()).toBeNull();
    });

});
