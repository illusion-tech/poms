// Pure named-source projection for one owned term snapshot. The other original
// seeder rows/functions are never executed against a database by this helper.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { buildCommercialReleaseBaselineInput } from '../../apps/poms-api-e2e/src/support/test-data.ts';
import { lookupSensitiveFields } from './lookup-matrix.mjs';
import { inspectCommissionPreparedSource, buildCommissionPreparedRows } from './commission-prepared-source.mjs';
import { validateCommissionPreparedPlan } from './fixture-prepared.mjs';
export async function buildLookupPreparedTerm({ runId, actorId, orgId, projectId, contractId, metadata }) {
    assert(/^[0-9a-f-]{36}$/.test(projectId));
    const source = await inspectCommissionPreparedSource(), mappings = Object.fromEntries(source.requiredUuidMappings.map(({ from }) => [from, randomUUID()]));
    const oldContract = source.requiredUuidMappings.find(({ occurrences }) => occurrences.some((entry) => entry.table === 'contract' && entry.path[0] === 'id'))?.from;
    assert(oldContract); mappings[oldContract] = contractId;
    mappings['00000000-0000-4000-8000-000000000001'] = actorId;
    mappings['10000000-0000-4000-8000-000000000001'] = orgId;
    const plan = await buildCommissionPreparedRows({ uuidMappings: mappings, names: { projectNo: 'lookup-projection-' + runId.slice(0, 8), projectName: 'lookup projection ' + runId.slice(0, 8), contractNo: 'lookup-projection-contract-' + runId.slice(0, 8) } });
    const validated = await validateCommissionPreparedPlan(plan), row = validated.rows.find(({ table }) => table === 'contract_term_snapshot'); assert(row);
    const meta = metadata.find((entry) => entry.tableName === row.table); assert(meta && meta.schema === 'poms');
    for (const column of [...Object.keys(row.values), ...row.omitted.map(({ column }) => column)]) assert(meta.properties.some((property) => property.fieldNames?.includes(column)), 'Original snapshot column has no actual Native metadata mapping');
    const supportFile = 'apps/poms-api-e2e/src/support/test-data.ts', support = fs.readFileSync(supportFile);
    const serviceFile = 'apps/poms-api/src/app/features/contract/contract.service.ts', service = fs.readFileSync(serviceFile);
    const baselineInput = buildCommercialReleaseBaselineInput(projectId, actorId, 'lookup-' + runId.slice(0, 8));
    const mapping = lookupSensitiveFields.map(([column]) => {
        const property = meta.properties.find((entry) => entry.fieldNames?.includes(column)); assert(property);
        assert(service.toString('utf8').includes(property.name + ': baseline?.' + property.name + ' ?? null'), 'Original activation does not copy this core term');
        assert(Object.hasOwn(baselineInput, property.name) && typeof baselineInput[property.name] === 'string');
        return { column, property: property.name, value: baselineInput[property.name] };
    });
    const stamp = (file, bytes) => ({ file, rawBytesSha256: createHash('sha256').update(bytes).digest('hex'), normalizedLfSha256: createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex') });
    return { row, nonnullPreparation: { values: Object.fromEntries(mapping.map(({ column, value }) => [column, value])), mapping,
        provenance: { kind: 'prepared-owned-snapshot-core-terms-from-original-E2E-input-helper', NativeBusinessProducerClaimed: false,
            inputHelper: { ...stamp(supportFile, support), function: 'buildCommercialReleaseBaselineInput', overridesSupplied: false, explicitProjectId: projectId, explicitActorId: actorId },
            originalCopySite: { ...stamp(serviceFile, service), method: 'ContractService.activate', selectedFieldsOnly: true },
            action: 'f.updateOwned(contract_term_snapshot,ownedId,exactSixValues,preparedReason); no baseline/readiness producer/table writes' } }, provenance: {
        kind: 'prepared-single-original-seeder-term-plus-explicit-metadata-null-identities', NativeBusinessProducerClaimed: false,
        source: plan.source, originalEntry: plan.originalEntry, originalStatement: row.source, sourcePlanSha256: validated.sourcePlanSha256,
        selectedOriginalRows: 1, excludedOtherPreparedRows: plan.rows.length - 1, allOtherPreparedTablesExecuted: false,
        explicitNullableIdentityColumns: row.omitted.map(({ column }) => column), actualPhysicalNoDefaultCheckStillRequired: true,
        mapping: plan.mappings, sourceDefaultEvidence: validated.defaultSources
    } };
}
