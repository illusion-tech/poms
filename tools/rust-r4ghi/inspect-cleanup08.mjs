import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
const priv='/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business08/main01';
const file=priv+'/000707-cleanup-plan01-cleanup-plan.json';
const bytes=fs.readFileSync(file), plan=JSON.parse(bytes);
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(plan.epoch,'g2-business08'); assert.equal(plan.run,'main01');
const group=items=>Object.fromEntries([...new Set(items.map(x=>x.table))].sort().map(t=>[t,items.filter(x=>x.table===t).length]));
console.log(JSON.stringify({file,sha256:sha(bytes),status:plan.status,blockers:plan.blockers,
  deletes:plan.deleteRows.length,tables:group(plan.deleteRows),databases:[...new Set(plan.deleteRows.map(x=>x.database))],
  restores:plan.restoreRows.map(x=>({database:x.database,table:x.table,columns:x.columns,reason:x.reason})),
  maintenance:plan.maintenance&&{strategy:plan.maintenance.strategy,systemRI:plan.maintenance.originalSystemFKTriggersRemainEnabled,
    sandbox:plan.maintenance.actualSandbox, guards:plan.maintenance.guardTriggers.map(x=>({table:x.table_name,name:x.tgname,oid:x.oid,enabled:x.tgenabled})),
    command: {sha256:plan.maintenance.command.rawSQLSha256,parameterSHA256:plan.maintenance.command.parameterSHA256,tableCount:plan.maintenance.command.tableCount}},
  objectDeletes:plan.deleteObjects.length,emptyDirectoryDeletes:plan.deleteDirectories.length,
  DBAndFilesystemAtomicity:plan.DBAndFilesystemAtomicity}));
