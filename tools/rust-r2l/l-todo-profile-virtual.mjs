// Pure child-process harness. Four proposed modules load from memory; all
// fixture13 disk bytes remain unchanged. No managed DB/environment is loaded.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {registerHooks,syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {integrationSources} from './l-todo-profile-patch.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const sources=integrationSources(),key=file=>path.resolve(file).toLowerCase(),virtual=new Map(sources.map(x=>[key(x.file),Buffer.from(x.proposed)]));
const originalRead=fs.readFileSync.bind(fs),originalStat=fs.lstatSync.bind(fs),originalOpen=fs.openSync.bind(fs);
function filename(value) {try {return typeof value==='number'?null:key(value instanceof URL?fileURLToPath(value):Buffer.isBuffer(value)?value.toString():value);}catch{return null;}}
fs.readFileSync=(file,options)=>{const bytes=virtual.get(filename(file));if(!bytes)return originalRead(file,options);const encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):Buffer.from(bytes);};
fs.lstatSync=(file,options)=>{const stat=originalStat(file,options),bytes=virtual.get(filename(file));return bytes?Object.assign(Object.create(Object.getPrototypeOf(stat)),stat,{size:options?.bigint?BigInt(bytes.length):bytes.length}):stat;};
fs.openSync=(file,flags,...args)=>{assert(typeof flags==='number'?(flags&(fs.constants.O_WRONLY|fs.constants.O_RDWR|fs.constants.O_CREAT|fs.constants.O_TRUNC|fs.constants.O_APPEND))===0:!/[wa+]/.test(flags),'Virtual SOURCE test forbids every file write');return originalOpen(file,flags,...args);};
syncBuiltinESMExports();
let databaseModuleLoaded=false;
registerHooks({load(url,context,next){if(url.includes('/database-client.mjs'))databaseModuleLoaded=true;const value=url.startsWith('file:')?virtual.get(filename(new URL(url))):null;return value?{format:'module',source:value.toString(),shortCircuit:true}:next(url,context);}});
const profile=process.argv[2];assert(['legacy40','todo42','unknown'].includes(profile));assert.equal(process.env.POMS_R2L_FIXTURE_PROFILE,profile);
if(profile==='unknown') {
    await assert.rejects(import('./l-fixture.mjs'),/Unknown L fixture profile/);assert.equal(databaseModuleLoaded,false);
    console.log(JSON.stringify({profile,checks:2,unknownRejectedBeforeDBLoader:true,DBExecuted:false,actualRuntimeCertified:false}));
} else {
    const core=await import('./fixture-core.mjs'),refs=await import('./fixture-references.mjs'),journals=await import('./fixture-journal.mjs'),{LFixture}=await import('./l-fixture.mjs');
    const policy=await import('./l-todo-profile-candidate.mjs');let checks=0;
    const yes=fn=>{fn();checks++;},no=fn=>{assert.throws(fn);checks++;};
    const id=n=>'d0000000-0000-4000-8000-'+String(n).padStart(12,'0'),runId=id(1),actor=id(2),viewer=id(3),customer=id(4),project=id(5),org=id(6),lead=id(7),follow=id(8),todo=id(9);
    const bare=journals.plannedJournal('nest',runId);yes(()=>assert.equal(core.fixtureProfile.name,profile));
    const other=policy.selectFixtureProfile(profile==='todo42'?'legacy40':'todo42');
    const wrong=profile==='todo42'?{...bare,namespace:'poms-r2l',fixtureProfile:undefined}:policy.stampProfileJournal({...bare},other);
    if(profile==='todo42')delete wrong.fixtureProfile;
    no(()=>journals.validateJournal(wrong,'nest',runId));
    const client={calls:[],async query(...args){this.calls.push(args);throw new Error('PURE_DB_DISABLED');}},store=journals.memoryStore('nest',runId),f=new LFixture(client,'nest',runId,{store});
    no(()=>new LFixture(client,'nest',runId,{store:{read:()=>wrong,write:()=>assert.fail('Wrong profile may not reach journal write')}}));
    yes(()=>assert.equal(f.fixtureProfile.name,profile));yes(()=>assert.equal(f.supportedTables.length,profile==='todo42'?42:40));yes(()=>assert.equal(f.unsupportedTables.length,profile==='todo42'?65:67));
    if(profile==='legacy40') {
        yes(()=>assert(!Object.hasOwn(bare,'fixtureProfile')));yes(()=>assert.equal(bare.namespace,'poms-r2l'));
        no(()=>core.normalize('lead',{id:lead}));no(()=>core.normalize('sales_follow_up_record',{id:follow}));
        no(()=>policy.assertProfileCertificateEnvelope({fixtureProfile:other.journalTag},core.fixtureProfile));
        yes(()=>assert.equal(f.creationEnvelope({proof:{kind:'untouched'}}).proof.kind,'untouched'));
    } else {
        const sourceEntries=f.fixtureProfile.journalTag.sources;
        yes(()=>assert.deepEqual(core.supportedTables.filter(table=>['lead','sales_follow_up_record'].includes(table)),['lead','sales_follow_up_record']));
        yes(()=>assert(!Object.values(core.identities).some(fields=>fields.some(key=>['status','is_current','row_version','version','assignee_user_id','owner_user_id'].includes(key)))));
        process.env.POMS_R2L_FIXTURE_PROFILE='legacy40';yes(()=>assert.equal(core.fixtureProfile.name,'todo42'));process.env.POMS_R2L_FIXTURE_PROFILE='todo42';
        for(const source of sources)yes(()=>assert.equal(sourceEntries.find(x=>x.file===source.file).rawBytesSha256,source.afterSha256));
        const changed=structuredClone(bare);changed.fixtureProfile.sourceSetSha256='0'.repeat(64);no(()=>journals.validateJournal(changed,'nest',runId));
        f.j.state='prepared';f.j.base={accounts:[{account:'admin',userId:actor,orgId:org},{account:'viewer',userId:viewer,orgId:org}],roles:[],orgs:[]};
        f.j.cases.push({...core.caseIdentity(runId,'base'),actors:[],projects:[],borrowedActors:[],borrowedDefinitions:[],anonymous:false});
        const rows=[['platform_user',{id:actor,username:'pure-admin'}],['platform_user',{id:viewer,username:'pure-viewer'}],['customer',{id:customer,customer_no:'pure-customer',created_by:actor}],['project',{id:project,project_no:'pure-project',created_by:actor,customer_id:customer}],['org_unit',{id:org,code:'pure-org'}]];
        const add=(table,row)=>{
            const identity=core.rowIdentity(table,row),proof={kind:'direct-committed-insert',transaction:'100',xmin:'100',beforeAbsent:true,commitAcknowledged:true};
            f.j.objects.push({table,id:row.id,caseId:'base',identity,creationProof:proof,postcondition:{independentlyVisible:true}});
            f.j.directCreates.push({state:'promoted',transaction:'100',captured:[{table,id:row.id,row,identity}]});return row;
        };
        for(const [table,row]of rows)add(table,row);f.save();
        const options={actors:[actor,viewer],projects:[project],ownedCustomerIds:[customer],ownedLeadIds:[]};
        const scope=f.defineCase('todo42.first',options);yes(()=>assert.deepEqual(scope.ownedCustomerIds,[customer]));
        no(()=>f.defineCase('todo42.first',{...options,ownedCustomerIds:[]}));no(()=>f.defineCase('todo42.dup',{...options,ownedCustomerIds:[customer,customer]}));
        no(()=>f.defineCase('todo42.unowned',{...options,ownedCustomerIds:[id(99)]}));
        const leadRow={id:lead,lead_no:'L-pure-lead',customer_id:customer,created_by:actor,owner_user_id:viewer,owner_org_id:org};
        yes(()=>{refs.assertRowReferences(f.j,'lead',leadRow,scope,[{table:'lead',id:lead,row:leadRow}]);refs.assertCaseScope(f.j,'lead',leadRow,scope);});
        no(()=>refs.assertCaseScope(f.j,'lead',{...leadRow,customer_id:actor},scope));no(()=>refs.assertCaseScope(f.j,'lead',{...leadRow,created_by:id(99)},scope));
        add('lead',leadRow);f.save();const salesScope=f.defineCase('todo42.reminders',{...options,ownedLeadIds:[lead]});
        const followup=(target,n)=>({id:id(20+n),customer_id:customer,lead_id:target==='lead'?lead:null,project_id:target==='project'?project:null,created_by:actor,owner_user_id:viewer,owner_org_id:org,supersedes_record_id:null,replaced_by_record_id:null});
        const salesTodos=[];for(const [n,target]of ['project','lead','customer'].entries()) {
            const parent=followup(target,n);yes(()=>refs.assertCaseScope(f.j,'sales_follow_up_record',parent,salesScope));add('sales_follow_up_record',parent);
            const row={id:id(30+n),source_type:'sales-follow-up-record',source_id:parent.id,todo_type:'sales-follow-up-reminder',business_domain:'sales',target_object_type:target,target_object_id:target==='project'?project:target==='lead'?lead:customer,project_id:target==='project'?project:null,assignee_user_id:viewer};
            yes(()=>{refs.assertRowReferences(f.j,'todo_item',row,salesScope,[{table:'todo_item',id:row.id,row}]);refs.assertCaseScope(f.j,'todo_item',row,salesScope);});
            add('todo_item',row);salesTodos.push(row);
            no(()=>refs.assertCaseScope(f.j,'todo_item',{...row,source_id:lead},salesScope));no(()=>refs.assertCaseScope(f.j,'todo_item',{...row,target_object_id:id(99)},salesScope));no(()=>refs.assertCaseScope(f.j,'todo_item',{...row,assignee_user_id:id(99)},salesScope));
            if(target!=='project')no(()=>refs.assertCaseScope(f.j,'todo_item',{...row,project_id:project},salesScope));
            no(()=>policy.assertPreparedSalesOnly('sales_follow_up_record',parent,f.fixtureProfile));no(()=>policy.assertPreparedSalesOnly('todo_item',row,f.fixtureProfile));
        }
        no(()=>refs.assertCaseScope(f.j,'sales_follow_up_record',{...followup('project',8),customer_id:id(99)},salesScope));
        no(()=>refs.assertCaseScope(f.j,'sales_follow_up_record',{...followup('lead',8),lead_id:project},salesScope));
        no(()=>refs.assertCaseScope(f.j,'sales_follow_up_record',{...followup('lead',8),supersedes_record_id:lead},salesScope));
        no(()=>refs.assertCaseScope(f.j,'todo_item',{...salesTodos[1],assignee_user_id:core.SEED_ACTORS[0]},{...salesScope,borrowedActors:[core.SEED_ACTORS[0]]}));
        no(()=>refs.assertRowReferences(f.j,'lead',{...leadRow,demand_description:'unknown '+id(99)},scope));
        const current=new Map(f.j.directCreates.flatMap(batch=>batch.captured.map(x=>[x.table+':'+x.id,x.row])));
        // The pure objects added after first case belong to the actual explicit
        // reminder case, not to a generic project fallback.
        for(const object of f.j.objects.filter(x=>['lead','sales_follow_up_record','todo_item'].includes(x.table)))object.caseId=object.table==='lead'?'todo42.first':'todo42.reminders';
        yes(()=>policy.assertTodo42CurrentSalesClosure(f.j,current,f.fixtureProfile));
        const changedRows=new Map(current);changedRows.set('project:'+project,{...current.get('project:'+project),customer_id:null});no(()=>policy.assertTodo42CurrentSalesClosure(f.j,changedRows,f.fixtureProfile));
        const missingRows=new Map(current);missingRows.delete('lead:'+lead);no(()=>policy.assertTodo42CurrentSalesClosure(f.j,missingRows,f.fixtureProfile));
        yes(()=>policy.assertTodo42CurrentSalesClosure(f.j,new Map(),f.fixtureProfile));
        no(()=>policy.assertProfileCertificateEnvelope({},f.fixtureProfile));
        const proof={kind:'original-sdk-proof-untouched'},envelope=f.creationEnvelope({proof});yes(()=>{assert.equal(envelope.proof,proof);policy.assertProfileCertificateEnvelope(envelope,f.fixtureProfile);});
        no(()=>policy.assertProfileCertificateEnvelope({...envelope,fixtureProfile:{...envelope.fixtureProfile,sourceSetSha256:'f'.repeat(64)}},f.fixtureProfile));
        no(()=>core.normalize('attachment',{id:id(98)}));
        yes(()=>{const graph=refs.deletionGraph(f.j,current);assert(graph.edges.some(edge=>edge.fk.source_table==='sales_follow_up_record'&&edge.fk.target_table==='lead'));assert(graph.edges.some(edge=>edge.fk.source_table==='lead'&&edge.fk.target_table==='customer'));});
        await assert.rejects(f.intent('lead',{created_by:actor},{caseId:'todo42.first'}),/source-prepared direct INSERTs only/);checks++;
        await assert.rejects(f.insert('lead',{...leadRow,id:id(91),created_by:id(99)},{caseId:'todo42.first'}),/unregistered_uuid_reference|outside/);checks++;
        await assert.rejects(f.insert('todo_item',{...salesTodos[1],id:id(92),source_id:lead},{caseId:'todo42.reminders'}),/Unproven explicit sales parent/);checks++;
        const changedScope=structuredClone(f.j);changedScope.revision++;changedScope.cases.find(x=>x.caseId==='todo42.reminders').ownedLeadIds=[];no(()=>store.write(changedScope));
        yes(()=>assert.equal(client.calls.length,0));
        const otherCustomer=id(95),otherRow=add('customer',{id:otherCustomer,customer_no:'pure-second-customer',created_by:actor});current.set('customer:'+otherCustomer,otherRow);f.save();
        const both=f.defineCase('todo42.two-customers',{...options,ownedCustomerIds:[customer,otherCustomer],ownedLeadIds:[lead]});yes(()=>assert.equal(both.salesProjectCustomers[project],customer));
        no(()=>policy.assertTodo42CandidateSalesClosure(f.j,current,'project',{...current.get('project:'+project),customer_id:otherCustomer},f.fixtureProfile));
        const currentDrift={...f.j,currentSalesRowsRequired:true,objects:f.j.objects.map(object=>({...object,row:object.table==='project'?{...current.get('project:'+project),customer_id:otherCustomer}:current.get(object.table+':'+object.id)}))};
        no(()=>policy.validateSalesAnchorScope(currentDrift,both));
        for(const [table,pk,values]of [['project',project,{project_name:'renamed'}],['lead',lead,{lead_name:'renamed'}],['customer',customer,{display_name:'renamed'}]])yes(()=>policy.assertTodo42CandidateSalesClosure(f.j,current,table,{...current.get(table+':'+pk),...values},f.fixtureProfile));
        const remapped=structuredClone(f.j);remapped.revision++;remapped.cases.find(x=>x.caseId==='todo42.two-customers').salesProjectCustomers[project]=otherCustomer;no(()=>store.write(remapped));
        // Exercise the actual proposed updateOwned method through original
        // catalog/107 scans with a fake SQL adapter. It must throw at the
        // merged locked-row graph check before allocating an xid or UPDATE.
        const {authority,incomingSql,allForeignKeysSql}=await import('./catalog-complete.mjs');
        const physical=type=>type.toLowerCase().replace(/^varchar/,'character varying').replace(/^decimal/,'numeric').replace(/^(?:int|serial)$/,'integer').replace(/^timestamptz(?:\(([0-9]+)\))?$/,(_,precision)=>`timestamp${precision===undefined?'':`(${precision})`} with time zone`);
        client.query=async(sql,args=[])=>{
            client.calls.push([sql,args]);if(['begin','rollback'].includes(sql.toLowerCase())||sql.startsWith('lock table '))return{rows:[]};
            if(sql.includes('information_schema.tables'))return{rows:authority.tables.map(x=>({table_name:x.name})).sort((a,b)=>a.table_name.localeCompare(b.table_name))};
            if(sql===incomingSql)return{rows:authority.incoming};if(sql===allForeignKeysSql)return{rows:authority.allForeignKeys};
            if(sql.includes('a.attnum::int as attnum'))return{rows:authority.tables.toSorted((a,b)=>a.name.localeCompare(b.name)).flatMap(t=>t.columns.map(c=>({table_name:t.name,name:c.name,attnum:c.attnum,udt:c.udt,nullable:c.nullable,array:c.array,sql_type:physical(c.sqlType)})))};
            if(sql.includes("c.contype='p'"))return{rows:authority.tables.toSorted((a,b)=>a.name.localeCompare(b.name)).map(t=>({table_name:t.name,name:t.primaryKey.name??t.name+'_pkey',columns:t.primaryKey.columns}))};
            const table=/from poms\."([a-z_]+)"/i.exec(sql)?.[1];if(table&&sql.includes('like any'))return{rows:[...current].filter(([k])=>k.startsWith(table+':')).map(([,row])=>({row}))};
            if(table&&sql.includes('where id=$1::uuid')){const row=current.get(table+':'+args[0]);return{rows:row?[{row,xmin:'100'}]:[]};}
            assert.fail('Unexpected fake SQL before the protected mutation: '+sql);
        };
        await assert.rejects(f.updateOwned('project',project,{customer_id:otherCustomer},'Pure attempted cross-customer drift'),/Sales project\/customer relation drifted/);checks++;
        yes(()=>assert(!client.calls.some(([sql])=>/^\s*(?:insert|update|delete|select pg_current_xact_id)/i.test(sql)),'A source-protected relation must fail before DML/xid allocation'));
    }
    yes(()=>assert.equal(databaseModuleLoaded,false));
    for(const source of sources)yes(()=>assert.equal(sha(originalRead(source.file)),source.beforeSha256,'Frozen disk SOURCE was changed'));
    console.log(JSON.stringify({profile,checks,virtualAppliedModules:sources.map(({file,beforeSha256,afterSha256})=>({file,beforeSha256,afterSha256})),frozenSourcesWritten:false,DBModuleLoaded:databaseModuleLoaded,DBExecuted:false,HTTPExecuted:false,NativeStarted:false,syntheticPureFixtureOnly:true,actualRuntimeCertified:false}));
}
if(process.argv.includes('--legacy-regression')) {
    assert.equal(profile,'legacy40');
    await import('./fixture-safety.test.mjs');
    await import('./fixture-commission-candidate.test.mjs');
    await import('./fixture-commission-safety.test.mjs');
}
