// Root copies only current-batch credentials; no previous private path is read.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pin } from './source-guard.mjs';
const state='/home/wangzishi/.local/share/poms-r3m';
assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r3m');
const target='/mnt/c/Users/ynh2/AppData/Local/poms-r3m',priv=target+'/private';
assert(!fs.existsSync(target));fs.mkdirSync(priv,{recursive:true,mode:0o700});
const identity=JSON.parse(fs.readFileSync(state+'/identity.json'));assert.equal(identity.namespace,'poms-r3m');
fs.copyFileSync(state+'/identity.json',target+'/identity.json',fs.constants.COPYFILE_EXCL);
fs.copyFileSync(state+'/private/owner-password',priv+'/owner-password',fs.constants.COPYFILE_EXCL);
const source=fs.readFileSync(state+'/private/nest.env','utf8');
assert(source.includes('poms_r3m_nest'));assert(source.includes('13400'));
const env=source.replace(/^PORT=13400$/m,'PORT=13410').replaceAll(state+'/objects', 'C:/Users/ynh2/AppData/Local/poms-r3m/objects');
assert(env.includes('PORT=13410'));assert(!env.includes('PORT=13400'));
fs.mkdirSync(target+'/objects',{recursive:true,mode:0o700});
fs.writeFileSync(priv+'/nest.env',env,{flag:'wx',mode:0o600});
console.log(JSON.stringify({kind:'new-batch-Windows-private-preparation',namespace:identity.namespace,onlyCurrentBatchPrivateRead:true,credentialValuesPublished:false}));
