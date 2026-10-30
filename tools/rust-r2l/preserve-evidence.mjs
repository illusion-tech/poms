// Public R2L evidence only. No database, credential, service or Git operation.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGunzip,gzipSync} from 'node:zlib';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const LINUX_ROOT='/home/wangzishi/projects/poms-rust-r2l';
const META='_poms-r2l_manifest.json';
const INTERNAL_SCRATCH='tmp/rust-r2l/ROOT-CHECKPOINT.md';
const INTERNAL_SCRATCH_NAMES=[INTERNAL_SCRATCH,'tmp/rust-r2l/ROOT-CHECKPOINT-02.md'];
const SHA=/^[0-9a-f]{64}$/;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const compare=(a,b)=>a<b?-1:a>b?1:0;
const inside=(root,file)=>file===root||file.startsWith(root+path.sep);
const jsonBytes=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');

export function portableName(name){
    assert.equal(typeof name,'string');assert(name.length>0&&!path.posix.isAbsolute(name)&&!path.win32.isAbsolute(name));
    assert(!/[\\\x00-\x1f\x7f:*?"<>|]/.test(name),'Unsafe or non-portable archive path');
    for(const part of name.split('/')){
        assert(part!==''&&part!=='.'&&part!=='..'&&!/[. ]$/.test(part),'Unsafe archive path component');
        assert(!/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),'Windows device path');
    }
    return name;
}
function relativeFile(root,file){const relative=path.relative(root,file).split(path.sep).join('/');portableName(relative);assert(inside(root,path.resolve(root,...relative.split('/'))));return relative;}
function rejectPrivate(name){
    portableName(name);
    assert(!name.split('/').some(part=>['.git','node_modules','private','secrets'].includes(part.toLowerCase())),'Private/dependency tree is outside preservation');
    assert(!/(?:^|\/)(?:\.env(?:\..*)?|nest\.env|rust\.env|.*-password|id_rsa|id_ed25519|\.npmrc)$/i.test(name),'Private credential file is outside preservation');
    assert(!/^tmp\/rust-r2(?!l(?:\/|$))/.test(name),'Old-batch temporary evidence is outside preservation');
    assert(!/(?:^|\/)ROOT-CHECKPOINT(?:-[0-9]+)?\.md$/i.test(name),'Internal checkpoints are outside preservation');
}
function noLinks(absolute){
    const parsed=path.parse(absolute);let current=parsed.root;
    for(const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)){
        current=path.join(current,part);if(!fs.existsSync(current))break;
        const stat=fs.lstatSync(current);assert(!stat.isSymbolicLink(),'Symlink/reparse-point path rejected: '+current);
    }
}
function sameStat(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs;}
function statFile(file){noLinks(file);const stat=fs.lstatSync(file,{bigint:true});assert(stat.isFile()&&!stat.isSymbolicLink(),'Only regular files admitted: '+file);assert(stat.nlink===1n,'Hard-linked source file rejected');assert(stat.size<=BigInt(Number.MAX_SAFE_INTEGER));return stat;}
function hashFile(file){
    const expected=statFile(file),fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
    try{
        assert(sameStat(fs.fstatSync(fd,{bigint:true}),expected));const hash=createHash('sha256'),buffer=Buffer.alloc(1024*1024);let bytes=0;
        for(;;){const n=fs.readSync(fd,buffer,0,buffer.length,null);if(!n)break;hash.update(buffer.subarray(0,n));bytes+=n;}
        assert.equal(bytes,Number(expected.size));assert(sameStat(fs.fstatSync(fd,{bigint:true}),expected),'Source changed during hashing');assert(sameStat(statFile(file),expected));
        return {bytes,rawBytesSha256:hash.digest('hex'),mode:Number(expected.mode&0o777n)};
    }finally{fs.closeSync(fd);}
}
function walkFiles(root,relative,options={},discovered=false){
    if(discovered&&options.excludeInternalScratch&&/^tmp\/rust-r2l\/ROOT-CHECKPOINT(?:-[0-9]+)?\.md$/i.test(relative)){
        options.excluded?.add(relative);return [];
    }
    rejectPrivate(relative);const absolute=path.resolve(root,...relative.split('/'));assert(inside(root,absolute));noLinks(absolute);
    const stat=fs.lstatSync(absolute);assert(!stat.isSymbolicLink());
    if(stat.isFile())return [relative];assert(stat.isDirectory(),'Special source path rejected');
    return fs.readdirSync(absolute).sort(compare).flatMap(name=>walkFiles(root,relative+'/'+name,options,true));
}
function inventory(root,selection,{excludeInternalScratch=false,excluded}={}){
    const names=new Set();for(const relative of selection)for(const name of walkFiles(root,relative,{excludeInternalScratch,excluded}))names.add(name);
    const folded=new Set();return [...names].filter(name=>!excludeInternalScratch||!/^tmp\/rust-r2l\/ROOT-CHECKPOINT(?:-[0-9]+)?\.md$/i.test(name)).sort(compare).map(file=>{
        const alias=file.normalize('NFC').toLowerCase();assert(!folded.has(alias),'Case/Unicode path alias rejected');folded.add(alias);
        return {file,...hashFile(path.join(root,...file.split('/')))};
    });
}
function newDirectory(directory){noLinks(path.dirname(directory));assert(!fs.existsSync(directory),'Output already exists');fs.mkdirSync(directory,{mode:0o700});assert(fs.lstatSync(directory).isDirectory());}
function safeParent(destination,relative){
    portableName(relative);const resolved=path.resolve(destination,...relative.split('/'));assert(inside(destination,resolved)&&resolved!==destination);
    let current=destination;for(const part of relative.split('/').slice(0,-1)){
        current=path.join(current,part);if(!fs.existsSync(current))fs.mkdirSync(current,{mode:0o700});
        const stat=fs.lstatSync(current);assert(stat.isDirectory()&&!stat.isSymbolicLink());assert(inside(fs.realpathSync(destination),fs.realpathSync(current)),'Resolved destination escaped');
    }
    return resolved;
}
function copyVerified(root,destination,row){
    const source=path.join(root,...row.file.split('/')),before=statFile(source),output=safeParent(destination,row.file);
    const input=fs.openSync(source,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0)),target=fs.openSync(output,'wx',0o600);
    try{
        assert(sameStat(fs.fstatSync(input,{bigint:true}),before));const hash=createHash('sha256'),buffer=Buffer.alloc(1024*1024);let bytes=0;
        for(;;){const n=fs.readSync(input,buffer,0,buffer.length,null);if(!n)break;const chunk=buffer.subarray(0,n);hash.update(chunk);let offset=0;while(offset<n)offset+=fs.writeSync(target,chunk,offset,n-offset);bytes+=n;}
        assert.equal(bytes,row.bytes);assert.equal(hash.digest('hex'),row.rawBytesSha256,'Source changed before snapshot copy');
        assert(sameStat(fs.fstatSync(input,{bigint:true}),before));assert(sameStat(statFile(source),before));fs.fchmodSync(target,row.mode);fs.fsyncSync(target);
    }finally{fs.closeSync(target);fs.closeSync(input);}
    assert.deepEqual(hashFile(output),{bytes:row.bytes,rawBytesSha256:row.rawBytesSha256,mode:row.mode});
}
function tarCreate(snapshot,archive,names){
    assert.equal(process.platform,'linux');assert(!fs.existsSync(archive));
    const archiveFd=fs.openSync(archive,'wx',0o600);
    // Output is in a newly created directory, outside every captured selection.
    // GNU tar reads only the immutable snapshot, never live source paths.
    return new Promise((resolve,reject)=>{
        const child=spawn('/usr/bin/tar',['--create','--gzip','--format=posix','--hard-dereference','--no-recursion','--pax-option=exthdr.name=PaxHeaders/entry,delete=atime,delete=ctime','--file','-','--directory',snapshot,'--null','--verbatim-files-from','--files-from','-'],{stdio:['pipe',archiveFd,'pipe']});
        let errorText='';child.stderr.on('data',chunk=>{errorText+=chunk.toString();if(errorText.length>=1024*1024){child.kill();reject(new Error('tar stderr exceeded bound'));}});
        child.on('error',reject);child.on('close',code=>{fs.closeSync(archiveFd);code===0?resolve():reject(new Error('tar failed '+code+': '+errorText));});
        child.stdin.on('error',reject);child.stdin.end(Buffer.from(names.join('\0')+'\0'));
    });
}
class TarReader{
    constructor(iterator){this.iterator=iterator;this.chunk=Buffer.alloc(0);this.offset=0;}
    async bytes(length,sink){
        assert(Number.isSafeInteger(length)&&length>=0);let left=length;const chunks=[];
        while(left){if(this.offset===this.chunk.length){const next=await this.iterator.next();assert(!next.done,'Truncated tar stream');this.chunk=next.value;this.offset=0;}
            const n=Math.min(left,this.chunk.length-this.offset),value=this.chunk.subarray(this.offset,this.offset+n);this.offset+=n;left-=n;if(sink)sink(value);else chunks.push(value);}
        return sink?undefined:Buffer.concat(chunks,length);
    }
    async trailingZeros(){
        let n=0;for(;;){if(this.offset<this.chunk.length){const remaining=this.chunk.subarray(this.offset);assert(remaining.every(byte=>byte===0),'Nonzero tar data after terminator');n+=remaining.length;this.offset=this.chunk.length;}
            const next=await this.iterator.next();if(next.done)break;this.chunk=next.value;this.offset=0;assert(n<1024*1024,'Excessive archive trailing data');}
    }
}
function tarNumber(buffer){const value=buffer.toString('ascii').replace(/\0.*$/s,'').trim();assert(/^[0-7]*$/.test(value),'Unsupported tar numeric encoding');const parsed=value===''?0:Number.parseInt(value,8);assert(Number.isSafeInteger(parsed)&&parsed>=0);return parsed;}
function tarString(buffer){const zero=buffer.indexOf(0),value=buffer.subarray(0,zero<0?buffer.length:zero);const text=new TextDecoder('utf-8',{fatal:true}).decode(value);return text;}
function legacyTarName(header,type,pax){
    const rawName=header.subarray(0,100),rawPrefix=header.subarray(345,500);
    if(type==='0'&&pax.path!==undefined){
        const finalPath=portableName(pax.path),fullBytes=Buffer.from(finalPath,'utf8');
        // A byte-exact GNU first-100-byte fallback is metadata, never an
        // independent path. Test bytes before decoding: the cut can split a
        // UTF-8 character or turn "contract..." into the Windows name "con".
        if(rawPrefix.every(byte=>byte===0)&&rawName.indexOf(0)===-1&&fullBytes.length>100&&rawName.equals(fullBytes.subarray(0,100))){
            const slash=rawName.lastIndexOf(47),directory=new TextDecoder('utf-8',{fatal:true}).decode(rawName.subarray(0,slash+1));
            portableName(directory+'PAX_TRUNCATED');
            let legacyUtf8Complete=true;try{new TextDecoder('utf-8',{fatal:true}).decode(rawName);}catch{legacyUtf8Complete=false;}
            const display=rawName.toString('utf8');
            return {headerName:finalPath,truncation:{file:finalPath,legacyBytes:100,legacySha256:sha(rawName),legacyDisplay:display,legacyTail:display.at(-1),legacyUtf8Complete}};
        }
    }
    const prefix=tarString(rawPrefix),name=tarString(rawName),headerName=prefix?prefix+'/'+name:name;
    portableName(headerName);return {headerName};
}
function paxFields(buffer){
    const result={};let offset=0;while(offset<buffer.length){const space=buffer.indexOf(32,offset);assert(space>offset);const token=buffer.subarray(offset,space).toString('ascii');assert(/^[1-9][0-9]*$/.test(token));const length=Number(token);assert(Number.isSafeInteger(length)&&length>space-offset+2&&offset+length<=buffer.length);const record=buffer.subarray(space+1,offset+length);assert.equal(record.at(-1),10);const eq=record.indexOf(61);assert(eq>0);const key=record.subarray(0,eq).toString('ascii'),value=new TextDecoder('utf-8',{fatal:true}).decode(record.subarray(eq+1,-1));assert(['path','size','mtime','uid','gid','uname','gname'].includes(key),'Unsupported PAX property');assert(!Object.hasOwn(result,key));result[key]=value;offset+=length;}
    return result;
}
function validateManifest(manifest){
    assert(manifest?.formatVersion===1&&manifest.batch==='rust-r2l'&&['root-authorized-public-preservation','controlled-selftest'].includes(manifest.kind));
    assert(Array.isArray(manifest.files)&&manifest.files.length>0&&manifest.files.length<=200000);
    const seen=new Set();let previous='';for(const row of manifest.files){rejectPrivate(row.file);assert.notEqual(row.file,META);assert(Number.isSafeInteger(row.bytes)&&row.bytes>=0&&SHA.test(row.rawBytesSha256));assert(Number.isInteger(row.mode)&&row.mode>=0&&row.mode<=0o777);assert(compare(previous,row.file)<0,'Manifest paths must be unique and sorted');previous=row.file;const alias=row.file.normalize('NFC').toLowerCase();assert(!seen.has(alias));seen.add(alias);}
    assert.equal(sha(Buffer.from(JSON.stringify(manifest.files))),manifest.filesSha256);return manifest;
}

/** Independent streaming tar parser: no tar command is used for verification. */
export async function verifyArchive({archive,expectedSha256,destination,expectedManifestSha256}){
    assert(SHA.test(expectedSha256));noLinks(archive);const archiveBefore=hashFile(archive);assert.equal(archiveBefore.rawBytesSha256,expectedSha256);
    if(destination){destination=path.resolve(destination);noLinks(path.dirname(destination));assert(!fs.existsSync(destination),'Extraction destination must be new');}
    async function pass(extract=false){
        const source=fs.createReadStream(archive),unzip=createGunzip();source.on('error',error=>unzip.destroy(error));source.pipe(unzip);
        const reader=new TarReader(unzip[Symbol.asyncIterator]());let manifest,manifestRaw,entryIndex=0,pendingPax={},paxHeaders=0,legacyPaxTruncationCount=0;const observed=[],folded=new Set(),legacyPaxTruncations=[];
        try{for(;;){
            const header=await reader.bytes(512);if(header.every(byte=>byte===0)){const second=await reader.bytes(512);assert(second.every(byte=>byte===0),'Missing second tar terminator');await reader.trailingZeros();break;}
            const checksum=tarNumber(header.subarray(148,156));let sum=0;for(let i=0;i<512;i++)sum+=(i>=148&&i<156)?32:header[i];assert.equal(sum,checksum,'Tar header checksum mismatch');
            assert.equal(tarString(header.subarray(257,263)),'ustar');const type=header[156]===0?'0':String.fromCharCode(header[156]);assert(['0','x'].includes(type),'Tar links, directories, devices and unsupported headers rejected');
            const {headerName,truncation}=legacyTarName(header,type,pendingPax);if(truncation){legacyPaxTruncationCount++;if(legacyPaxTruncations.length<32)legacyPaxTruncations.push(truncation);}
            assert.equal(tarString(header.subarray(157,257)),'','Tar link target rejected');
            let size=tarNumber(header.subarray(124,136));const mode=tarNumber(header.subarray(100,108))&0o777;
            if(type==='x'){
                assert.equal(Object.keys(pendingPax).length,0,'Consecutive PAX records rejected');assert(size<=1024*1024,'Oversized PAX metadata');pendingPax=paxFields(await reader.bytes(size));paxHeaders++;
            }else{
                const file=portableName(pendingPax.path??headerName);if(pendingPax.size!==undefined){assert(/^(?:0|[1-9][0-9]*)$/.test(pendingPax.size));size=Number(pendingPax.size);assert(Number.isSafeInteger(size));}pendingPax={};
                const alias=file.normalize('NFC').toLowerCase();assert(!folded.has(alias),'Duplicate or case/Unicode-alias archive member');folded.add(alias);
                // Resolve every final member under the proposed destination
                // even during the read-only first pass on Windows.
                const target=path.resolve(destination??path.join(ROOT,'.j-verify-destination'),...file.split('/'));assert(inside(destination??path.join(ROOT,'.j-verify-destination'),target));
                if(entryIndex===0){
                    assert.equal(file,META,'Embedded manifest must be first');assert(size<=64*1024*1024);manifestRaw=await reader.bytes(size);manifest=validateManifest(JSON.parse(manifestRaw));
                    if(expectedManifestSha256)assert.equal(sha(manifestRaw),expectedManifestSha256);
                    if(extract){const fd=fs.openSync(safeParent(destination,file),'wx',0o600);try{fs.writeFileSync(fd,manifestRaw);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
                }else{
                    assert(manifest);const expected=manifest.files[entryIndex-1];assert(expected,'Unlisted extra archive member');assert.equal(file,expected.file,'Archive listing must exactly match manifest order');assert.equal(size,expected.bytes);assert.equal(mode,expected.mode);
                    const hash=createHash('sha256');let fd;if(extract)fd=fs.openSync(safeParent(destination,file),'wx',0o600);
                    try{await reader.bytes(size,chunk=>{hash.update(chunk);if(fd!==undefined){let offset=0;while(offset<chunk.length)offset+=fs.writeSync(fd,chunk,offset,chunk.length-offset);}});if(fd!==undefined){fs.fchmodSync(fd,expected.mode);fs.fsyncSync(fd);}}
                    finally{if(fd!==undefined)fs.closeSync(fd);}
                    const digest=hash.digest('hex');assert.equal(digest,expected.rawBytesSha256,'Archive payload hash mismatch: '+file);observed.push({file,bytes:size,rawBytesSha256:digest,mode});
                }
                entryIndex++;
            }
            const padding=(512-(size%512))%512;if(padding)assert((await reader.bytes(padding)).every(byte=>byte===0),'Nonzero tar padding');
        }
        assert(manifest&&Object.keys(pendingPax).length===0);assert.equal(observed.length,manifest.files.length);assert.deepEqual(observed,manifest.files);
        return {manifest,manifestRaw,paxHeaders,legacyPaxTruncations,legacyPaxTruncationCount};
        }finally{source.destroy();unzip.destroy();}
    }
    const checked=await pass();
    if(destination){
        newDirectory(destination);await pass(true);
        const extracted=inventory(destination,[META,...checked.manifest.files.map(row=>row.file)]);
        const dataOnly=rows=>rows.map(({file,bytes,rawBytesSha256})=>({file,bytes,rawBytesSha256}));
        if(process.platform==='linux')assert.deepEqual(extracted.filter(row=>row.file!==META),checked.manifest.files);
        else assert.deepEqual(dataOnly(extracted.filter(row=>row.file!==META)),dataOnly(checked.manifest.files));
        assert.equal(hashFile(path.join(destination,META)).rawBytesSha256,sha(checked.manifestRaw));
    }
    assert.deepEqual(hashFile(archive),archiveBefore,'Archive changed during verification');
    return {result:'pass',kind:checked.manifest.kind,tag:checked.manifest.tag,files:checked.manifest.files.length,bytes:checked.manifest.files.reduce((n,row)=>n+row.bytes,0),archiveSha256:expectedSha256,manifestSha256:sha(checked.manifestRaw),paxHeaders:checked.paxHeaders,legacyPaxTruncationCount:checked.legacyPaxTruncationCount,legacyPaxTruncations:checked.legacyPaxTruncations,legacyPaxDiagnosticsBound:32,archiveModesVerified:true,...(destination?{destination,destinationVerified:true,extractedPosixModesVerified:process.platform==='linux'}:{readOnly:true})};
}

function defaultSelection(root){
    const selected=['tmp/rust-r2l','tools/rust-r2l','apps/poms-api-rust/Cargo.toml','apps/poms-api-rust/Cargo.lock','apps/poms-api-rust/src','apps/poms-api-rust/tests','apps/poms-api-rust/examples','apps/poms-api/src','libs/shared/contracts/src','libs/api/contracts/src','package.json','pnpm-lock.yaml'];
    for(const name of fs.readdirSync(path.join(root,'docs/design')).filter(name=>/^rust-r2l(?:r4)?(?:[.-]|$)/.test(name)))selected.push('docs/design/'+name);
    return selected.sort(compare);
}
function readPublicJson(root,relative){rejectPrivate(relative);assert(/^(?:tmp\/rust-r2l|tools\/rust-r2l)\//.test(relative));const file=path.resolve(root,...relative.split('/'));assert(inside(root,file));statFile(file);const raw=fs.readFileSync(file);return {raw,value:JSON.parse(raw)};}
async function capture({root,tag,out,selection,admission,kind}){
    assert(/^[a-z0-9][a-z0-9-]{0,48}$/.test(tag));noLinks(root);assert(fs.lstatSync(root).isDirectory());
    out=path.resolve(out);noLinks(path.dirname(out));assert(!selection.some(relative=>inside(path.resolve(root,...relative.split('/')),out)),'Output cannot be inside captured input');assert(!fs.existsSync(out));
    const excluded=new Set();const files=inventory(root,selection,{excludeInternalScratch:true,excluded});assert(files.length>0);const originalIdentities=new Map(files.map(row=>[row.file,statFile(path.join(root,...row.file.split('/')))]));
    const manifest={formatVersion:1,batch:'rust-r2l',kind,tag,capturedAt:new Date().toISOString(),sourceRoot:root,selection,excludedSourceFiles:[...excluded].sort(compare).map(file=>({file,reason:'Internal execution-continuation scratch; retained in place, not task acceptance evidence; contents not read by capture'})),admission,privacyPolicy:'Only admitted repository paths; no private directories, environment credential files or old-batch tmp evidence. No claim that arbitrary public file contents were scanned against private secret values.',files,filesSha256:sha(Buffer.from(JSON.stringify(files)))};
    validateManifest(manifest);const raw=jsonBytes(manifest);newDirectory(out);const snapshot=path.join(out,'snapshot');newDirectory(snapshot);
    for(const row of files)copyVerified(root,snapshot,row);
    fs.writeFileSync(path.join(snapshot,META),raw,{flag:'wx',mode:0o600});fs.writeFileSync(path.join(out,'manifest.json'),raw,{flag:'wx',mode:0o600});
    const archive=path.join(out,'evidence.tar.gz');await tarCreate(snapshot,archive,[META,...files.map(row=>row.file)]);
    const archiveHash=hashFile(archive),verified=await verifyArchive({archive,expectedSha256:archiveHash.rawBytesSha256,expectedManifestSha256:sha(raw)});
    // Full post-tar inventory catches changes, additions and removals in every
    // selected directory, not just modifications of initially known names.
    assert.deepEqual(inventory(root,selection,{excludeInternalScratch:true}),files,'Original admitted source inventory changed during preservation');
    for(const [file,identity] of originalIdentities)assert(sameStat(statFile(path.join(root,...file.split('/'))),identity),'Original file identity/timestamps changed: '+file);
    assert.deepEqual(inventory(snapshot,[META,...files.map(row=>row.file)]).filter(row=>row.file!==META),files,'Snapshot files changed during tar creation');
    assert.equal(hashFile(path.join(snapshot,META)).rawBytesSha256,sha(raw));assert.equal(hashFile(path.join(out,'manifest.json')).rawBytesSha256,sha(raw));
    const receipt={formatVersion:1,batch:'rust-r2l',tag,kind,result:'pass',createdAt:new Date().toISOString(),sourceFilesUnchanged:true,snapshotFilesVerified:true,independentTarVerification:verified,files:files.length,bytes:files.reduce((n,row)=>n+row.bytes,0),archive:{file:'evidence.tar.gz',bytes:archiveHash.bytes,rawBytesSha256:archiveHash.rawBytesSha256},manifest:{file:'manifest.json',rawBytesSha256:sha(raw)},gateConclusion:'Not made by this preservation tool'};
    fs.writeFileSync(path.join(out,'receipt.json'),jsonBytes(receipt),{flag:'wx',mode:0o600});return {out,...receipt};
}
function args(values){const result={};for(let i=0;i<values.length;i+=2){assert(/^--[a-z][a-z0-9-]*$/.test(values[i])&&values[i+1]!==undefined);const key=values[i].slice(2);assert(!Object.hasOwn(result,key));result[key]=values[i+1];}return result;}
async function main(){
    const command=process.argv[2],options=args(process.argv.slice(3));
    if(command==='capture'){
        assert.equal(process.platform,'linux');assert.equal(ROOT,LINUX_ROOT);assert(Object.keys(options).every(key=>['tag','out','freeze','inputs'].includes(key)));assert(options.tag&&options.out&&options.freeze);
        const frozen=readPublicJson(ROOT,options.freeze),admission=frozen.value;
        assert(admission.formatVersion===1&&admission.batch==='rust-r2l'&&admission.tag===options.tag&&admission.ownersStopped===true&&admission.fixturesDoubleZero===true);
        assert(Array.isArray(admission.evidence)&&admission.evidence.length>0);
        for(const row of admission.evidence){assert(row&&SHA.test(row.sha256));rejectPrivate(row.file);assert(row.file.startsWith('tmp/rust-r2l/'));assert.equal(hashFile(path.join(ROOT,...row.file.split('/'))).rawBytesSha256,row.sha256);}
        const selection=defaultSelection(ROOT);
        if(options.inputs){const extra=readPublicJson(ROOT,options.inputs).value;assert(extra.formatVersion===1&&Array.isArray(extra.files));for(const row of extra.files){assert(typeof row.reason==='string'&&row.reason.length>0);rejectPrivate(row.file);assert(/^(?:apps|libs|tools|docs)\//.test(row.file)||['.gitattributes','openapitools.json','package.json','pnpm-lock.yaml','tsconfig.base.json'].includes(row.file),'Additional sources must be explicit repo inputs');const file=path.resolve(ROOT,...row.file.split('/'));assert(statFile(file).isFile());selection.push(row.file);}selection.push(options.inputs);}
        const out=path.resolve(ROOT,options.out),allowed=path.join(ROOT,'tmp/rust-r2l-preserved');assert(out!==allowed&&inside(allowed,out));
        if(!fs.existsSync(allowed)){noLinks(path.dirname(allowed));fs.mkdirSync(allowed,{mode:0o700});}
        return capture({root:ROOT,tag:options.tag,out,selection:[...new Set(selection)].sort(compare),admission:{file:options.freeze,rawBytesSha256:sha(frozen.raw),rootAttestation:admission},kind:'root-authorized-public-preservation'});
    }
    if(command==='verify'){
        assert(Object.keys(options).every(key=>['archive','expected-sha256','destination'].includes(key)));assert(options.archive&&options['expected-sha256']);
        return verifyArchive({archive:path.resolve(options.archive),expectedSha256:options['expected-sha256'],destination:options.destination});
    }
    if(command==='self-test'){
        assert.equal(process.platform,'linux');assert.equal(Object.keys(options).length,0);
        const parent=path.join(ROOT,'tmp/rust-r2l-preserve-selftest');if(!fs.existsSync(parent)){noLinks(path.dirname(parent));fs.mkdirSync(parent,{mode:0o700});}
        const testRoot=path.join(parent,randomUUID());newDirectory(testRoot);const source=path.join(testRoot,'source');newDirectory(source);
        fs.mkdirSync(path.join(source,'tmp'));fs.mkdirSync(path.join(source,'tmp/rust-r2l'));fs.mkdirSync(path.join(source,'tools'));fs.mkdirSync(path.join(source,'tools/rust-r2l'));
        const boundary=Buffer.alloc(2*1024*1024+513);for(let i=0;i<boundary.length;i++)boundary[i]=i%251;
        const exactDotPath='libs/shared/api-client/model/confirm-shared-cost-allocation-basis-request-project-share-items-inner.ts',boundaryPrefix='tmp/rust-r2l/';
        const truncatedPaths=[exactDotPath,...[' ','/'].map(tail=>boundaryPrefix+'a'.repeat(99-Buffer.byteLength(boundaryPrefix))+tail+'tail.txt')];
        for(const [index,name] of truncatedPaths.entries()){portableName(name);assert(Buffer.byteLength(name)>100);assert.equal(Buffer.from(name).subarray(0,100).at(-1),['.',' ','/'][index].charCodeAt(0));}
        const devicePath='tmp/rust-r2l/runtime-input/rust-api005/sources/apps/poms-api/src/app/features/contract-readiness/contract-readiness-package.entity.ts',utf8Path=boundaryPrefix+'u'.repeat(99-Buffer.byteLength(boundaryPrefix))+'汉tail.txt';
        assert.equal(Buffer.from(devicePath).subarray(0,100).toString('utf8').split('/').at(-1),'con');assert.throws(()=>new TextDecoder('utf-8',{fatal:true}).decode(Buffer.from(utf8Path).subarray(0,100)));
        const gnuPaths=[...truncatedPaths,devicePath,utf8Path];
        const originals=[[INTERNAL_SCRATCH,Buffer.from('Controlled internal scratch remains at source; not acceptance evidence.\n')],['tmp/rust-r2l/failed.json',Buffer.from('{"result":"fail","original":true}\n')],['tmp/rust-r2l/empty.bin',Buffer.alloc(0)],['tmp/rust-r2l/boundary.bin',boundary],['tools/rust-r2l/tool.mjs',Buffer.from('export const controlled = true;\n')],['tmp/rust-r2l/'+('long-name-'.repeat(17))+'中文.txt',Buffer.from('实际受控字节\n')],...gnuPaths.map(name=>[name,Buffer.from('Exact GNU PAX legacy boundary\n')])];
        for(const [name,bytes] of originals){const file=safeParent(source,name);fs.writeFileSync(file,bytes,{flag:'wx',mode:name.endsWith('.mjs')?0o700:0o600});}
        const extraScratch=path.join(source,'tmp/rust-r2l/ROOT-CHECKPOINT-02.md');fs.writeFileSync(extraScratch,'Internal continuation stays in place.\n',{flag:'wx',mode:0o600});
        const selection=['tmp/rust-r2l','tools/rust-r2l','libs/shared/api-client/model'],out=path.join(testRoot,'captured'),result=await capture({root:source,tag:'controlled-test',out,selection,admission:{controlledFixture:true,noLiveEvidenceRead:true},kind:'controlled-selftest'});
        for(const name of gnuPaths)assert(result.independentTarVerification.legacyPaxTruncations.some(item=>item.file===name&&item.legacyBytes===100),'Actual GNU tar must exercise each exact truncated fallback');
        assert(result.independentTarVerification.legacyPaxTruncations.some(item=>item.file===utf8Path&&item.legacyUtf8Complete===false));
        const archive=path.join(out,'evidence.tar.gz'),destination=path.join(testRoot,'verified');await verifyArchive({archive,expectedSha256:result.archive.rawBytesSha256,destination});
        assert(!fs.existsSync(path.join(out,'snapshot/tmp/rust-r2l/ROOT-CHECKPOINT-02.md')));assert.equal(fs.readFileSync(extraScratch,'utf8'),'Internal continuation stays in place.\n');
        const controlledManifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));assert(!controlledManifest.files.some(row=>row.file===INTERNAL_SCRATCH));assert(!fs.existsSync(path.join(destination,...INTERNAL_SCRATCH.split('/'))));assert(!fs.existsSync(path.join(out,'snapshot',...INTERNAL_SCRATCH.split('/'))));assert.deepEqual(fs.readFileSync(path.join(source,...INTERNAL_SCRATCH.split('/'))),originals[0][1]);
        const checks=[];
        for(const [label,fn] of [
            ['path-traversal',()=>portableName('../escape')],['absolute-path',()=>portableName('/escape')],['windows-drive',()=>portableName('C:/escape')],['windows-ads',()=>portableName('tmp/x:secret')],['windows-device',()=>portableName('tmp/CON.txt')],['windows-backslash',()=>portableName('tmp\\escape')],['old-batch',()=>rejectPrivate('tmp/rust-r2gh/x')],['private-env',()=>rejectPrivate('tmp/rust-r2l/nest.env')],
            ['output-overwrite',()=>newDirectory(out)],
            ['explicit-internal-checkpoint',()=>inventory(source,[INTERNAL_SCRATCH],{excludeInternalScratch:true})],
            ['explicit-numeric-internal-checkpoint',()=>inventory(source,['tmp/rust-r2l/ROOT-CHECKPOINT-02.md'],{excludeInternalScratch:true})],
            ['arbitrary-numeric-internal-checkpoint',()=>rejectPrivate('tmp/rust-r2l/ROOT-CHECKPOINT-999.md')]
        ]){assert.throws(fn);checks.push(label);}
        const bad=path.join(testRoot,'source-link');fs.symlinkSync(source,bad,'dir');assert.throws(()=>inventory(bad,selection));checks.push('symlink-root');
        await assert.rejects(()=>verifyArchive({archive,expectedSha256:'0'.repeat(64)}));checks.push('wrong-archive-sha');
        await assert.rejects(()=>verifyArchive({archive,expectedSha256:result.archive.rawBytesSha256,destination}));checks.push('destination-overwrite');
        // Independently forged, small hostile tar inputs exercise the actual
        // streaming reader, not only the path validation helper.
        function member(name,type,bytes=Buffer.alloc(0),link='',prefix=''){
            const header=Buffer.alloc(512);Buffer.from(name,'utf8').copy(header,0,0,100);
            const octal=(offset,length,value)=>header.write(value.toString(8).padStart(length-1,'0')+'\0',offset,length,'ascii');
            octal(100,8,0o600);octal(108,8,0);octal(116,8,0);octal(124,12,bytes.length);octal(136,12,0);header.fill(32,148,156);header.write(type,156,1,'ascii');header.write(link,157,100,'utf8');header.write('ustar\0',257,6,'ascii');header.write('00',263,2,'ascii');
            header.write(prefix,345,155,'utf8');let checksum=0;for(const byte of header)checksum+=byte;header.write(checksum.toString(8).padStart(6,'0')+'\0 ',148,8,'ascii');
            return Buffer.concat([header,bytes,Buffer.alloc((512-bytes.length%512)%512)]);
        }
        const entries=[{file:'tmp/rust-r2l/a.txt',bytes:3,rawBytesSha256:sha(Buffer.from('abc')),mode:0o600},{file:'tmp/rust-r2l/b.txt',bytes:0,rawBytesSha256:sha(Buffer.alloc(0)),mode:0o600}];
        const hostileManifest={formatVersion:1,batch:'rust-r2l',kind:'controlled-selftest',tag:'hostile-input',files:entries,filesSha256:sha(Buffer.from(JSON.stringify(entries)))};
        const meta=member(META,'0',jsonBytes(hostileManifest)),a=member(entries[0].file,'0',Buffer.from('abc')),b=member(entries[1].file,'0');
        function paxPath(value){const tail=Buffer.from(' path='+value+'\n');let length=tail.length+1;while(String(length).length+tail.length!==length)length=String(length).length+tail.length;return Buffer.concat([Buffer.from(String(length)),tail]);}
        for(const [label,members] of [
            ['tar-traversal',[meta,member('../escape','0',Buffer.from('abc')),b]],
            ['tar-symlink',[meta,member(entries[0].file,'2',Buffer.alloc(0),'../../escape'),b]],
            ['tar-duplicate',[meta,a,a,b]],['tar-case-alias',[meta,a,member('tmp/rust-r2l/A.txt','0',Buffer.from('abc')),b]],
            ['tar-payload-mismatch',[meta,member(entries[0].file,'0',Buffer.from('BAD')),b]],
            ['tar-pax-traversal',[meta,member('PaxHeaders/entry','x',paxPath('../escape')),a,b]]
        ]){
            const badArchive=path.join(testRoot,label+'.tar.gz'),bytes=gzipSync(Buffer.concat([...members,Buffer.alloc(1024)]));fs.writeFileSync(badArchive,bytes,{flag:'wx',mode:0o600});
            const proposed=path.join(testRoot,label+'-destination');await assert.rejects(()=>verifyArchive({archive:badArchive,expectedSha256:sha(bytes),destination:proposed}));assert(!fs.existsSync(proposed),'Invalid tar must be rejected before destination creation');checks.push(label);
        }
        const linkedParent=path.join(testRoot,'destination-link');fs.symlinkSync(destination,linkedParent,'dir');await assert.rejects(()=>verifyArchive({archive,expectedSha256:result.archive.rawBytesSha256,destination:path.join(linkedParent,'escape')}));assert(!fs.existsSync(path.join(destination,'escape')));checks.push('destination-parent-symlink');
        const fullName='a'.repeat(99)+'.ts',truncated=fullName.slice(0,100),pax=member('PaxHeaders/entry','x',paxPath(fullName));
        const strictEntry=[{file:fullName,bytes:3,rawBytesSha256:sha(Buffer.from('abc')),mode:0o600}],strictManifest={...hostileManifest,files:strictEntry,filesSha256:sha(Buffer.from(JSON.stringify(strictEntry)))},strictMeta=member(META,'0',jsonBytes(strictManifest));
        for(const [label,members] of [
            ['tar-pax-fallback-mismatch',[strictMeta,pax,member('b'.repeat(99)+'.','0',Buffer.from('abc'))]],
            ['tar-pax-fallback-nonempty-prefix',[strictMeta,pax,member(truncated,'0',Buffer.from('abc'),'','extra')]],
            ['tar-unsafe-fallback-without-pax',[strictMeta,member(truncated,'0',Buffer.from('abc'))]],
            ['tar-pax-short-unsafe-fallback',[strictMeta,pax,member('a'.repeat(98)+'.','0',Buffer.from('abc'))]]
        ]){const badArchive=path.join(testRoot,label+'.tar.gz'),bytes=gzipSync(Buffer.concat([...members,Buffer.alloc(1024)]));fs.writeFileSync(badArchive,bytes,{flag:'wx',mode:0o600});const proposed=path.join(testRoot,label+'-destination');await assert.rejects(()=>verifyArchive({archive:badArchive,expectedSha256:sha(bytes),destination:proposed}));assert(!fs.existsSync(proposed));checks.push(label);}
        function oneMeta(file){const files=[{file,bytes:3,rawBytesSha256:sha(Buffer.from('abc')),mode:0o600}];return member(META,'0',jsonBytes({...hostileManifest,files,filesSha256:sha(Buffer.from(JSON.stringify(files)))}));}
        for(const [label,members] of [
            ['tar-device-fallback-without-pax',[oneMeta(devicePath),member(devicePath,'0',Buffer.from('abc'))]],
            ['tar-device-fallback-mismatch',[oneMeta(devicePath),member('PaxHeaders/entry','x',paxPath(devicePath)),member('x'.repeat(96)+'/con','0',Buffer.from('abc'))]],
            ['tar-utf8-fallback-without-pax',[oneMeta(utf8Path),member(utf8Path,'0',Buffer.from('abc'))]],
            ['tar-utf8-fallback-mismatch',[oneMeta(utf8Path),member('PaxHeaders/entry','x',paxPath(utf8Path)),member(utf8Path.replace('tmp/','tmq/'),'0',Buffer.from('abc'))]]
        ]){const badArchive=path.join(testRoot,label+'.tar.gz'),bytes=gzipSync(Buffer.concat([...members,Buffer.alloc(1024)]));fs.writeFileSync(badArchive,bytes,{flag:'wx',mode:0o600});const proposed=path.join(testRoot,label+'-destination');await assert.rejects(()=>verifyArchive({archive:badArchive,expectedSha256:sha(bytes),destination:proposed}));assert(!fs.existsSync(proposed));checks.push(label);}
        // Keep controlled sources, archive and failed negative attempts intact.
        return {result:'pass',kind:'controlled-selftest',testRoot,capture:result,positiveChecks:['internal-checkpoint-excluded-and-source-retained','exact-100-byte-pax-fallback-dot','exact-100-byte-pax-fallback-space','exact-100-byte-pax-fallback-slash','exact-100-byte-pax-fallback-device','exact-100-byte-pax-fallback-split-utf8'],negativeChecks:checks,liveEvidenceRead:false,deletedFiles:0};
    }
    throw new Error('Usage: capture --tag TAG --out tmp/rust-r2l-preserved/TAG --freeze tmp/rust-r2l/FILE.json [--inputs tools/rust-r2l/FILE.json] | verify --archive TAR --expected-sha256 SHA [--destination NEW_DIR] | self-test');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    try{console.log(JSON.stringify(await main()));}catch(error){console.error(JSON.stringify({result:'fail',name:error.name,message:error.message}));process.exitCode=1;}
}
