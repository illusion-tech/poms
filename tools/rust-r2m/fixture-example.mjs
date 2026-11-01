// Root calling example only. Importing this file opens nothing. Never print the
// Fixture/client or full facts: actual rows/credentials belong in new private.
import assert from 'node:assert/strict';
import { Fixture } from './fixture.mjs';

export const settingLeaseCase = 'm2-ui2.attachment-max-upload-size';

export async function createFixtureHooks({ backend, runId, settingAdmission, recordPrivate }) {
    assert(typeof recordPrivate === 'function', 'Root must provide its new-private recorder');
    const fixture = await Fixture.open(backend, runId);
    try {
        const prepared = await fixture.prepare();
        await fixture.borrowSeedPrincipals();
        await fixture.borrowCanonicalDefinitions();
        if (settingAdmission) {
            assert.equal(settingAdmission.caseId, settingLeaseCase);
            fixture.defineCase(settingLeaseCase, { actors: Object.values(fixture.actors) });
            await fixture.admitBaselineSetting(settingAdmission, { caseId: settingLeaseCase });
        }
        // These are hooks for Root/B orchestration, not a self-running matrix.
        return {
            prepareReceipt: { state: prepared.state, actors: fixture.actors, sourceReadyIsNotActualAcceptance: true },
            defineCase(caseId, options) { return fixture.defineCase(caseId, options); },
            intent(table, immutableSelector, options) { return fixture.intent(table, immutableSelector, options); },
            async certify({ actualAuthorityReceipt, actualCreateCertificates, observer = 'native' }) {
                // The supplied records must come from the actual witness.
                // creationEnvelope adds provenance only; it invents no SDK/PG field.
                const authority = fixture.creationEnvelope(actualAuthorityReceipt);
                if (observer === 'native') fixture.registerNativeAuthority(authority);
                else { assert.equal(observer, 'pg'); await fixture.registerPgObserver(authority); }
                fixture.recordCommittedCreates(actualCreateCertificates.map(item => fixture.creationEnvelope(item)));
                await fixture.adoptIntents();
            },
            async readFacts(logicalCase) {
                const facts = await fixture.facts();
                await recordPrivate('facts-' + logicalCase, facts);
                return facts;
            },
            async finishCase(caseId, logicalCase = caseId) {
                await fixture.resolveNoCreates(caseId);
                const facts = await fixture.facts({ caseId });
                await recordPrivate('finish-' + logicalCase, facts);
                assert.equal(facts.unknownCreates, 0); assert.equal(facts.unknownMutations, 0);
                return { state: 'bounded-case-facts-recorded', logicalCase, sourceCase: caseId,
                    baselineRestoreRequiredAtFinalDrain: Boolean(fixture.j.baselineSettingLease), matrixDecisionCertified: false };
            },
            async recordSettingResponse(actualRequestReceipt) {
                // Root maps M2/UI logical labels into this one real case/request
                // identity. Keep logicalCase/stepId as extra receipt metadata.
                assert.equal(actualRequestReceipt.caseId, settingLeaseCase);
                return fixture.recordBaselineSettingAfter(actualRequestReceipt);
            },
            insertPreparedBatch(plan, options) { return fixture.insertPreparedBatch(plan, options); },
            directMutation(table, id, values, reason) { return fixture.directMutation(table, id, values, reason); },
            planObjectPrefix() { return fixture.planObjectPrefix(); },
            certifyLocalObject(table, id, key) { return fixture.certifyLocalObject(table, id, key); },
            async closeout(actualWriterDrainReceipt) {
                // Root first stops/drains browser, proxy, API, upstream and
                // observer owners and restores its declared fault artifacts.
                try {
                    fixture.drain(actualWriterDrainReceipt);
                    const singleton = fixture.j.baselineSettingLease ? await fixture.restoreBaselineSetting() : null;
                    const first = await fixture.cleanup(), repeated = await fixture.cleanup();
                    assert.equal(repeated.deleted, 0); assert.equal(repeated.cycleBreaks, 0);
                    assert.equal(repeated.objects.changed, 0); assert.equal(repeated.secondObjects.changed, 0);
                    await recordPrivate('closeout', { singleton, first, repeated });
                    return { state: 'bounded-fixture-closeout-recorded', singleton, first, repeated, stageOrG3Certified: false };
                } finally { await fixture.close(); }
            },
            closeWithoutClaim() { return fixture.close(); }
        };
    } catch (error) { await fixture.close(); throw error; }
}
