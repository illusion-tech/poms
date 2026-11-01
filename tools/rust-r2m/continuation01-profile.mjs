// Literal-only continuation resource identity. No environment/private/DB IO.
import assert from 'node:assert/strict';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
export const continuation01=freeze({
 namespace:'poms-r2m',environmentId:'r2m-continuation01',profile:'r2m-stage-continuation01',
 planFile:'tools/rust-r2m/continuation01-plan.json',planRawSha256:'1aae7a0653968797e5b21dc9fa9e045e13ccb249d6a582c19c90d3bf8e38c2bb',
 oldMarker:'1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5',marker:'abd093b8-c584-45b3-9c62-6357ad6dfa5d',
 owner:'poms_r0e_owner',oldApp:'poms_r2m_app',app:'poms_r2m_c01_app',schema:'r2m_c01_control',
 databases:{nest:'poms_r2m_c01_nest',rust:'poms_r2m_c01_rust'},template:'poms_r2m_nest',templateOid:'16385',
 templateAdmission:{file:'tmp/rust-r2m/continuation01-template-admission01.json',rawBytesSha256:'7f2a2d9edd6b9783285c82edf748015d8c934fb4b52c6f9d0098485ab5e7fab3'},
 quarantine:{file:'tmp/rust-r2m/m5-original-rust-quarantine01.json',rawBytesSha256:'e722a471ec3062a32e06c0010b4e09d0bbede21e8613da365668bb7f1d07190b'},
 sourceRowsSha256:'951d4d4c5ca3e4faa9a005d093c3714e6181c0068c94cd0bd34a75b6f118a22f',
 cluster:{host:'127.0.0.1',hostPort:20432,serverPort:'15432',version:'150012',isolated:'on',timezone:'Etc/GMT-8'},
 state:'/home/wangzishi/.local/share/poms-r2m-continuation01',private:'/home/wangzishi/.local/share/poms-r2m-continuation01/private',
 originalOwnerFile:'/home/wangzishi/.local/share/poms-r2m/private/owner-password',
 seed:{file:'/home/wangzishi/.local/share/poms-r2m/private/acceptance-runs/nest-3cc41db5-c2e0-492a-b90e-262e56b32c90/00001.json',bytes:432851,rawBytesSha256:'6c2b95dfbd159096e528d1b112a84f8bb0b7dbe834588bbcd31f0333bb9c2a88'},
 oldRust:{oid:'17085',datname:'poms_r2m_rust',owner:'poms_r0e_owner',datallowconn:false,datconnlimit:-1,acl:'{poms_r0e_owner=CTc/poms_r0e_owner,poms_r2m_app=Tc/poms_r0e_owner}',encoding:6,datcollate:'en_US.UTF-8',datctype:'en_US.UTF-8'},
 linuxWorkspace:'/home/wangzishi/projects/poms-rust-r2m',variant:'tools/rust-r2m-continuation01',output:'tmp/rust-r2m-continuation01'
});
export function continuationDatabase(backend){assert(['nest','rust'].includes(backend));return continuation01.databases[backend]}
export function continuationAmbient(env){assert(env&&typeof env==='object');assert(!Object.keys(env).some(key=>/^(?:PG|DB_|MIKRO_)/i.test(key)||/^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS|POMS_ENV_FILE)$/i.test(key)),'Ambient DB/process/private override refused')}
export function validateContinuationPlan(plan){
 assert(plan.kind==='R2M-continuation01-literal-isolation-design'&&plan.environmentId===continuation01.environmentId&&plan.namespace===continuation01.namespace);
 assert.deepEqual(plan.resources.databases,[{backend:'nest',name:continuationDatabase('nest')},{backend:'rust',name:continuationDatabase('rust')}]);
 assert.equal(plan.resources.role.name,continuation01.app);assert.equal(plan.resources.marker,continuation01.marker);assert.equal(plan.resources.markerSchema,continuation01.schema);assert.equal(plan.resources.stateRoot,continuation01.state);assert.equal(plan.resources.privateRoot,continuation01.private);
 assert.deepEqual(plan.resources.role,{name:continuation01.app,login:true,superuser:false,createdb:false,createrole:false,bypassrls:false,replication:false,inherit:false,memberships:0,connectionLimit:20});return plan;
}
// The public original envPlan values are repeated exactly; this function takes
// only fresh explicit synthetic/runtime keys. No old env is read or rewritten.
export function continuationEnvironment(backend,{appPassword,jwtSecret}){
 assert(/^[0-9a-f]{64}$/.test(appPassword)&&/^[0-9a-f]{64}$/.test(jwtSecret)&&appPassword!==jwtSecret);const database=continuationDatabase(backend);
 return `NODE_ENV=test\nHOST=127.0.0.1\nPORT=${backend==='nest'?10070:10071}\nDB_CONNECT=true\nDB_HOST=127.0.0.1\nDB_PORT=20432\nDB_DATABASE=${database}\nDB_USER=${continuation01.app}\nDB_PASSWORD=${appPassword}\nDB_SCHEMA=poms\nJWT_SECRET=${jwtSecret}\nCORS_ORIGIN=http://127.0.0.1:10080\nATTACHMENT_STORAGE_PROVIDER_SECRET_KEY=${jwtSecret}\nPOMS_ATTACHMENT_LOCAL_ROOT=${continuation01.state}/objects/${backend}/server01\nIDENTITY_PROVIDER_SECRET_KEY=${jwtSecret}\nIDENTITY_PROVIDER_STATE_KEY=${jwtSecret}\nFEISHU_OPEN_API_BASE_URL=http://127.0.0.1:10090\nFEISHU_OAUTH_AUTHORIZE_URL=http://127.0.0.1:10090/oauth/authorize\nFEISHU_OAUTH_TOKEN_URL=http://127.0.0.1:10090/oauth/token\nFEISHU_USER_INFO_URL=http://127.0.0.1:10090/oauth/user-info\nFEISHU_USER_SEARCH_URL=http://127.0.0.1:10090/search/users\nFEISHU_USER_BATCH_URL=http://127.0.0.1:10090/contact/users/batch\nFEISHU_DEPARTMENT_BATCH_URL=http://127.0.0.1:10090/contact/departments/batch\nFEISHU_TENANT_ACCESS_TOKEN_URL=http://127.0.0.1:10090/tenant-token\nFEISHU_DEPARTMENT_CHILDREN_URL_TEMPLATE=http://127.0.0.1:10090/departments/{departmentId}/children\nFEISHU_API_TIMEOUT_MS=1000\nFEISHU_ORG_DEPARTMENT_PAGE_SIZE=2\n`;
}
