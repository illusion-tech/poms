import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildCollationArtifacts } from './export-org-units-collation.mjs';

test('fixed Linux-compatible runtime reproduces the finite collation and context-lowercase oracle', () => {
    const artifacts = buildCollationArtifacts();
    for (const [path, text] of artifacts) assert.equal(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'), text);
    const golden = JSON.parse(artifacts.get('tools/rust-r2c/org-units-collation-golden.json'));
    assert.equal(golden.provenance.totalStrings, 804);
    assert.equal(golden.provenance.wellFormedStrings, 802);
    assert.equal(golden.oracles['zh-CN'].comparisonCount, 643204);
    assert.equal(golden.casing.length, 817);
    const sigma = golden.casing.find((value) => JSON.stringify(value.inputUnits) === JSON.stringify([65, 931, 55296, 65]));
    assert.deepEqual(sigma.expectedUnits, [97, 962, 55296, 97]);
});
