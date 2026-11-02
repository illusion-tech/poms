// H #93 G1-only Native observation definitions; author does not execute them.
// base 7f970c992291c61477eb9bd83a48cec19a769d88.
// Static source: lead.service.ts:101-230,233-393,541-599;
// lead-score.service.ts:93-239,282-368,444-453;
// business-number.service.ts:41-73; attachment.service.ts:862-924;
// attachment.repository.ts:125-166,260-267; runtime-audit.service.ts:64-86.
// No imports, direct IO, environment, DDL, transaction control or self-run.
// Unknown status/outcome is recorded only; no winner or rollback is assumed.

export async function nativeLeadRisks(ctx) {
    const ids = ctx.ids;
    const build = ctx.build;
    const prefix = 'H93.native-risk';
    const path = (id, action = '') => `/api/leads/${id}${action}`;
    const overridePath = (id, action) => `/api/lead-score-overrides/${id}:${action}`;
    const name = (part) => `${prefix}.${part}`;
    const ok = (response) => response && response.status >= 200 && response.status < 300;
    const version = (row) => row?.row_version ?? row?.rowVersion;
    const auditFor = (response) => response?.requestId ? ctx.audit(response.requestId) : Promise.resolve([]);
    const leadName = (part) => `H93 Native ${part} ${ids.leadId}`;

    function createBody(part, overrides = {}) {
        return build.qualificationReadyLeadRequest({
            customerId: ids.customerId,
            sourceCode: ids.sourceCode,
            ownerUserId: ids.adminUserId,
            ownerOrgId: ids.adminOrgId,
            overrides: { leadName: leadName(part), ...overrides },
        });
    }

    async function state(leadId) {
        return {
            lead: await ctx.row('lead', leadId),
            ownerAssignments: await ctx.rows('lead_owner_assignment_record', { lead_id: leadId }),
            snapshots: await ctx.rows('lead_score_snapshot', { lead_id: leadId }),
            overrides: await ctx.rows('lead_score_override', { lead_id: leadId }),
            projects: await ctx.rows('project', { source_lead_id: leadId }),
        };
    }

    async function qualified(part) {
        const lead = await ctx.produceLead(name(part));
        const response = await ctx.step(name(`${part}.qualify`), 'POST', path(lead.id, ':qualify'), { json: build.qualifyLeadRequest() });
        return { lead, response, ready: ok(response) };
    }

    async function pending(part, score = 85) {
        const lead = await ctx.produceLead(name(part));
        const current = await ctx.row('lead', lead.id);
        const response = await ctx.step(name(`${part}.submit`), 'POST', path(lead.id, '/score-overrides'), {
            json: build.submitScoreOverrideRequest(version(current), { score }),
        });
        return { lead, response, ready: ok(response) && typeof response.body?.id === 'string' };
    }

    function snapshotStrings(rows) {
        return rows.map((row) => ({
            id: row.id,
            snapshotKind: row.snapshot_kind,
            sourceCommand: row.source_command,
            sourceRecordId: row.source_record_id,
            componentKeys: Object.keys(row.component_breakdown ?? {}),
            componentString: JSON.stringify(row.component_breakdown),
            gateKeys: Object.keys(row.gate_summary_snapshot ?? {}),
            gateString: JSON.stringify(row.gate_summary_snapshot),
        }));
    }

    await ctx.observe(name('static-scope'), {
        kind: 'H93-G1-Native-risk-observation-definition',
        base: '7f970c992291c61477eb9bd83a48cec19a769d88',
        successControllerStatusOnly: {
            create: ctx.expect('LeadController_create'),
            qualify: ctx.expect('LeadController_qualify'),
            convert: ctx.expect('LeadController_convertToProject'),
            submitOverride: ctx.expect('LeadController_submitScoreOverride'),
            approveOverride: ctx.expect('LeadScoreOverrideController_approve'),
        },
        note: 'All injected-fault, concurrency and supersede outcomes below are observations, not predeclared 409/500 or atomicity assertions.',
    });

    // W1: next(..., em) is not itself evidence of the physical SQL connection.
    // Root's case SQL window records actual sequence allocation/rollback.
    for (const deniedTable of ['lead', 'lead_score_snapshot']) {
        await ctx.case(name(`W1.create-denied-${deniedTable}`), async () => {
            const body = createBody(`create-denied-${deniedTable}`);
            const counterBefore = await ctx.counter('lead');
            const rowsBefore = await ctx.rows('lead', { lead_name: body.leadName });
            await ctx.due('admin');
            const response = await ctx.withDenied(deniedTable, 'INSERT', async () =>
                ctx.step(name(`W1.create-denied-${deniedTable}.post`), 'POST', '/api/leads', { json: body }));
            const counterAfter = await ctx.counter('lead');
            const rowsAfter = await ctx.rows('lead', { lead_name: body.leadName });
            const graphs = [];
            for (const row of rowsAfter) graphs.push(await state(row.id));
            return { deniedTable, request: body, response, counterBefore, counterAfter, rowsBefore, rowsAfter, graphs, audit: await auditFor(response) };
        });
    }

    for (const deniedTable of ['project', 'lead_score_snapshot']) {
        await ctx.case(name(`W1.convert-denied-${deniedTable}`), async () => {
            const source = await qualified(`convert-denied-${deniedTable}`);
            if (!source.ready) return { prerequisiteFailed: 'qualify', source };
            const before = await state(source.lead.id);
            const counterBefore = await ctx.counter('project');
            await ctx.due('admin');
            const response = await ctx.withDenied(deniedTable, 'INSERT', async () =>
                ctx.step(name(`W1.convert-denied-${deniedTable}.post`), 'POST', path(source.lead.id, ':convertToProject'), {
                    json: build.convertLeadRequest({ projectName: leadName(`convert-denied-${deniedTable}`) }),
                }));
            return {
                source, deniedTable, before, response, after: await state(source.lead.id),
                counterBefore, counterAfter: await ctx.counter('project'), audit: await auditFor(response),
                note: 'This case has no manufactured attachment. Root owns the attachment-copy flush case separately.',
            };
        });
    }

    // W2: source-level explicit stale and two-readers flush competition are
    // intentionally recorded independently, including original SQL outcomes.
    await ctx.case(name('W2.lead-explicit-stale-versus-CAS'), async () => {
        const lead = await ctx.produceLead(name('lead-CAS'));
        const before = await state(lead.id);
        const stale = await ctx.step(name('W2.lead.explicit-stale'), 'PATCH', path(lead.id), {
            json: { leadName: leadName('stale'), expectedVersion: Number(version(before.lead)) + 1 },
        });
        const afterStale = await state(lead.id);
        await ctx.due('admin');
        await ctx.due('other');
        const requests = [
            { actor: 'admin', method: 'PATCH', path: path(lead.id), json: { leadName: leadName('CAS-admin'), expectedVersion: version(afterStale.lead) } },
            { actor: 'other', method: 'PATCH', path: path(lead.id), json: { leadName: leadName('CAS-other'), expectedVersion: version(afterStale.lead) } },
        ];
        const competition = await ctx.concurrentOnRow('lead', lead.id, requests);
        const audits = [];
        for (const response of competition.responses) audits.push(await auditFor(response));
        return { before, stale, afterStale, requests, competition, after: await state(lead.id), staleAudit: await auditFor(stale), audits };
    });

    await ctx.case(name('W2.override-explicit-stale-versus-CAS'), async () => {
        const source = await pending('override-CAS');
        if (!source.ready) return { prerequisiteFailed: 'submit', source };
        const id = source.response.body.id;
        const before = await state(source.lead.id);
        const initial = await ctx.row('lead_score_override', id);
        const stale = await ctx.step(name('W2.override.explicit-stale'), 'POST', overridePath(id, 'approve'), {
            json: build.approveScoreOverrideRequest(Number(version(initial)) + 1),
        });
        const afterStale = await ctx.row('lead_score_override', id);
        await ctx.due('admin');
        await ctx.due('other');
        const requests = [
            { actor: 'admin', method: 'POST', path: overridePath(id, 'approve'), json: build.approveScoreOverrideRequest(version(afterStale), { note: 'Native CAS admin' }) },
            { actor: 'other', method: 'POST', path: overridePath(id, 'approve'), json: build.approveScoreOverrideRequest(version(afterStale), { note: 'Native CAS other' }) },
        ];
        const competition = await ctx.concurrentOnRow('lead_score_override', id, requests);
        const audits = [];
        for (const response of competition.responses) audits.push(await auditFor(response));
        return { source, before, initial, stale, afterStale, requests, competition, after: await state(source.lead.id), audits };
    });

    // W3: these source methods save the lead/assignment first and request a
    // no-em system snapshot afterwards. Observe both commits, never infer one.
    for (const action of ['qualify', 'close', 'claim', 'assignOwner']) {
        await ctx.case(name(`W3.main-save-then-denied-snapshot.${action}`), async () => {
            const lead = await ctx.produceLead(name(`snapshot-after-${action}`), action === 'claim' ? { ownerUserId: null } : {});
            const before = await state(lead.id);
            const json = action === 'qualify' ? build.qualifyLeadRequest()
                : action === 'close' ? build.closeLeadRequest()
                    : action === 'claim' ? build.claimLeadRequest(version(before.lead))
                        : build.assignLeadRequest(ids.otherUserId, version(before.lead), { ownerOrgId: ids.otherOrgId });
            await ctx.due('admin');
            const response = await ctx.withDenied('lead_score_snapshot', 'INSERT', async () =>
                ctx.step(name(`W3.${action}.post`), 'POST', path(lead.id, `:${action}`), { json }));
            const after = await state(lead.id);
            const detail = await ctx.step(name(`W3.${action}.detail`), 'GET', path(lead.id));
            return { action, before, request: json, response, after, detail, audit: await auditFor(response) };
        });
    }

    // W3/W4: all four score methods issue the business transaction before a
    // no-em audit write. This observes the status and retained graph on failure.
    for (const action of ['submit', 'approve', 'reject', 'revoke']) {
        await ctx.case(name(`W3.override-denied-post-audit.${action}`), async () => {
            const lead = await ctx.produceLead(name(`audit-after-${action}`));
            const prerequisites = [];
            let id = null;
            if (action !== 'submit') {
                const current = await ctx.row('lead', lead.id);
                const submitted = await ctx.step(name(`W3.${action}.prerequisite.submit`), 'POST', path(lead.id, '/score-overrides'), {
                    json: build.submitScoreOverrideRequest(version(current)),
                });
                prerequisites.push(submitted);
                if (!ok(submitted) || typeof submitted.body?.id !== 'string') return { prerequisiteFailed: 'submit', lead, prerequisites };
                id = submitted.body.id;
            }
            if (action === 'revoke') {
                const current = await ctx.row('lead_score_override', id);
                const approved = await ctx.step(name('W3.revoke.prerequisite.approve'), 'POST', overridePath(id, 'approve'), {
                    json: build.approveScoreOverrideRequest(version(current)),
                });
                prerequisites.push(approved);
                if (!ok(approved)) return { prerequisiteFailed: 'approve', lead, prerequisites, state: await state(lead.id) };
            }
            const before = await state(lead.id);
            const current = action === 'submit' ? before.lead : await ctx.row('lead_score_override', id);
            const json = action === 'submit' ? build.submitScoreOverrideRequest(version(current))
                : action === 'approve' ? build.approveScoreOverrideRequest(version(current))
                    : action === 'reject' ? build.rejectScoreOverrideRequest(version(current))
                        : build.revokeScoreOverrideRequest(version(current));
            const endpoint = action === 'submit' ? path(lead.id, '/score-overrides') : overridePath(id, action);
            await ctx.due('admin');
            const response = await ctx.withDenied('audit_log', 'INSERT', async () =>
                ctx.step(name(`W3.${action}.denied-audit`), 'POST', endpoint, { json }));
            const after = await state(lead.id);
            const history = await ctx.step(name(`W3.${action}.history-after`), 'GET', path(lead.id, '/score-history'));
            return { action, prerequisites, before, request: json, response, after, history, audit: await auditFor(response) };
        });
    }

    // W4: the old approved and the new pending are actual HTTP products. The
    // second approval's unique/CAS/flush result remains unknown until Native.
    await ctx.case(name('W4.approved-then-new-pending-approval-order'), async () => {
        const source = await pending('approved-then-pending', 85);
        if (!source.ready) return { prerequisiteFailed: 'first submit', source };
        const firstId = source.response.body.id;
        const firstRow = await ctx.row('lead_score_override', firstId);
        const firstApproval = await ctx.step(name('W4.first-approval'), 'POST', overridePath(firstId, 'approve'), {
            json: build.approveScoreOverrideRequest(version(firstRow), { note: 'First approved override' }),
        });
        if (!ok(firstApproval)) return { prerequisiteFailed: 'first approve', source, firstApproval, state: await state(source.lead.id) };
        const lead = await ctx.row('lead', source.lead.id);
        const second = await ctx.step(name('W4.second-submit'), 'POST', path(source.lead.id, '/score-overrides'), {
            json: build.submitScoreOverrideRequest(version(lead), { score: 65, reason: 'Second actual Native pending override' }),
        });
        if (!ok(second) || typeof second.body?.id !== 'string') return { prerequisiteFailed: 'second submit', source, firstApproval, second, state: await state(source.lead.id) };
        const before = await state(source.lead.id);
        const secondRow = await ctx.row('lead_score_override', second.body.id);
        await ctx.due('admin');
        const response = await ctx.step(name('W4.second-approval-observe'), 'POST', overridePath(second.body.id, 'approve'), {
            json: build.approveScoreOverrideRequest(version(secondRow), { note: 'Observe supersede order' }),
        });
        const history = await ctx.step(name('W4.history-after'), 'GET', path(source.lead.id, '/score-history'));
        return { source, firstApproval, second, before, response, after: await state(source.lead.id), history, audit: await auditFor(response) };
    });

    // W5: compare cross-request JSONB key order and snapshot counts, then an
    // actual no-op, then real I producers and an explicit H scoring refresh.
    await ctx.case(name('W5.cross-request-dedup-noop-and-real-I-refresh'), async () => {
        const lead = await ctx.produceLead(name('dedup-I-refresh'));
        const before = await state(lead.id);
        const patch1 = build.updateLeadRequest({
            leadName: leadName('dedup-name-change'),
            demandDescription: before.lead.demand_description,
            expectedVersion: version(before.lead),
        });
        const changed = await ctx.step(name('W5.name-only-real-change'), 'PATCH', path(lead.id), { json: patch1 });
        const afterChanged = await state(lead.id);
        const noopBody = build.updateLeadRequest({
            leadName: afterChanged.lead.lead_name,
            demandDescription: afterChanged.lead.demand_description,
            expectedVersion: version(afterChanged.lead),
        });
        const noop = await ctx.step(name('W5.actual-noop'), 'PATCH', path(lead.id), { json: noopBody });
        const afterNoop = await state(lead.id);
        const intelligence = await ctx.fillIntelligence(lead.id);
        const afterIntelligenceBeforeRefresh = await state(lead.id);
        const detailBeforeRefresh = await ctx.step(name('W5.detail-after-I-before-refresh'), 'GET', path(lead.id));
        const historyBeforeRefresh = await ctx.step(name('W5.history-after-I-before-refresh'), 'GET', path(lead.id, '/score-history'));
        const refreshBody = build.updateLeadRequest({
            leadName: leadName('after-real-I-refresh'),
            demandDescription: afterIntelligenceBeforeRefresh.lead.demand_description,
            expectedVersion: version(afterIntelligenceBeforeRefresh.lead),
        });
        const refreshed = await ctx.step(name('W5.changed-PATCH-after-real-I'), 'PATCH', path(lead.id), { json: refreshBody });
        const afterRefresh = await state(lead.id);
        const historyAfterRefresh = await ctx.step(name('W5.history-after-refresh'), 'GET', path(lead.id, '/score-history'));
        return {
            lead, before, patch1, changed, afterChanged, noopBody, noop, afterNoop,
            intelligence, afterIntelligenceBeforeRefresh, detailBeforeRefresh, historyBeforeRefresh,
            refreshBody, refreshed, afterRefresh, historyAfterRefresh,
            snapshotStringViews: {
                before: snapshotStrings(before.snapshots), afterChanged: snapshotStrings(afterChanged.snapshots),
                afterNoop: snapshotStrings(afterNoop.snapshots),
                afterIntelligenceBeforeRefresh: snapshotStrings(afterIntelligenceBeforeRefresh.snapshots),
                afterRefresh: snapshotStrings(afterRefresh.snapshots),
            },
            audits: { changed: await auditFor(changed), noop: await auditFor(noop), refreshed: await auditFor(refreshed) },
        };
    });

    await ctx.observe(name('Root-owned-attachment-copy-cuts-definition'), {
        kind: 'static-cut-definition-not-executed-by-this-module',
        source: 'lead.service.ts:379-391; attachment.service.ts:871-924; attachment.repository.ts:125-166',
        tables: ['lead', 'project', 'attachment', 'attachment_link', 'lead_score_snapshot', 'audit_log', 'business_number_sequence', 'auth_session'],
        setup: 'Root uses real upload/link producers for source Lead, including active latest, final-only nonlatest, inactive link/attachment and exact finance/internal-assessment category controls.',
        selection: [
            'Copy only active source links and active is_latest attachment; default query does not copy a final-only nonlatest version.',
            'Exclude exactly finance and internal-assessment; do not apply a substring/category permission rule.',
            'Existing active identical attachment/target/relation is skipped; new target relation is source; original Lead links remain.',
        ],
        cuts: [
            'Capture all parent/link/snapshot/audit/session writes between copy source reads and final explicit em.flush.',
            'Deny INSERT attachment_link, then INSERT audit_log at the attachment-copy audit stage, then INSERT lead_score_snapshot, each on a fresh real qualified Lead.',
            'Record the target project counter before/after, actual attempted versus unattempted SQL groups, full final Lead/Project/link graph, audit copiedCount/requestId and transaction/connection identities.',
            'Observe no-copy case: copy audit is not called when no eligible new links exist; do not manufacture an audit failure boundary there.',
        ],
        unknownOutcomes: 'Status, mid-flush point and rollback/commit surface require Root Native evidence; no result is asserted here.',
    });
}
