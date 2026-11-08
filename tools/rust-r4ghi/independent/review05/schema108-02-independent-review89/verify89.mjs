// Independent source/FS/shape checks only. Never imports Root runner or ORM.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
import { createHash } from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
assert.equal(process.platform, 'linux');
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', authorBase = '/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/';
const current = authorBase + 'schema-admission108-02', old = authorBase + 'schema-admission108', out = path.dirname(fileURLToPath(import.meta.url));
const sha = b => createHash('sha256').update(b).digest('hex'), inputs = [];
const read = (file, expected) => { const b = fs.readFileSync(file), rawBytesSha256 = sha(b); if (expected) assert.equal(rawBytesSha256, expected, file); inputs.push({ file, rawBytesSha256, bytes: b.length }); return b; };
const manifestHash = '53559669a4bdbe095ada4511703805224f26c60cbfaaa5b36c820f5d1e5d3ce5';
const m = JSON.parse(read(current + '/manifest108-02.json', manifestHash)); read(old + '/manifest108.json', m.original108ManifestSHA256);
for (const c of m.candidates) { assert.equal(read(current + '/' + c.candidate, c.afterSHA256).length, c.bytes); if (c.beforeRoot) { read(current + '/' + c.beforeRoot, c.beforeRootSHA256); read(root + '/' + c.target, c.beforeRootSHA256); } else assert(!fs.existsSync(root + '/' + c.target)); if (c.unchangedFrom108) read(old + '/proposed/' + c.target, c.afterSHA256); }
for (const c of m.sidecars) assert.equal(read(current + '/' + c.file, c.rawBytesSha256).length, c.bytes);
for (const c of m.unchangedRootDependencies) read(root + '/' + c.path, c.sha256);
for (const c of m.deltaFrom108) if (c.before108) read(current + '/' + c.before108, c.before108SHA256);
const oldSchema = read(old + '/proposed/tools/rust-r4ghi/business/schema-comparison108.mjs').toString(), newSchema = read(current + '/proposed/tools/rust-r4ghi/business/schema-comparison108.mjs').toString();
assert.equal(oldSchema.slice(oldSchema.indexOf('const sha ='), oldSchema.indexOf('export function verifyMigrationReceipt108')), newSchema.slice(newSchema.indexOf('const sha ='), newSchema.indexOf('export function verifyMigrationReceipt108')));
assert.equal(oldSchema.slice(oldSchema.indexOf('export function verifySchemaBinding108')), newSchema.slice(newSchema.indexOf('export function verifySchemaBinding108')));
const subtests = b => b.toString().split('\n').filter(l => l.startsWith('# Subtest: ')).map(l => l.slice(11));
const oldTests = subtests(read(old + '/pure108.stdout.log')), newLog = read(current + '/pure108.stdout.log'), newTests = subtests(newLog);
assert.equal(oldTests.length, 48); assert.equal(newTests.length, 67); assert.deepEqual(newTests.slice(0, 48), oldTests); assert(/# pass 67\r?\n# fail 0/.test(newLog.toString()));
const { FIXED_M98_COMMAND136: F, assertFixedM98Invocation136: shape, verifyFixedM98Commands136: verify } = await import(pathToFileURL(current + '/proposed/tools/rust-r4ghi/business/migration-command136.mjs'));
read(F.root + '/' + F.runner, F.runnerSHA256); const nodeSHA = sha(read(F.node));
const command = database => ({ kind: 'captured-fixed-programmatic-M98-command136', database, direction: 'up', migrationName: F.target, exitCode: 0,
  argv: [F.node, F.root + '/' + F.runner, '--database', database, '--execute'], runner: { file: F.root + '/' + F.runner, rawBytesSha256: F.runnerSHA256 },
  node: { file: F.node, rawBytesSha256: nodeSHA }, approval: { file: F.root + '/' + F.approval, rawBytesSha256: '0'.repeat(64) },
  intent: { file: F.private + '/migration98-136/' + database + '/intent.json', rawBytesSha256: '0'.repeat(64) },
  executionReceipt: { file: F.private + '/migration98-136/' + database + '/execution.json', rawBytesSha256: '0'.repeat(64) } });
const valid = command('poms_r4ghi_native'); assert.equal(shape(valid).migratorMethod, 'up');
const rejected = [];
for (const [name, mutate] of [
  ['IR87-01 same UP labels but original DOWN argv', c => { c.argv = ['node', 'node_modules/.bin/mikro-orm', 'migration:down', '--only', F.target]; }],
  ['unrelated program with UP label', c => { c.argv[1] = '/bin/true'; }],
  ['different allowed database in argv', c => { c.argv[3] = 'poms_r4ghi_rust'; }],
  ['unowned database', c => { c.database = 'poms'; c.argv[3] = 'poms'; }],
  ['different migration name', c => { c.migrationName = 'Migration20990101000000_other'; }],
  ['extra free direction argument', c => { c.argv.push('--direction', 'down'); }],
  ['unreviewed runner hash', c => { c.runner.rawBytesSha256 = '1'.repeat(64); }],
  ['Node path substituted', c => { c.node.file = '/usr/bin/node'; c.argv[0] = '/usr/bin/node'; }],
  ['foreign execution original', c => { c.executionReceipt.file = F.private + '/other/execution.json'; }],
  ['wrapper nonzero exit', c => { c.exitCode = 1; }]
]) { const v = structuredClone(valid); mutate(v); assert.throws(() => shape(v), { name: 'AssertionError' }); rejected.push({ name, rejectedBeforeFS: true }); }
const advance = { migrationName: F.target, approvedSQL: { file: F.root + '/' + F.sql, rawBytesSha256: F.sqlSHA256 }, approvedMigrationSource: { file: F.root + '/apps/poms-api/src/migrations/' + F.target + '.ts', rawBytesSha256: F.tsSHA256 } };
const ctx = { win: F.root, private: F.private, namespace: 'poms-r4ghi', state: { marker: F.marker } }, receipt = { commandProtocol: 'fixed-programmatic-up-only-136', commands: [command('poms_r4ghi_native'), command('poms_r4ghi_rust')] };
assert(!fs.existsSync(F.root + '/' + F.approval), 'This check specifically records the currently missing real approval, not a future permission');
let missingApproval = null;
try { verify(ctx, receipt, advance); assert.fail('Missing real G2 file must be refused'); } catch (error) { assert.equal(error.code, 'ENOENT'); assert.equal(error.path, F.root + '/' + F.approval); missingApproval = { code: error.code, file: error.path }; }
const corruptNode = structuredClone(receipt); for (const c of corruptNode.commands) c.node.rawBytesSha256 = '0'.repeat(64);
assert.throws(() => verify(ctx, corruptNode, advance), { name: 'AssertionError' });
const report = { kind: 'I108-02-IR87-01-independent-incremental-review89', createdAt: new Date().toISOString(), nonAuthor: true,
  authorManifest: { file: current + '/manifest108-02.json', rawBytesSha256: manifestHash },
  conclusion: 'IR87-01-static-tooling-fix-verified-exact-12-file-composition-admissible',
  closedStaticFindings: ['IR87-01'], newP1P2: [],
  composition: { totalFinalCandidates: 12, exactRootBeforeOrAbsent: true, unchangedFrom108: 8, deltaFrom108: 4,
    explicitContextSourceLeaves: ['docs/design/rust-r4ghi/source13-g2-freeze136.json', 'tools/rust-r4ghi/migrate-frozen-parent98-136.mjs'] },
  preserved: { originalM97BaselineAndSchema3DeltaFunctionsByteExact: true, original108AndReview87Unchanged: true, old48TestNamesInSameOrder: true, authorActualPureLog: { total: 67, pass: 67, fail: 0 }, productionReaderHasNoTestModeOrInjectedReader: true },
  independentChecks: { normalizedFixedInvocationShapePassed: true, rejectedInvocationMutations: rejected, physicalCurrentNodeBytesMismatchRejected: true, actualMissingG2FileRejected: missingApproval,
    fullActualM98ReceiptOrRegistryMintExercised: false },
  actualInvocationCompatibility: ['Root136 intent/execution/unique stdout JSON exact shapes are matched without inventing the old108 namespace/host/owner/onlyMigration fields.',
    'Root approval inputs must be the sorted 98 migration relative paths, with raw hashes, as documented; pins use exact two fields where deep equality requires them.',
    'The frozen pre-migration G2 approval keeps actualM98Applied=false; actual migration completion is separate immutable execution/advance evidence.'],
  rootMayProceedWithin: 'Non-author Root may apply/check the exact 12 tooling files as part of a separately frozen new G2/Source13 graph, then execute only after real approval and retention/stop requirements. This is not permission to run the current null templates.',
  stillRequired: ['Actual Source12 final retention and stopped old APIs/driver, normal M98 raw command+before/after/fresh two-database proof.',
    'Real G2 approval, Source13 source/count/binary/process/complete helpers/candidate/impact/plan pins and separate read-only schema3 mint review.',
    'New-source business/FI/HTTP/DOM acceptance and full joint G3/G4 remain separate.'],
  SQL: 0, HTTP: 0, runnerExecutions: 0, actualMigrationsExecuted: 0, registriesMinted: 0, RootWrites: 0, GitWrites: 0,
  actualSource13Certified: false, actualM98Certified: false, authoredG83G84IndependentG3Granted: false, G3Certified: false, G4Certified: false, inputs };
fs.writeFileSync(out + '/review89.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ manifest: manifestHash, staticP2Closed: 'IR87-01', exactFinalCandidates: 12, independentInvocationRejections: rejected.length, actualMissingApprovalRejected: true, physicalNodeMismatchRejected: true, G3Certified: false, reportSHA256: sha(fs.readFileSync(out + '/review89.json')) }));
