import test from 'node:test';
import assert from 'node:assert/strict';
import {phases,originalRunnerCommand} from './audit-qa-run.mjs';
import {systemOnly} from './audit-qa-environment.mjs';
test('original API and legacy runner commands are finite and do not substitute unit Jest',()=>{
    const resolve=name=>'installed:'+name,report='/new-M-private/report.json';
    const full=originalRunnerCommand({phase:'nest-full',tag:'pure',requirePath:resolve,reportFile:report});assert(full.includes('poms-api-e2e:e2e'));assert(!full.includes('poms-api:test'));assert(full.includes('--outputFile='+report));
    const legacy=originalRunnerCommand({phase:'legacy',tag:'pure',requirePath:resolve,reportFile:report});assert.equal(legacy[0],'installed:@playwright/test/cli');assert(legacy.includes('tools/rust-r2m/audit-qa-playwright.config.mjs'));assert.equal(phases['foundation-rust'].resource,'rust-foundation');assert.throws(()=>originalRunnerCommand({phase:'all291-rust',tag:'pure',requirePath:resolve,reportFile:report}));
});
test('QA test runners do not inherit runtime DB/JWT, managed env or old fixture-profile overrides',()=>{
    const env=systemOnly({PATH:'/bin',HOME:'/home/test',DB_PASSWORD:'secret',JWT_SECRET:'secret',NODE_OPTIONS:'--inspect',POMS_ENV_FILE:'/old/private/nest.env',POMS_E2E_FIXTURE_RUN_ID:'old',POMS_E2E_ENV_PROFILE:'r2gh'});assert.deepEqual(env,{PATH:'/bin',HOME:'/home/test'});
});
