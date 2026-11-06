import {readFileSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
const p='tools/rust-r4ghi/independent/business-g1/round02/final01';
const b=JSON.parse(readFileSync(`${p}/inputs/tools/rust-r4ghi/joint-g1/effective-v2/blueprint.json.bin`));
const o=JSON.parse(readFileSync(`${p}/inputs/docs/design/rust-r4ghi/operation-map01.json.bin`));
const differences=[];
function compare(a,b,path){if(isDeepStrictEqual(a,b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[k],b[k],path+'/'+k);}else if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length){a.forEach((v,i)=>compare(v,b[i],path+'/'+i));}else differences.push({path,blueprint:a,operationMap:b});}
compare(b.operationMap,o.operations,'operations');
const hash=createHash('sha256').update(readFileSync(`${p}/inputs/tools/rust-r4ghi/joint-g1/effective-v2/blueprint.json.bin`)).digest('hex');
const result={kind:'independent-operation-map-semantic-comparison',blueprintSHA256:hash,operationMapRecordedBlueprintSHA256:o.blueprintSHA256,deepEqual:isDeepStrictEqual(b.operationMap,o.operations),differences};
writeFileSync(`${p}/operation-map-comparison03.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result,null,2));
