// Root-only bounded owner for a new, explicitly prepared controlled114 epoch.
// Import/check is pure. Existing natural114/edge receipts are never rewritten.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { commissionBuildBinding,runCommissionConsumersActual } from './l-commission-http-actual.mjs';
const require=createRequire(import.meta.url), SOURCE='tools/rust-r2l/l-commission-controlled.mjs';
const PRIVATE='/home/wangzishi/.local/share/poms-r2l/private';
const sha=(bytes) => createHash('sha256').update(bytes).digest('hex');
export function controlledCommissionOptions(tag,backend,buildBinding=null) {
    assert(/^[a-z0-9-]{1,24}$/.test(tag ?? '')); assert(['nest','rust'].includes(backend));
    return { tag,backend,consumerBackend:backend==='nest' ? 'native' : 'rust',authFreshnessPolicy:'fresh-except-named-due',buildBinding,expectedBinarySha256:buildBinding?.expectedBinarySha256 };
}
function privateDirectory(directory) {
    if (!fs.existsSync(directory)) fs.mkdirSync(directory,{ mode:0o700 });
    const stat=fs.lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077)===0);
}
async function owner(tag,backend,buildTag) {
    controlledCommissionOptions(tag,backend); assert(/^candidate[0-9]{2}$/.test(buildTag));
    assert.equal(process.platform,'linux'); assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r2l');
    const binding=backend==='rust' ? commissionBuildBinding(buildTag) : null;
    privateDirectory(PRIVATE); privateDirectory(PRIVATE+'/execution-logs');
    const log=PRIVATE+`/execution-logs/commission-controlled-${backend}-${tag}.log`,output=`tmp/rust-r2l/commission-controlled-${backend}-${tag}-owner.json`;
    assert(!fs.existsSync(log) && !fs.existsSync(output));
    const report={ formatVersion:1,kind:'bounded-controlled114-owner',result:'pending',tag,backend,authFreshnessPolicy:'fresh-except-named-due',buildBinding:binding,source:{ file:SOURCE,sha256:sha(fs.readFileSync(SOURCE)) },startedAt:new Date().toISOString(),privateStdoutExported:false };
    const runtime=require('../e2e/runtime.cjs');
    try {
        for (const port of [9700,9701]) await runtime.assertPortAvailable(runtime.resolveTarget({ mode:'external',baseUrl:'http://127.0.0.1:'+port }));
        const owned=await runtime.runOwnedCommand({ executable:process.execPath,args:[SOURCE,tag,backend,buildTag,binding?.expectedBinarySha256 ?? '', '--owner-child'],cwd:process.cwd(),env:{ PATH:process.env.PATH,HOME:process.env.HOME,LANG:process.env.LANG ?? 'C.UTF-8' },logPath:path.resolve(log),timeoutMs:300000 });
        report.exitCode=owned.code; report.result='pass';
    } catch (error) { report.result='fail'; report.failure={ name:error.name,message:error.message }; process.exitCode=1; }
    finally {
        if (fs.existsSync(log)) { fs.chmodSync(log,0o600); report.privateLog={ file:log,bytes:fs.statSync(log).size,sha256:sha(fs.readFileSync(log)),contentsExported:false }; }
        report.finishedAt=new Date().toISOString(); fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{ flag:'wx' }); console.log(JSON.stringify(report));
    }
}
if (path.resolve(process.argv[1] ?? '')===fileURLToPath(import.meta.url)) {
    const [tag,backend,buildTag='candidate06',expectedBinarySha256]=process.argv.slice(2);
    if (process.argv.includes('--owner-child')) {
        assert.equal(process.platform,'linux');
        const binding=backend==='rust' ? commissionBuildBinding(buildTag) : null;
        if (binding) assert.equal(binding.expectedBinarySha256,expectedBinarySha256);
        await runCommissionConsumersActual(controlledCommissionOptions(tag,backend,binding));
    } else await owner(tag,backend,buildTag);
}
