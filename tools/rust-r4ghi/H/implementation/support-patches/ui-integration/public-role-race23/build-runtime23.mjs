// FS-only exact proposals. No Root/helper mutation or business execution.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url)),root='E:/projects/worktrees/poms-r3hijk-next28/poms',sha=x=>createHash('sha256').update(x).digest('hex'),products=[];
function source(file,expected){const bytes=fs.readFileSync(root+'/'+file);assert.equal(sha(bytes),expected);return bytes.toString('utf8');}
function save(file,beforeSHA256,after){const candidate=`proposed/${file}`;fs.mkdirSync(path.dirname(out+'/'+candidate),{recursive:true});fs.writeFileSync(out+'/'+candidate,after,{flag:'wx'});products.push({file,beforeSHA256,afterSHA256:sha(Buffer.from(after)),candidate});}
const linuxFile='tools/rust-r4ghi/business/ui-role18-linux.mjs',linuxBefore='1b5ec1365ae552e60ba6879718e65d050ad4326fb7765e1672e2271e81cf847f';let linux=source(linuxFile,linuxBefore);
function change(from,to){assert.equal(linux.split(from).length,2,'Exact Role Linux replacement missing');linux=linux.replace(from,to);}
change('const actualCases = [], receipts = [], report =','let successfulUICreate23 = null;\n  const actualCases = [], receipts = [], report =');
change('return { ...operation, before, requestLabel, requestId, actorKey: test.actorKey, actorId: actor.id, method: request.method, intent, requestValue, requestBodySHA256:sha(request.body), writeAdmission };',`let publicRoleRace23 = null;
      if(operation.operationId==='CommissionRoleAssignmentController_freezeRoleAssignment'&&activePolicy?.action.publicRevisedDraftRace){
        assert(successfulUICreate23,'The peer revision must use this actual successful UI create');
        assert(plan.sourceBases.some(pin=>pin.file==='tools/rust-r4ghi/business/ui-role-public-race23.mjs'));
        const {beginPublicRoleRace23}=await import(pathToFileURL(fixed.linuxRoot+'/tools/rust-r4ghi/business/ui-role-public-race23.mjs').href);
        publicRoleRace23=await beginPublicRoleRace23(ctx,api,{scene:activePolicy.scene,action:activePolicy.action,before,freezeInput:requestValue,requestId,successfulCreate:successfulUICreate23,boundActorKeys:report.actualSourceBinding.actorKeys});
      }
      return { ...operation, before, requestLabel, requestId, actorKey: test.actorKey, actorId: actor.id, method: request.method, intent, requestValue, requestBodySHA256:sha(request.body), writeAdmission, publicRoleRace23 };`);
change('const afterResponse = async ({ observation, upstream, bytes, failure }) => {','const afterResponse = async ({ observation, upstream, bytes, failure }) => {\n      if(observation.publicRoleRace23) await observation.publicRoleRace23.settleBeforeCapture();');
change('if(activePolicy.completed()) recordActualUIReceipt(',`if(observation.operationId==='CommissionController_createRoleAssignment') successfulUICreate23={attempt,originals,ledger};
        if(observation.publicRoleRace23) await observation.publicRoleRace23.verifyAfterLedger({attempt,originals,ledger,after});
        if(activePolicy.completed()) recordActualUIReceipt(`);
save(linuxFile,linuxBefore,linux);
const actorFile='tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/binding-input16.mjs',actorBefore='bdf57ae0bb486f3745b45b46fd994f4bc1ce2115afbf15951c2916bf559d9278';let actors=source(actorFile,actorBefore);
const location='  let additional = [];';assert.equal(actors.split(location).length,2);
actors=actors.replace(location,`  const observerActors = plan.writeActions.flatMap(item => {
    if (!Object.hasOwn(item, 'publicRevisedDraftRace')) return [];
    assert.equal(item.kind, 'role-forms'); exactKeys(item.publicRevisedDraftRace, ['actorKey', 'expectedVerdict']);
    assert.equal(item.publicRevisedDraftRace.expectedVerdict, 'freeze200-peer-revised409');
    assert.notEqual(item.publicRevisedDraftRace.actorKey, item.actorKey);
    return [item.publicRevisedDraftRace.actorKey];
  });
${location}`);
assert(actors.includes('...participants, ...additional'));actors=actors.replace('...participants, ...additional','...participants, ...observerActors, ...additional');save(actorFile,actorBefore,actors);
const helper='tools/rust-r4ghi/business/ui-role-public-race23.mjs';products.push({file:helper,beforeSHA256:null,afterSHA256:sha(fs.readFileSync(out+'/proposed/'+helper)),candidate:'proposed/'+helper});
fs.writeFileSync(out+'/runtime-products23.json',JSON.stringify(products,null,2)+'\n',{flag:'wx'});
// Import the actual complete proposed helper in a filesystem-only check graph.
const seen=new Set(),pending=[helper],graph=[];while(pending.length){const file=pending.pop();if(seen.has(file))continue;seen.add(file);assert(file.startsWith('tools/'));const candidate=out+'/proposed/'+file,bytes=fs.readFileSync(fs.existsSync(candidate)?candidate:root+'/'+file),target=out+'/checks/'+file;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});graph.push({file,rawBytesSha256:sha(bytes)});if(file.endsWith('.mjs'))for(const match of bytes.toString('utf8').matchAll(/(?:from\s*|import\s*\(|new\s+URL\s*\()\s*['"](\.{1,2}\/[^'"\r\n]+\.(?:mjs|json))['"]/g))pending.push(path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1])));}
fs.writeFileSync(out+'/check-graph23.json',JSON.stringify(graph,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({products,actualCheckGraphFiles:graph.length}));
