'use strict';
// A new fixed Windows admission. The original Linux guard is unchanged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {loadManagedEnvironment} = require('./managed-environment.cjs');

const PRIVATE_UNC = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r2m/private';
const SOURCE_ENV = PRIVATE_UNC + '/nest.env';
const WINDOWS_ENV = PRIVATE_UNC + '/windows-nest.env';
const LINUX_OBJECT_ROOT = '/home/wangzishi/.local/share/poms-r2m/objects/nest/server01';
const WINDOWS_OBJECT_ROOT = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r2m/objects/nest/server01';
const sha = value => createHash('sha256').update(value).digest('hex');
const samePath = (a,b) => a.replaceAll('\\','/').toLowerCase() === b.replaceAll('\\','/').toLowerCase();

function deriveRawWindowsNativeEnvironment(raw) {
    assert.equal(typeof raw,'string');
    const keys=[...raw.matchAll(/^([A-Za-z_][A-Za-z0-9_]*)=/gm)].map(item=>item[1]);
    assert.equal(new Set(keys.map(key=>key.toUpperCase())).size,keys.length,'Duplicate environment key');
    const expression=/^POMS_ATTACHMENT_LOCAL_ROOT=([^\r\n]*)(\r?)$/gm,matches=[...raw.matchAll(expression)];
    assert.equal(matches.length,1,'One exact local-object-root line required');assert.equal(matches[0][1],LINUX_OBJECT_ROOT);
    return raw.replace(expression,(_line,_value,cr)=>'POMS_ATTACHMENT_LOCAL_ROOT='+WINDOWS_OBJECT_ROOT+cr);
}

function readExactUnc(file) {
    assert([SOURCE_ENV,WINDOWS_ENV].some(value=>samePath(value,file)),'Fixed new-M environment filename required');
    const resolved=path.resolve(file),root=path.parse(resolved).root;let current=root;
    for(const part of resolved.slice(root.length).split(path.sep).filter(Boolean)){current=path.join(current,part);const stat=fs.lstatSync(current);assert(!stat.isSymbolicLink(),'UNC environment symlink refused')}
    const stat=fs.lstatSync(resolved);assert(stat.isFile()&&stat.nlink===1);assert(samePath(fs.realpathSync(resolved),resolved));
    const fd=fs.openSync(resolved,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
    try{const opened=fs.fstatSync(fd);assert(opened.isFile()&&opened.dev===stat.dev&&opened.ino===stat.ino&&opened.size===stat.size);const raw=fs.readFileSync(fd,'utf8'),after=fs.fstatSync(fd),fresh=fs.lstatSync(resolved);for(const value of[after,fresh])for(const field of['dev','ino','size','mtimeMs','ctimeMs'])assert.equal(value[field],opened[field]);return raw}finally{fs.closeSync(fd)}
}

function loadWindowsNativeEnvironment({mode='windows-managed-nest',env=process.env,cwd=process.cwd(),expectedProof}={}) {
    assert.equal(process.platform,'win32');assert.equal(mode,'windows-managed-nest');
    assert(typeof env.POMS_ENV_FILE==='string'&&samePath(path.resolve(cwd,env.POMS_ENV_FILE),WINDOWS_ENV),'Only fixed windows-nest.env admitted');
    const before=readExactUnc(SOURCE_ENV),derived=deriveRawWindowsNativeEnvironment(before),actual=readExactUnc(WINDOWS_ENV);
    // The mature source admission still verifies every allowed key, secret
    // format, role/database/port and exact controlled supplier endpoint.
    const original=loadManagedEnvironment({mode:'managed-nest',env:{...env,POMS_ENV_FILE:SOURCE_ENV},cwd});
    assert.equal(actual,derived,'Derived file may change only the one local object root');assert.equal(readExactUnc(SOURCE_ENV),before,'Original new-M nest.env changed');
    const proof={kind:'R2M-fixed-Windows-Native-environment-derivation',sourceFile:'/home/wangzishi/.local/share/poms-r2m/private/nest.env',sourceRawBytesSha256:sha(before),derivedFile:'/home/wangzishi/.local/share/poms-r2m/private/windows-nest.env',derivedRawBytesSha256:sha(actual),onlyLocalObjectRootChanged:true,sourceUnchanged:true,namespace:'poms-r2m',database:'poms_r2m_nest',port:10070,contentsExported:false};
    assert(expectedProof&&expectedProof.sourceRawBytesSha256===proof.sourceRawBytesSha256&&expectedProof.derivedRawBytesSha256===proof.derivedRawBytesSha256&&expectedProof.onlyLocalObjectRootChanged===true,'Root exact derivation proof required');
    return{...original,envFile:path.resolve(WINDOWS_ENV),childEnv:{...original.childEnv,POMS_ENV_FILE:path.resolve(WINDOWS_ENV),POMS_ATTACHMENT_LOCAL_ROOT:WINDOWS_OBJECT_ROOT},proof};
}

module.exports={loadWindowsNativeEnvironment,deriveRawWindowsNativeEnvironment,SOURCE_ENV,WINDOWS_ENV,WINDOWS_OBJECT_ROOT};
