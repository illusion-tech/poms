// Request-only continuation. Import/constructor never reads files or performs I/O.
// Existing ACKs are read back, never replayed. Root owns all actual HTTP/PG.
import { createHash } from 'node:crypto';
import { WITNESSES47 } from '../attachments47/request-driver47.mjs';

const need = (ok, code) => { if (!ok) throw Object.assign(new Error(code), { code }); };
const clone = value => structuredClone(value);
const uid = value => { need(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), 'actual-UUID-required'); return value; };
const version = value => { need(Number.isSafeInteger(value?.rowVersion) && value.rowVersion > 0, 'actual-fresh-CAS-required'); return value.rowVersion; };
const principal = value => { uid(value?.id); need(Array.isArray(value.permissions), 'actual-authenticated-permissions-required'); return value; };
const sha = value => createHash('sha256').update(value).digest('hex');
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, ordered(value[k])])) : value;
const exact = (a, b, reason) => need(JSON.stringify(ordered(a)) === JSON.stringify(ordered(b)), reason);
const payloadHash = value => sha(JSON.stringify(ordered(value)));
const raw = fixed => new TextEncoder().encode(fixed.text);
const U = 'AttachmentUploadSessionController_', A = 'AttachmentController_', D = 'ProjectHandoverController_', K = 'AttachmentHandoverController_';
export const OPERATIONS63 = Object.freeze({
    [U + 'get']: ['GET', '/api/attachment-upload-sessions/{id}', 200],
    [U + 'abort']: ['POST', '/api/attachment-upload-sessions/{id}:abort', 200],
    [U + 'create']: ['POST', '/api/attachment-upload-sessions', 201],
    [U + 'createUploadTarget']: ['POST', '/api/attachment-upload-sessions/{id}/upload-targets', 200],
    [U + 'proxyUploadObject']: ['PUT', '/api/attachment-upload-sessions/{id}/object', 200],
    [U + 'complete']: ['POST', '/api/attachment-upload-sessions/{id}:complete', 200],
    [A + 'get']: ['GET', '/api/attachments/{id}', 200],
    [A + 'download']: ['GET', '/api/attachments/{id}/download', 200],
    [A + 'markFinal']: ['POST', '/api/attachments/{id}:mark-final', 200],
    [A + 'void']: ['POST', '/api/attachments/{id}:void', 200],
    [K + 'getChecklist']: ['GET', '/api/project-handovers/{id}/attachment-checklist', 200],
    [K + 'refreshChecklist']: ['POST', '/api/project-handovers/{id}/attachment-checklist:refresh', 200],
    [D + 'getContractHandoverSummary']: ['GET', '/api/projects/{id}/contract-handover', 200],
    [D + 'getProjectHandoverDetailByProject']: ['GET', '/api/projects/{id}/project-handover', 200],
    [D + 'getProjectHandoverDetailByHandover']: ['GET', '/api/project-handovers/{id}', 200],
    [D + 'prepareProjectHandover']: ['POST', '/api/projects/{id}/project-handovers', 201],
    [D + 'confirmProjectHandoverParticipant']: ['POST', '/api/project-handovers/{id}/participant-confirmations', 200],
    [D + 'confirmProjectHandover']: ['POST', '/api/project-handovers/{id}:confirm', 200],
});
const STAGES = ['capture-existing-ACKs', 'retire-expired-failed-attempt', 'fresh-nonfinal-version-and-immutable-final-proof', 'mark-new-final-invalidates-first-consent', 'prepare-new-version-and-one-own-consent', 'void-invalidates-new-version-consent', 'restore-v1-and-all-three-own-confirmations-R5-blocked'];
export const initialPlan63 = () => ({ stages: STAGES.map(name => ({ name, status: 'not-run' })), records: [], observations: [], completed: false, HTTPPassed: 0, independentPGPassed: 0, needsEvidence: false, initialState: 'not-run', authorExecutedHTTP: false, SQLBusinessProducerUsed: false, G3Certified: false, G4Certified: false });

// Inputs are public originals supplied as objects by Root, never file paths.
export function contextFromPublic52(before, previous, { author, handoverOperator, environment, tag, previousReceiptId } = {}) {
    need(previous?.kind === 'R4DEF-real-nonempty-K-attachment-candidate47' && previous.completed === false, 'actual-preserved-partial52-receipt-required');
    const names = ['capture', 'real-normal-upload', 'real-sensitive-upload', 'prepare-nonempty-D', 'K-refresh-and-package'];
    need(names.every((name, i) => previous.stages?.[i]?.name === name && previous.stages[i].status === 'passed'), 'all-first-five-actual-ACKs-required');
    need(previous.stages?.[5]?.name === 'nonfinal-new-version-stable' && previous.stages[5].status === 'failed', 'resume-only-known-failed-version-boundary');
    const normal = previous.ownedAttachments?.find(a => a.checksumSha256 === WITNESSES47.normal1.sha256), sensitive = previous.ownedAttachments?.find(a => a.checksumSha256 === WITNESSES47.sensitive.sha256);
    need(normal?.versionNo === 1 && sensitive?.versionNo === 1 && previous.ownedAttachments.length === 2 && previous.first?.handoverId, 'actual-first-version-identities-only-no-failed-v2-adoption');
    function sessionFor(stage) { const record = previous.records.find(r => r.caseId === 'attachments47-' + stage && r.operationId === U + 'createUploadTarget' && r.status === 'passed'); const id = /^\/api\/attachment-upload-sessions\/([^/]+)\/upload-targets$/.exec(record?.path ?? '')?.[1]; return uid(id); }
    const failed = previous.records.at(-1); need(failed?.operationId === U + 'complete' && failed.status === 'failed' && failed.httpStatus === 500, 'actual-old-complete500-boundary-required');
    const abandonedSessionId = uid(/^\/api\/attachment-upload-sessions\/([^/]+):complete$/.exec(failed.path)?.[1]);
    const context = before?.context; need(context && context.projectId === previous.first.projectId && context.environment?.instanceId === environment?.instanceId && context.environment.namespace === environment?.namespace, 'same-new-namespace-context-binding');
    need(typeof previousReceiptId === 'string' && previousReceiptId.length > 0, 'preserved-public52-original-reference-required');
    return { tag, projectId: uid(context.projectId), contractId: uid(context.contractId), attachmentCategory: context.attachmentCategory, author, handoverOperator, environment, previousReceiptId, first: clone(previous.first), normal: clone(normal), sensitive: clone(sensitive), normalSessionId: sessionFor('real-normal-upload'), sensitiveSessionId: sessionFor('real-sensitive-upload'), abandonedSessionId, previousAckStages: names, previousPackageId: previous.packageResult?.id ?? null };
}

export function createKContinuation63(context, { request, binaryRequest, observeBasis, observeAttachment, resolveParticipant, now = () => Date.now() } = {}) {
    const stages = initialPlan63().stages, records = [], observations = [];
    let current = 'not-run', attempted = false, first, second, recovered, normal, sensitive, next, newSession, abandoned, legacyLocation, legacySensitiveLocation, uploadedCount = 0, completeCount = 0;
    const author = context.author, operator = context.handoverOperator ?? author, projectId = context.projectId;
    async function call(op, id = null, body = null, actor = author, expectedStatus = OPERATIONS63[op]?.[2], binary = false) {
        principal(actor); const def = OPERATIONS63[op]; need(def, 'closed-operation-required'); if (id !== null) uid(id);
        const [method, template] = def, meta = { method, path: template.replace('{id}', id ?? ''), query: {}, expectedStatus, caseId: 'K63-' + current, stepId: 'K63-' + (records.length + 1), ...(binary && method === 'PUT' ? { contentType: 'application/octet-stream' } : {}) };
        const record = { operationId: op, actorId: actor.id, ...meta, status: 'requested', bodyKind: binary ? 'binary' : 'JSON' }; records.push(record);
        const callback = binary ? binaryRequest : request; need(typeof callback === 'function', 'real-authenticated-HTTP-callback-required'); const response = await callback(op, id, binary ? body : clone(body), actor, meta);
        need(response?.receiptId && Number.isInteger(response.status), 'actual-HTTP-original-receipt-required'); Object.assign(record, { receiptId: response.receiptId, requestId: response.requestId ?? null, actualStatus: response.status, status: response.status === expectedStatus ? 'passed' : 'failed' }); need(response.status === expectedStatus, 'actual-HTTP-status-unexpected');
        return binary && method === 'GET' ? response : response.body?.data ?? response.body;
    }
    const detail = id => call(D + 'getProjectHandoverDetailByHandover', uid(id), null, operator);
    const summary = () => call(D + 'getContractHandoverSummary', projectId, null, operator);
    const get = id => call(A + 'get', uid(id));
    function identityProof(value) { need(value?.namespace === 'poms-r4def' && value.instanceId === context.environment.instanceId && value.database === 'poms_r4def_rust' && value.migrationCount === 94, 'independent-real-PG-namespace94-proof-required'); }
    function activeHTTPLinks(attachment) { return attachment.links.filter(l => l.status === 'active').map(l => ({ target_type: l.targetType, target_id: l.targetId, relation_type: l.relationType })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))); }
    function activePGLinks(rows, attachmentId) { need(Array.isArray(rows), 'actual-PG-link-set-required'); for (const r of rows) need(r.attachment_id === attachmentId && r.status === 'active' && r.id && r.linked_by && r.linked_at, 'actual-active-link-tuple-required'); return rows.map(r => ({ target_type: r.target_type, target_id: r.target_id, relation_type: r.relation_type })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))); }
    function sameLocation(a, b) { return a.provider === b.provider && a.bucket === b.bucket && a.key === b.key; }
    async function attachmentProof(attachment, sessionId, fixed, { legacy = false, phase = current, status = 'active', isFinal = attachment.isFinal } = {}) {
        const observation = { kind: legacy ? 'actual-PG-legacy-binding-preservation' : 'actual-PG-new-immutable-final-binding', phase, attachmentId: attachment.id, sessionId, status: 'not-run' }; observations.push(observation);
        if (typeof observeAttachment !== 'function') { observation.status = 'needs-evidence'; need(false, 'independent-PG-attachment-hook-required'); }
        const proof = await observeAttachment(attachment.id, author, { namespace: 'poms-r4def', instanceId: context.environment.instanceId, projectId, contractId: context.contractId, sessionId, baseAttachmentId: legacy ? null : normal.id, readOnly: true, phase });
        need(proof?.receiptId && proof.body, 'independent-attachment-original-required'); const { identity, attachment: a, session: s, activeLinks, baseActiveLinks, groupRows } = proof.body; identityProof(identity);
        need(a?.id === attachment.id && s?.id === sessionId && a.status === status && a.security_level === attachment.securityLevel && a.is_final === isFinal, 'real-attachment-HTTP-PG-binding');
        need(a.size_bytes?.toString() === String(fixed.size) && a.checksum_sha256 === fixed.sha256 && s.size_bytes?.toString() === String(fixed.size), 'real-PG-size-and-checksum-match-fixed-witness');
        need(s.status === 'completed' && s.completed_attachment_id === a.id && s.created_by === author.id && s.checksum_sha256 === fixed.sha256, 'actual-completed-session-to-attachment-binding');
        need(a.storage_provider === s.provider_type && (a.storage_bucket ?? null) === (s.storage_bucket ?? null) && typeof a.storage_key === 'string' && a.storage_key.length > 0 && typeof s.storage_key === 'string' && s.storage_key.length > 0, 'same-real-original-provider-and-bucket');
        const location = { provider: a.storage_provider, bucket: a.storage_bucket ?? null, key: a.storage_key };
        if (!legacy) {
            need(a.storage_key !== s.storage_key, 'new-final-key-must-differ-from-writable-staging-key'); need(a.storage_key !== legacyLocation.key, 'new-final-must-not-bind-old-object'); need(s.operation_type === 'create-version' && s.base_attachment_id === normal.id, 'new-session-real-version-source');
            need((a.version_group_id ?? a.id) === normal.versionGroupId && a.previous_attachment_id === normal.id && a.version_no === normal.versionNo + 1, 'actual-PG-new-version-chain');
            exact(activePGLinks(activeLinks, a.id), activePGLinks(baseActiveLinks, normal.id), 'new-version-inherits-complete-real-active-source-links');
            need(Array.isArray(groupRows) && groupRows.some(r => r.id === a.id) && groupRows.some(r => r.id === normal.id), 'full-real-version-history-required'); need(groupRows.filter(r => r.status === 'active' && r.is_latest).length === 1 && groupRows.filter(r => r.status === 'active' && r.is_final).length <= 1, 'one-real-active-latest-and-at-most-one-final');
        } else {
            exact(activePGLinks(activeLinks, a.id), activeHTTPLinks(attachment), 'legacy-HTTP-and-PG-real-links');
            const captured = a.id === normal.id ? legacyLocation : legacySensitiveLocation; if (captured) need(sameLocation(location, captured), 'legacy-binding-never-silently-migrated-or-repointed');
            if (a.id === normal.id) legacyLocation ??= location; else legacySensitiveLocation ??= location;
            observation.legacyMayStillUseStagingKey = a.storage_key === s.storage_key; observation.legacyObjectMigrationClaimed = false;
        }
        observation.status = 'passed'; observation.receiptId = proof.receiptId; observation.locationIdentityHash = payloadHash(location); observation.stagingIdentityHash = payloadHash({ provider: s.provider_type, bucket: s.storage_bucket ?? null, key: s.storage_key }); return proof.body;
    }
    async function download(attachment, fixed) { const r = await call(A + 'download', attachment.id, null, author, 200, true); need(r.bytes instanceof Uint8Array && r.bytes.length === fixed.size && sha(r.bytes) === fixed.sha256, 'actual-downloaded-bytes-size-SHA-match-independent-witness'); }
    async function basisProof(d, chosen, fixed) {
        const observation = { kind: 'actual-PG-D-frozen-attachment-materials', basisId: d.handoverBasisSnapshotId, status: 'not-run' }; observations.push(observation);
        if (typeof observeBasis !== 'function') { observation.status = 'needs-evidence'; need(false, 'independent-PG-basis-hook-required'); }
        const r = await observeBasis(d.handoverBasisSnapshotId, author, { namespace: 'poms-r4def', instanceId: context.environment.instanceId, projectId, readOnly: true, phase: current }); need(r?.receiptId && r.body?.id === d.handoverBasisSnapshotId && r.body.project_id === projectId, 'actual-bound-basis-receipt');
        if (r.identity ?? r.body.identity) identityProof(r.identity ?? r.body.identity);
        const row = r.body, p = row.source_payload; need(payloadHash(p) === row.payload_hash && row.source_hash === d.sourcePayloadHash, 'actual-frozen-full-payload-hash'); need(payloadHash({ projectId: p.projectId, salesOwnerUserId: p.salesOwnerUserId, members: p.members, materials: p.materials }) === d.sourcePayloadHash, 'actual-D-material-source-hash');
        const included = p.materials.find(m => m.versionGroupId === normal.versionGroupId), excluded = p.materials.find(m => m.versionGroupId === sensitive.versionGroupId);
        need(included?.attachmentId === chosen.id && included.version === chosen.versionNo && included.contentHash === fixed.sha256 && included.included === true, 'actual-chosen-final-identity-version-and-content'); need(excluded?.attachmentId === sensitive.id && excluded.contentHash === WITNESSES47.sensitive.sha256 && excluded.securityLevel === 'confidential' && excluded.included === false, 'actual-confidential-default-exclusion'); observation.status = 'passed'; observation.receiptId = r.receiptId;
    }
    function consent(d) { return { summarySnapshotId: d.summarySnapshotId, handoverBasisSnapshotId: d.handoverBasisSnapshotId, expectedConfirmationVersion: version(d.participantConfirmationSummary), comment: '本人核验本次真实附件固定版本及全部职责' }; }
    async function resolve(id) { need(typeof resolveParticipant === 'function', 'actual-person-session-resolver-required'); const actor = principal(await resolveParticipant(uid(id))); need(actor.id === id, 'only-actual-authenticated-assigned-person'); return actor; }
    async function confirmOne(d, id) { d = await detail(d.handoverId); const before = d.participantConfirmationSummary, person = before.participants.find(p => p.participantId === id); need(person?.participantStatus === 'pending', 'fresh-real-person-pending-required'); const out = await call(D + 'confirmProjectHandoverParticipant', d.handoverId, consent(d), await resolve(id)); const own = out.participantConfirmationSummary.participants.find(p => p.participantId === id); need(own?.participantStatus === 'confirmed' && own.confirmedAt && out.participantConfirmationSummary.confirmedCount === before.confirmedCount + 1, 'actual-own-consent-increases-one-person'); exact(own.responsibilities, person.responsibilities, 'all-personal-duties-confirmed-together'); return out; }
    async function prepare() {
        const s = await summary(), currentDetail = await call(D + 'getProjectHandoverDetailByProject', projectId, null, operator); need(s.allowedActions.includes('prepare-project-handover'), 'real-current-D-prepare-admission');
        const participants = first.participantConfirmationSummary.participants.map(p => ({ userId: p.participantId, responsibilities: clone(p.responsibilities) }));
        const d = await call(D + 'prepareProjectHandover', projectId, { executionOwnerUserId: first.executionOwnerUserId, participants, financeConfirmationRequired: first.financeConfirmationRequired, receiptJudgmentMode: first.receiptJudgmentModeSummary.receiptJudgmentMode, expectedProjectVersion: s.projectRowVersion, expectedSourceHash: s.sourcePayloadHash, expectedCurrentHandoverVersion: currentDetail.version, comment: 'K63根据真实受控附件版本重新准备；不继承旧本人确认' }, operator);
        need(d.handoverStatus === 'draft' && d.sourceChanged === false && d.participantConfirmationSummary.confirmedCount === 0 && d.participantConfirmationSummary.requiredCount === 3 && d.participantConfirmationSummary.participants.every(p => p.participantStatus === 'pending' && p.confirmedAt === null), 'new-D-must-start-all-three-pending');
        for (const p of d.participantConfirmationSummary.participants) { const old = first.participantConfirmationSummary.participants.find(v => v.participantId === p.participantId); need(old, 'same-actual-assigned-person'); exact(p.responsibilities, old.responsibilities, 'preserve-every-original-duty'); } return d;
    }
    async function staleReject(d, id) {
        const before = await detail(d.handoverId); need(before.sourceChanged === true, 'real-source-mismatch-before-stale-probe'); const actor = await resolve(id);
        await call(D + 'confirmProjectHandoverParticipant', d.handoverId, consent(before), actor, 409);
        const after = await detail(d.handoverId); exact(after.participantConfirmationSummary, before.participantConfirmationSummary, 'stale409-cannot-add-consent-or-advance-confirmation'); exact(after.frozenMaterials, before.frozenMaterials, 'old-materials-stay-frozen-after-stale-rejection');
    }
    async function legacyCheck(finalFlag) { normal = await get(normal.id); need(normal.isFinal === finalFlag && normal.status === 'active' && normal.checksumSha256 === WITNESSES47.normal1.sha256, 'real-legacy-V1-flags-and-content-preserved'); await download(normal, WITNESSES47.normal1); await attachmentProof(normal, context.normalSessionId, WITNESSES47.normal1, { legacy: true, isFinal: finalFlag }); }
    const jobs = {
        async 'capture-existing-ACKs'() {
            uid(projectId); uid(context.contractId); uid(context.first?.handoverId); uid(context.normal?.id); uid(context.sensitive?.id); uid(context.abandonedSessionId); principal(author); principal(operator);
            need(context.environment?.namespace === 'poms-r4def' && context.environment.apiOrigin === 'http://127.0.0.1:31341' && context.environment.receiptId && context.previousReceiptId, 'actual-new-namespace-original-receipts-required'); uid(context.environment.instanceId); need(/^[A-Za-z0-9_-]{1,16}$/.test(context.tag ?? ''), 'fresh-run-tag-required');
            for (const fixed of Object.values(WITNESSES47)) need(raw(fixed).length === fixed.size && sha(raw(fixed)) === fixed.sha256, 'independent-fixed-byte-witness-integrity');
            first = await call(D + 'getProjectHandoverDetailByProject', projectId, null, operator); need(first.handoverId === context.first.handoverId && first.version === context.first.version && first.summarySnapshotId === context.first.summarySnapshotId && first.handoverBasisSnapshotId === context.first.handoverBasisSnapshotId && first.sourcePayloadHash === context.first.sourcePayloadHash && first.sourceChanged === false && first.handoverStatus === 'draft', 'GET-current-must-match-previous-ACK-exactly-no-silent-rebase'); exact(first.participantConfirmationSummary, context.first.participantConfirmationSummary, 'existing-real-one-person-ACK-preserved'); need(first.participantConfirmationSummary.confirmedCount === 1 && first.participantConfirmationSummary.requiredCount === 3, 'actual-one-of-three-old-confirmation-baseline');
            normal = await get(context.normal.id); sensitive = await get(context.sensitive.id); need(normal.versionGroupId === context.normal.versionGroupId && normal.versionNo === 1 && normal.isFinal && normal.isLatest && sensitive.versionNo === 1 && sensitive.isFinal && sensitive.securityLevel === 'confidential', 'actual-original-normal-and-sensitive-final-V1');
            need(normal.links.some(l => l.status === 'active' && l.targetType === 'project' && l.targetId === projectId) && normal.links.some(l => l.status === 'active' && l.targetType === 'contract' && l.targetId === context.contractId), 'existing-ACKed-direct-and-contract-links');
            await download(normal, WITNESSES47.normal1); await download(sensitive, WITNESSES47.sensitive); await attachmentProof(normal, context.normalSessionId, WITNESSES47.normal1, { legacy: true }); await attachmentProof(sensitive, context.sensitiveSessionId, WITNESSES47.sensitive, { legacy: true }); await basisProof(first, normal, WITNESSES47.normal1);
            const checklist = await call(K + 'getChecklist', first.handoverId, null, operator), included = checklist.items.find(i => i.attachmentId === normal.id), excluded = checklist.items.find(i => i.attachmentId === sensitive.id); need(included?.status === 'included' && excluded?.status === 'sensitive-excluded', 'existing-nonempty-K-and-confidential-exclusion-still-real'); need((await summary()).sourcePayloadHash === first.sourcePayloadHash, 'current-legacy-V1-source-hash');
        },
        async 'retire-expired-failed-attempt'() {
            abandoned = await call(U + 'get', context.abandonedSessionId); need(abandoned.id === context.abandonedSessionId && abandoned.operationType === 'create-version' && abandoned.baseAttachmentId === normal.id && abandoned.completedAttachmentId === null, 'actual-old-failed-session-not-a-completed-version');
            need(Number.isFinite(Date.parse(abandoned.expiresAt)) && Date.parse(abandoned.expiresAt) < now(), 'old-session-must-actually-be-expired-no-SQL-extension');
            if (['pending', 'uploading', 'uploaded', 'validating'].includes(abandoned.status)) { const v = version(abandoned); abandoned = await call(U + 'abort', abandoned.id, { expectedVersion: v, reason: 'K63保留52原始失败证据；真实过期旧会话仅正式中止，不延长过期时间或重放PUT/complete' }); need(abandoned.status === 'aborted' && abandoned.completedAttachmentId === null && abandoned.rowVersion > v, 'real-API-abort-CAS-and-no-published-old-version'); }
            else need(['aborted', 'expired', 'failed'].includes(abandoned.status), 'unknown-old-terminal-state-stop');
            const actual = await call(U + 'get', abandoned.id); need(actual.status === abandoned.status && actual.completedAttachmentId === null && actual.expiresAt === abandoned.expiresAt, 'old-terminal-GET-preserved'); observations.push({ kind: 'expired-old-attempt-explicitly-retired-or-preserved', status: 'passed', sessionId: actual.id, actualStatus: actual.status, rowVersion: actual.rowVersion, originalExpiryPreserved: true }); await legacyCheck(true);
        },
        async 'fresh-nonfinal-version-and-immutable-final-proof'() {
            newSession = await call(U + 'create', null, { operationType: 'create-version', baseAttachmentId: normal.id, originalName: `R4DEF63-${context.tag}-normal-v2.txt`, displayName: `R4DEF63-${context.tag}-normal-v2.txt`, mimeType: 'text/plain', sizeBytes: WITNESSES47.normal2.size, checksumSha256: WITNESSES47.normal2.sha256, changeNote: '仅通过本次新会话真实上传版本2；首版原字节与已ACK链接不重造' }); uid(newSession.id); need(newSession.id !== abandoned.id && newSession.providerType === 'local' && newSession.uploadMode === 'proxy' && newSession.status === 'pending', 'genuine-fresh-owned-local-proxy-session');
            const target = await call(U + 'createUploadTarget', newSession.id, { expectedVersion: version(newSession) }); need(target.method === 'PUT' && target.url === `/api/attachment-upload-sessions/${newSession.id}/object` && target.providerType === 'local', 'actual-session-upload-target');
            need(uploadedCount++ === 0, 'new-session-PUT-once-only'); const uploaded = await call(U + 'proxyUploadObject', newSession.id, raw(WITNESSES47.normal2), author, 200, true); need(uploaded.sessionId === newSession.id && uploaded.status === 'uploaded', 'actual-single-new-PUT-ACK');
            need(completeCount++ === 0, 'new-session-complete-once-only'); const done = await call(U + 'complete', newSession.id, { expectedVersion: version(uploaded), checksumSha256: WITNESSES47.normal2.sha256 }); next = await get(uid(done.id));
            need(next.status === 'active' && next.versionGroupId === normal.versionGroupId && next.previousAttachmentId === normal.id && next.versionNo === normal.versionNo + 1 && next.isLatest && !next.isFinal && next.checksumSha256 === WITNESSES47.normal2.sha256 && next.sizeBytes === WITNESSES47.normal2.size, 'actual-new-nonfinal-version-identity-and-metadata'); exact(activeHTTPLinks(next), activeHTTPLinks(normal), 'actual-HTTP-inherited-link-set-not-new-link-producer');
            await download(next, WITNESSES47.normal2); await attachmentProof(next, newSession.id, WITNESSES47.normal2); await legacyCheck(true); need((await summary()).sourcePayloadHash === first.sourcePayloadHash && (await detail(first.handoverId)).sourceChanged === false, 'nonfinal-v2-does-not-change-real-V1-final-authority-or-D-hash'); await basisProof(await detail(first.handoverId), normal, WITNESSES47.normal1);
        },
        async 'mark-new-final-invalidates-first-consent'() {
            next = await call(A + 'markFinal', next.id, { note: 'K63真实不同内容版本2正式成为最终承接材料' }); need(next.isFinal, 'real-v2-final-flag'); await legacyCheck(false); await attachmentProof(next, newSession.id, WITNESSES47.normal2, { isFinal: true }); need((await summary()).sourcePayloadHash !== first.sourcePayloadHash && (await detail(first.handoverId)).sourceChanged, 'true-final-switch-changes-D-source');
            const confirmed = first.participantConfirmationSummary.participants.find(p => p.participantStatus === 'confirmed'); need(confirmed, 'real-already-confirmed-person-for-stale-idempotency-check'); await staleReject(first, confirmed.participantId);
        },
        async 'prepare-new-version-and-one-own-consent'() { second = await prepare(); need(second.handoverId !== first.handoverId && second.summarySnapshotId !== first.summarySnapshotId && second.sourcePayloadHash !== first.sourcePayloadHash, 'new-current-version-materials-not-old-alias'); await basisProof(second, next, WITNESSES47.normal2); second = await confirmOne(second, first.participantConfirmationSummary.participants[0].participantId); need(second.participantConfirmationSummary.confirmedCount === 1, 'one-real-person-confirms-new-version'); },
        async 'void-invalidates-new-version-consent'() {
            next = await call(A + 'void', next.id, { reason: 'K63验证真实最终v2失效使其旧本人确认材料失效' }); need(next.status === 'voided', 'actual-v2-void-status'); await attachmentProof(next, newSession.id, WITNESSES47.normal2, { status: 'voided', isFinal: next.isFinal }); need((await summary()).sourcePayloadHash !== second.sourcePayloadHash && (await detail(second.handoverId)).sourceChanged, 'real-void-invalidates-new-version-basis');
            const pending = second.participantConfirmationSummary.participants.find(p => p.participantStatus === 'pending'); need(pending, 'actual-pending-person-before-stale-consent'); await staleReject(second, pending.participantId); await download(normal, WITNESSES47.normal1);
        },
        async 'restore-v1-and-all-three-own-confirmations-R5-blocked'() {
            normal = await call(A + 'markFinal', normal.id, { note: 'K63核验真实旧V1字节后恢复final；所有人对新材料重新本人确认' }); need(normal.isFinal && normal.status === 'active', 'actual-V1-recovery'); await legacyCheck(true); recovered = await prepare(); need(recovered.handoverId !== second.handoverId && recovered.participantConfirmationSummary.confirmationRecordId !== second.participantConfirmationSummary.confirmationRecordId, 'fresh-recovery-confirmation-record'); await basisProof(recovered, normal, WITNESSES47.normal1);
            const beforeRefresh = recovered.sourcePayloadHash; const checklist = await call(K + 'refreshChecklist', recovered.handoverId, { preserveManualExclusions: true, includeHistoricalSelections: true }, operator); need(checklist.items.some(i => i.attachmentId === normal.id && i.status === 'included') && checklist.items.some(i => i.attachmentId === sensitive.id && i.status === 'sensitive-excluded'), 'recovered-real-K-nonempty-and-sensitive-excluded'); need((await summary()).sourcePayloadHash === beforeRefresh && !(await detail(recovered.handoverId)).sourceChanged, 'selection-metadata-refresh-never-changes-material-hash');
            for (const p of recovered.participantConfirmationSummary.participants) recovered = await confirmOne(recovered, p.participantId);
            const confirmation = recovered.participantConfirmationSummary; need(confirmation.confirmedCount === 3 && confirmation.status === 'confirmed', 'all-three-real-personal-confirmations-required');
            const participantConfirmations = confirmation.participants.flatMap(p => p.responsibilities.map(r => ({ participantId: p.participantId, participantRoleKey: r.roleKey, participantStatus: 'confirmed' })));
            const finalized = await call(D + 'confirmProjectHandover', recovered.handoverId, { participantConfirmations, contractSummarySnapshotId: recovered.contractSummarySnapshotId, summarySnapshotId: recovered.summarySnapshotId, handoverBasisSnapshotId: recovered.handoverBasisSnapshotId, sourcePayloadHash: recovered.sourcePayloadHash, expectedVersion: version(recovered), receiptJudgmentMode: recovered.receiptJudgmentModeSummary.receiptJudgmentMode }, operator); need(finalized.businessStatusAfter === 'confirmed' && finalized.closureStatus === 'handover-confirmed-freeze-pending' && finalized.executionAdmission?.allowed === false && finalized.executionAdmission.blockingReasons.some(r => /R5|提成角色冻结/.test(r)), 'real-final-recovery-still-R5-blocked'); recovered = await detail(recovered.handoverId); need(recovered.handoverStatus === 'confirmed' && recovered.participantConfirmationSummary.confirmedCount === 3 && recovered.receiptJudgmentModeSummary.status === 'frozen' && !recovered.sourceChanged && !recovered.executionAdmission.allowed, 'actual-confirmed-stable-recovered-D');
        },
    };
    const manifest = () => ({ kind: 'K63-real-partial52-continuation-request-candidate', stages: clone(stages), records: clone(records), observations: clone(observations), HTTPPassed: records.filter(r => r.status === 'passed').length, independentPGPassed: observations.filter(o => o.kind.startsWith('actual-PG') && o.status === 'passed').length, needsEvidence: observations.some(o => o.status === 'needs-evidence'), completed: stages.every(s => s.status === 'passed') && observations.every(o => o.status === 'passed'), previousACKsReplayed: false, freshVersionSessionCount: newSession ? 1 : 0, freshVersionPUTAttempts: uploadedCount, freshVersionCompleteAttempts: completeCount, oldFailedSessionPUTOrCompleteReplayed: false, initialState: 'not-run', SQLBusinessProducerUsed: false, objectBytesGeneratedOnlyAsDeclaredSyntheticHTTPPayload: true, legacyBindingsMigrated: false, authorExecutedHTTP: false, optionalLatePutRace: 'not-run; Root-owned gate63.sql and README plan only', G3Certified: false, G4Certified: false });
    return { manifest, async runAll() { need(!attempted, 'one-attempt-only-reconcile-real-receipts-before-new-candidate'); attempted = true; for (const name of STAGES) { const stage = stages.find(s => s.name === name); current = name; try { await jobs[name](); stage.status = 'passed'; } catch (error) { stage.status = 'failed'; stage.reason = error.code ?? 'actual-callback-or-assertion-failed'; break; } } return { ...manifest(), first, second, recovered, next, newSessionId: newSession?.id ?? null, abandonedSessionId: abandoned?.id ?? context.abandonedSessionId }; } };
}
