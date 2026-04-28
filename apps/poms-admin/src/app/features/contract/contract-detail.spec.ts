import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { AuthStore, ContractStore, type ContractDetailView, type ContractStatus, type SanitizedUserWithOrgUnits } from '@poms/admin-data-access';
import type { DomainApprovalRecord } from '@poms/shared-contracts';
import { MessageService } from 'primeng/api';
import { ContractDetail } from './contract-detail';

function sensitiveProjection(value: string | null, mode: 'full' | 'masked' = value === null ? 'masked' : 'full') {
    return {
        fieldPackageKey: 'contract-finance',
        mode,
        value,
        displayText: value ?? '经营敏感字段已隐藏',
        reasonCode: value === null ? 'missing-sensitive-read-permission' : 'allowed'
    };
}

function createContract(overrides: Partial<ContractDetailView> = {}): ContractDetailView {
    return {
        id: 'contract-1',
        projectId: 'project-1',
        projectName: '城市交通项目',
        customerName: '城市交通集团',
        contractNo: 'CT-2026-000001',
        customerContractNo: 'KH-HT-2026-01',
        status: 'draft',
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
        currentTermSnapshot: null,
        ...overrides
    };
}

describe('ContractDetail', () => {
    let fixture: ComponentFixture<ContractDetail>;
    let component: ContractDetail;
    let selectedContract: ReturnType<typeof signal<ContractDetailView | null>>;
    let currentApproval: ReturnType<typeof signal<DomainApprovalRecord<ContractStatus> | null>>;
    let contractStoreMock: {
        selectedContract: typeof selectedContract;
        currentApproval: typeof currentApproval;
        loading: ReturnType<typeof signal<boolean>>;
        loadingApproval: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loadContract: jest.Mock;
        loadCurrentApproval: jest.Mock;
        updateContract: jest.Mock;
        clearSelectedContract: jest.Mock;
    };
    let currentUser: ReturnType<typeof signal<SanitizedUserWithOrgUnits | null>>;

    beforeEach(async () => {
        selectedContract = signal<ContractDetailView | null>(createContract());
        currentApproval = signal<DomainApprovalRecord<ContractStatus> | null>(null);
        contractStoreMock = {
            selectedContract,
            currentApproval,
            loading: signal(false),
            loadingApproval: signal(false),
            saving: signal(false),
            loadContract: jest.fn().mockResolvedValue(createContract()),
            loadCurrentApproval: jest.fn().mockResolvedValue(null),
            updateContract: jest.fn().mockResolvedValue(createContract()),
            clearSelectedContract: jest.fn()
        };
        currentUser = signal<SanitizedUserWithOrgUnits | null>({
            id: 'user-1',
            displayName: '合同管理员',
            username: 'contract_manager',
            roles: ['合同管理员'],
            permissions: ['contract:read', 'contract:write', 'contract:finance:manage'],
            email: 'contract@example.com',
            avatarUrl: null,
            isActive: true,
            lastLoginAt: null,
            emailVerified: false,
            phoneVerified: false,
            phone: null,
            orgUnits: []
        });

        await TestBed.configureTestingModule({
            imports: [ContractDetail],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({ id: 'contract-1' })
                        }
                    }
                },
                {
                    provide: Router,
                    useValue: { navigate: jest.fn() }
                },
                {
                    provide: AuthStore,
                    useValue: {
                        currentUser,
                        hasAnyPermission: jest.fn((permissions: readonly string[]) => permissions.some((permission) => currentUser()?.permissions.includes(permission)))
                    }
                }
            ]
        })
            .overrideComponent(ContractDetail, {
                set: {
                    providers: [
                        {
                            provide: ContractStore,
                            useValue: contractStoreMock
                        },
                        MessageService
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(ContractDetail);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('renders POMS and customer contract numbers separately', () => {
        const text = fixture.nativeElement.textContent;

        expect(contractStoreMock.loadContract).toHaveBeenCalledWith('contract-1');
        expect(text).toContain('POMS 合同编号');
        expect(text).toContain('客户合同编号');
        expect(text).toContain('CT-2026-000001');
        expect(text).toContain('KH-HT-2026-01');
    });

    it('masks finance fields and draft actions when the user lacks contract finance permission', () => {
        const user = currentUser();
        if (!user) {
            throw new Error('current user is required');
        }
        currentUser.set({
            ...user,
            permissions: ['project:read']
        });
        selectedContract.set(
            createContract({
                signedAmountProjection: sensitiveProjection(null)
            })
        );
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        const buttonText = Array.from(fixture.nativeElement.querySelectorAll('button')).map((button: Element) => button.textContent ?? '').join(' ');

        expect(text).toContain('经营敏感字段已隐藏');
        expect(text).not.toContain('1,200,000.00 CNY');
        expect(buttonText).not.toContain('编辑');
        expect(buttonText).not.toContain('提交审核');
    });

    it('updates customer contract number without sending an internal contract number', async () => {
        component.showEditDialog();
        component.editForm = {
            signedAmount: ' 1280000.00 ',
            currencyCode: 'CNY',
            customerContractNo: ' KH-HT-NEW '
        };

        await component.saveContract();

        expect(contractStoreMock.updateContract).toHaveBeenCalledWith('contract-1', {
            signedAmount: ' 1280000.00 ',
            currencyCode: 'CNY',
            customerContractNo: 'KH-HT-NEW'
        });
        expect(contractStoreMock.updateContract.mock.calls[0][1]).not.toHaveProperty('contractNo');
    });
});
