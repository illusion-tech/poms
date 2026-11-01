import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { databaseClient } from './database-client.mjs';
import { verifyFullCatalog } from './catalog-complete.mjs';
import { publicFixtureError } from './audit-error.mjs';
export async function catalogReadonly(tag) {
 assert.equal(process.cwd(), '/home/wangzishi/projects/poms-rust-r2m'); assert(/^[a-z0-9-]{1,30}$/.test(tag ?? ''));
 const file = 'tmp/rust-r2m/catalog-readonly-'+tag+'.json'; assert(!fs.existsSync(file));
 const report={formatVersion:1,result:'pending',kind:'fresh-R2M-full107-catalog-readonly',startedAt:new Date().toISOString(),databases:[]};
 try { for(const backend of ['nest','rust']) { const client=await databaseClient(backend); try { await client.query('BEGIN READ ONLY');report.databases.push({backend,result:await verifyFullCatalog(client)});await client.query('ROLLBACK'); } finally { await client.end(); } } report.result='pass'; }
 catch(error) { report.result='fail';report.failure=publicFixtureError(error,'catalog'); }
 report.finishedAt=new Date().toISOString();report.authorityRawBytesSha256=createHash('sha256').update(fs.readFileSync('tools/rust-r2m/reference-authority.json')).digest('hex');
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){const report=await catalogReadonly(process.argv[2]);console.log(JSON.stringify(report));if(report.result!=='pass')process.exitCode=1;}
