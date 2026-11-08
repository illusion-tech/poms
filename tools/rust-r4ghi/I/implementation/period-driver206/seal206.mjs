// Author FS-only seal. Never imports a business driver or reads active state.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { sha206, PERIOD206 } from './facts206.mjs';
const dir = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(dir, '../../../../..');
const rel = file => path.relative(root, file).split(path.sep).join('/');
const pin = file => { const bytes = fs.readFileSync(file); return { file: rel(file), bytes: bytes.length, rawBytesSha256: sha206(bytes) }; };
const write = (name, value) => { const file = dir + '/' + name, raw = Buffer.from(JSON.stringify(value,null,2)+'\n'); fs.writeFileSync(file,raw,{flag:'wx'}); return pin(file); };
const privateRoot = process.platform === 'win32' ? '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private' : '/home/wangzishi/.local/share/poms-r4ghi/private';
const sourceBytes = fs.readFileSync(privateRoot + '/source13-preparation193/sourcePins.json');
assert.equal(sha206(sourceBytes),'e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c');
const sources = JSON.parse(sourceBytes); assert.equal(sources.length,416); assert.equal(sha206(JSON.stringify(sources)), PERIOD206.sourcePinsSHA256);
for (const p of sources) assert.equal(sha206(fs.readFileSync(root + '/' + p.file)),p.sha256,'A Source13 leaf changed: '+p.file);
const files = ['driver206.mjs','facts206.mjs','input206.template.json','facts206.test.mjs','README206.md','seal206.mjs'].map(name=>pin(dir+'/'+name));
const checks = write('checks206.json', { kind:'author-observed-pure-FS-checks206', recordedAtUTC:new Date().toISOString(),
  command:[process.execPath,'--test','tools/rust-r4ghi/I/implementation/period-driver206/facts206.test.mjs'], exitCode:0, tests:16, passed:16, failed:0, skipped:0,
  resultBasis:'Observed exec_command result for the exact current driver/facts/test inputs; this JSON is an observation record, not captured original stdout',
  testedFiles:files.filter(p=>['driver206.mjs','facts206.mjs','facts206.test.mjs','input206.template.json'].some(n=>p.file.endsWith('/'+n))),
  immutableSource416FSHashCheck:{leaves:416,sourcePinsSHA256:PERIOD206.sourcePinsSHA256,allRootLeavesEqual:true},
  SQLOrHTTPExecuted:false,APIProcessAction:false,activeBusinessStateReadOrWritten:false,RootBusinessHelpersChanged:false,RootApplied:false,G3Certified:false,G4Certified:false });
const protocol = pin(root+'/tools/rust-r4ghi/period205-02/manifest205-02.json');
assert.equal(protocol.rawBytesSha256,'edd8e0ba23b0a8fd93e39797078918db08048d65f44dc4d8bcc51f52a638fd6a');
const manifest = write('manifest206.json', { kind:'proposed-external-Source13-H1-real-period-driver206', author:'/root/r4_period_engineering206',
  rootApplied:false,actualEffectsExecuted:false,H1OrB2Minted:false,G3Certified:false,G4Certified:false,sourcePinsSHA256:PERIOD206.sourcePinsSHA256,sourceCount:416,
  files,checks,requiredPeriodToolProtocol:protocol,
  proposedPromotion:[{source:files.find(p=>p.file.endsWith('/driver206.mjs')),target:'tools/rust-r4ghi/period-driver206/driver206.mjs'},
    {source:files.find(p=>p.file.endsWith('/facts206.mjs')),target:'tools/rust-r4ghi/period-driver206/facts206.mjs'},
    {source:files.find(p=>p.file.endsWith('/input206.template.json')),target:'tools/rust-r4ghi/period-driver206/input206.template.json'}],
  runtimePinsInTemplate:'All actual input pins are null; independently reviewed actual private inputs/H1/119/B2/Tax success required',
  requiredReviews:['Non-author exact code/protocol review','Root actual preparation and full dynamic inventory review before FI','Root actual FI originals review before normal POST'],
  effectModes:['prepare','fi-only','commit','read-verification'], unknownCommitPolicy:'Persist intent and originals; never replay uncertain/committed domain POST',
  businessBoundary:{projectId:PERIOD206.projectId,periodKey:PERIOD206.periodKey,naturalCompletedHKWeekOnly:true,sourceFactsFabricated:false,historicalBaselineReselectionApproved:false,
    periodUpdatesRealtimeCurrent:false,periodBindingsPublishCurrent:false,allNewPeriodTargetsRequireFreshLabor47Scope:true},
  preservedOriginals:['R3','H0','B0','B1','schema108','M97-business-baseline','Source12-original-successes-failures-and-partials'],
  notModified:['business H0/H1 helpers','Product Rust','Migration SQL/TS','Routes/DTO/OpenAPI/generated client','GitHub issue/PR state','Root source416','API/PG process or actual database'],
});
console.log(JSON.stringify({manifest,checks,source416Unchanged:true,RootApplied:false,SQLOrHTTPExecuted:false,G3Certified:false,G4Certified:false}));
