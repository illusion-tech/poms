import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { databaseFor, marker, sourceHead } from './fixture-guard.mjs';
import { assertCreationProof, digest, identities, uuid, SEED_ACTORS } from './fixture-core.mjs';
import { canonicalDefinitions } from './fixture-commission-policy.mjs';
import { fixtureProfile } from './fixture-core.mjs';
import { stampProfileJournal, assertProfileJournal, validateSalesAnchorScope } from './l-todo-profile-candidate.mjs';

export function plannedJournal(backend, runId) {
    assert(['nest', 'rust'].includes(backend));
    return stampProfileJournal({ formatVersion: 1, fixtureSourceEpoch: 2, namespace: 'poms-r2l', marker, sourceHead, database: databaseFor(backend), backend, runId: uuid(runId), revision: 0,
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
    if (fixtureProfile.name === 'todo42') for (const scope of journal.cases.filter(scope => scope.caseId !== 'base')) validateSalesAnchorScope(journal, scope);
    return journal;
}
function assertStablePlans(previous, next) {
    if (!previous) return;
    assertProfileJournal(previous, fixtureProfile); assertProfileJournal(next, fixtureProfile);
    if (fixtureProfile.name === 'todo42') for (const scope of previous.cases.filter(scope => scope.caseId !== 'base')) {
        const current = next.cases.find(item => item.caseId === scope.caseId); assert(current);
        for (const key of ['ownedCustomerIds','ownedLeadIds','salesProjectCustomers']) assert.equal(digest(current[key]), digest(scope[key]), 'Immutable explicit sales anchors changed');
    }
    if (previous.basePreparationConfig) assert.equal(digest(previous.basePreparationConfig), digest(next.basePreparationConfig), 'Immutable planned viewer configuration changed');
    if (previous.borrowed.definitions.length) assert.equal(digest(previous.borrowed.definitions), digest(next.borrowed.definitions), 'Readonly definition before snapshot changed');
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
    assert(['/r2l-private', '/home/wangzishi/.local/share/poms-r2l/private'].includes(privateRoot));
    const checkDirectory = (directory, create = false) => {
        if (create && !fs.existsSync(directory)) fs.mkdirSync(directory, { mode: 0o700 });
        const stat = fs.lstatSync(directory);
        assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0, 'Unsafe journal directory');
    };
    checkDirectory(privateRoot);
    const directory = path.join(privateRoot, 'l-runs'); checkDirectory(directory, true);
    const file = path.join(directory, backend + '-' + uuid(runId) + '.json');
    assert.equal(path.dirname(file), directory);
    let lastDigest;
    function read() {
        if (!fs.existsSync(file)) { lastDigest = null; return; }
        const stat = fs.lstatSync(file);
        assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 32 * 1024 * 1024 && (stat.mode & 0o077) === 0, 'Unsafe journal file');
        const value = validateJournal(JSON.parse(fs.readFileSync(file, 'utf8')), backend, runId);
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
