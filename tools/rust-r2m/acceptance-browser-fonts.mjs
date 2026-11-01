// Explicit Root --run only: signed Debian download/extract in new M roots.
// Import/--check never downloads, reads private state, launches a browser or
// touches system package state. Font causality remains unproven until rerun.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const BASE='/home/wangzishi/.local/share/poms-r2m',LIBS=BASE+'/browser-libs',FONTROOT=BASE+'/browser-fonts',PRIVATE=BASE+'/private/browser-deps';
const PACKAGE=Object.freeze({name:'fonts-noto-cjk',version:'1:20240730+repack1-1',bytes:56674044,rawBytesSha256:'f5dc28a754e17327d99f0a612134d92c8dd6187314ae967cb77f25df60860139',filename:'pool/main/f/fonts-noto-cjk/fonts-noto-cjk_20240730+repack1-1_all.deb'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export function fontsConfiguration(fontDirectory,cacheDirectory){
    for(const value of[fontDirectory,cacheDirectory])assert(typeof value==='string'&&value.startsWith(FONTROOT+'/')&&path.posix.normalize(value)===value&&!/[<>"'&\n\r\0]/.test(value)&&!value.split('/').some(part=>part==='..'));
    assert.equal(fontDirectory,FONTROOT+'/root/usr/share/fonts/opentype/noto');assert.equal(cacheDirectory,FONTROOT+'/cache');
    return'<?xml version="1.0"?>\n<fontconfig>\n <dir>'+fontDirectory+'</dir>\n <cachedir>'+cacheDirectory+'</cachedir>\n <alias><family>sans-serif</family><prefer><family>Noto Sans CJK SC</family><family>Noto Sans CJK JP</family></prefer></alias>\n <alias><family>serif</family><prefer><family>Noto Serif CJK SC</family><family>Noto Serif CJK JP</family></prefer></alias>\n <alias><family>monospace</family><prefer><family>Noto Sans Mono CJK SC</family><family>Noto Sans Mono CJK JP</family></prefer></alias>\n</fontconfig>\n';
}

export function verifyFontPackageStanza(stanza,packageIndexSha256){
    const get=key=>new RegExp('^'+key+': (.+)$','m').exec(stanza)?.[1];
    assert.equal(get('Package'),PACKAGE.name);assert.equal(get('Version'),PACKAGE.version);assert.equal(get('Architecture'),'all');assert.equal(Number(get('Size')),PACKAGE.bytes);assert.equal(get('SHA256'),PACKAGE.rawBytesSha256);assert.equal(get('Filename'),PACKAGE.filename);assert(/^[0-9a-f]{64}$/.test(packageIndexSha256));return{...PACKAGE,architecture:'all',signedPackageIndexSha256:packageIndexSha256};
}

function directory(file){let current='';for(const part of file.split('/').filter(Boolean)){current+='/'+part;const stat=fs.lstatSync(current);assert(stat.isDirectory()&&!stat.isSymbolicLink(),'Font dependency directory symlink/type refused')}return file}
function regular(file){directory(path.posix.dirname(file));const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1);return fs.readFileSync(file)}

export function fontsPlan(tag){assert(/^[a-z0-9-]{1,20}$/.test(tag));return{kind:'R2M-isolated-fonts-provision-plan',tag,package:PACKAGE,root:FONTROOT,stagingRoot:FONTROOT+'/provision-'+tag,pin:LIBS+'/browser-pin-fonts04.json',systemInstall:false,originalDeps03PinChanged:false,browserExecuted:false,actualExecution:false}}

export function provisionBrowserFonts(tag){
    assert.equal(process.platform,'linux');assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r2m');assert.equal(process.version,'v24.19.0');process.umask(0o077);const plan=fontsPlan(tag),basePinFile=LIBS+'/browser-pin-deps03.json',pinFile=plan.pin;
    directory(BASE);directory(LIBS);directory(PRIVATE);assert.equal(fs.lstatSync(PRIVATE).mode&0o077,0);const basePinRaw=regular(basePinFile),basePin=JSON.parse(basePinRaw);assert.equal(sha(basePinRaw),'9ba532434b6c0b0ce0f23da95728e96090ab30466c72f770a5749b15bc6c69a3');assert(!fs.existsSync(pinFile),'Do not replace an earlier font pin');
    if(!fs.existsSync(FONTROOT))fs.mkdirSync(FONTROOT,{mode:0o700});directory(FONTROOT);for(const name of['root','cache']){assert(!fs.existsSync(FONTROOT+'/'+name));fs.mkdirSync(FONTROOT+'/'+name,{mode:0o700})}assert(!fs.existsSync(plan.stagingRoot));fs.mkdirSync(plan.stagingRoot,{mode:0o700});for(const name of['debs','auth'])fs.mkdirSync(plan.stagingRoot+'/'+name,{mode:0o700});
    const log=PRIVATE+'/fonts-'+tag+'.log',fd=fs.openSync(log,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600),commands=[];
    const config=LIBS+'/apt.conf',configRaw=regular(config).toString('utf8');for(const item of['Dir::Etc::main "-";','Dir::Etc::parts "-";','Dir::State::lists "'+LIBS+'/apt-lists/";','Dir::Cache "'+LIBS+'/apt-cache/";','Dir::Log "'+LIBS+'/apt-log/";'])assert(configRaw.includes(item),'Only the independent signed metadata/cache configuration is admitted');
    const environment={PATH:'/usr/bin:/bin',LANG:'C.UTF-8',APT_CONFIG:config,TMPDIR:BASE+'/browser-cache/download-tmp'};
    function run(executable,args,{cwd=plan.root,maxBuffer=128*1024*1024,retainOutput=true}={}){const result=spawnSync(executable,args,{cwd,env:environment,encoding:null,timeout:180000,maxBuffer});commands.push({executable,args,status:result.status,signal:result.signal});fs.writeSync(fd,JSON.stringify(commands.at(-1))+'\n');if(result.error)fs.writeSync(fd,JSON.stringify({kind:'private-font-command-original-error',name:result.error.name,message:result.error.message,stack:result.error.stack,code:result.error.code??null})+'\n');if(retainOutput){if(result.stdout)fs.writeSync(fd,result.stdout);if(result.stderr)fs.writeSync(fd,result.stderr);fs.writeSync(fd,'\n')}assert(result.status===0&&!result.signal&&!result.error,'Exact isolated font command failed');return result.stdout}
    try{
        const listRoot=LIBS+'/apt-lists',releaseName='deb.debian.org_debian_dists_trixie_InRelease',releaseFile=listRoot+'/'+releaseName,authenticated=plan.stagingRoot+'/auth/trixie.Release',keyring='/usr/share/keyrings/debian-archive-keyring.pgp';
        regular(releaseFile);run('/usr/bin/sqv',['--keyring',keyring,'--cleartext','--output',authenticated,releaseFile]);const release=regular(authenticated).toString('utf8'),name=fs.readdirSync(listRoot).find(file=>/^deb\.debian\.org_debian_dists_trixie_main_binary-amd64_Packages(?:\.(?:lz4|xz|gz))?$/.test(file));assert(name);
        const index=run('/usr/lib/apt/apt-helper',['cat-file',listRoot+'/'+name],{retainOutput:false}),indexSha=sha(index),lines=release.split('\n'),start=lines.indexOf('SHA256:');assert(start>=0);const signed=lines.slice(start+1).map(line=>/^\s+([0-9a-f]{64})\s+(\d+)\s+(.+)$/.exec(line)).filter(Boolean).find(row=>row[3]==='main/binary-amd64/Packages');assert(signed&&signed[1]===indexSha&&Number(signed[2])===index.length,'Index differs from authenticated Debian Release');
        const stanzas=index.toString('utf8').split('\n\n').filter(stanza=>/^Package: fonts-noto-cjk$/m.test(stanza)&&/^Version: 1:20240730\+repack1-1$/m.test(stanza));assert.equal(stanzas.length,1);const packageProof=verifyFontPackageStanza(stanzas[0],indexSha);
        run('/usr/bin/apt-get',['download',PACKAGE.name+'='+PACKAGE.version],{cwd:plan.stagingRoot+'/debs'});const debs=fs.readdirSync(plan.stagingRoot+'/debs');assert.equal(debs.length,1);const deb=plan.stagingRoot+'/debs/'+debs[0],debRaw=regular(deb);assert.equal(debRaw.length,PACKAGE.bytes);assert.equal(sha(debRaw),PACKAGE.rawBytesSha256);run('/usr/bin/dpkg-deb',['--extract',deb,plan.root+'/root']);
        const fontDirectory=plan.root+'/root/usr/share/fonts/opentype/noto',fontFiles=[];directory(fontDirectory);
        for(const name of fs.readdirSync(fontDirectory).sort()){assert(/\.(?:ttc|ttf|otf)$/i.test(name));const file=fontDirectory+'/'+name,bytes=regular(file);fontFiles.push({file,bytes:bytes.length,rawBytesSha256:sha(bytes)})}assert(fontFiles.some(item=>item.file.endsWith('/NotoSansCJK-Regular.ttc'))&&fontFiles.some(item=>item.file.endsWith('/NotoSansCJK-Bold.ttc')));
        const fontconfigFile=plan.root+'/fonts.conf',fontconfigRaw=Buffer.from(fontsConfiguration(fontDirectory,plan.root+'/cache'));fs.writeFileSync(fontconfigFile,fontconfigRaw,{flag:'wx',mode:0o600});
        const pin={...basePin,fontconfigFile,fontconfigSha256:sha(fontconfigRaw),fontconfigRawBytesSha256:sha(fontconfigRaw),fontFiles,fontCacheDirectory:plan.root+'/cache',fontProvision:{kind:'R2M-signed-Debian-CJK-fonts',package:packageProof,sourceDeps03Pin:{file:basePinFile,rawBytesSha256:sha(basePinRaw)},browserNotExecuted:true}};assert.equal(regular(basePinFile).compare(basePinRaw),0,'Original deps03 pin changed');const pinRaw=Buffer.from(JSON.stringify(pin,null,2)+'\n');fs.writeFileSync(pinFile,pinRaw,{flag:'wx',mode:0o600});
        const receipt={kind:'R2M-signed-isolated-browser-fonts-provision',tag,result:'signed-font-files-and-config-ready-not-browser-pass',package:packageProof,signature:{inRelease:releaseFile,inReleaseRawBytesSha256:sha(regular(releaseFile)),authenticatedRelease:authenticated,authenticatedReleaseSha256:sha(regular(authenticated)),keyring,keyringSha256:sha(regular(keyring)),packageIndex:listRoot+'/'+name,uncompressedBytes:index.length,uncompressedSha256:indexSha,sqvVerified:true},fontFiles,fontconfigFile,fontconfigRawBytesSha256:sha(fontconfigRaw),fontCacheDirectory:plan.root+'/cache',commands,originalDeps03PinUnchanged:true,systemInstall:false,privateEnvironmentRead:false,databaseApiExecuted:false,browserExecuted:false,pinFile,pinBytes:pinRaw.length,pinRawBytesSha256:sha(pinRaw)};
        const receiptFile=PRIVATE+'/fonts-'+tag+'.json',receiptRaw=Buffer.from(JSON.stringify(receipt,null,2)+'\n');fs.writeFileSync(receiptFile,receiptRaw,{flag:'wx',mode:0o600});console.log(JSON.stringify({kind:receipt.kind,result:receipt.result,pinFile,pinRawBytesSha256:receipt.pinRawBytesSha256,fontconfigFile,fontconfigRawBytesSha256:receipt.fontconfigRawBytesSha256,fontMembers:fontFiles.length,receipt:{file:receiptFile,bytes:receiptRaw.length,rawBytesSha256:sha(receiptRaw)},browserExecuted:false}));return receipt;
    }catch(error){const receiptFile=PRIVATE+'/fonts-'+tag+'-failure.json',raw=Buffer.from(JSON.stringify({kind:'R2M-fonts-provision-failed',tag,name:error.name,message:error.message,stack:error.stack,commands,partialRoot:plan.root,systemInstall:false,browserExecuted:false})+'\n');fs.writeFileSync(receiptFile,raw,{flag:'wx',mode:0o600});throw Object.assign(new Error('Isolated font provisioning failed; original private diagnostic retained'),{privateReceipt:{file:receiptFile,bytes:raw.length,rawBytesSha256:sha(raw)}})}finally{fs.fsyncSync(fd);fs.closeSync(fd)}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    try{assert(['--check','--run'].includes(process.argv[2])&&process.argv.length===4);const tag=process.argv[3];if(process.argv[2]==='--check')console.log(JSON.stringify(fontsPlan(tag)));else provisionBrowserFonts(tag)}catch(error){process.exitCode=1;console.error(JSON.stringify({kind:'R2M-fonts-entry-failure',rawErrorIncluded:false,privateReceipt:error.privateReceipt??null}))}
}
