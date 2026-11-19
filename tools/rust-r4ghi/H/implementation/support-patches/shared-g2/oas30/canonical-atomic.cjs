// Load the existing repo implementation, without changing it or using another
// registry. Root's actual generation can import utils.ts directly instead.
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const{createRequire}=require('node:module');
const installed=createRequire('E:/projects/poms/package.json');const ts=installed('typescript');
const root=JSON.parse(fs.readFileSync(path.join(__dirname,'../shared-g2-plan.json'),'utf8')).productReadRoot;
const file=path.join(root,'libs/vendor/nestjs-zod/src/utils.ts');const source=fs.readFileSync(file,'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const moduleValue={exports:{}};vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(installed,moduleValue,moduleValue.exports);
module.exports={convertAtomic:moduleValue.exports.convertToOpenApi3Point0,sourceFile:file};
