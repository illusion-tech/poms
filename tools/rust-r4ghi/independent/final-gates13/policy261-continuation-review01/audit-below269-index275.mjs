// Independent fixed-FS audit. Does not import Root helpers or execute HTTP/SQL.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
const P='/home/wangzishi/.local/share/poms-r4ghi/private';
const D=P+'/business/g2-business13/main01';
const sha=b=>createHash('sha256').update(b).digest('hex');
const map=f=>f.startsWith('/home/')?'//wsl.localhost/Debian'+f:f.startsWith('/mnt/e/')?'E:/'+f.slice(7):f;
const pins=new Map();
function read(p){
  assert(p?.file&&/^[0-9a-f]{64}$/.test(p.rawBytesSha256));
  assert(!/(^|[\\/])state\.json$/.test(p.file),'No mutable current state');
  const b=fs.readFileSync(map(p.file));
  assert.equal(sha(b),p.rawBytesSha256,p.file);
  if(p.bytes!==undefined)assert.equal(b.length,p.bytes);
  pins.set(p.file,{file:p.file,bytes:b.length,rawBytesSha256:sha(b)});
  return b;
}
const json=p=>JSON.parse(read(p));
const indexPin={file:P+'/policy269-below/http-index275-03.json',bytes:23866,rawBytesSha256:'8a26da9bad8f54cf5c3f36c186c7be9ffa6e16687162f798adf70484225e6d5d'};
const index=json(indexPin);
assert.equal(index.actualHTTPRequestCount,9);assert.equal(index.entries.length,9);
assert.equal(index.authRequestCount,4);assert.equal(index.HGETCount,5);assert.equal(index.GRequestCount,0);
const statePin={file:P+'/policy269-below/state-after-below269.json',bytes:13444372,rawBytesSha256:'4c36278e86c88f443480cac3f43dcc8c0d9c08bc3cc4183ed367c0adb7842813'};
const state=json(statePin),manager=state.actors.manager;
const expected=['AuthController_getCsrfToken','AuthController_createPasswordAuthSession','AuthController_getCurrentAuthSession','AuthController_getCurrentAuthSession','ProjectCostController_getOperatingSignalEvaluation',...Array(4).fill('ProjectCostController_getCommissionGateBinding')];
assert.deepEqual(index.entries.map(e=>e.operationId),expected);
let tableFiles=0,rowReferences=0,previousAfter=null;
const results=[],deltas=[];
const rows=m=>{
  const result=read(m).toString().split('\n').filter(Boolean).map(JSON.parse);
  assert.equal(result.length,m.count);tableFiles++;rowReferences+=result.length;
  for(const r of result){assert(Array.isArray(r.key));assert.equal(sha(r.raw),r.sha256);}
  return new Map(result.map(r=>[JSON.stringify(r.key),r]));
};
const tableMeta=m=>{const{file,...rest}=m;return rest;};
function sameSnapshotContents(a,b){
  assert.deepEqual(a.objects,b.objects);
  assert.deepEqual(Object.keys(a.databases),Object.keys(b.databases));
  for(const[db,z]of Object.entries(a.databases)){
    const t=b.databases[db];
    for(const k of Object.keys(z).filter(k=>k!=='tables'))assert.deepEqual(z[k],t[k]);
    assert.deepEqual(Object.keys(z.tables),Object.keys(t.tables));
    for(const name of Object.keys(z.tables))assert.deepEqual(tableMeta(z.tables[name]),tableMeta(t.tables[name]));
  }
}
for(const[indexNumber,e]of index.entries.entries()){
  const http=json(e.http),ledger=json(e.ledger),before=json(e.before),after=json(e.after);
  assert.equal(http.operationId,expected[indexNumber]);assert.equal(http.requestId,e.requestId);
  assert.equal(http.method,indexNumber===1?'POST':'GET');assert.equal(http.status,200);
  assert(http.responseComplete&&!http.transportFailure);assert.deepEqual(http.originals,e.originals);
  for(const p of Object.values(e.originals))read(p); // Private payload stays private.
  assert.equal(ledger.requestId,http.requestId);assert.equal(ledger.operationId,http.operationId);
  assert.equal(ledger.ownershipComplete,true);assert.deepEqual(ledger.blockers,[]);
  assert.deepEqual(ledger.before,e.before);assert.deepEqual(ledger.after,e.after);
  assert.equal(ledger.recorded.length,e.recorded);
  if(previousAfter)sameSnapshotContents(previousAfter,before);
  assert.deepEqual(before.objects,after.objects);
  const commandDeltas=[];
  assert.deepEqual(Object.keys(before.databases),Object.keys(after.databases));
  for(const[db,b]of Object.entries(before.databases)){
    const a=after.databases[db];
    assert.equal(Object.keys(b.tables).length,139);assert.equal(Object.keys(a.tables).length,139);
    for(const k of Object.keys(b).filter(k=>k!=='tables'))assert.deepEqual(b[k],a[k]);
    assert.deepEqual(Object.keys(b.tables),Object.keys(a.tables));
    for(const[t,bm]of Object.entries(b.tables)){
      const am=a.tables[t];
      assert.deepEqual(bm.pk,am.pk);assert.deepEqual(bm.columns,am.columns);
      const br=rows(bm),ar=rows(am);
      for(const key of br.keys())assert(ar.has(key),'Deletion forbidden in below269');
      for(const[key,r]of ar){
        const old=br.get(key);
        if(old&&r.raw===old.raw&&r.xmin===old.xmin)continue;
        assert.equal(db,'poms_r4ghi_rust');assert.equal(t,'auth_session');
        const v=JSON.parse(r.raw),oldV=old?JSON.parse(old.raw):null;
        assert.equal(v.user_id,manager.id);assert.equal(v.status,'active');
        assert.equal(v.token_hash,sha(decodeURIComponent(manager.cookies.poms_session)));
        if(old){
          const changed=Object.keys(v).filter(k=>JSON.stringify(v[k])!==JSON.stringify(oldV[k]));
          assert.deepEqual(changed.sort(),['idle_expires_at','last_seen_at','row_version','updated_at']);
          assert.equal(v.row_version,oldV.row_version+2);
          assert.equal(old.sha256,state.owned[JSON.stringify([db,t,r.key])].firstSha256);
          assert.equal(r.sha256,state.owned[JSON.stringify([db,t,r.key])].latestSha256);
        }else{
          assert.equal(indexNumber,1);assert.equal(v.row_version,1);
          assert.equal(r.sha256,state.owned[JSON.stringify([db,t,r.key])].firstSha256);
        }
        commandDeltas.push({database:db,table:t,kind:old?'update':'new',key:r.key,beforeSha256:old?.sha256??null,afterSha256:r.sha256,beforeXmin:old?.xmin??null,afterXmin:r.xmin});
      }
    }
  }
  assert.equal(commandDeltas.length,e.recorded);
  deltas.push(...commandDeltas);
  results.push({http:e.http,ledger:e.ledger,operationId:http.operationId,method:http.method,status:200,responseComplete:true,ownershipComplete:true,blockers:0,NativeDeltaRows:0,domainDeltaRows:0,authDeltaRows:commandDeltas.length});
  previousAfter=after;
}
assert.equal(deltas.length,2);assert.equal(tableFiles,9*2*2*139);
for(const f of index.indexerFailuresPreserved)read(f.source);
const result={kind:'independent-complete-fixedFS-below269-index275-readback',reviewer:'/root/r4ghi_final_gates13',runtime:process.version,index:indexPin,immutableAfter:statePin,actualHTTPRequestCount:9,authRequestCount:4,HGETCount:5,GRequestCount:0,allComplete200:true,allNineLedgersComplete:true,allBlockersZero:true,requests:results,fullSnapshotPairs:9,tablesPerDatabase:139,databasesPerSnapshot:2,tableFilesVerified:tableFiles,rowReferencesVerified:rowReferences,allRowRawHashesVerified:true,adjacentCaptureContinuity:true,allSchemaSequenceObjectMetaEqual:true,NativeDeltaRows:0,domainDeltaRows:0,authDeltaRows:2,authDeltaKinds:['one-new-cookie-bound-owned-manager-session','one-same-session-raw-and-managed-plus2-update-on-primary-H-GET'],authDeltas:deltas,indexerFailuresPreserved:index.indexerFailuresPreserved,actualIndexerCommandEffects:0,RootWrites:false,liveStateRead:false,SQL:false,HTTP:false,processOrPIDRead:false,actualH04:false,completeH46:false,RustOfficial:240,newlyCertified:0,G3:false,G4:false,pinCount:pins.size};
fs.writeFileSync(path.join(here,'actual-below269-index275-readback.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({complete:true,requests:9,auth:4,HGET:5,G:0,tableFiles,rowReferences,NativeDeltaRows:0,domainDeltaRows:0,authDeltaRows:2,pinCount:pins.size}));
