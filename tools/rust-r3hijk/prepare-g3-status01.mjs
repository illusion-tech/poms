import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pin} from './source-guard.mjs';
const evidence='docs/design/rust-r3hijk/evidence',read=file=>JSON.parse(fs.readFileSync(file));
const build=read(evidence+'/rust-check09/report01.json');assert(build.allExecutedChecksPassed);assert.equal(build.artifact.rawBytesSha256,'cb19cff248fdb44ac27269bb5f681ab24887c85b077af14032fc30a0fc8101aa');
for(const phase of ['43','44','45','46','47']){const report=read(evidence+'/acceptance-rust-candidate04-'+phase+'/report01.json');assert(report.completed);assert.equal(report.runtime.artifactSha256,build.artifact.rawBytesSha256);}
for(const backend of ['nest','rust']){const report=read(evidence+'/cohort-cleanup-'+backend+'01/report01.json');assert(report.completed&&report.all107SeedRawJSONRowsExact&&report.allPrivilegesRestored);}
assert(read(evidence+'/environment-terminal01.json').PG15Stopped);assert(read(evidence+'/final-integrity02/report01.json').allChecksPassed);assert(read(evidence+'/root/public-corpus-audit02.json').passed);
for(const label of ['linux-native03','windows-native01','linux-rust01','windows-rust01'])assert(read(evidence+'/ui-'+label+'/report01.json').completed);
const file='docs/design/rust-r3hijk-delivery-status.json',status=read(file);assert(!status.G3Certified&&!status.G4Certified&&status.implementation===null);
status.phase='G3Ready';status.implementationCandidateArtifact=build.artifact;status.currentRustOperations=173;status.businessValidation='Passed-final-candidate04-with-explicit-candidate03-causal-reuse-await-independent-G3';status.G3Submission='docs/design/rust-r3hijk/g3-submission01.md';status.finalValidation=pin(evidence+'/rust-check09/report01.json');status.finalIntegrity=pin(evidence+'/final-integrity02/report01.json');status.ownedEnvironmentTerminal=pin(evidence+'/environment-terminal01.json');
for(const item of status.operations){item.rustImplemented=true;item.nativeStatus=item.nativeStatusSourceExpectation;item.NativeEvidence=pin(evidence+'/acceptance-nest-g2-native01-02/report01.json');}
fs.writeFileSync(file,JSON.stringify(status,null,2)+'\n');
const text='\n\n### 2026-11-03 R3H–K 实现／验收完成，提交独立 G3\n\n[提交前证据](rust-r3hijk/g3-submission01.md)绑定最终candidate04 `cb19cff2`、288 passed/54 ignored、金额精度、版本故障并发、旧30回归和业务原子性实际通过；四原UI cell按明确候选／平台轴保留。两G2 cohort 1265/2371行已清理，107 seed原JSON与428权限各自恢复，自有服务及PG15停止、卷/private/原件保留。当前实际Rust173操作，但正式仍30/58，G3/fixed/main/G4待独立签署；#93–96尚Open，#85/#57保持Open，完整R3阶段不由HTTP完成数代替。\n';
for(const document of ['docs/design/backend-rust-migration-plan.md','docs/design/phase2-development-execution-tracker.md'])fs.appendFileSync(document,text);
console.log(JSON.stringify({phase:status.phase,formalR3:status.currentFormalR3Delivered,rustOperations:status.currentRustOperations,G3:false,G4:false}));
