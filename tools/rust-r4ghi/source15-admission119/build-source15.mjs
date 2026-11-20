// Future Root-only fixed Cargo build/copy/binding. Importing performs no action.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash, randomUUID } from 'node:crypto'; import { spawnSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', M = '/home/wangzishi/projects/poms-rust-r4ghi', P = '/home/wangzishi/.local/share/poms-r4ghi/private', TARGET = '/home/wangzishi/.cache/poms-r4ghi-target-ROOT15/';
const hash = x => createHash('sha256').update(x).digest('hex');
export function buildRead15(p) { assert(p && typeof p.file === 'string' && p.file.startsWith('/') && path.resolve(p.file) === p.file && !p.file.includes('\\') && /^[a-f0-9]{64}$/.test(p.rawBytesSha256)); const s = fs.lstatSync(p.file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1); assert.equal(fs.realpathSync(p.file), p.file); const b = fs.readFileSync(p.file); assert.equal(hash(b), p.rawBytesSha256); if (p.bytes !== undefined) assert.equal(b.length, p.bytes); return b; }
const json = p => JSON.parse(buildRead15(p)), same = (a, b) => { assert(a && b); assert.equal(a.file, b.file); assert.equal(a.rawBytesSha256, b.rawBytesSha256); };
const pin = file => { const b = fs.readFileSync(file); const p = { file, bytes: b.length, rawBytesSha256: hash(b) }; buildRead15(p); return p; };
const relative = file => { assert(typeof file === 'string' && !path.isAbsolute(file) && !file.includes('\\') && file.split('/').every(x => x && x !== '.' && x !== '..')); return file; };
function leaf(root, p) { return buildRead15({ file: root + '/' + relative(p.file), rawBytesSha256: p.sha256 }); }
export function enumerateCargo15(root) { const found = [], walk = dir => { if (!fs.existsSync(dir)) return; const s = fs.lstatSync(dir); assert(s.isDirectory() && !s.isSymbolicLink()); for (const n of fs.readdirSync(dir).sort()) { if (['target', 'node_modules', '.git'].includes(n)) continue; const f = dir + '/' + n, s = fs.lstatSync(f); assert(!s.isSymbolicLink()); if (s.isDirectory()) walk(f); else if (/\.(rs|toml|json|cjs)$/.test(n) || n === 'Cargo.lock' || dir.endsWith('/.cargo') && n === 'config') { assert(s.isFile() && s.nlink === 1); found.push(f.slice(root.length + 1)); } } }; walk(root + '/apps/poms-api-rust'); walk(root + '/.cargo'); return found.sort(); }
export function enumerateSource15(root, expected) {
  const classes = [['apps/poms-api-rust/src', '.rs'], ['apps/poms-api/src/migrations', '.ts'], ['libs/shared/contracts/src', '.ts']];
  const found = expected.map(p => p.file).filter(f => !classes.some(([folder, suffix]) => f.startsWith(folder + '/') && f.endsWith(suffix)));
  const walk = (directory, suffix) => { if (!fs.existsSync(directory)) return; const s = fs.lstatSync(directory); assert(s.isDirectory() && !s.isSymbolicLink()); for (const n of fs.readdirSync(directory).sort()) { const f = directory + '/' + n, st = fs.lstatSync(f); assert(!st.isSymbolicLink()); if (st.isDirectory()) walk(f, suffix); else if (n.endsWith(suffix)) { assert(st.isFile() && st.nlink === 1); found.push(f.slice(root.length + 1)); } } };
  for (const [folder, suffix] of classes) walk(root + '/' + folder, suffix);
  assert.equal(new Set(found).size, found.length);
  return found.sort().map(file => { const s = fs.lstatSync(root + '/' + file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1); assert.equal(fs.realpathSync(root + '/' + file), root + '/' + file); return { file, sha256: hash(fs.readFileSync(root + '/' + file)) }; });
}
export function assertFreshBuildTree15(root, source, compile) {
  assert.deepEqual(enumerateSource15(root, source), source, 'Fresh complete source inventory changed');
  const expected = compile.map(p => p.file).filter(f => f.startsWith('apps/poms-api-rust/') || f.startsWith('.cargo/')).sort();
  assert.deepEqual(enumerateCargo15(root), expected, 'Fresh complete Cargo closure changed');
  for (const p of compile) leaf(root, p);
}
export function assertBuildPhase15(input) {
  assert(input && typeof input === 'object'); const expectedKeys = ['kind', 'mode', 'state13', 'state14', 'ownership14', 'archive344', 'finalRetention14', 'finalRetention14Review', 'retirement14', 'productComposition', 'currentHelperPins', 'helperPins', 'inventory', 'buildPair', 'targetRoot', 'outputDirectory', 'preAPIPlan', 'tooling']; if (input.mode === 'bind') expectedKeys.push('rustExecutionHistory', 'rustExecutionReview'); assert.deepEqual(Object.keys(input).sort(), expectedKeys.sort());
  assert.equal(input.kind, 'Root-source15-119-build-input'); assert(['inventory-copy', 'checks-build', 'bind'].includes(input.mode));
  for (const k of ['state13', 'state14', 'ownership14', 'archive344', 'finalRetention14', 'finalRetention14Review', 'productComposition', 'currentHelperPins']) assert(input[k] && typeof input[k].file === 'string');
  assert.deepEqual(Object.keys(input.tooling).sort(), ['entry', 'manifest', 'executionSources', 'independentCodeReview'].sort());
  if (input.mode === 'bind') { for (const k of ['retirement14', 'helperPins', 'buildPair', 'preAPIPlan', 'rustExecutionHistory', 'rustExecutionReview']) assert(input[k] && typeof input[k].file === 'string'); assert.equal(input.inventory, null); assert.equal(input.targetRoot, null); }
  else { for (const k of ['retirement14', 'helperPins', 'buildPair', 'preAPIPlan']) assert.equal(input[k], null, 'Raw build must not consume a future ' + k); if (input.mode === 'inventory-copy') { assert.equal(input.inventory, null); assert.equal(input.targetRoot, null); } else { assert(input.inventory && typeof input.inventory.file === 'string'); assert(typeof input.targetRoot === 'string' && input.targetRoot.startsWith(TARGET)); } }
}
export function retainedReviewForBuild15(reviewPin, retentionPin) {
  const review = json(reviewPin); assert.equal(reviewPin.rawBytesSha256, '66f3a8973de24e06779d16d00b7aa693e894e756ff4c3e244e61484672cecb58');
  assert.equal(review.kind, 'non-author-final-source14-retention-readback119'); assert.equal(review.verdict, 'approved-final14-retention-only'); same(review.finalRetention14, retentionPin);
  assert.equal(review.reviewerIsCaptureAuthor, false); assert.equal(review.full139x2CaptureReadback, true); assert.equal(review.actualSource15Admission, false); assert.equal(review.source15EffectReadmission, false); assert.equal(review.actualG2ForSource15, false);
  return review;
}
function put(directory, name, value) { assert.equal(path.basename(name), name); const b = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'), file = directory + '/' + name, fd = fs.openSync(file, 'wx', 0o600); try { fs.writeFileSync(fd, b); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } return pin(file); }
function binary(file) { const s = fs.lstatSync(file, { bigint: true }); assert(s.isFile() && !s.isSymbolicLink()); assert.equal(fs.realpathSync(file), file); const b = fs.readFileSync(file); return { file, bytes: b.length, rawBytesSha256: hash(b), dev: s.dev.toString(), ino: s.ino.toString(), nlink: Number(s.nlink) }; }
function assertCurrentHelpers(input) { const expected = json(input.currentHelperPins), actual = fs.readdirSync(ROOT + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => { const p = pin(ROOT + '/tools/rust-r4ghi/business/' + n); return { file: 'tools/rust-r4ghi/business/' + n, sha256: p.rawBytesSha256 }; }); assert.deepEqual(actual, expected); return actual; }
function tooling(input) {
  assert.equal(input.tooling.entry.file, fileURLToPath(import.meta.url)); buildRead15(input.tooling.entry);
  const manifest = json(input.tooling.manifest), review = json(input.tooling.independentCodeReview); assert.equal(manifest.kind, 'source15-admission119-code-candidate');
  assert.equal(review.kind, 'non-author-source15-admission119-code-review'); same(review.toolingManifest, input.tooling.manifest); assert.equal(review.actualG2Authorized, false);
  assert(typeof review.author === 'string' && typeof review.reviewer === 'string' && review.author !== review.reviewer);
  const partial = ['raw-build-only-sealed01', 'raw-build-only-sealed02', 'raw-build-only-sealed03'].includes(manifest.edition);
  if (partial) { assert(['inventory-copy', 'checks-build'].includes(input.mode)); assert.equal(manifest.production.length, 1); assert.equal(review.rawBuildCodeReady, true); assert.deepEqual(review.coveredModes, ['inventory-copy', 'checks-build']); }
  else { assert.equal(manifest.production.length, 14); assert.equal(review.complete119CodeReady, true); }
  assert.equal(input.tooling.executionSources.length, manifest.production.length);
  assert.equal(new Set(input.tooling.executionSources.map(p => p.target)).size, manifest.production.length);
  for (const e of manifest.production) { const p = input.tooling.executionSources.find(x => x.target === e.file); assert(p); assert.equal(p.rawBytesSha256, e.afterSHA256); buildRead15(p); if (e.group === 'external-production') assert.equal(p.file, ROOT + '/' + e.file); }
}
function oldBookend(input) { for (const [p, expected] of [[input.state13, 'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4'], [input.state14, 'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97'], [input.ownership14, '559aa091ba9cfa1ef1c72dd2a7c4d21c8d4285588519de937e6db2b2efd6aa79']]) { assert.equal(p.rawBytesSha256, expected); buildRead15(p); } }
export function readProducts34402ForBuild15(compositionPin) {
  const c = json(compositionPin); assert.equal(c.kind, 'Root-finite-Source14-to15-product-composition119');
  const review = json(c.independentReview); assert.equal(c.independentReview.rawBytesSha256, 'd712445a611b1795034fb005ca22738ca4288beba3858e7559356877b26356c8');
  assert.equal(review.kind, 'non-author-two-leaf-candidate-code-review34402'); assert.equal(review.verdict, 'approved-two-leaf-candidate-code-only'); assert.equal(review.reviewerIsProductAuthor, false); assert.equal(review.baseEpoch, 14); assert.equal(review.successorEpoch, 15); assert.equal(review.finiteRootPromotion.eligible, true); assert.equal(review.finiteRootPromotion.RootPromotionExecuted, false); assert.equal(review.finiteRootPromotion.oldSource14RuntimeMayBeRebound, false);
  const manifest = json(review.candidateManifest); assert.equal(review.candidateManifest.rawBytesSha256, 'ff0521e144ab1eb9aa95da0c7ff8f97d7b7cbd76f94082457bf628fd54d5888f'); assert.equal(manifest.kind, 'H-author-code-candidate-corrective344'); assert.equal(manifest.edition, 'code02');
  assert.equal(manifest.products.length, 2); assert.equal(c.entries.length, 2); same(c.technicalG1, manifest.formalFreeze); buildRead15(c.technicalG1);
  const mapped = [];
  for (const e of c.entries) {
    same(e.productManifest, review.candidateManifest); const node = e.productPointer.slice(1).split('/').reduce((v, k) => v?.[k], manifest); assert(manifest.products.includes(node));
    assert.equal(node.file, e.file); assert.equal(node.operation, 'MOD');
    // Deliberate typed map of H02's actual field names; no artifact is rewritten.
    assert.equal(node.beforeRawBytesSha256, e.beforeSHA256); assert.equal(node.afterRawBytesSha256, e.afterSHA256); same(node.candidate, e.candidate); same(node.before, { ...node.before, rawBytesSha256: e.beforeSHA256 });
    buildRead15(node.before); buildRead15(node.candidate);
    const approved = review.approvedProductUnion.find(x => x.file === node.file); assert(approved); assert.equal(approved.beforeRawBytesSha256, node.beforeRawBytesSha256); assert.equal(approved.afterRawBytesSha256, node.afterRawBytesSha256); assert.equal(approved.operation, 'MOD'); same(approved.candidate, node.candidate);
    mapped.push(e);
  }
  assert.deepEqual(c.entries.map(e => e.file).sort(), manifest.products.map(e => e.file).sort()); return { composition: c, entries: mapped };
}
function inputs(input) {
  assert.equal(input.archive344.rawBytesSha256, '0df8b21ec95ee497feb0c049ecdfea95c7824cdf98b7d6c8363562964717bc77'); const a = json(input.archive344), sourceOld = json(a.manifests.sources), compileOld = json(a.manifests.compiles);
  assert.equal(sourceOld.length, 420); assert.equal(compileOld.length, 528); assert.equal(a.files.length, 746);
  for (const f of a.files) { assert.equal(f.original.file, ROOT + '/' + f.relative); assert.equal(f.archive.file, a.archiveRoot + '/tree/' + f.relative); assert.equal(f.archive.rawBytesSha256, f.original.rawBytesSha256); buildRead15(f.archive); }
  const { composition: products } = readProducts34402ForBuild15(input.productComposition);
  const before = { 'apps/poms-api-rust/src/project_operating/context.rs': 'f0b18b53af2d3288a7b4078f15280a23cc8821a1d2792519733f64d935aaa0ac', 'apps/poms-api-rust/src/project_operating/restatement.rs': '7251664a65dd189b38ea9349ba6e54b8a2ea84ca307d128e3b01f29ba446890c' };
  assert.deepEqual(products.entries.map(x => x.file).sort(), Object.keys(before).sort());
  const changes = new Map();
  for (const e of products.entries) { assert.equal(e.operation, 'MOD'); assert.equal(e.beforeSHA256, before[e.file]); assert.equal(e.candidate.rawBytesSha256, e.afterSHA256); changes.set(e.file, e.afterSHA256); }
  const observed = list => list.map(p => { const value = { file: p.file, sha256: changes.get(p.file) ?? p.sha256 }; leaf(ROOT, value); return value; });
  const source = observed(sourceOld), compile = observed(compileOld); assert.deepEqual(enumerateCargo15(ROOT), compile.map(p => p.file).filter(f => f.startsWith('apps/poms-api-rust/') || f.startsWith('.cargo/')).sort());
  // Generic sourcePins is unchanged and is called only after full current helper prevalidation.
  return { sourceOld, compileOld, source, compile };
}
function actualCopy(root, pins) { return pins.map(p => ({ file: root + '/' + p.file, sha256: p.sha256 })); }
export async function runBuild15(inputPin, approvalPin) {
  assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH); assert.deepEqual(process.execArgv, []);
  assert(inputPin.file.startsWith(P + '/') && approvalPin.file.startsWith(P + '/')); const input = json(inputPin), approval = json(approvalPin);
  assertBuildPhase15(input); assert.equal(approval.kind, 'Root-exact-source15-119-build'); same(approval.input, inputPin); assert.equal(approval.mode, input.mode); same(approval.toolingManifest, input.tooling.manifest); assert.equal(approval.stateMinted, false); assert.equal(approval.domainHTTP, false); assert.equal(approval.ordinaryContextCreated, false);
  assert.equal(approval.runsCargo, input.mode === 'checks-build'); assert.equal(approval.mirrorSourceCopy, input.mode === 'inventory-copy'); assert.equal(approval.helperFSBinding, input.mode === 'bind');
  tooling(input); oldBookend(input); const currentHelpers = assertCurrentHelpers(input);
  for (const epoch of ['g2-business13', 'g2-business14', 'g2-business15']) assert(!fs.existsSync(P + '/business/' + epoch + '/main01/driver.lock'));
  assert(!fs.existsSync(P + '/business/g2-business15/main01/state.json'));
  const retained = json(input.finalRetention14); assert.equal(retained.kind, 'actual-final-source14-M98-retention119'); assert.equal(retained.finalRetainedPoint, true); assert.equal(retained.frozenState.rawBytesSha256, input.state14.rawBytesSha256);
  retainedReviewForBuild15(input.finalRetention14Review, input.finalRetention14);
  if (input.mode === 'bind') { const retired = json(input.retirement14); assert.equal(retired.kind, 'actual-source14-API-retirement-for15'); assert.equal(retired.stopped, true); }
  else { assert.equal(input.retirement14, null, 'Raw Rust build precedes retirement/binding; do not invent these artifacts'); assert.equal(input.helperPins, null); assert.equal(input.buildPair, null); assert.equal(input.preAPIPlan, null); }
  const tree = inputs(input); const { sourcePins } = await import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/context.mjs').href); assert.deepEqual(sourcePins(), tree.source);
  const freshAll = () => { for (const root of [ROOT, M]) assertFreshBuildTree15(root, tree.source, tree.compile); assert.deepEqual(sourcePins(), tree.source); assertCurrentHelpers(input); oldBookend(input); };
  assert(input.outputDirectory.startsWith(P + '/source15-build119-') && path.dirname(input.outputDirectory) === P); assert(!fs.existsSync(input.outputDirectory)); fs.mkdirSync(input.outputDirectory, { mode: 0o700 }); assert.equal(fs.realpathSync(input.outputDirectory), input.outputDirectory);
  const directory = input.outputDirectory, nonce = randomUUID(), driverDirectory = P + '/business/g2-business15/main01';
  fs.mkdirSync(driverDirectory, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(driverDirectory), driverDirectory);
  const driverLock = put(driverDirectory, 'driver.lock', { input: inputPin, mode: input.mode, nonce, pid: process.pid });
  put(directory, 'intent.json', { input: inputPin, approval: approvalPin, mode: input.mode, nonce });
  let result, uncertainCargo = false;
  try {
    if (input.mode === 'inventory-copy') {
      assertFreshBuildTree15(ROOT, tree.source, tree.compile); assertFreshBuildTree15(M, tree.sourceOld, tree.compileOld);
      for (const p of tree.compile) { const file = M + '/' + p.file, b = leaf(ROOT, p); assert.equal(fs.realpathSync(path.dirname(file)), path.dirname(file)); if (hash(fs.readFileSync(file)) !== p.sha256) { const stage = file + '.source15-' + randomUUID(); fs.writeFileSync(stage, b, { flag: 'wx', mode: 0o600 }); fs.renameSync(stage, file); } leaf(M, p); }
      freshAll(); const sourcePin = put(directory, 'sourcePins.json', tree.source), compilePin = put(directory, 'compileInputs.json', tree.compile);
      result = put(directory, 'inventory-copy.json', { kind: 'actual-Source15-source-inventory-and-copy119', root: ROOT, destinationRoot: M, sourceStable: true, sourcePins: sourcePin, compilePins: compilePin, inputs: actualCopy(ROOT, tree.compile), copiedInputs: actualCopy(M, tree.compile), parent14: input.finalRetention14, productComposition: input.productComposition });
    } else if (input.mode === 'checks-build') {
      const inventory = json(input.inventory); assert.equal(inventory.kind, 'actual-Source15-source-inventory-and-copy119'); assert.deepEqual(json(inventory.sourcePins), tree.source); assert.deepEqual(json(inventory.compilePins), tree.compile);
      assert(input.targetRoot.startsWith(TARGET) && path.dirname(input.targetRoot) === TARGET.slice(0, -1)); fs.mkdirSync(TARGET.slice(0, -1), { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(TARGET.slice(0, -1)), TARGET.slice(0, -1)); assert(!fs.existsSync(input.targetRoot)); fs.mkdirSync(input.targetRoot, { mode: 0o700 });
      const receipts = {}, suffixes = { fmt: ['--', '--check'], clippy: ['--lib', '--no-deps', '--', '-D', 'warnings'], test: ['--all-targets'], build: ['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08'] };
      for (const [label, root] of [['Root', ROOT], ['mirror', M]]) {
        const target = input.targetRoot + '/' + label; assert(!fs.existsSync(target)); const steps = {};
        for (const [name, suffix] of Object.entries(suffixes)) {
          freshAll();
          const argv = ['/home/wangzishi/.cargo/bin/cargo', '+1.99.1', name, '--manifest-path', root + '/apps/poms-api-rust/Cargo.toml', ...suffix];
          const childEnvironment = { PATH: '/home/wangzishi/.cargo/bin:/usr/bin:/bin', HOME: '/home/wangzishi', USER: 'wangzishi', LANG: 'C.UTF-8', CARGO_TARGET_DIR: target, CARGO_NET_OFFLINE: 'true', CARGO_HOME: '/home/wangzishi/.cache/poms-r4def-cargo-home', RUSTUP_HOME: '/home/wangzishi/.rustup', CARGO_BUILD_JOBS: '2' };
          const r = spawnSync(argv[0], argv.slice(1), { cwd: root, env: childEnvironment, encoding: null, maxBuffer: 128_000_000, windowsHide: true });
          const stdout = put(directory, label + '-' + name + '-stdout.bin', r.stdout ?? Buffer.alloc(0)), stderr = put(directory, label + '-' + name + '-stderr.bin', r.stderr ?? Buffer.alloc(0));
          steps[name] = { kind: 'actual-source15-owned-cargo-command119', command: name, argv, cwd: root, targetDirectory: target, env: childEnvironment, exitCode: r.status, stdout, stderr };
          put(directory, label + '-' + name + '.json', { ...steps[name], processError: r.error ? { name: r.error.name, message: r.error.message } : null, signal: r.signal });
          uncertainCargo = Boolean(r.error || r.status === null || r.signal !== null);
          assert(!r.error && r.status === 0 && r.signal === null, 'Cargo failed/uncertain: preserve output and do not retry blindly');
          freshAll();
        }
        const api = binary(target + '/debug/poms-api-rust'), common = binary(target + '/debug/examples/r4ghi_summary_producer08');
        receipts[label] = put(directory, label + '-cargo.json', { kind: 'actual-Source15-owned-cargo-checks-and-build119', root, targetDirectory: target, inputs: actualCopy(root, tree.compile), steps, binary: api, summaryBinary: common, binaryFiles: [api, common], sourceStable: true });
      }
      result = put(directory, 'build-pair.json', { kind: 'actual-source15-eight-Cargo-steps119', inventory: input.inventory, Root: receipts.Root, mirror: receipts.mirror, helperPins: null, NodeHelpersWereCargoInputs: false });
    } else {
      const pair = json(input.buildPair), inventory = json(pair.inventory), root = json(pair.Root), mirror = json(pair.mirror);
      assert.equal(pair.kind, 'actual-source15-eight-Cargo-steps119'); assert.equal(pair.helperPins, null); assert.equal(pair.NodeHelpersWereCargoInputs, false);
      const helpers = json(input.helperPins); assert.deepEqual(currentHelpers, helpers); assert(helpers.length >= 222);
      const draft = json(input.preAPIPlan); assert.equal(draft.consumer.buildBinding, null); same(draft.consumer.sourcePins, inventory.sourcePins); same(draft.consumer.compilePins, inventory.compilePins); same(draft.consumer.helperPins, input.helperPins);
      const binding = { kind: 'actual-source15-owned-root-mirror-build119', namespace: 'poms-r4ghi', sourcePins: inventory.sourcePins, sourcePinsSHA256: hash(JSON.stringify(tree.source)), sourceCount: tree.source.length, compilePins: inventory.compilePins,
        helperPins: input.helperPins, helperCount: helpers.length, binary: mirror.binary, summaryBinary: mirror.summaryBinary, binaryFiles: mirror.binaryFiles, targetDirectory: mirror.targetDirectory,
        Root: { receipt: pair.inventory, cargoReceipt: pair.Root, targetDirectory: root.targetDirectory }, mirror: { receipt: pair.mirror }, rustExecutionHistory: input.rustExecutionHistory, rustExecutionReview: input.rustExecutionReview, NodeHelpersWereCargoInputs: false, sourceStable: true };
      result = put(directory, 'build-binding.json', binding); draft.consumer.buildBinding = result;
      // This is post-write verification of an actual artifact, never a read of
      // its own future pin. An invalid orphan is preserved and cannot start API.
      const { verifyPreAPI15 } = await import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/source15-admission.mjs').href); verifyPreAPI15(draft);
    }
    freshAll(); put(directory, 'complete.json', { kind: 'actual-source15-build-mode-complete119', input: inputPin, approval: approvalPin, mode: input.mode, result, Source15Admitted: false });
    console.log(JSON.stringify({ mode: input.mode, result, Source15Admitted: false })); return result;
  } catch (e) { put(directory, 'partial.json', { kind: 'partial-source15-build119', mode: input.mode, input: inputPin, message: e.message, knownResult: result ?? null, uncertainCargo, blindRetryForbidden: true, Source15Admitted: false }); throw e; }
  finally { same(pin(driverLock.file), driverLock); const owner = json(driverLock); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); if (!uncertainCargo) fs.unlinkSync(driverLock.file); }
}
export async function mainBuild15(args = process.argv.slice(2)) { if (args.length === 1 && args[0] === '--help') { console.log('Root only --input FILE --input-sha SHA --approval FILE --approval-sha SHA --execute; inventory-copy|checks-build|bind. Independent ROOT15; bind measures Node helpers after actual Rust build.'); return; } assert.equal(args.length, 9); assert.deepEqual([args[0], args[2], args[4], args[6], args[8]], ['--input', '--input-sha', '--approval', '--approval-sha', '--execute']); return runBuild15({ file: args[1], rawBytesSha256: args[3] }, { file: args[5], rawBytesSha256: args[7] }); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) mainBuild15().catch(e => { console.error(JSON.stringify({ kind: 'source15-build-stopped', message: e.message, preserveAllArtifacts: true })); process.exitCode = 1; });
