import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',linux='/home/wangzishi/.local/share/poms-r4ghi/private',unc='//wsl.localhost/Debian'+linux,sha=b=>createHash('sha256').update(b).digest('hex');
const read=(file,expected)=>{assert(file.startsWith(linux+'/'));const bytes=fs.readFileSync(unc+file.slice(linux.length));if(expected)assert.equal(sha(bytes),expected);return{value:JSON.parse(bytes),pin:{file,rawBytesSha256:sha(bytes)}};};
const registry=read(linux+'/business/g2-business12/main01/000002-consumer-admission54-registry.json','3ed7bd387b6f4f3b8e44201e7985043b18b71cefceba3194f83ab19300f7d29c');
const noop=read(linux+'/business/g2-business12/main01/004533-noop73-complete.json','b8a4fae41a77bcde4c882bd52d1225029970ddf4f41a7084d76b48098c8fe5ca');assert.equal(noop.value.phase,'verified');assert.equal(noop.value.emptyValidation.actualStatus,400);assert.equal(noop.value.denied.length,3);assert.equal(noop.value.dirty.primaryHitFailures,3);
const candidate=read(linux+'/business/g2-business12/main01/004534-candidate-source-binding12.json','b5c86c8882657aac1e1affc153510a728bc304943265e51a230b6be19a0429b7');assert.equal(candidate.value.sourcePins.length,406);
const result={kind:'actual-source12-admission-and-new-owner-metadata-evidence75',sourceEpoch:'g2-business12',API:135,registry:registry.pin,sourcePinsSHA256:candidate.value.sourcePinsSHA256,
 binarySHA256:candidate.value.process.record.binarySha256,candidate:candidate.pin,retainedSnapshot:registry.value.retainedSnapshot,freshEquivalentSnapshot:registry.value.freshEquivalentSnapshot,
 registeredResources:registry.value.fixtureAdmissions.map(e=>({path:e.registryPath,birthEpoch:e.birthSource.epoch,retainedAtEpoch:e.retainedAt.epoch,receiptEpochs:[...new Set(e.receiptProvenance.map(r=>r.source.epoch))]})),
 newOwnerHTTP:noop.pin,emptyRequest:'actual400-at-existing-refine-not-service-noop',sameValue:'actual200-preserves-project-xmin/version/time/updater/business-audit',validScopeDenials404:3,dirtyFIFamilies:3,dirtySuccesses:1,postDirtyNoop:true,
 priorAPI134EvidenceNotCountedAsAPI135:true,officialNewDelivered:0,periodAccepted:false,actualDOMAccepted:false,G3Certified:false,G4Certified:false};
fs.writeFileSync(root+'/docs/design/rust-r4ghi/current-source12-evidence75.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
const file=root+'/docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(file));Object.assign(index.currentCorrective,{currentSourceEpoch:'g2-business12',currentAPI:135,newSourceCount:406,newSourcePinsSHA256:candidate.value.sourcePinsSHA256,
 currentBinarySHA256:candidate.value.process.record.binarySha256,currentCandidate:candidate.pin,newSource12Admission:'actual-completed-with-immutable-FS-independent-readback',newOwnerMetadataHTTP:'actual135-noop73-complete',newOwnerEvidence:'rust-r4ghi/current-source12-evidence75.json',currentRustValidation:{fmt:'rust-fmt08',clippy:'rust-clippy10',test:'rust-test09',build:'rust-build09',passed:513,historicalIgnored:54,failed:0}});fs.writeFileSync(file,JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({recordedAPI:135,sourceFiles:406,registeredResources:7,newOwnerHTTPComplete:true,formalRust:index.officialRustOperations,newDelivered:index.officialNewDelivered,G3Certified:false}));
