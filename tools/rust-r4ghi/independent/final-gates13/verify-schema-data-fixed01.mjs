import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const repo='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/',workspace='E:/projects/worktrees/poms-r3hijk-next28/poms';
const user='/home/wangzishi/',unc='//wsl.localhost/Debian/home/wangzishi/';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const need=(ok,label)=>{if(!ok)throw new Error(label);};
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const equal=(a,b,label)=>need(JSON.stringify(canonical(a))===JSON.stringify(canonical(b)),label);
const host=f=>f.startsWith(repo)?path.join(workspace,f.slice(repo.length)):f.startsWith(user)?unc+f.slice(user.length):f;
const pins=new Map(),rowCache=new Map();
function bytes(pin){const p=host(pin.file);const b=fs.readFileSync(p);need(sha(b)===pin.rawBytesSha256,'Raw pin mismatch: '+pin.file);pins.set(pin.file,pin.rawBytesSha256);return b;}
const read=pin=>JSON.parse(bytes(pin));
const P=(file,rawBytesSha256)=>({file,rawBytesSha256});
const priv=user+'.local/share/poms-r4ghi/private/';
const verify=read(P(priv+'business/g2-business13/main01/000003-schema108-verification.json','1480d9f724e32573b5bf53a6b5e78e2be8497378e09a70c2641aee90bc214b93'));
const migration=read(P(priv+'business/g2-business13/main01/Source13-M98-receipt108.json','fad604ce8850cae183055774e5e97366f547e583b3bbbb0b59fce2298104fc88'));
equal(verify.retainedSnapshot,verify.migrationBefore,'Retained/before must preserve exact approved pin');
const snapshots={original:read(verify.originalBaseline),retained:read(verify.retainedSnapshot),after:read(verify.migrationAfter),fresh:read(verify.freshCurrent),derived:read(verify.comparisonBaseline)};
function rows(snapshot,db,table){const t=snapshot.databases[db].tables[table];if(rowCache.has(t.file))return rowCache.get(t.file);const b=bytes(P(t.file,t.rawBytesSha256));const out=b.toString('utf8').split('\n').filter(Boolean).map(x=>JSON.parse(x));need(out.length===t.count,'Row count mismatch: '+db+'/'+table);for(const r of out)need(typeof r.raw==='string'&&sha(r.raw)===r.sha256,'Row raw digest mismatch: '+db+'/'+table);rowCache.set(t.file,out);return out;}
let tableReferences=0;for(const s of Object.values(snapshots))for(const db of Object.keys(s.databases))for(const t of Object.keys(s.databases[db].tables)){rows(s,db,t);tableReferences++;}
const descriptor=t=>Object.fromEntries(Object.entries(t).filter(([key])=>key!=='file'));
const rec=x=>typeof x==='string'?JSON.parse(x):x;
function selectedFunction(meta){const matches=meta.normative.functions.map(rec).filter(x=>x.schema==='poms'&&x.proname==='jghi_assignment_participant_guard');need(matches.length===1,'Guard count');return matches[0];}
function selectedSequence(meta){const matches=meta.sequences.map(rec).filter(x=>x.schema==='poms'&&x.name==='poms_migrations_id_seq');need(matches.length===1,'Migration sequence count');return matches[0];}
function strippedMeta(meta){const x=JSON.parse(JSON.stringify(meta));x.normative.functions=x.normative.functions.filter(v=>{const f=rec(v);return !(f.schema==='poms'&&f.proname==='jghi_assignment_participant_guard');});x.sequences=x.sequences.filter(v=>{const s=rec(v);return !(s.schema==='poms'&&s.name==='poms_migrations_id_seq');});return x;}
function body(def){const m=/\bAS\s+(\$[A-Za-z0-9_]*\$)([\s\S]*)\1\s*;?\s*$/i.exec(def.trim());need(!!m,'Exactly one PL function body');return m[2];}
const sql=bytes(migration.approvedSQL).toString('utf8'),sqlBody=body(sql);
const dbResults=[];
for(const db of Object.keys(snapshots.retained.databases)){
 const before=snapshots.retained.databases[db],after=snapshots.after.databases[db],fresh=snapshots.fresh.databases[db];
 equal(Object.keys(before.tables),Object.keys(after.tables),'139-table set changed: '+db);need(Object.keys(before.tables).length===139,'Table count');
 for(const t of Object.keys(before.tables)){
  equal(descriptor(after.tables[t]),descriptor(fresh.tables[t]),'After/fresh table descriptor changed: '+db+'/'+t);
  if(t!=='poms_migrations')equal(descriptor(before.tables[t]),descriptor(after.tables[t]),'Business table changed by M98: '+db+'/'+t);
 }
 const bRows=rows(snapshots.retained,db,'poms_migrations'),aRows=rows(snapshots.after,db,'poms_migrations');
 need(bRows.length===97&&aRows.length===98,'Migration row counts');const map=new Map(aRows.map(x=>[JSON.stringify(x.key),x]));
 for(const r of bRows){const a=map.get(JSON.stringify(r.key));need(!!a,'Old migration row missing');equal({key:r.key,raw:r.raw,sha256:r.sha256,xmin:r.xmin},{key:a.key,raw:a.raw,sha256:a.sha256,xmin:a.xmin},'Old migration raw/xmin changed');}
 const oldKeys=new Set(bRows.map(x=>JSON.stringify(x.key))),newRows=aRows.filter(x=>!oldKeys.has(JSON.stringify(x.key)));need(newRows.length===1,'Not one migration row');
 const added=newRows[0],value=JSON.parse(added.raw);need(value.name===migration.migrationName,'New migration name differs');
 const bf=selectedFunction(before.meta),af=selectedFunction(after.meta);equal(Object.fromEntries(Object.entries(bf).filter(([k])=>k!=='definition')),Object.fromEntries(Object.entries(af).filter(([k])=>k!=='definition')),'Guard identity/owner/ACL/config changed');
 equal(strippedMeta(before.meta),strippedMeta(after.meta),'Unapproved catalog/metadata changed: '+db);equal(after.meta,fresh.meta,'After/fresh metadata changed: '+db);
 need(body(af.definition)===sqlBody,'Guard after body differs from approved SQL');
 need(af.definition.replace(body(af.definition),'VERIFIED_BODY')===bf.definition.replace(body(bf.definition),'VERIFIED_BODY'),'Guard definition frame changed');
 const bs=selectedSequence(before.meta),as=selectedSequence(after.meta);equal(Object.fromEntries(Object.entries(bs).filter(([k])=>k!=='value')),Object.fromEntries(Object.entries(as).filter(([k])=>k!=='value')),'Sequence identity/options changed');need(BigInt(as.value)-BigInt(bs.value)===1n,'Sequence advance not exactly one');need(String(value.id)===String(as.value),'New migration row not actual sequence value');
 const observed={functionOID:af.oid,beforeDefinitionSHA256:sha(bf.definition),afterDefinitionSHA256:sha(af.definition),afterBodySHA256:sha(body(af.definition)),migrationRow:{key:added.key,rowSHA256:added.sha256,xmin:added.xmin,name:value.name},actualSequenceDeltas:[{before:bs,after:as}]};
 equal(observed,migration.databases[db],'M98 receipt evidence disagrees with raw snapshots: '+db);equal(observed,verify.evidence.databases[db],'Schema receipt disagrees with raw snapshots: '+db);
 const original=snapshots.original.databases[db],derived=snapshots.derived.databases[db];
 for(const t of Object.keys(original.tables)){if(t==='poms_migrations')equal(derived.tables[t],after.tables[t],'Derived canonical migration pointer differs');else equal(derived.tables[t],original.tables[t],'Derived original business baseline pointer rebased: '+db+'/'+t);}
 equal(derived.meta,after.meta,'Derived canonical metadata differs');
 dbResults.push({database:db,businessTablesUnchanged:138,original97MigrationRowsRawAndXminUnchanged:true,uniqueMigrationRow:observed.migrationRow,functionOID:observed.functionOID,guardBodyEqualsApprovedSQL:true,allOtherCatalogOwnerACLRolesTriggersConstraintsAndSequencesUnchanged:true,sequenceDelta:observed.actualSequenceDeltas[0],afterToFreshRowsAndMetadataEqual:true,derived138BusinessTablePointersEqualOriginalM97:true,derivedCanonicalMigrationPointerEqualAfter:true});
}
equal(snapshots.retained.objects,snapshots.after.objects,'Migration captured object manifest changed');equal(snapshots.after.objects,snapshots.fresh.objects,'After/fresh captured object manifests changed');equal(snapshots.original.objects,snapshots.derived.objects,'Derived object baseline rebased');
need(snapshots.derived.kind==='derived-schema-comparison-baseline108'&&snapshots.derived.businessBaselineRebased===false,'Derived baseline label changed');
const registry=read(P(priv+'business/g2-business13/main01/000004-consumer-admission108-registry.json','23cc54f891fb5200a1bad30083f75805e27a1d046096705381034ff32493971c'));
equal(registry.originalBaseline,verify.originalBaseline,'Registry original baseline mismatch');need(registry.originalBaseline.rawBytesSha256==='f4026a1464d843d45b986f999d4dbbedbce967e941736e386512cb1103fe734d','Original M97 baseline pin');
const old=read(registry.producerState);equal(old.baseline,registry.originalBaseline,'Frozen producer original baseline changed');need(registry.retainedSnapshotEquivalent===false&&registry.schemaAdvanceOnly===true&&registry.migrationExecutedByAdmission===false,'Schema boundary labels changed');
const result={kind:'independent-fixed-M98-and-schema3-data-readback01',reviewer:'/root/r4ghi_final_gates13',mode:'fixed snapshots/raw row files only; no SQL/helper execution/live state',snapshotCount:5,tableFileReferences:tableReferences,uniqueRowFilesHashed:rowCache.size,allRowRawSHA256Verified:true,databases:dbResults,retainedToMigrationBefore:'Identical approved pin106c; not described as a separate fresh DB capture',beforeToAfter:'Only approved sameOID guard body, one canonical M98 row and its sequence increment',afterToFresh:'All139 table descriptors/raw rows/xmin/complete metadata/captured objects equal',originalM97Baseline:registry.originalBaseline,derivedComparisonBaseline:verify.comparisonBaseline,derivedOriginalObjectsEqual:true,currentLiveStateBaselineNotRead:true,canonicalM98MustNotEnterOwnedFixtureCleanup:true,uniqueInputPinsHashed:pins.size,inputPins:[...pins].map(([file,rawBytesSha256])=>({file,rawBytesSha256})),G3Certified:false,G4Certified:false,newCertifiedOperations:0,businessAcceptanceGranted:false};
fs.writeFileSync(path.join(root,'schema-data-readback01.json'),JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify({snapshotCount:5,tableFileReferences:tableReferences,uniqueRowFilesHashed:rowCache.size,databases:dbResults,allCapturedObjectsConserved:true,originalBaseline:'f4026a14',derivedBusinessRebased:false,G3G4:false})+'\n');
