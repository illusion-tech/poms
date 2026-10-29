import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync,readFileSync,writeFileSync,openSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync,spawn} from 'node:child_process';
import path from 'node:path';
import {validateSource,sourceHead,root} from './fixture-guard.mjs';
import {assertFrozenSources,loadBaseline} from '../openapi/shared-api-client.mjs';
async function containerRun(){
    assert.equal(process.platform,'linux');assert([4,5].includes(process.argv.length));const tag=process.argv[3],selection=process.argv[4];assert(/^[a-z0-9-]{1,35}$/.test(tag));
    const repo=path.resolve(root);assert.equal(repo,'/home/wangzishi/projects/poms-rust-r2k');process.chdir(repo);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHead);validateSource();
    const modules='/home/wangzishi/projects/poms-rust-r2d/node_modules',node='/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node',image='ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273';
    const hash=b=>createHash('sha256').update(b).digest('hex'),anchors=()=>['.modules.yaml','.pnpm/lock.yaml'].map(file=>({file:modules+'/'+file,sha256:hash(readFileSync(modules+'/'+file))}));
    const before=anchors(),log=`tmp/rust-r2k/shared-container-${tag}.log`,output=`tmp/rust-r2k/shared-container-${tag}.json`;assert(!existsSync(log)&&!existsSync(output));
    const args=['--cgroup-manager=cgroupfs','run','--rm','--pull=never','--network=none','--workdir=/workspace','--mount',`type=bind,source=${repo},destination=/workspace`,'--volume',`${modules}:${modules}:O`,'--mount',`type=bind,source=${node},destination=/usr/local/bin/node,readonly`,'--mount','type=bind,source=/home/wangzishi/.local/share/poms-r2k/bootstrap/7.20.0.jar,destination=/generator/7.20.0.jar,readonly','--env','POMS_OPENAPI_JAVA=/usr/bin/java','--env','POMS_OPENAPI_GENERATOR_JAR=/generator/7.20.0.jar','--entrypoint','/usr/local/bin/node',image,'tools/rust-r2k/shared-checks.mjs',tag,...(selection?[selection]:[])];
    const fd=openSync(log,'wx',0o600);let code;
    try{code=await new Promise((resolve,reject)=>{const child=spawn('podman',args,{cwd:repo,stdio:['ignore',fd,fd]});child.once('error',reject);child.once('close',resolve);});}finally{closeSync(fd);}
    const after=anchors();assert.deepEqual(after,before,'Old dependency lower anchors changed');const report={formatVersion:1,result:code===0?'pass':'fail',sourceHead,exitCode:code,image,oldDependenciesTemporaryOverlay:true,lowerAnchorsUnchanged:true,before,after,nodeHostSha256:hash(readFileSync(node)),args,log,logSha256:hash(readFileSync(log))};writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));if(code!==0)process.exitCode=1;
}
if(process.argv[2]==='--container')await containerRun();
else {
const require=createRequire(import.meta.url),runtime=require('../e2e/runtime.cjs');
const tag=process.argv[2],only=process.argv[3]?.split(',');assert(process.argv.length===3||process.argv.length===4);assert(/^[a-z0-9-]{1,35}$/.test(tag));
const output=`tmp/rust-r2k/shared-checks-${process.platform}-${tag}.json`;assert(!existsSync(output));
assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHead);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(readFileSync(process.execPath)),'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12');
const baseline=loadBaseline();assert.equal(baseline.sourceHead,sourceHead);validateSource();assertFrozenSources(process.cwd(),baseline);
const sources=['libs/admin/data-access/src/lib/project/project-workspace.store.ts','apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts','libs/shared/api-client/api/attachment-handover.service.ts','tools/openapi/shared-api-client-baseline.json','tools/rust-r2k/shared-checks.mjs',...baseline.protectedSources.map(row=>row.file)];
const fingerprint=()=>[...new Set(sources)].sort().map(file=>({file,rawBytesSha256:hash(readFileSync(file))}));
const before=fingerprint(),jar=process.env.POMS_OPENAPI_GENERATOR_JAR;assert(jar&&path.isAbsolute(jar));assert.equal(hash(readFileSync(jar)),baseline.generator.jarSha256);
const java=spawnSync('/usr/bin/java',['-version'],{encoding:'utf8'});assert.equal(java.status,0);const javaVersion=java.stderr+java.stdout;assert(/17\.0\.21/.test(javaVersion));
const nxPackage=require.resolve('nx/package.json'),p=JSON.parse(readFileSync(nxPackage));const nx=path.resolve(path.dirname(nxPackage),typeof p.bin==='string'?p.bin:p.bin.nx);
const tsc=require.resolve('typescript/bin/tsc');
const tsPackage=require.resolve('typescript/package.json'),tsVersion=JSON.parse(readFileSync(tsPackage)).version;assert.equal(tsVersion,'6.0.3');assert.equal(JSON.parse(readFileSync('package.json')).devDependencies.typescript,tsVersion);
const installedBuildPlans=[['shared-api-client','libs/shared/api-client'],['admin-data-access','libs/admin/data-access']].map(([target,directory])=>{
    const projectFile=directory+'/project.json',project=directory+'/tsconfig.lib.json',configuration=JSON.parse(readFileSync(projectFile));assert.equal(configuration.name,target);assert.equal(configuration.targets.build.executor,'nx:run-commands');const command=`pnpm exec tsc -b ${project} --pretty false`;assert.equal(configuration.targets.build.options.command,command);
    return {target:target+':build',projectFile,project,originalCommand:command,executable:process.execPath,args:[tsc,'-b',project,'--pretty','false'],installedTypescriptVersion:tsVersion,installedPackageSha256:hash(readFileSync(tsPackage)),installedEntrySha256:hash(readFileSync(tsc)),substitution:'Only the pnpm bootstrap launcher is replaced by the already installed exact locked tsc CLI; original pnpm target attempt shared02 was interrupted, not certified pass'};
});
const dependencyEvidenceFile='tmp/rust-r2k/shared-checks-linux-shared03.json';
const dependencyEvidence=JSON.parse(readFileSync(dependencyEvidenceFile));assert.equal(dependencyEvidence.sourceHead,sourceHead);assert(dependencyEvidence.sourcesUnchanged&&dependencyEvidence.generatorInputGuardAfter);
const productionDependencyProofs=installedBuildPlans.map(plan=>{const id=plan.target.startsWith('shared-api-client')?'shared-api-client-build':'admin-data-access-build',step=dependencyEvidence.steps.find(step=>step.id===id);assert.equal(step?.result,'pass');assert.equal(hash(readFileSync(step.log)),step.logSha256);return {target:plan.target,evidence:dependencyEvidenceFile,step:id,log:step.log,logSha256:step.logSha256,originalConfig:plan.project};});
const contractsLog=dependencyEvidence.steps.find(step=>step.id==='admin-production-build')?.log;assert(contractsLog);assert(readFileSync(contractsLog,'utf8').includes('Done compiling TypeScript files for project "shared-contracts".'));
productionDependencyProofs.push({target:'shared-contracts:build',evidence:contractsLog,logSha256:hash(readFileSync(contractsLog)),originalConfig:'libs/shared/contracts/tsconfig.lib.json',classification:'Original Nx dependency compilation completed before subsequent pnpm bootstrap stalled; also built through the successful tsc -b project references'});
const env={...process.env,NX_DAEMON:'false',NX_TUI:'false',NX_SKIP_NX_CACHE:'true',NG_CLI_ANALYTICS:'false',CI:'true'};
for(const k of Object.keys(env))if(/^(?:PG|DB_|MIKRO_)/i.test(k)||/^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS|POMS_ENV_FILE)$/.test(k))delete env[k];
const report={formatVersion:1,sourceHead,node:process.version,nodeExecutableSha256:hash(readFileSync(process.execPath)),platform:process.platform,startedAt:new Date().toISOString(),result:'pending',sourcesBefore:before,generatorInputGuardBefore:true,jarSha256:baseline.generator.jarSha256,javaVersion,launcherSubstitutions:installedBuildPlans,productionBuildDependencyControl:{flag:'--excludeTaskDependencies',targetAndCompilerOptionsUnchanged:true,reason:'Only skip this same-source already successful dependency set, avoiding another original pnpm bootstrap attempt',proofs:productionDependencyProofs},notApplicable:[{project:'poms-admin-e2e',targets:['lint','test'],reason:'Current project.json only declares e2e; Nx explicitly did not run nonexistent lint/test. Browser execution is not claimed by this helper; existing browser source typecheck is separate.'}],steps:[]};
const steps=[
    ['lint-tests',[nx,'run-many','--targets=lint,test','--projects=poms-api,poms-admin,poms-admin-e2e','--parallel=2','--skip-nx-cache','--output-style=static']],
    ['shared-api-client-build',[tsc,'-b','libs/shared/api-client/tsconfig.lib.json','--pretty','false']],
    ['admin-data-access-lint',[nx,'run','admin-data-access:lint','--skip-nx-cache','--output-style=static']],
    ['admin-data-access-build',[tsc,'-b','libs/admin/data-access/tsconfig.lib.json','--pretty','false']],
    ['admin-production-build',[nx,'run','poms-admin:build','--skip-nx-cache','--output-style=static','--excludeTaskDependencies']],
    ['admin-e2e-typecheck',[tsc,'--project','tools/e2e/browser-tsconfig.json','--noEmit','--pretty','false']],
    ['openapi-client',[nx,'run','shared-api-client:check','--skip-nx-cache','--output-style=static']]
];
if(only)assert(only.length>0&&new Set(only).size===only.length&&only.every(id=>steps.some(step=>step[0]===id)));
report.selection=only??steps.map(step=>step[0]);
try{
    for(const [id,args] of steps.filter(step=>!only||only.includes(step[0]))){const log=`tmp/rust-r2k/shared-${process.platform}-${tag}-${id}.log`;const step={id,args:args.map(a=>a===nx?'installed nx CLI':a===tsc?'installed tsc CLI':a),log,result:'pending'};report.steps.push(step);
        try{await runtime.runOwnedCommand({executable:process.execPath,args,cwd:process.cwd(),env,logPath:path.resolve(log),timeoutMs:300000});step.result='pass';}
        catch(error){step.result='fail';step.failureType=error.name;report.result='fail';}
        finally{step.logSha256=createHash('sha256').update(readFileSync(log)).digest('hex');console.log(JSON.stringify(step));}
    }
    validateSource();assertFrozenSources(process.cwd(),baseline);report.generatorInputGuardAfter=true;report.sourcesAfter=fingerprint();assert.deepEqual(report.sourcesAfter,before);report.sourcesUnchanged=true;if(report.result==='pending')report.result='pass';
}catch(error){report.result='fail';report.failureType=error.name;report.failureCode=error.code;}
finally{report.finishedAt=new Date().toISOString();writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
if(report.result!=='pass')process.exitCode=1;
}
