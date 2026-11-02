// Root's new actual dual-backend producers; old G1 tools remain unchanged.
import fs from 'node:fs';import assert from 'node:assert/strict';
const dir='tools/rust-r3cdefg';
function replace(s,a,b){assert(s.includes(a),'Missing derivation marker '+a.slice(0,100));return s.replaceAll(a,b)}
for(const [source,target,extra]of [['native-witness.mjs','semantics01.mjs',false],['native-witness-extra02.mjs','semantics-extra02.mjs',true]]){
 let s=fs.readFileSync(dir+'/'+source,'utf8');
 s=replace(s,'// Root-only original Native observations before the next16 joint G1 freeze.','// Root-only new actual dual-backend semantics acceptance; G1 original producers unchanged.');
 s=replace(s,"{execFileSync} from 'node:child_process'","{execFileSync,spawnSync} from 'node:child_process'");
 s=replace(s,"'./http-client.mjs'","'./wire-client.mjs'");
 s=replace(s,'../../tmp/rust-r3cdefg/a-input/native-fixture-draft01.mjs','../../docs/design/rust-r3cdefg/input-a/native-fixture-draft01.mjs');
 s=replace(s,'../../tmp/rust-r3cdefg/b-input/native-fixture-draft01.mjs','../../docs/design/rust-r3cdefg/input-b/native-fixture-draft01.mjs');
 s=replace(s,"const identity=JSON.parse", "const[backend,tag]=process.argv.slice(2);assert(['nest','rust'].includes(backend));assert(/^[a-z0-9-]{1,30}$/.test(tag));const database='poms_r3cdefg_'+backend,origin='http://127.0.0.1:'+(backend==='nest'?12100:12200);const identity=JSON.parse");
 s=replace(s,"priv+'/nest-g1-oracle01.json'","priv+'/'+backend+'-'+tag+'.json'");
 s=s.replaceAll("datname='poms_r3cdefg_nest'","datname=current_database()");
 s=replace(s,"'poms_r3cdefg_nest'","database");
 s=s.replaceAll("priv+'/witness-'","priv+'/acceptance-'");
 if(extra)s=replace(s,"root+'/tmp/rust-r3cdefg/native-witness01/report01.json'", "root+'/tmp/rust-r3cdefg/semantics-'+tag+'-'+backend+'/report01.json'");
 else s=replace(s,"root+'/tmp/rust-r3cdefg/native-witness01'", "root+'/tmp/rust-r3cdefg/semantics-'+tag+'-'+backend");
 if(extra)s=replace(s,"root+'/tmp/rust-r3cdefg/native-witness02'","root+'/tmp/rust-r3cdefg/semantics-extra-'+tag+'-'+backend");
 s=replace(s,'tools/rust-r3cdefg/'+source,'tools/rust-r3cdefg/'+target);
 s=replace(s,'tools/rust-r3cdefg/http-client.mjs','tools/rust-r3cdefg/wire-client.mjs');
 s=replace(s,'tmp/rust-r3cdefg/a-input/native-fixture-draft01.mjs','docs/design/rust-r3cdefg/input-a/native-fixture-draft01.mjs');
 s=replace(s,'tmp/rust-r3cdefg/b-input/native-fixture-draft01.mjs','docs/design/rust-r3cdefg/input-b/native-fixture-draft01.mjs');
 s=replace(s,"new HttpSession('http://127.0.0.1:12100'),otherClient=new HttpSession('http://127.0.0.1:12100'),viewerClient=new HttpSession('http://127.0.0.1:12100')", "new HttpSession(origin,{journal:directory+'/raw-wire',label:'admin'}),otherClient=new HttpSession(origin,{journal:directory+'/raw-wire',label:'other'}),viewerClient=new HttpSession(origin,{journal:directory+'/raw-wire',label:'viewer'})");
 s=replace(s,"r3cdefg-witness:","r3cdefg-acceptance:");
 s=s.replaceAll("'r3cdefg-acceptance:"+"'+runId", "'r3cdefg-acceptance:"+"'+runId");
 if(!extra){
  s=replace(s,"const raw=Buffer.from(pod('logs',identity.container));", "const streams=spawnSync('podman',['--cgroup-manager=cgroupfs','logs',identity.container],{encoding:null,maxBuffer:64000000,stdio:['ignore','pipe','pipe']});assert.equal(streams.status,0);fs.writeFileSync(directory+'/postgres-stdout-original.bin',streams.stdout,{flag:'wx',mode:0o600});fs.writeFileSync(directory+'/postgres-stderr-original.bin',streams.stderr,{flag:'wx',mode:0o600});const raw=Buffer.concat([streams.stdout,streams.stderr]);");
  s=replace(s,"const marker=/r3cdefg-acceptance:[0-9a-f-]+:([a-z0-9_-]+):(begin|end)/.exec(line);", "const marker=new RegExp('r3cdefg-acceptance:'+runId+':([A-Za-z0-9_-]+):(begin|end)').exec(line);");
  s=replace(s,"runtimeTag:'g1-oracle01'","runtimeTag:tag,backend");
 }
 s=s.replaceAll('R3CDEFG-original-Native-G1-semantic-observations','R3CDEFG-actual-dual-backend-semantic-acceptance').replaceAll('R3CDEFG-original-Native-G1-additional-semantic-observations','R3CDEFG-actual-dual-backend-additional-acceptance').replaceAll('Native-observations-completed-not-Rust-acceptance','Actual-HTTP-PG-observations-completed').replaceAll('R3CDEFG-original-Native-G1-witness','R3CDEFG-new-actual-dual-backend-run');
 s=replace(s,"const sourceFiles=", "const admission=JSON.parse(fs.readFileSync(root+'/docs/design/rust-r3cdefg/g1-input-manifest02.json'));const guardNative=()=>{for(const p of admission.nativeFiles){const b=fs.readFileSync(root+'/'+p.file);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.rawBytesSha256)}};guardNative();const sourceFiles=");
 s=replace(s,"assert.deepEqual(sourceFiles.map(f=>pin(root+'/'+f)),sources)","guardNative();assert.deepEqual(sourceFiles.map(f=>pin(root+'/'+f)),sources)");
 // DB/backend are explicit even though the semantic group names retain G1 history.
 s=s.replaceAll("base:identity.base,marker:identity.marker,database", "backend,tag,base:identity.base,marker:identity.marker,database");
 fs.writeFileSync(dir+'/'+target,s);
}
console.log(JSON.stringify({newProducers:['semantics01.mjs','semantics-extra02.mjs'],oldOriginalsUnchanged:true}));
