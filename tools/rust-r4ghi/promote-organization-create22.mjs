import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const rel='tools/rust-r4ghi/I/implementation/support-patches/organization-create22',author='E:/projects/worktrees/poms-r4i-lifecycle/poms',sha=b=>createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(author+'/'+rel+'/apply-manifest22.json');assert.equal(sha(raw),'4cd11cde4c9372aa7a3a10673fef3079a00b9a4c7959843ef352c93e8a312349');
const m=JSON.parse(raw);assert.equal(m.files.length,6);
const changes=m.files.map(f=>{const bytes=fs.readFileSync(author+'/'+rel+'/candidate/'+f.path);assert.equal(sha(fs.readFileSync(f.path)),f.beforeSHA256);assert.equal(sha(bytes),f.afterSHA256);return{f,bytes};});
const oldService=fs.readFileSync('apps/poms-api-rust/src/projects/service.rs','utf8'),newService=changes.find(x=>x.f.path.endsWith('projects/service.rs')).bytes.toString();
function protectedUpdate(s){return s.slice(s.indexOf('async fn update_with_session('),s.indexOf('async fn reassign_with_session('));}assert.equal(protectedUpdate(newService),protectedUpdate(oldService));
assert.equal(sha(fs.readFileSync('apps/poms-api-rust/src/projects/http.rs')),'132c2a4e0dd19e453f65d33558c579eb95e91208d27ce89882fc5ebf245d7a81');
const evidence=['apply-manifest22.json','bootstrap-source-audit-matrix22.json','m95-insert-guard-original.txt','m97-initial-ownership.sql','organization-create22.patch','README.md','shared-support22.json','source-inputs22-pre29.json','source-inputs22.json','static-check22.json'];
assert(!fs.existsSync(rel));fs.mkdirSync(rel,{recursive:true});for(const name of evidence)fs.writeFileSync(rel+'/'+name,fs.readFileSync(author+'/'+rel+'/'+name),{flag:'wx'});
const proposedSQL=fs.readFileSync(rel+'/m97-initial-ownership.sql');assert.equal(sha(proposedSQL),m.M97SQLSHA256);
const body=proposedSQL.toString().slice(proposedSQL.toString().indexOf('CREATE OR REPLACE FUNCTION'));
assert(body.startsWith('CREATE OR REPLACE FUNCTION poms.jghi_ownership_origin_insert_guard()'));assert(!/\b(?:UPDATE|DELETE|INSERT)\s+(?:INTO\s+)?poms\./i.test(body));
const sql='-- Forward M97: approved optional organization-owned project creation.\n-- M95/M96 remain immutable; no table, column, existing data or origin backfill.\n'+body;
const sqlFile='docs/design/rust-r4ghi/g2-initial-ownership03.sql';assert(!fs.existsSync(sqlFile));
const target='apps/poms-api/src/migrations/Migration20261107110000_rust_project_initial_ownership.ts';assert(!fs.existsSync(target));
const source='import { Migration } from "@mikro-orm/migrations";\n\n/** User decision8: real direct-create organization ownership; forward only. */\nexport class Migration20261107110000 extends Migration {\n    override async up(): Promise<void> {\n        this.addSql('+JSON.stringify(sql)+');\n    }\n}\n';
for(const{f,bytes}of changes){const candidate=rel+'/candidate/'+f.path;fs.mkdirSync(path.dirname(candidate),{recursive:true});fs.writeFileSync(candidate,bytes,{flag:'wx'});fs.writeFileSync(f.path,bytes);}
fs.writeFileSync(sqlFile,sql,{flag:'wx'});fs.writeFileSync(target,source,{flag:'wx'});
const receipt={kind:'Root-non-author-reviewed-real-organization-project-producer',capturedAt:new Date().toISOString(),manifest:rel+'/apply-manifest22.json',manifestSHA256:sha(raw),files:m.files,
  input:sqlFile,inputSHA256:sha(sql),target,targetSHA256:sha(source),proposalSQLSHA256:sha(proposedSQL),functionBodyIdenticalToReviewedProposal:true,
  migrationCountBefore:96,migrationCountAfter:97,plannedTablesAfter:139,sourceMatrix:rel+'/bootstrap-source-audit-matrix22.json',
  updateMetadataProtectedBytesEqual:true,reassign200Preserved:true,oldOriginBackfilled:false,sourceXminUsedOnlyAtCreation:true,
  actualCargoPending:true,executed:false,actualHTTPPending:true,newHTTP:0,G3Certified:false,G4Certified:false};
fs.writeFileSync('docs/design/rust-r4ghi/initial-ownership-migration-promotion03.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:changes.length,forwardMigration:target,SQLSHA256:sha(sql),executed:false}));
