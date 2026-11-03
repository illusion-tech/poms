// Actual original request Zod only; no Nest, ORM, PG or HTTP execution.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),ts=require('typescript');
const root=path.resolve(__dirname,'../../../..');
const file='libs/shared/contracts/src/lib/shared-contracts.ts';
const source=fs.readFileSync(path.join(root,file),'utf8');
const moduleValue={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleValue,exports:moduleValue.exports,require,Date,Intl,console},{filename:file});
const schemas=moduleValue.exports;
const inputs=[
 ['absent',undefined],['null',null],['false',false],['zero',0],['string','text'],['array',[]],['empty',{}],
 ['valid',{reason:' \ufeff原因\u3000',comment:' \ufeff意见\u00a0',expectedVersion:1,unknown:'stripped'}],
 ['comment-empty',{reason:'原因',comment:''}],['comment-space',{reason:'原因',comment:' \ufeff\u3000'}],
 ['reason-empty',{reason:''}],['reason-null',{reason:null}],['all-null',{reason:null,comment:null,expectedVersion:null}],
 ['unknown-nested',{reason:'ok',unknown:{toString:1},__proto__:{extra:'not JSON'}}],
 ['comment-surrogate',{reason:'x',comment:'\ud800'}],
 ['all-types',{reason:[],comment:{length:0},expectedVersion:'1'}],
 ['invalid-length-nan',{reason:{length:'NaN'},comment:{length:'NaN'}}],
 ['invalid-length-array',{reason:[],comment:Array(1001).fill('x')}],
 ['invalid-length-object',{reason:{length:256},comment:{length:1001}}],
 ['length-toString-shadow',{reason:{length:{toString:1}},comment:'x'}],
 ['length-array-to-number',{reason:{length:[]},comment:{length:['1001']}}],
 ...[254,255,256].map(n=>[`reason-${n}`,{reason:'😀'.repeat(n)}]),
 ...[999,1000,1001].map(n=>[`comment-${n}`,{reason:'ok',comment:'😀'.repeat(n)}]),
 ...[-1,-0,0,1,1.5,-0.5,9007199254740991,9007199254740992,-9007199254740992,1e300].map((n,i)=>[`version-${i}`,{reason:'ok',expectedVersion:n}]),
 ['version-object',{reason:'ok',expectedVersion:{valueOf:1}}],
 ['version-array',{reason:'ok',expectedVersion:[1]}],
];
const cases=[];
for(const name of ['ApproveRecordRequest','RejectApprovalRecordRequest']){
 for(const [label,input]of inputs){
  const raw=input===undefined?null:JSON.stringify(input);
  const materialized=raw===null?undefined:JSON.parse(raw);
  let expected;
  try{expected={success:true,dataRaw:JSON.stringify(schemas[`${name}Schema`].parse(materialized))};}
  catch(error){expected={success:false,response:{statusCode:400,message:'Validation failed',...(error.issues===undefined?{}:{errors:error.issues})}};}
  cases.push({schema:name,name:label,inputRaw:raw,expected});
 }
 for(const raw of ['{"reason":"ok","expectedVersion":1e999}','{"reason":"ok","expectedVersion":-1e999}','{"reason":"old","reason":"new","comment":" a ","comment":" b "}','{"reason":"ok","__proto__":{"p":1},"constructor":1}']){
  let expected;try{expected={success:true,dataRaw:JSON.stringify(schemas[`${name}Schema`].parse(JSON.parse(raw)))};}catch(error){expected={success:false,response:{statusCode:400,message:'Validation failed',...(error.issues===undefined?{}:{errors:error.issues})}};}
  cases.push({schema:name,name:`raw-${cases.length}`,inputRaw:raw,expected});
 }
}
const result={formatVersion:1,kind:'pure-original-approval-request-zod-oracle',runtime:process.version,source:{file,rawSha256:crypto.createHash('sha256').update(Buffer.from(source)).digest('hex')},ormPgExecuted:false,httpExecuted:false,cases};
const target=path.join(__dirname,'request_original.json');
if(process.argv.includes('--check')){if(JSON.stringify(JSON.parse(fs.readFileSync(target,'utf8')))!==JSON.stringify(result))throw Error('Original request corpus differs');}else fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify({kind:result.kind,runtime:result.runtime,cases:cases.length,ormPgExecuted:false})+'\n');
