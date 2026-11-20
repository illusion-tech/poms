// Exact FS-only follow-up for the four already-promoted18 Windows workers.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url)),root='E:/projects/worktrees/poms-r3hijk-next28/poms',sha=value=>createHash('sha256').update(value).digest('hex');
const expected={role:'392c1408e583df61fcbb0f4ce5148afa2dc8104367447610b5ac3f00ba0f5a38',expense:'35702e2d76ecd55403aa186311eee9e562251fe91e8e5356e77c8393d1804a9e',gh:'eabbd813dbf5c55f44d9da5ad40741f140520087bb39620207730291209572e7',lifecycle:'1de1c5723c0a6186e677a57ffb8f062bad029b81488e26c72db810157edb5f24'};
const products=[];
for(const[kind,beforeSHA256]of Object.entries(expected)){
 const file=`tools/rust-r4ghi/business/ui-${kind}18-windows.mjs`,beforeBytes=fs.readFileSync(`${root}/${file}`);assert.equal(sha(beforeBytes),beforeSHA256);const before=beforeBytes.toString('utf8');
 const start=before.indexOf('function fileVersion('),end=before.indexOf('function bindPlaywright(');assert(start>=0&&end>start);let after=before.slice(0,start)+before.slice(end);
 const replace=(from,to)=>{assert.equal(after.split(from).length,2,`Exact unique replacement missing: ${kind}`);after=after.replace(from,to);};
 replace("import { execFileSync, spawn } from 'node:child_process';","import { spawn } from 'node:child_process';\nimport { bindPowerShell22, createPrivateDirectory22, fileVersion22, emitFailure22 } from './ui-windows-preflight22.mjs';");
 replace('readPinned(executable, plan.windows.browser.rawBytesSha256); const version = fileVersion(executable);','readPinned(executable, plan.windows.browser.rawBytesSha256); const powershell22 = bindPowerShell22(plan.windows.powershell); createPrivateDirectory22(locations.windowsPrivate, powershell22); const version = fileVersion22(executable, powershell22, locations.windowsPrivate);');
 replace('const { chromium, expect } = bindPlaywright(plan.windows.playwright); createPrivateDirectory(locations.windowsPrivate);','const { chromium, expect } = bindPlaywright(plan.windows.playwright);');
 replace('assert.deepEqual(fileVersion(executable), version);','assert.deepEqual(fileVersion22(executable, powershell22, locations.windowsPrivate), version);');
 replace("main().catch(() => { console.error('Windows runtime14 preflight/owned-worker failed; inspect task-private originals. No DOM success is claimed.'); process.exitCode = 1; });","main().catch(error => { emitFailure22(error); process.exitCode = 1; });");
 assert(!after.includes("execFileSync('powershell.exe'")&&!after.includes('function createPrivateDirectory('));
 const candidate=`proposed/${file}`,target=`${out}/${candidate}`;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,after,{flag:'wx'});
 products.push({file,beforeSHA256,afterSHA256:sha(Buffer.from(after)),candidate});
}
fs.writeFileSync(`${out}/candidates22-02.json`,JSON.stringify(products,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(products));
