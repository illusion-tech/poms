const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const root=process.cwd(),installed=createRequire(path.join(root,'package.json')),ts=installed('typescript'),cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;function req(n){if(n.startsWith('.'))return load(path.resolve(path.dirname(file),n+'.ts'));return installed(n);}vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename:file})(req,m,m.exports);return m.exports;}
const main=load('libs/shared/contracts/src/lib/shared-contracts.ts'),generated=load('libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts');
const schemas=JSON.parse(fs.readFileSync('tools/rust-r4ghi/public131/public-contracts.g2-131.schema.json')).components.schemas;
const cases=[];function check(name,body){body();cases.push(name);}
for(const name of Object.keys(schemas))check('single-public-reexport:'+name,()=>assert.equal(main[name+'Schema'],generated[name+'Schema']));
const input={projectName:'真实组织承接入口',customerId:'00000000-0000-4000-8000-000000000001',currentStage:'assessment'};
check('omission-remains-optional-without-client-authority',()=>{const p=main.CreateProjectRequestSchema.parse(input);assert(!Object.hasOwn(p,'initialOwnership'));});
for(const initialOwnership of ['creator','organization'])check('accepted:'+initialOwnership,()=>assert.equal(main.CreateProjectRequestSchema.parse({...input,initialOwnership}).initialOwnership,initialOwnership));
for(const value of [null,0,true,'org','Organization',[],{},''])check('reject-invalid-ownership:'+JSON.stringify(value),()=>assert.equal(main.CreateProjectRequestSchema.safeParse({...input,initialOwnership:value}).success,false));
check('new-project-cannot-skip-assessment',()=>assert.equal(main.CreateProjectRequestSchema.safeParse({...input,initialOwnership:'organization',currentStage:'execution'}).success,false));
check('named-enum-options-exact',()=>assert.deepEqual(main.ProjectInitialOwnershipSchema.options,['creator','organization']));
check('required-execution-context-preserved',()=>assert(schemas.FullProjectDetailView.required.includes('executionAdmissionContext')));
const report={kind:'actual-canonical131-Zod-parser-regressions',passed:cases.length,cases,schemaReexports:131,HTTP:false,DB:false,actorAuthorizationAccepted:false,G3Certified:false};
fs.writeFileSync('tools/rust-r4ghi/public131/parser-regressions131.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:report.passed,schemaReexports:131,HTTP:false,G3Certified:false}));
