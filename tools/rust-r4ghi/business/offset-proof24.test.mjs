import test from 'node:test';
import assert from 'node:assert/strict';
import { instantNanoseconds } from './creator-proofs.mjs';
import { operationMap } from './pure.mjs';
import fs from 'node:fs';

test('actual PG +08 and payload Z represent the exact same creation instant', () => {
  assert.equal(instantNanoseconds('2026-11-07T20:29:05.476+08:00'), instantNanoseconds('2026-11-07T12:29:05.476Z'));
  assert.equal(instantNanoseconds('2026-11-07T04:29:05.476123-08:00'), instantNanoseconds('2026-11-07T12:29:05.476123Z'));
});
test('offset comparison preserves microseconds and nanoseconds rather than Date.parse milliseconds', () => {
  const base = instantNanoseconds('2026-11-07T12:29:05.476123Z');
  assert.equal(instantNanoseconds('2026-11-07T20:29:05.476124+08:00') - base, 1000n);
  assert.equal(instantNanoseconds('2026-11-07T20:29:05.476123001+08:00') - base, 1n);
});
test('signed offsets roll real Gregorian day/year boundaries and pre-epoch fractions exactly', () => {
  assert.equal(instantNanoseconds('1970-01-01T00:00:00Z'), 0n);
  assert.equal(instantNanoseconds('1969-12-31T23:59:59.999999Z'), -1000n);
  assert.equal(instantNanoseconds('2024-03-01T00:30:00.000001+01:00'), instantNanoseconds('2024-02-29T23:30:00.000001Z'));
  assert.equal(instantNanoseconds('2027-01-01T00:30:00+08:00'), instantNanoseconds('2026-12-31T16:30:00Z'));
  assert.equal(instantNanoseconds('2000-03-01T00:00:00+00:30'), instantNanoseconds('2000-02-29T23:30:00Z'));
});
test('invalid civil dates, unknown offsets and truncated/overprecise inputs fail closed', () => {
  for (const value of ['2026-02-29T00:00:00Z', '1900-02-29T00:00:00Z', '2026-11-31T00:00:00Z', '2026-11-07T24:00:00Z',
    '2026-11-07T12:29:05', '2026-11-07T12:29:05+24:00', '2026-11-07T12:29:05+08:60', '2026-11-07T12:29:05.1234567890Z', null]) {
    assert.throws(() => instantNanoseconds(value));
  }
});
test('all fixed ownership command IDs exist in the current canonical OpenAPI', () => {
  const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
  const specFile = `${root}/libs/shared/api-spec/openapi.json`;
  // Offline tool tests in Root WSL use the exact review mount; no API request.
  const file = process.platform === 'linux' ? '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/libs/shared/api-spec/openapi.json' : specFile;
  const operations = operationMap(JSON.parse(fs.readFileSync(file)));
  for (const name of ['creator-ownership.mjs', 'legacy-compatibility.mjs', 'ownership-race.mjs', 'pause-boundary23.mjs']) {
    for (const match of fs.readFileSync(new URL(`./${name}`, import.meta.url), 'utf8').matchAll(/['"]([A-Za-z]+Controller_[A-Za-z0-9]+)['"]/g)) assert(operations.has(match[1]), match[1]);
  }
  assert(operations.has('ProjectController_updateBasicInfo')); assert(!operations.has('ProjectController_update'));
});
