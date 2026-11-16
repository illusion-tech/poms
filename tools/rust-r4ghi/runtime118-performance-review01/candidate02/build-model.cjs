const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',review=root+'/tools/rust-r4ghi/runtime118-performance-review01/candidate02',work=root+'/tmp/rust-r4ghi/root/runtime118-performance-review01',out=review+'/model01';
const sha=b=>createHash('sha256').update(b).digest('hex'),id=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)};};
const input=root+'/tools/rust-r4ghi/runtime118-performance-candidate02/review-input.json';assert.equal(id(input).rawBytesSha256,'42afdb5f347d4918299d18981eb826ab16aea4a244c0ae1cc3e49a81892b456d');const m=JSON.parse(fs.readFileSync(input));assert.equal(m.graph.length,285);assert(!fs.existsSync(out));
for(const p of m.graph){assert.equal(id(p.candidate.file).rawBytesSha256,p.candidate.rawBytesSha256);assert.equal(id(p.before.file).rawBytesSha256,p.before.rawBytesSha256);const target=out+'/'+p.relative;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,fs.readFileSync(p.candidate.file),{flag:'wx'});}
for(const p of m.tests)assert.equal(id(p.file).rawBytesSha256,p.rawBytesSha256);
for(const p of [m.corrective,m.limitedStaticDesignOpinion])assert.equal(id(p.file).rawBytesSha256,p.rawBytesSha256);
const native=out+'/tools/rust-r4ghi/business/runtime-admission121.mjs';
const adapter=`
// REVIEW-ONLY minimal-brand and liveness adapters. No actual constructor.
budgetLive118=function(b){assert.equal(b.__reviewOnly,true);assert.equal(b.pid,process.pid);return b;};
export function __reviewCloseModel118(proof,dir,facts){
 const state={},root={state};const methods={};for(const name of rootMethods121){root[name]=function(){throw Error('Actual Root method forbidden in independent model');};methods[name]=root[name];}
 facts??={plan:{protocolVersion:5,current:{binary:{file:'/review-owned/api'},summaryBinary:{file:'/review-owned/summary'},nodeExecutable:{file:'/review-owned/node'}}},parent:{code:{source:[],compile:[]}},composition:{helpers:[],executionSources:[]}};
 brands121.set(root,{type:'root',purpose:'budget-probe',root,state,methods,facts});
 const b={__reviewOnly:true,root,pid:process.pid,proof:{closeBudgetInvocation118:proof},dir,closed:false,closeAttempted:false,activeTicket:null,activeOperation:null,stage:'after',failed:false,port:null};
 return{close:()=>budgetClose118(b,null),state:()=>({closed:b.closed,closeAttempted:b.closeAttempted,closeFacts:b.closeFacts??null,closeResult:b.closeResult??null,profileUnavailable:b.performanceProfileUnavailable??false,profile:b.performanceProfile??null})};
}
export function __reviewReadCurrent118(pin){return read121Current(pin);}
`;
fs.appendFileSync(native,adapter);
const context=out+'/tools/rust-r4ghi/business/context.mjs',contextAdapter='\n// REVIEW-ONLY unchanged directory walker export.\nexport function __reviewWalk118(root,suffix){return walk(root,suffix);}\n';fs.appendFileSync(context,contextAdapter);
fs.mkdirSync(review+'/author-tests');fs.mkdirSync(work+'/candidate02-author-tests',{recursive:true});const adapted=[];
for(const p of m.tests){let text=fs.readFileSync(p.file,'utf8');const originalURL=pathToFileURL(p.file);text=text.replace(/(from\s*['"])(\.\.?\/[^'"]+)(['"])/g,(_all,a,b,c)=>a+new URL(b,originalURL).href+c).replace(/new URL\((['"])(\.\.?\/[^'"]+)\1,\s*import\.meta\.url\)/g,(_all,_q,p)=>'new URL('+JSON.stringify(new URL(p,originalURL).href)+')');
 text=text.replace(/const taskRoot=path\.resolve\([^;]+;/,"const taskRoot="+JSON.stringify(work+'/candidate02-author-tests')+';');
 text=text.replaceAll("E:/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/runtime118-performance-slowpath01",work+'/candidate02-author-tests');
 const target=review+'/author-tests/'+path.basename(p.file);fs.writeFileSync(target,text,{flag:'wx'});adapted.push({original:p,adapted:id(target),adaptation:'Import/new URL resolution preserved against original test location; owned output root relocated to reviewer namespace only'});
}
const output={kind:'independent-candidate02-complete-module-model',reviewerIsAuthor:false,actualRuntimeAuthority:false,input:id(input),copiedModules:285,adaptedFiles:[id(native),id(context)],nativeAdapterSHA256:sha(Buffer.from(adapter)),contextAdapterSHA256:sha(Buffer.from(contextAdapter)),adaptedAuthorTests:adapted};fs.writeFileSync(review+'/model-manifest.json',JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({model:out,verifiedModules:285,verifiedTests:4}));
