import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ContractStore, ProjectStore, type ContractSummary, type ProjectListView } from '@poms/admin-data-access';
import { ContractList } from './contract-list';

function createContract(overrides: Partial<ContractSummary> = {}): ContractSummary {
    return {
        id: 'contract-1',
        projectId: 'project-1',
        projectName: '城市交通项目',
        customerName: '城市交通集团',
        contractNo: 'CT-2026-000001',
        customerContractNo: 'KH-HT-2026-01',
        status: 'draft',
        signedAmount: '1200000.00',
        currencyCode: 'CNY',
        currentSnapshotId: null,
        signedAt: null,
        retentionDueDate: null,
        rowVersion: 1,
        createdAt: '2026-04-26T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-26T08:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

function createProject(overrides: Partial<ProjectListView> = {}): ProjectListView {
    return {
        id: 'project-1',
        projectNo: 'P-2026-001',
        projectName: '城市交通项目',
        customerName: '城市交通集团',
        customerProjectNo: 'CUST-PRJ-001',
        currentStage: 'handover',
        status: 'active',
        ownerOrgName: '华东交付一部',
        ownerName: '张销售',
        latestMilestoneAt: '2026-04-25T08:00:00.000Z',
        createdAt: '2026-04-20T08:00:00.000Z',
        ...overrides
    };
}

describe('ContractList', () => {
    let fixture: ComponentFixture<ContractList>;
    let component: ContractList;
    let contractStoreMock: {
        contracts: ReturnType<typeof signal<ContractSummary[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loadContracts: jest.Mock;
        createContract: jest.Mock;
    };
    let projectStoreMock: {
        projects: ReturnType<typeof signal<ProjectListView[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        loadProjects: jest.Mock;
    };
    let routerMock: { navigate: jest.Mock };

    beforeEach(async () => {
        const project = createProject();
        contractStoreMock = {
            contracts: signal([createContract()]),
            loading: signal(false),
            saving: signal(false),
            loadContracts: jest.fn().mockResolvedValue([createContract()]),
            createContract: jest.fn().mockResolvedValue(createContract())
        };
        projectStoreMock = {
            projects: signal([project]),
            loading: signal(false),
            loadProjects: jest.fn().mockResolvedValue([project])
        };
        routerMock = { navigate: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [ContractList],
            providers: [
                {
                    provide: Router,
                    useValue: routerMock
                }
            ]
        })
            .overrideComponent(ContractList, {
                set: {
                    providers: [
                        {
                            provide: ContractStore,
                            useValue: contractStoreMock
                        },
                        {
                            provide: ProjectStore,
                            useValue: projectStoreMock
                        }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(ContractList);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('renders POMS and customer contract numbers separately', () => {
        const text = fixture.nativeElement.textContent;

        expect(contractStoreMock.loadContracts).toHaveBeenCalled();
        expect(projectStoreMock.loadProjects).toHaveBeenCalled();
        expect(text).toContain('POMS 合同编号');
        expect(text).toContain('客户合同编号');
        expect(text).toContain('CT-2026-000001');
        expect(text).toContain('KH-HT-2026-01');
    });

    it('renders project picker context without exposing a raw project UUID input', () => {
        component.showCreateDialog();
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('关联项目');
        expect(text).toContain('POMS 合同编号将在创建成功后由系统生成');
        expect(text).not.toContain('关联项目 ID');
        expect(text).not.toContain('请输入项目 UUID');
    });

    it('filters projects for the contract project selector', () => {
        projectStoreMock.projects.set([
            createProject(),
            createProject({
                id: 'project-2',
                projectNo: 'P-2026-002',
                projectName: '智慧水务平台',
                customerName: '水务集团'
            })
        ]);

        component.filterProjects({ query: '水务' });

        expect(component.projectSuggestions).toEqual([
            expect.objectContaining({
                id: 'project-2',
                projectName: '智慧水务平台'
            })
        ]);
    });

    it('creates a contract from the selected project without submitting display-only project fields', async () => {
        const project = createProject();
        component.showCreateDialog();
        component.selectProject(project);
        component.createForm = {
            projectId: project.id,
            customerContractNo: ' KH-HT-NEW ',
            signedAmount: ' 880000.00 ',
            currencyCode: 'CNY'
        };

        await component.createContract();

        expect(contractStoreMock.createContract).toHaveBeenCalledWith({
            projectId: 'project-1',
            customerContractNo: 'KH-HT-NEW',
            signedAmount: '880000.00',
            currencyCode: 'CNY'
        });
        expect(contractStoreMock.createContract.mock.calls[0][0]).not.toHaveProperty('contractNo');
        expect(contractStoreMock.createContract.mock.calls[0][0]).not.toHaveProperty('projectNo');
        expect(contractStoreMock.createContract.mock.calls[0][0]).not.toHaveProperty('projectName');
    });
});
