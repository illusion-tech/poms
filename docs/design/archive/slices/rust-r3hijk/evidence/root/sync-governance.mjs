// Root's explicit non-product sync, before joint G1 only.
import fs from 'node:fs';import assert from 'node:assert/strict';
const win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',root='/home/wangzishi/projects/poms-rust-r3hijk';assert.equal(process.cwd(),root);
const paths=['.gitattributes','tools/rust-r3ab/inventory.mjs','tools/rust-r3hijk','docs/design/rust-r3hijk','docs/design/rust-r3hijk-next28-baseline.md','docs/design/rust-r3hijk-scope-and-dependencies.md','docs/design/rust-r3hijk-delivery-status.json','docs/design/backend-rust-migration-plan.md','docs/design/phase2-development-execution-tracker.md'];
for(const p of paths)fs.cpSync(win+'/'+p,root+'/'+p,{recursive:true});
console.log(JSON.stringify({nonProductPathsCopied:paths,privateCopied:false,productCopied:false}));
