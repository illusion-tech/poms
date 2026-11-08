import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';

// FS/source-only isolated test runner. Does not import any application module,
// open a CommonSession, createContext, database, network, or process admission.
const here = path.dirname(fileURLToPath(import.meta.url));
assert.equal(process.platform, 'linux', 'invoke with the pinned WSL Node24');
assert.equal(process.version, 'v24.19.0');
const relative = 'apps/poms-api-rust/src/project_operating/restatement.rs';
const read = p => fs.readFileSync(path.join(here, p), 'utf8').replaceAll('\r\n','\n');
const rawSha = b => crypto.createHash('sha256').update(b).digest('hex');
const pin = file => ({file,rawBytesSha256:rawSha(fs.readFileSync(file))});
const base = read('base/' + relative);
let candidate = read('proposed/' + relative);
const sources = read('base/apps/poms-api-rust/src/project_operating/sources.rs');
const store = read('base/apps/poms-api-rust/src/project_operating/store.rs');
const helperStart = '// Automatic Stage roots represent a currently usable Cost.';
const helperEnd = '#[derive(Clone)]\nstruct Impact';
const testsStart = '#[cfg(test)]\nmod inferred_parent_current249_tests {';
const helper = candidate.slice(candidate.indexOf(helperStart),candidate.indexOf(helperEnd));
const tests = candidate.slice(candidate.indexOf(testsStart));
assert.ok(helper.length > 100 && tests.length > 100);
const table = store.slice(store.indexOf('#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]'),store.indexOf('\nimpl Table'));
const declaration = sources.slice(sources.indexOf('#[derive(Default, Clone)]'),sources.indexOf('\npub(crate) async fn lock_full_source_set'));
const lookup = sources.slice(sources.indexOf('    pub(crate) fn all('),sources.indexOf('    pub(crate) fn by('));
const header = `#![allow(dead_code)]\nuse serde_json::Value;\nuse std::collections::{BTreeMap, BTreeSet};\nuse uuid::Uuid;\n${table}\nmod sources {\nuse super::*;\n${declaration}\nimpl Catalog {\n${lookup}}\n}\n`;
const out = path.join(here,'checks249');
fs.mkdirSync(out,{recursive:true});
const harnessFile = path.join(out,'exact-source249.rs');
assert.ok(!fs.existsSync(harnessFile),'preserve old checks; use a new output directory for a revision');
fs.writeFileSync(harnessFile,header + helper + tests,{flag:'wx'});
const toolchain = '/home/wangzishi/.rustup/toolchains/1.99.1-x86_64-unknown-linux-gnu/bin';
const rustfmt = path.join(toolchain,'rustfmt');
const rustc = path.join(toolchain,'rustc');
const fmt = cp.spawnSync(rustfmt,['--edition','2024',harnessFile],{encoding:'utf8'});
fs.writeFileSync(path.join(out,'rustfmt-stdout.log'),fmt.stdout ?? '',{flag:'wx'});
fs.writeFileSync(path.join(out,'rustfmt-stderr.log'),fmt.stderr ?? '',{flag:'wx'});
assert.equal(fmt.status,0,fmt.stderr);
const formatted = fs.readFileSync(harnessFile,'utf8');
const formattedHelper = formatted.slice(formatted.indexOf(helperStart),formatted.indexOf(testsStart));
const formattedTests = formatted.slice(formatted.indexOf(testsStart));
candidate = candidate.replace(helper,formattedHelper).replace(tests,formattedTests);
fs.writeFileSync(path.join(here,'proposed',relative),candidate.replaceAll('\n','\r\n'));
assert.equal(candidate.slice(candidate.indexOf(helperStart),candidate.indexOf(helperEnd)),formattedHelper);
assert.equal(candidate.slice(candidate.indexOf(testsStart)),formattedTests);

// Reverse the complete intended delta. This proves explicit selected roots,
// affected_states' same-project/day rule, and all historical graph joins remain
// the original implementation, rather than a filtered stand-in.
const filterStart = base.indexOf('        .filter(|r| {\n            let Some(id) = r["id"]');
const filterEnd = base.indexOf('        .map(|r| {',filterStart);
const oldFilter = base.slice(filterStart,filterEnd);
const newFilter = '        .filter(|reference| inferred_late_source_is_current(reference, catalog))\n';
const restored = candidate.replace(formattedHelper,'')
    .replace('\n'+formattedTests,'').replace(newFilter,oldFilter);
assert.equal(restored,base,'only automatic eligibility/helper and appended tests may change');
assert.ok(base.includes('roots.extend_from_slice(selected);'));
const deps = '/home/wangzishi/.cache/poms-r4ghi-target-ROOT/debug/deps';
const serde = path.join(deps,'libserde_json-b2cbb6aa9ac0dba9.rlib');
const uuid = path.join(deps,fs.readdirSync(deps).filter(f=>/^libuuid-.*\.rlib$/.test(f)).sort()[0]);
assert.ok(uuid.endsWith('.rlib'));
const executable = path.join(out,'exact-source249-test');
const compile = cp.spawnSync(rustc,['--edition=2024','--test',harnessFile,
    '-L',`dependency=${deps}`,'--extern',`serde_json=${serde}`,'--extern',`uuid=${uuid}`,
    '-o',executable],{encoding:'utf8',cwd:here});
fs.writeFileSync(path.join(out,'rustc-stdout.log'),compile.stdout ?? '',{flag:'wx'});
fs.writeFileSync(path.join(out,'rustc-stderr.log'),compile.stderr ?? '',{flag:'wx'});
assert.equal(compile.status,0,compile.stderr);
const test = cp.spawnSync(executable,['--nocapture'],{encoding:'utf8',cwd:here});
fs.writeFileSync(path.join(out,'test-stdout.log'),test.stdout ?? '',{flag:'wx'});
fs.writeFileSync(path.join(out,'test-stderr.log'),test.stderr ?? '',{flag:'wx'});
assert.equal(test.status,0,test.stderr);
assert.match(test.stdout,/6 passed; 0 failed/);
const result = {
    kind:'isolated-exact-source-current-parent249-tests',
    source:pin(path.join(here,'proposed',relative)),
    tableAndCatalogAreExactBaseExtracts:true,
    helperAndTestsAreExactProposedExtracts:true,
    deltaReverseRestoresOriginal:true,
    explicitSelectedRootPathBytePreserved:true,
    impactGraphAndAffectedStatesBytePreserved:true,
    rustc:pin(rustc),rustfmt:pin(rustfmt),externs:[pin(serde),pin(uuid)],
    isolatedRustTests:{passed:6,failed:0},
    fullCrateCompiled:false,RootWritten:false,SQL:false,HTTP:false,
    actualTax08Rerun:false,G3Certified:false,G4Certified:false
};
fs.writeFileSync(path.join(out,'result249.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
