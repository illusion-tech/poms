import test from 'node:test';
import assert from 'node:assert/strict';
import { supportedTables, identities } from './fixture-core.mjs';
import { boundary, additionalIdentities, inspectCommissionCandidate } from './fixture-commission-candidate.mjs';

test('historical proposal01 remains a disabled descriptor; epoch02 independently activates its 25 explicit identities', () => {
    const inspected = inspectCommissionCandidate();
    assert.equal(boundary.enabled, false); assert.equal(inspected.databaseOrDMLExecuted, false);
    assert.equal(supportedTables.length, 40); assert.equal(inspected.originalFirstClosure.length, 15); assert.equal(Object.keys(additionalIdentities).length, 25);
    for (const [table, fields] of Object.entries(additionalIdentities)) assert.deepEqual(identities[table], fields);
});
test('original minimal prepared branch includes payment and maturity and excludes global/upsert branches', () => {
    const inspected = inspectCommissionCandidate();
    assert(inspected.selectedPreparedTables.includes('payment_record'));
    assert(inspected.selectedPreparedTables.includes('data_maturity_evaluation_result'));
    assert(!inspected.selectedPreparedTables.includes('change_package_baseline'));
    for (const table of ['approval_summary_package_definition', 'business_number_sequence', 'change_package_baseline', 'contract_amendment', 'commercial_release_baseline', 'contract_readiness_package']) assert(inspected.stillUnsupported.includes(table));
});
