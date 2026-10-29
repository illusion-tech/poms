// Pure Node decoder/source witness; this is not HTTP/storage acceptance.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import * as zlib from 'node:zlib';
const root='/home/wangzishi/projects/poms-rust-r2ij';process.chdir(root);
assert.equal(process.version,'v24.19.0');assert.equal(process.versions.undici,'7.29.0');
const [tag]=process.argv.slice(2);assert(process.argv.length===3&&/^[a-z0-9-]{1,30}$/.test(tag));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const native=process.binding('natives')['internal/deps/undici/undici'];
const needles=['createZstdDecompress','createGunzip','finishFlush:','method === "HEAD"','pipelining === 0'];
const excerpts=needles.flatMap(needle=>{let start=0,found=[];for(let i=0;i<8;i++){const index=native.indexOf(needle,start);if(index<0)break;found.push({needle,index,source:native.slice(Math.max(0,index-280),index+450)});start=index+needle.length;}return found;});
const payload=Buffer.from('Controlled OBS signed real transport payload\n'.repeat(1024));
async function decode(name,input,make){return new Promise(resolve=>{const stream=make(),chunks=[];let done=false;const finish=error=>{if(done)return;done=true;const output=Buffer.concat(chunks);resolve({name,inputHex:input.toString('hex'),inputBytes:input.length,inputSha256:hash(input),success:!error,...(error?{error:{name:error.name,code:error.code,message:error.message}}:{}),outputBytes:output.length,outputSha256:hash(output)});};stream.on('data',b=>chunks.push(b));stream.on('error',finish);stream.on('end',()=>finish());stream.end(input);});}
const syncOptions={flush:zlib.constants.Z_SYNC_FLUSH,finishFlush:zlib.constants.Z_SYNC_FLUSH};
const cases=[];
for(const [name,input] of [['empty',Buffer.alloc(0)],['bad-magic-1',Buffer.from('a')],['bad-magic-2',Buffer.from('ab')],['valid-prefix-1',Buffer.from([0x1f])],['valid-prefix-2',Buffer.from([0x1f,0x8b])],['missing-trailer',zlib.gzipSync(payload).subarray(0,-8)]])cases.push(await decode('gzip-'+name,input,()=>zlib.createGunzip(syncOptions)));
const compressed=zlib.zstdCompressSync(payload);
for(const remove of [0,1,8])cases.push(await decode('zstd-missing-'+remove,remove?compressed.subarray(0,-remove):compressed,()=>zlib.createZstdDecompress({flush:zlib.constants.ZSTD_e_continue,finishFlush:zlib.constants.ZSTD_e_end})));
const report={kind:'Pure actual Node decoder and bundled Undici source; no HTTP/provider operation',at:new Date().toISOString(),node:process.version,undici:process.versions.undici,nodeBinarySha256:hash(readFileSync(process.execPath)),undiciSourceUtf8Sha256:hash(Buffer.from(native)),excerpts,cases};
writeFileSync(`tmp/rust-r2ij/obs-codec-witness-${tag}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(tag==='codec03')writeFileSync('tools/rust-r2ij/obs-codec-golden.json',JSON.stringify({...report,excerpts:undefined},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({tag,cases}));
