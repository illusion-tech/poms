import { CustomerAliasController } from './customer-alias.controller';
import { CustomerService } from './customer.service';

describe('CustomerAliasController', () => {
    const aliasId = '12000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000001';

    let controller: CustomerAliasController;
    let customerService: jest.Mocked<Pick<CustomerService, 'deleteAlias'>>;

    beforeEach(() => {
        customerService = {
            deleteAlias: jest.fn()
        } as jest.Mocked<Pick<CustomerService, 'deleteAlias'>>;
        controller = new CustomerAliasController(customerService as never);
    });

    it('passes alias, actor, and request identity to the delete command', async () => {
        await controller.delete(aliasId, {
            user: { sub: userId },
            headers: {
                'x-request-id': 'request-123'
            }
        } as never);

        expect(customerService.deleteAlias).toHaveBeenCalledWith(aliasId, userId, 'request-123');
    });
});
