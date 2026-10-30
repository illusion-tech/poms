// Read-only binding of an already successful build, not a runtime certificate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const tag = process.argv[2]; assert(/^candidate[0-9]{2}$/.test(tag ?? ''));
assert.equal(process.cwd(), '/home/wangzishi/projects/poms-rust-r2l');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const file = `tmp/rust-r2l/shared-uow-${tag}-binary-source.json`; assert(!fs.existsSync(file));
const bindingFile = `tmp/rust-r2l/rust-${tag}-binary-source.json`, raw = fs.readFileSync(bindingFile), binding = JSON.parse(raw);
assert.equal(binding.result, 'pass-build-source-binding-not-runtime');
for (const row of binding.files) assert.equal(sha(fs.readFileSync(row.file)), row.rawBytesSha256);
const source = binding.files.find(row => row.file === 'tools/rust-r2l/l-shared-uow-probe.rs'); assert(source);
const binary = '/home/wangzishi/.local/share/poms-r2l/target/release/examples/l_shared_uow_probe';
const stat = fs.lstatSync(binary); assert(stat.isFile() && !stat.isSymbolicLink()); const bytes = fs.readFileSync(binary);
const report = { formatVersion: 1, result: 'pass-validation-example-build-binding-not-runtime', tag, at: new Date().toISOString(),
    successfulFiveStepBuildBinding: { file: bindingFile, rawBytesSha256: sha(raw) }, source,
    binary: { file: binary, bytes: bytes.length, rawBytesSha256: sha(bytes) },
    mainApplication: binding.binary, productHttpApiAdded: false, runtimeExecuted: false };
fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ result: report.result, file, source, binary: report.binary, mainApplication: report.mainApplication }));
