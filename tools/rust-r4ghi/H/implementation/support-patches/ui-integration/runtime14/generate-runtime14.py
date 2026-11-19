import pathlib,json,hashlib
own=pathlib.Path(__file__).resolve().parent;base=own.parent/'runtime13';mf=json.loads((base/'manifest-runtime13.json').read_text());pins={x['file']:x['rawBytesSha256'] for x in mf['files']};records=[]
def source(name):
 b=(base/name).read_bytes();assert hashlib.sha256(b).hexdigest()==pins[name];return b.decode()
def replace(text,old,new):
 assert text.count(old)==1,old[:100];return text.replace(old,new)
def save(name,text,old):
 p=own/name;assert not p.exists();p.write_bytes(text.encode());records.append({'source':old,'SourceBaseSHA256':pins[old],'target':name,'rawBytesSha256':hashlib.sha256(p.read_bytes()).hexdigest()})
common=source('dom-common13.mjs').replace('runtime13','runtime14');save('dom-common14.mjs',common,'dom-common13.mjs')
server=source('server13.mjs').replace('./dom-common13.mjs','./dom-common14.mjs')
server=replace(server,"assert(['GET', 'HEAD'].includes(request.method), 'Read-only runtime refuses API/business writes');", "assert((apiRequest ? ['GET', 'HEAD', 'POST', 'PUT'] : ['GET', 'HEAD']).includes(request.method), 'Only exact admitted case writes may reach the private observer');")
server=replace(server,"const body = Buffer.concat(chunks); assert.equal(body.length, 0);", "const body = Buffer.concat(chunks); if(['GET','HEAD'].includes(request.method)) assert.equal(body.length,0);")
server=replace(server,'forwarded.end();','forwarded.end(body.length ? body : undefined);');save('server14.mjs',server,'server13.mjs')
linux=source('linux13.mjs').replace("from './binding13.mjs'", "from '../runtime13/binding13.mjs'").replace("from './server13.mjs'", "from './server14.mjs'").replace("from './dom-common13.mjs'", "from './dom-common14.mjs'")
linux="import { createWritePolicy } from './write-policy14.mjs';\nimport { actualSpareRecord, recordActualUIReceipt, fixtureFactsHash } from './fixture-receipts14.mjs';\n"+linux
linux=replace(linux,"import { resolveCases }", "import { resolveCases, fixturePointer }")
linux=replace(linux,"let ctx, proxy, label, activeCase = null, nextCase = 0, stopped = false, successfulFinish = false;", "let ctx, proxy, label, activeCase = null, activePolicy = null, nextCase = 0, stopped = false, successfulFinish = false;")
linux=replace(linux,"{ capture } = await helper('snapshot')", "{ capture, readRows, difference } = await helper('snapshot')")
linux=replace(linux,"const api = createApi(ctx); report.actualSourceBinding=bindActualContext(ctx,binding,approvedBindingSHA256,bindingBytes);", "const api = createApi(ctx); report.actualSourceBinding=bindActualContext(ctx,binding,approvedBindingSHA256,bindingBytes); assert.equal(sha(Buffer.from(JSON.stringify(plan.writeActions))),binding.writeActionsSHA256,'Root must review exact UI write actions as part of closed binding');")
needle="const before = await capture(ctx, `${requestLabel}-before`); assertRecorded(ctx, before);"
linux=replace(linux,needle,needle+"\n      const isWrite=!['GET','HEAD'].includes(request.method); const requestValue=isWrite && /application\\/json/i.test(String(request.headers['content-type']))?JSON.parse(request.body.toString('utf8')):null; const writeAdmission=isWrite?(assert(activePolicy,'No business write in a readonly case'),activePolicy.admit({operationId:operation.operationId,params:operation.pathParams,method:request.method,body:requestValue,bytes:request.body,before})):null;")
linux=replace(linux,"actorId: actor.id, method: request.method, intent };", "actorId: actor.id, method: request.method, intent, requestValue, requestBodySHA256:sha(request.body), writeAdmission };")
linux=replace(linux,"requestValue: null, requestBodySha256: sha(Buffer.alloc(0)),", "requestValue: observation.requestValue, requestBodySha256: observation.requestBodySHA256,")
old="const after = await capture(ctx, `${observation.requestLabel}-after`), ledger = await reconcileAttempt(ctx, observation.before, after, attempt);"
new="""const after = await capture(ctx, `${observation.requestLabel}-after`), changes=difference(observation.before,after);
      let policyError=null, exactBinding=observation.writeAdmission?.binding ?? {};
      if(observation.writeAdmission){try{activePolicy.validateMutationRows(changes);}catch(error){policyError=error;exactBinding={...exactBinding,mutableTables:[],updatedAnchors:[]};}}
      const ledger = await reconcileAttempt(ctx, observation.before, after, attempt, exactBinding);
      if(policyError) throw policyError;
      if(observation.writeAdmission){
        assert.equal(attempt.status,attempt.expectedStatus,'Exact canonical write response status required; no status widening');
        activePolicy.observeWrite(observation.operationId,body,after,changes);
        if(activePolicy.completed()) recordActualUIReceipt(ctx,{scene:activePolicy.scene,action:activePolicy.action,operationId:observation.operationId,ledger,originals});
      }else if(activePolicy && attempt.status===200) activePolicy.observeRead(observation.operationId,body);"""
linux=replace(linux,old,new)
old="const test = cases[activeCase], actor = ctx.state.actors[test.actorKey];\n          writeNew(`${locations.linuxIPC}/acks/${file}`, { schemaVersion: 1, nonce, action: 'begin', index: activeCase, test: { ...test, actor: { key: test.actorKey, id: actor.id, cookies: actor.cookies } } });"
new="""const test = cases[activeCase], actor = ctx.state.actors[test.actorKey], configured=plan.writeActions.find(value=>value.kind===test.kind);
          assert(report.actualSourceBinding.actorKeys.includes(test.actorKey),'Every browser actor must be in the actual reviewed manifest');
          if(['creator','execution-owner','own-condition'].includes(test.kind)) assert(configured,'Required closure scene cannot run as readonly DOM');
          let writeAction=null;
          if(configured){assert(['creator','execution-owner','own-condition'].includes(test.kind));assert.equal(configured.actorKey,test.actorKey);writeAction={...configured};if(test.kind==='creator'){assert(report.actualSourceBinding.actorKeys.includes(configured.targetOwnerActorKey));const owner=ctx.state.actors[configured.targetOwnerActorKey];assert(owner);writeAction.targetOwnerUserId=owner.id;writeAction.targetOwnerOrgId=owner.orgId;}if(test.kind==='own-condition')writeAction.completionRecordId=fixturePointer(ctx.state,configured.completionRecordIdPointer);actualSpareRecord(ctx,test,writeAction);activePolicy=createWritePolicy({ctx,scene:test,action:writeAction,readRows});}else activePolicy=null;
          writeNew(`${locations.linuxIPC}/acks/${file}`, { schemaVersion: 1, nonce, action: 'begin', index: activeCase, test: { ...test, writeAction, actor: { key: test.actorKey, id: actor.id, cookies: actor.cookies } } });"""
linux=replace(linux,old,new)
linux=replace(linux,"actualCases.push(command.result); activeCase = null; nextCase++;", "if(activePolicy){command.result.actualWriteObserver=structuredClone(activePolicy.cache.writes);if(command.result.status==='passed')assert(activePolicy.completed(),'Readonly DOM/button display cannot certify a required UI write');} actualCases.push(command.result); activeCase = null; activePolicy=null; nextCase++;")
linux=replace(linux,'const fixturesBefore = sha(jsonBytes(ctx.state.fixtures))','const fixturesBefore = fixtureFactsHash(ctx)')
linux=replace(linux,"assert.equal(sha(jsonBytes(ctx.state.fixtures)), fixturesBefore, 'Actual DOM changed fixture facts');", "assert.equal(fixtureFactsHash(ctx), fixturesBefore, 'Actual DOM changed fixture facts beyond exact UI observer receipt fields');")
linux=linux.replace('runtime13','runtime14')
# binding authority stays the sealed13 module, not an invented copied context.
linux=linux.replace("from '../runtime14/binding13.mjs'", "from '../runtime13/binding13.mjs'");save('linux14.mjs',linux,'linux13.mjs')
windows=source('windows13.mjs').replace("from './binding13.mjs'", "from '../runtime13/binding13.mjs'").replace('./browser-cases13.mjs','./browser-cases14.mjs').replace('./dom-common13.mjs','./dom-common14.mjs').replace('runtime13','runtime14').replace('linux13.mjs','linux14.mjs').replace("from '../runtime14/binding13.mjs'", "from '../runtime13/binding13.mjs'")
save('windows14.mjs',windows,'windows13.mjs')
browser=source('browser-cases13.mjs');browser="import { performWriteAction14 } from './browser-actions14.mjs';\n"+browser
browser=replace(browser,"    await page.waitForLoadState('networkidle');\n    const text =", "    const uiWriteResult=test.writeAction?await performWriteAction14({page,expect,test,primaryData:data}):null;\n    await page.waitForLoadState('networkidle');\n    const text =")
browser=replace(browser,"exactOwnDownload: own, businessWritePerformed: false", "exactOwnDownload: own, businessWritePerformed: Boolean(uiWriteResult), uiWriteResult")
save('browser-cases14.mjs',browser,'browser-cases13.mjs')
(own/'source-bases14.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8');print(json.dumps(records))
