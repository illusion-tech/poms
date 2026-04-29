import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

describe('CustomerController', () => {
    const customerId = '11000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000001';

    let controller: CustomerController;
    let customerService: jest.Mocked<Pick<CustomerService, 'listCustomers' | 'getCustomer' | 'createCustomer' | 'updateCustomer' | 'listAliases' | 'createAlias'>>;

    beforeEach(() => {
        customerService = {
            listCustomers: jest.fn(),
            getCustomer: jest.fn(),
            createCustomer: jest.fn(),
            updateCustomer: jest.fn(),
            listAliases: jest.fn(),
            createAlias: jest.fn()
        } as unknown as typeof customerService;

        controller = new CustomerController(customerService as never);
    });

    it('passes list query filters to the service', async () => {
        customerService.listCustomers.mockResolvedValue([]);

        await controller.list({
            status: 'active',
            ownerOrgId: '10000000-0000-4000-8000-000000000001',
            keyword: '地铁'
        });

        expect(customerService.listCustomers).toHaveBeenCalledWith({
            status: 'active',
            ownerOrgId: '10000000-0000-4000-8000-000000000001',
            keyword: '地铁'
        });
    });

    it('creates a customer with the operator id from request user', async () => {
        customerService.createCustomer.mockResolvedValue({
            id: customerId,
            customerNo: 'CUST-2026-000001',
            displayName: '华南地铁集团',
            legalName: null,
            shortName: null,
            status: 'active',
            ownerOrgId: null,
            ownerUserId: userId,
            sourceChannel: null,
            remark: null,
            mergedIntoCustomerId: null,
            rowVersion: 1,
            createdAt: '2026-04-29T08:00:00.000Z',
            createdBy: userId,
            updatedAt: '2026-04-29T08:00:00.000Z',
            updatedBy: userId
        });

        const result = await controller.create(
            {
                displayName: '华南地铁集团',
                sourceChannel: '展会'
            },
            { user: { sub: userId } } as never
        );

        expect(customerService.createCustomer).toHaveBeenCalledWith(
            {
                displayName: '华南地铁集团',
                sourceChannel: '展会'
            },
            userId
        );
        expect(result.id).toBe(customerId);
    });

    it('updates customer basic information with the operator id', async () => {
        customerService.updateCustomer.mockResolvedValue({
            id: customerId,
            customerNo: 'CUST-2026-000001',
            displayName: '华南地铁集团',
            legalName: null,
            shortName: null,
            status: 'active',
            ownerOrgId: null,
            ownerUserId: userId,
            sourceChannel: null,
            remark: null,
            mergedIntoCustomerId: null,
            rowVersion: 2,
            createdAt: '2026-04-29T08:00:00.000Z',
            createdBy: userId,
            updatedAt: '2026-04-29T09:00:00.000Z',
            updatedBy: userId,
            ownerName: '张销售',
            ownerOrgName: null,
            leadCount: 0,
            projectCount: 0,
            contractCount: 0,
            aliases: []
        });

        await controller.update(
            customerId,
            {
                displayName: '华南地铁集团',
                status: 'active'
            },
            { user: { sub: userId } } as never
        );

        expect(customerService.updateCustomer).toHaveBeenCalledWith(
            customerId,
            {
                displayName: '华南地铁集团',
                status: 'active'
            },
            userId
        );
    });

    it('creates customer aliases under the selected customer', async () => {
        customerService.createAlias.mockResolvedValue({
            id: '12000000-0000-4000-8000-000000000001',
            customerId,
            aliasName: '华南地铁',
            aliasType: 'short-name',
            normalizedName: '华南地铁',
            isPrimary: false,
            createdAt: '2026-04-29T09:00:00.000Z',
            createdBy: userId
        });

        await controller.createAlias(
            customerId,
            {
                aliasName: '华南地铁',
                aliasType: 'short-name'
            },
            { user: { sub: userId } } as never
        );

        expect(customerService.createAlias).toHaveBeenCalledWith(
            customerId,
            {
                aliasName: '华南地铁',
                aliasType: 'short-name'
            },
            userId
        );
    });
});
