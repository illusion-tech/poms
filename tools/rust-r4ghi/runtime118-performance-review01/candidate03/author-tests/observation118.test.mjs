import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {createObservationController118,createPhaseMetrics118,budgetObservation118,observedRead118,observedVerify118,observedJSON118,observedDirectory118,observedFresh118} from 'file:///E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-performance-candidate03/candidate/tools/rust-r4ghi/performance118/observation118.mjs';
import {assertBudgetProbeDispatch121,executeBudgetProbe121,budgetFinalObservation121} from 'file:///E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-performance-candidate03/candidate/tools/rust-r4ghi/business/runtime-admission121.mjs';

const taskRoot="E:/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/runtime118-performance-review01/candidate03-author-tests";
const root=fs.realpathSync(fs.mkdtempSync(taskRoot+'/owned-tests-'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const fixture=(value='fixed bytes')=>{const file=path.join(root,randomUUID()+'.bin');fs.writeFileSync(file,value,{flag:'wx'});return{file,bytes:Buffer.byteLength(value),rawBytesSha256:hash(Buffer.from(value))};};

test('same boundary shares reads and performs one explicit SHA seal, Buffers independent',()=>{
 const p=fixture(),m=createPhaseMetrics118(),c=createObservationController118({metrics:m});
 c.run('same-cut',()=>{const a=c.read(p);a[0]^=1;assert.equal(c.read(p).toString(),'fixed bytes');assert.equal(c.verify(p).rawBytesSha256,p.rawBytesSha256);});
 assert.equal(m.snapshot().totals.contentReads,2);assert.equal(m.snapshot().totals.shaBytes,2*p.bytes);
});
test('new boundary rereads bytes, unchanged JSON decoded only once',()=>{
 const p=fixture('{"value":{"a":1}}'),m=createPhaseMetrics118(),c=createObservationController118({metrics:m});let first;
 c.run('first',()=>{first=c.json(p);assert.throws(()=>{first.value.a=2;});});
 c.run('second',()=>assert.equal(c.json(p),first));
 assert.equal(m.snapshot().totals.contentReads,4);assert.equal(m.snapshot().totals.jsonParseBytes,p.bytes);
});
test('same-size mutation with restored mtime cannot reuse prior decode',()=>{
 const p=fixture('{"value":1}'),c=createObservationController118();c.run('first',()=>c.json(p));const s=fs.statSync(p.file);
 fs.writeFileSync(p.file,'{"value":2}');fs.utimesSync(p.file,s.atime,s.mtime);
 assert.throws(()=>c.run('second',()=>c.json(p)),/SHA/);
});
test('content changes during a scope are rejected by bookends',()=>{
 const p=fixture('first'),c=createObservationController118();assert.throws(()=>c.run('bookend',()=>{c.read(p);fs.writeFileSync(p.file,'other');}));
 assert.equal(c.active(),false);
});
test('conflicting digest or byte count for one path is refused',()=>{
 const p=fixture(),c=createObservationController118();assert.throws(()=>c.run('sha-conflict',()=>{c.read(p);c.read({...p,rawBytesSha256:'a'.repeat(64)});}));
 assert.throws(()=>c.run('size-conflict',()=>{c.read(p);c.verify({...p,bytes:p.bytes+1});}));
});
test('hardlink exception cannot authorize the single-link evidence role',()=>{
 const p=fixture(),other=path.join(root,randomUUID()+'.link');fs.linkSync(p.file,other);const c=createObservationController118();
 assert.throws(()=>c.run('strict-role',()=>c.read(p)),/Single-link/);
 assert.throws(()=>c.run('mixed-role',()=>{c.verify(p,{singleLink:false,nlink:2});c.read(p);}),/Single-link/);
 c.run('separate-paths',()=>{c.verify(p,{singleLink:false,nlink:2});c.verify({...p,file:other},{singleLink:false,nlink:2});});
});
test('exact dev/ino/nlink role identity is checked',()=>{
 const p=fixture(),c=createObservationController118();assert.throws(()=>c.run('wrong-inode',()=>c.verify(p,{ino:'0'})),/Role identity/);
});
test('directory sharing retains complete entry list and seals mutation',()=>{
 const folder=fs.realpathSync(fs.mkdtempSync(path.join(root,'dir-'))),c=createObservationController118(),p=path.join(folder,'first');fs.writeFileSync(p,'1');
 c.run('directory',()=>{const rows=c.directory(folder);rows.push('fake');assert.deepEqual(c.directory(folder),['first']);});
 assert.throws(()=>c.run('new-member',()=>{c.directory(folder);fs.writeFileSync(path.join(folder,'second'),'2',{flag:'wx'});}));
});
test('typed directory entries cannot poison later inventory',()=>{
 const folder=fs.realpathSync(fs.mkdtempSync(path.join(root,'typed-'))),c=createObservationController118();fs.writeFileSync(path.join(folder,'leaf'),'x');
 c.run('typed',()=>{const [entry]=c.directory(folder,{withFileTypes:true});assert.throws(()=>{entry.name='invented';});assert.equal(c.directory(folder,{withFileTypes:true})[0].name,'leaf');});
});
test('missing and replaced originals fail closed',()=>{
 const p=fixture(),c=createObservationController118();assert.throws(()=>c.run('replace',()=>{c.read(p);fs.renameSync(p.file,p.file+'.preserved');fs.writeFileSync(p.file,'fixed bytes');}));
 const missing={...p,file:path.join(root,'does-not-exist')};assert.throws(()=>c.run('missing',()=>c.read(missing)));
});
test('no read outside scope; no nesting, await or use after disposal',()=>{
 const p=fixture(),c=createObservationController118();assert.throws(()=>c.read(p));assert.throws(()=>c.run('nested',()=>c.run('inner',()=>1)));
 assert.throws(()=>c.run('await-cut',()=>Promise.resolve(1)),/await/);c.dispose();assert.throws(()=>c.run('disposed',()=>c.read(p)));
});
test('failed observation clears state and next owned test is independent',()=>{
 const p=fixture(),c=createObservationController118();assert.throws(()=>c.run('failure',()=>{c.read(p);throw Error('owned fixture failure');}));
 c.run('later',()=>assert.equal(c.read(p).toString(),'fixed bytes'));
});
test('descriptor resource bound stops rather than dropping dependencies',()=>{
 const c=createObservationController118({maxEntries:1}),a=fixture('a'),b=fixture('b');assert.throws(()=>c.run('bounded',()=>{c.verify(a);c.verify(b);}),/dependency limit/);
});
test('large binaries hash completely without retaining a large buffer',()=>{
 const bytes=Buffer.alloc(3*1024*1024,17),p=fixture(bytes),m=createPhaseMetrics118(),c=createObservationController118({metrics:m,maxCacheBytes:64});
 c.run('large',()=>{c.verify(p);c.verify(p);});assert.equal(m.snapshot().totals.contentReads,2);assert.equal(m.snapshot().totals.shaBytes,2*bytes.length);
});
test('generic owned scope cannot activate Native ambient cache',()=>{
 const p=fixture(),c=createObservationController118();c.run('owned',()=>{c.read(p);assert.equal(observedRead118(p),null);assert.equal(observedVerify118(p),null);assert.equal(observedJSON118(p),null);assert.equal(observedDirectory118(root),null);});
});
test('forged/serialized budget scope cannot invoke callback or final freshness',()=>{
 let invoked=false;for(const r of [{},JSON.parse('{}')]){assert.throws(()=>budgetObservation118(r,{},'forged',()=>{invoked=true;}));assert.throws(()=>assertBudgetProbeDispatch121(r,{}));assert.throws(()=>budgetFinalObservation121(r,{}));}
 assert.equal(invoked,false);
});
test('budget entry rejects supplied context/callback before any valid execution',async()=>{
 let invoked=false;await assert.rejects(executeBudgetProbe121({context:{},callback(){invoked=true;}},{}));assert.equal(invoked,false);
});
test('parent/self intervals do not add nested elapsed twice',()=>{
 const m=createPhaseMetrics118();m.sync('parent',()=>m.sync('child',()=>{let n=0;for(let i=0;i<10000;i++)n+=i;return n;}));const p=m.snapshot(),parent=p.events.find(x=>x.parentId===null),child=p.events.find(x=>x.parentId!==null);
 assert.equal(BigInt(parent.elapsedNs),BigInt(parent.selfNs)+BigInt(child.elapsedNs));assert.equal(p.openPhases,0);assert.equal(p.droppedEvents,0);
});
test('phase failures retain status, no secret error text in profile',async()=>{
 const m=createPhaseMetrics118();await assert.rejects(m.phase('failed',async()=>{throw Error('SECRET-FIXTURE');}));const p=m.snapshot();assert.equal(p.events[0].status,'FAIL');assert(!JSON.stringify(p).includes('SECRET-FIXTURE'));
});
test('profile event cap and unknown metrics are explicit',()=>{
 const m=createPhaseMetrics118({maxEvents:1});m.sync('first',()=>0);m.sync('second',()=>0);assert.equal(m.snapshot().droppedEvents,1);assert.throws(()=>m.add('invented',1));assert.throws(()=>m.add('contentReads',-1));
});
test('junction path cannot stand in for an original canonical file',(t)=>{
 const folder=fs.realpathSync(fs.mkdtempSync(path.join(root,'target-'))),link=path.join(root,'junction-'+randomUUID());fs.writeFileSync(path.join(folder,'leaf'),'linked');
 try{fs.symlinkSync(folder,link,'junction');}catch(e){if(['EPERM','ENOTSUP'].includes(e.code)){t.skip('Host cannot create owned junction; this case remains uncovered');return;}throw e;}
 const p={file:path.join(link,'leaf'),bytes:6,rawBytesSha256:hash(Buffer.from('linked'))},c=createObservationController118();assert.throws(()=>c.run('junction',()=>c.read(p)),/canonical/);
});
test('new explicit digest gets new parsed value, no stale JSON alias',()=>{
 const p=fixture('{"n":1}'),c=createObservationController118();let a;c.run('old-value',()=>{a=c.json(p);});fs.writeFileSync(p.file,'{"n":2}');const q={...p,rawBytesSha256:hash(Buffer.from('{"n":2}'))};c.run('new-value',()=>assert.deepEqual(c.json(q),{n:2}));assert.deepEqual(a,{n:1});
});
test('late parent/child HTTP intervals account headers once',()=>{
 const m=createPhaseMetrics118(),id=m.interval('http.response',1n,10n);m.interval('http.headers',1n,4n,'PASS',id);const p=m.snapshot();assert.equal(p.events[0].selfNs,'6');assert.equal(p.events[1].elapsedNs,'3');
});
test('directory also counts against complete dependency bound',()=>{
 const c=createObservationController118({maxEntries:1}),p=fixture();assert.throws(()=>c.run('combined-limit',()=>{c.directory(root);c.read(p);}),/dependency limit/);
});

console.log(JSON.stringify({ownedFixtureRoot:root,scope:'owned local files and invalid Native arguments only',realAuthSQLHTTPSnapshotEffectsExecuted:0}));
