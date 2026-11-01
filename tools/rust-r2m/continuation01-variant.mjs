// Source-only finite literal variant. No private/runtime-tree discovery, env,
// pg driver, HTTP, browser, container or child process is opened here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {continuation01 as C} from './continuation01-profile.mjs';
const root=path.resolve(import.meta.dirname,'../..'),ORIGINAL='tools/rust-r2m/',VARIANT=C.variant+'/';
const require=createRequire(import.meta.url),ts=require('typescript');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const continuationVariantEntries=Object.freeze([
 'acceptance-api-runtime.mjs','acceptance-extensions.mjs','run-api-owned.mjs','capture-source.mjs',
 'ui-runtime-full.mjs','windows-ui-runtime.mjs',
 'windows-native-app.mjs','windows-native-driver.mjs','windows-native-server.mjs','windows-native-environment.mjs','windows-managed-environment.cjs','windows-native-process.ps1','windows-ui-process.ps1',
 'comparison-api-opaque.mjs','comparison-api-zip-logical.mjs','comparison-api-domain-clock.mjs'
].map(name=>ORIGINAL+name));
const JSON_FILES=new Set(['audit-schema-source.json','reference-authority.json']);
export function variantFilename(file){assert(/^tools\/rust-r2m\/[a-z0-9-]+\.(?:mjs|cjs|ps1|json)$/.test(file));assert(!file.endsWith('.test.mjs'));return VARIANT+file.slice(ORIGINAL.length)}
function syntax(file,text){return ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)}
export function sourceDependencies(file,text){
 if(file.endsWith('.ps1')||file.endsWith('.json'))return[];
 const found=new Set(),tree=syntax(file,text);
 function visit(node){if(ts.isStringLiteralLike(node)){let value=node.text;if(value.startsWith('./'))value=path.posix.normalize(path.posix.join(path.posix.dirname(file),value));if(/^tools\/rust-r2m\/[a-z0-9-]+\.(?:mjs|cjs|ps1|json)$/.test(value)&&(!value.endsWith('.json')||JSON_FILES.has(path.posix.basename(value)))){variantFilename(value);found.add(value)}}ts.forEachChild(node,visit)}visit(tree);return[...found].sort();
}
function readSource(file){
 variantFilename(file);let current=root;for(const part of file.split('/')){current=path.join(current,part);assert(!fs.lstatSync(current).isSymbolicLink())}const before=fs.lstatSync(current);assert(before.isFile()&&before.nlink===1&&before.size<=2*1024*1024);const fd=fs.openSync(current,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));try{const opened=fs.fstatSync(fd);assert(opened.dev===before.dev&&opened.ino===before.ino&&opened.nlink===1);const raw=fs.readFileSync(fd),after=fs.fstatSync(fd);for(const key of['dev','ino','size','mtimeMs','ctimeMs'])assert.equal(opened[key],after[key]);return raw}finally{fs.closeSync(fd)}
}
export function collectVariantInputs(read=readSource){
 const queue=[...continuationVariantEntries],inputs=new Map();let total=0;
 while(queue.length){const file=queue.shift();if(inputs.has(file))continue;variantFilename(file);assert(inputs.size<128,'Finite entry closure unexpectedly expanded');const raw=read(file);assert(Buffer.isBuffer(raw));total+=raw.length;assert(total<=8*1024*1024,'Refuse a runtime or large-tree source copy');const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);inputs.set(file,raw);queue.push(...sourceDependencies(file,text))}return new Map([...inputs].sort(([a],[b])=>a.localeCompare(b)));
}
const literalPairs=[
 ['1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5',C.marker],
 ['/home/wangzishi/.local/share/poms-r2m',C.state],['/r2m-private','/r2m-c01-private'],
 ['r2m_control',C.schema],['poms_r2m_nest',C.databases.nest],['poms_r2m_rust',C.databases.rust],['poms_r2m_app',C.app],
 ['poms_r2m_${','poms_r2m_c01_${'],["'poms_r2m_'","'poms_r2m_c01_'"],['"poms_r2m_"','"poms_r2m_c01_"'],
 ['tools/rust-r2m/',VARIANT],['tools\\/rust-r2m\\/','tools\\/rust-r2m-continuation01\\/'],
 ['tools\\\\rust-r2m\\\\','tools\\\\rust-r2m-continuation01\\\\'],['tools\\rust-r2m\\','tools\\rust-r2m-continuation01\\'],
 ["'tools/rust-r2m'","'tools/rust-r2m-continuation01'"],['"tools/rust-r2m"','"tools/rust-r2m-continuation01"'],
 ['tmp/rust-r2m/',C.output+'/'],['tmp\\/rust-r2m\\/','tmp\\/rust-r2m-continuation01\\/'],
 ["'tmp/rust-r2m'","'tmp/rust-r2m-continuation01'"],['"tmp/rust-r2m"','"tmp/rust-r2m-continuation01"'],
 ["'rust-r2m'","'rust-r2m-continuation01'"],['"rust-r2m"','"rust-r2m-continuation01"'],
 ["'r2m-stage'","'r2m-stage-continuation01'"],['"r2m-stage"','"r2m-stage-continuation01"'],
 // Preserve the original docs review directory while narrowing task tmp to
 // the new evidence namespace. This is a path grammar literal, not a wildcard.
 ['(?:docs\\/design|tmp)\\/rust-r2m\\/','(?:docs\\/design\\/rust-r2m|tmp\\/rust-r2m-continuation01)\\/']
].map(([from,to],index)=>Object.freeze({id:'literal-'+String(index+1).padStart(2,'0'),from,to}));
export const continuationLiteralMappings=Object.freeze(literalPairs);
function apply(text,rules,stage){
 const edits=[];let out='',index=0;
 const longest=[...rules].sort((a,b)=>b.from.length-a.from.length);
 while(index<text.length){const rule=longest.find(rule=>text.startsWith(rule.from,index));if(!rule){out+=text[index++];continue}edits.push({stage,rule:rule.id,start:index,end:index+rule.from.length,newStart:out.length,newEnd:out.length+rule.to.length,from:rule.from,to:rule.to});out+=rule.to;index+=rule.from.length}return{text:out,edits};
}
export function reverseVariantEdits(text,edits){let result=text;for(const edit of [...edits].reverse()){assert.equal(result.slice(edit.newStart,edit.newEnd),edit.to);result=result.slice(0,edit.newStart)+edit.from+result.slice(edit.newEnd)}return result}
export function mapContinuationBody(file,text){
 variantFilename(file);const mapped=apply(text,continuationLiteralMappings,'environment-literals');
 // Capture both original public source evidence and the new sibling. This
 // keeps original built UI entry provenance in the complete new capsule.
 if(file===ORIGINAL+'capture-source.mjs'){
  const from="'--','tools/rust-r2m-continuation01','docs/design/rust-r2m'",to="'--','tools/rust-r2m','tools/rust-r2m-continuation01','docs/design/rust-r2m'";assert.equal(mapped.text.split(from).length,2);
  const next=apply(mapped.text,[{id:'capture-original-public-sources-too',from,to}],'public-capsule-coverage');return{text:next.text,stages:[mapped.edits,next.edits]};
 }
 return{text:mapped.text,stages:[mapped.edits]};
}
export function buildContinuationVariant(inputs){
 assert(inputs instanceof Map&&inputs.size>0&&inputs.size<=128);const oldHashes=new Map();for(const[file,raw]of inputs){variantFilename(file);assert(Buffer.isBuffer(raw));const hash=sha(raw);if(!oldHashes.has(hash))oldHashes.set(hash,[]);oldHashes.get(hash).push(file)}
 const prepared=new Map();for(const[file,raw]of inputs){const original=raw.toString('utf8'),mapped=mapContinuationBody(file,original),hashDependencies=[];for(const token of new Set(mapped.text.match(/(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])/g)??[])){const targets=oldHashes.get(token);if(targets){assert.equal(targets.length,1,'Ambiguous source hash target');hashDependencies.push({oldHash:token,target:targets[0]})}}prepared.set(file,{original,mapped,hashDependencies})}
 const outputs=new Map(),visiting=new Set();
 const build=file=>{if(outputs.has(file))return outputs.get(file);assert(!visiting.has(file),'Cyclic derived source pin; no guessed hash replacement');visiting.add(file);const item=prepared.get(file);assert(item);const replacements=item.hashDependencies.map(({oldHash,target})=>({id:'derived-source-pin:'+target,from:oldHash,to:build(target).rawBytesSha256}));const derived=apply(item.mapped.text,replacements,'derived-source-pins'),stages=[...item.mapped.stages,derived.edits];let rolled=derived.text;for(const edits of[...stages].reverse())rolled=reverseVariantEdits(rolled,edits);assert.equal(rolled,item.original,'Every non-mapped byte must equal the full original source');const bytes=Buffer.from(derived.text),output={file:variantFilename(file),originalFile:file,bytes:bytes.length,rawBytesSha256:sha(bytes),originalBytes:inputs.get(file).length,originalRawBytesSha256:sha(inputs.get(file)),stages,originalRawBase64:inputs.get(file).toString('base64'),rawBase64:bytes.toString('base64'),nonMappedBytesInverseExact:true};outputs.set(file,output);visiting.delete(file);return output};for(const file of inputs.keys())build(file);return[...outputs.values()].sort((a,b)=>a.file.localeCompare(b.file));
}
export function validateVariantCallerSource(source,inputs){
 assert(source&&typeof source==='object');const rows=source.files??source.reviewedSources;assert(Array.isArray(rows)&&rows.length>0,'Final Source10 file pins required');
 for(const row of rows.filter(row=>inputs.has(row.file)))assert.equal(sha(inputs.get(row.file)),row.rawBytesSha256,'Source10 caller changed during variant generation');
 for(const file of[ORIGINAL+'acceptance-api-runtime.mjs',ORIGINAL+'acceptance-api.mjs',ORIGINAL+'acceptance-api-attachment-recipes.mjs'])assert(rows.some(row=>row.file===file&&row.rawBytesSha256===sha(inputs.get(file))),'Final caller source packet must explicitly cover the actual entry/recipe');
 assert(inputs.get(ORIGINAL+'acceptance-api-runtime.mjs').toString('utf8').includes('intentForGeneratedPackageItems'),'Do not generate the old Source09 runtime without the actual reservation caller');return source;
}
function publicOutputDirectory(){let current=root;for(const part of C.variant.split('/')){current=path.join(current,part);if(fs.existsSync(current))assert(fs.lstatSync(current).isDirectory()&&!fs.lstatSync(current).isSymbolicLink());else fs.mkdirSync(current)}assert.equal(fs.realpathSync(current),current);return current}
export function writeContinuationVariant({callerSourceFile='tools/rust-r2m/acceptance-api20-source10.json'}={}){
 assert.equal(process.cwd(),root);assert.equal(callerSourceFile,'tools/rust-r2m/acceptance-api20-source10.json');const before=fs.lstatSync(path.join(root,callerSourceFile));assert(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1);const callerRaw=fs.readFileSync(path.join(root,callerSourceFile)),caller=JSON.parse(callerRaw);
 const target=path.join(root,C.variant);let existing;try{existing=fs.lstatSync(target)}catch(error){if(error.code!=='ENOENT')throw error}assert(!existing,'Do not overwrite or adopt a prior variant tree');
 const inputs=collectVariantInputs();validateVariantCallerSource(caller,inputs);const files=buildContinuationVariant(inputs),directory=publicOutputDirectory();
 for(const row of files){assert.equal(path.dirname(path.join(root,row.file)),directory);assert.equal(sha(readSource(row.originalFile)),row.originalRawBytesSha256,'Original source changed before source-only materialization');const fd=fs.openSync(path.join(root,row.file),fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|(fs.constants.O_NOFOLLOW||0),0o644);try{fs.writeFileSync(fd,Buffer.from(row.rawBase64,'base64'));fs.fsyncSync(fd)}finally{fs.closeSync(fd)}}
 const manifest={kind:'R2M-continuation01-finite-environment-only-source-variant',result:'SourceCandidate-not-actual',environmentId:C.environmentId,marker:C.marker,entries:continuationVariantEntries.map(variantFilename),callerSource:{file:callerSourceFile,bytes:callerRaw.length,rawBytesSha256:sha(callerRaw)},sourceFiles:files.length,sourceBytes:files.reduce((sum,row)=>sum+row.bytes,0),mappings:continuationLiteralMappings,files,originalsUnchanged:true,fullOriginalBodiesRetained:true,privateOrRuntimeTreeCopied:false,productSourcesOrBinariesChanged:false,sourcePinHashesDerivedFromActualMappedBodies:true,actualVerified:false,G3:false,G4:false};
 const output='tools/rust-r2m/continuation01-variant-generated01.json';fs.writeFileSync(path.join(root,output),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});return{output,sourceFiles:files.length,rawBytesSha256:sha(fs.readFileSync(path.join(root,output))),environmentId:C.environmentId};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert(process.argv.length===3&&['--plan','--generate'].includes(process.argv[2]));if(process.argv[2]==='--generate')console.log(JSON.stringify(writeContinuationVariant()));else{const inputs=collectVariantInputs();console.log(JSON.stringify({sourceOnly:true,actual:false,entries:continuationVariantEntries,files:[...inputs.keys()],bytes:[...inputs.values()].reduce((sum,raw)=>sum+raw.length,0)}))}}
