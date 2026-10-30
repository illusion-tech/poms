// Root/C saved-evidence reader only. No DB, environment loader or product import.
// Private originals are read stably and never modified; only sanitized new files
// are published. A retained proof is described, never reissued by this tool.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { authority } from './catalog-complete.mjs';
import { commissionIdentities } from './fixture-commission-policy.mjs';
import { sharedUowMeasurementContract } from './l-shared-uow-measurements.mjs';
const ROOT = '/home/wangzishi/projects/poms-rust-r2l', PRIVATE = '/home/wangzishi/.local/share/poms-r2l/private';
const SOURCE = 'tools/rust-r2l/l-shared-uow-export.mjs';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const UOW_WRITE_TABLES = Object.freeze(['approval_record', 'todo_item', 'commission_payout', 'commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot']);
export const UOW_EXPECTED_TABLES = Object.freeze(['platform_user', 'local_credential', 'role', 'org_unit',
    'user_role_assignment', 'user_org_membership', 'role_permission_assignment', 'auth_session', 'audit_log', 'security_event',
    'approval_record', 'todo_item', 'contract', 'project', 'customer', ...Object.keys(commissionIdentities)].sort());
assert.equal(UOW_EXPECTED_TABLES.length, 40);
export const uowPhysicalColumns = table => authority.tables.find(row => row.name === table)?.columns.map(column => column.name).sort();
export const compiledUowPins = Object.freeze({
    candidate07: Object.freeze({ mainMeta: 'ef7ad3a0726ac5110ff71c0747eab5dc2414db8432f9b2a70f9bd4afa1821b41',
        mainSha: '5b9ec4424e17e4e9bfd57055e6141e80594526dc437fde497ab95bfc2f464b16', mainBytes: 34026104,
        exampleMeta: 'a0affdc56f62a4a3e988b9f6dd4013a2620f40b74f17de711803e970ab2f1161',
        probeSha: '1f4d110048f111d39b50bf230ff521a52654be4fb62cd2d9385e3371d16e26da', probeBytes: 11701856,
        storeSha: '54f567b8b0ddf1de253929642b892d6697ce1373bae03e22eb725994970b42a9', storeBytes: 35786 }),
    candidate08: Object.freeze({ mainMeta: 'f9c79ee04f593645715e48f680236dc4c807d64bca63dacdf5e8f4bfecbe7dbb',
        mainSha: 'ee558d02f8a5ee7f49d3e3aced266338282e958cf84bf1cb96ef2e3b61b8b475', mainBytes: 34026504,
        exampleMeta: '02ce51e544c48ef594f7632bc75685047af821d6c530bf56ded1caffcd742407',
        probeSha: '6ca1076b38f3e15d99d371da0b6da520a5a24860d271a6aa3190305bcb527dd5', probeBytes: 11702064,
        storeSha: 'eed38cd12eed19fd599f24a16481e5825224d2b708f67cf85f6a20426addb6d7', storeBytes: 35788 }),
});
const secretKey = key => /^(?:password|passwordhash|token|tokenhash|csrftoken|csrftokenhash|sessiontoken|accesstoken|refreshtoken|cookie|cookies|setcookie|authorization|jwtsecret|dbpassword|secret)$/.test(key.replace(/[_-]/g, '').toLowerCase());
export const stable = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(stable)
    : Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value))).digest('hex');
const same = (left, right) => digest(left) === digest(right);
export function expectedUowCloseouts(backend) {
    assert(['nest', 'rust'].includes(backend));
    return ['native-witness-final', ...(backend === 'rust' ? ['rust-owner-close'] : []), 'pg7-observer-restore',
        'native-owner-close', 'pg7-owner-connection-close', 'whole-owned-final-facts',
        'exact-owned-cleanup-double-zero', 'fixture-connection-close'];
}
export function completeRecordedSdkTrace(trace) {
    return !!(trace && trace.complete === true && trace.overflow !== true
        && Array.isArray(trace.diagnostics) && trace.diagnostics.length === 0
        && Array.isArray(trace.openTransactions) && trace.openTransactions.length === 0
        && trace.pendingStartCount === 0 && Array.isArray(trace.events) && Array.isArray(trace.committed));
}
export function completeRecordedCleanup(driver, journal) {
    const rows = driver.cleanup;
    const zero = value => value?.objects === 0 && value.logicalReferences === 0 && value.tablesScanned === 107;
    return !!(Array.isArray(rows) && rows.length === 2 && rows[0].deleted === journal.objects.length && rows[1].deleted === 0
        && rows.every(row => row.state === 'cleaned' && zero(row.firstZero) && zero(row.secondZero)));
}
export function inspectUowLocalFacts(before, after) {
    const gaps = [], unchanged35 = [];
    for (const [phase, facts] of [['before', before], ['after', after]]) {
        if (!facts || !same(Object.keys(facts).sort(), UOW_EXPECTED_TABLES))
            gaps.push({ path: '/' + phase, kind: 'incomplete-or-unknown-40-table-set', actualTables: Object.keys(facts ?? {}).sort(), expectedTables: UOW_EXPECTED_TABLES });
        for (const table of UOW_EXPECTED_TABLES) {
            const rows = facts?.[table], columns = uowPhysicalColumns(table);
            if (!Array.isArray(rows)) { gaps.push({ path: '/' + phase + '/' + table, kind: 'missing-or-invalid-table-row-array' }); continue; }
            const ids = new Set();
            for (const row of rows) {
                if (!row || typeof row !== 'object' || !uuid.test(row.id ?? '') || ids.has(row.id))
                    gaps.push({ path: '/' + phase + '/' + table, kind: 'missing-invalid-or-duplicate-row-PK' });
                ids.add(row?.id);
                if (!same(Object.keys(row ?? {}).sort(), columns))
                    gaps.push({ path: '/' + phase + '/' + table + '/' + row?.id, kind: 'incomplete-or-unknown-physical-column-set',
                        actualColumns: Object.keys(row ?? {}).sort(), expectedColumns: columns });
            }
        }
    }
    for (const table of UOW_EXPECTED_TABLES.filter(table => !UOW_WRITE_TABLES.includes(table))) {
        const left = before?.[table], right = after?.[table];
        if (!Array.isArray(left) || !Array.isArray(right)) continue;
        const validRows = rows => rows.filter(row => row && typeof row === 'object' && typeof row.id === 'string');
        const a = new Map(validRows(left).map(row => [row.id, row])), b = new Map(validRows(right).map(row => [row.id, row]));
        const changes = [];
        for (const id of new Set([...a.keys(), ...b.keys()])) if (!same(a.get(id) ?? null, b.get(id) ?? null))
            changes.push({ id, beforeSha256: digest(a.get(id) ?? null), afterSha256: digest(b.get(id) ?? null),
                changedColumns: [...new Set([...Object.keys(a.get(id) ?? {}), ...Object.keys(b.get(id) ?? {})])]
                    .filter(key => Object.hasOwn(a.get(id) ?? {}, key) !== Object.hasOwn(b.get(id) ?? {}, key)
                        || !same(a.get(id)?.[key] ?? null, b.get(id)?.[key] ?? null)) });
        const record = { table, rowsBefore: left.length, rowsAfter: right.length, unchanged: changes.length === 0, changes };
        unchanged35.push(record);
        if (changes.length) gaps.push({ path: '/local-before-after/' + table, kind: 'unexpected-write-outside-five-table-caller-set', ...record });
    }
    return { exactExpectedTables: UOW_EXPECTED_TABLES, physicalColumns: Object.fromEntries(UOW_EXPECTED_TABLES.map(table => [table, uowPhysicalColumns(table)])),
        pairedCrossBackendWriteTables: UOW_WRITE_TABLES, perSourceUnchangedTables: unchanged35, gaps };
}
export function publicUowEvidenceFailure(error, sourcePoint) {
    let name; try { name = error?.name; } catch { name = undefined; }
    const names = ['Error', 'AssertionError', 'SyntaxError', 'TypeError', 'RangeError', 'SavedUowEvidenceError'];
    return { kind: 'saved-UoW-evidence-failure', sourcePoint: ['saved-evidence-reader', 'saved-evidence-export-cli', 'saved-evidence-compare-cli'].includes(sourcePoint) ? sourcePoint : 'saved-evidence-reader',
        errorName: names.includes(name) ? name : 'EvidenceError', rawErrorPublished: false, privateDiagnosticReference: null,
        privateDiagnosticWritten: false, originalEvidenceModified: false };
}
export function compiledUowChain({ binding, main, processRecord = null }) {
    const epoch = /^tmp\/rust-r2l\/rust-(candidate0[78])-binary-source\.json$/.exec(binding?.file ?? '')?.[1];
    assert(epoch && compiledUowPins[epoch]); const pin = compiledUowPins[epoch];
    assert.equal(binding.rawBytesSha256, pin.mainMeta); assert.equal(binding.expectedBinarySha256, pin.mainSha);
    assert.equal(binding.sourceFiles, 169); assert.equal(main.result, 'pass-build-source-binding-not-runtime');
    assert.deepEqual(main.binary, { file: '/home/wangzishi/.local/share/poms-r2l/target/release/poms-api-rust',
        bytes: pin.mainBytes, rawBytesSha256: pin.mainSha });
    assert(Array.isArray(main.files) && main.files.length === 169 && new Set(main.files.map(row => row.file)).size === 169);
    const row = file => { const values = main.files.filter(item => item.file === file); assert.equal(values.length, 1); return values[0]; };
    const store = row('apps/poms-api-rust/src/approval_common/store.rs');
    assert.deepEqual(store, { file: store.file, bytes: pin.storeBytes, rawBytesSha256: pin.storeSha });
    const probe = row('tools/rust-r2l/l-shared-uow-probe.rs');
    assert.deepEqual(probe, { file: probe.file, bytes: 23156, rawBytesSha256: '128037a435951fb12bf8a3295875650f1917f10afa0f361ffb927480ca67af4c' });
    let example = null;
    if (processRecord) {
        const value = processRecord.binaryBinding;
        assert.equal(value.file, 'tmp/rust-r2l/shared-uow-' + epoch + '-binary-source.json');
        assert.equal(value.rawBytesSha256, pin.exampleMeta); assert.equal(value.sourceFiles, 169);
        assert.deepEqual(value.successfulFiveStepBuildBinding, { file: binding.file, rawBytesSha256: pin.mainMeta });
        assert.deepEqual(value.probeSource, probe);
        assert.deepEqual(value.binary, { file: '/home/wangzishi/.local/share/poms-r2l/target/release/examples/l_shared_uow_probe',
            bytes: pin.probeBytes, rawBytesSha256: pin.probeSha });
        example = value;
    }
    return { epoch, scope: epoch === 'candidate08' ? 'final08-two-space-multirow-fix-source-chain' : 'historical07-never-relabel-as-final08',
        mainBuildBinding: binding, mainApplication: main.binary, all169CompiledSourceRows: main.files,
        store, probe, example, actualRustSqlWireClaimed: false };
}
export function sanitizeUowEvidence(value, key = '', secrets = []) {
    if (value == null) return value;
    if (secretKey(key) || /^(?:bytesBase64|bodyBytesBase64|requestBodyBase64)$/.test(key)) {
        const bytes = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
        return { withheld: true, kind: 'secret-or-private-raw-original', sourceType: typeof value, bytes: bytes.length, sha256: digest(bytes) };
    }
    if (typeof value === 'string' && secrets.some(secret => secret && value.includes(secret)))
        return { withheld: true, kind: 'secret-echo', bytes: Buffer.byteLength(value), sha256: digest(value) };
    if (Array.isArray(value)) return value.map(entry => sanitizeUowEvidence(entry, key, secrets));
    if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, sanitizeUowEvidence(entry, name, secrets)]));
    return value;
}
function secretValues(value, key = '', found = new Set()) {
    if (typeof value === 'string' && secretKey(key) && value.length) found.add(value);
    if (value && typeof value === 'object') for (const [name, entry] of Object.entries(value)) secretValues(entry, name, found);
    return found;
}
export function retainedProofStatus(object, journal) {
    const proof = object.creationProof, intent = journal.intents?.find(entry => entry.caseId === object.caseId && entry.table === object.table
        && journal.committedCreates?.some(item => item.intentId === entry.id && item.id === object.id && same(item.proof, proof)));
    if (!proof || object.postcondition?.independentlyVisible !== true) return { eligible: false, reason: 'missing-retained-independent-postcondition' };
    if (proof.kind === 'direct-committed-insert')
        return { eligible: !!(proof.beforeAbsent && (proof.commitAcknowledged || proof.recoveredByXminAndXactStatus)
            && /^[0-9]+$/.test(String(proof.transaction)) && String(BigInt(proof.transaction) % 4294967296n) === String(proof.xmin)),
        role: 'original-direct-before-absence-RETURNING-outer-COMMIT', newCertificateIssued: false };
    if (!intent || intent.beforeObserved !== true || intent.beforeIds.includes(object.id))
        return { eligible: false, reason: 'missing-original-before-intent-or-already-present-ID' };
    const item = journal.committedCreates.find(entry => entry.id === object.id && entry.table === object.table && same(entry.proof, proof));
    const authority = journal.authorities?.find(entry => entry.id === item?.authorityId);
    if (!authority || authority.kind !== proof.kind || proof.createContext?.runId !== journal.runId || proof.createContext.caseId !== object.caseId)
        return { eligible: false, reason: 'retained-authority-context-or-ledger-link-mismatch' };
    if (proof.kind === 'mikro-orm-afterCreate-outer-commit') {
        const events = authority.trace?.events ?? [];
        return { eligible: !!(proof.sdkVersion === '7.0.11' && completeRecordedSdkTrace(authority.trace)
            && authority.trace.committed.some(entry => entry.id === object.id && entry.table === object.table && same(entry.proof, proof))
            && events.some(entry => entry.event === 'afterTransactionStart' && entry.transaction === proof.outerTransaction && entry.parent === null && entry.savepointName === null)
            && events.some(entry => entry.event === 'afterTransactionCommit' && entry.seq === proof.outerCommitEventSeq && entry.transaction === proof.outerTransaction)),
        role: 'original-Native-SDK-afterCreate-acknowledged-outer-COMMIT', newCertificateIssued: false };
    }
    if (proof.kind === 'pg-after-insert-observed-outer-commit')
        return { eligible: !!(proof.outerCommitObserved && proof.visibleFromIndependentOwnerConnection
            && ['outerStatus', 'topXidStatus', 'eventXminStatus'].every(key => proof[key] === 'committed')
            && proof.sourceAuthority === authority.sourceAuthority && proof.functionOid === authority.functionOid),
        role: 'original-independent-PG7-insert-outer-COMMIT', newCertificateIssued: false };
    return { eligible: false, reason: 'unknown-proof-kind' };
}
function embeddedIds(value, replace) {
    if (typeof value === 'string') return value.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, replace);
    if (Array.isArray(value)) return value.map(entry => embeddedIds(entry, replace));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, embeddedIds(entry, replace)]));
    return value;
}
export function makeUowRoleCatalog({ owner, capture, journal, gaps }) {
    const catalog = [], aliases = new Map(), objects = journal.objects ?? [];
    const records = new Map(objects.map(object => [object.table + ':' + object.id, { object, status: retainedProofStatus(object, journal) }]));
    const add = (table, id, role, origin = 'retained-creation-evidence') => {
        if (!id) return;
        if (aliases.has(id)) {
            if (!catalog.some(entry => entry.id === id && entry.table === table))
                gaps.push({ path: '/roles/' + table + '/' + id, kind: 'cross-table-UUID-namespace-collision-no-implicit-alias' });
            return;
        }
        const entry = records.get(table + ':' + id);
        if (origin === 'retained-creation-evidence' && !entry?.status.eligible) {
            gaps.push({ path: '/roles/' + table + '/' + id, kind: 'unadmitted-retained-identity', status: entry?.status ?? null }); return;
        }
        if (catalog.some(item => item.role === role && item.id !== id)) {
            gaps.push({ path: '/roles/' + role, kind: 'ambiguous-role', id }); return;
        }
        const row = { table, id, role, origin, ownershipClaimedHere: false, retainedOwnership: origin === 'retained-creation-evidence',
            logicalOrigin: entry ? { caseId: entry.object.caseId, proofKind: entry.object.creationProof.kind,
                createCaseId: entry.object.creationProof.createContext?.caseId ?? null } : null,
            retainedProofStatus: entry?.status ?? null };
        aliases.set(id, role); catalog.push(row);
    };
    for (const account of journal.base?.accounts ?? []) {
        for (const [key, table, suffix] of [['userId', 'platform_user', 'user'], ['roleId', 'role', 'role'], ['orgId', 'org_unit', 'org']])
            add(table, account[key], 'actor.' + account.account + '.' + suffix);
    }
    for (const [name, table] of [['approval', 'approval_record'], ['payout', 'commission_payout'], ['todoA', 'todo_item'], ['dirtyTodo', 'todo_item']])
        add(table, owner.selection?.[name]?.id, 'uow.' + name);
    for (const [name, table] of [['final', 'commission_final_settlement_snapshot'], ['rule', 'commission_rule_explanation_snapshot']])
        add(table, owner.currentPairBefore?.[name]?.id, 'uow.previous.' + name);
    const readonly = new Set();
    for (const definition of journal.borrowed?.definitions ?? []) if (definition.readOnly) readonly.add(definition.id);
    for (const principal of ['00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000014'])
        if (journal.borrowed?.principalSnapshot) readonly.add(principal);
    const groups = new Map();
    for (const { object } of records.values()) {
        const key = object.caseId + '/' + object.table; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(object);
    }
    for (const [group, rows] of groups) if (rows.length === 1) add(rows[0].table, rows[0].id, 'case/' + group);
    for (let round = 0; round < 12; round++) {
        const before = catalog.length;
        for (const [group, rows] of groups) for (const row of rows) if (!aliases.has(row.id)) {
            let unresolved = false;
            const identity = Object.fromEntries(Object.entries(row.identity ?? {}).filter(([key]) => key !== 'id' && !secretKey(key)));
            const semantic = embeddedIds(identity, id => {
                if (id === journal.runId) return '@run';
                if (aliases.has(id)) return '@' + aliases.get(id);
                if (readonly.has(id)) return id;
                unresolved = true; return id;
            });
            if (!unresolved && Object.keys(identity).length) add(row.table, row.id, 'case/' + group + '/identity/' + digest(semantic).slice(0, 24));
        }
        if (catalog.length === before) break;
    }
    const materialized = capture.observation?.innerDatabaseSnapshot;
    if (materialized) {
        let row;
        try { row = JSON.parse(materialized.rowJson); } catch { gaps.push({ path: '/materialized', kind: 'invalid-row-json' }); }
        if (row?.id === materialized.snapshotId && materialized.outerCommitObserved === false) {
            const owned = records.get('commission_final_settlement_snapshot:' + row.id)?.status.eligible;
            add('commission_final_settlement_snapshot', row.id, 'uow.returned.final', owned ? 'retained-creation-evidence' : 'same-caller-materialization-diagnostic-only');
            for (const stage of capture.observation.stages ?? []) for (const snapshot of stage.managed ?? []) {
                if (snapshot.table === 'commission_rule_explanation_snapshot'
                    && snapshot.properties?.finalSettlementSnapshotId?.value === row.id
                    && !records.has(snapshot.table + ':' + snapshot.id))
                    add(snapshot.table, snapshot.id, 'uow.returned.rule', 'same-caller-managed-diagnostic-linked-to-materialized-final-only');
            }
        } else gaps.push({ path: '/materialized', kind: 'diagnostic-identity-or-role-mismatch' });
    }
    for (const { object, status } of records.values()) if (status.eligible && !catalog.some(entry => entry.id === object.id && entry.table === object.table))
        gaps.push({ path: '/roles/' + object.table + '/' + object.id, kind: 'unpaired-certified-row-role', caseId: object.caseId });
    return { entries: catalog, readonlyIds: [...readonly], runContextId: journal.runId, runContextIsNotRowOwnership: true,
        readonlyAuthorities: { principalSnapshotSha256: journal.borrowed?.principalSnapshot?.digest ?? null,
            definitions: (journal.borrowed?.definitions ?? []).map(row => ({ id: row.id, readOnly: row.readOnly,
                fullRowSha256: row.fullRowSha256, approvalScenarioKey: row.approval_scenario_key, summaryPackageKey: row.summary_package_key })) },
        diagnosticAliasesAreNeverOwnership: true };
}
export function buildUowPublicEvidence({ driver, owner, capture, journal, processRecord = null, rawBinding = null, receipts = [], sourceText = null, compiledChain = null }) {
    const gaps = [];
    assert(driver.runId === owner.context?.runId && driver.runId === capture.context?.runId && driver.runId === journal.runId);
    assert.equal(journal.namespace, 'poms-r2l'); assert.equal(journal.backend, driver.backend);
    assert.equal(journal.marker, driver.marker); assert.equal(journal.sourceHead, driver.sourceHead);
    assert.equal(owner.options.backend, driver.backend); assert.equal(capture.context.op, 'l.internal-uow');
    assert.equal(capture.executionBackend, driver.backend === 'nest' ? 'native' : 'rust');
    assert.deepEqual(capture.measurementContract, sharedUowMeasurementContract);
    if (driver.result !== 'edges-observed' || owner.result !== 'edges-observed' || capture.state !== 'observed-and-ownership-certified')
        gaps.push({ path: '/', kind: 'saved-run-not-complete', states: [driver.result, owner.result, capture.state] });
    const exactCloseouts = Array.isArray(driver.resourceCloseout)
        && same(driver.resourceCloseout.map(row => row.name), expectedUowCloseouts(driver.backend))
        && driver.resourceCloseout.every(row => row.result === 'pass');
    if (!driver.doubleZero || !exactCloseouts || journal.state !== 'cleaned' || !completeRecordedCleanup(driver, journal))
        gaps.push({ path: '/driver', kind: 'incomplete-driver-cleanup-or-closeout' });
    if (!completeRecordedSdkTrace(driver.nativeFinal?.witness) || driver.nativeFinal?.pgCaptureComplete !== true)
        gaps.push({ path: '/driver/nativeFinal', kind: 'incomplete-global-SDK-or-Native-PG-capture' });
    else if ((journal.objects ?? []).filter(row => row.creationProof?.kind === 'mikro-orm-afterCreate-outer-commit')
        .some(row => !driver.nativeFinal.witness.committed.some(item => item.table === row.table && item.id === row.id && same(item.proof ?? null, row.creationProof))))
        gaps.push({ path: '/driver/nativeFinal/witness/committed', kind: 'global-SDK-trace-missing-retained-admitted-proof' });
    for (const recorded of journal.authorities ?? []) if (recorded.kind === 'mikro-orm-afterCreate-outer-commit' && !completeRecordedSdkTrace(recorded.trace))
        gaps.push({ path: '/ownership/authority/' + recorded.id, kind: 'incomplete-original-SDK-authority-trace' });
    const coverage = inspectUowLocalFacts(capture.before, capture.after); gaps.push(...coverage.gaps);
    const roles = makeUowRoleCatalog({ owner, capture, journal, gaps });
    if (owner.selection?.dirtyTodoLogicalRole === 'contract.submit.reject') {
        const selected = owner.selection.dirtyTodoCertificate;
        const original = journal.objects?.find(row => row.table === 'todo_item' && row.id === owner.selection.dirtyTodo?.id);
        if (!selected || !original || selected.id !== original.id || !same(selected.creationProof, original.creationProof)
            || original.caseId !== 'contract.submit.reject' || original.creationProof?.kind !== 'mikro-orm-afterCreate-outer-commit'
            || original.creationProof.createContext?.caseId !== 'contract.submit.reject')
            gaps.push({ path: '/selection/dirtyTodoCertificate', kind: 'stable-selection-certificate-not-bound-to-original-ledger' });
    }
    const ownership = { direct: [], originalSdk: [], independentPg7: [], unknown: [],
        diagnosticsNeverIssueOwnership: true, authorityRecords: journal.authorities ?? [] };
    for (const object of journal.objects ?? []) {
        const status = retainedProofStatus(object, journal), row = { ...object, retainedProofStatus: status };
        const group = object.creationProof?.kind === 'direct-committed-insert' ? 'direct'
            : object.creationProof?.kind === 'mikro-orm-afterCreate-outer-commit' ? 'originalSdk'
            : object.creationProof?.kind === 'pg-after-insert-observed-outer-commit' ? 'independentPg7' : 'unknown';
        ownership[group].push(row);
    }
    const metadata = driver.nativeMetadata ?? [];
    const schema = metadata.map(meta => ({ table: meta.tableName, schema: meta.schema, properties: meta.properties.map(property => {
        const column = authority.tables.find(table => table.name === meta.tableName)?.columns.find(item => item.name === property.fieldNames[0]);
        return { ...property, sqlType: column?.udt ?? null };
    }) }));
    const scopedSql = (driver.sql ?? []).slice(capture.sqlStart, capture.sqlEnd);
    const diagnostic = capture.observation.innerDatabaseSnapshot;
    if (diagnostic && driver.backend === 'nest') {
        const queries = scopedSql.filter(row => diagnostic.nativeQueryEvidence?.includes(row.queryId));
        if (!queries.some(row => row.phase === 'start') || !queries.some(row => row.phase === 'end')
            || new Set(queries.map(row => row.backendPid)).size !== 1 || !queries.every(row => Number.isInteger(row.backendPid) && row.backendPid > 0
                && row.context?.caseId === capture.context.caseId && row.validationAdapterStatement?.kind === 'same-caller-outer-materialization-read'))
            gaps.push({ path: '/materialized/nativeQueryEvidence', kind: 'materialization-not-bound-to-actual-same-PG-connection-query-witness' });
    }
    if (diagnostic && driver.backend === 'rust' && (!rawBinding?.connection
        || !same(rawBinding.connection.connection, capture.observation.connectionIdentity)))
        gaps.push({ path: '/materialized/connectionIdentity', kind: 'materialization-not-bound-to-actual-stdout-connection-diagnostic' });
    let materializedRow = null;
    if (diagnostic) try { materializedRow = JSON.parse(diagnostic.rowJson); } catch { /* The role catalog already records a gap. */ }
    const knownSecrets = [...secretValues(journal), 'R2L_' + driver.runId + '_synthetic_only'];
    const safeMaterialized = materializedRow && same(materializedRow, sanitizeUowEvidence(materializedRow, '', knownSecrets));
    const fullDriver = Object.fromEntries(Object.entries(driver).map(([key, value]) => ['requests', 'sql'].includes(key)
        ? [key, { retainedInOriginalPublicReport: true, entries: value.length, sha256: digest(value),
            projectedCurrentUowSql: key === 'sql', producerHistoryOutsideThisBoundedCallerComparison: key === 'requests' }] : [key, value]));
    const raw = { formatVersion: 2, kind: 'sanitized-complete-saved-bounded-caller-UoW-evidence', backend: driver.backend,
        variant: owner.options.variant, tag: driver.tag, runId: driver.runId, result: gaps.length ? 'exported-with-gaps' : 'exported-complete-saved-evidence',
        measurementContract: sharedUowMeasurementContract, inputReceipts: receipts, schema, roles, gaps, compiledChain,
        selection: owner.selection, currentPairBefore: owner.currentPairBefore, ownerOptions: owner.options,
        ownerSource: owner.source,
        fixturePreparations: { gatePrecondition: owner.gatePrecondition ?? null, originalJournalMutations: journal.mutations ?? [] },
        initialFacts: owner.initialFacts, before: capture.before, after: capture.after,
        coverage,
        observation: capture.observation, completedStages: capture.completedStages ?? [],
        materialized: diagnostic ? { ...diagnostic, row: materializedRow,
            rowJson: safeMaterialized ? diagnostic.rowJson : { retainedPrivately: true, bytes: Buffer.byteLength(diagnostic.rowJson), sha256: digest(diagnostic.rowJson) },
            rowJsonNumericSpellingRetainedWhenSafe: !!safeMaterialized } : null,
        ownership, captureEnvelope: Object.fromEntries(Object.entries(capture).filter(([key]) => !['before', 'after', 'observation', 'completedStages'].includes(key))),
        rawBinding, process: processRecord, driver: fullDriver,
        sql: { source: driver.backend === 'nest' ? 'actual-original-Native-query-witness' : 'original-Native-only-witness-does-not-capture-out-of-process-example',
            rows: scopedSql, rustExampleSqlActuallyCaptured: false, sourceText,
            statementValuesAndRowsWereNeverCapturedByOriginalSqlWitness: true },
        clockWindows: { producer: { from: driver.startedAt, to: capture.observation.stages?.[0]?.at },
            child: { from: capture.observation.stages?.find(stage => stage.name === 'parent-second-Todo-dirty')?.at,
                to: capture.observation.stages?.find(stage => stage.name === 'after-original-service-child')?.at },
            outer: { from: capture.observation.stages?.find(stage => stage.name === 'after-original-service-child')?.at,
                to: capture.observation.stages?.find(stage => stage.name === 'after-outer-action-held-bindings')?.at } },
        rawOriginalsModified: false, newOwnershipCertificatesIssued: false, crossBackendCompared: false, G3Certified: false, G4Certified: false };
    return sanitizeUowEvidence(raw, '', knownSecrets);
}
function readStable(file, privateFile = false) {
    const absolute = path.resolve(file);
    assert(absolute.startsWith((privateFile ? PRIVATE : ROOT) + '/'));
    let ancestor = privateFile ? PRIVATE : ROOT;
    for (const component of path.relative(ancestor, path.dirname(absolute)).split(path.sep).filter(Boolean)) {
        const stat = fs.lstatSync(ancestor); assert(stat.isDirectory() && !stat.isSymbolicLink());
        ancestor = path.join(ancestor, component);
    }
    assert(fs.lstatSync(ancestor).isDirectory() && !fs.lstatSync(ancestor).isSymbolicLink());
    const before = fs.lstatSync(absolute, { bigint: true });
    assert(before.isFile() && !before.isSymbolicLink() && before.nlink === 1n && before.size <= 128n * 1024n * 1024n);
    if (privateFile) assert((Number(before.mode) & 0o077) === 0);
    const fd = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    let bytes;
    try {
        const opened = fs.fstatSync(fd, { bigint: true }); assert.equal(opened.ino, before.ino); assert.equal(opened.dev, before.dev);
        bytes = fs.readFileSync(fd);
        const after = fs.fstatSync(fd, { bigint: true });
        for (const key of ['ino', 'dev', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(after[key], before[key]);
    } finally { fs.closeSync(fd); }
    const current = fs.lstatSync(absolute, { bigint: true });
    for (const key of ['ino', 'dev', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(current[key], before[key]);
    return { bytes, receipt: { file: absolute, bytes: bytes.length, sha256: digest(bytes), privateOriginal: privateFile } };
}
function readSavedUowEvidence({ backend, tag, exportTag = 'e02' }) {
    assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), ROOT);
    assert(['nest', 'rust'].includes(backend) && /^[a-z0-9-]{1,24}$/.test(tag));
    assert(/^[a-z0-9-]{1,16}$/.test(exportTag));
    const input = readStable(ROOT + '/tmp/rust-r2l/commission-http-' + backend + '-' + tag + '.json');
    const driver = JSON.parse(input.bytes); assert.equal(driver.backend, backend); assert.equal(driver.tag, tag); assert(uuid.test(driver.runId));
    const directory = PRIVATE + '/shared-uow/' + backend + '-' + driver.runId + '-' + tag;
    const ownerFile = directory + '/owner.json', captureFile = directory + '/capture.json';
    const phase = driver.phaseHooks.filter(row => row.name === 'beforeReplacementFinal'); assert.equal(phase.length, 1);
    const receipts = [input.receipt], readJson = (file, receipt) => {
        const read = readStable(file, true); receipts.push(read.receipt);
        if (receipt) { assert.equal(receipt.file, file); assert.equal(receipt.bytes, read.bytes.length); assert.equal(receipt.sha256 ?? receipt.rawBytesSha256, read.receipt.sha256); }
        return JSON.parse(read.bytes);
    };
    const owner = readJson(ownerFile, phase[0].evidence?.privateOwner), capture = readJson(captureFile, phase[0].evidence?.privateCapture);
    const journal = readJson(PRIVATE + '/l-runs/' + backend + '-' + driver.runId + '.json');
    assert.equal(digest(journal), driver.cleanup.at(-1).journalDigest, 'Retain the exact original cleaned journal; do not rebuild certificates');
    const processRecord = backend === 'rust' ? readJson(directory + '/process.json', phase[0].evidence?.privateProcess) : null;
    const raw = Buffer.from(capture.rawOutput.bytesBase64, 'base64'); assert.equal(digest(raw), capture.rawOutput.sha256); assert.equal(raw.length, capture.rawOutput.bytes);
    const rawBinding = { byteSource: capture.rawOutput.byteSource, bytes: raw.length, sha256: digest(raw),
        observationEncodingSha256: digest(capture.observation), originalBytesPublished: false, diagnosticOnly: backend === 'rust' };
    if (backend === 'nest') {
        const read = readStable(directory + '/native-sdk.json', true); receipts.push(read.receipt); assert(read.bytes.equals(raw));
        assert.deepEqual(JSON.parse(raw), capture.observation);
    } else {
        assert.equal(processRecord.state, 'closed-successfully-before-PG-drain'); assert(processRecord.closeObserved && processRecord.exit.code === 0 && processRecord.exit.signal === null);
        const read = readStable(directory + '/probe.stdout.jsonl', true); receipts.push(read.receipt); assert(read.bytes.equals(raw));
        assert.equal(processRecord.stdout.rawBytesSha256, digest(raw));
        const records = raw.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
        assert.deepEqual(records.at(-1), capture.observation);
        const connection = records.filter(row => row.kind === 'private-uow-connection'); assert.equal(connection.length, 1);
        assert.deepEqual(connection[0].connection, capture.observation.connectionIdentity);
        const stages = records.filter(row => row.kind === 'private-uow-stage').map(row => row.stage); assert.deepEqual(stages, capture.observation.stages);
        rawBinding.connection = connection[0]; rawBinding.stageRecords = stages.length; rawBinding.processIdentity = processRecord.processIdentity;
    }
    assert.equal(driver.runtimeInput.result, 'pass');
    const manifestRead = readStable(path.resolve(driver.runtimeInput.manifest)); receipts.push(manifestRead.receipt);
    assert.equal(manifestRead.receipt.sha256, driver.runtimeInput.manifestRawBytesSha256);
    assert.deepEqual(JSON.parse(manifestRead.bytes).files, driver.runtimeInput.files);
    const archived = file => {
        const rows = driver.runtimeInput.files.filter(item => item.source === file); assert.equal(rows.length, 1);
        const read = readStable(path.resolve(rows[0].snapshot)); receipts.push(read.receipt);
        assert.equal(read.receipt.sha256, rows[0].rawBytesSha256); assert.equal(read.bytes.length, rows[0].bytes);
        return { ...read, snapshot: rows[0].snapshot };
    };
    const mainRead = archived(driver.buildBinding.file); assert.equal(mainRead.receipt.sha256, driver.buildBinding.rawBytesSha256);
    const compiledChain = compiledUowChain({ binding: driver.buildBinding, main: JSON.parse(mainRead.bytes), processRecord });
    const storeRead = archived(compiledChain.store.file), probeRead = archived(compiledChain.probe.file);
    assert.equal(storeRead.receipt.sha256, compiledChain.store.rawBytesSha256); assert.equal(probeRead.receipt.sha256, compiledChain.probe.rawBytesSha256);
    if (processRecord) {
        const binaryRead = readStable(directory + '/probe-input.elf', true); receipts.push(binaryRead.receipt);
        assert.equal(binaryRead.receipt.sha256, compiledChain.example.binary.rawBytesSha256);
        assert.equal(binaryRead.bytes.length, compiledChain.example.binary.bytes);
    }
    const sourceText = backend === 'rust' ? { file: compiledChain.store.file, snapshot: storeRead.snapshot,
        sha256: storeRead.receipt.sha256, source: storeRead.bytes.toString('utf8'),
        compiledEpoch: compiledChain.epoch, evidenceLevel: 'source-order-and-batch-construction-only-not-actual-Rust-SQL' } : null;
    const result = buildUowPublicEvidence({ driver, owner, capture, journal, processRecord, rawBinding, receipts, sourceText, compiledChain });
    result.exporter = { file: SOURCE, sha256: digest(fs.readFileSync(SOURCE)), exportTag, readOnlySavedEvidence: true };
    const output = 'tmp/rust-r2l/uow-export-' + backend + '-' + tag + '-' + exportTag + '.json';
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o644 });
    return { file: output, bytes: fs.statSync(output).size, sha256: digest(fs.readFileSync(output)), result: result.result, gaps: result.gaps.length,
        rawOriginalsModified: false, DBExecuted: false, G3Certified: false };
}
export function exportSavedUowEvidence(options) {
    try { return readSavedUowEvidence(options); }
    catch {
        // Do not attach cause/actual/expected/raw JSON. Even an uncaught caller
        // of this public API can receive only this constant safe error.
        const safe = new Error('Saved UoW evidence read or validation failed; raw diagnostics were not published.');
        safe.name = 'SavedUowEvidenceError'; throw safe;
    }
}
if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
    try {
        const [backend, tag, exportTag] = process.argv.slice(2); assert([4, 5].includes(process.argv.length));
        console.log(JSON.stringify(exportSavedUowEvidence({ backend, tag, exportTag })));
    } catch (error) { process.exitCode = 1; console.error(JSON.stringify(publicUowEvidenceFailure(error, 'saved-evidence-export-cli'))); }
}
