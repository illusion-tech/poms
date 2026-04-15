import { loginAsAdmin } from '../support/api-client';
import { expectErrorStatus } from '../support/http';
import {
    confirmProjectHandover,
    getContractHandoverSummary,
    getProjectHandoverDetailByHandover
} from '../support/project-handover-api';
import {
    PROJECT_HANDOVER_E2E_FIXTURES,
    PROJECT_HANDOVER_E2E_USERS
} from '../support/project-handover-seed-fixtures';

jest.setTimeout(120_000);

describe('poms-api project handover workflow e2e', () => {
    it('reports a missing contract handover summary snapshot before handover preparation', async () => {
        const { client } = await loginAsAdmin();
        const fixture = PROJECT_HANDOVER_E2E_FIXTURES.summaryMissing;

        const summary = await getContractHandoverSummary(client, fixture.projectId);

        expect(summary.effectiveContractSetSummary.activeContractCount).toBe(1);
        expect(summary.contractBaselineValidationSummary.status).toBe('ready');
        expect(summary.receivablePlanInitSummary.status).toBe('initialized');
        expect(summary.allowedActions).toEqual(['generate-contract-handover-summary-snapshot']);
        expect(summary.blockingReasons).toContain('Contract handover summary snapshot is not generated');
    });

    it('runs contract handover summary to confirmed project handover through public APIs', async () => {
        const { client } = await loginAsAdmin();
        const fixture = PROJECT_HANDOVER_E2E_FIXTURES.main;

        const readySummary = await getContractHandoverSummary(client, fixture.projectId);
        expect(readySummary.contractSummarySnapshotId).toBe(fixture.contractSummarySnapshotId);
        expect(readySummary.allowedActions).toEqual(['confirm-project-handover']);
        expect(readySummary.blockingReasons).toEqual([]);

        const detail = await getProjectHandoverDetailByHandover(client, fixture.handoverId);
        expect(detail.handoverStatus).toBe('draft');
        expect(detail.summarySnapshotId).toBe(fixture.handoverSummarySnapshotId);
        expect(detail.participantConfirmationSummary.status).toBe('confirmed');
        expect(detail.allowedActions).toEqual(['confirm-project-handover']);

        const confirmResult = await confirmProjectHandover(client, fixture.handoverId, {
            comment: 'e2e 确认项目移交',
            participantConfirmations: [
                {
                    participantId: PROJECT_HANDOVER_E2E_USERS.adminId,
                    participantRoleKey: 'execution-owner',
                    participantStatus: 'confirmed'
                },
                {
                    participantId: PROJECT_HANDOVER_E2E_USERS.viewerId,
                    participantRoleKey: 'sales-owner',
                    participantStatus: 'confirmed'
                }
            ],
            receiptJudgmentMode: 'milestone-receipt',
            contractSummarySnapshotId: fixture.contractSummarySnapshotId,
            expectedVersion: detail.rowVersion ?? undefined
        });

        expect(confirmResult.businessStatusAfter).toBe('confirmed');
        expect(confirmResult.confirmationRecordId).toBe(fixture.confirmationRecordId);
        expect(confirmResult.receiptJudgmentFreezeId).toBeTruthy();
        expect(confirmResult.contractSummarySnapshotId).toBe(fixture.contractSummarySnapshotId);

        const confirmedDetail = await getProjectHandoverDetailByHandover(client, fixture.handoverId);
        expect(confirmedDetail.handoverStatus).toBe('confirmed');
        expect(confirmedDetail.receiptJudgmentModeSummary).toMatchObject({
            status: 'frozen',
            receiptJudgmentMode: 'milestone-receipt',
            sourceType: 'project-handover',
            sourceId: fixture.handoverId
        });
    });

    it('rejects project handover confirmation when the request uses a stale version', async () => {
        const { client } = await loginAsAdmin();
        const fixture = PROJECT_HANDOVER_E2E_FIXTURES.staleVersion;
        const detail = await getProjectHandoverDetailByHandover(client, fixture.handoverId);

        const response = await client.post(`/project-handovers/${fixture.handoverId}/confirm`, {
            participantConfirmations: [
                {
                    participantId: PROJECT_HANDOVER_E2E_USERS.adminId,
                    participantRoleKey: 'execution-owner',
                    participantStatus: 'confirmed'
                },
                {
                    participantId: PROJECT_HANDOVER_E2E_USERS.viewerId,
                    participantRoleKey: 'sales-owner',
                    participantStatus: 'confirmed'
                }
            ],
            contractSummarySnapshotId: fixture.contractSummarySnapshotId,
            expectedVersion: (detail.rowVersion ?? 1) + 1
        });

        expectErrorStatus(response, 409, 'ProjectHandover version');
    });

    it('rejects project handover confirmation when a confirmed participant is missing from the request', async () => {
        const { client } = await loginAsAdmin();
        const fixture = PROJECT_HANDOVER_E2E_FIXTURES.missingParticipant;
        const detail = await getProjectHandoverDetailByHandover(client, fixture.handoverId);

        const response = await client.post(`/project-handovers/${fixture.handoverId}/confirm`, {
            participantConfirmations: [
                {
                    participantId: PROJECT_HANDOVER_E2E_USERS.adminId,
                    participantRoleKey: 'execution-owner',
                    participantStatus: 'confirmed'
                }
            ],
            contractSummarySnapshotId: fixture.contractSummarySnapshotId,
            expectedVersion: detail.rowVersion
        });

        expectErrorStatus(
            response,
            400,
            `Project handover participant ${PROJECT_HANDOVER_E2E_USERS.viewerId} is missing from request`
        );
    });

    it('blocks project handover confirmation while the latest rebaseline is still processing', async () => {
        const { client } = await loginAsAdmin();
        const fixture = PROJECT_HANDOVER_E2E_FIXTURES.processingRebaseline;
        const detail = await getProjectHandoverDetailByHandover(client, fixture.handoverId);

        expect(detail.allowedActions).toEqual([]);
        expect(detail.blockingReasons).toContain(
            `Handover rebaseline record ${fixture.processingRebaselineRecordId} is still processing`
        );

        const response = await client.post(`/project-handovers/${fixture.handoverId}/confirm`, {
            participantConfirmations: [
                {
                    participantId: PROJECT_HANDOVER_E2E_USERS.adminId,
                    participantRoleKey: 'execution-owner',
                    participantStatus: 'confirmed'
                },
                {
                    participantId: PROJECT_HANDOVER_E2E_USERS.viewerId,
                    participantRoleKey: 'sales-owner',
                    participantStatus: 'confirmed'
                }
            ],
            contractSummarySnapshotId: fixture.contractSummarySnapshotId,
            expectedVersion: detail.rowVersion
        });

        expectErrorStatus(response, 400, 'is still processing');
    });
});
