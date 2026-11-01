import {validateUiPackageReservationJournal} from './fixture-ui-package-intent.mjs';
import {validatePackageReservationJournal} from './fixture-package-intent.mjs';
import {validateExternalAuditJournal} from './fixture-external-audit-identity.mjs';
import { readPrivateRegular } from './audit-private.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { databaseFor, marker, sourceHead } from './fixture-guard.mjs';
import { assertCreationProof, digest, identities, uuid, SEED_ACTORS } from './fixture-core.mjs';
import { canonicalDefinitions } from './fixture-policy.mjs';
import { fixtureProfile } from './fixture-core.mjs';
import { stampProfileJournal, assertProfileJournal, validateSalesAnchorScope } from './fixture-profile.mjs';
import {validateAuditIdentityJournal} from './fixture-audit-identity.mjs';

export function plannedJournal(backend, runId) {
    assert(['nest', 'rust'].includes(backend));
    return stampProfileJournal({ formatVersion: 1, fixtureSourceEpoch: 2, namespace: 'poms-r2m', marker, sourceHead, database: databaseFor(backend), backend, runId: uuid(runId), revision: 0,
        state: 'planned', cases: [], objects: [], intents: [], directCreates: [], committedCreates: [], authorities: [], mutations: [], borrowed: { definitions: [] }, base: null, basePreparationConfig: null, preparedBatches: [], cleanup: [] }, fixtureProfile);
}
export function validateJournal(journal, backend, runId) {
    assert(journal && journal.formatVersion === 1); assertProfileJournal(journal, fixtureProfile);
    assert.equal(journal.runId, uuid(runId)); assert.equal(journal.backend, backend); assert.equal(journal.database, databaseFor(backend));
    assert.equal(journal.marker, marker); assert.equal(journal.sourceHead, sourceHead);
    assert(Number.isSafeInteger(journal.revision) && journal.revision >= 0);
    assert(['planned', 'prepared', 'cleanup-committed', 'cleaned'].includes(journal.state));
    for (const key of ['cases', 'objects', 'intents', 'directCreates', 'committedCreates', 'authorities', 'mutations', 'cleanup']) assert(Array.isArray(journal[key]) && journal[key].length <= 20000);
    if (journal.basePreparationConfig) {
        const config = journal.basePreparationConfig;
        assert.equal(config.formatVersion, 1); assert(/^[0-9a-f]{64}$/.test(config.manifestPermissionsSha256));
        assert(Array.isArray(config.viewerPermissions) && config.viewerPermissions.every((key) => typeof key === 'string'));
        assert.deepEqual(config.viewerPermissions, [...new Set(config.viewerPermissions)].sort());
    }
    assert(Array.isArray(journal.borrowed?.definitions));
    assert([0, canonicalDefinitions.length].includes(journal.borrowed.definitions.length));
    for (const borrowed of journal.borrowed.definitions) {
        const expected = canonicalDefinitions.find(({ id }) => id === borrowed.id); assert(expected && borrowed.readOnly);
        assert.equal(borrowed.fullRowSha256, digest(borrowed.row)); assert.equal(borrowed.row.status, 'active');
        for (const [key, value] of Object.entries(expected)) { assert.equal(borrowed[key], value); assert.equal(borrowed.row[key], value); }
    }
    assert.equal(new Set(journal.borrowed.definitions.map(({ id }) => id)).size, journal.borrowed.definitions.length);
    for (const plan of journal.preparedBatches ?? []) {
        assert.equal(plan.id, uuid(plan.id)); assert.equal(plan.sourcePlanSha256, digest(plan.originalPlan));
        assert(journal.cases.some(({ caseId }) => caseId === plan.caseId));
        assert(['planned-not-executed', 'executing', 'commit-attempted', 'committed', 'outcome-unknown', 'rolled-back', 'promoted', 'absent'].includes(plan.state));
    }
    if (journal.keyed) {
        assert(Array.isArray(journal.keyed.intents) && Array.isArray(journal.keyed.objects));
        for (const object of journal.keyed.objects) { assert.equal(object.table,'system_setting'); assert.equal(object.key,'attachment.max-upload-size-mb'); assert(object.creationProof && object.independentlyVisible); assert(journal.keyed.intents.some(intent => intent.table==='system_setting' && intent.key===object.key && intent.beforeAbsent && intent.state==='adopted')); }
        assert.equal(new Set(journal.keyed.objects.map(x=>x.key)).size,journal.keyed.objects.length);
    }
    if (journal.baselineSettingLease) {
        const lease = journal.baselineSettingLease;
        assert.equal(lease.namespace, 'poms-r2m'); assert.equal(lease.key, 'attachment.max-upload-size-mb');
        assert.equal(lease.owned, false); assert.equal(lease.deletionPermitted, false);
        assert(['admitted', 'observing', 'restored'].includes(lease.state));
        assert.equal(digest(lease.before), lease.beforeSha256); assert.equal(digest(lease.expectedAfter), lease.expectedAfterSha256);
        assert.equal(digest(lease.admission), lease.admissionSha256); assert(journal.cases.some(scope => scope.caseId === lease.caseId));
    }
    if (journal.logicalReferences) {
        assert(Array.isArray(journal.logicalReferences));
        for (const entry of journal.logicalReferences) {
            assert.equal(entry.id, uuid(entry.id)); assert.equal(entry.role, 'receivable-plan-version-no-row'); assert.equal(entry.rowOwned, false);
            assert.equal(entry.table, 'contract_readiness_package'); assert.equal(entry.column, 'initialized_receivable_plan_version_id'); assert.equal(entry.rowId, uuid(entry.rowId));
            assert(!journal.objects.some(object => object.id === entry.id) && !SEED_ACTORS.includes(entry.id) && !canonicalDefinitions.some(row => row.id === entry.id));
            const plan = journal.preparedBatches.find(plan => plan.id === entry.sourcePlanId && plan.sourcePlanSha256 === entry.sourcePlanSha256);
            assert(plan?.originalPlan.logicalReferences?.some(ref => digest(ref) === digest({id:entry.id,role:entry.role,table:entry.table,rowId:entry.rowId,column:entry.column})));
        }
    }
    const keys = new Set();
    for (const object of journal.objects) {
        assert(Object.hasOwn(identities, object.table)); assert.equal(object.id, uuid(object.id));
        assert(!SEED_ACTORS.includes(object.id) && !canonicalDefinitions.some(({ id }) => id === object.id) && !journal.borrowed.definitions.some(({ id }) => id === object.id));
        const key = object.table + ':' + object.id; assert(!keys.has(key)); keys.add(key);
        assert(object.caseId && object.identity?.id === object.id && object.creationProof && object.postcondition?.independentlyVisible === true);
        assert.deepEqual(Object.keys(object.identity).sort(), ['id', ...identities[object.table]].sort());
        if (object.creationProof.kind === 'direct-committed-insert') {
            const proof = object.creationProof;
            assert(proof.beforeAbsent && /^[0-9]+$/.test(String(proof.transaction)) && String(BigInt(proof.transaction) % 4294967296n) === String(proof.xmin));
            assert(proof.commitAcknowledged || proof.recoveredByXminAndXactStatus);
            if (proof.sourcePlanId) {
                const plan = journal.preparedBatches.find(({ id }) => id === proof.sourcePlanId);
                assert(plan && proof.provenance === 'prepared-original-seeder-source-not-Native-generated');
                assert(plan.originalPlan.rows.some((row) => row.table === object.table && row.values.id === object.id));
            }
        } else {
            const certificate = journal.committedCreates.find((entry) => entry.table === object.table && entry.id === object.id && digest(entry.proof) === digest(object.creationProof));
            assert(certificate, 'Owned row lost its actual creation certificate');
            const intent = journal.intents.find((entry) => entry.id === certificate.intentId);
            assert(intent); assertCreationProof(journal, certificate, intent);
        }
    }
    if (fixtureProfile.name === 'r2m-stage-continuation01') for (const scope of journal.cases.filter(scope => scope.caseId !== 'base')) validateSalesAnchorScope(journal, scope);
    validateAuditIdentityJournal(journal);validateExternalAuditJournal(journal);validatePackageReservationJournal(journal);validateUiPackageReservationJournal(journal);return journal;
}
function assertStablePlans(previous, next) {
    if (!previous) return;
    assertProfileJournal(previous, fixtureProfile); assertProfileJournal(next, fixtureProfile);
    if (fixtureProfile.name === 'r2m-stage-continuation01') for (const scope of previous.cases.filter(scope => scope.caseId !== 'base')) {
        const current = next.cases.find(item => item.caseId === scope.caseId); assert(current);
        for (const key of ['ownedCustomerIds','ownedLeadIds','salesProjectCustomers']) assert.equal(digest(current[key]), digest(scope[key]), 'Immutable explicit sales anchors changed');
    }
    if (previous.basePreparationConfig) assert.equal(digest(previous.basePreparationConfig), digest(next.basePreparationConfig), 'Immutable planned viewer configuration changed');
    if (previous.borrowed.definitions.length) assert.equal(digest(previous.borrowed.definitions), digest(next.borrowed.definitions), 'Readonly definition before snapshot changed');
    if (previous.baselineSettingLease) {
        assert(next.baselineSettingLease);
        for (const key of ['namespace', 'key', 'caseId', 'admissionSha256', 'admission', 'sourceBinding', 'currentToolRawBytesSha256', 'before', 'beforeSha256', 'owned', 'deletionPermitted']) assert.equal(digest(previous.baselineSettingLease[key]), digest(next.baselineSettingLease[key]), 'Baseline singleton admission/before snapshot changed');
    }
    for (const previousEntry of previous.logicalReferences ?? []) assert(next.logicalReferences?.some(entry => digest(entry) === digest(previousEntry)), 'Source-bound logical reference changed or disappeared');
    for(const entry of previous.uiGeneratedPackageReservations??[])assert(next.uiGeneratedPackageReservations?.some(row=>digest(row)===digest(entry)),'Immutable exact UI4 package reservation changed/disappeared');
    for(const entry of previous.generatedPackageReservations??[])assert(next.generatedPackageReservations?.some(row=>digest(row)===digest(entry)),'Immutable exact package reservation changed/disappeared');
    for(const entry of previous.externalAuditAdmissions??[])assert(next.externalAuditAdmissions?.some(nextEntry=>digest(nextEntry)===digest(entry)),'Immutable external audit admission changed/disappeared');
    for(const entry of previous.auditIdentityAdmissions??[])assert(next.auditIdentityAdmissions?.some(nextEntry=>digest(nextEntry)===digest(entry)),'Immutable source-bound audit admission changed/disappeared');
    for (const plan of previous.preparedBatches ?? []) {
        const current = next.preparedBatches?.find(({ id }) => id === plan.id); assert(current);
        for (const field of ['caseId', 'sourcePlanSha256', 'originalPlan', 'defaultSources', 'sourceBoundary']) assert.equal(digest(current[field]), digest(plan[field]), 'Immutable prepared source plan changed');
    }
}
export function memoryStore(backend, runId) {
    let value;
    return { read: () => value ? structuredClone(value) : undefined, write: (next) => { validateJournal(next, backend, runId); assertStablePlans(value, next); value = structuredClone(next); } };
}
// There is no filesystem/private-directory access until Root explicitly opens
// the store. No old namespace, environment file or journal is consulted.
export function journalStore(backend, runId, privateRoot) {
    assert.equal(process.platform, 'linux');
    assert(['/r2m-c01-private', '/home/wangzishi/.local/share/poms-r2m-continuation01/private'].includes(privateRoot));
    const checkDirectory = (directory, create = false) => {
        if (create && !fs.existsSync(directory)) fs.mkdirSync(directory, { mode: 0o700 });
        const stat = fs.lstatSync(directory);
        assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0, 'Unsafe journal directory');
    };
    checkDirectory(privateRoot);
    const directory = path.join(privateRoot, 'm-runs'); checkDirectory(directory, true);
    const file = path.join(directory, backend + '-' + uuid(runId) + '.json');
    assert.equal(path.dirname(file), directory);
    let lastDigest;
    function read() {
        if (!fs.existsSync(file)) { lastDigest = null; return; }
        const stat = fs.lstatSync(file);
        assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 32 * 1024 * 1024 && (stat.mode & 0o077) === 0, 'Unsafe journal file');
        const value = validateJournal(JSON.parse(readPrivateRegular(file, {kind: 'journal'})), backend, runId);
        lastDigest = digest(value); return value;
    }
    function write(next) {
        validateJournal(next, backend, runId);
        const expected = lastDigest;
        const current = fs.existsSync(file) ? read() : undefined;
        assert.equal(lastDigest ?? null, expected ?? null, 'Stale fixture writer');
        assert(!current || next.revision === current.revision + 1, 'Journal revision did not advance exactly once');
        assertStablePlans(current, next);
        const temporary = file + '.' + randomUUID() + '.tmp';
        const fd = fs.openSync(temporary, 'wx', 0o600);
        try { fs.writeFileSync(fd, JSON.stringify(next) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        fs.renameSync(temporary, file);
        const directoryFd = fs.openSync(directory, 'r');
        try { fs.fsyncSync(directoryFd); } finally { fs.closeSync(directoryFd); }
        lastDigest = digest(next);
    }
    return { read, write, file };
}
