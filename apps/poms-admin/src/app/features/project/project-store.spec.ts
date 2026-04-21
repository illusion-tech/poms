import { TestBed } from '@angular/core/testing';
import { ProjectApi, ProjectStore, type ProjectDetailView, type ProjectSummary } from '@poms/admin-data-access';
import { of } from 'rxjs';

function createDetail(overrides: Partial<ProjectDetailView> = {}): ProjectDetailView {
    return {
        id: 'project-1',
        projectCode: 'P-2026-001',
        projectName: '华南地铁运营平台',
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
        projectCode: 'P-2026-001',
        projectName: '更新后的项目',
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
});
