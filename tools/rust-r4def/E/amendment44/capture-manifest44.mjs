// Static public-source capture. Does not call any acceptance callback.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { OPERATIONS44, contextFromPublicReceipts44, createAmendmentAcceptance44 } from './request-driver44.mjs';
const folder = path.dirname(fileURLToPath(import.meta.url));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const pin = (file, base = root) => { const bytes = fs.readFileSync(path.join(base, file)); return { file, bytes: bytes.length, rawBytesSha256: createHash('sha256').update(bytes).digest('hex') }; };
const inputs = [
  'libs/shared/api-spec/openapi.json',
  'apps/poms-api-rust/src/contracts/amendment.rs',
  'apps/poms-api-rust/src/contracts/service.rs',
  'apps/poms-api-rust/src/contract_readiness/service.rs',
  'apps/poms-api-rust/src/contract_readiness/terms.rs',
  'apps/poms-api-rust/src/contract_readiness/view.rs',
  'apps/poms-api-rust/src/project_handover/service.rs',
  'apps/poms-api-rust/src/project_handover/sources.rs',
  'apps/poms-api-rust/src/project_handover/view.rs',
  'apps/poms-api-rust/src/project_handover/model.rs',
  'apps/poms-admin/src/app/features/project/project-handover-actions.ts',
  'tmp/rust-r4def/root/api32/continuation40-result.json',
  'tmp/rust-r4def/root/api32/D42-result.json',
].map(file => pin(file));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const spec = read('libs/shared/api-spec/openapi.json');
if (Object.keys(spec.components.schemas).length !== 626) throw Error('Current626 authority changed; recapture against Root current spec');
const index = new Map(Object.entries(spec.paths).flatMap(([template, methods]) => Object.entries(methods).filter(([, o]) => o.operationId).map(([method, o]) => [o.operationId, { template, method: method.toUpperCase(), responses: Object.keys(o.responses ?? {}) }])));
const operations = Object.entries(OPERATIONS44).map(([operationId, [method, template, status]]) => {
  const actual = index.get(operationId);
  if (!actual || actual.method !== method || actual.template.replace(/\{[^}]+\}/g, '{id}') !== template || !actual.responses.includes(String(status))) throw Error('Actual canonical route/status mismatch:' + operationId);
  return { operationId, method, path: actual.template, successStatus: status };
});
const c = read('tmp/rust-r4def/root/api32/continuation40-result.json'), d = read('tmp/rust-r4def/root/api32/D42-result.json');
const identity = contextFromPublicReceipts44(c, d);
const initial = createAmendmentAcceptance44({}).manifest();
if (initial.HTTPPassed !== 0 || initial.stages.some(s => s.status !== 'not-run')) throw Error('Static import executed acceptance');
const products = ['request-driver44.mjs', 'README.md', 'capture-manifest44.mjs'].map(file => pin(file, folder));
for (const input of inputs) if (pin(input.file).rawBytesSha256 !== input.rawBytesSha256) throw Error('Root public source changed during capture');
const manifest = {
  kind: 'R4DEF-D-controlled-amendment-request-only-candidate44', createdAt: new Date().toISOString(),
  products, readOnlyPublicInputs: inputs, operationAuthority: operations, currentSchemas: 626,
  actualInputIdentity: identity, priorFacts: { continuation40Completed: c.completed, D42Completed: d.completed, D42Status: d.detail.handoverStatus, D42ConfirmedPeople: d.detail.participantConfirmationSummary.confirmedCount, priorHTTPExecutedBy: 'Root; original public receipts read only, not this candidate' },
  candidateInitial: initial,
  validation: { nodeSyntax: 'passed node --check', importOnlyInitialManifest: 'passed all9 not-run / 0HTTP', routesAndSuccessStatuses: 'verified against current626 public spec', fakeResponseUsed: false, actualHTTPExecuted: false, databaseConnected: false, SQLBusinessProducerUsed: false, browserExecuted: false, G3Certified: false, G4Certified: false },
  acceptance: { minimum: 'capture(); amend(A1): one real contract amendment through approved Active snapshot and atomic complete plan', full: 'A1+A2+B1 before a single D rebaseline from D42; complete two-contract chain and explicit affected original contract/receivable items', sourceReference: 'same-Active explicit per-contract commercial reference, only node label changes, reapproval-required stops', approvers: 'actual currentApproverUserId matched to real logged-in session', receipts: 'read-only before/after; empty confirmed history marks needs-evidence', confirmation: 'new identities and pending people; oldconfirmed flags rejected until all3 personally reconfirm', lineage: 'actual D audit amendmentChains with every before/after/preparation/approval/payloadHash; no inference from200 alone', historicalMaterials: 'old frozenV1 unchanged; new approved snapshots plus same true V1 scope/risk compared', R5: 'execution admission remains false' },
  changedProductFiles: [], changedRootFiles: [], environmentChanged: false, committed: false,
};
fs.writeFileSync(path.join(folder, 'manifest44.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: pin('manifest44.json', folder), driver: products[0], initialStages: initial.stages.length, HTTPPassed: initial.HTTPPassed, runtimeExecuted: false }));
