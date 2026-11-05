// Real HTTP/binary callbacks only. Import does not read files or run requests.
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
const clone = value => structuredClone(value);
const need = (ok, code) => { if (!ok) throw Object.assign(new Error(code), { code }); };
const uid = value => { need(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), 'actual-uuid-required'); return value; };
const ver = row => { need(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0, 'actual-current-rowVersion-required'); return row.rowVersion; };
const actor = value => { uid(value?.id); need(Array.isArray(value.permissions), 'actual-actor-permissions-required'); return value; };
const bytes = text => new TextEncoder().encode(text);
const sha = value => createHash('sha256').update(value).digest('hex');
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, ordered(value[k])])) : value;
const hash = value => sha(JSON.stringify(ordered(value)));
const exact = (a, b, code) => need(JSON.stringify(ordered(a)) === JSON.stringify(ordered(b)), code);
export const WITNESSES47 = Object.freeze({
  normal1: Object.freeze({ text: 'POMS R4DEF47 normal final version one.\n', size: 39, sha256: '7e092953bfd0e46ebf7b1f895b7ad2c7fb000ea717d406ec4cfe751e6ece5347' }),
  normal2: Object.freeze({ text: 'POMS R4DEF47 normal final version two.\n', size: 39, sha256: 'd6ab532cef7e99ddcd4b774d1b4a5720e43066dec08310f5e21b7a09e3ff4075' }),
  sensitive: Object.freeze({ text: 'POMS R4DEF47 confidential exclusion witness.\n', size: 45, sha256: '4415216e5f805a9fc152e79a23e1b20210afdce1952b3f356db87f2075d8b97b' }),
});
const U = 'AttachmentUploadSessionController_', A = 'AttachmentController_', K = 'AttachmentHandoverController_', D = 'ProjectHandoverController_';
export const OPERATIONS47 = Object.freeze({
  [U + 'create']: ['POST', '/api/attachment-upload-sessions', 201],
  [U + 'get']: ['GET', '/api/attachment-upload-sessions/{id}', 200],
  [U + 'createUploadTarget']: ['POST', '/api/attachment-upload-sessions/{id}/upload-targets', 200],
  [U + 'proxyUploadObject']: ['PUT', '/api/attachment-upload-sessions/{id}/object', 200],
  [U + 'complete']: ['POST', '/api/attachment-upload-sessions/{id}:complete', 200],
  [A + 'get']: ['GET', '/api/attachments/{id}', 200],
  [A + 'link']: ['POST', '/api/attachments/{id}/links', 200],
  [A + 'download']: ['GET', '/api/attachments/{id}/download', 200],
  [A + 'markFinal']: ['POST', '/api/attachments/{id}:mark-final', 200],
  [A + 'void']: ['POST', '/api/attachments/{id}:void', 200],
  [K + 'getChecklist']: ['GET', '/api/project-handovers/{id}/attachment-checklist', 200],
  [K + 'refreshChecklist']: ['POST', '/api/project-handovers/{id}/attachment-checklist:refresh', 200],
  [K + 'createDownloadPackage']: ['POST', '/api/project-handovers/{id}/attachment-download-packages', 200],
  [K + 'downloadPackage']: ['GET', '/api/attachment-download-packages/{id}/download', 200],
  [D + 'getContractHandoverSummary']: ['GET', '/api/projects/{id}/contract-handover', 200],
  [D + 'getProjectHandoverDetailByProject']: ['GET', '/api/projects/{id}/project-handover', 200],
  [D + 'getProjectHandoverDetailByHandover']: ['GET', '/api/project-handovers/{id}', 200],
  [D + 'prepareProjectHandover']: ['POST', '/api/projects/{id}/project-handovers', 201],
  [D + 'confirmProjectHandoverParticipant']: ['POST', '/api/project-handovers/{id}/participant-confirmations', 200],
  [D + 'confirmProjectHandover']: ['POST', '/api/project-handovers/{id}:confirm', 200],
});

// Read-only ZIP inspection, using standard ZIP central directory boundaries.
// No extraction to disk and no production ZIP implementation used as an oracle.
function zipEntries(raw) {
  need(raw instanceof Uint8Array && raw.byteLength >= 22, 'actual-nonempty-ZIP-bytes-required');
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  let end = -1;
  for (let at = raw.length - 22; at >= Math.max(0, raw.length - 65557); at--) if (view.getUint32(at, true) === 0x06054b50) { end = at; break; }
  need(end >= 0 && view.getUint16(end + 4, true) === 0 && view.getUint16(end + 6, true) === 0, 'single-disk-ZIP-central-directory');
  const count = view.getUint16(end + 10, true), output = []; let at = view.getUint32(end + 16, true);
  need(count > 0 && count <= 1000, 'bounded-real-ZIP-entry-count');
  for (let index = 0; index < count; index++) {
    need(at + 46 <= raw.length && view.getUint32(at, true) === 0x02014b50, 'real-central-entry');
    const method = view.getUint16(at + 10, true), size = view.getUint32(at + 20, true), plain = view.getUint32(at + 24, true), nameSize = view.getUint16(at + 28, true), extraSize = view.getUint16(at + 30, true), commentSize = view.getUint16(at + 32, true), local = view.getUint32(at + 42, true);
    need(at + 46 + nameSize + extraSize + commentSize <= raw.length && local + 30 <= raw.length && view.getUint32(local, true) === 0x04034b50, 'ZIP-entry-bounds');
    const name = new TextDecoder().decode(raw.subarray(at + 46, at + 46 + nameSize));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    need(start + size <= raw.length && [0, 8].includes(method), 'supported-bounded-ZIP-body');
    const compressed = raw.subarray(start, start + size), body = method === 0 ? compressed : new Uint8Array(inflateRawSync(compressed));
    need(body.length === plain, 'ZIP-uncompressed-size'); output.push({ name, bytes: body }); at += 46 + nameSize + extraSize + commentSize;
  }
  return output;
}

export function createAttachmentAcceptance47(context, { request, binaryRequest, observeBasis, resolveParticipant } = {}) {
  const stages = ['capture', 'real-normal-upload', 'real-sensitive-upload', 'prepare-nonempty-D', 'K-refresh-and-package', 'nonfinal-new-version-stable', 'final-version-invalidates', 'prepare-current-version', 'void-invalidates', 'recover-and-confirm'].map(name => ({ name, status: 'not-run' }));
  const records = [], observations = [], ownedAttachments = []; let current = 'not-run', inherited, normal, sensitive, normal2, first, second, final, packageResult;
  const author = context.author, operator = context.handoverOperator ?? author, projectId = context.projectId;
  async function invoke(op, key = null, body = null, principal = author, expected, binary = false) {
    actor(principal); const def = OPERATIONS47[op]; need(def, 'closed-public-operation-required'); if (key !== null) uid(key);
    const [method, template, status] = def;
    const meta = { method, path: template.replace('{id}', key ?? ''), query: {}, caseId: `attachments47-${current}`, stepId: `attachments47-${records.length + 1}`, ...(binary && method === 'PUT' ? { contentType: 'application/octet-stream' } : {}) };
    const record = { ...meta, operationId: op, actorId: principal.id, expectedStatus: expected ?? status, status: 'requested', bodyKind: binary ? 'raw-binary' : 'JSON' };
    records.push(record); const callback = binary ? binaryRequest : request; need(typeof callback === 'function', 'actual-HTTP-binary-or-JSON-callback-required');
    const response = await callback(op, key, binary ? body : clone(body), principal, meta);
    need(typeof response?.receiptId === 'string' && response.receiptId.length > 0, 'actual-original-receiptId-required');
    Object.assign(record, { receiptId: response.receiptId, requestId: response.requestId ?? null, httpStatus: response.status, status: response.status === record.expectedStatus ? 'passed' : 'failed' });
    need(response.status === record.expectedStatus, 'actual-HTTP-status-unexpected'); return binary && method === 'GET' ? response : response.body;
  }
  async function step(name, job) { const s = stages.find(s => s.name === name); need(s?.status === 'not-run' && !stages.some(s => s.status === 'failed'), 'no-automatic-retry-after-ambiguous-business-write'); current = name; try { await job(); s.status = 'passed'; } catch (error) { s.status = 'failed'; s.reason = error.code ?? 'callback-or-assertion-failed'; throw error; } }
  const summary = () => invoke(D + 'getContractHandoverSummary', projectId, null, operator);
  const detail = key => invoke(D + 'getProjectHandoverDetailByHandover', uid(key), null, operator);
  const get = key => invoke(A + 'get', uid(key));
  async function downloadCheck(attachment, fixed) { const response = await invoke(A + 'download', attachment.id, null, author, 200, true); need(response.bytes instanceof Uint8Array && response.bytes.length === fixed.size && sha(response.bytes) === fixed.sha256, 'actual-downloaded-local-bytes-match-independent-checksum'); }
  async function upload(name, fixed, securityLevel, contractId, base) {
    need(bytes(fixed.text).length === fixed.size && sha(bytes(fixed.text)) === fixed.sha256, 'fixed-upload-witness-not-derived-from-response');
    const body = { operationType: base ? 'create-version' : 'create-attachment', originalName: `R4DEF47-${context.tag}-${name}.txt`, displayName: `R4DEF47-${context.tag}-${name}.txt`, mimeType: 'text/plain', sizeBytes: fixed.size, checksumSha256: fixed.sha256, ...(base ? { baseAttachmentId: base.id, changeNote: '真实内容变更并保留版本链；尚未标final时不替换原final材料' } : { targetType: 'contract', targetId: uid(contractId), category: context.attachmentCategory, securityLevel, relationType: 'normal' }) };
    const session = await invoke(U + 'create', null, body); uid(session.id);
    need(session.providerType === 'local' && session.uploadMode === 'proxy', 'real-owned-local-proxy-required-no-provider-SQL-patch');
    const target = await invoke(U + 'createUploadTarget', session.id, { expectedVersion: ver(session) });
    need(target.method === 'PUT' && target.url === `/api/attachment-upload-sessions/${session.id}/object` && target.providerType === 'local', 'real-upload-target-bound-to-session');
    const uploaded = await invoke(U + 'proxyUploadObject', session.id, bytes(fixed.text), author, 200, true);
    need(uploaded.sessionId === session.id && uploaded.status === 'uploaded', 'actual-proxy-PUT-ack');
    const complete = await invoke(U + 'complete', session.id, { expectedVersion: ver(uploaded), checksumSha256: fixed.sha256 });
    let attachment = await get(uid(complete.id));
    need(attachment.status === 'active' && attachment.checksumSha256 === fixed.sha256 && attachment.sizeBytes === fixed.size && attachment.securityLevel === securityLevel && attachment.uploadedBy === author.id, 'real-upload-completion-and-actor-metadata');
    if (!base) attachment = await invoke(A + 'link', attachment.id, { targetType: 'project', targetId: projectId, relationType: 'normal' });
    need(attachment.links.some(l => l.status === 'active' && l.targetType === 'project' && l.targetId === projectId && l.attachmentId === attachment.id), 'actual-direct-active-project-link');
    need(attachment.links.some(l => l.status === 'active' && l.targetType === 'contract' && l.targetId === contractId), 'real-contract-link-not-inferred-from-project');
    if (base) need(attachment.versionGroupId === base.versionGroupId && attachment.previousAttachmentId === base.id && attachment.versionNo === base.versionNo + 1 && attachment.isFinal === false, 'actual-new-version-chain-inherits-real-links');
    else need(attachment.versionNo === 1 && attachment.previousAttachmentId === null, 'actual-first-version');
    ownedAttachments.push({ id: attachment.id, versionGroupId: attachment.versionGroupId, versionNo: attachment.versionNo, checksumSha256: attachment.checksumSha256 });
    await downloadCheck(attachment, fixed); return attachment;
  }
  async function prepare() {
    const source = await summary(), currentDetail = await invoke(D + 'getProjectHandoverDetailByProject', projectId, null, operator);
    need(source.allowedActions.includes('prepare-project-handover'), 'real-current-source-ready-for-controlled-reprepare');
    const participants = inherited.participantConfirmationSummary.participants.map(p => ({ userId: p.participantId, responsibilities: clone(p.responsibilities) }));
    const d = await invoke(D + 'prepareProjectHandover', projectId, { executionOwnerUserId: inherited.executionOwnerUserId, participants, financeConfirmationRequired: inherited.financeConfirmationRequired, receiptJudgmentMode: inherited.receiptJudgmentModeSummary.receiptJudgmentMode, expectedProjectVersion: source.projectRowVersion, expectedSourceHash: source.sourcePayloadHash, ...(currentDetail.version ? { expectedCurrentHandoverVersion: currentDetail.version } : {}), comment: '以真实附件内容、版本与当前合同来源准备新材料；不继承本人同意' }, operator);
    need(d.handoverStatus === 'draft' && d.sourceChanged === false && d.participantConfirmationSummary.confirmedCount === 0 && d.participantConfirmationSummary.participants.every(p => p.participantStatus === 'pending'), 'new-material-starts-with-pending-personal-consent'); return d;
  }
  async function basisProof(d, attachment, fixed) {
    const observation = { kind: 'read-only-real-D-basis-materials', basisId: d.handoverBasisSnapshotId, status: 'not-run' }; observations.push(observation);
    if (typeof observeBasis !== 'function') { observation.status = 'needs-evidence'; observation.reason = 'public-D-hash-is-not-the-full-frozen-materials-payload'; return; }
    const receipt = await observeBasis(d.handoverBasisSnapshotId, author, { namespace: 'poms-r4def', projectId, readOnly: true });
    need(receipt?.receiptId && receipt.body?.id === d.handoverBasisSnapshotId && receipt.body.project_id === projectId, 'actual-namespace-bound-PG-basis-receipt');
    const row = receipt.body, payload = row.source_payload;
    need(hash(payload) === row.payload_hash && row.source_hash === d.sourcePayloadHash, 'real-D-immutable-payload-hash');
    need(hash({ projectId: payload.projectId, salesOwnerUserId: payload.salesOwnerUserId, members: payload.members, materials: payload.materials }) === d.sourcePayloadHash, 'D-source-hash-actual-material-projection');
    const ordinary = payload.materials.find(m => m.versionGroupId === normal.versionGroupId), hidden = payload.materials.find(m => m.versionGroupId === sensitive.versionGroupId);
    need(ordinary?.attachmentId === attachment.id && ordinary.contentHash === fixed.sha256 && ordinary.version === attachment.versionNo && ordinary.included === true, 'frozen-ordinary-final-identity-version-checksum');
    need(hidden?.attachmentId === sensitive.id && hidden.contentHash === WITNESSES47.sensitive.sha256 && hidden.securityLevel === 'confidential' && hidden.included === false, 'frozen-sensitive-default-exclusion');
    observation.status = 'passed'; observation.receiptId = receipt.receiptId;
  }
  function consentBody(d) { return { summarySnapshotId: d.summarySnapshotId, handoverBasisSnapshotId: d.handoverBasisSnapshotId, expectedConfirmationVersion: ver(d.participantConfirmationSummary), comment: '本人核验此固定附件及职责' }; }
  async function participantFor(d, firstOnly = false) {
    const people = firstOnly ? d.participantConfirmationSummary.participants.slice(0, 1) : d.participantConfirmationSummary.participants;
    for (const p of people) { need(typeof resolveParticipant === 'function', 'actual-participant-resolver-required'); const principal = actor(await resolveParticipant(p.participantId)); need(principal.id === p.participantId, 'own-real-session-only'); d = await detail(d.handoverId); d = await invoke(D + 'confirmProjectHandoverParticipant', d.handoverId, consentBody(d), principal); }
    return d;
  }
  const jobs = {
    async capture() {
      uid(projectId); uid(context.contractId); actor(author); actor(operator);
      need(context.environment?.namespace === 'poms-r4def' && context.environment.apiOrigin === 'http://127.0.0.1:31341' && context.environment.receiptId, 'Root-actual-new-namespace-environment-receipt-required'); uid(context.environment.instanceId);
      need(/^[A-Za-z0-9_-]{1,16}$/.test(context.tag ?? '') && typeof context.attachmentCategory === 'string' && context.attachmentCategory.length > 0, 'fresh-tag-and-real-active-attachment-category-required');
      inherited = await invoke(D + 'getProjectHandoverDetailByProject', projectId, null, operator);
      uid(inherited.handoverId); need(inherited.executionOwnerUserId && inherited.participantConfirmationSummary.participants.length > 0 && inherited.effectiveContractSetSummary.activeContractIds.includes(context.contractId), 'actual-existing-project-contract-and-D-duty-chain');
    },
    async 'real-normal-upload'() { normal = await upload('normal-v1', WITNESSES47.normal1, 'normal', context.contractId); normal = await invoke(A + 'markFinal', normal.id, { note: '本次真实非空K47最终材料v1' }); need(normal.isFinal === true, 'ordinary-real-final'); },
    async 'real-sensitive-upload'() { sensitive = await upload('sensitive-v1', WITNESSES47.sensitive, 'confidential', context.contractId); sensitive = await invoke(A + 'markFinal', sensitive.id, { note: '敏感材料仍默认排除普通移交包' }); },
    async 'prepare-nonempty-D'() { first = await prepare(); await basisProof(first, normal, WITNESSES47.normal1); first = await participantFor(first, true); need(first.participantConfirmationSummary.confirmedCount === 1, 'one-real-person-confirms-v1-before-source-change'); },
    async 'K-refresh-and-package'() {
      const sourceHash = first.sourcePayloadHash;
      await invoke(K + 'refreshChecklist', first.handoverId, { preserveManualExclusions: true, includeHistoricalSelections: true }, operator);
      let checklist = await invoke(K + 'refreshChecklist', first.handoverId, { preserveManualExclusions: true, includeHistoricalSelections: true }, operator);
      const ordinary = checklist.items.find(i => i.versionGroupId === normal.versionGroupId && i.attachmentId === normal.id), excluded = checklist.items.find(i => i.versionGroupId === sensitive.versionGroupId && i.attachmentId === sensitive.id);
      need(ordinary?.status === 'included' && ordinary.selectionReason === 'final' && ordinary.downloadEligible && excluded?.status === 'sensitive-excluded' && !excluded.downloadEligible, 'real-nonempty-final-K-selection-and-sensitive-exclusion');
      need(ordinary.sourceRefs.some(r => r.sourceType === 'project' && r.sourceId === projectId) && ordinary.sourceRefs.some(r => r.sourceType === 'contract' && r.sourceId === context.contractId), 'K-merges-real-project-and-contract-source-references');
      uid(ordinary.selectionId); need(ver(ordinary) > 0, 'actual-refreshed-selection-version');
      const after = await detail(first.handoverId); need(after.sourceChanged === false && (await summary()).sourcePayloadHash === sourceHash, 'selection-metadata-refresh-does-not-change-D-source-hash');
      const body = { selectionIds: [ordinary.selectionId], expectedSelectionVersions: [{ selectionId: ordinary.selectionId, rowVersion: ordinary.rowVersion }], confirmedSensitiveExclusion: true, note: '只下载已核对的非空normal最终版本；敏感文件明确排除' };
      await invoke(K + 'createDownloadPackage', first.handoverId, { ...body, confirmedSensitiveExclusion: false }, author, 400);
      packageResult = await invoke(K + 'createDownloadPackage', first.handoverId, body);
      need(packageResult.status === 'ready' && packageResult.manifestSummary.includedCount === 1 && packageResult.manifestSummary.includedAttachmentIds.includes(normal.id) && packageResult.manifestSummary.excludedAttachmentIds.includes(sensitive.id), 'real-ready-package-excludes-sensitive-even-for-authorized-user');
      const response = await invoke(K + 'downloadPackage', uid(packageResult.id), null, author, 200, true), entries = zipEntries(response.bytes);
      need(entries.length === 2 && entries.some(e => e.name === 'manifest.json'), 'actual-nonempty-ZIP-has-manifest-and-one-file');
      const payloads = entries.filter(e => e.name !== 'manifest.json'); need(payloads.length === 1 && sha(payloads[0].bytes) === WITNESSES47.normal1.sha256 && !entries.some(e => sha(e.bytes) === WITNESSES47.sensitive.sha256), 'ZIP-contains-exact-normal-bytes-and-no-sensitive-content');
      const manifest = JSON.parse(new TextDecoder().decode(entries.find(e => e.name === 'manifest.json').bytes)); need(manifest.items.length === 1 && manifest.items[0].attachmentId === normal.id, 'actual-package-manifest-identity');
      need((await summary()).sourcePayloadHash === sourceHash && (await detail(first.handoverId)).sourceChanged === false, 'package-and-download-metadata-do-not-change-D-source-hash');
    },
    async 'nonfinal-new-version-stable'() { normal2 = await upload('normal-v2', WITNESSES47.normal2, 'normal', context.contractId, normal); need((await summary()).sourcePayloadHash === first.sourcePayloadHash && (await detail(first.handoverId)).sourceChanged === false, 'existing-final-v1-remains-authority-until-v2-marked-final'); },
    async 'final-version-invalidates'() {
      normal2 = await invoke(A + 'markFinal', normal2.id, { note: '真实新内容v2成为最终承接版本' }); need(normal2.isFinal && !(await get(normal.id)).isFinal, 'single-real-final-head');
      need((await summary()).sourcePayloadHash !== first.sourcePayloadHash && (await detail(first.handoverId)).sourceChanged === true, 'current-final-version-content-changes-D-hash');
      const p = actor(await resolveParticipant(first.participantConfirmationSummary.participants[0].participantId));
      await invoke(D + 'confirmProjectHandoverParticipant', first.handoverId, consentBody(await detail(first.handoverId)), p, 409);
    },
    async 'prepare-current-version'() { second = await prepare(); await basisProof(second, normal2, WITNESSES47.normal2); second = await participantFor(second, true); need(second.participantConfirmationSummary.confirmedCount === 1, 'one-real-current-person-confirms-v2-material'); },
    async 'void-invalidates'() {
      await invoke(A + 'void', normal2.id, { reason: '验收真实所选v2失效；不得沿旧材料继续同意' });
      need((await summary()).sourcePayloadHash !== second.sourcePayloadHash && (await detail(second.handoverId)).sourceChanged === true, 'real-selected-file-void-changes-source');
      const person = second.participantConfirmationSummary.participants.find(p => p.participantStatus === 'pending'); need(person, 'remaining-real-participant-for-stale-consent-probe'); const principal = actor(await resolveParticipant(person.participantId));
      await invoke(D + 'confirmProjectHandoverParticipant', second.handoverId, consentBody(await detail(second.handoverId)), principal, 409);
      const stale = await detail(second.handoverId); need(stale.participantConfirmationSummary.confirmedCount === 1, 'stale-consent-rejection-does-not-increase-confirmation');
    },
    async 'recover-and-confirm'() {
      normal = await invoke(A + 'markFinal', normal.id, { note: 'v2真实失效后，核验并将仍有效v1恢复为final材料' });
      final = await prepare(); need(final.handoverId !== second.handoverId && final.participantConfirmationSummary.confirmedCount === 0, 'new-final-recovery-never-inherits-old-consent');
      await basisProof(final, await get(normal.id), WITNESSES47.normal1);
      final = await participantFor(final);
      const confirmations = final.participantConfirmationSummary.participants.flatMap(p => { need(p.participantStatus === 'confirmed', 'every-real-person-confirmed'); return p.responsibilities.map(r => ({ participantId: p.participantId, participantRoleKey: r.roleKey, participantStatus: 'confirmed' })); });
      await invoke(D + 'confirmProjectHandover', final.handoverId, { participantConfirmations: confirmations, contractSummarySnapshotId: final.contractSummarySnapshotId, summarySnapshotId: final.summarySnapshotId, handoverBasisSnapshotId: final.handoverBasisSnapshotId, sourcePayloadHash: final.sourcePayloadHash, expectedVersion: ver(final), receiptJudgmentMode: final.receiptJudgmentModeSummary.receiptJudgmentMode }, operator);
      final = await detail(final.handoverId); need(final.handoverStatus === 'confirmed' && final.executionAdmission.allowed === false, 'actual-final-recovery-still-R5-blocked');
    },
  };
  const manifest = () => ({ kind: 'R4DEF-real-nonempty-K-attachment-candidate47', stages: clone(stages), records: clone(records), observations: clone(observations), ownedAttachments: clone(ownedAttachments), HTTPPassed: records.filter(r => r.status === 'passed').length, initialState: 'not-run', completed: stages.every(s => s.status === 'passed') && observations.every(o => o.status === 'passed'), needsEvidence: observations.some(o => o.status === 'needs-evidence'), scanWorkerClaimed: false, SQLBusinessProducerUsed: false });
  return { manifest, async runAll() { for (const s of stages) { try { await step(s.name, jobs[s.name]); } catch { break; } } return { ...manifest(), first, second, final, packageResult }; } };
}
