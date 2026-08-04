import { loginAsAdmin, loginAsViewer } from '../support/api-client';
import { createCustomer } from '../support/customer-api';
import { expectErrorStatus, expectStatus } from '../support/http';
import { listAuditLogs } from '../support/runtime-audit-api';
import { makeUniqueSuffix } from '../support/test-data';
import type { CreateCustomerAliasRequest, CustomerAliasSummary, CustomerDetailView } from '../support/types';

jest.setTimeout(120_000);

describe('poms-api customer alias deletion e2e', () => {
    it('enforces permission and primary protection, then deletes and audits a non-primary alias', async () => {
        const { client: adminClient, profile: adminProfile } = await loginAsAdmin();
        const { client: viewerClient } = await loginAsViewer();
        const unique = makeUniqueSuffix('customer-alias-delete');
        const requestId = `e2e-alias-${Date.now()}`;
        const customer = await createCustomer(adminClient, {
            displayName: `E2E 别名删除客户 ${unique}`,
            sourceChannel: 'e2e'
        });
        const aliasInput: CreateCustomerAliasRequest = {
            aliasName: `E2E 错误别名 ${unique}`,
            aliasType: 'alias'
        };
        const aliasResponse = await adminClient.post<CustomerAliasSummary>(`/customers/${customer.id}/aliases`, aliasInput);
        const alias = expectStatus(aliasResponse, 201);

        const viewerDeleteResponse = await viewerClient.delete(`/customer-aliases/${alias.id}`);
        expectErrorStatus(viewerDeleteResponse, 403);

        const detailResponse = await adminClient.get<CustomerDetailView>(`/customers/${customer.id}`);
        const detail = expectStatus(detailResponse, 200);
        const primaryAlias = detail.aliases.find((item) => item.isPrimary);
        expect(primaryAlias).toBeDefined();

        const primaryDeleteResponse = await adminClient.delete(`/customer-aliases/${primaryAlias!.id}`);
        expectErrorStatus(primaryDeleteResponse, 409, 'cannot be deleted');

        const deleteResponse = await adminClient.delete(`/customer-aliases/${alias.id}`, {
            headers: {
                'x-request-id': requestId
            }
        });
        expectStatus(deleteResponse, 204);

        const aliasesResponse = await adminClient.get<CustomerAliasSummary[]>(`/customers/${customer.id}/aliases`);
        const aliases = expectStatus(aliasesResponse, 200);
        expect(aliases.some((item) => item.id === alias.id)).toBe(false);
        expect(aliases.some((item) => item.id === primaryAlias!.id)).toBe(true);

        const auditLogs = await listAuditLogs(adminClient, {
            eventType: 'customer.alias.deleted',
            targetType: 'customer',
            targetId: customer.id,
            limit: 20
        });
        expect(auditLogs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    eventType: 'customer.alias.deleted',
                    targetType: 'customer',
                    targetId: customer.id,
                    operatorId: adminProfile.id,
                    requestId,
                    result: 'success',
                    beforeSnapshot: expect.objectContaining({
                        aliasId: alias.id,
                        aliasName: aliasInput.aliasName,
                        isPrimary: false
                    }),
                    afterSnapshot: null,
                    metadata: {
                        sourceCommand: 'delete-customer-alias'
                    }
                })
            ])
        );

        const repeatedDeleteResponse = await adminClient.delete(`/customer-aliases/${alias.id}`);
        expectErrorStatus(repeatedDeleteResponse, 404);
    });
});
