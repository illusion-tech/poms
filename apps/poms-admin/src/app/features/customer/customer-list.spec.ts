import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CustomerStatus, CustomerStore, type CustomerDetailView, type CustomerListView } from '@poms/admin-data-access';
import { CustomerList } from './customer-list';

function createCustomer(overrides: Partial<CustomerListView> = {}): CustomerListView {
    return {
        id: 'customer-1',
        customerNo: 'CUST-2026-001',
        displayName: '华南地铁集团',
        legalName: '华南地铁集团有限公司',
        shortName: '华南地铁',
        status: CustomerStatus.Active,
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        sourceChannel: '客户拜访',
        remark: null,
        mergedIntoCustomerId: null,
        rowVersion: 1,
        createdAt: '2026-04-30T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-30T08:00:00.000Z',
        updatedBy: 'user-1',
        ownerName: '张销售',
        ownerOrgName: '华南销售一部',
        leadCount: 2,
        projectCount: 1,
        contractCount: 1,
        ...overrides
    };
}

function createCustomerDetail(overrides: Partial<CustomerDetailView> = {}): CustomerDetailView {
    return {
        ...createCustomer(overrides),
        aliases: [],
        ...overrides
    };
}

describe('CustomerList', () => {
    let fixture: ComponentFixture<CustomerList>;
    let component: CustomerList;
    let routerMock: { navigate: jest.Mock };
    let customers: ReturnType<typeof signal<CustomerListView[]>>;
    let customerStoreMock: {
        customers: typeof customers;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        activeCustomerCount: ReturnType<typeof computed<number>>;
        inactiveCustomerCount: ReturnType<typeof computed<number>>;
        loadCustomers: jest.Mock;
        loadCustomer: jest.Mock;
        createCustomer: jest.Mock;
        updateCustomer: jest.Mock;
    };

    beforeEach(async () => {
        customers = signal<CustomerListView[]>([createCustomer()]);
        routerMock = { navigate: jest.fn().mockResolvedValue(true) };
        customerStoreMock = {
            customers,
            loading: signal(false),
            saving: signal(false),
            activeCustomerCount: computed(() => customers().filter((customer) => customer.status === CustomerStatus.Active).length),
            inactiveCustomerCount: computed(() => customers().filter((customer) => customer.status === CustomerStatus.Inactive).length),
            loadCustomers: jest.fn().mockResolvedValue(customers()),
            loadCustomer: jest.fn().mockResolvedValue(createCustomerDetail()),
            createCustomer: jest.fn().mockResolvedValue(createCustomerDetail()),
            updateCustomer: jest.fn().mockResolvedValue(createCustomerDetail())
        };

        await TestBed.configureTestingModule({
            imports: [CustomerList],
            providers: [
                {
                    provide: Router,
                    useValue: routerMock
                }
            ]
        })
            .overrideComponent(CustomerList, {
                set: {
                    providers: [
                        {
                            provide: CustomerStore,
                            useValue: customerStoreMock
                        }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(CustomerList);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('loads the customer list without opening the old detail dialog', () => {
        const text = fixture.nativeElement.textContent;

        expect(customerStoreMock.loadCustomers).toHaveBeenCalled();
        expect(text).toContain('华南地铁集团');
        expect(text).not.toContain('客户附件');
    });

    it('routes customer name clicks to the customer workspace', () => {
        component.openWorkspace(createCustomer());

        expect(routerMock.navigate).toHaveBeenCalledWith(['/customers', 'customer-1']);
    });

    it('creates a customer and enters the customer workspace', async () => {
        await component.createCustomer({
            displayName: '新客户',
            legalName: '',
            shortName: '',
            sourceChannel: '',
            remark: '',
            status: CustomerStatus.Active
        });

        expect(customerStoreMock.createCustomer).toHaveBeenCalledWith({
            displayName: '新客户',
            legalName: null,
            shortName: null,
            sourceChannel: null,
            remark: null
        });
        expect(routerMock.navigate).toHaveBeenCalledWith(['/customers', 'customer-1']);
    });
});
