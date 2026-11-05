// Read-only proposed closeout payload review. This is NOT execution permission.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',out='tools/rust-r4def/independent-final131',dir='tools/rust-r4def/closeout/payload183',author='tools/rust-r4def/E/closeout177';
assert.equal(path.resolve(process.cwd()).toLowerCase(),path.resolve(root).toLowerCase());
const sha=b=>createHash('sha256').update(b).digest('hex');
function bytes(f){assert(!path.isAbsolute(f)&&!f.includes('..')&&!f.includes('/private/'));return fs.readFileSync(path.join(root,f));}
const json=f=>JSON.parse(bytes(f)),pin=f=>{const b=bytes(f);return{file:f,bytes:b.length,sha256:sha(b)}};
const planFile=dir+'/plan183.json',plan=json(planFile);assert.equal(pin(planFile).sha256,'fdbdad61540547b1ecf5ac595f1695ce22c6a3938069d3f2bf8f043f3d3960e9');assert(!plan.approvalGranted&&!plan.remoteMutation&&plan.officialCountsNotCertifiedByThisPayload);
assert.deepEqual(plan.closeOrder,[107,108,109,106]);assert.deepEqual(plan.mustRemainOpen,[101,57]);assert.deepEqual(plan.requiredEdges,[[106,101],[107,106],[108,106],[109,106],[101,57]]);
const manifest=json(author+'/manifest177.json');for(const p of manifest.products){assert.equal(pin(author+'/'+p.file).sha256,p.rawBytesSha256);assert.equal(pin(author+'/'+p.file).bytes,p.bytes);}
const childChecks=[];const variableParagraph=p=>p.startsWith('状态：')||p.startsWith('待Root填实的G4载体：')||p.startsWith('G4就绪载体：')||p.startsWith('正式口径受G4约束：')||p.startsWith('本批收口后，正式交付镜像将更新');
const oldCheckbox='- [ ] 生命周期原字节归档、Ready/main、独立preclose许可及六Issue实际线上读回。',newCheckbox='- [x] 生命周期原字节归档与Ready/main；独立关闭许可在执行前核实，实际线上读回由关闭事务后确认。';
const orderingLine='- [ ] Final docs/main、独立actual G4终审与Seal；其后才更新正式交付口径。';
for(const n of [106,107,108,109]){
 const body=bytes(plan.bodies[n].file).toString(),original=bytes(author+'/body'+n+'.md').toString();assert.equal(sha(Buffer.from(body)),plan.bodies[n].rawBytesSha256);assert(!/\{\{[^}]+\}\}/.test(body));
 const normalized=s=>s.split(/\r?\n\r?\n/).filter(p=>!variableParagraph(p)).join('\n\n').replace(oldCheckbox,newCheckbox);
 assert.equal(normalized(body),normalized(original),'business-or-fixed-G1-link-drift:'+n);
 assert(body.includes(orderingLine));assert(!body.includes(orderingLine.replace('- [ ]','- [x]')));assert(body.includes('本正文不提前认证末次G4结果'));
 assert(body.includes('5fc5301a86a2cdc0709fb43ed824da797056bfaa3910844424b4e378a9c67094'));assert(body.includes('e5f13b05a47766a4c6a3aa13b7fc7a39799b3e76'));
 childChecks.push({issue:n,body:pin(plan.bodies[n].file),businessParagraphsAndImmutableG1LinksPreserved:true,actualG4FinalSealCheckboxRemainsUnchecked:true});
}
const parentChecks=[];
for(const n of [101,57]){
 const before=json('tmp/rust-r4def/root/github-g3-174/'+n+'-after.json');assert.equal(before.state,'OPEN');assert.equal(sha(Buffer.from(before.body)),plan.before[n].bodySHA256);assert.equal(plan.bodies[n].originalParentPrefixSHA256,plan.before[n].bodySHA256);
 const body=bytes(plan.bodies[n].file),prefix=Buffer.from(before.body);assert(body.subarray(0,prefix.length).equals(prefix));assert.equal(sha(body),plan.bodies[n].rawBytesSha256);const added=body.subarray(prefix.length).toString();assert(added.includes('<!-- poms-r4def-g4-current-batch -->')&&added.includes('<!-- /poms-r4def-g4-current-batch -->'));assert(added.includes('保持OPEN')&&added.includes('原未完成清单全部保留'));
 if(n===57){assert(/- \[ \] 既有R2补缺：[^\n]*initialRoleIds[^\n]*500/.test(added));}
 parentChecks.push({issue:n,body:pin(plan.bodies[n].file),originalPrefixBytes:prefix.length,originalPrefixSHA256:sha(prefix),prefixByteExact:true,onlyAppendedManagedBlock:true,originalIncompleteChecklistUntouched:true,R2UncheckedFollowupPreserved:n===57});
}
assert.equal(pin(plan.comment.file).sha256,plan.comment.rawBytesSha256);const comment=bytes(plan.comment.file).toString();assert(!/\{\{[^}]+\}\}/.test(comment));assert(comment.includes('末次独立G4/Seal继续封存')&&comment.includes('#101/#57保持OPEN'));
for(const n of [106,107,108,109,101,57]){const before=json('tmp/rust-r4def/root/github-g3-174/'+n+'-after.json');assert.equal(plan.before[n].state,'OPEN');assert.equal(plan.before[n].bodySHA256,sha(Buffer.from(before.body)));}
const inputFiles=[planFile,...Object.values(plan.bodies).map(p=>p.file),plan.comment.file,author+'/manifest177.json',author+'/plan177.json',... [106,107,108,109].map(n=>author+'/body'+n+'.md'),... [101,57].map(n=>'tmp/rust-r4def/root/github-g3-174/'+n+'-after.json'),'tools/rust-r4def/preclose-payload183.mjs'];
const inputPins=inputFiles.map(f=>{const p=pin(f),dest=path.join(root,out,'payload183-inputs',f+'.bin');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes(f),{flag:'wx'});return{...p,snapshot:path.relative(root,dest).replaceAll('\\','/')};});
const report={kind:'independent-R4DEF-concrete-payload183-preparation-review131',reviewedAtUtc:new Date().toISOString(),status:'Scoped payload reviewed; one sequence wording correction and actual metadata-main proof still required before permission',plan:pin(planFile),childChecks,parentChecks,closeOrder:[107,108,109,106],mustRemainOpen:[101,57],sixBeforeBodyHashesMatch174:true,noPlaceholders:true,commonCommentDoesNotClaimActualG4Pass:true,explicitProofBeforeFinalCheckboxRequired:true,
 precloseBlockingFindings:[{id:'PAYLOAD183-P2-01',priority:'P2',classification:'new-real-drift',scope:'proposed process wording only; G3/product remains certified',finding:'The unchecked final line says official accounting updates only after Final+actualG4+Seal, while the approved workflow mirrors online closure in Final before actualG4/Seal.',line:orderingLine,required:'Create a separately sealed payload with only this clause corrected: Final mirrors actual online delivery; actualG4/Seal completion authorizes checking the final item. Preserve183.'}],
 actualMetadataPublicationNotYetReviewed:true,precloseAuthorized:false,issueClosureAuthorized:false,G3Pass:true,G4Pass:false,inputPins,reviewer:{privateRead:false,DBHTTPGitGHOrForeignEntryExecuted:false,productOrOldEvidenceModified:false,writesOnly:out+'/**'}};
fs.writeFileSync(path.join(root,out,'payload183-preparation131.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});process.stdout.write(JSON.stringify({report:pin(out+'/payload183-preparation131.json'),fourBusinessAndG1BlocksPreserved:true,parentPrefixesExact:true,oneProcessWordingFinding:true,precloseAuthorized:false,G4Pass:false})+'\n');
