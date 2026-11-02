// Root-only export of this task's owned UI cohort; never reads prior task private state.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parse} from 'dotenv';
assert.equal(process.platform,'linux');
assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r3ab');
const source='/home/wangzishi/.local/share/poms-r3ab/private';
const target=source+'/windows-export01';
assert(!fs.existsSync(target));fs.mkdirSync(target,{mode:0o700});
assert(fs.statSync(target).isDirectory());
for(const backend of ['nest','rust']) {
 const report=JSON.parse(fs.readFileSync(`tmp/rust-r3ab/acceptance-attempt05-${backend}/report01.json`));
 assert.equal(report.batchId,'82365c8a-8888-4af7-80b3-2c3df32b2f63');
 assert.equal(report.marker,'08609152-7a46-4b18-8861-f0f8a38d9e3e');
 const cohort=JSON.parse(fs.readFileSync(`${source}/runs/${report.runId}/private-context.json`));
 assert.equal(cohort.runId,report.runId);
 fs.writeFileSync(`${target}/ui-${backend}-input.json`,JSON.stringify({runId:cohort.runId,identifiers:cohort.identifiers,actors:{admin:cohort.actors.admin}},null,2)+'\n',{flag:'wx',mode:0o600});
}
fs.writeFileSync(`${target}/owner-password`,fs.readFileSync(`${source}/owner-password`),{flag:'wx',mode:0o600});
const env=parse(fs.readFileSync(`${source}/nest.env`));
assert.equal(env.DB_DATABASE,'poms_r3ab_nest');assert.equal(env.PORT,'11100');
env.PORT='11110';
fs.writeFileSync(`${target}/nest.env`,Object.entries(env).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({exportedOwnedCohorts:2,marker:'08609152-7a46-4b18-8861-f0f8a38d9e3e',secretsPrinted:false}));
