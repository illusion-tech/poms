// Metadata-only compatibility revision; original206 runtime bytes are sealed.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
const d=path.dirname(fileURLToPath(import.meta.url)),r=path.resolve(d,'../../../../..'),sha=x=>createHash('sha256').update(x).digest('hex');
const read=p=>{const raw=fs.readFileSync(r+'/'+p.file);assert.equal(sha(raw),p.rawBytesSha256);return JSON.parse(raw);},pin=f=>({file:f,rawBytesSha256:sha(fs.readFileSync(r+'/'+f))});
const oldPin={file:'tools/rust-r4ghi/I/implementation/period-driver206/manifest206.json',rawBytesSha256:'8f0a963745a1e954f731b05c4bf0079312067dc3865adc55e283f77769d1e18d'},old=read(oldPin);for(const p of old.files)readFile(p);
function readFile(p){assert.equal(sha(fs.readFileSync(r+'/'+p.file)),p.rawBytesSha256);}
const period=pin('tools/rust-r4ghi/period205-04/manifest205-04.json'),resource=pin('tools/rust-r4ghi/H/implementation/support-patches/resource-tool-admission119-02/manifest119-code02.json');
assert.equal(period.rawBytesSha256,'f2ec3aefe405e1dc6b4d7dd12762d0c682e518d0fe40142ad083b9a45ec52073');assert.equal(resource.rawBytesSha256,'43b9c1b0a51a59b0286620bc225b2c4b5446d5cd1d0e4a9480b8fd46bcdf3eb9');
const checks={kind:'FS-only-206-final-protocol-compatibility-check02',originalManifest:oldPin,allSixOriginalFilesUnchanged:true,runtimeCodeChanged:false,
  expectedExports119:['effectiveHelperPins119(ctx,baseR3)->pin','assertRuntimeBinding119(ctx,baseR3,{toolAdmission119,candidate})'],
  periodPreparationInterface:'scope.periodPreparation remains exact current public HTTP pin; full preparation/decision/member guards are final20504',
  original16PureTestsRetainOriginalLabels:true,testsRerunThisMetadataRevision:false,H1Admitted:false,actualSQLOrHTTPExecuted:false,RootApplied:false,G3Certified:false,G4Certified:false};
const write=(n,v)=>{fs.writeFileSync(d+'/'+n,JSON.stringify(v,null,2)+'\n',{flag:'wx'});return pin(path.relative(r,d+'/'+n).split(path.sep).join('/'));};
const c=write('checks206-02.json',checks),manifest=write('manifest206-02.json',{...old,kind:'proposed-external-Source13-H1-real-period-driver206-final-protocol02',predecessorManifest:oldPin,
 requiredPeriodToolProtocol:period,requiredResourceToolProtocol:resource,checks:c,originalAuthorChecks:old.checks,runtimeCodeChanged:false,originalFilesUnchanged:true,
 compatibility:'Only metadata aligns with final reviewed20504 and119 code02. Actual119/H1/B2 and Tax/period/effect pins still require future Root observations; no proposed pin is an actual admission.'});
console.log(JSON.stringify({manifest,checks:c,runtimeCodeChanged:false,RootApplied:false,actualSQLOrHTTPExecuted:false}));
