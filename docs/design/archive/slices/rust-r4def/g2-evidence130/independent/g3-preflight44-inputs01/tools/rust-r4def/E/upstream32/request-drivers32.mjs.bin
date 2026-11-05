// Pure request factories + injected real-service drivers. Import does no I/O.
// The old payload module is pure; never import its fixture/core/runtime modules.
import * as payload from '../../../rust-r4abc/upstream-payloads01.mjs';

const clone = value => structuredClone(value);
const validId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const need = (ok, code) => { if (!ok) throw Object.assign(new Error(code), { code }); };
const rv = row => { need(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0, 'actual-current-rowVersion-required'); return row.rowVersion; };
const uid = value => { need(validId(value), 'actual-returned-uuid-required'); return value; };
const actualActor = actor => { need(validId(actor?.id) && Array.isArray(actor.permissions), 'actual-login-actor-required'); return actor; };
const contractStages = ['customer', 'project', 'technical-cost', 'bid-commercial', 'draft-contract', 'commercial-baseline', 'actual-internal-summary', 'pricing-margin', 'readiness-diff-review', 'contract-preparation', 'contract-review-approval', 'contract-activation', 'formal-receivable-plan'];
const paths = {
  CustomerController_create: ['POST', '/api/customers', 201],
  ProjectController_create: ['POST', '/api/projects', 201],
  ProjectController_getById: ['GET', '/api/projects/{id}', 200],
  ProjectController_createProjectTechnicalCostPackage: ['POST', '/api/projects/{id}/technical-cost-packages', 201],
  ProjectController_createProjectBidCommercialProcess: ['POST', '/api/projects/{id}/bid-commercial-processes', 201],
  ProjectController_createProjectPricingMarginReview: ['POST', '/api/projects/{id}/pricing-margin-reviews', 201],
  ContractController_create: ['POST', '/api/contracts', 201],
  ContractController_getById: ['GET', '/api/contracts/{id}', 200],
  ContractController_getCurrentApproval: ['GET', '/api/contracts/{id}/approval-record', 200],
  ContractController_submitReview: ['POST', '/api/contracts/{id}:submitReview', 200],
  ContractController_activate: ['POST', '/api/contracts/{id}:activate', 200],
  ContractTermSnapshotController_getById: ['GET', '/api/contract-term-snapshots/{id}', 200],
  ContractReadinessController_createCommercialReleaseBaseline: ['POST', '/api/commercial-release-baselines', 201],
  ContractReadinessController_getCommercialReleaseBaseline: ['GET', '/api/commercial-release-baselines/{id}', 200],
  ContractReadinessController_createContractReadinessPackage: ['POST', '/api/contract-readiness-packages', 201],
  ContractReadinessController_getContractReadinessPackage: ['GET', '/api/contract-readiness-packages/{id}', 200],
  ContractReadinessController_getCurrentContractReadiness: ['GET', '/api/projects/{id}/contract-readiness', 200],
  ContractReadinessController_getDiffHistory: ['GET', '/api/commercial-release-baselines/{id}/diff-history', 200],
  ContractReadinessController_reviewDiff: ['POST', '/api/commercial-release-baselines/{id}:reviewDiff', 200],
  ContractReadinessController_initializeContractSnapshot: ['POST', '/api/contract-readiness-packages/{id}:initializeContractSnapshot', 200],
  ContractReadinessController_initializeReceivablePlan: ['POST', '/api/contract-readiness-packages/{id}:initializeReceivablePlan', 200],
  ApprovalController_approveRecord: ['POST', '/api/approval-records/{id}:approve', 200],
  ProjectHandoverController_getContractHandoverSummary: ['GET', '/api/projects/{id}/contract-handover', 200],
  ProjectHandoverController_getProjectHandoverDetailByProject: ['GET', '/api/projects/{id}/project-handover', 200],
  ProjectHandoverController_getProjectHandoverDetailByHandover: ['GET', '/api/project-handovers/{id}', 200],
  ProjectHandoverController_prepareProjectHandover: ['POST', '/api/projects/{id}/project-handovers', 201],
  ProjectHandoverController_confirmProjectHandoverParticipant: ['POST', '/api/project-handovers/{id}/participant-confirmations', 200],
  ProjectHandoverController_confirmProjectHandover: ['POST', '/api/project-handovers/{id}:confirm', 200],
  ProjectHandoverController_rebaselineContractHandover: ['POST', '/api/contract-handover-rebaselines', 200],
};
export const REQUEST_OPERATIONS32 = Object.freeze(paths);

function transport(request, receipts, currentStage) {
  return async function call(op, id = null, body = null, actor, query = {}) {
    need(typeof request === 'function', 'actual-request-callback-required'); actualActor(actor);
    const definition = paths[op]; need(definition, 'operation-in-closed-catalogue-required');
    if (id !== null) uid(id);
    const [method, template, expectedStatus] = definition;
    const meta = { method, path: template.replace('{id}', id ?? ''), query, caseId: `upstream32-${currentStage()}`, stepId: `upstream32-${receipts.length + 1}` };
    const receipt = { operationId: op, ...meta, actorId: actor.id, expectedStatus, status: 'requested' };
    receipts.push(receipt);
    const response = await request(op, id, clone(body), actor, meta);
    need(typeof response?.receiptId === 'string' && response.receiptId.length > 0, 'actual-HTTP-receipt-required');
    Object.assign(receipt, { receiptId: response.receiptId, requestId: response.requestId ?? null, httpStatus: response.status, status: response.status === expectedStatus ? 'passed' : 'failed' });
    need(response.status === expectedStatus, 'actual-HTTP-status-unexpected'); return response.body;
  };
}

/** Root provides an authenticated creator, actual marker/run IDs, and callbacks.
 * produceSummary is a SEPARATE actual trusted-internal binary invocation, not
 * HTTP. Its acknowledged CommonService receipt is independently counted.
 */
export function createContractUpstream32(context, { request, produceSummary, resolveApprover, fromExistingSources = false } = {}) {
  const perContract = contractStages.slice(8);
  const stages = fromExistingSources
    ? [{ id: 'read-existing-source', action: 'read-existing-source', status: 'not-run' }, ...contractStages.slice(6, 8).map(id => ({ id, action: id, status: 'not-run' })), ...[0, 1].flatMap(contractIndex => perContract.map(action => ({ id: `contract-${contractIndex + 1}-${action}`, action, contractIndex, status: 'not-run' })))]
    : contractStages.map(id => ({ id, action: id, status: 'not-run' }));
  const receipts = []; const internalReceipts = []; let current = 'not-run'; let started = false;
  const ctx = { ...context }; const creator = context.creator;
  let suppliedContracts = []; let selectedContractIndex = -1; const contractContexts = [];
  const call = transport(request, receipts, () => current);
  const actorFor = async approval => {
    const id = uid(approval.currentApproverUserId);
    const actor = typeof resolveApprover === 'function' ? await resolveApprover(id, clone(approval)) : context.approvers?.[id];
    actualActor(actor); need(actor.id === id, 'login-must-match-real-current-approver'); return actor;
  };
  const send = (description, id, actor = creator) => call(description.operationId, id, description.body, actor);
  const readinessRead = () => call('ContractReadinessController_getCurrentContractReadiness', uid(ctx.project.id), null, creator, { contractId: uid(ctx.contract.id) });
  const jobs = {
    async 'read-existing-source'() {
      for (const key of ['project', 'cost', 'bid', 'baseline', 'contract', 'secondContract']) uid(ctx[key]?.id);
      need(ctx.contract.id !== ctx.secondContract.id, 'two-distinct-real-contracts-required');
      ctx.project = await call('ProjectController_getById', uid(ctx.project.id), null, creator);
      ctx.baseline = await call('ContractReadinessController_getCommercialReleaseBaseline', uid(ctx.baseline.id), null, creator);
      need(ctx.baseline.projectId === ctx.project.id, 'same-actual-project-baseline-required');
      suppliedContracts = [];
      for (const supplied of [ctx.contract, ctx.secondContract]) {
        const actual = await call('ContractController_getById', uid(supplied.id), null, creator);
        need(actual.projectId === ctx.project.id && actual.status === 'draft', 'existing-source-must-be-real-same-project-draft-contract');
        suppliedContracts.push(actual);
      }
      ctx.contract = suppliedContracts[0]; ctx.secondContract = suppliedContracts[1];
    },
    async customer() { ctx.customer = await send(payload.customer(ctx), null); },
    async project() { ctx.project = await send(payload.project(ctx), null); },
    async 'technical-cost'() { ctx.cost = await send(payload.cost(ctx), uid(ctx.project.id)); },
    async 'bid-commercial'() { ctx.bid = await send(payload.bid(ctx, 'direct'), uid(ctx.project.id)); },
    async 'draft-contract'() { ctx.contract = await send(payload.draftContract(ctx), null); },
    async 'commercial-baseline'() {
      ctx.baseline = await send(payload.baseline(ctx), null);
      need(ctx.baseline.baselineStatus === 'draft', 'do-not-pretend-baseline-is-approval');
    },
    async 'actual-internal-summary'() {
      let result;
      if (ctx.summary !== undefined) {
        need(typeof ctx.summaryReceiptId === 'string' && ctx.summaryReceiptId.length > 0, 'already-produced-summary-needs-actual-receiptId');
        result = { body: ctx.summary, receiptId: ctx.summaryReceiptId };
      } else {
        need(typeof produceSummary === 'function', 'real-internal-summary-producer-required');
        const input = payload.summaryRequest(ctx);
        result = await produceSummary(clone(input), { namespace: 'poms-r4def', stage: current, actorId: creator.id, expectedExample: 'r4def_summary_producer32', requestIsApproval: false });
      }
      need(result?.receiptId && result.body?.outerCommitAcknowledged === true && validId(result.body.summarySnapshotId), 'summary-actual-COMMIT-ACK-required');
      need(result.body.createsApproval === false && result.body.rawMaterialsStoredInSummary === false, 'summary-is-factual-material-not-approval');
      need(result.body.materialReferences?.projectId === ctx.project.id && result.body.materialReferences?.costPackageId === ctx.cost.id && result.body.materialReferences?.baselineId === ctx.baseline.id, 'summary-real-material-binding');
      ctx.summary = result.body;
      internalReceipts.push({ stage: current, receiptId: result.receiptId, summarySnapshotId: ctx.summary.summarySnapshotId, definitionId: ctx.summary.definitionId, status: 'outer-COMMIT-ACK' });
    },
    async 'pricing-margin'() {
      ctx.pricing = await send(payload.pricing(ctx), uid(ctx.project.id));
      need(ctx.pricing.readyForContracting === true, 'actual-R3-pricing-release-required');
    },
    async 'readiness-diff-review'() {
      ctx.readiness = await send(payload.readiness(ctx, { lightReview: true }), null);
      ctx.diffHistory = await call('ContractReadinessController_getDiffHistory', uid(ctx.baseline.id), null, creator, { contractId: uid(ctx.contract.id) });
      ctx.baseline = await call('ContractReadinessController_getCommercialReleaseBaseline', uid(ctx.baseline.id), null, creator);
      await send(payload.reviewDiff(ctx), uid(ctx.baseline.id));
      ctx.readiness = await readinessRead(); need(ctx.readiness.guardDecision === 'allowed', 'actual-readiness-guard-required');
    },
    async 'contract-preparation'() {
      ctx.preparation = await send(payload.prepare(ctx), uid(ctx.readiness.id));
      uid(ctx.preparation.preparationId); need(ctx.preparation.snapshotId === null, 'preparation-is-not-active-snapshot');
    },
    async 'contract-review-approval'() {
      ctx.contract = await call('ContractController_getById', uid(ctx.contract.id), null, creator);
      ctx.submitted = await send(payload.submit(ctx), uid(ctx.contract.id)); uid(ctx.submitted.approvalRecordId);
      for (let index = 0; index < 8; index++) {
        ctx.approval = await call('ContractController_getCurrentApproval', uid(ctx.contract.id), null, creator);
        if (ctx.approval.currentStatus === 'approved') return;
        need(ctx.approval.currentStatus === 'pending', 'only-real-pending-approval-may-be-decided');
        need(ctx.approval.id === ctx.submitted.approvalRecordId, 'same-real-contract-review-record-required');
        await send(payload.decide(ctx), uid(ctx.approval.id), await actorFor(ctx.approval));
      }
      throw Object.assign(new Error('approval-step-limit-no-fake-release'), { code: 'approval-step-limit-no-fake-release' });
    },
    async 'contract-activation'() {
      ctx.contract = await call('ContractController_getById', uid(ctx.contract.id), null, creator);
      ctx.activated = await send(payload.activate(ctx), uid(ctx.contract.id));
      ctx.contract = await call('ContractController_getById', uid(ctx.contract.id), null, creator);
      need(ctx.contract.status === 'active', 'real-active-contract-required');
      ctx.effective = await call('ContractTermSnapshotController_getById', uid(ctx.activated.snapshotId), null, creator);
      need(ctx.effective.snapshotStatus === 'active' && ctx.effective.sourcePreparationId === ctx.preparation.preparationId, 'real-approved-preparation-to-immutable-snapshot');
    },
    async 'formal-receivable-plan'() {
      ctx.readiness = await call('ContractReadinessController_getContractReadinessPackage', uid(ctx.readiness.id), null, creator);
      ctx.plan = await send(payload.plan(ctx), uid(ctx.readiness.id));
      need(validId(ctx.plan.planVersionId) && validId(ctx.plan.initRecordId) && ctx.plan.snapshotId === ctx.activated.snapshotId, 'real-formal-plan-from-exact-active-snapshot');
      ctx.project = await call('ProjectController_getById', uid(ctx.project.id), null, creator);
      contractContexts.push(Object.fromEntries(['contract', 'readiness', 'preparation', 'submitted', 'approval', 'activated', 'effective', 'plan'].map(key => [key, ctx[key]])));
    },
  };
  const manifest = () => ({ kind: 'R4DEF-real-upstream-contract-request-driver32', stages: clone(stages), httpReceipts: clone(receipts), internalReceipts: clone(internalReceipts), runtimeExecuted: started, completed: stages.every(s => s.status === 'passed') });
  return {
    manifest,
    async run() {
      need(!started, 'one-execution-only-reconcile-actual-receipts-before-new-run'); actualActor(creator);
      need(['project:write', 'project:read', 'customer:write'].every(p => creator.permissions.includes(p)), 'actual-creator-route-guards-required');
      need(/^[A-Za-z0-9_-]{1,16}$/.test(ctx.tag ?? '') && validId(ctx.runId) && validId(ctx.expectedInstanceId), 'fresh-tag16-run-and-real-marker-required');
      need(typeof ctx.plannedDate === 'string', 'explicit-planned-business-date-required');
      ctx.actorId = creator.id; ctx.caseId = ctx.tag; started = true;
      for (const stage of stages) {
        current = stage.id;
        try {
          if (stage.contractIndex !== undefined && selectedContractIndex !== stage.contractIndex) {
            selectedContractIndex = stage.contractIndex; ctx.contract = suppliedContracts[selectedContractIndex];
            for (const key of ['readiness', 'preparation', 'submitted', 'approval', 'activated', 'effective', 'plan', 'diffHistory']) delete ctx[key];
          }
          await jobs[stage.action](); stage.status = 'passed';
        }
        catch (error) { stage.status = 'failed'; stage.reason = error.code ?? 'callback-or-assertion-failed'; break; }
      }
      const resultContext = { ...ctx, ...(contractContexts[0] ?? {}), ...(contractContexts[1] ? { secondContract: contractContexts[1].contract } : {}), contractContexts };
      return { ...manifest(), context: resultContext, contractContexts, activeContract: resultContext.contract?.status === 'active' ? { id: resultContext.contract.id, projectId: ctx.project.id, status: 'active', currencyCode: resultContext.contract.currencyCode } : null };
    },
  };
}

// Root upstream-base36 already produced these two contracts/common sources.
// This entry point creates no customer/project/cost/bid/contract/baseline again.
export function createContractContinuation32(context, callbacks = {}) {
  return createContractUpstream32(context, { ...callbacks, fromExistingSources: true });
}

/** D owns creation of real summaries/basis/confirmation rows in prepare.
 * Each supplied participant actor must personally confirm its actual duties.
 */
export function createHandoverUpstream32(context, { request, resolveParticipant } = {}) {
  const stages = ['read-real-source', 'prepare-real-handover', 'participants-self-confirm', 'finalize-handover', 'readback-frozen-handover'].map(id => ({ id, status: 'not-run' }));
  const receipts = []; let current = 'not-run'; let started = false; let detail;
  const operator = context.operator; const call = transport(request, receipts, () => current);
  const key = name => `ProjectHandoverController_${name}`;
  let summary;
  const read = () => call(key('getProjectHandoverDetailByHandover'), uid(detail.handoverId), null, operator);
  const jobs = {
    async 'read-real-source'() {
      summary = await call(key('getContractHandoverSummary'), uid(context.project.id), null, operator);
      need(summary.allowedActions?.includes('prepare-project-handover') && /^[0-9a-f]{64}$/.test(summary.sourcePayloadHash ?? ''), 'real-contract-source-and-plan-must-be-ready');
    },
    async 'prepare-real-handover'() {
      detail = await call(key('prepareProjectHandover'), uid(context.project.id), { executionOwnerUserId: uid(context.executionOwnerUserId), participants: clone(context.participants), financeConfirmationRequired: context.financeConfirmationRequired, receiptJudgmentMode: context.receiptJudgmentMode, expectedProjectVersion: summary.projectRowVersion, expectedSourceHash: summary.sourcePayloadHash, ...(context.expectedCurrentHandoverVersion ? { expectedCurrentHandoverVersion: context.expectedCurrentHandoverVersion } : {}), comment: '真实API准备移交；本人确认后才最终提交' }, operator);
      uid(detail.handoverId); uid(detail.summarySnapshotId); uid(detail.handoverBasisSnapshotId); uid(detail.contractSummarySnapshotId);
      need(detail.handoverStatus === 'draft', 'D-prepare-is-not-final-confirmation');
    },
    async 'participants-self-confirm'() {
      const people = detail.participantConfirmationSummary?.participants;
      need(Array.isArray(people) && people.length > 0, 'real-assigned-confirmation-participants-required');
      for (const person of people) {
        const actor = typeof resolveParticipant === 'function' ? await resolveParticipant(uid(person.participantId)) : context.participantActors?.[person.participantId];
        actualActor(actor); need(actor.id === person.participantId && actor.permissions.includes('project:read'), 'participant-must-use-own-real-authorized-session');
        detail = await read();
        detail = await call(key('confirmProjectHandoverParticipant'), uid(detail.handoverId), { summarySnapshotId: detail.summarySnapshotId, handoverBasisSnapshotId: detail.handoverBasisSnapshotId, expectedConfirmationVersion: rv(detail.participantConfirmationSummary), comment: '本人核验同一固定材料并确认所指派职责' }, actor);
      }
      need(detail.participantConfirmationSummary.status === 'confirmed', 'real-confirmation-record-complete');
    },
    async 'finalize-handover'() {
      detail = await read();
      const confirmations = detail.participantConfirmationSummary.participants.flatMap(person => {
        need(person.participantStatus === 'confirmed' && Array.isArray(person.responsibilities), 'real-personal-confirmation-required-before-finalize');
        return person.responsibilities.map(r => ({ participantId: person.participantId, participantRoleKey: r.roleKey, participantStatus: 'confirmed' }));
      });
      const response = await call(key('confirmProjectHandover'), uid(detail.handoverId), { participantConfirmations: confirmations, receiptJudgmentMode: context.receiptJudgmentMode, contractSummarySnapshotId: detail.contractSummarySnapshotId, handoverBasisSnapshotId: detail.handoverBasisSnapshotId, summarySnapshotId: detail.summarySnapshotId, sourcePayloadHash: detail.sourcePayloadHash, expectedVersion: rv(detail), comment: '本人职责确认完成后正式固定移交事实' }, operator);
      need(response.businessStatusAfter === 'confirmed' && response.executionAdmission?.allowed === false, 'D-confirmed-does-not-claim-R5-execution-admission');
    },
    async 'readback-frozen-handover'() {
      detail = await read(); const projectView = await call(key('getProjectHandoverDetailByProject'), uid(context.project.id), null, operator);
      need(detail.handoverStatus === 'confirmed' && projectView.handoverId === detail.handoverId, 'same-real-current-confirmed-handover');
      need(detail.closureStatus === 'handover-confirmed-freeze-pending' && detail.executionAdmission?.allowed === false, 'R5-freeze-still-pending');
    },
  };
  const manifest = () => ({ kind: 'R4DEF-D-request-only-preparation-driver32', stages: clone(stages), httpReceipts: clone(receipts), completed: stages.every(s => s.status === 'passed'), rebaseline: { status: 'not-run', reason: 'requires-real-effective-contract-amendment-and-affected-frozen-items' } });
  return { manifest, async run() {
    need(!started, 'one-execution-only'); actualActor(operator);
    need(operator.permissions.includes('project:write') && operator.permissions.includes('project:read'), 'actual-D-project-guards-required');
    need(Array.isArray(context.participants) && context.participants.length > 0 && typeof context.financeConfirmationRequired === 'boolean', 'explicit-real-participants-and-finance-decision-required');
    need(['project-aggregate', 'contract-separate'].includes(context.receiptJudgmentMode), 'explicit-receipt-policy-required');
    started = true;
    for (const stage of stages) { current = stage.id; try { await jobs[current](); stage.status = 'passed'; } catch (error) { stage.status = 'failed'; stage.reason = error.code ?? 'callback-or-assertion-failed'; break; } }
    return { ...manifest(), detail };
  } };
}

export function rebaselineRequest32({ amendment, detail, effectiveBaselineAfterId, affectedHandoverItemIds, rebaselineReason }) {
  need(amendment?.receiptId && amendment.status === 'effective', 'actual-effective-contract-amendment-receipt-required');
  need(typeof rebaselineReason === 'string' && rebaselineReason.trim(), 'responsible-rebaseline-reason-required');
  need(Array.isArray(affectedHandoverItemIds) && affectedHandoverItemIds.length > 0, 'actual-affected-frozen-item-ids-required');
  need(/^[0-9a-f]{64}$/.test(detail?.sourcePayloadHash ?? ''), 'actual-frozen-source-hash-required');
  affectedHandoverItemIds.forEach(uid);
  return { operationId: 'ProjectHandoverController_rebaselineContractHandover', id: null, body: { contractAmendmentId: uid(amendment.id), sourceHandoverId: uid(detail.handoverId), handoverBasisSnapshotId: uid(detail.handoverBasisSnapshotId), sourcePayloadHash: detail.sourcePayloadHash, expectedVersion: rv(detail), effectiveBaselineAfterId: uid(effectiveBaselineAfterId), affectedHandoverItemIds: clone(affectedHandoverItemIds), rebaselineReason } };
}
