// Author static/pure and actual139 FS-pin verification only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url)), sha = value => createHash('sha256').update(value).digest('hex'), relative = 'tools/rust-r4ghi/construct-source13-bindings.mjs', source = here + '/proposed/' + relative, before = sha(fs.readFileSync(source)), steps = [];
const run = (name, args) => { const result = spawnSync(process.execPath, args, { encoding: 'utf8' }); fs.writeFileSync(here + '/' + name + '.stdout.log', result.stdout); fs.writeFileSync(here + '/' + name + '.stderr.log', result.stderr); assert.equal(result.status, 0, name); steps.push({ name, exitCode: 0 }); return result.stdout; };
run('syntax13', ['--check', source]); run('help13', [source, '--help']); const output = run('pure13', ['--test', '--test-reporter=tap', here + '/construct13.test.mjs']); assert(/^# pass 12$/m.test(output) && /^# fail 0$/m.test(output));
const P = '/home/wangzishi/.local/share/poms-r4ghi/private/retention/epoch12-before-source13-139', file = P + '/index.json', raw = fs.readFileSync(file); assert.equal(sha(raw), 'fed889a2c467945656d7c317f006b5ba2bc9780435459460863b3735dacb17b7'); const index = JSON.parse(raw);
assert.equal(sha(fs.readFileSync(index.frozenState.file)), 'ee7371dc4fc5d388f6898fb1c6eb90bebb6404eca6c31d23599469445804a628'); assert.equal(sha(fs.readFileSync(index.retainedSnapshot.file)), '106c66efc668090d4605b6a953ebfddfa65aa2df8c13c3e7531a51bf57130d15');
assert.equal(before, sha(fs.readFileSync(source))); const receipt = { kind: 'I-Source13-constructor03-pure-and-FS-only-validation', nodeVersion: process.version, steps, purePass: 12, pureFail: 0, constructorSourceStable: true, actual139IndexStateAfterPinsVerified: true, constructorsExecutedAgainstRoot: false, RootWrites: 0, SQLConnections: 0, HTTPRequests: 0, stateCounterUsed: false, actualSource13: null, actualB0: null, actualPlan: null, actualR3: null, actualB1: null, G3Certified: false };
fs.writeFileSync(here + '/validation13.json', JSON.stringify(receipt, null, 2) + '\n'); process.stdout.write(JSON.stringify(receipt) + '\n');
