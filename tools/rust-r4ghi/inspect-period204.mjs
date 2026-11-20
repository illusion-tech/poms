// Root-only actual preparation reads on the still-original Source13/H0.
// This performs auth and canonical preparation GETs, never a domain POST.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createContext } from './business/context.mjs';
import { createApi } from './business/http.mjs';
import { data } from './business/pure.mjs';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/business/g2-business13/main01';
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.platform, 'linux');
assert.equal(process.version, 'v24.19.0');
assert.deepEqual(process.argv.slice(2), ['--execute']);
assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
const nonce = randomUUID(), lock = D + '/driver.lock';
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'period204-preparation-only' }) + '\n', { flag: 'wx', mode: 0o600 });
let ctx;
try {
  ctx = createContext({ epoch: 'g2-business13', run: 'main01' });
  assert.equal(sha(JSON.stringify(ctx.pins)), '5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e');
  const h0 = fs.readFileSync(P + '/source13-preparation183/helperH0.json');
  assert.equal(sha(h0), 'e65db96998f5dc15ed406bf5d30b2a1bfa95c82affb448b625ca3295227d0459');
  assert.deepEqual(ctx.helperPins, JSON.parse(h0));
  assert.equal(ctx.state.apiProcess.rawBytesSha256, '0b5817a0f32f4ad12fce36a4035c59c06d852611f65891dec349e6eccf505f6f');
  assert(!ctx.state.activeFault && !ctx.state.blockedObservation && !ctx.state.cleaned && !ctx.state.cleanupPlan);
  assert(!ctx.state.periodReadiness204, 'Do not overwrite or blindly replay a prior observation');
  const projects = [
    { name: 'original-main', id: ctx.state.fixtures.project.id },
    { name: 'shared-receiver', id: '4d9e57ad-4890-4f53-80da-c6d224ce576b' },
    { name: 'actual-max-zero', id: ctx.state.fixtures.a05Boundaries26.views['max-zero'].fixtures.project.id },
  ];
  assert.deepEqual(projects.map(p => p.id), ['51d60c76-6de2-432a-8714-10e3ed3234f3', '4d9e57ad-4890-4f53-80da-c6d224ce576b', '7518a44d-1381-4e36-ba81-c6e595ea8666']);
  const calendar = await ctx.db(async client => (await client.query(`SELECT
    to_char(clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong','YYYY-MM-DD') AS today,
    to_char(clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong','IYYY-"W"IW') AS current_week,
    to_char((clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')-interval '1 week','IYYY-"W"IW') AS prior_week,
    to_char(date_trunc('week',clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong'),'YYYY-MM-DD"T"HH24:MI:SS') AS actual_week_start`)).rows[0]);
  assert.equal(calendar.current_week, '2026-W46'); assert.equal(calendar.prior_week, '2026-W45');
  const api = createApi(ctx); await api.login('manager');
  const observations = [];
  for (const project of projects) {
    const response = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: project.id }, null, 'manager',
      { query: { view: 'preparation', intent: 'period-close', periodKey: calendar.prior_week } });
    const preparation = data(response).preparation;
    assert(preparation?.kind === 'preparation-only' && preparation.intent === 'period-close' && preparation.periodKey === calendar.prior_week);
    const preparationPin = ctx.artifact(ctx.next('period204-preparation') + '.json', { project, calendar, responseReceipt: response.receiptId, preparation,
      normalPeriodWriteSent: false, candidateExecutable: false, sourceEligibilityFabricated: false, historicalBaselineReselectionApproved: false });
    observations.push({ project, actualHTTPStatus: response.status, responseReceipt: response.receiptId, preparation: preparationPin,
      formalEligibility: preparation.formalEligibility, blockingReasonCodes: preparation.blockingReasonCodes,
      allowedCommandCodes: preparation.allowedCommandCodes, selectedBaselinePackageRef: preparation.selectedBaselinePackageRef,
      sourceRows: preparation.sourceRows.map(row => ({ rowKind: row.rowKind, sourceKind: row.sourceRef?.kind, state: row.state, blockingReasonCodes: row.blockingReasonCodes })) });
    ctx.persist();
  }
  const result = { kind: 'actual-Source13-H0-period204-preparation-only', calendar, observations, sourcePinsSHA256: sha(JSON.stringify(ctx.pins)),
    helperH0SHA256: sha(h0), apiProcess: { file: ctx.state.apiProcess.file, rawBytesSha256: ctx.state.apiProcess.rawBytesSha256 },
    domainPOSTExecuted: false, normalPeriodCreateAndReadCertified: false, historicalBaselineReselectionApproved: false, G3Certified: false, G4Certified: false };
  const receipt = ctx.artifact(ctx.next('period204-complete') + '.json', result);
  ctx.state.periodReadiness204 = receipt; ctx.persist();
  console.log(JSON.stringify({ receipt, calendar, observations: observations.map(o => ({ project: o.project.name, actualHTTPStatus: o.actualHTTPStatus,
    formalEligibility: o.formalEligibility, blockingReasonCodes: o.blockingReasonCodes, sourceRowCount: o.sourceRows.length })), domainPOSTExecuted: false, G3Certified: false }));
} catch (error) {
  let partial = null;
  if (ctx) { partial = ctx.artifact(ctx.next('period204-partial') + '.json', { name: error.name, message: error.message, stack: error.stack }); ctx.persist(); }
  console.error(JSON.stringify({ completed: false, partial, message: ctx ? undefined : error.message, noBlindRetry: true })); process.exitCode = 1;
} finally {
  const owned = JSON.parse(fs.readFileSync(lock)); assert.equal(owned.pid, process.pid); assert.equal(owned.nonce, nonce); fs.unlinkSync(lock);
}
