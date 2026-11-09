// The earlier observer failed before SQL. This edition is an administrative
// data audit, not an active119 or historical252 admission certificate.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms';
let t=fs.readFileSync(R+'/tools/rust-r4ghi/observe-recovery286.mjs','utf8');
const oldImport="import { assertAdmittedContext54 } from './business/consumer-admission54.mjs';";
assert.equal(t.split(oldImport).length,2);t=t.replace(oldImport,"import { verifySchemaBinding108 } from './business/schema-comparison108.mjs';\nimport { validateRegistryLineage62 } from './business/registry-lineage62.mjs';");
assert.equal(t.split("O=D+'/recovery286'").length,2);t=t.replace("O=D+'/recovery286'","O=D+'/recovery28602'");
const guard="assertAdmittedContext54(ctx,{liveProcess:false,sourceFiles:true});";assert.equal(t.split(guard).length,3);
const recorded="{const recorded=json(state.consumerAdmission54.registry);assert.equal(recorded.schemaVersion,3);assert.equal(recorded.consumer.apiProcess.rawBytesSha256,oldProcessPin.rawBytesSha256);assert.equal(state.apiProcess.rawBytesSha256,oldProcessPin.rawBytesSha256);verifySchemaBinding108(ctx,state.schemaComparison108,recorded);validateRegistryLineage62(ctx,recorded);}";
t=t.split(guard).join(recorded);
t=t.replace("kind:'actual-post-runtime-loss-same-PG-full-conservation286'","kind:'actual-administrative-post-runtime-loss-PG-conservation28602',dataConservationOnly:true,historicalAdmissionValidated:false,active119Validation:false");
t=t.replace("'readonly-recovery286'","'administrative-readonly-recovery28602'");
fs.writeFileSync(R+'/tools/rust-r4ghi/observe-recovery28602.mjs',t,{flag:'wx'});
console.log(JSON.stringify({newAdministrativeObserver:true,failed286Preserved:true,active119GuardUnchanged:true,currentSource13EffectReadmission:false}));
