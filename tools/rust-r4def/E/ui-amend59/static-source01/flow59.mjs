// Import-safe browser flow. Only DOM actions can issue business commands.
// Root supplies a real browser/origin/fixture. No HTTP client, routes, SQL or mocks.
import assert from 'node:assert/strict';

export const OPERATIONS59 = Object.freeze({
    AuthController_createPasswordAuthSession: ['POST', '/api/auth/sessions', 200],
    ProjectHandoverController_getContractHandoverSummary: ['GET', '/api/projects/{projectId}/contract-handover', 200],
    ProjectHandoverController_getProjectHandoverDetailByProject: ['GET', '/api/projects/{projectId}/project-handover', 200],
    ContractController_getById: ['GET', '/api/contracts/{id}', 200],
    ContractController_getCurrentApproval: ['GET', '/api/contracts/{id}/approval-record', 200],
    ContractController_submitReview: ['POST', '/api/contracts/{id}:submitReview', 200],
    ContractController_activate: ['POST', '/api/contracts/{id}:activate', 200],
    ApprovalController_approveRecord: ['POST', '/api/approval-records/{id}:approve', 200],
    ContractReadinessController_getCurrentContractReadiness: ['GET', '/api/projects/{projectId}/contract-readiness', 200],
    ContractReadinessController_getDiffHistory: ['GET', '/api/commercial-release-baselines/{id}/diff-history', 200],
    ContractReadinessController_createContractReadinessPackage: ['POST', '/api/contract-readiness-packages', 201],
    ContractReadinessController_reviewDiff: ['POST', '/api/commercial-release-baselines/{id}:reviewDiff', 200],
    ContractReadinessController_initializeContractSnapshot: ['POST', '/api/contract-readiness-packages/{id}:initializeContractSnapshot', 200],
    ProjectHandoverController_rebaselineContractHandover: ['POST', '/api/contract-handover-rebaselines', 200],
    ProjectHandoverController_confirmProjectHandoverParticipant: ['POST', '/api/project-handovers/{id}/participant-confirmations', 200],
    ProjectHandoverController_confirmProjectHandover: ['POST', '/api/project-handovers/{id}:confirm', 200],
});
const STAGES = ['writer-login-and-current-confirmed', 'writer-controlled-amendment', 'writer-exact-diff-review', 'writer-prepare', 'writer-submit', 'actual-current-approver', 'writer-activate', 'writer-two-affected-items-rebaseline', 'full-new-self-confirmation', 'personA-new-self-confirmation', 'writer-new-self-confirmation', 'writer-final-R5-blocked'];
export const initialPlan59 = () => ({ stages: STAGES.map(name => ({ name, status: 'not-run' })), browserExecuted: false, businessCommandsExecuted: 0, complete: false, optionalLateAttachmentFailure: 'not-run; separate Root-owned fault scenario', G3Certified: false, G4Certified: false });
const uuid = value => { assert(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), 'Real returned UUID required'); return value; };
const version = value => { assert(Number.isSafeInteger(value) && value > 0, 'Actual current CAS version required'); return value; };
const clone = value => structuredClone(value);
const sorted = values => [...values].sort();
const unwrap = value => value?.data ?? value;
const actionsFor = page => page.locator('app-project-handover-actions');

export function createControlledAmendment59({ browser, expect, origin, actors, projectId, contractId, otherContractId, originalHandoverId, expectedHandoverVersion = 1, expectedContractSnapshotVersion = 1, tag, shot, observe, stageChanged, registerPage }) {
    const result = initialPlan59(), contexts = [], pages = [], commands = [], sessions = [], observations = [];
    let activeStage = null, writer, oldDetail, oldSummary, oldContract, oldReady, expectedTerms, ready, prepared, submitted, approval, activated, replacement;
    let attempted = false;
    function record(value) { observations.push(value); if (observe) observe(value); }
    const route = `/projects/${projectId}/workspace/contract-handover`;
    function match(response, op, id = null, query = {}) {
        const [method, template] = OPERATIONS59[op];
        let target = template;
        for (const placeholder of target.matchAll(/\{[^}]+\}/g)) { if (!id) return false; target = target.replace(placeholder[0], encodeURIComponent(id)); }
        const url = new URL(response.url());
        return url.origin === origin && response.request().method() === method && url.pathname === target && Object.entries(query).every(([k, v]) => url.searchParams.get(k) === String(v));
    }
    async function read(response, op, status = OPERATIONS59[op][2]) {
        assert.equal(response.status(), status, `Actual ${op} status must match authority`);
        const body = unwrap(await response.json()); assert(body !== null && typeof body === 'object'); return body;
    }
    async function idle(page) {
        await page.waitForLoadState('networkidle');
        const a = actionsFor(page);
        await expect(a.getByRole('button', { name: '重新核对当前材料', exact: true })).toBeEnabled();
        await expect(a.locator('[role="alert"].text-red-600')).toHaveCount(0);
    }
    async function clickCommand(page, key, op, id, button, validateRequest) {
        const promise = page.waitForResponse(r => match(r, op, id));
        await button.click(); const response = await promise;
        const requestBody = response.request().postDataJSON();
        if (validateRequest) validateRequest(requestBody);
        const body = await read(response, op);
        commands.push({ stage: activeStage, actor: key, operationId: op, method: response.request().method(), path: new URL(response.url()).pathname, status: response.status() });
        result.businessCommandsExecuted = commands.length;
        await idle(page); return body;
    }
    async function reload(page) {
        const detail = page.waitForResponse(r => match(r, 'ProjectHandoverController_getProjectHandoverDetailByProject', projectId));
        const summary = page.waitForResponse(r => match(r, 'ProjectHandoverController_getContractHandoverSummary', projectId));
        await actionsFor(page).getByRole('button', { name: '重新核对当前材料', exact: true }).click();
        const pair = await Promise.all([detail, summary]);
        const data = { detail: await read(pair[0], 'ProjectHandoverController_getProjectHandoverDetailByProject'), summary: await read(pair[1], 'ProjectHandoverController_getContractHandoverSummary') };
        assert.equal(data.detail.projectId, projectId); assert.equal(data.summary.projectId, projectId); await idle(page); return data;
    }
    async function selectContract(page) {
        const selector = actionsFor(page).getByRole('combobox', { name: '选择合同', exact: true });
        await selector.selectOption('');
        const contract = page.waitForResponse(r => match(r, 'ContractController_getById', contractId));
        const readiness = page.waitForResponse(r => match(r, 'ContractReadinessController_getCurrentContractReadiness', projectId, { contractId }));
        const currentApproval = page.waitForResponse(r => match(r, 'ContractController_getCurrentApproval', contractId));
        const history = page.waitForResponse(r => {
            const u = new URL(r.url()); return u.origin === origin && r.request().method() === 'GET' && /^\/api\/commercial-release-baselines\/[^/]+\/diff-history$/.test(u.pathname) && u.searchParams.get('contractId') === contractId;
        });
        await selector.selectOption(contractId);
        const [c, r, a, h] = await Promise.all([contract, readiness, currentApproval, history]);
        const data = { contract: await read(c, 'ContractController_getById'), ready: await read(r, 'ContractReadinessController_getCurrentContractReadiness'), approval: await read(a, 'ContractController_getCurrentApproval'), history: await read(h, 'ContractReadinessController_getDiffHistory') };
        assert.equal(data.contract.id, contractId); assert.equal(data.contract.projectId, projectId); assert.equal(data.ready.contractId, contractId); assert.equal(data.ready.projectId, projectId);
        await idle(page); await expect(selector).toHaveValue(contractId); await expect(actionsFor(page).locator('input[name="node-label-0"]')).toBeVisible(); return data;
    }
    async function login(key) {
        const fixture = actors[key]; assert(fixture?.username && fixture.password && uuid(fixture.id));
        const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } }); contexts.push(context);
        const page = await context.newPage(); pages.push(page); page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(30000); if (registerPage) registerPage(page, key);
        await page.goto(origin + '/auth/login'); await page.locator('#username').fill(fixture.username); await page.locator('#password').fill(fixture.password);
        const ack = page.waitForResponse(r => match(r, 'AuthController_createPasswordAuthSession'));
        await page.getByRole('button', { name: '登录', exact: true }).click();
        const session = await read(await ack, 'AuthController_createPasswordAuthSession'), user = session.user ?? session.currentUser ?? session;
        const id = user.id ?? user.userId ?? user.sub, permissions = user.permissions ?? session.permissions;
        assert.equal(id, fixture.id, 'Real UI login principal must match current new-namespace fixture'); assert(Array.isArray(permissions));
        sessions.push({ key, id, permissions });
        await expect(page.locator('#username')).toHaveCount(0);
        const detail = page.waitForResponse(r => match(r, 'ProjectHandoverController_getProjectHandoverDetailByProject', projectId));
        const summary = page.waitForResponse(r => match(r, 'ProjectHandoverController_getContractHandoverSummary', projectId));
        await page.goto(origin + route);
        const data = { page, actor: { key, id, permissions }, detail: await read(await detail, 'ProjectHandoverController_getProjectHandoverDetailByProject'), summary: await read(await summary, 'ProjectHandoverController_getContractHandoverSummary') };
        await idle(page); return data;
    }
    async function checkRetainedWriterForm() {
        await expect(actionsFor(writer.page).getByRole('combobox', { name: '选择合同', exact: true })).toHaveValue(contractId);
        await expect(actionsFor(writer.page).locator('input[name="amendmentReason"]')).toHaveValue(reason());
    }
    const reason = () => `R4DEF59-${tag}：仅修订首回款节点名称；金额、税率、日期、节点身份及数量保持本次真实已读原值。`;
    function oldFrozenUnchanged(detail) {
        assert.equal(detail.handoverId, oldDetail.handoverId); assert.equal(detail.summarySnapshotId, oldDetail.summarySnapshotId); assert.equal(detail.handoverBasisSnapshotId, oldDetail.handoverBasisSnapshotId); assert.equal(detail.contractSummarySnapshotId, oldDetail.contractSummarySnapshotId); assert.deepEqual(detail.frozenMaterials, oldDetail.frozenMaterials); assert.deepEqual(detail.participantConfirmationSummary, oldDetail.participantConfirmationSummary);
    }
    async function stage(name, work) {
        activeStage = name; const entry = result.stages.find(s => s.name === name); assert.equal(entry.status, 'not-run');
        if (stageChanged) stageChanged(name);
        try { await work(); entry.status = 'passed'; } catch (error) { entry.status = 'failed'; entry.errorName = error.name; throw error; }
    }
    async function freshSelf(key) {
        const own = await login(key), before = own.detail, id = own.actor.id;
        assert.equal(before.handoverId, replacement.handoverId); assert.equal(before.summarySnapshotId, replacement.summarySnapshotId); assert.equal(before.handoverBasisSnapshotId, replacement.handoverBasisSnapshotId);
        const participant = before.participantConfirmationSummary.participants.find(p => p.participantId === id); assert(participant && participant.participantStatus === 'pending');
        await expect(actionsFor(own.page).locator('[aria-label="本次确认的冻结范围和风险"]')).toBeVisible();
        const after = await clickCommand(own.page, key, 'ProjectHandoverController_confirmProjectHandoverParticipant', replacement.handoverId, actionsFor(own.page).getByRole('button', { name: '确认本人全部已指派职责', exact: true }), body => {
            assert.equal(body.summarySnapshotId, replacement.summarySnapshotId); assert.equal(body.handoverBasisSnapshotId, replacement.handoverBasisSnapshotId); assert.equal(body.expectedConfirmationVersion, version(before.participantConfirmationSummary.rowVersion));
            assert(!Object.hasOwn(body, 'participantId') && !Object.hasOwn(body, 'userId'), 'Confirmation must target authenticated self, never substitute another person');
        });
        const confirmed = after.participantConfirmationSummary.participants.find(p => p.participantId === id); assert.equal(confirmed.participantStatus, 'confirmed'); assert(confirmed.confirmedAt); assert.deepEqual(confirmed.responsibilities, participant.responsibilities);
        assert.equal(after.participantConfirmationSummary.confirmedCount, before.participantConfirmationSummary.confirmedCount + 1);
        await expect(actionsFor(own.page).getByRole('button', { name: '确认本人全部已指派职责', exact: true })).toHaveCount(0);
        record({ stage: activeStage, actorId: id, confirmedViaOwnFreshBrowserContext: true, responsibilityRoleKeys: sorted(confirmed.responsibilities.map(r => r.roleKey)), handoverId: after.handoverId, confirmedCount: after.participantConfirmationSummary.confirmedCount });
        if (shot) await shot(`10-self-${key}`, own.page);
    }
    return {
        manifest: () => clone({ ...result, commands, sessions, observations }),
        async closeContexts() { for (const context of contexts) await context.close(); },
        async failureScreenshot() { if (shot && pages.length) await shot('failure59', pages.at(-1)); },
        async run() {
            assert(!attempted, 'One attempt only: reconcile real receipts after failure; never replay mutation stages'); attempted = true;
            assert(browser && expect && new URL(origin).hostname === '127.0.0.1'); uuid(projectId); uuid(contractId); uuid(otherContractId); uuid(originalHandoverId); assert(contractId !== otherContractId); assert(/^[A-Za-z0-9_-]{1,20}$/.test(tag)); result.browserExecuted = true;
            await stage('writer-login-and-current-confirmed', async () => {
                writer = await login('writer'); const permissions = writer.actor.permissions;
                assert(permissions.includes('project:read') && permissions.includes('project:write') && permissions.includes('contract:finance:sensitive:read')); assert(!permissions.includes('contract:finance:manage'), 'Writer role must prove no finance-manage permission');
                oldDetail = clone(writer.detail); oldSummary = clone(writer.summary);
                assert.equal(oldDetail.handoverId, originalHandoverId); assert.equal(oldDetail.version, version(expectedHandoverVersion)); assert.equal(oldDetail.handoverStatus, 'confirmed'); assert.equal(oldDetail.sourceChanged, false); assert.equal(oldDetail.executionAdmission.allowed, false); assert.equal(oldDetail.participantConfirmationSummary.confirmedCount, 3); assert.equal(oldDetail.participantConfirmationSummary.requiredCount, 3);
                assert.deepEqual(sorted(oldDetail.participantConfirmationSummary.participants.map(p => p.participantId)), sorted(['full', 'personA', 'writer'].map(k => actors[k].id)));
                assert.equal(oldDetail.frozenMaterials.contracts.length, 2); assert.deepEqual(sorted(oldDetail.frozenMaterials.contracts.map(c => c.contractId)), sorted([contractId, otherContractId]));
                const current = await selectContract(writer.page); oldContract = clone(current.contract); oldReady = clone(current.ready);
                assert.equal(oldContract.status, 'active'); assert.equal(oldContract.currentTermSnapshot.version, version(expectedContractSnapshotVersion)); assert.equal(oldReady.financialProjection.mode, 'full'); assert(oldReady.candidateTerms?.receivablePlanSeeds?.length > 0);
                const member = oldSummary.contractReadiness.find(c => c.contractId === contractId); assert.equal(member.snapshotId, oldContract.currentSnapshotId); uuid(member.planVersionId);
                record({ stage: activeStage, actorId: writer.actor.id, projectWrite: true, contractSensitiveRead: true, financeManage: false, sourceHandoverId: oldDetail.handoverId, sourceVersion: oldDetail.version, beforeSnapshotId: oldContract.currentSnapshotId, beforePlanVersionId: member.planVersionId });
                if (shot) await shot('01-original-confirmed-writer', writer.page);
            });
            await stage('writer-controlled-amendment', async () => {
                const a = actionsFor(writer.page); expectedTerms = clone(oldReady.candidateTerms); expectedTerms.retentionDueDate = expectedTerms.retentionDueDate?.trim() || null; expectedTerms.receivablePlanSeeds.forEach((n, i) => { n.sortOrder = i; }); expectedTerms.receivablePlanSeeds[0].label = `R4DEF59-${tag}-首节点名称`;
                await a.locator('input[name="amendmentReason"]').fill(reason()); await a.locator('input[name="node-label-0"]').fill(expectedTerms.receivablePlanSeeds[0].label);
                ready = await clickCommand(writer.page, 'writer', 'ContractReadinessController_createContractReadinessPackage', null, a.getByRole('button', { name: '建立变更就绪包', exact: true }), body => {
                    assert.equal(body.projectId, projectId); assert.equal(body.contractId, contractId); assert.equal(body.sourceBaselineId, oldReady.sourceBaselineId); assert.deepEqual(body.candidateTerms, expectedTerms); assert.equal(body.amendment.sourceSnapshotId, oldContract.currentSnapshotId); assert.equal(body.amendment.expectedContractVersion, oldContract.rowVersion); assert.equal(body.amendment.reason, reason());
                });
                uuid(ready.contractAmendmentId); assert.equal(ready.amendmentStatus, 'draft'); assert.equal(ready.sourceContractSnapshotId, oldContract.currentSnapshotId); assert.equal(ready.diffLevel, 'review-required', 'This UI case must exercise exact-item review, never bypass material reapproval'); assert.equal(ready.reviewStatus, 'pending-review'); assert.deepEqual(ready.candidateTerms, expectedTerms); await checkRetainedWriterForm(); if (shot) await shot('02-amendment-ready-diff', writer.page);
            });
            await stage('writer-exact-diff-review', async () => {
                const current = await selectContract(writer.page); assert.equal(current.ready.contractAmendmentId, ready.contractAmendmentId); const items = current.history.diffItems; assert(items.length > 0);
                const a = actionsFor(writer.page); await a.getByLabel('审核或操作意见', { exact: true }).fill(reason());
                for (const item of items) { const label = a.locator('label').filter({ has: writer.page.locator('input[type="checkbox"]') }).filter({ hasText: item.fieldLabel + '：' }); await expect(label).toHaveCount(1); await label.locator('input[type="checkbox"]').check(); }
                await clickCommand(writer.page, 'writer', 'ContractReadinessController_reviewDiff', ready.sourceBaselineId, a.getByRole('button', { name: '记录已逐项核对的本次差异', exact: true }), body => {
                    assert.equal(body.contractId, contractId); assert.equal(body.diffResultId, current.ready.latestDiffResultId); assert.equal(body.diffDecision, 'approved'); assert.deepEqual(sorted(body.reviewedFieldKeys), sorted([...new Set(items.map(i => i.fieldKey))])); assert.equal(body.expectedVersion, current.history.baseline.rowVersion);
                });
                const after = await selectContract(writer.page); ready = after.ready; assert.equal(ready.guardDecision, 'allowed'); assert.notEqual(ready.reviewStatus, 'pending-review'); assert.deepEqual(ready.candidateTerms, expectedTerms); await checkRetainedWriterForm(); record({ stage: activeStage, amendmentId: ready.contractAmendmentId, actualReviewedFieldKeys: sorted([...new Set(items.map(i => i.fieldKey))]) });
            });
            await stage('writer-prepare', async () => {
                const current = await selectContract(writer.page); ready = current.ready;
                prepared = await clickCommand(writer.page, 'writer', 'ContractReadinessController_initializeContractSnapshot', ready.id, actionsFor(writer.page).getByRole('button', { name: '准备精确变更版本', exact: true }), body => { assert.equal(body.contractId, contractId); assert.equal(body.contractAmendmentId, ready.contractAmendmentId); assert.equal(body.expectedVersion, ready.rowVersion); });
                uuid(prepared.preparationId); assert.equal(prepared.snapshotId, null); const after = await selectContract(writer.page); assert.equal(after.contract.currentSnapshotId, oldContract.currentSnapshotId); assert.equal(after.contract.status, 'active'); ready = after.ready; assert.equal(ready.currentPreparation.preparationId, prepared.preparationId); await checkRetainedWriterForm();
            });
            await stage('writer-submit', async () => {
                const current = await selectContract(writer.page); ready = current.ready;
                submitted = await clickCommand(writer.page, 'writer', 'ContractController_submitReview', contractId, actionsFor(writer.page).getByRole('button', { name: '提交正式合同变更审核', exact: true }), body => { assert.equal(body.preparationId, prepared.preparationId); assert.equal(body.contractAmendmentId, ready.contractAmendmentId); assert.equal(body.expectedVersion, current.contract.rowVersion); });
                uuid(submitted.approvalRecordId); const after = await selectContract(writer.page); approval = after.approval; assert.equal(approval.id, submitted.approvalRecordId); assert.equal(approval.currentStatus, 'pending'); assert.equal(after.contract.currentSnapshotId, oldContract.currentSnapshotId); await checkRetainedWriterForm(); if (shot) await shot('03-submitted-old-contract-active', writer.page);
            });
            await stage('actual-current-approver', async () => {
                for (let step = 0; step < 8 && approval.currentStatus === 'pending'; step++) {
                    const key = ['approver', 'full', 'writer', 'personA'].find(k => actors[k]?.id === approval.currentApproverUserId); assert(key, 'Unknown real currentApprover: stop; no guessed substitute');
                    const own = await login(key), current = await selectContract(own.page); assert.equal(current.approval.id, submitted.approvalRecordId); assert.equal(current.approval.currentApproverUserId, own.actor.id); assert.equal(current.approval.currentStatus, 'pending');
                    await actionsFor(own.page).getByLabel('审核或操作意见', { exact: true }).fill(reason());
                    await clickCommand(own.page, key, 'ApprovalController_approveRecord', approval.id, actionsFor(own.page).getByRole('button', { name: '批准本次变更', exact: true }), body => { assert.equal(body.expectedVersion, current.approval.rowVersion); });
                    const after = await selectContract(own.page); approval = after.approval; assert.equal(approval.id, submitted.approvalRecordId); assert.equal(after.contract.currentSnapshotId, oldContract.currentSnapshotId); assert.equal(after.contract.status, 'active'); record({ stage: activeStage, approvalRecordId: approval.id, approverUserId: own.actor.id, actualCurrentApproverMatched: true, step, resultingStatus: approval.currentStatus }); if (shot) await shot(`04-approved-step-${step}`, own.page);
                }
                assert.equal(approval.currentStatus, 'approved', 'Real approval must complete before activation');
            });
            await stage('writer-activate', async () => {
                const current = await selectContract(writer.page); ready = current.ready; assert.equal(current.approval.currentStatus, 'approved'); assert.equal(current.contract.currentSnapshotId, oldContract.currentSnapshotId);
                activated = await clickCommand(writer.page, 'writer', 'ContractController_activate', contractId, actionsFor(writer.page).getByRole('button', { name: '生效新快照与完整回款计划', exact: true }), body => { assert.equal(body.contractAmendmentId, ready.contractAmendmentId); assert.equal(body.approvalRecordId, submitted.approvalRecordId); assert.equal(body.expectedVersion, current.contract.rowVersion); });
                assert.equal(activated.beforeSnapshotId, oldContract.currentSnapshotId); assert.equal(activated.preparationId, prepared.preparationId); assert.equal(activated.approvalRecordId, submitted.approvalRecordId); assert.equal(activated.contractAmendmentId, ready.contractAmendmentId); uuid(activated.planVersionId); uuid(activated.snapshotId); assert.notEqual(activated.snapshotId, oldContract.currentSnapshotId); assert.equal(activated.snapshotVersion, oldContract.currentTermSnapshot.version + 1);
                const after = await selectContract(writer.page); ready = after.ready; assert.equal(after.contract.currentSnapshotId, activated.snapshotId); assert.equal(after.contract.currentTermSnapshot.sourcePreparationId, prepared.preparationId); assert.equal(after.contract.status, 'active'); assert.equal(ready.amendmentStatus, 'effective'); assert.equal(ready.initializedReceivablePlanVersionId, activated.planVersionId); assert.deepEqual(ready.candidateTerms, expectedTerms);
                const refreshed = await reload(writer.page); oldFrozenUnchanged(refreshed.detail); assert.equal(refreshed.detail.sourceChanged, true); await checkRetainedWriterForm(); record({ stage: activeStage, contractId, amendmentId: ready.contractAmendmentId, beforeSnapshotId: oldContract.currentSnapshotId, afterSnapshotId: activated.snapshotId, actualPlanVersionId: activated.planVersionId, snapshotVersion: activated.snapshotVersion }); if (shot) await shot('05-effective-old-material-stale', writer.page);
            });
            await stage('writer-two-affected-items-rebaseline', async () => {
                const current = await selectContract(writer.page); ready = current.ready; assert.equal(ready.amendmentStatus, 'effective'); const original = oldSummary.contractReadiness.find(c => c.contractId === contractId);
                const affected = [['contract', original.snapshotId], ['receivable', original.planVersionId]].map(([type, source]) => { const rows = oldDetail.handoverBasisItems.filter(i => i.itemType === type && i.sourceId === source); assert.equal(rows.length, 1, 'Use original exact source identities, never first two checkboxes'); return rows[0]; });
                const a = actionsFor(writer.page); for (const item of affected) { let label = item.summary; for (const c of oldDetail.effectiveContractSetSummary.contracts) label = label.replaceAll(c.id, () => c.contractNo); const checkbox = a.getByLabel(label, { exact: true }); await expect(checkbox).toHaveCount(1); await checkbox.check(); }
                const source = (await reload(writer.page)).detail; oldFrozenUnchanged(source); assert.equal(source.sourceChanged, true);
                const command = await clickCommand(writer.page, 'writer', 'ProjectHandoverController_rebaselineContractHandover', null, a.getByRole('button', { name: '再基线化并重新发起各人确认', exact: true }), body => { assert.equal(body.sourceHandoverId, oldDetail.handoverId); assert.equal(body.handoverBasisSnapshotId, oldDetail.handoverBasisSnapshotId); assert.equal(body.sourcePayloadHash, oldDetail.sourcePayloadHash); assert.equal(body.expectedVersion, source.rowVersion); assert.equal(body.contractAmendmentId, ready.contractAmendmentId); assert.equal(body.effectiveBaselineAfterId, activated.snapshotId); assert.deepEqual(sorted(body.affectedHandoverItemIds), sorted(affected.map(i => i.id))); });
                assert.equal(command.sourceHandoverId, oldDetail.handoverId); replacement = (await reload(writer.page)).detail; assert.equal(replacement.handoverId, command.replacementHandoverId); assert.equal(replacement.handoverStatus, 'draft'); assert.equal(replacement.version, oldDetail.version + 1); assert.equal(replacement.sourceChanged, false);
                for (const key of ['handoverId', 'summarySnapshotId', 'handoverBasisSnapshotId', 'contractSummarySnapshotId', 'sourcePayloadHash']) assert.notEqual(replacement[key], oldDetail[key]);
                const confirmations = replacement.participantConfirmationSummary; assert.equal(confirmations.status, 'pending'); assert.equal(confirmations.confirmedCount, 0); assert.equal(confirmations.requiredCount, 3); assert.notEqual(confirmations.confirmationRecordId, oldDetail.participantConfirmationSummary.confirmationRecordId); for (const p of confirmations.participants) { assert.equal(p.participantStatus, 'pending'); assert.equal(p.confirmedAt, null); }
                for (const material of replacement.frozenMaterials.contracts) { const old = oldDetail.frozenMaterials.contracts.find(m => m.contractId === material.contractId); assert(old); assert.deepEqual(material.scopeItems, old.scopeItems); assert.deepEqual(material.riskItems, old.riskItems); assert.equal(material.technicalCostPackageId, old.technicalCostPackageId); assert.equal(material.technicalCostVersion, old.technicalCostVersion); assert.equal(material.contractTermSnapshotId, material.contractId === contractId ? activated.snapshotId : old.contractTermSnapshotId); }
                await expect(a).toContainText(/已确认\s*0\/3\s*人/); record({ stage: activeStage, replacementHandoverId: replacement.handoverId, replacementSummarySnapshotId: replacement.summarySnapshotId, replacementBasisSnapshotId: replacement.handoverBasisSnapshotId, affectedItemIds: affected.map(i => i.id), everyPersonInitiallyPending: true, oldConfirmationsInherited: false }); if (shot) await shot('06-rebaseline-zero-of-three', writer.page);
            });
            await stage('full-new-self-confirmation', () => freshSelf('full'));
            await stage('personA-new-self-confirmation', () => freshSelf('personA'));
            await stage('writer-new-self-confirmation', () => freshSelf('writer'));
            await stage('writer-final-R5-blocked', async () => {
                const own = await login('writer'); assert.equal(own.detail.handoverId, replacement.handoverId); assert.equal(own.detail.participantConfirmationSummary.confirmedCount, 3); assert.equal(own.detail.participantConfirmationSummary.status, 'confirmed');
                const final = await clickCommand(own.page, 'writer', 'ProjectHandoverController_confirmProjectHandover', replacement.handoverId, actionsFor(own.page).getByRole('button', { name: '正式确认本次移交事实', exact: true }), body => { assert.equal(body.summarySnapshotId, replacement.summarySnapshotId); assert.equal(body.handoverBasisSnapshotId, replacement.handoverBasisSnapshotId); assert.equal(body.sourcePayloadHash, replacement.sourcePayloadHash); assert.equal(body.contractSummarySnapshotId, replacement.contractSummarySnapshotId); assert.equal(body.expectedVersion, own.detail.rowVersion); });
                assert.equal(final.businessStatusAfter, 'confirmed'); assert.equal(final.closureStatus, 'handover-confirmed-freeze-pending'); assert.equal(final.executionAdmission.allowed, false); assert(final.executionAdmission.blockingReasons.some(r => r.includes('提成角色冻结')));
                const after = (await reload(own.page)).detail; assert.equal(after.handoverId, replacement.handoverId); assert.equal(after.handoverStatus, 'confirmed'); assert.equal(after.sourceChanged, false); assert.equal(after.participantConfirmationSummary.confirmedCount, 3); assert.equal(after.receiptJudgmentModeSummary.status, 'frozen'); assert.equal(after.executionAdmission.allowed, false); await expect(actionsFor(own.page)).toContainText('移交事实已确认。'); await expect(actionsFor(own.page)).toContainText('提成角色冻结'); if (shot) await shot('11-final-confirmed-R5-blocked', own.page);
                record({ stage: activeStage, handoverId: after.handoverId, version: after.version, confirmedCount: 3, closureStatus: after.closureStatus, R5AdmissionAllowed: after.executionAdmission.allowed, actualFinalStatus: final.businessStatusAfter });
            });
            result.complete = result.stages.every(s => s.status === 'passed'); return this.manifest();
        },
    };
}
