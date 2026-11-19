// Exact correction before any M98, state mint or actual compilation. Preserve
// every first-attempt artifact and each old mirror before-image.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sourcePins, ownedFile } from './business/context.mjs';
import { helperGraph13 } from './construct-source13-bindings.mjs';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', M = '/home/wangzishi/projects/poms-rust-r4ghi', P = '/home/wangzishi/.local/share/poms-r4ghi/private', sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.platform, 'linux'); const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--input' && args[2] === '--approved-input-sha' && args[4] === '--execute');
const inputRaw = ownedFile(args[1]); assert.equal(sha(inputRaw), args[3]); const input = JSON.parse(inputRaw);
const pin = file => ({ file, rawBytesSha256: sha(ownedFile(file)) }), read = p => { const raw = ownedFile(p.file); assert.equal(sha(raw), p.rawBytesSha256); return JSON.parse(raw); }, same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
assert.equal(input.kind, 'Root-approved-unexecuted-Source13-build-revision189'); assert.equal(input.G3Certified, false);
const canonical = R + '/docs/design/rust-r4ghi/source13-g2-freeze136.json', oldApprovalRaw = ownedFile(canonical); assert.equal(sha(oldApprovalRaw), 'f0a8cf9ce22bb032bc28ac599d6ff00946d6013e29084975a265048faa849115'); const oldApproval = JSON.parse(oldApprovalRaw);
const frozenPin = { file: P + '/source13-preparation183/freeze183-receipt.json', rawBytesSha256: 'fc4c5111193edcad5daab7319b7153affb324916231f6efed4518ef8bcbecc7e' }, frozen = read(frozenPin), oldSourcesRaw = ownedFile(frozen.sourcePins.file), oldSources = read(frozen.sourcePins), oldHelpers = read(frozen.helperH0);
assert.equal(frozen.sourcePinsSHA256, '937a55affa775787d7507b94f3fc425affa9ec700c1aaabf449f564ee8d203fe'); assert.deepEqual(sourcePins(), oldSources); assert.deepEqual(helperGraph13(), oldHelpers);
const partial = { file: P + '/source13-build180/partial180.json', rawBytesSha256: 'e65f83ef5c7a3c57af0fbece93abffc53188034b061ef4e0f40f185fbaa0f0de' }; read(partial); assert.deepEqual(fs.readdirSync(P + '/source13-build180'), ['partial180.json']);
for (const item of [P + '/business/g2-business13/main01/state.json', P + '/rust-api136-process.json', P + '/business/g2-business12/main01/driver.lock', P + '/migration98-136/poms_r4ghi_native', P + '/migration98-136/poms_r4ghi_rust']) assert(!fs.existsSync(item));
const drift = read(input.drift113); assert.equal(input.drift113.rawBytesSha256, '7b1d28630a21c34f39e35fe3ea38694ff8b226b3b82f531f0c4f0b494ec0daf0'); assert.equal(drift.unexplained.length, 3); read(input.independentApproval);
const oldDriverFile = R + '/tools/rust-r4ghi/build-source13-180.mjs', oldDriver = ownedFile(oldDriverFile); assert.equal(sha(oldDriver), 'd35ef3b022c0e9905121d794781992978079f3fb0490ee7333fdc6450744dbaa');
let expectedDriver = oldDriver.toString(); for (const [a, b] of [["P + '/source13-build180'", "P + '/source13-build180-02'"], ["R + '/tools/rust-r4ghi/build-source13-180.mjs'", "R + '/tools/rust-r4ghi/build-source13-180-02.mjs'"]]) { assert.equal(expectedDriver.split(a).length, 2); expectedDriver = expectedDriver.replace(a, b); }
assert.deepEqual(ownedFile(input.newDriver.file), Buffer.from(expectedDriver)); assert.deepEqual(input.newDriver, pin(R + '/tools/rust-r4ghi/build-source13-180-02.mjs'));
const changes = drift.unexplained.map(item => { const target = path.resolve(M, item.file); assert(target.startsWith(M + '/')); assert.equal(fs.realpathSync(path.dirname(target)), path.dirname(target)); const before = ownedFile(target), source = ownedFile(R + '/' + item.file); assert.equal(sha(before), item.mirrorSHA256); assert.equal(sha(source), item.sourceSHA256); return { item, target, before, source }; });
const out = P + '/source13-preparation189'; fs.mkdirSync(out, { mode: 0o700 });
function write(file, raw, mode = 0o600) { fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 }); fs.writeFileSync(file, raw, { flag: 'wx', mode }); return pin(file); }
const savedApproval = write(out + '/preserved/source13-g2-freeze136-first.json', oldApprovalRaw), savedSources = write(out + '/preserved/sourcePins183.json', oldSourcesRaw), savedFrozen = write(out + '/preserved/freeze183-receipt.json', ownedFile(frozenPin.file));
const mirrors = [];
for (const { item, target, before, source } of changes) { const saved = write(out + '/mirror-before/' + item.file, before); assert.equal(saved.rawBytesSha256, item.mirrorSHA256); fs.writeFileSync(target, source); assert.equal(sha(ownedFile(target)), item.sourceSHA256); mirrors.push({ file: item.file, originalMirrorSHA256: item.mirrorSHA256, preservedBefore: saved, synchronizedToRootSHA256: item.sourceSHA256 }); }
const next = structuredClone(oldApproval); next.supportingTools.source13BuildRunner = input.newDriver; next.frozenAtUTC = new Date().toISOString();
next.preMintBuildRevision189 = { reason: 'Preserved older mirror metadata/contract inputs; first180 stopped before any copy or Cargo', supersedesUnexecutedApproval: savedApproval, originalApprovalLocation: frozen.approval, originalSources: savedSources, originalFreezeReceipt: savedFrozen, firstBuildPartial: partial,
  independentDrift: input.drift113, independentApproval: input.independentApproval, mirrors, newDriver: input.newDriver, corrector: pin(R + '/tools/rust-r4ghi/refreeze-unexecuted189.mjs'), M98Executed: false, Source13StateMinted: false, oldPartialOrOldFreezeRewritten: false };
const nextRaw = Buffer.from(JSON.stringify(next, null, 2) + '\n'); fs.writeFileSync(canonical, nextRaw); const approvalPin = pin(canonical), sources = sourcePins(); assert.equal(sources.length, oldSources.length);
const diff = sources.filter((item, index) => item.file !== oldSources[index].file || item.sha256 !== oldSources[index].sha256); assert.equal(diff.length, 1); assert.equal(diff[0].file, 'docs/design/rust-r4ghi/source13-g2-freeze136.json'); assert.deepEqual(helperGraph13(), oldHelpers); assert.equal(oldApproval.actualM98Applied, false); assert.equal(next.actualM98Applied, false);
const newSources = write(out + '/sourcePins.json', Buffer.from(JSON.stringify(sources, null, 2) + '\n'));
const receipt = { kind: 'Root-actual-pre-mint-unexecuted-G2-build-revision189', approval: approvalPin, sourcePins: newSources, sourceCount: sources.length, sourcePinsSHA256: sha(JSON.stringify(sources)), helperH0: frozen.helperH0, helperCount: oldHelpers.length,
  onlySourceLeafChanged: diff[0].file, originalApprovalRetained: savedApproval, originalSourcesRetained: savedSources, originalFreezeRetained: savedFrozen, mirrors, originalBuildPartial: partial, newDriver: input.newDriver, actualCargoExecuted: false, actualDBStateNotQueried: true, M98Executed: false, Source13StateMinted: false, G3Certified: false, G4Certified: false };
const receiptPin = write(out + '/receipt189.json', Buffer.from(JSON.stringify(receipt, null, 2) + '\n')); console.log(JSON.stringify({ completed: true, receipt: receiptPin, ...receipt }));
