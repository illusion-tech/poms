// Root-only post-R3 controlled negative verification. External to business H0.
// No HTTP/producer replay/parentless action/COMMIT. Every UPDATE is rolled back.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private', sha = value => createHash('sha256').update(value).digest('hex');
const assignmentTable = 'commission_role_assignment', participantTable = 'commission_role_assignment_participant';
const fields = Object.freeze({ assignment_id: 'uuid', user_id: 'uuid', role_type: 'text', weight_units: 'integer' });
export function buildM98FrozenNegatives(main, other, participants) {
  for (const row of [main, other]) { assert.equal(row.status, 'frozen'); assert.equal(row.producer_version, 1); assert.equal(row.freeze_payload_id, row.id); } assert.notEqual(main.id, other.id); assert.notEqual(main.project_id, other.project_id);
  const own = participants.filter(row => row.assignment_id === main.id), zero = own.find(row => row.weight_units === 0 && typeof row.zero_weight_reason === 'string' && row.zero_weight_reason.trim()), positive = own.find(row => row.weight_units > 0); assert(zero && positive);
  const otherUser = own.find(row => row.user_id !== zero.user_id), otherRole = own.find(row => row.role_type !== zero.role_type && !own.some(value => value.user_id === zero.user_id && value.role_type === row.role_type)); assert(otherUser && otherRole);
  return [
    { key: 'zero-reparent-frozen', participantId: zero.id, field: 'assignment_id', beforeValue: main.id, afterValue: other.id, message: 'assignment participant cannot be reparented' },
    { key: 'positive-reparent-frozen', participantId: positive.id, field: 'assignment_id', beforeValue: main.id, afterValue: other.id, message: 'assignment participant cannot be reparented' },
    { key: 'frozen-user', participantId: zero.id, field: 'user_id', beforeValue: zero.user_id, afterValue: otherUser.user_id, message: 'frozen assignment participants immutable' },
    { key: 'frozen-role', participantId: zero.id, field: 'role_type', beforeValue: zero.role_type, afterValue: otherRole.role_type, message: 'frozen assignment participants immutable' },
    { key: 'frozen-weight', participantId: zero.id, field: 'weight_units', beforeValue: 0, afterValue: 1, message: 'frozen assignment participants immutable' },
  ];
}
// Exported for fake-client sequencing tests. No connection is created on import.
// The only data-changing statement is whitelisted; its transaction has no COMMIT path.
export async function controlledAttemptM98(openClient, { mainId, otherId, probe, expectedParents, expectedParticipant }) {
  assert(Object.hasOwn(fields, probe.field)); assert.notEqual(mainId, otherId); assert.equal(expectedParents.length, 2);
  let client, failure = null, infrastructure = null, rollbackAttempted = false, rollbackSucceeded = false;
  try {
    client = await openClient(); await client.query('BEGIN');
    const parents = (await client.query('SELECT row_to_json(a)::text AS raw,a.xmin::text AS xmin FROM poms.commission_role_assignment a WHERE a.id=ANY($1::uuid[]) ORDER BY a.id FOR UPDATE OF a', [[mainId, otherId]])).rows;
    assert.equal(parents.length, 2); assert.deepEqual(parents.map(value => JSON.parse(value.raw).id), [mainId, otherId].sort());
    for (const locked of parents) {
      const row = JSON.parse(locked.raw), expected = expectedParents.find(value => value.key.length === 1 && value.key[0] === row.id); assert(expected);
      assert.equal(sha(locked.raw), expected.sha256); assert.equal(locked.xmin, expected.xmin); assert.equal(row.status, 'frozen'); assert.equal(row.producer_version, 1); assert.equal(row.freeze_payload_id, row.id);
    }
    const current = (await client.query('SELECT row_to_json(p)::text AS raw,p.xmin::text AS xmin FROM poms.commission_role_assignment_participant p WHERE p.id=$1::uuid AND p.assignment_id=$2::uuid FOR UPDATE OF p', [probe.participantId, mainId])).rows;
    assert.equal(current.length, 1); assert.equal(sha(current[0].raw), expectedParticipant.sha256); assert.equal(current[0].xmin, expectedParticipant.xmin);
    const row = JSON.parse(current[0].raw); assert.equal(row.id, probe.participantId); assert.equal(row.assignment_id, mainId); assert.equal(row[probe.field], probe.beforeValue);
    try { await client.query(`UPDATE poms.commission_role_assignment_participant SET ${probe.field}=$1::${fields[probe.field]} WHERE id=$2::uuid AND assignment_id=$3::uuid`, [probe.afterValue, probe.participantId, mainId]); }
    catch (error) { failure = { code: error.code, message: error.message }; }
  } catch (error) { infrastructure = { name: error.name, code: error.code, message: error.message }; }
  finally {
    if (client) {
      rollbackAttempted = true;
      try { await client.query('ROLLBACK'); rollbackSucceeded = true; } catch (error) { infrastructure ??= { name: error.name, code: error.code, message: error.message }; }
      try { await client.end(); } catch (error) { infrastructure ??= { name: error.name, code: error.code, message: error.message }; }
    }
  }
  return { failure, infrastructure, rollbackAttempted, rollbackSucceeded, commitAttempted: false };
}
export function assertControlledFailureM98(result, message) {
  assert.equal(result.infrastructure, null); assert.equal(result.rollbackAttempted, true); assert.equal(result.rollbackSucceeded, true); assert.equal(result.commitAttempted, false);
  assert(result.failure, 'Unexpected success was rolled back; it must never be certified as a guard rejection'); assert.equal(result.failure.code, '23514'); assert.equal(result.failure.message, message);
}
async function runExternal(planFile, expectedSHA) {
  assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.equal(fs.realpathSync(process.execPath), '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node'); assert.deepEqual(process.execArgv, []); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
  const planStat = fs.lstatSync(planFile); assert(planStat.isFile() && !planStat.isSymbolicLink() && planStat.nlink === 1); assert.equal(fs.realpathSync(planFile), path.resolve(planFile));
  const raw = fs.readFileSync(planFile); assert.equal(sha(raw), expectedSHA); const plan = JSON.parse(raw); assert.equal(plan.kind, 'Root-approved-external-M98-frozen-negative-probes'); assert.equal(plan.epoch, 'g2-business13'); assert.equal(plan.run, 'main01'); assert.equal(plan.actualInputsComplete, true); assert.equal(plan.parentlessOrCommitWindow, false); assert.equal(plan.G3Certified, false);
  const load = async name => import(pathToFileURL(R + '/tools/rust-r4ghi/business/' + name + '.mjs').href), { createContext } = await load('context'), { capture, readRows } = await load('snapshot'), { assertRecorded } = await load('ledger'), { assertSweepRollback } = await load('fault-sweep'), { readPin54 } = await load('consumer-admission54'), { plBody108 } = await load('schema-comparison108'), { keyOf, uuid } = await load('pure');
  const read = pin => JSON.parse(readPin54(pin)); const approval = read(plan.approval); assert.equal(plan.approval.file, R + '/docs/design/rust-r4ghi/source13-g2-freeze136.json'); assert.equal(approval.G2Authorized, true);
  const ownPin = { file: R + '/tools/rust-r4ghi/probe-m98-frozen-external.mjs', rawBytesSha256: sha(fs.readFileSync(R + '/tools/rust-r4ghi/probe-m98-frozen-external.mjs')) }; assert.deepEqual(approval.supportingTools.postM98FrozenNegative, ownPin);
  const ctx = createContext({ epoch: plan.epoch, run: plan.run }); assert.equal(ctx.migrations, 98); assert.equal(ctx.tables, 139); assert.equal(sha(JSON.stringify(ctx.pins)), plan.sourcePinsSHA256); assert.deepEqual(read(plan.helperH0), ctx.helperPins); assert.deepEqual(ctx.state.consumerAdmission54.registry, plan.registry); assert.equal(ctx.state.apiProcess.file, plan.apiProcess.file); assert.equal(ctx.state.apiProcess.rawBytesSha256, plan.apiProcess.rawBytesSha256); assert.deepEqual(read(plan.apiProcess), ctx.state.apiProcess.record); assert(!ctx.state.processRestart1351); assert(!ctx.state.activeFault && !ctx.state.blockedObservation && !ctx.state.cleaned && !ctx.state.cleanupPlan);
  const relativePlan = path.relative(fs.realpathSync(ctx.priv), fs.realpathSync(planFile)); assert(relativePlan && relativePlan !== '..' && !relativePlan.startsWith('..' + path.sep) && !path.isAbsolute(relativePlan));
  assert(/^[A-Za-z][A-Za-z0-9_-]{0,30}$/.test(plan.phase)); const priorM97 = structuredClone(ctx.state.consumerChecks?.frozenReparent58), oldProof = ctx.state.consumerChecks?.frozenReparent58?.['1817b9ae-ec3a-4910-aebd-07a2b6963975']?.proof; assert(oldProof); assert.deepEqual(oldProof, plan.originalM97Proof); readPin54(oldProof);
  const mainId = uuid(plan.mainAssignmentId), otherId = uuid(plan.otherAssignmentId); assert.equal(mainId, '4fb574d1-1552-4a8a-8340-175d2da12b84'); assert.equal(otherId, '1817b9ae-ec3a-4910-aebd-07a2b6963975');
  const lock = ctx.priv + '/driver.lock', nonce = randomUUID(); fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'external-M98-frozen-negative', phase: plan.phase }) + '\n', { flag: 'wx', mode: 0o600 });
  try {
    ctx.state.consumerChecks ??= {}; ctx.state.consumerChecks.m98FrozenExternal ??= {}; assert(!ctx.state.consumerChecks.m98FrozenExternal[plan.phase], 'Interrupted/complete actual stage cannot be blindly rerun');
    const record = ctx.state.consumerChecks.m98FrozenExternal[plan.phase] = { kind: plan.kind, plan: { file: planFile, rawBytesSha256: expectedSHA }, originalM97Proof: plan.originalM97Proof, cases: {} }; ctx.persist();
    const initial = await capture(ctx, ctx.next('m98fz-initial')); assertRecorded(ctx, initial); const rows = name => readRows(initial.databases[ctx.database].tables[name]);
    const exactOwned = (table, id) => { const row = rows(table).find(value => value.key.length === 1 && value.key[0] === id), owned = ctx.state.owned[keyOf(ctx.database, table, [id])]; assert(row && owned && !owned.deleted && owned.latestSha256 === row.sha256 && owned.latestXmin === row.xmin); return row; };
    const main = JSON.parse(exactOwned(assignmentTable, mainId).raw), other = JSON.parse(exactOwned(assignmentTable, otherId).raw); for (const item of [main, other]) assert.equal(JSON.parse(exactOwned('commission_role_assignment_freeze_payload', item.id).raw).project_id, item.project_id);
    const probes = buildM98FrozenNegatives(main, other, rows(participantTable).map(row => JSON.parse(row.raw))); for (const probe of probes) exactOwned(participantTable, probe.participantId);
    const normative = initial.databases[ctx.database].meta.normative, functionRaw = normative.functions.find(value => { const fn = JSON.parse(value); return fn.schema === 'poms' && fn.proname === 'jghi_assignment_participant_guard' && fn.arguments === ''; }); assert(functionRaw); const definition = JSON.parse(functionRaw);
    const triggerRaw = normative.triggers.find(value => { const trigger = JSON.parse(value); return trigger.schema === 'poms' && trigger.table_name === participantTable && trigger.tgname === 'jghi_frozen_participant' && trigger.tgenabled === 'O'; }); assert(triggerRaw);
    assert.equal(sha(plBody108(definition.definition)), sha(plBody108(readPin54(approval.forwardMigration.migrationSQL).toString())), 'Must be the real approved M98 body, not the old M97 guard');
    record.actualGuard = { snapshot: initial.manifest, functionSHA256: sha(functionRaw), bodySHA256: sha(plBody108(definition.definition)), triggerSHA256: sha(triggerRaw) }; ctx.persist();
    for (const [index, probe] of probes.entries()) {
      const before = await capture(ctx, ctx.next('m98fz-c' + (index + 1) + '-before')); assertRecorded(ctx, before); record.cases[probe.key] = { phase: 'starting', before: before.manifest }; ctx.persist();
      const parentRows = readRows(before.databases[ctx.database].tables[assignmentTable]).filter(value => [mainId, otherId].includes(value.key[0])), expectedParticipant = readRows(before.databases[ctx.database].tables[participantTable]).find(value => value.key[0] === probe.participantId); assert(expectedParticipant);
      const result = await controlledAttemptM98(() => ctx.client(), { mainId, otherId, probe, expectedParents: parentRows, expectedParticipant });
      const after = await capture(ctx, ctx.next('m98fz-c' + (index + 1) + '-after')), observation = ctx.artifact(ctx.next('m98fz-observation') + '.json', { probe, before: before.manifest, after: after.manifest, ...result, parentsLockedFirst: true }); record.cases[probe.key] = { phase: 'proof-pending', observation }; ctx.persist();
      try { assertControlledFailureM98(result, probe.message); const rollback = assertSweepRollback(ctx, before, after, { sessionId: null }, null); assertRecorded(ctx, after); record.cases[probe.key] = { phase: 'verified', observation, rollback }; ctx.persist(); } catch (error) { ctx.state.blockedObservation = observation; ctx.persist(); throw error; }
    }
    assert.deepEqual(ctx.state.consumerChecks.frozenReparent58, priorM97); record.proof = ctx.artifact(ctx.next('m98fz-complete') + '.json', { kind: 'actual-Source13-post-M98-parent-locked-frozen-negative-probes', sourcePinsSHA256: plan.sourcePinsSHA256, registry: plan.registry, apiProcess: plan.apiProcess, actualCaseCount: 5, mainAssignmentId: mainId, otherAssignmentId: otherId, actualGuard: record.actualGuard, originalM97Proof: oldProof, originalM97EvidenceUnmodified: true, cases: record.cases, allParentLocksBeforeParticipantUpdate: true, allAttemptsRolledBack: true, HTTPRequests: 0, producerCommandsReplayed: false, G3Certified: false }); ctx.persist(); return record.proof;
  } finally { const owner = JSON.parse(fs.readFileSync(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); fs.unlinkSync(lock); }
}
async function main() { if (process.argv.includes('--help')) { process.stdout.write('Root post-R3 external guard check only: --plan <private.json> --approved-plan-sha <SHA> --execute\nTwo actual owned frozen parents first, exact participant raw/xmin, only always-ROLLBACK negative UPDATEs. No HTTP/COMMIT/parentless window.\n'); return; } const args = process.argv.slice(2); assert.equal(args.length, 5); assert.equal(args[0], '--plan'); assert.equal(args[2], '--approved-plan-sha'); assert.equal(args[4], '--execute'); process.stdout.write(JSON.stringify({ proof: await runExternal(args[1], args[3]), G3Certified: false }) + '\n'); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
