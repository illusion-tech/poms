// The Root owner supplies an already-owned real Playwright page/context and
// hooks. No launch, env/private read, API mocking, fetch or fixture I/O here.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// Observe a held wait immediately, while preserving the original promise and
// its original rejection for the subsequent required await. No retry or fallback.
export function observeUiPending(promise){assert(promise&&typeof promise.catch==='function');void promise.catch(()=>{});return promise}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const button=(scope,label)=>scope.locator('p-button[label="'+label+'"] > button');
const crcTable=Uint32Array.from({length:256},(_,index)=>{let value=index;for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0});
export function crc32(bytes){let value=0xffffffff;for(const byte of bytes)value=crcTable[(value^byte)&255]^(value>>>8);return(value^0xffffffff)>>>0}

export function inspectStoredZip(bytes){
    assert(Buffer.isBuffer(bytes)&&bytes.length>=22,'Actual ZIP bytes required');const end=bytes.length-22;
    assert.equal(bytes.readUInt32LE(end),0x06054b50);assert.equal(bytes.readUInt16LE(end+4),0);assert.equal(bytes.readUInt16LE(end+6),0);assert.equal(bytes.readUInt16LE(end+20),0);
    const count=bytes.readUInt16LE(end+10),size=bytes.readUInt32LE(end+12),offset=bytes.readUInt32LE(end+16);assert.equal(bytes.readUInt16LE(end+8),count);assert(count>1&&offset+size===end);
    const entries=[];let cursor=offset,localEnd=0;
    for(let index=0;index<count;index++){
        assert(cursor+46<=end);assert.equal(bytes.readUInt32LE(cursor),0x02014b50);assert.equal(bytes.readUInt16LE(cursor+8),0x0800);assert.equal(bytes.readUInt16LE(cursor+10),0);
        const crc=bytes.readUInt32LE(cursor+16),length=bytes.readUInt32LE(cursor+20),nameLength=bytes.readUInt16LE(cursor+28),local=bytes.readUInt32LE(cursor+42);
        assert.equal(bytes.readUInt32LE(cursor+24),length);assert.equal(bytes.readUInt16LE(cursor+30),0);assert.equal(bytes.readUInt16LE(cursor+32),0);assert.equal(local,localEnd);
        const nameBytes=bytes.subarray(cursor+46,cursor+46+nameLength);assert.equal(nameBytes.length,nameLength);const name=new TextDecoder('utf-8',{fatal:true}).decode(nameBytes);assert(name&&!name.includes('\0'));
        assert(local+30+nameLength+length<=offset);assert.equal(bytes.readUInt32LE(local),0x04034b50);assert.equal(bytes.readUInt16LE(local+6),0x0800);assert.equal(bytes.readUInt16LE(local+8),0);assert.equal(bytes.readUInt32LE(local+14),crc);assert.equal(bytes.readUInt32LE(local+18),length);assert.equal(bytes.readUInt32LE(local+22),length);assert.equal(bytes.readUInt16LE(local+26),nameLength);assert.equal(bytes.readUInt16LE(local+28),0);assert.deepEqual(bytes.subarray(local+30,local+30+nameLength),nameBytes);
        localEnd=local+30+nameLength+length;const data=bytes.subarray(local+30+nameLength,localEnd);assert.equal(crc32(data),crc);entries.push({name,bytes:data.length,sha256:sha(data),data});cursor+=46+nameLength;
    }
    assert.equal(cursor,end);assert.equal(localEnd,offset);assert.equal(new Set(entries.map(item=>item.name)).size,entries.length);assert.equal(entries[0].name,'manifest.json');
    return{entries,manifest:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(entries[0].data))};
}

export async function editOriginalSettingInput(page,value,expect){const field=page.locator('#attachmentMaxUploadSize');await field.fill(String(value));await field.press('Tab');const save=button(page,'保存');await expect(save).toBeEnabled();return save}
export async function returnToOriginalDashboardForLogout(page,origin,expect){assert.equal(origin,'http://127.0.0.1:10080');await page.goto(origin+'/dashboard');await page.waitForURL(url=>url.pathname==='/dashboard');await page.waitForFunction(()=>window.__pomsR2MAcceptance?.version===1);await expect(page.locator('.profile-item > .right-sidebar-button')).toBeVisible()}

export async function runUiJourneys({page,context,expect,inputs,onBeforeStep,onAfterStep,retainDownload,retainScreenshot,retainFailure,signal,selection=['UI1','UI2','UI3','UI4']}){
    for(const fn of[expect,onBeforeStep,onAfterStep,retainDownload,retainScreenshot,retainFailure])assert.equal(typeof fn,'function','Root owned UI hooks required');
    assert(inputs?.origin==='http://127.0.0.1:10080'&&typeof inputs.sourceCapId==='string','Fixed new UI origin/cap required');
    assert(selection.length>0&&new Set(selection).size===selection.length&&selection.every(id=>['UI1','UI2','UI3','UI4'].includes(id)),'Finite frozen UI selection required');
    const report={kind:'r2m-original-angular-four-real-journeys',sourceCapId:inputs.sourceCapId,result:'pending',selection,notRun:['UI1','UI2','UI3','UI4'].filter(id=>!selection.includes(id)),journeys:[],actualUiAndBridgeSeparated:true,credentialsRecorded:false,browserLifecycleOwner:'Root',cleanupPending:true};
    const diagnostics={console:[],pageErrors:[],failedRequests:[],responses:[],lifecycle:[],dropped:0};let failureContext={journeyId:null,stepId:null,phase:'before-first-step'};
    const privateReference=evidence=>{assert(typeof evidence?.file==='string'&&evidence.file.startsWith('/home/wangzishi/.local/share/poms-r2m/private/')&&Number.isSafeInteger(evidence.bytes)&&/^[0-9a-f]{64}$/.test(evidence.rawBytesSha256));return{file:evidence.file,bytes:evidence.bytes,rawBytesSha256:evidence.rawBytesSha256,private:true}};
    const boundedText=value=>String(value??'').slice(0,16384),push=(name,value)=>{if(diagnostics[name].length<200)diagnostics[name].push(value);else diagnostics.dropped++};
    const handlers={console:message=>push('console',{type:message.type(),text:boundedText(message.text()),location:message.location()}),pageerror:error=>push('pageErrors',{name:error.name,message:boundedText(error.message),stack:boundedText(error.stack)}),requestfailed:request=>push('failedRequests',{method:request.method(),url:boundedText(request.url()),failure:request.failure()}),response:response=>push('responses',{method:response.request().method(),url:boundedText(response.url()),status:response.status()})};
    for(const[event,handler]of Object.entries(handlers))page.on(event,handler);
    const browser=typeof context.browser==='function'?context.browser():null;
    const lifecycleState=()=>({pageClosed:typeof page.isClosed==='function'?page.isClosed():null,browserConnected:typeof browser?.isConnected==='function'?browser.isConnected():null});
    const lifecycleHandlers=[[page,'close'],[page,'crash'],[context,'close'],[browser,'disconnected']].filter(([owner])=>typeof owner?.on==='function').map(([owner,event])=>{const handler=()=>push('lifecycle',{at:new Date().toISOString(),owner:owner===page?'page':owner===context?'context':'browser',event,...failureContext,...lifecycleState(),reasonProvidedByPlaywright:false});owner.on(event,handler);return{owner,event,handler}});
    const cancelled=()=>{if(signal?.aborted){const error=new Error('owned-ui-cancelled');error.name='AbortError';throw error}};
    const waitResponse=(method,pathname)=>observeUiPending(page.waitForResponse(response=>new URL(response.url()).origin===inputs.origin&&new URL(response.url()).pathname===pathname&&response.request().method()===method,{timeout:25000}));
    const snapshot=async()=>{await page.waitForFunction(()=>window.__pomsR2MAcceptance?.version===1);return page.evaluate(()=>window.__pomsR2MAcceptance.snapshot())};
    async function login(role){const credentials=inputs.credentials[role];assert(credentials&&typeof credentials.username==='string'&&typeof credentials.password==='string');const currentUrl=new URL(page.url()),reuseOriginalForm=currentUrl.origin===inputs.origin&&currentUrl.pathname==='/auth/login';push('lifecycle',{at:new Date().toISOString(),event:'login-navigation',reuseOriginalForm,...failureContext,...lifecycleState()});if(!reuseOriginalForm)await page.goto(inputs.origin+'/auth/login',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__pomsR2MAcceptance?.version===1);await page.locator('#username').fill(credentials.username);await page.locator('#password').fill(credentials.password);const pending=waitResponse('POST','/api/auth/sessions');await page.locator('button[type=submit]').click();assert.equal((await pending).status(),200);await page.waitForURL(url=>!url.pathname.includes('/auth/login'));await page.waitForFunction(()=>window.__pomsR2MAcceptance?.version===1);assert.equal((await snapshot()).authenticated,true)}
    async function logout(){await page.locator('.profile-item > .right-sidebar-button').click();const pending=waitResponse('POST','/api/auth/session:logout');await page.getByText('退出登录',{exact:true}).click();assert.equal((await pending).status(),200);await page.waitForURL(url=>url.pathname==='/auth/login')}
    async function step(journey,id,kind,action,details={}){failureContext={journeyId:journey,stepId:id,phase:'before-step'};cancelled();const record={id,kind,result:'pending'};report.journeys.at(-1).steps.push(record);await onBeforeStep({journey,id,kind,details});cancelled();failureContext.phase='action';const observed=await action();cancelled();failureContext.phase='after-step';const receipt=await onAfterStep({journey,id,kind,details,observed});failureContext.phase='after-step-certificate';assert(receipt?.actualEvidenceRetained===true&&receipt.allActualWritesCertified===true&&/^[0-9a-f]{64}$/.test(receipt.evidenceSha256??''),'Root actual UI write/evidence certification missing');record.result='observed';record.evidenceSha256=receipt.evidenceSha256;return observed}
    async function screenshot(label){const bytes=await page.screenshot({fullPage:true});return retainScreenshot({label,bytes,sourceCapId:inputs.sourceCapId})}
    try{
        for(const journey of selection){const item={id:journey,result:'pending',steps:[]};report.journeys.push(item);
            if(journey==='UI1'){
                assert(['admin','viewer'].includes(inputs.authRole),'UI1 requires the explicit fixed admin/viewer role');
                assert(Number.isInteger(inputs.minimumTodoCount)&&inputs.minimumTodoCount>0,'UI1 requires proven nonempty actual Todo facts');
                await step(journey,'anonymous-deep-link','actual-ui',async()=>{await page.goto(inputs.origin+'/dashboard?r2m=deep');await page.waitForURL(url=>url.pathname==='/auth/login'&&url.searchParams.get('returnUrl')==='/dashboard?r2m=deep');return{safeReturnUrl:true}});
                await step(journey,'login-restore','actual-ui',async()=>{await login(inputs.authRole);const requests=['/api/auth/session','/api/me/navigation','/api/me/todos'].map(path=>waitResponse('GET',path));await page.reload();for(const response of await Promise.all(requests))assert.equal(response.status(),200);await page.waitForFunction(()=>window.__pomsR2MAcceptance?.version===1);assert((await snapshot()).navigationCount>0);assert((await snapshot()).todoCount>=inputs.minimumTodoCount);const cookieFlags=(await context.cookies()).filter(cookie=>['poms_session','poms_csrf'].includes(cookie.name)).map(({name,httpOnly,path,sameSite})=>({name,httpOnly,path,sameSite}));assert(cookieFlags.some(cookie=>cookie.name==='poms_session'&&cookie.httpOnly&&cookie.path==='/api'&&cookie.sameSite==='Lax'));await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await screenshot('UI1-narrow');await page.setViewportSize({width:1440,height:1000});return{restored:true,cookieFlags}});
                await step(journey,'expired-session','angular-fixed-bridge',async()=>{const result=await page.evaluate(()=>window.__pomsR2MAcceptance.fixedLogout());assert.equal(result.status,401);assert.equal(result.code,'session_expired');await page.waitForURL(url=>url.pathname==='/auth/login');assert.deepEqual(await snapshot(),{authenticated:false,navigationCount:0,todoCount:0,csrfInMemory:false,permissions:[]});return{status:result.status,code:result.code}}, {fixtureOperation:{operation:'expire-owned-ui-session',role:inputs.authRole,idleOffsetMs:-1000}});
                await step(journey,'relogin-and-topbar-logout','actual-ui',async()=>{const expiredSession=waitResponse('GET','/api/auth/session');await page.reload({waitUntil:'domcontentloaded'});const expiredResponse=await expiredSession;assert.equal(expiredResponse.status(),401);const clearHeaders=await expiredResponse.headersArray();for(const name of['poms_session','poms_csrf'])assert(clearHeaders.some(header=>header.name.toLowerCase()==='set-cookie'&&header.value.startsWith(name+'=;')&&/(?:^|;)\s*Max-Age=0(?:;|$)/i.test(header.value)&&/(?:^|;)\s*Path=\/api(?:;|$)/i.test(header.value)),'Original expired-session response must clear both real auth cookies');await page.waitForFunction(()=>window.__pomsR2MAcceptance?.version===1);assert.deepEqual(await snapshot(),{authenticated:false,navigationCount:0,todoCount:0,csrfInMemory:false,permissions:[]});assert(!(await context.cookies()).some(cookie=>['poms_session','poms_csrf'].includes(cookie.name)));await login(inputs.authRole);await logout();return{naturalExpiredSessionReload401:true,expiredAuthCookiesCleared:true,actualTopbarLogout:true}});
            }else if(journey==='UI2'){
                await step(journey,'setting-write','actual-ui',async()=>{await login('admin');await page.goto(inputs.origin+'/platform/system-settings');const save=await editOriginalSettingInput(page,inputs.settingValue,expect);const pending=waitResponse('PATCH','/api/platform/system-settings/attachment.max-upload-size-mb');await save.click();assert.equal((await pending).status(),200);await screenshot('UI2-settings');return{actualPatch200:true}}, {environmentBaselineSettingAdmissionRequired:true,settingLeaseScope:'m2-ui2.attachment-max-upload-size'});
                await step(journey,'wrong-csrf-preserves-auth','angular-fixed-bridge',async()=>{const before=await snapshot(),response=await page.evaluate(()=>window.__pomsR2MAcceptance.wrongCsrfLogout());assert.equal(response.status,403);assert.equal(response.code,'csrf_failed');assert.deepEqual(await snapshot(),before);return{status:403,authPreserved:true}});
                await step(journey,'viewer-route-and-backend-denial','actual-ui-and-angular-fixed-bridge',async()=>{await logout();await login('viewer');await page.goto(inputs.origin+'/platform/users');await page.waitForURL(url=>url.pathname!=='/platform/users');await page.waitForFunction(()=>window.__pomsR2MAcceptance?.version===1);const response=await page.evaluate(()=>window.__pomsR2MAcceptance.fixedPlatformUsersRead());assert.equal(response.status,403);assert.equal((await snapshot()).authenticated,true);await returnToOriginalDashboardForLogout(page,inputs.origin,expect);await logout();return{originalRouteDenied:true,fixedAngularRead403:true}});
            }else if(journey==='UI3'){
                const target=inputs.contract;assert(uuid.test(target?.id));
                await step(journey,'todo-detail-reject','actual-ui',async()=>{await login('approver');const requests=['/api/auth/session','/api/me/navigation','/api/me/todos'].map(path=>waitResponse('GET',path));await page.goto(inputs.origin+'/dashboard');for(const response of await Promise.all(requests))assert.equal(response.status(),200);await page.waitForFunction(()=>window.__pomsR2MAcceptance?.version===1);const todo=page.locator('app-workbench button').filter({hasText:target.contractNo});await expect(todo).toBeVisible();await todo.click();await page.waitForURL(url=>url.pathname==='/contracts/'+target.id);await button(page.locator('app-contract-detail'),'驳回').click();const dialog=page.getByRole('dialog',{name:'驳回审批'});await dialog.getByPlaceholder('请输入驳回原因').fill('R2M 原界面真实驳回');const pending=observeUiPending(page.waitForResponse(response=>new URL(response.url()).pathname.endsWith(':reject')&&response.request().method()==='POST'));await button(dialog,'确认驳回').click();assert.equal((await pending).status(),200);await expect(dialog).not.toBeVisible();await logout();return{actualReject200:true}}, {contractId:target.id});
                await step(journey,'original-native-resubmit','actual-ui',async()=>{await login('admin');await page.goto(inputs.origin+'/contracts/'+target.id);await button(page.locator('app-contract-detail'),'提交审核').click();const dialog=page.getByRole('dialog',{name:'提交合同审核'});const pending=waitResponse('POST','/api/contracts/'+target.id+':submitReview');await button(dialog,'提交审核').click();assert.equal((await pending).status(),200);await expect(dialog).not.toBeVisible();await logout();return{nativeProducerResubmit200:true}}, {contractId:target.id,executionBackend:'nest'});
                await step(journey,'actual-current-todo-approve','actual-ui',async()=>{await login('approver');const approvalId=await page.evaluate(id=>window.__pomsR2MAcceptance.approvalIdForTarget(id),target.id);assert(uuid.test(approvalId));await page.goto(inputs.origin+'/contracts/'+target.id);await button(page.locator('app-contract-detail'),'审批通过').click();const dialog=page.getByRole('dialog',{name:'审批通过'});await dialog.getByPlaceholder('可填写审批通过说明').fill('R2M 原界面真实通过');const pending=waitResponse('POST','/api/approval-records/'+approvalId+':approve');await button(dialog,'确认通过').click();assert.equal((await pending).status(),200);await expect(dialog).not.toBeVisible();await page.waitForFunction(()=>window.__pomsR2MAcceptance?.version===1);const detail=await page.evaluate(id=>window.__pomsR2MAcceptance.getApprovalRecord(id),approvalId);assert.equal(detail.currentStatus,'approved');assert.equal(detail.targetStatus,'pending-review');await screenshot('UI3-approved');await logout();return{actualApprove200:true,targetRemainsOriginalPendingReview:true}}, {contractId:target.id});
            }else{
                assert(uuid.test(inputs.project?.id)&&uuid.test(inputs.handover?.id)&&Buffer.isBuffer(inputs.upload?.bytes));let uploaded,packageDto;
                assert(inputs.handover.pagePath.startsWith('/projects/'+inputs.project.id), 'Owned project UI route required');
                await step(journey,'upload','actual-ui',async()=>{
                    await login('admin'); await page.goto(inputs.origin+'/projects/'+inputs.project.id);
                    const panel=page.locator('app-attachment-panel').first(); await button(panel,'上传附件').click();
                    const dialog=page.getByRole('dialog',{name:'上传附件',exact:true});
                    await dialog.locator('input[type=file]').setInputFiles({name:inputs.upload.name,mimeType:'text/plain',buffer:inputs.upload.bytes});
                    await dialog.locator('#createAttachmentCategory').click(); await page.getByRole('option',{name:inputs.upload.categoryLabel,exact:true}).click();
                    const complete=observeUiPending(page.waitForResponse(response=>new URL(response.url()).pathname.endsWith(':complete')&&new URL(response.url()).pathname.startsWith('/api/attachment-upload-sessions/')&&response.request().method()==='POST'));
                    await dialog.locator('button').filter({hasText:/^上传$/}).click(); const response=await complete; assert.equal(response.status(),200); uploaded=await response.json(); assert(uuid.test(uploaded.id));
                    await expect(dialog).not.toBeVisible(); return {actualUpload200:true,attachmentId:uploaded.id};
                },{projectId:inputs.project.id,originalName:inputs.upload.name,bytes:inputs.upload.bytes.length,sha256:sha(inputs.upload.bytes)});
                // Root afterStep has now drained SDK/PG and independently
                // certified the actual uploaded row before its ID is reused.
                await step(journey,'mark-final','actual-ui',async()=>{
                    const panel=page.locator('app-attachment-panel').first(),article=panel.locator('article').filter({hasText:inputs.upload.name});
                    await article.getByRole('button',{name:'标记最终版',exact:true}).click();
                    const dialog=page.getByRole('dialog',{name:'标记最终版',exact:true}),pending=waitResponse('POST','/api/attachments/'+uploaded.id+':mark-final');
                    await button(dialog,'确认标记').click(); assert.equal((await pending).status(),200); await expect(dialog).not.toBeVisible();return {actualFinal200:true};
                },{attachmentId:uploaded.id});
                await step(journey,'checklist-refresh-select','actual-ui',async()=>{
                    await page.goto(inputs.origin+inputs.handover.pagePath); const section=page.locator('app-project-contract-handover');
                    const pending=waitResponse('POST','/api/project-handovers/'+inputs.handover.id+'/attachment-checklist:refresh');await button(section,'刷新扫描').click();assert.equal((await pending).status(),200);
                    for(const checkbox of await section.locator('input[type=checkbox]').all())if(await checkbox.isEnabled())await checkbox.uncheck();
                    const row=section.locator('tr').filter({hasText:inputs.upload.name});await row.locator('input[type=checkbox]').check();return{actualRefresh200:true,oneOwnedSelection:true};
                },{handoverId:inputs.handover.id,attachmentId:uploaded.id});
                await step(journey,'package-create','actual-ui',async()=>{
                    const section=page.locator('app-project-contract-handover'),created=waitResponse('POST','/api/project-handovers/'+inputs.handover.id+'/attachment-download-packages');
                    await button(section,'创建下载包').click();const response=await created;assert.equal(response.status(),200);packageDto=await response.json();assert(uuid.test(packageDto.id));assert.equal(packageDto.status,'ready');
                    return{actualPackage200:true,packageId:packageDto.id};
                },{handoverId:inputs.handover.id,projectId:inputs.project.id});
                await step(journey,'package-download','actual-ui',async()=>{
                    const section=page.locator('app-project-contract-handover'),downloaded=observeUiPending(page.waitForEvent('download')),response=waitResponse('GET','/api/attachment-download-packages/'+packageDto.id+'/download');
                    await button(section,'下载包').click();assert.equal((await response).status(),200);const download=await downloaded;assert.equal(await download.failure(),null);
                    const retained=await retainDownload({download,label:'UI4-owned-package',sourceCapId:inputs.sourceCapId});assert(Buffer.isBuffer(retained.bytes));const zip=inspectStoredZip(retained.bytes);
                    assert.equal(zip.manifest.packageId,packageDto.id);assert.equal(zip.manifest.handoverId,inputs.handover.id);assert(zip.entries.some(entry=>entry.sha256===sha(inputs.upload.bytes)));
                    await screenshot('UI4-package');return{actualPackageDownload:true,packageId:packageDto.id,bytes:retained.bytes.length,rawBytesSha256:sha(retained.bytes),entries:zip.entries.length};
                },{handoverId:inputs.handover.id,packageId:packageDto.id});
                await step(journey,'cancel-upload-dialog','actual-ui',async()=>{await page.goto(inputs.origin+'/projects/'+inputs.project.id);const panel=page.locator('app-attachment-panel').first();await button(panel,'上传附件').click();const dialog=page.getByRole('dialog',{name:'上传附件',exact:true});await button(dialog,'取消').click();await expect(dialog).not.toBeVisible();await logout();return{dialogCancelledWithoutUpload:true}});
            }
            item.result='observed';
        }
        report.result='observed';
    }catch(error){
        report.result=signal?.aborted||error?.name==='AbortError'?'stopped':'fail';report.failure={category:'actual-ui-action-or-required-evidence-failed',...failureContext,rawErrorIncluded:false};
        // First preserve the original failure, including errors thrown by
        // onBeforeStep/onAfterStep. Screenshot/DOM failure cannot erase it.
        try{
            const evidence=await retainFailure({stage:'original-error-first',sourceCapId:inputs.sourceCapId,...failureContext,url:page.url(),error:{name:error?.name??typeof error,message:String(error?.message??error),stack:error?.stack??null,code:error?.code??null},diagnostics,lifecycleState:lifecycleState()});
            report.failure.privateEvidence=privateReference(evidence);
        }catch{report.failure.privateFailureRetentionFailed=true}
        const pageState={stage:'page-state-after-original-error',sourceCapId:inputs.sourceCapId,...failureContext,url:page.url(),originalEvidence:report.failure.privateEvidence??null};
        const attempt=async(name,callback)=>{let timer;try{pageState[name]=await Promise.race([callback(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('page-state-deadline')),3000)})])}catch(capture){(pageState.captureFailures??=[]).push({name,errorName:capture.name,message:boundedText(capture.message)})}finally{clearTimeout(timer)}};
        await attempt('dom',async()=>{const html=await page.content();return{html:html.slice(0,1024*1024),rawBytesSha256:sha(Buffer.from(html)),truncated:html.length>1024*1024}});
        await attempt('screenshot',async()=>{const bytes=await page.screenshot({fullPage:true,timeout:2500});return{mimeType:'image/png',bytes:bytes.length,rawBytesSha256:sha(bytes),bodyBase64:bytes.toString('base64')}});
        try{report.failure.privatePageEvidence=privateReference(await retainFailure(pageState))}catch{report.failure.privatePageRetentionFailed=true}
    }finally{for(const[event,handler]of Object.entries(handlers))page.off(event,handler);for(const{owner,event,handler}of lifecycleHandlers)owner.off(event,handler)}
    return report;
}
