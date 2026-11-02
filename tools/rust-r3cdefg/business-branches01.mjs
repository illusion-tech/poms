/**
 * Pure additional business-branch definitions. NOT executed by this author.
 * Root copies these bytes to tools/rust-r3cdefg/business-branches01.mjs; imports
 * are relative to that formal location. No schema/runtime/host setup is here.
 *
 * Root prepared interfaces, restricted to this run's owned facts and real DDL:
 * setProjectFacts(projectId,{stage?,status?}) changes only poms.project's
 * current_stage/status to existing enum values, never schema/constraints.
 * prepareHistory(kind,inputId), kind cost|bid, returns {currentId,historicalId}:
 *   historicalId MUST equal inputId from actual HTTP V1. Preserve its children,
 *   change is_current=false/status=superseded; clone a new parent with new UUID,
 *   same project_id, version+1,is_current=true,status=effective,supersedes_id=old.
 *   Copy all other required original columns; clone children with fresh UUIDs
 *   and the new parent FK. Cost tables: project_technical_cost_package plus
 *   project_technical_{scope,risk,cost}_item(package_id). Bid tables:
 *   project_bid_commercial_process plus project_bid_commercial_material_item /
 *   project_bid_commercial_timeline_item(process_id). Original unique/self-FK/
 *   child-FK rules stay enabled. This legal UPDATE-before-INSERT graph is an
 *   explicitly PREPARED read fixture, never HTTP replacement success.
 * preparePricingReferences(projectId) returns two existing FK IDs:
 *   commercialReleaseBaselineId,summarySnapshotId. Minimum inserted graph:
 *   poms.commercial_release_baseline(project_id=owned project,baseline_code<=64
 *     unique per project); original id,baseline_status='effective',is_current,
 *     row_version and timestamp defaults apply; nullable columns may be null.
 *   poms.approval_summary_package_definition(approval_scenario_key<=128,
 *     summary_package_key<=64,projection_level<=32,export_policy<=32,
 *     field_rule_version<=64), original id/status/timestamps/version defaults;
 *     its (approval_scenario_key,summary_package_key) pair is globally unique.
 *     Root may reuse one owned prepared definition across these snapshots.
 *   poms.approval_summary_snapshot(target_type='project',target_id=owned project,
 *     approval_scenario_key,summary_package_id=the real definition FK,
 *     summary_package_key,projection_level,export_policy,
 *     business_status_at_snapshot); original id/generated_at/status/timestamps/
 *     version defaults apply; nullable fields may be null. Respect its active
 *     target/scenario/projection unique index. No approval instance or field
 *     projection is required by pricing's id-level FKs. These are PREPARED
 *     references, never approval-handler delivery or validation of their text.
 * ctx.row/select must also allow the three reference tables above. Nil UUID
 * negative FK cases first read that exact target table and require no row.
 *
 * Authoritative original sources:
 * project.service.ts:478-555,557-765,768-849; project-query.service.ts:396-593,
 * 1013-1066,1080-1150,1162-1197; project.repository.ts current/by-id/child reads;
 * shared-contracts.ts:4622-4683,4856-4982,5050-5095, all under frozen Native.
 * Reference DDL/mappings: Migration20260405113000_init_contract_readiness_chain,
 * Migration20260415100000_ex08a2_approval_summary_snapshot,
 * Migration20260424203000_ex28_project_pricing_margin_review;
 * features/contract-readiness/commercial-release-baseline.entity.ts:9-58;
 * features/approval-summary/approval-summary.entity.ts:8-97.
 */
import assert from 'node:assert/strict';
import {
    buildCostRequest, buildBidPricingRequest,
} from '../../docs/design/rust-r3cdefg/input-a/native-fixture-draft01.mjs';
import {
    bidCommercialRequestWithChildren,
} from '../../docs/design/rust-r3cdefg/input-b/native-fixture-draft01.mjs';

export async function businessBranches(ctx) {
    const kinds = {
        cost: { table: 'project_technical_cost_package', collection: 'technical-cost-packages', workspace: 'technical-cost-workspace', current: 'currentPackage' },
        bid: { table: 'project_bid_commercial_process', collection: 'bid-commercial-processes', workspace: 'bid-commercial-workspace', current: 'currentProcess' },
        pricing: { table: 'project_pricing_margin_review', collection: 'pricing-margin-reviews', workspace: 'pricing-margin-workspace', current: 'currentReview' },
    };
    const path = (projectId, leaf) => `/api/projects/${projectId}/${leaf}`;
    const label = (name) => `B.branches.${name}`;
    let representativeCases = 0;
    const observe = async (name, value) => {
        representativeCases += 1;
        await ctx.observe(label(name), value);
    };
    const rows = (kind, projectId) => ctx.select(kinds[kind].table, { project_id: projectId });
    const sorted = (values) => [...values].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const post = (kind, name, projectId, body, status = 201) => ctx.step(
        label(`${name}.post`), 'POST', path(projectId, kinds[kind].collection), { json: body }, status
    );
    const workspace = (kind, name, projectId) => ctx.step(
        label(`${name}.workspace`), 'GET', path(projectId, kinds[kind].workspace), {}, 200
    );
    const list = (kind, name, projectId) => ctx.step(
        label(`${name}.list`), 'GET', path(projectId, kinds[kind].collection), {}, 200
    );
    const project = (name) => ctx.project(label(name));
    const bidBody = (name, patch = {}) => ({
        ...bidCommercialRequestWithChildren(name, 'publicTender'),
        materialItems: [], timelineItems: [], ...patch,
    });
    const material = (name, status, blocks, sortOrder) => ({
        materialKey: name, label: name, materialStatus: status,
        blocksNextStep: blocks, sortOrder,
    });
    const risk = (name, patch = {}) => ({
        ...buildCostRequest().riskItems[0], riskCategory: name,
        riskDescription: `${name} description`, ...patch,
    });
    const bidNext = {
        blocked: '先处理竞标决策、结果或材料阻断，再进入报价与毛利评审。',
        notRequired: '投标路径不适用，可以直接进入报价与毛利评审。',
        direct: '沿直接商务路径进入报价与毛利评审，并保留本过程作为商务依据。',
        won: '将中标 / 竞标结果带入报价与毛利评审或签约就绪判断。',
        generic: '补齐竞标过程依据，准备进入报价与毛利评审。',
    };
    const bidReason = {
        pending: '尚未完成是否参与竞标 / 商务竞标的决策。',
        noBid: '当前已决策不参与本次竞标，需要明确是否转入直接商务路径或关闭推进。',
        result: '当前竞标结果不能直接进入报价与签约承接。',
    };
    const costNext = {
        advance: '进入商务收口前，保持当前版本包作为报价和签约前判断依据。',
        tax: '先完成税务成本复核，再判断是否进入商务收口。',
        blocked: '先关闭阻塞风险或更新版本包，再进入商务收口。',
    };
    const costReason = {
        allow: '技术与成本版本包尚未允许进入下一阶段。',
        tax: '税务成本假设仍待复核。',
    };
    const pricingNext = {
        blocked: '先处理报价结论、升级审批或条件放行阻断，再进入签约就绪。',
        ready: '可以将当前商业放行基线和摘要快照带入签约就绪。',
        prerequisites: '先补齐技术成本、税务复核或商务路径依据，再发起报价与毛利评审。',
        empty: '基于当前技术成本和商务路径，形成报价、税务条件、回款条件与毛利评审结论。',
    };
    const pricingReason = {
        pending: '报价与毛利评审尚未形成放行结论。',
        rejected: '报价与毛利评审已被否决，需要回到技术、成本或商务条件重新收口。',
        escalation: '当前报价与毛利评审需要升级审批，暂不能进入签约就绪。',
        empty: '尚未形成报价与毛利评审记录。',
        missingCost: '尚未形成可引用的技术与成本版本包。',
        allow: '当前技术与成本版本包尚未允许进入报价评审。',
        tax: '当前技术与成本版本包的税务成本仍待复核。',
        bid: '当前竞标 / 商务过程结果不能直接支撑报价评审。',
    };
    const sixReferenceError = 'released, conditional-release and escalation-required decisions require commercial baseline and approval summary references';

    function current(actual, id, projectId) {
        assert.equal(actual.id, id);
        assert.equal(actual.projectId, projectId);
        assert.equal(actual.isCurrent, true);
        assert.equal(actual.status, 'effective');
    }

    async function bidCase(name, patch, expected) {
        const p = await project(name);
        const request = bidBody(name, patch);
        const created = await post('bid', name, p.id, request);
        const ws = await workspace('bid', name, p.id);
        const stored = await ctx.row(kinds.bid.table, created.body.id);
        current(ws.body.currentProcess, created.body.id, p.id);
        assert.equal(created.body.blockerCount, expected.count);
        assert.equal(stored.blocker_count, expected.count);
        assert.deepEqual(ws.body.blockingReasons, expected.reasons);
        assert.equal(ws.body.nextStep, expected.next);
        assert.equal(ws.body.materialItems.length, request.materialItems.length);
        assert.equal(ws.body.timelineItems.length, request.timelineItems.length);
        await observe(name, { request, created, workspace: ws, stored, expected });
    }

    // 13 bid representatives: no-current, the third path rule, ten priority /
    // decision/result/material truth-table representatives, then legal history.
    {
        const name = 'bid.no-current';
        const p = await project(name);
        const ws = await workspace('bid', name, p.id);
        const history = await list('bid', name, p.id);
        assert.equal(ws.body.currentProcess, null);
        assert.deepEqual(ws.body.materialItems, []);
        assert.deepEqual(ws.body.timelineItems, []);
        assert.deepEqual(ws.body.blockingReasons, ['尚未形成招投标 / 商务竞标过程记录。']);
        assert.equal(ws.body.nextStep, '明确是否需要投标、邀标、比选、商务竞标或直接商务报价路径。');
        assert.deepEqual(history.body, []);
        await observe(name, { workspace: ws, history, stored: await rows('bid', p.id) });
    }
    {
        const name = 'bid.third-path-rule';
        const p = await project(name);
        const request = bidBody(name, { decision: 'participate', resultStatus: 'not-applicable' });
        const rejected = await post('bid', name, p.id, request, 400);
        assert.equal(rejected.body.message, 'not-applicable resultStatus requires not-required bidMode');
        assert.deepEqual(await rows('bid', p.id), []);
        const ws = await workspace('bid', name, p.id);
        assert.equal(ws.body.currentProcess, null);
        await observe(name, { request, rejected, workspace: ws, stored: await rows('bid', p.id) });
    }
    const bidCases = [
        ['bid.reason-order', {
            decision: 'pending', resultStatus: 'lost', bidMode: 'direct-commercial',
            materialItems: [material('second', 'in-progress', true, 2), material('first', 'missing', true, 1)],
        }, { count: 4, reasons: [bidReason.pending, bidReason.result, 'first：材料缺失', 'second：材料仍在处理中'], next: bidNext.blocked }],
        ['bid.no-bid-cancelled', {
            decision: 'no-bid', resultStatus: 'cancelled',
            materialItems: [material('ready', 'ready', true, 1), material('na', 'not-required', true, 2)],
        }, { count: 2, reasons: [bidReason.noBid, bidReason.result], next: bidNext.blocked }],
        ['bid.material-four-status-two-flags', {
            decision: 'participate', resultStatus: 'pending',
            materialItems: ['missing', 'in-progress', 'ready', 'not-required'].flatMap((status, index) => [
                material(`${status}-false`, status, false, index * 2 + 1),
                material(`${status}-true`, status, true, index * 2 + 2),
            ]),
        }, { count: 2, reasons: ['missing-true：材料缺失', 'in-progress-true：材料仍在处理中'], next: bidNext.blocked }],
        ['bid.won-with-nonblocking-materials', {
            decision: 'participate', resultStatus: 'won',
            materialItems: [material('ready', 'ready', true, 1), material('unflagged', 'in-progress', false, 2)],
        }, { count: 0, reasons: [], next: bidNext.won }],
        ['bid.not-required-but-material-blocked', {
            bidMode: 'not-required', decision: 'not-required', resultStatus: 'not-applicable',
            materialItems: [material('required-document', 'missing', true, 1)],
        }, { count: 1, reasons: ['required-document：材料缺失'], next: bidNext.blocked }],
        ['bid.not-required-clear', {
            bidMode: 'not-required', decision: 'not-required', resultStatus: 'not-applicable',
            materialItems: [material('na', 'not-required', true, 1)],
        }, { count: 0, reasons: [], next: bidNext.notRequired }],
        ['bid.direct-before-won', {
            bidMode: 'direct-commercial', decision: 'participate', resultStatus: 'won',
        }, { count: 0, reasons: [], next: bidNext.direct }],
        ['bid.pending-decision-before-generic', {
            decision: 'pending', resultStatus: 'pending', materialItems: [material('ready', 'ready', true, 1)],
        }, { count: 1, reasons: [bidReason.pending], next: bidNext.blocked }],
        ['bid.negative-result-with-na-material', {
            decision: 'participate', resultStatus: 'cancelled', materialItems: [material('na', 'not-required', true, 1)],
        }, { count: 1, reasons: [bidReason.result], next: bidNext.blocked }],
        ['bid.generic-pending-result-without-blockers', {
            decision: 'participate', resultStatus: 'pending',
            materialItems: [material('unflagged-missing', 'missing', false, 1), material('ready', 'ready', true, 2)],
        }, { count: 0, reasons: [], next: bidNext.generic }],
    ];
    for (const [name, patch, expected] of bidCases) await bidCase(name, patch, expected);
    {
        const name = 'bid.prepared-history-and-no-current';
        const p = await project(name);
        const request = bidCommercialRequestWithChildren(name, 'publicTender');
        const produced = await post('bid', name, p.id, request);
        const oldMaterials = sorted(await ctx.select('project_bid_commercial_material_item', { process_id: produced.body.id }));
        const oldTimelines = sorted(await ctx.select('project_bid_commercial_timeline_item', { process_id: produced.body.id }));
        const prepared = await ctx.prepareHistory('bid', produced.body.id);
        assert.equal(prepared.historicalId, produced.body.id);
        const before = await ctx.row(kinds.bid.table, prepared.historicalId);
        const history = await list('bid', name, p.id);
        const ws = await workspace('bid', name, p.id);
        assert.equal(history.body.length, 2);
        assert.equal(history.body[0].id, prepared.currentId);
        assert.equal(history.body[1].id, prepared.historicalId);
        assert.equal(history.body[1].status, 'superseded');
        current(ws.body.currentProcess, prepared.currentId, p.id);
        assert.equal(ws.body.materialItems.length, request.materialItems.length);
        assert.equal(ws.body.timelineItems.length, request.timelineItems.length);
        assert.ok(ws.body.materialItems.every((item) => item.processId === prepared.currentId));
        assert.ok(ws.body.timelineItems.every((item) => item.processId === prepared.currentId));
        assert.deepEqual(sorted(await ctx.select('project_bid_commercial_material_item', { process_id: produced.body.id })), oldMaterials);
        assert.deepEqual(sorted(await ctx.select('project_bid_commercial_timeline_item', { process_id: produced.body.id })), oldTimelines);
        assert.deepEqual(await ctx.row(kinds.bid.table, prepared.historicalId), before);
        await ctx.mutate(kinds.bid.table, prepared.currentId, { is_current: false, status: 'superseded' });
        await ctx.setProjectFacts(p.id, { stage: 'execution', status: 'on-hold' });
        const noCurrent = await workspace('bid', `${name}.no-current`, p.id);
        assert.equal(noCurrent.body.currentProcess, null);
        assert.deepEqual(noCurrent.body.materialItems, []);
        assert.deepEqual(noCurrent.body.timelineItems, []);
        assert.deepEqual(noCurrent.body.allowedActions, ['view-bid-commercial-workspace']);
        assert.equal((await list('bid', `${name}.history-retained`, p.id)).body.length, 2);
        await observe(name, { request, produced, prepared, before, oldMaterials, oldTimelines, history, workspace: ws, noCurrent,
            classification: 'Actual HTTP V1 followed by explicitly prepared legal history and legal project/read facts; no HTTP replacement success' });
    }

    // 9 cost representatives. Feasibility and highUncertainty are facts, not
    // additional gates. Tax is a reason, but the first nextStep branch can win.
    {
        const name = 'cost.no-current';
        const p = await project(name);
        const ws = await workspace('cost', name, p.id);
        assert.equal(ws.body.currentPackage, null);
        assert.deepEqual(ws.body.scopeItems, []);
        assert.deepEqual(ws.body.riskItems, []);
        assert.deepEqual(ws.body.costItems, []);
        assert.deepEqual(ws.body.blockingReasons, ['尚未形成技术与成本测算版本包。']);
        assert.equal(ws.body.nextStep, '补齐技术可行性、范围边界、风险项和成本税务估算。');
        await observe(name, { workspace: ws, stored: await rows('cost', p.id) });
    }
    const costCases = [
        ['cost.tax-reason-but-advance-first', { allowNextStage: true, taxReviewStatus: 'pending', riskItems: [] },
            { count: 0, reasons: [costReason.tax], next: costNext.advance, highest: null }],
        ['cost.allow-false-tax-priority', { allowNextStage: false, taxReviewStatus: 'pending', riskItems: [] },
            { count: 1, reasons: [costReason.allow, costReason.tax], next: costNext.tax, highest: null }],
        ['cost.reason-order-all-risks', { allowNextStage: false, taxReviewStatus: 'pending', riskItems: [
            risk('second', { riskLevel: 'R2', riskStatus: 'mitigating', blocksNextStage: true, sortOrder: 2 }),
            risk('first', { riskLevel: 'R1', riskStatus: 'open', blocksNextStage: true, sortOrder: 1 }),
            risk('closed-highest', { riskLevel: 'R4', riskStatus: 'closed', blocksNextStage: true, sortOrder: 3 }),
        ] }, { count: 3, reasons: [costReason.allow, 'first：first description', 'second：second description', costReason.tax], next: costNext.tax, highest: 'R4' }],
        ['cost.accepted-is-still-blocking-tax-first', { allowNextStage: true, taxReviewStatus: 'pending', riskItems: [
            risk('accepted', { riskLevel: 'R3', riskStatus: 'accepted', blocksNextStage: true }),
        ] }, { count: 1, reasons: ['accepted：accepted description', costReason.tax], next: costNext.tax, highest: 'R3' }],
        ['cost.not-feasible-not-an-extra-gate', { technicalFeasibilityDecision: 'not-feasible', allowNextStage: true, taxReviewStatus: 'reviewed', riskItems: [
            risk('closed', { riskLevel: 'R4', riskStatus: 'closed', blocksNextStage: true }),
        ] }, { count: 0, reasons: [], next: costNext.advance, highest: 'R4' }],
        ['cost.conditional-allow-false-tax-na', { technicalFeasibilityDecision: 'conditional', allowNextStage: false, taxReviewStatus: 'not-required', riskItems: [] },
            { count: 1, reasons: [costReason.allow], next: costNext.blocked, highest: null }],
        ['cost.unflagged-risks-and-uncertainty-not-extra-blockers', {
            technicalFeasibilityDecision: 'conditional', allowNextStage: true, taxReviewStatus: 'reviewed',
            riskItems: [risk('unflagged', { riskLevel: 'R3', riskStatus: 'open', blocksNextStage: false })],
            costItems: [{ ...buildCostRequest().costItems[0], highUncertainty: true, confidenceLevel: 'low' }],
        }, { count: 0, reasons: [], next: costNext.advance, highest: 'R3' }],
        ['cost.mitigating-without-tax-pending', { allowNextStage: true, taxReviewStatus: 'reviewed', riskItems: [
            risk('mitigating', { riskLevel: 'R2', riskStatus: 'mitigating', blocksNextStage: true }),
        ] }, { count: 1, reasons: ['mitigating：mitigating description'], next: costNext.blocked, highest: 'R2' }],
    ];
    for (const [name, patch, expected] of costCases) {
        const p = await project(name);
        const request = buildCostRequest(patch);
        const created = await post('cost', name, p.id, request);
        const ws = await workspace('cost', name, p.id);
        const stored = await ctx.row(kinds.cost.table, created.body.id);
        current(ws.body.currentPackage, created.body.id, p.id);
        assert.equal(created.body.technicalFeasibilityDecision, request.technicalFeasibilityDecision);
        assert.equal(created.body.blockerCount, expected.count);
        assert.equal(stored.blocker_count, expected.count);
        assert.equal(ws.body.currentPackage.highestRiskLevel, expected.highest);
        assert.deepEqual(ws.body.blockingReasons, expected.reasons);
        assert.equal(ws.body.nextStep, expected.next);
        await observe(name, { request, created, workspace: ws, stored, expected });
    }

    async function pricingContext(name, { costPatch = {}, bidPatch = {} } = {}) {
        const p = await project(name);
        const costRequest = buildCostRequest(costPatch);
        const bidRequest = bidBody(name, bidPatch);
        const cost = await post('cost', `${name}.producer.cost`, p.id, costRequest);
        const bid = await post('bid', `${name}.producer.bid`, p.id, bidRequest);
        assert.equal(cost.body.projectId, p.id);
        assert.equal(bid.body.projectId, p.id);
        return { project: p, cost: cost.body, bid: bid.body, producerRequests: { cost: costRequest, bid: bidRequest } };
    }
    const pricingBody = (context, patch = {}) => buildBidPricingRequest(context.cost.id, context.bid.id, {
        quoteVersion: 'Q-B-BRANCH', conditionItems: [], ...patch,
    });
    async function references(projectId) {
        const prepared = await ctx.preparePricingReferences(projectId);
        assert.equal(typeof prepared.commercialReleaseBaselineId, 'string');
        assert.equal(typeof prepared.summarySnapshotId, 'string');
        return {
            ...prepared,
            approvalScenarioKey: 'truthy-unregistered-scenario',
            summaryPackageKey: 'truthy-unregistered-package',
            projectionLevel: 'truthy-projection',
            exportPolicy: 'truthy-export',
        };
    }
    async function pricingSuccess(name, context, request, expected, extra = {}) {
        const created = await post('pricing', name, context.project.id, request);
        const ws = await workspace('pricing', name, context.project.id);
        const stored = await ctx.row(kinds.pricing.table, created.body.id);
        current(ws.body.currentReview, created.body.id, context.project.id);
        assert.equal(created.body.technicalCostPackageId, context.cost.id);
        assert.equal(created.body.bidCommercialProcessId, context.bid.id);
        assert.equal(stored.technical_cost_package_id, context.cost.id);
        assert.equal(stored.bid_commercial_process_id, context.bid.id);
        assert.equal(created.body.blockerCount, expected.count);
        assert.equal(created.body.readyForContracting, expected.ready);
        assert.deepEqual(ws.body.blockingReasons, expected.reasons);
        assert.equal(ws.body.nextStep, expected.next);
        assert.equal(ws.body.readyForContracting, expected.ready);
        await observe(name, { request, created, workspace: ws, stored, upstream: context, expected, ...extra });
        return created;
    }

    // 23 pricing representatives. Every pricing POST has its own actual HTTP
    // cost and bid producers first, including negative/reference cases.
    {
        const name = 'pricing.empty-without-cost-or-bid';
        const p = await project(name);
        const ws = await workspace('pricing', name, p.id);
        assert.equal(ws.body.currentReview, null);
        assert.equal(ws.body.technicalCostPackage, null);
        assert.equal(ws.body.bidCommercialProcess, null);
        assert.deepEqual(ws.body.blockingReasons, [pricingReason.missingCost]);
        assert.equal(ws.body.nextStep, pricingNext.prerequisites);
        await observe(name, { workspace: ws, classification: 'Explicit no-producer read gap, not a pricing command' });
    }
    const referenceFields = [
        'commercialReleaseBaselineId', 'approvalScenarioKey', 'summaryPackageKey',
        'summarySnapshotId', 'projectionLevel', 'exportPolicy',
    ];
    for (const [index, missing] of referenceFields.entries()) {
        const name = `pricing.six-reference-truthiness.${missing}`;
        const context = await pricingContext(name);
        const prepared = await references(context.project.id);
        const request = pricingBody(context, {
            ...prepared, decision: ['released', 'conditional-release', 'escalation-required'][index % 3],
        });
        if (index % 2 === 0) delete request[missing];
        else request[missing] = null;
        const rejected = await post('pricing', name, context.project.id, request, 400);
        assert.equal(rejected.body.message, sixReferenceError);
        const ws = await workspace('pricing', name, context.project.id);
        assert.equal(ws.body.currentReview, null);
        assert.deepEqual(await rows('pricing', context.project.id), []);
        await observe(name, { request, rejected, workspace: ws, upstream: context, prepared,
            classification: 'Prepared id-level FK graph plus actual cost/bid producers; required truthiness only, no domain approval execution' });
    }
    {
        const name = 'pricing.released-six-truthy-only';
        const context = await pricingContext(name);
        const prepared = await references(context.project.id);
        await pricingSuccess(name, context, pricingBody(context, { ...prepared, decision: 'released' }), {
            count: 0, ready: true, reasons: [], next: pricingNext.ready,
        }, { prepared, classification: 'Six present strings/IDs, prepared FK rows; no approval-handler or reference-text matching claim' });
    }
    {
        const name = 'pricing.conditional-release-condition-truth-table';
        const context = await pricingContext(name);
        const prepared = await references(context.project.id);
        const conditionItems = [
            { conditionKey: 'block', conditionType: 'payment', label: 'block', conditionSummary: 'still-open', conditionStatus: 'open', requiredForContracting: true, sortOrder: 1 },
            { conditionKey: 'closed', conditionType: 'tax', label: 'closed', conditionSummary: 'closed', conditionStatus: 'closed', requiredForContracting: true, sortOrder: 2 },
            { conditionKey: 'waived', conditionType: 'scope', label: 'waived', conditionSummary: 'waived', conditionStatus: 'waived', requiredForContracting: true, sortOrder: 3 },
            { conditionKey: 'optional', conditionType: 'risk', label: 'optional', conditionSummary: 'open-not-required', conditionStatus: 'open', requiredForContracting: false, sortOrder: 4 },
        ];
        await pricingSuccess(name, context, pricingBody(context, { ...prepared, decision: 'conditional-release', conditionItems }), {
            count: 1, ready: false, reasons: ['block：still-open'], next: pricingNext.blocked,
        }, { prepared, classification: 'Prepared FK graph only; condition flags/statuses supply the original blocker rule' });
    }
    {
        const name = 'pricing.conditional-release-closed-waived-ready';
        const context = await pricingContext(name);
        const prepared = await references(context.project.id);
        const conditionItems = [
            { conditionKey: 'closed', conditionType: 'payment', label: 'closed', conditionSummary: 'closed', conditionStatus: 'closed', requiredForContracting: true, sortOrder: 1 },
            { conditionKey: 'waived', conditionType: 'tax', label: 'waived', conditionSummary: 'waived', conditionStatus: 'waived', requiredForContracting: true, sortOrder: 2 },
            { conditionKey: 'optional', conditionType: 'risk', label: 'optional', conditionSummary: 'open-not-required', conditionStatus: 'open', requiredForContracting: false, sortOrder: 3 },
        ];
        await pricingSuccess(name, context, pricingBody(context, { ...prepared, decision: 'conditional-release', conditionItems }), {
            count: 0, ready: true, reasons: [], next: pricingNext.ready,
        }, { prepared, classification: 'Prepared id-level FK graph plus original conditional readiness rule, not approval-handler execution' });
    }
    {
        const name = 'pricing.escalation-valid-refs-still-blocked';
        const context = await pricingContext(name);
        const prepared = await references(context.project.id);
        await pricingSuccess(name, context, pricingBody(context, { ...prepared, decision: 'escalation-required' }), {
            count: 1, ready: false, reasons: [pricingReason.escalation], next: pricingNext.blocked,
        }, { prepared, classification: 'Prepared references do not run or complete an approval handler' });
    }
    {
        const name = 'pricing.rejected-baseline-disallowed';
        const context = await pricingContext(name);
        const prepared = await references(context.project.id);
        const request = pricingBody(context, { decision: 'rejected', commercialReleaseBaselineId: prepared.commercialReleaseBaselineId });
        const rejected = await post('pricing', name, context.project.id, request, 400);
        assert.equal(rejected.body.message, 'rejected decision must not reference a commercial release baseline');
        assert.deepEqual(await rows('pricing', context.project.id), []);
        const ws = await workspace('pricing', name, context.project.id);
        assert.equal(ws.body.currentReview, null);
        await observe(name, { request, rejected, workspace: ws, upstream: context, prepared });
    }
    {
        const name = 'pricing.rejected-snapshot-allowed-without-baseline';
        const context = await pricingContext(name);
        const prepared = await references(context.project.id);
        await pricingSuccess(name, context, pricingBody(context, {
            decision: 'rejected', commercialReleaseBaselineId: null,
            summarySnapshotId: prepared.summarySnapshotId,
        }), { count: 1, ready: false, reasons: [pricingReason.rejected], next: pricingNext.blocked }, { prepared });
    }
    for (const [field, table] of [
        ['commercialReleaseBaselineId', 'commercial_release_baseline'],
        ['summarySnapshotId', 'approval_summary_snapshot'],
    ]) {
        const name = `pricing.pending-missing-optional-FK.${field}`;
        const context = await pricingContext(name);
        const absent = '00000000-0000-0000-0000-000000000000';
        assert.deepEqual(await ctx.select(table, { id: absent }), []);
        const costBefore = await ctx.row(kinds.cost.table, context.cost.id);
        const bidBefore = await ctx.row(kinds.bid.table, context.bid.id);
        const request = pricingBody(context, { decision: 'pending', [field]: absent });
        const failed = await post('pricing', name, context.project.id, request, 500);
        assert.equal(failed.body.message, 'Internal server error');
        const stored = await rows('pricing', context.project.id);
        assert.deepEqual(stored, []);
        assert.deepEqual(await ctx.row(kinds.cost.table, context.cost.id), costBefore);
        assert.deepEqual(await ctx.row(kinds.bid.table, context.bid.id), bidBefore);
        const ws = await workspace('pricing', name, context.project.id);
        assert.equal(ws.body.currentReview, null);
        await observe(name, { request, failed, workspace: ws, stored, costBefore, bidBefore, upstream: context,
            classification: 'Absent id confirmed in the actual target FK table; DTO accepts nil UUID, pending skips six-reference presence gate, original FK rejects at persistence' });
    }
    {
        const name = 'pricing.pending-cross-project-optional-FKs';
        const context = await pricingContext(name);
        const donor = await project(`${name}.reference-owner`);
        const prepared = await references(donor.id);
        const baseline = await ctx.row('commercial_release_baseline', prepared.commercialReleaseBaselineId);
        const snapshot = await ctx.row('approval_summary_snapshot', prepared.summarySnapshotId);
        assert.equal(baseline.project_id, donor.id);
        assert.equal(snapshot.target_id, donor.id);
        assert.notEqual(donor.id, context.project.id);
        const created = await pricingSuccess(name, context, pricingBody(context, { ...prepared, decision: 'pending' }), {
            count: 1, ready: false, reasons: [pricingReason.pending], next: pricingNext.blocked,
        }, { donor, prepared, baseline, snapshot, classification: 'Prepared cross-project id-level FK rows; original pricing has no target-project or reference-text validation, no approval-handler delivery' });
        assert.equal(created.body.commercialReleaseBaselineId, prepared.commercialReleaseBaselineId);
        assert.equal(created.body.summarySnapshotId, prepared.summarySnapshotId);
    }
    {
        const name = 'pricing.historical-cost-bid-by-id';
        const context = await pricingContext(name);
        const request = pricingBody(context);
        const created = await post('pricing', name, context.project.id, request);
        const before = await ctx.row(kinds.pricing.table, created.body.id);
        const costHistory = await ctx.prepareHistory('cost', context.cost.id);
        const bidHistory = await ctx.prepareHistory('bid', context.bid.id);
        assert.equal(costHistory.historicalId, context.cost.id);
        assert.equal(bidHistory.historicalId, context.bid.id);
        const ws = await workspace('pricing', name, context.project.id);
        const costCurrent = await workspace('cost', name, context.project.id);
        const bidCurrent = await workspace('bid', name, context.project.id);
        assert.equal(ws.body.currentReview.id, created.body.id);
        assert.equal(ws.body.technicalCostPackage.id, costHistory.historicalId);
        assert.equal(ws.body.bidCommercialProcess.id, bidHistory.historicalId);
        assert.equal(ws.body.technicalCostPackage.status, 'superseded');
        assert.equal(ws.body.bidCommercialProcess.status, 'superseded');
        assert.equal(ws.body.technicalCostPackage.isCurrent, false);
        assert.equal(ws.body.bidCommercialProcess.isCurrent, false);
        assert.equal(costCurrent.body.currentPackage.id, costHistory.currentId);
        assert.equal(bidCurrent.body.currentProcess.id, bidHistory.currentId);
        assert.deepEqual(await ctx.row(kinds.pricing.table, created.body.id), before);
        await observe(name, { request, created, before, workspace: ws, costCurrent, bidCurrent, costHistory, bidHistory,
            classification: 'Actual HTTP cost/bid/review V1, then prepared legal source history only; by-id display is not successful HTTP replacement' });
    }
    {
        const name = 'pricing.prepared-cross-project-by-id-read';
        const context = await pricingContext(name);
        const donor = await pricingContext(`${name}.source-owner`);
        const created = await post('pricing', name, context.project.id, pricingBody(context));
        await ctx.mutate(kinds.pricing.table, created.body.id, {
            technical_cost_package_id: donor.cost.id, bid_commercial_process_id: donor.bid.id,
        });
        const preparedReview = await ctx.row(kinds.pricing.table, created.body.id);
        const ws = await workspace('pricing', name, context.project.id);
        assert.equal(ws.body.projectId, context.project.id);
        assert.equal(ws.body.currentReview.technicalCostPackageId, donor.cost.id);
        assert.equal(ws.body.currentReview.bidCommercialProcessId, donor.bid.id);
        assert.equal(ws.body.technicalCostPackage.id, donor.cost.id);
        assert.equal(ws.body.technicalCostPackage.projectId, donor.project.id);
        assert.equal(ws.body.bidCommercialProcess.id, donor.bid.id);
        assert.equal(ws.body.bidCommercialProcess.projectId, donor.project.id);
        assert.deepEqual(await ctx.row(kinds.pricing.table, created.body.id), preparedReview);
        await observe(name, { created, preparedReview, workspace: ws, upstream: context, donor,
            classification: 'Explicit prepared valid-FK read fixture after actual producers, never a claim that HTTP create accepts cross-project cost/bid references; original by-id read has no added project filter' });
    }
    {
        const name = 'pricing.prerequisite-order';
        const context = await pricingContext(name, {
            costPatch: { allowNextStage: false, taxReviewStatus: 'pending' },
            bidPatch: { decision: 'no-bid', resultStatus: 'lost' },
        });
        const ws = await workspace('pricing', name, context.project.id);
        assert.equal(ws.body.currentReview, null);
        assert.deepEqual(ws.body.blockingReasons, [pricingReason.allow, pricingReason.tax, pricingReason.bid]);
        assert.equal(ws.body.nextStep, pricingNext.prerequisites);
        await observe(name, { workspace: ws, upstream: context, classification: 'Actual producer facts; no pricing command or approval claim' });
    }
    for (const [name, bidPatch] of [
        ['pricing.not-required-not-an-empty-workspace-blocker', { bidMode: 'not-required', decision: 'not-required', resultStatus: 'not-applicable' }],
        ['pricing.no-bid-decision-not-an-empty-workspace-blocker', { decision: 'no-bid', resultStatus: 'pending' }],
    ]) {
        const context = await pricingContext(name, { bidPatch });
        const ws = await workspace('pricing', name, context.project.id);
        assert.equal(ws.body.currentReview, null);
        assert.deepEqual(ws.body.blockingReasons, [pricingReason.empty]);
        assert.equal(ws.body.nextStep, pricingNext.empty);
        await observe(name, { workspace: ws, upstream: context, classification: 'Read prerequisite behavior only; no assertion that a bid pricing command can use not-applicable result' });
    }
    {
        const name = 'pricing.reference-whitespace-DTO-before-truthiness';
        const context = await pricingContext(name);
        const prepared = await references(context.project.id);
        const request = pricingBody(context, { ...prepared, decision: 'released', approvalScenarioKey: '   ' });
        const rejected = await post('pricing', name, context.project.id, request, 400);
        assert.equal(rejected.body.message, 'Validation failed');
        assert.ok(rejected.body.errors.some((issue) => issue.path?.join('.') === 'approvalScenarioKey'));
        assert.deepEqual(await rows('pricing', context.project.id), []);
        const ws = await workspace('pricing', name, context.project.id);
        assert.equal(ws.body.currentReview, null);
        await observe(name, { request, rejected, workspace: ws, upstream: context, prepared });
    }
    {
        const name = 'pricing.pending-optional-references-all-omitted';
        const context = await pricingContext(name);
        const request = pricingBody(context);
        for (const field of referenceFields) delete request[field];
        const created = await pricingSuccess(name, context, request, {
            count: 1, ready: false, reasons: [pricingReason.pending], next: pricingNext.blocked,
        });
        for (const field of referenceFields) assert.equal(created.body[field], null);
    }
    assert.equal(representativeCases, 45, 'Bounded source-derived representative set');
    await ctx.observe(label('complete'), {
        representativeCases,
        executionMeaning: 'Only Root invocation produces actual evidence; this file itself is a pure unexecuted definition',
        preparedBoundaries: ['legal history graph', 'id-level commercial/snapshot FK graph', 'cross-project by-id read facts'],
        HTTPReplacementSuccessClaim: false,
        approvalHandlerDeliveryClaim: false,
    });
}
