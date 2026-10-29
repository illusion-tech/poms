import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateSource} from './fixture-guard.mjs';
export async function setOwnedPermissions(fixture,keys,account='admin'){
    const allowed=new Set(validateSource()); assert(Array.isArray(keys)&&new Set(keys).size===keys.length&&keys.every(key=>allowed.has(key)));
    const actor=fixture.actor(account),role=fixture.base.roles.find(row=>row.id===actor.roleId);assert(role&&role.slot===account);
    const found=(await fixture.client.query('select id::text,role_key from poms.role where id=$1::uuid',[role.id])).rows;assert.equal(found.length,1);assert.equal(found[0].role_key,role.key);
    const intent={id:randomUUID(),kind:'owned-permissions',roleId:role.id,keys:[...keys],state:'started',at:new Date().toISOString()};fixture.journal.intents.push(intent);fixture.store.write(fixture.journal);
    await fixture.client.query('begin');
    try{await fixture.client.query('delete from poms.role_permission_assignment where role_id=$1::uuid',[role.id]);for(const key of keys)await fixture.client.query('insert into poms.role_permission_assignment(role_id,permission_key) values($1::uuid,$2)',[role.id,key]);await fixture.client.query('commit');}
    catch(error){await fixture.client.query('rollback');throw error;}
    intent.state='completed';fixture.store.write(fixture.journal);return {roleId:role.id,keys:[...keys]};
}
