import fs from 'node:fs';
import assert from 'node:assert/strict';
let source = fs.readFileSync('tools/rust-r4ghi/business-environment03.mjs','utf8');
function replace(a,b) { assert.equal(source.split(a).length,2,a);source=source.replace(a,()=>b); }
replace("root/business-environment03'", "root/business-environment04'");
replace("assert.equal(names.length,95);", "assert.equal(names.length,96);");
replace("const before=await orm.migrator.getExecuted();assert.equal(before.length,i===0?95:94);", "const before=await orm.migrator.getExecuted();assert.equal(before.length,95);");
replace("assert.equal(after.length,95);assert.equal(applied.length,i===0?0:1);", "assert.equal(after.length,96);assert.equal(applied.length,1);");
replace("adoptedAfterVerifier02:i===0", "adoptedAfterVerifier02:false");
replace("existingDataPreservedAcrossThisMigration:i===1,adoptedAlreadyCommittedMigrationAfterVerifier02:i===0,verificationScope:i===1?'all-original-column-data-before-after':'current-catalog-and-no-op-only-original-before-image-not-retained-by-verifier02'", "existingDataPreservedAcrossThisMigration:true,adoptedAlreadyCommittedMigrationAfterVerifier02:false,verificationScope:'all-original-column-data-before-after'");
replace("kind:'R4-GHI-original94-plus-single-forward-migration'", "kind:'R4-GHI-purpose-binding-single-forward-migration95-to96'");
replace("const base='aaa4b16ac66092f0cb1dc6646a02cf14e80823ee'", "const bindingPromotion=JSON.parse(fs.readFileSync(win+'/docs/design/rust-r4ghi/attachment-migration-promotion02.json'));assert.equal(createHash('sha256').update(fs.readFileSync(win+'/'+bindingPromotion.target)).digest('hex'),bindingPromotion.targetSHA256);\nconst base='aaa4b16ac66092f0cb1dc6646a02cf14e80823ee'");
const output='tools/rust-r4ghi/business-environment04.mjs';assert(!fs.existsSync(output));fs.writeFileSync(output,source,{flag:'wx'});
console.log(JSON.stringify({output,expectedBefore:95,expectedAfter:96,expectedTables:139,namespace:'poms-r4ghi',executed:false}));
