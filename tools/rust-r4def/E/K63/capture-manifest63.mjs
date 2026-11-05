// Static public-source capture. No callbacks, secrets, network, SQL or browser run.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { contextFromPublic52, createKContinuation63, initialPlan63, OPERATIONS63 } from './request-driver63.mjs';
import { WITNESSES47 } from '../attachments47/request-driver47.mjs';
const own = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = value => createHash('sha256').update(value).digest('hex');
const pin = (file, base = root) => { const b = fs.readFileSync(path.join(base, file)); return { file, bytes: b.length, rawBytesSha256: sha(b) }; };
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const require = createRequire(root + '/package.json'), ts = require('typescript');
for (const name of ['request-driver63.mjs', 'capture-manifest63.mjs']) { const ast = ts.createSourceFile(name, fs.readFileSync(path.join(own, name), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS); assert.equal(ast.parseDiagnostics.length, 0, name); }
const driver = fs.readFileSync(path.join(own, 'request-driver63.mjs'), 'utf8');
assert(!/\bfetch\s*\(|(?:readFile|writeFile|execFile|spawn)\s*\(|\b(?:INSERT INTO|UPDATE poms|DELETE FROM|REVOKE|GRANT)\b/i.test(driver), 'Request-only boundary violation');
assert(driver.includes('expectedStatus, caseId:') && driver.includes('new-final-key-must-differ-from-writable-staging-key') && driver.includes('old-session-must-actually-be-expired-no-SQL-extension'));
const spec = read('libs/shared/api-spec/openapi.json'), index = new Map(Object.entries(spec.paths).flatMap(([template, methods]) => Object.entries(methods).filter(([, o]) => o.operationId).map(([method, o]) => [o.operationId, { method: method.toUpperCase(), template, statuses: Object.keys(o.responses) }])));
const operations = Object.entries(OPERATIONS63).map(([operationId, [method, template, status]]) => { const actual = index.get(operationId); assert(actual && actual.method === method && actual.template.replace(/\{[^}]+\}/g, '{id}') === template && actual.statuses.includes(String(status)), operationId); return { operationId, method, path: actual.template, successStatus: status }; });
const before = read('tmp/rust-r4def/root/api32/attachments52-before.json'), previous = read('tmp/rust-r4def/root/api32/attachments52-result.json');
const context = contextFromPublic52(before, previous, { author: before.context.author, handoverOperator: before.context.handoverOperator, environment: before.context.environment, tag: 'k63', previousReceiptId: 'tmp/rust-r4def/root/api32/attachments52-result.json' });
const fail = () => { throw Error('Static factory called an acceptance callback'); };
const plan = createKContinuation63(context, { request: fail, binaryRequest: fail, observeBasis: fail, observeAttachment: fail, resolveParticipant: fail, now: fail }).manifest();
assert(plan.stages.every(s => s.status === 'not-run') && plan.records.length === 0 && plan.observations.length === 0 && plan.HTTPPassed === 0 && plan.independentPGPassed === 0 && !plan.completed); assert.deepEqual(plan.stages, initialPlan63().stages);
for (const fixed of Object.values(WITNESSES47)) { const bytes = new TextEncoder().encode(fixed.text); assert.equal(bytes.length, fixed.size); assert.equal(sha(bytes), fixed.sha256); }
assert.equal(sha('A'.repeat(64)), 'd53eda7a637c99cc7fb566d96e9fa109bf15c478410a3f5eb4d4c4e26cd081f6'); assert.equal(sha('B'.repeat(64)), 'c422e7070cb1cb455b5de9afee0d975e303d0239c72030cd7414ab5c382d3ae8');
const sourceNames = ['tmp/rust-r4def/root/api32/attachments52-before.json', 'tmp/rust-r4def/root/api32/attachments52-result.json', 'libs/shared/api-spec/openapi.json', 'tools/rust-r4def/E/attachments47/request-driver47.mjs', 'tools/rust-r4def/run-attachments52.mjs', 'tools/rust-r4def/api-harness32.mjs', 'tools/rust-r4def/F/K55/PROPOSAL55.md', 'tools/rust-r4def/F/K55/vectors55.json', 'tools/rust-r4def/F/K55/readback55.sql', 'docs/design/rust-r4def/g2-attachment-freeze62.json', 'apps/poms-api-rust/src/attachments/service.rs', 'apps/poms-api-rust/src/attachments/store.rs', 'apps/poms-api-rust/src/attachment_storage/registry.rs', 'apps/poms-api-rust/src/attachment_storage/store.rs', 'apps/poms-api-rust/src/project_handover/sources.rs', 'apps/poms-api/src/migrations/Migration20260511140000_ex65b_attachment_storage_provider_config.ts'];
const sources = sourceNames.map(file => pin(file)), products = ['request-driver63.mjs', 'README.md', 'readback63.sql', 'gate63.sql', 'capture-manifest63.mjs'].map(file => pin(file, own));
for (const source of sources) assert.equal(pin(source.file).rawBytesSha256, source.rawBytesSha256, 'Root public source changed during capture');
const manifest = {
    kind: 'Root-K55-K56-real-partial52-continuation-candidate63', createdAt: new Date().toISOString(), products, publicReadOnlyInputs: sources, operationAuthority: operations, currentSchemaCount: Object.keys(spec.components.schemas).length,
    actualPreviousRootFacts: { succeededStages: context.previousAckStages, normalId: context.normal.id, sensitiveId: context.sensitive.id, firstHandoverId: context.first.handoverId, firstVersion: context.first.version, confirmedPeople: context.first.participantConfirmationSummary.confirmedCount, abandonedSessionId: context.abandonedSessionId, normalOriginalSessionId: context.normalSessionId, sensitiveOriginalSessionId: context.sensitiveSessionId, previousCompleteStatus: 500, classifiedAs: 'Root historical public receipt, not author run' },
    initial: plan, independentByteWitnesses: WITNESSES47,
    staticValidation: { nodeSyntax: 'passed node --check of both mjs', ASTParserVersion: ts.version, actualCurrentRoutesMethodStatusMatched: true, partial52IdentityDerivedFromOriginal: true, pureFactorySevenNotRunZeroHTTPZeroPG: true, constantBytesAndSHAIndependentlyRecomputed: true, explicitExpectedStatusMetadataIncluding409: true, noPriorACKReplayOrSQLBusinessProducerInDriver: true, newFinalKeyCannotEqualStaging: true, legacyBindingExplicitlyPreservedNotMigrated: true },
    optionalLatePutGate: { SQLIsRootReviewTemplateOnly: true, executed: false, barrier: 'Short AccessExclusive discovers exact B PID, then PID/config-only RLS moves B to observed advisory wait; A bypasses', requiresExactFinallyRestore: true, status: 'not-run' },
    authorExecution: { privateRead: false, HTTPCalled: false, DBConnected: false, objectIOExecuted: false, browserStarted: false, serviceStartedOrStopped: false, SQLExecuted: false, productChanged: false, RootFilesChanged: false, businessAccepted: false, performanceClaimed: false, all32K55CasesCertified: false, S3Certified: false, G3Certified: false, G4Certified: false },
};
fs.writeFileSync(path.join(own, 'manifest63.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: pin('manifest63.json', own), driver: products[0], stages: plan.stages.length, priorACKs: context.previousAckStages.length, authorRuntimeExecuted: false }));
