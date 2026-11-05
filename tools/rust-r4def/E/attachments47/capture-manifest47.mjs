// Static public source pins only; never invokes the candidate request callbacks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createAttachmentAcceptance47, OPERATIONS47, WITNESSES47 } from './request-driver47.mjs';
const own = path.dirname(fileURLToPath(import.meta.url));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = value => createHash('sha256').update(value).digest('hex');
const pin = (file, base = root) => { const bytes = fs.readFileSync(path.join(base, file)); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const sources = [
  'libs/shared/api-spec/openapi.json',
  'apps/poms-api-rust/src/attachments/service.rs',
  'apps/poms-api-rust/src/attachments/http.rs',
  'apps/poms-api-rust/src/attachments/handover.rs',
  'apps/poms-api-rust/src/attachments/zip.rs',
  'apps/poms-api-rust/src/attachment_storage/registry.rs',
  'apps/poms-api-rust/src/attachment_storage/local.rs',
  'apps/poms-api-rust/src/project_handover/sources.rs',
  'apps/poms-api-rust/src/project_handover/service.rs',
  'tools/rust-r4def/environment21.mjs',
  'tools/rust-r4def/api-runtime31.mjs',
  'apps/poms-api/src/app/features/attachment/attachment-upload-session.controller.ts',
  'apps/poms-api/src/app/features/attachment/attachment-handover.controller.ts',
  'tools/rust-r2ij/j-upload-lifecycle-scenario.mjs',
].map(file => pin(file));
const spec = JSON.parse(fs.readFileSync(path.join(root, 'libs/shared/api-spec/openapi.json'), 'utf8'));
const index = new Map(Object.entries(spec.paths).flatMap(([template, methods]) => Object.entries(methods).filter(([, op]) => op.operationId).map(([method, op]) => [op.operationId, { template, method: method.toUpperCase(), responses: Object.keys(op.responses ?? {}) }])));
const operations = Object.entries(OPERATIONS47).map(([operationId, [method, path, status]]) => {
  const actual = index.get(operationId);
  if (!actual || actual.method !== method || actual.template.replace(/\{[^}]+\}/g, '{id}') !== path || !actual.responses.includes(String(status))) throw Error('Current canonical attachment/D route mismatch:' + operationId);
  return { operationId, method, path: actual.template, successStatus: status, binary: operationId.endsWith('_proxyUploadObject') || operationId.endsWith('_download') || operationId.endsWith('_downloadPackage') };
});
for (const witness of Object.values(WITNESSES47)) { const body = new TextEncoder().encode(witness.text); if (body.length !== witness.size || sha(body) !== witness.sha256) throw Error('Independent byte witness mismatch'); }
const initial = createAttachmentAcceptance47({}).manifest();
if (initial.HTTPPassed !== 0 || initial.stages.some(s => s.status !== 'not-run') || initial.observations.length !== 0) throw Error('Static import executed acceptance');
for (const source of sources) if (pin(source.file).rawBytesSha256 !== source.rawBytesSha256) throw Error('Public Root source changed during static capture');
const products = ['request-driver47.mjs', 'README.md', 'capture-manifest47.mjs'].map(file => pin(file, own));
const manifest = {
  kind: 'R4DEF-E-owned-real-nonempty-K-attachment-tool-candidate47', createdAt: new Date().toISOString(),
  products, publicReadOnlySourcePins: sources, operations, currentSchemaCount: Object.keys(spec.components.schemas).length,
  independentByteWitnesses: WITNESSES47, initial,
  validation: { nodeSyntax: 'passed node --check', importOnly: 'all10 not-run,0HTTP,0PG assertions', byteWitnessSizeAndSHA256: 'independently recomputed from fixed literal UTF8, no production code', operationPathMethodAndSuccessStatuses: 'statically matched current public spec', actualUploadExecuted: false, actualDownloadExecuted: false, actualServiceOrDBAccessed: false, fakeHTTPResponseUsed: false, browserRun: false, G3Certified: false, G4Certified: false },
  productionChain: ['actual HTTP create upload session', 'actual upload target', 'actual octet-stream proxy PUT with size/hash verification', 'actual complete creates active Attachment and link', 'actual direct project link + markFinal', 'actual Dprepare + read-only immutable basis proof', 'actual nonempty K refresh/download ZIP with sensitive excluded', 'real nonfinal version remains subordinate to original final', 'actual new final or selected void changes D source and rejects old consent', 'new prepare/own personal confirmations/finalize, R5 stays blocked'],
  scanProtocol: { workerRequiredForThisDeliveredLocalPath: false, publishedScanStatusPresent: false, scanOrMalwareCertificationClaimed: false, noInventedAvailableOrVerifiedSQL: true },
  rootCallbacksRequired: ['JSON request using actual auth session/CSRF', 'binaryRequest for real PUT and byte downloads, not JSON encoding', 'resolveParticipant matching each real assigned user', 'observeBasis actual read-only PG receipt; otherwise needs-evidence'],
  environmentChanged: false, productFilesChanged: [], RootFilesChanged: [], privateReadByAuthor: false, commitPerformed: false,
};
fs.writeFileSync(path.join(own, 'manifest47.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: pin('manifest47.json', own), driver: products[0], initialStages: initial.stages.length, HTTPPassed: initial.HTTPPassed, runtimeExecuted: false }));
