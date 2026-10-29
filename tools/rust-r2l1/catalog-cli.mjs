import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {databaseClient} from './database-client.mjs';
import {verifyFullCatalog} from './catalog-complete.mjs';
const tag=process.argv[2];assert(/^[a-z0-9-]{1,35}$/.test(tag??'')&&process.argv.length===3);
const report={formatVersion:1,tag,at:new Date().toISOString(),result:'pending',scope:'Read-only original 92-migration complete catalog against independently extracted source authority',backends:[]};
try{
    for(const backend of ['nest','rust']){
        const client=await databaseClient(backend);
        try{await client.query('begin read only');report.backends.push({backend,...await verifyFullCatalog(client)});}
        finally{await client.query('rollback');await client.end();}
    }
    assert.equal(report.backends[0].columnsSha256,report.backends[1].columnsSha256);
    assert.equal(report.backends[0].incomingSha256,report.backends[1].incomingSha256);
    report.result='pass';
}catch(error){report.result='fail';report.failure=error.message;report.schemaDifference=error.detail??null;process.exitCode=1;}
writeFileSync(`tmp/rust-r2l1/catalog-complete-${tag}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
