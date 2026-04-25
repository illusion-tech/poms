import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ContractStore, type ContractSummary } from '@poms/admin-data-access';
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
    let routerMock: { navigate: jest.Mock };

    beforeEach(async () => {
        contractStoreMock = {
            contracts: signal([createContract()]),
            loading: signal(false),
            saving: signal(false),
            loadContracts: jest.fn().mockResolvedValue([createContract()]),
            createContract: jest.fn().mockResolvedValue(createContract())
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
        expect(text).toContain('POMS 合同编号');
        expect(text).toContain('客户合同编号');
        expect(text).toContain('CT-2026-000001');
        expect(text).toContain('KH-HT-2026-01');
    });

    it('creates a contract without submitting an internal contract number', async () => {
        component.showCreateDialog();
        component.createForm = {
            projectId: ' project-1 ',
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
    });
});
