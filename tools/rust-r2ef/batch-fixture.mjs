import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, openSync, closeSync, fsyncSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fail, validateSource } from './fixture-guard.mjs';
import { privateRoot } from './database-client.mjs';
import { journalStore, plannedJournal } from './fixture-journal.mjs';
import { prepare } from './fixture-core.mjs';
import { cleanup } from './fixture-cleanup.mjs';
import { executeFixture } from './fixture-run.mjs';
import { plannedExtension, prepareExtension, factsExtension, cleanupExtension } from './batch-extension.mjs';

function extensionStore(request) {
    const dir = join(privateRoot,'runs');
    if (!existsSync(dir)) mkdirSync(dir,{mode:0o700});
    const d = lstatSync(dir);
    if (!d.isDirectory() || d.isSymbolicLink() || (d.mode & 0o077) !== 0) fail('journal_directory');
    const file = join(dir,`${request.backend}-${request.runId}-ef.json`);
    function read() {
        if (!existsSync(file)) return;
        const s = lstatSync(file);
        if (!s.isFile() || s.isSymbolicLink() || (s.mode & 0o077) !== 0 || s.size > 2*1024*1024) fail('journal_file');
        const value = JSON.parse(readFileSync(file,'utf8'));
        if (value.formatVersion !== 1 || value.backend !== request.backend || value.runId !== request.runId || !['planned','prepared','cleaned'].includes(value.state)) fail('invalid_extension_journal');
        return value;
    }
    function write(value) {
        if (value.formatVersion !== 1 || value.backend !== request.backend || value.runId !== request.runId) fail('invalid_extension_journal');
        const tmp = file+'.'+randomUUID()+'.tmp'; let fd;
        try {
            fd=openSync(tmp,'wx',0o600);writeFileSync(fd,JSON.stringify(value)+'\n');fsyncSync(fd);closeSync(fd);fd=undefined;renameSync(tmp,file);
            const parent=openSync(dir,'r');try{fsyncSync(parent);}finally{closeSync(parent);}
        } finally { if(fd!==undefined)closeSync(fd);if(existsSync(tmp))unlinkSync(tmp); }
    }
    return {read,write,file};
}
export async function executeBatchFixture(client, request) {
    const permissions = validateSource();
    const baseStore = journalStore(request,privateRoot);
    if (!['prepare','cleanup','facts','permissions','setting-absent'].includes(request.action)) return executeFixture(client,request,permissions,baseStore);
    const store = extensionStore(request);
    const key=createHash('sha256').update(`${request.backend}:${request.runId}`).digest().readInt32BE(0);
    const lock=await client.query('select pg_try_advisory_lock(1380074308,$1) as locked',[key]);
    if(lock.rows[0]?.locked!==true)fail('fixture_busy');
    let transaction=false;
    try {
        let base=baseStore.read(), j=store.read();
        if(request.action==='prepare') {
            if(base?.state==='cleaned'||j?.state==='cleaned')fail('run_already_cleaned');
            if(!base){base=plannedJournal(request);baseStore.write(base);}
            if(!j){j=plannedExtension(request,base);store.write(j);}
        }
        if(!base||!j)fail('journal_not_found');
        await client.query('BEGIN');transaction=true;
        await client.query("set local statement_timeout='20s'");
        let outcome;
        if(request.action==='prepare') {
            const b=await prepare(client,request,base,permissions);
            const extra=await prepareExtension(client,request,base,j,store);
            outcome={...extra,matched:b.matched,changed:b.changed+(extra?.changed??0),state:'prepared',fixture:base,extension:j};
        } else if(request.action==='cleanup') {
            const extra=await cleanupExtension(client,request,base,j,store);
            const b=await cleanup(client,request,base);
            outcome={...b,changed:b.changed+(extra?.changed??0),extension:extra,fixture:base};
        } else if(request.action==='facts') {
            if(base.state!=='prepared'||j.state!=='prepared')fail('fixture_not_prepared');
            const extra=await factsExtension(client,request,base,j,store);
            outcome={matched:1,changed:0,state:'facts',fixture:base,extension:extra};
        } else if(request.action==='setting-absent') {
            if(base.state!=='prepared'||j.state!=='prepared'||!j.setting.originalCaptured||j.setting.absenceIntent)fail('invalid_setting_absence_intent');
            await client.query("set local time zone 'UTC'");
            const rows=(await client.query('select to_jsonb(t)::text as snapshot from poms.system_setting t where key=$1 for update',[j.setting.key])).rows;
            const current=rows[0]?.snapshot??null;
            if(rows.length>1||current!==j.setting.observed)fail('setting_changed_before_absence_intent');
            j.setting.absenceIntent={kind:'exact-snapshot-absence-and-recreate-test',before:current};store.write(j);
            let changed=0;
            if(current!==null){const deleted=await client.query('delete from poms.system_setting t where key=$1 and to_jsonb(t)=$2::jsonb',[j.setting.key,current]);if(deleted.rowCount!==1)fail('setting_absence_changed');changed=1;}
            j.setting.observed=null;store.write(j);
            outcome={matched:changed,changed,state:'setting-absent'};
        } else {
            if(base.state!=='prepared'||j.state!=='prepared')fail('fixture_not_prepared');
            if(request.permissions.some(p=>!permissions.includes(p)))fail('invalid_permissions');
            const a=base.accounts.find(a=>a.account===request.account);
            const {rows}=await client.query('select id::text,username from poms.platform_user where id=$1 for update',[a.userId]);
            if(rows.length!==1||rows[0].username!==a.username)fail('fixture_ownership');
            const r=await client.query('select id::text,role_key from poms.role where id=$1 for update',[a.roleId]);
            if(r.rows.length!==1||r.rows[0].role_key!==base.roles.find(r=>r.id===a.roleId)?.key)fail('fixture_ownership');
            const removed=await client.query('delete from poms.role_permission_assignment where role_id=$1',[a.roleId]);
            for(const p of request.permissions)await client.query('insert into poms.role_permission_assignment(role_id,permission_key) values($1,$2)',[a.roleId,p]);
            outcome={matched:1,changed:removed.rowCount+request.permissions.length,state:'permissions'};
        }
        await client.query('COMMIT');transaction=false;
        if(['prepare','cleanup'].includes(request.action)){base.state=outcome.state;j.state=outcome.state;}
        baseStore.write(base);store.write(j);
        return outcome;
    } finally {
        if(transaction)try{await client.query('ROLLBACK');}catch{/* disconnected client discarded */}
        await client.query('select pg_advisory_unlock(1380074308,$1)',[key]);
    }
}
