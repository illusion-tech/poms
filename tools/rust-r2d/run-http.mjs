import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runHttpCompat, belowEvidence } from './http-compat.mjs';
import { httpCoverageManifest } from './http-compat-cases.mjs';

export function parseHttpOptions(args){
    if(args.length===1&&args[0]==='--plan')return {mode:'plan'};
    assert(args.length===2||args.length===3,'Usage: run-http.mjs --plan | <nest|rust> <tmp/rust-r2d/server-receipt.json> [unique-tag]');
    const [backend,serverReceiptFile,tag='01']=args;
    assert(['nest','rust'].includes(backend));assert(/^[a-z0-9][a-z0-9-]{0,39}$/.test(tag));belowEvidence(serverReceiptFile);
    return {mode:'run',backend,serverReceiptFile,tag};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    const options=parseHttpOptions(process.argv.slice(2));
    if(options.mode==='plan')console.log(JSON.stringify(httpCoverageManifest(),null,2));
    else{
        const {report,output}=await runHttpCompat(options);
        console.log(JSON.stringify({result:report.result,output,runId:report.runId,cases:report.observations.length,cleanupCompleted:report.cleanupCompleted,failurePhase:report.failurePhase,failureReason:report.failureReason}));
        if(report.result!=='observed')process.exitCode=1;
    }
}
