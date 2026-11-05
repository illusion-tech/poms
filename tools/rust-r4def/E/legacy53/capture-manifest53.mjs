// Static public-source capture, plus previously executed PURE schema evidence.
// Does not import Native main, run either backend, inspect env/private or query DB.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { OPERATIONS53, createLegacyInvoiceAcceptance53 } from './request-driver53.mjs';
const own = path.dirname(fileURLToPath(import.meta.url));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const require = createRequire(root + '/package.json'), ts = require('typescript');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = (file, base = root) => { const bytes = fs.readFileSync(path.join(base, file)); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const sources = [
  'dist/apps/poms-api/main.js', 'dist/apps/poms-api/main.js.map',
  'apps/poms-api/src/app/core/rust-r4def-frozen-native-reference.ts',
  'apps/poms-api/src/app/features/contract-finance/contract-finance.controller.ts',
  'apps/poms-api/src/app/features/contract-finance/contract-finance.service.ts',
  'apps/poms-api/src/app/features/contract-finance/invoice-record.entity.ts',
  'apps/poms-api/src/app/features/project-cost/project-cost.service.ts',
  'apps/poms-api/src/app/features/project-cost/expense-record.entity.ts',
  'apps/poms-api/src/migrations/Migration20260412193000_add_expense_record.ts',
  'apps/poms-api/src/migrations/Migration20261104060000_rust_r4def_execution_cost.ts',
  'docs/design/rust-r4def/E-schema-candidate02.sql',
  'libs/shared/api-spec/openapi.json',
].map(file => pin(file));
const map = JSON.parse(fs.readFileSync(path.join(root, 'dist/apps/poms-api/main.js.map'), 'utf8'));
function extract(suffix) { const indices = map.sources.map((name, index) => ({ name, index })).filter(v => v.name.endsWith(suffix)); if (indices.length !== 1) throw Error('Unique public build50 source required'); const item = indices[0], text = map.sourcesContent[item.index]; return { file: item.name, text, bytes: Buffer.byteLength(text), rawBytesSha256: sha(text) }; }
const nativeSources = ['/src/app/core/rust-r4def-frozen-native-reference.ts', '/src/app/features/contract-finance/contract-finance.controller.ts', '/src/app/features/contract-finance/contract-finance.service.ts', '/src/app/features/contract-finance/invoice-record.entity.ts', '/src/app/features/project-cost/project-cost.service.ts', '/src/app/features/project-cost/expense-record.entity.ts', '/src/main.ts'].map(extract);
const service = nativeSources.find(s => s.file.endsWith('/contract-finance.service.ts'));
const ast = ts.createSourceFile(service.file, service.text, ts.ScriptTarget.Latest, true);
let owner;
function findClass(node) { if ((ts.isClassDeclaration(node) || ts.isClassExpression(node)) && node.name?.text === 'ContractFinanceService') owner = node; ts.forEachChild(node, findClass); }
findClass(ast);
const create = owner?.members.find(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === 'createInvoice');
if (!create || /currencyCode|currencySource|currency_source/.test(create.getText(ast))) throw Error('Frozen Native invoice service unexpectedly writes currency');
const entity = nativeSources.find(s => s.file.endsWith('/invoice-record.entity.ts')).text;
const nullable = ['currencyCode', 'currencySource', 'currencySourceSnapshotId'].map(name => ({ property: name, explicitlyNullable: new RegExp(name + ':[^\\n]+\\.nullable\\(\\)').test(entity) }));
if (nullable.some(c => !c.explicitlyNullable)) throw Error('Current Native currency ORM nullable assumptions changed');
const pure = JSON.parse(fs.readFileSync(path.join(own, 'pure-schema-check53.json'), 'utf8'));
if (!Object.values(pure.results).every(v => v === true || v === '10.123') || pure.limitations.actualHTTPExecuted || pure.limitations.databaseConnected) throw Error('Pure schema proof did not pass or is misclassified');
if (pure.buildMap.rawBytesSha256 !== sources.find(s => s.file.endsWith('main.js.map')).rawBytesSha256) throw Error('Native build map changed after pure proof');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'libs/shared/api-spec/openapi.json'), 'utf8'));
const operations = Object.entries(OPERATIONS53).map(([operationId, [method, template, status]]) => {
  const found = Object.entries(spec.paths).flatMap(([p, methods]) => Object.entries(methods).filter(([, op]) => op.operationId === operationId).map(([m, op]) => ({ path: p, method: m.toUpperCase(), responses: Object.keys(op.responses) })));
  if (found.length !== 1 || found[0].method !== method || found[0].path.replace(/\{[^}]+\}/g, '{id}') !== template || !found[0].responses.includes(String(status))) throw Error('Current canonical E20 operation mismatch');
  return { operationId, method, path: found[0].path, normalSuccessStatus: status, thisCase: operationId.startsWith('ProjectCost') ? 'actual Rust422 required' : 'actual Native old-protocol HTTP required' };
});
const initial = createLegacyInvoiceAcceptance53({}).manifest();
if (initial.HTTPPassed !== 0 || initial.stages.some(s => s.status !== 'not-run')) throw Error('Static import executed acceptance');
const migration = fs.readFileSync(path.join(root, 'apps/poms-api/src/migrations/Migration20261104060000_rust_r4def_execution_cost.ts'), 'utf8');
if (!migration.includes('R4E legacy excess-scale/capacity money requires controlled review; no automatic rewrite')) throw Error('Frozen precision guard message not found');
for (const source of sources) if (pin(source.file).rawBytesSha256 !== source.rawBytesSha256) throw Error('Root public input changed during capture');
const products = ['request-driver53.mjs', 'E20-read-only-proof.sql', 'README.md', 'pure-schema-check53.mjs', 'pure-schema-check53.json', 'capture-manifest53.mjs'].map(file => pin(file, own));
const manifest = {
  kind: 'R4DEF-E20-real-old-Native-source-candidate53', createdAt: new Date().toISOString(), products, publicSourcePins: sources,
  build50EmbeddedSourcePins: nativeSources.map(({ text, ...pin }) => pin), exactNativeCreateInvoiceMethodSHA256: sha(create.getText(ast)),
  staticNativeCompatibility: { currentDTOAbsentCurrencyAccepted: true, frozenNoCurrencyAccepted: true, frozenVerifiedPatchAccepted: true, nativeExtraCurrencyRejected501: true, nativeCreateCurrencySetterAbsent: true, newORMCurrencyColumns: nullable, DB94CheckAllowsTripleNULL: 'Defined in frozen/current migration94; actual catalog and inserted row must be independently observed', originalMainListen: 'await app.listen(port); HOST does not pin binding; Root test launcher only' },
  pureEvidence: { file: 'pure-schema-check53.json', status: 'passed actual exact-source schemas and installed DecimalType conversion; not HTTP/DB' },
  operationAuthority: operations, initial,
  precisionProbe: { status: 'not-run', freshDB93Required: true, oldExpenseNumeric: '15,4 per original expense migration and no intervening expense type alteration in inspected93 chain', ordinaryMainDB94ForbiddenForLegacyPrecisionCreation: true, oldNativeExpenseString10_123PurelyAccepted: true, realDBPersistenceStillUnproven: true, expectedActualPGTextBeforeMigration: '10.1230', expectedGuardMessage: 'R4E legacy excess-scale/capacity money requires controlled review; no automatic rewrite', wholeMigration94TransactionRequired: true, beforeAfterProof: ['exact original10.1230 and rows', 'all113 poms base tables and deterministic row digests', 'DDL columns/constraints/indexes/triggers/defaults unchanged', 'ledger remains93 and no partial D/F objects'], unavailableRouteRule: 'If real old API rejects, ORM fails, or exact stored value is not10.1230, report route unavailable/not-proven; no SQL amount/schema workaround' },
  execution: { NativeStarted: false, NativeMainImported: false, HTTPExecuted: false, databaseConnected: false, privateRead: false, newRustCurrencylessCreateSuccessClaimed: false, migrationRun: false, productOrEnvironmentChanged: false, G3Certified: false, G4Certified: false },
};
fs.writeFileSync(path.join(own, 'manifest53.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: pin('manifest53.json', own), driver: products[0], actualNativeBinary: sources[0], initialStages: initial.stages.length, HTTPPassed: 0, nativeStarted: false }));
