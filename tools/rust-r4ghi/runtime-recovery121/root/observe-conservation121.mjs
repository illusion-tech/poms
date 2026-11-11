// Context-free PG-owner/default-RO observation. This never grants native authority.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { C, holderFacts, json, loadCLI, mainGuard, opIntent, read, samePin, sha, verifyStates, writeWx } from './facts121.mjs';
import { inspectOriginalPG121 } from './resume-original-pg121.mjs';
const quote=s=>'"'+s.replaceAll('"','""')+'"';

export async function catalog121(c, expectedTables = 139) {
  const tables = (await c.query(`SELECT c.relname name,c.oid::text oid,COALESCE((SELECT array_agg(a.attname::text ORDER BY k.n) FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum WHERE i.indrelid=c.oid AND i.indisprimary),'{}'::text[]) pk,
    (SELECT array_agg(a.attname::text ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) columns FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relkind='r' ORDER BY c.relname`)).rows;
  assert.equal(tables.length, expectedTables, 'Exact registered table inventory required');
  const foreignKeys = (await c.query(`SELECT x.conname name,child.relname child,parent.relname parent,
    (SELECT array_agg(a.attname::text ORDER BY k.n) FROM unnest(x.conkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=x.conrelid AND a.attnum=k.attnum) "childColumns",
    (SELECT array_agg(a.attname::text ORDER BY k.n) FROM unnest(x.confkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=x.confrelid AND a.attnum=k.attnum) "parentColumns",x.confdeltype "deleteRule"
    FROM pg_constraint x JOIN pg_class child ON child.oid=x.conrelid JOIN pg_class parent ON parent.oid=x.confrelid JOIN pg_namespace n ON n.oid=child.relnamespace JOIN pg_namespace pn ON pn.oid=parent.relnamespace WHERE x.contype='f' AND n.nspname='poms' AND pn.nspname='poms' ORDER BY child.relname,x.conname`)).rows;
  const externalForeignKeys = (await c.query(`SELECT x.oid::text oid,x.conname name,n.nspname "childSchema",child.relname child,parent.relname parent,pg_get_constraintdef(x.oid,true) definition
    FROM pg_constraint x JOIN pg_class child ON child.oid=x.conrelid JOIN pg_class parent ON parent.oid=x.confrelid JOIN pg_namespace n ON n.oid=child.relnamespace JOIN pg_namespace pn ON pn.oid=parent.relnamespace
    WHERE x.contype='f' AND pn.nspname='poms' AND n.nspname<>'poms' ORDER BY n.nspname,child.relname,x.conname`)).rows;
  const normative = {};
  const queries = {
    relations: "SELECT c.oid::text oid,n.nspname schema,c.relname name,c.relkind,pg_get_userbyid(c.relowner) owner,c.relacl::text acl,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') AND c.relkind IN ('r','p','S','v','m') ORDER BY n.nspname,c.relname",
    schemas: "SELECT oid::text oid,nspname,pg_get_userbyid(nspowner) owner,nspacl::text acl FROM pg_namespace WHERE nspname IN ('poms','r4ghi_control') ORDER BY nspname",
    columns: "SELECT n.nspname schema,c.relname table_name,a.attnum,a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,a.attidentity,a.attgenerated,a.attacl::text acl,pg_get_expr(d.adbin,d.adrelid) default_expr FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname IN ('poms','r4ghi_control') AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped ORDER BY n.nspname,c.relname,a.attnum",
    constraints: "SELECT x.oid::text oid,n.nspname schema,c.relname table_name,x.conname,pg_get_constraintdef(x.oid,true) definition FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') ORDER BY n.nspname,c.relname,x.conname",
    indexes: "SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('poms','r4ghi_control') ORDER BY schemaname,tablename,indexname",
    triggers: "SELECT t.oid::text oid,n.nspname schema,c.relname table_name,t.tgname,pg_get_triggerdef(t.oid,true) definition,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') AND NOT t.tgisinternal ORDER BY n.nspname,c.relname,t.tgname",
    functions: "SELECT p.oid::text oid,n.nspname schema,p.proname,pg_get_function_identity_arguments(p.oid) arguments,pg_get_userbyid(p.proowner) owner,p.proacl::text acl,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('poms','r4ghi_control') AND p.prokind='f' ORDER BY n.nspname,p.proname,arguments",
    roles: "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolconfig FROM pg_roles WHERE rolname IN ('poms_r0e_owner','poms_r4ghi_native_app','poms_r4ghi_rust_app') ORDER BY rolname",
    memberships: "SELECT a.rolname member,b.rolname granted,r.admin_option FROM pg_auth_members r JOIN pg_roles a ON a.oid=r.member JOIN pg_roles b ON b.oid=r.roleid WHERE a.rolname IN ('poms_r0e_owner','poms_r4ghi_native_app','poms_r4ghi_rust_app') ORDER BY a.rolname,b.rolname",
  };
  for (const [key, sql] of Object.entries(queries)) normative[key] = (await c.query(`SELECT row_to_json(x)::text raw FROM (${sql}) x`)).rows.map(r => r.raw);
  const sequences = [];
  for (const sequence of (await c.query("SELECT n.nspname schema,c.relname name,c.oid::text oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') AND c.relkind='S' ORDER BY n.nspname,c.relname")).rows) {
    sequences.push({ ...sequence, ...(await c.query(`SELECT last_value::text value,is_called FROM ${quote(sequence.schema)}.${quote(sequence.name)}`)).rows[0] });
  }
  return { tables, foreignKeys, externalForeignKeys, normative, sequences };
}

export function objects121(database) {
  assert(C.databases.includes(database));const root=C.private.slice(0,-'/private'.length)+'/objects/'+(database===C.databases[0]?'native':'rust'),files=[],directories=[];
  if(!fs.existsSync(root))return{root,existed:false,files,directories};assert.equal(fs.realpathSync(root),root);
  function walk(dir){const st=fs.lstatSync(dir);assert(st.isDirectory()&&!st.isSymbolicLink());directories.push(path.relative(root,dir));for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,e.name),s=fs.lstatSync(file);assert(!s.isSymbolicLink());if(s.isDirectory())walk(file);else{assert(s.isFile()&&s.nlink===1);const b=fs.readFileSync(file);files.push({key:path.relative(root,file),file,bytes:b.length,sha256:sha(b)});}}}
  walk(root);return{root,existed:true,files:files.sort((a,b)=>a.key.localeCompare(b.key)),directories:directories.sort()};
}
export function checkedRows121(table) {
  const b=read({file:table.file,rawBytesSha256:table.rawBytesSha256}),rows=b.toString().split('\n').filter(Boolean).map(l=>JSON.parse(l));assert.equal(rows.length,table.count);
  for(const r of rows){assert.equal(sha(r.raw),r.sha256);assert(/^[0-9]+$/.test(r.xmin));assert(Array.isArray(r.key));assert(r.cells&&typeof r.cells==='object');}
  assert.equal(sha(rows.map(r=>r.raw).join('\n')),table.logicalRowsSha256);return{bytes:b,rows};
}
export function equalSnapshots121(expected,observed) {
  assert.equal(observed.marker,C.marker);assert.equal(expected.marker,C.marker);assert.deepEqual(Object.keys(observed.databases),C.databases);assert.deepEqual(Object.keys(expected.databases),C.databases);
  const counts={};for(const database of C.databases){const a=expected.databases[database],b=observed.databases[database];assert.deepEqual(b.meta,a.meta,database+' meta/sequence');assert.deepEqual(Object.keys(b.tables),Object.keys(a.tables));assert.equal(Object.keys(b.tables).length,139);let count=0;
    for(const name of Object.keys(a.tables)){const x=a.tables[name],y=b.tables[name];for(const k of['count','pk','columns','rawBytesSha256','logicalRowsSha256'])assert.deepEqual(y[k],x[k],database+'.'+name+'.'+k);const xr=checkedRows121(x),yr=checkedRows121(y);assert.deepEqual(yr.bytes,xr.bytes,database+'.'+name+' raw/xmin/cells');count+=yr.rows.length;}
    counts[database]=count;assert.deepEqual(observed.objects[database],expected.objects[database],database+' objects');
  }return{counts,tablesPerDB:139,allRawXminMetaSequencesObjectsEqual:true,crossDatabaseAtomicityClaimed:false};
}
export async function guardClient121(c,database) {
  assert(C.databases.includes(database));assert.equal((await c.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only,'on');assert.equal((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'on');
  const r=(await c.query("SELECT current_database() db,current_user usr,current_setting('port') port,current_setting('server_version_num') version,current_setting('poms.r0e_isolated',true) isolated,current_setting('TimeZone') timezone,(SELECT oid::text FROM pg_database WHERE datname=current_database()) oid")).rows[0];
  assert.equal(r.db,database);assert.equal(r.usr,'poms_r0e_owner');assert.equal(r.port,'15432');assert.equal(r.version,'150012');assert.equal(r.isolated,'on');assert.equal(r.timezone,'Etc/GMT-8');assert.equal(r.oid,C.oids[C.databases.indexOf(database)]);
  assert.deepEqual((await c.query('SELECT instance_id::text,namespace,source_base FROM r4ghi_control.marker')).rows,[{instance_id:C.marker,namespace:C.namespace,source_base:C.base}]);assert.equal((await c.query('SELECT count(*)::int count FROM poms.poms_migrations')).rows[0].count,98);return r;
}
async function capture121(Client,p,label) {
  const dir=p.outputDirectory+'/'+label;fs.mkdirSync(dir,{mode:0o700});const password=fs.readFileSync(C.private+'/owner-password','utf8');assert(/^[a-f0-9]{64}$/.test(password));
  const result={schemaVersion:1,label,marker:C.marker,epoch:'runtime-recovery121-A',run:p.nonce,capturedAt:new Date().toISOString(),databases:{}};
  for(const database of C.databases){const c=new Client({host:'127.0.0.1',port:25434,user:'poms_r0e_owner',password,database,application_name:'runtime121-A-readonly',connectionTimeoutMillis:8000,query_timeout:45000,options:'-c default_transaction_read_only=on -c statement_timeout=45000 -c lock_timeout=10000'});await c.connect();
    try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await guardClient121(c,database);const meta=await catalog121(c,139),tables={};
      for(const t of meta.tables){const pk=t.pk.length?`json_build_array(${t.pk.map(k=>`t.${quote(k)}::text`).join(',')})::text`:'NULL::text';const needed=[...new Set([...t.pk,...meta.foreignKeys.filter(f=>f.child===t.name).flatMap(f=>f.childColumns),...meta.foreignKeys.filter(f=>f.parent===t.name).flatMap(f=>f.parentColumns)])];const cells=needed.length?`json_build_object(${needed.flatMap(k=>["'"+k+"'",`t.${quote(k)}::text`]).join(',')})::text`:"'{}'::text";
        const rows=(await c.query(`SELECT row_to_json(t)::text raw,t.xmin::text xmin,${pk} key,${cells} cells FROM poms.${quote(t.name)} t ORDER BY ${t.pk.length?t.pk.map(k=>`t.${quote(k)}`).join(','):'row_to_json(t)::text'}`)).rows;
        const values=rows.map(r=>({key:r.key===null?['no-pk:'+sha(r.raw)]:JSON.parse(r.key),cells:JSON.parse(r.cells),raw:r.raw,sha256:sha(r.raw),xmin:r.xmin})),bytes=Buffer.from(values.map(v=>JSON.stringify(v)).join('\n')+(values.length?'\n':'')),name=database+'-'+t.name+'.jsonl';
        const pin=writeWx(dir,name,bytes);tables[t.name]={file:pin.file,count:rows.length,pk:t.pk,columns:t.columns,rawBytesSha256:pin.rawBytesSha256,logicalRowsSha256:sha(values.map(r=>r.raw).join('\n'))};}
      result.databases[database]={meta,tables};await c.query('COMMIT');
    }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{await c.end();}
  }
  result.objects=Object.fromEntries(C.databases.map(d=>[d,objects121(d)]));const manifest=writeWx(p.outputDirectory,label+'.json',result);return{snapshot:result,manifest};
}
export async function observe121() {
  const inv=loadCLI('pg-observe'),{p}=inv;assert.equal(process.platform,'linux');const holder=holderFacts(p),pg=json(p.pgStart);assert.equal(pg.kind,'actual-runtime121-A-original-PG-resumed');assert.equal(pg.after.id,C.container);assert.equal(pg.after.image,C.image);assert.equal(pg.after.volume,C.volume);assert.equal(pg.after.volumeSource,C.volumeRoot);assert.equal(pg.after.running,true);assert.equal(pg.APIStarted,false);assert.equal(pg.businessDML,false);samePin(pg.holder,p.holder);assert.equal(pg.bootId,holder.bootId);assert.deepEqual(inspectOriginalPG121(),pg.after);
  const baseline=json(p.baseline);assert.equal(baseline.epoch,'g2-business15');assert.equal(baseline.run,'main01');for(const db of C.databases){assert.equal(Object.keys(baseline.databases[db].tables).length,139);for(const t of Object.values(baseline.databases[db].tables))checkedRows121(t);}const intent=opIntent(inv);
  try{const req=createRequire(C.mirror+'/package.json'),{Client}=createRequire(req.resolve('@mikro-orm/postgresql'))('pg');const a=await capture121(Client,p,'observation01'),b=await capture121(Client,p,'observation02'),first=equalSnapshots121(baseline,a.snapshot),second=equalSnapshots121(baseline,b.snapshot),between=equalSnapshots121(a.snapshot,b.snapshot);holderFacts(p);verifyStates(p);assert.deepEqual(inspectOriginalPG121(),pg.after);
    const result=writeWx(p.outputDirectory,'complete.json',{kind:'actual-runtime121-A-original-data-conserved',mode:p.mode,input:inv.input,RootReview:inv.review,intent,baseline:p.baseline,holder:p.holder,originalPGStart:p.pgStart,observations:[a.manifest,b.manifest],first,second,between,defaultReadOnly:true,transactionReadOnly:true,newAPIStarted:false,nativeAuthorityGranted:false,businessDML:false,baselineReset:false,backupRestore:false});console.log(JSON.stringify({result,nativeAuthorityGranted:false,newAPIStarted:false}));
  }catch(e){writeWx(p.outputDirectory,'partial.json',{kind:'runtime121-A-observation-preserve',input:inv.input,RootReview:inv.review,intent,message:e.message,baselineModified:false,blindRetryForbidden:true});throw e;}
}
mainGuard(import.meta.url,observe121);
