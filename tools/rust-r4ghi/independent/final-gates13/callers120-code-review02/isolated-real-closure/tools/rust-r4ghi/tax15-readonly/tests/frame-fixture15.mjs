import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function frameFixture15(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'H15-frame-protocol-'));let next=0;
 function write(value,name='data'){const file=path.join(dir,String(++next)+'-'+name+'.json'),b=Buffer.from(JSON.stringify(value));fs.writeFileSync(file,b);return{file,bytes:b.length,rawBytesSha256:sha(b)};}
 function bytes(value,name='bytes'){const file=path.join(dir,String(++next)+'-'+name),b=Buffer.from(value);fs.writeFileSync(file,b);return{file,bytes:b.length,rawBytesSha256:sha(b)};}
 const marker='synthetic-protocol-only',prefix='bgH15fixture',api='http://127.0.0.1:31441';
 const current={namespace:'poms-r4ghi',epoch:'g2-business15',run:'main01',marker,prefix,api,bodySHA256:sha('{}'),sourcePinsSHA256:'a'.repeat(64)};
 const key='["poms_r4ghi_rust","project_operating_head",["project-one"]]';
 const beforeValue={project_id:'project-one',row_version:1,current_snapshot_id:'old'},afterValue={project_id:'project-one',row_version:2,current_snapshot_id:'new'};
 const row=(v,xmin)=>{const raw=JSON.stringify(v);return{key:['project-one'],raw,sha256:sha(raw),xmin};};const beforeRow=row(beforeValue,'10'),afterRow=row(afterValue,'20');
 const empty=bytes('','empty.rows.jsonl'),br=bytes(JSON.stringify(beforeRow)+'\n','before.rows.jsonl'),ar=bytes(JSON.stringify(afterRow)+'\n','after.rows.jsonl');
 const tables=['project_operating_head','auth_session',...Array.from({length:137},(_,i)=>'synthetic_table_'+i)].sort();
 function snapshot(changed){return{schemaVersion:1,namespace:'poms-r4ghi',epoch:'g2-business15',run:'main01',marker,objects:{poms_r4ghi_native:{files:[]},poms_r4ghi_rust:{files:[]}},databases:Object.fromEntries(['poms_r4ghi_native','poms_r4ghi_rust'].map(db=>[db,{meta:{normative:{M:98},sequences:[]},tables:Object.fromEntries(tables.map(t=>[t,t==='project_operating_head'&&db==='poms_r4ghi_rust'?(changed?ar:br):empty]))}]))};}
 const before=write(snapshot(false),'before-snapshot'),after=write(snapshot(true),'after-snapshot'),requestId=prefix+'-normal';
 const proof={kind:'HTTP-owned-row-update',requestId,operationId:'ProjectCostController_createOperatingRestatement',beforeSha256:beforeRow.sha256,beforeSnapshot:before,afterSnapshot:after};
 const birth={kind:'synthetic-prior-birth-for-protocol-unit-only'};
 const owner={database:'poms_r4ghi_rust',table:'project_operating_head',key:beforeRow.key,firstSha256:beforeRow.sha256,latestSha256:beforeRow.sha256,latestXmin:'10',proof:birth,latestProof:birth};
 const entryState={namespace:'poms-r4ghi',epoch:'g2-business15',run:'main01',sequence:4,marker,prefix,owned:{[key]:owner},borrowed:{},objects:{}};
 const entryStatePin=write(entryState,'entry-ownership'),prefixLog=bytes('','prefix-log.jsonl');
 const originals={requestConfig:write({operationId:proof.operationId,requestId,method:'POST',url:api+'/api/operating-restatements',headers:{'X-Request-Id':requestId},before},'request-config'),requestBody:bytes('{}','body.json'),responseHeaders:write({status:201},'headers'),responseBody:write({targetId:'new'},'response')};
 const wire={kind:'actual-business-HTTP-attempt',operationId:proof.operationId,requestId,status:201,expectedStatus:201,responseComplete:true,transportFailure:false,method:'POST',canonicalTemplate:'/api/operating-restatements',querySha256:sha(''),originals,actorId:'manager-one',actorKey:'manager'};
 const http=write(wire,'http'),ledger=write({requestId,operationId:proof.operationId,transport:'HTTP',before,after,recorded:[{kind:'owned-update',table:owner.table,key:owner.key}],blockers:[],ownershipComplete:true,responseStatusIsAcceptance:false},'ledger');
 const fi=write({scope:{},inventory:[],failures:[],normalTaxPOSTExecuted:false},'prior-fi');
 const success={requestId,receipt:http.file,status:201,responseComplete:true,transportFailure:false,ledger,before,after,postconditions:'verified',semantics:{protocolFixtureOnly:true},requestBodySha256:sha('{}')};
 const sweep={kind:'source-bound-tax-continuation15-sweep',fiComplete:fi,bodySHA256:sha('{}'),scope:{},inventory:[],failures:[],finalSuccess:success};
 const state={...entryState,sequence:5,owned:{[key]:{...owner,latestSha256:afterRow.sha256,latestXmin:'20',latestProof:proof}},taxContinuation15:{sweep}};
 const statePin=write(state,'after-ownership'),log=bytes(JSON.stringify({at:'2026-11-11T00:00:00.000Z',key,rowSha256:afterRow.sha256,proof})+'\n','ownership-log.jsonl');
 const entry=write({phase:'entry-verified',epoch:'g2-business15',run:'main01',current15:current,ownershipState:entryStatePin,ownershipLogPrefix:prefixLog},'entry'),exit=write({phase:'exit-verified',epoch:'g2-business15',run:'main01',current15:current},'exit');
 const journal=write({phase:'closed-verified',mode:'commit-once',epoch:'g2-business15',run:'main01',current15:current,httpAttempts:[{http,ledger,before,after}]},'journal');
 const normal=write({phase:'after-reconcile-postconditions-verified',epoch:'g2-business15',run:'main01',current15:current,finalSuccess:success,postconditions:success.semantics},'normal');
 const frame={kind:'actual-Source15-Tax118-after-verified-ownership-journal-frame',schemaVersion:1,namespace:'poms-r4ghi',epoch:'g2-business15',run:'main01',sourceGeneration:15,marker,prefix,sequenceAtSnapshot:5,current15:current,ownershipState:statePin,ownershipLog:log,observation:after,commandLedgers:[ledger],normalResult:normal,fiCompletion:fi,entryGuard:entry,exitGuard:exit,closedJournal:journal};
 const framePin=write(frame,'frame'),envelope={afterVerifiedFrame:framePin};sweep.afterVerifiedFrame=framePin;
 return{dir,write,bytes,frame,framePin,envelope,sweep,current,state,entryState,log,proof,ledger,http,before,after,beforeRow,afterRow,key};
}
