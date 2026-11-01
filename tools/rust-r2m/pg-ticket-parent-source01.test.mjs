// Pure source/Fake-owner tests. No pg driver, process owner, env or private IO.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {ownershipIdentities} from './fixture-policy.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const source=fs.readFileSync(new URL('./pg-create-observer.mjs',import.meta.url),'utf8');
const before=JSON.parse(fs.readFileSync(new URL('./pg-ticket-parent-before-source01.json',import.meta.url),'utf8'));
const original=Buffer.from(before.original.find(x=>x.file==='tools/rust-r2m/pg-create-observer.mjs').rawBase64,'base64').toString('utf8');
const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const digest=value=>sha(JSON.stringify(canonical(value)));
const id=n=>'00000000-0000-4000-9000-'+String(n).padStart(12,'0');
const uuid=value=>{assert.match(value,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);return value};
const run=id(1),actor=id(2),ticket=id(3),config=id(4),external=id(5),caseId='m5.integration';
function compile(text){
 const ast=ts.createSourceFile('observer.mjs',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scopeFor');assert(fn);
 let body=fn.getText(ast);const statement="const { identities, rowIdentity, digest, SEED_ACTORS } = await import('./fixture-core.mjs');";
 assert.equal(body.split(statement).length,2);body=body.replace(statement,'const { identities, rowIdentity, digest, SEED_ACTORS } = injectedCore;');
 // Snapshot intent path is not selected in these ticket-parent tests.
 body=body.replace("const { resolveOwnedProjectIds } = await import('./fixture-references.mjs');",'const { resolveOwnedProjectIds } = injectedReferences;');
 const tableStatement=ast.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='observedTables'));
 assert(tableStatement);const declaration=tableStatement.getText(ast).replace(/^export /,'');
 const globals={assert,uuid,copy:structuredClone,ident:value=>'"'+value+'"',FIELDS:ownershipIdentities,SNAPSHOTS:[],OWNED_PARENT_TABLES:[],
 injectedCore:{identities:ownershipIdentities,rowIdentity:(table,row)=>Object.fromEntries(['id',...ownershipIdentities[table]].map(k=>[k,row[k]])),digest,SEED_ACTORS:[]},
 injectedReferences:{resolveOwnedProjectIds(){assert.fail('Unselected snapshot path')}},externalAuditForIntent(){assert.fail('Unselected external intent path')},auditIdentityForIntent(){assert.fail('Unselected alternate request path')},externalNullOperatorAllowed(){return false}};
 return vm.runInNewContext(declaration+'\n('+body+')',globals);
}
const scopeFor=compile(source),oldScopeFor=compile(original);
function model(){
 const actorRow={id:actor,username:'pure-owned-viewer'},ticketRow={id:ticket,identity_provider_config_id:config,external_identity_id:external,poms_user_id:actor,ticket_hash:'a'.repeat(64),status:'consumed',consumed_at:'2026-10-31T00:00:00.000Z'};
 const objects=[{table:'platform_user',id:actor,caseId:'base',identity:{id:actor,username:actorRow.username},creationProof:{kind:'Fake-preexisting-certificate'},postcondition:{independentlyVisible:true}},
 {table:'external_login_ticket',id:ticket,caseId,identity:Object.fromEntries(['id',...ownershipIdentities.external_login_ticket].map(k=>[k,ticketRow[k]])),creationProof:{kind:'Fake-preexisting-certificate'},postcondition:{independentlyVisible:true}}];
 const scope={caseId,actors:[actor],borrowedActors:[],projects:[],borrowedDefinitions:[],requestId:'r2m:'+run+':pure',anonymous:false};
 const f={runId:run,j:{state:'prepared',runId:run,objects,intents:[],borrowed:{definitions:[]}},scope(value){assert.equal(value,caseId);return scope}};
 const rows=new Map([['platform_user:'+actor,actorRow],['external_login_ticket:'+ticket,ticketRow]]),reads=[];
 const owner={async query(sql,args){assert.match(sql,/^SELECT to_jsonb\(t\) AS row FROM poms\."(?:platform_user|external_login_ticket)" t WHERE id=\$1::uuid$/);const table=/poms\."([a-z_]+)"/.exec(sql)[1];reads.push({table,id:args[0]});const row=rows.get(table+':'+args[0]);return{rows:row?[{row:structuredClone(row)}]:[]}}};
 return{f,owner,scope,rows,reads,ticketRow,ticketObject:objects[1]};
}
test('exact old6d9 rollback is the sole neededParents token; profile31 and all SQL predicates unchanged',()=>{
 const oldToken="'external_identity','external_org_source'",newToken="'external_identity','external_login_ticket','external_org_source'";
 const ast=ts.createSourceFile('new.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scopeFor');
 assert(fn.getText(ast).includes(newToken));assert.equal(source.split(newToken).length,2);assert.equal(source.replace(newToken,oldToken),original);assert.equal(sha(original),'6d9f8c9dea2c9af7cbbbd4cfa06fd452b41a84bbff8e3146f3b351beb2cdaba3');
 const profile=before.original.find(x=>x.file==='tools/rust-r2m/fixture-profile.mjs'),actual=fs.readFileSync(new URL('./fixture-profile.mjs',import.meta.url));assert.equal(sha(actual),profile.rawBytesSha256);assert.equal(sha(actual),'9ae95ce33413044329d706acb8eaa606638acd61c145c0f1dd6656f84e13a667');
});
test('actual scopeFor Fake-owner includes a previously certified consumed ticket through current immutable read; old source omitted it',async()=>{
 const m=model(),current=await scopeFor(m.f,m.owner,caseId,15,'m.http');assert(current.knownIds.includes(ticket));assert(current.knownRows.some(x=>x.table==='external_login_ticket'&&x.id===ticket));assert(m.reads.some(x=>x.table==='external_login_ticket'));
 const old=model(),previous=await oldScopeFor(old.f,old.owner,caseId,15,'m.http');assert(!previous.knownIds.includes(ticket));assert(!old.reads.some(x=>x.table==='external_login_ticket'));
});
test('mutable consumed status is not rewritten or admitted as birth; issued/current tickets use the same immutable identity',async()=>{
 const m=model();m.ticketRow.status='issued';m.ticketRow.consumed_at=null;const result=await scopeFor(m.f,m.owner,caseId,15,'m.http');assert(result.knownIds.includes(ticket));assert.equal(m.f.j.objects.length,2);assert.deepEqual(m.f.j.intents,[]);assert.deepEqual(m.f.j.objects[1].creationProof,{kind:'Fake-preexisting-certificate'});assert.equal(m.ticketRow.status,'issued');
});
for(const[name,alter]of[
 ['unowned',m=>m.f.j.objects.splice(1,1)],['foreign case',m=>{m.ticketObject.caseId='m.foreign'}],['current row absent',m=>m.rows.delete('external_login_ticket:'+ticket)]
])test(name+' ticket stays outside known rows/IDs',async()=>{const m=model();alter(m);const result=await scopeFor(m.f,m.owner,caseId,15,'m.http');assert(!result.knownIds.includes(ticket));assert(!result.knownRows.some(x=>x.table==='external_login_ticket'))});
for(const[name,alter]of[
 ['missing original birth',m=>{delete m.ticketObject.creationProof}],['missing independent visibility',m=>{m.ticketObject.postcondition.independentlyVisible=false}],['changed config identity',m=>{m.ticketRow.identity_provider_config_id=id(90)}],['changed user identity',m=>{m.ticketRow.poms_user_id=id(91)}],['changed immutable ticket hash',m=>{m.ticketRow.ticket_hash='b'.repeat(64)}]
])test(name+' rejects the actual scope snapshot',async()=>{const m=model();alter(m);await assert.rejects(()=>scopeFor(m.f,m.owner,caseId,15,'m.http'))});
test('ordinary wrong request ID / excessive intent count and unknown selector fields remain rejected',async()=>{
 for(const mutation of[intent=>{intent.selector.request_id='foreign'},intent=>{intent.expectedMax=2049},intent=>{intent.selector.status='success'}]){
  const m=model(),intent={id:id(80),caseId,table:'audit_log',state:'planned',beforeObserved:true,beforeIds:[],selector:{request_id:m.scope.requestId},expectedMax:1};mutation(intent);m.f.j.intents.push(intent);await assert.rejects(()=>scopeFor(m.f,m.owner,caseId,15,'m.http'));
 }
});
