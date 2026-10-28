import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {databaseClient,managed} from './database-client.mjs';
import {executeBatchFixture} from './batch-fixture.mjs';
import {validateSource,sourceHead} from './fixture-guard.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,emitDecoratorMetadata:true,esModuleInterop:true}}).outputText,file);
const {BusinessNumberService}=require('../../apps/poms-api/src/app/features/business-number/business-number.service.ts');
const {BusinessNumberSequenceSchema}=require('../../apps/poms-api/src/app/features/business-number/business-number-sequence.entity.ts');
const {MikroORM}=require('@mikro-orm/postgresql');
const {installQueryCapture}=require('../rust-r2c/witness-query-core.cjs');
const {Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
export async function runNestNumberWitness({runId,tag}){
    assert.equal(process.platform,'linux');assert(/^[a-z0-9-]{1,35}$/.test(tag));validateSource();
    const request={formatVersion:1,backend:'nest',runId,action:'facts',account:'none'},client=await databaseClient('nest');
    const output=`tmp/rust-r2ef/nest-number-${tag}.json`;assert(!existsSync(output));
    const report={formatVersion:1,sourceHead,runId,tag,result:'pending',node:process.version,cases:[],sql:[],sourceFiles:['apps/poms-api/src/app/features/business-number/business-number.service.ts','apps/poms-api/src/app/features/business-number/business-number-sequence.entity.ts'].map(file=>({file,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')}))};
    let orm,capture,current,originalQuery;const storage=new AsyncLocalStorage();
    try{
        const facts=await executeBatchFixture(client,request);const fixture=facts.extension.ePgFixture;assert(fixture);
        assert.equal(fixture.numberCases.length,9);assert.equal(new Set(fixture.numberCases.map(c=>c.scope)).size,9);
        originalQuery=Client.prototype.query;
        capture=installQueryCapture(Client,{append:row=>report.sql.push({...row,caseId:current??null,workerPid:process.pid,backendPid:storage.getStore()?.client?.processID??null})});
        const capturedQuery=Client.prototype.query;Client.prototype.query=function(...args){return storage.run({client:this},()=>capturedQuery.apply(this,args));};
        const env=managed('nest').childEnv;
        orm=await MikroORM.init({host:'127.0.0.1',port:15432,dbName:'poms_r2ef_nest',user:'poms_r2ef_app',password:env.DB_PASSWORD,schema:'poms',entities:[BusinessNumberSequenceSchema],ensureDatabase:false,allowGlobalContext:true,debug:false,pool:{min:0,max:4}});
        const service=new BusinessNumberService(orm.em);
        const state=async c=>(await client.query('select id::text,next_value,row_version,prefix,padding,description from poms.business_number_sequence where scope=$1 and period=$2',[c.scope,String(c.utcYear)])).rows;
        for(const c of fixture.numberCases){
            current='number-transactional-em-'+c.scope;const before=await state(c);let generated;const sentinel=new Error('controlled rollback');let rolledBack=false;
            try{await orm.em.fork().transactional(async em=>{generated=await service.next(c.scope,new Date(`${c.utcYear}-06-01T00:00:00Z`),em);throw sentinel;});}
            catch(error){assert.equal(error,sentinel);rolledBack=true;}
            const after=await state(c);assert(rolledBack);assert.equal(after.length,1);assert.equal(after[0].next_value,(before[0]?.next_value??1)+1);assert.equal(after[0].row_version,before[0]?.row_version??1);
            report.cases.push({id:current,scope:c.scope,period:String(c.utcYear),generated,before,after,callerRolledBack:true,allocationSurvivedCallerRollback:true});
        }
        current='number-default-em';const c=fixture.numberStandalone,before=await state(c);const generated=await service.next(c.scope,new Date(`${c.utcYear}-06-01T00:00:00Z`));const after=await state(c);assert.equal(after[0].next_value,(before[0]?.next_value??1)+1);report.cases.push({id:current,scope:c.scope,period:String(c.utcYear),generated,before,after});
        assert.equal(capture.isIncomplete(),false);report.result='observed';report.conclusion='Original getConnection().execute has no transaction ctx: all nine explicit transactional EntityManager calls allocate on the independent driver connection and survive caller rollback. Rust next_with_connection is an explicitly separate internal primitive, not evidence of current Nest caller transaction semantics.';
    }catch(error){report.result='fail';report.failureType=error.name;throw error;}
    finally{if(orm)await orm.close(true);capture?.uninstall();if(originalQuery)Client.prototype.query=originalQuery;await client.end();writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});}
    return {report,output};
}
