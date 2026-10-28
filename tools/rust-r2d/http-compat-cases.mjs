
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const operationNames=Object.freeze(['profile','update-profile','owner-reference','list','create','detail','update','activate','deactivate','assign-roles','assign-org-memberships']);
export const requiredGroups=Object.freeze(['business','guards','dto-rejected-wire','parser','uri','head','profile','owner-any5','assignments','sort','encoding','id-spelling','session','regression']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function frozenGolden(){return JSON.parse(readFileSync(new URL('./users-golden.json',import.meta.url),'utf8'));}
// Original body-parser2.2.2 strict JSON entry, independently exercised with
// Readable inputs on the pinned Node24 runtime. These finite raw roots never
// reach guards/DTO; their source-schema oracle remains unchanged.
const strictRootMessages=new Map([
    ['null',"Unexpected token 'n', \"null\" is not valid JSON"],
    ['"x"',"Unexpected token '\"', \"\"x\"\" is not valid JSON"],
    ['1',"Unexpected token '1', \"1\" is not valid JSON"]
]);
export function rejectedDtoHttpExpectation(entry){
    assert.equal(entry.group,'dto-rejected-wire');
    const raw=entry.options?.body;
    if(raw!==undefined){
        const parsed=JSON.parse(raw);
        if(parsed===null||typeof parsed!=='object'){
            assert(strictRootMessages.has(raw),'Unclassified primitive root needs a new original parser witness');
            return {entry:'json-parser-strict-root',status:400,response:{message:strictRootMessages.get(raw),error:'Bad Request',statusCode:400}};
        }
    }
    return {entry:'zod-dto',status:400,response:{statusCode:400,message:'Validation failed',...(entry.oracle.internalError?{}:{errors:entry.oracle.errors})}};
}
function schemaOperation(schema,userId){
    const route='/api/platform/users/'+userId;
    return ({
        CreatePlatformUserRequest:['create','POST','/api/platform/users'],
        UpdatePlatformUserRequest:['update','PATCH',route],
        UpdateCurrentUserProfileRequest:['update-profile','PATCH','/api/auth/profile'],
        UpdatePlatformUserActivationRequest:['activate','POST',route+':activate'],
        AssignUserRolesRequest:['assign-roles','PUT',route+'/roles'],
        AssignUserOrgMembershipsRequest:['assign-org-memberships','PUT',route+'/org-memberships']
    })[schema];
}
// Raw payload is immutable. Source-schema rejected cases are routed to HTTP;
// strict primitive roots stop at the parser, other payloads reach guards/DTO.
// Schema-valid cases remain a separately declared business/format subset.
export function dtoCases(golden,userId){
    assert(uuid.test(userId));
    return golden.cases.filter(entry=>!entry.nonWireOwnUndefined&&!entry.expected.success).map(entry=>{
        const [operation,method,route]=schemaOperation(entry.schema,userId);
        const row={id:'dto:'+entry.schema+':'+entry.name,group:'dto-rejected-wire',operation,method,route,schema:entry.schema,
            oracle:{success:false,...(entry.expected.internalError?{internalError:entry.expected.internalError}:{errors:entry.expected.errors})},
            ...(entry.inputRaw===null?{}:{options:{body:entry.inputRaw,contentType:'application/json'}})};
        return {...row,httpEntry:rejectedDtoHttpExpectation(row).entry};
    });
}
export function schemaCoverageManifest(golden=frozenGolden()){
    const schemas=[...new Set(golden.cases.map(entry=>entry.schema))];
    const counts=schemas.map(schema=>{
        const cases=golden.cases.filter(entry=>entry.schema===schema);
        return {schema,total:cases.length,wireRejected:cases.filter(entry=>!entry.nonWireOwnUndefined&&!entry.expected.success).length,
            wireAccepted:cases.filter(entry=>!entry.nonWireOwnUndefined&&entry.expected.success).length,nonWire:cases.filter(entry=>entry.nonWireOwnUndefined).length};
    });
    const selected=dtoCases(golden,'a0000000-0000-4000-8000-000000000001'),parserRoots=selected.filter(row=>row.httpEntry==='json-parser-strict-root');
    const metadata={formatVersion:1,sourceHead:golden.sourceHead,schemaCases:golden.cases.length,schemaWireCandidates:golden.wireCases,nonWire:golden.nonWireCases,
        actualHttpSelection:'All original source-schema rejected raw wire cases plus explicit valid business/format samples; parser and DTO entries are distinguished, without an all-wire valid HTTP claim',
        declaredRejectedDtoWireCases:counts.reduce((sum,row)=>sum+row.wireRejected,0),schemas:counts,
        httpEntryLayers:{selectedWireCases:selected.length,jsonParserStrictRootCases:parserRoots.length,zodDtoCases:selected.length-parserRoots.length,
            strictRootCaseIds:parserRoots.map(row=>row.id),strictRootRawBodies:[...new Set(parserRoots.map(row=>row.options.body))],
            boundary:'Strict JSON primitive roots stop at body-parser before guards/DTO. Other raw rejected payloads continue through HTTP guards before DTO validation.'},
        validBoundary:'Original username/UTF16/length cases are pure-schema until a separately owned finite sample protocol exists. No silent username substitution.',
        runtimeBehaviorClaim:false};
    return {...metadata,planSha256:createHash('sha256').update(JSON.stringify(metadata)).digest('hex')};
}
export function operationCases({userId,roleId,orgId,username,displayName}){
    assert(uuid.test(userId)&&uuid.test(roleId)&&uuid.test(orgId));
    assert(typeof username==='string'&&typeof displayName==='string');
    const route='/api/platform/users/'+userId;
    return [
        {operation:'profile',method:'GET',route:'/api/auth/profile'},
        {operation:'update-profile',method:'PATCH',route:'/api/auth/profile',json:{displayName}},
        {operation:'owner-reference',method:'GET',route:'/api/platform/owner-reference'},
        {operation:'list',method:'GET',route:'/api/platform/users'},
        {operation:'create',method:'POST',route:'/api/platform/users',json:{username,displayName,primaryOrgUnitId:null,initialRoleIds:[]}},
        {operation:'detail',method:'GET',route},
        {operation:'update',method:'PATCH',route,json:{displayName,email:null}},
        {operation:'activate',method:'POST',route:route+':activate',json:{}},
        {operation:'deactivate',method:'POST',route:route+':deactivate',json:{}},
        {operation:'assign-roles',method:'PUT',route:route+'/roles',json:{roleIds:[roleId]}},
        {operation:'assign-org-memberships',method:'PUT',route:route+'/org-memberships',json:{primaryOrgUnitId:orgId,secondaryOrgUnitIds:[]}}
    ];
}
export function upperStatic(route){
    return route.split('/').map(part=>['api','auth','profile','platform','owner-reference','users','roles','org-memberships'].includes(part)?part.toUpperCase():part).join('/');
}
export function uriCases(binding){
    const variants=[['canonical',route=>route],['static-uppercase',upperStatic],['one-trailing-slash',route=>route+'/'],['two-trailing-slashes',route=>route+'//'],['encoded-api',route=>route.replace('/api/','/%61pi/')]];
    const rows=operationCases(binding).flatMap(entry=>variants.map(([variant,convert])=>({...entry,id:'uri:'+entry.operation+':'+variant,group:'uri',variant,route:convert(entry.route),matched:!['two-trailing-slashes','encoded-api'].includes(variant)})));
    for(const operation of ['activate','deactivate']){
        const entry=operationCases(binding).find(value=>value.operation===operation);
        rows.push({...entry,id:'uri:'+operation+':uppercase-suffix',group:'uri',variant:'uppercase-suffix',route:entry.route.replace(':'+operation,':'+operation.toUpperCase()),matched:true});
        rows.push({...entry,id:'uri:'+operation+':encoded-colon',group:'uri',variant:'encoded-colon',route:entry.route.replace(':','%3A'),matched:false});
    }
    return rows;
}
export function headCases(binding){
    return uriCases(binding).filter(entry=>entry.method==='GET').map(entry=>({...entry,id:entry.id.replace(/^uri:/,'head:'),group:'head',method:'HEAD'}));
}
export function assertRejectedDtoCoverage(observations,golden=frozenGolden()){
    const required=dtoCases(golden,'a0000000-0000-4000-8000-000000000001').map(({id,group,operation,method})=>({id,group,operation,method}));
    assert.deepEqual(observations.map(({id,group,operation,method})=>({id,group,operation,method})),required,'Only exact complete ordered raw rejected-DTO coverage is admitted');
    for(const observation of observations)assert.equal(observation.result,'observed','Missing/failed/synthetic case is not actual HTTP observation');
    return {result:'complete-rejected-dto-observations-only',cases:required.length,boundary:'Not proof of full business plan, response parity, facts, cleanup or G3'};
}

export function sequentialCases(binding,golden=frozenGolden()){
    const {userId,roleId,orgId,viewerOrgId,inactiveRoleId,inactiveOrgId,username,displayName,missingUserId}=binding;
    const user='/api/platform/users/'+userId,rows=[];
    const add=(id,group,operation,method,route,extra={})=>rows.push({id,group,operation,method,route,...extra});
    const userAction=action=>({action,userSlot:'u000'});
    for(const [operation,route]of [['detail','/api/platform/users/'],['roles','/api/platform/roles/'],['orgs','/api/platform/org-units/']])
        add('preflight:missing-'+operation,'business',operation,'GET',route+missingUserId,{expectedStatus:404});
    for(const operation of operationCases(binding)) {
        if(operation.operation==='create')continue;
        add('business:'+operation.operation,'business',operation.operation,operation.method,operation.route,{...(operation.json===undefined?{}:{json:operation.json}),expectedStatus:200});
    }
    add('business:create-duplicate','business','create','POST','/api/platform/users',{json:{username,displayName,primaryOrgUnitId:null},expectedStatus:409});
    for(const due of [false,true]){
        add('profile:admin-contacts:'+due,'profile','update','PATCH',user,{due,before:[userAction('user-profile-values'),userAction('user-profile-verified')],json:{displayName,email:'changed@example.test',phone:' 555 '},expectedStatus:200});
        add('profile:admin-clear:'+due,'profile','update','PATCH',user,{due,json:{email:null,phone:null,avatarUrl:null},expectedStatus:200});
        add('profile:admin-noop:'+due,'profile','update','PATCH',user,{due,json:{},expectedStatus:200});
        add('profile:self-trim:'+due,'profile','update-profile','PATCH','/api/auth/profile',{due,json:{displayName:' '+displayName+' ',email:' self@example.test ',phone:' 123 '},expectedStatus:200});
        add('profile:self-clear:'+due,'profile','update-profile','PATCH','/api/auth/profile',{due,json:{email:null,phone:null},expectedStatus:200});
        add('profile:self-noop:'+due,'profile','update-profile','PATCH','/api/auth/profile',{due,json:{},expectedStatus:200});
    }
    for(const [name,value] of [
        ['trim',' https://example.invalid/a '],['host-newline','https://exa\nmple.invalid/a'],['opaque','mailto:a@example.test'],
        ['idna','https://例子.invalid/路'],['unpaired-path','https://example.invalid/\ud800'],['overflow','https://example.invalid/'+'x'.repeat(550)],['nul','https://example.invalid/a\u0000']
    ]) add('format:url:'+name,'encoding','update','PATCH',user,{json:{avatarUrl:value}});
    add('encoding:display-surrogate','encoding','update','PATCH',user,{json:{displayName:'\ud800'}});
    add('encoding:display-nul','encoding','update','PATCH',user,{json:{displayName:'x\u0000'}});
    add('encoding:display-astral128','encoding','update','PATCH',user,{json:{displayName:'😀'.repeat(128)}});
    for(const [id,body] of [
        ['roles-empty',{roleIds:[]}],['roles-valid',{roleIds:[roleId]}],['roles-duplicate',{roleIds:[roleId,roleId]}],
        ['roles-inactive',{roleIds:[inactiveRoleId]}],['roles-missing',{roleIds:[missingUserId]}],['roles-ignored-version',{roleIds:[roleId],expectedVersion:999999,reason:'ignored'}]
    ]) add('assignments:'+id,'assignments','assign-roles','PUT',user+'/roles',{json:body});
    for(const [id,body] of [
        ['org-valid',{primaryOrgUnitId:orgId,secondaryOrgUnitIds:[viewerOrgId]}],['org-same-primary',{primaryOrgUnitId:orgId,secondaryOrgUnitIds:[]}],
        ['org-duplicate',{primaryOrgUnitId:orgId,secondaryOrgUnitIds:[orgId]}],['org-inactive',{primaryOrgUnitId:inactiveOrgId}],['org-missing',{primaryOrgUnitId:missingUserId}],
        ['org-ignored-version',{primaryOrgUnitId:orgId,expectedVersion:999999,reason:'ignored'}]
    ]) add('assignments:'+id,'assignments','assign-org-memberships','PUT',user+'/org-memberships',{json:body});
    for(const operation of operationCases(binding)){
        for(const account of ['none','viewer']){
            // Both profile operations are authenticated-only; viewer is legal.
            const status=account==='none'?401:['profile','update-profile'].includes(operation.operation)?200:403;
            add('guard:'+operation.operation+':'+account,'guards',operation.operation,operation.method,operation.route,{account,...(operation.json===undefined?{}:{json:operation.json}),expectedStatus:status});
        }
        if(operation.method!=='GET')add('guard:'+operation.operation+':csrf','guards',operation.operation,operation.method,operation.route,{...(operation.json===undefined?{}:{json:operation.json}),options:{csrf:false},expectedStatus:403});
    }
    for(const profile of ['lead-write','lead-assign','project-write','users-manage','orgs-manage']){
        add('owner-any5:'+profile,'owner-any5','owner-reference','GET','/api/platform/owner-reference',{account:'viewer',before:[{action:'permissions-'+profile,account:'viewer'}],expectedStatus:200});
    }
    for(const operation of ['profile','update-profile','owner-reference','list']){
        const entry=operationCases(binding).find(row=>row.operation===operation);
        add('zero-permission:'+operation,'owner-any5',operation,entry.method,entry.route,{account:'viewer',before:[{action:'permissions-none',account:'viewer'}],...(entry.method==='PATCH'?{json:{}}:{}),expectedStatus:['profile','update-profile'].includes(operation)?200:403});
    }
    add('owner-any5:restore-viewer','owner-any5','owner-reference','GET','/api/platform/owner-reference',{account:'viewer',before:[{action:'permissions-default',account:'viewer'}],expectedStatus:403});
    for(const row of dtoCases(golden,userId))rows.push({...row,expectedStatus:400});
    for(const row of uriCases(binding))rows.push({...row,...(row.matched&&row.operation==='create'?{expectedStatus:409}:row.matched?{expectedStatus:200}:{expectedStatus:404})});
    for(const row of headCases(binding))rows.push({...row,expectedStatus:row.matched?200:404});
    for(const [name,id] of [['uppercase',userId.toUpperCase()],['compact',userId.replaceAll('-','')],['braces','{'+userId+'}'],['invalid','not-a-uuid'],['missing',missingUserId]]){
        add('id-spelling:detail:'+name,'id-spelling','detail','GET','/api/platform/users/'+id);
    }
    add('id-spelling:role-uppercase','id-spelling','assign-roles','PUT',user+'/roles',{json:{roleIds:[roleId.toUpperCase()]}});
    add('id-spelling:org-uppercase','id-spelling','assign-org-memberships','PUT',user+'/org-memberships',{json:{primaryOrgUnitId:orgId.toUpperCase()}});
    add('sort:roles-history','sort','detail','GET',user,{before:[userAction('user-role-matrix')]});
    add('sort:memberships-history','sort','detail','GET',user,{before:[userAction('user-membership-matrix')]});
    add('sort:owner-reference','sort','owner-reference','GET','/api/platform/owner-reference');
    add('sort:full-users','sort','list','GET','/api/platform/users');
    for(const [name,method,route,options]of [
        ['malformed','PATCH',user,{body:'{"displayName":}',contentType:'application/json'}],
        ['wrong-content-type','PATCH',user,{body:'{"displayName":"ignored"}',contentType:'text/plain'}],
        ['unsupported-charset','PATCH',user,{body:'{}',contentType:'application/json; charset=iso-8859-1'}],
        ['scalar-json','PATCH',user,{body:'"text"',contentType:'application/json'}],
        ['body-limit','PATCH',user,{body:'{"displayName":"'+ 'x'.repeat(102400)+'"}',contentType:'application/json'}],
        ['safe-malformed','GET','/api/auth/profile',{body:'{"bad":}',contentType:'application/json'}],
        ['safe-ignored','GET','/api/platform/users',{body:'{"ignored":true}',contentType:'application/json'}],
        ['urlencoded','PATCH',user,{body:'displayName=+Name+',contentType:'application/x-www-form-urlencoded'}]
    ])add('parser:'+name,'parser',name==='safe-ignored'?'list':method==='GET'?'profile':'update',method,route,{options});
    for(const [id,route]of [['permissions','/api/platform/permissions'],['roles','/api/platform/roles'],['orgs','/api/platform/org-units'],['navigation','/api/me/navigation'],['session','/api/auth/session']])
        add('regression:'+id,'regression',id,'GET',route,{expectedStatus:200});
    return rows;
}
export function completeHttpCasePlan(golden=frozenGolden()){
    const fake={userId:'a0000000-0000-4000-8000-000000000001',roleId:'b0000000-0000-4000-8000-000000000001',orgId:'c0000000-0000-4000-8000-000000000001',viewerOrgId:'c0000000-0000-4000-8000-000000000002',
        inactiveRoleId:'b0000000-0000-4000-8000-000000000002',inactiveOrgId:'c0000000-0000-4000-8000-000000000003',missingUserId:'d0000000-0000-4000-8000-000000000001',username:'logical-user',displayName:'Logical name'};
    const plan=[{id:'create:target',group:'business',operation:'create',method:'POST'},...sequentialCases(fake,golden).map(({id,group,operation,method})=>({id,group,operation,method}))];
    assert.equal(new Set(plan.map(row=>row.id)).size,plan.length);
    return plan;
}
export function httpCoverageManifest(golden=frozenGolden()){
    const plan=completeHttpCasePlan(golden);
    return {formatVersion:1,sourceHead:golden.sourceHead,schemaLayers:schemaCoverageManifest(golden),cases:plan.length,casePlan:plan,
        planSha256:createHash('sha256').update(JSON.stringify({schemaLayers:schemaCoverageManifest(golden),plan})).digest('hex'),
        boundary:'Sequential original source-schema rejected raw wire with parser/DTO entry distinguished, plus explicit legal business/format/guard/URI samples; concurrency, SQL witness and browsers remain separate'};
}
export function assertCompleteHttpCoverage(report,golden=frozenGolden()){
    assert.deepEqual(report.coverage,httpCoverageManifest(golden),'Exact source and full plan binding required');
    const plan=completeHttpCasePlan(golden);
    assert.deepEqual(report.observations.map(({id,group,operation,method})=>({id,group,operation,method})),plan,'A matching prefix is incomplete');
    for(const row of report.observations)assert.equal(row.result,'observed','Incomplete/failed/synthetic observations do not count');
    assertRejectedDtoCoverage(report.observations.filter(row=>row.group==='dto-rejected-wire'),golden);
    for(const expected of dtoCases(golden,'a0000000-0000-4000-8000-000000000001')){
        const row=report.observations.find(row=>row.id===expected.id);
        assert.deepEqual(row.request,expected.options??{},'Original rejected DTO raw input cannot be replaced');
    }
    return {result:'complete-declared-http-observations-only',cases:plan.length,boundary:'Not owner closeout, independent parity or G3'};
}
