// Public nonsecret fixed-evidence status; no live state or business payload copy.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),W='//wsl.localhost/Debian',P='/home/wangzishi/.local/share/poms-r4ghi/private',D=P+'/business/g2-business13/main01',sha=v=>createHash('sha256').update(v).digest('hex');
const actual=file=>file.startsWith(P+'/')?W+file:R+'/'+file,pin=(file,expected)=>{const rawBytesSha256=sha(fs.readFileSync(actual(file)));if(expected)assert.equal(rawBytesSha256,expected);return{file,rawBytesSha256};};
const result={kind:'actual-R4GHI-tool119-MainG-and-Tax-preparation-boundaries248',date:'2026-11-09',officialRustOperations:240,officialNewDelivered:0,G3Certified:false,G4Certified:false,
 source:{epoch:'g2-business13',count:416,digest:'5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e',API:136,binary:'2d9ed8f711818b83b1cff440b72265bcacf9ff2f31f409d2d7d5a9aabd346e13',migrations:98},
 independentToolCheckpoint:pin('tools/rust-r4ghi/independent/final-gates13/tool119-checkpoint243/checkpoint243.json','be55ff1709734b5a1f20b9185586c246f167394b5984891a5aa810e79a351df7'),
 finalHelperCount:198,finalHelperPins:pin(D+'/helper-fixture234/H1-actual234.json','51b303a3fccbae5e7fd7b0cc6a042da5bfd12f43c4a7507dfb6479e1d0be579c'),
 actualRepo211:pin(P+'/source13-H1-helper235/receipt235.json','b2504a43ef271b0706c7f10e8c066fe97bef4dd200406aeb1a2e0ba51e8172b5'),
 original227Failed209Pass2FailRetained:pin(P+'/source13-H1-helper227/receipt227.json','907dce9e2cf7a29728d5e310cf4233461dead50d77f8270c9c95b538c03b80fa'),
 explicitCounterPreservingWithdrawal:pin(D+'/tool119-withdraw232/withdrawal232.json','efa024c6bc27cde5bb1686b2a25091e3556696f6a8b901ebdf905fd2cff8214f'),
 new119:pin(D+'/tool-admission119-a0f20333-8772-4ac1-a9a7-229950619176.json','2047baf16b5e5fcd24ddc4aa0729c770033edc60c44f04a152315d9d3f0b03a7'),
 newB2:pin(D+'/B2-Source13-tool119-admitted238.json','0e3d88fb6f1e362af8c1906632b5800c55281fcc77aa12d61f1ea1bb74052540'),
 lastBeforeDomainMutationFullConservation:pin(D+'/tool119-post240/receipt240.json','6101276b6d250a82d99bd9f65332cca0c912bb2de27170f4b358cf87ea70e9fd'),
 MainG:{actualHTTPStatus:201,postconditions:'verified',replayedOldProducer:false,command:pin(P+'/tax242-finish-main/command242.json','016bb6309967dffc332b065924292f005cb1eda6fd960b7de1d64b8d0e3b59df'),
  proof:pin(D+'/000054-tax13-main-actual-success.json'),completion:pin(D+'/000040-tax242-finish-main-complete.json','9a082685be6f81a715a459f6ddc061e494e91c082d2312056a919095373a9e9e')},
 TaxPreparation:{status:'failed-before-FI-or-normal-correction',command:pin(P+'/tax242-prepare-tax/command242.json','9e70ae5664292c5cf1af72c113c05561c4d663394582d336700eb0c02a5669ae'),
  original:pin(D+'/000055-tax242-prepare-tax-partial.json','dc4bca072272d1dd18fb76822907f1d676e5dd4c0e988adf8eb723195bdbb1aa'),fixedDiagnosticInput:pin(D+'/taxprepare-failure245/receipt245.json','676b3553c381293208987ba4a64be9079dca558e6adeb88d44d77914fade9bcc'),
  actualServerProposedTargets:5,helperDateOnlyExpectedTargets:2,initialRootDiffDirectionMistakeCorrected:true,
  extraThreeOldSnapshots:{businessCutoff:'2026-11-07',newTaxCostBusinessDate:'2026-11-08',newTaxSourceMembersPresent:false,preparation:'missing-evidence/operating_cost_outside_cutoff'},
  interpretation:'independent-causal-review-in-progress-no-target-trimming-or-expected-number-rewrite',FIStarted:false,normalTaxCorrectionCommitted:false},
 independentH46:{status:'private-binding-reviewed-and-Root-run247-started-result-not-certified',binding:pin(D+'/policy-runtime246.json','fdbb4760089dd3b9a8906dcfa9112f0cc03da3adb166cbbf20432b493e77ecba'),separateNewProject:true,changesTaxProjects:false,roleGrantOrPeriodCreation:false},
 externalSupport:{period206:'bounded-code-reviewed-only-real-prepare-FI-normal-pending',mixed219:'bounded-code-reviewed-only-actual-FI-mapping-not-approved',legacy222:'proposal-under-independent-review-no-writer-execution-approved'},
 remaining:['resolve-real-Tax-impact-closure','Tax-complete-required-FI-and-one-normal-commit','H46-real-policy-boundaries','public-role49-and-transitive-Labor47','period206','complete-live-period-allocation219','legacy-authority222','unified-independent-G3-G4-and-owned-restoration'],
 issueBoundaries:{mustRemainOpen:[57,116],unfinishedAlsoOpen:[101,110,111,112,113,114,117],independentClosed115:true},
 originalSourcesAndFailuresNotRelabelled:true,privateStateHeadersCredentialsOrPayloadCopied:false};
const file='docs/design/rust-r4ghi/current-progress248.json';fs.writeFileSync(R+'/'+file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({publicIndex:pin(file),newOfficialDelivery:0,G3:false,G4:false}));
