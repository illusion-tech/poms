// Browser child receives only these system values. In particular Native's
// temporary DB/JWT environment is never inherited by Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const STATE='/home/wangzishi/.local/share/poms-r2m-continuation01';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const SYSTEM_KEYS=Object.freeze(['PATH','HOME','USER','LOGNAME','TMPDIR','TMP','TEMP','LANG','LC_ALL','LC_CTYPE','TZ']);
// G1 fixes UI10080. Chromium restricts10080 (Amanda) before any HTTP; allow
// exactly that port only in this task-owned Chromium child, not host policy.
export function browserLaunchArguments(){return['--explicitly-allowed-ports=10080']}

export function browserChildEnvironment(ambient,pin){
    assert(ambient&&typeof ambient==='object'&&pin&&typeof pin==='object');
    const env=Object.fromEntries(SYSTEM_KEYS.filter(key=>ambient[key]!==undefined).map(key=>{assert(typeof ambient[key]==='string'&&!ambient[key].includes('\0'));return[key,ambient[key]]}));
    if(pin.libraryPath!==undefined){assert(typeof pin.libraryPath==='string'&&pin.libraryPath.length>0);const parts=pin.libraryPath.split(':');assert(parts.every(dir=>path.posix.normalize(dir)===dir&&dir.startsWith(STATE+'/browser-libs/')&&!dir.includes('/../')));assert.equal(new Set(parts).size,parts.length);env.LD_LIBRARY_PATH=pin.libraryPath}
    if(pin.fontconfigFile!==undefined){assert(typeof pin.fontconfigFile==='string'&&path.posix.normalize(pin.fontconfigFile)===pin.fontconfigFile&&pin.fontconfigFile.startsWith(STATE+'/browser-fonts/')&&/\.(?:conf|xml)$/.test(pin.fontconfigFile));assert(/^[0-9a-f]{64}$/.test(pin.fontconfigSha256??''));assert(Array.isArray(pin.fontFiles)&&pin.fontFiles.length>0&&pin.fontFiles.length<=32);assert.equal(new Set(pin.fontFiles.map(item=>item.file)).size,pin.fontFiles.length);for(const item of pin.fontFiles)assert(typeof item.file==='string'&&path.posix.normalize(item.file)===item.file&&item.file.startsWith(STATE+'/browser-fonts/root/usr/share/fonts/opentype/noto/')&&/\.(?:ttc|ttf|otf)$/.test(item.file)&&/^[0-9a-f]{64}$/.test(item.rawBytesSha256??'')&&Number.isSafeInteger(item.bytes)&&item.bytes>0);env.FONTCONFIG_FILE=pin.fontconfigFile;env.FONTCONFIG_PATH=path.posix.dirname(pin.fontconfigFile)}else assert(pin.fontconfigSha256===undefined&&pin.fontFiles===undefined,'Font fields must be complete or absent');
    assert(!Object.keys(env).some(key=>/^(PG|DB_|MIKRO_|POMS_|JWT|DATABASE_URL|NODE_OPTIONS)/i.test(key)));return env;
}

function exactDirectory(directory){
    assert(path.posix.normalize(directory)===directory&&directory.startsWith(STATE+'/'));let current='';
    for(const part of directory.split('/').filter(Boolean)){current+='/'+part;const stat=fs.lstatSync(current);assert(stat.isDirectory()&&!stat.isSymbolicLink())}
    assert.equal(fs.realpathSync(directory),directory);
}
function pinRegular(file,pin,{allowLibraryLink=false}={}){
    assert(typeof file==='string'&&path.posix.normalize(file)===file&&file.startsWith(STATE+(allowLibraryLink?'/browser-libs/':'/browser-cache/')));
    exactDirectory(path.posix.dirname(file));const stat=fs.lstatSync(file);
    if(stat.isSymbolicLink()){assert(allowLibraryLink&&typeof pin.symlinkTarget==='string');assert.equal(fs.readlinkSync(file),pin.symlinkTarget)}else{assert(stat.isFile());assert(pin.symlinkTarget===undefined)}
    const actual=fs.realpathSync(file);assert(actual.startsWith(STATE+(allowLibraryLink?'/browser-libs/':'/browser-cache/')));exactDirectory(path.posix.dirname(actual));
    const target=fs.lstatSync(actual);assert(target.isFile()&&!target.isSymbolicLink());const fd=fs.openSync(actual,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
    try{const before=fs.fstatSync(fd),bytes=fs.readFileSync(fd),after=fs.fstatSync(fd);for(const key of['dev','ino','size','mtimeMs','ctimeMs'])assert.equal(before[key],after[key]);assert.equal(before.dev,target.dev);assert.equal(before.ino,target.ino);assert.equal(sha(bytes),pin.rawBytesSha256);if(pin.bytes!==undefined)assert.equal(bytes.length,pin.bytes);return{file,actual,bytes:bytes.length,rawBytesSha256:sha(bytes),...(pin.symlinkTarget===undefined?{}:{symlinkTarget:pin.symlinkTarget})}}finally{fs.closeSync(fd)}
}
function pinFontRegular(file,pin,inspect=()=>{}){
    assert(typeof file==='string'&&path.posix.normalize(file)===file&&file.startsWith(STATE+'/browser-fonts/'));exactDirectory(path.posix.dirname(file));
    const target=fs.lstatSync(file);assert(target.isFile()&&!target.isSymbolicLink()&&target.nlink===1);assert.equal(fs.realpathSync(file),file);const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
    try{const before=fs.fstatSync(fd),bytes=fs.readFileSync(fd),after=fs.fstatSync(fd);for(const key of['dev','ino','size','mtimeMs','ctimeMs'])assert.equal(before[key],after[key]);assert.equal(before.dev,target.dev);assert.equal(before.ino,target.ino);assert.equal(sha(bytes),pin.rawBytesSha256);if(pin.bytes!==undefined)assert.equal(bytes.length,pin.bytes);inspect(bytes);return{file,bytes:bytes.length,rawBytesSha256:sha(bytes)}}finally{fs.closeSync(fd)}
}
function verifyFontPins(pin){
    if(pin.fontconfigFile===undefined)return null;
    let xml;const config=pinFontRegular(pin.fontconfigFile,{rawBytesSha256:pin.fontconfigSha256},bytes=>{xml=bytes.toString('utf8')});
    assert(!/<\s*include\b|<!DOCTYPE|<!ENTITY/i.test(xml),'Task fontconfig cannot include system or external configuration');
    const fontDirectory=STATE+'/browser-fonts/root/usr/share/fonts/opentype/noto',cacheDirectory=STATE+'/browser-fonts/cache';
    assert.deepEqual([...xml.matchAll(/<dir\b[^>]*>([^<]*)<\/dir>/g)].map(match=>match[1].trim()),[fontDirectory]);assert.deepEqual([...xml.matchAll(/<cachedir\b[^>]*>([^<]*)<\/cachedir>/g)].map(match=>match[1].trim()),[cacheDirectory]);exactDirectory(fontDirectory);exactDirectory(cacheDirectory);
    const actual=fs.readdirSync(fontDirectory).sort();assert(actual.every(name=>/^[a-zA-Z0-9_.-]+\.(?:ttc|ttf|otf)$/.test(name)),'Only the exact pinned font members are admitted');assert.deepEqual(actual.map(name=>fontDirectory+'/'+name),pin.fontFiles.map(item=>item.file).sort());
    const fonts=pin.fontFiles.map(item=>pinFontRegular(item.file,item));return{config,fonts,fontDirectory,cacheDirectory};
}
export function verifyBrowserPin(pin){
    assert.equal(process.platform,'linux');assert(pin&&/^[0-9a-f]{64}$/.test(pin.rawBytesSha256??''));
    const executable=pinRegular(pin.executable,pin);const env=browserChildEnvironment({},pin),libraryFiles=pin.libraryFiles??[];
    assert(Array.isArray(libraryFiles)&&new Set(libraryFiles.map(item=>item.file)).size===libraryFiles.length);
    if(env.LD_LIBRARY_PATH)for(const dir of env.LD_LIBRARY_PATH.split(':'))exactDirectory(dir);
    assert(!env.LD_LIBRARY_PATH||libraryFiles.length>0,'Explicit extra library path requires actual library member pins');
    const libraries=libraryFiles.map(item=>{assert(/^[0-9a-f]{64}$/.test(item.rawBytesSha256??''));return pinRegular(item.file,item,{allowLibraryLink:true})});
    const fonts=verifyFontPins(pin);return{kind:'actual-new-M-Linux-browser-executable-and-library-pins',executable,libraries,libraryPath:pin.libraryPath??null,...(fonts?{fonts}: {})};
}
