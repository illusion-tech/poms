import { createRequire } from 'node:module';
import { databaseClient } from './database-client.mjs';
import { executeBatchFixture } from './batch-fixture.mjs';
const require=createRequire(import.meta.url);
const {parseBatchRequest}=require('./batch-protocol.cjs');
const {FixtureError}=require('./fixture-protocol.cjs');
const timer=setTimeout(()=>{process.stderr.write('{"formatVersion":1,"code":"fixture_deadline"}\n');process.exit(1);},55000);timer.unref();
let client;
try {
    if(process.platform!=='linux'||process.argv.length!==2)throw new FixtureError('unsupported_invocation');
    const chunks=[];let size=0;
    for await(const c of process.stdin){size+=c.length;if(size>16384)throw new FixtureError('invalid_input_size');chunks.push(c);}
    const bytes=Buffer.concat(chunks);let request;
    try{request=parseBatchRequest(bytes);}finally{bytes.fill(0);for(const c of chunks)c.fill(0);}
    client=await databaseClient(request.backend);
    const result=await executeBatchFixture(client,request);
    process.stdout.write(JSON.stringify({formatVersion:1,runId:request.runId,backend:request.backend,action:request.action,...result})+'\n');
} catch(error) {
    process.stderr.write(JSON.stringify({formatVersion:1,code:error instanceof FixtureError?error.code:'fixture_failed'})+'\n');process.exitCode=1;
} finally {if(client)await client.end();clearTimeout(timer);}
