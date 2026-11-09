// Immutable first-read observations used by the actual compiler and JSON parser.
// No top-level I/O. The global TypeScript system is never patched.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { strictBytes273,immutableCopy273 } from './source-access273.mjs';
const sha = raw => createHash('sha256').update(raw).digest('hex');
const decode = raw => { const text=raw.toString('utf8');assert(Buffer.from(text,'utf8').equals(raw),'Capture inputs must be lossless UTF8');return text; };
export function createRawObservation273(workspace, system) {
    const root=path.resolve(workspace),reads=new Map(),probes=new Map(),semanticJSON=new Set();
    const key=file=>process.platform==='win32'?path.resolve(file).toLowerCase():path.resolve(file);
    const relative=file=>path.relative(root,path.resolve(file)).replaceAll('\\','/');
    const location=file=>{const name=relative(file);if(!name.startsWith('../')&&!path.isAbsolute(name)&&!name.split('/').includes('node_modules'))return{kind:'workspace',file:name};
        if(path.resolve(file).replaceAll('\\','/').split('/').includes('node_modules'))return{kind:'dependency',file:path.resolve(file)};
        const parent=path.dirname(path.resolve(file));assert(path.basename(file)==='package.json'&&(root+path.sep).startsWith(parent+path.sep),'Unregistered external compiler input');return{kind:'environment-metadata',file:path.resolve(file)};};
    function actual(file,where){
        if(where.kind==='workspace')return{raw:strictBytes273(root,where.file),realpath:path.resolve(file)};
        const info=statSync(file);assert(info.isFile(),'External compiler dependency is not a regular file');
        return{raw:readFileSync(file),realpath:realpathSync(file)};
    }
    function read(file){const absolute=path.resolve(file),id=key(absolute);if(reads.has(id))return reads.get(id);
        let present;try{present=statSync(absolute).isFile();}catch(error){if(error.code!=='ENOENT'&&error.code!=='ENOTDIR')throw error;present=false;}
        if(!present)return undefined;const where=location(absolute),observed=actual(absolute,where);
        const record={...where,absolute,realpath:observed.realpath,raw:Buffer.from(observed.raw)};reads.set(id,record);return record;}
    function probe(method,args,run){const copied=structuredClone(args),id=method+JSON.stringify(copied);if(probes.has(id))return structuredClone(probes.get(id).result);
        const result=run();probes.set(id,{method,args:copied,result:structuredClone(result)});return result;}
    const api={
        readText(file){const record=read(file);return record?decode(record.raw):undefined;},
        readRaw(file){const record=read(file);assert(record,'Required observed input is absent');return Buffer.from(record.raw);},
        readJSON(relativePath){semanticJSON.add(relativePath);return JSON.parse(api.readRaw(path.resolve(root,relativePath)));},
        fileExists(file){return probe('fileExists',[file],()=>{const present=system.fileExists(file);if(present)assert(read(file),'Positive compiler existence probe must have captured bytes');return present;});},
        directoryExists(file){return probe('directoryExists',[file],()=>Boolean(system.directoryExists?.(file)));},
        readDirectory(...args){return probe('readDirectory',args,()=>system.readDirectory(...args));},
        getDirectories(file){return probe('getDirectories',[file],()=>system.getDirectories(file));},
        realpath(file){return probe('realpath',[file],()=>system.realpath?system.realpath(file):path.resolve(file));},
        assertStable(){
            for(const record of reads.values()){const now=actual(record.absolute,record);assert.equal(now.realpath.toLowerCase(),record.realpath.toLowerCase(),'Observed input realpath changed');assert(now.raw.equals(record.raw),'Observed semantic input changed: '+record.file);}
            for(const p of probes.values()){const now=system[p.method]?system[p.method](...p.args):p.method==='realpath'?path.resolve(p.args[0]):false;assert.deepEqual(now,p.result,'Compiler dependency discovery changed: '+p.method);}
        },
        snapshotInputs(extra=[]){for(const file of extra)api.readRaw(path.resolve(root,file));api.assertStable();return[...reads.values()].filter(r=>r.kind==='workspace').map(r=>({file:r.file,raw:Buffer.from(r.raw)})).sort((a,b)=>a.file.localeCompare(b.file));},
        proof(){api.assertStable();return immutableCopy273({kind:'exact-raw-semantic-observation273-v2',workspaceFiles:[...reads.values()].filter(r=>r.kind==='workspace').map(r=>({file:r.file,bytes:r.raw.length,rawBytesSHA256:sha(r.raw)})).sort((a,b)=>a.file.localeCompare(b.file)),externalReads:[...reads.values()].filter(r=>r.kind!=='workspace').map(r=>({file:r.file,kind:r.kind,realpath:r.realpath,bytes:r.raw.length,rawBytesSHA256:sha(r.raw)})),semanticJSON:[...semanticJSON].sort(),dependencyProbes:[...probes.values()]});},
        sourceIdentity(file){const record=read(file);assert(record);assert(record.kind!=='environment-metadata','SourceFile cannot import an ancestor package as workspace code');return{file:record.file,kind:record.kind,bytes:record.raw.length,rawBytesSHA256:sha(record.raw),text:decode(record.raw)};}
    };return Object.freeze(api);
}
export function observeTypeScriptProgram273(root,ts,observation,config='apps/poms-api/tsconfig.app.json') {
    const diagnostics=[];
    const configHost={...ts.sys,getCurrentDirectory:()=>path.resolve(root),readFile:file=>observation.readText(file),fileExists:file=>observation.fileExists(file),directoryExists:file=>observation.directoryExists(file),readDirectory:(...args)=>observation.readDirectory(...args),getDirectories:file=>observation.getDirectories(file),realpath:file=>observation.realpath(file),onUnRecoverableConfigFileDiagnostic:diagnostic=>diagnostics.push(diagnostic)};
    const parsed=ts.getParsedCommandLineOfConfigFile(path.resolve(root,config),{noEmit:true},configHost);assert(parsed,'TypeScript config could not be parsed');diagnostics.push(...parsed.errors);
    const options={...parsed.options,noEmit:true},host=ts.createCompilerHost(options);
    Object.assign(host,{getCurrentDirectory:()=>path.resolve(root),readFile:file=>observation.readText(file),fileExists:file=>observation.fileExists(file),directoryExists:file=>observation.directoryExists(file),readDirectory:(...args)=>observation.readDirectory(...args),getDirectories:file=>observation.getDirectories(file),realpath:file=>observation.realpath(file),writeFile:()=>{throw new Error('Capture compilation may not emit');},getSourceFile(file,languageVersion,onError){try{const text=observation.readText(file);return text===undefined?undefined:ts.createSourceFile(file,text,languageVersion,true);}catch(error){if(onError)onError(error.message);throw error;}}});
    const program=ts.createProgram(parsed.fileNames,options,host);diagnostics.push(...ts.getPreEmitDiagnostics(program));
    const errors=diagnostics.filter(item=>item.category===ts.DiagnosticCategory.Error);
    const sourceFiles=program.getSourceFiles().map(source=>{const record=observation.sourceIdentity(source.fileName);assert.equal(source.text,record.text,'Compiler SourceFile text differs from captured raw');return{file:record.file,kind:record.kind,bytes:record.bytes,rawBytesSHA256:record.rawBytesSHA256,textSHA256:sha(source.text)};});
    observation.assertStable();return{program,errors,proof:{version:ts.version,currentApiTypeErrors:errors.length,rootNames:parsed.fileNames.map(file=>path.relative(root,file).replaceAll('\\','/')),sourceFiles}};
}
