// Pure semantic comparison of the new sanitized saved exports. No private/DB
// access. A result is bounded caller-UoW evidence, never G3 or whole-domain Pass.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stable, digest, UOW_WRITE_TABLES, inspectUowLocalFacts, expectedUowCloseouts,
    completeRecordedSdkTrace, completeRecordedCleanup, publicUowEvidenceFailure } from './l-shared-uow-export.mjs';
import { sharedUowMeasurementContract } from './l-shared-uow-measurements.mjs';
import { originalRepresentationMetadata, versionOriginalBoundary, participantsOriginalBoundary, explicitGcOuterUpdatedAt,
    originalSdkRepresentationMechanisms } from './l-shared-uow-representation.mjs';
const SOURCE = 'tools/rust-r2l/l-shared-uow-compare.mjs';
const BUSINESS = UOW_WRITE_TABLES;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const CLOCKS = new Set(['created_at', 'updated_at', 'generated_at', 'submitted_at', 'decided_at', 'closed_at', 'completed_at', 'approved_at', 'frozen_at', 'handled_at']);
const STAGES = ['parent-loaded', 'parent-second-Todo-dirty', 'after-original-service-child', 'after-outer-action-held-bindings', 'after-cached-reread', 'after-clear-reread-with-held-bindings'];
const SNAPSHOT_FIELDS = new Set(['table', 'id', 'managed', 'queued', 'properties', 'original', 'originalOwnKeys',
    'helperHasEm', 'helperEmIsParent', 'managedByParent', 'helperOriginalPresence']);
const NATIVE_ONLY = new Set(['helperHasEm', 'helperEmIsParent', 'managedByParent', 'helperOriginalPresence']);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const equal = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));
export function materializedNumericLexeme(rowJson, column) {
    assert(typeof rowJson === 'string' && /^[a-z_][a-z0-9_]*$/.test(column));
    const pattern = new RegExp('(?<!\\\\)"' + column + '"\\s*:\\s*(null|-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)(?=\\s*[,}])', 'g');
    const matches = [...rowJson.matchAll(pattern)]; return matches.length === 1 ? matches[0][1] : null;
}
export function compareUowExports(native, rust) {
    assert.equal(native.kind, 'sanitized-complete-saved-bounded-caller-UoW-evidence');
    assert.equal(rust.kind, native.kind); assert.equal(native.backend, 'nest'); assert.equal(rust.backend, 'rust');
    assert.deepEqual(native.measurementContract, sharedUowMeasurementContract); assert.deepEqual(rust.measurementContract, sharedUowMeasurementContract);
    const differences = [], gaps = [], classifications = [], clocks = [], localInvariants = [], pairings = [];
    const result = { formatVersion: 2, kind: 'bounded-caller-UoW-semantic-comparison-not-G3', variant: native.variant,
        native: { tag: native.tag, runId: native.runId }, rust: { tag: rust.tag, runId: rust.runId },
        differences, gaps, classifications, clocks, localInvariants, pairings, localCoverage: [], checkedScalars: 0,
        measurementContract: sharedUowMeasurementContract, wholeArraysOrObservationsDeclaredEqual: false,
        newOwnershipCertificatesIssued: false, G3Certified: false, G4Certified: false };
    result.namedRepresentationPolicy={sourceEpoch:3,mechanisms:originalSdkRepresentationMechanisms,rawSource02DifferencesRewritten:false,productStateOrClocksModified:false};
    const gap = (at, kind, details = {}) => gaps.push({ path: at, kind, ...details });
    const mismatch = (at, left, right, kind = 'value-difference') => differences.push({ path: at, kind, native: left, rust: right });
    if (native.variant !== rust.variant) mismatch('/variant', native.variant, rust.variant);
    if (!native.compiledChain || !rust.compiledChain) gap('/compiledChain', 'missing-saved-compiled-source-chain');
    else {
        if (native.compiledChain.epoch !== rust.compiledChain.epoch) gap('/compiledChain', 'compiled-product-epoch-mismatch',
            { native: native.compiledChain.epoch, rust: rust.compiledChain.epoch });
        if (!equal(native.compiledChain.mainApplication, rust.compiledChain.mainApplication))
            mismatch('/compiledChain/mainApplication', native.compiledChain.mainApplication, rust.compiledChain.mainApplication);
        if (rust.sql.sourceText && (rust.sql.sourceText.sha256 !== rust.compiledChain.store.rawBytesSha256
            || rust.sql.sourceText.compiledEpoch !== rust.compiledChain.epoch))
            gap('/sql/sourceText', 'Rust-source-inference-is-not-bound-to-this-compiled-epoch');
        for (const [side, source] of [['native', native], ['rust', rust]]) if (source.compiledChain.epoch !== 'candidate08')
            gap('/' + side + '/compiledChain', 'historical-compiled-epoch-is-not-final08', { actual: source.compiledChain.epoch });
    }
    for (const key of ['childSuccess', 'outer', 'continueAfterServiceError', 'expectedAction'])
        if (!equal(native.ownerOptions[key], rust.ownerOptions[key])) mismatch('/ownerOptions/' + key, native.ownerOptions[key], rust.ownerOptions[key]);
    for (const [side, source] of [['native', native], ['rust', rust]]) {
        if (source.formatVersion !== 2) gap('/' + side, 'legacy-export-schema-requires-source02-reexport');
        const coverage = inspectUowLocalFacts(source.before, source.after);
        result.localCoverage.push({ side, ...coverage });
        for (const entry of coverage.gaps) gap('/' + side + entry.path, 'independent-local-40-table-coverage-gap', { detail: entry });
        const closes = source.driver?.resourceCloseout;
        if (!Array.isArray(closes) || !equal(closes.map(row => row.name), expectedUowCloseouts(source.backend)) || !closes.every(row => row.result === 'pass'))
            gap('/' + side + '/driver/resourceCloseout', 'incomplete-or-unexpected-exact-closeout-list');
        const ownedRecords = ['direct', 'originalSdk', 'independentPg7', 'unknown'].flatMap(key => source.ownership?.[key] ?? []);
        if (source.driver?.doubleZero !== true || !completeRecordedCleanup(source.driver, { objects: ownedRecords }))
            gap('/' + side + '/driver/cleanup', 'incomplete-recorded-exact-cleanup-and-double-zero');
        if (!completeRecordedSdkTrace(source.driver?.nativeFinal?.witness) || source.driver?.nativeFinal?.pgCaptureComplete !== true)
            gap('/' + side + '/driver/nativeFinal', 'incomplete-global-SDK-or-PG-capture');
        for (const recorded of source.ownership?.authorityRecords ?? []) if (recorded.kind === 'mikro-orm-afterCreate-outer-commit' && !completeRecordedSdkTrace(recorded.trace))
            gap('/' + side + '/ownership/authority/' + recorded.id, 'incomplete-original-SDK-authority-trace');
        const knownObservation = new Set(['kind', 'context', 'outer', 'continueAfterServiceError', 'measurementContract', 'stages',
            'originalProvider', 'idealAtomicityAssumed', 'creationCertificatesIssuedHere', 'serviceResult', 'serviceSucceeded', 'serviceError',
            'innerDatabaseSnapshot', 'outerActualAction', 'cachedReread', 'afterClearReread', 'result', 'finishedAt',
            'finallyRolledBackCallerTransaction', 'failure', 'runId', 'caseId', 'connectionIdentity', 'outerError',
            'traceDiagnostics', 'traceIncomplete', 'ownershipAdmitted']);
        for (const key of Object.keys(source.observation)) if (!knownObservation.has(key))
            gap('/' + side + '/observation/' + key, 'unknown-observation-field');
        if (source.observation.traceIncomplete || source.observation.ownershipAdmitted || source.observation.outerError)
            gap('/' + side + '/observation', 'incomplete-or-unexpected-diagnostic-control-state');
        for (const entry of source.gaps ?? []) gap('/' + side + entry.path, 'export-gap', { detail: entry });
        if (source.result !== 'exported-complete-saved-evidence') gap('/' + side, 'incomplete-saved-export', { state: source.result });
        if (source.selection.dirtyTodoLogicalRole !== 'contract.submit.reject')
            gap('/' + side + '/selection/dirtyTodo', 'legacy-or-unknown-TodoB-selection-epoch', { actual: source.selection.dirtyTodoLogicalRole ?? source.selection.choice });
        for (const group of ['direct', 'originalSdk', 'independentPg7', 'unknown'])
            for (const item of source.ownership[group]) if (!item.retainedProofStatus?.eligible)
                gap('/' + side + '/ownership/' + group + '/' + item.id, 'retained-proof-not-eligible', { status: item.retainedProofStatus });
    }
    const maps = [native, rust].map(source => new Map(source.roles.entries.map(entry => [entry.id, entry])));
    const alias = (value, side, at) => {
        const source = side ? rust : native, map = maps[side];
        return value.replace(UUID, id => {
            if (id === source.runId) return '@run-context';
            const entry = map.get(id);
            if (entry) return '@' + entry.table + ':' + entry.role;
            if (source.roles.readonlyIds.includes(id)) return id;
            gap(at, 'UUID-without-typed-retained-proof-or-diagnostic-role', { side: side ? 'rust' : 'native', id }); return id;
        });
    };
    function property(table, field) {
        const left = native.schema.find(row => row.table === table)?.properties.find(row => row.name === field || row.fieldNames.includes(field));
        const right = rust.schema.find(row => row.table === table)?.properties.find(row => row.name === field || row.fieldNames.includes(field));
        if (!left || !right || !equal(left, right)) return null;
        return left;
    }
    const baseline = (source, table, id, field) => source.before[table]?.find(row => row.id === id)?.[field];
    function clock(value, side, context) {
        const source = side ? rust : native, baselineValue = baseline(source, context.table, context.ids?.[side], context.column);
        const metadata=originalRepresentationMetadata(source,context.table,'updatedAt');
        const explicit=explicitGcOuterUpdatedAt(source,{table:context.table,id:context.ids?.[side],column:context.column,value},metadata);
        if(explicit?.eligible)return explicit.valid?explicit:null;
        const baselineEqual = typeof baselineValue === 'string' && Date.parse(baselineValue) === Date.parse(value);
        const selected = context.phase === 'before' || baselineEqual ? ['producer'] : ['child', 'outer'];
        for (const name of selected) {
            const window = source.clockWindows[name], time = Date.parse(value);
            if (window?.from && window.to && Number.isFinite(time) && time >= Date.parse(window.from) - 1 && time <= Date.parse(window.to) + 1)
                return { window: name, from: window.from, to: window.to, actual: value, precisionAllowanceMs: 1, baselineSameInstant: baselineEqual };
        }
        return null;
    }
    function compareValue(left, right, at, context = {}) {
        if (left && right && typeof left === 'object' && typeof right === 'object' && left.withheld && right.withheld) {
            classifications.push({ path: at, kind: 'privacy-withheld-source-specific-secret', native: left, rust: right, equalityClaimed: false }); return;
        }
        if (typeof left === 'string' && typeof right === 'string') {
            const a = alias(left, 0, at), b = alias(right, 1, at);
            if (a === b) { result.checkedScalars++; return; }
            if (context.column && CLOCKS.has(context.column) && /^(?:timestamp|timestamptz)$/.test(context.sqlType ?? '')) {
                const ca = clock(left, 0, context), cb = clock(right, 1, context);
                clocks.push({ path: at, native: ca ?? { actual: left, outsideWindow: true }, rust: cb ?? { actual: right, outsideWindow: true } });
                if (ca && cb && ca.window === cb.window) { result.checkedScalars++; return; }
                gap(at, 'unpaired-source-clock-window', { native: ca, rust: cb });
            }
            mismatch(at, left, right); return;
        }
        if (Array.isArray(left) || Array.isArray(right)) {
            if (!Array.isArray(left) || !Array.isArray(right)) { mismatch(at, left, right, 'array-shape'); return; }
            if (left.length !== right.length) mismatch(at + '/length', left.length, right.length);
            for (let index = 0; index < Math.max(left.length, right.length); index++) compareValue(left[index], right[index], at + '/' + index, context);
            return;
        }
        if (left && right && typeof left === 'object' && typeof right === 'object') {
            const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
            for (const key of keys) {
                if (!own(left, key) || !own(right, key)) { gap(at + '/' + key, 'unpaired-field'); mismatch(at + '/' + key, left[key], right[key], 'presence'); continue; }
                compareValue(left[key], right[key], at + '/' + key, context);
            }
            return;
        }
        result.checkedScalars++;
        if (!Object.is(left, right)) mismatch(at, left, right);
    }
    function compareFields(left, right, at, table, ids, phase,snapshots=null) {
        const keys = [...new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})])].sort();
        for (const key of keys) {
            if (!own(left ?? {}, key) || !own(right ?? {}, key)) { gap(at + '/' + key, 'unpaired-data-field'); mismatch(at + '/' + key, left?.[key], right?.[key], 'presence'); continue; }
            const mapped = property(table, key);
            if (!mapped) gap(at + '/' + key, 'unknown-or-different-scalar-schema-mapping', { table });
            if(snapshots&&key==='participantsJson'&&table==='commission_role_assignment') {
                const metadata=originalRepresentationMetadata(native,table,key),otherMetadata=originalRepresentationMetadata(rust,table,key);
                const fact=(source,id)=>({before:source.before[table]?.find(row=>row.id===id),after:source.after[table]?.find(row=>row.id===id)});
                const paired=metadata&&otherMetadata&&equal(metadata,otherMetadata)?participantsOriginalBoundary(snapshots[0],snapshots[1],{metadata,alias:(value,side)=>alias(value,side,at+'/'+key+'/typed-id'),nativeFacts:fact(native,ids[0]),rustFacts:fact(rust,ids[1])}):null;
                if(paired){classifications.push({path:at+'/'+key,kind:paired.rule,...paired,wholeOriginalObjectsDeclaredEqual:false});result.checkedScalars++;continue;}
            }
            compareValue(left[key], right[key], at + '/' + key, { table, ids, phase, column: mapped?.fieldNames[0], sqlType: mapped?.sqlType });
        }
    }
    function snapshot(left, right, at, phase) {
        if (left == null || right == null) { if (left !== right) mismatch(at, left, right, 'snapshot-presence'); return; }
        for (const [side, value] of [['native', left], ['rust', right]]) for (const key of Object.keys(value))
            if (!SNAPSHOT_FIELDS.has(key)) gap(at + '/' + key, 'unknown-snapshot-field', { side });
        for (const [side, value] of [['native', left], ['rust', right]]) for (const key of ['table', 'id', 'managed', 'queued', 'properties', 'original', 'originalOwnKeys'])
            if (!own(value, key)) gap(at + '/' + key, 'missing-required-snapshot-field', { side });
        const ids = [left.id, right.id], table = left.table;
        for (const field of ['table', 'id', 'managed', 'queued']) compareValue(left[field], right[field], at + '/' + field);
        const entries = ids.map((id, side) => maps[side].get(id));
        if (!entries.every(Boolean)) gap(at, 'snapshot-without-typed-row-role', { table, ids });
        else {
            if (entries.some(entry => entry.table !== table)) gap(at, 'snapshot-ID-role-has-different-table-namespace', { table, entries });
            const origin = entry => entry.logicalOrigin == null ? null
                : { caseId: entry.logicalOrigin.caseId, createCaseId: entry.logicalOrigin.createCaseId };
            if (!equal(origin(entries[0]), origin(entries[1])))
                gap(at, 'different-logical-creation-origin', { native: entries[0].logicalOrigin, rust: entries[1].logicalOrigin });
        }
        compareFields(left.properties, right.properties, at + '/properties', table, ids, phase);
        const metadata=originalRepresentationMetadata(native,table,'rowVersion'),otherMetadata=originalRepresentationMetadata(rust,table,'rowVersion');
        const versionBoundary=metadata&&otherMetadata&&equal(metadata,otherMetadata)?versionOriginalBoundary(left,right,metadata):null;
        if(versionBoundary){const{comparableRustOriginal,comparableRustKeys,...retained}=versionBoundary;classifications.push({path:at+'/original',kind:versionBoundary.rule,...retained,rawInventoriesRetained:true,onlyNonComparableOriginalVersionBoundary:true});}
        if (left.original == null || right.original == null) compareValue(left.original, right.original, at + '/original');
        else compareFields(left.original,versionBoundary?.comparableRustOriginal??right.original, at + '/original', table, ids, phase,[left,right]);
        compareValue(left.originalOwnKeys,versionBoundary?.comparableRustKeys??right.originalOwnKeys, at + '/originalOwnKeys');
        for (const key of NATIVE_ONLY) if (own(left, key) || own(right, key))
            classifications.push({ path: at + '/' + key, kind: '519a-explicit-native-only-helper-measure', native: left[key], rust: right[key] ?? { noCounterpart: true }, equalityClaimed: false });
    }
    const selected = ['approval', 'payout', 'todoA', 'dirtyTodo'];
    for (const name of selected) {
        const a = native.selection[name], b = rust.selection[name]; if (!a || !b) { gap('/selection/' + name, 'missing-selection'); continue; }
        pairings.push({ role: 'selection.' + name, nativeId: a.id, rustId: b.id,
            nativeProofRole: maps[0].get(a.id), rustProofRole: maps[1].get(b.id) });
    }
    for (const phase of ['before', 'after']) for (const table of BUSINESS) {
        const inventories = [native, rust].map((source, side) => {
            const map = new Map();
            for (const row of source[phase][table] ?? []) {
                const role = maps[side].get(row.id)?.role;
                if (!role) { gap('/' + phase + '/' + table + '/' + row.id, 'row-has-no-paired-typed-role', { side }); continue; }
                if (map.has(role)) gap('/' + phase + '/' + table + '/' + role, 'duplicate-row-role', { side });
                map.set(role, row);
            }
            return map;
        });
        for (const role of new Set([...inventories[0].keys(), ...inventories[1].keys()])) {
            const a = inventories[0].get(role), b = inventories[1].get(role);
            if (!a || !b) { gap('/' + phase + '/' + table + '/' + role, 'unpaired-business-row', { native: a ?? null, rust: b ?? null }); continue; }
            compareFields(a, b, '/' + phase + '/' + table + '/' + role, table, [a.id, b.id], phase);
        }
    }
    const nativeStages = native.observation.stages ?? [], rustStages = rust.observation.stages ?? [];
    compareValue(nativeStages.map(stage => stage.name), STAGES, '/native/stage-sequence');
    compareValue(rustStages.map(stage => stage.name), STAGES, '/rust/stage-sequence');
    for (const name of STAGES) {
        const a = nativeStages.filter(stage => stage.name === name), b = rustStages.filter(stage => stage.name === name);
        if (a.length !== 1 || b.length !== 1) { gap('/stages/' + name, 'missing-or-duplicate-stage'); continue; }
        for (const [side, stage] of [['native', a[0]], ['rust', b[0]]]) for (const key of ['approval', 'todoA', 'todoB', 'payout', 'returnedSnapshot'])
            if (!own(stage.held ?? {}, key)) gap('/stages/' + name + '/held/' + key, 'missing-required-held-binding', { side });
        for (const [side, stage] of [['native', a[0]], ['rust', b[0]]]) for (const key of Object.keys(stage))
            if (!['name', 'at', 'managed', 'held'].includes(key)) gap('/stages/' + name + '/' + key, 'unknown-stage-field', { side });
        classifications.push({ path: '/stages/' + name + '/at', kind: '519a-source-specific-stage-window-boundary', native: a[0].at, rust: b[0].at, equalityClaimed: false });
        const inventories = [a[0], b[0]].map((stage, side) => {
            const rows = new Map();
            for (const entry of stage.managed) {
                const role = maps[side].get(entry.id)?.role;
                if (!role) { gap('/stages/' + name + '/managed/' + entry.id, 'unpaired-managed-metadata-row', { side, table: entry.table }); continue; }
                const key = entry.table + '/' + role; if (!rows.has(key)) rows.set(key, []); rows.get(key).push(entry);
            }
            return rows;
        });
        classifications.push({ path: '/stages/' + name + '/managed-order', kind: '519a-retained-source-specific-identity-iteration-order',
            native: a[0].managed.map(row => row.table + ':' + row.id), rust: b[0].managed.map(row => row.table + ':' + row.id), wholeArrayEqualityClaimed: false });
        for (const key of new Set([...inventories[0].keys(), ...inventories[1].keys()])) {
            const aa = inventories[0].get(key) ?? [], bb = inventories[1].get(key) ?? [];
            if (aa.length !== bb.length) gap('/stages/' + name + '/managed/' + key, 'unpaired-managed-row-or-duplicate-count', { native: aa.length, rust: bb.length });
            for (let index = 0; index < Math.min(aa.length, bb.length); index++) snapshot(aa[index], bb[index], '/stages/' + name + '/managed/' + key + '/' + index, name);
        }
        for (const key of new Set([...Object.keys(a[0].held ?? {}), ...Object.keys(b[0].held ?? {})])) {
            if (!['approval', 'todoA', 'todoB', 'payout', 'returnedSnapshot'].includes(key)) gap('/stages/' + name + '/held/' + key, 'unknown-held-binding');
            snapshot(a[0].held?.[key], b[0].held?.[key], '/stages/' + name + '/held/' + key, name);
        }
    }
    for (const name of ['cachedReread', 'afterClearReread']) for (const key of new Set([...Object.keys(native.observation[name] ?? {}), ...Object.keys(rust.observation[name] ?? {})])) {
        if (!['approval', 'todoB', 'returnedSnapshot'].includes(key)) gap('/' + name + '/' + key, 'unknown-reread-binding');
        snapshot(native.observation[name]?.[key], rust.observation[name]?.[key], '/' + name + '/' + key, name);
    }
    for (const key of ['outerActualAction', 'result']) compareValue(native.observation[key], rust.observation[key], '/observation/' + key);
    compareValue(native.observation.serviceResult ?? null, rust.observation.serviceResult ?? null, '/observation/serviceResult');
    const ne = native.observation.serviceError, re = rust.observation.serviceError;
    if (ne == null || re == null) compareValue(ne ?? null, re ?? null, '/observation/serviceError');
    else {
        compareValue(ne.status, re.status, '/observation/serviceError/status');
        compareValue(ne.message, re.message, '/observation/serviceError/message');
        if (ne.name !== 'BadRequestException' || re.kind !== 'http' || ne.status !== 400)
            gap('/observation/serviceError', 'unreviewed-internal-error-representation-pair', { native: ne, rust: re });
        for (const key of Object.keys(ne)) if (!['name', 'message', 'status', 'response'].includes(key)) gap('/native/serviceError/' + key, 'unknown-error-field');
        for (const key of Object.keys(re)) if (!['kind', 'message', 'status', 'sqlstate'].includes(key)) gap('/rust/serviceError/' + key, 'unknown-error-field');
        classifications.push({ path: '/observation/serviceError', kind: 'explicit-gate-veto-policy-status-and-message-paired-only',
            nativeSdkExceptionDecoration: { name: ne.name, response: ne.response }, rustInternalFailureDecoration: { kind: re.kind, sqlstate: re.sqlstate ?? null },
            wholeErrorEqualityClaimed: false });
    }
    for (const [side, source] of [['native', native], ['rust', rust]]) {
        const clear = source.observation.stages.find(stage => stage.name === STAGES.at(-1));
        for (const [name, held] of Object.entries(clear?.held ?? {})) if (held) {
            const ok = held.managed === false && held.queued === false;
            localInvariants.push({ side, kind: 'clear-detaches-old-held-binding', name, managed: held.managed, queued: held.queued, observed: ok });
            if (!ok) gap('/' + side + '/clear/' + name, 'old-held-binding-not-detached-after-explicit-clear');
        }
        if (source.observation.outerActualAction.startsWith('rollback')) for (const table of BUSINESS) {
            const unchanged = equal(source.before[table], source.after[table]);
            localInvariants.push({ side, kind: 'actual-outer-rollback-business-rows', table, unchanged });
            if (!unchanged) gap('/' + side + '/rollback/' + table, 'actual-rollback-row-difference', { before: source.before[table], after: source.after[table] });
        }
    }
    if (native.materialized || rust.materialized) {
        if (!native.materialized || !rust.materialized) gap('/materialized', 'unpaired-transient-materialized-row');
        else {
            compareFields(native.materialized.row, rust.materialized.row, '/materialized/row', 'commission_final_settlement_snapshot',
                [native.materialized.snapshotId, rust.materialized.snapshotId], 'materialized');
            for (const field of native.schema.find(row => row.table === 'commission_final_settlement_snapshot')?.properties.filter(row => row.sqlType === 'numeric') ?? []) {
                const column = field.fieldNames[0];
                const a = typeof native.materialized.rowJson === 'string' ? materializedNumericLexeme(native.materialized.rowJson, column) : null;
                const b = typeof rust.materialized.rowJson === 'string' ? materializedNumericLexeme(rust.materialized.rowJson, column) : null;
                if (a == null || b == null) gap('/materialized/numeric/' + column, 'unavailable-or-ambiguous-original-numeric-lexeme');
                else if (a !== b) mismatch('/materialized/numeric/' + column, a, b, 'strict-original-numeric-spelling');
            }
            for (const key of ['sourceXmin', 'outerXid8', 'nativeQueryEvidence', 'outerCommitObserved'])
                classifications.push({ path: '/materialized/' + key, kind: 'same-caller-source-specific-transaction-diagnostic-never-ownership',
                    native: native.materialized[key] ?? { noCounterpart: true }, rust: rust.materialized[key] ?? { noCounterpart: true }, equalityClaimed: false });
        }
    }
    const nativeTodo = native.sql.rows.filter(row => row.phase === 'start' && row.command === 'UPDATE' && row.relations?.includes('todo_item'));
    result.sqlBatching = { actualNativeTodoUpdates: nativeTodo, actualNativeStatements: native.sql.rows,
        rustSourceInference: rust.sql.sourceText ? { file: rust.sql.sourceText.file, sha256: rust.sql.sourceText.sha256,
            compiledEpoch: rust.sql.sourceText.compiledEpoch,
            multiRowBranchPresent: /if indices\.len\(\) > 1/.test(rust.sql.sourceText.source),
            conditionalCaseUpdatePresent: /SET /.test(rust.sql.sourceText.source) && /WHEN id=/.test(rust.sql.sourceText.source),
            evidenceLevel: 'compiled-source-construction-only-not-actual-SQL' } : null };
    gap('/sql', 'actual-Rust-example-SQL-is-not-captured', { actualNativeTodoUpdateCount: nativeTodo.length,
        nativeParameterAndColumnOrderRetained: true, RustSourceInferenceIsNotRuntimeEquality: true });
    classifications.push({ path: '/ownership', kind: 'three-original-proof-roles-retained-independently-not-equal-shaped-certificates',
        native: Object.fromEntries(['direct', 'originalSdk', 'independentPg7'].map(key => [key, native.ownership[key].length])),
        rust: Object.fromEntries(['direct', 'originalSdk', 'independentPg7'].map(key => [key, rust.ownership[key].length])), diagnosticOwnershipClaimed: false });
    result.result = differences.length ? 'bounded-caller-UoW-differences-and-gaps' : gaps.length ? 'bounded-caller-UoW-gaps'
        : 'bounded-caller-UoW-paired-measures-observed';
    return result;
}
if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
    try {
        const [nativeFile, rustFile, output] = process.argv.slice(2); assert.equal(process.argv.length, 5);
        for (const file of [nativeFile, rustFile, output]) assert(/^tmp\/rust-r2l\/[a-z0-9.-]+\.json$/.test(file));
        const a = fs.readFileSync(nativeFile), b = fs.readFileSync(rustFile);
        const result = compareUowExports(JSON.parse(a), JSON.parse(b));
        result.inputReceipts = [{ file: nativeFile, bytes: a.length, sha256: digest(a) }, { file: rustFile, bytes: b.length, sha256: digest(b) }];
        result.comparer = { file: SOURCE, sha256: digest(fs.readFileSync(SOURCE)) };
        fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
        console.log(JSON.stringify({ file: output, result: result.result, checkedScalars: result.checkedScalars,
            differences: result.differences.length, gaps: result.gaps.length, G3Certified: false }));
    } catch (error) { process.exitCode = 1; console.error(JSON.stringify(publicUowEvidenceFailure(error, 'saved-evidence-compare-cli'))); }
}
