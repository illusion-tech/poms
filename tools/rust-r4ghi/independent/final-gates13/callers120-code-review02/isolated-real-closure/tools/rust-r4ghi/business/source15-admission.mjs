// Native synchronous fixed15 verification. No top-level I/O or effect authority.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { C15, GH15, sha15, pin15, pinOnly15, samePin15, pointer15, assertPlanShape15, assertPreAPIShape15, assertApprovals15, scope15, exactDeltas15, assertStateTransfer15, resourceEntries15, registryBody15, admittedBody15, bootstrapBody15, producerHistory15, assertRetainedOwnership15, assertRawHistoryIdentity15, cargoEnvironment15 } from './source15-admission-core.mjs';
import { readPin15, json15, rows15, binary15, leaf15, helpers15, cargoFiles15, verifyRetained14For15 } from './retained-source14-for15.mjs';
import { assertDataEqual252, resourceProjection252 } from './same-m98-code-core252.mjs';
const data14 = C15.private + '/business/g2-business14/main01', data15 = C15.private + '/business/g2-business15/main01';
const same = (a, b) => a?.file === b?.file && a?.rawBytesSha256 === b?.rawBytesSha256;
function inside(root, file) { assert(file.startsWith(root + '/')); assert.equal(fs.realpathSync(file), file); }
export function parseProc15(text) { const a = text.indexOf(' ('), b = text.lastIndexOf(') '); assert(a > 0 && b > a); const tail = text.slice(b + 2).trim().split(/\s+/); assert(tail.length >= 20 && /^\d+$/.test(tail[19])); return { pid: Number(text.slice(0, a)), startTime: tail[19] }; }
function independent(review, kind) { assert.equal(review.kind, kind); assert(typeof review.author === 'string' && typeof review.reviewer === 'string' && review.author !== review.reviewer); assert.equal(review.G3Certified, false); assert.equal(review.G4Certified, false); }
export function verifyProductComposition15(pin, parent, source, compile) {
  const c = json15(pin); assert.equal(c.kind, 'Root-finite-Source14-to15-product-composition119'); assert.equal(c.producerEpoch, C15.producerEpoch); assert.equal(c.consumerEpoch, C15.consumerEpoch);
  assert.equal(c.schemaChange, false); assert.equal(c.migrationReplay, false); assert.equal(c.businessBaselineReset, false);
  const paths = ['apps/poms-api-rust/src/project_operating/context.rs', 'apps/poms-api-rust/src/project_operating/restatement.rs'];
  const expectedBefore = { [paths[0]]: 'f0b18b53af2d3288a7b4078f15280a23cc8821a1d2792519733f64d935aaa0ac', [paths[1]]: '7251664a65dd189b38ea9349ba6e54b8a2ea84ca307d128e3b01f29ba446890c' };
  assert.deepEqual(c.entries.map(x => x.file).sort(), paths);
  const review = json15(c.independentReview); assert.equal(c.independentReview.rawBytesSha256, 'd712445a611b1795034fb005ca22738ca4288beba3858e7559356877b26356c8'); assert.equal(review.kind, 'non-author-two-leaf-candidate-code-review34402'); assert.equal(review.verdict, 'approved-two-leaf-candidate-code-only'); assert.equal(review.reviewerIsProductAuthor, false); assert.equal(review.baseEpoch, 14); assert.equal(review.successorEpoch, 15); assert.equal(review.finiteRootPromotion.eligible, true); assert.equal(review.finiteRootPromotion.oldSource14RuntimeMayBeRebound, false);
  const product = json15(review.candidateManifest); assert.equal(review.candidateManifest.rawBytesSha256, 'ff0521e144ab1eb9aa95da0c7ff8f97d7b7cbd76f94082457bf628fd54d5888f'); assert.equal(product.kind, 'H-author-code-candidate-corrective344'); assert.equal(product.edition, 'code02'); samePin15(c.technicalG1, product.formalFreeze); readPin15(c.technicalG1);
  for (const e of c.entries) { assert.equal(e.operation, 'MOD'); assert.equal(e.beforeSHA256, expectedBefore[e.file]); assert(/^[a-f0-9]{64}$/.test(e.afterSHA256)); assert.notEqual(e.afterSHA256, e.beforeSHA256); pin15(e.candidate); assert.equal(e.candidate.rawBytesSha256, e.afterSHA256); readPin15(e.candidate); leaf15(C15.root, e.file, e.afterSHA256);
    samePin15(e.productManifest, review.candidateManifest); const node = pointer15(product, e.productPointer); assert(product.products.includes(node)); assert.equal(node.file, e.file); assert.equal(node.beforeRawBytesSha256, e.beforeSHA256); assert.equal(node.afterRawBytesSha256, e.afterSHA256); samePin15(node.candidate, e.candidate); readPin15(node.before);
    const approved = review.approvedProductUnion.find(x => x.file === e.file); assert(approved); assert.equal(approved.operation, 'MOD'); assert.equal(approved.beforeRawBytesSha256, e.beforeSHA256); assert.equal(approved.afterRawBytesSha256, e.afterSHA256); samePin15(approved.candidate, e.candidate);
  }
  const delta = c.entries.map(({ file, beforeSHA256, afterSHA256 }) => ({ file, beforeSHA256, afterSHA256 }));
  exactDeltas15(parent.source14, source, delta); exactDeltas15(parent.compile14, compile, delta);
  return delta;
}
export function verifyHelperComposition15(pin, parent, expectedHelpers) {
  const c = json15(pin); assert.equal(c.kind, 'Root-final-Source15-H3-composition119'); assert.equal(c.baseHelperPins.rawBytesSha256, C15.helper14SHA); assert.deepEqual(json15(c.baseHelperPins), parent.helper14);
  assert(expectedHelpers.length > 222, 'Core-only222 is not the final approved H3'); assert.equal(c.coreContributionOnly, false);
  assert.deepEqual(json15(c.finalHelperPins), expectedHelpers);
  const net = json15(c.netProducts), frames = json15(c.orderedAuthority), map = new Map(parent.helper14.map(x => [x.file, x.sha256]));
  assert(Array.isArray(net) && Array.isArray(frames)); assert(frames.length >= 8);
  for (const f of frames) {
    assert(f.file.startsWith('tools/rust-r4ghi/business/') && !f.file.slice('tools/rust-r4ghi/business/'.length).includes('/'));
    assert(['ADD', 'MOD'].includes(f.operation)); assert.equal(map.get(f.file) ?? null, f.beforeSHA256); assert.notEqual(f.beforeSHA256, f.afterSHA256); assert.equal(f.operation, f.beforeSHA256 === null ? 'ADD' : 'MOD');
    assert.equal(f.candidate.rawBytesSha256, f.afterSHA256); readPin15(f.candidate);
    const product = json15(f.componentManifest), node = pointer15(product, f.productPointer); assert(node); assert.equal(node.file, f.file); assert.equal(node.beforeSHA256, f.beforeSHA256); assert.equal(node.afterSHA256, f.afterSHA256);
    const review = json15(f.independentReview); independent(review, 'non-author-source15-H3-step119-review'); assert.equal(review.verdict, 'approved-bounded-step'); samePin15(review.componentManifest, f.componentManifest); samePin15(review.technicalG1, f.technicalG1); readPin15(f.technicalG1);
    assert(review.entries.some(e => e.file === f.file && e.beforeSHA256 === f.beforeSHA256 && e.afterSHA256 === f.afterSHA256 && e.productPointer === f.productPointer));
    map.set(f.file, f.afterSHA256);
  }
  const final = [...map].map(([file, sha256]) => ({ file, sha256 })).sort((a, b) => a.file < b.file ? -1 : 1);
  assert.deepEqual(final, expectedHelpers, 'All final H3 leaves must be explained by approved ordered steps');
  const deltas = net.map(e => { assert.deepEqual(Object.keys(e).sort(), ['afterSHA256', 'beforeSHA256', 'candidate', 'file', 'operation']); assert.equal(e.operation, e.beforeSHA256 === null ? 'ADD' : 'MOD'); assert.equal(e.candidate.rawBytesSha256, e.afterSHA256); readPin15(e.candidate); return { file: e.file, beforeSHA256: e.beforeSHA256, afterSHA256: e.afterSHA256 }; });
  exactDeltas15(parent.helper14, expectedHelpers, deltas);
  const review = json15(c.independentReview); independent(review, 'non-author-source15-H3-composition119-review'); assert.equal(review.verdict, 'approved-bounded-composition'); samePin15(review.netProducts, c.netProducts); samePin15(review.orderedAuthority, c.orderedAuthority); samePin15(review.finalHelperPins, c.finalHelperPins);
  assert.equal(review.finalHelperCount, final.length); assert.equal(review.allKnownSuccessorContributionsIncluded, true);
  return { helperDeltas: deltas, frames, final };
}
function checkTooling15(p, helpers) {
  const manifest = json15(p.tooling.manifest), review = json15(p.tooling.independentCodeReview);
  assert.equal(manifest.kind, 'source15-admission119-code-candidate'); independent(review, 'non-author-source15-admission119-code-review'); samePin15(review.toolingManifest, p.tooling.manifest); assert.equal(review.complete119CodeReady, true); assert.equal(review.actualG2Authorized, false);
  assert.equal(new Set(p.tooling.executionSources.map(x => x.file)).size, 14);
  assert.equal(manifest.production.length, 14);
  for (const e of manifest.production) { const supplied = p.tooling.executionSources.find(x => x.file === C15.root + '/' + e.file); assert(supplied); assert.equal(supplied.rawBytesSha256, e.afterSHA256); readPin15(supplied); if (e.group === 'H3') assert.equal(helpers.find(x => x.file === e.file)?.sha256, e.afterSHA256); }
}
const canonicalInputs = (list, root) => list.map(x => ({ file: path.posix.relative(root, x.file), sha256: x.sha256 ?? x.rawBytesSha256 })).sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
function verifyRustExecutionHistory15(binding, parent, sourcePin, compilePin) {
  const history = json15(binding.rustExecutionHistory), review = json15(binding.rustExecutionReview);
  assert.equal(history.kind, 'Root-actual-raw-build119-execution-history'); assert.equal(history.namespace, C15.namespace);
  assert.deepEqual(history.modes.map(x => x.mode), ['inventory-copy', 'checks-build']);
  for (const k of ['actualHelperBinding', 'actualAPI15', 'actualState15']) assert.equal(history[k], null);
  assert.equal(review.kind, 'non-author-actual-raw-build119-history-readback'); assert.equal(review.verdict, 'approved-raw-build-only'); assert.equal(review.reviewerIsRootExecutor, false); samePin15(review.history, binding.rustExecutionHistory); samePin15(review.rawPair, history.rawPair); samePin15(review.sourcePins, sourcePin); samePin15(review.compilePins, compilePin); assert.equal(review.actualEightCargoCommandsVerified, true); assert.equal(review.actualSource15Admission, false); assert.equal(review.G3, false); assert.equal(review.G4, false);
  const archive = json15(parent.archive344), archivalHelpers = new Map(archive.files.filter(x => x.relative.startsWith('tools/rust-r4ghi/business/')).map(x => [x.relative, x.archive]));
  for (const m of history.modes) {
    const input = json15(m.input), approval = json15(m.approval), intent = json15(m.intent), complete = json15(m.complete);
    assert.equal(input.kind, 'Root-source15-119-build-input'); assert.equal(input.mode, m.mode); assert.equal(approval.kind, 'Root-exact-source15-119-build'); samePin15(approval.input, m.input); assert.equal(approval.mode, m.mode); samePin15(approval.toolingManifest, input.tooling.manifest);
    assert.equal(approval.stateMinted, false); assert.equal(approval.domainHTTP, false); assert.equal(approval.ordinaryContextCreated, false); assert.equal(approval.runsCargo, m.mode === 'checks-build'); assert.equal(approval.mirrorSourceCopy, m.mode === 'inventory-copy'); assert.equal(approval.helperFSBinding, false);
    samePin15(intent.input, m.input); samePin15(intent.approval, m.approval); assert.equal(intent.mode, m.mode);
    assert.equal(complete.kind, 'actual-source15-build-mode-complete119'); assert.equal(complete.mode, m.mode); samePin15(complete.input, m.input); samePin15(complete.approval, m.approval); samePin15(complete.result, m.mode === 'inventory-copy' ? history.inventory : history.rawPair); assert.equal(complete.Source15Admitted, false);
    assert.equal(m.intent.file, input.outputDirectory + '/intent.json'); assert.equal(m.complete.file, input.outputDirectory + '/complete.json');
    if (m.mode === 'checks-build') samePin15(input.inventory, history.inventory); else assert.equal(input.inventory, null);
    assert.equal((m.mode === 'inventory-copy' ? history.inventory : history.rawPair).file, input.outputDirectory + (m.mode === 'inventory-copy' ? '/inventory-copy.json' : '/build-pair.json'));
    assert.equal(input.retirement14, null); assert.equal(input.helperPins, null); assert.equal(input.preAPIPlan, null); assert.equal(input.buildPair, null);
    assert.deepEqual(json15(input.currentHelperPins), parent.helper14); assert.equal(input.currentHelperPins.rawBytesSha256, C15.helper14SHA);
    for (const p of parent.helper14) { const stored = archivalHelpers.get(p.file); assert(stored); assert.equal(stored.rawBytesSha256, p.sha256); readPin15(stored); }
    const manifest = json15(input.tooling.manifest), codeReview = json15(input.tooling.independentCodeReview); assert.equal(manifest.kind, 'source15-admission119-code-candidate'); assert.equal(manifest.production.length, 1); assert.equal(manifest.production[0].file, 'tools/rust-r4ghi/source15-admission119/build-source15.mjs'); assertRawHistoryIdentity15(m.mode, manifest.production[0].afterSHA256, input.tooling.manifest.rawBytesSha256, manifest.edition);
    assert.equal(codeReview.kind, 'non-author-source15-admission119-code-review'); samePin15(codeReview.toolingManifest, input.tooling.manifest); assert.equal(codeReview.rawBuildCodeReady, true); assert.deepEqual(codeReview.coveredModes, ['inventory-copy', 'checks-build']); assert.equal(codeReview.actualG2Authorized, false);
    assert.equal(input.tooling.executionSources.length, 1); assert.equal(m.codeMappings.length, 1); const declared = input.tooling.executionSources[0], mapping = m.codeMappings[0]; assert.equal(mapping.target, declared.target); assert.equal(mapping.original.file, C15.root + '/' + mapping.target); samePin15(mapping.original, declared); samePin15(mapping.original, input.tooling.entry); assert.equal(mapping.original.rawBytesSha256, manifest.production[0].afterSHA256);
    assert(mapping.retained.file.startsWith(C15.private + '/')); assert.notEqual(mapping.retained.file, mapping.original.file); assert.equal(mapping.retained.rawBytesSha256, mapping.original.rawBytesSha256); readPin15(mapping.retained);
    // Never read mapping.original as current code: it was truthfully executed
    // at that path and may since have an independently approved successor.
  }
  const pair = json15(history.rawPair); assert.equal(pair.kind, 'actual-source15-eight-Cargo-steps119'); samePin15(pair.inventory, history.inventory); assert.equal(pair.helperPins, null); assert.equal(pair.NodeHelpersWereCargoInputs, false); samePin15(pair.inventory, binding.Root.receipt); samePin15(pair.Root, binding.Root.cargoReceipt); samePin15(pair.mirror, binding.mirror.receipt);
  const inventory = json15(history.inventory); samePin15(inventory.sourcePins, sourcePin); samePin15(inventory.compilePins, compilePin);
  return history;
}
export function verifyBuild15(consumer, source, compile, helpers, parent) {
  const b = json15(consumer.buildBinding); assert.equal(b.kind, 'actual-source15-owned-root-mirror-build119'); assert.equal(b.namespace, C15.namespace); assert.equal(b.targetDirectory, consumer.binaryRoot);
  for (const [a, p] of [[b.sourcePins, consumer.sourcePins], [b.compilePins, consumer.compilePins], [b.helperPins, consumer.helperPins], [b.binary, consumer.binary], [b.summaryBinary, consumer.summaryBinary]]) samePin15(a, p);
  assert.equal(b.sourcePinsSHA256, sha15(JSON.stringify(source))); assert.equal(b.sourceCount, source.length); assert.equal(b.helperCount, helpers.length); assert.deepEqual(b.binaryFiles, consumer.binaryFiles);
  assert.equal(b.NodeHelpersWereCargoInputs, false); verifyRustExecutionHistory15(b, parent, consumer.sourcePins, consumer.compilePins);
  const inventory = json15(b.Root.receipt), rootCargo = json15(b.Root.cargoReceipt), mirrorCargo = json15(b.mirror.receipt);
  assert.equal(inventory.kind, 'actual-Source15-source-inventory-and-copy119'); assert.equal(inventory.root, C15.root); assert.equal(inventory.destinationRoot, C15.mirror); assert.equal(inventory.sourceStable, true);
  assert.deepEqual(canonicalInputs(inventory.inputs, C15.root), compile); assert.deepEqual(canonicalInputs(inventory.copiedInputs, C15.mirror), compile);
  const suffixes = { fmt: ['--', '--check'], clippy: ['--lib', '--no-deps', '--', '-D', 'warnings'], test: ['--all-targets'], build: ['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08'] };
  for (const [r, root, target] of [[rootCargo, C15.root, b.Root.targetDirectory], [mirrorCargo, C15.mirror, consumer.binaryRoot]]) {
    assert.equal(r.kind, 'actual-Source15-owned-cargo-checks-and-build119'); assert.equal(r.root, root); assert.equal(r.sourceStable, true); assert.equal(r.targetDirectory, target); assert(target.startsWith('/home/wangzishi/.cache/poms-r4ghi-target-ROOT15/'));
    assert.deepEqual(canonicalInputs(r.inputs, root), compile);
    for (const name of Object.keys(suffixes)) { const s = r.steps[name]; assert.equal(s.kind, 'actual-source15-owned-cargo-command119'); assert.equal(s.command, name); assert.equal(s.cwd, root); assert.equal(s.targetDirectory, target); assert.equal(s.exitCode, 0); assert.deepEqual(s.env, cargoEnvironment15(target), 'Actual checks03 child environment is fully recorded, task cache only, offline and two jobs'); assert.deepEqual(s.argv, ['/home/wangzishi/.cargo/bin/cargo', '+1.99.1', name, '--manifest-path', root + '/apps/poms-api-rust/Cargo.toml', ...suffixes[name]]); readPin15(s.stdout); readPin15(s.stderr); }
    for (const k of ['binary', 'summaryBinary']) binary15(r[k], r.binaryFiles);
  }
  assert.notEqual(b.Root.targetDirectory, consumer.binaryRoot);
  for (const k of ['binary', 'summaryBinary']) { samePin15(mirrorCargo[k], consumer[k]); binary15(consumer[k], consumer.binaryFiles); inside(consumer.binaryRoot, consumer[k].file); }
  assert.deepEqual(mirrorCargo.binaryFiles, consumer.binaryFiles);
  for (const root of [C15.root, C15.mirror]) { for (const p of compile) leaf15(root, p.file, p.sha256); assert.deepEqual(cargoFiles15(root), compile.map(x => x.file).filter(f => f.startsWith('apps/poms-api-rust/') || f.startsWith('.cargo/')).sort()); }
  return b;
}
function verifyTuple15(p, parent) {
  const c = p.consumer, source = json15(c.sourcePins), compile = json15(c.compilePins), helpers = json15(c.helperPins);
  assert.equal(c.sourceCount, source.length); assert.equal(c.sourcePinsSHA256, sha15(JSON.stringify(source))); assert.equal(c.helperCount, helpers.length);
  assert.deepEqual(helpers15(C15.root), helpers, 'Full actual H3 must be measured, including pre-createContext callers');
  for (const s of source) leaf15(C15.root, s.file, s.sha256);
  const deltas = verifyProductComposition15(p.productComposition, parent, source, compile); assert.deepEqual([...p.sourceDeltas].sort((a, b) => a.file < b.file ? -1 : 1), [...deltas].sort((a, b) => a.file < b.file ? -1 : 1));
  const helperComposition = verifyHelperComposition15(p.helperComposition, parent, helpers);
  checkTooling15(p, helpers); verifyBuild15(c, source, compile, helpers, parent);
  return { sourcePins: source, compilePins: compile, helperPins: helpers, helperComposition };
}
export function verifyPreAPI15(p) {
  // Read-only pre-API seam. It grants no context, process or publication authority.
  assertPreAPIShape15(p);
  const parent = verifyRetained14For15(p.parent14), tuple = verifyTuple15(p, parent);
  assertStateTransfer15(p.stateTransfer, parent.state); assert.deepEqual(p.resources, resourceEntries15(parent));
  assert.equal(p.consumer.apiProcess, null); assert.equal(p.consumer.readiness, null); assert.equal(p.consumer.observationReceipt, null); assert.equal(p.consumer.bootstrapCandidate, null);
  return { kind: 'verified-source15-pre-API-facts119', parent, ...tuple, current15Granted: false };
}
function process15(c, live) {
  const r = json15(c.apiProcess); assert.equal(r.kind, 'actual-source15-owned-API-process119'); assert.equal(r.namespace, C15.namespace); assert.equal(r.epoch, C15.consumerEpoch); assert.equal(r.root, C15.mirror); assert.equal(r.port, 31441);
  assert.equal(r.binary, c.binary.file); assert.equal(r.binarySha256, c.binary.rawBytesSha256); assert.deepEqual(r.binaryFiles, c.binaryFiles); samePin15(r.buildBinding, c.buildBinding); assert(Number.isSafeInteger(r.pid) && r.pid > 1);
  binary15(c.binary, c.binaryFiles); binary15(c.summaryBinary, c.binaryFiles); inside(c.binaryRoot, c.binary.file); inside(c.binaryRoot, c.summaryBinary.file);
  readPin15(r.input); for (const pin of r.code) readPin15(pin); inside(C15.private, r.normalEnv.file);
  assert.equal(r.baseNormalEnv.file, C15.private + '/rust.env');
  const base = readPin15(r.baseNormalEnv).toString(), env = new Map(), allowed = ['NODE_ENV', 'HOST', 'PORT', 'DB_CONNECT', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD', 'DB_SCHEMA', 'JWT_SECRET', 'CORS_ORIGIN', 'ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY', 'IDENTITY_PROVIDER_SECRET_KEY', 'IDENTITY_PROVIDER_STATE_KEY', 'POMS_ATTACHMENT_LOCAL_ROOT'];
  for (const line of base.split(/\r?\n/)) { if (!line.trim() || line.trim().startsWith('#')) continue; const m = /^([A-Z_][A-Z0-9_]*)=([^\r\n]*)$/.exec(line); assert(m); assert(allowed.includes(m[1]) && !env.has(m[1])); assert(!/["'#$`\\]/.test(m[2])); env.set(m[1], m[2]); }
  assert.deepEqual([...env.keys()].sort(), [...allowed].sort());
  for (const [key, value] of Object.entries({ HOST: '127.0.0.1', DB_CONNECT: 'true', DB_HOST: '127.0.0.1', DB_PORT: '25434', DB_DATABASE: 'poms_r4ghi_rust', DB_USER: 'poms_r4ghi_rust_app', DB_SCHEMA: 'poms', POMS_ATTACHMENT_LOCAL_ROOT: '/home/wangzishi/.local/share/poms-r4ghi/objects/rust' })) assert.equal(env.get(key), value);
  env.set('HOST', '127.0.0.1'); env.set('PORT', '31441'); env.set('CORS_ORIGIN', 'http://127.0.0.1:44551,http://localhost:44551');
  assert.equal(readPin15(r.normalEnv).toString(), [...env].map(([k, v]) => k + '=' + v).join('\n') + '\n', 'Actual new private env must derive from the same isolated base');
  if (live) {
    assert.deepEqual(parseProc15(fs.readFileSync('/proc/' + r.pid + '/stat', 'utf8')), { pid: r.pid, startTime: r.startTime }); assert.equal(fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(), r.bootId); assert.equal(fs.realpathSync('/proc/' + r.pid + '/exe'), r.binary); assert.equal(fs.realpathSync('/proc/' + r.pid + '/cwd'), r.root);
    const executable = fs.statSync('/proc/' + r.pid + '/exe', { bigint: true }), fact = c.binaryFiles.find(x => x.file === r.binary); assert.equal(executable.dev.toString(), fact.dev); assert.equal(executable.ino.toString(), fact.ino);
    const processEnv = Object.fromEntries(fs.readFileSync('/proc/' + r.pid + '/environ').toString().split('\0').filter(Boolean).map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)]; }));
    assert.deepEqual(processEnv, { PATH: '/home/wangzishi/.cargo/bin:/usr/bin:/bin', HOME: '/home/wangzishi', USER: 'wangzishi', LANG: 'C.UTF-8', POMS_ENV_FILE: r.normalEnv.file });
    const sockets = []; for (const [version, text] of [[4, fs.readFileSync('/proc/net/tcp', 'utf8')], [6, fs.readFileSync('/proc/net/tcp6', 'utf8')]]) for (const line of text.trim().split('\n').slice(1)) { const f = line.trim().split(/\s+/); if (f.length >= 10 && f[3] === '0A' && parseInt(f[1].split(':')[1], 16) === 31441) sockets.push({ version, host: f[1].split(':')[0], inode: f[9] }); }
    assert.equal(sockets.length, 1); assert.equal(sockets[0].version, 4); assert.equal(sockets[0].host, '0100007F');
    const targets = []; for (const fd of fs.readdirSync('/proc/' + r.pid + '/fd')) try { targets.push(fs.readlinkSync('/proc/' + r.pid + '/fd/' + fd)); } catch (e) { if (e.code !== 'ENOENT') throw e; } assert(targets.includes('socket:[' + sockets[0].inode + ']'));
  }
  const ready = json15(c.readiness); assert.equal(ready.mode, 'start'); assert.equal(ready.port, 31441); assert.equal(ready.readiness, 200); assert.equal(ready.pid, r.pid); assert.equal(ready.binarySha256, r.binarySha256); assert.equal(ready.privateCredentialsPrinted, false);
  assert.deepEqual(Object.keys(ready).sort(), ['mode', 'port', 'readiness', 'privateCredentialsPrinted', 'pid', 'binarySha256'].sort());
  const raw = json15(r.readinessAttempt); assert.equal(raw.method, 'GET'); assert.equal(raw.url, 'http://127.0.0.1:31441/api/health/readiness'); assert.equal(raw.status, 200); const body = JSON.parse(raw.body); assert.equal(body.service, 'poms-api'); assert.equal(body.status, 'ready'); assert.equal(body.checks?.process?.status, 'pass'); assert.equal(body.checks?.database?.status, 'pass');
  return r;
}
function checkB015(p, apiRecord) {
  const b0 = json15(p.consumer.bootstrapCandidate), candidate = json15(b0.candidateInput), approval = json15(b0.bootstrapOnlyG2);
  assertPlanShape15(candidate, 'bootstrap'); assert.equal(scope15(candidate), scope15(p));
  assert.equal(approval.kind, 'Root-authorized-source15-bootstrap-only119'); assert.equal(approval.scope15, scope15(p)); samePin15(approval.candidateInput, b0.candidateInput); assert.equal(approval.publishState, false); assert.equal(approval.ordinaryContext, false); assert.equal(approval.domainEffects, false);
  assert.deepEqual(b0, bootstrapBody15(candidate, b0.candidateInput, b0.bootstrapOnlyG2, apiRecord));
  return b0;
}
function checkApprovals15(p) {
  const review = json15(p.independentReview), approval = json15(p.RootExecutionApproval);
  assertApprovals15(p, review, approval);
}
function verifyPlanData15(planPin, stage, liveProcess) {
  pin15(planPin); const p = json15(planPin); assertPlanShape15(p, stage);
  const parent = verifyRetained14For15(p.parent14), tuple = verifyTuple15(p, parent);
  assertStateTransfer15(p.stateTransfer, parent.state); assert.deepEqual(p.resources, resourceEntries15(parent));
  const apiRecord = process15(p.consumer, liveProcess);
  assert.deepEqual(apiRecord.code, p.tooling.executionSources, 'Actual API must bind the same complete approved external/H3 code closure');
  if (stage !== 'pre-observe') {
    const o = json15(p.consumer.observationReceipt); assert.equal(o.kind, 'actual-source15-state-free-M98-observation119'); samePin15(o.finalRetention14, p.parent14.finalRetention14); samePin15(o.apiProcess, p.consumer.apiProcess); samePin15(o.sourcePins, p.consumer.sourcePins); samePin15(o.helperPins, p.consumer.helperPins); assert.deepEqual(o.binaryFiles, p.consumer.binaryFiles); assert.deepEqual(o.stableObservations, p.consumer.freshSnapshots); assert.equal(o.stateMinted, false); assert.equal(o.noDomainHTTP, true); assert.equal(o.noMigration, true);
    const original = json15(json15(p.parent14.finalRetention14).retainedSnapshot);
    for (const pin of p.consumer.freshSnapshots) { const s = json15(pin); assert.equal(s.epoch, C15.consumerEpoch); assert.equal(s.run, C15.run); assert.equal(s.marker, parent.state.marker); assertDataEqual252(original, s, rows15); }
  }
  let bootstrap = null;
  if (p.consumer.bootstrapCandidate !== null) bootstrap = checkB015(p, apiRecord);
  if (['publish', 'B1'].includes(stage)) checkApprovals15(p);
  return { plan: p, planPin, parent, ...tuple, apiRecord, bootstrap, scope15: scope15(p), effectsGranted: false };
}
export function verifyPlan15(planPin, { stage } = {}) { return verifyPlanData15(planPin, stage, true); }
export function assertCodeEpochContext15(ctx, reg, { liveProcess = false, sourceFiles = false } = {}) {
  assert.equal(reg.schemaVersion, 5); assert.equal(ctx.epoch, C15.consumerEpoch); assert.equal(ctx.run, C15.run); assert.equal(ctx.namespace, C15.namespace); assert.equal(ctx.win, C15.root); assert.equal(ctx.mirror, C15.mirror); assert.equal(ctx.private, C15.private); assert.equal(ctx.priv, data15); assert.equal(ctx.migrations, 98); assert.equal(ctx.tables, 139);
  assert.equal(ctx.state.epoch, C15.consumerEpoch); assert.equal(ctx.state.run, C15.run); assert.equal(ctx.state.namespace, C15.namespace); assert.equal(ctx.state.marker, reg.marker);
  const record = ctx.state.codeEpochAdmission15; assert.equal(record?.kind, 'fixed14-to15-code-epoch-state119'); assert.equal(record.protocolVersion, 1); samePin15(record.registry, ctx.state.consumerAdmission54.registry);
  inside(data15, record.registry.file); assert.deepEqual(json15(record.registry), reg); samePin15(record.approvedPlan, reg.approvedPlan);
  const d = verifyPlanData15(reg.approvedPlan, 'publish', liveProcess); assert.deepEqual(reg, registryBody15(d.plan, reg.approvedPlan, d));
  samePin15(record.producerState, d.plan.parent14.frozenState14); samePin15(ctx.state.apiProcess, d.plan.consumer.apiProcess); assert.deepEqual(ctx.state.apiProcess.record, d.apiRecord);
  assert.deepEqual(ctx.pins, d.sourcePins); assert.deepEqual(ctx.state.sourcePins, d.sourcePins); if (ctx.helperPins !== undefined) assert.deepEqual(ctx.helperPins, d.helperPins);
  // verifyPlan15 measured all actual H3 even when ctx.helperPins was absent.
  inside(data15, record.candidate.file); assert.deepEqual(json15(record.candidate), admittedBody15(d.plan, record.registry, d.bootstrap));
  assert.equal(ctx.state.prefix, 'bg' + sha15(C15.consumerEpoch + ':' + C15.run).slice(0, 10));
  assert(!ctx.state.codeEpochAdmission252 && !ctx.state.toolAdmission119 && !ctx.state.admissionPending54, 'Historical admission must not remain active');
  assert.deepEqual(ctx.state.consumerAdmission54, { registry: pinOnly15(record.registry), approvedPlanSHA256: reg.approvedPlan.rawBytesSha256, producerEpoch: C15.producerEpoch, consumerEpoch: C15.consumerEpoch, currentConsumerCoverageMustUseNewPrivateAndPublicDirectories: true });
  for (const k of ['baseline', 'schemaComparison108', 'taxContinuation13', 'taxContinuation14', 'producerExecutionHistory252']) assert.deepEqual(ctx.state[k], d.parent.state[k], 'Retained immutable parent changed: ' + k);
  for (const e of reg.fixtureAdmissions) { const value = pointer15(ctx.state, e.registryPath); assert.equal(sha15(JSON.stringify(resourceProjection252(value, e.mode))), e.retainedProjectionSHA256); }
  assert.deepEqual(ctx.state.producerExecutionHistory15, [...(d.parent.state.producerExecutionHistory15 ?? []), producerHistory15(d.parent.state, d.plan)]);
  assertRetainedOwnership15(ctx.state, d.parent.state);
  // Publication-only idle checks do not run here. Exact owned FI adapters must
  // be able to validate current bindings, observe a 500 and remove controls.
  if (liveProcess) process15(d.plan.consumer, true); if (sourceFiles) for (const p of d.sourcePins) leaf15(C15.root, p.file, p.sha256);
  return reg;
}
export function currentCodeRegistry15(ctx, options = {}) { return assertCodeEpochContext15(ctx, json15(ctx.state.consumerAdmission54.registry), options); }
export function effectiveHelperPins15(ctx, reg) { assertCodeEpochContext15(ctx, reg); return reg.consumer.helperPins; }
export function assertRuntimeBinding15(ctx, reg, { codeAdmission15, candidate }) { assertCodeEpochContext15(ctx, reg, { liveProcess: true, sourceFiles: true }); samePin15(codeAdmission15, ctx.state.consumerAdmission54.registry); samePin15(candidate, ctx.state.codeEpochAdmission15.candidate); const c = json15(candidate), d = verifyPlan15(reg.approvedPlan, { stage: 'B1' }); assert.deepEqual(c, admittedBody15(d.plan, codeAdmission15, d.bootstrap)); return { candidate: c, admission: { registryPin: codeAdmission15, registry: reg, producerState: reg.producerState, helperPinsPin: reg.consumer.helperPins } }; }
export function assertRetainedFixture15(ctx, reg, { registryPath, record, projectIds, producerReceipt = null }) { assertCodeEpochContext15(ctx, reg); const e = reg.fixtureAdmissions.find(x => x.registryPath === registryPath); assert(e, 'Outside exact retained resource set'); assert.deepEqual(pointer15(ctx.state, registryPath), record); assert.equal(sha15(JSON.stringify(resourceProjection252(record, e.mode))), e.retainedProjectionSHA256); assert.deepEqual([...projectIds].sort(), e.projectIds); if (producerReceipt) { assert(e.receipts.some(p => same(p, producerReceipt))); readPin15(producerReceipt); } assert(e.mode !== 'legacy-compatibility' || producerReceipt); return { registryPath, originalProducerState: e.originalProducerState, retainedProducerState: reg.producerState, retainedAtEpoch: C15.producerEpoch, producerEpoch: e.recordBirth.epoch, consumerEpoch: C15.consumerEpoch, retainedProducerOnly: true, codeAdmission15: ctx.state.consumerAdmission54.registry, projectBirths: e.projectBirths }; }
export function readRetainedCommand15(ctx, reg, { pointer, receipt }) { assertCodeEpochContext15(ctx, reg); assert.equal(pointer, '/taxContinuation13/mainCompletion'); const parent = verifyRetained14For15(json15(reg.approvedPlan).parent14), bridge = parent.Main13Bridge; samePin15(receipt, bridge.original); assert.deepEqual(pointer15(ctx.state, pointer), bridge.record); return { ...bridge, retainedThrough14: reg.producerState, codeAdmission15: ctx.state.consumerAdmission54.registry }; }
export function trustedSummaryBinary15(ctx, reg) { assertCodeEpochContext15(ctx, reg, { liveProcess: true, sourceFiles: true }); const p = json15(reg.approvedPlan); samePin15(reg.consumer.trustedSummaryBinary, p.consumer.trustedSummaryBinary); samePin15(p.consumer.trustedSummaryBinary, p.consumer.summaryBinary); binary15(p.consumer.trustedSummaryBinary, p.consumer.binaryFiles); return p.consumer.trustedSummaryBinary; }
export function assertGHCurrentSource15(ctx, operationId) { assert(GH15.includes(operationId), 'No Source15 fallback to the static19 graph'); const reg = currentCodeRegistry15(ctx, { liveProcess: true, sourceFiles: true }); return { registryPin: ctx.state.consumerAdmission54.registry, sourcePins: json15(reg.consumer.sourcePins), helperPinsPin: reg.consumer.helperPins }; }
