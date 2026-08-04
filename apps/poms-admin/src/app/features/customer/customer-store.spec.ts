import { TestBed } from '@angular/core/testing';
import { CustomerAliasType, CustomerApi, type CustomerDetailView, CustomerStatus, CustomerStore } from '@poms/admin-data-access';
import { of, throwError } from 'rxjs';

function createCustomerDetail(): CustomerDetailView {
    return {
        id: 'customer-1',
        customerNo: 'CUST-2026-001',
        displayName: '华南地铁集团',
        legalName: null,
        shortName: '华南地铁',
        status: CustomerStatus.Active,
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        sourceChannel: null,
        remark: null,
        mergedIntoCustomerId: null,
        rowVersion: 1,
        createdAt: '2026-04-30T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-30T08:00:00.000Z',
        updatedBy: 'user-1',
        ownerName: '张销售',
        ownerOrgName: '华南销售一部',
        leadCount: 0,
        projectCount: 0,
        contractCount: 0,
        aliases: [
            {
                id: 'alias-1',
                customerId: 'customer-1',
                aliasName: '华南地铁',
                aliasType: CustomerAliasType.Alias,
                normalizedName: '华南地铁',
                isPrimary: false,
                createdAt: '2026-04-30T08:00:00.000Z',
                createdBy: 'user-1'
            }
        ]
    };
}

describe('CustomerStore alias deletion', () => {
    let store: CustomerStore;
    let customerApiMock: {
        customerControllerGetById: jest.Mock;
        customerAliasControllerDelete: jest.Mock;
    };

    beforeEach(() => {
        customerApiMock = {
            customerControllerGetById: jest.fn().mockReturnValue(of(createCustomerDetail())),
            customerAliasControllerDelete: jest.fn().mockReturnValue(of(undefined))
        };

        TestBed.configureTestingModule({
            providers: [
                CustomerStore,
                {
                    provide: CustomerApi,
                    useValue: customerApiMock
                }
            ]
        });
        store = TestBed.inject(CustomerStore);
    });

    it('calls the generated delete operation and reloads the selected customer', async () => {
        await store.loadCustomer('customer-1');

        await store.deleteAlias('customer-1', 'alias-1');

        expect(customerApiMock.customerAliasControllerDelete).toHaveBeenCalledWith({ id: 'alias-1' });
        expect(customerApiMock.customerControllerGetById).toHaveBeenCalledTimes(2);
        expect(store.saving()).toBe(false);
    });

    it('keeps the existing customer state when the delete request fails', async () => {
        await store.loadCustomer('customer-1');
        customerApiMock.customerAliasControllerDelete.mockReturnValueOnce(throwError(() => new Error('conflict')));

        await expect(store.deleteAlias('customer-1', 'alias-1')).rejects.toThrow('conflict');

        expect(customerApiMock.customerControllerGetById).toHaveBeenCalledTimes(1);
        expect(store.aliases().map((alias) => alias.id)).toEqual(['alias-1']);
        expect(store.saving()).toBe(false);
    });
});
