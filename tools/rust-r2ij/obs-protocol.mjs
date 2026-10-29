// Same admitted object/config and actual wire peer for original native-fetch
// provider vs frozen Rust facade. No mocked provider or response interception.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {OwnedFixture} from './owned-fixture.mjs';
import {managed} from './database-client.mjs';
import {connectObs} from './obs-client.mjs';
const ROOT='/home/wangzishi/projects/poms-rust-r2ij';process.chdir(ROOT);assert.equal(process.version,'v24.19.0');assert.equal(process.versions.undici,'7.29.0');
const [serverTag,ownerTag,tag]=process.argv.slice(2);assert(process.argv.length===5&&[serverTag,ownerTag,tag].every(v=>/^[a-z0-9-]{1,30}$/.test(v)));
const owner=JSON.parse(readFileSync(`tmp/rust-r2ij/owner-rust-${ownerTag}-start.json`));process.kill(owner.pid,0);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),binary='/home/wangzishi/.local/share/poms-r2ij/target/release/examples/attachment_storage_probe';
const report={kind:'Actual original Node provider vs Rust DB-backed facade against signature/body/ownership-verifying loopback OBS',tag,ownerTag,serverTag,at:new Date().toISOString(),binarySha256:hash(readFileSync(binary)),nodeBinarySha256:hash(readFileSync(process.execPath)),result:'pending',cases:[],differences:[]};
const runId=randomUUID(),bucket='b-'+runId,ak='OBS'+randomBytes(12).toString('hex').toUpperCase(),sk=randomBytes(32).toString('hex'),upstream=connectObs(serverTag),objects=[];let fixture;
function runProbe(kind,input,whileAlive){return new Promise((resolve,reject)=>{
    const env=kind==='rust'?managed('rust').childEnv:{PATH:'/usr/bin:/bin',HOME:'/home/wangzishi',LANG:'C.UTF-8'};
    const child=spawn(kind==='rust'?binary:process.execPath,kind==='rust'?[]:['tools/rust-r2ij/i-transport-oracle.mjs'],{cwd:ROOT,env,stdio:['pipe','pipe','pipe']});
    let output='',error='',seen=false,witness;
    const timer=setTimeout(()=>child.kill('SIGTERM'),10000);
    child.stdout.on('data',b=>{output+=b;if(whileAlive&&!seen&&output.includes('\n')){seen=true;(async()=>{
        const value=JSON.parse(output.slice(0,output.indexOf('\n')));assert.equal(child.exitCode,null);assert.equal(child.signalCode,null);
        witness=await whileAlive(value);assert.equal(child.exitCode,null);assert.equal(child.signalCode,null);
        child.stdin.end();
    })().catch(failure=>{child.kill('SIGTERM');reject(failure);});}});
    child.stderr.on('data',b=>error+=b);child.on('error',reject);
    child.on('close',(code,signal)=>{clearTimeout(timer);if(code!==0)return reject(new Error('Probe process failed '+kind+' code='+code+' signal='+signal+' stderrSha256='+hash(Buffer.from(error))));try{const lines=output.trim().split('\n');assert.equal(lines.length,1);if(whileAlive)assert(witness,'Cancellation was not observed before child exit');resolve({...JSON.parse(lines[0]),...(witness?{cancellationWitness:witness}:{})});}catch{reject(new Error('Probe output malformed'));}});
    if(whileAlive)child.stdin.write(JSON.stringify(input)+'\n');else child.stdin.end(JSON.stringify(input)+'\n');
});}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));return value;}
const plain=Buffer.from('Controlled OBS signed real transport payload\n'.repeat(1024));
const random=Buffer.concat(Array.from({length:8192},(_,i)=>createHash('sha256').update('poms-r2ij-incompressible-'+i).digest()));
let config;
async function plan(name,bytes){const object={provider:'huawei-obs-s3',bucket,key:`ij-${runId}/${name}.bin`,writes:[{sha256:hash(bytes),size:bytes.length,at:new Date().toISOString()}]};fixture.journal.intents.push({id:randomUUID(),kind:'obs-direct-object',bucket,key:object.key,state:'planned',sha256:hash(bytes),size:bytes.length});fixture.journal.storageObjects.push(object);fixture.store.write(fixture.journal);await upstream.planOwned(object,runId,bytes);objects.push(object);return object;}
async function eventsSince(before){const s=await upstream.snapshotRun(runId,bucket);return s.events.slice(before);}
async function dual(name,op,object,options={}){
    const outputs={},traces={};
    for(const kind of ['node','rust']){
        await upstream.setRule(object,runId,options.rule??{});const before=(await upstream.snapshotRun(runId,bucket)).events.length,start=Date.now();
        const input={op,runId,location:{storageProvider:'huawei-obs-s3',storageBucket:bucket,storageKey:object.key},config:{...config,...options.config},...(op==='put'?{bodyBase64:(options.body??plain).toString('base64')}:{}),...(options.contentType?{contentType:options.contentType}:{}),...(options.presign?{expiresAt:new Date(Date.now()+60000).toISOString(),checksumSha256:hash(plain),contentType:'application/octet-stream'}:{})};
        outputs[kind]=await runProbe(kind,input,op==='read-first-drop'?async value=>{
            assert.equal(value.success,true);let events=await eventsSince(before);
            for(let n=0;n<30&&events.some(e=>e.active);n++){await new Promise(r=>setTimeout(r,30));events=await eventsSince(before);}
            assert(events.some(e=>e.aborted)&&events.every(e=>!e.active),'Returned stream drop did not release peer while the probe remained alive');
            return {probeStdinStillOpen:true,probeAliveBeforeAndAfterPeerClose:true,upstreamAborted:true,active:0};
        }:undefined);traces[kind]=await eventsSince(before);
        if(op==='read-first-drop')for(let n=0;n<30&&traces[kind].some(e=>e.active);n++){await new Promise(r=>setTimeout(r,30));traces[kind]=await eventsSince(before);}
        outputs[kind].elapsedMs=Date.now()-start;
    }
    const entry={name,op,rule:options.rule??{},outputs,traces};report.cases.push(entry);
    try{
        for(const kind of ['node','rust']){const out=outputs[kind];if(options.error!==undefined){assert.equal(out.success,false);assert.equal(out.status,options.error);}else{assert.equal(out.success,true);if(op==='read')assert.deepEqual(out.result,{bytes:(options.body??plain).length,sha256:hash(options.body??plain)});if(op==='read-first-drop'){assert(out.result.bytes>0);assert.equal(out.result.sha256,hash((options.body??plain).subarray(0,out.result.bytes)));assert.equal(out.result.droppedAfterFirstChunk,true);assert(traces[kind].some(e=>e.aborted)&&traces[kind].every(e=>!e.active));}}if(options.requests!==undefined)assert.equal(traces[kind].length,options.requests);}
        if(op!=='read-first-drop'&&op!=='presign'){const a={...outputs.node},b={...outputs.rust};delete a.elapsedMs;delete b.elapsedMs;if(!same(canonical(a),canonical(b)))report.differences.push({name,kind:'typed-result',node:a,rust:b});}
        entry.expectedPassed=true;
    }catch(error){entry.expectedPassed=false;entry.assertion=error.message;report.differences.push({name,kind:'expectation',message:error.message});}
    const defaultsA=traces.node.find(e=>e.verified)?.defaultHeaders,defaultsB=traces.rust.find(e=>e.verified)?.defaultHeaders;
    if(defaultsA&&defaultsB&&!same(canonical(defaultsA),canonical(defaultsB))){entry.defaultHeaderDifference={node:defaultsA,rust:defaultsB};}
    console.log(JSON.stringify({case:name,nodeSuccess:outputs.node.success,rustSuccess:outputs.rust.success,expectedPassed:entry.expectedPassed,differences:report.differences.length}));
    await upstream.setRule(object,runId,{});return entry;
}
try{
    await upstream.registerRun(runId,'rust',{bucket,ak,sk,region:'r2ij'});fixture=await OwnedFixture.open('rust',runId,{upstream});report.runId=runId;const session=await fixture.login(owner.origin);await fixture.assertOwnedDefault();await fixture.planCreation('provider',{provider_type:'huawei-obs-s3',key_prefix:'ij-'+runId});
    const created=await fixture.request(session,'POST','/api/platform/attachment-storage-providers',{json:{providerType:'huawei-obs-s3',displayName:'OBS protocol '+runId,enabled:true,endpoint:'http://127.0.0.1:6900',region:'r2ij',bucket,keyPrefix:'ij-'+runId,forcePathStyle:true,accessKeyId:ak,secretAccessKey:sk}});assert.equal(created.status,201);await fixture.adoptRuntime();let provider=created.body;report.setupApi=[{method:'POST',status:created.status,operation:'create-provider'}];
    async function rotate(secret){const intent={id:randomUUID(),kind:'obs-protocol-credential-update',configId:provider.id,expectedVersion:provider.rowVersion,proposedSha256:hash(Buffer.from(secret)),state:'planned'};fixture.journal.intents.push(intent);fixture.store.write(fixture.journal);const response=await fixture.request(session,'PATCH',`/api/platform/attachment-storage-providers/${provider.id}`,{json:{secretAccessKey:secret,expectedVersion:provider.rowVersion}});assert.equal(response.status,200);provider=response.body;await fixture.adoptRuntime();intent.state='completed';fixture.store.write(fixture.journal);report.setupApi.push({method:'PATCH',status:response.status,operation:'rotate-synthetic-key',rowVersion:provider.rowVersion});}
    config={id:created.body.id,providerType:'huawei-obs-s3',displayName:'Synthetic',status:'active',enabled:true,endpoint:'http://127.0.0.1:6900',region:'r2ij',bucket,keyPrefix:'ij-'+runId,forcePathStyle:true,accessKeyId:ak,secretAccessKey:sk};
    const object=await plan('basic',plain);await dual('put','put',object,{contentType:'application/octet-stream'});await dual('head','head',object);await dual('read','read',object);
    // stdin is not Rust's provider authority: rotate the real owned DB config
    // through the actual public command, then give the same wrong key to Node.
    await rotate('WRONG-'+sk);try{await dual('bad-signature','head',object,{config:{secretAccessKey:'WRONG-'+sk},error:502,requests:1});}finally{await rotate(sk);}
    for(const status of [403,429,500])await dual('http-'+status,'head',object,{rule:{status},error:502,requests:1});
    await dual('network-retry-two','head',object,{rule:{closeAttempts:2},requests:3});
    await dual('network-all-rejected','head',object,{rule:{closeAttempts:99},error:502,requests:3});
    await dual('redirect20','head',object,{rule:{redirectBeforeSuccess:20},requests:21});
    await dual('redirect-loop','head',object,{rule:{redirectSelf:true},error:502,requests:63});
    await dual('redirect-cross-origin','head',object,{rule:{redirectLocation:`http://localhost:6900/${bucket}/${object.key}`},error:502,requests:2});
    for(const [name,rule] of [['gzip',{encoding:'gzip'}],['x-gzip',{encoding:'x-gzip'}],['gzip-uppercase',{encoding:'GZIP'}],['deflate',{encoding:'deflate'}],['deflate-raw',{encoding:'deflate',rawDeflate:true}],['brotli',{encoding:'br'}],['zstd',{encoding:'zstd'}],['gzip-zstd',{encoding:'gzip,zstd'}],['gzip-truncated-inner-zstd',{encoding:'gzip,zstd',truncateInnerGzip:true}]]){await dual(name,'read',object,{rule});await dual(name+'-head','head',object,{rule});}
    await dual('zstd-truncated-wire','read',object,{rule:{encoding:'zstd',truncateWire:1},body:Buffer.alloc(0)});
    await dual('gzip-zstd-truncated-wire','read',object,{rule:{encoding:'gzip,zstd',truncateWire:1},body:Buffer.alloc(0)});
    await dual('zstd-gzip-missing-outer-trailer','read',object,{rule:{encoding:'zstd,gzip',truncateWire:8}});
    for(const prefix of ['61','6162','1f','1f8b'])await dual('gzip-short-prefix-'+prefix,'read',object,{rule:{encoding:'gzip',gzipPrefixHex:prefix},...(prefix==='6162'?{error:null}:{body:Buffer.alloc(0)})});
    await dual('deflate-first-reset','read',object,{rule:{encoding:'deflate',resetBeforeBody:true},error:null,requests:1});
    await dual('late-reset','read',object,{rule:{resetAfterBytes:512},error:null,requests:1});
    const cancel=await plan('cancel',random);await dual('cancel-put','put',cancel,{body:random});await dual('cancel-plain','read-first-drop',cancel,{rule:{stallAfterBytes:8192},body:random});await dual('cancel-gzip','read-first-drop',cancel,{rule:{encoding:'gzip',stallAfterBytes:8192},body:random});
    await dual('delete','remove',object);await dual('missing','head',object,{error:404,requests:1});
    report.defaultHeaderDifferences=report.cases.filter(c=>c.defaultHeaderDifference).map(c=>({name:c.name,...c.defaultHeaderDifference}));if(report.defaultHeaderDifferences.length)report.differences.push({name:'default-wire-headers',kind:'actual-header-drift',count:report.defaultHeaderDifferences.length});report.result=report.differences.length?'fail':'pass';
}catch(error){report.result='fail';report.failure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}
finally{if(fixture){try{for(const object of objects)await upstream.setRule(object,runId,{});report.cleanup1=await fixture.cleanup();report.cleanup2=await fixture.cleanup();assert.equal(report.cleanup2.matched,0);assert.equal(report.cleanup2.changed,0);assert(report.cleanup2.zero);}catch(error){report.result='fail';report.cleanupFailure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}await fixture.close();}try{report.obsZero=await upstream.assertRunZero(runId,bucket);}catch(error){report.result='fail';report.obsCleanupFailure={message:error.message};process.exitCode=1;}if(report.result!=='pass')process.exitCode=1;report.finishedAt=new Date().toISOString();writeFileSync(`tmp/rust-r2ij/obs-protocol-${tag}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:report.result,tag,cases:report.cases.length,differences:report.differences.length,defaultHeaderDifferences:report.defaultHeaderDifferences?.length,failure:report.failure,cleanupFailure:report.cleanupFailure,secondCleanup:report.cleanup2&&{matched:report.cleanup2.matched,changed:report.cleanup2.changed,zero:report.cleanup2.zero},obsZero:report.obsZero}));}
