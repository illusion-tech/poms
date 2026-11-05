// Root-only real continuation; no replay of the five acknowledged K52 stages.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createApiHarness } from './api-harness32.mjs';
import { connect } from './db33.mjs';
import { contextFromPublic52, createKContinuation63 } from './E/K63/request-driver63.mjs';
const runtimeEdition=process.argv[2]; assert(/^\d+$/.test(runtimeEdition??''),'Explicit final K runtime epoch required');
const h=createApiHarness(), c=await connect(), actors=JSON.parse(fs.readFileSync(h.priv+'/actors33.json')).actors;
const identity=JSON.parse(fs.readFileSync(h.priv+'/../identity.json'));
const runtime=JSON.parse(fs.readFileSync(h.priv+'/rust-api'+runtimeEdition+'-process.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(fs.readFileSync(runtime.binary)),runtime.binarySha256); assert.notEqual(runtimeEdition,'58','Pre-K56 API cannot execute corrected acceptance');
const out=h.win+'/tmp/rust-r4def/root/K71'; assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const privateOut=h.priv+'/K71';assert(!fs.existsSync(privateOut));fs.mkdirSync(privateOut,{mode:0o700});let sequence=0;
for(const key of ['full','writer','personA'])await h.login(actors[key]);
const context=contextFromPublic52(JSON.parse(fs.readFileSync(h.out+'/attachments52-before.json')),JSON.parse(fs.readFileSync(h.out+'/attachments52-result.json')),{author:h.actor('full'),handoverOperator:h.actor('writer'),environment:{namespace:'poms-r4def',apiOrigin:h.base,instanceId:identity.marker,receiptId:'tmp/rust-r4def/root/environment21/provision01.json'},tag:'k71',previousReceiptId:'tmp/rust-r4def/root/api32/attachments52-result.json'});
async function observation(kind,meta,fn){
 await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');let body;
 try {body=await fn();await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}
 body=JSON.parse(JSON.stringify(body));const label=String(++sequence).padStart(3,'0')+'-'+kind,file=privateOut+'/'+label+'.json',bytes=Buffer.from(JSON.stringify({meta,body},null,2)+'\n');fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
 const receiptId='tmp/rust-r4def/root/K71/'+label+'.json';fs.writeFileSync(h.win+'/'+receiptId,JSON.stringify({kind:'actual-independent-read-only-PG-'+kind,namespace:'poms-r4def',instanceId:identity.marker,meta,privateOriginal:{file,bytes:bytes.length,rawBytesSha256:sha(bytes)},credentialsPublished:false},null,2)+'\n',{flag:'wx'});return{body,receiptId};
}
const suite=createKContinuation63(context,{
 request:h.request,binaryRequest:h.binaryRequest,
 resolveParticipant:id=>{const key=['full','writer','personA'].find(k=>h.actor(k).id===id);assert(key);return h.actor(key);},
 observeBasis:(id,actor,meta)=>observation('basis',{...meta,actorId:actor.id},async()=>{const{rows}=await c.query('SELECT id,project_id,source_payload,payload_hash,source_hash FROM poms.project_handover_basis_snapshot WHERE id=$1 AND project_id=$2',[id,context.projectId]);assert.equal(rows.length,1);return rows[0];}),
 observeAttachment:(id,actor,meta)=>observation('attachment',{...meta,actorId:actor.id},async()=>{
  const {rows:[marker]}=await c.query('SELECT current_database() database,(SELECT count(*)::int FROM poms.poms_migrations) migrations,instance_id FROM r4def_control.marker');assert.equal(marker.instance_id,identity.marker);assert.equal(marker.migrations,94);
  const {rows:[attachment]}=await c.query('SELECT id,row_version,storage_provider,storage_bucket,storage_key,size_bytes,checksum_sha256,status,category,security_level,version_group_id,version_no,previous_attachment_id,is_latest,is_final,uploaded_by,uploaded_at,deleted_at FROM poms.attachment WHERE id=$1',[id]);assert(attachment);
  const {rows:[session]}=await c.query('SELECT id,row_version,status,operation_type,upload_mode,provider_type,storage_bucket,storage_key,size_bytes,checksum_sha256,base_attachment_id,completed_attachment_id,created_by,target_type,target_id,expires_at,uploaded_at,completed_at,aborted_at,failed_reason FROM poms.attachment_upload_session WHERE id=$1',[meta.sessionId]);assert(session);
  const {rows:activeLinks}=await c.query("SELECT id,attachment_id,target_type,target_id,relation_type,status,linked_by,linked_at,unlinked_by,unlinked_at FROM poms.attachment_link WHERE attachment_id=$1 AND status='active' ORDER BY id",[id]);
  const {rows:baseActiveLinks}=await c.query("SELECT id,attachment_id,target_type,target_id,relation_type,status,linked_by,linked_at,unlinked_by,unlinked_at FROM poms.attachment_link WHERE attachment_id=$1 AND status='active' ORDER BY id",[meta.baseAttachmentId]);
  const {rows:groupRows}=await c.query('SELECT id,COALESCE(version_group_id,id) canonical_group,row_version,version_no,previous_attachment_id,status,is_latest,is_final,storage_provider,storage_bucket,storage_key,size_bytes,checksum_sha256 FROM poms.attachment WHERE COALESCE(version_group_id,id)=$1 ORDER BY id',[attachment.version_group_id??id]);
  return{identity:{namespace:'poms-r4def',instanceId:marker.instance_id,database:marker.database,migrationCount:marker.migrations},attachment,session,activeLinks,baseActiveLinks,groupRows};
 })
});
fs.writeFileSync(out+'/before71.json',JSON.stringify({context,runtime:{pid:runtime.pid,binarySha256:runtime.binarySha256,epoch:runtimeEdition},manifest:suite.manifest()},null,2)+'\n',{flag:'wx'});
try{const result=await suite.runAll();fs.writeFileSync(out+'/result71.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({completed:result.completed,stages:result.stages,HTTPPassed:result.HTTPPassed,independentPGPassed:result.independentPGPassed,newSessionId:result.newSessionId,oldFailedSessionPUTOrCompleteReplayed:result.oldFailedSessionPUTOrCompleteReplayed}));if(!result.completed)process.exitCode=1;}finally{await c.end();}
