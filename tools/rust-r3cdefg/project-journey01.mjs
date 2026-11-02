import assert from 'node:assert/strict';

// Definition only. Root owns real login, producer API calls, all execution,
// evidence storage, screenshots and browser/environment cleanup.
// No route interception, mock response, API helper or component-state access.
// Original sources (same frozen Native/admin tree):
// - project-technical-cost-workspace.ts:42-249 (read-only template and load)
// - project-bid-commercial-workspace.ts:148-465,529-598,884-1014
// - project-pricing-margin-workspace.ts:155-447,497-563,941-1094
//   under apps/poms-admin/src/app/features/project/.
// - libs/admin/data-access/src/lib/project/project-workspace.store.ts:403-533
// - apps/poms-admin/src/app.routes.ts:72-125
// - apps/poms-admin-e2e/src/project-workspace.journey.spec.ts:607-645
//   supplies selector context only; its mockBidPricingWriteFlow is NOT reused.
// - libs/shared/contracts/src/lib/shared-contracts.ts:4856-4903,5067-5095
// - apps/poms-api/src/app/features/project/project.controller.ts:138-165,288-306
// The real second-version500/currentV1-retained behavior is frozen by the joint
// R3CDEFG G1, rather than the original UI's optimistic replacement description.

/**
 * Root invokes this once per actual platform/backend cell with fresh fixtures.
 * ctx = {
 *   baseUrl, label,
 *   ids: { costProject, bidProject, pricingProject, costPackage, bidProcess? },
 *   observe(label, value),   // sync or async, JSON-safe evidence sink
 *   row(table, id)          // async actual DB read: row object or one-row array
 * }
 * costPackage is pricingProject's real current cost producer ID. costProject's
 * separate read-only package ID is taken from its actual workspace response.
 * Root has already logged in with real project:read/project:write permissions.
 */
export async function projectJourney(page, ctx) {
    const { baseUrl, label, ids } = ctx;
    const timeout = 45_000;
    const tag = String(label).replace(/\s+/gu, '-').slice(0, 32);
    const apiPath = (id, leaf) => `/api/projects/${encodeURIComponent(id)}/${leaf}`;
    const uiUrl = (id, leaf) => new URL(`/projects/${encodeURIComponent(id)}/workspace/${leaf}`, baseUrl).href;
    const record = (name, value) => ctx.observe(`${label}.${name}`, value);

    // Every waiter settles before this helper returns OR throws. In particular,
    // a failed click/goto cannot leave a detached response promise behind.
    async function capture(name, specs, action) {
        const waiters = specs.map(({ method, path }) => page.waitForResponse(
            (response) => response.request().method() === method
                && new URL(response.url()).pathname === path,
            { timeout }
        ));
        const settled = await Promise.allSettled([
            ...waiters,
            Promise.resolve().then(action)
        ]);
        const output = [];
        for (let index = 0; index < specs.length; index += 1) {
            const result = settled[index];
            if (result.status === 'rejected') {
                await record(`${name}.${specs[index].name}.waiter`, {
                    outcome: 'rejected', message: String(result.reason?.message ?? result.reason)
                });
                continue;
            }
            const response = result.value;
            const bodyText = await response.text();
            let body;
            try {
                body = JSON.parse(bodyText);
            } catch {
                body = { unparsedText: bodyText };
            }
            const request = response.request();
            const value = {
                url: response.url(), method: request.method(), status: response.status(),
                bodyText, body,
                requestBody: request.method() === 'POST' ? request.postDataJSON() : null
            };
            output[index] = value;
            await record(`${name}.${specs[index].name}.HTTP`, value);
        }
        const rejected = settled.find((result) => result.status === 'rejected');
        if (rejected) {
            throw rejected.reason;
        }
        return output;
    }

    async function readRow(name, table, id) {
        const raw = await ctx.row(table, id);
        await record(`${name}.DB`, { table, id, row: raw });
        let value = raw;
        if (Array.isArray(raw)) {
            assert.equal(raw.length, 1, `${name}: expected one actual DB row`);
            [value] = raw;
        }
        assert.ok(value && typeof value === 'object', `${name}: actual DB row missing`);
        assert.equal(value.id, id, `${name}: actual DB row ID differs`);
        return structuredClone(value);
    }

    async function visible(locator) {
        await locator.first().waitFor({ state: 'visible', timeout });
    }

    async function select(dialog, selector, optionLabel) {
        await dialog.locator(selector).click();
        await page.getByRole('option', { name: optionLabel, exact: true }).click();
    }

    function getSpec(id, leaf, name) {
        return { method: 'GET', path: apiPath(id, leaf), name };
    }

    function postSpec(id, leaf) {
        return { method: 'POST', path: apiPath(id, leaf), name: 'post' };
    }

    function assertCurrent(value, id, projectId) {
        assert.equal(value.id, id);
        assert.equal(value.projectId, projectId);
        assert.equal(value.version, 1);
        assert.equal(value.isCurrent, true);
        assert.equal(value.status, 'effective');
    }

    // 1. The original technical-cost page has no create/edit form. Its source
    // does not import FormsModule/ButtonModule/DialogModule or post a package.
    const [costLoad] = await capture('cost.initial', [
        getSpec(ids.costProject, 'technical-cost-workspace', 'workspace')
    ], () => page.goto(uiUrl(ids.costProject, 'technical-cost'), { timeout }));
    assert.equal(costLoad.status, 200);
    assert.equal(costLoad.body.projectId, ids.costProject);
    assert.ok(costLoad.body.currentPackage?.id, 'Root must supply a real cost producer');
    const costRoot = page.locator('app-project-technical-cost-workspace');
    await visible(costRoot.getByRole('heading', { name: '技术与成本', exact: true }));
    await visible(costRoot.getByText(costLoad.body.currentPackage.technicalConclusionSummary, { exact: true }));
    if (costLoad.body.costItems.length > 0) {
        await visible(costRoot.getByText(costLoad.body.costItems[0].costDescription, { exact: true }));
    }
    assert.equal(await costRoot.locator('form').count(), 0);
    assert.equal(await costRoot.getByRole('textbox').count(), 0);
    assert.equal(await costRoot.getByRole('button', { name: /创建|新增|编辑|保存/u }).count(), 0);
    await record('cost.readonly.DOM', {
        packageId: costLoad.body.currentPackage.id,
        headingVisible: true, conclusionVisible: true,
        formCount: 0, textboxCount: 0, createEditSaveButtonCount: 0,
        responseCostItems: costLoad.body.costItems.length,
        renderedTableRows: await costRoot.locator('tbody tr').count()
    });
    const costReadOnlyBefore = await readRow(
        'cost.readonly.before', 'project_technical_cost_package', costLoad.body.currentPackage.id
    );

    // 2. Real first-version bid create through the original dialog, including
    // one material and one timeline child. Defaults keep public-tender/pending;
    // normal p-select clicks choose participate/ready/done, without state writes.
    const bidSpecs = [
        getSpec(ids.bidProject, 'bid-commercial-workspace', 'workspace'),
        getSpec(ids.bidProject, 'bid-commercial-processes', 'history')
    ];
    const [bidInitial, bidInitialHistory] = await capture(
        'bid.initial', bidSpecs, () => page.goto(uiUrl(ids.bidProject, 'bid-commercial'), { timeout })
    );
    assert.equal(bidInitial.status, 200);
    assert.equal(bidInitialHistory.status, 200);
    assert.equal(bidInitial.body.currentProcess, null, 'Root must provide no existing bid');
    assert.deepEqual(bidInitialHistory.body, []);
    const bidRoot = page.locator('app-project-bid-commercial-workspace');
    await visible(bidRoot.getByRole('heading', { name: '招投标 / 商务竞标', exact: true }));
    await bidRoot.getByRole('button', { name: '创建竞标过程', exact: false }).click();
    const bidCreate = page.getByRole('dialog', { name: '创建竞标过程', exact: true });
    await visible(bidCreate);
    const tenderFirst = `${tag}-T1`;
    const bidSummaryFirst = `${tag} first bid through original UI`;
    const materialLabel = `${tag} material`;
    const timelineLabel = `${tag} event`;
    await select(bidCreate, '#bidDecision', '参与');
    await bidCreate.locator('#tenderNo').fill(tenderFirst);
    await bidCreate.locator('#bidPackageNo').fill(`${tag}-PKG1`);
    await bidCreate.locator('#bidOwnerRole').fill(`${tag} bid owner`);
    await bidCreate.locator('#bidProcessSummary').fill(bidSummaryFirst);
    await bidCreate.locator('#bidDecisionSummary').fill(`${tag} participate`);
    await bidCreate.getByRole('button', { name: '新增材料项', exact: false }).click();
    await bidCreate.locator('#materialKey0').fill(`${tag}-material`);
    await bidCreate.locator('#materialLabel0').fill(materialLabel);
    await select(bidCreate, '#materialStatus0', '已齐备');
    await bidCreate.locator('#materialRole0').fill(`${tag} material owner`);
    await bidCreate.locator('#materialDueAt0').fill('2026-11-03T08:00:00.123Z');
    await bidCreate.locator('#materialHint0').fill(`/projects/${ids.bidProject}/workspace/bid-commercial`);
    await bidCreate.getByRole('button', { name: '新增节点', exact: false }).click();
    await bidCreate.locator('#timelineKey0').fill(`${tag}-event`);
    await bidCreate.locator('#timelineLabel0').fill(timelineLabel);
    await select(bidCreate, '#timelineStatus0', '已完成');
    await bidCreate.locator('#timelineOccurredAt0').fill('2026-11-02T02:00:00.456Z');
    await bidCreate.locator('#timelineDueAt0').fill('2026-11-03T03:00:00.000Z');
    await bidCreate.locator('#timelineRole0').fill(`${tag} event owner`);
    await bidCreate.locator('#timelineSummary0').fill(`${tag} timeline through original UI`);
    const [bidFirst, bidWorkspace, bidHistory] = await capture('bid.first', [
        postSpec(ids.bidProject, 'bid-commercial-processes'), ...bidSpecs
    ], () => bidCreate.getByRole('button', { name: '保存为当前版本', exact: false }).click({ timeout }));
    assert.equal(bidFirst.status, 201);
    assert.equal(bidWorkspace.status, 200);
    assert.equal(bidHistory.status, 200);
    assertCurrent(bidFirst.body, bidFirst.body.id, ids.bidProject);
    assertCurrent(bidWorkspace.body.currentProcess, bidFirst.body.id, ids.bidProject);
    assert.equal(bidHistory.body.length, 1);
    assert.equal(bidFirst.requestBody.decision, 'participate');
    assert.equal(bidFirst.requestBody.materialItems[0].materialStatus, 'ready');
    assert.equal(bidFirst.requestBody.timelineItems[0].timelineStatus, 'done');
    assert.equal(bidWorkspace.body.materialItems.length, 1);
    assert.equal(bidWorkspace.body.timelineItems.length, 1);
    await bidCreate.waitFor({ state: 'hidden', timeout });
    await visible(bidRoot.getByRole('heading', { name: '当前竞标过程', exact: true }));
    await visible(bidRoot.getByText(tenderFirst, { exact: true }));
    await visible(bidRoot.getByText(bidSummaryFirst, { exact: true }));
    await visible(bidRoot.getByText(materialLabel, { exact: true }));
    await visible(bidRoot.getByText(timelineLabel, { exact: true }));
    const bidBefore = await readRow('bid.first.parent', 'project_bid_commercial_process', bidFirst.body.id);
    assert.equal(bidBefore.project_id, ids.bidProject);
    assert.equal(bidBefore.process_summary, bidSummaryFirst);
    assert.equal(bidBefore.tender_no, tenderFirst);
    const materialId = bidWorkspace.body.materialItems[0].id;
    const timelineId = bidWorkspace.body.timelineItems[0].id;
    const materialBefore = await readRow('bid.first.material', 'project_bid_commercial_material_item', materialId);
    const timelineBefore = await readRow('bid.first.timeline', 'project_bid_commercial_timeline_item', timelineId);
    assert.equal(materialBefore.process_id, bidFirst.body.id);
    assert.equal(materialBefore.label, materialLabel);
    assert.equal(materialBefore.material_status, 'ready');
    assert.equal(timelineBefore.process_id, bidFirst.body.id);
    assert.equal(timelineBefore.label, timelineLabel);
    assert.equal(timelineBefore.timeline_status, 'done');

    await bidRoot.getByRole('button', { name: '编辑当前过程', exact: false }).click();
    const bidEdit = page.getByRole('dialog', { name: '编辑竞标过程', exact: true });
    await visible(bidEdit);
    const tenderAttempt = `${tag}-T2-REJECTED`;
    await bidEdit.locator('#tenderNo').fill(tenderAttempt);
    await bidEdit.locator('#bidProcessSummary').fill(`${tag} second bid must retain V1`);
    const [bidSecond] = await capture('bid.second', [
        postSpec(ids.bidProject, 'bid-commercial-processes')
    ], () => bidEdit.getByRole('button', { name: '保存为当前版本', exact: false }).click({ timeout }));
    assert.equal(bidSecond.status, 500);
    assert.equal(bidSecond.body.message, 'Internal server error');
    await visible(bidRoot.getByText('招投标 / 商务竞标暂不可用', { exact: true }));
    await visible(bidEdit);
    await record('bid.second.error.DOM', { backendStatus: 500, errorFeedbackVisible: true, dialogStillVisible: true });
    const bidAfter = await readRow('bid.second.parent', 'project_bid_commercial_process', bidFirst.body.id);
    const materialAfter = await readRow('bid.second.material', 'project_bid_commercial_material_item', materialId);
    const timelineAfter = await readRow('bid.second.timeline', 'project_bid_commercial_timeline_item', timelineId);
    assert.deepEqual(bidAfter, bidBefore);
    assert.deepEqual(materialAfter, materialBefore);
    assert.deepEqual(timelineAfter, timelineBefore);
    await bidEdit.getByRole('button', { name: '取消', exact: false }).click();
    const [bidReload, bidReloadHistory] = await capture(
        'bid.after500.reload', bidSpecs, () => page.goto(uiUrl(ids.bidProject, 'bid-commercial'), { timeout })
    );
    assert.equal(bidReload.status, 200);
    assert.equal(bidReloadHistory.status, 200);
    assertCurrent(bidReload.body.currentProcess, bidFirst.body.id, ids.bidProject);
    assert.equal(bidReload.body.currentProcess.tenderNo, tenderFirst);
    assert.equal(bidReloadHistory.body.length, 1);
    await visible(bidRoot.getByText(tenderFirst, { exact: true }));
    assert.equal(await bidRoot.getByText(tenderAttempt, { exact: true }).count(), 0);
    await record('bid.after500.DOM', { currentId: bidFirst.body.id, originalTenderVisible: true, attemptedTenderCount: 0 });

    // 3. Pricing's readonly IDs come from Root's real current cost and suitable
    // bid producers. The original pending decision needs no approval baseline.
    const pricingSpecs = [
        getSpec(ids.pricingProject, 'pricing-margin-workspace', 'workspace'),
        getSpec(ids.pricingProject, 'pricing-margin-reviews', 'history')
    ];
    const [pricingInitial, pricingInitialHistory] = await capture(
        'pricing.initial', pricingSpecs, () => page.goto(uiUrl(ids.pricingProject, 'pricing-margin'), { timeout })
    );
    assert.equal(pricingInitial.status, 200);
    assert.equal(pricingInitialHistory.status, 200);
    assert.equal(pricingInitial.body.currentReview, null, 'Root must provide no existing pricing review');
    assert.deepEqual(pricingInitialHistory.body, []);
    assert.equal(pricingInitial.body.technicalCostPackage.id, ids.costPackage);
    assert.ok(pricingInitial.body.bidCommercialProcess?.id, 'Root must supply a suitable real bid producer');
    const pricingBidId = pricingInitial.body.bidCommercialProcess.id;
    if (ids.bidProcess) assert.equal(pricingBidId, ids.bidProcess);
    const pricingCostBefore = await readRow('pricing.upstream.cost.before', 'project_technical_cost_package', ids.costPackage);
    const pricingBidBefore = await readRow('pricing.upstream.bid.before', 'project_bid_commercial_process', pricingBidId);
    const pricingRoot = page.locator('app-project-pricing-margin-workspace');
    await visible(pricingRoot.getByRole('heading', { name: '报价与毛利评审', exact: true }));
    await pricingRoot.getByRole('button', { name: '创建报价评审', exact: false }).click();
    const pricingCreate = page.getByRole('dialog', { name: '创建报价评审', exact: true });
    await visible(pricingCreate);
    assert.equal(await pricingCreate.locator('#technicalCostPackageId').inputValue(), ids.costPackage);
    assert.equal(await pricingCreate.locator('#bidCommercialProcessId').inputValue(), pricingBidId);
    assert.notEqual(await pricingCreate.locator('#technicalCostPackageId').getAttribute('readonly'), null);
    assert.notEqual(await pricingCreate.locator('#bidCommercialProcessId').getAttribute('readonly'), null);
    assert.equal(await pricingCreate.locator('#pricingCurrency').inputValue(), pricingInitial.body.technicalCostPackage.currencyCode);
    const quoteFirst = `${tag}-Q1`;
    const pricingDecisionFirst = `${tag} pending pricing review through original UI`;
    await pricingCreate.locator('#quoteVersion').fill(quoteFirst);
    await pricingCreate.locator('#quoteTaxInclusive').fill('120.00');
    await pricingCreate.locator('#quoteTaxExclusive').fill('100.00');
    await pricingCreate.locator('#taxRate').fill('0.2000');
    await pricingCreate.locator('#taxConditionSummary').fill(`${tag} tax conditions`);
    await pricingCreate.locator('#paymentTermsSummary').fill(`${tag} payment terms`);
    await pricingCreate.locator('#grossMarginSummary').fill(`${tag} gross margin pending review`);
    await pricingCreate.locator('#decisionSummary').fill(pricingDecisionFirst);
    const [pricingFirst, pricingWorkspace, pricingHistory] = await capture('pricing.first', [
        postSpec(ids.pricingProject, 'pricing-margin-reviews'), ...pricingSpecs
    ], () => pricingCreate.getByRole('button', { name: '保存为当前版本', exact: false }).click({ timeout }));
    assert.equal(pricingFirst.status, 201);
    assert.equal(pricingWorkspace.status, 200);
    assert.equal(pricingHistory.status, 200);
    assertCurrent(pricingFirst.body, pricingFirst.body.id, ids.pricingProject);
    assertCurrent(pricingWorkspace.body.currentReview, pricingFirst.body.id, ids.pricingProject);
    assert.equal(pricingHistory.body.length, 1);
    assert.equal(pricingFirst.requestBody.technicalCostPackageId, ids.costPackage);
    assert.equal(pricingFirst.requestBody.bidCommercialProcessId, pricingBidId);
    assert.equal(pricingFirst.requestBody.pricingPath, 'bid');
    assert.equal(pricingFirst.requestBody.decision, 'pending');
    assert.equal(pricingFirst.body.technicalCostPackageId, ids.costPackage);
    assert.equal(pricingFirst.body.bidCommercialProcessId, pricingBidId);
    assert.equal(pricingWorkspace.body.technicalCostPackage.id, ids.costPackage);
    assert.equal(pricingWorkspace.body.bidCommercialProcess.id, pricingBidId);
    await pricingCreate.waitFor({ state: 'hidden', timeout });
    await visible(pricingRoot.getByRole('heading', { name: '当前报价评审', exact: true }));
    await visible(pricingRoot.locator('app-workspace-command-panel').getByText(quoteFirst, { exact: true }));
    await visible(pricingRoot.getByText(pricingDecisionFirst, { exact: true }));
    const pricingBefore = await readRow('pricing.first.parent', 'project_pricing_margin_review', pricingFirst.body.id);
    assert.equal(pricingBefore.project_id, ids.pricingProject);
    assert.equal(pricingBefore.technical_cost_package_id, ids.costPackage);
    assert.equal(pricingBefore.bid_commercial_process_id, pricingBidId);
    assert.equal(pricingBefore.quote_version, quoteFirst);
    assert.equal(pricingBefore.decision, 'pending');

    await pricingRoot.getByRole('button', { name: '编辑当前评审', exact: false }).click();
    const pricingEdit = page.getByRole('dialog', { name: '编辑报价评审', exact: true });
    await visible(pricingEdit);
    const quoteAttempt = `${tag}-Q2-REJECTED`;
    await pricingEdit.locator('#quoteVersion').fill(quoteAttempt);
    await pricingEdit.locator('#decisionSummary').fill(`${tag} second pricing must retain V1`);
    const [pricingSecond] = await capture('pricing.second', [
        postSpec(ids.pricingProject, 'pricing-margin-reviews')
    ], () => pricingEdit.getByRole('button', { name: '保存为当前版本', exact: false }).click({ timeout }));
    assert.equal(pricingSecond.status, 500);
    assert.equal(pricingSecond.body.message, 'Internal server error');
    await visible(pricingRoot.getByText('报价与毛利评审暂不可用', { exact: true }));
    await visible(pricingEdit);
    await record('pricing.second.error.DOM', { backendStatus: 500, errorFeedbackVisible: true, dialogStillVisible: true });
    const pricingAfter = await readRow('pricing.second.parent', 'project_pricing_margin_review', pricingFirst.body.id);
    assert.deepEqual(pricingAfter, pricingBefore);
    await pricingEdit.getByRole('button', { name: '取消', exact: false }).click();
    const [pricingReload, pricingReloadHistory] = await capture(
        'pricing.after500.reload', pricingSpecs, () => page.goto(uiUrl(ids.pricingProject, 'pricing-margin'), { timeout })
    );
    assert.equal(pricingReload.status, 200);
    assert.equal(pricingReloadHistory.status, 200);
    assertCurrent(pricingReload.body.currentReview, pricingFirst.body.id, ids.pricingProject);
    assert.equal(pricingReload.body.currentReview.quoteVersion, quoteFirst);
    assert.equal(pricingReloadHistory.body.length, 1);
    await visible(pricingRoot.locator('app-workspace-command-panel').getByText(quoteFirst, { exact: true }));
    assert.equal(await pricingRoot.getByText(quoteAttempt, { exact: true }).count(), 0);
    await record('pricing.after500.DOM', { currentId: pricingFirst.body.id, originalQuoteVisible: true, attemptedQuoteCount: 0 });

    const pricingCostAfter = await readRow('pricing.upstream.cost.after', 'project_technical_cost_package', ids.costPackage);
    const pricingBidAfter = await readRow('pricing.upstream.bid.after', 'project_bid_commercial_process', pricingBidId);
    const costReadOnlyAfter = await readRow('cost.readonly.after', 'project_technical_cost_package', costLoad.body.currentPackage.id);
    assert.deepEqual(pricingCostAfter, pricingCostBefore);
    assert.deepEqual(pricingBidAfter, pricingBidBefore);
    assert.deepEqual(costReadOnlyAfter, costReadOnlyBefore);
    await record('projectJourney.complete', {
        costReadOnlyId: costLoad.body.currentPackage.id,
        bidId: bidFirst.body.id, bidFirstStatus: bidFirst.status,
        bidSecondStatus: bidSecond.status,
        pricingId: pricingFirst.body.id, pricingFirstStatus: pricingFirst.status,
        pricingSecondStatus: pricingSecond.status,
        pricingCostId: ids.costPackage, pricingBidId,
        originalBidAndPricingRowsUnchangedAfter500: true,
        upstreamRowsUnchanged: true,
        allResponseWaitersSettled: true
    });
}
