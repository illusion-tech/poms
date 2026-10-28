// Finite expectations from the original shared Zod; no Rust implementation oracle.
export const SCHEMAS = ['ExternalOrgSourceListQuery','CreateExternalOrgSourceRequest','UpdateExternalOrgSourceRequest','ActivateExternalOrgSourceRequest','PauseExternalOrgSourceRequest','ArchiveExternalOrgSourceRequest','ExternalDepartmentMappingListQuery','ExternalDepartmentMappingReplacementItem','ReplaceExternalDepartmentMappingsRequest','MapExternalDepartmentMappingRequest','UnmapExternalDepartmentMappingRequest','IgnoreExternalDepartmentMappingRequest','RestoreExternalDepartmentMappingRequest','OrgSyncRunListQuery','CreateOrgSyncRunRequest','OrgSyncDiffItemListQuery','ApplyOrgSyncRunRequest'];
export function requestCorpus(shared, sourceHead) {
    const cases=[];
    const id='a0000000-0000-4000-8000-000000000001';
    const seed={CreateExternalOrgSourceRequest:{provider:'feishu',displayName:'部门'},UpdateExternalOrgSourceRequest:{displayName:'部门'},ExternalDepartmentMappingReplacementItem:{externalDepartmentId:'dept',externalDepartmentName:'部门'},ReplaceExternalDepartmentMappingsRequest:{items:[]},MapExternalDepartmentMappingRequest:{orgUnitId:id,expectedVersion:1},UnmapExternalDepartmentMappingRequest:{expectedVersion:1},IgnoreExternalDepartmentMappingRequest:{expectedVersion:1},RestoreExternalDepartmentMappingRequest:{expectedVersion:1}};
    const add=(schema,name,value,inputRaw=value===undefined?null:JSON.stringify(value))=>{
        let expected;
        try { const result=shared[schema+'Schema'].safeParse(inputRaw===null?undefined:JSON.parse(inputRaw));expected=result.success?{success:true,dataRaw:JSON.stringify(result.data),ownKeys:Object.keys(result.data)}:{success:false,errors:result.error.issues}; }
        catch(error){expected={success:false,schemaException:{name:error.name,message:error.message}};}
        cases.push({schema,name,inputRaw,expected});
    };
    for(const schema of SCHEMAS){
        const base=seed[schema]??{};
        for(const [name,value]of [['missing',undefined],['null',null],['array',[]],['number',1],['boolean',false],['string','x'],['empty',{}],['minimal',base],['unknown-strip',{...base,unknown:true,status:'future',offset:1}]])add(schema,name,value);
        const shape=shared[schema+'Schema'].shape;
        add(schema,'all-invalid',Object.fromEntries(Object.keys(shape).map(key=>[key,false])));
        for(const key of Object.keys(shape)){
            const variants=[['missing',undefined],['null',null],['false',false],['zero',0],['negative',-1],['fraction',0.5],['one',1],['unsafe',9007199254740992],['empty',''],['blank',' \t\n'],['text',' x '],['uuid',id],['upper-uuid',id.toUpperCase()],['nil-uuid','00000000-0000-0000-0000-000000000000'],['max-uuid','ffffffff-ffff-ffff-ffff-ffffffffffff'],['upper-max-uuid','FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF'],['bad-uuid','bad'],['enum-feishu','feishu'],['enum-active','active'],['enum-mapped','mapped'],['enum-previewed','previewed'],['enum-pending','pending'],['enum-create','create_org_unit'],['array',[]],['one-array',['2']],['two-array',['2','3']],['object',{}],['length-object',{length:0}],['length-nan',{length:{}}],['toString-object',{toString:null}],['nested',{keep:[null,false,{tokenLikeKey:'public-kept'}]}],['above','x'.repeat(256)],['astral','😀'.repeat(128)],['lone','\ud800']];
            for(const [name,value]of variants)add(schema,key+':'+name,{...base,[key]:value});
        }
    }
    for(const limit of ['1','100','101','0x10','0b10','1e2','+2',' 2 ','',' ','0','-1','1.5','NaN','Infinity',null,true,[],['2'],['2','3'],{}, {toString:null}]) add('OrgSyncRunListQuery','limit-coercion:'+JSON.stringify(limit),{limit});
    for(const provider of shared.EXTERNAL_ORG_PROVIDERS)add('CreateExternalOrgSourceRequest','provider:'+provider,{provider,displayName:' x '});
    for(const status of shared.EXTERNAL_ORG_SOURCE_STATUSES)add('ExternalOrgSourceListQuery','status:'+status,{status});
    for(const status of shared.EXTERNAL_DEPARTMENT_MAPPING_STATUSES)add('ExternalDepartmentMappingListQuery','status:'+status,{status});
    for(const reviewState of shared.EXTERNAL_DEPARTMENT_MAPPING_REVIEW_STATES)add('ExternalDepartmentMappingListQuery','reviewState:'+reviewState,{reviewState});
    for(const status of shared.ORG_SYNC_RUN_STATUSES)add('OrgSyncRunListQuery','status:'+status,{status});
    for(const action of shared.ORG_SYNC_DIFF_ACTIONS)add('OrgSyncDiffItemListQuery','action:'+action,{action});
    for(const status of shared.ORG_SYNC_DIFF_ITEM_STATUSES)add('OrgSyncDiffItemListQuery','status:'+status,{status});
    for(const syncScopes of [[],[' a ','a'],Array(32).fill('x'),Array(33).fill('x'),[''],[false,null,''],['😀'.repeat(128)],['x'.repeat(129)]])add('CreateExternalOrgSourceRequest','scopes:'+JSON.stringify(syncScopes),{provider:'feishu',displayName:'x',syncScopes});
    for(const items of [[],[{}],[{externalDepartmentId:'a',externalDepartmentName:' A ',status:'mapped'}],[{externalDepartmentId:'a',externalDepartmentName:'a'},{externalDepartmentId:'a',externalDepartmentName:'a'}],Array(1001).fill({externalDepartmentId:'a',externalDepartmentName:'a'})])add('ReplaceExternalDepartmentMappingsRequest','items:'+items.length,{items});
    for(const ids of [[],[id,id],['bad',null,false],[id.toUpperCase()]])add('ApplyOrgSyncRunRequest','approval:'+JSON.stringify(ids),{approvedDiffItemIds:ids,skippedDiffItemIds:ids});
    add('UpdateExternalOrgSourceRequest','version-only',{expectedVersion:1});add('UpdateExternalOrgSourceRequest','null-update',{providerConfigId:null});
    add('CreateExternalOrgSourceRequest','duplicate-last-win',null,'{"provider":"bad","provider":"feishu","displayName":"old","\\u0064isplayName":"new"}');
    add('CreateOrgSyncRunRequest','record-special-keys',null,'{"requestSnapshot":{"__proto__":{"publicSentinel":"kept"},"constructor":"kept","9":1,"2":2,"normal":{"__proto__":true}}}');
    add('CreateOrgSyncRunRequest','record-node-numbers',null,'{"requestSnapshot":{"unsafe":9007199254740993,"overflow":1e999,"negativeZero":-0,"nested":[1e21,1e-7]}}');
    return{formatVersion:1,sourceHead,boundary:'Original Zod direct execution only; finite request inputs, no Nest HTTP, database or UI claim',schemas:SCHEMAS,cases};
}
