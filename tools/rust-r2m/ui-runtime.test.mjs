// Pure local files only. No socket, browser, DB, private or process launch.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {uiRuntimePlan,readUiPublicInput} from './ui-runtime.mjs';
import {verifyUiBuild} from './ui-runtime-server.mjs';
import {browserChildEnvironment} from './ui-runtime-browser.mjs';
const runId='10000000-0000-4000-8000-000000000001',sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('first Linux owner explicitly selects UI1 and cannot claim unimplemented combinations',()=>{
    const plan=uiRuntimePlan({backend:'rust',tag:'pure01',runId});assert.deepEqual(plan.apiPorts,[10070,10071]);assert.deepEqual(plan.notRun,['UI2','UI3','UI4']);assert.equal(plan.G3Certified,false);
    for(const options of[{backend:'external',tag:'pure01',runId},{backend:'nest',tag:'old/run',runId},{backend:'nest',tag:'pure01',runId,selection:['UI1','UI2']}])assert.throws(()=>uiRuntimePlan(options));
});
test('UI public input admission refuses private and ambiguous paths before reading',()=>{
    for(const file of['/home/wangzishi/.local/share/poms-r2m/private/nest.env','tmp/rust-r2m/../private/a.json','tmp/rust-r2m/private/a.json','tmp/rust-r2l/a.json','tmp\\rust-r2m\\a.json'])assert.throws(()=>readUiPublicInput(file));
});
test('browser child environment drops Native credentials and admits only exact new-M library directories',()=>{
    const env=browserChildEnvironment({PATH:'/bin',HOME:'/home/test',JWT_SECRET:'secret',DB_PASSWORD:'secret',MIKRO_ORM_PASSWORD:'secret',DATABASE_URL:'secret',NODE_OPTIONS:'--inspect',POMS_ENV_FILE:'/private/nest.env',LD_PRELOAD:'evil',LD_LIBRARY_PATH:'/old'}, {libraryPath:'/home/wangzishi/.local/share/poms-r2m/browser-libs/usr/lib/x86_64-linux-gnu'});
    assert.deepEqual(Object.keys(env).sort(),['HOME','LD_LIBRARY_PATH','PATH']);assert.equal(Object.values(env).includes('secret'),false);
    for(const libraryPath of['/usr/lib','/home/wangzishi/.local/share/poms-r2l/browser-libs/usr/lib',':/home/wangzishi/.local/share/poms-r2m/browser-libs/usr/lib','/home/wangzishi/.local/share/poms-r2m/browser-libs/../private'])assert.throws(()=>browserChildEnvironment({}, {libraryPath}));
});

test('Linux fontconfig is new-M child-only and needs a complete explicit immutable member list',()=>{
    const prefix='/home/wangzishi/.local/share/poms-r2m/browser-fonts',pin={fontconfigFile:prefix+'/fonts.conf',fontconfigSha256:'a'.repeat(64),fontFiles:[{file:prefix+'/root/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',bytes:100,rawBytesSha256:'b'.repeat(64)}]};
    const env=browserChildEnvironment({FONTCONFIG_FILE:'/etc/fonts/fonts.conf',FONTCONFIG_PATH:'/etc/fonts',DB_PASSWORD:'secret',DEBUG:'pw:browser'},pin);assert.deepEqual(env,{FONTCONFIG_FILE:pin.fontconfigFile,FONTCONFIG_PATH:prefix});
    for(const mutate of[p=>p.fontconfigFile='/etc/fonts/fonts.conf',p=>p.fontconfigFile=prefix+'/../private/secret.conf',p=>delete p.fontconfigSha256,p=>p.fontFiles=[],p=>p.fontFiles[0].file='/usr/share/fonts/a.ttc',p=>p.fontFiles[0].file=prefix+'/root/usr/share/fonts/opentype/noto/../../private/a.ttc',p=>p.fontFiles.push({...p.fontFiles[0]})]){const value=structuredClone(pin);mutate(value);assert.throws(()=>browserChildEnvironment({},value))}
    assert.throws(()=>browserChildEnvironment({},{fontFiles:pin.fontFiles}));
});
test('UI build membership and bytes must exactly equal the frozen capsule member list',()=>{
    const parent=fs.mkdtempSync(path.join(os.tmpdir(),'poms-r2m-ui-pure-')),root=path.join(parent,'dist','tools','rust-r2m-ui-pure','browser');
    assert(root.startsWith(parent+path.sep));fs.mkdirSync(root,{recursive:true});const bytes=Buffer.from('<html>pure</html>'),pin={file:'index.html',bytes:bytes.length,rawBytesSha256:sha(bytes)};fs.writeFileSync(path.join(root,'index.html'),bytes,{flag:'wx'});
    try{assert.equal(verifyUiBuild({buildDirectory:root,buildFiles:[pin]}).pins.size,1);fs.writeFileSync(path.join(root,'extra.js'),'extra',{flag:'wx'});assert.throws(()=>verifyUiBuild({buildDirectory:root,buildFiles:[pin]}));fs.unlinkSync(path.join(root,'extra.js'));fs.writeFileSync(path.join(root,'index.html'),'changed');assert.throws(()=>verifyUiBuild({buildDirectory:root,buildFiles:[pin]}));assert.throws(()=>verifyUiBuild({buildDirectory:root,buildFiles:[{...pin,file:'../index.html'}]}));}
    finally{assert(path.resolve(parent).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(parent).startsWith('poms-r2m-ui-pure-'));fs.rmSync(parent,{recursive:true,force:false});}
});
