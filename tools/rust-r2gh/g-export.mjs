// One-way extraction: original TS/Zod/OpenAPI are the editable authority.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as crypto from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { golden } from './g-oracle.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const zod = require('zod');
require('reflect-metadata');
const common = require('@nestjs/common');
export const ROOT = resolve(import.meta.dirname,'../..');
export const SOURCE_HEAD = '126ede22bb4b379ae656ccde9cee9d82da383be4';
export let sourceVerification = [];
const sourcePath = 'apps/poms-api/src/app/features/identity-provider/identity-provider.service.ts';
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => readFileSync(resolve(ROOT,path),'utf8');
const json = path => JSON.parse(read(path));
const protectedPath = path => ['apps/poms-api/','libs/shared/contracts/','libs/api/contracts/','libs/vendor/nestjs-zod/','libs/shared/api-spec/','libs/shared/api-client/'].some(prefix=>path.startsWith(prefix)) || ['package.json','pnpm-lock.yaml'].includes(path);
export function sourceGuard() {
    const candidate = json('tmp/rust-r2gh/g1-candidate02.json');
    assert.equal(candidate.base,SOURCE_HEAD);
    const rows = candidate.sourceManifest.filter(row => protectedPath(row.file));
    assert(rows.length > 1000,'Missing protected original sources');
    sourceVerification=rows.map(row=>{
        const bytes=readFileSync(resolve(ROOT,row.file));const actualRaw=hash(bytes);const rawMatch=actualRaw===row.rawBytesSha256;
        const decoded=bytes.toString('utf8');const exactUtf8=Buffer.from(decoded,'utf8').equals(bytes);
        const actualNormalized=hash(decoded.replace(/\r\n/g,'\n'));const normalizedMatch=exactUtf8&&actualNormalized===row.normalizedLfSha256;
        assert(rawMatch||normalizedMatch,'Original authority changed: '+row.file);
        return {path:row.file,actualRaw,expectedRaw:row.rawBytesSha256,rawMatch,actualNormalized,expectedNormalized:row.normalizedLfSha256,exactUtf8,normalizedMatch,lineEndingOnly:!rawMatch&&normalizedMatch};
    });
    for(const directory of ['apps/poms-api/src','libs/shared/contracts/src','libs/api/contracts/src','libs/vendor/nestjs-zod/src','libs/shared/api-client']){
        const observed=[];function walk(path){for(const entry of readdirSync(resolve(ROOT,path),{withFileTypes:true})){const child=path+'/'+entry.name;if(entry.isDirectory())walk(child);else{assert(entry.isFile(),'Unexpected original-source link '+child);observed.push(child);}}}walk(directory);
        const expected=rows.filter(row=>row.file.startsWith(directory+'/')).map(row=>row.file).sort();
        assert.deepEqual(observed.sort(),expected,'Original authority inventory changed: '+directory);
    }
    return rows.map(row=>({path:row.file,rawBytesSha256:row.rawBytesSha256,normalizedLfSha256:row.normalizedLfSha256}));
}
function execute(text,file,dependencies,extra={}) {
    const compiled = ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true,emitDecoratorMetadata:false}}).outputText;
    const exports = {};
    const context = {exports,module:{exports},require(name){assert(Object.hasOwn(dependencies,name),'Unreviewed source import '+name);return dependencies[name];},...extra};
    new Script(compiled,{filename:file}).runInNewContext(context,{timeout:5000});
    return context.module.exports;
}
const frozenNow = 1800000000000;
class FrozenDate extends Date { constructor(...args) { super(...(args.length?args:[frozenNow])); } static now(){return frozenNow;} }
export function originalService(shared,env={}) {
    const stub = class {};
    const deps = {
        'node:crypto':crypto,'@nestjs/common':common,'@poms/shared-contracts':shared,
        '../../core/runtime-audit/runtime-audit.service':{RuntimeAuditService:stub},
        '../../core/secret/secret-cipher.service':{SecretCipherService:stub},
        '../external-org-sync/external-org-directory.adapter':{ExternalOrgDirectoryAdapterError:class extends Error {}},
        '../external-org-sync/external-org-directory-adapter.registry':{ExternalOrgDirectoryAdapterRegistry:stub},
        './external-identity.entity':{ExternalIdentity:stub},
        './external-login-ticket.entity':{ExternalLoginTicketStatusValue:{Issued:'issued',Consumed:'consumed',Expired:'expired'}},
        './identity-provider.adapter':execute(read('apps/poms-api/src/app/features/identity-provider/identity-provider.adapter.ts'),'identity-provider.adapter.ts',{}),
        './identity-provider-adapter.registry':{IdentityProviderAdapterRegistry:stub},
        './identity-provider-config.entity':{IdentityProviderConfig:stub},
        './identity-provider-oauth-grant.entity':{IdentityProviderOAuthGrant:stub},
        './identity-provider.repository':{IdentityProviderRepository:stub},
        './identity-provider-secret.constants':execute(read('apps/poms-api/src/app/features/identity-provider/identity-provider-secret.constants.ts'),'identity-provider-secret.constants.ts',{})
    };
    const result = execute(read(sourcePath),sourcePath,deps,{Buffer,Date:FrozenDate,process:{env},Error});
    return new result.IdentityProviderService(null,null,null,null,null);
}
function stateGolden(shared) {
    const service = originalService(shared,{IDENTITY_PROVIDER_STATE_KEY:'g-synthetic-state-key'});
    const cases=[];
    function capture(method,name,state) {
        let expected;
        try {expected={success:true,data:service[method](state)};} catch(error){expected={success:false,status:error.getStatus?.()??null,response:error.getResponse?.()??{name:error.name,message:error.message}};}
        cases.push({method,name,state,expected});
    }
    const encode = raw => Buffer.from(raw,'utf8').toString('base64url');
    const sign = raw => {const encoded=encode(raw);return encoded+'.'+service.signOAuthState(encoded);};
    for (const [method,purpose] of [['verifyOAuthState','identity-provider-admin-grant'],['verifyExternalLoginState','identity-provider-login']]) {
        const seed={purpose,identityProviderConfigId:'g-synthetic-provider',operatorId:'g-synthetic-admin',nonce:'ignored',exp:frozenNow+1};
        const valid=sign(JSON.stringify(seed));
        for(const [name,state] of [['valid',valid],['padding',valid+'='],['standard-alphabet',valid.replaceAll('-','+').replaceAll('_','/')],['signature-whitespace',valid+' \n'],['signature-invalid-ignored',valid+'!'],['bad-signature',valid.slice(0,-3)+'abc'],['signature-empty',valid.split('.')[0]+'.'],['extra-segment',valid+'.x'],['empty',''],['no-dot','x']]) capture(method,name,state);
        for (const [name,payload] of [['no-nonce',Object.fromEntries(Object.entries(seed).filter(([key])=>key!=='nonce'))],['id-empty',{...seed,identityProviderConfigId:''}],['operator-empty',{...seed,operatorId:''}],['exp-equal',{...seed,exp:frozenNow}],['exp-past',{...seed,exp:frozenNow-1}],['exp-fraction',{...seed,exp:frozenNow+0.5}],['exp-string',{...seed,exp:String(frozenNow+1)}],['purpose-other',{...seed,purpose:'other'}],['id-number',{...seed,identityProviderConfigId:1}],['unicode',{...seed,identityProviderConfigId:'\ud800😀'}],['array',[]],['null',null]]) capture(method,name,sign(JSON.stringify(payload)));
        capture(method,'exp-infinity',sign(JSON.stringify(seed).replace(String(frozenNow+1),'1e999')));
        capture(method,'invalid-json',sign('{'));
        capture(method,'duplicate-last-id',sign(JSON.stringify(seed).slice(0,-1)+',"identityProviderConfigId":"last"}'));
    }
    const signatures=[];
    for(const env of [{},{IDENTITY_PROVIDER_STATE_KEY:''},{IDENTITY_PROVIDER_SECRET_KEY:''},{JWT_SECRET:''},{IDENTITY_PROVIDER_STATE_KEY:'first',IDENTITY_PROVIDER_SECRET_KEY:'second',JWT_SECRET:'third'},{IDENTITY_PROVIDER_SECRET_KEY:'second',JWT_SECRET:'third'},{JWT_SECRET:'third'}]) signatures.push({env,encodedPayload:'g-synthetic-payload',signature:originalService(shared,env).signOAuthState('g-synthetic-payload')});
    return {formatVersion:1,sourceHead:SOURCE_HEAD,oracle:'Actual unchanged original private state methods; fixed clock and synthetic env, no runtime credentials',nowMs:frozenNow,env:{IDENTITY_PROVIDER_STATE_KEY:'g-synthetic-state-key'},cases,signatures};
}
function dtoRules(shared) {
    function describe(node) {
        const def=node._zod.def;
        const result={type:def.type};
        if(def.format) result.format=def.format;
        if(def.pattern) result.pattern=def.pattern.toString();
        if(def.type==='optional'||def.type==='nullable') result.inner=describe(def.innerType);
        if(def.type==='array') result.element=describe(def.element);
        if(def.type==='object') result.fields=Object.entries(node.shape).map(([key,value])=>({key,rule:describe(value)}));
        if(def.type==='enum') result.values=Object.values(def.entries);
        if(def.coerce) result.coerce=true;
        if(def.checks?.length) result.checks=def.checks.map(check=>{
            const definition=check._zod.def;
            return Object.fromEntries(Object.entries(definition).filter(([key,value])=>key!=='when'&&typeof value!=='function'&&key!=='error').map(([key,value])=>[key,value instanceof RegExp?value.toString():value]));
        });
        return result;
    }
    const names=['IdentityProviderConfigListQuery','CreateIdentityProviderConfigRequest','UpdateIdentityProviderConfigRequest','TestIdentityProviderConnectionRequest','ExternalLoginCallbackQuery','IdentityProviderOAuthCallbackQuery','CreateExternalLoginSessionRequest','ExternalUserSearchQuery','BindUserExternalIdentityRequest','UnbindExternalIdentityRequest'];
    return {formatVersion:1,sourceHead:SOURCE_HEAD,authority:'Original unchanged Zod node definitions; trim overwrite occurs only on original source trim strings; update object custom refinement remains original At least one updatable field is required',schemas:Object.fromEntries(names.map(name=>[name,describe(shared[name+'Schema'])]))};
}
function redirectGolden() {
    const platformRequire=createRequire(require.resolve('@nestjs/platform-express'));
    const expressPath=platformRequire.resolve('express/lib/response');
    const responsePrototype=platformRequire('express/lib/response');
    const expressRequire=createRequire(expressPath);
    const accepts=expressRequire('accepts');
    const cases=[];
    const location='/platform/users?identityProviderGrant=success&provider=feishu&identityProviderConfigId=a0000000-0000-4000-8000-000000000001';
    for(const accept of ['text/html','TEXT/HTML','text/html, application/json','text/html;q=0','text/html;q=0, text/plain;q=1','text/plain;q=1, text/html;q=0.5','text/html;q=1, text/plain;q=0.5','text/html;q=0.5, text/plain;q=0.5','text/html,*/*','image/png, text/html;q=0','*/*','']) {
        const browser=accept.toLowerCase().includes('text/html')&&!accept.toLowerCase().includes('application/json');
        if(!browser){cases.push({accept,browser});continue;}
        const headers={};const req={method:'GET',headers:{accept},next(error){throw error;}};
        req.accepts=(types)=>accepts(req).types(types);
        const response=Object.create(responsePrototype);
        response.req=req;response.setHeader=(key,value)=>headers[key.toLowerCase()]=String(value);response.getHeader=key=>headers[key.toLowerCase()];response.end=body=>{response.body=body??'';};
        response.redirect(302,location);
        cases.push({accept,browser,status:response.statusCode,headers,body:response.body});
    }
    return {formatVersion:1,sourceHead:SOURCE_HEAD,oracle:'Actual Nest-resolved Express response.redirect/format and accepts implementations, synthetic in-memory response, no server/network',source:{expressVersion:platformRequire('express/package.json').version,responseRawSha256:hash(readFileSync(expressPath))},location,cases};
}
function behaviorGolden(shared) {
    const service=originalService(shared);
    const config={id:'a0000000-0000-4000-8000-000000000001',provider:'feishu',tenantId:null,displayName:'Synthetic config',status:'draft',enabled:false,loginEnabled:false,bindingEnabled:false,searchEnabled:false,clientId:'synthetic-client',encryptedClientSecret:null,redirectUri:null,searchRedirectUri:null,loginScopes:[],searchScopes:[],tenantAllowlist:[],searchGrantMode:'per-admin',rowVersion:1,createdAt:new FrozenDate(),createdBy:null,updatedAt:new FrozenDate(),updatedBy:null};
    const cases=[];
    function capture(method,name,args,mutation=false){const input=structuredClone(args);let expected;try{const result=service[method](...args);expected={success:true,...(result===undefined?{}:{result}),...(mutation?{mutated:args[0]}:{})};}catch(error){expected={success:false,status:error.getStatus?.()??null,response:error.getResponse?.()??{name:error.name,message:error.message}};}cases.push({method,name,args:input,expected});}
    for(const previous of ['draft','active','disabled','misconfigured'])for(const enabled of [false,true])for(const encryptedClientSecret of [null,'synthetic-envelope'])for(const loginEnabled of [false,true]){
        const value={...config,status:previous,enabled,encryptedClientSecret,loginEnabled};capture('hasMinimumActiveConfig',`${previous}:${enabled}:${Boolean(encryptedClientSecret)}:${loginEnabled}`,[value]);capture('normalizeConfigStatus',`${previous}:${enabled}:${Boolean(encryptedClientSecret)}:${loginEnabled}`,[{...value}],true);
    }
    for(const value of [config,{...config,enabled:true,encryptedClientSecret:'synthetic-envelope',status:'active'},{...config,enabled:true,encryptedClientSecret:'synthetic-envelope',status:'active',loginEnabled:true,searchEnabled:true},{...config,enabled:true,encryptedClientSecret:'synthetic-envelope',status:'active',loginEnabled:true,searchEnabled:true,redirectUri:'https://example.invalid/login',searchRedirectUri:'https://example.invalid/search'}]){
        for(const method of ['toDetail','auditSnapshot','basicConnectionChecks','testBasicConnection','assertBindingAllowed','assertLoginAllowed','assertSearchGrantAllowed'])capture(method,`config-${cases.length}`,[{...value}]);
    }
    for(const searchEnabled of [false,true])for(const count of [0,26,27,32,33])capture('validateSearchGrantScopes',`capacity:${searchEnabled}:${count}`,['feishu',searchEnabled,Array.from({length:count},(_,index)=>'scope:'+index)]);
    for(const scopes of [[],[' a ','a','', ' b '],['😀'.repeat(64)],['😀'.repeat(65)],['x'.repeat(129)],Array.from({length:33},(_,index)=>'scope:'+index),[null],null,'x'])capture('normalizeOAuthGrantScopeSnapshot','snapshot:'+cases.length,[scopes]);
    for(const message of ['tenant_access_token=synthetic access_token:synthetic','Bearer synthetic','{"client_secret":"synthetic"}','app_secret = \'synthetic\'','TENANT_ACCESS_TOKEN=synthetic，failed','prefix access_token=synthetic) suffix','not_a_secret=synthetic','access_token=','access_token: \"\"'])capture('redactDiagnosticSecrets','redact:'+cases.length,[message]);
    const noGrant={...config,enabled:true,searchEnabled:true};capture('toOAuthGrantSummary','missing-grant',[noGrant,'a0000000-0000-4000-8000-000000000002',null]);
    return {formatVersion:1,sourceHead:SOURCE_HEAD,oracle:'Actual unchanged original private service helpers, synthetic entities/fixed clock; no repository/audit/upstream execution',nowMs:frozenNow,cases};
}
export function artifacts() {
    const protectedSources = sourceGuard();
    assert.equal(ts.version,'6.0.3'); assert.equal(require('zod/package.json').version,'4.6.1');
    const shared=execute(read('libs/shared/contracts/src/lib/shared-contracts.ts'),'shared-contracts.ts',{zod});
    const input=json('tmp/rust-r2gh/g-g1-sources.json');
    const spec=json('libs/shared/api-spec/openapi.json');
    const names=new Set();
    function visit(value){if(!value||typeof value!=='object')return;if(typeof value.$ref==='string'&&value.$ref.startsWith('#/components/schemas/')){const name=value.$ref.slice(21);assert(Object.hasOwn(spec.components.schemas,name),name);if(!names.has(name)){names.add(name);visit(spec.components.schemas[name]);}}Object.values(value).forEach(visit);}
    const selected={};
    for(const op of input.operations){const method=op.method.toLowerCase();const operation=spec.paths[op.path]?.[method];assert.equal(operation?.operationId,op.operationId);selected[op.path]??={};selected[op.path][method]=operation;visit(operation);}
    assert.equal(input.operations.length,16);
    const subset={openapi:spec.openapi,paths:selected,components:{schemas:Object.fromEntries([...names].sort().map(name=>[name,spec.components.schemas[name]])),securitySchemes:spec.components.securitySchemes}};
    const authority={formatVersion:1,sourceHead:SOURCE_HEAD,operations:input.operations,scopeMaxItems:shared.IDENTITY_PROVIDER_SCOPE_MAX_ITEMS,scopeMaxLength:shared.IDENTITY_PROVIDER_SCOPE_MAX_LENGTH,identityProviders:shared.IDENTITY_PROVIDERS,configStatuses:shared.IDENTITY_PROVIDER_CONFIG_STATUSES,searchGrantModes:shared.IDENTITY_PROVIDER_SEARCH_GRANT_MODES};
    const outputs=new Map([['g-authority.json',authority],['g-golden.json',golden(shared,SOURCE_HEAD)],['g-state-golden.json',stateGolden(shared)],['g-redirect-golden.json',redirectGolden()],['g-behavior.json',behaviorGolden(shared)],['g-dto-rules.json',dtoRules(shared)],['g-openapi.json',subset],['g-source.json',{formatVersion:1,sourceHead:SOURCE_HEAD,authority:'Unchanged original TS/shared Zod/OpenAPI; mechanical one-way extraction',protectedSources,sourceGuard:'Frozen candidate02 raw hashes first, otherwise strict CRLF-to-LF equality to frozen normalized hash; actual match kinds reported separately',sources:input.repoSources.map(({path,rawBytesSha256,normalizedLfSha256})=>({path,rawBytesSha256,normalizedLfSha256})),outputs:['g-authority.json','g-golden.json','g-state-golden.json','g-redirect-golden.json','g-behavior.json','g-dto-rules.json','g-openapi.json']}]]);
    return new Map([...outputs].map(([file,value])=>[file,JSON.stringify(value,null,2)+'\n']));
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){
    const check=process.argv.includes('--check'); const outputs=artifacts();mkdirSync(resolve(ROOT,'tools/rust-r2gh'),{recursive:true});
    for(const [file,text] of outputs){const path=resolve(ROOT,'tools/rust-r2gh',file);if(check)assert.equal(hash(readFileSync(path,'utf8')),hash(text),'Stale neutral artifact '+file);else writeFileSync(path,text,'utf8');}
    writeFileSync(resolve(ROOT,'tools/rust-r2gh',`g-source-verification-${process.platform}.json`),JSON.stringify({formatVersion:1,sourceHead:SOURCE_HEAD,platform:process.platform,comparison:'Raw bytes first; a non-raw match is accepted only with strict CRLF-to-LF normalization matching frozen normalized hash',sources:sourceVerification},null,2)+'\n');
    console.log(JSON.stringify({sourceHead:SOURCE_HEAD,outputs:outputs.size,cases:JSON.parse(outputs.get('g-golden.json')).cases.length,stateCases:JSON.parse(outputs.get('g-state-golden.json')).cases.length,rawMatches:sourceVerification.filter(v=>v.rawMatch).length,lineEndingOnly:sourceVerification.filter(v=>v.lineEndingOnly).length,check,node:process.version}));
}
