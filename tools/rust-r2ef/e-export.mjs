// Original TypeScript remains the editable authority. This exporter executes
// original Zod and reads original constant initializers; no DB or service I/O.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { executeShared } from '../rust-r2a/export-navigation.oracle.mjs';
import { golden } from './e-oracle.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
export const ROOT = resolve(import.meta.dirname, '../..');
export const SOURCE_HEAD = '7a343c543fe0031d7d6b42c1f7e18a7e861c72b7';
const sourcePaths = [
    'libs/shared/contracts/src/lib/shared-contracts.ts',
    ...['dictionary/dictionary.controller.ts','dictionary/dictionary.service.ts','dictionary/dictionary.repository.ts','dictionary/dictionary-item.entity.ts',
        'system-setting/system-setting.controller.ts','system-setting/system-setting.service.ts','system-setting/system-setting.repository.ts','system-setting/system-setting.entity.ts','system-setting/system-setting.registry.ts',
        'business-number/business-number.service.ts','business-number/business-number-sequence.entity.ts'].map(path=>'apps/poms-api/src/app/features/'+path),
    'libs/api/contracts/src/lib/dictionary/dictionary.dto.ts','libs/api/contracts/src/lib/system-setting/system-setting.dto.ts',
    'apps/poms-api/src/app/core/runtime-audit/runtime-audit-request.utils.ts'
];
const protectedPaths=['apps/poms-api/src','libs/shared/contracts/src','libs/api/contracts/src','libs/vendor/nestjs-zod/src','libs/shared/api-spec/openapi.json','libs/shared/api-client','docs/design/api-route-canonical-inventory.md','package.json','pnpm-lock.yaml'];
const read=path=>readFileSync(resolve(ROOT,path),'utf8').replace(/\r\n/g,'\n');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function sourceGuard() {
    for(const args of [['diff','--name-only','-z',SOURCE_HEAD,'--',...protectedPaths],['diff','--cached','--name-only','-z',SOURCE_HEAD,'--',...protectedPaths],['ls-files','--others','--exclude-standard','-z','--',...protectedPaths]])
        assert.equal(execFileSync('git',args,{cwd:ROOT,encoding:'utf8',windowsHide:true}).length,0,'Original authority changed');
}
function run(text,dependencies={}) {
    const exports={};
    const context={module:{exports},exports,require(name){assert(Object.hasOwn(dependencies,name),'Unknown original dependency '+name);return dependencies[name];}};
    const output=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
    new Script(output).runInNewContext(context,{timeout:2000});
    return context.module.exports;
}
export function artifacts() {
    sourceGuard();
    assert.equal(ts.version,'6.0.3');
    assert.equal(require('zod/package.json').version,'4.6.1');
    const shared=executeShared(read(sourcePaths[0]));
    const registry=run(read('apps/poms-api/src/app/features/system-setting/system-setting.registry.ts'),{'@poms/shared-contracts':shared});
    const source=ts.createSourceFile('business-number.service.ts',read('apps/poms-api/src/app/features/business-number/business-number.service.ts'),ts.ScriptTarget.Latest,true);
    const declaration=source.statements.flatMap(statement=>ts.isVariableStatement(statement)?[...statement.declarationList.declarations]:[]).find(node=>node.name.getText(source)==='BUSINESS_NUMBER_SPECS');
    assert(declaration?.initializer,'Missing original business-number constant');
    const businessNumbers=run('export const value = '+declaration.initializer.getText(source)).value;
    const authority={formatVersion:1,sourceHead:SOURCE_HEAD,dictionaryDomains:shared.DICTIONARY_DOMAINS,statuses:shared.ACTIVE_INACTIVE_STATUSES,settings:registry.SYSTEM_SETTING_DEFINITIONS,bytesPerMb:registry.BYTES_PER_MB,businessNumbers};
    assert.equal(Object.keys(businessNumbers).length,9);
    const corpus=golden(shared,SOURCE_HEAD);
    const spec=JSON.parse(read('libs/shared/api-spec/openapi.json'));
    function subset(paths) {
        const names=new Set();
        function visit(value) {
            if(!value||typeof value!=='object')return;
            if(typeof value.$ref==='string'&&value.$ref.startsWith('#/components/schemas/')) {
                const name=value.$ref.slice('#/components/schemas/'.length);
                assert(Object.hasOwn(spec.components.schemas,name),'Missing schema '+name);
                if(!names.has(name)){names.add(name);visit(spec.components.schemas[name]);}
            }
            Object.values(value).forEach(visit);
        }
        const selected=Object.fromEntries(paths.map(path=>{assert(Object.hasOwn(spec.paths,path),'Missing original path '+path);visit(spec.paths[path]);return [path,spec.paths[path]];}));
        return {openapi:spec.openapi,paths:selected,components:{schemas:Object.fromEntries([...names].sort().map(name=>[name,spec.components.schemas[name]])),securitySchemes:spec.components.securitySchemes}};
    }
    const manifest={formatVersion:1,sourceHead:SOURCE_HEAD,authority:'Unchanged original TypeScript/Zod; generated neutral data only',sourceGuard:{reference:SOURCE_HEAD,scope:protectedPaths,axes:['working','index','untracked']},sources:sourcePaths.map(path=>({path,normalizedUtf8Sha256:hash(read(path))})),outputs:['e-authority.json','e-golden.json']};
    return new Map([['e-authority.json',authority],['e-golden.json',corpus],['e-source.json',manifest],['e-dictionary-openapi.json',subset(['/api/dictionaries','/api/dictionaries/{id}'])],['e-settings-openapi.json',subset(['/api/platform/system-settings','/api/platform/system-settings/{key}'])]].map(([file,value])=>[file,JSON.stringify(value,null,2)+'\n']));
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)) {
    const check=process.argv.includes('--check');
    const outputs=artifacts();
    mkdirSync(resolve(ROOT,'tools/rust-r2ef'),{recursive:true});
    for(const [file,text] of outputs) {
        const path=resolve(ROOT,'tools/rust-r2ef',file);
        if(check) assert.equal(readFileSync(path,'utf8'),text,'Stale neutral artifact '+file);
        else writeFileSync(path,text,'utf8');
    }
    console.log(JSON.stringify({sourceHead:SOURCE_HEAD,outputs:outputs.size,cases:JSON.parse(outputs.get('e-golden.json')).cases.length,check,node:process.version}));
}
