import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const captureName = process.argv[2] ?? 'pre-g3-user-fix01';
if (!/^pre-g3-user-fix\d+$/.test(captureName)) throw new Error('Unexpected capture directory');
const output = `tools/rust-r4ghi/independent/${captureName}`;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = [
  'apps/poms-api-rust/src/users/service.rs',
  'apps/poms-api-rust/src/users/store.rs',
  'apps/poms-api-rust/tests/users_database.rs',
];
const command = (...args) => {
  const result = spawnSync('git', args, { cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr.toString('utf8'));
  return result.stdout;
};
fs.mkdirSync(path.join(output, 'inputs'), { recursive: true });
const headBefore = command('rev-parse', 'HEAD').toString('utf8').trim();
const inputs = files.map((file, index) => {
  const bytes = fs.readFileSync(file);
  const snapshot = `${output}/inputs/${index + 1}-${path.basename(file)}`;
  fs.writeFileSync(snapshot, bytes, { flag: 'wx' });
  return { file, bytes: bytes.length, rawBytesSha256: hash(bytes), snapshot };
});
const diff = command('diff', '--', ...files);
fs.writeFileSync(path.join(output, 'product-diff.patch'), diff, { flag: 'wx' });
const result = {
  kind: 'independent-user-fix-source-pre-review-input-capture',
  capturedAt: new Date().toISOString(),
  headBefore,
  headAfter: command('rev-parse', 'HEAD').toString('utf8').trim(),
  inputs,
  allInputsStillMatchImmediatelyAfterCapture: inputs.every((pin) => hash(fs.readFileSync(pin.file)) === pin.rawBytesSha256),
  diff: { file: `${output}/product-diff.patch`, bytes: diff.length, rawBytesSha256: hash(diff) },
  currentCreationUsesBroadUniqueMapping: fs.readFileSync(inputs[0].snapshot, 'utf8').includes('if error.sqlstate() == Some("23505")'),
  runtimeAcceptanceExecuted: false,
  productModified: false,
};
fs.writeFileSync(path.join(output, 'source-inputs.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify(result)}\n`);
