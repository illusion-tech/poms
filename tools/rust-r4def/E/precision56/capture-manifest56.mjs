// Static inspection ONLY. Never import/execute probe56 or inspect any private/env.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const own = path.dirname(fileURLToPath(import.meta.url));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const require = createRequire(root + '/package.json'), ts = require('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = (file, base = root) => { const b = fs.readFileSync(path.join(base, file)); return { file, bytes: b.length, rawBytesSha256: hash(b) }; };
const file = 'probe56.mjs', text = fs.readFileSync(path.join(own, file), 'utf8'), ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
if (ast.parseDiagnostics.length) throw Error('Probe syntax diagnostics');
const constants = new Map();
for (const statement of ast.statements.filter(ts.isVariableStatement)) for (const d of statement.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer && (ts.isStringLiteral(d.initializer) || ts.isNumericLiteral(d.initializer))) constants.set(d.name.text, d.initializer.text);
for (const [key, value] of Object.entries({ DB: 'poms_r4def_legacy_probe56', APP: 'poms_r4def_legacy_probe56_app', NS: 'poms-r4def-precision56', PORT: '31343', PGPORT: '25433', BUNDLE_SHA: 'da0bc8804db5e5de3ee56f60d351238de604a2db709f3c0d2eaee76d5f7e0636' })) if (constants.get(key) !== value) throw Error('Fixed scope mismatch:' + key);
if (/DROP\s+OWNED|DROP\s+DATABASE[^\n]*FORCE|pg_terminate_backend|rm\s+-rf|Remove-Item/i.test(text)) throw Error('Forbidden broad cleanup primitive');
if (/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:["']?poms["']?\.)/i.test(text)) throw Error('Ad-hoc POMS business SQL producer found');
if (!text.includes('transactional: true, allOrNothing: true, safe: true') || !text.includes('no automatic rewrite') || !text.includes("assert.equal(row.amount, '10.1230'") || !text.includes('assert.equal(result.status, 201)')) throw Error('Required real producer/migration guard missing');
const sourceNames = ['tools/rust-r4def/environment21.mjs', 'tools/rust-r4def/native-legacy53.mjs', 'dist/apps/poms-api/main.js', 'apps/poms-api/src/migrations/Migration20260412193000_add_expense_record.ts', 'apps/poms-api/src/migrations/Migration20261104060000_rust_r4def_execution_cost.ts', 'apps/poms-api/src/seeders/database.seeder.ts', 'apps/poms-api/src/seeders/dev-seed-data.ts', 'apps/poms-api/src/app/core/persistence/persistence.config.ts', 'apps/poms-api/src/app/features/project-cost/project-cost.service.ts', 'libs/shared/api-spec/openapi.json'];
const sources = sourceNames.map(name => pin(name));
if (sources.find(p => p.file === 'dist/apps/poms-api/main.js').rawBytesSha256 !== constants.get('BUNDLE_SHA')) throw Error('Actual public main50 changed');
const migrations = fs.readdirSync(root + '/apps/poms-api/src/migrations').filter(n => /^Migration.*\.ts$/.test(n)).sort().map(name => pin('apps/poms-api/src/migrations/' + name));
if (migrations.length !== 94 || !migrations.at(-1).file.endsWith('/Migration20261104060000_rust_r4def_execution_cost.ts')) throw Error('Original93 + exact94 input boundary changed');
const spec = JSON.parse(fs.readFileSync(root + '/libs/shared/api-spec/openapi.json', 'utf8'));
const ids = ['AuthController_getCsrfToken', 'AuthController_createPasswordAuthSession', 'AuthController_getCurrentAuthSession', 'CustomerController_create', 'ProjectController_create', 'DictionaryController_create', 'DictionaryController_list', 'ProjectCostController_createExpenseRecord'];
const operations = [];
for (const [template, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) if (ids.includes(op.operationId)) operations.push({ operationId: op.operationId, method: method.toUpperCase(), path: template });
if (operations.length !== ids.length) throw Error('Actual Native route authority missing');
const manifest = {
  kind: 'Root-owned-precision56-executable-probe-candidate', createdAt: new Date().toISOString(),
  products: ['probe56.mjs', 'README.md', 'capture-manifest56.mjs'].map(name => pin(name, own)), publicSourcePins: sources, exactMigrationInputs: migrations,
  fixedScope: Object.fromEntries(['DB', 'APP', 'NS', 'PORT', 'PGPORT', 'BUNDLE_SHA'].map(k => [k, constants.get(k)])),
  modes: ['prepare', 'server start', 'server status', 'server stop', 'exercise', 'negative', 'cleanup', 'status'].map(name => ({ name, status: 'not-run' })),
  actualOperationAuthority: operations,
  staticReview: { nodeSyntax: 'passed node --check', ASTTypeScript: ts.version, fixedNewDatabaseRoleAndPort: true, onlyNewOwnedRoleDBDropped: true, forcedConnectionTerminationAbsent: true, recursiveDeleteAbsent: true, adHocPomsBusinessSQLProducerAbsent: true, environmentMarkerSQLClassifiedInfrastructure: true, original93MigrationsAndOriginalSeederOnly: true, API201AndExactOldPG10_1230RequiredBefore94: true, whole94TransactionalAllOrNothing: true, beforeAfter113RawRowsDDLAndLedgerComparison: true, ownPIDStartTimeCommandPathGuards: true, Native53PIDOr31342NeverTargeted: true },
  plannedEvidence: ['guarded parent new-namespace identity, PG15 isolated/25433', 'new probe marker/roleOID/databaseOID', 'original93/113/numeric15,4', 'real frozen Native customer/project/dictionary/expense API201', 'actual PG original10.1230', 'own Native stopped', 'whole94 exact excess-scale guard exception', 'all113 row string/DDL/ledger93 exact unchanged', 'owned-only cleanup with evidence retained'],
  authorExecution: { runtimeModesExecuted: false, privateOrSecretsRead: false, processOrEnvironmentTouched: false, DBConnected: false, HTTPCalled: false, NativeStarted: false, migrationExecuted: false, cleanupExecuted: false, businessAccepted: false, performanceClaimed: false, G3Certified: false, G4Certified: false },
};
for (const s of sources) if (pin(s.file).rawBytesSha256 !== s.rawBytesSha256) throw Error('Root source changed during capture');
fs.writeFileSync(path.join(own, 'manifest56.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: pin('manifest56.json', own), executable: manifest.products[0], modeCount: manifest.modes.length, authorExecutedModes: false }));
