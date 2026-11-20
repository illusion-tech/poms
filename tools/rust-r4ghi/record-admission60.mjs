import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),root='E:/projects/worktrees/poms-r3hijk-next28/poms';
const file='tools/rust-r4ghi/independent/review05/retained-admission-boundary-review56/actual-admission-readback56c.json',raw=fs.readFileSync(root+'/'+file),proof=JSON.parse(raw);
assert.equal(proof.registry.rawBytesSha256,'2379aadd92d85dbf219a56b1624a5ccc61f117683cfefe45fc76eb6dbba91550');
assert.equal(proof.totalTables,278);assert.equal(proof.totalRows,2421);assert(proof.actualFiveResourceRegistrationsMatchFrozenInventory&&proof.current405SourcesAllMatchPlan02);
assert(proof.databases.every(d=>d.allRowKeySHAAndXminEqual&&d.metadataAndSequencesEqual&&d.frozenObjectInventoryEqual));
const record={kind:'actual-source11-explicit-retained-data-admission-completed',producerEpoch:'g2-business10',consumerEpoch:'g2-business11',run:'main01',api:134,
 registry:proof.registry,planSHA256:proof.approvedPlanSHA256,sourcePinsSHA256:proof.sourcePinsSHA256,sourceCount:405,binarySHA256:proof.binarySHA256,candidate:proof.candidate,
 retainedSnapshot:proof.retainedSnapshot,freshEquivalentSnapshot:proof.freshEquivalentSnapshot,databases:proof.databases,registeredResources:5,
 independentReadback:{file,rawBytesSha256:sha(raw)},businessDatabaseWritesByAdmission:0,HTTPRequestsByAdmission:0,restoreExecuted:false,
 originalProducerStateAndEvidencePreserved:true,oldProducerAcceptanceCountedAsCurrent:false,subsequentConsumerAcceptance:'separate-actual-series-required',G3Certified:false,G4Certified:false};
fs.writeFileSync(root+'/docs/design/rust-r4ghi/consumer11-admission54-actual.json',JSON.stringify(record,null,2)+'\n',{flag:'wx'});
const indexFile=root+'/docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(indexFile));
Object.assign(index.currentCorrective,{nextConsumerAdmission:'completed-and-independently-read-back',consumerAdmission:'rust-r4ghi/consumer11-admission54-actual.json',currentSourceEpoch:'g2-business11',currentAPI:134,
 newSourceCount:405,newSourcePinsSHA256:proof.sourcePinsSHA256,currentCandidate:proof.candidate,currentBinarySHA256:proof.binarySHA256,currentRustValidation:{fmt:'rust-fmt07',clippy:'rust-clippy09',test:'rust-test08',build:'rust-build08',passed:511,historicalIgnored:54,failed:0},current102Series:'in-progress-no-certification'});
fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({admissionRecorded:true,tables:278,rows:2421,officialRustOperations:index.officialRustOperations,officialNewDelivered:index.officialNewDelivered,G3Certified:false}));
