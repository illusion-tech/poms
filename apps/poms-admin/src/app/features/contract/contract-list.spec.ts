import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore, ContractStatus, ContractStore, ProjectStage, ProjectStatus, ProjectStore, type ContractSummary, type ProjectListView } from '@poms/admin-data-access';
import type { Table } from 'primeng/table';
import { ContractList } from './contract-list';

function sensitiveProjection(value: string | null, mode: 'full' | 'masked' = value === null ? 'masked' : 'full') {
    return {
        fieldPackageKey: 'contract-finance',
        mode,
        value,
        displayText: value ?? '经营敏感字段已隐藏',
        reasonCode: value === null ? 'missing-sensitive-read-permission' : 'allowed'
    };
}

function createContract(overrides: Partial<ContractSummary> = {}): ContractSummary {
    return {
        id: 'contract-1',
        projectId: 'project-1',
        projectName: '城市交通项目',
        customerName: '城市交通集团',
        contractNo: 'CT-2026-000001',
        customerContractNo: 'KH-HT-2026-01',
        status: ContractStatus.Draft,
        signedAmountProjection: sensitiveProjection('1200000.00'),
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
        currentStage: ProjectStage.Handover,
        status: ProjectStatus.Active,
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
    let financeVisible: ReturnType<typeof signal<boolean>>;
    let authStoreMock: { hasAnyPermission: jest.Mock };
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
        financeVisible = signal(true);
        authStoreMock = {
            hasAnyPermission: jest.fn((permissions: readonly string[]) => permissions.includes('contract:finance:manage') && financeVisible())
        };
        routerMock = { navigate: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [ContractList],
            providers: [
                {
                    provide: Router,
                    useValue: routerMock
                },
                {
                    provide: AuthStore,
                    useValue: authStoreMock
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
        expect(text).toContain('清空筛选');
        expect(fixture.nativeElement.querySelector('input[placeholder="搜索合同、项目、客户"]')).not.toBeNull();
        expect(text).toContain('POMS 合同编号');
        expect(text).toContain('客户合同编号');
        expect(text).toContain('CT-2026-000001');
        expect(text).toContain('KH-HT-2026-01');
    });

    it('uses the table-demo filter baseline inside the PrimeNG table', () => {
        const columnFilters = fixture.nativeElement.querySelectorAll('p-columnfilter');

        expect(columnFilters.length).toBeGreaterThanOrEqual(5);
        expect(fixture.nativeElement.textContent).toContain('当前共 1 份合同');
        expect(component.statusColumnFilterOptions).toEqual([
            { label: '草稿', value: 'draft' },
            { label: '待审核', value: 'pending-review' },
            { label: '已生效', value: 'active' },
            { label: '已终止', value: 'terminated' },
            { label: '已完成', value: 'completed' }
        ]);
    });

    it('renders contract amount from backend projection and hides creation by command permission', () => {
        contractStoreMock.contracts.set([
            createContract({
                signedAmountProjection: sensitiveProjection(null)
            })
        ]);
        financeVisible.set(false);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('经营敏感字段已隐藏');
        expect(text).not.toContain('1,200,000.00 CNY');
        expect(text).not.toContain('新建合同');
    });

    it('clears table filters and resets pagination state', () => {
        const table = { clear: jest.fn() } as unknown as Table;
        component.searchValue = 'KH-HT';
        component.first = 10;

        component.clearFilters(table);

        expect(component.searchValue).toBe('');
        expect(component.first).toBe(0);
        expect(table.clear).toHaveBeenCalled();
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
