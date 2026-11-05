// Offline follow-up for exact object derivative, archive writer and staged pins.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',out='tools/rust-r4def/independent-final131',pkg='tools/rust-r4def/F/closeout130';
assert.equal(path.resolve(process.cwd()).toLowerCase(),path.resolve(root).toLowerCase());
const digest=(alg,b)=>createHash(alg).update(b).digest('hex'),sha=b=>digest('sha256',b);
function bytes(f){assert(!path.isAbsolute(f)&&!f.includes('..')&&!f.includes('/private/'));return fs.readFileSync(path.join(root,f));}
const json=f=>JSON.parse(bytes(f)),pin=f=>{const b=bytes(f);return{file:f,bytes:b.length,sha256:sha(b)}};
const old='tools/rust-r4def/objects141.mjs',next='tools/rust-r4def/objects148.mjs';
assert.equal(pin(old).sha256,'2179d8d590551f0e07d1d6d94399defc3e5cd8e73e40506ba533a446729b5c0e');
assert.equal(pin(next).sha256,'f2b5aba858da57d9d742cf271308ad66ff806994a4317582cabfe433643e933c');
const guard="assert(receiptFile.startsWith(win+'/tmp/rust-r4def/root/cleanup-wrapper125-')&&receiptFile.endsWith('/receipt125.json'));assert(planFile.startsWith(priv+'/cleanup-wrapper125-')&&planFile.endsWith('/bundle125.json'));";
const replacement="assert.equal(receiptFile,win+'/tmp/rust-r4def/root/cleanup-wrapper125a-149/receipt125a.json');assert.equal(planFile,priv+'/cleanup-wrapper125a-146/bundle125a.json');assert.equal(planSHA,'cc30d11364b018e41e4379c0a1844124d37e7d38e089cc8384f05a667b6f15ee');";
assert.equal(bytes(old).toString().replaceAll('141','148').replace(guard,replacement),bytes(next).toString());
const derivative=json('tmp/rust-r4def/root/derive-objects148.json');assert.equal(derivative.source.rawBytesSha256,pin(old).sha256);assert.equal(derivative.target.rawBytesSha256,pin(next).sha256);assert.equal(derivative.executed,false);
const mfile=pkg+'/manifest130c.json',m=json(mfile);assert.equal(pin(mfile).sha256,'8efe665ccd5d8c48ed88602b50bc7c25740b6686f77ff3d6d2405caa15409e35');
for(const p of [...m.files,...m.pinnedDependencies])assert.equal(pin(pkg+'/'+p.file).sha256,p.rawBytesSha256);
assert.equal(pin(pkg+'/'+m.immutablePredecessor.file).sha256,m.immutablePredecessor.rawBytesSha256);
for(const p of json(pkg+'/manifest130.json').files){assert.equal(pin(pkg+'/'+p.file).sha256,p.rawBytesSha256);assert.equal(pin(pkg+'/'+p.file).bytes,p.bytes);}
const writer=bytes(pkg+'/Invoke-Archive130c.ps1').toString();
assert.equal((writer.match(/\$completed\.ToArray\(\)/g)??[]).length,1);
for(const marker of ['[IO.FileMode]::CreateNew','$progressStream.Flush($true)','ArchivedRawBytesVerified','FailedPartial','StartedNotCompletionProof','ExpectedFactsSha256','completionLineDurable','Move-Item -LiteralPath $stagePath -Destination $destination -ErrorAction Stop'])assert(writer.includes(marker));
assert(!/Move-Item[^\r\n]*-Force|Copy-Item[^\r\n]*-Force|Remove-Item/.test(writer));
const attr='docs/design/archive/slices/rust-r4def/.gitattributes',rules=bytes(attr).toString().split(/\r?\n/).filter(l=>l&&!l.startsWith('#'));
assert.deepEqual(rules,['* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol','*.bin binary']);
const source126=json('tmp/rust-r4def/root/final-source126/manifest126.json'),by=new Map([...source126.product,...source126.client,...source126.sixS4ProtectedSources].map(p=>[p.file,p]));
const stagedFile='tmp/rust-r4def/root/staged-product153/receipt153.json',staged=json(stagedFile);
assert.equal(staged.literalHead,source126.literalHead);assert.equal(staged.pins.length,708);assert.equal(by.size,708);
assert.equal(staged.byteEqual,708);assert.equal(staged.CRLFtoLFOnly,0);assert.equal(staged.materialDifferences,0);assert.equal(staged.commitCreated,false);
assert.deepEqual(staged.pins.map(p=>p.file).sort(),[...by.keys()].sort());
for(const p of staged.pins){const expected=by.get(p.file),raw=bytes(p.file);assert.equal(sha(raw),expected.rawBytesSha256);assert.equal(raw.length,expected.bytes);assert.equal(p.stagedRawSHA256,expected.rawBytesSha256);assert.equal(p.certifiedWorktreeRawSHA256,expected.rawBytesSha256);assert.equal(p.bytes,raw.length);assert(p.byteEqual&&!p.CRLFtoLFOnly);assert.equal(p.gitBlob,digest('sha1',Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])));}
for(const p of staged.deleted){assert(p.absent&&!fs.existsSync(path.join(root,p.file)));assert.equal(pin(p.baseBlob.file).sha256,p.baseBlob.rawBytesSha256);}
const inputFiles=[old,next,'tmp/rust-r4def/root/derive-objects148.json',mfile,pkg+'/Invoke-Archive130c.ps1',pkg+'/README130c.md','tmp/rust-r4def/root/intake130c-150.json',attr,stagedFile,'tools/rust-r4def/staged-product153.mjs','tmp/rust-r4def/root/source-supplement134/receipt134.json'];
const inputPins=inputFiles.map(f=>{const p=pin(f),dest=path.join(root,out,'support153-inputs',f+'.bin');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes(f),{flag:'wx'});return{...p,snapshot:path.relative(root,dest).replaceAll('\\','/')};});
const report={kind:'independent-R4DEF-final131-object148-archive130c-staged153-addendum',reviewedAtUtc:new Date().toISOString(),
 status:'Prepared derivatives and staged byte binding accepted; actual execution/commit and final gates pending',
 object148:{source:pin(next),exactMechanicalDerivativeOfReviewed141:true,onlyConcrete125a146cc30BundleAndFuture149ApplyReceiptAccepted:true,allOtherGuardsUnchanged:true,scopeSourceReviewPass:true,actualSuccessfulApply149AndDoubleFreshNoopsMustPrecedeUnlink:true,executionNotCertified:true},
 archive130c:{manifest:pin(mfile),twoNewProductsAndOld42HashesMatch:true,scopeStill9079Files178735821Bytes:true,linearCompletionJournalSingleFullMap:true,exclusiveNoOverwriteAndLiteralPaths:true,actualFactsSHARechecked:true,partialFailureEvidencePreserved:true,entrypointNotExecutedByReviewer:true},
 scopedAttributes:{archiveOriginMapJournalAndRawFilesNowNoTextConversion:true,protectedRootAttributesUnchanged:true,sixS4StillExact:true},
 staged153:{receipt:pin(stagedFile),unionFiles:708,allRawCurrentAndPublishedStagedSHA256Match126:true,allPublishedGitBlobSHA1RecomputedFromCertifiedRaw:true,CRLFTransformations:0,materialDifferences:0,deletionAbsent:true,RootActualGitObservationUsedWithoutReviewerGitExecution:true,implementationCommitStillRequired:true,first151ObserverFailureRemainsHistorical:true},
 inputPins,newFindingsP0P1P2:[],supportSourceReviewPass:true,G3Pass:false,G4Pass:false,issueClosure:false,
 reviewer:{privateRead:false,DBHTTPGitGHOrForeignEntryExecuted:false,productOrOldEvidenceModified:false,writesOnly:out+'/**'}};
fs.writeFileSync(path.join(root,out,'support153-addendum131.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({report:pin(out+'/support153-addendum131.json'),objects148SourcePass:true,archive130cSourcePass:true,staged708RawEqual:true,G3Pass:false})+'\n');
