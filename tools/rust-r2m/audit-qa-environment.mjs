// Exact new-QA environment, separate from every original managed profile.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {publicJson,validateQaPlan,qaRoot,readNewPrivate,sha} from './audit-qa-common.mjs';
const KEYS=new Set(['NODE_ENV','HOST','PORT','DB_CONNECT','DB_HOST','DB_PORT','DB_DATABASE','DB_USER','DB_PASSWORD','DB_SCHEMA','JWT_SECRET','CORS_ORIGIN','IDENTITY_PROVIDER_SECRET_KEY','IDENTITY_PROVIDER_STATE_KEY','FEISHU_OPEN_API_BASE_URL','FEISHU_OAUTH_AUTHORIZE_URL','FEISHU_OAUTH_TOKEN_URL','FEISHU_USER_INFO_URL','FEISHU_USER_SEARCH_URL','FEISHU_USER_BATCH_URL','FEISHU_DEPARTMENT_BATCH_URL','FEISHU_TENANT_ACCESS_TOKEN_URL','FEISHU_DEPARTMENT_CHILDREN_URL_TEMPLATE','FEISHU_API_TIMEOUT_MS','FEISHU_ORG_DEPARTMENT_PAGE_SIZE','ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY','POMS_ATTACHMENT_LOCAL_ROOT']);
export function systemOnly(env){const allowed=new Set(['PATH','HOME','USER','LOGNAME','TEMP','TMP','TMPDIR','LANG','LC_ALL','LC_CTYPE','TZ','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','USERPROFILE','APPDATA','LOCALAPPDATA']);return Object.fromEntries(Object.entries(env).filter(([key,value])=>allowed.has(key.toUpperCase())&&typeof value==='string'))}
export function loadQaEnvironment(id){
    assert.equal(process.platform,'linux');const plan=validateQaPlan(publicJson('tools/rust-r2m/audit-qa-admission.json')),resource=plan.resources.find(row=>row.id===id);assert(resource);
    const journal=JSON.parse(readNewPrivate(qaRoot+'/resources.json'));assert(journal.state==='three-QA-resources-ready-not-run'&&journal.protectedMRowsAndAclUnchanged===true);const owned=journal.resources.find(row=>row.id===id);assert(owned?.state==='admitted-isolated-QA-resource'&&owned.database===resource.database&&owned.role===resource.role&&owned.marker===resource.marker&&owned.databaseOid&&owned.roleOid);
    const raw=readNewPrivate(resource.envFile);assert.equal(sha(raw),owned.envSha256);const require=createRequire(import.meta.url),parsed=require('dotenv').parse(raw);for(const key of Object.keys(parsed))assert(KEYS.has(key));
    for(const[key,value]of Object.entries({NODE_ENV:'test',HOST:'127.0.0.1',PORT:String(resource.port),DB_CONNECT:'true',DB_HOST:'127.0.0.1',DB_PORT:'20432',DB_DATABASE:resource.database,DB_USER:resource.role,DB_SCHEMA:'poms',CORS_ORIGIN:'http://127.0.0.1:10080',POMS_ATTACHMENT_LOCAL_ROOT:resource.objectRoot}))assert.equal(parsed[key],value);
    assert.equal(parsed.DB_PASSWORD,readNewPrivate(resource.passwordFile).toString('utf8'));assert(/^[0-9a-f]{64}$/.test(parsed.DB_PASSWORD)&&/^[0-9a-f]{64}$/.test(parsed.JWT_SECRET));for(const key of['IDENTITY_PROVIDER_SECRET_KEY','IDENTITY_PROVIDER_STATE_KEY','ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY'])assert.equal(parsed[key],parsed.JWT_SECRET);
    for(const key of Object.keys(parsed).filter(key=>key.startsWith('FEISHU_')&&!['FEISHU_OPEN_API_BASE_URL','FEISHU_API_TIMEOUT_MS','FEISHU_ORG_DEPARTMENT_PAGE_SIZE'].includes(key)))assert(parsed[key].startsWith('http://127.0.0.1:10090/'));
    assert.equal(parsed.FEISHU_OPEN_API_BASE_URL,'http://127.0.0.1:10090');
    return{plan,resource,owned,env:{...systemOnly(process.env),...parsed,POMS_ENV_FILE:resource.envFile,NO_PROXY:'localhost,127.0.0.1,::1',no_proxy:'localhost,127.0.0.1,::1',NX_DAEMON:'false',NX_SKIP_NX_CACHE:'true'}};
}
