// Static public-source capture only. Never import root-entry84 or invoke run().
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createLatePut84, initialPlan84, OPERATIONS84, WITNESSES84 } from './runner84.mjs';
const own = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = x => createHash('sha256').update(x).digest('hex');
const pin = (file, base = root) => { const bytes = fs.readFileSync(path.join(base, file)); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const require = createRequire(root + '/package.json'), ts = require('typescript');
for (const name of ['runner84.mjs', 'root-entry84.mjs', 'capture-manifest84.mjs']) { const source = fs.readFileSync(path.join(own, name), 'utf8'), ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS); assert.equal(ast.parseDiagnostics.length, 0, name); }
const runner = fs.readFileSync(own + '/runner84.mjs', 'utf8'), entry = fs.readFileSync(own + '/root-entry84.mjs', 'utf8');
assert(runner.includes("assert.equal(allowRootExecution, true") && runner.includes('context.runtimeFence.postK86 === true'));
assert(entry.includes("process.argv.includes('--allow-root-execution')") && entry.includes('/proc/${record.pid}/exe') && entry.includes('post-K86-live-process-before-any-HTTP'));
assert(!/\b(?:INSERT INTO|UPDATE|DELETE FROM)\s+poms\./i.test(runner), 'No SQL business producer permitted');
const fail = () => { throw Error('Static factory executed a runtime callback'); };
const plan = createLatePut84({ recordEvidence: fail, observeObject: fail, observeRuntime: fail, connectOwner: fail }).manifest(); assert(plan.stages.every(s => s.status === 'not-run') && plan.actualHTTP === 0 && plan.actualPGProofs === 0 && plan.actualObjectProofs === 0); assert.deepEqual(plan.stages, initialPlan84().stages);
for (const w of [WITNESSES84.A64, WITNESSES84.B64]) { const bytes = new TextEncoder().encode(w.text); assert.equal(bytes.length, w.bytes); assert.equal(sha(bytes), w.sha256); }
const spec = JSON.parse(fs.readFileSync(root + '/libs/shared/api-spec/openapi.json', 'utf8'));
const index = new Map(Object.entries(spec.paths).flatMap(([template, methods]) => Object.entries(methods).filter(([, o]) => o.operationId).map(([method, o]) => [o.operationId, { method: method.toUpperCase(), template, statuses: Object.keys(o.responses) }])));
const operations = Object.entries(OPERATIONS84).map(([id, [method, template, status]]) => { const a = index.get(id); assert(a && a.method === method && a.template.replace(/\{[^}]+\}/g, '{id}') === template && a.statuses.includes(String(status)), id); return { operationId: id, method, path: a.template, expectedStatus: status }; });
const configSchema = spec.components.schemas.CreateAttachmentStorageProviderConfigRequest; assert.deepEqual(configSchema.required, ['providerType', 'displayName']);
const sourceNames = ['tools/rust-r4def/db33.mjs', 'tools/rust-r4def/api-harness32.mjs', 'tools/rust-r4def/api-runtime31.mjs', 'tools/rust-r4def/prepare-races73.mjs', 'tools/rust-r4def/run-races85.mjs', 'tmp/rust-r4def/root/api32/races73-context.json', 'tmp/rust-r4def/root/api32/attachments52-result.json', 'libs/shared/api-spec/openapi.json', 'apps/poms-api-rust/src/attachments/service.rs', 'apps/poms-api-rust/src/attachments/store.rs', 'apps/poms-api-rust/src/attachment_storage/registry.rs', 'apps/poms-api-rust/src/attachment_storage/store.rs', 'apps/poms-api-rust/src/attachment_storage/local.rs', 'apps/poms-api-rust/src/attachment_storage/service.rs', 'tools/rust-r4def/E/K63/gate63.sql'];
const sources = sourceNames.map(file => pin(file)), products = ['runner84.mjs', 'root-entry84.mjs', 'README.md', 'capture-manifest84.mjs'].map(file => pin(file, own));
for (const s of sources) assert.equal(pin(s.file).rawBytesSha256, s.rawBytesSha256, 'Root public source changed while capturing');
const manifest = { kind: 'Root-executable-late-proxy-put84-thin-runner-candidate', createdAt: new Date().toISOString(), products, publicSourcePins: sources, operationAuthority: operations, currentSchemaCount: Object.keys(spec.components.schemas).length, initial: plan, witnesses: WITNESSES84,
    staticChecks: { nodeSyntax: 'passed node --check of all3 mjs', ASTParserVersion: ts.version, factorySafeAll8NotRun: true, zeroHTTPPGObjectIOOnImportOrFactory: true, actualCurrentRouteMethodStatusMatched: true, realConfigRequiredFieldsMatched: true, independentWitnessSHAsMatched: true, SQLBusinessProducerAbsent: true, explicitRootExecutionAndPostK86FenceRequired: true, runtimeFinalK86SHAChosenByAuthor: false },
    actualExecution: { privateRead: false, DBConnected: false, HTTPCalled: false, objectsReadOrWritten: false, RLSChanged: false, advisoryOrTableLockTaken: false, BBackendObserved: false, AOrBUploaded: false, infrastructureRestorationVerified: false, G3Certified: false, G4Certified: false },
    rootRequired: ['bind actual post-K86 live process/binary receipt', 'read only this new namespace fixtures or inject fresh two real sessions', 'review and execute explicit flag; actual owner marker/PG15/25433 guards', 'actual B relation to advisory waits same PID', 'actual A complete then actual B attachment409', 'independent PG/audit/full flags/download/final-A staging-B bytes', 'exact finally security/locks/schema restoration and actual status receipts'], oldPackagesChanged: false, productFilesChanged: [], RootFilesChanged: [], committed: false };
fs.writeFileSync(own + '/manifest84.json', JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ manifest: pin('manifest84.json', own), runner: products[0], entry: products[1], allInitialStagesNotRun: plan.stages.length, authorRuntimeExecuted: false }));
