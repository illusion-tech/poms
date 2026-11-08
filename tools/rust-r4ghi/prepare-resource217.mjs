// Current13 fixed originals for119, prepared without applying H1 or changing state.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/business/g2-business13/main01', O = D + '/tool119-inputs217', F = D + '/tool119-observe216-03';
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH); assert(!fs.existsSync(O));
const read = pin => { assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256)); const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(pin.file), path.resolve(pin.file)); const raw = fs.readFileSync(pin.file); assert.equal(sha(raw), pin.rawBytesSha256); return raw; };
const json = pin => JSON.parse(read(pin)), pinOnly = p => ({ file: p.file, rawBytesSha256: p.rawBytesSha256 });
const pinFile = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
const nonce = randomUUID(), lock = D + '/driver.lock'; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'FS-only-prepare-exact119-inputs217' }) + '\n', { flag: 'wx', mode: 0o600 });
try {
  const observation = json({ file: F + '/receipt216-03.json', rawBytesSha256: '3f040b87501c6776ca9b02a44a5177277172f7880ce9e22c8421b51356866a91' });
  const entryState = json(observation.entryState), stateFile = D + '/state.json', stateRaw = fs.readFileSync(stateFile);
  assert.equal(sha(stateRaw), observation.entryState.rawBytesSha256); assert(!entryState.toolAdmission119 && !entryState.activeFault && !entryState.blockedObservation);
  const baseRegistry = pinOnly(entryState.consumerAdmission54.registry), registry = json(baseRegistry);
  assert.equal(baseRegistry.rawBytesSha256, '23cc54f891fb5200a1bad30083f75805e27a1d046096705381034ff32493971c');
  const producer = json(registry.producerState), source10 = registry.sourceHistory.find(p => p.epoch === 'g2-business10'), source12 = registry.sourceHistory.find(p => p.epoch === 'g2-business12');
  assert(source10 && source12); const bornState = json(source10.sourceState), record = producer.fixtures.sharedSourceFollowup58;
  assert.deepEqual(record, entryState.fixtures.sharedSourceFollowup58); assert.equal(record.sourcePinsSHA256, source12.sourcePinsSHA256);
  const receipts = [];
  const visit = value => { if (!value || typeof value !== 'object') return;
    if (typeof value.file === 'string' && path.isAbsolute(value.file) && /^[a-f0-9]{64}$/.test(value.rawBytesSha256 ?? '')) {
      const p = pinOnly(value); read(p); if (!receipts.some(old => old.file === p.file && old.rawBytesSha256 === p.rawBytesSha256)) receipts.push(p);
    }
    for (const child of Object.values(value)) visit(child);
  }; visit(record); assert.equal(receipts.length, 16);
  const projectIds = ['4d9e57ad-4890-4f53-80da-c6d224ce576b', '51d60c76-6de2-432a-8714-10e3ed3234f3'];
  const projectBirths = projectIds.map(projectId => {
    const owned = Object.values(bornState.owned).find(row => row.database === 'poms_r4ghi_rust' && row.table === 'project' && row.key.length === 1 && row.key[0] === projectId);
    assert(owned && !owned.deleted && owned.proof.transport === 'HTTP' && owned.proof.beforeAbsent && owned.proof.responseComplete);
    const match = /^snapshot-(\d{6}-http)-before\.json$/.exec(path.basename(owned.proof.beforeSnapshot.file)); assert(match);
    const httpReceipt = pinFile(R + '/tmp/rust-r4ghi/business/' + source10.epoch + '/' + source10.run + '/' + match[1] + '-http.json');
    const http = json(httpReceipt); assert.equal(http.requestId, owned.proof.requestId); assert.equal(http.operationId, 'ProjectController_create'); assert.equal(http.status, owned.proof.status);
    return { projectId, source: source10, beforeSnapshot: pinOnly(owned.proof.beforeSnapshot), afterSnapshot: pinOnly(owned.proof.afterSnapshot), httpReceipt };
  });
  const preserved = json({ file: P + '/source13-tool119-h0-215/receipt215.json', rawBytesSha256: 'ce85e8a8f3ac77b779d064ecb56df8c57f75d1d995a5fc83a30df84306f0a9f5' });
  const H0Copies = preserved.files.map(value => ({ file: value.file, pin: pinOnly(value.preserved) })); assert.equal(H0Copies.length, 195); for (const p of H0Copies) read(p.pin);
  const planInputs = { kind: 'actual-fixed-source13-inputs-for-future-reviewed-tool119-217', entryState: pinOnly(observation.entryState), beforeSnapshot: pinOnly(observation.beforeSnapshot), afterSnapshot: pinOnly(observation.afterSnapshot),
    baseRegistry, baseB0: pinOnly(registry.consumer.candidateReceipt), baseB1: pinOnly(preserved.admittedB1), sourcePins: pinOnly(registry.consumer.sourcePins), H0: pinOnly(registry.consumer.helperPins), H0Copies,
    apiProcess: pinOnly(registry.consumer.apiProcess), schemaBinding: entryState.schemaComparison108,
    resource: { registryPath: '/fixtures/sharedSourceFollowup58', recordProducerSource: source12, recordSHA256: sha(JSON.stringify(record)), projectIds, projectBirths, receipts },
    nodeExecutable: pinFile(process.execPath), H1: null, independentReview: null, executionTool: null, deltaManifests: null,
    H1Admitted: false, source416OrH0Changed: false, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false };
  fs.mkdirSync(O, { mode: 0o700 }); const file = O + '/fixed-inputs217.json'; fs.writeFileSync(file, JSON.stringify(planInputs, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  assert.deepEqual(fs.readFileSync(stateFile), stateRaw);
  console.log(JSON.stringify({ fixedInputs: pinFile(file), originalH0Copies: 195, actualProjectBirths: projectBirths.length, exact58Receipts: receipts.length, source416AndH0AndStateUnchanged: true, H1Admitted: false }));
} finally { const owner = JSON.parse(fs.readFileSync(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); fs.unlinkSync(lock); }
