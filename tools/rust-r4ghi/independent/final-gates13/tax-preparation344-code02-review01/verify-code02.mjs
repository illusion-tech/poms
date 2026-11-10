import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Independent FS-only verification. It imports no product/helper code and
// performs no SQL, HTTP, context construction, process inspection or Git action.
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const h = 'E:/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/support-patches';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const map = p => p.startsWith('/mnt/e/') ? `E:/${p.slice(7)}`
  : p.startsWith('/home/') ? `//wsl.localhost/Debian${p}` : p;
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const observed = [];
async function read(pin, label) {
  const file = map(pin.file);
  const st = await fs.lstat(file);
  assert(st.isFile() && !st.isSymbolicLink(), `${label}: not regular`);
  const b = await fs.readFile(file);
  assert.equal(sha(b), pin.rawBytesSha256, `${label}: SHA`);
  if (pin.bytes !== undefined) assert.equal(b.length, pin.bytes, `${label}: bytes`);
  observed.push({file:pin.file,bytes:b.length,rawBytesSha256:sha(b),nlink:st.nlink,label});
  return b;
}
const manifestPin = {file:`${h}/tax-preparation344-code02/manifest344-code02.json`,bytes:18818,
  rawBytesSha256:'ff0521e144ab1eb9aa95da0c7ff8f97d7b7cbd76f94082457bf628fd54d5888f'};
const m = JSON.parse(await read(manifestPin,'code02 manifest'));
const pins = [...m.artifacts,m.parentCode01,m.formalFreeze,m.readsetAudit,m.independentReadsetReview];
const results = await Promise.allSettled(pins.map((p,i)=>read(p,`artifact-${i}`)));
const failures = results.flatMap((r,i)=>r.status==='rejected'?[{i,error:String(r.reason)}]:[]);
assert.deepEqual(failures,[],'every artifact pin must verify');
const checks = JSON.parse(await read(m.checks,'final checks'));
const ci = JSON.parse(await read(m.compileInputs,'final input inventory'));
const basePin = {file:'/home/wangzishi/.local/share/poms-r4ghi/private/combined-build312/compileInputs528.json',
  bytes:83968,rawBytesSha256:'b793c7b37e638346373e78dfa42ff910a0f8dea4886ef1540ac5afadf2d6dc76'};
const base = JSON.parse(await read(basePin,'fixed actual312 compile baseline'));
const parent = JSON.parse(await read(m.parentCode01,'preserved code01'));
const readset = JSON.parse(await read(m.readsetAudit,'supported public writer readset'));
const readsetResults = await Promise.allSettled(readset.sourcePins.map((p,i)=>read(p,`unchanged readset-${i}`)));
assert(readsetResults.every(r=>r.status==='fulfilled'),'readset dependencies / Root before changed');

function lf(text) { return text.replace(/\r\n/g,'\n'); }
function applyDiff(source, patch) {
  const input=lf(source).split('\n'), lines=lf(patch).split('\n'), output=[];
  let cur=0, i=2, hunks=0;
  while(i<lines.length) {
    if(lines[i]==='') { i++; continue; }
    const match=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(lines[i]);
    assert(match,`unexpected patch line ${i+1}`);
    const oldStart=+match[1]-1, oldCount=match[2]===undefined?1:+match[2];
    const newStart=+match[3]-1, newCount=match[4]===undefined?1:+match[4];
    assert(oldStart>=cur,'overlap');
    output.push(...input.slice(cur,oldStart)); cur=oldStart;
    assert.equal(output.length,newStart,'target hunk offset');
    i++; let removed=0, added=0;
    while(i<lines.length && !lines[i].startsWith('@@ ')) {
      const line=lines[i];
      if(line==='' && i===lines.length-1) { i++; break; }
      assert([' ','+','-'].includes(line[0]),'invalid hunk body');
      if(line[0]!=='+' ) { assert.equal(input[cur],line.slice(1),'full source hunk context'); cur++; removed++; }
      if(line[0]!=='-' ) { output.push(line.slice(1)); added++; }
      i++;
    }
    assert.equal(removed,oldCount,'old hunk count');
    assert.equal(added,newCount,'new hunk count'); hunks++;
  }
  output.push(...input.slice(cur)); return {text:output.join('\n'),hunks};
}
function invert(patch) {
  return lf(patch).split('\n').map((line,i)=>{
    if(i<2) return i===0?'--- after':'+++ before';
    const m=/^@@ -(\d+(?:,\d+)?) \+(\d+(?:,\d+)?) @@(.*)$/.exec(line);
    if(m) return `@@ -${m[2]} +${m[1]} @@${m[3]}`;
    return line[0]==='+'?'-'+line.slice(1):line[0]==='-'?'+'+line.slice(1):line;
  }).join('\n');
}
const productProofs=[];
for(const p of m.products) {
  const before=await read(p.before,`${p.file} before`), after=await read(p.candidate,`${p.file} after`);
  const patch=(await read(p.diff,`${p.file} net diff`)).toString();
  assert.equal(sha(before),p.beforeRawBytesSha256); assert.equal(sha(after),p.afterRawBytesSha256);
  const forward=applyDiff(before.toString(),patch), reverse=applyDiff(after.toString(),invert(patch));
  assert.equal(forward.text,lf(after.toString()),'full normalized forward');
  assert.equal(reverse.text,lf(before.toString()),'full normalized inverse');
  const parentProduct=parent.products.find(x=>x.file===p.file);
  assert(parentProduct);
  if(p.unchangedFromCode01) assert.equal(p.afterRawBytesSha256,parentProduct.afterRawBytesSha256);
  productProofs.push({file:p.file,beforeSHA:p.beforeRawBytesSha256,afterSHA:p.afterRawBytesSha256,
    hunks:forward.hunks,normalizedForwardAndInverseExact:true,
    beforeCRLF:(before.toString().match(/\r\n/g)||[]).length,
    afterCRLF:(after.toString().match(/\r\n/g)||[]).length,
    priorStage249AndHistoricalLogicProtectedByExactInverse:true});
}
for(const p of m.incrementalProducts) {
  const prior=parent.products.find(x=>x.file===p.file);
  const next=m.products.find(x=>x.file===p.file);
  assert.equal(prior.afterRawBytesSha256,p.beforeRawBytesSha256);
  const before=await read(prior.candidate,'code01 context after'), after=await read(next.candidate,'code02 context after');
  const patch=(await read(p.diff,'code01-to02 increment')).toString();
  assert.equal(applyDiff(before.toString(),patch).text,lf(after.toString()));
  assert.equal(applyDiff(after.toString(),invert(patch)).text,lf(before.toString()));
}
const baseMap=new Map(base.map(p=>[p.file,p.sha256]));
assert.equal(baseMap.size,528); assert.equal(ci.effectiveCompileInputs.length,528);
assert.equal(new Set(ci.effectiveCompileInputs.map(x=>x.file)).size,528);
assert.deepEqual(ci.effectiveCompileInputs.map(x=>x.file).sort(),[...baseMap.keys()].sort());
const deltas=ci.effectiveCompileInputs.filter(p=>baseMap.get(p.file)!==p.sha256);
assert.deepEqual(deltas.map(x=>x.file).sort(),m.products.map(x=>x.file).sort());
for(const p of deltas) assert.equal(p.sha256,m.products.find(x=>x.file===p.file).afterRawBytesSha256);
let count=0;
const inventoryResults=await Promise.allSettled(ci.effectiveCompileInputs.map(async p=>{
  assert(!p.file.startsWith('/')&&!p.file.includes('..')&&!p.file.includes('\\'),'strict relative path');
  const file=map(ci.tree)+'/'+p.file, st=await fs.lstat(file);
  assert(st.isFile()&&!st.isSymbolicLink(),`isolated input regular ${p.file}`);
  assert.equal(sha(await fs.readFile(file)),p.sha256,`isolated input ${p.file}`); count++;
}));
const inventoryErrors=inventoryResults.flatMap((r,i)=>r.status==='rejected'?[{file:ci.effectiveCompileInputs[i].file,error:String(r.reason)}]:[]);
assert.deepEqual(inventoryErrors,[]); assert.equal(count,528);
const commandProofs=[];
for(const r of checks.results) {
  assert.equal(r.exitCode,0); assert.equal(r.signal,null); assert.equal(r.databaseOptIn,false);
  const stdout=await read(r.stdout,'command stdout'), stderr=await read(r.stderr,'command stderr');
  const kind=r.argv[1];
  if(kind==='test') {
    assert.deepEqual(r.argv.slice(4),['--locked','--offline','--lib','project_operating::','--','--nocapture']);
    assert.match(stdout.toString(),/test result: ok\. 133 passed; 0 failed; 0 ignored;/);
    const names=stdout.toString().split('\n').filter(x=>x.includes('restatement_cutoff344_tests::')||x.includes('implicit_projection344_tests::'));
    assert.equal(names.length,21,'14 cutoff and 7 root tests are real executed tests');
  }
  if(kind==='clippy') assert.deepEqual(r.argv.slice(4),['--locked','--offline','--lib','--no-deps','--','-D','warnings']);
  commandProofs.push({argv:r.argv,cwd:r.cwd,startedAt:r.startedAt,completedAt:r.completedAt,
    exitCode:r.exitCode,stdout:r.stdout,stderr:r.stderr});
}
const result={kind:'independent-fixed-FS-code02-inverse-and-provenance-check',reviewer:'/root/r4ghi_final_gates13',
  candidate:manifestPin,all42ArtifactPinsVerified:true,pinnedDependencyCount:readset.sourcePins.length,
  products:productProofs,code01To02IncrementNormalizedInverseExact:true,
  compileInventory:{count:528,exactBaseSet:true,onlyChangedFiles:deltas,isolatedTreeRawAll528Verified:true,
    declaredInputProvenanceOnly:true,notAClaimThatCargoCompilesEveryRegisteredFile:true},
  authorCommandsReadback:commandProofs,author133PassedVerified:true,productionFunctionNewTests:21,
  independentRustTestsRun:false,fullBuildOrOriginalG1RegressionGranted:false,
  fsObservationHost:'Windows; Linux paths explicitly mapped to existing UNC or /mnt/e mount',
  RootProductOrHelperWritten:false,context:false,SQLHTTP:false,processQueryOrSignal:false,Git:false,
  Source15Admission:false,G3:false,G4:false};
await fs.writeFile(path.join(here,'verification-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({verdict:'pass-fixed-fs-inverse-and-provenance',productCount:2,artifactCount:42,
  readsetPins:readset.sourcePins.length,compileInputs:count,changedInputs:deltas.length,authorTests:133,
  result:path.join(here,'verification-result.json')}));
