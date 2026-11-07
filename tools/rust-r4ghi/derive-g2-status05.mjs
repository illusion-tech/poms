import fs from 'node:fs';
import assert from 'node:assert/strict';
let source=fs.readFileSync('tools/rust-r4ghi/update-g2-status04.mjs','utf8');
function replace(a,b){assert.equal(source.split(a).length,2,a);source=source.replace(a,()=>b);}
replace("root/g2-online-status04'","root/g2-online-status05'");
replace("assert(prior.body.startsWith(start)&&prior.body.includes(end)&&!prior.body.includes(marker));","const previousEnd=prior.body.startsWith(marker)?'<!-- /poms-r4ghi-g2-current04 -->':end;assert(prior.body.startsWith(start)||prior.body.startsWith(marker));assert(prior.body.includes(previousEnd));");
replace('prior.body.slice(prior.body.indexOf(end)+end.length)','prior.body.slice(prior.body.indexOf(previousEnd)+previousEnd.length)');
replace("const fresh=api('prewrite-'+number,repo+'/issues/'+number);assert.equal(fresh.body,prior.body,'Issue body changed during preparation');api('patch-'+number,repo+'/issues/'+number,{body});", "if(prior.body!==body){const fresh=api('prewrite-'+number,repo+'/issues/'+number);assert.equal(fresh.body,prior.body,'Issue body changed during preparation');api('patch-'+number,repo+'/issues/'+number,{body});}");
const from=source.indexOf('function api('),to=source.indexOf('\nconst children=');assert(from>=0&&to>from);
source=source.slice(0,from)+`function api(name,endpoint,body){
 const args=['api',endpoint];if(body){const file=out+'/'+name+'-input.json';fs.writeFileSync(file,JSON.stringify(body)+'\\n',{flag:'wx'});args.push('--method','PATCH','--input',file);}
 for(let n=0;n<(body?1:3);n++){const label=name+(n?'-retry'+n:'');const r=spawnSync('gh',args,{encoding:'utf8',windowsHide:true,timeout:45000});
  fs.writeFileSync(out+'/'+label+'-stdout.json',r.stdout??'',{flag:'wx'});fs.writeFileSync(out+'/'+label+'-stderr.log',r.stderr??'',{flag:'wx'});
  if(r.status===0)return JSON.parse(r.stdout);
  if(body||n===2)throw new Error('GitHub call failed; inspect preserved originals: '+label);
 }
}`+source.slice(to);
fs.writeFileSync('tools/rust-r4ghi/update-g2-status05.mjs',source,{flag:'wx'});
