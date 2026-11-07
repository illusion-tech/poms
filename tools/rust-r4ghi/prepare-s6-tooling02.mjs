// Deliberately advance the fixed code-generation source epoch. No generated product is written.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const A=process.argv[2];assert(/^[a-f0-9]{40}$/.test(A??''));assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),A);
execFileSync('git',['merge-base','--is-ancestor','4f0ad88e78622a75b88b4e3cc72aded9da67458a',A]);
const sha=b=>createHash('sha256').update(b).digest('hex'),norm=b=>b.toString().replace(/\r\n/g,'\n');
const out='tools/openapi/checkpoints/r4ghi-s6-tooling';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/.gitattributes','* -text\n*.bin -diff\n',{flag:'wx'});
const manifestFile='tools/openapi/checkpoints/r4ghi-s6/input-manifest01.json',manifestRaw=fs.readFileSync(manifestFile),manifest=JSON.parse(manifestRaw);
assert.equal(sha(manifestRaw),'ddb2d8e44ed6897d75d0181093b49b3a27540560d2df73f789fd476bf1d91b35');assert.equal(manifest.inputs.length,420);
const before=new Map();function edit(file,fn){const raw=fs.readFileSync(file);assert(!before.has(file));before.set(file,raw);const next=fn(raw.toString());assert.equal(typeof next,'string');fs.writeFileSync(file,next);}
function replace(text,a,b){assert.equal(text.split(a).length,2,a);return text.replace(a,()=>b);}
const baselineFile='tools/openapi/shared-api-client-baseline.json',baseline=JSON.parse(fs.readFileSync(baselineFile)),spec=JSON.parse(fs.readFileSync('libs/shared/api-spec/openapi.json'));
assert.equal(baseline.sourceHead,'883f88fdf4fd609bb8b0725b28bda011d408d6ee');
baseline.sourceHead=A;
for(const input of baseline.protectedSources){const blob=execFileSync('git',['show',A+':'+input.file],{encoding:null,maxBuffer:20000000}),raw=fs.readFileSync(input.file);assert.equal(sha(norm(blob)),sha(norm(raw)));input.sha256=sha(norm(raw));assert.equal(input.sha256,manifest.inputs.find(x=>x.file===input.file).normalizedTextSHA256);}
baseline.spec.schemas=Object.keys(spec.components.schemas).sort();assert.equal(baseline.spec.schemas.length,690);assert.equal(baseline.spec.operations.length,296);assert.equal(baseline.spec.paths.length,242);
edit(baselineFile,()=>JSON.stringify(baseline,null,2)+'\n');
edit('tools/openapi/shared-api-client.mjs',t=>replace(t,'baseline.spec.schemas.length, 689','baseline.spec.schemas.length, 690'));
edit('tools/openapi/shared-api-client.integration.test.mjs',t=>replace(t,'result.spec.schemas, 689','result.spec.schemas, 690'));
edit('tools/openapi/README.md',t=>replace(t,'当前 S5 输入提交为 `883f88fdf4fd609bb8b0725b28bda011d408d6ee`，绑定完整规范、配置与锁文件，包含 242 paths、296 条 method/path/operationId 和 689 个 schema 名称；永久 S4 保留为祖先。精确来源与原字节证据在 `checkpoints/r4ghi-s5/`。',
 '当前 S6 输入提交为 `'+A+'`，绑定完整规范、配置与锁文件，包含 242 paths、296 条 method/path/operationId 和 690 个 schema 名称；原 S5 与永久 S4 均保留。精确来源与原字节证据在 `checkpoints/r4ghi-s6/`。'));
edit('tools/rust-r1b/s5/source-access.mjs',t=>{
 t=replace(t,"'tools/openapi/checkpoints/r4ghi-s5/input-manifest02.json'","'tools/openapi/checkpoints/r4ghi-s6/input-manifest01.json'");
 t=replace(t,"'tools/openapi/checkpoints/r4ghi-s5'","'tools/openapi/checkpoints/r4ghi-s6'");
 t=replace(t,'manifest.inputs.length !== 414','manifest.inputs.length !== 420');t=replace(t,'retain all 414 explicit input records','retain all 420 explicit input records');
 return replace(t,'manifestInputRecords: 414','manifestInputRecords: 420');
});
const {createSnapshotSourceAccess}=await import('../rust-r1b/s5/source-access.mjs');
const {proposeS5}=await import('../rust-r1b/s5/full-build.mjs');
const identityFile='tools/rust-r1b/history/s3-nominal-identity.json',identityRaw=fs.readFileSync(identityFile),identity=JSON.parse(identityRaw);
assert.equal(sha(norm(identityRaw)),'9f5f1e044f0e5ea57023238cd5d6e2d2f5caf1b58f1977add5faaeb713daa335');
const previousRaw=execFileSync('git',['show','f072f7d58fa3ef551d7194f8305f176678aedb79:tools/rust-r1b/shared-manifest.json'],{encoding:null,maxBuffer:16000000}),previous=JSON.parse(previousRaw);
assert.equal(sha(JSON.stringify(previous)),identity.previousManifestObjectSha256,'Historical S3 identity must use its original exact manifest object');
const current=JSON.parse(fs.readFileSync('tools/rust-r1b/shared-manifest.json'));assert.equal(current.authority.sourceHead,'883f88fdf4fd609bb8b0725b28bda011d408d6ee');
const access=createSnapshotSourceAccess(process.cwd(),sha(manifestRaw)),proposal=proposeS5(process.cwd(),previous,access);assert.deepEqual(proposal.identity,identity);
const names=new Set(current.enums.map(x=>x.name));assert.deepEqual(proposal.manifest.enums.filter(x=>!names.has(x.name)).map(x=>x.name),['ProjectInitialOwnership']);
for(const old of current.enums){const next=proposal.manifest.enums.find(x=>x.name===old.name);assert(next);assert.deepEqual(next.values,old.values,old.name+' values');assert.deepEqual(next.aliases,old.aliases,old.name+' aliases');}
const key=x=>JSON.stringify([x.path,x.owner,x.schemaId,x.propertyPath,x.sourceArray,x.topLevel]);
const occurrences=new Map(proposal.manifest.enumOccurrences.map(x=>[key(x),x]));for(const old of current.enumOccurrences){const next=occurrences.get(key(old));assert(next,key(old));assert.deepEqual(next.values,old.values);assert.equal(next.family,old.family);}
assert.equal(proposal.manifest.enums.length,331);assert.equal(proposal.manifest.enumOccurrences.length,339);
const registry=proposal.registry;registry.reviewStatus='Root-reviewed-S5-registration';registry.sourceHead=A;
edit('tools/rust-r1b/s5-reviewed-registry.json',()=>JSON.stringify(registry,null,2)+'\n');
const oldReview=(await import('../rust-r1b/s5/review.mjs')).S5_REVIEW;
const review={...oldReview,sourceHead:A,registryNormalizedTextSha256:sha(norm(fs.readFileSync('tools/rust-r1b/s5-reviewed-registry.json'))),snapshotManifestRawSha256:sha(manifestRaw),generatorNormalizedTextSha256:Object.fromEntries(Object.keys(oldReview.generatorNormalizedTextSha256).map(file=>[file,sha(norm(fs.readFileSync(file)))]))};
edit('tools/rust-r1b/s5/review.mjs',()=>"// Exact reviewed S6 pins; the existing --s5 CLI remains the compatible whole-exporter entry.\n// S4/S5 source checkpoints and historical nominal identities remain immutable.\nexport const S5_REVIEW = Object.freeze("+JSON.stringify(review,null,4)+');\n');
edit('tools/rust-r1b/s5/export-s5.probes.mjs',t=>{
 t=replace(t,"'tmp/rust-r4ghi/s5-exporter-probes09'","'tmp/rust-r4ghi/s6-exporter-probes01'");
 t=replace(t,'manifest.enumOccurrences.length, 338','manifest.enumOccurrences.length, 339');t=replace(t,'manifest.enums.length, 330','manifest.enums.length, 331');
 return replace(t,'final canonical130 physical-source registry','final canonical131 physical-source registry');
});
edit('tools/rust-r1b/s5/README.md',()=>`# 完整共享枚举导出\n\n当前固定来源为 S6 输入提交 \`${A}\`，原字节清单为 \`tools/openapi/checkpoints/r4ghi-s6/input-manifest01.json\`（420项）。原 S4/S5 检查点和 s3 nominal identity 不改写。历史 S5 为330族/338次枚举，当前 S6 仅增加 ProjectInitialOwnership，预期331族/339次；旧族 values 与 aliases 已逐一核对。\n\n保留现有 \`node tools/rust-r1b/export-shared.mjs --s5 --write|--check\` 入口；目录和参数中的 s5 是兼容名称，实际来源由独立审定的 sourceHead、registry、review.mjs 及新检查点共同固定。新输入不放宽 AST 构造、模块图或原始字节校验。\n\nA 输入与 B 工具/登记分开提交。A 的全部物理检查点路径必须已提交，实际消费 blob 用 git cat-file 校验；working/index/untracked 均与固定 A 比较。六项 live 逻辑源必须在生成前后逐字等于快照。B 的工具和元数据必须 tracked 且相对 HEAD 干净，并匹配独立固定哈希；HEAD 只检查 B 干净，不能替代 A。\n\n历史身份来自 s3 已固定的原对象，禁止拿新生成清单重建历史；相同 wire 列表仍保留不同 nominal 类型。完整生成仍产生 shared-manifest、Rust enums 与完整 generated tests。纯探针、真实 write/check、整 crate 检查和 PG/HTTP 业务验收分开记录；本工具登记不认证产品 G3/G4。\n`);
assert.equal(sha(fs.readFileSync(identityFile)),sha(identityRaw),'Historical identity raw bytes changed');
const files=[];let index=0;for(const[file,raw]of before){const snapshot='before/'+String(++index).padStart(2,'0')+'.bin';fs.mkdirSync(path.dirname(out+'/'+snapshot),{recursive:true});fs.writeFileSync(out+'/'+snapshot,raw,{flag:'wx'});files.push({file,beforeSHA256:sha(raw),afterSHA256:sha(fs.readFileSync(file)),beforeSnapshot:snapshot});}
const result={kind:'Root-S6-tooling-and-registration-proposal',capturedAt:new Date().toISOString(),sourceHead:A,snapshotManifest:manifestFile,snapshotManifestSHA256:sha(manifestRaw),snapshotInputRecords:420,files,
 previousNominalManifestObjectSHA256:sha(JSON.stringify(previous)),historicalIdentityRawSHA256:sha(identityRaw),historicalIdentityUnchanged:true,
 uniqueNewFamily:'ProjectInitialOwnership',all330OldFamiliesValuesAndAliasesExact:true,all338OldOccurrenceValuesAndFamilyExact:true,
 counts:{paths:242,operations:296,schemas:690,enums:331,occurrences:339},generator:baseline.generator,productionOutputsWritten:false,pureProbesPending:true,actualGenerationPending:true,G3Certified:false};
fs.writeFileSync(out+'/proposal02.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({proposal:out+'/proposal02.json',changedFiles:files.length,sourceHead:A,oldIdentitiesAndValuesPreserved:true,productWritten:false}));
