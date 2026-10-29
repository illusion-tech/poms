import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {OwnedFixture} from './owned-fixture.mjs';
const tag=process.argv[2];assert(/^[a-z0-9-]{1,35}$/.test(tag??'')&&process.argv.length===3);
const report={formatVersion:1,tag,at:new Date().toISOString(),scope:'Fixture preparation/strict reference and object preflight/double cleanup smoke; not product behavior acceptance',result:'pending',backends:[]};
for(const backend of ['nest','rust']){
    let fixture;const item={backend,result:'pending'};
    try{
        fixture=await OwnedFixture.open(backend);item.runId=fixture.runId;
        const targets=await fixture.targets();assert.equal(Object.keys(targets).length,6);
        const facts=await fixture.facts();assert.equal(Object.values(facts).reduce((n,rows)=>n+rows.length,0),9);
        item.projectionRows=9;item.targetTypes=Object.keys(targets);item.result='pass';
    }catch(error){item.result='fail';item.failureType=error.name;item.code=error.code??null;item.failure=error.message;process.exitCode=1;}
    finally{
        if(fixture){
            try{item.cleanup1=await fixture.cleanup();item.cleanup2=await fixture.cleanup();assert.equal(item.cleanup2.changed,0);assert.equal(item.cleanup2.matched,0);assert(item.cleanup2.zero);}
            catch(error){item.result='fail';item.cleanupFailure={type:error.name,code:error.code??null,message:error.message};process.exitCode=1;}
            await fixture.close();
        }
    }
    report.backends.push(item);
    if(item.result!=='pass')break;
}
report.result=report.backends.length===2&&report.backends.every(x=>x.result==='pass')?'pass':'fail';
writeFileSync(`tmp/rust-r2ij/fixture-smoke-${tag}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
