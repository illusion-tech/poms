import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url)), sha = value => createHash('sha256').update(value).digest('hex'), source = here + '/proposed/tools/rust-r4ghi/probe-m98-frozen-external.mjs', before = sha(fs.readFileSync(source)), steps = [];
for (const [name, args] of [['syntax', ['--check', source]], ['help', [source, '--help']], ['pure', ['--test', '--test-reporter=tap', here + '/frozen-external.test.mjs']]]) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' }); fs.writeFileSync(here + '/' + name + '.stdout.log', result.stdout); fs.writeFileSync(here + '/' + name + '.stderr.log', result.stderr); assert.equal(result.status, 0, name); if (name === 'pure') assert(/^# pass 10$/m.test(result.stdout) && /^# fail 0$/m.test(result.stdout)); steps.push({ name, exitCode: result.status });
}
assert.equal(before, sha(fs.readFileSync(source))); const validation = { kind: 'I-M98-external-negative-pure-only-validation', node: process.version, steps, purePass: 10, pureFail: 0, sourceStable: true, actualMode: false, SQLConnections: 0, HTTPRequests: 0, RootWrites: 0, actualSource13: null, actualM98Proof: null, G3Certified: false };
fs.writeFileSync(here + '/validation.json', JSON.stringify(validation, null, 2) + '\n'); process.stdout.write(JSON.stringify(validation) + '\n');
