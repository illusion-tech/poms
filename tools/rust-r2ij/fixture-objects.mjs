import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,readdirSync,readFileSync,rmdirSync,unlinkSync} from 'node:fs';
import path from 'node:path';

export const objectHash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function localRootFor(backend){assert(['nest','rust'].includes(backend));return `/home/wangzishi/.local/share/poms-r2ij/objects/${backend}/server01`;}
export function resolveObject(root,key){
    assert(typeof key==='string'&&key.length>0);
    const resolved=path.resolve(root,key.replaceAll('\\','/').replace(/^\/+/,''));
    assert(resolved.startsWith(root+path.sep),'Storage cleanup escaped owned root');
    return resolved;
}
export function scanLocal(root){
    const result={files:[],directories:[]};
    if(!existsSync(root))return result;
    function visit(directory){
        const ds=lstatSync(directory);assert(ds.isDirectory()&&!ds.isSymbolicLink(),'Storage directory identity');
        result.directories.push(path.relative(root,directory));
        for(const item of readdirSync(directory,{withFileTypes:true})){
            const file=path.join(directory,item.name),stat=lstatSync(file);
            assert(!stat.isSymbolicLink(),'Unregistered storage symlink');
            if(stat.isDirectory())visit(file);
            else{assert(stat.isFile(),'Unregistered special storage object');result.files.push(path.relative(root,file));}
        }
    }
    visit(root);result.files.sort();result.directories.sort();return result;
}
export async function preflightObjects(fixture){
    const root=localRootFor(fixture.backend),present=[],known=new Set();
    for(const object of fixture.journal.storageObjects){
        if(object.provider==='local'){
            assert(object.bucket===null);
            const file=resolveObject(root,object.key);known.add(path.relative(root,file));
            if(!existsSync(file))continue;
            const stat=lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink(),'Owned object file identity');
            const hash=objectHash(readFileSync(file));
            assert(object.writes.some(write=>write.sha256===hash&&write.size===stat.size),'Owned object bytes changed outside recorded writes');
            present.push({object,file,sha256:hash,size:stat.size});
        }else{
            assert(fixture.upstream,'Controlled OBS owner required for object preflight');
            const state=await fixture.upstream.headOwned(object,fixture.runId);
            if(!state.exists)continue;
            assert(object.writes.some(write=>write.sha256===state.sha256&&write.size===state.size),'Owned OBS object bytes changed');
            present.push({object,sha256:state.sha256,size:state.size});
        }
    }
    const scan=scanLocal(root);
    assert(scan.files.every(file=>known.has(file)),'Unknown object blocks all file and row deletion');
    return {root,present,scan,known:known.size,unknown:0,deletesIssued:0};
}
export async function removeObjects(fixture,preflight){
    let deleted=0;
    for(const entry of preflight.present){
        if(entry.object.provider==='local'){
            // Recheck immediately before each exact unlink; no recursive delete.
            const stat=lstatSync(entry.file);
            assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size===entry.size&&objectHash(readFileSync(entry.file))===entry.sha256);
            unlinkSync(entry.file);
        }else await fixture.upstream.removeOwned(entry.object,fixture.runId,entry.sha256);
        deleted++;
    }
    return deleted;
}
export function pruneNewEmptyDirectories(fixture){
    const root=localRootFor(fixture.backend),baseline=new Set(fixture.journal.baselineDirectories),scan=scanLocal(root);
    assert.equal(scan.files.length,0);
    let removed=0;
    for(const relative of scan.directories.toSorted((a,b)=>b.length-a.length)){
        if(baseline.has(relative))continue;
        const directory=relative?path.join(root,relative):root;
        assert(directory===root||directory.startsWith(root+path.sep));
        assert.equal(readdirSync(directory).length,0);
        rmdirSync(directory);removed++;
    }
    return removed;
}
