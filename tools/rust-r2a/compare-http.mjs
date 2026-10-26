import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

assert.equal(process.argv.length, 2);
const root = path.resolve(import.meta.dirname, '../..');
const inputs = ['nest', 'rust'].map((backend) => {
    const file = `tmp/rust-r2a/http-linux-${backend}.json`;
    const bytes = readFileSync(path.join(root, file));
    const value = JSON.parse(bytes.toString('utf8'));
    assert.equal(value.result, 'pass');
    assert.equal(value.backend, backend);
    assert.equal(value.platform, 'linux');
    assert.equal(value.serverStopped, true);
    assert.equal(value.zeroResidual.matched, 0);
    assert.equal(value.zeroResidual.changed, 0);
    assert.equal(value.cases.length, 38);
    assert.equal(new Set(value.cases.map((entry) => entry.id)).size, 38);
    assert(value.cases.every((entry) => entry.result === 'pass'));
    return { file, sha256: createHash('sha256').update(bytes).digest('hex'), value };
});
const [nest, rust] = inputs.map((entry) => entry.value);
assert.deepEqual(nest.sourceFiles, rust.sourceFiles, 'Both backends must use the same frozen test sources');
assert.deepEqual(
    nest.cases.map((entry) => entry.id),
    rust.cases.map((entry) => entry.id)
);
const comparisons = nest.cases.map((left, index) => {
    const right = rust.cases[index];
    const keys = ['status', 'body', 'setCookieCount', 'tree', 'summary', 'auditDelta'].filter((key) => Object.hasOwn(left.observed, key));
    for (const key of keys) assert.deepEqual(right.observed[key], left.observed[key], `${left.id}: complete ${key}`);
    if (left.observed.before) {
        assert.equal(right.observed.after.rowVersion - right.observed.before.rowVersion, left.observed.after.rowVersion - left.observed.before.rowVersion, `${left.id}: version delta`);
        keys.push('session-version-delta');
    }
    if (left.observed.audit) {
        assert.deepEqual(Object.keys(left.observed.audit).sort(), Object.keys(right.observed.audit).sort());
        for (const field of ['eventType', 'targetType', 'targetId', 'result', 'reason', 'beforeSnapshot', 'afterSnapshot', 'metadata']) assert.deepEqual(right.observed.audit[field], left.observed.audit[field], `${left.id}: audit ${field}`);
        // IDs, request IDs and millisecond timestamps are checked against each
        // run's actual actor/request/time in http-scenarios, not equalized here.
        keys.push('audit-static-fields-and-shape');
    }
    return { id: left.id, compared: keys };
});
const report = {
    formatVersion: 1,
    result: 'pass',
    comparedCases: comparisons.length,
    completeErrorBodies: comparisons.filter((entry) => entry.compared.includes('body')).length,
    inputs: inputs.map(({ file, sha256 }) => ({ file, sha256 })),
    comparisons
};
writeFileSync(path.join(root, 'tmp/rust-r2a/http-comparison.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ result: 'pass', comparedCases: report.comparedCases, completeErrorBodies: report.completeErrorBodies }));
