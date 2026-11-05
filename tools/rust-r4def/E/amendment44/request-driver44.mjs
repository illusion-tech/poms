// Request-only acceptance candidate. No imports, filesystem, SQL or network.
// Root supplies actual sessions and a real request callback; nothing runs on import.
const clone = value => structuredClone(value);
const id = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const need = (ok, code) => { if (!ok) throw Object.assign(new Error(code), { code }); };
const uid = value => { need(id(value), 'real-returned-uuid-required'); return value; };
const version = row => { need(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0, 'real-current-rowVersion-required'); return row.rowVersion; };
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, ordered(value[k])])) : value;
const exact = (a, b, code) => need(JSON.stringify(ordered(a)) === JSON.stringify(ordered(b)), code);
const actor = value => { need(id(value?.id) && Array.isArray(value.permissions), 'actual-login-actor-required'); return value; };
const B = 'ContractReadinessController_', C = 'ContractController_', D = 'ProjectHandoverController_';
export const OPERATIONS44 = Object.freeze({
  [C + 'getById']: ['GET', '/api/contracts/{id}', 200],
  [C + 'getCurrentApproval']: ['GET', '/api/contracts/{id}/approval-record', 200],
  [C + 'submitReview']: ['POST', '/api/contracts/{id}:submitReview', 200],
  [C + 'activate']: ['POST', '/api/contracts/{id}:activate', 200],
  ContractTermSnapshotController_getById: ['GET', '/api/contract-term-snapshots/{id}', 200],
  ContractFinanceController_listReceipts: ['GET', '/api/contracts/{id}/receipt-records', 200],
  [B + 'getCurrentContractReadiness']: ['GET', '/api/projects/{id}/contract-readiness', 200],
  [B + 'getCommercialReleaseBaseline']: ['GET', '/api/commercial-release-baselines/{id}', 200],
  [B + 'getDiffHistory']: ['GET', '/api/commercial-release-baselines/{id}/diff-history', 200],
  [B + 'createContractReadinessPackage']: ['POST', '/api/contract-readiness-packages', 201],
  [B + 'reviewDiff']: ['POST', '/api/commercial-release-baselines/{id}:reviewDiff', 200],
  [B + 'initializeContractSnapshot']: ['POST', '/api/contract-readiness-packages/{id}:initializeContractSnapshot', 200],
  ApprovalController_approveRecord: ['POST', '/api/approval-records/{id}:approve', 200],
  [D + 'getContractHandoverSummary']: ['GET', '/api/projects/{id}/contract-handover', 200],
  [D + 'getProjectHandoverDetailByProject']: ['GET', '/api/projects/{id}/project-handover', 200],
  [D + 'getProjectHandoverDetailByHandover']: ['GET', '/api/project-handovers/{id}', 200],
  [D + 'rebaselineContractHandover']: ['POST', '/api/contract-handover-rebaselines', 200],
  [D + 'confirmProjectHandoverParticipant']: ['POST', '/api/project-handovers/{id}/participant-confirmations', 200],
  [D + 'confirmProjectHandover']: ['POST', '/api/project-handovers/{id}:confirm', 200],
  RuntimeAuditController_listAuditLogs: ['GET', '/api/audit-logs', 200],
});

export function contextFromPublicReceipts44(continuation, D42) {
  need(continuation?.completed === true && D42?.completed === true, 'real-completed-upstream-receipts-required');
  const projectId = uid(continuation.context?.project?.id);
  need(D42.detail?.projectId === projectId, 'same-real-project-required');
  return { projectId, handoverId: uid(D42.detail.handoverId), contractIds: { A: uid(continuation.context.contract.id), B: uid(continuation.context.secondContract.id) } };
}

export function createAmendmentAcceptance44(context, { request, resolveApprover, resolveParticipant } = {}) {
  const stages = ['capture', 'A1', 'A2', 'B1', 'affected-negative', 'rebaseline', 'lineage-evidence', 'fresh-confirmations', 'history-and-receipts'].map(name => ({ name, status: 'not-run' }));
  const stage = name => stages.find(s => s.name === name);
  const receipts = [], mutations = [], observations = [];
  let current = 'not-run', initial, replacement, rebaselineCommand;
  const originals = new Map();
  const author = context.author;
  const handoverOperator = context.handoverOperator ?? author;
  const projectId = context.projectId;
  const contractIds = context.contractIds ?? {};
  async function call(op, key = null, body = null, principal = author, query = {}, expected) {
    actor(principal); need(typeof request === 'function', 'actual-request-callback-required');
    const def = OPERATIONS44[op]; need(def, 'closed-actual-operation-required');
    if (key !== null) uid(key);
    const [method, template, defaultStatus] = def;
    const meta = { method, path: template.replace('{id}', key ?? ''), query, caseId: `amendment44-${current}`, stepId: `amendment44-${receipts.length + 1}` };
    const record = { operationId: op, ...meta, actorId: principal.id, expectedStatus: expected ?? defaultStatus, status: 'requested' };
    receipts.push(record);
    const result = await request(op, key, clone(body), principal, meta);
    need(typeof result?.receiptId === 'string' && result.receiptId.length > 0, 'actual-HTTP-receiptId-required');
    Object.assign(record, { receiptId: result.receiptId, requestId: result.requestId ?? null, httpStatus: result.status, status: result.status === record.expectedStatus ? 'passed' : 'failed' });
    need(result.status === record.expectedStatus, 'unexpected-real-HTTP-status'); return result.body;
  }
  async function attempt(name, job) {
    const record = stage(name); need(record?.status === 'not-run', 'stage-already-attempted-reconcile-before-retry');
    need(!stages.some(s => s.status === 'failed'), 'previous-failure-reconcile-actual-receipts');
    current = name;
    try { const result = await job(); record.status = 'passed'; return result; }
    catch (error) { record.status = 'failed'; record.reason = error.code ?? 'callback-or-assertion-failed'; throw error; }
  }
  const detail = key => call(D + 'getProjectHandoverDetailByHandover', uid(key), null, handoverOperator);
  const ready = contractId => call(B + 'getCurrentContractReadiness', uid(projectId), null, author, { contractId: uid(contractId) });
  const receiptList = contractId => call('ContractFinanceController_listReceipts', uid(contractId));
  function fixedMoney(snapshot) {
    for (const [field, value] of [['amountTaxInclusiveProjection', '56500.00'], ['amountTaxExclusiveProjection', '50000.00'], ['taxRateProjection', '0.1300']]) {
      need(snapshot[field]?.fieldPackageKey === 'contract-finance' && snapshot[field]?.mode === 'full' && snapshot[field]?.value === value, 'independent-existing-contract-money-witness');
    }
  }
  async function unchangedReceipts() {
    for (const [contractId, before] of originals) exact(await receiptList(contractId), before.receipts, 'existing-receipts-never-copied-updated-or-replayed');
  }
  function assertOldFrozen(old) {
    exact(old.frozenMaterials, initial.frozenMaterials, 'historical-frozen-scope-risk-and-snapshots-preserved');
    need(old.summarySnapshotId === initial.summarySnapshotId && old.contractSummarySnapshotId === initial.contractSummarySnapshotId && old.handoverBasisSnapshotId === initial.handoverBasisSnapshotId, 'old-material-identities-preserved');
    exact(old.participantConfirmationSummary, initial.participantConfirmationSummary, 'old-confirmation-history-preserved');
  }
  async function capture() {
    return attempt('capture', async () => {
      uid(projectId); uid(context.handoverId); uid(contractIds.A); uid(contractIds.B);
      need(contractIds.A !== contractIds.B && /^[A-Za-z0-9_-]{1,16}$/.test(context.tag ?? ''), 'distinct-contracts-and-fresh-tag16-required');
      actor(author); actor(handoverOperator);
      need(['project:read', 'project:write', 'contract:finance:manage', 'contract:finance:sensitive:read'].every(p => author.permissions.includes(p)), 'actual-author-and-financial-source-read-permissions-required');
      initial = await detail(context.handoverId);
      need(initial.projectId === projectId && initial.handoverStatus === 'confirmed' && initial.sourceChanged === false && initial.executionAdmission?.allowed === false, 'real-current-D42-confirmed-material-required');
      need(initial.participantConfirmationSummary?.status === 'confirmed' && initial.participantConfirmationSummary.confirmedCount === 3, 'real-D42-three-confirmers-required');
      const summary = await call(D + 'getContractHandoverSummary', projectId, null, handoverOperator);
      for (const contractId of Object.values(contractIds)) {
        const contract = await call(C + 'getById', contractId);
        const snapshot = await call('ContractTermSnapshotController_getById', uid(contract.currentSnapshotId));
        const member = summary.contractReadiness.find(m => m.contractId === contractId);
        const frozen = initial.frozenMaterials?.contracts.find(m => m.contractId === contractId);
        need(contract.status === 'active' && contract.projectId === projectId && snapshot.id === frozen?.contractTermSnapshotId && snapshot.version === 1 && member?.snapshotId === snapshot.id, 'real-V1-contract-snapshot-and-frozen-member-binding');
        fixedMoney(snapshot);
        originals.set(contractId, { contract, snapshot, frozen, planVersionId: uid(member.planVersionId), receipts: await receiptList(contractId) });
      }
      const receiptCounts = [...originals].map(([contractId, before]) => ({ contractId, confirmedReceipts: before.receipts.filter(r => r.status === 'confirmed').length }));
      observations.push({ kind: 'existing-confirmed-receipt-baseline', status: receiptCounts.every(c => c.confirmedReceipts > 0) ? 'passed' : 'needs-evidence', counts: receiptCounts, reason: receiptCounts.every(c => c.confirmedReceipts > 0) ? 'Real preexisting confirmed receipts will be compared after every mutation' : 'Empty history can prove no new receipt was inserted, but cannot certify preservation of an existing receipt. Root must prepare genuine confirmed receipt(s) through C before a fresh acceptance run.' });
      return manifest();
    });
  }
  async function amend(label) {
    need(stage('capture').status === 'passed' && ['A1', 'A2', 'B1'].includes(label), 'capture-before-named-amendment');
    if (label === 'A2') need(stage('A1').status === 'passed', 'A2-requires-actual-A1-chain');
    return attempt(label, async () => {
      const contractId = contractIds[label[0]];
      const before = await call(C + 'getById', contractId);
      need(before.status === 'active', 'amendment-must-preserve-Active-contract');
      const previous = await call('ContractTermSnapshotController_getById', uid(before.currentSnapshotId));
      let r = await ready(contractId);
      need(r.financialProjection?.mode === 'full' && r.candidateTerms?.contractId === contractId, 'real-authorized-candidate-terms-required');
      const source = await call(B + 'getCommercialReleaseBaseline', uid(r.sourceBaselineId));
      need(source.financialProjection?.mode === 'full' && source.contractTerms?.some(t => t.contractId === contractId), 'same-Active-commercial-reference-must-exist');
      const candidateTerms = clone(r.candidateTerms);
      need(candidateTerms.receivablePlanSeeds?.length > 0, 'real-existing-plan-node-required');
      candidateTerms.receivablePlanSeeds[0].label = `R4DEF44-${context.tag}-${label}-回款节点名称`;
      const reason = `R4DEF44-${context.tag}-${label}：仅修订既有回款节点名称，金额、税率、日期、节点身份与数量保持已读原值。`;
      r = await call(B + 'createContractReadinessPackage', null, { projectId, contractId, sourceBaselineId: r.sourceBaselineId, candidateTerms, amendment: { sourceSnapshotId: before.currentSnapshotId, expectedContractVersion: version(before), reason } });
      uid(r.contractAmendmentId); need(r.sourceContractSnapshotId === before.currentSnapshotId && r.amendmentStatus === 'draft', 'real-amendment-before-snapshot-binding');
      need(['review-required', 'prompt'].includes(r.diffLevel), 'material-change-requires-new-commercial-producer-do-not-bypass');
      if (r.reviewStatus === 'pending-review') {
        const history = await call(B + 'getDiffHistory', uid(r.sourceBaselineId), null, author, { contractId });
        const baseline = await call(B + 'getCommercialReleaseBaseline', uid(r.sourceBaselineId));
        need(history.diffItems?.length > 0, 'actual-exact-diff-fields-required');
        await call(B + 'reviewDiff', r.sourceBaselineId, { contractId, diffResultId: r.latestDiffResultId, diffDecision: 'approved', reviewedFieldKeys: [...new Set(history.diffItems.map(i => i.fieldKey))], comment: reason, attachmentIds: [], expectedVersion: version(baseline) });
        r = await ready(contractId);
      }
      need(r.guardDecision === 'allowed' && r.contractAmendmentId, 'real-amendment-readiness-guard-required');
      const preparation = await call(B + 'initializeContractSnapshot', uid(r.id), { contractId, contractReadinessPackageId: r.id, contractAmendmentId: r.contractAmendmentId, expectedVersion: version(r), comment: reason });
      uid(preparation.preparationId); need(preparation.snapshotId === null, 'preparation-is-not-effective-snapshot');
      const pendingContract = await call(C + 'getById', contractId);
      need(pendingContract.status === 'active' && pendingContract.currentSnapshotId === before.currentSnapshotId, 'preparation-does-not-switch-live-contract');
      const submitted = await call(C + 'submitReview', contractId, { preparationId: preparation.preparationId, contractAmendmentId: r.contractAmendmentId, expectedVersion: version(pendingContract), comment: reason });
      uid(submitted.approvalRecordId);
      let approval;
      for (let index = 0; index < 8; index++) {
        approval = await call(C + 'getCurrentApproval', contractId);
        need(approval.id === submitted.approvalRecordId, 'same-actual-review-binding-required');
        if (approval.currentStatus === 'approved') break;
        need(approval.currentStatus === 'pending' && typeof resolveApprover === 'function', 'actual-pending-approver-session-required');
        const principal = actor(await resolveApprover(uid(approval.currentApproverUserId), clone(approval)));
        need(principal.id === approval.currentApproverUserId, 'never-guess-or-substitute-approver');
        await call('ApprovalController_approveRecord', uid(approval.id), { expectedVersion: version(approval), comment: reason }, principal);
      }
      need(approval?.currentStatus === 'approved', 'actual-approval-required-no-fake-release');
      const approvedContract = await call(C + 'getById', contractId);
      need(approvedContract.status === 'active' && approvedContract.currentSnapshotId === before.currentSnapshotId, 'approval-alone-does-not-activate-amendment');
      const activated = await call(C + 'activate', contractId, { contractAmendmentId: r.contractAmendmentId, approvalRecordId: approval.id, expectedVersion: version(approvedContract), comment: reason });
      need(activated.contractAmendmentId === r.contractAmendmentId && activated.beforeSnapshotId === before.currentSnapshotId && id(activated.planVersionId), 'real-amendment-atomic-snapshot-and-complete-plan');
      const after = await call(C + 'getById', contractId), snapshot = await call('ContractTermSnapshotController_getById', uid(activated.snapshotId));
      const oldSnapshot = await call('ContractTermSnapshotController_getById', uid(before.currentSnapshotId));
      const effective = await ready(contractId);
      need(after.status === 'active' && after.currentSnapshotId === snapshot.id && snapshot.id !== previous.id && snapshot.version === previous.version + 1 && snapshot.snapshotStatus === 'active' && oldSnapshot.snapshotStatus === 'superseded', 'new-real-snapshot-version-and-old-history');
      need(snapshot.sourcePreparationId === preparation.preparationId && effective.amendmentStatus === 'effective' && effective.initializedReceivablePlanVersionId === activated.planVersionId && effective.currentPreparation?.activatedSnapshotId === snapshot.id, 'real-approval-preparation-plan-provenance');
      fixedMoney(snapshot); exact(effective.candidateTerms, candidateTerms, 'only-intended-label-change-in-effective-terms');
      const captured = { label, contractId, amendmentId: r.contractAmendmentId, beforeSnapshotId: previous.id, afterSnapshotId: snapshot.id, beforeVersion: previous.version, afterVersion: snapshot.version, preparationId: preparation.preparationId, approvalRecordId: approval.id, payloadHash: effective.currentPreparation.payloadHash, planVersionId: activated.planVersionId, readinessId: effective.id };
      mutations.push(captured);
      await unchangedReceipts();
      const old = await detail(initial.handoverId); assertOldFrozen(old); need(old.sourceChanged === true, 'old-D-source-mismatch-is-visible-not-silently-rebased');
      return clone(captured);
    });
  }
  function affectedItems() {
    const result = [];
    for (const contractId of new Set(mutations.map(m => m.contractId))) {
      const before = originals.get(contractId);
      for (const [type, sourceId] of [['contract', before.snapshot.id], ['receivable', before.planVersionId]]) {
        const matches = initial.handoverBasisItems.filter(i => i.itemType === type && i.sourceId === sourceId);
        need(matches.length === 1, 'affected-item-must-match-real-frozen-source-identity'); result.push(matches[0].id);
      }
    }
    return result.sort();
  }
  function rebaselineBody(old, items) {
    const anchor = mutations.at(-1);
    return { sourceHandoverId: old.handoverId, handoverBasisSnapshotId: old.handoverBasisSnapshotId, sourcePayloadHash: old.sourcePayloadHash, expectedVersion: version(old), contractAmendmentId: anchor.amendmentId, effectiveBaselineAfterId: anchor.afterSnapshotId, affectedHandoverItemIds: items, rebaselineReason: `R4DEF44-${context.tag}：逐合同核验全部生效变更链及原条款/完整回款计划影响，不继承旧人员确认。` };
  }
  async function rebaseline({ confirm = true } = {}) {
    need(stage('capture').status === 'passed' && mutations.length > 0, 'real-effective-amendment-required');
    const affected = affectedItems();
    await attempt('affected-negative', async () => {
      const old = await detail(initial.handoverId);
      await call(D + 'rebaselineContractHandover', null, rebaselineBody(old, affected.slice(1)), handoverOperator, {}, 400);
      const still = await call(D + 'getProjectHandoverDetailByProject', projectId, null, handoverOperator);
      need(still.handoverId === initial.handoverId && still.summarySnapshotId === initial.summarySnapshotId, 'missing-affected-item-rejected-atomically'); assertOldFrozen(still);
    });
    await attempt('rebaseline', async () => {
      const old = await detail(initial.handoverId);
      rebaselineCommand = await call(D + 'rebaselineContractHandover', null, rebaselineBody(old, affected), handoverOperator);
      replacement = await detail(uid(rebaselineCommand.replacementHandoverId));
      need(replacement.handoverStatus === 'draft' && replacement.handoverId !== initial.handoverId && replacement.handoverBasisSnapshotId !== initial.handoverBasisSnapshotId && replacement.summarySnapshotId !== initial.summarySnapshotId && replacement.contractSummarySnapshotId !== initial.contractSummarySnapshotId && replacement.sourcePayloadHash !== initial.sourcePayloadHash, 'new-frozen-summary-and-basis-identities');
      need(replacement.participantConfirmationSummary.status === 'pending' && replacement.participantConfirmationSummary.confirmedCount === 0 && replacement.participantConfirmationSummary.requiredCount === 3 && replacement.participantConfirmationSummary.confirmationRecordId !== initial.participantConfirmationSummary.confirmationRecordId, 'old-confirmations-must-not-be-inherited');
      for (const p of replacement.participantConfirmationSummary.participants) need(p.participantStatus === 'pending' && p.confirmedAt === null, 'every-new-person-must-self-confirm-again');
      for (const frozen of replacement.frozenMaterials.contracts) {
        const oldFrozen = originals.get(frozen.contractId).frozen;
        exact(frozen.scopeItems, oldFrozen.scopeItems, 'V1-frozen-scope-preserved'); exact(frozen.riskItems, oldFrozen.riskItems, 'V1-frozen-risk-preserved');
        need(frozen.technicalCostPackageId === oldFrozen.technicalCostPackageId && frozen.technicalCostVersion === 1, 'same-real-V1-technical-source');
        const latest = mutations.filter(m => m.contractId === frozen.contractId).at(-1);
        need(frozen.contractTermSnapshotId === (latest?.afterSnapshotId ?? oldFrozen.contractTermSnapshotId), 'frozen-member-uses-current-approved-contract-chain');
      }
      const claimed = replacement.participantConfirmationSummary.participants.flatMap(p => p.responsibilities.map(r => ({ participantId: p.participantId, participantRoleKey: r.roleKey, participantStatus: 'confirmed' })));
      await call(D + 'confirmProjectHandover', replacement.handoverId, { participantConfirmations: claimed, contractSummarySnapshotId: replacement.contractSummarySnapshotId, handoverBasisSnapshotId: replacement.handoverBasisSnapshotId, summarySnapshotId: replacement.summarySnapshotId, sourcePayloadHash: replacement.sourcePayloadHash, expectedVersion: version(replacement) }, handoverOperator, {}, 409);
    });
    await attempt('lineage-evidence', async () => {
      const principal = context.auditActor ?? author;
      if (!actor(principal).permissions.includes('platform:users:manage')) { observations.push({ status: 'needs-evidence', kind: 'actual-D-amendment-chain-audit', reason: 'actual-authorized-audit-reader-required' }); return; }
      const rows = await call('RuntimeAuditController_listAuditLogs', null, null, principal, { targetType: 'project-handover', targetId: rebaselineCommand.rebaselineRecordId, eventType: D + 'rebaselineContractHandover', limit: 100 });
      const row = rows.find(r => Array.isArray(r.metadata?.amendmentChains)); need(row, 'real-rebaseline-lineage-audit-required');
      const chains = row.metadata.amendmentChains;
      need(chains.length === new Set(mutations.map(m => m.contractId)).size, 'all-changed-contracts-in-lineage');
      for (const contractId of new Set(mutations.map(m => m.contractId))) {
        const expected = mutations.filter(m => m.contractId === contractId), chain = chains.find(c => c.contractId === contractId);
        need(chain?.fromSnapshotId === originals.get(contractId).snapshot.id && chain?.toSnapshotId === expected.at(-1).afterSnapshotId && chain?.amendments.length === expected.length, 'complete-not-just-latest-multi-contract-chain');
        expected.forEach((m, index) => exact(chain.amendments[index], { contractAmendmentId: m.amendmentId, beforeSnapshotId: m.beforeSnapshotId, afterSnapshotId: m.afterSnapshotId, preparationId: m.preparationId, approvalRecordId: m.approvalRecordId, payloadHash: m.payloadHash }, 'actual-preparation-approval-payload-provenance-each-hop'));
      }
      observations.push({ status: 'passed', kind: 'actual-D-amendment-chain-audit', auditId: row.id, chainLengths: chains.map(c => ({ contractId: c.contractId, amendments: c.amendments.length })) });
    });
    if (confirm) await attempt('fresh-confirmations', async () => {
      for (const person of replacement.participantConfirmationSummary.participants) {
        need(typeof resolveParticipant === 'function', 'actual-participant-session-resolver-required');
        const principal = actor(await resolveParticipant(person.participantId)); need(principal.id === person.participantId, 'each-participant-must-confirm-own-identity');
        replacement = await detail(replacement.handoverId);
        replacement = await call(D + 'confirmProjectHandoverParticipant', replacement.handoverId, { summarySnapshotId: replacement.summarySnapshotId, handoverBasisSnapshotId: replacement.handoverBasisSnapshotId, expectedConfirmationVersion: version(replacement.participantConfirmationSummary), comment: '本人重新核对新摘要、全部变更链、范围风险与原职责后再次确认。' }, principal);
      }
      need(replacement.participantConfirmationSummary.status === 'confirmed', 'new-real-confirmation-complete');
      const participantConfirmations = replacement.participantConfirmationSummary.participants.flatMap(p => { need(p.participantStatus === 'confirmed', 'no-forged-confirmation-flags'); return p.responsibilities.map(r => ({ participantId: p.participantId, participantRoleKey: r.roleKey, participantStatus: 'confirmed' })); });
      await call(D + 'confirmProjectHandover', replacement.handoverId, { participantConfirmations, contractSummarySnapshotId: replacement.contractSummarySnapshotId, handoverBasisSnapshotId: replacement.handoverBasisSnapshotId, summarySnapshotId: replacement.summarySnapshotId, sourcePayloadHash: replacement.sourcePayloadHash, expectedVersion: version(replacement), receiptJudgmentMode: replacement.receiptJudgmentModeSummary.receiptJudgmentMode }, handoverOperator);
      replacement = await detail(replacement.handoverId);
      need(replacement.handoverStatus === 'confirmed' && replacement.closureStatus === 'handover-confirmed-freeze-pending' && replacement.executionAdmission.allowed === false, 'R5-admission-still-blocked-after-new-handover-confirmed');
    });
    await attempt('history-and-receipts', async () => { assertOldFrozen(await detail(initial.handoverId)); await unchangedReceipts(); });
    return result();
  }
  function manifest() { return { kind: 'R4DEF-controlled-amendment-request-only44', stages: clone(stages), observations: clone(observations), receipts: clone(receipts), mutations: clone(mutations), initialState: 'not-run', needsEvidence: observations.some(o => o.status === 'needs-evidence'), HTTPPassed: receipts.filter(r => r.status === 'passed').length, completed: stages.every(s => s.status === 'passed') && !observations.some(o => o.status !== 'passed'), noReceiptWriteOperationInCatalogue: true }; }
  function result() { return { ...manifest(), initial, replacement, rebaselineCommand }; }
  return { manifest, capture, amend, rebaseline, result, async runAll() { try { if (stage('capture').status !== 'passed') await capture(); for (const label of ['A1', 'A2', 'B1']) if (stage(label).status !== 'passed') await amend(label); await rebaseline(); } catch { /* Actual receipts/stage reason retained. No retries or fake recovery. */ } return result(); } };
}
