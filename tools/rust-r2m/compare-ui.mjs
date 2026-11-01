// Root executes --run after C source review. --check reads public pins only.
// This module starts no process, browser, HTTP client, database or environment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareUiCaptured,sha,ui1TableCounts} from './compare-ui-core.mjs';
import {uiProfile} from './compare-ui-profile.mjs';
import {verifySourceCap} from './acceptance-source.mjs';

const root=path.resolve(import.meta.dirname,'../..');
const linuxRoot='/home/wangzishi/projects/poms-rust-r2m';
const privateRoot='/home/wangzishi/.local/share/poms-r2m/private';
const hash=/^[0-9a-f]{64}$/;
const exactly=(list,test,message)=>{const found=list.filter(test);assert.equal(found.length,1,message);return found[0]};

function regularBytes(file,{privateFile=false}={}){
    const absolute=path.resolve(file);let part=path.parse(absolute).root;
    for(const name of absolute.slice(part.length).split(path.sep).filter(Boolean)){part=path.join(part,name);const stat=fs.lstatSync(part);assert(!stat.isSymbolicLink(),'Evidence/source symlink refused');}
    const fd=fs.openSync(absolute,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
    try{const before=fs.fstatSync(fd);assert(before.isFile()&&before.nlink===1&&before.size<=64*1024*1024,'Evidence must be one bounded regular non-hardlinked file');if(privateFile){assert.equal(before.mode&0o077,0);assert.equal(before.uid,process.getuid());}const raw=fs.readFileSync(fd),after=fs.fstatSync(fd);assert(before.dev===after.dev&&before.ino===after.ino&&before.size===after.size&&before.mtimeMs===after.mtimeMs&&raw.length===before.size,'Evidence changed while reading');return raw;}finally{fs.closeSync(fd);}
}
function publicFile(file){
    assert(typeof file==='string'&&!path.isAbsolute(file)&&!file.includes('\\')&&file.split('/').every(x=>x&&x!=='.'&&x!=='..'));
    assert(!file.split('/').some(x=>/^(?:private|\.git|node_modules|target)$/i.test(x)||/^\.env(?:\.|$)/i.test(x)));
    const resolved=path.resolve(root,file);assert(resolved.startsWith(root+path.sep));return resolved;
}
function readPublic(pin){
    assert(pin&&hash.test(pin.rawBytesSha256));const raw=regularBytes(publicFile(pin.file));assert.equal(sha(raw),pin.rawBytesSha256,'Public exact raw-byte pin changed');if(pin.bytes!==undefined)assert.equal(raw.length,pin.bytes);return{value:JSON.parse(raw),pin:{file:pin.file,bytes:raw.length,rawBytesSha256:sha(raw)}};
}
function readPrivate(pin,allowed){
    assert(pin&&allowed(pin.file)&&hash.test(pin.rawBytesSha256)&&Number.isSafeInteger(pin.bytes)&&pin.bytes>=0,'Only an explicit new-M run evidence pin may be read');const raw=regularBytes(pin.file,{privateFile:true});assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.rawBytesSha256,'Private exact raw-byte pin changed');return JSON.parse(raw);
}

export function checkUiComparisonInput({input,inputPin,manifest,manifestPin}){
    assert(input.kind==='R2M-UI-pinned-comparison-input'&&input.UI3To4Ready===false);const profile=uiProfile(input.profile);assert.deepEqual(Object.keys(profile.expectedHttpCount).sort(),['nest','rust']);const tables=Object.keys(ui1TableCounts);if(profile.journeys.includes('UI2'))tables.push('audit_log');assert.deepEqual(Object.keys(profile.expectedTableCounts).sort(),tables.sort(),'Only the named UI1/UI2 producer graph is admitted');
    assert(manifest.kind==='R2M-UI-offline-comparison-source'&&manifest.actualPrivateComparisonExecuted===false);assert(Array.isArray(manifest.reviewedSources)&&manifest.reviewedSources.length>0);for(const pin of manifest.reviewedSources){const raw=regularBytes(publicFile(pin.file));assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.rawBytesSha256,'Comparison implementation changed after source review');}
    for(const file of['tools/rust-r2m/compare-ui.mjs','tools/rust-r2m/compare-ui-core.mjs','tools/rust-r2m/acceptance-facts.mjs','tools/rust-r2m/acceptance-compare.mjs','tools/rust-r2m/scenario-expected.mjs','tools/rust-r2m/acceptance-source.mjs'])assert(manifest.reviewedSources.some(x=>x.file===file));
    readPublic(input.metadata);const cap=readPublic(input.sourceCap),sourceCap=cap.value;verifySourceCap(sourceCap);assert.equal(sourceCap.id,input.sourceCapId);assert.equal(sourceCap.manifestSha256,input.sourceManifestSha256);
    const authorityPin=exactly(sourceCap.files,x=>x.file==='tools/rust-r2m/reference-authority.json','Pinned complete physical source authority required'),authority=readPublic(authorityPin).value;assert.equal(authority.tables.length,107);const surfacePin=exactly(sourceCap.files,x=>x.file==='docs/design/rust-r2m/acceptance-input.json','Original frozen115 input required'),surface=readPublic(surfacePin).value.sourceProtection.currentSurface;assert.equal(surface.length,115);
    const sides={};for(const backend of['nest','rust']){const side=input.sides[backend];assert(typeof side?.runId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(side.runId),'Only a literal run UUID may form a private evidence directory');const report=readPublic(side.report);assert.equal(report.value.backend,backend);assert.equal(report.value.runId,side.runId);assert(side.finalLedger.lateReadOfFinalCompletedLedger===true,'Final cleaned ledger is a new explicit late-read pin, never an invented original report reference');assert.equal(side.finalLedger.file,privateRoot+'/m-runs/'+backend+'-'+side.runId+'.json');sides[backend]={...side,report:report.value,reportPin:report.pin};}
    return{input,inputPin,manifestPin,sourceCap,authority,surface,sides,publicPins:[inputPin,manifestPin,cap.pin,...Object.values(sides).map(s=>s.reportPin),{file:authorityPin.file,bytes:authorityPin.bytes,rawBytesSha256:authorityPin.rawBytesSha256},{file:surfacePin.file,bytes:surfacePin.bytes,rawBytesSha256:surfacePin.rawBytesSha256}]};
}

function captureSide(checked,backend){
    const side=checked.sides[backend],directory=privateRoot+'/ui-runs/'+backend+'-'+side.runId+'/',allowed=file=>typeof file==='string'&&file.startsWith(directory)&&/^\d{5}\.json$/.test(file.slice(directory.length));
    const records=side.report.evidence.map(ref=>{assert(ref.private===true);const value=readPrivate(ref,allowed);assert.equal(value.kind,ref.kind);return{kind:value.kind,record:value.record,ref:{file:ref.file,bytes:ref.bytes,rawBytesSha256:ref.rawBytesSha256}};});
    const finalLedger=readPrivate(side.finalLedger,file=>file===side.finalLedger.file);
    return{report:side.report,records,finalLedger,authority:checked.authority,sourceCap:checked.sourceCap,profile:checked.input.profile,surface:checked.surface};
}
function privateDestination(tag){
    assert.equal(process.platform,'linux');assert.equal(fs.realpathSync(root),linuxRoot);assert.equal(process.cwd(),linuxRoot);assert(/^[a-z][a-z0-9-]{0,30}$/.test(tag));
    const base=privateRoot+'/ui-comparisons';assert(fs.statSync(privateRoot).isDirectory()&&!fs.lstatSync(privateRoot).isSymbolicLink());assert.equal(fs.statSync(privateRoot).mode&0o077,0);if(!fs.existsSync(base))fs.mkdirSync(base,{mode:0o700});assert(!fs.lstatSync(base).isSymbolicLink()&&fs.statSync(base).isDirectory());assert.equal(fs.statSync(base).mode&0o077,0);
    const directory=base+'/'+tag;fs.mkdirSync(directory,{mode:0o700});return directory;
}
function retain(file,value){const raw=Buffer.from(JSON.stringify(value,null,2)+'\n');fs.writeFileSync(file,raw,{flag:'wx',mode:0o600});return{file,bytes:raw.length,rawBytesSha256:sha(raw),private:true};}

export async function cli(args=process.argv.slice(2)){
    const options={};for(let at=0;at<args.length;at++){const key=args[at];assert(['--check','--run','--input','--input-sha','--manifest','--manifest-sha','--tag'].includes(key)&&!Object.hasOwn(options,key));if(['--check','--run'].includes(key))options[key]=true;else{assert(args[at+1]);options[key]=args[++at];}}
    assert(Boolean(options['--check'])!==Boolean(options['--run']));const input=readPublic({file:options['--input'],rawBytesSha256:options['--input-sha']}),manifest=readPublic({file:options['--manifest'],rawBytesSha256:options['--manifest-sha']}),checked=checkUiComparisonInput({input:input.value,inputPin:input.pin,manifest:manifest.value,manifestPin:manifest.pin});
    if(options['--check']){const result={kind:'R2M-UI-comparison-public-input-check',result:'public-inputs-and-source-pins-valid',sourceCapId:checked.sourceCap.id,journeys:checked.input.profile.journeys,privateRead:false,actualCompared:false,UI3To4Ready:false};console.log(JSON.stringify(result));return result;}
    const tag=options['--tag'],directory=privateDestination(tag),output=publicFile('tmp/rust-r2m/compare-ui-'+tag+'.json');assert(!fs.existsSync(output));const result={kind:'R2M-UI-offline-comparison-result',result:'pending',sourceCapId:checked.sourceCap.id,inputs:checked.publicPins,profile:checked.input.profile,rawPrivateValuesDisclosed:false,UI3To4Ready:false,cacheEquivalenceCertified:false};
    try{const compared=compareUiCaptured({native:captureSide(checked,'nest'),rust:captureSide(checked,'rust')});readPublic(input.pin);readPublic(manifest.pin);checkUiComparisonInput({input:input.value,inputPin:input.pin,manifest:manifest.value,manifestPin:manifest.pin});const evidence=retain(directory+'/comparison.json',compared);Object.assign(result,{result:compared.result,journeys:compared.journeys,actualHttpPerSide:compared.actualHttpPerSide,actualUiStepsPerSide:compared.actualUiStepsPerSide,full107FramesCompared:compared.full107FramesCompared,proofs:compared.proofs,remainingDifferences:compared.remainingDifferences,acceptedDifferences:compared.acceptedDifferences,evidence});if(compared.remainingDifferences.length)process.exitCode=1;
    }catch(error){const evidence=retain(directory+'/failure.json',{kind:'R2M-UI-private-comparison-failure',error:{name:error.name,message:error.message,stack:error.stack,code:error.code},sourceCapId:checked.sourceCap.id,inputSha256:input.pin.rawBytesSha256});Object.assign(result,{result:'failed-required-proof-preserved',failure:{name:error.name,rawMessageOmitted:true},evidence});process.exitCode=1;
    }finally{fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:path.relative(root,output).split(path.sep).join('/'),result:result.result,remainingDifferences:result.remainingDifferences?.length??null,privateErrorPreserved:result.result==='failed-required-proof-preserved',UI3To4Ready:false}));}
    return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(error=>{process.exitCode=1;console.error(JSON.stringify({kind:'R2M-UI-public-entry-failure',name:error.name,rawMessageOmitted:true,privateRead:'not-attested-by-entry-handler'}));});
