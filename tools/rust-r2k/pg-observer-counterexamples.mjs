// Root-only real transactions through the admitted low-privilege fixture
// connection. These are observer proof tests, not business success cases.
import assert from'node:assert/strict';
export async function observerCounterexamples({fixture:f,observer:pg,attachmentId,projectId}){
 const report={kind:'actual-PG-observer-rollback-savepoint-counterexamples',cases:[]};
 const insert=async id=>{const result=await f.client.query("insert into poms.attachment_link(id,attachment_id,target_type,target_id,relation_type,status,linked_by) values($1,$2,'project',$3,'evidence','active',$4) returning id",[id,attachmentId,projectId,f.actors.admin]);assert.equal(result.rows[0].id,id);};
 for(const [index,mode]of ['outer-rollback','savepoint-rollback','savepoint-release-outer-commit'].entries()){
  const caseId='observer.'+mode,id=f.logical(),context={caseId,index:9000+index,op:'observer.transaction'};
  await f.intent('attachment_link',{attachment_id:attachmentId,target_type:'project',target_id:projectId,relation_type:'evidence'},{caseId});await pg.beginCase(context);let pendingRejected=false;
  await f.client.query('begin');try{
   if(mode!=='outer-rollback')await f.client.query('savepoint k_observer_scope');await insert(id);
   if(mode==='savepoint-rollback')await f.client.query('rollback to savepoint k_observer_scope');if(mode!=='outer-rollback')await f.client.query('release savepoint k_observer_scope');
   try{await pg.drainCase();}catch(error){assert.equal(error.code,'R2K_OBSERVER_PENDING');pendingRejected=true;}assert(pendingRejected,'No proof may be issued while an outer app transaction is active');
   await f.client.query(mode==='outer-rollback'?'rollback':'commit');
  }catch(error){await f.client.query('rollback');throw error;}
  const proofs=await pg.drainCase();assert.equal(proofs.length,mode==='savepoint-release-outer-commit'?1:0);if(proofs.length){assert.equal(proofs[0].id,id);f.recordCommittedCreates(proofs);}await f.adoptIntents();
  const actual=await f.client.query('select id from poms.attachment_link where id=$1::uuid',[id]);assert.equal(actual.rows.length,proofs.length);report.cases.push({mode,id,pendingRejected,proofs,actualRows:actual.rows.length});
 }
 report.result='pass';return report;
}
