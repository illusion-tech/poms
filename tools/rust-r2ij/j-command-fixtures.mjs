import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,readdirSync,readFileSync,rmdirSync,unlinkSync,writeFileSync} from 'node:fs';
import {localRootFor,resolveObject} from './fixture-objects.mjs';
import {assertObjectIdentity} from './fixture-complete-references.mjs';

export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

/** Exact registered-object faults; no prefix adoption, recursive deletion or mocks. */
export function localObjectFault(fixture,attachmentId,kind){
    assert(['missing','directory'].includes(kind));
    const attachment=fixture.journal.objects.find(row=>row.table==='attachment'&&row.id===attachmentId);
    assert(attachment,'Attachment must already be registered by its actual upload');
    const location=attachment.identity;
    assert.equal(location.storage_provider,'local');assert.equal(location.storage_bucket,null);
    const object=fixture.journal.storageObjects.find(row=>row.provider==='local'&&row.bucket===null&&row.key===location.storage_key);
    assert(object,'Exact frozen location must already have a payload ledger');
    const file=resolveObject(localRootFor(fixture.backend),object.key),stat=lstatSync(file);
    assert(stat.isFile()&&!stat.isSymbolicLink());
    const bytes=readFileSync(file),fingerprint=sha(bytes);
    assert(object.writes.some(write=>write.sha256===fingerprint&&write.size===bytes.length));
    const fault={id:randomUUID(),kind:'j-local-object-'+kind,attachmentId,key:object.key,sha256:fingerprint,size:bytes.length,mode:stat.mode&0o777,device:String(stat.dev),inode:String(stat.ino),state:'active',restored:false,at:new Date().toISOString()};
    fixture.journal.faults.push(fault);fixture.store.write(fixture.journal);
    // Recheck immediately before the one destructive operation.
    const current=lstatSync(file);assert(current.isFile()&&!current.isSymbolicLink());
    assert.equal(current.dev,stat.dev);assert.equal(current.ino,stat.ino);assert.equal(current.size,stat.size);assert.equal(sha(readFileSync(file)),fingerprint);
    unlinkSync(file);
    if(kind==='directory'){
        mkdirSync(file,{mode:0o700});const directory=lstatSync(file);
        assert(directory.isDirectory()&&!directory.isSymbolicLink());
        fault.directory={device:String(directory.dev),inode:String(directory.ino)};fixture.store.write(fixture.journal);
    }
    return {
        receipt:{id:fault.id,kind:fault.kind,attachmentId,key:object.key,sha256:fingerprint,size:bytes.length},
        restore(){
            assert(!fault.restored);
            if(kind==='directory'){
                const directory=lstatSync(file);assert(directory.isDirectory()&&!directory.isSymbolicLink());
                assert.equal(String(directory.dev),fault.directory.device);assert.equal(String(directory.ino),fault.directory.inode);
                assert.equal(readdirSync(file).length,0,'Only the exact empty fault directory may be removed');
                rmdirSync(file);
            }else assert(!existsSync(file),'Missing-object fault unexpectedly replaced');
            writeFileSync(file,bytes,{flag:'wx',mode:fault.mode});
            const restored=lstatSync(file);assert(restored.isFile()&&!restored.isSymbolicLink());assert.equal(restored.size,fault.size);assert.equal(sha(readFileSync(file)),fault.sha256);
            fault.restored=true;fault.state='restored';fault.restoredAt=new Date().toISOString();fixture.store.write(fixture.journal);
            return {id:fault.id,restored:true,sha256:fault.sha256,size:fault.size};
        }
    };
}

export async function permissionFacts(fixture){
    const result={};
    for(const account of ['admin','viewer']){
        const actor=fixture.actor(account),role=fixture.base.roles.find(row=>row.id===actor.roleId);assert(role&&role.slot===account);
        const found=(await fixture.client.query('select id::text,role_key from poms.role where id=$1::uuid',[role.id])).rows;
        assert.equal(found.length,1);assert.equal(found[0].role_key,role.key);
        result[account]=(await fixture.client.query('select permission_key from poms.role_permission_assignment where role_id=$1::uuid order by permission_key',[role.id])).rows.map(row=>row.permission_key);
    }
    return result;
}

/** Temporary invalid native header data on one already owned, real upload. */
export async function invalidMimeFault(fixture,attachmentId){
    const registered=fixture.journal.objects.find(row=>row.table==='attachment'&&row.id===attachmentId);assert(registered);
    const rows=(await fixture.client.query('select to_jsonb(t) as row from poms.attachment t where id=$1::uuid',[attachmentId])).rows;
    assert.equal(rows.length,1);const original=rows[0].row;assertObjectIdentity(original,registered);
    const value='image/Ā',fault={id:randomUUID(),kind:'j-invalid-mime',attachmentId,original,value,state:'active',restored:false,at:new Date().toISOString()};
    assert.notEqual(original.mime_type,value);fixture.journal.faults.push(fault);fixture.store.write(fixture.journal);
    await fixture.client.query('begin');
    try{
        const current=(await fixture.client.query('select to_jsonb(t) as row from poms.attachment t where id=$1::uuid for update',[attachmentId])).rows;
        assert.equal(current.length,1);assertObjectIdentity(current[0].row,registered);assert.deepEqual(current[0].row,original);
        const changed=await fixture.client.query('update poms.attachment set mime_type=$2 where id=$1::uuid',[attachmentId,value]);assert.equal(changed.rowCount,1);
        await fixture.client.query('commit');
    }catch(error){await fixture.client.query('rollback');throw error;}
    return {
        receipt:{id:fault.id,kind:fault.kind,attachmentId,originalMime:original.mime_type,value},
        async restore(){
            assert(!fault.restored);await fixture.client.query('begin');
            try{
                const current=(await fixture.client.query('select to_jsonb(t) as row from poms.attachment t where id=$1::uuid for update',[attachmentId])).rows;
                assert.equal(current.length,1);assertObjectIdentity(current[0].row,registered);assert.deepEqual(current[0].row,{...original,mime_type:value},'Only the declared MIME fault may differ');
                const changed=await fixture.client.query('update poms.attachment set mime_type=$2 where id=$1::uuid',[attachmentId,original.mime_type]);assert.equal(changed.rowCount,1);
                const restored=(await fixture.client.query('select to_jsonb(t) as row from poms.attachment t where id=$1::uuid',[attachmentId])).rows;assert.equal(restored.length,1);assert.deepEqual(restored[0].row,original);
                await fixture.client.query('commit');
            }catch(error){await fixture.client.query('rollback');throw error;}
            fault.restored=true;fault.state='restored';fault.restoredAt=new Date().toISOString();fixture.store.write(fixture.journal);
            return {id:fault.id,restored:true,originalMime:original.mime_type,originalRowSha256:sha(Buffer.from(JSON.stringify(original)))};
        }
    };
}
