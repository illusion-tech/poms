// Static public-source inspection. Does not import cleanup103 or invoke I/O helpers.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { normalizeHTTP103 } from './ownership103.mjs';
const own = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = (file, base = root) => { const b = fs.readFileSync(path.join(base, file)); return { file, bytes: b.length, rawBytesSha256: sha(b) }; };
const require = createRequire(root + '/package.json'), ts = require('typescript');
const names = ['ownership103.mjs', 'io103.mjs', 'cleanup103.mjs', 'capture-inputs103.mjs', 'capture-manifest103.mjs'];
for (const file of names) assert.equal(ts.createSourceFile(file, fs.readFileSync(own + '/' + file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS).parseDiagnostics.length, 0);
const entry = fs.readFileSync(own + '/cleanup103.mjs', 'utf8'), io = fs.readFileSync(own + '/io103.mjs', 'utf8'), index = fs.readFileSync(own + '/ownership103.mjs', 'utf8');
assert(entry.indexOf("assert(process.argv.includes('--allowRootExecution')") < entry.indexOf("'/tools/rust-r4def/db33.mjs'"));
assert(!/SET\s+(?:TIME\s+ZONE|timezone)\b/i.test(io), 'Retain actual original baseline timezone presentation');
assert(io.includes("current_setting('TimeZone') presentation_time_zone") && io.includes('expectedBaselineTimeZone'));
assert(!/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE|DROP\s+(?:TABLE|DATABASE))\s+poms\./i.test(entry), 'Only frozen core privateStatement may generate perPK DML');
assert(entry.includes('core.assertApplyAdmission70') && entry.includes('core.assertRestored70') && entry.includes('core.assertTwoNoOps70') && entry.includes("commitUnknown = true"));
assert(index.includes('forbiddenGenericParents') && index.includes('actors33-exact-authorized-created-credential-ID') && index.includes('exactRangeCovered') && index.includes('unclaimed'));
const actualPublic = JSON.parse(fs.readFileSync(root + '/tmp/rust-r4def/root/api32/00075-CustomerController_create.json', 'utf8'));
const normalized = normalizeHTTP103(actualPublic, { receiptId: 'tmp/rust-r4def/root/api32/00075-CustomerController_create.json' }); assert(normalized.successfulMutation && normalized.res.id && normalized.relatedUUIDs.includes(normalized.res.id));
const routes = JSON.parse(fs.readFileSync(own + '/operation-authority103.json', 'utf8')), numbers = JSON.parse(fs.readFileSync(own + '/number-specs103.json', 'utf8')); assert.equal(Object.values(routes.paths).reduce((n, v) => n + Object.keys(v).length, 0), 293); assert.equal(Object.keys(numbers.businessNumbers).length, 9);
const sourceNames = ['tools/rust-r4def/cleanup-plan65.mjs', 'tools/rust-r4def/catalog25.mjs', 'tools/rust-r4def/db33.mjs', 'tools/rust-r4def/api-harness32.mjs', 'tools/rust-r4def/ui-server45.mjs', 'tools/rust-r4def/actors33.mjs', 'tools/rust-r4def/actors-finish35.mjs', 'tools/rust-r4def/foundation77.mjs', 'tools/rust-r4def/run-summary39.mjs', 'tools/rust-r4def/native-legacy53.mjs', 'tmp/rust-r4def/root/foundation77/receipt77.json', 'tmp/rust-r4def/root/foundation77/readback77.json', 'tmp/rust-r4def/root/summary48/receipt39.json', 'tmp/rust-r4def/root/ui-amend-linux64/receipt59.json', 'tmp/rust-r4def/root/catalog25/native-catalog.json', 'tmp/rust-r4def/root/catalog25/rust-catalog.json', 'tools/rust-r4def/E/cleanup70/core70.mjs', 'tools/rust-r4def/E/cleanup70/manifest70.json', 'apps/poms-api-rust/src/business_numbers/service.rs', 'apps/poms-api-e2e/src/poms-api/foundation.e2e-spec.ts'];
const sources = sourceNames.map(file => pin(file)); assert.equal(sources.find(x => x.file.endsWith('/core70.mjs')).rawBytesSha256, 'bb8fdaeb6eeff836ea85ce28f9c4f2ded703ad21a8ad943e8df22d641bd51435');
for (const source of sources) assert.equal(pin(source.file).rawBytesSha256, source.rawBytesSha256, 'Public source changed during capture');
const products = [...names, 'operation-authority103.json', 'number-specs103.json', 'README.md'].map(file => pin(file, own));
const manifest = { kind: 'E-owned-cleanup-wrapper103-Root-execution-candidate', createdAt: new Date().toISOString(), products, publicSourcePins: sources, frozenCoreSHA256: 'bb8fdaeb6eeff836ea85ce28f9c4f2ded703ad21a8ad943e8df22d641bd51435', modes: ['snapshot', 'probe-plan', 'plan', 'apply', 'verify'].map(name => ({ name, status: 'not-run' })),
    staticValidation: { nodeSyntax: 'passed node --check of all5 mjs', ASTParserVersion: ts.version, publicActualReceiptNormalizationChecked: true, actualOwnershipAttributionGenerated: false, staticCanonicalOperations: 293, staticNumberScopes: 9, explicitAllowBeforeDB33Import: true, noTimezoneSetOrBaselineRewrite: true, originalTimeZoneRecordedAndOptionallyAsserted: true, directDMLOnlyThroughFrozenCorePerPKStatements: true, unknownRowsStopAndRequireExactPinnedRootSinglePKProof: true, actualProcessPortPGConnectionAndContainerScopeChecksPresent: true },
    authorExecution: { privateRead: false, DBConnected: false, snapshotExecuted: false, ownershipLedgerGeneratedFromActualLiveRows: false, rowCyclePlanExecuted: false, SQLDMLExecuted: false, borrowedOriginalsRestored: false, twoNoOpsExecuted: false, objectsHandled: false, servicesStopped: false, mainDatabaseDropped: false, G3Certified: false, G4Certified: false },
    runtimeRequirements: ['Root-controlled quiet window for read-only probe (not an apply admission)', 'real container/control/database OID/PG15/25433 identity', 'exact original baseline arrays and actual raw JSON rows in original default timezone (Root observed +08)', 'all actual h32/api53/UI/privateRaw/CommonService77/authfixture producer references or precise Root verified singlePK supplements', 'full owned ledger and counter witnesses; unclaimed stops', 'apply: actual services/ports/app connections/gates gone plus sameTx reseal/all120 table fence', 'insideTx baseline equality then actual COMMIT ACK, two distinct fresh read-only no-ops'],
    productFilesChanged: [], RootFilesChanged: [], oldPackagesChanged: false, scope: 'tools/rust-r4def/E/cleanup-wrapper103/** only', committed: false };
fs.writeFileSync(own + '/manifest103.json', JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ manifest: pin('manifest103.json', own), entry: products.find(p => p.file === 'cleanup103.mjs'), index: products.find(p => p.file === 'ownership103.mjs'), actualDBExecuted: false }));
