import assert from 'node:assert/strict';
import {readdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {databaseClient,privateRoot} from './database-client.mjs';
import {extensionStore,newExtension} from './fixture-extension-journal.mjs';
import {journalStore} from './fixture-journal.mjs';
import {assertCompleteReferences} from './fixture-complete-references.mjs';
import {facts} from './fixture-snapshot.mjs';
import {localRootFor,scanLocal} from './fixture-objects.mjs';
const tag=process.argv[2];assert(/^[a-z0-9-]{1,35}$/.test(tag));const output=`tmp/rust-r2ij/final-clean-state-${tag}.json`;assert(!existsSync(output));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={formatVersion:1,tag,result:'pending',at:new Date().toISOString(),boundary:'All durable attempted-run journals checked without adoption/deletion. SELECT/FOR UPDATE and catalog locks only; every transaction rolled back. Prior per-run double-cleanup receipts remain separate evidence.',backends:[],dmlStatements:0};
try{
    const baseNames=readdirSync(privateRoot+'/runs'),extensionNames=readdirSync(privateRoot+'/ij-runs');assert([...baseNames,...extensionNames].every(name=>/^(nest|rust)-[0-9a-f-]{36}\.json$/.test(name)),'Unsettled journal temporary file');
    for(const backend of ['nest','rust']){
        const ids=[...new Set([...baseNames,...extensionNames].filter(name=>name.startsWith(backend+'-')).map(name=>name.slice(backend.length+1,-5)))].sort();
        const client=await databaseClient(backend),query=client.query.bind(client);let statements=0;
        client.query=(text,...args)=>{assert(typeof text==='string'&&/^\s*(select\b|lock table\b|begin\b|rollback\b)/i.test(text),'Final observation forbids DML/DDL/commit');statements++;return query(text,...args);};
        const item={backend,runs:[],sqlStatements:0};report.backends.push(item);
        try{
            for(const runId of ids){
                const base=journalStore({backend,runId},privateRoot).read();assert(base&&base.state==='cleaned','Unclean base journal');
                const store=extensionStore(backend,runId),extension=store.read();if(extension){assert.equal(extension.state,'cleaned');assert(extension.faults.every(fault=>fault.state==='restored'));}
                const journal=extension??newExtension(backend,runId);await client.query('begin');
                try{
                    const guard=await assertCompleteReferences(client,base,journal);assert.equal(guard.rowsAdmitted,0);assert.equal(guard.locationRows,0);assert.equal(guard.foreignRows,0);assert.equal(guard.deletesIssued,0);
                    const baseFacts=await facts(client,base);assert(Object.values(baseFacts).every(rows=>rows.length===0));
                    item.runs.push({runId,baseJournalState:base.state,extensionJournalState:extension?.state??'not-created',registeredObjects:journal.objects.length,plannedObjects:journal.storageObjects.length,guard,baseCounts:Object.fromEntries(Object.entries(baseFacts).map(([table,rows])=>[table,rows.length]))});
                }finally{await client.query('rollback');}
            }
            const local=scanLocal(localRootFor(backend));assert.equal(local.files.length,0);item.localObjects=0;item.localDirectories=local.directories;item.sqlStatements=statements;
            console.log(JSON.stringify({backend,runs:ids.length,registeredResidualRows:0,localObjects:0,sqlStatements:statements,dml:0}));
        }finally{await client.end();}
    }
    report.sourceSha256=sha(readFileSync('tools/rust-r2ij/final-clean-state.mjs'));report.totalBackendRuns=report.backends.reduce((total,item)=>total+item.runs.length,0);report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,message:error.message};process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({result:report.result,totalBackendRuns:report.totalBackendRuns,failure:report.failure}));}
