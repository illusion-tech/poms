// Root: observed pre-fix defects in a fresh owned database; never stage acceptance.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { openAcceptanceContext } from './acceptance-context02.mjs';
const ctx = await openAcceptanceContext({ backend: 'rust', tag: 'baseline01', phase: '03', runId: '12489848-1b79-44cd-8265-853e8ac76fe5' });
ctx.addSource('tools/rust-r3m/baseline-witness03.mjs');
fs.writeFileSync('tmp/rust-r3m/root/baseline-cohort03.json', JSON.stringify({ kind: 'R3-pre-fix-diagnostic-cohort', backend: 'rust', runId: ctx.runId, marker: ctx.identity.marker, tag: ctx.tag, stageAcceptanceEligible: false, cleanup: 'Pending-owned-terminal' }, null, 2) + '\n', { flag: 'wx' });
let completed = false, error = null;
try {
  ctx.ids.customerId = (await ctx.produceCustomer('baseline')).id;
  ctx.ids.sourceCode = (await ctx.db.query("select code from poms.dictionary_item where domain='lead-source' and status='active' order by sort_order,code limit 1")).rows[0].code;
  await ctx.observe('candidate-purpose', { preFixDiagnosticsOnly: true, countsNotFinalStagePasses: true });
  await ctx.case('baseline.customer-other-actor-business-noop', async () => {
    const before = await ctx.row('customer', ctx.ids.customerId);
    const response = await ctx.step('customer.noop.other', 'PATCH', '/api/customers/' + before.id, { actor: 'other', json: { remark: before.remark } }, 200);
    const after = await ctx.row('customer', before.id), audit = await ctx.audit(response.requestId);
    assert.equal(after.row_version, before.row_version + 1);
    assert.notEqual(after.updated_by, before.updated_by);
    // Actual baseline actor-only dirty write has zero audit; version change is the defect.
    return { expectedPreFixViolationObserved: true, invariantRequiredAfterFix: 'Same business values do not bump version/audit merely for another actor', before, response, after, audit };
  });
  await ctx.case('baseline.customer-uppercase-owner-org-immediate-view', async () => {
    const request = { displayName: 'R3CO upper org ' + ctx.runId.slice(0, 8), ownerOrgId: ctx.ids.adminOrgId.toUpperCase(), ownerUserId: ctx.ids.adminUserId };
    const created = await ctx.step('customer.upper.create', 'POST', '/api/customers', { json: request }, 201);
    // POST returns CustomerSummary; ownerOrgName is a detail/PATCH field.
    const patched = await ctx.step('customer.upper.PATCH', 'PATCH', '/api/customers/' + created.body.id, {json:{ownerOrgId:ctx.ids.adminOrgId.toUpperCase(),ownerUserId:ctx.ids.adminUserId}}, 200);
    const read = await ctx.step('customer.upper.GET', 'GET', '/api/customers/' + created.body.id, {}, 200);
    assert.equal(patched.body.ownerOrgName, null);
    assert.equal(typeof read.body.ownerOrgName, 'string'); assert(read.body.ownerOrgName.length > 0);
    return { expectedPreFixViolationObserved: true, request, created, patched, read };
  });
  for (const [table, route] of [['customer', '/api/customers/'], ['customer_contact', '/api/customer-contacts/']]) {
    await ctx.case('baseline.' + table + '-normal-CAS-conflict-is-500', async () => {
      const item = table === 'customer' ? await ctx.produceCustomer('race') : await ctx.produceContact(ctx.ids.customerId, 'race');
      const before = await ctx.row(table, item.id);
      await ctx.due('admin'); await ctx.due('other');
      const requests = ['admin', 'other'].map((actor, index) => ({ actor, method: 'PATCH', path: route + item.id, json: { remark: 'baseline race ' + index } }));
      const race = await ctx.concurrentOnRow(table, item.id, requests);
      assert.equal(race.waitingBeforeRelease, 2);
      assert.deepEqual(race.responses.map(r => r.status).sort((a, b) => a - b), [200, 500]);
      const after = await ctx.row(table, item.id), audits = await Promise.all(race.responses.map(r => ctx.audit(r.requestId)));
      assert.equal(after.row_version, before.row_version + 1);
      assert.deepEqual(audits.map(x => x.length).sort(), table === 'customer' ? [0, 0] : [0, 1]);
      return { expectedPreFixViolationObserved: true, invariantRequiredAfterFix: 'one successful commit and one business 409; loser has no necessary audit', before, requests, race, after, audits };
    });
  }
  let scoreLead, approved;
  await ctx.case('baseline.manual-system-score-and-breakdown-disagree', async () => {
    scoreLead = await ctx.produceLead('score-facts');
    const before = await ctx.row('lead', scoreLead.id);
    const realFacts = await ctx.fillIntelligence(scoreLead.id);
    const afterFacts = await ctx.row('lead', scoreLead.id);
    assert.equal(afterFacts.score, before.score, 'I does not automatically refresh stored Lead score');
    const submitted = await ctx.step('score.submit', 'POST', '/api/leads/' + scoreLead.id + '/score-overrides', { json: ctx.build.submitScoreOverrideRequest(afterFacts.row_version, { score: 95 }) }, 201);
    approved = await ctx.step('score.approve', 'POST', '/api/lead-score-overrides/' + submitted.body.id + ':approve', { json: ctx.build.approveScoreOverrideRequest(submitted.body.rowVersion) }, 200);
    const snapshot = (await ctx.rows('lead_score_snapshot', { lead_id: scoreLead.id }, 'created_at, id')).find(x => x.snapshot_kind === 'manual-override');
    assert(snapshot); assert.equal(snapshot.system_score, afterFacts.score);
    assert.notEqual(snapshot.component_breakdown.total, snapshot.system_score);
    return { expectedPreFixViolationObserved: true, before, realFacts, afterFacts, submitted, approved, snapshot };
  });
  await ctx.case('baseline.active-override-command-response-disagrees-with-GET', async () => {
    const response = await ctx.step('active.override.PATCH', 'PATCH', '/api/leads/' + scoreLead.id, { json: { leadName: 'R3CO changed ' + ctx.runId.slice(0, 8) } }, 200);
    const read = await ctx.step('active.override.GET', 'GET', '/api/leads/' + scoreLead.id, {}, 200);
    assert.equal(response.body.effectiveScoreSource, 'system');
    assert.equal(read.body.effectiveScoreSource, 'manual-override');
    assert.equal(read.body.activeScoreOverrideId, approved.body.id);
    return { expectedPreFixViolationObserved: true, response, read };
  });
  await ctx.case('baseline.source-derived-UI-date-only-request-is-rejected', async () => {
    const lead = await ctx.produceLead('date-only');
    await ctx.step('date.qualify', 'POST', '/api/leads/' + lead.id + ':qualify', { json: ctx.build.qualifyLeadRequest() }, 200);
    const before = await ctx.row('lead', lead.id), request = { projectName: 'R3CO date request', plannedSignAt: '2026-12-01' };
    const response = await ctx.step('date.convert.bad-original-ui-serialization', 'POST', '/api/leads/' + lead.id + ':convertToProject', { json: request }, 400);
    const after = await ctx.row('lead', lead.id); assert.deepEqual(after, before);
    return { observedRejectedOriginalUIRequest: true, realBrowserRun: false, sourceDerivedRequestOnly: true, fullUIStillRequired: true, before, request, response, after };
  });
  completed = true;
} catch (e) {
  error = { name: e.name, message: e.message.split('\n')[0] };
  fs.writeFileSync(ctx.directory + '/baseline-error-original.json', JSON.stringify({ name: e.name, message: e.message, stack: e.stack }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  process.exitCode = 1;
} finally { await ctx.finish(completed, error); }
