import {currentRuntime121,assertCurrentLease121,runtimeReference121,trustedSummaryBinary121} from './runtime-admission121.mjs';
// Root-authorized non-HTTP R3 CommonService seam. No SQL business fixture writer.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { ownedFile } from './context.mjs';
import { sha, uuid } from './pure.mjs';
import { capture } from './snapshot.mjs';
import { assertRecorded, reconcileAttempt } from './ledger.mjs';
import { currentCodeRegistry15, trustedSummaryBinary15 } from './source15-admission.mjs';
import { currentCodeRegistry252, trustedSummaryBinary252 } from './same-m98-code-admission252.mjs';

// Source14 selects Common only through its actual typed code-admission artifact.
export function source14Summary257(ctx) {
  assert.equal(ctx.epoch, 'g2-business14');
  const registry = currentCodeRegistry252(ctx, { liveProcess: true, sourceFiles: true });
  assert.equal(registry.schemaVersion, 4);
  const pin = trustedSummaryBinary252(ctx, registry);
  assert.equal(pin.file, registry.consumer.trustedSummaryBinary.file);
  assert.equal(pin.rawBytesSha256, registry.consumer.trustedSummaryBinary.rawBytesSha256);
  return pin;
}


export function source15Summary119(ctx) {
  assert.equal(ctx.epoch, 'g2-business15');
  if(Object.hasOwn(ctx.state,'runtimeAdmission121'))return trustedSummaryBinary121(ctx);
  const registry = currentCodeRegistry15(ctx, { liveProcess: true, sourceFiles: true });
  assert.equal(registry.schemaVersion, 5); return trustedSummaryBinary15(ctx, registry);
}

export async function produceActualSummary(ctx) {
  const lease121=Object.hasOwn(ctx.state,'runtimeAdmission121')?currentRuntime121(ctx):null;
  const f = ctx.state.fixtures; assert(f.projectSourcesComplete && f.summaryInput && !f.summary);
  assert(!ctx.state.cleaned && !ctx.state.cleanupPlan && !ctx.state.blockedObservation);
  const source = `${ctx.win}/apps/poms-api-rust/examples/r4ghi_summary_producer08.rs`;
  const mirrorSource = `${ctx.mirror}/apps/poms-api-rust/examples/r4ghi_summary_producer08.rs`;
  const selected15 = ctx.epoch === 'g2-business15' ? source15Summary119(ctx) : null;
  const selected14 = ctx.epoch === 'g2-business14' ? source14Summary257(ctx) : null;
  const binary = selected15 ? selected15.file : selected14 ? selected14.file : '/home/wangzishi/.cache/poms-r4ghi-target-ROOT/debug/examples/r4ghi_summary_producer08';
  const sourceBytes = ownedFile(source), mirrorBytes = ownedFile(mirrorSource);
  const binaryStat = fs.lstatSync(binary); assert(binaryStat.isFile() && !binaryStat.isSymbolicLink()); assert.equal(fs.realpathSync(binary), binary);
  const binaryBytes = fs.readFileSync(binary); // Cargo may hard-link its binary artifact to its own deps output.
  if (selected15) assert.equal(sha(binaryBytes), selected15.rawBytesSha256);
  if (selected14) assert.equal(sha(binaryBytes), selected14.rawBytesSha256);
  assert.equal(sha(sourceBytes), sha(mirrorBytes), 'Trusted seam build source differs from review source');
  const text = sourceBytes.toString('utf8');
  assert(text.includes('const NAMESPACE: &str = "poms-r4ghi"') && text.includes(`const BASE: &str = "${ctx.base}"`) && text.includes('r4ghi_control.marker'));
  assert(text.includes('"poms_r4ghi_rust_app"') && text.includes('"poms_r4ghi_rust"') && text.includes('25434') && text.includes('ApprovalCommonService::new'));
  const pins = { source: { file: source, rawBytesSha256: sha(sourceBytes) }, mirrorSource: { file: mirrorSource, rawBytesSha256: sha(mirrorBytes) }, binary: { file: binary, rawBytesSha256: sha(binaryBytes) } };
  if (selected15) {
    if (ctx.state.trustedSummarySeam15) assert.deepEqual(ctx.state.trustedSummarySeam15, pins); else ctx.state.trustedSummarySeam15 = pins;
  } else if (selected14) {
    if (ctx.state.trustedSummarySeam14) assert.deepEqual(ctx.state.trustedSummarySeam14, pins); else ctx.state.trustedSummarySeam14 = pins;
  } else {
  if (ctx.state.trustedSummarySeam) assert.deepEqual(ctx.state.trustedSummarySeam, pins); else ctx.state.trustedSummarySeam = pins;
  }
  const input = ownedFile(f.summaryInput.file); assert.equal(sha(input), f.summaryInput.rawBytesSha256);
  const request = JSON.parse(input); assert.equal(request.expectedInstanceId, ctx.identity.marker); assert.equal(request.actorId, ctx.state.actors.manager.id);
  assert.equal(request.projectId, f.project.id); assert.equal(request.costPackageId, f.cost.id); assert.equal(request.baselineId, f.baseline.id);
  const label = ctx.next('trusted-summary'), before = await capture(ctx, `${label}-before`); assertRecorded(ctx, before);
  ctx.artifact(`${label}-intent.json`, { kind: 'actual-trusted-internal-CommonService-attempt', input: f.summaryInput, pins, before: before.manifest, HTTP: false, createsApproval: false }); ctx.persist();
  const envFile = `${ctx.private}/rust.env`; ownedFile(envFile);
  const env = { PATH: '/home/wangzishi/.cargo/bin:/usr/bin:/bin', HOME: '/home/wangzishi', USER: 'wangzishi', LANG: 'C.UTF-8', POMS_ENV_FILE: envFile };
  const reference121=lease121?runtimeReference121(ctx,lease121):null;
  const execution = spawnSync(binary, [f.summaryInput.file], { cwd: ctx.mirror, env, encoding: null, timeout: 55000, maxBuffer: 16_000_000, windowsHide: true });
  const stdout = ctx.artifact(`${label}-stdout.bin`, execution.stdout ?? Buffer.alloc(0)), stderr = ctx.artifact(`${label}-stderr.bin`, execution.stderr ?? Buffer.alloc(0));
  if(lease121){ctx.artifact(ctx.next('trusted-runtime121-outcome')+'.json',{runtimeReference121:reference121,exitCode:execution.status,signal:execution.signal,stdout,stderr});ctx.persist();assertCurrentLease121(ctx,lease121);}
  if (execution.error) ctx.artifact(`${label}-process-failure.json`, { name: execution.error.name, message: execution.error.message, stack: execution.error.stack });
  let body = null; try { body = JSON.parse((execution.stdout ?? Buffer.alloc(0)).toString('utf8')); } catch { /* Exact originals are retained. */ }
  const after = await capture(ctx, `${label}-after`);
  const attempt = { operationId: 'INTERNAL_ApprovalCommonService_actualSummary', transport: 'trusted-internal-service', requestId: `${ctx.state.prefix}-${label}`, status: execution.status,
    expectedStatus: 0, responseComplete: execution.status === 0 && !execution.error, body };
  const ledger = await reconcileAttempt(ctx, before, after, attempt, { responseBirths: [
    { table: 'approval_summary_snapshot', pointer: '/summarySnapshotId' },
    { table: 'approval_summary_package_definition', pointer: '/definitionId' },
  ] });
  assert.equal(execution.status, 0, 'Actual CommonService producer failed; inspect private raw streams');
  assert(body?.outerCommitAcknowledged === true && body.traceIncomplete === false && body.poolClosed === true && body.createsApproval === false && body.rawMaterialsStoredInSummary === false);
  uuid(body.summarySnapshotId); assert.equal(body.trustedInternalActorId, ctx.state.actors.manager.id);
  assert.deepEqual([body.materialReferences?.projectId, body.materialReferences?.costPackageId, body.materialReferences?.baselineId], [f.project.id, f.cost.id, f.baseline.id]);
  f.summary = { receipt: stdout, ledger, pins, producerTransport: 'actual-trusted-internal-service', HTTP: false, createsApproval: false }; ctx.persist();
  ctx.artifact(`${label}-complete.json`, { stdout, stderr, ledger, actualExitCode: execution.status, summarySnapshotId: body.summarySnapshotId, createTrace: body.createTrace },
    { kind: 'actual-CommonService-material-summary-produced', actualExitCode: execution.status, outerCommitAcknowledged: true, HTTP: false, approvalPretended: false, actualHTTPCount: 0 });
  return { kind: 'actual-trusted-CommonService-summary', completed: true, output: stdout, ledger, HTTP: false, createsApproval: false, nextStage: 'contract-prepare', G3Certified: false, G4Certified: false };
}
