const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const ts=createRequire('E:/projects/poms/package.json')('typescript');
const rel='apps/poms-admin/src/app/shared/ui/sensitive-visibility.ts',file=path.join(__dirname,'proposed',rel),source=fs.readFileSync(file,'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,moduleValue={exports:{}};
vm.runInThisContext(`(function(module,exports){${js}\n})`,{filename:file})(moduleValue,moduleValue.exports);
const {formatSensitiveAmountProjection:amount,formatSensitiveRatioProjection:ratio}=moduleValue.exports;
const full=value=>({mode:'full',value,displayText:'真实投影展示'});let cases=0;function check(fn){fn();cases++;}
for(const [value,expected]of [['0.00','0.00'],['1.20','1.20'],['-1.23','-1.23'],['9999999999999999.99','9,999,999,999,999,999.99'],['-9999999999999999.99','-9,999,999,999,999,999.99'],['1.23444','1.2344'],['1.23445','1.2345'],['-1.23445','-1.2345'],['9.99995','10.00'],['9999999999999999.99995','10,000,000,000,000,000.00'],['-0.00001','-0.00']])check(()=>assert.equal(amount(full(value)),expected));
for(const [value,expected]of [['0.000000','0.00%'],['0.199999','20.00%'],['0.200000','20.00%'],['0.199949','19.99%'],['0.199950','20.00%'],['-0.199950','-20.00%'],['0.000050','0.01%'],['-0.000050','-0.01%'],['9999999999999999.990000','999,999,999,999,999,999.00%']])check(()=>assert.equal(ratio(full(value)),expected));
check(()=>assert.equal(amount(full('9999999999999999.99'),'HKD'),'9,999,999,999,999,999.99 HKD'));
check(()=>assert.equal(amount({mode:'masked',value:'9999999999999999.99',displayText:'经营敏感字段已隐藏'}),'经营敏感字段已隐藏'));
check(()=>assert.equal(ratio({mode:'denied',value:'0.2',displayText:'无权读取'}),'无权读取'));
check(()=>assert.equal(amount({mode:'full',value:null,displayText:'未知，尚无依据'}),'未知，尚无依据'));
check(()=>assert.equal(amount(full('正式金额尚未形成')),'正式金额尚未形成'));
check(()=>assert.equal(ratio(full('比例不可用')),'比例不可用'));
check(()=>assert.equal(new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:4}).resolvedOptions().roundingMode,'halfExpand'));
const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let lossyCalls=0;function visit(n){if(ts.isCallExpression(n)&&['Number','parseFloat','parseInt'].includes(n.expression.getText(ast)))lossyCalls++;ts.forEachChild(n,visit);}visit(ast);check(()=>assert.equal(lossyCalls,0));
const result={status:'passed-exact-decimal-display-unit-only',cases,syntheticInputStrings:true,noBusinessThresholdDecision:true,existingDisplayDigitsPreserved:true,noHTTP:true,noDB:true};fs.writeFileSync(path.join(__dirname,'unit04.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
