// Verify existing server seals only; never mint a reference for a business request.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),unc=file=>'\\\\wsl.localhost\\Debian'+file.replaceAll('/','\\');
const read=file=>fs.readFileSync(unc(file));
const state=JSON.parse(read('/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business10/main01/state.json'));
const sweeps=Object.values(state.efRequiredWriteSweeps40??{});assert.equal(sweeps.length,1);const sweep=sweeps[0];
const inventoryRaw=read(sweep.actualDerivedInventory.file);assert.equal(sha(inventoryRaw),sweep.actualDerivedInventory.rawBytesSha256);const inventory=JSON.parse(inventoryRaw);
const snapshotRaw=read(inventory.before.file);assert.equal(sha(snapshotRaw),inventory.before.rawBytesSha256);const snapshot=JSON.parse(snapshotRaw);
const rows=table=>{const m=snapshot.databases.poms_r4ghi_rust.tables[table],raw=read(m.file);assert.equal(sha(raw),m.rawBytesSha256);return raw.toString().split('\n').filter(Boolean).map(JSON.parse).map(row=>JSON.parse(row.raw));};
const order=value=>Array.isArray(value)?value.map(order):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,order(value[key])])):value;
const canonical=value=>sha(JSON.stringify(order(value)));
const facts=inventory.scope.efFacts,ids=[facts.laborDecisionId,facts.stageDecisionId,...facts.results.map(row=>row.oldDecisionId)];
const members=rows('operating_source_member'),decisions=rows('project_cost_inclusion_decision');const proofs=[];
for(const id of ids){
 const prior=decisions.find(row=>row.id===id);assert(prior);const frozen=prior.frozen_payload;assert.equal(canonical(frozen),prior.payload_hash,'Existing server seal must match before testing the inverse');
 const original=frozen.input.target,final=frozen.sourceRef;
 const captured=members.filter(row=>row.source_kind===final.kind&&row.source_id===final.id&&row.source_row_version===final.rowVersion&&row.source_payload_hash===final.payloadHash);assert(captured.length);
 const payload=captured[0].captured_payload;assert.equal(canonical(payload),final.payloadHash);const inverse=structuredClone(payload);
 if(final.rowVersion===original.expectedVersion+1){inverse.row_version=original.expectedVersion;inverse.is_included_in_project_cost=false;inverse.included_at=null;inverse.included_by=null;if(final.kind==='ProjectActualCostRecord')inverse.record_status='confirmed';}
 else assert.equal(final.rowVersion,original.expectedVersion);
 assert.equal(canonical(inverse),original.payloadHash,'Only the exact G consumption delta may explain the recorded old reference');
 proofs.push({sourceKind:final.kind,classification:frozen.input.decision,role:frozen.input.recognitionRole,originalVersion:original.expectedVersion,finalVersion:final.rowVersion,
  existingSealMatched:true,serverCapturedFinalPayloadMatched:true,consumptionOnlyInverseMatchedOriginalServerHash:true,
  selfEvidenceUsesOriginalTarget:frozen.input.evidenceRefs.some(ref=>JSON.stringify(order(ref))===JSON.stringify(order(original)))});
}
const report={kind:'actual-original-server-consumption-seal-verification-not-a-new-authority',inventoryOriginal:sweep.actualDerivedInventory,snapshotOriginal:inventory.before,
 proofs,privatePayloadsCopied:false,newExpectedRefsMinted:false,SQLSent:0,HTTPRequestsSent:0,wholeCandidateCargoExecuted:false,G3Certified:false,G4Certified:false};
fs.writeFileSync(new URL('./actual-original-bridge-proof54.json',import.meta.url),JSON.stringify(report,null,2)+'\n',{flag:'wx'});process.stdout.write(JSON.stringify({result:'pass',existingDecisionsVerified:proofs.length,proofs})+'\n');
