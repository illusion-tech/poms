import { findOpenTodoForTarget, getApprovalRecord, approveRecord, rejectRecord } from '../support/approval-api';
import { loginAsAdmin, loginAsViewer } from '../support/api-client';
import { createContract, getContract, submitContractReview } from '../support/contract-api';
import { expectErrorStatus } from '../support/http';
import {
    assignRolePermissions,
    assignUserRoles,
    createRole,
    findPlatformRoleByKey,
    findPlatformUserByUsername
} from '../support/platform-api';
import { createProjectForProfile } from '../support/project-api';
import { buildContractInput, makeUniqueSuffix } from '../support/test-data';

jest.setTimeout(120_000);

describe('poms-api approval workflow e2e', () => {
    it('rejects a non-assigned user processing an approval even when that user has project:write', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('approval-actor');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 审批处理人校验 ${unique}`,
            currentStage: 'negotiation'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '98000.00'
            })
        );

        await submitContractReview(client, contract.id, {
            comment: 'e2e 非处理人审批校验',
            expectedVersion: contract.rowVersion
        });

        const todo = await findOpenTodoForTarget(client, 'Contract', contract.id);
        const viewer = await findPlatformUserByUsername(client, 'viewer');
        const projectViewerRole = await findPlatformRoleByKey(client, 'project-viewer');
        const tempRole = await createRole(client, {
            roleKey: `e2e-approval-${Date.now().toString(36)}`,
            name: `E2E 审批操作角色 ${unique}`,
            description: '用于验证非当前处理人审批拒绝',
            displayOrder: 99
        });
        await assignRolePermissions(client, tempRole.id, {
            permissionKeys: ['project:read', 'project:write']
        });

        try {
            await assignUserRoles(client, viewer.id, {
                roleIds: [projectViewerRole.id, tempRole.id]
            });

            const viewerSession = await loginAsViewer();
            const response = await viewerSession.client.post(`/approval-records/${todo.sourceId}/approve`, {
                comment: 'e2e 非当前处理人尝试审批',
                expectedVersion: 1
            });

            expectErrorStatus(response, 403, 'is not assigned to current user');
        } finally {
            await assignUserRoles(client, viewer.id, {
                roleIds: [projectViewerRole.id]
            });
        }
    });

    it('rejects re-approving a closed approval record', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('approval-repeat-approve');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 审批重复通过 ${unique}`,
            currentStage: 'negotiation'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '108000.00'
            })
        );

        await submitContractReview(client, contract.id, {
            comment: 'e2e 审批重复通过',
            expectedVersion: contract.rowVersion
        });

        const todo = await findOpenTodoForTarget(client, 'Contract', contract.id);
        await approveRecord(client, todo.sourceId, {
            comment: 'e2e 首次审批通过',
            expectedVersion: 1
        });

        const closedApproval = await getApprovalRecord(client, todo.sourceId);
        const response = await client.post(`/approval-records/${todo.sourceId}/approve`, {
            comment: 'e2e 二次审批通过',
            expectedVersion: closedApproval.rowVersion
        });

        expectErrorStatus(response, 400, 'cannot be processed in status approved');
    });

    it('rejects re-rejecting a closed approval record', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('approval-repeat-reject');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 审批重复驳回 ${unique}`,
            currentStage: 'negotiation'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '118000.00'
            })
        );

        await submitContractReview(client, contract.id, {
            comment: 'e2e 审批重复驳回',
            expectedVersion: contract.rowVersion
        });

        const todo = await findOpenTodoForTarget(client, 'Contract', contract.id);
        await rejectRecord(client, todo.sourceId, {
            reason: '首次驳回',
            comment: 'e2e 首次驳回',
            expectedVersion: 1
        });

        const closedApproval = await getApprovalRecord(client, todo.sourceId);
        const response = await client.post(`/approval-records/${todo.sourceId}/reject`, {
            reason: '二次驳回',
            comment: 'e2e 重复驳回',
            expectedVersion: closedApproval.rowVersion
        });

        expectErrorStatus(response, 400, 'cannot be processed in status rejected');

        const rejectedContract = await getContract(client, contract.id);
        expect(rejectedContract.status).toBe('draft');
    });
});
