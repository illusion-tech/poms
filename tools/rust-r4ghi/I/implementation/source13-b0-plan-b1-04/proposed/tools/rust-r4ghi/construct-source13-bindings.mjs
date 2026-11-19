// Root-approved FS-only constructors. No createContext/next/persist, DB/HTTP,
// migration, process launch/signal, source/helper edits, or existing-file writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
export const SOURCE13 = Object.freeze({ root: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', mirror: '/home/wangzishi/projects/poms-rust-r4ghi', private: '/home/wangzishi/.local/share/poms-r4ghi/private', epoch: 'g2-business13', run: 'main01', namespace: 'poms-r4ghi', marker: '0ca66699-053b-4f40-ad5c-82fed4cf1a6f',
  index139SHA256: 'fed889a2c467945656d7c317f006b5ba2bc9780435459460863b3735dacb17b7', state139SHA256: 'ee7371dc4fc5d388f6898fb1c6eb90bebb6404eca6c31d23599469445804a628', before139SHA256: '106c66efc668090d4605b6a953ebfddfa65aa2df8c13c3e7531a51bf57130d15' });
const F = SOURCE13, priv = F.private + '/business/' + F.epoch + '/' + F.run;
export const sha13 = value => createHash('sha256').update(value).digest('hex');
export function read13(pin) { assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256), 'Actual pin required, null template is not executable'); const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(pin.file), path.resolve(pin.file)); const bytes = fs.readFileSync(pin.file); assert.equal(sha13(bytes), pin.rawBytesSha256); if (pin.bytes !== undefined) assert.equal(pin.bytes, bytes.length); return bytes; }
const json13 = pin => JSON.parse(read13(pin));
const samePin13 = (a, b) => a?.file === b?.file && a?.rawBytesSha256 === b?.rawBytesSha256;
const twoPin13 = pin => ({ file: pin.file, rawBytesSha256: pin.rawBytesSha256 });
const pointer13 = (value, pointer) => { assert(typeof pointer === 'string' && pointer.startsWith('/')); return pointer.split('/').slice(1).reduce((object, key) => object?.[key.replace(/~1/g, '/').replace(/~0/g, '~')], value); };
function contained13(root, file) { const relative = path.relative(fs.realpathSync(root), fs.realpathSync(file)); assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)); }
export function assertArrayManifest13(pins) { assert(Array.isArray(pins) && pins.length > 0); const seen = new Set(); for (const pin of pins) { assert(typeof pin.file === 'string' && !path.isAbsolute(pin.file) && !pin.file.split('/').includes('..') && /^[a-f0-9]{64}$/.test(pin.sha256)); assert(!seen.has(pin.file)); seen.add(pin.file); } }
export function helperGraph13(root = F.root) { return fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(name => /\.(mjs|json)$/.test(name)).sort().map(name => ({ file: 'tools/rust-r4ghi/business/' + name, sha256: sha13(fs.readFileSync(root + '/tools/rust-r4ghi/business/' + name)) })); }
export function assertNullTemplate13(template) { assert.equal(template.schemaVersion, 1); assert.equal(template.kind, 'Source13-retained-tax-continuation85'); assert.equal(template.current.epoch, F.epoch); assert.equal(template.current.run, F.run); for (const [key, value] of Object.entries(template.current)) if (!['epoch', 'run'].includes(key)) assert.equal(value, null, 'No runtime value may enter the business template: ' + key); }
async function runtime13(input, requireLive = true) {
  assert.equal(process.platform, 'linux'); const context = await import(pathToFileURL(F.root + '/tools/rust-r4ghi/business/context.mjs').href); assert.equal(context.FIXED.migrations, 98); assert.equal(context.FIXED.tables, 139);
  const pins = json13(input.sourcePins), helpers = json13(input.helperH0); assertArrayManifest13(pins); assertArrayManifest13(helpers); assert.deepEqual(context.sourcePins(), pins); assert.deepEqual(helperGraph13(), helpers);
  const approval = json13(input.approval); assert.equal(input.approval.file, F.root + '/docs/design/rust-r4ghi/source13-g2-freeze136.json'); assert.equal(approval.kind, 'Root-frozen-Source13-corrective-G2-136'); assert.equal(approval.G2Authorized, true); assert.equal(approval.actualM98Applied, false);
  const constructor = { file: F.root + '/tools/rust-r4ghi/construct-source13-bindings.mjs', rawBytesSha256: sha13(fs.readFileSync(F.root + '/tools/rust-r4ghi/construct-source13-bindings.mjs')) }; assert.deepEqual(approval.supportingTools.source13Constructor, constructor);
  assert(pins.some(pin => pin.file === 'docs/design/rust-r4ghi/source13-g2-freeze136.json')); assert(pins.some(pin => pin.file === 'tools/rust-r4ghi/migrate-frozen-parent98-136.mjs'));
  assertNullTemplate13(JSON.parse(fs.readFileSync(F.root + '/tools/rust-r4ghi/business/tax13-bindings.json')));
  assert(helpers.some(pin => pin.file === 'tools/rust-r4ghi/business/tax13-bindings.json'));
  const record = input.apiProcess ? json13(input.apiProcess) : null;
  if (record) {
    assert.equal(input.apiProcess.file, F.private + '/rust-api136-process.json'); assert.equal(record.namespace, F.namespace); assert.equal(record.root, F.mirror); assert.equal(record.port, 31441); assert(Number.isSafeInteger(record.pid) && record.pid > 1); assert(/^[a-f0-9]{64}$/.test(record.binarySha256));
    if (requireLive) { const base = '/proc/' + record.pid, stat = fs.readFileSync(base + '/stat', 'utf8'); assert.equal(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], record.startTime); assert.equal(fs.realpathSync(base + '/exe'), record.binary); assert.equal(fs.realpathSync(base + '/cwd'), F.mirror); assert.equal(sha13(fs.readFileSync(record.binary)), record.binarySha256); }
  }
  return { context, pins, helpers, record, digest: sha13(JSON.stringify(pins)) };
}
export function assertBuildFacts13(build, pins, record, rawRoot, rawMirror) {
  assert.equal(build.kind, 'actual-Source13-source-inventory-and-owned-mirror-build-binding'); assert.equal(build.namespace, F.namespace); assert.deepEqual(build.sourcePins, pins); assert.equal(build.sourcePinsSHA256, sha13(JSON.stringify(pins))); assert.equal(build.sourceCount, pins.length); assert.equal(build.binary.file, record.binary); assert.equal(build.binary.rawBytesSha256, record.binarySha256);
  assert(build.Root.receipt && build.mirror.receipt); assert.notEqual(build.Root.receipt.file, build.mirror.receipt.file, 'Root inventory and mirror cargo must be independent actual originals'); assert.notEqual(build.Root.receipt.rawBytesSha256, build.mirror.receipt.rawBytesSha256, 'One observation cannot be counted twice under two names');
  assert.equal(rawRoot.kind, 'actual-Source13-source-inventory-and-copy'); assert.equal(rawRoot.operation, 'source-inventory-and-copy'); assert.equal(rawRoot.root, F.root); assert.equal(rawRoot.destinationRoot, F.mirror);
  assert.equal(rawMirror.kind, 'actual-Source13-owned-mirror-cargo-checks-and-build'); assert.equal(rawMirror.operation, 'fmt-clippy-test-build'); assert.equal(rawMirror.root, F.mirror);
  const absoluteInputs = (inputs, base, label) => {
    assert(Array.isArray(inputs) && inputs.length > 0); const byFile = new Map();
    for (const input of inputs) { assert(typeof input.file === 'string' && path.isAbsolute(input.file), 'Each side must record its own absolute input paths'); assert.equal(path.resolve(input.file), input.file); const file = path.relative(base, input.file).split(path.sep).join('/'); assert(file && file !== '..' && !file.startsWith('../') && !path.isAbsolute(file)); assert(!byFile.has(file), 'Ambiguous duplicate observed input'); byFile.set(file, input.sha256 ?? input.rawBytesSha256); }
    for (const pin of pins) assert.equal(byFile.get(pin.file), pin.sha256, 'Actual input or copied target must match Source13: ' + label + ':' + pin.file);
  };
  assert.equal(pointer13(rawRoot, build.Root.sourceStablePointer), true); assert.equal(pointer13(rawMirror, build.mirror.sourceStablePointer), true);
  absoluteInputs(pointer13(rawRoot, build.Root.inputsPointer), F.root, 'Root inventory'); absoluteInputs(pointer13(rawRoot, build.Root.copiedInputsPointer), F.mirror, 'Root observed copy targets'); absoluteInputs(pointer13(rawMirror, build.mirror.inputsPointer), F.mirror, 'mirror cargo inputs');
  const stepPointers = build.mirror.stepPointers; assert.deepEqual(Object.keys(stepPointers).sort(), ['build', 'clippy', 'fmt', 'test']); assert.equal(new Set(Object.values(stepPointers)).size, 4, 'Each cargo command needs its own actual observation');
  const cargo = '/home/wangzishi/.cargo/bin/cargo', manifest = F.mirror + '/apps/poms-api-rust/Cargo.toml';
  const suffixes = { fmt: ['--', '--check'], clippy: ['--lib', '--no-deps', '--', '-D', 'warnings'], test: ['--all-targets'], build: ['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08'] };
  for (const name of ['fmt', 'clippy', 'test', 'build']) {
    const step = pointer13(rawMirror, stepPointers[name]); assert.equal(step.kind, 'actual-owned-mirror-cargo-command'); assert.equal(step.command, name); assert.equal(step.cwd, F.mirror); assert.equal(step.exitCode, 0);
    assert.deepEqual(step.argv, [cargo, '+1.99.1', name, '--manifest-path', manifest, ...suffixes[name]], 'Only the Root-approved complete mirror cargo protocol counts as an executed check: ' + name);
  }
  const observedBinary = pointer13(rawMirror, build.mirror.binaryPointer); assert.equal(observedBinary.file, record.binary); assert.equal(observedBinary.rawBytesSha256, record.binarySha256);
}
export function assertReadinessFacts13(ready, record) { assert.equal(ready.mode, 'start'); assert.equal(ready.pid, record.pid); assert.equal(ready.port, 31441); assert.equal(ready.readiness, 200); assert.equal(ready.binarySha256, record.binarySha256); assert.equal(ready.privateCredentialsPrinted, false); }
function buildAndReady13(input, actual) {
  assert(actual.record); const build = json13(input.actualBuild), ready = json13(input.readinessOriginal); assert.equal(fs.realpathSync(build.binary.file), path.resolve(build.binary.file)); const binaryStat = fs.lstatSync(build.binary.file); assert(binaryStat.isFile() && !binaryStat.isSymbolicLink()); assert.equal(sha13(fs.readFileSync(build.binary.file)), build.binary.rawBytesSha256); assertBuildFacts13(build, actual.pins, actual.record, json13(build.Root.receipt), json13(build.mirror.receipt)); assertReadinessFacts13(ready, actual.record); return { build, ready };
}
export function bootstrapBody13(input, actual) {
  const body = { kind: 'actual-new13-bootstrap-source-candidate-binding', namespace: F.namespace, epoch: F.epoch, run: F.run, marker: F.marker, tables: 139, migrations: 98,
    sourcePins: actual.pins, sourcePinsSHA256: actual.digest, sourceCount: actual.pins.length, process: { ...twoPin13(input.apiProcess), record: actual.record }, readiness: 200,
    readinessOriginal: input.readinessOriginal, actualBuild: input.actualBuild, plainSourcePins: input.sourcePins, helperH0: input.helperH0, actorBindingsFinal: false, formalG3Certified: false, G3Certified: false, G4Certified: false };
  for (const forbidden of ['consumerAdmission', 'registry', 'newBusinessBaseline']) assert(!Object.hasOwn(body, forbidden)); return body;
}
function noState13() { assert(!fs.existsSync(priv + '/state.json'), 'Only final108 may first create the new state'); assert(!fs.existsSync(priv + '/driver.lock')); }
export function assertOutputName13(name) { assert(typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,70}\.json$/.test(name) && !/^\d{6}-/.test(name) && name !== 'state.json'); }
export function writeConstructorArtifact13(name, value) { assertOutputName13(name); fs.mkdirSync(priv, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(priv), priv); const raw = Buffer.from(JSON.stringify(value, null, 2) + '\n'), file = priv + '/' + name; fs.writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); return { file, bytes: raw.length, rawBytesSha256: sha13(raw) }; }
function retained139(input) {
  assert.equal(input.retentionIndex.rawBytesSha256, F.index139SHA256); const index = json13(input.retentionIndex); assert.equal(index.kind, 'private-retained-source12-material-index139'); assert.equal(index.producerEpoch, 'g2-business12'); assert.equal(index.run, 'main01'); assert.equal(index.marker, F.marker); assert.equal(index.frozenState.rawBytesSha256, F.state139SHA256); assert.equal(index.retainedSnapshot.rawBytesSha256, F.before139SHA256);
  const old = json13(index.frozenState); assert(!old.activeFault && !old.blockedObservation && !old.cleaned && !old.cleanupPlan); assert.equal(old.apiProcess.rawBytesSha256, 'fd81b926dbaad79debc0343ac63b6cff7c967ac4a52cd64db0a7d0e7d4dbc2a1'); assert.equal(index.activeExecution.generation, 'API1351'); assert.equal(index.activeExecution.oldEvidenceRelabelledAs1351, false); return { index, old };
}
export async function constructMigrationReceipt13(input) {
  noState13(); const actual = await runtime13(input, false), { index, old } = retained139(input), observation = json13(input.afterObservation), bundle = json13(input.actualCommandsBundle), approval = json13(input.approval);
  assert.equal(observation.kind, 'actual-state-free-M98-after-observation164'); assert(samePin13(observation.actualCommands, input.actualCommandsBundle)); assert.deepEqual(observation.migrationBefore, index.retainedSnapshot); assert.deepEqual(observation.approval, input.approval); assert(samePin13(observation.helperGraph, input.helperH0)); assert(samePin13(observation.sourcePins, input.sourcePins)); assert.equal(observation.sourcePinsSHA256, actual.digest); assert.equal(observation.sourceCount, actual.pins.length); assert.equal(observation.Source13StateMinted, false); assert.equal(observation.DMLOrDDLExecuted, false); assert.equal(observation.readOnlyConnections, true);
  assert.deepEqual(approval.retainedSource12.receipt, index.receipt); assert.equal(bundle.commandProtocol, 'fixed-programmatic-up-only-136'); assert.equal(bundle.commands.length, 2);
  const schema = await import(pathToFileURL(F.root + '/tools/rust-r4ghi/business/schema-comparison108.mjs').href), snapshot = await import(pathToFileURL(F.root + '/tools/rust-r4ghi/business/snapshot.mjs').href);
  const before = json13(index.retainedSnapshot), after = json13(observation.migrationAfter), databases = {};
  for (const database of ['poms_r4ghi_native', 'poms_r4ghi_rust']) { const a = before.databases[database], b = after.databases[database]; const fn = meta => meta.normative.functions.map(value => JSON.parse(value)).find(value => value.schema === 'poms' && value.proname === 'jghi_assignment_participant_guard' && value.arguments === ''); const oldFn = fn(a.meta), nextFn = fn(b.meta); assert(oldFn && nextFn);
    const prior = new Set(snapshot.readRows(a.tables.poms_migrations).map(row => JSON.stringify(row.key))), added = snapshot.readRows(b.tables.poms_migrations).filter(row => !prior.has(JSON.stringify(row.key))); assert.equal(added.length, 1); const row = added[0];
    const deltas = a.meta.sequences.map(oldSequence => ({ before: oldSequence, after: b.meta.sequences.find(value => value.schema === oldSequence.schema && value.name === oldSequence.name && value.oid === oldSequence.oid) })).filter(value => JSON.stringify(value.before) !== JSON.stringify(value.after));
    databases[database] = { functionOID: oldFn.oid, beforeDefinitionSHA256: sha13(oldFn.definition), afterDefinitionSHA256: sha13(nextFn.definition), afterBodySHA256: sha13(schema.plBody108(nextFn.definition)), migrationRow: { key: row.key, rowSHA256: row.sha256, xmin: row.xmin, name: JSON.parse(row.raw).name }, actualSequenceDeltas: deltas };
  }
  const advance = { approvedSQL: approval.forwardMigration.migrationSQL, approvedMigrationSource: approval.forwardMigration.migrationTS, migrationName: approval.forwardMigration.name, migrationBefore: index.retainedSnapshot, migrationAfter: observation.migrationAfter, databases };
  const body = { kind: 'actual-normal-forward-M98-migration-receipt108', namespace: F.namespace, marker: F.marker, normalForward: true, fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139, migrationName: advance.migrationName, approvedSQL: advance.approvedSQL, approvedMigrationSource: advance.approvedMigrationSource, before: advance.migrationBefore, after: advance.migrationAfter, databases,
    commandProtocol: bundle.commandProtocol, commands: bundle.commands, actualCommandsBundle: input.actualCommandsBundle, afterObservation: input.afterObservation, G3Certified: false };
  schema.verifyM98Transition108({ originalBaseline: json13(old.baseline), retained: before, before, after, approvedSQL: read13(advance.approvedSQL).toString(), migrationName: advance.migrationName, evidence: { kind: 'exact-owned-forward-schema-advance108', fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139, databases } });
  // The existing exact136 validator consumes commands, independently of after.
  const command = await import(pathToFileURL(F.root + '/tools/rust-r4ghi/business/migration-command136.mjs').href); command.verifyFixedM98Commands136({ win: F.root, private: F.private, namespace: F.namespace, state: { marker: F.marker } }, body, advance);
  noState13(); const result = writeConstructorArtifact13(input.outputName, body); noState13(); return result;
}
export async function constructB0_13(input) { noState13(); const actual = await runtime13(input); buildAndReady13(input, actual); const body = bootstrapBody13(input, actual); const result = writeConstructorArtifact13(input.outputName, body); const after = await runtime13(input); assert.deepEqual(after.pins, actual.pins); assert.deepEqual(after.helpers, actual.helpers); assert.deepEqual(after.record, actual.record); noState13(); return result; }
export function planBody108_13(input, actual, index, old, schemaAdvance) {
  return { kind: 'retained-schema-consumer-admission108', schemaVersion: 3, policy: { fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139, normalForwardOnly: true, businessBaselineReset: false, historicalBaselineReselection: false },
    producer: { epoch: old.epoch, run: old.run, retentionIndex: input.retentionIndex, frozenState: index.frozenState, retainedSnapshot: index.retainedSnapshot, sourcePinsSHA256: sha13(JSON.stringify(old.sourcePins)), priorRegistry: old.consumerAdmission54.registry }, schemaAdvance,
    consumer: { epoch: F.epoch, run: F.run, sourcePins: input.sourcePins, sourcePinsSHA256: actual.digest, sourceCount: actual.pins.length, binarySHA256: actual.record.binarySha256, apiProcess: twoPin13(input.apiProcess), candidateReceipt: input.bootstrapCandidate, helperPins: input.helperH0,
      candidateSourceDigestPointer: '/sourcePinsSHA256', candidateBinaryHashPointer: '/process/record/binarySha256', impactReview: input.impactReview }, derivedComparisonBaseline: null, registry: null, actualM98Applied: true, Source13Certified: false, G3Certified: false, G4Certified: false };
}
export async function constructPlan108_13(input) {
  noState13(); const { index, old } = retained139(input), b0 = json13(input.bootstrapCandidate), actual = await runtime13(input); buildAndReady13(input, actual); assert.equal(b0.kind, 'actual-new13-bootstrap-source-candidate-binding'); assert.deepEqual(b0, bootstrapBody13(input, actual)); contained13(priv, input.bootstrapCandidate.file);
  const migration = json13(input.migrationReceipt); assert.equal(migration.kind, 'actual-normal-forward-M98-migration-receipt108'); assert.deepEqual(migration.before, index.retainedSnapshot); assert.equal(migration.toMigrations, 98);
  const schemaAdvance = { approvedSQL: migration.approvedSQL, approvedMigrationSource: migration.approvedMigrationSource, actualMigrationReceipt: input.migrationReceipt, migrationName: migration.migrationName, migrationBefore: migration.before, migrationAfter: migration.after, databases: migration.databases };
  const schema = await import(pathToFileURL(F.root + '/tools/rust-r4ghi/business/schema-comparison108.mjs').href); schema.verifyMigrationReceipt108({ win: F.root, private: F.private, namespace: F.namespace, state: { marker: F.marker } }, schemaAdvance);
  const plan = planBody108_13(input, actual, index, old, schemaAdvance);
  const line = await import(pathToFileURL(F.root + '/tools/rust-r4ghi/business/registry-lineage62.mjs').href); line.assertImpactReview62(json13(input.impactReview), plan.producer, plan.consumer); noState13(); return writeConstructorArtifact13(input.outputName, plan);
}
export function admittedBody13(b0, b0Pin, state, registry, registryPin) {
  assert.equal(registry.schemaVersion, 3); assert.equal(registry.consumer.epoch, F.epoch); assert.equal(registry.consumer.run, F.run); assert.deepEqual(registry.consumer.candidateReceipt, b0Pin, 'R3 consumer must permanently reference the original B0'); assert.deepEqual(state.consumerAdmission54.registry, registryPin);
  assert(samePin13(registry.consumer.apiProcess, b0.process)); assert.deepEqual(state.apiProcess.record, b0.process.record); assert.equal(registry.consumer.sourcePinsSHA256, b0.sourcePinsSHA256); assert.deepEqual(state.sourcePins, b0.sourcePins); assert(!state.processRestart1351);
  return { ...structuredClone(b0), kind: 'actual-new13-admitted-source-candidate-binding', process: { ...structuredClone(registry.consumer.apiProcess), record: structuredClone(state.apiProcess.record) }, bootstrapCandidate: structuredClone(b0Pin), consumerAdmission: structuredClone(state.consumerAdmission54), actorBindingsFinal: false, formalG3Certified: false };
}
export async function constructB1_13(input) {
  const stateFile = priv + '/state.json', beforeBytes = fs.readFileSync(stateFile), state = JSON.parse(beforeBytes), registryPin = state.consumerAdmission54.registry, registry = json13(registryPin), b0 = json13(input.bootstrapCandidate), actual = await runtime13(input); buildAndReady13(input, actual);
  const consumer = await import(pathToFileURL(F.root + '/tools/rust-r4ghi/business/consumer-admission54.mjs').href); consumer.readAdmittedConsumerContext({ statePin: { file: stateFile, rawBytesSha256: sha13(beforeBytes) } });
  assert.deepEqual(json13(registry.consumer.helperPins), actual.helpers); assert.deepEqual(json13(registry.consumer.sourcePins), actual.pins); assert.deepEqual(b0, bootstrapBody13(input, actual));
  const result = writeConstructorArtifact13(input.outputName, admittedBody13(b0, input.bootstrapCandidate, state, registry, registryPin)); assert.equal(sha13(fs.readFileSync(stateFile)), sha13(beforeBytes), 'B1 constructor never changes state/counter'); assert.deepEqual(json13(registryPin), registry); return result;
}
async function main13() { if (process.argv.includes('--help')) { process.stdout.write('Root FS constructors only: --mode migration-receipt|B0|plan108|B1 --input <private.json> --approved-input-sha <SHA> --execute\nNo state mint/counter/DB/HTTP/process action. Null templates always reject.\n'); return; }
  assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.equal(fs.realpathSync(process.execPath), '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node'); assert.deepEqual(process.execArgv, []); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH); const args = process.argv.slice(2); assert.equal(args.length, 7); assert.equal(args[0], '--mode'); assert.equal(args[2], '--input'); assert.equal(args[4], '--approved-input-sha'); assert.equal(args[6], '--execute'); const raw = fs.readFileSync(args[3]); assert.equal(sha13(raw), args[5]); const input = JSON.parse(raw); assert.equal(input.kind, 'Root-approved-Source13-FS-constructor-input'); assert.equal(input.mode, args[1]); assert.equal(input.actualInputsComplete, true); assert.equal(input.G3Certified, false);
  const modes = { 'migration-receipt': constructMigrationReceipt13, B0: constructB0_13, plan108: constructPlan108_13, B1: constructB1_13 }; assert(Object.hasOwn(modes, input.mode)); const result = await modes[input.mode](input); process.stdout.write(JSON.stringify({ mode: input.mode, artifact: result, stateCounterUsed: false, DBOrHTTPExecuted: false, G3Certified: false }) + '\n'); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main13().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
