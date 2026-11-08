// FS-only corrective seal. Original1bfab is immutable and remains on hold.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{fileURLToPath}from'node:url';import{sha219,C219}from'./facts219.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../../../..'),rel=f=>path.relative(root,f).split(path.sep).join('/'),pin=f=>{const b=fs.readFileSync(f);return{file:rel(f),bytes:b.length,rawBytesSha256:sha219(b)};},write=(n,x)=>{fs.writeFileSync(dir+'/'+n,JSON.stringify(x,null,2)+'\n',{flag:'wx'});return pin(dir+'/'+n);};
const oldPath=root+'/tools/rust-r4ghi/I/implementation/mixed-period-allocation219/manifest219.json',oldRaw=fs.readFileSync(oldPath);assert.equal(sha219(oldRaw),'1bfab12235131b15ec4e2b26dd84c9ff9e7f65a02dd0005a8e286f06be814ca6');const old=JSON.parse(oldRaw);
for(const p of [...old.executableFiles,...old.supportFiles,old.historicalInventory])assert.equal(sha219(fs.readFileSync(root+'/'+p.file)),p.rawBytesSha256,'Original219 changed: '+p.file);
const privateRoot=process.platform==='win32'?'//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private':'/home/wangzishi/.local/share/poms-r4ghi/private',sources=JSON.parse(fs.readFileSync(privateRoot+'/source13-preparation193/sourcePins.json'));
assert.equal(sources.length,416);assert.equal(sha219(JSON.stringify(sources)),C219.sourceSHA);for(const p of sources)assert.equal(sha219(fs.readFileSync(root+'/'+p.file)),p.sha256);
const executables=['driver219.mjs','runtime219.mjs','facts219.mjs','inventory219.mjs','fi219.mjs','semantics219.mjs','transport219.mjs'].map(n=>pin(dir+'/'+n)),support=['facts219.test.mjs','input219.template.json','README219.md','prepare219-02.mjs','preserve-test-attempt01.mjs','history/facts219-realm-attempt01.mjs','history/test-attempt01.json','seal219-02.mjs'].map(n=>pin(dir+'/'+n));
const findings=pin(root+'/tools/rust-r4ghi/independent/review05/mixed219-review126/nonce-probe126.json');assert.equal(findings.rawBytesSha256,'57d1bd680e32b5227b4b6bba3b62f5c785b7950fd1c84c6916248189afc497fd');
const helper=pin(root+'/tools/rust-r4ghi/business/tax13-semantics.mjs');assert.equal(helper.rawBytesSha256,'50aebe4bba9900e778161c44fedab128fa19b4e4635a0306154f15d212faf5b4');
const checks=write('checks219-02.json',{kind:'author-observed-pure-FS-corrective-checks219-02',recordedAtUTC:new Date().toISOString(),testCommand:[process.execPath,'--test','tools/rust-r4ghi/I/implementation/mixed-period-allocation219-02/facts219.test.mjs'],observedExitCode:0,tests:16,passed:16,failed:0,skipped:0,
 resultBasis:'Observed exec_command output for these exact16 cases; metadata observation is not captured original stdout',testedInputs:executables.concat(support.filter(p=>p.file.endsWith('/facts219.test.mjs')||p.file.endsWith('/input219.template.json'))),
 nonceCounterexample:'Actual exact reader source with virtual FS in the same V8 realm: valid accepted; missing/empty/different-header/foreign-prefix/overlength/contradictory-inner-block rejected',
 currentReaderOverrideRemoved:true,narrowBeforeBridgeInterface:'historicalOwnedRowsTax13(ctx,before,after,attempt) with exact receiptId+ledger preserved',
 actualTaxSuccessorBinding:'Exact Tax-after supersedes + F-new-basis raw SHA/xmin/common TX + complete original source cost; another plausible2:1 batch rejected',
 original1bfabAndAllFilesUnchanged:true,initialTestHarnessRealmFailurePreserved:true,source416LeavesUnchanged:true,RootApplied:false,SQLOrHTTPExecuted:false,liveStateReadOrWritten:false,G3Certified:false,G4Certified:false});
const manifest=write('manifest219-02.json',{...old,kind:'proposed-external-mixed-live-period-allocation219-corrective02',predecessorManifest:pin(oldPath),original1bfabRemainsHeld:true,independentFinding:findings,
 executableFiles:executables,supportFiles:support,checks,originalAuthorChecks:old.checks,historicalInventory:old.historicalInventory,
 proposedPromotion:executables.map(p=>({source:p,target:'tools/rust-r4ghi/mixed-period-allocation219/'+path.basename(p.file)})),template:support.find(p=>p.file.endsWith('/input219.template.json')),
 correctiveBoundary:{nonce:'Exact retained prefix + nonempty1..100 ASCII nonce + HTTP/config/header equality',innerEligibility:'Both blocker lists empty',
 historicalRead:'No boolean/global override; reuse reviewed H125 attempt/birth/latest/ledger bridge for changed four tables; all after and unchanged reads strict',narrowBridgeDependency:helper,
 TaxBatch:'Bind selected basis and all source-cost IDs to immutable actual Tax-after successor and exact business-TX write record',
 authSession:'Only original actual request cookie binds its historical session ID; no economic history bypass or old-cookie request',
 actualRuntimeEffectPins:'Still Root-filled later; code02 and its tests create no actual Tax/period/119/FI/mixed delivery evidence'},
 RootApplied:false,actualEffectsExecuted:false,product416Modified:false,H1ModifiedByThisAgent:false,G3Certified:false,G4Certified:false});
console.log(JSON.stringify({manifest,checks,original1bfabPreserved:true,source416Unchanged:true,RootApplied:false,actualEffectsExecuted:false}));
