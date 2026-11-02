// Independent C: static public JSON/source inspection only; no author executors imported.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const L='//wsl.localhost/Debian/home/wangzishi/projects/poms-rust-r3hijk';
const resolve=f=>fs.existsSync(f)?f:L+'/'+f;
const read=f=>JSON.parse(fs.readFileSync(resolve(f),'utf8'));
const pin=f=>{const p=resolve(f),b=fs.readFileSync(p);return{file:f,resolvedReadPath:p,bytes:b.length,rawBytesSha256:createHash('sha256').update(b).digest('hex')};};
const shape=v=>v===null?'null':Array.isArray(v)?{length:v.length,first:v.length?shape(v[0]):undefined}:typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,Array.isArray(x)?{length:x.length,firstKeys:x[0]&&typeof x[0]==='object'?Object.keys(x[0]):typeof x[0]}:x&&typeof x==='object'?{keys:Object.keys(x)}:typeof x])):typeof v;
for(const phase of ['30','31','34','35','40']){
 const f='tmp/rust-r3hijk/acceptance-rust-candidate03-'+phase+'/report01.json';
 if(!fs.existsSync(resolve(f))){console.log(JSON.stringify({phase,missing:true}));continue;}
 const r=read(f);console.log(JSON.stringify({phase,pin:pin(f),keys:Object.keys(r),completed:r.completed,runtime:r.runtime,sources:r.sources,events:r.events?.length,cases:r.cases?.map(c=>({label:c.label,value:shape(c.value)})),observations:r.observations?.map(o=>({label:o.label,name:o.name,value:shape(o.value)}))}));
}
for(const cell of ['linux-rust01','windows-rust01']){const f='tmp/rust-r3hijk/ui-'+cell+'/report01.json',r=read(f);console.log(JSON.stringify({cell,pin:pin(f),keys:Object.keys(r),completed:r.completed,result:r.result,backend:r.backend,observations:r.observations.length,network:r.network.length,input:r.input,sources:r.sources,closure:r.closure,staticBuild:r.staticBuild,leadResult:shape(r.leadResult),intelligenceResult:shape(r.intelligenceResult),inputBody:read(r.input.file)}));}
const b=read('tmp/rust-r3hijk/rust-check08/report01.json');console.log(JSON.stringify({build:pin('tmp/rust-r3hijk/rust-check08/report01.json'),keys:Object.keys(b),before:b.before?.length,after:b.after?.length,rest:Object.fromEntries(Object.entries(b).filter(([k])=>!['before','after'].includes(k)))}));
