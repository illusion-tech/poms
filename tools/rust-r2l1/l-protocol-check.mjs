// Pure protocol checks only: no service, ORM, network or database is loaded.
import assert from 'node:assert/strict';
import { OPERATIONS, ProbeRejected, admitPairedApproval, errorObservation, parseCaseLine, resolveInput, resultObservation } from './l-protocol.mjs';

const identity = { version: 1, runId: '00000000-0000-4000-8000-000000000081', caseId: 'protocol-pure' };
const parsed = parseCaseLine(JSON.stringify({
    ...identity,
    steps: [{ op: 'confirmation.create', input: { actorId: 'actor', input: { summary: null, title: '\ud800', participants: [] } }, as: 'created' }]
}));
assert.equal(parsed.steps[0].input.input.title.charCodeAt(0), 0xd800);
assert.equal(Object.hasOwn(parsed.steps[0].input.input, 'comment'), false);
assert.equal(parsed.steps[0].input.input.summary, null);

const entity = { id: 'entity', rowVersion: 1, text: '\ud800' };
const bindings = new Map([['created', entity], ['nothing', undefined]]);
assert.equal(resolveInput({ $ref: 'created' }, bindings), entity);
assert.equal(resolveInput({ $ref: 'created.id' }, bindings), 'entity');
assert.equal(resolveInput({ $ref: 'nothing' }, bindings), undefined);
const observation = resultObservation(entity);
entity.rowVersion = 2;
assert.equal(observation.value.rowVersion, 1);
assert.equal(observation.value.text.charCodeAt(0), 0xd800);
assert.deepEqual(resultObservation(undefined), { defined: false });
assert.deepEqual(resultObservation(null), { defined: true, value: null });
assert.equal(resolveInput({ $date: '2026-01-02T03:04:05.006Z' }, bindings).toISOString(), '2026-01-02T03:04:05.006Z');
assert.equal(resolveInput('2026-01-02T03:04:05.006Z', bindings), '2026-01-02T03:04:05.006Z');
assert.equal(resolveInput({ $date: 'unparseable' }, bindings).getTime().toString(), 'NaN');

for (const reference of ['created.__proto__', 'created.constructor', 'missing.id']) {
    assert.throws(() => resolveInput({ $ref: reference }, bindings), ProbeRejected);
}
for (const bad of [
    { ...identity, steps: [{ op: 'unknown' }] },
    { ...identity, steps: [{ op: 'session.flush', as: 'same' }, { op: 'session.flush', as: 'same' }] },
    { ...identity, steps: [{ op: 'session.flush', onError: true }] },
    { ...identity, steps: [{ op: 'session.flush', input: { $date: 'x', extra: 1 } }] }
]) {
    assert.throws(() => parseCaseLine(JSON.stringify(bad)), ProbeRejected);
}
assert.doesNotThrow(() => admitPairedApproval({ kind: 'unsupported' }, null));
assert.doesNotThrow(() => admitPairedApproval({ kind: 'unsupported' }, { approvalType: 'contract-review', targetObjectType: 'project' }));
assert.throws(() => admitPairedApproval({ kind: 'unsupported' }, { approvalType: 'contract-review', targetObjectType: 'contract' }), ProbeRejected);
assert.throws(() => admitPairedApproval({ kind: 'owned-witness' }, { approvalType: 'contract-review', targetObjectType: 'project' }), ProbeRejected);

const rawError = new Error('\ud800');
rawError.getStatus = () => 409;
assert.deepEqual(errorObservation(rawError), { kind: 'http', status: 409, message: '\ud800' });
const databaseError = Object.assign(new Error('native error'), { code: '23505' });
assert.deepEqual(errorObservation(databaseError), { kind: 'database', status: null, message: 'native error', sqlstate: '23505' });
process.stdout.write(`${JSON.stringify({ kind: 'pure-protocol-check', result: 'Pass', operations: Object.keys(OPERATIONS).length, serviceOrmPgNetworkExecuted: false })}\n`);
