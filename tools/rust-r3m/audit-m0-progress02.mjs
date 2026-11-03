// Root adapts only verified actual reports; the pure auditor performs no IO.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pin } from './source-guard.mjs';
import { auditM0Coverage } from '../../tmp/rust-r3m/g2-d-audit/coverage-auditor01.mjs';
const attempt = process.argv[2]; assert(/^\d{2}$/.test(attempt));
const immutableCandidatePin = pin('tmp/rust-r3m/root/candidate-final01.json');
const candidate = JSON.parse(fs.readFileSync(immutableCandidatePin.file));
const inventory58 = JSON.parse(fs.readFileSync('docs/design/rust-r3-operation-slices.json')).operations.map(({operationId,method,path})=>({operationId,method,path}));
const apiReports = [];
for (const dir of fs.readdirSync('tmp/rust-r3m').filter(n=>/^acceptance-rust-final01-\d{2}$/.test(n)).sort()) {
  const file = 'tmp/rust-r3m/' + dir + '/report01.json'; if(!fs.existsSync(file)) continue;
  const report = JSON.parse(fs.readFileSync(file));
  const view = {...report,events:report.events.map(e=>({...e,path:e.route,status:e.response.status}))};
  apiReports.push({pin:pin(file),report:view});
}
const result = auditM0Coverage({inventory58,finalArtifactSha:candidate.currentRuntimeEntry.rawBytesSha256,immutableCandidatePin,apiReports});
const file = 'tmp/rust-r3m/m0-progress'+attempt+'.json';
fs.writeFileSync(file,JSON.stringify({kind:'R3-actual-M0-coverage-progress',candidate:immutableCandidatePin,actualRawReportsVerifiedByRoot:apiReports.map(x=>x.pin),explicitAdapter:'route -> path; response.status -> status; all other original fields retained; no success flags created',pureAuditor:pin('tmp/rust-r3m/g2-d-audit/coverage-auditor01.mjs'),result,stageIntegrationComplete:false,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({required:result.required,covered:result.covered,coverageComplete:result.coverageComplete,missing:result.missing,excludedReportCount:result.excludedReports?.length||0}));
