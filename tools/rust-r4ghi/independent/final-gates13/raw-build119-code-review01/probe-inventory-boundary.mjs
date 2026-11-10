import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const code='E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/source15-admission119-code01/raw-build-only-sealed01/tools/rust-r4ghi/source15-admission119/build-source15.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const source=await fs.readFile(code);assert.equal(sha(source),'00fdcd3862711e76515ea5d27f09cce44a76bff63ee4c6b3b062bd6f2103b2a9');
// Importing this reviewed file has only builtin imports. Never call runBuild15,
// mainBuild15, any runtime module or Cargo; only its exported FS enumerator.
const {enumerateCargo15}=await import(pathToFileURL(code).href);
const root=path.join(here,'fixture-root'),mirror=path.join(here,'fixture-mirror');
for(const dir of [root,mirror]){
  await fs.mkdir(path.join(dir,'apps/poms-api-rust/tests'),{recursive:true});
  await fs.writeFile(path.join(dir,'apps/poms-api-rust/Cargo.toml'),'[package]\nname="boundary"\nversion="0.1.0"\nedition="2024"\n',{flag:'wx'});
  await fs.writeFile(path.join(dir,'apps/poms-api-rust/tests/approved.rs'),'#[test] fn approved() {}\n',{flag:'wx'});
}
const initial=enumerateCargo15(root);assert.deepEqual(enumerateCargo15(mirror),initial);
const pins=await Promise.all(initial.map(async file=>({file,sha256:sha(await fs.readFile(path.join(root,file)))})));
async function cachedLeafChecks(dir){for(const p of pins)assert.equal(sha(await fs.readFile(path.join(dir,p.file))),p.sha256);return true;}
await fs.writeFile(path.join(mirror,'apps/poms-api-rust/tests/unregistered.rs'),'#[test] fn unregistered() {}\n',{flag:'wx'});
assert.deepEqual(enumerateCargo15(root),initial);await cachedLeafChecks(root);await cachedLeafChecks(mirror);
assert.notDeepEqual(enumerateCargo15(mirror),initial);
const text=source.toString(),checks=text.slice(text.indexOf("} else if (input.mode === 'checks-build')"),text.indexOf('} else {\n      const pair'));
assert(checks.includes('for (const p of tree.compile) leaf(root, p)'));
assert(!checks.includes('enumerateCargo15('));assert(!checks.includes('sourcePins()'));
await fs.writeFile(path.join(root,'apps/poms-api-rust/tests/later-added.rs'),'#[test] fn later_added() {}\n',{flag:'wx'});
await cachedLeafChecks(root);assert.notDeepEqual(enumerateCargo15(root),initial);
const result={kind:'independent-rawbuild-cached-inventory-counterexample',candidateSHA256:sha(source),
  cases:[{id:'RB119-C01',rootFullEnumerationStillExpected:true,mirrorCachedLeafChecksPass:true,mirrorActualCargoSetHasExtraFile:true,checksBuildHasNoFreshMirrorEnumeration:true},
    {id:'RB119-C02',rootCachedLeafChecksStillPassAfterAddedFile:true,actualRootCargoSetChanges:true,checksBuildStepAndFinalDoNotReenumerate:true}],
  actualExportedEnumeratorUsed:true,fixtureScope:'Only this independent review directory; Windows FS paths, platform-independent enumerator',
  actualBuildModeInvoked:false,CargoInvoked:false,contextOrRuntimeInvoked:false,SQLHTTP:false,processQueryOrSignal:false,RootProductOrMirrorWritten:false};
await fs.writeFile(path.join(here,'probe-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({counterexamples:2,actualEnumerator:true,actualMode:false,Cargo:false}));
