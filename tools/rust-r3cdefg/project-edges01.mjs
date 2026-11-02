/**
 * Pure additional acceptance definitions. This draft is not executed here.
 * Root copies these bytes to tools/rust-r3cdefg/project-edges01.mjs; the frozen
 * builder imports below are relative to that formal tools location.
 * No installation, environment, process, DDL or transaction control is defined.
 * Native source/G1 owns the expected behavior, including second-version 500.
 */
import assert from 'node:assert/strict';
import {
    buildCostRequest,
    buildBidPricingRequest,
} from '../../docs/design/rust-r3cdefg/input-a/native-fixture-draft01.mjs';
import {
    bidCommercialRequestWithChildren,
} from '../../docs/design/rust-r3cdefg/input-b/native-fixture-draft01.mjs';

export async function projectEdges(ctx) {
    const kinds = {
        cost: {
            table: 'project_technical_cost_package',
            collection: 'technical-cost-packages',
            workspace: 'technical-cost-workspace',
            current: 'currentPackage',
            children: [
                ['project_technical_cost_item', 'package_id'],
                ['project_technical_risk_item', 'package_id'],
                ['project_technical_scope_item', 'package_id'],
            ],
        },
        bid: {
            table: 'project_bid_commercial_process',
            collection: 'bid-commercial-processes',
            workspace: 'bid-commercial-workspace',
            current: 'currentProcess',
            children: [
                ['project_bid_commercial_material_item', 'process_id'],
                ['project_bid_commercial_timeline_item', 'process_id'],
            ],
        },
        pricing: {
            table: 'project_pricing_margin_review',
            collection: 'pricing-margin-reviews',
            workspace: 'pricing-margin-workspace',
            current: 'currentReview',
            children: [['project_pricing_margin_condition_item', 'review_id']],
        },
    };
    const route = (id, suffix) => `/api/projects/${id}/${suffix}`;
    const label = (value) => `A.edges.${value}`;
    const sorted = (rows) => [...rows].sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const remember = async (name, value) => { await ctx.observe(label(name), value); };

    async function prepared(kind, name, patch = {}) {
        const project = await ctx.project(label(name));
        assert.equal(typeof project.id, 'string', 'ctx.project must return the actual project summary');
        let body;
        let upstream = null;
        if (kind === 'cost') {
            body = buildCostRequest(patch);
        } else if (kind === 'bid') {
            body = { ...bidCommercialRequestWithChildren(`edge ${project.id}`, 'publicTender'), ...patch };
        } else {
            const cost = await ctx.step(label(`${name}.producer.cost`), 'POST', route(project.id, kinds.cost.collection), { json: buildCostRequest() }, 201);
            const bid = await ctx.step(label(`${name}.producer.bid`), 'POST', route(project.id, kinds.bid.collection), { json: bidCommercialRequestWithChildren(`edge ${project.id}`, 'publicTender') }, 201);
            body = buildBidPricingRequest(cost.body.id, bid.body.id, patch);
            upstream = { cost: cost.body, bid: bid.body };
            assert.equal(cost.body.projectId, project.id);
            assert.equal(bid.body.projectId, project.id);
        }
        return { project, body, definition: kinds[kind], upstream };
    }

    async function post(kind, name, context, expected = 201, routeId = context.project.id) {
        return ctx.step(label(name), 'POST', route(routeId, kinds[kind].collection), { json: context.body }, expected);
    }

    async function workspace(kind, name, projectId) {
        return ctx.step(label(name), 'GET', route(projectId, kinds[kind].workspace), {}, 200);
    }

    async function childSnapshot(definition, id) {
        const result = {};
        for (const [table, foreignKey] of definition.children) {
            result[table] = sorted(await ctx.select(table, { [foreignKey]: id }));
        }
        return result;
    }

    // A legal existing int4 maximum is prepared only after the actual HTTP
    // producer has created this run's parent and children. No DDL is changed.
    for (const kind of Object.keys(kinds)) {
        const name = `version-int4-max.${kind}`;
        const context = await prepared(kind, name);
        const first = await post(kind, `${name}.first`, context);
        assert.equal(first.body.version, 1);
        const id = first.body.id;
        const original = await ctx.row(context.definition.table, id);
        assert.equal(original.project_id, context.project.id);
        const childrenBefore = await childSnapshot(context.definition, id);
        await ctx.mutate(context.definition.table, id, { version: 2147483647 });
        const before = await ctx.row(context.definition.table, id);
        assert.equal(Number(before.version), 2147483647);
        const second = await post(kind, `${name}.second`, context, 500);
        const after = await ctx.row(context.definition.table, id);
        const childrenAfter = await childSnapshot(context.definition, id);
        assert.deepEqual(after, before, `${kind}: failed wide-version INSERT must preserve the old parent`);
        assert.deepEqual(childrenAfter, childrenBefore, `${kind}: children must remain unchanged`);
        const rows = await ctx.select(context.definition.table, { project_id: context.project.id });
        assert.equal(rows.length, 1);
        const list = await ctx.step(label(`${name}.list`), 'GET', route(context.project.id, context.definition.collection), {}, 200);
        assert.equal(list.body.length, 1);
        assert.equal(list.body[0].version, 2147483647);
        await remember(name, { original, before, after, childrenBefore, childrenAfter, first: first.body, second, list: list.body, upstream: context.upstream, classification: 'HTTP producer V1, owned data version mutation, then original INSERT rejection; no replacement success' });
    }

    // The original array.min(1) whenHasLength runs after an array type issue.
    // Non-array .length uses JS comparison, preserving null/bool/string/array
    // coercion and the unknown-origin failure for NaN. No schema is imported.
    const lengthContext = await prepared('cost', 'array-length-inputs');
    const lengthValues = [
        ['null', null, true], ['false', false, true], ['true', true, false],
        ['zero', 0, true], ['one', 1, false], ['string-zero', '0', true],
        ['string-one', '1', false], ['empty-array', [], true],
        ['array-zero', [0], true], ['array-one', [1], false], ['object', {}, true],
    ];
    for (const [name, length, small] of lengthValues) {
        const body = buildCostRequest({ costItems: { length } });
        const response = await ctx.step(label(`array-length.${name}`), 'POST', route(lengthContext.project.id, kinds.cost.collection), { json: body }, 400);
        const errors = response.body.errors;
        assert.equal(errors.length, small ? 2 : 1);
        assert.equal(errors[0].code, 'invalid_type');
        assert.equal(errors[0].expected, 'array');
        assert.deepEqual(errors[0].path, ['costItems']);
        if (small) {
            assert.equal(errors[1].code, 'too_small');
            assert.equal(errors[1].origin, 'unknown');
            assert.equal(errors[1].minimum, 1);
        }
        await remember(`array-length.${name}`, { input: body.costItems, response });
    }
    for (const [name, value, small] of [
        ['empty-string', '', true], ['astral-one', '\u{1f600}', false],
        ['astral-two', '\u{1f600}\u{1f600}', false], ['space-not-trimmed', ' ', false],
        ['lone-high-string', '\ud800', false],
    ]) {
        const response = await ctx.step(label(`array-string.${name}`), 'POST', route(lengthContext.project.id, kinds.cost.collection), { json: buildCostRequest({ costItems: value }) }, 400);
        assert.equal(response.body.errors.length, small ? 2 : 1);
        assert.equal(response.body.errors[0].code, 'invalid_type');
        if (small) {
            assert.equal(response.body.errors[1].origin, 'string');
            assert.equal(response.body.errors[1].code, 'too_small');
        }
        await remember(`array-string.${name}`, { input: value, response });
    }
    const accumulated = await ctx.step(label('array-length.accumulated-order'), 'POST', route(lengthContext.project.id, kinds.cost.collection), { json: buildCostRequest({ technicalConclusionSummary: '', currencyCode: 'x', costItems: '' }) }, 400);
    assert.deepEqual(accumulated.body.errors.map((error) => error.path), [['technicalConclusionSummary'], ['currencyCode'], ['costItems'], ['costItems']]);
    assert.deepEqual(accumulated.body.errors.map((error) => error.code), ['too_small', 'too_small', 'invalid_type', 'too_small']);
    await remember('array-length.accumulated-order', accumulated);
    const emptyArray = await ctx.step(label('array-length.actual-empty-array'), 'POST', route(lengthContext.project.id, kinds.cost.collection), { json: buildCostRequest({ costItems: [] }) }, 400);
    assert.equal(emptyArray.body.errors.length, 1);
    assert.equal(emptyArray.body.errors[0].origin, 'array');
    const typeError = await ctx.step(label('array-length.object-coercion-typeerror'), 'POST', route(lengthContext.project.id, kinds.cost.collection), { json: buildCostRequest({ costItems: { length: { toString: null } } }) }, 400);
    assert.equal(typeError.body.message, 'Validation failed');
    assert.equal(Object.hasOwn(typeError.body, 'errors'), false);
    const noMin = await ctx.step(label('array-length.no-min-on-default-arrays'), 'POST', route(lengthContext.project.id, kinds.cost.collection), { json: buildCostRequest({ scopeItems: { length: { toString: null } }, riskItems: { length: 0 } }) }, 400);
    assert.deepEqual(noMin.body.errors.map((error) => [error.code, error.path]), [['invalid_type', ['scopeItems']], ['invalid_type', ['riskItems']]]);
    assert.equal((await ctx.select(kinds.cost.table, { project_id: lengthContext.project.id })).length, 0);
    await remember('array-length.final', { emptyArray, typeError, noMin, parents: await ctx.select(kinds.cost.table, { project_id: lengthContext.project.id }) });

    // Route UUID spelling is retained by the newly created entity, while PG
    // hydration and subsequent GETs canonicalize it. Body producer refs stay
    // their original successful lower-case IDs, so this is a route-only case.
    for (const kind of Object.keys(kinds)) {
        const name = `uppercase-project-route.${kind}`;
        const context = await prepared(kind, name);
        const upper = context.project.id.toUpperCase();
        const created = await post(kind, `${name}.post`, context, 201, upper);
        assert.equal(created.body.projectId, upper);
        const dbRow = await ctx.row(context.definition.table, created.body.id);
        assert.equal(dbRow.project_id, context.project.id.toLowerCase());
        const list = await ctx.step(label(`${name}.list-upper`), 'GET', route(upper, context.definition.collection), {}, 200);
        assert.equal(list.body.length, 1);
        assert.equal(list.body[0].projectId, context.project.id.toLowerCase());
        const view = await workspace(kind, `${name}.workspace-lower`, context.project.id);
        assert.equal(view.body.projectId, context.project.id.toLowerCase());
        assert.equal(view.body[context.definition.current].projectId, context.project.id.toLowerCase());
        await remember(name, { upper, created: created.body, stored: dbRow, list: list.body, workspace: view.body, upstream: context.upstream });
    }

    // Root's normal JSON transport stringifies these escaped UTF-16 values.
    // POST keeps isolated units; Node pg replaces only unpaired units at the
    // persistence boundary. A genuine pair remains the original astral point.
    const rawUtf16 = 'raw-\ud800-pair-\u{1f600}-low-\udc00-end';
    const storedUtf16 = 'raw-\ufffd-pair-\u{1f600}-low-\ufffd-end';
    for (const kind of Object.keys(kinds)) {
        const name = `utf16-lone.${kind}`;
        const context = await prepared(kind, name);
        let field;
        let childField;
        if (kind === 'cost') {
            field = 'technicalConclusionSummary'; childField = ['scopeItems', 'label'];
            context.body.technicalConclusionSummary = rawUtf16;
            context.body.taxAssumptionSummary = rawUtf16;
            context.body.scopeItems[0].label = rawUtf16;
        } else if (kind === 'bid') {
            field = 'processSummary'; childField = ['materialItems', 'label'];
            context.body.processSummary = rawUtf16;
            context.body.ownerRole = rawUtf16;
            context.body.materialItems[0].label = rawUtf16;
        } else {
            field = 'decisionSummary'; childField = ['conditionItems', 'label'];
            context.body.decisionSummary = rawUtf16;
            context.body.ownerRole = rawUtf16;
            context.body.conditionItems[0].label = rawUtf16;
        }
        const created = await post(kind, `${name}.post`, context);
        assert.equal(created.body[field], rawUtf16);
        const view = await workspace(kind, `${name}.get`, context.project.id);
        assert.equal(view.body[context.definition.current][field], storedUtf16);
        assert.equal(view.body[childField[0]][0][childField[1]], storedUtf16);
        const stored = await ctx.row(context.definition.table, created.body.id);
        await remember(name, { rawUtf16, storedUtf16, created: created.body, workspace: view.body, stored, upstream: context.upstream });
    }

    const astral = '\u{1f600}';
    for (const kind of Object.keys(kinds)) {
        const name = `unicode-codepoint-max.${kind}`;
        const context = await prepared(kind, name);
        let field;
        let maximum;
        if (kind === 'cost') {
            field = 'technicalConclusionSummary'; maximum = 2000;
            context.body[field] = astral.repeat(maximum);
            context.body.scopeItems[0].label = astral.repeat(255);
            context.body.riskItems[0].riskCategory = astral.repeat(128);
        } else if (kind === 'bid') {
            field = 'processSummary'; maximum = 2000;
            context.body[field] = astral.repeat(maximum);
            context.body.decisionSummary = astral.repeat(1000);
            context.body.materialItems[0].label = astral.repeat(255);
        } else {
            field = 'quoteVersion'; maximum = 64;
            context.body[field] = astral.repeat(maximum);
            context.body.grossMarginSummary = astral.repeat(2000);
            context.body.conditionItems[0].label = astral.repeat(255);
        }
        const created = await post(kind, `${name}.post`, context);
        assert.equal(created.body[field], context.body[field]);
        assert.equal([...created.body[field]].length, maximum);
        assert.equal(created.body[field].length, maximum * 2);
        const view = await workspace(kind, `${name}.get`, context.project.id);
        assert.equal(view.body[context.definition.current][field], context.body[field]);
        const before = await ctx.row(context.definition.table, created.body.id);
        const tooLong = await ctx.step(label(`${name}.plus-one-negative`), 'POST', route(context.project.id, context.definition.collection), { json: { ...context.body, [field]: astral.repeat(maximum + 1) } }, 400);
        assert.equal(tooLong.body.errors[0].code, 'too_big');
        assert.deepEqual(tooLong.body.errors[0].path, [field]);
        assert.deepEqual(await ctx.row(context.definition.table, created.body.id), before);
        await remember(name, { field, maximum, created: created.body, workspace: view.body, before, tooLong, upstream: context.upstream });
    }

    // Valid money text reaches Number/toFixed before PG. Observe the boundary
    // around 2^53 as full strings, never infer exact decimals from PG JSON numbers.
    for (const amount of ['9007199254740991.00', '9007199254740992.00', '9007199254740993.00', '9007199254740993.01']) {
        const name = `money-binary64.${amount.replaceAll('.', '-')}`;
        const context = await prepared('cost', name);
        Object.assign(context.body.costItems[0], { amountExcludingTax: amount, taxCostAmount: '0.00', amountIncludingTax: amount });
        const created = await post('cost', `${name}.post`, context);
        const expected = Number(amount).toFixed(2);
        assert.equal(created.body.totalEstimatedAmountExcludingTax, expected);
        assert.equal(created.body.totalEstimatedAmountIncludingTax, expected);
        const view = await workspace('cost', `${name}.get`, context.project.id);
        assert.equal(view.body.currentPackage.totalEstimatedAmountExcludingTax, expected);
        assert.equal(view.body.costItems[0].amountExcludingTax, expected);
        await remember(name, { originalText: amount, binary64Fixed: expected, created: created.body, workspace: view.body });
    }
    const overflow = await prepared('cost', 'money-numeric18-roundup');
    Object.assign(overflow.body.costItems[0], { amountExcludingTax: '9999999999999999.99', taxCostAmount: '0.00', amountIncludingTax: '9999999999999999.99' });
    const overflowResponse = await post('cost', 'money-numeric18-roundup.post', overflow, 500);
    assert.equal((await ctx.select(kinds.cost.table, { project_id: overflow.project.id })).length, 0);
    await remember('money-numeric18-roundup', { request: overflow.body, response: overflowResponse, parents: await ctx.select(kinds.cost.table, { project_id: overflow.project.id }) });

    // Each failure starts without that domain's current parent, so a unique
    // rejection cannot hide a child int4 range failure. G has real producers.
    for (const [kind, childKey] of [
        ['cost', 'costItems'], ['cost', 'riskItems'], ['cost', 'scopeItems'],
        ['bid', 'timelineItems'], ['bid', 'materialItems'], ['pricing', 'conditionItems'],
    ]) {
        const name = `sort-int4-overflow.${kind}.${childKey}`;
        const context = await prepared(kind, name);
        context.body[childKey][0].sortOrder = 2147483648;
        const response = await post(kind, `${name}.post`, context, 500);
        const rows = await ctx.select(context.definition.table, { project_id: context.project.id });
        assert.equal(rows.length, 0);
        const view = await workspace(kind, `${name}.get`, context.project.id);
        assert.equal(view.body[context.definition.current], null);
        await remember(name, { request: context.body, response, parents: rows, workspace: view.body, upstream: context.upstream });
    }

    const quantity = await prepared('cost', 'quantity-unit-price-scale');
    Object.assign(quantity.body.costItems[0], { quantity: '0001.2300', unitPrice: '0000.1000', amountExcludingTax: '0000.10', taxCostAmount: '0000.00', amountIncludingTax: '0000.10' });
    const quantityCreated = await post('cost', 'quantity-unit-price-scale.post', quantity);
    const quantityView = await workspace('cost', 'quantity-unit-price-scale.get', quantity.project.id);
    assert.equal(quantityCreated.body.totalEstimatedAmountExcludingTax, '0.10');
    assert.equal(quantityView.body.costItems[0].quantity, '1.2300');
    assert.equal(quantityView.body.costItems[0].unitPrice, '0.1000');
    const quantityBefore = await ctx.row(kinds.cost.table, quantityCreated.body.id);
    for (const [field, value] of [['quantity', '1.23000'], ['unitPrice', '0.10000']]) {
        const input = structuredClone(quantity.body);
        input.costItems[0][field] = value;
        const response = await ctx.step(label(`quantity-unit-price-scale.${field}.too-many`), 'POST', route(quantity.project.id, kinds.cost.collection), { json: input }, 400);
        assert.equal(response.body.errors[0].code, 'invalid_format');
        assert.deepEqual(response.body.errors[0].path, ['costItems', 0, field]);
        assert.deepEqual(await ctx.row(kinds.cost.table, quantityCreated.body.id), quantityBefore);
        await remember(`quantity-unit-price-scale.${field}.too-many`, response);
    }
    await remember('quantity-unit-price-scale', { request: quantity.body, created: quantityCreated.body, workspace: quantityView.body });

    const ratios = await prepared('pricing', 'pricing-ratio-original-text', { taxRate: '00000.13000000', grossMarginRate: '-00000.50000000' });
    ratios.body.conditionItems[0].dueAt = '2026-11-02T00:00:00.123456789Z';
    const ratioCreated = await post('pricing', 'pricing-ratio-original-text.post', ratios);
    assert.equal(ratioCreated.body.taxRate, '00000.13000000');
    assert.equal(ratioCreated.body.grossMarginRate, '-00000.50000000');
    const ratioView = await workspace('pricing', 'pricing-ratio-original-text.get', ratios.project.id);
    assert.equal(ratioView.body.currentReview.taxRate, '0.13000000');
    assert.equal(ratioView.body.currentReview.grossMarginRate, '-0.50000000');
    assert.equal(ratioView.body.conditionItems[0].dueAt, '2026-11-02T00:00:00.123Z');
    const ratioBefore = await ctx.row(kinds.pricing.table, ratioCreated.body.id);
    for (const [field, value] of [['taxRate', '0.130000001'], ['grossMarginRate', '-0.500000001']]) {
        const response = await ctx.step(label(`pricing-ratio-original-text.${field}.too-many`), 'POST', route(ratios.project.id, kinds.pricing.collection), { json: { ...ratios.body, [field]: value } }, 400);
        assert.equal(response.body.errors[0].code, 'invalid_format');
        assert.deepEqual(response.body.errors[0].path, [field]);
        assert.deepEqual(await ctx.row(kinds.pricing.table, ratioCreated.body.id), ratioBefore);
        await remember(`pricing-ratio-original-text.${field}.too-many`, response);
    }
    await remember('pricing-ratio-original-text', { request: ratios.body, created: ratioCreated.body, workspace: ratioView.body, upstream: ratios.upstream });

    // Tax/gross rate text is finite-checked through Number but is not rounded
    // through Number before the original numeric(18,8) column receives it.
    const ratioMax = await prepared('pricing', 'pricing-ratio-numeric18-max', { taxRate: '9999999999.99999999', grossMarginRate: '-9999999999.99999999' });
    const ratioMaxCreated = await post('pricing', 'pricing-ratio-numeric18-max.post', ratioMax);
    const ratioMaxView = await workspace('pricing', 'pricing-ratio-numeric18-max.get', ratioMax.project.id);
    assert.equal(ratioMaxCreated.body.taxRate, '9999999999.99999999');
    assert.equal(ratioMaxView.body.currentReview.taxRate, '9999999999.99999999');
    assert.equal(ratioMaxView.body.currentReview.grossMarginRate, '-9999999999.99999999');
    await remember('pricing-ratio-numeric18-max', { created: ratioMaxCreated.body, workspace: ratioMaxView.body, upstream: ratioMax.upstream });
    const ratioOverflow = await prepared('pricing', 'pricing-ratio-numeric18-overflow', { taxRate: '10000000000.00000000' });
    const ratioOverflowResponse = await post('pricing', 'pricing-ratio-numeric18-overflow.post', ratioOverflow, 500);
    assert.equal((await ctx.select(kinds.pricing.table, { project_id: ratioOverflow.project.id })).length, 0);
    await remember('pricing-ratio-numeric18-overflow', { request: ratioOverflow.body, response: ratioOverflowResponse, parents: await ctx.select(kinds.pricing.table, { project_id: ratioOverflow.project.id }), upstream: ratioOverflow.upstream });
}
