import { TestBed } from '@angular/core/testing';
import { ProjectApi, ProjectStore, type ProjectArchiveRecordSummary, type ProjectDetailView, type ProjectSummary, type ProjectTimelineView } from '@poms/admin-data-access';
import { of } from 'rxjs';

function createDetail(overrides: Partial<ProjectDetailView> = {}): ProjectDetailView {
    return {
        id: 'project-1',
        projectNo: 'P-2026-001',
        projectName: '华南地铁运营平台',
        sourceLeadId: null,
        customerId: null,
        customerName: '华南地铁集团',
        status: 'active',
        currentStage: 'handover',
        ownerOrgId: null,
        ownerUserId: null,
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
            currentStage: 'handover',
            status: 'active',
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            blockingReasons: []
        },
        currentBidSummary: {
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
            signedAmount: null,
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
}

function createSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
    return {
        id: 'project-1',
        projectNo: 'P-2026-001',
        projectName: '更新后的项目',
        sourceLeadId: null,
        customerId: null,
        customerName: null,
        status: 'active',
        currentStage: 'handover',
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
        projectId: 'project-1',
        events: [
            {
                eventKey: 'contract-signed:contract-1',
                stage: 'contracting',
                stageLabel: '签约中',
                eventType: 'stage-completed',
                occurredAt: '2026-04-18T08:00:00.000Z',
                actorUserId: 'user-1',
                actorName: '张销售',
                resultLabel: '合同签约完成',
                sourceType: 'contract',
                sourceId: 'contract-1',
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
        id: 'archive-1',
        projectId: 'project-1',
        archiveAnchorStage: 'completed',
        archiveAnchorSourceType: 'project',
        archiveAnchorSourceId: 'project-1',
        status: 'recorded',
        archivedAt: '2026-04-24T15:20:00.000Z',
        archivedBy: 'user-4',
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
        createdBy: 'user-4',
        updatedAt: '2026-04-24T15:20:00.000Z',
        updatedBy: 'user-4',
        rowVersion: 7,
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

        const result = await store.updateProject('project-1', {
            projectName: '更新后的项目'
        });

        expect(projectApiMock.projectControllerUpdateBasicInfo).toHaveBeenCalledWith({
            id: 'project-1',
            updateProjectBasicInfoRequest: {
                projectName: '更新后的项目'
            }
        });
        expect(projectApiMock.projectControllerGetById).toHaveBeenCalledWith({ id: 'project-1' });
        expect(result).toEqual(refreshedDetail);
        expect(store.selectedProject()).toEqual(refreshedDetail);
        expect(store.selectedProject()?.currentContractSummary).toEqual(refreshedDetail.currentContractSummary);
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

        await store.loadProject('project-1');
        const result = await store.loadProjectTimeline('project-1');

        expect(projectApiMock.projectControllerGetTimeline).toHaveBeenCalledWith({ projectId: 'project-1' });
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

        const result = await store.loadProjectArchiveRecords('project-1');

        expect(projectApiMock.projectControllerListProjectArchiveRecords).toHaveBeenCalledWith({ projectId: 'project-1' });
        expect(result).toEqual([archiveRecord]);
        expect(store.selectedProjectArchiveRecords()).toEqual([archiveRecord]);
        expect(store.archiveRecordsError()).toBeNull();
    });

    it('replaces project archive records through generated client and refreshes detail context', async () => {
        const detail = createDetail({ currentStage: 'completed' });
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

        const result = await store.replaceProjectArchiveRecord('archive-1', {
            archivedAt: '2026-04-26T10:30:00.000Z',
            archiveSummary: '新归档结论',
            evidenceSummary: '新证据摘要',
            replacementReason: '原记录证据不完整',
            expectedVersion: 7
        });

        expect(projectApiMock.projectArchiveRecordControllerReplaceProjectArchiveRecord).toHaveBeenCalledWith({
            id: 'archive-1',
            replaceProjectArchiveRecordRequest: {
                archivedAt: '2026-04-26T10:30:00.000Z',
                archiveSummary: '新归档结论',
                evidenceSummary: '新证据摘要',
                replacementReason: '原记录证据不完整',
                expectedVersion: 7
            }
        });
        expect(projectApiMock.projectControllerGetById).toHaveBeenCalledWith({ id: 'project-1' });
        expect(projectApiMock.projectControllerGetTimeline).toHaveBeenCalledWith({ projectId: 'project-1' });
        expect(projectApiMock.projectControllerListProjectArchiveRecords).toHaveBeenCalledWith({ projectId: 'project-1' });
        expect(result).toEqual(archiveRecord);
        expect(store.selectedProjectArchiveRecords()).toEqual([archiveRecord]);
    });

    it('voids project archive records through generated client and refreshes detail context', async () => {
        const detail = createDetail({ currentStage: 'completed' });
        const timeline = createTimeline();
        const archiveRecord = createArchiveRecord({ status: 'voided' });
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

        const result = await store.voidProjectArchiveRecord('archive-1', {
            reason: '归档事实错误',
            comment: null,
            expectedVersion: 7
        });

        expect(projectApiMock.projectArchiveRecordControllerVoidProjectArchiveRecord).toHaveBeenCalledWith({
            id: 'archive-1',
            voidProjectArchiveRecordRequest: {
                reason: '归档事实错误',
                comment: null,
                expectedVersion: 7
            }
        });
        expect(projectApiMock.projectControllerGetById).toHaveBeenCalledWith({ id: 'project-1' });
        expect(projectApiMock.projectControllerGetTimeline).toHaveBeenCalledWith({ projectId: 'project-1' });
        expect(projectApiMock.projectControllerListProjectArchiveRecords).toHaveBeenCalledWith({ projectId: 'project-1' });
        expect(result).toEqual(archiveRecord);
        expect(store.selectedProjectArchiveRecords()).toEqual([archiveRecord]);
    });
});
