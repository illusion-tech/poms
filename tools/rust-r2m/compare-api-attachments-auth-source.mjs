// Finite original-cap M4 auth source projection. Pure public-byte inputs only.
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),sha=b=>createHash('sha256').update(b).digest('hex');
export const m4AuthOriginalSources=Object.freeze([
  {
    "file": "apps/poms-api/src/app/core/auth/auth-session.service.ts",
    "bytes": 12139,
    "rawBytesSha256": "d7b3d4f9115a542244dd33b859ce9b08ece45c10908ce3a469c01919418dad89"
  },
  {
    "file": "apps/poms-api/src/app/core/auth/auth-session.repository.ts",
    "bytes": 8133,
    "rawBytesSha256": "9757f1eedc9640875b4328a04f8129149f1c9191eefebae8f35ac7cb2a890622"
  },
  {
    "file": "apps/poms-api/src/app/core/auth/auth-session.entity.ts",
    "bytes": 4018,
    "rawBytesSha256": "6de2371d28c70eb1b6ead0c2c105142622cfda846e13bb4a4eb123b76299e479"
  },
  {
    "file": "apps/poms-api/src/app/core/auth/auth.controller.ts",
    "bytes": 13984,
    "rawBytesSha256": "503ef7836a9141bf11e50ef22a07d0a26e593466d6ee4edbb9e32c40fc8f46e9"
  },
  {
    "file": "apps/poms-api/src/config/environment.schema.ts",
    "bytes": 1698,
    "rawBytesSha256": "e525f24e01a2cebed59abdf0c6639978eed408eed7479ce1e3a4580429f71890"
  },
  {
    "file": "apps/poms-api/src/config/load-env.ts",
    "bytes": 2798,
    "rawBytesSha256": "20627df84a3f9812f08de541c8add9a8ae5a6ce927155da4c19026846ec5edf0"
  },
  {
    "file": "apps/poms-api-rust/src/auth/service.rs",
    "bytes": 20275,
    "rawBytesSha256": "c4c73dae7e33a5f4299068327b9edcae1d8e9c6daeddda9a0e34da5e614dcf80"
  },
  {
    "file": "apps/poms-api-rust/src/auth/store.rs",
    "bytes": 22695,
    "rawBytesSha256": "14ba9d8e7171e6a6fbd00fa68c25a283d53521e17921b5d0e2ac760fec1a3f40"
  },
  {
    "file": "apps/poms-api-rust/src/auth/model.rs",
    "bytes": 10433,
    "rawBytesSha256": "042f4418cee854566d942c5fe723a6221f4fd2e8c61bb35dcc8dbeca157d6312"
  },
  {
    "file": "apps/poms-api-rust/src/config.rs",
    "bytes": 43499,
    "rawBytesSha256": "71857aacb627ee7180a32a0985b055322fd60e082b6a842b52cf2e249b8830d7"
  },
  {
    "file": "apps/poms-api-rust/src/attachments/http.rs",
    "bytes": 20344,
    "rawBytesSha256": "bf3104acae5ce0ea4899887036a4328d87a9e6ef173ca830d46c375e179270ce"
  },
  {
    "file": "apps/poms-api-rust/src/attachments/service.rs",
    "bytes": 68932,
    "rawBytesSha256": "13ea71827b3ee14ece4d8dda9a561f97975f10cbadcee2925adf6923a4bd91d9"
  },
  {
    "file": "apps/poms-api-rust/src/attachments/store.rs",
    "bytes": 42291,
    "rawBytesSha256": "d4907b05cf9772efc20c378667ccf78fce19473e8e3fa24bc498a4f72452a403"
  },
  {
    "file": "apps/poms-api-rust/src/attachment_storage/service.rs",
    "bytes": 31151,
    "rawBytesSha256": "1ebac6fb8311970ddec50f4d50cff1a9f29cb8e40671d2cef4a270c17c4d202f"
  },
  {
    "file": "apps/poms-api-rust/src/attachment_storage/store.rs",
    "bytes": 13211,
    "rawBytesSha256": "58fb3377e549c39c300bce07f8e6819a6a8a8953d0e4e535347c3b7cd6ceed4e"
  },
  {
    "file": "tools/rust-r2m-continuation01/managed-environment.cjs",
    "bytes": 7159,
    "rawBytesSha256": "55ca2af7ffe89d64ad0d7175d8880888f4e7f885fb5e0c0f608003f19e074d08"
  },
  {
    "file": "tools/rust-r2m-continuation01/native-app.mjs",
    "bytes": 8132,
    "rawBytesSha256": "179992550eb15e93b78561c034573b6432a9d7bf826a58c31c7d075018fbf9c0"
  },
  {
    "file": "tools/rust-r2m-continuation01/rust-app.mjs",
    "bytes": 2908,
    "rawBytesSha256": "9af182dfe7eaecbd6b86afa8d40bb4d42e2656214d264717e706778a7c18c056"
  },
  {
    "file": "tools/rust-r2m-continuation01/run-api-owned.mjs",
    "bytes": 4154,
    "rawBytesSha256": "1c5d7efef514eef9161d0c7730fc71507d8ed70341eec25e65d1a34a6cc44d0a"
  },
  {
    "file": "tools/rust-r2m-continuation01/command-owner.cjs",
    "bytes": 20693,
    "rawBytesSha256": "b9507c52b677efb05a8a1b501c90024b30644dbfa87e0b975705e23bd8958038"
  },
  {
    "file": "tools/e2e/runtime-worker.cjs",
    "bytes": 2182,
    "rawBytesSha256": "0ad9af6f070944ed7f3f291af648f49f92ab587279ecb1495dafd9bcb70a7fbc"
  },
  {
    "file": "tools/rust-r2m-continuation01/acceptance-api-runtime.mjs",
    "bytes": 50558,
    "rawBytesSha256": "1d8b9b37589fb71382ba4a593e7804d501d767fd13a5c73f38072299ce9ffe44"
  },
  {
    "file": "tools/rust-r2m-continuation01/acceptance-api-user-compatibility.mjs",
    "bytes": 8414,
    "rawBytesSha256": "f9d0adfc6c965f6533ec7f9fc418a83406edbf06e650d89ffbd96ce17ac1827c"
  }
]);
const one=(rows,p,label)=>{const found=rows.filter(p);assert.equal(found.length,1,label);return found[0]},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function method(file,raw,name){const tree=ts.createSourceFile(file,raw.toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),methods=[];function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(tree)===name)methods.push(n);ts.forEachChild(n,visit)}visit(tree);return one(methods,()=>true,'One original named source method '+name).getText(tree)}
function part(text,from,to){const start=text.indexOf(from);assert(start>=0&&text.indexOf(from,start+from.length)<0);const end=text.indexOf(to,start+from.length);assert(end>start);return text.slice(start,end)}
export function createM4AuthSourceProjection({sourceCap,sourceReader}){
 assert(sourceCap.id==='r2m-c01-joint01'&&sourceCap.manifestSha256==='7f456aac3c108832b08268fcc8f197e3aeda5bb93d948bb2514714fb9cd79cfd'&&sourceCap.privateCopied===false);assert.equal(ts.version,'6.0.3');const bytes=new Map(),reads=[];for(const expected of m4AuthOriginalSources){const pin=one(sourceCap.files,p=>p.file===expected.file,'Exact original M4 cap source'),raw=sourceReader.read(expected.file);assert(Buffer.isBuffer(raw)&&raw.length===expected.bytes&&sha(raw)===expected.rawBytesSha256&&pin.rawBytesSha256===expected.rawBytesSha256&&pin.bytes===expected.bytes&&pin.storedFile==='tmp/rust-r2m-continuation01/public-source-store/'+pin.rawBytesSha256);bytes.set(expected.file,raw);reads.push({...expected,storedFile:pin.storedFile})}const text=f=>bytes.get(f).toString('utf8');
 const svc='apps/poms-api/src/app/core/auth/auth-session.service.ts',repo='apps/poms-api/src/app/core/auth/auth-session.repository.ts',entity='apps/poms-api/src/app/core/auth/auth-session.entity.ts',touch=method(svc,bytes.get(svc),'#touchSession'),lifecycle=method(svc,bytes.get(svc),'#getLifecycleOptions'),touchSql=method(repo,bytes.get(repo),'touchLastSeenIfDue');for(const exact of['Math.floor((now.getTime() - toDate(session.lastSeenAt).getTime()) / 1000)','if (elapsedSeconds < lifecycle.lastSeenThrottleSeconds)','this.authSessionRepository.touchLastSeenIfDue','session.rowVersion = touchedSession.rowVersion','session.updatedAt = toDate(touchedSession.updatedAt)'])assert(touch.includes(exact));for(const name of['idleTimeoutSeconds','absoluteTimeoutSeconds','lastSeenThrottleSeconds'])assert(lifecycle.includes(name));for(const exact of['"row_version" = "row_version" + 1','"last_seen_at" <= ?','"idle_expires_at" = least(?, "absolute_expires_at")','"updated_at" = ?','input.sessionId'])assert(touchSql.includes(exact));assert(text(entity).includes('rowVersion: p.integer().version().default(1)'));assert(text(entity).includes('.onUpdate(() => new Date())'));
 const schema=text('apps/poms-api/src/config/environment.schema.ts');for(const [name,value]of[['IDLE_TIMEOUT',900],['ABSOLUTE_TIMEOUT',28800],['LAST_SEEN_THROTTLE',60]])assert(new RegExp('AUTH_SESSION_'+name+'_SECONDS:[^\\n]+\\.default\\('+value+'\\)').test(schema));const managed=text('tools/rust-r2m-continuation01/managed-environment.cjs'),managedTree=ts.createSourceFile('managed.cjs',managed,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);for(const name of['fileKeys','systemKeys']){const declarations=[];function find(n){if(ts.isVariableDeclaration(n)&&n.name.getText(managedTree)===name)declarations.push(n);ts.forEachChild(n,find)}find(managedTree);const declaration=one(declarations,()=>true,'Original environment allowlist '+name);assert(ts.isNewExpression(declaration.initializer)&&declaration.initializer.expression.getText(managedTree)==='Set');const values=declaration.initializer.arguments[0];assert(ts.isArrayLiteralExpression(values));assert(values.elements.every(e=>ts.isStringLiteral(e)&&!e.text.startsWith('AUTH_SESSION_')))}const owned=text('tools/rust-r2m-continuation01/run-api-owned.mjs');assert(owned.includes("Object.fromEntries(['PATH','HOME','LANG'].filter"));assert(text('tools/rust-r2m-continuation01/command-owner.cjs').includes("!['PATH', 'HOME', 'LANG'].includes(key)"));assert(text('tools/e2e/runtime-worker.cjs').includes('env: { ...message.env, POMS_E2E_RUN_ID: runId }'));assert(text('tools/rust-r2m-continuation01/native-app.mjs').includes('Object.assign(process.env,environment.env)'));assert(text('tools/rust-r2m-continuation01/rust-app.mjs').includes("managed('rust').childEnv"));
 const rustConfig=text('apps/poms-api-rust/src/config.rs');for(const [name,value]of[['IDLE_TIMEOUT',900],['ABSOLUTE_TIMEOUT',28800],['LAST_SEEN_THROTTLE',60]])assert(new RegExp('"AUTH_SESSION_'+name+'_SECONDS",\\s*'+value+',').test(rustConfig));const rustService=text('apps/poms-api-rust/src/auth/service.rs'),rustTouch=part(text('apps/poms-api-rust/src/auth/store.rs'),'pub async fn touch_last_seen_if_due(', '\npub async fn rotate_csrf_token'),attachment=text('apps/poms-api-rust/src/attachments/service.rs'),http=text('apps/poms-api-rust/src/attachments/http.rs'),list=part(attachment,'    pub async fn list(', '    pub async fn history(');assert(rustService.includes('(now.timestamp_millis() - session.last_seen_at.timestamp_millis()).div_euclid(1000)'));assert(rustService.includes('if elapsed_seconds >= throttle_seconds'));assert(rustService.includes('let pending_flush = SessionFlush::between(&initial, &session)'));assert(rustTouch.includes('row_version=row_version+1,updated_at=$1'));assert(rustTouch.includes('idle_expires_at=least($3,absolute_expires_at)'));assert(!list.includes('self.save(')&&!list.includes('store::save('));assert(http.includes('Op::List => service.list(&input, &mut ctx).await'));assert(attachment.includes('pending: session.pending_flush.clone()'));assert(text('apps/poms-api-rust/src/attachments/store.rs').includes('flush_managed_session'));assert(text('apps/poms-api-rust/src/attachment_storage/store.rs').includes('flush_managed_session'));
 const runtime=text('tools/rust-r2m-continuation01/acceptance-api-runtime.mjs');for(const exact of["sentSessionTokenSha256=this.cookies.has('poms_session')?sha(Buffer.from(this.cookies.get('poms_session'))):null",'originalNativeSql:native.sql.slice(sqlFrom)',"kind:'actual-API-original-SDK-PG-and-queryPID-before-certification'","kind:'actual-request-private-cookies-body-and-SDK-PG'"])assert(runtime.includes(exact));
 return Object.freeze({kind:'M4-original-two-bootstrap-session-auth-source-projection',sourceCapId:sourceCap.id,lifecycle:Object.freeze({throttleSeconds:60,idleTimeoutSeconds:900,absoluteTimeoutSeconds:28800,ambientAuthOverrideAdmitted:false}),rustTouchOnlyGet(request){assert(request.executionBackend==='rust'&&request.context.op==='m.http'&&request.context.caseId==='m4.integration'&&request.method==='GET');assert.equal(new URL(request.path,'http://127.0.0.1:10071').pathname,'/api/attachments');return{kind:'M4-original-attachment-list-auth-touch-without-managed-save',sourceBodySha256:sha(list),managedSavePathsExistElsewhere:true,SQLCaptureClaimed:false}},unpreparedVersionFailureSource(){const expected=[{file:'tools/rust-r2m-continuation01/acceptance-api-attachment-recipes.mjs',bytes:9593,rawBytesSha256:'66c64ce1a72f1f87a78ea4c0d7551ed051f2c69d543058bf34949d108f61d408'},{file:'apps/poms-api/src/app/features/attachment/attachment.service.ts',bytes:104205,rawBytesSha256:'b5362da2690283fa930740bf3dbbdc77f56a7429613d64394bd726094cd9cbf2'},{file:'apps/poms-api/src/app/features/attachment/attachment.repository.ts',bytes:15693,rawBytesSha256:'9bfc1074b3ebe6a3baa2499425439ffce4ef939612c464a9a81779715c15da5f'}],sourceReads=[];for(const p of expected){const pin=one(sourceCap.files,x=>x.file===p.file,'Exact original negative-version source'),raw=sourceReader.read(p.file);assert(Buffer.isBuffer(raw)&&raw.length===p.bytes&&sha(raw)===p.rawBytesSha256&&pin.bytes===p.bytes&&pin.rawBytesSha256===p.rawBytesSha256&&pin.storedFile==='tmp/rust-r2m-continuation01/public-source-store/'+p.rawBytesSha256);bytes.set(p.file,raw);const read={...p,storedFile:pin.storedFile};sourceReads.push(read);if(!reads.some(r=>r.file===p.file))reads.push(read)}const file=expected[0].file,ast=ts.createSourceFile(file,bytes.get(file).toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),calls=[];function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='request'&&ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text==='version-complete')calls.push(n);ts.forEachChild(n,visit)}visit(ast);const call=one(calls,()=>true,'One original unprepared version complete negative');assert(call.arguments.length===5&&call.arguments[1].text==='POST'&&call.arguments[2].text==='/api/attachment-upload-sessions/{versionSession.id}:complete'&&ts.isObjectLiteralExpression(call.arguments[3])&&call.arguments[3].properties.length===0&&ts.isObjectLiteralExpression(call.arguments[4]));const properties=Object.fromEntries(call.arguments[4].properties.filter(ts.isPropertyAssignment).map(n=>[n.name.getText(ast),n.initializer.getText(ast)]));assert(properties.expectedStatus==='500'&&properties.expect==="'inherited-unprepared-version-complete-500'"&&properties.originalUnpreparedInputPreserved==='true');const complete=method(expected[1].file,bytes.get(expected[1].file),'completeAttachmentUploadSession'),saveAll=method(expected[2].file,bytes.get(expected[2].file),'saveAll'),saveUpload=method(expected[2].file,bytes.get(expected[2].file),'saveUploadSession');assert(complete.indexOf('session.status = AttachmentUploadSessionStatusValue.Validating')<complete.indexOf('try {')&&complete.includes('await this.attachmentRepository.saveUploadSession(session)')&&complete.includes('await this.createAttachmentVersionFromUploadSession(session, user, requestId)')&&complete.includes('} catch (error) {')&&complete.includes('session.status = AttachmentUploadSessionStatusValue.Failed'));assert(saveAll.includes('persist(entities).flush()')&&saveUpload.includes('persist(uploadSession).flush()'));return{kind:'M4-original-unprepared-version-complete-negative-source',sourceCapId:sourceCap.id,sourceReads,methodSha256:sha(complete),originalNegativePreserved:true,authEffectOrOwnershipGranted:false}},responseEnrichmentSource:{kind:'M4-original-captured-response-write-enrichment-source',sourceCapId:sourceCap.id,sourceReads:reads.filter(r=>r.file.endsWith('/acceptance-api-runtime.mjs')||r.file.endsWith('/acceptance-api-user-compatibility.mjs'))},receipt(){sourceReader.assertUnchanged();return{kind:'M4-two-specific-session-source-projection',sourceCapId:sourceCap.id,sourceReads:reads,nativeMethodSha256:sha(touch),nativeSqlSourceSha256:sha(touchSql),rustTouchSourceSha256:sha(rustTouch),M3ApprovalCommonUsed:false,managedM4SavePathsExist:true,environmentDefaultOnly:true,sourceSQLIsNotRuntimeQueryCapture:true,ownershipGranted:false}}});
}
