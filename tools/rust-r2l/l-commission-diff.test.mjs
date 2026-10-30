// Pure, explicitly synthetic in-memory counterexamples based on saved public
// natural114 runs. Their honest baseline is strict Fail/308, never a Pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash,randomUUID } from 'node:crypto';
import { compareCommissionReports, verifyCommissionRustBuildBinding } from './l-commission-diff.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const find=name=>{const file=['tmp/rust-r2l/'+name,'tmp/rust-r2l/commission-diff-inputs01/'+name].find(fs.existsSync);assert(file,'Required saved public actual input missing: '+name);return JSON.parse(fs.readFileSync(file));};
const native=find('native-commission-nest-commnative01.json'),rust=find('commission-http-rust-commrust01.json'),nativeEvidence=find('commission-diff-evidence-nest01.json'),rustEvidence=find('commission-diff-evidence-rust01.json');
const baseline=compareCommissionReports(native,rust,nativeEvidence,rustEvidence),baselinePaths=new Set(baseline.differences.map(x=>x.path));
const q=(r,name)=>{const result=r.requests.find(x=>x.name===name);assert(result,name);return result;};
function negative(mutate,predicate) {
    const r=structuredClone(rust),a=structuredClone(rustEvidence); mutate(r,a);
    // Rebind only the synthetic in-memory envelope, so the intended semantic
    // check runs. This is neither a replacement saved report nor a certificate.
    a.actualReport.canonicalSha256=sha(JSON.stringify(r));
    const result=compareCommissionReports(native,r,nativeEvidence,a); assert.equal(result.result,'fail');
    const newDifferences=result.differences.filter(x=>!baselinePaths.has(x.path));
    assert(predicate(result,newDifferences),JSON.stringify({failures:result.failures.slice(0,5),gaps:result.gaps.slice(0,3),newDifferences:newDifferences.slice(0,5)}));
}
test('natural114 retains all308 raw differences and honest other39/DTO bounded result',()=>{
    assert.equal(baseline.result,'fail'); assert.equal(baseline.failures.length,0); assert.equal(baseline.gaps.length,0); assert.equal(baseline.differences.length,308); assert(baseline.checks>300000);
    assert.equal(baseline.coverage.pairedRecords,114); assert.equal(baseline.coverage.allOwnedTables.length,40); assert.equal(baseline.coverage.unobserved67TablesCertified,false); assert.equal(baseline.naturalAdminTimingAnalysis.nonAdminRawAndAllResponseFieldsEqual,true);
    assert.equal(baseline.naturalAdminTimingAnalysis.nest.naturalTouches.length,2); assert.equal(baseline.naturalAdminTimingAnalysis.rust.naturalTouches.length,1);
});
test('amount value/type differences cannot be rounded or stripped',()=>negative(r=>{q(r,'lookup.contract').after.contract[0].signed_amount=0.01;},(_,d)=>d.some(x=>x.path.includes('signed_amount'))));
test('owned row_version differences remain strict',()=>negative(r=>{q(r,'contract.reject').after.approval_record[0].row_version++;},(_,d)=>d.some(x=>x.path.includes('row_version'))));
test('business status differences remain strict',()=>negative(r=>{q(r,'contract.reject').after.contract[0].status='fabricated';},(_,d)=>d.some(x=>x.path.includes('.status'))));
test('missing DTO field is detected',()=>negative(r=>{delete q(r,'contract.reject.pending.detail').response.body.currentNodeName;},(_,d)=>d.some(x=>x.path.endsWith('currentNodeName'))));
test('extra DTO field is detected',()=>negative(r=>{q(r,'contract.reject.pending.detail').response.body.invented=true;},(_,d)=>d.some(x=>x.path.endsWith('invented'))));
test('known UUID in the wrong target slot still differs',()=>negative(r=>{q(r,'contract.reject.pending.detail').response.body.targetObjectId=r.preparedSource.preparedDescriptor.projectId;},(_,d)=>d.some(x=>x.path.endsWith('targetObjectId'))));
test('unknown extra row fails typed ownership and cardinality',()=>negative(r=>{const record=q(r,'contract.reject').after.approval_record,extra=structuredClone(record[0]);extra.id=randomUUID();record.push(extra);},r=>r.failures.some(x=>x.reason.includes('owned/source identity'))));
test('unchanged/default raw field omission fails complete column set',()=>negative(r=>{delete q(r,'lookup.contract').before.contract[0].currency_code;},r=>r.failures.some(x=>x.reason.includes('columns missing or extra'))));
test('source clock outside exact send/receive bounds fails',()=>negative(r=>{q(r,'contract.reject').after.approval_record[0].decided_at='2099-01-01T08:00:00+08:00';},r=>r.failures.some(x=>x.reason.includes('clock outside exact'))));
test('equivalent instant with changed DB timezone spelling fails',()=>negative(r=>{const row=q(r,'contract.reject').after.approval_record[0];row.closed_at=new Date(row.closed_at).toISOString();},r=>r.failures.some(x=>x.reason.includes('timezone representation'))));
test('DTO date must exactly equal the actual DB ISO projection',()=>negative(r=>{const dto=q(r,'contract.reject.closed-detail').response.body;dto.updatedAt=new Date(new Date(dto.updatedAt).getTime()+1).toISOString();},r=>r.failures.some(x=>x.reason.includes('exact actual DB projection'))));
test('changing one logical session nonce is not hidden',()=>negative(r=>{q(r,'lookup.contract').after.auth_session[0].token_hash.sha256='0'.repeat(64);},r=>r.failures.some(x=>x.reason.includes('Opaque material changed')||x.reason.includes('stored-hash/logical session'))));
test('session user is bound to the real cookie and immutable owner',()=>negative(r=>{q(r,'lookup.contract').after.auth_session[0].user_id=r.base.actors.admin;},r=>r.failures.some(x=>x.reason.includes('immutable business identity')||x.reason.includes('stored-hash/logical session'))));
test('distinct CSRF issuances cannot reuse one nonce fingerprint',()=>negative(r=>{q(r,'finance.csrf').response.body.token.sha256=q(r,'initiator.csrf').response.body.token.sha256;},r=>r.failures.some(x=>x.reason.includes('nonce roles reused'))));
test('URL query remains a deep compared field',()=>negative(r=>{q(r,'lookup.contract').path+='&extra=1';},(_,d)=>d.some(x=>x.path.endsWith('.path'))));
test('raw HTML error body text remains a deep compared field',()=>negative(r=>{q(r,'lookup.old-contract').response.body+='changed';},(_,d)=>d.some(x=>x.path.endsWith('.response.body'))));
test('snapshot version remains strict',()=>negative(r=>{q(r,'retention.approve').after.commission_final_settlement_snapshot[0].version++;},(_,d)=>d.some(x=>x.path.endsWith('.version'))));
test('snapshot known parent UUID cannot be swapped',()=>negative(r=>{const s=q(r,'retention.approve').after,child=s.commission_rule_explanation_snapshot.at(-1);child.final_settlement_snapshot_id=s.commission_final_settlement_snapshot.find(x=>x.id!==child.final_settlement_snapshot_id).id;},(_,d)=>d.some(x=>x.path.includes('final_settlement_snapshot_id'))));
test('nested JSON fields are retained',()=>negative(r=>{q(r,'producer.rule-create').after.commission_rule_version[0].tier_definition_json.invented='changed';},(_,d)=>d.some(x=>x.path.endsWith('invented'))));
test('PG outer/sub-transaction committed proof is mandatory',()=>negative((_,a)=>{a.committedCreates.find(x=>x.proof.kind==='pg-after-insert-observed-outer-commit').proof.eventXminStatus='aborted';},r=>r.failures.some(x=>x.reason.includes('PG outer/sub-xid proof'))));
test('actual SDK creation context must match its exact source request',()=>negative((_,a)=>{a.committedCreates.find(x=>x.proof.kind==='mikro-orm-afterCreate-outer-commit').proof.createContext.caseId='other';},r=>r.failures.some(x=>x.reason.includes('context and actual before-intent')||x.reason.includes('original final trace'))));
test('readonly definitions cannot mutate or become owned',()=>negative((_,a)=>{a.readonlyDefinitions[0].afterFullRowSha256='0'.repeat(64);},r=>r.failures.some(x=>x.reason.includes('Readonly canonical definitions'))));
test('unclassified DTO dates are reported as a gap, never stripped',()=>negative(r=>{q(r,'read.rule-view').response.body.unclassifiedAt=r.requests.at(-1).httpFinishedAt;},r=>r.gaps.some(x=>x.reason.includes('Unclassified DTO timestamp'))));
test('an edge/prefix run cannot claim full114 coverage',()=>negative(r=>{r.default114Only=false;r.phaseHooks=[{name:'afterMatrix'}];},r=>r.failures.some(x=>x.reason.includes('edge/prefix'))));
test('a saved direct mutation outside the exact source site remains uncovered',()=>negative((_,a)=>{a.mutations.push({...structuredClone(a.mutations[0]),transaction:'9999999'});},r=>r.failures.some(x=>x.reason.includes('direct mutation was not classified'))));
test('unknown auth input policy is rejected before any waiver',()=>negative(r=>{r.authFreshnessPolicy='auto';},r=>r.failures.some(x=>x.reason.includes('Unknown source input policy'))));
function controlledSavedDue(r,a) {
    const request=q(r,'contract.reject'),binding=a.sessionBindings.find(x=>x.caseId==='vp.login'),before=request.before.auth_session.find(x=>x.id===binding.id);
    const mutation=a.mutations.find(x=>x.id===binding.id && new Date(x.values.last_seen_at).getTime()===new Date(before.last_seen_at).getTime()); assert(mutation);
    const entry={policy:'fresh-except-named-due',requestName:request.name,sessionId:binding.id,userId:binding.userId,action:'preserve-next-named-due-input',prepared:false,lastSeenInput:before.last_seen_at,mutationTransaction:mutation.transaction,expectedXmin:mutation.expectedXmin,handlerOrClockChanged:false};
    r.authFreshnessPolicy=entry.policy; request.authInputPreparation=entry; r.authInputPreparations=[entry];
    return {request,binding,before,mutation,entry};
}
test('controlled policy cannot be retroactively assigned to an unprepared natural114',()=>negative(r=>{r.authFreshnessPolicy='fresh-except-named-due';r.authInputPreparations=[];},r=>r.failures.some(x=>x.reason.includes('108 distinct authenticated'))));
test('saved actual named-due proof validates its own input slot; incomplete synthetic controlled envelope stays Fail',()=>negative(controlledSavedDue,r=>!r.failures.some(x=>x.path==='rust.contract.reject.authInput') && r.failures.some(x=>x.reason.includes('108 distinct authenticated'))));
test('controlled input must name the real selected cookie session actor',()=>negative((r,a)=>{controlledSavedDue(r,a).entry.userId=r.base.actors.admin;},r=>r.failures.some(x=>x.path==='rust.contract.reject.authInput' && x.reason.includes('source-selected session/case'))));
test('named due cannot silently turn into a fresh input',()=>negative((r,a)=>{const {entry}=controlledSavedDue(r,a);entry.action='prepared-owned-last-seen-fresh';entry.prepared=true;},r=>r.failures.some(x=>x.path==='rust.contract.reject.authInput' && x.reason.includes('overwritten'))));
test('controlled preparation without exact committed transaction is rejected',()=>negative((r,a)=>{controlledSavedDue(r,a).entry.mutationTransaction='99999999';},r=>r.failures.some(x=>x.path==='rust.contract.reject.authInput' && x.reason.includes('mutation/xmin missing'))));
test('unknown COMMIT outcome cannot certify a prepared input',()=>negative((r,a)=>{controlledSavedDue(r,a).mutation.state='outcome-unknown';},r=>r.failures.some(x=>x.path==='rust.contract.reject.authInput' && x.reason.includes('mutation/xmin missing'))));
test('prepared input cannot co-mutate row_version or any other field',()=>negative((r,a)=>{controlledSavedDue(r,a).mutation.after.row_version++;},r=>r.failures.some(x=>x.path==='rust.contract.reject.authInput' && x.reason.includes('changed another field/version'))));
test('prepared Date input still obeys exact source time window',()=>negative((r,a)=>{controlledSavedDue(r,a).mutation.values.last_seen_at='2099-01-01T00:00:00.000Z';},r=>r.failures.some(x=>x.path==='rust.contract.reject.authInput' && x.reason.includes('outside the exact between-HTTP'))));
test('global incomplete SDK witness is rejected even with all individual proofs present',()=>negative(r=>{r.nativeFinal.witness.complete=false;r.nativeFinal.witness.diagnostics.push({kind:'synthetic-incomplete'});r.nativeFinal.pgCaptureComplete=false;},r=>r.failures.some(x=>x.path==='rust.globalWitness')));
test('pending/open outer transactions reject the global witness',()=>negative(r=>{r.nativeFinal.witness.pendingStartCount=1;r.nativeFinal.witness.openTransactions.push({id:'synthetic'});},r=>r.failures.some(x=>x.path==='rust.globalWitness')));
test('an empty closeout list cannot satisfy every(pass)',()=>negative(r=>{r.resourceCloseout=[];},r=>r.failures.some(x=>x.path==='rust.closeoutNames')));
test('a missing applicable closeout is rejected',()=>negative(r=>{r.resourceCloseout=r.resourceCloseout.filter(x=>x.name!=='rust-owner-close');},r=>r.failures.some(x=>x.path==='rust.closeoutNames')));
test('duplicate successful closeout cannot replace an independent close',()=>negative(r=>{r.resourceCloseout.push({...r.resourceCloseout[0]});},r=>r.failures.some(x=>x.path==='rust.closeoutNames')));
test('an unknown certificate authority UUID is rejected',()=>negative((_,a)=>{a.committedCreates[0].authorityId=randomUUID();},r=>r.failures.some(x=>x.path.startsWith('rust.certificateAuthority.'))));
test('a mismatched source hash in the saved registry is rejected',()=>negative((_,a)=>{a.authorities[0].source.sha256='0'.repeat(64);},r=>r.failures.some(x=>x.path.startsWith('rust.authorityRegistry.'))));
test('a PG certificate cannot bind a different actual observer registration',()=>negative(r=>{r.pgObserverRegistration.functionOid='9999999';},r=>r.failures.some(x=>x.path==='rust.authorityRegistry.pg'||x.path.endsWith('.pgAuthority'))));
test('an SDK creation at the wrong HTTP index is rejected',()=>negative((_,a)=>{a.committedCreates[0].proof.createContext.index++;},r=>r.failures.some(x=>x.path.startsWith('rust.context.'))));
test('an SDK outer commit context cannot migrate to another HTTP case',()=>negative((_,a)=>{a.committedCreates[0].proof.commitContext.caseId='other';},r=>r.failures.some(x=>x.path.startsWith('rust.sdkAuthority.'))));

// The exact public candidate08 receipt/source files are test data, never a
// synthetic binary or new runtime. No ELF/private environment is read here.
const candidate08File=['tmp/rust-r2l/rust-candidate08-binary-source.json','tmp/rust-r2l/todo08-binary-source-reference.json'].find(fs.existsSync);
assert(candidate08File,'Exact saved public candidate08 source receipt is required');
const candidate08Bytes=fs.readFileSync(candidate08File),candidate08=JSON.parse(candidate08Bytes);
function pin08(){return{rustRuntime:{stopped:true,binaryUnchanged:true,binary:candidate08.binary.file,binaryBytes:candidate08.binary.bytes,binaryRawBytesSha256:candidate08.binary.rawBytesSha256},buildBinding:{file:'tmp/rust-r2l/rust-candidate08-binary-source.json',rawBytesSha256:sha(candidate08Bytes),expectedBinarySha256:candidate08.binary.rawBytesSha256,sourceFiles:169},runtimeInput:{files:[{target:'artifacts/poms-api-rust',bytes:candidate08.binary.bytes,rawBytesSha256:candidate08.binary.rawBytesSha256},{target:'artifacts/rust-build-source-binding.json',source:'tmp/rust-r2l/rust-candidate08-binary-source.json',snapshot:'synthetic/binding08',bytes:candidate08Bytes.length,rawBytesSha256:sha(candidate08Bytes)},...candidate08.files.map(row=>({...row,source:row.file,snapshot:'synthetic/public-source/'+row.file}))]}};}
const read08=file=>{if(file==='synthetic/binding08')return candidate08Bytes;assert(file.startsWith('synthetic/public-source/'),'Tests must never read an ELF/private file');return fs.readFileSync(file.slice('synthetic/public-source/'.length));};
test('candidate08 exact metadata and169 source archives are admitted without any ELF/private read',()=>{const r=verifyCommissionRustBuildBinding(pin08(),read08);assert.equal(r.epoch,'candidate08');assert.equal(r.sourceArchivesVerified,169);assert.equal(r.ELFReadByComparer,false);});
test('old5b9 admission stays supported and never reads archives',()=>{assert.equal(verifyCommissionRustBuildBinding(rust,()=>assert.fail('Legacy admission gained new archive reads')).epoch,'legacy-final5b9e');});
test('unknown Rust binary cannot become an accepted new epoch',()=>{const r=pin08();r.rustRuntime.binaryRawBytesSha256='0'.repeat(64);r.runtimeInput.files[0].rawBytesSha256='0'.repeat(64);assert.throws(()=>verifyCommissionRustBuildBinding(r,read08),/Unknown actual Rust binary/);});
test('candidate08 main cannot bind an old candidate07 receipt name',()=>{const r=pin08();r.buildBinding.file='tmp/rust-r2l/rust-candidate07-binary-source.json';assert.throws(()=>verifyCommissionRustBuildBinding(r,read08),/epoch differs/);});
test('old5b9 cannot be relabeled as candidate08',()=>{const r=structuredClone(rust);r.buildBinding.file='tmp/rust-r2l/rust-candidate08-binary-source.json';assert.throws(()=>verifyCommissionRustBuildBinding(r,read08),/Old5b9e cannot/);});
test('candidate08 captured source archive byte mismatch is rejected',()=>{assert.throws(()=>verifyCommissionRustBuildBinding(pin08(),file=>file.endsWith('/src/approval_common/store.rs')?Buffer.concat([read08(file),Buffer.from('\n')]):read08(file)));});
test('candidate08 metadata cannot be re-encoded even with equivalent JSON fields',()=>{assert.throws(()=>verifyCommissionRustBuildBinding(pin08(),file=>file==='synthetic/binding08'?Buffer.from(JSON.stringify(candidate08)):read08(file)));});
test('candidate08 source archive manifest mismatch is rejected',()=>{const r=pin08();r.runtimeInput.files.find(x=>x.source==='apps/poms-api-rust/src/approval_common/store.rs').rawBytesSha256='0'.repeat(64);assert.throws(()=>verifyCommissionRustBuildBinding(r,read08));});
test('candidate08 missing or duplicated source cannot masquerade as169',()=>{for(const change of [r=>r.runtimeInput.files.pop(),r=>r.runtimeInput.files.push({...r.runtimeInput.files.at(-1)})]){const r=pin08();change(r);assert.throws(()=>verifyCommissionRustBuildBinding(r,read08));}});
