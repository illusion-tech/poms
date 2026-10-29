import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const tag=process.argv[2];assert(/^[a-z0-9-]{1,35}$/.test(tag));const output=`tmp/rust-r2ij/source-protection-${tag}.json`;assert(!existsSync(output));
const baseline='61d6df1e971e7e785382dc85c75273e584ee2545',sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const scopes=['apps/poms-api/src','apps/poms-admin/src','libs/shared/contracts/src','libs/api/contracts/src','libs/shared/api-spec','libs/shared/api-client','package.json','pnpm-lock.yaml'];
for(const args of [['diff',baseline,'--',...scopes],['diff','--cached',baseline,'--',...scopes],['ls-files','--others','--exclude-standard','--',...scopes]])assert.equal(execFileSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024}),'',`Original source/contract surface changed: ${args[0]}`);
const files=execFileSync('git',['ls-files','--',...scopes],{encoding:'utf8'}).trim().split(/\r?\n/).sort().map(file=>{const bytes=readFileSync(file);return {file,bytes:bytes.length,sha256:sha(bytes)};});
const original=JSON.parse(readFileSync('libs/shared/api-spec/openapi.json')),methods=['get','post','put','patch','delete','head','options','trace'];
const operationCount=Object.values(original.paths).reduce((total,item)=>total+Object.keys(item).filter(key=>methods.includes(key)).length,0);
assert.equal(Object.keys(original.paths).length,237);assert.equal(operationCount,291);assert.equal(Object.keys(original.components.schemas).length,585);
const clientFiles=files.filter(row=>row.file.startsWith('libs/shared/api-client/'));assert.equal(clientFiles.length,579);
assert.equal(readdirSync('apps/poms-api/src/migrations').filter(name=>/^Migration.*\.ts$/.test(name)).length,92);
const operations=[];let schemas=0;
for(const file of ['tools/rust-r2ij/i-openapi.json','tools/rust-r2ij/j-openapi.json']){
    const subset=JSON.parse(readFileSync(file));
    for(const [route,item] of Object.entries(subset.paths))for(const [method,operation] of Object.entries(item))if(methods.includes(method)){assert.deepEqual(operation,original.paths[route]?.[method]);operations.push({method,route,operationId:operation.operationId});}
    for(const [name,schema] of Object.entries(subset.components?.schemas??{})){assert.deepEqual(schema,original.components.schemas[name]);schemas++;}
}
assert.equal(operations.length,25);assert.equal(new Set(operations.map(row=>row.operationId)).size,25);
const report={formatVersion:1,result:'pass',baseline,at:new Date().toISOString(),boundary:'Tracked original Nest/Angular/contracts/full OpenAPI/client/package inputs unchanged; I/J exports match exact original operations and schema bodies. Runtime partial OpenAPI recursion is covered separately by Rust tests.',counts:{paths:237,operations:291,schemas:585,trackedClientFiles:579,migrations:92,ijOperations:25,ijSchemaEntries:schemas,protectedFiles:files.length},protectedFiles:files,protectedFilesSha256:sha(Buffer.from(JSON.stringify(files))),operations};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:report.result,counts:report.counts}));
