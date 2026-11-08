import { createRolePolicy18 as createWritePolicy } from './ui-role18-policy.mjs';
import { actualSpareRecord, recordActualUIReceipt, fixtureFactsHash } from './ui-role18-fixtures.mjs';
import { bindActualContext, validateBindingShape } from '../H/implementation/support-patches/ui-integration/runtime13/binding13.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveCases, fixturePointer } from './ui-role18-fixtures.mjs';
import { startRecordedServer } from '../H/implementation/support-patches/ui-integration/runtime14/server14.mjs';
import { fixed, sha, jsonBytes, readJson, validatePlanIdentity, readPinned, writeNew, atomicJson, resolveOperation, cookieMap } from '../H/implementation/support-patches/ui-integration/runtime14/dom-common14.mjs';

async function execute(plan, planFile, approvedBindingSHA256) {
  assert.equal(process.platform, 'linux'); const locations = validatePlanIdentity(plan); assert.equal(path.resolve(planFile), locations.linuxPlan);
  const bindingBytes=fs.readFileSync(locations.linuxBinding); assert.equal(sha(bindingBytes),approvedBindingSHA256); const binding=validateBindingShape(JSON.parse(bindingBytes)); assert.equal(binding.epoch,plan.epoch); assert.equal(binding.run,plan.run);
  assert(typeof plan.linuxNodeExecutable === 'string' && path.isAbsolute(plan.linuxNodeExecutable)); assert.equal(fs.realpathSync(process.execPath), fs.realpathSync(plan.linuxNodeExecutable));
  for (const item of plan.sourceBases) readPinned(path.join(fixed.linuxRoot, item.file), item.rawBytesSha256);
  assert(!fs.existsSync(locations.linuxIPC) && !fs.existsSync(locations.linuxPublic), 'Never reuse actual run originals');
  fs.mkdirSync(locations.linuxIPC, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(locations.linuxIPC), locations.linuxIPC);
  fs.mkdirSync(locations.linuxPublic, { recursive: true }); fs.mkdirSync(`${locations.linuxIPC}/commands`, { mode: 0o700 }); fs.mkdirSync(`${locations.linuxIPC}/acks`, { mode: 0o700 });
  const nonce = randomBytes(32).toString('hex'), lock = `${fixed.stateRoot}/private/business/${plan.epoch}/${plan.run}/driver.lock`;
  writeNew(lock, { pid: process.pid, mode: 'H-ui-runtime14', nonce });
  let ctx, proxy, label, activeCase = null, activePolicy = null, nextCase = 0, stopped = false, successfulFinish = false;
  let successfulUICreate23 = null;
  const actualCases = [], receipts = [], report = { schemaVersion: 1, namespace: fixed.namespace, epoch: plan.epoch, run: plan.run, uiRun: plan.uiRun, origin: fixed.origin, backendPort: fixed.apiPort, status: 'failed', actualDOMExecuted: false, G3Certified: false, G4Certified: false };
  try {
    const helper = async name => import(pathToFileURL(`${fixed.linuxRoot}/tools/rust-r4ghi/business/${name}.mjs`).href);
    const { createContext } = await helper('context'), { createApi } = await helper('http'), { capture, readRows, difference } = await helper('snapshot'), { assertRecorded, reconcileAttempt } = await helper('ledger');
    ctx = createContext({ epoch: plan.epoch, run: plan.run, 'api-process-record': binding.apiProcess.file }); assert(ctx.state.baseline && !ctx.state.blockedObservation && !ctx.state.activeFault && !ctx.state.cleanupPlan && !ctx.state.cleaned);
    const api = createApi(ctx); report.actualSourceBinding=bindActualContext(ctx,binding,approvedBindingSHA256,bindingBytes); assert.equal(sha(Buffer.from(JSON.stringify(plan.writeActions))),binding.writeActionsSHA256,'Root must review exact UI write actions as part of closed binding'); const fixturesBefore = fixtureFactsHash(ctx), pinsBefore = sha(jsonBytes(ctx.state.sourcePins));
    const cases = resolveCases(ctx, plan.cases).map((test, index) => ({ ...test, actorKey: plan.cases[index].actorKey }));
    const eo=cases.find(test=>test.kind==='execution-owner'), own=cases.find(test=>test.kind==='own-condition'); if(eo&&own) assert.notEqual(eo.projectId,own.projectId,'EO pre-execution and Own pending completion require distinct actual chains');
    const legacy=cases.find(test=>test.kind==='legacy-anchor'); if(legacy){ const qualified=binding.compatibilityFixtures?.find(value=>value.kind==='legacy-anchor'&&value.projectId===legacy.projectId); assert(qualified&&qualified.qualification==='controlled-compatibility-negative'&&qualified.businessProducer===false,'Legacy requires exact controlled-negative qualification; never claim a modern producer'); const raw=fs.readFileSync(qualified.seedReceipt.file); assert.equal(sha(raw),qualified.seedReceipt.rawBytesSha256); report.legacyQualification='controlled-compatibility-negative'; } label = ctx.next('H-ui-runtime14'); ctx.persist();
    const deadline = Date.now() + plan.overallTimeoutSeconds * 1000; assert(Number.isInteger(plan.overallTimeoutSeconds) && plan.overallTimeoutSeconds >= 60 && plan.overallTimeoutSeconds <= 3600);
    const publish = value => atomicJson(`${locations.linuxIPC}/exchanges.json`, { schemaVersion: 1, nonce, ...value });
    const beforeRequest = async request => {
      assert(activeCase !== null && !ctx.state.blockedObservation, 'No API outside the actual active case');
      const test = cases[activeCase], actor = ctx.state.actors[test.actorKey]; assert(actor?.id === test.actor.id);
      const cookies = cookieMap(request.headers.cookie); assert.equal(cookies.poms_session, actor.cookies.poms_session, 'Actual browser cookie is not the bound actor');
      const operation = resolveOperation(api.operations, request.method, request.path), requestLabel = ctx.next('ui10-http'), requestId = `${ctx.state.prefix}-${requestLabel}-${randomUUID().slice(0, 8)}`;
      const before = await capture(ctx, `${requestLabel}-before`); assertRecorded(ctx, before);
      const isWrite=!['GET','HEAD'].includes(request.method); if(!isWrite){assert(activePolicy);activePolicy.admitRead({operationId:operation.operationId,params:operation.pathParams,rawPath:request.path});} const requestValue=isWrite && /application\/json/i.test(String(request.headers['content-type']))?JSON.parse(request.body.toString('utf8')):null; const writeAdmission=isWrite?(assert(activePolicy,'No business write in a readonly case'),activePolicy.admit({operationId:operation.operationId,params:operation.pathParams,method:request.method,body:requestValue,bytes:request.body,before})):null;
      const intent = ctx.artifact(`${requestLabel}-browser-request.json`, { ...request, body: undefined, bodyBase64: request.body.toString('base64'), actorKey: test.actorKey, requestId, operationId: operation.operationId, pathParams: operation.pathParams, before: before.manifest });
      let publicRoleRace23 = null;
      if(operation.operationId==='CommissionRoleAssignmentController_freezeRoleAssignment'&&activePolicy?.action.publicRevisedDraftRace){
        assert(successfulUICreate23,'The peer revision must use this actual successful UI create');
        assert(plan.sourceBases.some(pin=>pin.file==='tools/rust-r4ghi/business/ui-role-public-race23.mjs'));
        const {beginPublicRoleRace23}=await import(pathToFileURL(fixed.linuxRoot+'/tools/rust-r4ghi/business/ui-role-public-race23.mjs').href);
        publicRoleRace23=await beginPublicRoleRace23(ctx,api,{scene:activePolicy.scene,action:activePolicy.action,before,freezeInput:requestValue,requestId,successfulCreate:successfulUICreate23,boundActorKeys:report.actualSourceBinding.actorKeys});
      }
      return { ...operation, before, requestLabel, requestId, actorKey: test.actorKey, actorId: actor.id, method: request.method, intent, requestValue, requestBodySHA256:sha(request.body), writeAdmission, publicRoleRace23 };
    };
    const afterResponse = async ({ observation, upstream, bytes, failure }) => {
      if(observation.publicRoleRace23) await observation.publicRoleRace23.settleBeforeCapture();
      const actor = ctx.state.actors[observation.actorKey];
      for (const cookie of upstream.headers['set-cookie'] ?? []) {
        const first = cookie.split(';', 1)[0], at = first.indexOf('='); assert(at > 0); const key = first.slice(0, at); assert(['poms_session', 'poms_csrf'].includes(key));
        if (/max-age=0/i.test(cookie)) delete actor.cookies[key]; else actor.cookies[key] = first.slice(at + 1);
      }
      ctx.persist(); let body = null; try { body = bytes.length ? JSON.parse(bytes) : null; } catch { /* Real binary attachment remains in the private raw tape. */ }
      const attempt = { operationId: observation.operationId, requestId: observation.requestId, actorKey: observation.actorKey, actorId: observation.actorId, pathParams: observation.pathParams,
        requestValue: observation.requestValue, requestBodySha256: observation.requestBodySHA256, status: upstream.status, expectedStatus: api.success(observation.operationId), responseComplete: upstream.complete === true, transportFailure: Boolean(failure), body, transport: 'actual-owned-Windows-browser-Linux-proxy' };
      const originals = ctx.artifact(`${observation.requestLabel}-browser-response.json`, { attempt, bodyBase64: bytes.toString('base64'), failure });
      const after = await capture(ctx, `${observation.requestLabel}-after`), changes=difference(observation.before,after);
      let policyError=null, exactBinding=observation.writeAdmission?.binding ?? {};
      if(observation.writeAdmission){try{activePolicy.validateMutationRows(changes);}catch(error){policyError=error;exactBinding={...exactBinding,mutableTables:[],updatedAnchors:[]};}}
      const ledger = await reconcileAttempt(ctx, observation.before, after, attempt, exactBinding);
      if(policyError) throw policyError;
      if(observation.writeAdmission){
        assert.equal(attempt.status,attempt.expectedStatus,'Exact canonical write response status required; no status widening');
        activePolicy.observeWrite(observation.operationId,body,after,changes);
        if(observation.operationId==='CommissionController_createRoleAssignment'&&activePolicy.action.frozenReparentProbe===true){
          for(const file of ['tools/rust-r4ghi/business/frozen-reparent58.mjs','tools/rust-r4ghi/business/frozen-reparent-sources58.json'])assert(plan.sourceBases.some(pin=>pin.file===file),'Optional probe runtime and actual Rust/M95 source-lock JSON must both be in the reviewed helper closure');
          const {probeFrozenReparent58}=await import(pathToFileURL(`${fixed.linuxRoot}/tools/rust-r4ghi/business/frozen-reparent58.mjs`).href);
          const proof=await probeFrozenReparent58(ctx,{draftAssignmentId:body.id,projectId:activePolicy.scene.projectId,createReceipt:originals,createLedger:ledger});
          ctx.state.consumerChecks??={};ctx.state.consumerChecks.uiRoleFrozenReparent58=proof;ctx.persist();
        }
        if(observation.operationId==='CommissionController_createRoleAssignment') successfulUICreate23={attempt,originals,ledger};
        if(observation.publicRoleRace23) await observation.publicRoleRace23.verifyAfterLedger({attempt,originals,ledger,after});
        if(activePolicy.completed()) recordActualUIReceipt(ctx,{scene:activePolicy.scene,action:activePolicy.action,operationId:observation.operationId,ledger,originals,writes:structuredClone(activePolicy.cache.writes)});
      }else if(activePolicy && attempt.status===200) activePolicy.observeRead(observation.operationId,body,{headers:upstream.headers});
      const publicReceipt = `${observation.requestLabel}-browser-http.json`;
      ctx.public(publicReceipt, { kind: 'actual-Windows-browser-HTTP-and-exact-Linux-observer', operationId: attempt.operationId, requestId: attempt.requestId, actorKey: attempt.actorKey, method: observation.method,
        canonicalTemplate: observation.item.template, querySHA256: observation.querySHA256, status: attempt.status, responseComplete: attempt.responseComplete, transportFailure: attempt.transportFailure, intent: observation.intent, originals, before: observation.before.manifest, after: after.manifest, ledger, noRawCredentialsPublished: true, G3Certified: false });
      receipts.push({ operationId: attempt.operationId, actorKey: attempt.actorKey, status: attempt.status, ledger, publicReceipt });
      assert(!failure && attempt.responseComplete, 'Actual browser transport incomplete; committed effects retained and reconciled');
      return ledger;
    };
    proxy = await startRecordedServer({ directory: `${fixed.linuxRoot}/dist/apps/poms-admin/browser`, privateDirectory: `${locations.linuxIPC}/http`, nonce, beforeRequest, afterResponse, publish });
    report.build = proxy.build; report.caseKinds = cases.map(test => test.kind);
    const stat = fs.readFileSync('/proc/self/stat', 'utf8');
    writeNew(`${locations.linuxIPC}/ready.json`, { schemaVersion: 1, namespace: fixed.namespace, nonce, planSHA256: sha(fs.readFileSync(planFile)), origin: fixed.origin, build: proxy.build,
      owner: { pid: process.pid, startTime: stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], executable: fs.realpathSync('/proc/self/exe'), executableSHA256: sha(fs.readFileSync('/proc/self/exe')) }, cases: cases.map(test => ({ kind: test.kind, actorKey: test.actorKey })) });
    const processed = new Set();
    while (!stopped && Date.now() < deadline) {
      for (const file of fs.readdirSync(`${locations.linuxIPC}/commands`).filter(name => /^\d{4}\.json$/.test(name)).sort()) {
        if (processed.has(file)) continue; const command = readJson(`${locations.linuxIPC}/commands/${file}`); assert.equal(command.nonce, nonce);
        await proxy.settle();
        if (command.action === 'begin') {
          assert.equal(activeCase, null); assert.equal(command.index, nextCase); assert(cases[command.index]); activeCase = command.index;
          const test = cases[activeCase], actor = ctx.state.actors[test.actorKey], configured=plan.writeActions.find(value=>value.kind===test.kind);
          assert(report.actualSourceBinding.actorKeys.includes(test.actorKey),'Every browser actor must be in the actual reviewed manifest');
          if(['role-forms'].includes(test.kind)) assert(configured,'Required closure scene cannot run as readonly DOM');
          let writeAction=null;
          if(configured){assert(['role-forms'].includes(test.kind));assert.equal(configured.actorKey,test.actorKey);writeAction={...configured};test.boundActors=Object.fromEntries(configured.participants.map(row=>{assert(report.actualSourceBinding.actorKeys.includes(row.actorKey));const actor=ctx.state.actors[row.actorKey];assert(actor);return[row.actorKey,{id:actor.id}];}));actualSpareRecord(ctx,test,writeAction);activePolicy=createWritePolicy({ctx,scene:test,action:writeAction,readRows});}else activePolicy=null;
          writeNew(`${locations.linuxIPC}/acks/${file}`, { schemaVersion: 1, nonce, action: 'begin', index: activeCase, test: { ...test, writeAction, actor: { key: test.actorKey, id: actor.id, cookies: actor.cookies } } });
        } else if (command.action === 'end') {
          assert.equal(command.index, activeCase); assert.equal(command.result.kind, cases[activeCase].kind); assert(['passed', 'failed'].includes(command.result.status));
          if(activePolicy){command.result.actualWriteObserver=structuredClone(activePolicy.cache.writes);if(command.result.status==='passed')assert(activePolicy.completed(),'Readonly DOM/button display cannot certify a required UI write');} actualCases.push(command.result); activeCase = null; activePolicy=null; nextCase++; writeNew(`${locations.linuxIPC}/acks/${file}`, { nonce, action: 'end', index: command.index });
        } else if (command.action === 'drain') {
          writeNew(`${locations.linuxIPC}/acks/${file}`, { nonce, action: 'drain', index: activeCase });
        } else if (command.action === 'finish' || command.action === 'stop') {
          assert.equal(activeCase, null); stopped = true;
          successfulFinish = command.action === 'finish' && nextCase === cases.length && actualCases.every(test => test.status === 'passed');
          report.windows = command.windows ?? null; writeNew(`${locations.linuxIPC}/acks/${file}`, { nonce, action: command.action });
        } else throw new Error('Unknown private IPC action');
        processed.add(file);
      }
      if (!stopped) await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(stopped, 'Owned Windows worker did not finish before the bounded run deadline');
    assert.equal(fixtureFactsHash(ctx), fixturesBefore, 'Actual DOM changed fixture facts beyond exact UI observer receipt fields'); assert.equal(sha(jsonBytes(ctx.state.sourcePins)), pinsBefore);
    assert.equal(proxy.failures.length, 0); assert(proxy.exchanges.every(item => item.status < 500)); assert(successfulFinish);
    const all = ['role-forms']; report.allA08FormsPassed = false;
    report.unboundCases = all.filter(kind => !cases.some(test => test.kind === kind)); report.allRoleGroupsPassed = report.unboundCases.length === 0;
    report.status = 'passed-bound-cases-only';
  } catch (error) { writeNew(`${locations.linuxIPC}/linux-failure.log`, Buffer.from(error.stack || String(error))); }
  finally {
    report.actualDOMExecuted = actualCases.some(test => test.actualProjectNavigationObserved === true); report.cases = actualCases; report.observerReceipts = receipts;
    if (proxy) { try { report.close = await proxy.close(); } catch (error) { report.status = 'failed'; writeNew(`${locations.linuxIPC}/close-failure.log`, Buffer.from(error.stack || String(error))); } report.exchanges = proxy.exchanges; report.proxyFailures = proxy.failures; }
    if (report.status === 'failed') report.allRoleGroupsPassed = false;
    writeNew(`${locations.linuxIPC}/done.json`, { nonce, report }); writeNew(`${locations.linuxPublic}/receipt18-05.json`, report, false);
    if (fs.existsSync(lock)) { const owner = readJson(lock); if (owner.pid === process.pid && owner.nonce === nonce) fs.unlinkSync(lock); }
  }
  return report;
}

async function main() { const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--plan' && args[2] === '--approved-binding-sha' && args[4] === '--execute'); const report = await execute(readJson(args[1]), args[1], args[3]); if (!['passed', 'passed-bound-cases-only'].includes(report.status)) process.exitCode = 1; }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Owned Linux runtime14 preflight failed; inspect new private originals. No DOM success is claimed.'); process.exitCode = 1; });
