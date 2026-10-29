import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';
import{databaseClient,privateRoot}from'./database-client.mjs';import{CommonFixture}from'./common-fixture.mjs';import{journalStore}from'./fixture-journal.mjs';import{facts}from'./fixture-snapshot.mjs';
const tag=process.argv[2];assert(process.argv.length===3&&/^[a-z0-9-]{1,35}$/.test(tag??''));const output=`tmp/rust-r2l1/final-clean-state-${tag}.json`;assert(!fs.existsSync(output));
const hash=b=>createHash('sha256').update(b).digest('hex'),report={formatVersion:1,kind:'all-durable-L1-runs-read-only-final-state',at:new Date().toISOString(),result:'pending',backends:[],dmlStatements:0,boundary:'No adoption/cleanup/recovery in this observer. All SQL is SELECT/LOCK/BEGIN/ROLLBACK; private journals are byte unchanged.'};
try{
 const baseNames=fs.readdirSync(privateRoot+'/runs'),commonNames=fs.readdirSync(privateRoot+'/l1-runs');assert([...baseNames,...commonNames].every(n=>/^(nest|rust)-[0-9a-f-]{36}\.json$/.test(n)),'Unsettled journal temporary file');
 for(const backend of ['nest','rust']){
  const client=await databaseClient(backend),query=client.query.bind(client);let statements=0;client.query=(sql,...args)=>{assert(typeof sql==='string'&&/^\s*(?:select\b|lock table\b|begin\b|rollback\b)/i.test(sql),'Final state must issue no DML/DDL/COMMIT');statements++;return query(sql,...args);};
  const item={backend,runs:[]};report.backends.push(item);
  try{
   const ids=[...new Set([...baseNames,...commonNames].filter(n=>n.startsWith(backend+'-')).map(n=>n.slice(backend.length+1,-5)))].sort();
   for(const runId of ids){
    const baseStore=journalStore({backend,runId},privateRoot),base=baseStore.read();assert(base&&base.state==='cleaned','Base journal is not cleaned');
    const file=privateRoot+'/l1-runs/'+backend+'-'+runId+'.json',raw=fs.existsSync(file)?fs.readFileSync(file):null,j=raw?JSON.parse(raw):{state:'cleaned',objects:[],logicalIds:[],intents:[]};assert.equal(j.state,'cleaned','Public journal is not cleaned');
    const f=Object.assign(Object.create(CommonFixture.prototype),{client,backend,runId,request:{backend,runId},baseStore,j});
    await client.query('begin');let guard,baseFacts;try{guard=await f.preflight();assert.equal(guard.rowsAdmitted,0);assert.equal(guard.foreignRows,0);assert.equal(guard.deletesIssued,0);baseFacts=await facts(client,base);assert(Object.values(baseFacts).every(rs=>rs.length===0));}finally{await client.query('rollback');}
    if(raw)assert.equal(hash(fs.readFileSync(file)),hash(raw));item.runs.push({runId,baseState:base.state,publicState:raw?j.state:'not-created',registeredPublicObjects:j.objects.length,registeredCommittedCreates:j.committedCreates?.length??0,guard,baseCounts:Object.fromEntries(Object.entries(baseFacts).map(([t,rs])=>[t,rs.length]))});
   }
   item.sqlStatements=statements;console.log(JSON.stringify({backend,runs:ids.length,registeredResidualRows:0,dml:0}));
  }finally{await client.end();}
 }
 const objects='/home/wangzishi/.local/share/poms-r2l1/objects',found=[];function scan(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=dir+'/'+e.name;assert(!e.isSymbolicLink(),'Local object symlink');if(e.isDirectory())scan(file);else found.push(file);}}scan(objects);assert.equal(found.length,0);report.localObjects=0;report.totalBackendRuns=report.backends.reduce((n,b)=>n+b.runs.length,0);report.sourceRawBytesSha256=hash(fs.readFileSync(new URL(import.meta.url)));report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,message:error.message};process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({result:report.result,totalBackendRuns:report.totalBackendRuns??null,failure:report.failure??null,output}));}
