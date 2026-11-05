// Static public-source capture only. No private reads, DB, HTTP or execution.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { REQUEST_OPERATIONS32, createContractUpstream32, createContractContinuation32, createHandoverUpstream32 } from './request-drivers32.mjs';
const folder = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(folder, '../../../..');
const rootPublic = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const at = file => path.join(repo, file);
const pin = (file, absolute = at(file)) => { const bytes = fs.readFileSync(absolute); return { file, bytes: bytes.length, rawBytesSha256: createHash('sha256').update(bytes).digest('hex') }; };
const inputFiles = [
  'apps/poms-api-rust/examples/r4_summary_producer.rs',
  'tools/rust-r4abc/upstream-payloads01.mjs',
  'tools/rust-r4abc/happy-http08.mjs',
  'apps/poms-api-rust/src/approval_common/service.rs',
  'apps/poms-api-rust/src/approval_common/store.rs',
  'apps/poms-api-rust/src/approval_common/schema.rs',
  'apps/poms-api-rust/src/project_pricing_margin/service.rs',
  'docs/design/rust-r4def/joint-g1-06/target-full-spec06.json',
  'tools/rust-r4def/E/delivery04.json',
];
const rootFiles = [
  'libs/shared/api-spec/openapi.json',
  'tools/rust-r4def/environment21.mjs',
  'tools/rust-r4def/api-runtime31.mjs',
  'tools/rust-r4def/api-harness32.mjs',
  'tools/rust-r4def/upstream-base36.mjs',
  'apps/poms-api-rust/src/project_handover/service.rs',
  'apps/poms-api-rust/src/project_handover/view.rs',
  'apps/poms-api-rust/src/project_handover/sources.rs',
];
const inputs = [...inputFiles.map(file => ({ ...pin(file), source: 'E-author-public-worktree' })), ...rootFiles.map(file => ({ ...pin(file, path.join(rootPublic, file)), source: 'Root-public-worktree-read-only' }))];
const frozen = JSON.parse(fs.readFileSync(at('docs/design/rust-r4def/joint-g1-06/target-full-spec06.json'), 'utf8'));
const current = JSON.parse(fs.readFileSync(path.join(rootPublic, 'libs/shared/api-spec/openapi.json'), 'utf8'));
const index = spec => new Map(Object.entries(spec.paths).flatMap(([template, methods]) => Object.entries(methods).filter(([, op]) => op.operationId).map(([method, op]) => [op.operationId, { method: method.toUpperCase(), template }])));
const oldOps = index(frozen), newOps = index(current);
const operations = Object.entries(REQUEST_OPERATIONS32).map(([operationId, [method, template]]) => {
  const old = oldOps.get(operationId), now = newOps.get(operationId);
  if (!old || !now || old.method !== method || now.method !== method || old.template.replace(/\{[^}]+\}/g, '{id}') !== template || now.template.replace(/\{[^}]+\}/g, '{id}') !== template) throw Error('Current/frozen route authority mismatch');
  return { operationId, method, currentTemplate: now.template, requestDriverTemplate: template, frozenTemplate: old.template };
});
const ordered = (value, key = '') => Array.isArray(value) ? (['required', 'enum'].includes(key) ? [...value].sort() : value).map(v => ordered(v)) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, ordered(value[k], k)])) : value;
const equal = (a, b) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
const schemaDiffs = [];
for (const name of ['PrepareProjectHandoverRequest', 'ConfirmProjectHandoverRequest', 'ConfirmProjectHandoverParticipantRequest', 'CreateInvoiceRecordRequest', 'UpdateInvoiceRecordRequest', 'ExpenseRecordSummary', 'ProjectActualCostRecordSummary']) {
  const differences = [];
  function visit(a, b, field) {
    if (equal(a, b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) visit(a[key], b[key], field + '.' + key);
    else differences.push({ field, frozen06: a ?? { absent: true }, current: b ?? { absent: true } });
  }
  visit(frozen.components.schemas[name], current.components.schemas[name], name);
  schemaDiffs.push({ name, differences });
}
const beforeCompile = JSON.parse(fs.readFileSync(path.join(folder, 'compile32-receipt.json'), 'utf8'));
if (beforeCompile.exitCode !== 0 || beforeCompile.executedBinary || beforeCompile.databaseConnected || beforeCompile.httpExecuted) throw Error('Only real compile-only receipt is allowed');
const productNames = ['r4def_summary_producer32.rs', 'Cargo.toml', 'Cargo.lock', 'request-drivers32.mjs', 'README.md', 'capture-bundle32.mjs', 'compile32-receipt.json', 'compile32-stdout-original.log', 'compile32-stderr-original.log'];
const products = productNames.map(name => pin('tools/rust-r4def/E/upstream32/' + name));
if (products.find(p => p.file.endsWith('/r4def_summary_producer32.rs')).rawBytesSha256 !== beforeCompile.rawBytesSha256) throw Error('Summary candidate changed after compilation');
for (const input of inputs) {
  const fresh = pin(input.file, path.join(input.source.startsWith('Root') ? rootPublic : repo, input.file));
  if (fresh.rawBytesSha256 !== input.rawBytesSha256) throw Error('Public source changed during static capture');
}
const value = {
  kind: 'R4DEF-upstream32-candidate-static-bundle', createdAt: new Date().toISOString(), namespace: 'poms-r4def',
  owner: 'E tools-only candidate; Root owns actual environment/import/execution', products, inputs, operations, schemaDiffs,
  contractInitial: createContractUpstream32({}).manifest(), continuationInitial: createContractContinuation32({}).manifest(), handoverInitial: createHandoverUpstream32({}).manifest(),
  validation: { actualRustLibraryCompile: 'passed Rust1.99.1 offline cargo check', rustfmt: 'passed', javascript: 'node --check and import-only manifests', binaryExecuted: false, databaseConnected: false, httpExecuted: false, fakeResponseUsed: false, runtimeAccepted: false, G3Certified: false, G4Certified: false },
  actualExecutionStillRequired: ['Root build/pin candidate binary against integrated source', 'Root guarded actual internal summary on new marker using actual HTTP-produced materials', 'Real contract approval and immutable snapshot/plan', 'D participant self-confirmation and final freeze; rebaseline only with actual amendment', 'E21 actual actors/source/evidence matrix with read-only proof hook'],
};
const output = path.join(folder, 'bundle32.json');
fs.writeFileSync(output, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file: pin('tools/rust-r4def/E/upstream32/bundle32.json'), candidateExample: products[0], runtimeExecuted: false, contractInitialStages: value.contractInitial.stages.length, DInitialStages: value.handoverInitial.stages.length }));
