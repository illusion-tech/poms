import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {closeSync,existsSync,fsyncSync,lstatSync,mkdirSync,openSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {privateRoot} from './database-client.mjs';
import {ownershipFor} from './fixture-complete-references.mjs';

export const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function extensionStore(backend,runId){
    assert(['nest','rust'].includes(backend)&&uuid.test(runId));
    const directory=path.join(privateRoot,'ij-runs');
    if(!existsSync(directory))mkdirSync(directory,{mode:0o700});
    const ds=lstatSync(directory);assert(ds.isDirectory()&&!ds.isSymbolicLink()&&(ds.mode&0o077)===0);
    const file=path.join(directory,`${backend}-${runId}.json`);
    function validate(j){
        assert(j&&j.formatVersion===1&&j.backend===backend&&j.runId===runId&&['planned','prepared','cleaned'].includes(j.state));
        for(const key of ['objects','storageObjects','intents','faults','readOnlyReferences','baselineDirectories'])assert(Array.isArray(j[key]));
        assert(j.objects.length<10000&&j.storageObjects.length<10000&&j.intents.length<20000);
        ownershipFor(j);
        return j;
    }
    function read(){
        if(!existsSync(file))return undefined;
        const s=lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink()&&(s.mode&0o077)===0&&s.size<16*1024*1024);
        return validate(JSON.parse(readFileSync(file,'utf8')));
    }
    function write(j){
        validate(j);const temporary=file+'.'+randomUUID()+'.tmp';
        const fd=openSync(temporary,'wx',0o600);
        try{writeFileSync(fd,JSON.stringify(j)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
        renameSync(temporary,file);
        const parent=openSync(directory,'r');try{fsyncSync(parent);}finally{closeSync(parent);}
    }
    return {file,directory,read,write};
}

export function newExtension(backend,runId){
    return {formatVersion:1,backend,runId,state:'planned',objects:[],storageObjects:[],intents:[],faults:[],readOnlyReferences:[],baselineDirectories:[],createdAt:new Date().toISOString()};
}
