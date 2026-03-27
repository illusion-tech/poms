import axios from 'axios';
import { createApiClient, loginAsAdmin } from '../support/api-client';
import { expectErrorStatus } from '../support/http';
import { listMyTodos } from '../support/approval-api';

jest.setTimeout(120_000);

describe('poms-api auth and shell e2e', () => {
    it('exposes root API and authenticated shell endpoints', async () => {
        const rootResponse = await axios.get<{ message: string }>('/');
        expect(rootResponse.status).toBe(200);
        expect(rootResponse.data).toEqual({ message: 'Hello API' });

        const { profile, client } = await loginAsAdmin();
        expect(profile.username).toBe('admin');
        expect(profile.permissions).toEqual(
            expect.arrayContaining([
                'project:read',
                'project:write',
                'commission:payouts:manage'
            ])
        );

        const todos = await listMyTodos(client);
        expect(Array.isArray(todos)).toBe(true);
    });

    it('rejects unauthenticated access to protected profile endpoint', async () => {
        const response = await createApiClient().get('/auth/profile');
        expectErrorStatus(response, 401);
    });
});
