// Named273 SDK engine. Original S6 engine is a read-only utility dependency.
// Formal Git authority belongs to the mandatory guarded wrapper; this engine
// always enforces its real full-source capability immediately before SDK sync.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,unlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {assertSnapshotSourceAccess} from '../rust-r1b/273/source-access273.mjs';
import {normalizePath,resolveJar,resolveJava,safeChild,sha256,treeDifferences,treeManifest,validateFullSpecification,walkTree} from './shared-api-client.mjs';
import {repairGeneratedModels} from './repair-generated-models.mjs';
const readText=file=>readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const protectedFiles=['libs/shared/api-spec/openapi.json','tools/openapi/typescript-angular.config.json','openapitools.json','package.json','pnpm-lock.yaml','.gitattributes'];
const metadataFiles=['project.json','tsconfig.json','tsconfig.lib.json'];
function protectedSources(root,baseline){
 assert.equal(baseline.formatVersion,1);assert.equal(baseline.generator.version,'7.20.0');assert.equal(baseline.spec.file,'libs/shared/api-spec/openapi.json');assert.equal(baseline.client.directory,'libs/shared/api-client');
 assert.deepEqual(baseline.protectedSources.map(row=>row.file),protectedFiles);assert.deepEqual(baseline.client.metadata,metadataFiles);
 for(const row of baseline.protectedSources)assert.equal(sha256(readText(safeChild(root,row.file))),row.sha256,'273 protected input changed');
 const config=JSON.parse(readText(safeChild(root,'tools/openapi/typescript-angular.config.json')));
 assert.equal(config.generatorName,'typescript-angular');assert.equal(config.inputSpec,baseline.spec.file);assert.equal(config.outputDir,baseline.client.directory);assert.equal(config.additionalProperties.ngVersion,'21.0.0');
 assert.equal(JSON.parse(readText(safeChild(root,'openapitools.json')))['generator-cli'].version,'7.20.0');
 validateFullSpecification(JSON.parse(readText(safeChild(root,baseline.spec.file))),baseline);
}
const sourceSnapshot=(root,baseline)=>[...protectedFiles,...metadataFiles.map(file=>baseline.client.directory+'/'+file)].map(file=>({file,sha256:sha256(readFileSync(safeChild(root,file)))}));
export function assertPreSyncSources273(root,baseline,sourceAccess){
 assertSnapshotSourceAccess(sourceAccess,root);protectedSources(root,baseline);sourceAccess.assertLiveMatchesSnapshots();
}
function javaEnvironment(env){const result={...env};for(const name of ['JAVA_TOOL_OPTIONS','_JAVA_OPTIONS','JDK_JAVA_OPTIONS','JAVA_OPTS','CLASSPATH'])delete result[name];return result;}
function actualGenerate(root,directory,java,jar,env){
 const args=['-jar',jar,'generate','-c','tools/openapi/typescript-angular.config.json','-o',directory,'--skip-validate-spec'];
 const result=spawnSync(java.executable,args,{cwd:root,env:javaEnvironment(env),encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:16*1024*1024});
 assert(!result.error&&result.status===0,'OpenAPI Generator failed; SDK has not been synchronized');
 return{stdoutSha256:sha256(result.stdout??''),stderrSha256:sha256(result.stderr??'')};
}
function validateTree(directory){
 const files=walkTree(directory);assert.equal(readText(safeChild(directory,'.openapi-generator/VERSION')).trim(),'7.20.0');
 const listed=readText(safeChild(directory,'.openapi-generator/FILES')).trim().split('\n');for(const file of listed)safeChild(directory,file);
 assert.equal(new Set(listed).size,listed.length);assert(!metadataFiles.some(file=>files.includes(file)));
 assert.deepEqual(files,[...listed,'.openapi-generator/FILES','.openapi-generator/VERSION'].sort());
}
export function runClient273(options){
 assert(options&&typeof options==='object'&&!Array.isArray(options));
 const allowed=['root','mode','baseline','sourceAccess','jar','java','env','temporaryRoot'];
 assert(Object.keys(options).every(key=>allowed.includes(key)),'Unknown273 engine option; optional/fake guard or generator hooks are forbidden');
 const{root,mode,baseline,sourceAccess,jar,java,env=process.env,temporaryRoot=tmpdir()}=options;
 assert(typeof root==='string'&&path.isAbsolute(root));assert(['--write','--check'].includes(mode));assert(baseline);assertSnapshotSourceAccess(sourceAccess,root);
 assert.equal(process.versions.node.split('.')[0],'24');
 assertPreSyncSources273(root,baseline,sourceAccess);
 const target=safeChild(root,baseline.client.directory),initialTarget=treeManifest(target,{timestamps:true}),inputs=sourceSnapshot(root,baseline);
 const javaInfo=resolveJava({executable:java,env}),jarFile=resolveJar(root,baseline,{jar,env});
 const directory=mkdtempSync(path.join(temporaryRoot,'poms-sdk273-'));
 assert(path.resolve(directory).startsWith(path.resolve(temporaryRoot)+path.sep)&&path.basename(directory).startsWith('poms-sdk273-'),'Owned temporary directory required');
 try{
  const generatorOutput=actualGenerate(root,directory,javaInfo,jarFile,env);validateTree(directory);
  const modelRepairs=repairGeneratedModels(directory,JSON.parse(readText(safeChild(root,baseline.spec.file))));
  for(const file of metadataFiles)copyFileSync(safeChild(target,file),path.join(directory,file));
  normalizePath(directory);const expected=treeManifest(directory,{normalized:true}),actual=treeManifest(target,{normalized:true}),differences=treeDifferences(expected,actual);
  assert.deepEqual(sourceSnapshot(root,baseline),inputs,'273 protected inputs or managed metadata moved');
  assert.deepEqual(treeManifest(target,{timestamps:true}),initialTarget,'JAR/repair must not write repository SDK');
  // Mandatory real capability guard, after ALL JAR/repair/normalize work and
  // directly before the first possible repository SDK write OR delete.
  // There is no optional callback, flag, await, or generator hook in this gap.
  assertPreSyncSources273(root,baseline,sourceAccess);
  if(mode==='--write'){
   for(const file of walkTree(directory)){
    if(metadataFiles.includes(file))continue;const destination=safeChild(target,file,{allowMissing:true}),raw=readFileSync(safeChild(directory,file));
    if(!existsSync(destination)||!readFileSync(destination).equals(raw)){mkdirSync(path.dirname(destination),{recursive:true});safeChild(target,file,{allowMissing:true});writeFileSync(destination,raw);}
   }
   const names=new Set(expected.map(row=>row.file));for(const file of walkTree(target))if(!names.has(file)&&!metadataFiles.includes(file))unlinkSync(safeChild(target,file));
   assert.deepEqual(treeDifferences(expected,treeManifest(target,{normalized:true})),[]);
   assert.deepEqual(sourceSnapshot(root,baseline),inputs,'Synchronization changed protected input or metadata');
  }
  assertPreSyncSources273(root,baseline,sourceAccess);
  return{kind:'actual273-SDK-engine-with-mandatory-full-source-presync',result:mode==='--check'&&differences.length?'different':'pass',mode,sourceHead:baseline.sourceHead,nodeVersion:process.versions.node,spec:{file:baseline.spec.file,paths:baseline.spec.paths.length,operations:baseline.spec.operations.length,schemas:baseline.spec.schemas.length},generator:{version:'7.20.0',jarSha256:baseline.generator.jarSha256,javaVersion:javaInfo.version,directJar:true,...generatorOutput},modelRepairs,clientFiles:expected.length,manifestSha256:sha256(JSON.stringify(expected)),files:expected,differences,clientWritten:mode==='--write',metadataPreserved:true,mandatoryFullSourcePreSync:true,gitAuthority:'not-asserted-by-engine; formal-wrapper-responsibility'};
 }finally{rmSync(directory,{recursive:true,force:true});}
}
