import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
const win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',priv='/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business09/main01',sha=b=>createHash('sha256').update(b).digest('hex');
const state=JSON.parse(fs.readFileSync(priv+'/state.json')),f=state.fixtures;assert(state.cleaned&&state.databaseCleanupCommitted);assert.equal(state.cleanedByPlanSHA,'f24350e9c4f462979b44c10ef3eccd4896f7497d7036f10026799fc61ac25521');
assert(f.creatorOwnership23.completed&&f.legacyCompatibilityFixture.verified);const projects=Object.values(f.creatorOwnership23.projects);assert.equal(projects.length,5);assert(projects.every(x=>x.proof&&x.proofPending===false));
const complete=fs.readFileSync(priv+'/000277-cleanup-apply01-complete.json');assert.equal(sha(complete),'ed2271351dd7fba713a74ebd332bd01e730940f786827db16c6498ac521d16f2');
const cleanup=JSON.parse(complete);assert.equal(cleanup.noop.freshRounds,2);assert.equal(cleanup.deletes,208);assert.equal(cleanup.restores,1);
const result={kind:'actual-API132-early-ownership-probes-completed-and-cleaned',candidate:'API132',epoch:'g2-business09',binarySHA256:state.apiProcess.record.binarySha256,
 sourcePinsSHA256:sha(JSON.stringify(state.sourcePins)),sourceFiles:state.sourcePins.length,
 actualCreator:{personal:projects.filter(x=>x.project.ownerUserId!==null).length,organization:projects.filter(x=>x.project.ownerUserId===null).length,
  firstAssignmentAndPermanentConsumePassed:true,creatorAllPermissionsDoNotRetainReadOrWrite:true,twoRealSessionsAndTwoObservedLockWaiters:true,raceStatuses:[200,409]},
 legacy:{controlledNewPKs:1,actualHistoricalProducer:false,exactMinimumReadAndFullCommandDenialsPassed:true,source:f.legacyCompatibilityFixture.receipt},
 retainedFailures:[{phase:'000092',kind:'proof-harness-timezone-assumption',committedDefaultCreateNotReplayed:true},{phase:'000112',kind:'proof-harness-noncanonical-operation-name',noMissingOperationHTTPRequestSent:true}],
 recovery:{phase:'000158',businessRequests:0,businessWrites:0,ownedHashesRebased:0},
 cleanup:{planSHA256:state.cleanedByPlanSHA,deletes:208,restores:1,objectDeletes:0,freshNoops:2,originalReceiptSHA256:sha(complete),rowXminRestoredClaim:false},
 newCandidateRequired:'API133/new10 after canonical metadata audit correction and final source fixes',
 eligibleContractPeriodSourcesDeleted:0,finalPeriodSourceRetentionStillRequired:true,G3Certified:false,G4Certified:false};
fs.writeFileSync(win+'/docs/design/rust-r4ghi/round09-disposition33.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({recorded:true,personal:result.actualCreator.personal,organization:result.actualCreator.organization,cleanedOwnedRows:208,G3Certified:false}));
