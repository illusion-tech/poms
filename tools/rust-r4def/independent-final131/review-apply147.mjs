// Independent public-only exact apply-scope review. No DB/HTTP/Git/private reads.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { normalizeHTTP125 } from '../E/cleanup-wrapper125/ownership125.mjs';
import { validateCyclePolicy70 } from '../E/cleanup70/core70.mjs';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const out = 'tools/rust-r4def/independent-final131';
const pkg = 'tools/rust-r4def/E/cleanup-wrapper125';
assert.equal(path.resolve(process.cwd()).toLowerCase(), path.resolve(root).toLowerCase());
const sha = b => createHash('sha256').update(b).digest('hex');
const stable = v => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
const same = (a,b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const key = (table, pk) => table + ':' + JSON.stringify(stable(pk));
const goodHash = h => typeof h === 'string' && /^[0-9a-f]{64}$/.test(h);
function location(f) {
  let s = f.replaceAll('\\','/');
  if(s.startsWith('//wsl.localhost/Debian/'))s='/'+s.slice('//wsl.localhost/Debian/'.length);
  if(s.startsWith(root+'/'))s='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/'+s.slice(root.length+1);
  if (s.includes('/private/') || s.includes('/tmp/rust-r4def/private/')) return { private: true, original: s };
  for (const p of ['/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/', root + '/']) if (s.startsWith(p)) return { relative: s.slice(p.length) };
  assert(!path.isAbsolute(s) && !s.includes('..'), 'read-outside-public-root:' + s);
  return { relative: s };
}
function bytes(f) { const l=location(f); assert(!l.private,'private-read-forbidden'); return fs.readFileSync(path.join(root,l.relative)); }
const json = f => JSON.parse(bytes(f));
const pin = f => { const b=bytes(f); return { file:location(f).relative,bytes:b.length,sha256:sha(b) }; };
function check(p) { assert(goodHash(p.rawBytesSha256??p.sha256)); const a=pin(p.file); assert.equal(a.sha256,p.rawBytesSha256??p.sha256); if(p.bytes!==undefined)assert.equal(a.bytes,p.bytes); return a; }
const manifestFile=pkg+'/manifest125a.json'; assert.equal(pin(manifestFile).sha256,'2c4753455b46a45c99db70145f2eb4a4e339c4fc5e9babadceb75f3796bf59e1');
const manifest=json(manifestFile),base=json(pkg+'/manifest125.json');
const codePins=[pin(manifestFile),check({...manifest.baseManifest,file:pkg+'/'+manifest.baseManifest.file})];
for(const p of [...manifest.products.map(p=>({...p,file:pkg+'/'+p.file})),...manifest.publicSourcePins])codePins.push(check(p));
for(const p of manifest.immutableBaseProducts)codePins.push(check({...p,file:pkg+'/'+p.file}));
assert.equal(manifest.products.length,8);assert.equal(manifest.publicSourcePins.length,8);assert.equal(manifest.immutableBaseProducts.length,9);
assert.equal(base.products.length,9);
const actualFile='tmp/rust-r4def/root/cleanup-wrapper125a-146/receipt125a.json',ledgerFile='tmp/rust-r4def/root/cleanup-ledger147/ledger147.json';
assert.equal(pin(actualFile).sha256,'ad611e53fb2759052df4fa41f5b75a1e4d9995b14222977088e06d7ebaf1363c');
assert.equal(pin(ledgerFile).sha256,'54dad9246fc4831a5b1d9137113ffeeb618818ecb2e5df37ae2f0be87278f531');
const actual=json(actualFile),ledger=json(ledgerFile);check(ledger.originalPlanReceipt);
assert.equal(actual.mode,'plan');assert(!actual.failure);assert(ledger.planNotApply && ledger.DBDMLOrHTTP===0);
assert.equal(ledger.reviewedPrivateBundle.rawBytesSha256,'cc30d11364b018e41e4379c0a1844124d37e7d38e089cc8384f05a667b6f15ee');
const authority=json('tools/rust-r4def/E/cleanup70/authority70.json'),catalog=json('tmp/rust-r4def/root/catalog25/rust-catalog.json');
const provision=json('tmp/rust-r4def/root/environment21/provision01.json');
const refPins=new Map(),publicPins=[],privatePins=[];
function norm(f){const l=location(f);return l.private?l.original:l.relative;}
for(const p of ledger.allReceiptPins){const id=norm(p.file);assert(goodHash(p.rawBytesSha256)&&Number.isSafeInteger(p.bytes));if(refPins.has(id)){assert.equal(refPins.get(id).rawBytesSha256,p.rawBytesSha256);assert.equal(refPins.get(id).bytes,p.bytes);}refPins.set(id,p);if(location(p.file).private)privatePins.push(p);else publicPins.push(check(p));}
const commandMap=new Map(),publicCommands=[],privateCommands=[];
let commandOnlyPins=0;
for(const r of ledger.actualCommands){const id=norm(r.receiptId);assert(!commandMap.has(id));commandMap.set(id,r);for(const p of r.receiptPins){const id=norm(p.file);let bound=refPins.get(id);if(!bound){assert(goodHash(p.rawBytesSha256)&&Number.isSafeInteger(p.bytes));refPins.set(id,p);bound=p;commandOnlyPins++;if(location(p.file).private)privatePins.push(p);else publicPins.push(check(p));}assert(bound.rawBytesSha256===p.rawBytesSha256&&bound.bytes===p.bytes);}
  if(location(r.receiptId).private){privateCommands.push(r);continue;}
  const raw=json(r.receiptId),normalized=normalizeHTTP125(raw,{receiptId:r.receiptId});
  for(const f of ['operationId','method','path','status','requestId','actorId','startedAt','completedAt'])assert(same(normalized[f],r[f]),'command-metadata-drift:'+f+':'+r.receiptId);
  publicCommands.push(r);
}
assert.equal(commandMap.size,3012);
const UIExchangePins=new Set();
for(const u of ledger.UIReceipts){assert(u.closed?.serverClosed&&u.closed.pending===0&&u.closed.allRawExchangesRetained);const top=json(u.receiptId);assert.equal(top.exchanges.length,u.exchanges);assert(same(top.closed,u.closed));for(const e of top.exchanges??[]){const p=e.privateRaw;assert(p&&goodHash(p.rawBytesSha256));UIExchangePins.add(norm(p.file)+'@'+p.rawBytesSha256);}}
for(const r of privateCommands){assert.equal(r.source,'actual-UI');const p=r.receiptPins.find(p=>norm(p.file)===norm(r.receiptId));assert(p&&UIExchangePins.has(norm(p.file)+'@'+p.rawBytesSha256));}
const kindCounts={},reasonCounts={};let parentRefs=0,receiptRefs=0;const dbChecks=[];
for(const backend of ['native','rust']){
 const db=ledger.databases[backend],report=actual.reports.find(r=>r.backend===backend),plan=report.publicPlan;
 assert(plan&&plan.status==='planned-not-executed'&&plan.DBExecuted===false);
 assert(same(db.scope,plan.scope));assert.equal(db.scope.instanceId,ledger.instanceId);assert.equal(db.scope.containerId,provision.containerId);assert.equal(db.scope.databaseOid,provision.databaseOids.find(d=>d.database==='poms_r4def_'+backend).oid);assert.equal(db.scope.presentationTimeZone,'Etc/GMT-8');
 assert.equal(db.exactPKLedger.catalogHash,authority.structuralHash);assert.equal(db.exactPKLedger.liveGraphHash,plan.sealedLiveGraphHash);
 for(const f of ['planHash','sealedLiveGraphHash','baselineGraphHash','expectedDeleted','expectedRestored'])assert(same(db[f],plan[f]));
 assert.equal(db.allTables.length,120);assert.equal(new Set(db.allTables).size,120);
 const rows=db.exactPKLedger.rows,by=new Map(),seen=new Set();
 for(const r of rows){const id=key(r.table,r.primaryKey);assert(!by.has(id));assert(r.beforeAbsent&&goodHash(r.rowFingerprint));assert(['http-command','internal-producer','auth-fixture','managed-auth-audit-security'].includes(r.producerKind));assert(r.receiptIds.length>0);for(const receipt of r.receiptIds){assert(refPins.has(norm(receipt)),'unbound-receipt:'+receipt);receiptRefs++;}for(const p of r.derivedFrom??[]){assert(seen.has(p),'unproven-parent-before-claim:'+p);parentRefs++;}seen.add(id);by.set(id,r);kindCounts[r.producerKind]=(kindCounts[r.producerKind]??0)+1;reasonCounts[r.reason]=(reasonCounts[r.reason]??0)+1;}
 assert.equal(rows.length,backend==='rust'?2673:0);assert.equal(db.counts.unclaimed,0);assert.equal(db.counts.claimed,rows.length);
 const current=new Map(rows.map(r=>[key(r.table,r.primaryKey),r.rowFingerprint])),deleted=new Set();let cuts=0,restores=0;
 for(const [i,op]of plan.operations.entries()){
   assert.equal(op.id,'cleanup70-'+String(i+1).padStart(5,'0'));assert.equal(op.expectedRows,1);const id=key(op.table,op.primaryKey);
   if(op.kind==='delete-owned-PK'){assert.equal(current.get(id),op.expectedBefore);assert(!deleted.has(id));deleted.add(id);current.delete(id);}
   else if(op.kind==='clear-owned-nullable-cycle-pointers'){
     assert.equal(current.get(id),op.expectedBefore);assert(goodHash(op.expectedAfter)&&op.expectedBefore!==op.expectedAfter);
     const policy=authority.cyclePolicies.find(p=>p.table===op.table&&same(p.columns,op.columns));assert(policy);validateCyclePolicy70(policy,catalog,authority.immutableUpdateTriggers);
     assert(!authority.immutableUpdateTriggers.some(t=>t.table_name===op.table));assert(op.removedEdges.length>0);
     for(const e of op.removedEdges){assert.equal(e.child,id);assert(current.has(e.parent));assert(catalog.constraints.some(c=>c.table_name===op.table&&c.conname===e.constraint&&c.contype==='f'));}
     current.set(id,op.expectedAfter);cuts++;
   }else{
     assert(op.kind.startsWith('restore-'));assert.equal(current.size,0);const drift=db.baselineDrift.find(r=>key(r.table,r.primaryKey)===id);assert(drift);
     assert.equal(op.expectedBefore,drift.afterFingerprint);assert.equal(op.expectedAfter,drift.beforeFingerprint);
     const allowed=authority.borrowedOriginals.find(r=>r.backend===backend&&key(r.table,r.primaryKey)===id);assert(allowed);
     if(op.kind==='restore-borrowed-columns')assert(same([...op.columns].sort(),[...allowed.columns].sort()));else assert.equal(allowed.action,'restore-missing-original');restores++;
   }
 }
 assert.equal(current.size,0);assert.equal(deleted.size,rows.length);assert.equal(cuts,backend==='rust'?38:0);assert.equal(restores,backend==='rust'?3:0);
 for(const c of db.counters){assert(c.exactRangeCovered&&!c.explicitRootWitness);const nums=new Set(c.witnesses.map(w=>w.sequence));for(let n=c.beforeNextValue??1;n<c.afterNextValue;n++)assert(nums.has(n));for(const w of c.witnesses){assert(by.has(w.entity));for(const r of w.receiptIds)assert(refPins.has(norm(r)));}}
 dbChecks.push({backend,scope:db.scope,rows:rows.length,planHash:plan.planHash,sealedLiveGraphHash:plan.sealedLiveGraphHash,baselineGraphHash:plan.baselineGraphHash,operations:plan.operations.length,deletes:deleted.size,cuts,restores,counters:db.counters.length,allCounterRangesCovered:true});
}
const remainder=json('tmp/rust-r4def/root/cleanup-provenance140.json');
const finalRows=ledger.databases.rust.exactPKLedger.rows,incremental=finalRows.filter(r=>r.reason.startsWith('125a-'));
assert.equal(incremental.length,39);assert.equal(incremental.filter(r=>r.table==='audit_log').length,34);assert.equal(incremental.filter(r=>r.table==='receivable_plan_node').length,5);
assert.deepEqual(incremental.map(r=>key(r.table,r.primaryKey)+'@'+r.rowFingerprint).sort(),remainder.unclaimed.map(r=>key(r.table,r.primaryKey)+'@'+r.rowFingerprint).sort());
const projection=json('tmp/rust-r4def/root/object-provenance136/projection136.json');for(const f of projection.objects)for(const p of f.rowBindings)assert(finalRows.some(r=>r.table===p.table&&r.primaryKey.id===p.id));
const testArgs=['--test','--test-reporter=tap',pkg+'/rules125a.test.mjs'],testStartedAtUtc=new Date().toISOString();
const test=spawnSync(process.execPath,testArgs,{cwd:root,encoding:null,timeout:60000,maxBuffer:8000000});
for(const[name,b]of [['cleanup125a-four-tests-stdout.bin',test.stdout??Buffer.alloc(0)],['cleanup125a-four-tests-stderr.bin',test.stderr??Buffer.alloc(0)]])fs.writeFileSync(path.join(root,out,name),b,{flag:'wx'});
assert.equal(test.status,0);assert(/# tests 4/.test(test.stdout.toString())&&/# pass 4/.test(test.stdout.toString())&&/# fail 0/.test(test.stdout.toString()));
for(const p of codePins)assert.equal(pin(p.file).sha256,p.sha256);
const inputFiles=[manifestFile,pkg+'/rules125a.mjs',pkg+'/ownership125a.mjs',pkg+'/io125a.mjs',pkg+'/cleanup125a.mjs',pkg+'/rules125a.test.mjs',actualFile,ledgerFile,'tools/rust-r4def/cleanup-ledger147.mjs','tmp/rust-r4def/root/cleanup-provenance140.json','tools/rust-r4def/E/cleanup70/authority70.json','tools/rust-r4def/E/cleanup70/core70.mjs','tmp/rust-r4def/root/catalog25/rust-catalog.json','tmp/rust-r4def/root/supplement138/receipt138.json','tools/rust-r4def/independent-final131/scope138-review131.json','tools/rust-r4def/independent-final131/cleanup125-review131.json'];
const inputPins=inputFiles.map(f=>{const p=pin(f),dest=path.join(root,out,'apply147-inputs',f+'.bin');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes(f),{flag:'wx'});return{...p,snapshot:path.relative(root,dest).replaceAll('\\','/')};});
const report={kind:'independent-R4DEF-final131-exact-cleanup125a146-and-ledger147-apply-scope-review',reviewedAtUtc:new Date().toISOString(),
 status:'Exact concrete Root apply scope approved with same-Tx admission; execution and final gates remain unperformed',
 manifest:pin(manifestFile),reviewedPrivateBundle:ledger.reviewedPrivateBundle,originalPlanReceipt:pin(actualFile),exactLedger:pin(ledgerFile),
 checks:{newProductAndSourcePins:8,publicSourcePins:8,original125ProductsUnchanged:9,uniqueOwnedRows:2673,incrementalExact140Remainder:39,incrementalAudits:34,incrementalTimelessNodes:5,allClaimParentsProvenEarlier:true,parentRefs,receiptRefs,actualCommands:commandMap.size,publicCommandsVerified:publicCommands.length,UIPrivateCommandsBoundViaOriginalPublicExchangeMetadata:privateCommands.length,allPublicOriginalPinsVerified:publicPins.length,privatePinsBoundNotRead:privatePins.length,commandLevelOnlyBinaryPinsIncludedInUnion:commandOnlyPins,allDeleteFingerprintsAndCycleOutputChainsMatch:true,allCutsExactNullablePoliciesWithOriginalCHECKsAndNoImmutableUpdate:true,exactBorrowedRestoreOnly:true,allObjectParentsInLedger:true,kindCounts,reasonCounts},
 databases:dbChecks,pureNewTests:{testStartedAtUtc,completedAtUtc:new Date().toISOString(),args:testArgs,exitCode:test.status,passed:4,failed:0,prior20BoundedReused:true,actualDBAcceptance:false,stdout:pin(out+'/cleanup125a-four-tests-stdout.bin'),stderr:pin(out+'/cleanup125a-four-tests-stderr.bin')},
 applyScopeApproved:true,approvedRootEntrypoint:pkg+'/cleanup125a.mjs',approvedBackendScope:['native','rust'],approvedMode:'apply',approvedOutputEdition:'149',
 approvalConditions:['Before execution recheck the approved tool/core/public source hashes, exact cc30 private bundle SHA and union of global plus per-command receiptPins including126 binary body pins not repeated in the global array','Use only reviewed native noOp plus Rust2673 exact deletes,38 exact nullable cuts and3 exact original restores; no other SQL/DDL/constraint change','Actual current same-instance/OID/EtcGMT-8,APIs stopped,ports released,no unknown writer and whole-graph/catalog/guards sameTx admission must all succeed; otherwise stop before DML','Each operation must affect exactly1 guarded expected full row with actual RETURNING fingerprint chain','InsideTx original120table532row baseline must match before COMMIT; preserve unknown COMMIT and do not replay','Require actual COMMIT ACK plus2 fresh postcommit readonly noops; then separately reviewed exact objects backup/unlink and ownedPG stop'],
 privateFullRowAndGuardHashNotRecomputedByReviewer:true,privateBindingLimitation:'Public full PK/fingerprint/producer and operation chains independently checked; actual private raw rows and guards stay Root-only and remain subject to frozen core sameTx/RETURNING/baseline checks',retainedObserverCorrection:'First preflight assumed the top-level allReceiptPins repeated every nested binary body pin;126 are instead explicitly retained in per-command receiptPins. Source preserved; corrected audit consumes the full union and requires Root union rehash before apply.',
 inputPins,codePins,newFindingsP0P1P2:[],DMLExecutedByReviewer:false,terminalCleanupCertified:false,G3Pass:false,G4Pass:false,issueClosure:false,
 reviewer:{privateRead:false,DBHTTPGitGHOrRootEntryExecuted:false,productOrOldEvidenceModified:false,writesOnly:out+'/**'}};
fs.writeFileSync(path.join(root,out,'apply147-scope-review131.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({report:pin(out+'/apply147-scope-review131.json'),applyScopeApproved:true,ownedRows:2673,operations:2714,newPureTests:4,publicPins:publicPins.length,privatePinsNotRead:privatePins.length,G3Pass:false,G4Pass:false})+'\n');
