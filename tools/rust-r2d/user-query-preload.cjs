'use strict';

// Explicit --require observer for the original Nest process. Reuse the frozen
// R2C driver capture without changing product services or issuing extra SQL.
const fs = require('node:fs');
const path = require('node:path');
const { AsyncLocalStorage } = require('node:async_hooks');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { installQueryCapture } = require('../rust-r2c/witness-query-core.cjs');
const { barrierSpecs, matchesUserQuery } = require('./user-query-match.cjs');

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const root = path.resolve(__dirname, '../..');
const eventTypes = new Set(['platform.user.created', 'platform.user.updated', 'platform.user.self-updated', 'platform.user.activated', 'platform.user.deactivated', 'platform.user.roles.replaced', 'platform.user.org-memberships.replaced']);
const baseKeys = ['formatVersion', 'runId', 'barrierId', 'caseId', 'planSha256', 'kind', 'parties', 'skipMatches'];
const digest = (value) => createHash('sha256').update(value).digest('hex');
function fail(code) { throw new Error(`R2D_QUERY_${code}`); }
function planModule() { return require('./nest-witness-plan.mjs'); }

function validateWitnessEnvironment(env) {
    if (!uuid.test(env.POMS_R2D_WITNESS_RUN_ID ?? '')) fail('RUN_ID');
    for (const key of Object.keys(env)) {
        if (/^NODE_OPTIONS$/i.test(key)) fail('AMBIENT_OVERRIDE');
        if (/^POMS_R2D_(?:WITNESS|QUERY|SQL)_/i.test(key) && key !== 'POMS_R2D_WITNESS_RUN_ID') fail('AMBIENT_OVERRIDE');
    }
    return env.POMS_R2D_WITNESS_RUN_ID;
}

function assertPrivateFile(filename, directory = false) {
    const stat = fs.lstatSync(filename);
    if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile()) || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) fail('PATH_IDENTITY');
    return stat;
}

function resolveWitnessDirectory(repositoryRoot, runId) {
    if (!uuid.test(runId ?? '')) fail('RUN_ID');
    const absoluteRoot = fs.realpathSync(repositoryRoot);
    let current = absoluteRoot;
    const segments = ['tmp', 'rust-r2d', 'witness', runId];
    for (const [index, segment] of segments.entries()) {
        current = path.join(current, segment);
        const stat = fs.lstatSync(current);
        if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(current) !== current) fail('PATH_IDENTITY');
        if (index === segments.length - 1 && process.platform !== 'win32' && (stat.mode & 0o077) !== 0) fail('PATH_MODE');
    }
    return current;
}

function readControlFile(filename) {
    let stat;
    try { stat = assertPrivateFile(filename); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    if (stat.size < 2 || stat.size > 4096) fail('CONTROL_SIZE');
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function validateBarrierPlan(value, runId) {
    const { planSha256, witnessCases } = planModule();
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.formatVersion !== 1 || value.runId !== runId || !uuid.test(runId ?? '') || !/^[a-z0-9-]{1,80}$/.test(value.barrierId ?? '') || value.planSha256 !== planSha256 || ![1, 2].includes(value.parties) || !Number.isInteger(value.skipMatches) || value.skipMatches < 0 || value.skipMatches > 32) fail('BARRIER_PLAN');
    const spec = barrierSpecs[value.kind];
    const item = witnessCases.find((entry) => entry.id === value.caseId);
    if (!spec || !item?.barrierKinds.includes(value.kind)) fail('BARRIER_CASE');
    const required = [spec.target, spec.secondTarget].filter(Boolean);
    const optional = /^(?:before|after)-audit-insert$/.test(value.kind) ? ['targetEventType'] : [];
    const allowed = new Set([...baseKeys, ...required, ...optional]);
    if (Object.keys(value).some((key) => !allowed.has(key)) || [...baseKeys, ...required].some((key) => !Object.hasOwn(value, key))) fail('BARRIER_KEYS');
    for (const key of required) {
        if (key === 'targetUsername') {
            const match = /^r2d_(admin|viewer|u[0-9]{3})_([0-9a-f]{32})$/.exec(value[key] ?? '');
            if (!match || match[2] !== runId.replaceAll('-', '') || (match[1].startsWith('u') && Number(match[1].slice(1)) > 255)) fail('TARGET_USERNAME');
        } else if (!uuid.test(value[key] ?? '')) fail('TARGET_UUID');
    }
    if (value.targetEventType !== undefined && !eventTypes.has(value.targetEventType)) fail('TARGET_EVENT');
    if (spec.structural && value.parties !== 1) fail('STRUCTURAL_PARTIES');
    return Object.freeze({ ...value });
}

function validateRelease(value, plan) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === 'barrierId,formatVersion,runId' && value.formatVersion === 1 && value.runId === plan.runId && value.barrierId === plan.barrierId);
}

function readWorkerIdentity() {
    if (process.platform !== 'linux') fail('LINUX_WORKER_REQUIRED');
    const text = fs.readFileSync('/proc/self/stat', 'utf8');
    const pid = Number(text.slice(0, text.indexOf(' ')));
    const fields = text.slice(text.lastIndexOf(')') + 1).trim().split(/\s+/);
    const startTicks = fields[19];
    if (pid !== process.pid || !/^[0-9]+$/.test(startTicks ?? '') || BigInt(startTicks) <= 0n) fail('WORKER_IDENTITY');
    return Object.freeze({ pid, startTicks, platform: 'linux' });
}

function installUserQueryCapture(Client, { runId, workerIdentity, append, readPlan = () => null, awaitRelease = async () => true, onFailure = () => undefined }) {
    if (!uuid.test(runId ?? '') || !Number.isSafeInteger(workerIdentity?.pid) || workerIdentity.pid <= 0 || !/^[0-9]+$/.test(workerIdentity?.startTicks ?? '') || BigInt(workerIdentity.startTicks) <= 0n) fail('CAPTURE_IDENTITY');
    const storage = new AsyncLocalStorage();
    const states = new Map(), proofs = new Map();
    const original = Client.prototype.query;
    const capture = installQueryCapture(Client, {
        append(row) {
            const local = storage.getStore();
            const dbPid = local?.client?.processID;
            const proof = /^barrier-/.test(row.phase) ? proofs.get(row.queryId) : undefined;
            append({ ...row, workerPid: workerIdentity.pid, workerStartTicks: workerIdentity.startTicks,
                ...(Number.isSafeInteger(dbPid) && dbPid > 0 ? { backendPid: dbPid } : {}),
                ...(proof ? { barrierProof: proof } : {}) });
        },
        onFailure,
        barrierFor(phase, description) {
            const requested = readPlan(); if (!requested) return null;
            const plan = validateBarrierPlan(requested, runId);
            const local = storage.getStore();
            if (!local || !matchesUserQuery(plan.kind, phase, description, local.args, plan)) return null;
            const fingerprint = digest(JSON.stringify(Object.fromEntries(Object.entries(plan).sort(([left], [right]) => left.localeCompare(right)))));
            const state = states.get(plan.barrierId) ?? { fingerprint, matched: 0, claimed: 0 };
            if (state.fingerprint !== fingerprint) fail('BARRIER_IDENTITY_CHANGED');
            states.set(plan.barrierId, state);
            state.matched++;
            if (state.matched <= plan.skipMatches || state.claimed >= plan.parties) return null;
            const targets = Object.fromEntries(Object.entries(plan).filter(([key]) => key.startsWith('target')));
            const spec = barrierSpecs[plan.kind];
            proofs.set(description.queryId, { caseId: plan.caseId, planSha256: plan.planSha256, party: ++state.claimed,
                matchedOccurrence: state.matched, proofKind: spec.structural ? 'structural-full-read' : 'private-original-query-target-match',
                targetMatched: spec.structural ? null : true, targets,
                boundary: spec.structural ? 'No target UUID exists in this query predicate; fixture/result facts and single-request control are independently required' : 'Only declared targets are retained; no SQL values/result rows are recorded' });
            return plan;
        },
        pause(plan, context) { return awaitRelease(plan, context); }
    });
    const captured = Client.prototype.query;
    Client.prototype.query = function (...args) { return storage.run({ client: this, args }, () => captured.apply(this, args)); };
    return { isIncomplete: capture.isIncomplete, uninstall() { capture.uninstall(); Client.prototype.query = original; } };
}

function installFromEnvironment(env = process.env) {
    const runId = validateWitnessEnvironment(env), directory = resolveWitnessDirectory(root, runId);
    const workerIdentity = readWorkerIdentity(), protocol = planModule();
    if (digest(fs.readFileSync(path.join(root, 'docs/design/rust-r2d-users-profile-baseline.md'))) !== protocol.g1BaselineSha256) fail('G1_SOURCE_IDENTITY');
    const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
    const sources = [
        'tools/rust-r2c/witness-query-core.cjs', 'tools/rust-r2d/user-query-match.cjs',
        'tools/rust-r2d/user-query-preload.cjs', 'tools/rust-r2d/nest-witness-plan.mjs',
        'docs/design/rust-r2d-users-profile-baseline.md'
    ].map((file) => ({ file, rawBytesSha256: digest(fs.readFileSync(path.join(root, file))) }));
    const file = fs.openSync(path.join(directory, 'sql.jsonl'), 'wx', 0o600);
    fs.writeFileSync(path.join(directory, 'capture-metadata.json'), `${JSON.stringify({ formatVersion: 1, kind: 'original-nest-query-observer', runId,
        sourceHead: protocol.sourceHead, g1BaselineSha256: protocol.g1BaselineSha256, witnessPlan: protocol.witnessPlanManifest(),
        workerIdentity, sourceFiles: sources, output: 'sql.jsonl', valuesOrRowsRecorded: false,
        boundary: 'Observer instrumentation identity only; coordinator must independently prove original Nest binary/source, owner liveness/stop, full facts and cleanup' }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return installUserQueryCapture(Client, {
        runId, workerIdentity,
        append(row) { fs.writeSync(file, `${JSON.stringify(row)}\n`); },
        onFailure() { try { fs.writeSync(2, 'R2D_SQL_CAPTURE_INCOMPLETE\n'); } catch { /* Preserve the original driver result. */ } },
        readPlan() { return readControlFile(path.join(directory, 'barrier.json')); },
        async awaitRelease(plan) {
            const deadline = Date.now() + 15000;
            while (Date.now() < deadline) {
                const release = readControlFile(path.join(directory, `${plan.barrierId}.release.json`));
                if (release) return validateRelease(release, plan);
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
            return false;
        }
    });
}

module.exports = { validateWitnessEnvironment, resolveWitnessDirectory, readControlFile, validateBarrierPlan, validateRelease, readWorkerIdentity, installUserQueryCapture, installFromEnvironment };
if (module.parent?.id === 'internal/preload' || require.main === module) installFromEnvironment();
