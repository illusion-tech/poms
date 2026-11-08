import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const out = path.dirname(fileURLToPath(import.meta.url));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const source = 'E:/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/gh-reload43';
const inputs = [], sha = value => createHash('sha256').update(value).digest('hex');
function read(file, expected, bytes) { const raw = fs.readFileSync(file); if (expected) assert.equal(sha(raw), expected, file); if (bytes !== undefined) assert.equal(raw.length, bytes, file); inputs.push({ file, bytes: raw.length, rawBytesSha256: sha(raw) }); return raw; }
function json(file, expected, bytes) { return JSON.parse(read(file, expected, bytes)); }
const manifest = json(source+'/manifest43.json','0a449555c996a1795c2a0db1b684209cfa189dbcb1c052f5bb48cd40d0c0ecee');
assert.equal(manifest.products.length,1); assert.equal(manifest.files.length,7);
for (const pin of manifest.files) read(source+'/'+pin.file,pin.rawBytesSha256,pin.bytes);
const product=manifest.products[0], before=read(root+'/'+product.file,product.beforeSHA256).toString('utf8'), after=read(source+'/'+product.candidate,product.afterSHA256).toString('utf8');
const a=before.split('\n'),b=after.split('\n'); assert.equal(a.length,b.length);
const changed=a.flatMap((line,i)=>line===b[i]?[]:[i+1]); assert.deepEqual(changed,[10,12]);
const oldBaseline="await author.locator('label').filter({hasText:/^编制任务/}).locator('select').selectOption('baseline-activation');const p=(await actual('ProjectCostController_getProjectUnifiedAccounting',baselinePrep)).preparation;";
const newBaseline="const intentSelect=author.locator('label').filter({hasText:/^编制任务/}).locator('select'),readBasis=author.getByRole('button',{name:'读取编制依据',exact:true});await expect(intentSelect).toHaveCount(1);await expect(readBasis).toHaveCount(1);await intentSelect.selectOption('baseline-activation');await expect(intentSelect).toHaveValue('baseline-activation');await readBasis.click();const p=(await actual('ProjectCostController_getProjectUnifiedAccounting',baselinePrep)).preparation;assert.equal(p.intent,'baseline-activation');";
const oldCapture="await author.locator('label').filter({hasText:/^编制任务/}).locator('select').selectOption('snapshot-create');const prepared=(await actual('ProjectCostController_getProjectUnifiedAccounting',capturePrep)).preparation;";
const newCapture="await intentSelect.selectOption('snapshot-create');await expect(intentSelect).toHaveValue('snapshot-create');await readBasis.click();const prepared=(await actual('ProjectCostController_getProjectUnifiedAccounting',capturePrep)).preparation;assert.equal(prepared.intent,'snapshot-create');";
let rebuilt=before; for(const [old,next]of [[oldBaseline,newBaseline],[oldCapture,newCapture]]) { assert.equal(rebuilt.split(old).length,2);rebuilt=rebuilt.replace(old,next); } assert.equal(rebuilt,after);
const diagnosis=json(source+'/diagnosis43.json'); assert.equal(diagnosis.sourceAndEvidencePins.length,17);
for(const pin of diagnosis.sourceAndEvidencePins)read(pin.file,pin.rawBytesSha256,pin.bytes);
const getJson=file=>JSON.parse(fs.readFileSync(file));
const receipt=getJson(root+'/tmp/rust-r4ghi/root/ui-runtime14/gh18-source12-02/receipt18-06.json');
assert.equal(receipt.status,'failed');assert.equal(receipt.exchanges.length,10);assert(receipt.exchanges.every(v=>v.method==='GET'&&v.status===200));assert.deepEqual(receipt.proxyFailures,[]);assert.equal(receipt.observerReceipts.length,10);
for(const item of receipt.observerReceipts){assert.equal(item.status,200);const ledger=json('//wsl.localhost/Debian'+item.ledger.file,item.ledger.rawBytesSha256);assert.equal(ledger.ownershipComplete,true);assert.deepEqual(ledger.blockers,[]);}
const caseDir=root+'/tmp/rust-r4ghi/private/ui-runtime14/gh18-source12-02/case-0';
const requests=getJson(caseDir+'/requests.json');assert.equal(requests.length,10);assert(requests.every(v=>v.method==='GET'));
const prep=requests.filter(v=>v.path.includes('/unified-accounting?'));assert.equal(prep.length,1);const query=new URL(prep[0].path,'http://127.0.0.1:44551').searchParams;assert.equal(query.get('view'),'preparation');assert.equal(query.get('intent'),'snapshot-create');assert.equal(query.get('snapshotMode'),'realtime');
const html=fs.readFileSync(caseDir+'/page.html','utf8'), component=html.split('<app-project-operating-authoring>')[1]?.split('</app-project-operating-authoring>')[0];assert(component);assert.equal([...component.matchAll(/<select\b/g)].length,1);assert(component.includes('value="baseline-activation"'));assert.equal([...component.matchAll(/<button[^>]*>\s*读取编制依据\s*<\/button>/g)].length,1);assert.equal([...component.matchAll(/<button[^>]*disabled[^>]*>\s*采用正式基线\s*<\/button>/g)].length,1);
const ts=fs.readFileSync(root+'/apps/poms-admin/src/app/features/project/project-operating-authoring.ts','utf8'),change=ts.split('    changeIntent(event: Event): void {')[1]?.split('    setPeriod(')[0],reload=ts.split('    reload(): void {')[1]?.split('    chooseDecision(')[0];assert(change&&!change.includes('prepareRequested.emit')&&!change.includes('reload()'));assert(reload.includes('this.prepareRequested.emit({'));assert(ts.includes('(click)="reload()">读取编制依据'));
const policy=read(root+'/tools/rust-r4ghi/business/ui-gh18-policy.mjs').toString('utf8');assert(policy.includes("assert.equal(params.projectId,projectId)"));assert(policy.includes("assert.equal(v.preparation.projectId,projectId)"));
assert(after.includes("Object.entries(query).every(([k,v])=>u.searchParams.get(k)===v)"));assert(after.includes("assert(r.headers()['x-poms-r4ghi-ui-run'])"));
const syntax=spawnSync(process.execPath,['--check',source+'/'+product.candidate],{encoding:'utf8',windowsHide:true});assert.equal(syntax.status,0);assert.equal(syntax.stderr,'');
const report={kind:'non-author-FS-only-GH43-browser-delta-review99',verdict:'bounded-tooling-admission',findings:[],sourceManifest:{file:source+'/manifest43.json',rawBytesSha256:'0a449555c996a1795c2a0db1b684209cfa189dbcb1c052f5bb48cd40d0c0ecee'},product,verified:{manifestFiles:7,diagnosisPins:17,changedLines:changed,exactTwoReplacementRebuild:true,productChangeIntentDoesNotFetch:true,explicitReloadEmitsPreparation:true,scopedUniqueSelectAndButton:true,watchBeforeAction:true,sameProjectCanonicalPathAndRequiredQueryValues:true,responseIntentMatchesSelection:true,allOtherBrowserBytesUnchanged:true,policyProjectScopeChecked:true,syntaxExitCode:syntax.status},priorActual:{run:'gh18-source12-02',status:'failed-preserved',GET200:10,domainPOST:0,baselinePreparationRequested:false,sessionTouchMayBeObserved:true},admission:{allowed:'After current driver finishes, exact one-file promotion, complete helper/UI re-freeze and actual fresh1351 actor proof, Root may run a new GH03.',notGranted:['No GH02 relabel','No fixed browser actual-pass assertion','No G3/G4 or main delivery']},execution:{RootProductWritten:false,RootHelperWritten:false,Git:false,HTTP:false,SQL:false,browser:false,processMutation:false},G3Certified:false,G4Certified:false,inputPins:inputs};
fs.writeFileSync(out+'/review99.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({verdict:report.verdict,findings:0,changedLines:changed,rawBytesSha256:sha(fs.readFileSync(out+'/review99.json'))}));
