// Read installed implementation and exercise only its dispatcher with in-memory stubs.
// Never calls MikroORM.init, constructs pg.Client, connects, runs SQL or imports Root runner.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
import { createRequire } from 'node:module'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
assert.equal(process.platform, 'linux');
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', out = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire('/home/wangzishi/projects/poms-rust-r4ghi/package.json'), sha = b => createHash('sha256').update(b).digest('hex'), pins = [];
const read = (file, expected) => { const b = fs.readFileSync(file), rawBytesSha256 = sha(b); if (expected) assert.equal(rawBytesSha256, expected); pins.push({ file, rawBytesSha256, bytes: b.length }); return b; };
const runnerFile = root + '/tools/rust-r4ghi/migrate-frozen-parent98-136.mjs';
const runner = read(runnerFile, '29e195b4e80c6089387d66e384eb7b7eef28f5c58cf047a7ce87726e6cc0e5e1').toString();
const migrationRoot = path.dirname(require.resolve('@mikro-orm/migrations')), coreRoot = path.dirname(require.resolve('@mikro-orm/core'));
const migrationVersion = JSON.parse(read(migrationRoot + '/package.json')).version, coreVersion = JSON.parse(read(coreRoot + '/package.json')).version;
assert.equal(migrationVersion, '7.0.11'); assert.equal(coreVersion, '7.0.11');
for (const file of [migrationRoot + '/Migrator.js', migrationRoot + '/MigrationStorage.js', migrationRoot + '/MigrationRunner.js', coreRoot + '/utils/AbstractMigrator.js', coreRoot + '/utils/AbstractMigrator.d.ts']) read(file);
const { Migrator } = require('@mikro-orm/migrations');
const target = 'Migration20261108090000_rust_frozen_assignment_parent_lock';
const previous = fs.readdirSync(root + '/apps/poms-api/src/migrations').filter(n => /^Migration\d{14}.*\.ts$/.test(n)).sort().map(n => n.slice(0, -3));
assert.equal(previous.length, 97, 'This is a pre-M98 static review, not a post-migration certification'); assert(!previous.includes(target));
const events = [], executed = [...previous], all = [...previous, target].map(name => ({ name, up: async () => { events.push({ kind: 'stub-only-up', name }); }, down: async () => { throw Error('Down dispatcher must never be selected'); } }));
const fake = Object.create(Migrator.prototype);
fake.options = { transactional: true, allOrNothing: true, snapshot: false };
fake.init = async () => { events.push({ kind: 'stub-only-init-no-I/O' }); };
fake.discoverMigrations = async () => all;
fake.emit = async (kind, event) => { events.push({ kind, name: event.name }); };
fake.storage = { executed: async () => [...executed], getExecutedMigrations: async () => executed.map(name => ({ name })),
  logMigration: async ({ name }) => { events.push({ kind: 'stub-only-log-no-SQL', name }); executed.push(name); },
  setMasterMigration: () => {}, unsetMasterMigration: () => {} };
fake.runner = { setMasterMigration: () => {}, unsetMasterMigration: () => {} };
fake.driver = { getConnection: () => ({ transactional: async callback => { events.push({ kind: 'stub-only-transaction-no-SQL' }); return callback({ synthetic: true }); } }) };
assert.deepEqual(await fake.getPending(), [{ name: target, path: undefined }]);
const applied = await fake.up({ migrations: [target] }); assert.equal(applied.length, 1); assert.equal(applied[0].name, target); assert.deepEqual(Object.keys(applied[0]).sort(), ['name', 'path']);
assert.equal((await fake.getExecuted()).length, 98); assert.equal(events.filter(e => e.kind === 'stub-only-up').length, 1); assert(events.filter(e => e.kind === 'stub-only-up').every(e => e.name === target));
assert.equal(events.filter(e => e.kind === 'stub-only-transaction-no-SQL').length, 1);
assert.equal(events.filter(e => e.kind === 'stub-only-log-no-SQL').length, 1);
assert(runner.includes('orm.migrator.up({ migrations: [TARGET] })')); assert(!/orm\.migrator\.down\s*\(/.test(runner));
const approvalFile = root + '/docs/design/rust-r4ghi/source13-g2-freeze136.json';
const report = { kind: 'independent-local-MikroORM136-dispatch-shape88', runner: pins[0], installed: { migrations: migrationVersion, core: coreVersion },
  realInstalledPrototypeDispatchWithOnlyInMemoryStubs: true, pendingBefore: [target], returnedKeys: Object.keys(applied[0]), returnedName: applied[0].name,
  actualFileBasenameNameMatchesStorageExtensionStripRule: true, exactlyOneStubUpAndLogAndTransaction: true,
  approvalFileExistedAtRead: fs.existsSync(approvalFile), actualMigrationsExecuted: 0, actualDBConnections: 0, HTTPRequests: 0,
  noRootRunnerImportOrORMInit: true, Source13Certified: false, G3Certified: false, G4Certified: false, events, installedImplementationPins: pins };
fs.writeFileSync(out + '/mikro-shape88.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ installed: report.installed, exactTargetDispatchAndResultName: true, actualDBConnections: 0, actualMigrationsExecuted: 0, approvalFileExistedAtRead: report.approvalFileExistedAtRead }));
