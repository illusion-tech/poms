import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {ident} from './catalog-complete.mjs';
import {identityFields,assertObjectIdentity} from './fixture-complete-references.mjs';

const definitionInputs=[
    {id:'68000000-0000-4000-8000-000000000001',approval_scenario_key:'handover-confirmation',summary_package_key:'contract-handover-summary'},
    {id:'68000000-0000-4000-8000-000000000002',approval_scenario_key:'project-handover',summary_package_key:'project-handover-confirmation'}
];
const hash=row=>createHash('sha256').update(JSON.stringify(row)).digest('hex');

export async function prepareProjections(fixture){
    if(fixture.journal.targets)return fixture.journal.targets;
    const client=fixture.client,run=fixture.runId,actor=fixture.base.accounts[0].userId;
    const definitions=[];
    for(const expected of definitionInputs){
        const {rows}=await client.query('select to_jsonb(t) as row from poms.approval_summary_package_definition t where id=$1::uuid',[expected.id]);
        assert.equal(rows.length,1,'Original seeded summary definition missing');
        const row=rows[0].row;
        for(const [key,value] of Object.entries({...expected,status:'active',projection_level:'handover-confirmation',export_policy:'handover-controlled',field_rule_version:'e2e-v1'}))assert.equal(row[key],value,'Original definition identity');
        definitions.push(row);
        fixture.journal.readOnlyReferences.push({table:'approval_summary_package_definition',id:row.id,sha256:hash(row),row});
    }
    const source=await client.query("select code from poms.dictionary_item where domain='lead-source' and status='active' order by sort_order,code limit 1");
    const follow=await client.query("select code from poms.dictionary_item where domain='sales-follow-up-type' and status='active' order by sort_order,code limit 1");
    assert.equal(source.rows.length,1,'Original lead-source dictionary seed missing');
    assert.equal(follow.rows.length,1,'Original follow-up-type dictionary seed missing');
    const id=Object.fromEntries(['customer','lead','project','contract','followUp','handover','term','contractSummary','handoverSummary'].map(key=>[key,randomUUID()]));
    const prefix='r2ij_'+run.replaceAll('-','');
    const common={created_by:actor,updated_by:actor};
    const records=[
        ['customer',{id:id.customer,customer_no:prefix+'_c',display_name:'R2IJ customer '+run,status:'active',...common}],
        ['lead',{id:id.lead,lead_no:prefix+'_l',lead_name:'R2IJ lead '+run,customer_id:id.customer,customer_name:'R2IJ customer '+run,status:'registered',source_code:source.rows[0].code,...common}],
        ['project',{id:id.project,project_no:prefix+'_p',project_name:'R2IJ project '+run,status:'active',current_stage:'assessment',customer_id:id.customer,source_lead_id:id.lead,...common}],
        ['contract',{id:id.contract,project_id:id.project,contract_no:prefix+'_ct',status:'draft',...common}],
        ['sales_follow_up_record',{id:id.followUp,customer_id:id.customer,lead_id:id.lead,project_id:id.project,follow_up_type:follow.rows[0].code,occurred_at:'2020-01-01T00:00:00.000Z',summary:'R2IJ follow-up '+run,outcome:'progress',status:'active',...common}],
        ['contract_term_snapshot',{id:id.term,contract_id:id.contract,effective_at:'2020-01-01T00:00:00.000Z',snapshot_status:'active',version:1,created_by:actor}],
        ...definitions.map((definition,index)=>['approval_summary_snapshot',{
            id:index===0?id.contractSummary:id.handoverSummary,target_type:index===0?'project':'project-handover',target_id:index===0?id.project:id.handover,
            approval_scenario_key:definition.approval_scenario_key,summary_package_id:definition.id,summary_package_key:definition.summary_package_key,
            projection_level:definition.projection_level,export_policy:definition.export_policy,business_status_at_snapshot:'draft',status:'active',...common
        }]),
        ['project_handover',{id:id.handover,project_id:id.project,contract_summary_snapshot_id:id.contractSummary,effective_handover_baseline_snapshot_id:id.term,summary_snapshot_id:id.handoverSummary,status:'draft',...common}]
    ];
    // All exact IDs and identities are durable before the first INSERT. A
    // rolled-back plan remains a valid missing-row cleanup journal.
    for(const [table,row] of records){
        const identity=Object.fromEntries(identityFields[table].map(key=>[key,row[key]??null]));
        fixture.register(table,row.id,identity);
    }
    fixture.journal.targets={customer:id.customer,lead:id.lead,project:id.project,contract:id.contract,'sales-follow-up':id.followUp,'project-handover':id.handover};
    fixture.store.write(fixture.journal);
    await client.query('begin');
    try{
        for(const [table,row] of records){
            const fields=Object.keys(row),values=Object.values(row);
            const result=await client.query(`insert into poms.${ident(table)} (${fields.map(ident).join(',')}) values (${values.map((_,i)=>'$'+(i+1)).join(',')}) returning to_jsonb(${ident(table)}.*) as row`,values);
            const object=fixture.journal.objects.find(o=>o.table===table&&o.id===row.id);
            assertObjectIdentity(result.rows[0].row,object);
        }
        await client.query('commit');
        fixture.journal.intents.push({kind:'projections-created',ids:Object.values(id),scope:'Synthetic valid FK scaffolding/existence views only; no R3/R4 business command or handover completion'});
        fixture.store.write(fixture.journal);
        return fixture.journal.targets;
    }catch(error){await client.query('rollback');throw error;}
}
