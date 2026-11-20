import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root='tools/openapi/checkpoints/r4ghi-s5',original=root+'/input-manifest01.json';
const raw=fs.readFileSync(original),base=JSON.parse(raw),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(raw),'9f1d5c6b712af05b4eef0b82dc62c47ae40d59e62ff827d975a711dacb550cbc');
const allowed=new Map([
 ['apps/poms-api/src/app/features/project-cost/operating-signal-evaluation-result.entity.ts',['    OPERATING_RISK_LEVELS,\n','    OPERATING_SIGNAL_LEVELS,\n']],
 ['apps/poms-api/src/app/features/project/project.entity.ts',['PROJECT_STAGES, ']]
]);
const changes=[];
const inputs=base.inputs.map(item=>{const bytes=fs.readFileSync(item.file);if(sha(bytes)===item.rawBytesSHA256)return item;
    assert(allowed.has(item.file),'Unexpected S5 source movement: '+item.file);
    const prior=fs.readFileSync(root+'/'+item.snapshot);assert.equal(sha(prior),item.rawBytesSHA256);
    let expected=prior.toString('utf8').replace(/\r\n/g,'\n');for(const remove of allowed.get(item.file)){assert.equal(expected.split(remove).length,2);expected=expected.replace(remove,'');}
    assert.equal(bytes.toString('utf8').replace(/\r\n/g,'\n'),expected,'Only unused import removal is allowed');
    const snapshot='inputs02/'+item.file+'.bin';fs.mkdirSync(path.dirname(root+'/'+snapshot),{recursive:true});fs.writeFileSync(root+'/'+snapshot,bytes,{flag:'wx'});
    const value={...item,snapshot,bytes:bytes.length,rawBytesSHA256:sha(bytes),normalizedTextSHA256:sha(Buffer.from(expected))};changes.push({file:item.file,beforeSHA256:item.rawBytesSHA256,afterSHA256:value.rawBytesSHA256,classification:'unused-import-only-no-runtime-or-wire-change'});return value;
});
assert.equal(changes.length,2);
const result={...base,kind:'G2-complete-SDK-input-candidate-amended-unused-imports',capturedAt:new Date().toISOString(),supersedesManifest:original,supersedesManifestSHA256:sha(raw),amendment:changes,inputs};
fs.writeFileSync(root+'/input-manifest02.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({manifest:root+'/input-manifest02.json',sha256:sha(Buffer.from(JSON.stringify(result,null,2)+'\n')),changed:changes.length,inventoryUnchanged:true,old414Preserved:true}));
