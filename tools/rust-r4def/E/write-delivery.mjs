import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const at=(file)=>path.join(root,file);
const read=(file)=>fs.readFileSync(at(file),'utf8');
const pin=(file)=>{const b=fs.readFileSync(at(file));return{file,bytes:b.length,rawBytesSha256:createHash('sha256').update(b).digest('hex')};};
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const base=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert(base==='756d813c9578090fcf8e56821acce01b46b40420','Unexpected metadata baseline');
const gatePath='docs/design/rust-r4def/g1-gate-authority07.json';
const gate=JSON.parse(read(gatePath));
assert(gate.G1Certified===true&&gate.G2Authorized===true,'No G2 admission');
assert(pin(gate.inputManifest.file).rawBytesSha256===gate.inputManifest.rawBytesSha256,'G1 manifest fingerprint changed');
const receiptPath='tools/rust-r4def/E/evidence/author-checks03/receipt.json';
const receipt=JSON.parse(read(receiptPath));
assert(receipt.sourcesUnchangedDuringChecks===true&&receipt.checks.every((c)=>c.status==='passed'),'Final author checks did not pass');
const productFiles=receipt.after.map((p)=>pin(p.file));
for(const p of productFiles)assert(receipt.after.some((old)=>old.file===p.file&&old.rawBytesSha256===p.rawBytesSha256),'Final source differs from tested source');
const stdout=read(receipt.checks.find((c)=>c.id==='pure-tests').stdout);
const result=stdout.match(/test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored/);
assert(result&&Number(result[1])>=25&&result[2]==='0','No final pure-test result');
const expected=JSON.parse(read('docs/design/rust-r4def/joint-g1-06/operation-map06.json')).operations.filter((o)=>o.group==='E');
const names=new Set([...read('apps/poms-api-rust/src/project_actual_cost/mod.rs').matchAll(/"(ProjectCostController_[a-zA-Z0-9_]+)"/g)].map((m)=>m[1]));
assert(expected.length===11&&names.size===11&&expected.every((o)=>names.has(o.operationId)),'Operation ownership mismatch');
const supportFiles=['tools/rust-r4def/E/.gitignore','tools/rust-r4def/E/run-checks.ps1','tools/rust-r4def/E/write-delivery.mjs','tools/rust-r4def/E/HANDOFF.md'];
const inputs=[gatePath,gate.inputManifest.file,'docs/design/rust-r4def/joint-g1-06/operation-map06.json','docs/design/rust-r4def/joint-g1-06/schema-authority06.json','docs/design/rust-r4def/joint-g1-06/schema06.sql','docs/design/rust-r4def/ownership04.md','docs/design/rust-r4def/protocol01.md','docs/design/rust-r4def/root-decisions02.json','docs/design/rust-r4def/root-projection05.json','docs/design/rust-r4def/E-g1-candidate02.json'];
const prior=['author-checks01','author-checks02','author-checks03'].map((id)=>{
 const file=`tools/rust-r4def/E/evidence/${id}/receipt.json`;
 const r=JSON.parse(read(file));
 return{...pin(file),sourcesStableForThatRun:r.sourcesUnchangedDuringChecks,finalSourceMatches:r.after.every((p)=>productFiles.some((now)=>now.file===p.file&&now.rawBytesSha256===p.rawBytesSha256)),checks:r.checks.map((c)=>({id:c.id,status:c.status,exitCode:c.exitCode})),logs:r.checks.flatMap((c)=>[pin(c.stdout),pin(c.stderr)])};
});
const output={
 kind:'R4E-author-production-delivery',createdAt:new Date().toISOString(),base,branch:execFileSync('git',['-C',root,'branch','--show-current'],{encoding:'utf8'}).trim(),childIssue:108,parentBatch:106,G2Authorized:true,
 status:'E implementation ready for Root integration; independent G3/runtime acceptance/G4 not certified',
 counts:{operations:11,createVariants:5,pureTestsPassed:Number(result[1]),pureTestsFailed:0,pureTestsIgnored:Number(result[3])},
 productFiles,supportFiles:supportFiles.map(pin),frozenInputs:inputs.map(pin),finalReceipt:pin(receiptPath),authorCheckHistory:prior,
 rootOwnedCompileInputs:receipt.rootOwnedCompileInputs,
 excludeFromEProductImport:['apps/poms-api-rust/src/lib.rs','apps/poms-api-rust/src/contract_support/mod.rs','tools/rust-r4def/E/compile/** (optional check-only scaffolding)','ignored Windows logic-tests.exe/.pdb','any target/cache outputs'],
 publicInternalApis:[
  'execute(&mut CommonSession,operationId,Option<Uuid>,query,body,&Actor)->Result<Value,Error>',
  'source_facts(&mut PgConnection,&cost,lock)->Result<Value,Error>',
  'lock_source_families(&mut PgConnection,&[Value])->Result<(),Error>',
  'compare_source_transition(&cost,&previous_source_payload,&current_source_payload)->Result<Option<&static str>,Error>'
 ],
 requiredRootIntegration:['Register execute in execution_support for frozen E11; shared input validators and HTTP/session/CSRF permissions remain Root-owned','Successful GET and writes must unconditionally flush common pending auth before single outer commit, including projection-only SecurityEvents','Apply frozen native migration/entity/schema and real C invoice currency producer; currency proof uses same snapshot -> source preparation','Runtime audit reads must enforce metadata.requiredSensitivePackages around before/after/reason/metadata; no raw audit bypass','F prelocks entire source family set and persists version-transition evidence/previous certified anchors; client CAS stays strict'],
 scopedBehavior:{allNewCosts:'registered and not included; F evidence-confirm owns confirmed+stage lock',money:'strict18,2 currency; rate15,4; quantity10,2; exact integer multiplication HALF_UP cents; zero result rejects422; legacy nonzero subcents rejected without round',projection:'all protected raw compatibility keys literal null for every caller; operating-finance for expense/nonlabor, labor-cost-rate for labor; audit/security event on borrowed outer transaction',laborWrites:'finance-manage outer guard plus labor-sensitive read before calculation/comparison; no extra operating permission for E single-row labor',sourceVersions:'strict client CAS; only explicit narrow payable progress and controlled covered-period rate supersession proofs; E source_basis immutable',attachments:'real unique active direct-project attachment references/version/checksum/security; no fabricated length or link'},
 actualValidation:{rustfmt:'passed WSL1.99.1',clippy:'passed actual production crate --lib -- -D warnings; no new warnings',pureTests:'passed actual production crate project_actual_cost group',standaloneStdLogic:'earlier Windows Rust1.99.0 9/9 passed; final authority is WSL actual-crate run',database:'not run by author',http:'not run by author',browser:'not run by author',migration:'not run by author',generatedClient:'Root-owned; not generated by author',independentG3:'not performed by author',G4:'not performed by author'},
 unresolvedBusinessDecisions:[],
 runtimeAcceptanceStillRequired:['real A/B/C and E producers -> E registration -> F stage/allocations/tax','strict source/cost CAS, duplicates, current uniqueness, replacement/frozen-source races, whole-family lock ordering','transactional rollback at number/fact/basis/audit/security-event/auth-coflush/commit boundaries','C payable progress -> F confirmation; rate successor -> original covered labor confirmation; later prior-certified anchor advance','invoice persisted currency and immutable snapshot/preparation proof; unknown legacy rejection','attachment missing/cross-project/deleted/security/changed evidence','real response DTO/client/UI privacy and behavior including runtime audit routes','precise owned cleanup and independent review'],
 commitPerformed:false,pushPerformed:false,GitHubChangedByAuthor:false,productionSharedFilesChangedByAuthor:false
};
const out='tools/rust-r4def/E/delivery01.json';fs.writeFileSync(at(out),JSON.stringify(output,null,2)+'\n','utf8');
console.log(JSON.stringify({file:pin(out),counts:output.counts,products:productFiles,unresolvedBusinessDecisions:0,runtimeAcceptance:'Root-owned, not run by author'}));
