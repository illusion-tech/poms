// Finite public-source parsing and Fake OS/env-file tests only. No private,
// DB, HTTP, browser, service child, container or generated runtime is started.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {continuation01 as C,continuationEnvironment} from './continuation01-profile.mjs';
import {collectVariantInputs,buildContinuationVariant,reverseVariantEdits,mapContinuationBody,variantFilename,validateVariantCallerSource,continuationVariantEntries} from './continuation01-variant.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),sha=raw=>createHash('sha256').update(raw).digest('hex');
const inputs=collectVariantInputs(),outputs=buildContinuationVariant(inputs),byFile=new Map(outputs.map(row=>[row.originalFile,row]));
const body=file=>Buffer.from(byFile.get('tools/rust-r2m/'+file).rawBase64,'base64').toString('utf8');
test('the exact final Source10 current caller and finite API/LinuxUI/Windows/native/opaque closure are pinned',()=>{
 const packet=JSON.parse(fs.readFileSync('tools/rust-r2m/acceptance-api20-source10.json'));validateVariantCallerSource(packet,inputs);assert.equal(sha(fs.readFileSync('tools/rust-r2m/acceptance-api20-source10.json')),'eeeb1e43daddcceb1978692c31c1b67737e0f8018485ef178d31da8bc63561ae');assert.equal(inputs.size,96);assert(inputs.has('tools/rust-r2m/pg-create-observer.mjs'));assert.equal(sha(inputs.get('tools/rust-r2m/pg-create-observer.mjs')),'538aa31a86bf59b18b6180577d371be31c7837492f406a763afc0575da72eaee');assert(inputs.size<128&&[...inputs.values()].reduce((n,raw)=>n+raw.length,0)<2*1024*1024);assert(continuationVariantEntries.some(file=>file.endsWith('windows-ui-runtime.mjs')));assert(![...inputs.keys()].some(file=>/recover-|qa-provision|private\//.test(file)));
});
test('all full source bodies invert exactly, all originals are still unchanged and public source dependencies retain relative paths',()=>{
 for(const row of outputs){let rolled=Buffer.from(row.rawBase64,'base64').toString('utf8');for(const edits of[...row.stages].reverse())rolled=reverseVariantEdits(rolled,edits);assert.equal(sha(Buffer.from(rolled)),row.originalRawBytesSha256);assert.equal(rolled,inputs.get(row.originalFile).toString('utf8'));assert.equal(sha(fs.readFileSync(row.originalFile)),row.originalRawBytesSha256);assert.equal(row.file,variantFilename(row.originalFile))}
});
test('every derived hash replacement names a real mapped source body, including reference-authority and source projectors',()=>{
 let pins=0;for(const row of outputs)for(const stage of row.stages)for(const edit of stage)if(edit.stage==='derived-source-pins'){pins++;const original=edit.rule.slice('derived-source-pin:'.length),target=byFile.get(original);assert(target);assert.equal(edit.from,target.originalRawBytesSha256);assert.equal(edit.to,target.rawBytesSha256)}assert(pins>=7);
});
test('only environment literals change: task/business namespace, products, dates, selectors and current build directory stay original',()=>{
 const sample="const task='poms-r2m',profile='r2m-stage',db='poms_r2m_'+backend,old='poms_r2m_rust'; const products='dist/tools/rust-r2m-ui-current/browser'; const day='2026-01-01'; const actor={created_by:'actual'};";
 const mapped=mapContinuationBody('tools/rust-r2m/fixture-example.mjs',sample).text;assert(mapped.includes("task='poms-r2m'"));assert(mapped.includes("profile='r2m-stage-continuation01'"));assert(mapped.includes("'poms_r2m_c01_'+backend"));assert(mapped.includes("'poms_r2m_c01_rust'"));assert(mapped.includes("'dist/tools/rust-r2m-ui-current/browser'"));assert(mapped.includes("day='2026-01-01'"));assert(mapped.includes("actor={created_by:'actual'}"));
 assert(body('capture-source.mjs').includes("'--','tools/rust-r2m','tools/rust-r2m-continuation01','docs/design/rust-r2m'"),'Both public original evidence and the sibling belong to the fresh capsule');
});
test('no original DB/marker/private/tool-path admission survives into generated runtime guards; old module remains unchanged',()=>{
 for(const file of['fixture-guard.mjs','managed-environment.cjs','pg-create-observer.mjs','fixture-journal.mjs','fixture-package-intent.mjs']){const s=body(file);assert(!/poms_r2m_(?:nest|rust|app)\b/.test(s));assert(!s.includes('1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5'));assert(!s.includes('/home/wangzishi/.local/share/poms-r2m/private/'));assert(s.includes('poms_r2m_c01_')||file==='fixture-journal.mjs')}
 assert.equal(sha(fs.readFileSync('tools/rust-r2m/fixture-profile.mjs')),'42a16d2a0522702a3adc5e05b42efbcbdf30e71ecb5a5adb7a0c4fe9377ec434');
});
function pureGuard(){const s=body('fixture-guard.mjs'),tree=ts.createSourceFile('guard.mjs',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),names=['validateAmbient','databaseFor','validateCluster','validateRuntime','validateMarker'],definitions=tree.statements.filter(node=>ts.isFunctionDeclaration(node)&&names.includes(node.name?.text)).map(node=>node.getText(tree).replace(/^export /,'')).join('\n');return new Function('marker','fail',definitions+'\nreturn {'+names.join(',')+'};')(C.marker,code=>{throw new Error(code)})}
test('the actual generated cluster/marker functions accept only the new literal pair/role/marker and reject the old pair',()=>{
 const g=pureGuard(),row={database:C.databases.nest,session_user:C.app,current_user:C.app,version:'150012',port:'15432',isolated:'on',database_owner:C.owner,rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolbypassrls:false,rolreplication:false,schema_create:false,public_schema_create:false,database_create:false,marker_access:false,role_memberships:0};g.validateCluster(row,C.databases.nest,false);g.validateRuntime(row,C.databases.nest);g.validateMarker([{database:C.databases.nest,marker:C.marker}],C.databases.nest);assert.equal(g.databaseFor('rust'),C.databases.rust);
 for(const old of['poms_r2m_nest','poms_r2m_rust','poms_r2m_c01_other'])assert.throws(()=>g.validateCluster({...row,database:old},old,false));assert.throws(()=>g.validateCluster({...row,session_user:C.oldApp},C.databases.nest,false));assert.throws(()=>g.validateMarker([{database:C.databases.nest,marker:C.oldMarker}],C.databases.nest));assert.throws(()=>g.databaseFor('postgres'));
 for(const key of['PGHOST','db_host','MiKrO_orm','DATABASE_URL','JWT_SECRET','NODE_OPTIONS','POMS_ENV_FILE'])assert.throws(()=>g.validateAmbient({[key]:'synthetic'}));
});
function managed(text,backend='nest',fault={}){
 let reads=0,stats=0;const filename=C.private+'/'+backend+'.env',old='/home/wangzishi/.local/share/poms-r2m/private/'+backend+'.env';
 const fileStat={isFile:()=>true,isDirectory:()=>false,isSymbolicLink:()=>!!fault.fileSymlink,mode:0o100600,dev:1,ino:2},directory={isFile:()=>false,isDirectory:()=>true,isSymbolicLink:()=>!!fault.directorySymlink,mode:0o40700,dev:1,ino:1};
 const fakeFs={constants:{O_RDONLY:0,O_NOFOLLOW:131072},lstatSync(file){stats++;assert([filename,C.private,old].includes(file));return file===C.private?directory:fileStat},realpathSync(file){return fault.realpathOld?old:file},openSync(file,flags){assert.equal(file,filename);assert(flags&131072);return 11},fstatSync(fd){assert.equal(fd,11);return fileStat},readFileSync(fd){assert.equal(fd,11);reads++;return continuationEnvironment(backend,{appPassword:'1'.repeat(64),jwtSecret:'2'.repeat(64)})},closeSync(fd){assert.equal(fd,11)}};
 const module={exports:{}};new Function('require','module','process',text)(name=>name==='node:fs'?fakeFs:name==='node:path'?path.posix:name==='dotenv'?require('dotenv'):(()=>{throw new Error('Unlisted Fake module')})(),module,{platform:'linux',cwd:()=>'/controlled-public-repository',env:{}});
 return{load:env=>module.exports.loadManagedEnvironment({mode:'managed-'+backend,cwd:'/controlled-public-repository',env}),counts:()=>({reads,stats}),filename,old};
}
test('the full generated managed loader accepts the fresh exact env using only Fake descriptors and fixed system child keys',()=>{
 const f=managed(body('managed-environment.cjs')),r=f.load({POMS_ENV_FILE:f.filename,PATH:'/fake/bin'});assert.equal(r.database,C.databases.nest);assert.equal(r.childEnv.DB_USER,C.app);assert.equal(r.envFile,f.filename);assert.deepEqual(f.counts(),{reads:1,stats:3});assert.equal(r.childEnv.PATH,'/fake/bin');
});
for(const name of['PGHOST','db_host','MiKrO_ORM_PASSWORD','DATABASE_URL','JWT_SECRET','NODE_OPTIONS'])test('generated managed loader refuses ambient '+name+' before any Fake private stat/read',()=>{const f=managed(body('managed-environment.cjs'));assert.throws(()=>f.load({POMS_ENV_FILE:f.filename,[name]:'synthetic'}));assert.deepEqual(f.counts(),{reads:0,stats:0})});
test('old and new managed loaders refuse each other before touching the foreign private file; aliases and symlinks stay refused',()=>{
 const fresh=managed(body('managed-environment.cjs'));assert.throws(()=>fresh.load({POMS_ENV_FILE:fresh.old}));assert.deepEqual(fresh.counts(),{reads:0,stats:0});
 const old=managed(inputs.get('tools/rust-r2m/managed-environment.cjs').toString('utf8'));assert.throws(()=>old.load({POMS_ENV_FILE:old.filename}));assert.deepEqual(old.counts(),{reads:0,stats:0});
 for(const fault of[{fileSymlink:true},{directorySymlink:true},{realpathOld:true}]){const f=managed(body('managed-environment.cjs'),'nest',fault);assert.throws(()=>f.load({POMS_ENV_FILE:f.filename}));assert.equal(f.counts().reads,0)}
});
test('Windows Native/driver/PS paths and environment derivation move to the same fixed sibling and new UNC object root',()=>{
 for(const file of['bridge-windows-ui.mjs','windows-native-app.mjs','windows-ui-process.ps1','windows-native-process.ps1'])assert(body(file).includes('rust-r2m-continuation01'));
 const s=body('windows-managed-environment.cjs'),tree=ts.createSourceFile('win.cjs',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),node=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='deriveRawWindowsNativeEnvironment');assert(node);const derive=new Function('assert','LINUX_OBJECT_ROOT','WINDOWS_OBJECT_ROOT','return ('+node.getText(tree)+');')(assert,C.state+'/objects/nest/server01','//wsl.localhost/Debian'+C.state+'/objects/nest/server01');
 const input=continuationEnvironment('nest',{appPassword:'1'.repeat(64),jwtSecret:'2'.repeat(64)}),derived=derive(input);assert.equal(derived,input.replace('POMS_ATTACHMENT_LOCAL_ROOT='+C.state,'POMS_ATTACHMENT_LOCAL_ROOT=//wsl.localhost/Debian'+C.state));assert.throws(()=>derive(input.replace(C.state,'/home/wangzishi/.local/share/poms-r2m')));
});
test('a stale Source10 caller, private/traversal filename or ambiguous derived hash target is refused',()=>{
 const packet=JSON.parse(fs.readFileSync('tools/rust-r2m/acceptance-api20-source10.json')),rows=packet.files??packet.reviewedSources;rows.find(row=>row.file==='tools/rust-r2m/acceptance-api-runtime.mjs').rawBytesSha256='a'.repeat(64);assert.throws(()=>validateVariantCallerSource(packet,inputs));
 for(const file of['tools/rust-r2m/private/x.mjs','tools/rust-r2m/../x.mjs','/tmp/private.mjs','tools/rust-r2m/example.test.mjs'])assert.throws(()=>variantFilename(file));
 const same=Buffer.from('export const x=1;'),hash=sha(same),ambiguous=new Map([['tools/rust-r2m/one.mjs',same],['tools/rust-r2m/two.mjs',same],['tools/rust-r2m/pinner.mjs',Buffer.from('export const pin="'+hash+'";')]]);assert.throws(()=>buildContinuationVariant(ambiguous));
});
test('materialized sibling imports and stamps its actual new profile/database/marker in a memory-only journal without querying a DB',async()=>{
 const{Fixture}=await import('../rust-r2m-continuation01/fixture.mjs'),{memoryStore}=await import('../rust-r2m-continuation01/fixture-journal.mjs'),runId='00000000-0000-4000-9000-000000000101';let queries=0;const fixture=new Fixture({async query(){queries++;assert.fail('No actual or Fake SQL is needed to construct the memory journal')}},'nest',runId,{store:memoryStore('nest',runId)});assert.equal(fixture.j.database,C.databases.nest);assert.equal(fixture.j.marker,C.marker);assert.equal(fixture.j.fixtureProfile.name,'r2m-stage-continuation01');assert.equal(fixture.j.fixtureProfile.sources.length,32);assert.equal(fixture.j.objects.length,0);assert.equal(queries,0);
});
