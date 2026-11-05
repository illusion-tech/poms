// Root-only access to the fresh isolated acceptance databases. Never uses old private state.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
export const root='/home/wangzishi/projects/poms-rust-r4def';
export const win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
export const priv='/home/wangzishi/.local/share/poms-r4def/private';
const require=createRequire(root+'/package.json');
export const {Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
export async function connect(backend='rust') {
 assert.equal(process.platform,'linux');assert(['rust','native'].includes(backend));
 const identity=JSON.parse(fs.readFileSync(priv+'/../identity.json'));assert.equal(identity.namespace,'poms-r4def');
 const password=fs.readFileSync(priv+'/owner-password','utf8');assert(/^[a-f0-9]{64}$/.test(password));
 const c=new Client({host:'127.0.0.1',port:25433,database:'poms_r4def_'+backend,user:'poms_r0e_owner',password});await c.connect();
 const {rows:[marker]}=await c.query('SELECT * FROM r4def_control.marker');assert.equal(marker.instance_id,identity.marker);return c;
}
