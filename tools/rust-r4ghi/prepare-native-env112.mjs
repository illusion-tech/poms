import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
assert.equal(process.platform, 'linux');
const root = '/home/wangzishi/.local/share/poms-r4ghi/private', sha = b => createHash('sha256').update(b).digest('hex');
assert(!fs.existsSync(root + '/business/g2-business12/main01/driver.lock'));
const state = JSON.parse(fs.readFileSync(root + '/business/g2-business12/main01/state.json')); assert(!state.activeFault && !state.blockedObservation);
const input = { kind: 'Root-reviewed-Native92-env-copy', phaseRun: 'source12-native01', rustEpoch: 'g2-business12', rustRun: 'main01', RustDriverFinished: true,
  sourceEnv: { file: root + '/native.env', rawBytesSha256: 'df58276d4ee31de989c35fc683774cc82b2b02c74763d83bd22be0d30b108787' } };
assert.equal(sha(fs.readFileSync(input.sourceEnv.file)), input.sourceEnv.rawBytesSha256);
const file = root + '/native-env-input112.json', bytes = Buffer.from(JSON.stringify(input, null, 2) + '\n');
fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ input: { file, rawBytesSha256: sha(bytes) }, SQL: false, HTTP: false }));
