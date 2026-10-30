import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {selectFixtureProfile,profileSourceFiles,assertProfileJournal,stampProfileJournal} from './l-todo-profile-candidate.mjs';
import {integrationSources,integrationPatch} from './l-todo-profile-patch.mjs';
import fs from 'node:fs';
test('unknown/default profile does no source-set I/O',()=>{
    let calls=0;const read=()=>{calls++;throw Error('source I/O forbidden');};assert.throws(()=>selectFixtureProfile('unknown',read));assert.equal(selectFixtureProfile(undefined,read).name,'legacy40');assert.equal(calls,0);
});
test('profile source tag is immutable and old/new journals cannot cross-read',()=>{
    const sources=profileSourceFiles.map(file=>({file,bytes:1,rawBytesSha256:'0'.repeat(64)})),todo=selectFixtureProfile('todo42',()=>sources),legacy=selectFixtureProfile();
    assert(Object.isFrozen(todo.journalTag.sources[0]));const old={namespace:'poms-r2l'},next=stampProfileJournal(old,todo);
    assertProfileJournal(next,todo);assertProfileJournal(old,legacy);assert.throws(()=>assertProfileJournal(next,legacy));assert.throws(()=>assertProfileJournal(old,todo));
});
test('inactive patch has exact four original contexts and is reversible/idempotent in memory',()=>{
    const sources=integrationSources();assert.equal(sources.length,4);assert.equal(integrationPatch(sources),fs.readFileSync('tools/rust-r2l/l-todo-profile-integration.patch','utf8'));
    const mapped=new Map(sources.map(x=>[x.file,x.proposed]));assert.deepEqual(integrationSources(file=>mapped.get(file)).map(x=>x.afterSha256),sources.map(x=>x.afterSha256));
});
for(const profile of ['legacy40','todo42','unknown'])test('actual virtual-patched module pure child: '+profile,()=>{
    const result=spawnSync(process.execPath,['tools/rust-r2l/l-todo-profile-virtual.mjs',profile],{encoding:'utf8',cwd:process.cwd(),env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,POMS_R2L_FIXTURE_PROFILE:profile},timeout:30000,maxBuffer:1024*1024});
    assert.equal(result.status,0,result.stderr+'\n'+result.stdout);const report=JSON.parse(result.stdout.trim());assert.equal(report.DBExecuted,false);assert.equal(report.actualRuntimeCertified,false);assert(report.checks>=2);
});
test('original frozen36 assertions pass under the virtual patch in default legacy40',()=>{
    const result=spawnSync(process.execPath,['tools/rust-r2l/l-todo-profile-virtual.mjs','legacy40','--legacy-regression'],{encoding:'utf8',cwd:process.cwd(),env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,POMS_R2L_FIXTURE_PROFILE:'legacy40'},timeout:30000,maxBuffer:4*1024*1024});
    assert.equal(result.status,0,result.stderr+'\n'+result.stdout);assert.match(result.stdout,/(?:pass\s+36|36 pass)/);assert.match(result.stdout,/DBExecuted.*false/);
});
