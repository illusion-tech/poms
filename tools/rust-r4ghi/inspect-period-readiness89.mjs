import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { createApi } from './business/http.mjs';
import { data } from './business/pure.mjs';
const ctx = createContext({ epoch: 'g2-business12', run: 'main01' }), lock = ctx.priv + '/driver.lock';
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'actual-period-readiness89-no-period-write' }) + '\n', { flag: 'wx', mode: 0o600 });
try {
  const calendar = await ctx.db(async client => (await client.query(`SELECT
    to_char(clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong','YYYY-MM-DD') AS today,
    to_char(clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong','IYYY-"W"IW') AS current_week,
    to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')-interval '1 week','IYYY-"W"IW') AS prior_week,
    to_char(date_trunc('week',clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')+interval '1 week','YYYY-MM-DD"T"HH24:MI:SS') AS next_week_local`)).rows[0]);
  const api = createApi(ctx); await api.login('manager'); const observations = [];
  for (const [kind, periodKey, expectedStatus] of [['completed-prior-week', calendar.prior_week, 200], ['incomplete-current-week', calendar.current_week, 400]]) {
    const response = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: ctx.state.fixtures.project.id }, null, 'manager',
      { expectedStatus, query: { view: 'preparation', intent: 'period-close', periodKey } });
    const value = data(response), preparation = value.preparation;
    if (expectedStatus === 200) assert(preparation?.kind === 'preparation-only' && preparation.intent === 'period-close' && preparation.periodKey === periodKey);
    observations.push({ kind, periodKey, actualHTTPStatus: response.status, receipt: response.receiptId,
      formalEligibility: preparation?.formalEligibility ?? null, blockingReasonCodes: preparation?.blockingReasonCodes ?? [],
      allowedCommandCodes: preparation?.allowedCommandCodes ?? [], selectedBaselinePackageRef: preparation?.selectedBaselinePackageRef ?? null,
      sourceRows: preparation?.sourceRows.map(row => ({ rowKind: row.rowKind, sourceKind: row.sourceRef?.kind, state: row.state, blockingReasonCodes: row.blockingReasonCodes })) ?? [],
      errorMessage: expectedStatus === 400 ? value.message : null });
  }
  const receipt = ctx.artifact(ctx.next('period-readiness89-complete') + '.json', { kind: 'actual-public-period-readiness89', calendar, observations,
    decision7AlreadyApproved: true, oldPendingToolLabelUsedAsAuthority: false, periodPOSTExecuted: false, periodProducerCertified: false,
    nextNaturalWeeklyBoundaryHongKong: calendar.next_week_local + '+08:00', G3Certified: false });
  ctx.state.consumerChecks89 = { periodReadiness: receipt }; ctx.persist();
  console.log(JSON.stringify({ receipt, calendar, observations: observations.map(item => ({ kind: item.kind, periodKey: item.periodKey, actualHTTPStatus: item.actualHTTPStatus, formalEligibility: item.formalEligibility, blockingReasonCodes: item.blockingReasonCodes })), periodPOSTExecuted: false, G3Certified: false }));
} catch (error) {
  const original = ctx.artifact(ctx.next('period-readiness89-partial') + '.json', { name: error.name, message: error.message, stack: error.stack }); ctx.persist();
  console.error(JSON.stringify({ status: 'failed-or-partial', privateOriginal: original })); process.exitCode = 1;
} finally { assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock); }
