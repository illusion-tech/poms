import { loginAsAdmin } from '../support/api-client';
import {
    createCommercialReleaseBaseline,
    createContractReadinessPackage,
    getCommercialDiffHistory,
    getCommercialReleaseBaseline,
    getCurrentContractReadiness,
    initializeContractSnapshotFromReadiness,
    initializeReceivablePlanFromReadiness,
    reviewCommercialReleaseBaselineDiff
} from '../support/contract-api';
import { createProjectForProfile } from '../support/project-api';
import {
    buildCommercialReleaseBaselineInput,
    buildContractReadinessPackageInput,
    makeUniqueSuffix
} from '../support/test-data';

jest.setTimeout(120_000);

describe('poms-api contract readiness workflow e2e', () => {
    it('creates baseline, records review history and initializes readiness outputs', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('readiness');

        const project = await createProjectForProfile(client, profile, {
            customerProjectNo: `E2E-PRJ-${unique}`,
            projectName: `E2E 签约就绪主链 ${unique}`,
            currentStage: 'commercial-closure'
        });

        const baseline = await createCommercialReleaseBaseline(
            client,
            buildCommercialReleaseBaselineInput(project.id, profile.id, unique)
        );
        expect(baseline.reviewStatus).toBe('pending-review');

        const reviewResult = await reviewCommercialReleaseBaselineDiff(client, baseline.id, {
            diffDecision: 'approved',
            reviewedFieldKeys: ['downPaymentRate'],
            expectedVersion: baseline.rowVersion
        });
        expect(reviewResult.baselineReviewDecision).toBe('approved');

        const refreshedBaseline = await getCommercialReleaseBaseline(client, baseline.id);
        expect(refreshedBaseline.reviewStatus).toBe('approved');

        const diffHistory = await getCommercialDiffHistory(client, baseline.id);
        expect(diffHistory.reviewHistory).toHaveLength(1);
        expect(diffHistory.diffItems[0]?.fieldKey).toBe('downPaymentRate');

        const readinessPackage = await createContractReadinessPackage(
            client,
            buildContractReadinessPackageInput(project.id, profile.id, refreshedBaseline.id, refreshedBaseline.latestDiffResultId)
        );
        expect(readinessPackage.allowedActions).toContain('initialize-contract-snapshot');

        const snapshotInit = await initializeContractSnapshotFromReadiness(client, readinessPackage.id, {
            expectedVersion: readinessPackage.rowVersion
        });
        expect(snapshotInit.snapshotId).toBeTruthy();

        const currentReadiness = await getCurrentContractReadiness(client, project.id);
        const receivableInit = await initializeReceivablePlanFromReadiness(client, readinessPackage.id, {
            expectedVersion: currentReadiness.rowVersion
        });
        expect(receivableInit.newVersionId).toBeTruthy();

        const initializedReadiness = await getCurrentContractReadiness(client, project.id);
        expect(initializedReadiness.reviewStatus).toBe('approved');
        expect(initializedReadiness.initializedContractSnapshotId).toBe(snapshotInit.snapshotId);
        expect(initializedReadiness.initializedReceivablePlanVersionId).toBe(receivableInit.newVersionId);
    });
});
