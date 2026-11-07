import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

assert.equal(process.platform, 'linux');
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
assert.equal(fs.realpathSync(process.cwd()), root);
const priv = '/home/wangzishi/.local/share/poms-r4ghi/private';
const state = JSON.parse(fs.readFileSync(`${priv}/business/g2-business10/main01/state.json`));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(state.epoch, 'g2-business10'); assert.equal(state.run, 'main01');
assert(!state.cleaned && !state.cleanupPlan && !state.blockedObservation);
assert.equal(state.sourcePins.length, 404);
assert.equal(sha(JSON.stringify(state.sourcePins)), 'a379d62b5b583446b01f4a6bb3891b4bf9bdaf0e5966fb7a39dd7b07b643c589');
const candidateFile = `${priv}/business/g2-business10/main01/000091-candidate-source-binding10.json`;
const candidateBytes = fs.readFileSync(candidateFile);
assert.equal(sha(candidateBytes), '0a1096457d239cdb16c6f75cec54f5bee994e0d68df0303f0fd27d48c2b81344');
const candidate = JSON.parse(candidateBytes);
assert.deepEqual(candidate.sourcePins, state.sourcePins);
const processRecord = state.apiProcess.record;
assert.equal(processRecord.pid, 46874);
assert.equal(processRecord.binarySha256, '06849f6a47997e1b0dcef2b87c3a61baccb051ee9162933149921096ec04b3d2');
const stat = fs.readFileSync(`/proc/${processRecord.pid}/stat`, 'utf8');
assert.equal(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], processRecord.startTime);
assert.equal(fs.realpathSync(`/proc/${processRecord.pid}/exe`), processRecord.binary);
assert.equal(sha(fs.readFileSync(processRecord.binary)), processRecord.binarySha256);
const check = () => {
  for (const pin of state.sourcePins) {
    assert(!path.isAbsolute(pin.file) && !pin.file.split('/').includes('..'));
    assert.equal(sha(fs.readFileSync(`${root}/${pin.file}`)), pin.sha256, `Frozen source changed: ${pin.file}`);
  }
};
check();
const out = `${root}/docs/design/rust-r4ghi/retention/final10-source36`;
assert(!fs.existsSync(out), 'Never overwrite an earlier candidate packet');
fs.mkdirSync(out, { recursive: true });
const manifest = { kind: 'exact-raw-final10-frozen-source-packet', epoch: state.epoch, run: state.run,
  sourcePinsSHA256: sha(JSON.stringify(state.sourcePins)), files: state.sourcePins,
  purpose: 'Retain exact pre-normalization candidate source bytes for natural-period acceptance',
  businessDataIncluded: false, credentialsIncluded: false, binaryIncluded: false,
  binarySHA256: processRecord.binarySha256, G3Certified: false, G4Certified: false };
fs.writeFileSync(`${out}/sources.json`, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
const python = String.raw`import hashlib, json, pathlib, sys, zipfile
root, out = map(pathlib.Path, sys.argv[1:])
manifest = json.loads((out / 'sources.json').read_text())
target = out / 'source-packet.zip'
with zipfile.ZipFile(target, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for pin in manifest['files']:
        content = (root / pin['file']).read_bytes()
        assert hashlib.sha256(content).hexdigest() == pin['sha256']
        info = zipfile.ZipInfo(pin['file'], (1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, content, compresslevel=9)
with zipfile.ZipFile(target, 'r') as archive:
    assert archive.namelist() == [pin['file'] for pin in manifest['files']]
    assert archive.testzip() is None
    for pin in manifest['files']:
        assert hashlib.sha256(archive.read(pin['file'])).hexdigest() == pin['sha256']
print(json.dumps({'members': len(manifest['files']), 'exactRawBytesReadBack': True}))
`;
const execution = spawnSync('/usr/bin/python3', ['-c', python, root, out], { encoding: 'utf8', timeout: 120000 });
fs.writeFileSync(`${out}/pack-stdout.log`, execution.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(`${out}/pack-stderr.log`, execution.stderr ?? '', { flag: 'wx' });
assert.equal(execution.status, 0, 'Source packet failed; preserve partial originals');
check();
const pinFile = file => { const bytes = fs.readFileSync(`${out}/${file}`); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const receipt = { kind: 'actual-raw-candidate-code-retention-packet-created-and-fully-read-back', createdAt: new Date().toISOString(),
  epoch: state.epoch, run: state.run, frozenSourceFiles: 404, sourceStableDuringPackaging: true,
  files: ['sources.json', 'source-packet.zip', 'pack-stdout.log', 'pack-stderr.log'].map(pinFile),
  candidateOriginal: { file: candidateFile, rawBytesSha256: sha(candidateBytes) },
  retainedBinary: { file: processRecord.binary, rawBytesSha256: processRecord.binarySha256, actualRunningPIDVerified: true },
  databaseDataIncluded: false, credentialsIncluded: false, databaseRetentionAndResumePackage: 'still-required',
  periodPositiveAccepted: false, officialOperationDeliveryIncrement: 0, G3Certified: false, G4Certified: false };
fs.writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ kind: receipt.kind, frozenSourceFiles: 404, packet: receipt.files[1], databaseDataIncluded: false, G3Certified: false }));
