import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {uiFixture} from './ui-fixture-client.mjs';
const require=createRequire(import.meta.url),{chromium,expect}=require('@playwright/test'),runtime=require('../e2e/runtime.cjs');
const [backend,ownerTag,tag]=process.argv.slice(2);assert(['nest','rust'].includes(backend)&&[ownerTag,tag].every(value=>/^[a-z0-9-]{1,35}$/.test(value)));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),runId=randomUUID();
const stem=`tmp/rust-r2ij/ui-${process.platform}-${backend}-${tag}`;assert(!existsSync(stem));mkdirSync(stem,{recursive:true,mode:0o700});
const receiptFile=`tmp/rust-r2ij/owner-${backend}-${ownerTag}-start.json`,owner=JSON.parse(readFileSync(receiptFile));assert.equal(owner.backend,backend);assert.equal(owner.origin,'http://127.0.0.1:'+(backend==='nest'?'6700':'6701'));
const report={formatVersion:1,backend,tag,runId,node:process.version,platform:process.platform,ownerReceiptSha256:hash(readFileSync(receiptFile)),binarySha256:owner.binarySha256,result:'pending',scope:'Actual original components in test-only Angular host; no R3 business page handoff, request interception, direct API substitutes or store calls',transport:{browserOrigin:'http://127.0.0.1:6800',sameOriginStreamingProxyTo:owner.origin},steps:[],network:[],browserErrors:[],screenshots:[]};
function filesUnder(root){const files=[];function visit(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){assert(!entry.isSymbolicLink());const file=dir+'/'+entry.name;if(entry.isDirectory())visit(file);else if(entry.isFile())files.push(file);}}visit(root);return files.sort();}
const inputs=[...filesUnder('tools/rust-r2ij/ui-host'),'tools/rust-r2ij/ui-acceptance.mjs','tools/rust-r2ij/ui-fixture-client.mjs','tools/rust-r2ij/ui-fixture-cli.mjs','tools/rust-r2ij/ui-static-server.mjs','tools/rust-r2ij/owned-fixture.mjs','tools/rust-r2ij/fixture-permissions.mjs','apps/poms-admin/src/app/shared/ui/attachment-panel.ts','apps/poms-admin/src/app/features/attachment/attachment-center.ts','apps/poms-admin/src/app/features/platform/attachment-storage-provider-list.ts','apps/poms-admin/src/app/features/platform/attachment-storage-provider-card.ts','libs/admin/data-access/src/lib/attachment/attachment.store.ts','libs/admin/data-access/src/lib/attachment/attachment-center.store.ts','libs/admin/data-access/src/lib/attachment-storage-provider/attachment-storage-provider.store.ts','libs/admin/data-access/src/lib/poms-api/provide-poms-api-client.ts'];
mkdirSync(stem+'/inputs',{mode:0o700});report.inputs=inputs.map((file,index)=>{const bytes=readFileSync(file),snapshot=stem+'/inputs/'+String(index).padStart(2,'0')+'-'+path.basename(file);writeFileSync(snapshot,bytes,{flag:'wx',mode:0o600});return {file,snapshot,sha256:hash(bytes),bytes:bytes.length};});
const buildManifest=()=>filesUnder('dist/tools/rust-r2ij-ui-host').map(file=>{const bytes=readFileSync(file);return {file,bytes:bytes.length,sha256:hash(bytes)};});report.buildFiles=buildManifest();assert(report.buildFiles.length>3);
let handle,browser,context,page,fixture;
const call=(action,extra={})=>uiFixture({backend,runId,action,...extra});
function api(method,pathname){const pending=page.waitForResponse(response=>new URL(response.url()).origin==='http://127.0.0.1:6800'&&response.request().method()===method&&new URL(response.url()).pathname===pathname,{timeout:25000});pending.catch(()=>{});return pending;}
async function step(name,action){await action();report.steps.push({name,result:'pass'});}
async function screenshot(name){const file=stem+'/'+name+'.png';await page.screenshot({path:file,fullPage:true});report.screenshots.push({name,file,sha256:hash(readFileSync(file))});}
async function choose(id){await page.locator('#'+id).click();await page.getByRole('option').first().click();}
try{
    fixture=await call('prepare');
    handle=await runtime.startOwned({kind:'admin',executable:process.execPath,args:[path.resolve('tools/rust-r2ij/ui-static-server.mjs'),backend],cwd:process.cwd(),env:process.env,host:'127.0.0.1',port:6800,readyUrl:'http://127.0.0.1:6800',validateReady:response=>response.status===200&&response.bodyText.includes('<app-root>'),logPath:path.resolve(stem+'/server.log'),timeoutMs:20000});
    report.server={pid:handle.serverPid,loopbackPort:6800,upstream:owner.origin};
    let executablePath;
    if(process.platform==='win32'){executablePath=path.resolve('tmp/rust-r2ef/windows-browser-cache/chromium-1243/chrome-win64/chrome.exe');assert(existsSync(executablePath));}
    browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});report.browser=browser.version();context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});page=await context.newPage();page.setDefaultTimeout(20000);
    page.on('response',response=>{const url=new URL(response.url());if(url.origin==='http://127.0.0.1:6800'&&url.pathname.startsWith('/api'))report.network.push({method:response.request().method(),path:url.pathname,status:response.status()});});
    page.on('pageerror',error=>report.browserErrors.push(error.message));
    await step('Actual AuthApi login and cookie/CSRF setup',async()=>{
        await page.goto(`http://127.0.0.1:6800/?backend=${backend}&targetType=customer&targetId=${fixture.targets.customer}`);
        await page.locator('#fixtureUsername').fill(fixture.admin.username);await page.locator('#fixturePassword').fill(fixture.admin.password);await page.getByRole('button',{name:'登录验收账号'}).click();await expect(page.getByTestId('fixture-user')).toBeVisible();await expect(page.getByRole('heading',{name:'文件存储接入'})).toBeVisible();
    });
    const local=page.locator('app-attachment-storage-provider-card').filter({hasText:'本地存储'}).first(),prefix='ij-'+runId+'/ui',displayName='UI '+runId;
    report.initialDom={cards:await page.locator('app-attachment-storage-provider-card').allTextContents(),buttons:await page.getByRole('button').allTextContents()};
    await step('Original provider create enabled local configuration',async()=>{
        await call('plan-provider',{selectors:{provider_type:'local',key_prefix:prefix,display_name:displayName}});
        await local.getByRole('button',{name:/配置/}).click();const dialog=page.getByRole('dialog');await dialog.locator('#attachmentStorageDisplayName').fill(displayName);await dialog.locator('#attachmentStorageKeyPrefix').fill(prefix);await dialog.getByRole('switch').first().check();
        const response=api('POST','/api/platform/attachment-storage-providers');await dialog.getByRole('button',{name:'创建'}).click();assert.equal((await response).status(),201);await expect(dialog).not.toBeVisible();await call('adopt');await expect(local.getByText(displayName,{exact:true})).toBeVisible();
    });
    await step('Original provider testConnection and set default',async()=>{
        const facts=await call('facts'),config=facts.attachment_storage_provider_config[0];assert(config&&config.enabled);
        let response=api('POST',`/api/platform/attachment-storage-providers/${config.id}:testConnection`);await local.getByRole('button',{name:'测试连接'}).click();assert.equal((await response).status(),200);
        response=api('POST',`/api/platform/attachment-storage-providers/${config.id}:set-default`);await local.getByRole('button',{name:'设为默认'}).click();assert.equal((await response).status(),200);await expect(local.getByRole('button',{name:'已默认'})).toBeVisible();await call('adopt');
    });await screenshot('providers');
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l7sAAAAASUVORK5CYII=','base64'),filename='ui-'+runId+'.png';
    await step('Original AttachmentPanel real upload session, PUT and complete',async()=>{
        await page.getByRole('button',{name:'附件面板'}).click();await expect(page.getByText('暂无附件。',{exact:true})).toBeVisible();await page.getByRole('button',{name:'上传附件'}).click();const dialog=page.getByRole('dialog',{name:'上传附件'});
        await dialog.locator('input[type=file]').setInputFiles({name:filename,mimeType:'image/png',buffer:png});await choose('createAttachmentCategory');
        await call('plan-upload',{selectors:{operation_type:'create-attachment',original_name:filename,target_type:'customer',target_id:fixture.targets.customer},payloadBase64:png.toString('base64')});
        const completed=page.waitForResponse(response=>new URL(response.url()).pathname.startsWith('/api/attachment-upload-sessions/')&&response.url().endsWith(':complete')&&response.request().method()==='POST');completed.catch(()=>{});await dialog.getByRole('button',{name:'上传'}).click();assert.equal((await completed).status(),200);await expect(dialog).not.toBeVisible();await call('adopt');await expect(page.locator('article').filter({hasText:filename})).toBeVisible();
    });
    const article=()=>page.locator('article').filter({hasText:filename}).first();
    await step('Original preview creates actual image blob with matching bytes',async()=>{
        await article().getByRole('button',{name:'预览附件'}).click();const dialog=page.getByRole('dialog',{name:filename});const img=dialog.locator('img');await expect(img).toBeVisible();await expect(img).toHaveJSProperty('naturalWidth',1);
        const actual=await img.evaluate(async element=>Array.from(new Uint8Array(await (await fetch(element.src)).arrayBuffer())));assert.equal(hash(Buffer.from(actual)),hash(png));await dialog.getByRole('button',{name:/close|关闭/i}).click();
    });
    await step('Original download produces actual matching PNG',async()=>{
        const event=page.waitForEvent('download');event.catch(()=>{});await article().getByRole('button',{name:'下载附件'}).click();const download=await event,file=stem+'/download.png';await download.saveAs(file);assert.equal(hash(readFileSync(file)),hash(png));report.download={bytes:png.length,sha256:hash(png),suggestedFilename:download.suggestedFilename()};
    });
    await step('Original mark-final and clear-final dialogs persist state',async()=>{
        await article().getByRole('button',{name:'标记最终版'}).click();let dialog=page.getByRole('dialog',{name:'标记最终版'});await dialog.locator('#markFinalNote').fill('UI actual final '+runId);await dialog.getByRole('button',{name:'确认标记'}).click();await expect(dialog).not.toBeVisible();await expect(article().getByRole('button',{name:'撤销最终版'})).toBeVisible();
        await article().getByRole('button',{name:'撤销最终版'}).click();dialog=page.getByRole('dialog',{name:'撤销最终版'});await dialog.locator('#clearFinalReason').fill('UI actual clear '+runId);await dialog.getByRole('button',{name:'确认撤销'}).click();await expect(dialog).not.toBeVisible();await expect(article().getByRole('button',{name:'标记最终版'})).toBeVisible();await call('adopt');
    });await screenshot('panel');
    await step('Original versions dialog reads one real version',async()=>{await article().getByRole('button',{name:'查看版本'}).click();const dialog=page.getByRole('dialog',{name:filename});await expect(dialog).toBeVisible();await expect(dialog.getByText('v1',{exact:true})).toBeVisible();await dialog.getByRole('button',{name:/close|关闭/i}).click();});
    await step('Original version upload preserves actual complete500 and retry feedback',async()=>{
        const before=await call('facts'),attachment=before.attachment[0],versionName='ui-version-'+runId+'.png';assert(attachment);
        await article().getByRole('button',{name:'上传新版本'}).click();const dialog=page.getByRole('dialog',{name:'上传新版本'});
        await dialog.locator('input[type=file]').setInputFiles({name:versionName,mimeType:'image/png',buffer:png});await dialog.locator('#attachmentChangeNote').fill('Actual legacy version failure '+runId);
        await call('plan-upload',{selectors:{operation_type:'create-version',original_name:versionName,base_attachment_id:attachment.id},payloadBase64:png.toString('base64')});
        const completed=page.waitForResponse(response=>new URL(response.url()).pathname.startsWith('/api/attachment-upload-sessions/')&&response.url().endsWith(':complete')&&response.request().method()==='POST');completed.catch(()=>{});
        await dialog.getByRole('button',{name:'上传新版本'}).click();assert.equal((await completed).status(),500);await expect(dialog.getByText('新版本没有上传成功')).toBeVisible();await expect(dialog.getByText(versionName)).toBeVisible();await expect(dialog.getByRole('button',{name:'重试上传新版本'})).toBeEnabled();
        await screenshot('version-failure');await dialog.getByRole('button',{name:'取消'}).click();await call('adopt');const after=await call('facts');assert.equal(after.attachment.length,1);assert.deepEqual(after.attachment,before.attachment);report.versionFailure={httpStatus:500,attachmentsUnchanged:true,sessionStates:after.attachment_upload_session.map(row=>({operation:row.operation_type,status:row.status,rowVersion:row.row_version}))};
    });
    await step('Original center search and source navigation',async()=>{
        await page.getByRole('button',{name:'附件中心'}).click();await page.getByPlaceholder('搜索文件名、业务对象、上传人').fill(filename);await expect(page.getByText(filename,{exact:true}).first()).toBeVisible();await screenshot('center');await page.getByRole('button',{name:'查看来源'}).first().click();await expect(page.getByTestId('source-url')).toContainText('/customers?customerId='+fixture.targets.customer);
    });
    await step('Permission refresh shows actual component read-only state',async()=>{
        await call('permissions',{keys:['customer:read','platform:dictionaries:manage']});await page.goto(`http://127.0.0.1:6800/?backend=${backend}&targetType=customer&targetId=${fixture.targets.customer}`);await expect(page.getByTestId('fixture-user')).toBeVisible();await page.getByRole('button',{name:'附件面板'}).click();await expect(article()).toBeVisible();await expect(page.getByRole('button',{name:'上传附件'})).toHaveCount(0);await expect(page.getByRole('button',{name:'标记最终版'})).toHaveCount(0);await call('permissions',{keys:JSON.parse(readFileSync('tools/rust-r1b/shared-manifest.json')).declarations.find(entry=>entry.name==='PERMISSION_KEYS').value});
    });
    await step('Original panel void action persists status and removes active row',async()=>{
        await page.goto(`http://127.0.0.1:6800/?backend=${backend}&targetType=customer&targetId=${fixture.targets.customer}`);await expect(page.getByTestId('fixture-user')).toBeVisible();await page.getByRole('button',{name:'附件面板'}).click();await expect(article()).toBeVisible();
        const facts=await call('facts'),attachment=facts.attachment[0];assert(attachment);const response=api('POST',`/api/attachments/${attachment.id}:void`);await article().getByRole('button',{name:'作废附件'}).click();assert.equal((await response).status(),200);await expect(article()).toHaveCount(0);await expect(page.getByText('暂无附件。',{exact:true})).toBeVisible();await call('adopt');await screenshot('voided');
    });
    await call('adopt');const facts=await call('facts');report.facts={attachmentCount:facts.attachment.length,linkCount:facts.attachment_link.length,auditEvents:facts.audit_log.map(row=>row.event_type).sort(),statuses:facts.attachment.map(row=>row.status),final:facts.attachment.map(row=>row.is_final),providerDefault:facts.attachment_storage_provider_config.map(row=>row.is_default)};
    assert.equal(report.facts.attachmentCount,1);assert.deepEqual(report.facts.statuses,['voided']);assert(report.facts.auditEvents.includes('attachment.previewed')&&report.facts.auditEvents.includes('attachment.downloaded')&&report.facts.auditEvents.includes('attachment.voided'));assert.deepEqual(report.browserErrors,[]);assert.deepEqual(buildManifest(),report.buildFiles);for(const input of report.inputs)assert.equal(hash(readFileSync(input.file)),input.sha256);report.inputsAndBuildUnchanged=true;report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,message:error.message};process.exitCode=1;if(page){try{await page.screenshot({path:stem+'/failure.png',fullPage:true});}catch{}}}
finally{
    if(context)await context.close();if(browser)await browser.close();if(handle){await runtime.stopOwned(handle);await runtime.assertPortAvailable({host:'127.0.0.1',port:6800});report.serverStopped=true;}
    if(fixture){try{report.cleanup=await call('cleanup');assert(report.cleanup.second.zero);}catch(error){report.result='fail';report.cleanupFailure={name:error.name,message:error.message};process.exitCode=1;}}
    // Credential inputs are never logged; screenshots are taken only after login.
    report.finishedAt=new Date().toISOString();writeFileSync(stem+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({result:report.result,backend,platform:process.platform,steps:report.steps.length,failure:report.failure,cleanupFailure:report.cleanupFailure,zero:report.cleanup?.second.zero}));
}
