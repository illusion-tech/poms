import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {validateAmbient} from './fixture-guard.mjs';
const require = createRequire(import.meta.url);
const { describeSql } = require('./witness-query-core.cjs');
const { matchesBehaviorBarrier } = require('./org-behavior-query-match.cjs');

export function validateConcurrencyAmbient(env) {
    const ambient={...env};delete ambient.POMS_ENV_FILE;
    // resolveApiPlan separately admits only the exact private backend file.
    // Its required explicit selector is not an ambient SQL/process override.
    validateAmbient(ambient);
}

export async function readOrgSnapshots(slots,readSnapshot) {
    const entries=[];
    // Every same-run fixture command holds one exclusive advisory lock through
    // COMMIT and journal fsync. Await its completion before invoking the next.
    for(const slot of slots)entries.push([slot,await readSnapshot(slot)]);
    return Object.fromEntries(entries);
}

export const concurrencyCases = Object.freeze([
    { id: 'code-after-both-prechecks', kind: 'pair', slots: ['race-code-a', 'race-code-b'], statuses: [200, 500], auditDelta: 1, sessionDeltas: [0, 0] },
    { id: 'sibling-name-after-both-prechecks', kind: 'pair', slots: ['race-name-a', 'race-name-b'], statuses: [200, 500], auditDelta: 1, sessionDeltas: [0, 0] },
    { id: 'org-version-after-read', kind: 'org', slots: ['org-cas'], statuses: [500], auditDelta: 0, sessionDeltas: [0] },
    { id: 'alias-org-version-after-read', kind: 'org', slots: ['org-cas'], statuses: [500], auditDelta: 0, sessionDeltas: [0] },
    { id: 'mixed-cascade-version-precheck-rollback', kind: 'handoff-org', slots: ['cascade-root', 'cascade-a', 'cascade-b', 'cascade-c', 'cascade-d', 'cascade-e'], statuses: [500], auditDelta: 0, sessionDeltas: [1] },
    { id: 'late-managed-session-cas', kind: 'handoff-session', slots: ['session-cas'], statuses: [500], auditDelta: 0, sessionDeltas: [2] }
].map(Object.freeze));

export function queryKind(query) {
    const value = typeof query === 'string' ? describeSql(query) : query;
    const shape = value.sqlShape.replaceAll('"', '').toLowerCase();
    const where = /\bwhere\b([\s\S]*?)(?=\breturning\b|\border by\b|$)/.exec(shape)?.[1] ?? '';
    if (matchesBehaviorBarrier('before-managed-session-update', 'before', value)) return 'managed-session-cas';
    if (value.command === 'UPDATE' && value.relations.includes('auth_session') && /\bcoalesce\s*\(/.test(shape) && /\bleast\s*\(/.test(shape) && /\bstatus\b/.test(where) && !/\brow_version\b/.test(where)) return 'raw-session-touch';
    if (value.command === 'UPDATE' && value.relations.includes('org_unit') && /\brow_version\b\s*=/.test(where)) return 'org-cas-update';
    if (value.command === 'SELECT' && value.relations.includes('auth_session') && /\bfor update\b/.test(shape)) return 'coordinator-session-lock';
    return 'other';
}

export function sanitizeActivity(row) {
    assert(Number.isInteger(row.pid) && row.pid > 0 && Array.isArray(row.blockers));
    return { pid: row.pid, state: row.state, waitEventType: row.wait_event_type, waitEvent: row.wait_event,
        blockers: row.blockers, query: describeSql(row.query), kind: queryKind(row.query) };
}

export function dependencyPath(rows, pid, roots) {
    const indexed = new Map(rows.map((row) => [row.pid, row]));
    const queue = [[pid]];
    while (queue.length) {
        const path = queue.shift(), current = path.at(-1);
        if (roots.includes(current)) return path;
        for (const next of indexed.get(current)?.blockers ?? []) if (!path.includes(next)) queue.push([...path, next]);
    }
    return null;
}

export function assertWaitProof(proof) {
    assert(Array.isArray(proof.rows) && Array.isArray(proof.roots) && Array.isArray(proof.waiterPids));
    assert.equal(new Set(proof.waiterPids).size, proof.waiterPids.length);
    assert.equal(proof.waiterPids.length, proof.expectedCount);
    for (const pid of proof.waiterPids) {
        assert(!proof.roots.includes(pid));
        const row = proof.rows.find((value) => value.pid === pid);
        assert(row && row.state === 'active' && row.waitEventType === 'Lock');
        assert.equal(queryKind(row.query), proof.expectedKind, 'SQL phase differs from the intended barrier');
        assert(dependencyPath(proof.rows, pid, proof.roots), 'Waiter is not blocked by an owned coordinator row lock');
    }
    for(const root of proof.roots)assert(proof.waiterPids.some((pid)=>dependencyPath(proof.rows,pid,[root])),'Each declared coordinator lock must actually block a waiter');
    return true;
}

export function assertCaseProofs(row) {
    const specification = concurrencyCases.find((value) => value.id === row.id);
    assert(specification, 'Unknown concurrency case');
    const stages = row.proofs.map((proof) => proof.stage);
    if (specification.kind === 'pair') {
        assert.deepEqual(stages, ['both-target-updates-held']);
        assert.equal(row.proofs[0].expectedCount, 2);
        assert.equal(row.proofs[0].expectedKind, 'org-cas-update');
        assert.deepEqual(row.releaseOrder, ['target-a', 'request-a-completed', 'target-b']);
    } else if (specification.kind === 'org') {
        assert.deepEqual(stages, ['target-update-held']);
        assert.equal(row.proofs[0].expectedKind, 'org-cas-update');
    } else {
        assert.deepEqual(stages, ['raw-touch-held', 'handoff-queued', 'managed-cas-held']);
        assert.deepEqual(row.proofs.map((proof) => proof.expectedKind), ['raw-session-touch', 'coordinator-session-lock', 'managed-session-cas']);
        assert.equal(row.handoffAcquired, true);
    }
    for (const proof of row.proofs) assertWaitProof(proof);
    return specification;
}

export function assertCaseTiming(row) {
    const spec=concurrencyCases.find((value)=>value.id===row.id);assert(spec);
    const time=(value)=>{assert.equal(typeof value,'string');const parsed=Date.parse(value);assert(Number.isFinite(parsed));assert.equal(new Date(parsed).toISOString(),value);return parsed;};
    const start=time(row.startedAt),finish=time(row.finishedAt);assert(start<=finish);
    const inside=(value)=>{const parsed=time(value);assert(parsed>=start&&parsed<=finish,'Barrier/timing event must belong to this request');return parsed;};
    const proofTimes=row.proofs.map((proof)=>inside(proof.at));
    for(let index=1;index<proofTimes.length;index++)assert(proofTimes[index]>=proofTimes[index-1],'Barrier stages must be chronological');
    const timings=Object.fromEntries(Object.entries(row.timings).map(([key,value])=>[key,inside(value)]));
    const ordered=(values)=>{assert(values.every(Number.isFinite),'Required causal event is missing');for(let index=1;index<values.length;index++)assert(values[index]>=values[index-1],'Release/acquire/mutation chronology differs from the controlled schedule');};
    if(spec.kind==='pair')ordered([proofTimes[0],timings.releaseAStartedAt,timings.releaseACompletedAt,timings.requestACompletedAt,timings.releaseBStartedAt,timings.releaseBCompletedAt]);
    else if(spec.kind==='org')ordered([proofTimes[0],timings.mutationCompletedAt,timings.releaseAStartedAt,timings.releaseACompletedAt]);
    else {
        ordered([proofTimes[0],proofTimes[1],timings.releaseAStartedAt,timings.releaseACompletedAt,proofTimes[2],timings.mutationCompletedAt,timings.releaseBStartedAt,timings.releaseBCompletedAt]);
        ordered([timings.releaseAStartedAt,timings.handoffAcquiredAt,proofTimes[2]]);
    }
    return true;
}
