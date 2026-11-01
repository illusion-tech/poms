// Only public source reads and deterministic in-memory crypto/clock/VM fixtures.
// No env/private reads, process launch, browser, HTTP or DB work.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import {ownershipIdentities} from './fixture-policy.mjs';
import {fixtureCredentials} from './fixture-credentials.mjs';
import {assertOpaqueSourcePins,opaqueOriginalSourcePins,verifyEncryptedField,verifyOAuthStateFlow} from './comparison-api-opaque.mjs';

const require=createRequire(import.meta.url),ts=require('typescript');
const RUN='11111111-1111-4111-8111-111111111111',CAP='r2m-pure-opaque-source01';
const ADMIN='22222222-2222-4222-8222-222222222222',CONFIG='33333333-3333-4333-8333-333333333333',PROVIDER='44444444-4444-4444-8444-444444444444',GRANT='55555555-5555-4555-8555-555555555555';
const AT=Date.parse('2026-10-31T02:00:00.000Z'),iso=n=>new Date(n).toISOString(),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>sha(JSON.stringify(canonical(x))),pins=()=>structuredClone(opaqueOriginalSourcePins),common=()=>({runId:RUN,sourceCapId:CAP,sourcePins:pins()});
const source=file=>readFileSync(file,'utf8');
const transpile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
function evaluate(text,globals={}){const module={exports:{}};vm.runInNewContext(transpile(text),{module,exports:module.exports,Buffer,...globals},{timeout:1000});return module.exports;}
function methodSource(file,className,names){const text=source(file),tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),found=tree.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text===className);assert(found);return names.map(name=>{const method=found.members.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(tree)===name);assert(method);return method.getText(tree)}).join('\n');}
function originalCipher(env){
    const file=opaqueOriginalSourcePins[0].file;
    const exports=evaluate(source(file),{process:{env},require(name){if(name==='node:crypto')return{...crypto,randomBytes:length=>Buffer.alloc(length,0x35)};assert.equal(name,'@nestjs/common');return{Injectable:()=>target=>target,BadRequestException:class extends Error{}};}});
    return new exports.SecretCipherService();
}
function originalOptions(domain){const name=domain==='attachment'?'ATTACHMENT_STORAGE_SECRET_CIPHER_OPTIONS':'IDENTITY_PROVIDER_SECRET_CIPHER_OPTIONS';return evaluate(source(opaqueOriginalSourcePins[domain==='attachment'?1:2].file))[name];}
function originalState(env,now=AT){
    const file=opaqueOriginalSourcePins[4].file,methods=methodSource(file,'IdentityProviderService',['createOAuthState','createExternalLoginState','verifyOAuthState','verifyExternalLoginState','signOAuthState','stateKey']);
    class ControlledDate extends Date{static now(){return now;}}
    return new(evaluate('export class OriginalStateEmitter{'+methods+'}',{process:{env},Date:ControlledDate,createHash:crypto.createHash,createHmac:crypto.createHmac,timingSafeEqual:crypto.timingSafeEqual,randomBytes:length=>Buffer.alloc(length,0x46),BadRequestException:class extends Error{},UnauthorizedException:class extends Error{}}).OriginalStateEmitter)();
}
function originalInputs(){const file=opaqueOriginalSourcePins[6].file,text=source(file),tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),fn=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='syntheticInputs');assert(fn);return evaluate(fn.getText(tree),{uuidPattern:/^[0-9a-f-]{36}$/,assert,hash:sha}).syntheticInputs({runId:RUN,adminId:ADMIN,viewerId:GRANT,orgId:PROVIDER});}
function originalTokenBody(appId){
    const file=opaqueOriginalSourcePins[7].file,text=source(file),tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let object;
    function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(tree)==='respond'&&node.arguments[2]&&node.arguments[2].getText(tree).includes('refresh_expires_in:86400'))object=node.arguments[2].getText(tree);ts.forEachChild(node,visit)}visit(tree);assert(object);
    return Buffer.from(JSON.stringify(vm.runInNewContext('('+object+')',{access:'gh-controlled-access-'+sha(appId).slice(0,20)},{timeout:1000})));
}
function ownedProof(table,row,caseId){
    const context={runId:RUN,caseId,index:8,op:'m.http'};
    const birth=caseId==='base'?{kind:'direct-committed-insert',beforeAbsent:true,transaction:'987',xmin:'987',commitAcknowledged:true}:{kind:'mikro-orm-afterCreate-outer-commit',createContext:context,commitContext:{...context}};
    const ownedRow={table,id:row.id,caseId,identity:Object.fromEntries(['id',...ownershipIdentities[table]].map(key=>[key,row[key]])),creationProof:birth,postcondition:{independentlyVisible:true}};
    return{kind:'R2M-comparison-owned-row-proof',namespace:'poms-r2m',runId:RUN,sourceCapId:CAP,ordinaryBirthVerified:true,ownedRow,creationProofSha256:digest(birth)};
}
function principals(){
    const inputs=originalInputs(),operatorRow={id:ADMIN,username:fixtureCredentials(RUN,'admin').username};
    const configRow={id:CONFIG,provider:'feishu',tenant_id:inputs.identityProvider.tenantId,client_id:inputs.identityProvider.clientId,created_by:ADMIN};
    return{inputs,operatorRow,operatorProof:ownedProof('platform_user',operatorRow,'base'),configRow,configProof:ownedProof('identity_provider_config',configRow,'m5.integration')};
}
function tokenProof(withRaw=false){const p=principals(),raw=originalTokenBody(p.configRow.client_id);return{kind:'R2M-comparison-controlled-feishu-token',namespace:'poms-r2m',runId:RUN,sourceCapId:CAP,...p,peer:{sourceServerSha256:opaqueOriginalSourcePins[7].rawBytesSha256,sourceRecordSha256:sha('pure controlled peer record'),method:'POST',path:'/oauth/token',mode:'normal',appId:p.configRow.client_id,syntheticCredentialVerified:true,syntheticCodeVerified:true},...(withRaw?{responseBytes:raw,responseSha256:sha(raw),status:200}:{})};}
function encrypted(which,keySources={JWT_SECRET:'pure-synthetic-cipher-key'},withRaw=false){
    const p=principals(),table=which<2?'attachment_storage_provider_config':which===2?'identity_provider_config':'identity_provider_oauth_grant';
    const columns=['encrypted_access_key_id','encrypted_secret_access_key','encrypted_client_secret','encrypted_access_token','encrypted_refresh_token'];
    const slots=['inputs.obsProvider.accessKeyId','inputs.obsProvider.secretAccessKey','inputs.identityProvider.clientSecret','controlled.feishu.oauth.access_token','controlled.feishu.oauth.refresh_token'];
    const expected=[p.inputs.obsProvider.accessKeyId,p.inputs.obsProvider.secretAccessKey,p.inputs.identityProvider.clientSecret,JSON.parse(originalTokenBody(p.configRow.client_id)).data.access_token,'gh-controlled-refresh'][which];
    const row=which<2?{id:PROVIDER,provider_type:'huawei-obs-s3',created_by:ADMIN}:which===2?p.configRow:{id:GRANT,identity_provider_config_id:CONFIG,poms_user_id:ADMIN,created_by:ADMIN};
    row[columns[which]]=originalCipher(keySources).encrypt(expected,originalOptions(which<2?'attachment':'identity'));
    return{...common(),table,column:columns[which],row,typedProof:ownedProof(table,row,which<2?'m4.integration':'m5.integration'),slot:slots[which],expectedPlaintext:expected,valueBytes:Buffer.from(row[columns[which]]),keySources,...(which>=3?{controlledTokenProof:tokenProof(withRaw)}:{})};
}
function state(slot='M5.1.grant-authorize.state',keySources={IDENTITY_PROVIDER_STATE_KEY:'pure-synthetic-state-key'}){
    const p=principals(),admin=slot==='M5.1.grant-authorize.state',emitter=originalState(keySources),issued=admin?emitter.createOAuthState(CONFIG,ADMIN):emitter.createExternalLoginState(CONFIG),raw=Buffer.from(issued.value),code=Buffer.from('gh-synthetic-code');
    const path=admin?'/api/platform/identity-provider-oauth-grants:callback':'/api/auth/identity-providers:callback';
    const requestPathBytes=Buffer.from(path+'?'+new URLSearchParams({code:code.toString(),state:raw.toString()})),responseBodyBytes=Buffer.from(admin?'<html>Original controlled callback</html>':'{"ticket":"pure-synthetic-ticket"}');
    return{...common(),slot,issuedStateBytes:raw,configRow:p.configRow,configProof:p.configProof,...(admin?{operatorRow:p.operatorRow,operatorProof:p.operatorProof}:{}),keySources,authorizeWindow:{startedAt:iso(AT-5),finishedAt:iso(AT+5)},stateExpiresAt:issued.expiresAt.toISOString(),callback:{method:'GET',status:admin?302:200,stateBytes:Buffer.from(raw),codeBytes:code,expectedCodeBytes:Buffer.from(code),requestPathBytes,window:{startedAt:iso(AT+10),finishedAt:iso(AT+20)},responseBodyBytes,responseBodySha256:sha(responseBodyBytes)}};
}
function rejected(action,code){assert.throws(action,error=>error.message==='R2M opaque comparison: '+code&&error.code==='R2M_OPAQUE_'+code.toUpperCase());}
function refreshBirth(proof){proof.creationProofSha256=digest(proof.ownedRow.creationProof);}
function replaceCipher(input,edit){const parts=input.row[input.column].split(':');edit(parts);input.row[input.column]=parts.join(':');input.valueBytes=Buffer.from(input.row[input.column]);}
function resign(input,edit,rawPayload){const original=JSON.parse(Buffer.from(input.issuedStateBytes.toString().split('.')[0],'base64url'));edit?.(original);const payload=Buffer.from(rawPayload??JSON.stringify(original)).toString('base64url'),emitter=originalState(input.keySources),text=payload+'.'+emitter.signOAuthState(payload);input.issuedStateBytes=Buffer.from(text);input.callback.stateBytes=Buffer.from(text);const path=input.callback.requestPathBytes.toString().split('?')[0];input.callback.requestPathBytes=Buffer.from(path+'?'+new URLSearchParams({code:input.callback.codeBytes.toString(),state:text}));}

test('every comparison source pin matches current public source; changed/missing/duplicate pins fail',()=>{
    const actual=opaqueOriginalSourcePins.map(pin=>({...pin,rawBytesSha256:sha(readFileSync(pin.file))}));assert.equal(assertOpaqueSourcePins(actual),true);assert(Object.isFrozen(opaqueOriginalSourcePins[0]));
    const changed=pins();changed[0].rawBytesSha256='0'.repeat(64);rejected(()=>assertOpaqueSourcePins(changed),'source_pin_changed');rejected(()=>assertOpaqueSourcePins(actual.slice(1)),'source_pin_changed');rejected(()=>assertOpaqueSourcePins([...actual,actual[0]]),'source_pin_changed');
});
test('all five whitelisted fields authenticate/decrypt bytes emitted by original TS cipher',()=>{
    for(let n=0;n<5;n++){const input=encrypted(n),receipt=verifyEncryptedField(input);assert.equal(receipt.authenticated,true);assert.equal(receipt.plaintextMatchesSource,true);assert.equal(receipt.ownershipGranted,false);assert.equal(receipt.ciphertextSha256,sha(input.valueBytes));assert(!JSON.stringify(receipt).includes(input.expectedPlaintext));assert(!JSON.stringify(receipt).includes(input.keySources.JWT_SECRET));}
});
test('original controlled response bytes are optional and never claimed when absent',()=>{
    assert.equal(verifyEncryptedField(encrypted(3)).controlledRawResponseVerified,false);assert.equal(verifyEncryptedField(encrypted(4,undefined,true)).controlledRawResponseVerified,true);
    const input=encrypted(3,undefined,true);input.controlledTokenProof.responseBytes=Buffer.from('{"code":0}');input.controlledTokenProof.responseSha256=sha(input.controlledTokenProof.responseBytes);rejected(()=>verifyEncryptedField(input),'controlled_response_source_bytes');
});
test('local provider NULL remains literal NULL and receives no semantic alias',()=>{
    for(const[column,slot]of[['encrypted_access_key_id','inputs.localProvider.accessKeyId'],['encrypted_secret_access_key','inputs.localProvider.secretAccessKey']]){const row={id:PROVIDER,provider_type:'local',created_by:ADMIN,[column]:null},input={...common(),table:'attachment_storage_provider_config',column,row,typedProof:ownedProof('attachment_storage_provider_config',row,'m4.integration'),slot,expectedPlaintext:null,valueBytes:null};const receipt=verifyEncryptedField(input);assert.equal(receipt.value,null);assert.equal(receipt.semanticAlias,null);assert.equal(receipt.ownershipGranted,false);input.expectedPlaintext='';rejected(()=>verifyEncryptedField(input),'literal_null_source');}
});
test('no arbitrary encrypted field/slot, absent bytes or null-to-secret alias',()=>{
    let input=encrypted(0);input.column='password_hash';rejected(()=>verifyEncryptedField(input),'encrypted_field_not_whitelisted');
    input=encrypted(0);input.slot='inputs.unlisted.secret';rejected(()=>verifyEncryptedField(input),'encrypted_slot_not_whitelisted');
    input=encrypted(0);input.valueBytes=undefined;rejected(()=>verifyEncryptedField(input),'cipher_complete_bytes');
    input=encrypted(2);input.row[input.column]=null;input.valueBytes=null;input.expectedPlaintext=null;rejected(()=>verifyEncryptedField(input),'literal_null_source');
});
test('cipher uses original truthy key order, whitespace values and original default',()=>{
    for(const keys of[{ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY:'',POMS_SECRET_KEY:'',JWT_SECRET:'fallback'},{ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY:' ',POMS_SECRET_KEY:'other',JWT_SECRET:'fallback'},{}]){const result=verifyEncryptedField(encrypted(0,keys));assert.equal(result.selectedKeySource,Object.keys(keys).length?(keys.ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY?'ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY':'JWT_SECRET'):'source-default');}
    const input=encrypted(2,{IDENTITY_PROVIDER_SECRET_KEY:'',JWT_SECRET:'fallback'});assert.equal(verifyEncryptedField(input).selectedKeySource,'JWT_SECRET');input.keySources={JWT_SECRET:'incorrect'};rejected(()=>verifyEncryptedField(input),'cipher_authentication_failed');
});
test('cipher key names, synthetic source plaintext and full physical bytes remain exact',()=>{
    let input=encrypted(0);input.keySources.UNLISTED_SECRET='private sentinel';rejected(()=>verifyEncryptedField(input),'key_source_shape');
    input=encrypted(0);input.expectedPlaintext='arbitrary plaintext';rejected(()=>verifyEncryptedField(input),'expected_plaintext_source');
    input=encrypted(0);input.valueBytes=input.valueBytes.subarray(0,-1);rejected(()=>verifyEncryptedField(input),'cipher_physical_value_binding');
    input=encrypted(0);input.row[input.column]=originalCipher(input.keySources).encrypt('arbitrary plaintext',originalOptions('attachment'));input.valueBytes=Buffer.from(input.row[input.column]);rejected(()=>verifyEncryptedField(input),'cipher_plaintext_mismatch');
});
test('GCM detects one-bit ciphertext and tag tampering with fixed safe errors',()=>{
    for(const segment of[2,3]){const input=encrypted(0);replaceCipher(input,parts=>{const value=Buffer.from(parts[segment],'base64');value[0]^=1;parts[segment]=value.toString('base64')});rejected(()=>verifyEncryptedField(input),'cipher_authentication_failed');}
});
test('cipher version, segment count, IV/tag lengths and noncanonical base64 are not aliases',()=>{
    const edits=[parts=>parts[0]='v2',parts=>parts.push('unlisted'),parts=>parts[1]=Buffer.alloc(11).toString('base64'),parts=>parts[2]=Buffer.alloc(15).toString('base64'),parts=>parts[2]=parts[2].replace(/=+$/,'')];
    for(const[index,edit]of edits.entries()){const input=encrypted(0);replaceCipher(input,edit);rejected(()=>verifyEncryptedField(input),index<2?'cipher_version_or_segments':'base64_canonical_or_length');}
});
test('typed birth, identity, case, outer COMMIT and role fail independently',()=>{
    let input=encrypted(0);input.typedProof.ordinaryBirthVerified=false;rejected(()=>verifyEncryptedField(input),'typed_proof');
    input=encrypted(0);input.typedProof.ownedRow.caseId='unlisted';rejected(()=>verifyEncryptedField(input),'typed_owned_row');
    input=encrypted(0);input.typedProof.ownedRow.identity.created_by=CONFIG;rejected(()=>verifyEncryptedField(input),'typed_identity_value');
    input=encrypted(0);input.typedProof.ownedRow.creationProof.commitContext.index++;refreshBirth(input.typedProof);rejected(()=>verifyEncryptedField(input),'generated_outer_commit_context');
    input=encrypted(0);input.typedProof.ownedRow.creationProof.kind='query-id';refreshBirth(input.typedProof);rejected(()=>verifyEncryptedField(input),'generated_birth_kind');
    input=encrypted(3);const proof=input.controlledTokenProof.operatorProof;proof.ownedRow.creationProof.beforeAbsent=false;refreshBirth(proof);rejected(()=>verifyEncryptedField(input),'base_birth');
});
test('controlled token requires exact current typed config/operator and actual normal peer proof',()=>{
    let input=encrypted(3);input.controlledTokenProof.peer.mode='fault';rejected(()=>verifyEncryptedField(input),'controlled_peer_source');
    input=encrypted(3);input.controlledTokenProof.peer.syntheticCredentialVerified=false;rejected(()=>verifyEncryptedField(input),'controlled_peer_source');
    input=encrypted(3);input.row.poms_user_id=CONFIG;input.typedProof=ownedProof(input.table,input.row,'m5.integration');rejected(()=>verifyEncryptedField(input),'grant_typed_parent');
    input=encrypted(3);input.controlledTokenProof.operatorRow.username='borrowed-admin';input.controlledTokenProof.operatorProof=ownedProof('platform_user',input.controlledTokenProof.operatorRow,'base');rejected(()=>verifyEncryptedField(input),'operator_source_role');
});
test('both OAuth purpose flows verify states emitted by original TS state methods',()=>{
    for(const slot of['M5.1.grant-authorize.state','M5.1.authorize.state']){const input=state(slot),receipt=verifyOAuthStateFlow(input),emitter=originalState(input.keySources,AT+20);assert.equal(receipt.signatureVerified,true);assert.equal(receipt.nonceBytes,16);assert.equal(receipt.ttlMs,600000);assert.equal(receipt.callbackStateAndCodeIdentical,true);assert.equal(receipt.callbackBodyOrHeadersNormalized,false);assert.equal(receipt.ownershipGranted,false);assert(!JSON.stringify(receipt).includes(input.issuedStateBytes.toString()));assert(!JSON.stringify(receipt).includes(input.keySources.IDENTITY_PROVIDER_STATE_KEY));if(slot.includes('grant'))assert.equal(emitter.verifyOAuthState(input.issuedStateBytes.toString()).operatorId,ADMIN);else assert.equal(emitter.verifyExternalLoginState(input.issuedStateBytes.toString()).identityProviderConfigId,CONFIG);}
});
test('state empty key is used by nullish original rule; missing/null fallback and default agree',()=>{
    for(const keys of[{IDENTITY_PROVIDER_STATE_KEY:'',IDENTITY_PROVIDER_SECRET_KEY:'other',JWT_SECRET:'other'},{IDENTITY_PROVIDER_STATE_KEY:null,IDENTITY_PROVIDER_SECRET_KEY:'',JWT_SECRET:'other'},{JWT_SECRET:'fallback'},{}]){const input=state(undefined,keys),receipt=verifyOAuthStateFlow(input);assert.equal(receipt.signatureVerified,true);assert.equal(receipt.selectedKeySource,keys.IDENTITY_PROVIDER_STATE_KEY!==undefined&&keys.IDENTITY_PROVIDER_STATE_KEY!==null?'IDENTITY_PROVIDER_STATE_KEY':keys.IDENTITY_PROVIDER_SECRET_KEY!==undefined&&keys.IDENTITY_PROVIDER_SECRET_KEY!==null?'IDENTITY_PROVIDER_SECRET_KEY':keys.JWT_SECRET!==undefined?'JWT_SECRET':'source-default');}
    const input=state(undefined,{IDENTITY_PROVIDER_STATE_KEY:'',JWT_SECRET:'fallback'});input.keySources={JWT_SECRET:'fallback'};rejected(()=>verifyOAuthStateFlow(input),'state_signature');
});
test('state HMAC, source pins and full issued bytes are required',()=>{
    let input=state();input.keySources={JWT_SECRET:'wrong key'};rejected(()=>verifyOAuthStateFlow(input),'state_signature');
    input=state();input.issuedStateBytes=Buffer.from(input.issuedStateBytes.toString()+'.extra');rejected(()=>verifyOAuthStateFlow(input),'state_segments');
    input=state();input.sourcePins[4].rawBytesSha256='0'.repeat(64);rejected(()=>verifyOAuthStateFlow(input),'source_pin_changed');
    input=state();input.issuedStateBytes=input.issuedStateBytes.toString();rejected(()=>verifyOAuthStateFlow(input),'state_complete_bytes');
});
test('validly signed wrong purpose/config/operator and nonce lengths do not qualify',()=>{
    for(const[edit,code]of[[p=>p.purpose='unlisted-purpose','state_typed_identity_or_purpose'],[p=>p.identityProviderConfigId=PROVIDER,'state_typed_identity_or_purpose'],[p=>p.operatorId=CONFIG,'state_typed_identity_or_purpose'],[p=>p.nonce=Buffer.alloc(15).toString('base64url'),'base64_canonical_or_length'],[p=>p.nonce=Buffer.alloc(17).toString('base64url'),'base64_canonical_or_length']]){const input=state();resign(input,edit);rejected(()=>verifyOAuthStateFlow(input),code);}
});
test('signed extra/duplicate/reordered JSON fields and noncanonical encoding are not emitter bytes',()=>{
    let input=state();resign(input,p=>p.unlisted=true);rejected(()=>verifyOAuthStateFlow(input),'state_payload_fields');
    input=state();const payload=JSON.parse(Buffer.from(input.issuedStateBytes.toString().split('.')[0],'base64url'));resign(input,null,JSON.stringify({...payload,purpose:payload.purpose}).replace('"purpose":','"purpose":"identity-provider-admin-grant","purpose":'));rejected(()=>verifyOAuthStateFlow(input),'state_emitter_json_bytes');
    input=state();resign(input,null,JSON.stringify(Object.fromEntries(Object.entries(payload).reverse())));rejected(()=>verifyOAuthStateFlow(input),'state_emitter_json_bytes');
    input=state();const parts=input.issuedStateBytes.toString().split('.');parts[0]+='=';input.issuedStateBytes=Buffer.from(parts.join('.'));rejected(()=>verifyOAuthStateFlow(input),'base64_shape');
});
test('state TTL is exact to actual authorize window and response expiry',()=>{
    let input=state();resign(input,p=>p.exp++);input.stateExpiresAt=iso(AT+600001);assert.equal(verifyOAuthStateFlow(input).signatureVerified,true); // within the real controlled 10ms window
    input=state();resign(input,p=>p.exp+=50);input.stateExpiresAt=iso(AT+600050);rejected(()=>verifyOAuthStateFlow(input),'state_exact_ttl_window');
    input=state();input.stateExpiresAt=iso(AT+600001);rejected(()=>verifyOAuthStateFlow(input),'state_response_expiry');
    input=state();input.authorizeWindow.finishedAt='2026-10-31T02:00:00Z';rejected(()=>verifyOAuthStateFlow(input),'window_shape');
    input=state();input.authorizeWindow={startedAt:'2026-02-30T02:00:00.000Z',finishedAt:'2026-02-30T02:00:01.000Z'};rejected(()=>verifyOAuthStateFlow(input),'window_canonical_iso');
});
test('callback must reuse exact issued state and controlled code once',()=>{
    let input=state();input.callback.stateBytes=Buffer.from('substituted-state');rejected(()=>verifyOAuthStateFlow(input),'state_callback_not_original');
    input=state();input.callback.expectedCodeBytes=Buffer.from('different-code');rejected(()=>verifyOAuthStateFlow(input),'callback_controlled_code');
    input=state();input.callback.requestPathBytes=Buffer.concat([input.callback.requestPathBytes,Buffer.from('&state=another')]);rejected(()=>verifyOAuthStateFlow(input),'callback_query_fields');
    input=state();input.callback.requestPathBytes=Buffer.from(input.callback.requestPathBytes.toString().replace('code=gh-synthetic-code','code=another'));rejected(()=>verifyOAuthStateFlow(input),'callback_query_chain');
});
test('callback method/status, path, unknown query and fragment remain strict',()=>{
    for(const[edit,code]of[[i=>i.callback.method='POST','state_callback_method_or_status'],[i=>i.callback.status=200,'state_callback_method_or_status'],[i=>i.callback.requestPathBytes=Buffer.from('//r2m.invalid'+i.callback.requestPathBytes),'callback_exact_path'],[i=>i.callback.requestPathBytes=Buffer.from(i.callback.requestPathBytes+'&extra=1'),'callback_query_fields'],[i=>i.callback.requestPathBytes=Buffer.from(i.callback.requestPathBytes+'#fragment'),'callback_exact_path']]){const input=state();edit(input);rejected(()=>verifyOAuthStateFlow(input),code);}
});
test('callback query preserves original code/state order and emitted URLSearchParams bytes',()=>{
    const input=state(),text=input.callback.requestPathBytes.toString(),[path,query]=text.split('?'),params=new URLSearchParams(query);input.callback.requestPathBytes=Buffer.from(path+'?'+new URLSearchParams({state:params.get('state'),code:params.get('code')}));rejected(()=>verifyOAuthStateFlow(input),'callback_emitter_query_bytes');
});
test('callback expired at start fails; crossing expiry does not fabricate Date.now inside window',()=>{
    let input=state();input.callback.window={startedAt:iso(AT+600000),finishedAt:iso(AT+600001)};rejected(()=>verifyOAuthStateFlow(input),'callback_expired_before_verification');
    input=state();input.callback.window={startedAt:iso(AT+599999),finishedAt:iso(AT+600001)};assert.equal(verifyOAuthStateFlow(input).callbackWindowCrossesExpiry,true);
    input=state();input.callback.window.startedAt=iso(AT);rejected(()=>verifyOAuthStateFlow(input),'callback_expired_before_verification');
});
test('callback complete body hash binding grants no body/header normalization',()=>{
    const input=state();input.callback.responseBodyBytes=Buffer.from('unbound bytes');rejected(()=>verifyOAuthStateFlow(input),'callback_response_bytes_binding');
});
test('login state cannot acquire an operator field or unsupported slot',()=>{
    let input=state('M5.1.authorize.state');input.operatorRow=principals().operatorRow;input.operatorProof=principals().operatorProof;rejected(()=>verifyOAuthStateFlow(input),'login_has_no_operator');
    input=state();input.slot='arbitrary.token';rejected(()=>verifyOAuthStateFlow(input),'state_slot_not_whitelisted');
});
test('public failures never embed a supplied key, ciphertext, token or plaintext',()=>{
    const input=encrypted(2,{IDENTITY_PROVIDER_SECRET_KEY:'SENSITIVE_SENTINEL_PRIVATE_KEY'});input.keySources={JWT_SECRET:'wrong'};let failure;try{verifyEncryptedField(input)}catch(error){failure={name:error.name,message:error.message,code:error.code,stack:error.stack}}assert(failure);const publicError=JSON.stringify(failure);for(const secret of['SENSITIVE_SENTINEL_PRIVATE_KEY',input.row[input.column],input.expectedPlaintext])assert(!publicError.includes(secret));
});
