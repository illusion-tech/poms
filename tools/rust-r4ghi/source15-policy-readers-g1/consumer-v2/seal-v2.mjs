import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const d=path.dirname(fileURLToPath(import.meta.url)),prior=path.resolve(d,'../source15-tax-consumer-G1C-proposal01'),root='E:/projects/worktrees/poms-r3hijk-next28/poms';const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function pin(f,h){const st=fs.lstatSync(f);assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);assert.equal(fs.realpathSync.native(f).toLowerCase(),path.resolve(f).toLowerCase());const b=fs.readFileSync(f),actual=sha(b);if(h)assert.equal(actual,h);return{file:path.resolve(f).replaceAll('\\','/'),bytes:b.length,rawBytesSha256:actual};}
function artifact(n,v){const f=d+'/'+n;fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n',{flag:'wx'});return pin(f);}
const base=pin(prior+'/CONSUMER-API15-v1.PROPOSED.json','50a6b23424cfe24cc3db772300b8bacaa8909246b4c06f325bdbd4f056d233b0');const original=JSON.parse(fs.readFileSync(base.file));const v2=structuredClone(original);
v2.kind='PROPOSED-Source15-fixed-native-Tax-and-118-joint-consumer-ABI-v2';v2.parentInterface=base;
assert(!v2.envelope.requiredFields.includes('afterVerifiedFrame')&&!v2.sidecar.requiredFields.includes('afterVerifiedFrame'));
v2.envelope.requiredFields.push('afterVerifiedFrame');v2.sidecar.requiredFields.push('afterVerifiedFrame');v2.actual.afterVerifiedFrame=null;
v2.afterVerifiedFrameProtocol={
 kind:'actual-Source15-Tax118-after-verified-ownership-journal-frame',schemaVersion:1,namespace:'poms-r4ghi',epoch:'g2-business15',run:'main01',sourceGeneration:15,
 paths:{sweep:'/taxContinuation15/sweep/afterVerifiedFrame',completion:'/afterVerifiedFrame',sidecar:'/afterVerifiedFrame',returnedJointProof:'/invocation118Sidecar/afterVerifiedFrame'},
 frameRequiredFields:['kind','schemaVersion','namespace','epoch','run','sourceGeneration','marker','prefix','sequenceAtSnapshot','current15','ownershipState','ownershipLog','observation','commandLedgers','normalResult','fiCompletion','entryGuard','exitGuard','closedJournal'],
 fieldSemantics:{
  ownershipState:'Independent wx private raw-byte copy of actual full state after real normal reconcile/postconditions/exit verification; include real owned/borrowed/object ownership, not selected synthetic projection or fake ctx',
  ownershipLog:'Independent complete raw-byte copy of actual D15 ownership.jsonl through this point; actual records are at/key/rowSha256/proof, not invented xmin-bearing records',
  observation:'Exact normalResult.finalSuccess.after full139x2 snapshot; no subsequent unobserved HTTP/domain mutation before frame; verification only after this observation, otherwise STOP for explicit revised observation contract',
  commandLedgers:'Every actual HTTP reconciliation from normal entry ownership anchor through observation, original order/full pins, including real allowed auth; no fabricated status field',
  normalResult:'Actual already-written verified normal201 outcome with raw response/ledger/before/after/postcondition source pins; no completion/sidecar pin',
  fiCompletion:'Actual prior closed FI proof pin, identical to sweep.fiComplete and completion.fiCompletionProof',
  entryGuard:'Actual normal invocation entry proof, including ownershipState and ownershipLogPrefix immutable pins',
  exitGuard:'Actual original full15 exit verification after reconcile/postconditions; never a self-asserted boolean',
  closedJournal:'Actual closed invocation journal before final output publication, containing all stages and normal verified outcome; no completion/sidecar output pin',
  current15:'Same real runtimeBindings/Reg5/B1/API/source/fullH3/binary/namespace tuple as actual normal/entry/exit/complete/sidecar',
 },
 invocationEntryRequiredFields:['ownershipState','ownershipLogPrefix'],
 publicationOrder:['actual201 original saved','real after capture/reconcile and full postconditions verified','real exit guard and closed journal saved','actual ownership state/log copies and ordered ledger index sealed as frameF without C/S output pins','completionC references F plus real FI/201; C has no sidecar pin','sidecarS references C and identical F','current state finally metadata-publishes completion/sidecar and sweep.afterVerifiedFrame'],
 forbiddenCycles:['Frame refers completion/sidecar/self pin','Completion refers sidecar','Journal/normalResult needed by Frame already refers future completion/sidecar','Ownership state snapshot already contains newly-generated output pins'],
 snapshotOutputSlots:'At capture, current taxContinuation15.complete/sidecar and sweep.afterVerifiedFrame are absent or null. Real earlier FI completion pin remains permitted. Later counter/metadata progression is expected.',
 validation:[
  'Every F/C/S/sweep returned-frame pin is exactly same file/rawSHA/bytes where present; all raw files regular/nosymlink/realpath/nlink1 and immutable copies, not active mutable filenames',
  'Re-read actual frame state/log and original snapshots/ledgers; prove entry ownership log is byte-exact prefix of full after log and fold actual logged own events plus all actual reconciliation ledgers',
  'Recompute complete before/after row sha/xmin and recorded changes/ownership, original first/birth/proof and allowed borrowed columns; no unknown or silently-unlogged mutation',
  'Owned latestSHA/xmin at seal agrees with frame observation and latestProof actual request/op/beforeSHA/snapshot pins; borrowed xmin comes from original snapshot, not a nonexistent metadata field',
  'Ledger status from actual wire, never nonexistent ledger.status; ownershipComplete/blockers/recorded/request/op/before/after must match actual immutable ledger JSON',
  'Use explicit frame data pure/FS assertions; never construct a substitute ctx, replace ctx.state/owned, inject reader, or call old assertRecorded with a fake frame context',
  'FI uses its actual invocation entry/rollback originals. Normal final map cannot retroactively grant FI ownership or produce missing historical adoption',
  'All current source/API/registration/current completion/frame pointers still validate; historical frozen row values are not compared with later ctx.owned.latest after legitimate period/mixed writes',
  'Reg5 original13 Main and final14 parent remain separate typed frames; never relabel historical proof15',
  'Missing/partial frame, log truncation/reorder, changed byte prefix, mismatched raw row/xmin/proof/journal/G2, unclosed control or unknown output rejects all five consumers',
  'C/S orphan on interruption is not state admission; preserve originals and require exact Root reconciliation, never overwrite or replay201',
 ],
 returnAddition:'After all validation append the exact F pin as invocation118Sidecar.afterVerifiedFrame; retain all v1 native return fields and five-consumer mappings',
 actual:{frame:null,ownershipState:null,ownershipLog:null,normalResult:null,entryGuard:null,exitGuard:null,closedJournal:null,complete:null,sidecar:null,publishedState:null},
};
const reversed=structuredClone(v2);reversed.kind=original.kind;delete reversed.parentInterface;delete reversed.afterVerifiedFrameProtocol;delete reversed.actual.afterVerifiedFrame;assert.equal(reversed.envelope.requiredFields.pop(),'afterVerifiedFrame');assert.equal(reversed.sidecar.requiredFields.pop(),'afterVerifiedFrame');assert.deepEqual(reversed,original,'Every other v1 field including the five selectors/284 normalization/returns is unchanged');
const actualReaderSources=[pin(root+'/tools/rust-r4ghi/business/context.mjs'),pin(root+'/tools/rust-r4ghi/business/ledger.mjs')];
const abi=artifact('CONSUMER-API15-v2.PROPOSED.json',v2);
artifact('limited-diff-v2.json',{kind:'G1C15-ownership-publication-only-addendum',parentABI:base,newABI:abi,changedPointers:['/kind (version label only)','/parentInterface (new)','/envelope/requiredFields/- afterVerifiedFrame','/sidecar/requiredFields/- afterVerifiedFrame','/actual/afterVerifiedFrame null','/afterVerifiedFrameProtocol (new)'],reverseToV1DeepEqual:true,oldABIRechecked:true,nativeProductsRemain:2,H3ContributionRemains:0,executorLeavesRemain:6,consumerIdsUnchanged:original.consumerIds,sourceSemanticsReadOnly:actualReaderSources,implementationAuthorized:false});
artifact('test-design-ownership-v2.json',{kind:'design-only-not-executed',cases:['Frame absent while envelope bools true rejects','F/C/S/sweep pin or bytes differ rejects','Frame created before reconcile/postconditions/exit refuses','Frame or required journal points future C/S/self rejects','C points S or state published before both files refuses','Active mutable state/log path or alias/symlink/hardlink rejects','Ownership log truncated/selected lines/reordered/prefix mutated rejects','Raw actual snapshot rowSHA/xmin versus frozen frame mismatch rejects','Before proof/request/op/body or afterSnapshot pin wrong rejects','Borrowed/deletion/object changes missing from full ledger chain reject','Invented ledger.status or borrowed.latestXmin is not required/accepted as authority','Actual complete frame remains valid after legitimate period/mixed latest changes','Fake ctx/reader injection cannot make historical validator pass','Old13 Main/final14 frame relabel15 rejects','All five consumer selectors independently require same frame','Crash after C or S without state publication preserves orphan/no201 replay'],testsExecuted:0,actualEffects:false});
for(const p of [base,...actualReaderSources])pin(p.file,p.rawBytesSha256);
const arts=['OWNERSHIP-PUBLICATION-v2.md','seal-v2.mjs','CONSUMER-API15-v2.PROPOSED.json','limited-diff-v2.json','test-design-ownership-v2.json'].map(n=>pin(d+'/'+n));
const m=artifact('manifest-G1C15-proposal02.json',{kind:'H-author-G1C15-v2-ownership-publication-addendum',status:'PROPOSAL-ONLY',parentABI:base,ABI:abi,artifacts:arts,onlyOwnershipAndAcyclicPublicationAdded:true,otherV1SemanticsDeepEqual:true,consumerIds:original.consumerIds,productionProductsRemain:2,H3Contribution:0,actualAllNull:true,productionCodeGenerated:false,implementationAuthorized:false,RootWritten:false,H2OrH3Written:false,ctxCreated:false,SQLHTTPOrService:false,GitOrIssue:false,G1Frozen:false,actualG2:false,G3:false,G4:false});console.log(JSON.stringify({manifest:m,ABI:abi,reverseToV1DeepEqual:true,actualEffects:false}));
