// Archive nonsecret real failure metadata only. No state, session or HTTP bodies.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const R='E:/projects/worktrees/poms-r3hijk-next28/poms';
const I='E:/projects/worktrees/poms-r4i-lifecycle/poms';
const P='//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
assert.equal(process.cwd().replaceAll('\\','/'),R);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const targets=[
  ['diagnosis.json',I+'/tools/rust-r4ghi/I/implementation/runtime121-prepare361-failure-independent01/diagnosis-failed-prepare361.json',2498,'b2e71eaf3ce9100e48c5d2c06af9239cdfa65664910fca132019e8028d5537d6'],
  ['independent-evidence.json',I+'/tools/rust-r4ghi/I/implementation/runtime121-prepare361-failure-independent01/evidence-failed-prepare361.json',20168,'04c743a9dd14f536e00e66a94265e1b664e45880b00f6b53fe78633d020a68ad'],
  ['independent-seal.json',I+'/tools/rust-r4ghi/I/implementation/runtime121-prepare361-failure-independent01/seal-failed-prepare361.json',4096,'9aafba67ca2ad71c23429b53a269932145c92b3368c13d936d114cbd34de8ddc'],
  ['retention-metadata.json',P+'/runtime121-prepare361-failed01/1899fb63-42e3-4bd5-94d2-f1fbd8c57d57/retention.json',7563,'23e42112aaf2b9d8005fbd86535845fddbf20f0b5e7c21726779c5924f78b4e9'],
  ['outer-command.json',R+'/tmp/rust-r4ghi/root/fresh67-prepare361-actual01/command.json'],
  ['outer-invocation.json',R+'/tmp/rust-r4ghi/root/fresh67-prepare361-actual01/invocation.json'],
  ['outer-stdout.log',R+'/tmp/rust-r4ghi/root/fresh67-prepare361-actual01/stdout-private.log',0,'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['outer-stderr.log',R+'/tmp/rust-r4ghi/root/fresh67-prepare361-actual01/stderr-private.log',146],
];
const loaded=targets.map(([name,file,bytes,digest])=>{
  const raw=fs.readFileSync(file);
  if(bytes!==undefined)assert.equal(raw.length,bytes,name);
  if(digest)assert.equal(sha(raw),digest,name);
  if(name.endsWith('.json'))JSON.parse(raw);
  return {name,file,bytes:raw.length,rawBytesSha256:sha(raw),raw};
});
const outer=JSON.parse(loaded.find(q=>q.name==='outer-command.json').raw);
assert.equal(outer.exitCode,1);assert.equal(outer.nonce,'1899fb63-42e3-4bd5-94d2-f1fbd8c57d57');
const stderr=JSON.parse(loaded.find(q=>q.name==='outer-stderr.log').raw);
assert.equal(stderr.message,'Real session expired or too close to deadline');
const retained=JSON.parse(loaded.find(q=>q.name==='retention-metadata.json').raw);
assert.equal(retained.phase,'closed-failed');assert.equal(retained.stateValuesEmitted,false);
assert.equal(retained.domainPOSTObserved,false);assert.equal(retained.acceptedFreshPreparation,false);
const out=R+'/tools/rust-r4ghi/runtime-recovery121/prepare361-failure-actual01';
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
for(const q of loaded)fs.writeFileSync(out+'/'+q.name,q.raw,{flag:'wx'});
const manifest={kind:'Root-real-prepare361-failure-metadata-archive',recordedAt:new Date().toISOString(),nonce:outer.nonce,files:loaded.map(({raw,...q})=>q),realConstructorCapabilityEntryAccepted:true,failedExitVerified:true,freshPrepared:false,K:false,full67:false,businessPOST:false,FI:false,normalTax:false,MainReplayed:false,privateStateOrOwnershipOrAuthHTTPBodyCopied:false,privateStateValuesEmitted:false,businessG3:false,businessG4:false,newCertified:0};
fs.writeFileSync(out+'/provenance.json',JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({archivedFiles:loaded.length,out,sourceFilesChanged:false,canonicalStateWritten:false,freshPrepared:false,newCertified:0}));
