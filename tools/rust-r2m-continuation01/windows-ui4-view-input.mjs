// Existing Native UI4 handover GETs and the named project-detail GET only. No HTTP request is created.
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const KIND='R2M-attested-Windows-Native-UI4-original-view-readiness-input';
export function createNativeUi4ViewInput({arrangement,selection,inputs}){
    if(arrangement.mode!=='windows-managed-nest'||selection.length!==1||selection[0]!=='UI4')return null;
    assert(arrangement.kind==='Root-R2M-UI-runtime-arrangement'&&arrangement.apiBackend==='nest'&&arrangement.apiPlatform==='win32'&&arrangement.browserPlatform==='win32');
    assert(arrangement.sourceCapId===inputs.sourceCapId&&/^[0-9a-f]{64}$/.test(arrangement.actualNativeOwnerEvidenceSha256??''));
    const input={kind:KIND,journey:'UI4',sourceCapId:inputs.sourceCapId,origin:inputs.origin,apiBackend:'nest',apiPlatform:'win32',browserPlatform:'win32',nativeOwnerEvidenceSha256:arrangement.actualNativeOwnerEvidenceSha256,projectId:inputs.project.id,handoverId:inputs.handover.id,readinessTimeoutMs:150000};
    assertNativeUi4ViewInput(input,inputs);return Object.freeze(input);
}
export function assertNativeUi4ViewInput(input,inputs){
    assert.deepEqual(Object.keys(input).sort(),['kind','journey','sourceCapId','origin','apiBackend','apiPlatform','browserPlatform','nativeOwnerEvidenceSha256','projectId','handoverId','readinessTimeoutMs'].sort());
    assert(input.kind===KIND&&input.journey==='UI4'&&input.sourceCapId===inputs.sourceCapId&&input.origin===inputs.origin&&input.origin==='http://127.0.0.1:10080');
    assert(input.apiBackend==='nest'&&input.apiPlatform==='win32'&&input.browserPlatform==='win32'&&/^[0-9a-f]{64}$/.test(input.nativeOwnerEvidenceSha256));
    assert(uuid.test(input.projectId)&&uuid.test(input.handoverId)&&input.projectId===inputs.project.id&&input.handoverId===inputs.handover.id&&inputs.handover.project_id===input.projectId);
    assert.equal(inputs.handover.pagePath,'/projects/'+input.projectId+'/workspace/contract-handover');assert.equal(input.readinessTimeoutMs,150000);return input;
}
export function registerNativeUi4ViewReadiness({page,inputs,input,setTimer=setTimeout,clearTimer=clearTimeout}){
    assertNativeUi4ViewInput(input,inputs);const views=['contract-handover','project-handover'];let timer;
    const pending=views.map(view=>{const pathname='/api/projects/'+input.projectId+'/'+view,promise=page.waitForResponse(response=>{const url=new URL(response.url());return url.origin===input.origin&&url.pathname===pathname&&response.request().method()==='GET'},{timeout:input.readinessTimeoutMs});void promise.catch(()=>{});return{view,promise}});
    const complete=Promise.all(pending.map(async({view,promise})=>{const response=await promise;assert.equal(response.status(),200,'Original view GET must actually return200');assert.equal(await response.finished(),null,'Original browser response body transport must finish');const bytes=await response.body();assert(Buffer.isBuffer(bytes));const body=JSON.parse(bytes.toString('utf8'));assert(body&&typeof body==='object'&&!Array.isArray(body));assert.equal(body.projectId,input.projectId,'Original view must belong to the already-certified project');if(view==='project-handover')assert.equal(body.handoverId,input.handoverId,'Original detail must match the already-certified handover');return{view,status:response.status(),bodyBytes:bytes.length,bodySha256:sha(bytes),completeBodyRead:true,projectMatchedExistingInput:true,...(view==='project-handover'?{handoverMatchedExistingInput:true}:{})}}));void complete.catch(()=>{});
    const deadline=new Promise((_,reject)=>{timer=setTimer(()=>reject(new Error('Native UI4 original view response readiness deadline')),input.readinessTimeoutMs);timer?.unref?.()});
    const ready=Promise.race([complete,deadline]).then(responses=>({kind:'original-two-Native-UI4-view-GETs-complete-before-original-button',sourceCapId:input.sourceCapId,responses,additionalRequests:0,newOwnershipGranted:false})).finally(()=>clearTimer(timer));void ready.catch(()=>{});
    return{ready,dispose(){clearTimer(timer)}};
}
export async function gotoNativeUi4OriginalView({page,inputs,input,setTimer=setTimeout,clearTimer=clearTimeout}){
    const observed=registerNativeUi4ViewReadiness({page,inputs,input,setTimer,clearTimer});
    try{await page.goto(inputs.origin+inputs.handover.pagePath);return await observed.ready}finally{observed.dispose()}
}

// ProjectDetail's top-level loading is ProjectStore.loading: only loadProject's
// GET-by-ID body gates the attachment panel; timeline/archive requests are separate.
export function registerNativeUi4ProjectDetailReadiness({page,inputs,input,setTimer=setTimeout,clearTimer=clearTimeout}){
    assertNativeUi4ViewInput(input,inputs);let timer;const pathname='/api/projects/'+input.projectId;
    const pending=page.waitForResponse(response=>{const url=new URL(response.url());return url.origin===input.origin&&url.pathname===pathname&&response.request().method()==='GET'},{timeout:input.readinessTimeoutMs});void pending.catch(()=>{});
    const complete=pending.then(async response=>{assert.equal(response.status(),200,'Original project detail GET must actually return200');assert.equal(await response.finished(),null,'Original project detail body transport must finish');const bytes=await response.body();assert(Buffer.isBuffer(bytes));const body=JSON.parse(bytes.toString('utf8'));assert(body&&typeof body==='object'&&!Array.isArray(body));assert.equal(body.id,input.projectId,'Original detail must match the already-certified project');return{view:'project-detail',status:response.status(),bodyBytes:bytes.length,bodySha256:sha(bytes),completeBodyRead:true,projectMatchedExistingInput:true}});void complete.catch(()=>{});
    const deadline=new Promise((_,reject)=>{timer=setTimer(()=>reject(new Error('Native UI4 original project detail response readiness deadline')),input.readinessTimeoutMs);timer?.unref?.()});
    const ready=Promise.race([complete,deadline]).then(response=>({kind:'original-Native-UI4-project-detail-GET-complete-before-original-cancel-button',sourceCapId:input.sourceCapId,response,additionalRequests:0,newOwnershipGranted:false})).finally(()=>clearTimer(timer));void ready.catch(()=>{});return{ready,dispose(){clearTimer(timer)}};
}
export async function gotoNativeUi4OriginalProjectDetail({page,inputs,input,setTimer=setTimeout,clearTimer=clearTimeout}){
    const observed=registerNativeUi4ProjectDetailReadiness({page,inputs,input,setTimer,clearTimer});
    try{await page.goto(inputs.origin+'/projects/'+inputs.project.id);return await observed.ready}finally{observed.dispose()}
}
