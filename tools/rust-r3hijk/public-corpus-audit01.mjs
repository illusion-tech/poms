// Root checks the exact current public corpus without reading private originals.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pin} from './source-guard.mjs';
const [attempt]=process.argv.slice(2);assert(/^\d{2}$/.test(attempt));
const base='tmp/rust-r3hijk',out=base+'/root/public-corpus-audit'+attempt+'.json';assert(!fs.existsSync(out));
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]).sort();
const files=walk(base),findings=[],jsonFiles=[];
const sensitive=new Set(['password','token_hash','csrf_token_hash','accessToken','refreshToken','csrfToken','sessionToken','DB_PASSWORD','JWT_SECRET']);
function visit(v,file,location=''){
 if(!v||typeof v!=='object')return;
 for(const [key,value]of Object.entries(v)){
  const here=location+'.'+key;
  if(sensitive.has(key)&&typeof value==='string'&&value.length>=16&&!value.includes('not-published')&&!value.includes('redacted')&&!value.includes('REDACTED'))findings.push({file,path:here,key,length:value.length,valuePublished:false});
  visit(value,file,here);
 }
}
for(const file of files){
 assert(!file.includes('/acceptance-rust-candidate02-21/'),'Quarantined original must never enter public corpus');
 if(file.endsWith('.json')){const value=JSON.parse(fs.readFileSync(file));visit(value,file);jsonFiles.push(pin(file));}
}
const report={kind:'R3HIJK-public-JSON-credential-key-audit',createdAt:new Date().toISOString(),files:files.length,jsonFiles:jsonFiles.length,findings,credentialValuesPrinted:false,privateRead:false,allJSONInputs:jsonFiles,passed:findings.length===0};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({files:files.length,jsonFiles:jsonFiles.length,findings,passed:report.passed}));if(!report.passed)process.exitCode=1;
